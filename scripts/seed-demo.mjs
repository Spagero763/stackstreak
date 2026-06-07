#!/usr/bin/env node
// seed-demo.mjs — populate the live StackStreak demo with REAL on-chain play.
//
// What this is for:
//   Dogfood the four solo games (Daily Streak, Coin Flip, RPS, Higher-or-Lower)
//   from a wallet YOU control, so the live demo's feeds and leaderboards aren't
//   empty and every game is provably working on mainnet. Each action is one
//   genuine transaction that pays a genuine fee.
//
// What this is NOT:
//   This is honest self-play at a modest volume. Do NOT crank the counts up to
//   farm metrics, and do NOT run it across many wallets. That is "automated
//   metric inflation / multi-accounting" — it breaks Builder Rewards terms and
//   risks disqualification. The two PvP games (Tic-Tac-Toe, Connect Four) need
//   a second, distinct player; play those through the live UI with a friend.
//
// Usage (PowerShell):
//   $env:STACKS_PRIVATE_KEY = "<your hex private key>"   # a wallet YOU control
//   node scripts/seed-demo.mjs                            # uses default counts
//   $env:DRY_RUN = "1"; node scripts/seed-demo.mjs        # print plan, send nothing
//
// Optional env:
//   STACKS_NETWORK   mainnet (default) | testnet
//   STREAK_PLAYS     default 3
//   COIN_FLIPS       default 4
//   RPS_PLAYS        default 3
//   HILO_RUNS        default 2   (each run = 1 start + 1 guess = 2 txns)
//   FEE_USTX         fixed fee per tx in micro-STX; omit to auto-estimate
//   DELAY_MS         pause between broadcasts (default 400)

import {
  makeContractCall,
  broadcastTransaction,
  getAddressFromPrivateKey,
  Cl,
} from "@stacks/transactions";

const NETWORK = process.env.STACKS_NETWORK || "mainnet";
const KEY = process.env.STACKS_PRIVATE_KEY || "";
const DRY_RUN = process.env.DRY_RUN === "1";
const FEE_USTX = process.env.FEE_USTX ? Number(process.env.FEE_USTX) : undefined;
const DELAY_MS = process.env.DELAY_MS ? Number(process.env.DELAY_MS) : 400;

const COUNTS = {
  streak: Number(process.env.STREAK_PLAYS ?? 3),
  coin: Number(process.env.COIN_FLIPS ?? 4),
  rps: Number(process.env.RPS_PLAYS ?? 3),
  hilo: Number(process.env.HILO_RUNS ?? 2),
};

const CONTRACT_ADDRESS = "SP3JKFGFTQZSDYDRA4JSV0HST1D610WMR1G7K367T";
const API_BASE =
  NETWORK === "mainnet" ? "https://api.hiro.so" : "https://api.testnet.hiro.so";

const explorer = (txid) =>
  `https://explorer.hiro.so/txid/${txid}?chain=${NETWORK}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!KEY && !DRY_RUN) {
  console.error(
    "Set STACKS_PRIVATE_KEY to a wallet YOU control before running this.\n" +
      "  PowerShell:  $env:STACKS_PRIVATE_KEY = \"<hex key>\"\n" +
      "Or preview without sending:  $env:DRY_RUN = \"1\"; node scripts/seed-demo.mjs",
  );
  process.exit(1);
}

const SENDER = KEY ? getAddressFromPrivateKey(KEY, NETWORK) : "(dry-run — no key)";

// Build the ordered list of actions to perform. Each is one transaction.
function buildPlan() {
  const plan = [];
  for (let i = 0; i < COUNTS.streak; i++)
    plan.push({ game: "streak", fn: "play", args: [], note: "daily roll" });
  for (let i = 0; i < COUNTS.coin; i++) {
    const guess = i % 2; // alternate heads/tails
    plan.push({
      game: "coinflip",
      fn: "flip",
      args: [Cl.uint(guess)],
      note: guess ? "tails" : "heads",
    });
  }
  for (let i = 0; i < COUNTS.rps; i++) {
    const move = i % 3; // cycle rock/paper/scissors
    plan.push({
      game: "rps",
      fn: "play",
      args: [Cl.uint(move)],
      note: ["rock", "paper", "scissors"][move],
    });
  }
  for (let i = 0; i < COUNTS.hilo; i++) {
    // A run is one start (resets the number) followed by one blind guess.
    // Same-sender nonce ordering guarantees the guess executes after its start.
    plan.push({ game: "hilo", fn: "start", args: [], note: "new run" });
    plan.push({
      game: "hilo",
      fn: "guess",
      args: [Cl.bool(true)],
      note: "guess higher",
    });
  }
  return plan;
}

async function fetchStartingNonce() {
  const res = await fetch(
    `${API_BASE}/extended/v1/address/${SENDER}/nonces`,
  );
  if (!res.ok) throw new Error(`nonce lookup failed: ${res.status}`);
  const data = await res.json();
  return data.possible_next_nonce;
}

async function main() {
  const plan = buildPlan();
  console.log(`StackStreak demo seeder`);
  console.log(`  network : ${NETWORK}`);
  console.log(`  sender  : ${SENDER}`);
  console.log(`  actions : ${plan.length} transactions`);
  console.log(
    `  games   : streak×${COUNTS.streak}  coin×${COUNTS.coin}  rps×${COUNTS.rps}  hilo×${COUNTS.hilo} (×2 tx each)`,
  );
  console.log("");

  if (DRY_RUN) {
    plan.forEach((p, i) =>
      console.log(`  ${String(i + 1).padStart(2)}. ${p.game}.${p.fn}  (${p.note})`),
    );
    console.log("\nDRY_RUN=1 — nothing was sent.");
    return;
  }

  let nonce = await fetchStartingNonce();
  console.log(`starting nonce: ${nonce}\n`);

  let ok = 0;
  for (const [i, step] of plan.entries()) {
    const label = `${String(i + 1).padStart(2)}/${plan.length} ${step.game}.${step.fn} (${step.note})`;
    try {
      const tx = await makeContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: step.game,
        functionName: step.fn,
        functionArgs: step.args,
        senderKey: KEY,
        network: NETWORK,
        nonce: BigInt(nonce),
        ...(FEE_USTX !== undefined ? { fee: BigInt(FEE_USTX) } : {}),
      });
      const res = await broadcastTransaction({ transaction: tx, network: NETWORK });
      if (res.error) {
        throw new Error(`${res.error}: ${res.reason || ""}`.trim());
      }
      console.log(`✓ ${label}\n    ${explorer(res.txid)}`);
      ok++;
      nonce++; // advance for the next sequential tx
    } catch (e) {
      console.error(`✗ ${label}\n    ${e?.message || e}`);
      // Don't advance nonce on a broadcast failure; retrying would reuse it.
      // Stop, since later txns assume this nonce was consumed.
      console.error("\nStopping early to avoid nonce gaps. Re-run to continue.");
      break;
    }
    await sleep(DELAY_MS);
  }

  console.log(
    `\nDone. ${ok}/${plan.length} submitted. They'll confirm over the next few blocks (~10–30 min).`,
  );
  console.log(`Watch them land: https://explorer.hiro.so/address/${SENDER}?chain=${NETWORK}`);
}

main().catch((e) => {
  console.error("Fatal:", e?.message || e);
  process.exit(1);
});
