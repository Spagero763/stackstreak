#!/usr/bin/env node
// StackStreak CLI — read all six games and play from a wallet YOU control.
//
// Writes are signed with STACKS_PRIVATE_KEY. Use only your own wallet, for
// testing or genuine play. Do NOT script many wallets to inflate on-chain
// metrics for Builder Rewards — that breaks the program's terms (no multi-
// accounting, no automated metric inflation) and risks disqualification.
import {
  createClient,
  TTT_STATUS,
  DEFAULT_CONTRACT_ADDRESS,
} from "../src/index.js";
import { getAddressFromPrivateKey } from "@stacks/transactions";

const NETWORK = process.env.STACKS_NETWORK || "mainnet";
const KEY = process.env.STACKS_PRIVATE_KEY || "";
const sdk = createClient({ network: NETWORK });

const explorer = (txid) =>
  `https://explorer.hiro.so/txid/${txid}?chain=${NETWORK}`;

function needKey() {
  if (!KEY) {
    console.error(
      "This command signs a transaction. Set STACKS_PRIVATE_KEY to a wallet you control.",
    );
    process.exit(1);
  }
  return KEY;
}

function myAddress() {
  if (KEY) return getAddressFromPrivateKey(KEY, NETWORK);
  return DEFAULT_CONTRACT_ADDRESS;
}

const STATUS_LABEL = {
  [TTT_STATUS.OPEN]: "open",
  [TTT_STATUS.ACTIVE]: "active",
  [TTT_STATUS.X_WON]: "X won",
  [TTT_STATUS.O_WON]: "O won",
  [TTT_STATUS.DRAW]: "draw",
};

const RPS_LABEL = ["rock", "paper", "scissors"];
const RPS_OUTCOME = ["draw", "you won", "you lost"];

function help() {
  console.log(`StackStreak CLI  (network: ${NETWORK})

Reads (no key needed):
  stats [address]           StackStreak stats
  leaderboard               top 10 by score
  top                       current StackStreak champion
  total                     total streak plays
  feed                      recent streak plays
  game <id>                 a tic-tac-toe game by id
  coin-stats [address]      coin-flip stats
  coin-top                  top coin-flip streak
  coin-feed                 recent flips
  rps-stats [address]       RPS stats
  rps-top                   top RPS win streak
  rps-feed                  recent RPS rounds
  hilo-state [address]      higher/lower state
  hilo-top                  longest run
  hilo-feed                 recent guesses
  c4-game <id>              a Connect Four game
  c4-record [address]       Connect Four W/L/D
  c4-recent                 recent Connect Four games

Writes (need STACKS_PRIVATE_KEY = a wallet YOU control):
  play                      roll once on StackStreak
  ttt-create                open a tic-tac-toe game
  ttt-join <id>             join a game
  ttt-move <id> <pos>       place your mark (pos 0-8)
  flip <heads|tails|0|1>    coin flip
  rps <rock|paper|scissors> play RPS vs the contract
  hilo-start                start (or restart) a HiLo run
  hilo-guess <up|down>      guess higher (up) or lower (down)
  c4-create                 open a Connect Four game
  c4-join <id>              join a game
  c4-drop <id> <col 0-6>    drop a disc
  reels-stats [address]     Lucky Reels stats
  reels-top                 most jackpots
  reels-feed                recent spins
  spin                      spin the Lucky Reels (write)

Env: STACKS_NETWORK (default mainnet), STACKS_PRIVATE_KEY (writes only)`);
}

function parseCoinGuess(s) {
  if (s === "heads" || s === "h" || s === "0") return 0;
  if (s === "tails" || s === "t" || s === "1") return 1;
  return null;
}

function parseRpsMove(s) {
  const map = { rock: 0, r: 0, "0": 0, paper: 1, p: 1, "1": 1, scissors: 2, s: 2, "2": 2 };
  return map[s] ?? null;
}

function parseHiloDir(s) {
  if (["up", "u", "higher", "h", "true"].includes(s)) return true;
  if (["down", "d", "lower", "l", "false"].includes(s)) return false;
  return null;
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  try {
    switch (cmd) {
      // ---- StackStreak ----
      case "stats": {
        const a = args[0] || myAddress();
        console.log(a);
        console.log(await sdk.getStats(a));
        break;
      }
      case "leaderboard": {
        const rows = await sdk.getLeaderboard(10);
        rows.forEach((r, i) =>
          console.log(
            `${String(i + 1).padStart(2)}. ${r.address}  ${r.total} pts  ${r.streak}🔥  (${r.plays} plays)`,
          ),
        );
        if (!rows.length) console.log("No plays yet.");
        break;
      }
      case "top":
        console.log(await sdk.getTop());
        break;
      case "total":
        console.log(`${await sdk.getTotalPlays()} total plays`);
        break;
      case "feed": {
        const feed = await sdk.getRecentPlays(15);
        feed.forEach((p) =>
          console.log(`${p.player}  rolled ${p.score}  (${p.total} total)`),
        );
        if (!feed.length) console.log("No plays yet.");
        break;
      }
      case "play": {
        const txid = await sdk.play(needKey());
        console.log("submitted:", explorer(txid));
        break;
      }

      // ---- Tic-Tac-Toe ----
      case "game": {
        const id = Number(args[0]);
        if (!id) return console.error("usage: game <id>");
        const g = await sdk.getGame(id);
        if (!g) return console.log(`Game #${id} not found.`);
        console.log(`Game #${g.id}  [${STATUS_LABEL[g.status]}]`);
        console.log(`X: ${g.playerX}`);
        console.log(`O: ${g.playerO || "—"}`);
        console.log(renderBoard(g.board));
        break;
      }
      case "ttt-create": {
        const txid = await sdk.createGame(needKey());
        console.log("submitted:", explorer(txid));
        break;
      }
      case "ttt-join": {
        const id = Number(args[0]);
        if (!id) return console.error("usage: ttt-join <id>");
        const txid = await sdk.joinGame(id, needKey());
        console.log("submitted:", explorer(txid));
        break;
      }
      case "ttt-move": {
        const id = Number(args[0]);
        const pos = Number(args[1]);
        if (!id || Number.isNaN(pos))
          return console.error("usage: ttt-move <id> <pos 0-8>");
        const txid = await sdk.playMove(id, pos, needKey());
        console.log("submitted:", explorer(txid));
        break;
      }

      // ---- Coin Flip ----
      case "coin-stats": {
        const a = args[0] || myAddress();
        console.log(a);
        console.log(await sdk.getCoinStats(a));
        break;
      }
      case "coin-top":
        console.log(await sdk.getCoinTop());
        break;
      case "coin-feed": {
        const feed = await sdk.getRecentFlips(15);
        feed.forEach((f) =>
          console.log(
            `${f.player}  guessed ${f.guess ? "tails" : "heads"} · landed ${f.result ? "tails" : "heads"} · ${f.won ? "won" : "lost"} (${f.streak}🔥)`,
          ),
        );
        if (!feed.length) console.log("No flips yet.");
        break;
      }
      case "flip": {
        const guess = parseCoinGuess(args[0]);
        if (guess == null) return console.error("usage: flip <heads|tails>");
        const txid = await sdk.flip(guess, needKey());
        console.log("submitted:", explorer(txid));
        break;
      }

      // ---- RPS ----
      case "rps-stats": {
        const a = args[0] || myAddress();
        console.log(a);
        console.log(await sdk.getRpsStats(a));
        break;
      }
      case "rps-top":
        console.log(await sdk.getRpsTop());
        break;
      case "rps-feed": {
        const feed = await sdk.getRecentRps(15);
        feed.forEach((r) =>
          console.log(
            `${r.player}  ${RPS_LABEL[r.move]} vs ${RPS_LABEL[r.house]} · ${RPS_OUTCOME[r.outcome]}`,
          ),
        );
        if (!feed.length) console.log("No rounds yet.");
        break;
      }
      case "rps": {
        const move = parseRpsMove(args[0]);
        if (move == null) return console.error("usage: rps <rock|paper|scissors>");
        const txid = await sdk.rpsPlay(move, needKey());
        console.log("submitted:", explorer(txid));
        break;
      }

      // ---- HiLo ----
      case "hilo-state": {
        const a = args[0] || myAddress();
        console.log(a);
        console.log(await sdk.getHiloState(a));
        break;
      }
      case "hilo-top":
        console.log(await sdk.getHiloTop());
        break;
      case "hilo-feed": {
        const feed = await sdk.getRecentHilo(15);
        feed.forEach((h) => {
          if (h.event === "start") {
            console.log(`${h.player}  started @ ${h.current}`);
          } else {
            console.log(
              `${h.player}  ${h.higher ? "▲" : "▼"} ${h.prev} → ${h.next} · ${h.correct ? "✓" : "✗"} (run ${h.run})`,
            );
          }
        });
        if (!feed.length) console.log("No runs yet.");
        break;
      }
      case "hilo-start": {
        const txid = await sdk.hiloStart(needKey());
        console.log("submitted:", explorer(txid));
        break;
      }
      case "hilo-guess": {
        const dir = parseHiloDir(args[0]);
        if (dir == null) return console.error("usage: hilo-guess <up|down>");
        const txid = await sdk.hiloGuess(dir, needKey());
        console.log("submitted:", explorer(txid));
        break;
      }

      // ---- Connect Four ----
      case "c4-game": {
        const id = Number(args[0]);
        if (!id) return console.error("usage: c4-game <id>");
        const g = await sdk.getC4Game(id);
        if (!g) return console.log(`Game #${id} not found.`);
        console.log(`Game #${g.id}  [${STATUS_LABEL[g.status]}]`);
        console.log(`X (🔴): ${g.playerX}`);
        console.log(`O (🟡): ${g.playerO || "—"}`);
        console.log(renderC4(g.board));
        break;
      }
      case "c4-record": {
        const a = args[0] || myAddress();
        console.log(a);
        console.log(await sdk.getC4Record(a));
        break;
      }
      case "c4-recent": {
        const games = await sdk.getC4RecentGames(10);
        games.forEach((g) =>
          console.log(
            `#${g.id}  ${STATUS_LABEL[g.status]}  X:${g.playerX}  O:${g.playerO || "—"}`,
          ),
        );
        if (!games.length) console.log("No games yet.");
        break;
      }
      case "c4-create": {
        const txid = await sdk.c4Create(needKey());
        console.log("submitted:", explorer(txid));
        break;
      }
      case "c4-join": {
        const id = Number(args[0]);
        if (!id) return console.error("usage: c4-join <id>");
        const txid = await sdk.c4Join(id, needKey());
        console.log("submitted:", explorer(txid));
        break;
      }
      case "c4-drop": {
        const id = Number(args[0]);
        const col = Number(args[1]);
        if (!id || Number.isNaN(col) || col < 0 || col > 6)
          return console.error("usage: c4-drop <id> <col 0-6>");
        const txid = await sdk.c4Drop(id, col, needKey());
        console.log("submitted:", explorer(txid));
        break;
      }

      // ---- Lucky Reels ----
      case "reels-stats": {
        const a = args[0] || myAddress();
        console.log(a);
        console.log(await sdk.getReelsStats(a));
        break;
      }
      case "reels-top":
        console.log(await sdk.getReelsTop());
        break;
      case "reels-feed": {
        const feed = await sdk.getRecentSpins(15);
        const SYM = ["🍒", "🍋", "🔔", "⭐", "💎", "7️⃣"];
        const TIER = ["—", "pair", "JACKPOT"];
        feed.forEach((s) =>
          console.log(
            `${s.player}  ${s.reels.map((r) => SYM[r] ?? "?").join(" ")}  ${TIER[s.tier]}${s.tier ? ` (${s.streak}🔥)` : ""}`,
          ),
        );
        if (!feed.length) console.log("No spins yet.");
        break;
      }
      case "spin": {
        const txid = await sdk.reelsSpin(needKey());
        console.log("submitted:", explorer(txid));
        break;
      }

      default:
        help();
    }
  } catch (e) {
    console.error("Error:", e?.message || e);
    process.exit(1);
  }
}

function renderBoard(b) {
  const m = ["·", "X", "O"];
  const c = b.map((x) => m[x] || "·");
  return ` ${c[0]} | ${c[1]} | ${c[2]}\n-----------\n ${c[3]} | ${c[4]} | ${c[5]}\n-----------\n ${c[6]} | ${c[7]} | ${c[8]}`;
}

// Render a 7×6 Connect Four board, top row first.
function renderC4(b) {
  const sym = ["·", "🔴", "🟡"];
  const lines = [];
  for (let r = 5; r >= 0; r--) {
    const row = [];
    for (let c = 0; c < 7; c++) row.push(sym[b[r * 7 + c]] || "·");
    lines.push(row.join(" "));
  }
  lines.push("0  1  2  3  4  5  6");
  return lines.join("\n");
}

main();
