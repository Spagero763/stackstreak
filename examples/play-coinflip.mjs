// One signed coin flip from a wallet YOU control, then watch for the result.
//
//   STACKS_PRIVATE_KEY=<hex key> node play-coinflip.mjs heads
//
// ⚠️ Use only your own wallet, for genuine play. Don't script many wallets or
// loop plays to inflate on-chain metrics — that breaks the Builder Rewards
// rules and risks disqualification.

import { createClient } from "stackstreak-sdk";
import { getAddressFromPrivateKey } from "@stacks/transactions";

const KEY = process.env.STACKS_PRIVATE_KEY;
if (!KEY) {
  console.error("Set STACKS_PRIVATE_KEY to a wallet you control.");
  process.exit(1);
}

const guess = { heads: 0, tails: 1 }[process.argv[2] ?? "heads"];
if (guess === undefined) {
  console.error("usage: node play-coinflip.mjs <heads|tails>");
  process.exit(1);
}

const sdk = createClient();
const me = getAddressFromPrivateKey(KEY, sdk.network);

console.log(`Flipping ${guess === 0 ? "heads" : "tails"} as ${me}…`);
const txid = await sdk.flip(guess, KEY);
console.log(`submitted: https://explorer.hiro.so/txid/${txid}?chain=${sdk.network}`);
console.log("waiting for it to land in the feed (can take a few minutes)…");

// Poll the decoded event feed until our tx shows up, then print the outcome.
for (let i = 0; i < 60; i++) {
  await new Promise((r) => setTimeout(r, 15000));
  const flips = await sdk.getRecentFlips(25).catch(() => []);
  const hit = flips.find((f) => f.txId.replace(/^0x/, "") === txid.replace(/^0x/, ""));
  if (hit) {
    console.log(
      `landed ${hit.result === 0 ? "heads" : "tails"} — you ${hit.won ? "WON" : "lost"} (streak ${hit.streak})`,
    );
    process.exit(0);
  }
  process.stdout.write(".");
}
console.log("\nStill pending — check the explorer link above.");
