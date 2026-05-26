import { useCallback, useEffect, useState } from "react";
import { explorerTx } from "../config";
import { coinFlip, getCoinStats } from "../stacks";
import { readableError } from "./util";

export default function CoinFlip({ address, onConnect }) {
  const [stats, setStats] = useState(null);
  const [busy, setBusy] = useState(false);
  const [lastTx, setLastTx] = useState(null);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!address) return;
    try {
      setStats(await getCoinStats(address));
    } catch (e) {
      setError(readableError(e, "Coin Flip"));
    }
  }, [address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const call = async (guess) => {
    if (!address) return onConnect();
    setError(null);
    setBusy(true);
    try {
      setLastTx(await coinFlip(guess));
      setTimeout(refresh, 12000);
    } catch (e) {
      setError(readableError(e, "Coin Flip"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className="hero">
        <h1>Coin Flip 🪙</h1>
        <p className="sub">
          Call it. The contract flips using on-chain entropy — get it right to
          build a streak. Every flip is one transaction.
        </p>
      </section>

      {error && <div className="banner error">{error}</div>}

      <section className="play-card">
        <div className="choice-row">
          <button className="btn big" disabled={busy} onClick={() => call(0)}>
            Heads
          </button>
          <button className="btn big" disabled={busy} onClick={() => call(1)}>
            Tails
          </button>
        </div>
        {busy && <p className="hint">Confirm in wallet…</p>}
        {lastTx && (
          <p className="hint">
            Submitted!{" "}
            <a href={explorerTx(lastTx)} target="_blank" rel="noreferrer">
              View transaction ↗
            </a>{" "}
            — stats update when it confirms.
          </p>
        )}
      </section>

      {stats && (
        <section className="stats-grid">
          <Stat label="Streak" value={`${stats.streak}🔥`} />
          <Stat label="Best streak" value={stats.bestStreak} />
          <Stat label="Wins" value={stats.wins} />
          <Stat label="Flips" value={stats.flips} />
        </section>
      )}
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
