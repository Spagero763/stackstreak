import { useCallback, useEffect, useState } from "react";
import { explorerTx } from "../config";
import { rpsPlay, getRpsStats } from "../stacks";
import { readableError } from "./util";

const MOVES = [
  { id: 0, label: "🪨 Rock" },
  { id: 1, label: "📄 Paper" },
  { id: 2, label: "✂️ Scissors" },
];

export default function RPS({ address, onConnect }) {
  const [stats, setStats] = useState(null);
  const [busy, setBusy] = useState(false);
  const [lastTx, setLastTx] = useState(null);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!address) return;
    try {
      setStats(await getRpsStats(address));
    } catch (e) {
      setError(readableError(e, "Rock-Paper-Scissors"));
    }
  }, [address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const call = async (move) => {
    if (!address) return onConnect();
    setError(null);
    setBusy(true);
    try {
      setLastTx(await rpsPlay(move));
      setTimeout(refresh, 12000);
    } catch (e) {
      setError(readableError(e, "Rock-Paper-Scissors"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className="hero">
        <h1>Rock · Paper · Scissors ✊</h1>
        <p className="sub">
          Play against the contract. It picks its move from on-chain entropy and
          scores the round. Every play is one transaction.
        </p>
      </section>

      {error && <div className="banner error">{error}</div>}

      <section className="play-card">
        <div className="choice-row">
          {MOVES.map((m) => (
            <button
              key={m.id}
              className="btn big"
              disabled={busy}
              onClick={() => call(m.id)}
            >
              {m.label}
            </button>
          ))}
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
          <Stat label="Wins" value={stats.wins} />
          <Stat label="Losses" value={stats.losses} />
          <Stat label="Draws" value={stats.draws} />
          <Stat label="Streak" value={`${stats.streak}🔥`} />
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
