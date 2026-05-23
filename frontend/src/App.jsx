import { useCallback, useEffect, useState } from "react";
import {
  APP_NAME,
  NETWORK,
  CONTRACT_ADDRESS,
  CONTRACT_NAME,
  IS_CONFIGURED,
  explorerTx,
  explorerContract,
} from "./config";
import {
  isWalletConnected,
  getStxAddress,
  connectWallet,
  disconnectWallet,
  play,
  getStats,
  getLeaderboard,
  getTotalPlays,
} from "./stacks";

const short = (a) => (a ? `${a.slice(0, 5)}…${a.slice(-4)}` : "");

export default function App() {
  const [address, setAddress] = useState(null);
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [totalPlays, setTotalPlays] = useState(0);
  const [lastTx, setLastTx] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isWalletConnected()) setAddress(getStxAddress());
  }, []);

  const refresh = useCallback(async () => {
    if (!IS_CONFIGURED) return;
    setLoading(true);
    setError(null);
    try {
      const [board, total] = await Promise.all([
        getLeaderboard(25),
        getTotalPlays(),
      ]);
      setLeaderboard(board);
      setTotalPlays(total);
      if (address) setStats(await getStats(address));
    } catch (e) {
      setError(readableError(e));
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onConnect = async () => {
    try {
      setAddress(await connectWallet());
    } catch (e) {
      setError(readableError(e));
    }
  };

  const onDisconnect = () => {
    disconnectWallet();
    setAddress(null);
    setStats(null);
  };

  const onPlay = async () => {
    setError(null);
    setPlaying(true);
    try {
      const txid = await play();
      setLastTx(txid);
      // The score updates on-chain once the tx confirms; refresh shortly after.
      setTimeout(refresh, 12000);
    } catch (e) {
      setError(readableError(e));
    } finally {
      setPlaying(false);
    }
  };

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <span className="logo">⚡</span>
          <span className="brand-name">{APP_NAME}</span>
          <span className={`net net-${NETWORK}`}>{NETWORK}</span>
        </div>
        {address ? (
          <button className="btn ghost" onClick={onDisconnect}>
            {short(address)} · disconnect
          </button>
        ) : (
          <button className="btn" onClick={onConnect}>
            Connect wallet
          </button>
        )}
      </header>

      <main className="main">
        <section className="hero">
          <h1>Play once. Build your streak. Climb the chain.</h1>
          <p className="sub">
            A fully on-chain, provably-fair daily game on Stacks. Every tap is a
            single transaction — your score is rolled by the contract from the
            current Bitcoin block, so nobody can fake it.
          </p>
        </section>

        {!IS_CONFIGURED && (
          <div className="banner warn">
            Contract not configured yet. After deploying, set{" "}
            <code>VITE_CONTRACT_ADDRESS</code> in <code>.env</code> and reload.
          </div>
        )}

        {error && <div className="banner error">{error}</div>}

        <section className="play-card">
          <button
            className="play-btn"
            onClick={onPlay}
            disabled={!address || !IS_CONFIGURED || playing}
          >
            {playing ? "Confirm in wallet…" : "▶  Play"}
          </button>
          {!address && (
            <p className="hint">Connect your wallet to play.</p>
          )}
          {lastTx && (
            <p className="hint">
              Play submitted!{" "}
              <a href={explorerTx(lastTx)} target="_blank" rel="noreferrer">
                View transaction ↗
              </a>{" "}
              — your stats update when it confirms.
            </p>
          )}
        </section>

        {stats && (
          <section className="stats-grid">
            <Stat label="Your score" value={stats.total} />
            <Stat label="Streak" value={`${stats.streak}🔥`} />
            <Stat label="Best roll" value={stats.best} />
            <Stat label="Plays" value={stats.plays} />
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
            <p className="empty">
              {IS_CONFIGURED
                ? "No plays yet — be the first on the board."
                : "Configure the contract to load the board."}
            </p>
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
                  <tr
                    key={row.address}
                    className={row.address === address ? "me" : ""}
                  >
                    <td>{medal(i)}</td>
                    <td className="mono">{short(row.address)}</td>
                    <td className="strong">{row.total}</td>
                    <td>{row.streak}🔥</td>
                    <td>{row.best}</td>
                    <td>{row.plays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>

      <footer className="footer">
        {IS_CONFIGURED ? (
          <a href={explorerContract()} target="_blank" rel="noreferrer">
            {CONTRACT_ADDRESS}.{CONTRACT_NAME} ↗
          </a>
        ) : (
          <span>Not deployed</span>
        )}
        <span>· Provably fair · No house · No admin keys</span>
      </footer>
    </div>
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

function medal(i) {
  return ["🥇", "🥈", "🥉"][i] ?? i + 1;
}

function readableError(e) {
  const msg = e?.message || String(e);
  if (/rejected|cancel/i.test(msg)) return "Request cancelled.";
  if (/no.*address|connect/i.test(msg)) return "Connect a Stacks wallet first.";
  return msg;
}
