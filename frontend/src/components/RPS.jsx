import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  rpsPlay,
  getRpsStats,
  getRpsTop,
  getRecentRps,
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
import Icon from "./Icon.jsx";

const HAND = ["rock", "paper", "scissors"];
const NAME = ["Rock", "Paper", "Scissors"];
const OUTCOME = ["Draw", "You won", "You lost"];
const OUTCOME_CLASS = ["result-draw", "result-win", "result-lose"];

export default function RPS({ address, onConnect }) {
  const { txToast } = useToast();
  const [stats, setStats] = useState(null);
  const [top, setTop] = useState(null);
  const [feed, setFeed] = useState([]);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null); // move you submitted
  const [lastTx, setLastTx] = useState(null);
  const [error, setError] = useState(null);
  const [revealed, setRevealed] = useState(null);
  const lastTxRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const [t, f] = await Promise.all([
        getRpsTop().catch(() => null),
        getRecentRps(15).catch(() => []),
      ]);
      setTop(t);
      setFeed(f);
      if (address) setStats(await getRpsStats(address));
    } catch (e) {
      setError(readableError(e, "Rock-Paper-Scissors"));
    }
  }, [address]);

  useEffect(() => {
    refresh();
  }, [refresh]);
  usePoll(refresh);

  useEffect(() => {
    if (!lastTxRef.current) return;
    const hit = feed.find((f) => f.txId === lastTxRef.current);
    if (hit) {
      setRevealed(hit);
      lastTxRef.current = null;
    }
  }, [feed]);

  const call = async (move) => {
    if (!address) return onConnect();
    setError(null);
    setBusy(true);
    setPending(move);
    setRevealed(null);
    try {
      const tx = await rpsPlay(move);
      setLastTx(tx);
      txToast(tx, "RPS round");
      lastTxRef.current = tx;
      setTimeout(refresh, 11000);
    } catch (e) {
      setError(readableError(e, "Rock-Paper-Scissors"));
    } finally {
      setBusy(false);
    }
  };

  // Pick the hand to show for "you": revealed wins, else pending, else hidden.
  const youMove = revealed?.move ?? pending;
  const houseMove = revealed?.house;

  return (
    <>
      <Hero
        icon="rps"
        title="Rock · Paper · Scissors"
        sub="Play against the contract. It picks its move from on-chain entropy and scores the round. Every play is one transaction."
      />

      <HowTo
        steps={[
          "Choose Rock, Paper, or Scissors.",
          "The contract picks its move from on-chain entropy.",
          "Beat it to grow your win streak.",
        ]}
      />

      <ChampionBanner
        label="holds the longest win streak"
        address={top?.player}
        value={top ? `${top.streak}` : null}
        you={top?.player && top.player === address}
      />

      {error && <div className="banner error">{error}</div>}

      <section className="play-card">
        <div className="rps-stage">
          <Hand label="You" move={youMove} animate={busy && !revealed} />
          <div className="rps-vs">VS</div>
          <Hand label="House" move={houseMove} animate={busy && !revealed} />
        </div>

        <AnimatePresence>
          {revealed && (
            <motion.div
              key={revealed.txId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className={`result-badge ${OUTCOME_CLASS[revealed.outcome]}`}
              style={{ display: "block", margin: "8px auto", width: "fit-content" }}
            >
              {OUTCOME[revealed.outcome]} ·{" "}
              {NAME[revealed.move]} vs {NAME[revealed.house]}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="choice-row">
          {[0, 1, 2].map((id) => (
            <button
              key={id}
              className="btn big btn-icon"
              disabled={busy}
              onClick={() => call(id)}
            >
              <Icon name={HAND[id]} size={20} strokeWidth={2} /> {NAME[id]}
            </button>
          ))}
        </div>
        {busy && <p className="hint">Confirm in wallet…</p>}
        <TxHint txid={lastTx} />
      </section>

      {stats && (
        <section className="stats-grid">
          <StatTile label="Streak" value={`${stats.streak}`} accent />
          <StatTile label="Wins" value={stats.wins} />
          <StatTile label="Losses" value={stats.losses} />
          <StatTile label="Draws" value={stats.draws} />
        </section>
      )}

      {stats && stats.plays > 0 && (
        <div className="share-row">
          <ShareButton
            text={`${stats.wins} wins and a ${stats.streak} streak at on-chain Rock-Paper-Scissors on StackStreak (@Stacks). The contract plays you — provably fair. Try it:`}
            label="𝕏  Share my record"
          />
        </div>
      )}

      <FeedList
        title="Live rounds"
        items={feed}
        pulse
        emptyText="No rounds yet — be the first."
        renderRow={(r) => (
          <>
            <span className="mono">{short(r.player)}</span>
            <span className="rps-feed-row">
              <Icon name={HAND[r.move]} size={16} /> vs{" "}
              <Icon name={HAND[r.house]} size={16} />
            </span>
            <span className={`muted ${r.outcome === 1 ? "strong" : ""}`}>
              {r.outcome === 0 ? "draw" : r.outcome === 1 ? "won" : "lost"}
            </span>
          </>
        )}
      />
    </>
  );
}

function Hand({ label, move, animate }) {
  const showIcon = !animate && move != null;
  return (
    <div>
      <motion.div
        className="rps-hand"
        animate={
          animate
            ? { rotate: [0, -18, 18, -18, 18, 0], y: [0, -6, 0, -6, 0] }
            : { rotate: 0, y: 0 }
        }
        transition={
          animate
            ? { duration: 0.5, repeat: Infinity }
            : { type: "spring", stiffness: 320, damping: 18 }
        }
      >
        {showIcon ? (
          <Icon name={HAND[move]} size={62} strokeWidth={1.6} />
        ) : (
          <span className="rps-q">?</span>
        )}
      </motion.div>
      <div className="rps-label">{label}</div>
    </div>
  );
}
