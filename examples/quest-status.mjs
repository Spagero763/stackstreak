// Daily-quest status for any address. Shows the contract-verified progress:
// the quests contract reads the play counters of all seven game contracts
// on-chain, so `done` is provable, not self-reported.
//
//   npm install && npm run quest-status -- SP3JKFGFTQZSDYDRA4JSV0HST1D610WMR1G7K367T

import { createClient } from "stackstreak-sdk";

const address = process.argv[2];
if (!address) {
  console.error("usage: node quest-status.mjs <stacks-address>");
  process.exit(1);
}

const sdk = createClient();
const [progress, stats] = await Promise.all([
  sdk.getQuestProgress(address),
  sdk.getQuestStats(address),
]);

console.log(`Daily quest — ${address}\n`);
if (!progress.active) {
  console.log("  Not checked in today. Call quest check-in to start (day", `${progress.day}).`);
} else if (progress.claimed) {
  console.log("  ✓ Today's quest already claimed.");
} else {
  console.log(`  Progress: ${progress.done}/${progress.goal} plays`);
  console.log(
    progress.done >= progress.goal
      ? "  ✓ Goal reached — claim it!"
      : `  ${progress.goal - progress.done} more play(s) in any game to go.`,
  );
}

console.log("\nLifetime:");
console.log(`  completed ${stats.completed} · streak ${stats.streak} · best ${stats.bestStreak}`);
