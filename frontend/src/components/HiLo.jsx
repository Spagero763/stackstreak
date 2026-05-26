import { useCallback, useEffect, useState } from "react";
import { explorerTx } from "../config";
import { hiloStart, hiloGuess, getHiloState } from "../stacks";
import { readableError } from "./util";

export default function HiLo({ address, onConnect }) {
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [lastTx, setLastTx] = useState(null);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!address) return;
    try {
      setState(await getHiloState(address));
    } catch (e) {
      setError(readableError(e, "Higher or Lower"));
    }
  }, [address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const run = async (fn) => {
    if (!address) return onConnect();
    setError(null);
    setBusy(true);
    try {
      setLastTx(await fn());
      setTimeout(refresh, 12000);
    } catch (e) {
      setError(readableError(e, "Higher or Lower"));
    } finally {
      setBusy(false);
    }
  };

  const active = state?.active;

  return (
    <>
      <section className="hero">
        <h1>Higher or Lower 🔢</h1>
        <p className="sub">
          A number from 1–100 is revealed. Call whether the next is higher or
          lower. Chain correct calls to grow your run — one miss ends it.
        </p>
      </section>

      {error && <div className="banner error">{error}</div>}

      <section className="play-card">
        <div className="hilo-current">{state?.current ?? "—"}</div>
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
          <button
            className="play-btn"
            disabled={busy}
            onClick={() => run(() => hiloStart())}
          >
            {state && state.plays > 0 ? "Start new run" : "Start"}
          </button>
        )}
        {busy && <p className="hint">Confirm in wallet…</p>}
        {lastTx && (
          <p className="hint">
            Submitted!{" "}
            <a href={explorerTx(lastTx)} target="_blank" rel="noreferrer">
              View transaction ↗
            </a>{" "}
            — updates when it confirms.
          </p>
        )}
      </section>

      {state && (
        <section className="stats-grid">
          <Stat label="Current run" value={state.run} />
          <Stat label="Best run" value={state.bestRun} />
          <Stat label="Status" value={active ? "live" : "ended"} />
          <Stat label="Calls" value={state.plays} />
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
