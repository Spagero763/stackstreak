import { useCallback, useEffect, useState } from "react";
import { IS_CONFIGURED, explorerTx } from "../config";
import {
  play,
  getStats,
  getLeaderboard,
  getTotalPlays,
  getRecentPlays,
} from "../stacks";

const short = (a) => (a ? `${a.slice(0, 5)}…${a.slice(-4)}` : "");

export default function StreakGame({ address, onConnect }) {
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [recent, setRecent] = useState([]);
  const [totalPlays, setTotalPlays] = useState(0);
  const [lastTx, setLastTx] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!IS_CONFIGURED) return;
    setLoading(true);
    setError(null);
    try {
      const [board, total, feed] = await Promise.all([
        getLeaderboard(25),
        getTotalPlays(),
        getRecentPlays(15).catch(() => []),
      ]);
      setLeaderboard(board);
      setTotalPlays(total);
      setRecent(feed);
      if (address) setStats(await getStats(address));
    } catch (e) {
      setError(readableError(e));
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const t = setInterval(refresh, 25000);
    return () => clearInterval(t);
  }, [refresh]);

  const onPlay = async () => {
    setError(null);
    setPlaying(true);
    try {
      const txid = await play();
      setLastTx(txid);
      setTimeout(refresh, 12000);
    } catch (e) {
      setError(readableError(e));
    } finally {
      setPlaying(false);
    }
  };

  return (
    <>
      <section className="hero">
        <h1>Play once. Build your streak. Climb the chain.</h1>
        <p className="sub">
          A provably-fair daily game. Every tap is a single transaction — your
          score is rolled by the contract from the current Bitcoin block, so
          nobody can fake it.
        </p>
      </section>

      {error && <div className="banner error">{error}</div>}

      <section className="play-card">
        <button
          className="play-btn"
          onClick={address ? onPlay : onConnect}
          disabled={!IS_CONFIGURED || playing}
        >
          {playing ? "Confirm in wallet…" : address ? "▶  Play" : "Connect to play"}
        </button>
        {lastTx && (
          <p className="hint">
            Play submitted!{" "}
            <a href={explorerTx(lastTx)} target="_blank" rel="noreferrer">
              View transaction ↗
            </a>{" "}
            — your stats update when it confirms.
          </p>
        )}
      </section>

      {stats && (
        <section className="stats-block">
          <div className="stats-grid">
            <Stat label="Your score" value={stats.total} />
            <Stat label="Streak" value={`${stats.streak}🔥`} />
            <Stat label="Best roll" value={stats.best} />
            <Stat label="Plays" value={stats.plays} />
          </div>
          {stats.plays > 0 && (
            <a
              className="btn ghost share"
              href={shareUrl(stats)}
              target="_blank"
              rel="noreferrer"
            >
              𝕏  Share my streak
            </a>
          )}
        </section>
      )}

      <section className="board">
        <div className="board-head">
          <h2>Leaderboard</h2>
          <div className="board-meta">
            <span>{totalPlays} total plays</span>
            <button className="btn tiny" onClick={refresh} disabled={loading}>
              {loading ? "…" : "Refresh"}
            </button>
          </div>
        </div>

        {leaderboard.length === 0 ? (
          <p className="empty">No plays yet — be the first on the board.</p>
        ) : (
          <table className="board-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>Score</th>
                <th>Streak</th>
                <th>Best</th>
                <th>Plays</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row, i) => (
                <tr key={row.address} className={row.address === address ? "me" : ""}>
                  <td>{medal(i)}</td>
                  <td className="mono">{short(row.address)}</td>
                  <td className="strong">{row.total}</td>
                  <td>{row.streak}🔥</td>
                  <td>{row.best}</td>
                  <td>{row.plays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="feed">
        <h2>Live plays</h2>
        {recent.length === 0 ? (
          <p className="empty">No plays yet — your roll will show up here.</p>
        ) : (
          <ul className="feed-list">
            {recent.map((p, i) => (
              <li key={`${p.txId}-${i}`}>
                <span className="mono">{short(p.player)}</span>
                <span>
                  rolled <b className="strong">{p.score}</b>
                </span>
                <span className="muted">
                  {p.streak}🔥 · {p.total} total
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function medal(i) {
  return ["🥇", "🥈", "🥉"][i] ?? i + 1;
}

function shareUrl(stats) {
  const text = `I'm climbing the ⚡ StackStreak leaderboard on Stacks — ${stats.total} pts, ${stats.streak}🔥 streak. Tap to play and beat me:`;
  const url = typeof window !== "undefined" ? window.location.origin : "";
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    text,
  )}&url=${encodeURIComponent(url)}`;
}

function readableError(e) {
  const msg = e?.message || String(e);
  if (/rejected|cancel/i.test(msg)) return "Request cancelled.";
  if (/no.*address|connect/i.test(msg)) return "Connect a Stacks wallet first.";
  return msg;
}
