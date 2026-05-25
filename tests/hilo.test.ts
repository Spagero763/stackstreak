import { describe, expect, it } from "vitest";
import { Cl, cvToValue } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const w1 = accounts.get("wallet_1")!;
const C = "hilo";

const unwrap = (x: any) => {
  while (x && typeof x === "object" && "value" in x) x = x.value;
  if (x && typeof x === "object" && (x.type === "true" || x.type === "false"))
    return x.type === "true";
  return x;
};
const num = (x: any) => Number(unwrap(x));
const start = (who = w1) => simnet.callPublicFn(C, "start", [], who).result;
const guess = (higher: boolean, who = w1) =>
  simnet.callPublicFn(C, "guess", [Cl.bool(higher)], who).result;
const state = (who = w1) =>
  cvToValue(simnet.callReadOnlyFn(C, "get-state", [Cl.principal(who)], who).result, true);

describe("HiLo", () => {
  it("rejects guessing before starting", () => {
    expect(guess(true)).toBeErr(Cl.uint(500));
  });

  it("starts a round with a number in 1..100", () => {
    const r: any = start();
    const cur = num((r as any).value);
    expect(cur).toBeGreaterThanOrEqual(1);
    expect(cur).toBeLessThanOrEqual(100);
    const s = state();
    expect(num(s.run)).toBe(0);
    expect(unwrap(s.active)).toBe(true);
  });

  it("returns a next number and keeps run/active consistent", () => {
    start();
    const r: any = guess(true);
    const out = (r.value as any).value;
    const next = num(out.next);
    const correct = unwrap(out.correct);
    expect(next).toBeGreaterThanOrEqual(1);
    expect(next).toBeLessThanOrEqual(100);
    const s = state();
    expect(unwrap(s.active)).toBe(correct);
    expect(num(s.run)).toBe(correct ? 1 : 0);
  });
});
