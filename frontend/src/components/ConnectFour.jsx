import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  c4Create,
  c4Join,
  c4Drop,
  getC4Game,
  getC4RecentGames,
  getC4Record,
  getRecentC4,
  TTT_STATUS as STATUS,
} from "../stacks";
import { readableError, short } from "./util";
import { FeedList, Hero, HowTo, TxHint, usePoll } from "./shared.jsx";

const ROWS = [5, 4, 3, 2, 1, 0]; // render top-to-bottom
const COLS = [0, 1, 2, 3, 4, 5, 6];

export default function ConnectFour({ address, onConnect }) {
  const [games, setGames] = useState([]);
  const [feed, setFeed] = useState([]);
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
      const [list, evs] = await Promise.all([
        getC4RecentGames(12),
        getRecentC4(15).catch(() => []),
      ]);
      setGames(list);
      setFeed(evs);
      if (activeId) setGame(await getC4Game(activeId));
      if (address) setRecord(await getC4Record(address));
    } catch (e) {
      setError(readableError(e, "Connect Four"));
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
      setLastTx(await fn());
      setTimeout(refresh, 11000);
    } catch (e) {
      setError(readableError(e, "Connect Four"));
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (col) => {
    if (!game || game.status !== STATUS.ACTIVE || !isMyTurn(game, address))
      return;
    withTx(() => c4Drop(game.id, col));
  };

  return (
    <>
      <Hero
        icon="c4"
        title="Connect Four"
        sub="Open a game or join one, then drop discs into columns. First to line up four in any direction wins. Every move is a transaction."
      />

      <HowTo
        steps={[
          "Create a game, or join an open one.",
          "Drop discs into columns, alternating turns with your opponent.",
          "Connect four in any direction to win.",
        ]}
      />

      {error && <div className="banner error">{error}</div>}

      <section className="ttt-bar">
        <button
          className="btn"
          onClick={() => withTx(() => c4Create())}
          disabled={busy}
        >
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
          <Board game={game} onDrop={onDrop} busy={busy} address={address} />
          <div className="ttt-players">
            <span>🔴 {short(game.playerX)}</span>
            <span>🟡 {game.playerO ? short(game.playerO) : "waiting…"}</span>
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
                    🔴 {short(g.playerX)} vs 🟡{" "}
                    {g.playerO ? short(g.playerO) : "open"}
                  </span>
                  <span className="muted">{statusText(g, address)}</span>
                </button>
                {g.status === STATUS.OPEN && g.playerX !== address && (
                  <button
                    className="btn tiny"
                    onClick={() => withTx(() => c4Join(g.id))}
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

      <FeedList
        title="Live drops"
        items={feed}
        pulse
        emptyText="No drops yet."
        renderRow={(d) => (
          <>
            <span className="mono">#{d.id || "?"}</span>
            <span>
              {d.event === "create"
                ? "game opened"
                : d.event === "join"
                  ? "joined"
                  : d.event === "drop"
                    ? `dropped col ${d.col} (${d.mark === 1 ? "🔴" : "🟡"})`
                    : d.event}
            </span>
            <span className="muted mono">{short(d.player)}</span>
          </>
        )}
      />
    </>
  );
}

function Board({ game, onDrop, busy, address }) {
  return (
    <div className="c4-board">
      {ROWS.map((r) =>
        COLS.map((c) => {
          const v = game.board[r * 7 + c];
          const colFull = game.board[5 * 7 + c] !== 0;
          const disabled =
            busy ||
            game.status !== STATUS.ACTIVE ||
            !isMyTurn(game, address) ||
            colFull;
          return (
            <button
              key={`${r}-${c}`}
              className="c4-cell"
              onClick={() => onDrop(c)}
              disabled={disabled}
            >
              <AnimatePresence>
                {v !== 0 && (
                  <motion.span
                    key={v}
                    className={`c4-cell-inner ${
                      v === 1 ? "c4-disc-red" : "c4-disc-yellow"
                    }`}
                    initial={{ y: -240, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 280,
                      damping: 18,
                      bounce: 0.5,
                    }}
                  />
                )}
              </AnimatePresence>
            </button>
          );
        }),
      )}
    </div>
  );
}

function isMyTurn(game, address) {
  if (!address || game.status !== STATUS.ACTIVE) return false;
  return game.turn === 1 ? game.playerX === address : game.playerO === address;
}

function statusText(game, address) {
  switch (game.status) {
    case STATUS.OPEN:
      return "Open · waiting for opponent";
    case STATUS.ACTIVE:
      return isMyTurn(game, address)
        ? "Your move"
        : `${game.turn === 1 ? "🔴" : "🟡"} to move`;
    case STATUS.X_WON:
      return game.winner === address ? "🔴 wins — you won! 🎉" : "🔴 wins";
    case STATUS.O_WON:
      return game.winner === address ? "🟡 wins — you won! 🎉" : "🟡 wins";
    case STATUS.DRAW:
      return "Draw";
    default:
      return "";
  }
}
