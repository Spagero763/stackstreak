import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  APP_NAME,
  NETWORK,
  CONTRACT_ADDRESS,
  CONTRACT_NAME,
  IS_CONFIGURED,
  explorerContract,
} from "./config";
import {
  isWalletConnected,
  getStxAddress,
  connectWallet,
  disconnectWallet,
} from "./stacks";
import Home from "./components/Home.jsx";
import StreakGame from "./components/StreakGame.jsx";
import TicTacToe from "./components/TicTacToe.jsx";
import CoinFlip from "./components/CoinFlip.jsx";
import RPS from "./components/RPS.jsx";
import HiLo from "./components/HiLo.jsx";
import ConnectFour from "./components/ConnectFour.jsx";

const short = (a) => (a ? `${a.slice(0, 5)}…${a.slice(-4)}` : "");

const GAMES = [
  { id: "home", label: "🏠 Home", Component: Home },
  { id: "streak", label: "⚡ Daily Streak", Component: StreakGame },
  { id: "ttt", label: "⭕ Tic-Tac-Toe", Component: TicTacToe },
  { id: "coinflip", label: "🪙 Coin Flip", Component: CoinFlip },
  { id: "rps", label: "✊ RPS", Component: RPS },
  { id: "hilo", label: "🔢 Higher/Lower", Component: HiLo },
  { id: "c4", label: "🔴 Connect Four", Component: ConnectFour },
];

export default function App() {
  const [address, setAddress] = useState(null);
  const [view, setView] = useState("home");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isWalletConnected()) setAddress(getStxAddress());
  }, []);

  const onConnect = async () => {
    try {
      setAddress(await connectWallet());
    } catch (e) {
      setError(e?.message || "Could not connect wallet.");
    }
  };

  const onDisconnect = () => {
    disconnectWallet();
    setAddress(null);
  };

  const active = GAMES.find((g) => g.id === view) || GAMES[0];
  const Active = active.Component;

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <motion.span
            className="logo"
            animate={{ rotate: [0, -8, 8, -4, 4, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 4 }}
          >
            ⚡
          </motion.span>
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

      <nav className="tabs">
        {GAMES.map((g) => (
          <button
            key={g.id}
            className={`tab ${view === g.id ? "active" : ""}`}
            onClick={() => setView(g.id)}
          >
            {g.label}
          </button>
        ))}
      </nav>

      {error && <div className="banner error">{error}</div>}
      {!IS_CONFIGURED && (
        <div className="banner warn">
          Contract not configured. Set <code>VITE_CONTRACT_ADDRESS</code> and
          reload.
        </div>
      )}

      <main className="main">
        <AnimatePresence mode="wait">
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <Active
              address={address}
              onConnect={onConnect}
              onNavigate={setView}
            />
          </motion.div>
        </AnimatePresence>
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
