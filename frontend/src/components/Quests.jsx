import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  questCheckIn,
  questClaim,
  getQuestProgress,
  getQuestStats,
  getQuestTop,
  getRecentQuests,
} from "../stacks";
import { readableError, short } from "./util";
import {
  ChampionBanner,
  FeedList,
  Hero,
  HowTo,
  ShareButton,
  StatTile,
  TxHint,
  usePoll,
} from "./shared.jsx";
import { useToast } from "./toast.jsx";

export default function Quests({ address, onConnect, onNavigate }) {
  const { txToast } = useToast();
  const [progress, setProgress] = useState(null);
  const [stats, setStats] = useState(null);
  const [top, setTop] = useState(null);
  const [feed, setFeed] = useState([]);
  const [busy, setBusy] = useState(false);
  const [lastTx, setLastTx] = useState(null);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [t, f] = await Promise.all([
        getQuestTop().catch(() => null),
        getRecentQuests(15).catch(() => []),
      ]);
      setTop(t);
      setFeed(f);
      if (address) {
        const [p, s] = await Promise.all([
          getQuestProgress(address),
          getQuestStats(address),
        ]);
        setProgress(p);
        setStats(s);
      }
    } catch (e) {
      setError(readableError(e, "Daily Quests"));
    }
  }, [address]);

  useEffect(() => {
    refresh();
  }, [refresh]);
  usePoll(refresh);

  const run = async (fn) => {
    if (!address) return onConnect();
    setError(null);
    setBusy(true);
    try {
      const tx = await fn();
      setLastTx(tx);
      txToast(tx, "Quest");
      setTimeout(refresh, 11000);
    } catch (e) {
      setError(readableError(e, "Daily Quests"));
    } finally {
      setBusy(false);
    }
  };

  const goal = progress?.goal ?? 3;
  const done = Math.min(progress?.done ?? 0, goal);
  const ready = progress?.active && !progress.claimed && done >= goal;

  return (
    <>
      <Hero
        icon="quest"
        title="One quest a day. Proven on-chain."
        sub="Check in, make three plays in any of the seven games, then claim. The contract reads your play counters across every game itself — completion is verified, never self-reported."
      />

      <HowTo
        steps={[
          "Check in to start today's quest (one transaction).",
          "Play any 3 moves across any games — coin flips, spins, rolls, all count.",
          "Claim before the day ends to grow your quest streak.",
        ]}
      />

      <ChampionBanner
        label="has completed the most quests"
        address={top?.player}
        value={top ? `${top.completed} quests` : null}
        you={top?.player && top.player === address}
      />

      {error && <div className="banner error">{error}</div>}

      <section className="play-card">
        {progress?.active ? (
          <>
            <div className="quest-track" aria-label={`progress ${done} of ${goal}`}>
              {Array.from({ length: goal }).map((_, i) => (
                <motion.span
                  key={i}
                  className={`quest-pip ${i < done ? "quest-pip-done" : ""}`}
                  initial={false}
                  animate={i < done ? { scale: [1, 1.25, 1] } : {}}
                  transition={{ duration: 0.4 }}
                />
              ))}
            </div>
            <p className="quest-status">
              {progress.claimed
                ? "Quest complete — claimed. Come back tomorrow."
                : ready
                  ? "Goal reached — claim it!"
                  : `${done}/${goal} plays — keep going.`}
            </p>
            {!progress.claimed && (
              <div className="choice-row">
                <button
                  className={ready ? "play-btn" : "btn big"}
                  disabled={busy || !ready}
                  onClick={() => run(questClaim)}
                >
                  {busy ? "Claiming…" : "Claim today's quest"}
                </button>
                {!ready && (
                  <button className="btn big ghost" onClick={() => onNavigate("home")}>
                    Pick a game
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: "center" }}>
            <button
              className="play-btn"
              disabled={busy}
              onClick={() => run(questCheckIn)}
            >
              {busy ? "Checking in…" : address ? "Check in for today" : "Connect to start"}
            </button>
            <p className="hint">Then make {goal} plays in any games and claim.</p>
          </div>
        )}
        {busy && <p className="hint">Confirm in wallet…</p>}
        <TxHint txid={lastTx} />
      </section>

      {stats && (
        <section className="stats-grid">
          <StatTile label="Quest streak" value={stats.streak} accent />
          <StatTile label="Best streak" value={stats.bestStreak} />
          <StatTile label="Completed" value={stats.completed} />
          <StatTile label="Today" value={progress?.claimed ? "done" : progress?.active ? `${done}/${goal}` : "—"} />
        </section>
      )}

      {stats && stats.completed > 0 && (
        <div className="share-row">
          <ShareButton
            text={`${stats.completed} daily quests completed (streak: ${stats.streak}) on StackStreak — on-chain quests verified by the contract itself, on @Stacks. Join the arcade:`}
            label="Share my quest streak"
          />
        </div>
      )}

      <FeedList
        title="Recent quests"
        items={feed}
        pulse
        emptyText="No quests yet — be the first to check in."
        renderRow={(q) => (
          <>
            <span className="mono">{short(q.player)}</span>
            <span>
              {q.event === "claim" ? (
                <>
                  claimed · <b className="strong">{q.completed} total</b>
                </>
              ) : (
                <>checked in</>
              )}
            </span>
            <span className="muted">
              {q.event === "claim" ? `streak ${q.streak}` : "quest started"}
            </span>
          </>
        )}
      />
    </>
  );
}
