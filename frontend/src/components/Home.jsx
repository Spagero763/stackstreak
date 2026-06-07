import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  getTop,
  getCoinTop,
  getRpsTop,
  getHiloTop,
  getPlayers,
  getTotalPlays,
  getGameCount,
  getC4Count,
  getRecentPlays,
  getRecentFlips,
  getRecentRps,
  getRecentHilo,
  getRecentC4,
  getReelsTop,
  getRecentSpins,
} from "../stacks";
import { short } from "./util";
import { Hero, StatTile, FeedList } from "./shared.jsx";

// One card per game on the hub. `id` matches the tab id in App.jsx so a click
// can deep-link straight into the game.
const GAME_CARDS = [
  { id: "streak", icon: "⚡", name: "Daily Streak", blurb: "Roll & climb" },
  { id: "ttt", icon: "⭕", name: "Tic-Tac-Toe", blurb: "PvP, 3-in-a-row" },
  { id: "coinflip", icon: "🪙", name: "Coin Flip", blurb: "Call it" },
  { id: "rps", icon: "✊", name: "Rock-Paper-Scissors", blurb: "Beat the contract" },
  { id: "hilo", icon: "🔢", name: "Higher / Lower", blurb: "Extend your run" },
  { id: "c4", icon: "🔴", name: "Connect Four", blurb: "PvP, 4-in-a-row" },
  { id: "reels", icon: "🎰", name: "Lucky Reels", blurb: "Spin for a jackpot" },
];

// RPS outcome codes mirror the contract: 0 draw, 1 win, 2 loss.
const RPS_OUTCOME = ["drew", "won", "lost"];

// Round-robin merge so the combined feed mixes games instead of clumping one
// game's events together. Events carry no shared timestamp across contracts,
// so this interleave is the honest "recent activity from every game" view.
function interleave(lists, cap) {
  const out = [];
  const max = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < max && out.length < cap; i++) {
    for (const list of lists) {
      if (list[i]) out.push(list[i]);
      if (out.length >= cap) break;
    }
  }
  return out;
}

const settled = (r, fallback) => (r.status === "fulfilled" ? r.value : fallback);

export default function Home({ address, onNavigate }) {
  const [champs, setChamps] = useState({});
  const [stats, setStats] = useState({ plays: 0, players: 0, pvp: 0 });
  const [feed, setFeed] = useState([]);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    const results = await Promise.allSettled([
      getTop(),
      getCoinTop(),
      getRpsTop(),
      getHiloTop(),
      getTotalPlays(),
      getPlayers(),
      getGameCount(),
      getC4Count(),
      getRecentPlays(8),
      getRecentFlips(8),
      getRecentRps(8),
      getRecentHilo(8),
      getRecentC4(8),
      getReelsTop(),
      getRecentSpins(8),
    ]);
    const [
      streakTop, coinTop, rpsTop, hiloTop,
      totalPlays, players, tttCount, c4Count,
      rPlays, rFlips, rRps, rHilo, rC4,
      reelsTop, rSpins,
    ] = results;

    const tttN = settled(tttCount, 0);
    const c4N = settled(c4Count, 0);

    setChamps({
      streak: champ(settled(streakTop, null), (t) => `${t.score} pts`),
      coinflip: champ(settled(coinTop, null), (t) => `${t.streak}🔥`),
      rps: champ(settled(rpsTop, null), (t) => `${t.streak}🔥`),
      hilo: champ(settled(hiloTop, null), (t) => `run ${t.run}`),
      reels: champ(settled(reelsTop, null), (t) => `${t.jackpots}🎰`),
      ttt: { sub: `${tttN} game${tttN === 1 ? "" : "s"}` },
      c4: { sub: `${c4N} game${c4N === 1 ? "" : "s"}` },
    });

    setStats({
      plays: settled(totalPlays, 0),
      players: settled(players, []).length,
      pvp: tttN + c4N,
    });

    const merged = interleave(
      [
        settled(rPlays, []).map((p) => ({
          game: "streak", icon: "⚡", txId: p.txId, player: p.player,
          summary: <>rolled <b className="strong">{p.score}</b></>,
        })),
        settled(rFlips, []).map((f) => ({
          game: "coinflip", icon: "🪙", txId: f.txId, player: f.player,
          summary: <>flip · <b className={f.won ? "strong" : ""}>{f.won ? "won" : "lost"}</b></>,
        })),
        settled(rRps, []).map((r) => ({
          game: "rps", icon: "✊", txId: r.txId, player: r.player,
          summary: <>RPS · <b className={r.outcome === 1 ? "strong" : ""}>{RPS_OUTCOME[r.outcome] ?? "played"}</b></>,
        })),
        settled(rHilo, []).map((h) => ({
          game: "hilo", icon: "🔢", txId: h.txId, player: h.player,
          summary: h.event === "start"
            ? <>started a run</>
            : <>{h.higher ? "▲" : "▼"} · <b className={h.correct ? "strong" : ""}>{h.correct ? "correct" : "out"}</b></>,
        })),
        settled(rC4, []).map((c) => ({
          game: "c4", icon: "🔴", txId: c.txId, player: c.player,
          summary: c.event === "create" ? <>opened a game</> : <>dropped a disc</>,
        })),
        settled(rSpins, []).map((s) => ({
          game: "reels", icon: "🎰", txId: s.txId, player: s.player,
          summary: s.tier === 2
            ? <>spun · <b className="strong">JACKPOT</b></>
            : s.tier === 1
              ? <>spun · <b className="strong">pair</b></>
              : <>spun the reels</>,
        })),
      ],
      18,
    );
    setFeed(merged);
    setError(results.every((r) => r.status === "rejected") ? "Couldn't reach the chain — retrying." : null);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const t = setInterval(refresh, 20000);
    return () => clearInterval(t);
  }, [refresh]);

  return (
    <>
      <Hero
        emoji="🎮"
        title="Six provably-fair games. One chain. No house."
        sub="Every move is a single Stacks transaction, settled by a Clarity contract on Bitcoin. No wagering, no admin keys, nothing to trust — pick a game and play."
      />

      <div className="home-cta">
        <a className="btn ghost share" href={shareUrl()} target="_blank" rel="noreferrer">
          𝕏  Share the arcade
        </a>
      </div>

      {error && <div className="banner error">{error}</div>}

      <section className="stats-grid home-stats">
        <StatTile label="Games live" value="7" accent />
        <StatTile label="Streak plays" value={stats.plays} />
        <StatTile label="Streak players" value={stats.players} />
        <StatTile label="PvP matches" value={stats.pvp} />
      </section>

      <section className="home-grid">
        {GAME_CARDS.map((g, i) => {
          const c = champs[g.id] || {};
          const youHold = c.player && c.player === address;
          return (
            <motion.button
              key={g.id}
              className={`home-card ${youHold ? "home-card-you" : ""}`}
              onClick={() => onNavigate(g.id)}
              whileHover={{ y: -3 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
            >
              <span className="home-card-icon">{g.icon}</span>
              <span className="home-card-body">
                <span className="home-card-name">{g.name}</span>
                <span className="home-card-blurb">{g.blurb}</span>
              </span>
              <span className="home-card-champ">
                {c.player ? (
                  <>
                    <span className="home-card-champ-val">{c.value}</span>
                    <span className="mono home-card-champ-who">
                      {youHold ? "you 👑" : `👑 ${short(c.player)}`}
                    </span>
                  </>
                ) : (
                  <span className="home-card-champ-who muted">{c.sub || "open"}</span>
                )}
              </span>
            </motion.button>
          );
        })}
      </section>

      <FeedList
        title="Live across all games"
        items={feed}
        pulse
        emptyText="No plays yet — be the first on the chain."
        renderRow={(it) => (
          <>
            <span className="feed-game" aria-hidden>{it.icon}</span>
            <span className="mono">{short(it.player)}</span>
            <span>{it.summary}</span>
          </>
        )}
      />
    </>
  );
}

// Shape a champion tuple into card data, tolerant of a missing/empty holder.
function champ(top, fmt) {
  if (!top || !top.player) return { player: null };
  return { player: top.player, value: fmt(top) };
}

function shareUrl() {
  const text =
    "Six provably-fair on-chain games on @Stacks — coin flip, RPS, higher/lower, tic-tac-toe, connect four & a daily streak. Every move is one Bitcoin-settled tx. Play free:";
  const url = typeof window !== "undefined" ? window.location.origin : "";
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}
