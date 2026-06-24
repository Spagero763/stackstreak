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
import Reels from "./components/Reels.jsx";
import Quests from "./components/Quests.jsx";
import FlipBet from "./components/FlipBet.jsx";
import Icon from "./components/Icon.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

const short = (a) => (a ? `${a.slice(0, 5)}…${a.slice(-4)}` : "");

// Every view, keyed by id. The nav stays deliberately tiny — Flip to Win is the
// front door; everything else lives under "More games" (the Home hub) so a
// first-time visitor isn't overwhelmed.
const VIEWS = {
  flipbet: { name: "Flip to Win", icon: "coinflip", Component: FlipBet },
  home: { name: "More games", icon: "home", Component: Home },
  quests: { name: "Daily Quest", icon: "quest", Component: Quests },
  streak: { name: "Daily Streak", icon: "streak", Component: StreakGame },
  ttt: { name: "Tic-Tac-Toe", icon: "ttt", Component: TicTacToe },
  coinflip: { name: "Coin Flip", icon: "coinflip", Component: CoinFlip },
  rps: { name: "RPS", icon: "rps", Component: RPS },
  hilo: { name: "Higher / Lower", icon: "hilo", Component: HiLo },
  c4: { name: "Connect Four", icon: "c4", Component: ConnectFour },
  reels: { name: "Lucky Reels", icon: "reels", Component: Reels },
};
const TABS = ["flipbet", "home"];

export default function App() {
  const [address, setAddress] = useState(null);
  const [view, setView] = useState("flipbet");
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

  const active = VIEWS[view] || VIEWS.flipbet;
  const Active = active.Component;
  const onTab = TABS.includes(view);

  return (
    <div className="page">
      {/* Ambient aurora — slow drifting glow blobs behind everything */}
      <div className="aurora" aria-hidden>
        <span className="aurora-blob aurora-a" />
        <span className="aurora-blob aurora-b" />
        <span className="aurora-blob aurora-c" />
      </div>

      <header className="topbar">
        <div className="brand">
          <motion.img
            src="/mark.svg"
            alt=""
            className="logo-mark"
            initial={{ rotate: -8, scale: 0.9, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ rotate: -6, scale: 1.06 }}
          />
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

      <Marquee />

      <nav className="tabs">
        {TABS.map((id) => (
          <button
            key={id}
            className={`tab ${view === id ? "active" : ""}`}
            onClick={() => setView(id)}
          >
            <Icon name={VIEWS[id].icon} size={16} strokeWidth={2} />
            <span>{VIEWS[id].name}</span>
          </button>
        ))}
      </nav>

      {!onTab && (
        <button className="back-link" onClick={() => setView("home")}>
          ← All games
        </button>
      )}

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
            key={view}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          >
            <ErrorBoundary resetKey={view}>
              <Active
                address={address}
                onConnect={onConnect}
                onNavigate={setView}
              />
            </ErrorBoundary>
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

// Scrolling ticker — a signature "this was designed" detail, à la editorial sites.
function Marquee() {
  const items = [
    "FLIP TO WIN REAL STX",
    "PROVABLY FAIR",
    "SETTLED ON BITCOIN",
    "NO HOUSE EDGE",
    "INSTANT PAYOUTS",
    "ONE TX PER FLIP",
    "OPEN SOURCE",
  ];
  const strip = (
    <div className="marquee-strip" aria-hidden>
      {items.map((t, i) => (
        <span key={i} className="marquee-item">
          {t}
          <span className="marquee-dot">✦</span>
        </span>
      ))}
    </div>
  );
  return (
    <div className="marquee" role="presentation">
      {strip}
      {strip}
    </div>
  );
}
