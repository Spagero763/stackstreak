import { useCallback, useEffect, useState } from "react";
import { explorerTx } from "../config";
import {
  createGame,
  joinGame,
  playMove,
  getGame,
  getRecentGames,
  getTttRecord,
  TTT_STATUS,
} from "../stacks";

const short = (a) => (a ? `${a.slice(0, 5)}…${a.slice(-4)}` : "—");
const MARK = ["", "✕", "◯"];

export default function TicTacToe({ address, onConnect }) {
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
      setError(readableError(e));
    } finally {
      setLoading(false);
    }
  }, [activeId, address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [refresh]);

  const withTx = async (fn) => {
    if (!address) return onConnect();
    setError(null);
    setBusy(true);
    try {
      const txid = await fn();
      setLastTx(txid);
      setTimeout(refresh, 12000);
    } catch (e) {
      setError(readableError(e));
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

  return (
    <>
      <section className="hero">
        <h1>On-chain Tic-Tac-Toe.</h1>
        <p className="sub">
          Open a game or join an opponent. Every move is a transaction the
          contract validates — turns, wins and draws, all on Stacks.
        </p>
      </section>

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

      {lastTx && (
        <p className="hint">
          Move submitted!{" "}
          <a href={explorerTx(lastTx)} target="_blank" rel="noreferrer">
            View transaction ↗
          </a>{" "}
          — the board updates when it confirms.
        </p>
      )}

      {game && (
        <section className="ttt-active">
          <div className="ttt-status">
            <button className="btn ghost tiny" onClick={() => setActiveId(null)}>
              ← Back
            </button>
            <span>Game #{game.id}</span>
            <span className="strong">{statusText(game, address)}</span>
          </div>
          <div className="ttt-board">
            {game.board.map((c, i) => (
              <button
                key={i}
                className={`ttt-cell ${c ? "filled" : ""}`}
                onClick={() => onCell(i)}
                disabled={
                  busy ||
                  c !== 0 ||
                  game.status !== TTT_STATUS.ACTIVE ||
                  !isMyTurn(game, address)
                }
              >
                {MARK[c]}
              </button>
            ))}
          </div>
          <div className="ttt-players">
            <span>✕ {short(game.playerX)}</span>
            <span>◯ {game.playerO ? short(game.playerO) : "waiting…"}</span>
          </div>
        </section>
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
                <button className="game-open" onClick={() => setActiveId(g.id)}>
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

function readableError(e) {
  const msg = e?.message || String(e);
  if (/rejected|cancel/i.test(msg)) return "Request cancelled.";
  if (/no.*address|connect/i.test(msg)) return "Connect a Stacks wallet first.";
  if (/u201/.test(msg)) return "That game is no longer open.";
  if (/u204/.test(msg)) return "It's not your turn.";
  if (/u205/.test(msg)) return "That cell is taken.";
  return msg;
}
