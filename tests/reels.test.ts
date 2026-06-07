import { describe, expect, it } from "vitest";
import { Cl, cvToValue } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const w1 = accounts.get("wallet_1")!;
const w2 = accounts.get("wallet_2")!;
const C = "reels";

const unwrap = (x: any) => {
  while (x && typeof x === "object" && "value" in x) x = x.value;
  return x;
};
const num = (x: any) => Number(unwrap(x));
const spin = (who = w1) => simnet.callPublicFn(C, "spin", [], who).result;
const stats = (who = w1) =>
  cvToValue(simnet.callReadOnlyFn(C, "get-stats", [Cl.principal(who)], who).result, true);
const top = () =>
  cvToValue(simnet.callReadOnlyFn(C, "get-top", [], w1).result, true);
const totalSpins = () =>
  num(cvToValue(simnet.callReadOnlyFn(C, "get-total-spins", [], w1).result, true));

describe("Lucky Reels", () => {
  it("records a spin and returns three reels in [0,6)", () => {
    const r: any = spin();
    const out = (r.value as any).value;
    const reels = (out.reels.value as any[]).map(num);
    expect(reels).toHaveLength(3);
    for (const v of reels) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(6);
    }
    const tier = num(out.tier);
    expect([0, 1, 2]).toContain(tier);
    expect(num(stats().spins)).toBe(1);
  });

  it("wins, jackpots and streak stay consistent", () => {
    for (let i = 0; i < 40; i++) spin(w2);
    const s = stats(w2);
    const spins = num(s.spins);
    const wins = num(s.wins);
    const jackpots = num(s.jackpots);
    expect(wins).toBeLessThanOrEqual(spins);
    expect(jackpots).toBeLessThanOrEqual(wins);
    expect(num(s["best-streak"])).toBeGreaterThanOrEqual(num(s.streak));
  });

  it("tracks the global spin counter and a champion once a jackpot lands", () => {
    const before = totalSpins();
    for (let i = 0; i < 20; i++) spin(w2);
    expect(totalSpins()).toBe(before + 20);
    const t = top();
    // If anyone has hit a jackpot, the champion holder is set.
    if (num(t.jackpots) > 0) {
      expect(unwrap(t.player)).toBeTruthy();
    }
  });
});
