// HiLo rule tests: tie-counts-as-correct, end-of-run state, restart after losing.
//
// The next number is entropy-driven, so most assertions are property-style:
// over many rounds, every reported (prev,next,correct) tuple must satisfy
// the rules.
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
  cvToValue(
    simnet.callReadOnlyFn(C, "get-state", [Cl.principal(who)], who).result,
    true,
  );

describe("HiLo — rules", () => {
  it("over many rounds, correctness matches the higher/lower rule (ties count as correct)", () => {
    let prev = num((start() as any).value);
    for (let i = 0; i < 25; i++) {
      const direction = i % 2 === 0; // alternate
      const r: any = guess(direction);
      if (r.type === "err") break; // run ended; not active
      const out = (r.value as any).value;
      const next = num(out.next);
      const correct = unwrap(out.correct);
      const expected =
        next === prev ? true : direction ? next > prev : next < prev;
      expect(correct).toBe(expected);
      if (!correct) break; // contract sets active=false on wrong
      prev = next;
    }
  });

  it("can restart after a losing run", () => {
    start();
    // Force several rounds until one ends the run (or 30 attempts).
    for (let i = 0; i < 30; i++) {
      const r: any = guess(true);
      if (r.type === "err") break;
      const correct = unwrap((r.value as any).value.correct);
      if (!correct) break;
    }
    const s1 = state();
    if (!unwrap(s1.active)) {
      const r: any = start();
      expect(r.type).toBe("ok");
      const s2 = state();
      expect(unwrap(s2.active)).toBe(true);
      expect(num(s2.run)).toBe(0);
    }
  });
});
