import { describe, expect, it } from "vitest";
import { Cl, cvToValue } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const w1 = accounts.get("wallet_1")!;
const C = "rps";

const unwrap = (x: any) => {
  while (x && typeof x === "object" && "value" in x) x = x.value;
  return x;
};
const num = (x: any) => Number(unwrap(x));
const play = (move: number, who = w1) =>
  simnet.callPublicFn(C, "play", [Cl.uint(move)], who).result;
const stats = (who = w1) =>
  cvToValue(simnet.callReadOnlyFn(C, "get-stats", [Cl.principal(who)], who).result, true);

describe("RPS", () => {
  it("rejects an invalid move", () => {
    expect(play(3)).toBeErr(Cl.uint(400));
  });

  it("returns house move and outcome in range", () => {
    const r: any = play(0);
    const out = (r.value as any).value;
    expect([0, 1, 2]).toContain(num(out.house));
    expect([0, 1, 2]).toContain(num(out.outcome));
  });

  it("keeps wins + losses + draws == plays", () => {
    for (let i = 0; i < 15; i++) play(i % 3);
    const s = stats();
    expect(num(s.plays)).toBe(15);
    expect(num(s.wins) + num(s.losses) + num(s.draws)).toBe(15);
  });
});
