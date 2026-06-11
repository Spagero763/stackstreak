// Compile-only consumer of the package typings (`npm run typecheck` runs
// tsc --noEmit over this file). If the declarations drift from the intended
// API, this stops compiling.
import createClient, {
  TTT_STATUS,
  type StackStreakClient,
  type StreakStats,
  type QuestProgress,
  type ReelsSpinEvent,
} from "../src/index.js";

async function demo(): Promise<void> {
  const sdk: StackStreakClient = createClient({ network: "mainnet" });

  const stats: StreakStats = await sdk.getStats("SP000");
  const total: number = stats.total + stats.best;

  const progress: QuestProgress = await sdk.getQuestProgress("SP000");
  const remaining: number = progress.goal - progress.done;

  const spins: ReelsSpinEvent[] = await sdk.getRecentSpins(5);
  const tiers: number[] = spins.map((s) => s.tier);

  const txid: string = await sdk.flip(0, "key");
  const open: 0 = TTT_STATUS.OPEN;

  void [total, remaining, tiers, txid, open];
}

void demo;
