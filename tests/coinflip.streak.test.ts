// Coin Flip streak-mechanics tests: a win extends the streak, a loss resets it,
// and best-streak only ever grows.
import { describe, expect, it } from "vitest";
import { Cl, cvToValue } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const w1 = accounts.get("wallet_1")!;
const C = "coinflip";

const unwrap = (x: any) => {
  while (x && typeof x === "object" && "value" in x) x = x.value;
  // Clarity bool CVs come back as { type: "true" | "false" } with no `value`,
  // so unwrap them to a JS boolean.
  if (x && typeof x === "object" && (x.type === "true" || x.type === "false"))
    return x.type === "true";
  return x;
};
const num = (x: any) => Number(unwrap(x));
const flip = (guess: number, who = w1) =>
  simnet.callPublicFn(C, "flip", [Cl.uint(guess)], who).result;
const stats = (who = w1) =>
  cvToValue(
    simnet.callReadOnlyFn(C, "get-stats", [Cl.principal(who)], who).result,
    true,
  );

describe("CoinFlip — streak mechanics", () => {
  it("wins extend the streak, losses reset it, and best-streak only grows", () => {
    let prevBest = 0;
    let prevStreak = 0;
    for (let i = 0; i < 25; i++) {
      const r: any = flip(i % 2);
      const won = unwrap((r.value as any).value.won);
      const s = stats();
      const streak = num(s.streak);
      const best = num(s["best-streak"]);

      if (won) {
        // a win bumps the streak by exactly 1
        expect(streak).toBe(prevStreak + 1);
      } else {
        expect(streak).toBe(0);
      }
      // best-streak is monotonic and never less than the current streak
      expect(best).toBeGreaterThanOrEqual(streak);
      expect(best).toBeGreaterThanOrEqual(prevBest);

      prevBest = best;
      prevStreak = streak;
    }
  });
});
