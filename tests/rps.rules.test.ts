// RPS rule-correctness tests.
//
// The contract picks its move from on-chain entropy, so we can't deterministically
// force a particular house move — instead we play a lot of rounds and verify the
// outcome formula matches the standard RPS rules every single time, regardless of
// what the house picked.
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

// Standard RPS scoring: 0 draw, 1 player wins, 2 player loses.
function expectedOutcome(p: number, h: number): number {
  if (p === h) return 0;
  if (
    (p === 0 && h === 2) || // rock beats scissors
    (p === 1 && h === 0) || // paper beats rock
    (p === 2 && h === 1) // scissors beats paper
  )
    return 1;
  return 2;
}

describe("RPS — rule correctness", () => {
  it("rock beats scissors, paper beats rock, scissors beats paper (over many rounds)", () => {
    for (let i = 0; i < 30; i++) {
      const move = i % 3;
      const r: any = play(move);
      const out = (r.value as any).value;
      const house = num(out.house);
      const outcome = num(out.outcome);
      expect(outcome).toBe(expectedOutcome(move, house));
    }
  });

  it("a same-move round is always a draw", () => {
    // Play move 1 (paper) several times; any time the house also picks paper
    // (random subset), outcome must be 0.
    for (let i = 0; i < 20; i++) {
      const r: any = play(1);
      const out = (r.value as any).value;
      if (num(out.house) === 1) expect(num(out.outcome)).toBe(0);
    }
  });
});
