import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  hiloStart,
  hiloGuess,
  getHiloState,
  getHiloTop,
  getRecentHilo,
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
} from "./shared.jsx";

export default function HiLo({ address, onConnect }) {
  const [state, setState] = useState(null);
  const [top, setTop] = useState(null);
  const [feed, setFeed] = useState([]);
  const [busy, setBusy] = useState(false);
  const [lastTx, setLastTx] = useState(null);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [t, f] = await Promise.all([
        getHiloTop().catch(() => null),
        getRecentHilo(15).catch(() => []),
      ]);
      setTop(t);
      setFeed(f);
      if (address) setState(await getHiloState(address));
    } catch (e) {
      setError(readableError(e, "Higher or Lower"));
    }
  }, [address]);

  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(() => {
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [refresh]);

  const run = async (fn) => {
    if (!address) return onConnect();
    setError(null);
    setBusy(true);
    try {
      setLastTx(await fn());
      setTimeout(refresh, 11000);
    } catch (e) {
      setError(readableError(e, "Higher or Lower"));
    } finally {
      setBusy(false);
    }
  };

  const active = state?.active;
  const current = state?.current ?? 0;

  return (
    <>
      <Hero
        icon="hilo"
        title="Higher or Lower"
        sub="A number from 1–100 is revealed. Call whether the next is higher or lower. Chain correct calls to grow your run — one miss ends it."
      />

      <HowTo
        steps={[
          "Start a run to reveal a number from 1–100.",
          "Call whether the next number is higher or lower.",
          "Chain correct calls to extend your run — one miss ends it.",
        ]}
      />

      <ChampionBanner
        label="holds the longest run"
        address={top?.player}
        value={top ? `${top.run}` : null}
        you={top?.player && top.player === address}
      />

      {error && <div className="banner error">{error}</div>}

      <section className="play-card">
        <div className="hilo-stage">
          <NumberCard value={current} active={active} busy={busy} />
          <p className="hilo-hint">
            {!state || state.plays === 0
              ? "Start a run to reveal your first number."
              : active
                ? `Run: ${state.run} · Best: ${state.bestRun}`
                : `Last run ended at ${state.run}. Start a new one.`}
          </p>
        </div>

        {active ? (
          <div className="choice-row">
            <button
              className="btn big"
              disabled={busy}
              onClick={() => run(() => hiloGuess(true))}
            >
              ⬆ Higher
            </button>
            <button
              className="btn big"
              disabled={busy}
              onClick={() => run(() => hiloGuess(false))}
            >
              ⬇ Lower
            </button>
          </div>
        ) : (
          <div style={{ textAlign: "center" }}>
            <button
              className="play-btn"
              disabled={busy}
              onClick={() => run(() => hiloStart())}
            >
              {state && state.plays > 0 ? "▶  New run" : "▶  Start"}
            </button>
          </div>
        )}
        {busy && <p className="hint">Confirm in wallet…</p>}
        <TxHint txid={lastTx} />
      </section>

      {state && (
        <section className="stats-grid">
          <StatTile label="Run" value={state.run} accent />
          <StatTile label="Best run" value={state.bestRun} />
          <StatTile label="Status" value={active ? "live" : "ended"} />
          <StatTile label="Calls" value={state.plays} />
        </section>
      )}

      {state && state.bestRun > 0 && (
        <div className="share-row">
          <ShareButton
            text={`My best Higher-or-Lower run on StackStreak is ${state.bestRun} — fully on-chain on @Stacks, one tx per call, provably fair. Can you beat it?`}
            label="𝕏  Share my best run"
          />
        </div>
      )}

      <FeedList
        title="Live guesses"
        items={feed}
        pulse
        emptyText="No runs yet — start the first one."
        renderRow={(h) => (
          <>
            <span className="mono">{short(h.player)}</span>
            {h.event === "start" ? (
              <span>
                started @ <b className="strong">{h.current}</b>
              </span>
            ) : (
              <span>
                {h.higher ? "⬆" : "⬇"} {h.prev} → <b>{h.next}</b>{" "}
                {h.correct ? "✓" : "✗"}
              </span>
            )}
            <span className="muted">
              {h.event === "start" ? "new run" : `run ${h.run}`}
            </span>
          </>
        )}
      />
    </>
  );
}

function NumberCard({ value, active, busy }) {
  return (
    <motion.div
      className="hilo-card"
      animate={busy ? { rotateX: [0, 90, 0] } : {}}
      transition={busy ? { duration: 1.2, repeat: Infinity } : {}}
      style={{ opacity: active ? 1 : 0.7 }}
    >
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: 30, opacity: 0, rotateX: -90 }}
          animate={{ y: 0, opacity: 1, rotateX: 0 }}
          exit={{ y: -30, opacity: 0, rotateX: 90 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
        >
          {value || "—"}
        </motion.span>
      </AnimatePresence>
    </motion.div>
  );
}
