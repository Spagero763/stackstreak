import { describe, expect, it } from "vitest";
import { Cl, cvToValue } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const w1 = accounts.get("wallet_1")!;
const C = "coinflip";

const unwrap = (x: any) => {
  while (x && typeof x === "object" && "value" in x) x = x.value;
  return x;
};
const flip = (guess: number, who = w1) =>
  simnet.callPublicFn(C, "flip", [Cl.uint(guess)], who).result;
const stats = (who = w1) =>
  cvToValue(simnet.callReadOnlyFn(C, "get-stats", [Cl.principal(who)], who).result, true);
const num = (x: any) => Number(unwrap(x));

describe("CoinFlip", () => {
  it("rejects an invalid guess", () => {
    expect(flip(2)).toBeErr(Cl.uint(300));
  });

  it("returns a coin result in {0,1} and records the flip", () => {
    const r: any = flip(0);
    const out = (r.value as any).value;
    const result = num(out.result);
    expect([0, 1]).toContain(result);
    const s = stats();
    expect(num(s.flips)).toBe(1);
  });

  it("keeps wins + losses == flips over many flips", () => {
    for (let i = 0; i < 12; i++) flip(i % 2);
    const s = stats();
    expect(num(s.flips)).toBe(12);
    expect(num(s.wins) + num(s.losses)).toBe(12);
    expect(num(s["best-streak"])).toBeGreaterThanOrEqual(num(s.streak));
  });
});
