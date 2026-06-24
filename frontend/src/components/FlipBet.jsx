import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  betFlip,
  fundPot,
  getBetStats,
  getBetPot,
  getBetTop,
  getRecentBets,
  getStxAddress,
  WAGER_USTX,
} from "../stacks";
import { CONTRACT_ADDRESS } from "../config";
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
const NAME = { 0: "Heads", 1: "Tails" };
const stx = (ustx) =>
  `${(ustx / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 6 })} STX`;

export default function FlipBet({ address, onConnect }) {
  const { txToast } = useToast();
  const [pot, setPot] = useState(0);
  const [stats, setStats] = useState(null);
  const [top, setTop] = useState(null);
  const [feed, setFeed] = useState([]);
  const [busy, setBusy] = useState(false);
  const [lastTx, setLastTx] = useState(null);
  const [error, setError] = useState(null);
  // Visual reveal: for a real bet, drawn from the feed once it confirms; for a
  // demo flip, generated locally.
  const [revealed, setRevealed] = useState(null);
  const [demo, setDemo] = useState(null);
  const lastTxRef = useRef(null);

  const isOwner = address && address === CONTRACT_ADDRESS;

  const refresh = useCallback(async () => {
    try {
      const [p, t, f] = await Promise.all([
        getBetPot().catch(() => 0),
        getBetTop().catch(() => null),
        getRecentBets(15).catch(() => []),
      ]);
      setPot(p);
      setTop(t);
      setFeed(f);
      if (address) setStats(await getBetStats(address));
    } catch (e) {
      setError(readableError(e, "Flip to Win"));
    }
  }, [address]);

  useEffect(() => {
    refresh();
  }, [refresh]);
  usePoll(refresh);

  // Reveal a real bet once it lands in the feed.
  useEffect(() => {
    if (!lastTxRef.current) return;
    const hit = feed.find((f) => f.txId === lastTxRef.current);
    if (hit) {
      setRevealed({ ...hit, real: true });
      lastTxRef.current = null;
    }
  }, [feed]);

  // Instant client-side flip so anyone can feel the game before connecting.
  const playDemo = (guess) => {
    setError(null);
    setRevealed(null);
    setDemo("spin");
    setTimeout(() => {
      const result = Math.random() < 0.5 ? 0 : 1;
      setDemo(null);
      setRevealed({ guess, result, won: guess === result, demo: true });
    }, 1100);
  };

  const placeBet = async (guess) => {
    if (!address) return playDemo(guess);
    setError(null);
    setBusy(true);
    setRevealed(null);
    try {
      const tx = await betFlip(guess);
      setLastTx(tx);
      lastTxRef.current = tx;
      txToast(tx, "Bet");
      setTimeout(refresh, 11000);
    } catch (e) {
      setError(readableError(e, "Flip to Win"));
    } finally {
      setBusy(false);
    }
  };

  const onFund = async () => {
    const amount = 1_000_000; // 1 STX top-up
    setBusy(true);
    try {
      const tx = await fundPot(amount);
      txToast(tx, "Pot top-up");
      setTimeout(refresh, 11000);
    } catch (e) {
      setError(readableError(e, "Fund pot"));
    } finally {
      setBusy(false);
    }
  };

  const spinning = busy || demo === "spin";

  return (
    <>
      <Hero
        icon="coinflip"
        title="Flip to win."
        sub={`Stake ${stx(WAGER_USTX)}, call heads or tails. Guess right and ${stx(2 * WAGER_USTX)} lands in your wallet — instantly, provably fair, no house edge.`}
      />

      <HowTo
        steps={[
          `Pick Heads or Tails and stake ${stx(WAGER_USTX)}.`,
          "The contract flips using the live Bitcoin block — nobody can rig it.",
          `Call it right and win ${stx(2 * WAGER_USTX)} straight to your wallet; miss and your stake stays in the pot.`,
        ]}
      />

      <div className="pot-banner">
        <span className="pot-label">Prize pool</span>
        <span className="pot-value">{stx(pot)}</span>
      </div>

      <ChampionBanner
        label="has won the most flips"
        address={top?.player}
        value={top ? `${top.wins} wins` : null}
        you={top?.player && top.player === address}
      />

      {error && <div className="banner error">{error}</div>}

      <section className="play-card">
        <div className="coin-stage">
          <Coin spinning={spinning} revealed={revealed} />
          <AnimatePresence>
            {revealed && (
              <motion.div
                key={revealed.txId || "demo"}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className={`result-badge ${revealed.won ? "result-win" : "result-lose"}`}
              >
                {revealed.demo ? (
                  revealed.won ? (
                    <>landed {NAME[revealed.result]} — you'd have won! Connect to play for real</>
                  ) : (
                    <>landed {NAME[revealed.result]} — so close. Connect & try for real</>
                  )
                ) : revealed.won ? (
                  <>you won {stx(2 * WAGER_USTX)} 🎉</>
                ) : (
                  <>house won — landed {NAME[revealed.result]}</>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="choice-row">
          <button className="btn big" disabled={spinning} onClick={() => placeBet(0)}>
            Heads
          </button>
          <button className="btn big" disabled={spinning} onClick={() => placeBet(1)}>
            Tails
          </button>
        </div>
        <p className="hint">
          {!address
            ? "Try a free demo flip — then connect a wallet to bet real STX."
            : busy
              ? "Confirm in your wallet…"
              : `Each flip stakes ${stx(WAGER_USTX)}.`}
        </p>
        <TxHint txid={lastTx} label="Bet submitted!" />
      </section>

      {stats && stats.bets > 0 && (
        <>
          <section className="stats-grid">
            <StatTile label="Streak" value={stats.streak} accent />
            <StatTile label="Wins" value={stats.wins} />
            <StatTile label="Bets" value={stats.bets} />
            <StatTile label="Won" value={stx(stats.won)} />
          </section>
          <div className="share-row">
            <ShareButton
              text={`I'm flipping for real STX on StackStreak — ${stats.wins} wins, ${stx(stats.won)} won. Provably-fair coin flip on @Stacks, no house edge. Try it:`}
              label="Share my wins"
            />
          </div>
        </>
      )}

      {isOwner && (
        <details className="howto-game owner-panel">
          <summary>Owner: pot controls</summary>
          <p className="howto-game-note">
            The pot pays winners. Top it up so players can keep winning. Current
            pool: {stx(pot)}.
          </p>
          <button className="btn" disabled={busy} onClick={onFund}>
            Add 1 STX to the pot
          </button>
        </details>
      )}

      <FeedList
        title="Live flips"
        items={feed}
        pulse
        emptyText="No bets yet — be the first to flip."
        renderRow={(b) => (
          <>
            <span className="mono">{short(b.player)}</span>
            <span>
              called <b>{NAME[b.guess]}</b> · landed{" "}
              <b className="strong">{NAME[b.result]}</b>
            </span>
            <span className={`muted ${b.won ? "strong" : ""}`}>
              {b.won ? `won ${stx(b.payout)}` : "lost"}
            </span>
          </>
        )}
      />
    </>
  );
}

function Coin({ spinning, revealed }) {
  const settledFace = revealed ? FACE[revealed.result] : "?";
  return (
    <motion.div
      className="coin"
      animate={
        spinning
          ? { rotateY: [0, 360, 720, 1080], scale: [1, 1.05, 1, 1.05, 1] }
          : revealed
            ? { rotateY: 1440, scale: [1, 1.12, 1] }
            : { rotateY: 0 }
      }
      transition={
        spinning
          ? { duration: 1.1, repeat: Infinity, ease: "linear" }
          : { duration: 0.9, ease: "easeOut" }
      }
    >
      <span className="coin-face">{spinning ? "?" : settledFace}</span>
    </motion.div>
  );
}
