#!/usr/bin/env node
// StackStreak CLI — read the games and play from a wallet YOU control.
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

function help() {
  console.log(`StackStreak CLI  (network: ${NETWORK})

Reads (no key needed):
  stats [address]      a player's StackStreak stats (defaults to your wallet)
  leaderboard          top 10 by score
  top                  current champion
  total                total plays
  feed                 recent plays
  game <id>            a tic-tac-toe game

Writes (need STACKS_PRIVATE_KEY = a wallet YOU control):
  play                 roll once on StackStreak
  ttt-create           open a tic-tac-toe game
  ttt-join <id>        join a game
  ttt-move <id> <pos>  place your mark (pos 0-8)

Env: STACKS_NETWORK (default mainnet), STACKS_PRIVATE_KEY (writes only)`);
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  try {
    switch (cmd) {
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
      case "play": {
        const txid = await sdk.play(needKey());
        console.log("submitted:", explorer(txid));
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

main();
