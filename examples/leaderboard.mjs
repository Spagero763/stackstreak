// Arcade overview: champions of every game + the daily-streak leaderboard.
// Read-only — no wallet or key needed.
//
//   npm install && npm run leaderboard

import { createClient } from "stackstreak-sdk";

const sdk = createClient(); // defaults to the live mainnet deployment

const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "nobody yet");

const [streak, coin, rps, hilo, reels, quests, board, totalPlays] =
  await Promise.all([
    sdk.getTop(),
    sdk.getCoinTop(),
    sdk.getRpsTop(),
    sdk.getHiloTop(),
    sdk.getReelsTop(),
    sdk.getQuestTop(),
    sdk.getLeaderboard(10),
    sdk.getTotalPlays(),
  ]);

console.log("StackStreak — champions\n");
console.log(`  Daily Streak   ${short(streak.player)}  (${streak.score} pts)`);
console.log(`  Coin Flip      ${short(coin.player)}  (streak ${coin.streak})`);
console.log(`  RPS            ${short(rps.player)}  (streak ${rps.streak})`);
console.log(`  Higher/Lower   ${short(hilo.player)}  (run ${hilo.run})`);
console.log(`  Lucky Reels    ${short(reels.player)}  (${reels.jackpots} jackpots)`);
console.log(`  Daily Quests   ${short(quests.player)}  (${quests.completed} quests)`);

console.log(`\nDaily Streak leaderboard (${totalPlays} total plays):\n`);
board.forEach((row, i) =>
  console.log(
    `  ${String(i + 1).padStart(2)}. ${short(row.address)}  ${row.total} pts · streak ${row.streak} · ${row.plays} plays`,
  ),
);
if (!board.length) console.log("  No players yet — be the first.");
