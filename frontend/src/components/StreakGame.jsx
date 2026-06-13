import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IS_CONFIGURED } from "../config";
import {
  play,
  getStats,
  getLeaderboard,
  getTotalPlays,
  getRecentPlays,
  getTop,
} from "../stacks";
import { readableError, short } from "./util";
import {
  ChampionBanner,
  FeedList,
  Hero,
  HowTo,
  StatTile,
  TxHint,
  usePoll,
} from "./shared.jsx";
import { useToast } from "./toast.jsx";

export default function StreakGame({ address, onConnect }) {
  const { txToast } = useToast();
  const [stats, setStats] = useState(null);
  const [top, setTop] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [recent, setRecent] = useState([]);
  const [totalPlays, setTotalPlays] = useState(0);
  const [lastTx, setLastTx] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Reveal the score of the just-confirmed roll for this player.
  const [revealed, setRevealed] = useState(null);
  const lastTxRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!IS_CONFIGURED) return;
    setLoading(true);
    setError(null);
    try {
      const [board, total, feed, championRow] = await Promise.all([
        getLeaderboard(25),
        getTotalPlays(),
        getRecentPlays(15).catch(() => []),
        getTop().catch(() => null),
      ]);
      setLeaderboard(board);
      setTotalPlays(total);
      setRecent(feed);
      setTop(championRow);
      if (address) setStats(await getStats(address));
    } catch (e) {
      setError(readableError(e, "StackStreak"));
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    refresh();
  }, [refresh]);
  usePoll(refresh);

  useEffect(() => {
    if (!lastTxRef.current) return;
    const hit = recent.find((p) => p.txId === lastTxRef.current);
    if (hit) {
      setRevealed(hit);
      lastTxRef.current = null;
    }
  }, [recent]);

  const onPlay = async () => {
    setError(null);
    setPlaying(true);
    setRevealed(null);
    try {
      const txid = await play();
      setLastTx(txid);
      txToast(txid, "Daily roll");
      lastTxRef.current = txid;
      setTimeout(refresh, 11000);
    } catch (e) {
      setError(readableError(e, "StackStreak"));
    } finally {
      setPlaying(false);
    }
  };

  return (
    <>
      <Hero
        icon="streak"
        title="Play once. Build your streak. Climb the chain."
        sub="A provably-fair daily game. Every tap is a single transaction — your score is rolled by the contract from the current Bitcoin block, so nobody can fake it."
      />

      <HowTo
        steps={[
          "Tap Play — the contract rolls you a score from 1–100 using the live Bitcoin block.",
          "Play on consecutive days to grow your streak.",
          "Climb the leaderboard by total score.",
        ]}
      />

      <ChampionBanner
        label="leads the leaderboard"
        address={top?.player}
        value={top ? `${top.score} pts` : null}
        you={top?.player && top.player === address}
      />

      {error && <div className="banner error">{error}</div>}

      <section className="play-card">
        <AnimatePresence mode="wait">
          {revealed && (
            <motion.div
              key={revealed.txId}
              initial={{ scale: 0.6, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              style={{
                fontSize: 64,
                fontWeight: 900,
                letterSpacing: "-0.04em",
                margin: "0 0 14px",
                background:
                  "linear-gradient(135deg, var(--accent), var(--accent-2))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              +{revealed.score}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          className="play-btn"
          onClick={address ? onPlay : onConnect}
          disabled={!IS_CONFIGURED || playing}
          whileTap={{ scale: 0.96 }}
          animate={
            playing
              ? { boxShadow: ["0 10px 30px rgba(252,100,50,0.35)", "0 14px 40px rgba(252,100,50,0.65)", "0 10px 30px rgba(252,100,50,0.35)"] }
              : {}
          }
          transition={playing ? { duration: 1.4, repeat: Infinity } : {}}
        >
          {playing ? "Rolling…" : address ? "▶  Play" : "Connect to play"}
        </motion.button>
        <TxHint txid={lastTx} label="Play submitted!" />
      </section>

      {stats && (
        <section className="stats-block">
          <div className="stats-grid">
            <StatTile label="Your score" value={stats.total} accent />
            <StatTile label="Streak" value={`${stats.streak}`} />
            <StatTile label="Best roll" value={stats.best} />
            <StatTile label="Plays" value={stats.plays} />
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
                <motion.tr
                  key={row.address}
                  layout
                  className={row.address === address ? "me" : ""}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: i * 0.02 }}
                >
                  <td>{medal(i)}</td>
                  <td className="mono">{short(row.address)}</td>
                  <td className="strong">{row.total}</td>
                  <td>{row.streak}</td>
                  <td>{row.best}</td>
                  <td>{row.plays}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <FeedList
        title="Live plays"
        items={recent}
        pulse
        emptyText="No plays yet — your roll will show up here."
        renderRow={(p) => (
          <>
            <span className="mono">{short(p.player)}</span>
            <span>
              rolled <b className="strong">{p.score}</b>
            </span>
            <span className="muted">
              {p.streak} · {p.total} total
            </span>
          </>
        )}
      />
    </>
  );
}

function medal(i) {
  return ["🥇", "🥈", "🥉"][i] ?? i + 1;
}

function shareUrl(stats) {
  const text = `I'm climbing the StackStreak leaderboard on Stacks — ${stats.total} pts, ${stats.streak} streak. Tap to play and beat me:`;
  const url = typeof window !== "undefined" ? window.location.origin : "";
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    text,
  )}&url=${encodeURIComponent(url)}`;
}
