import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  coinFlip,
  getCoinStats,
  getCoinTop,
  getRecentFlips,
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

const FACE = { 0: "H", 1: "T" };
const LABEL = { 0: "Heads", 1: "Tails" };

export default function CoinFlip({ address, onConnect }) {
  const { txToast } = useToast();
  const [stats, setStats] = useState(null);
  const [top, setTop] = useState(null);
  const [feed, setFeed] = useState([]);
  const [busy, setBusy] = useState(false);
  const [lastTx, setLastTx] = useState(null);
  const [error, setError] = useState(null);
  // Locally-derived "last result" for visual reveal — drawn from the freshest
  // feed entry for this address, after a flip lands on chain.
  const [revealed, setRevealed] = useState(null);
  const lastTxRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const [t, f] = await Promise.all([
        getCoinTop().catch(() => null),
        getRecentFlips(15).catch(() => []),
      ]);
      setTop(t);
      setFeed(f);
      if (address) setStats(await getCoinStats(address));
    } catch (e) {
      setError(readableError(e, "Coin Flip"));
    }
  }, [address]);

  useEffect(() => {
    refresh();
  }, [refresh]);
  usePoll(refresh);

  // When a flip we submitted shows up in the feed, animate the reveal.
  useEffect(() => {
    if (!lastTxRef.current) return;
    const hit = feed.find((f) => f.txId === lastTxRef.current);
    if (hit) {
      setRevealed(hit);
      lastTxRef.current = null;
    }
  }, [feed]);

  const call = async (guess) => {
    if (!address) return onConnect();
    setError(null);
    setBusy(true);
    setRevealed(null);
    try {
      const tx = await coinFlip(guess);
      setLastTx(tx);
      txToast(tx, "Coin flip");
      lastTxRef.current = tx;
      setTimeout(refresh, 11000);
    } catch (e) {
      setError(readableError(e, "Coin Flip"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Hero
        icon="coinflip"
        title="Coin Flip"
        sub="Call it. The contract flips using on-chain entropy — get it right to build a streak. Every flip is one transaction."
      />

      <HowTo
        steps={[
          "Call Heads or Tails.",
          "The contract flips using on-chain entropy from the live Bitcoin block.",
          "Match the result to extend your streak — one miss resets it.",
        ]}
      />

      <ChampionBanner
        label="holds the longest streak"
        address={top?.player}
        value={top ? `${top.streak}` : null}
        you={top?.player && top.player === address}
      />

      {error && <div className="banner error">{error}</div>}

      <section className="play-card">
        <div className="coin-stage">
          <Coin spinning={busy} revealed={revealed} />
          <AnimatePresence>
            {revealed && (
              <motion.div
                key={revealed.txId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className={`result-badge ${
                  revealed.won ? "result-win" : "result-lose"
                }`}
              >
                {revealed.won ? "you won" : "house won"} · landed {LABEL[revealed.result].toLowerCase()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="choice-row">
          <button className="btn big" disabled={busy} onClick={() => call(0)}>
            Heads
          </button>
          <button className="btn big" disabled={busy} onClick={() => call(1)}>
            Tails
          </button>
        </div>
        {busy && <p className="hint">Confirm in wallet…</p>}
        <TxHint txid={lastTx} />
      </section>

      {stats && (
        <section className="stats-grid">
          <StatTile label="Streak" value={`${stats.streak}`} accent />
          <StatTile label="Best streak" value={stats.bestStreak} />
          <StatTile label="Wins" value={stats.wins} />
          <StatTile label="Flips" value={stats.flips} />
        </section>
      )}

      {stats && stats.flips > 0 && (
        <div className="share-row">
          <ShareButton
            text={`I'm on a ${stats.streak} Coin Flip streak on StackStreak — provably-fair, on-chain on @Stacks. Every flip is one Bitcoin-settled tx. Beat me:`}
            label="𝕏  Share my streak"
          />
        </div>
      )}

      <FeedList
        title="Live flips"
        items={feed}
        pulse
        emptyText="No flips yet — yours will land here."
        renderRow={(f) => (
          <>
            <span className="mono">{short(f.player)}</span>
            <span>
              guessed <b>{LABEL[f.guess]}</b> · landed{" "}
              <b className="strong">{LABEL[f.result]}</b>
            </span>
            <span className={`muted ${f.won ? "strong" : ""}`}>
              {f.won ? `won · ${f.streak}` : "lost"}
            </span>
          </>
        )}
      />
    </>
  );
}

function Coin({ spinning, revealed }) {
  // While the tx is in-flight, spin the coin. Once a result comes back,
  // settle on the face that landed.
  const settledFace = revealed ? FACE[revealed.result] : "?";
  return (
    <motion.div
      className="coin"
      animate={
        spinning
          ? { rotateY: [0, 360, 720, 1080], scale: [1, 1.05, 1, 1.05, 1] }
          : revealed
            ? { rotateY: 1440, scale: [1, 1.1, 1] }
            : { rotateY: 0 }
      }
      transition={
        spinning
          ? { duration: 1.2, repeat: Infinity, ease: "linear" }
          : { duration: 0.9, ease: "easeOut" }
      }
    >
      <span className="coin-face">{spinning ? "?" : settledFace}</span>
    </motion.div>
  );
}
