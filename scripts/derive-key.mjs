#!/usr/bin/env node
// derive-key.mjs — turn your Clarinet mnemonic into the hex private key the
// seeder needs. Runs entirely on your machine; nothing is sent anywhere.
//
// It reads the mnemonic from settings/Mainnet.toml (or the MNEMONIC env var),
// derives the first few accounts, and prints each address + key. Find the row
// whose address matches your deployer (SP3JKFG…K367T) and use that key.
//
// Requires @stacks/wallet-sdk:  npm install --no-save @stacks/wallet-sdk
//
// Usage:  node scripts/derive-key.mjs
//
// ⚠️  The printed keys are SECRETS. Don't paste them into chats, screenshots,
//     commits, or anywhere public. Clear your terminal after you're done.

import { readFileSync } from "node:fs";
import { generateWallet, generateNewAccount } from "@stacks/wallet-sdk";
import { getAddressFromPrivateKey } from "@stacks/transactions";

let mnemonic = process.env.MNEMONIC;
if (!mnemonic) {
  try {
    const toml = readFileSync("settings/Mainnet.toml", "utf8");
    const m = toml.match(/mnemonic\s*=\s*["']([^"']+)["']/);
    if (m) mnemonic = m[1];
  } catch {
    /* fall through to the error below */
  }
}

if (!mnemonic) {
  console.error(
    "No mnemonic found. Either set MNEMONIC=\"word word …\" or make sure\n" +
      "settings/Mainnet.toml has a mnemonic = \"…\" line.",
  );
  process.exit(1);
}

const wallet = await generateWallet({
  secretKey: mnemonic.trim(),
  password: "",
});

// generateWallet seeds account 0; add a few more so we can match whichever
// index your deployer lives at.
let w = wallet;
for (let i = 1; i < 5; i++) w = generateNewAccount(w);

console.log("Derived accounts (find the one matching your deployer):\n");
for (const [i, acct] of w.accounts.entries()) {
  const address = getAddressFromPrivateKey(acct.stxPrivateKey, "mainnet");
  const flag = address === "SP3JKFGFTQZSDYDRA4JSV0HST1D610WMR1G7K367T" ? "  <-- deployer ✅" : "";
  console.log(`[${i}] ${address}${flag}`);
  console.log(`    key: ${acct.stxPrivateKey}\n`);
}

console.log(
  "Copy the `key:` from the row marked deployer, then:\n" +
    "  export STACKS_PRIVATE_KEY=<that key>\n" +
    "  node scripts/seed-demo.mjs\n" +
    "Keep the key secret. Clear your terminal when done.",
);
