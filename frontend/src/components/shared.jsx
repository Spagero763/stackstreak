// Shared visual primitives used across every game tab: hero, animated stat
// tiles, the champion ribbon, animated feeds, txid hint, and the live "pulse"
// indicator on auto-refresh. Keeps individual game components lean.
import { AnimatePresence, motion } from "framer-motion";
import { explorerTx } from "../config";
import { short } from "./util";

/* ------------ Hero ------------ */
export function Hero({ emoji, title, sub }) {
  return (
    <motion.section
      className="hero hero-pad"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="hero-emoji">{emoji}</div>
      <h1>{title}</h1>
      <p className="sub">{sub}</p>
    </motion.section>
  );
}

/* ------------ Animated stat tile ------------ */
export function StatTile({ label, value, accent }) {
  return (
    <motion.div
      className={`stat ${accent ? "stat-accent" : ""}`}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
    >
      <AnimatePresence mode="popLayout">
        <motion.div
          key={String(value)}
          className="stat-value"
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          transition={{ type: "spring", stiffness: 360, damping: 26 }}
        >
          {value}
        </motion.div>
      </AnimatePresence>
      <div className="stat-label">{label}</div>
    </motion.div>
  );
}

/* ------------ Champion ribbon ------------ */
export function ChampionBanner({ icon = "👑", label, address, value, you }) {
  if (!address) {
    return (
      <div className="champion champion-empty">
        <span className="champion-icon">{icon}</span>
        <span className="champion-text">No champion yet — claim the throne.</span>
      </div>
    );
  }
  return (
    <motion.div
      className={`champion ${you ? "champion-you" : ""}`}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 340, damping: 24 }}
    >
      <span className="champion-icon" aria-hidden>{icon}</span>
      <span className="champion-text">
        <b className="mono">{short(address)}</b> {label}
      </span>
      <span className="champion-value">{value}</span>
    </motion.div>
  );
}

/* ------------ Live feed ------------ */
export function FeedList({ title, items, emptyText, renderRow, pulse }) {
  return (
    <section className="feed">
      <div className="feed-head">
        <h2>{title}</h2>
        {pulse && <span className="pulse-dot" aria-label="live" />}
      </div>
      {items.length === 0 ? (
        <p className="empty">{emptyText}</p>
      ) : (
        <ul className="feed-list">
          <AnimatePresence initial={false}>
            {items.map((it, i) => (
              <motion.li
                key={it.txId || `${i}-${it.player || ""}`}
                layout
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
              >
                {renderRow(it)}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}

/* ------------ Tx submission hint ------------ */
export function TxHint({ txid, label = "Submitted!" }) {
  if (!txid) return null;
  return (
    <motion.p
      className="hint"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {label}{" "}
      <a href={explorerTx(txid)} target="_blank" rel="noreferrer">
        View transaction ↗
      </a>{" "}
      — stats update when it confirms.
    </motion.p>
  );
}

/* ------------ Share to X ------------ */
// One-tap share so a player who's doing well can recruit others — every share
// links back to the live arcade. `text` is the tweet body; the site URL is
// appended automatically.
export function ShareButton({ text, label = "𝕏  Share" }) {
  const url = typeof window !== "undefined" ? window.location.origin : "";
  const href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    text,
  )}&url=${encodeURIComponent(url)}`;
  return (
    <a className="btn ghost share" href={href} target="_blank" rel="noreferrer">
      {label}
    </a>
  );
}

/* ------------ Empty / loading skeleton block ------------ */
export function Skeleton({ rows = 3 }) {
  return (
    <div className="skeleton">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-row" />
      ))}
    </div>
  );
}
