import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  createGame,
  joinGame,
  playMove,
  getGame,
  getRecentGames,
  getTttRecord,
  TTT_STATUS,
} from "../stacks";
import { readableError, short } from "./util";
import { Hero, HowTo, TxHint, usePoll } from "./shared.jsx";
import { useToast } from "./toast.jsx";

const MARK = ["", "✕", "◯"];

// All 8 winning lines on a 3x3 board, used to highlight a winning row.
const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export default function TicTacToe({ address, onConnect }) {
  const { txToast } = useToast();
  const [games, setGames] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [game, setGame] = useState(null);
  const [record, setRecord] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastTx, setLastTx] = useState(null);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getRecentGames(12);
      setGames(list);
      if (activeId) setGame(await getGame(activeId));
      if (address) setRecord(await getTttRecord(address));
    } catch (e) {
      setError(readableError(e, "Tic-Tac-Toe"));
    } finally {
      setLoading(false);
    }
  }, [activeId, address]);

  useEffect(() => {
    refresh();
  }, [refresh]);
  usePoll(refresh);

  const withTx = async (fn) => {
    if (!address) return onConnect();
    setError(null);
    setBusy(true);
    try {
      const tx = await fn();
      setLastTx(tx);
      txToast(tx, "Tic-Tac-Toe");
      setTimeout(refresh, 11000);
    } catch (e) {
      setError(readableError(e, "Tic-Tac-Toe"));
    } finally {
      setBusy(false);
    }
  };

  const onCreate = () => withTx(() => createGame());
  const onJoin = (id) => withTx(() => joinGame(id));
  const onCell = (pos) => {
    if (!game || game.status !== TTT_STATUS.ACTIVE) return;
    if (game.board[pos] !== 0) return;
    if (!isMyTurn(game, address)) return;
    withTx(() => playMove(game.id, pos));
  };

  const winLine = game ? findWinLine(game.board) : null;

  return (
    <>
      <Hero
        icon="ttt"
        title="On-chain Tic-Tac-Toe"
        sub="Open a game or join an opponent. Every move is a transaction the contract validates — turns, wins and draws, all on Stacks."
      />

      <HowTo
        steps={[
          "Create a game, or join an open one from the list.",
          "Take turns placing your mark — the contract validates every move.",
          "Line up three in a row to win.",
        ]}
      />

      {error && <div className="banner error">{error}</div>}

      <section className="ttt-bar">
        <button className="btn" onClick={onCreate} disabled={busy}>
          {busy ? "Confirm in wallet…" : "＋ New game"}
        </button>
        {record && (
          <span className="record">
            Your record: <b>{record.wins}</b>W · <b>{record.losses}</b>L ·{" "}
            <b>{record.draws}</b>D
          </span>
        )}
        <button className="btn tiny" onClick={refresh} disabled={loading}>
          {loading ? "…" : "Refresh"}
        </button>
      </section>

      <TxHint txid={lastTx} label="Move submitted!" />

      {game && (
        <motion.section
          className="ttt-active"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="ttt-status">
            <button
              className="btn ghost tiny"
              onClick={() => setActiveId(null)}
            >
              ← Back
            </button>
            <span>Game #{game.id}</span>
            <span className="strong">{statusText(game, address)}</span>
          </div>
          <div className="ttt-board">
            {game.board.map((c, i) => (
              <button
                key={i}
                className={`ttt-cell ${c ? "filled" : ""} ${
                  winLine && winLine.includes(i) ? "win" : ""
                }`}
                onClick={() => onCell(i)}
                disabled={
                  busy ||
                  c !== 0 ||
                  game.status !== TTT_STATUS.ACTIVE ||
                  !isMyTurn(game, address)
                }
              >
                <AnimatePresence>
                  {c !== 0 && (
                    <motion.span
                      key={c}
                      initial={{ scale: 0, rotate: -120, opacity: 0 }}
                      animate={{ scale: 1, rotate: 0, opacity: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 320,
                        damping: 18,
                      }}
                    >
                      {MARK[c]}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            ))}
          </div>
          <div className="ttt-players">
            <span>✕ {short(game.playerX)}</span>
            <span>◯ {game.playerO ? short(game.playerO) : "waiting…"}</span>
          </div>
        </motion.section>
      )}

      <section className="board">
        <div className="board-head">
          <h2>Games</h2>
        </div>
        {games.length === 0 ? (
          <p className="empty">No games yet — open the first one.</p>
        ) : (
          <ul className="game-list">
            {games.map((g) => (
              <li key={g.id} className={g.id === activeId ? "me" : ""}>
                <button
                  className="game-open"
                  onClick={() => setActiveId(g.id)}
                >
                  <span className="mono">#{g.id}</span>
                  <span>
                    ✕ {short(g.playerX)} vs ◯{" "}
                    {g.playerO ? short(g.playerO) : "open"}
                  </span>
                  <span className="muted">{statusText(g, address)}</span>
                </button>
                {g.status === TTT_STATUS.OPEN && g.playerX !== address && (
                  <button
                    className="btn tiny"
                    onClick={() => onJoin(g.id)}
                    disabled={busy}
                  >
                    Join
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function findWinLine(board) {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return line;
  }
  return null;
}

function isMyTurn(game, address) {
  if (!address || game.status !== TTT_STATUS.ACTIVE) return false;
  return game.turn === 1 ? game.playerX === address : game.playerO === address;
}

function statusText(game, address) {
  switch (game.status) {
    case TTT_STATUS.OPEN:
      return "Open · waiting for opponent";
    case TTT_STATUS.ACTIVE:
      return isMyTurn(game, address)
        ? "Your move"
        : `${game.turn === 1 ? "✕" : "◯"} to move`;
    case TTT_STATUS.X_WON:
      return game.winner === address ? "✕ wins — you won! 🎉" : "✕ wins";
    case TTT_STATUS.O_WON:
      return game.winner === address ? "◯ wins — you won! 🎉" : "◯ wins";
    case TTT_STATUS.DRAW:
      return "Draw";
    default:
      return "";
  }
}
