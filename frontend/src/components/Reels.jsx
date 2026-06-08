import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  reelsSpin,
  getReelsStats,
  getReelsTop,
  getRecentSpins,
} from "../stacks";
import { readableError, short } from "./util";
import { ChampionBanner, FeedList, Hero, ShareButton, StatTile, TxHint } from "./shared.jsx";

const SYM = ["🍒", "🍋", "🔔", "⭐", "💎", "7️⃣"];
const TIER_LABEL = { 0: "no win", 1: "pair!", 2: "JACKPOT!" };
const sym = (i) => SYM[i] ?? "❔";

export default function Reels({ address, onConnect }) {
  const [stats, setStats] = useState(null);
  const [top, setTop] = useState(null);
  const [feed, setFeed] = useState([]);
  const [busy, setBusy] = useState(false);
  const [lastTx, setLastTx] = useState(null);
  const [error, setError] = useState(null);
  const [revealed, setRevealed] = useState(null);
  const lastTxRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const [t, f] = await Promise.all([
        getReelsTop().catch(() => null),
        getRecentSpins(15).catch(() => []),
      ]);
      setTop(t);
      setFeed(f);
      if (address) setStats(await getReelsStats(address));
    } catch (e) {
      setError(readableError(e, "Lucky Reels"));
    }
  }, [address]);

  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(() => {
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [refresh]);

  // Reveal the just-confirmed spin once it lands in the feed.
  useEffect(() => {
    if (!lastTxRef.current) return;
    const hit = feed.find((f) => f.txId === lastTxRef.current);
    if (hit) {
      setRevealed(hit);
      lastTxRef.current = null;
    }
  }, [feed]);

  const onSpin = async () => {
    if (!address) return onConnect();
    setError(null);
    setBusy(true);
    setRevealed(null);
    try {
      const tx = await reelsSpin();
      setLastTx(tx);
      lastTxRef.current = tx;
      setTimeout(refresh, 11000);
    } catch (e) {
      setError(readableError(e, "Lucky Reels"));
    } finally {
      setBusy(false);
    }
  };

  const faces = revealed ? revealed.reels : [null, null, null];

  return (
    <>
      <Hero
        emoji="🎰"
        title="Lucky Reels"
        sub="Pull once — the contract draws three symbols from on-chain entropy. Any pair wins and extends your streak; three-of-a-kind is a jackpot. One spin, one transaction, no house edge."
      />

      <ChampionBanner
        icon="🎰"
        label="has hit the most jackpots"
        address={top?.player}
        value={top ? `${top.jackpots}🎰` : null}
        you={top?.player && top.player === address}
      />

      {error && <div className="banner error">{error}</div>}

      <section className="play-card">
        <div className="reels-stage">
          {faces.map((f, i) => (
            <Reel key={i} spinning={busy} face={f} index={i} />
          ))}
        </div>

        <AnimatePresence>
          {revealed && (
            <motion.div
              key={revealed.txId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className={`result-badge ${
                revealed.tier === 2
                  ? "result-win"
                  : revealed.tier === 1
                    ? "result-draw"
                    : "result-lose"
              }`}
            >
              {TIER_LABEL[revealed.tier]}
              {revealed.tier > 0 ? ` · ${revealed.streak}🔥` : ""}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="choice-row">
          <button className="btn big" disabled={busy} onClick={onSpin}>
            {busy ? "Spinning…" : address ? "🎰  Spin" : "Connect to spin"}
          </button>
        </div>
        {busy && <p className="hint">Confirm in wallet…</p>}
        <TxHint txid={lastTx} label="Spin submitted!" />
      </section>

      {stats && (
        <section className="stats-grid">
          <StatTile label="Streak" value={`${stats.streak}🔥`} accent />
          <StatTile label="Jackpots" value={`${stats.jackpots}🎰`} />
          <StatTile label="Wins" value={stats.wins} />
          <StatTile label="Spins" value={stats.spins} />
        </section>
      )}

      {stats && stats.spins > 0 && (
        <div className="share-row">
          <ShareButton
            text={`${stats.jackpots}🎰 jackpots on Lucky Reels — an on-chain slot machine on @Stacks. The reels are drawn from the Bitcoin block, provably fair, no house. Spin free:`}
            label="𝕏  Share my jackpots"
          />
        </div>
      )}

      <FeedList
        title="Live spins"
        items={feed}
        pulse
        emptyText="No spins yet — yours will land here."
        renderRow={(s) => (
          <>
            <span className="mono">{short(s.player)}</span>
            <span className="reels-row">
              {s.reels.map((r, i) => (
                <span key={i}>{sym(r)}</span>
              ))}
            </span>
            <span className={`muted ${s.tier > 0 ? "strong" : ""}`}>
              {s.tier === 2 ? `jackpot · ${s.streak}🔥` : s.tier === 1 ? `pair · ${s.streak}🔥` : "—"}
            </span>
          </>
        )}
      />
    </>
  );
}

function Reel({ spinning, face, index }) {
  // While the tx is in-flight, cycle symbols; settle on the drawn face.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!spinning) return;
    const t = setInterval(() => setTick((n) => n + 1), 90 + index * 30);
    return () => clearInterval(t);
  }, [spinning, index]);

  const shown = spinning ? sym((tick + index) % SYM.length) : face != null ? sym(face) : "❔";
  return (
    <motion.div
      className="reel"
      animate={spinning ? { y: [0, -6, 0] } : { scale: [1, 1.08, 1] }}
      transition={
        spinning
          ? { duration: 0.3, repeat: Infinity, delay: index * 0.05 }
          : { duration: 0.5, ease: "easeOut" }
      }
    >
      <span className="reel-face">{shown}</span>
    </motion.div>
  );
}
