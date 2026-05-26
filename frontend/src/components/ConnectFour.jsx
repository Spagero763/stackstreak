import { useCallback, useEffect, useState } from "react";
import { explorerTx } from "../config";
import {
  c4Create,
  c4Join,
  c4Drop,
  getC4Game,
  getC4RecentGames,
  getC4Record,
  TTT_STATUS as STATUS,
} from "../stacks";
import { short, readableError } from "./util";

const DISC = ["", "🔴", "🟡"];
const ROWS = [5, 4, 3, 2, 1, 0]; // render top-to-bottom
const COLS = [0, 1, 2, 3, 4, 5, 6];

export default function ConnectFour({ address, onConnect }) {
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
      setGames(await getC4RecentGames(12));
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
  useEffect(() => {
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [refresh]);

  const withTx = async (fn) => {
    if (!address) return onConnect();
    setError(null);
    setBusy(true);
    try {
      setLastTx(await fn());
      setTimeout(refresh, 12000);
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
      <section className="hero">
        <h1>Connect Four 🔴🟡</h1>
        <p className="sub">
          Open a game or join one, then drop discs into columns. First to line
          up four in any direction wins. Every move is a transaction.
        </p>
      </section>

      {error && <div className="banner error">{error}</div>}

      <section className="ttt-bar">
        <button className="btn" onClick={() => withTx(() => c4Create())} disabled={busy}>
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
          </a>
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
          <div className="c4-board">
            {ROWS.map((r) =>
              COLS.map((c) => {
                const v = game.board[r * 7 + c];
                return (
                  <button
                    key={`${r}-${c}`}
                    className="c4-cell"
                    onClick={() => onDrop(c)}
                    disabled={
                      busy ||
                      game.status !== STATUS.ACTIVE ||
                      !isMyTurn(game, address) ||
                      game.board[5 * 7 + c] !== 0
                    }
                  >
                    {DISC[v]}
                  </button>
                );
              }),
            )}
          </div>
          <div className="ttt-players">
            <span>🔴 {short(game.playerX)}</span>
            <span>🟡 {game.playerO ? short(game.playerO) : "waiting…"}</span>
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
    </>
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
