import { describe, expect, it } from "vitest";
import { Cl, cvToValue } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const w1 = accounts.get("wallet_1")!;
const C = "flipbet";
const WAGER = 1000n;

const unwrap = (x: any) => {
  while (x && typeof x === "object" && "value" in x) x = x.value;
  return x;
};
const num = (x: any) => Number(unwrap(x));

const fund = (amount: bigint, who = deployer) =>
  simnet.callPublicFn(C, "fund", [Cl.uint(amount)], who).result;
const bet = (guess: number, who = w1) =>
  simnet.callPublicFn(C, "bet", [Cl.uint(guess)], who).result;
const withdraw = (amount: bigint, who = deployer) =>
  simnet.callPublicFn(C, "withdraw", [Cl.uint(amount)], who).result;
const pot = (): bigint =>
  BigInt(num(cvToValue(simnet.callReadOnlyFn(C, "get-pot", [], w1).result, true)));
const stxBal = (who: string): bigint =>
  ((simnet.getAssetsMap().get("STX")?.get(who) as bigint) ?? 0n);
const stats = (who = w1) =>
  cvToValue(simnet.callReadOnlyFn(C, "get-stats", [Cl.principal(who)], who).result, true);

describe("FlipBet", () => {
  it("rejects a bet when the pot can't cover a win", () => {
    expect(bet(0)).toBeErr(Cl.uint(701)); // pot is empty
  });

  it("rejects an invalid guess", () => {
    fund(1_000_000n); // seed the pot to get past the pot check
    expect(bet(2)).toBeErr(Cl.uint(700));
  });

  it("fund increases the pot by exactly the amount", () => {
    const before = pot();
    fund(500n);
    expect(pot() - before).toBe(500n);
  });

  it("a settled bet moves exactly one wager, and the pot mirrors the player", () => {
    fund(1_000_000n);
    const playerBefore = stxBal(w1);
    const potBefore = pot();

    bet(0);

    const playerDelta = stxBal(w1) - playerBefore; // +WAGER win, -WAGER loss
    const potDelta = pot() - potBefore;

    // every bet shifts exactly one wager between player and pot, zero-sum
    expect([WAGER, -WAGER]).toContain(playerDelta);
    expect(potDelta).toBe(-playerDelta);
  });

  it("conserves money and keeps wins + losses == bets across many bets", () => {
    fund(1_000_000n);
    const playerBefore = stxBal(w1);
    const potBefore = pot();
    const before = stats();

    for (let i = 0; i < 20; i++) bet(i % 2);

    const s = stats();
    const bets = num(s.bets) - num(before.bets);
    const wins = num(s.wins) - num(before.wins);
    const losses = num(s.losses) - num(before.losses);
    expect(bets).toBe(20);
    expect(wins + losses).toBe(20);
    expect(num(s["best-streak"])).toBeGreaterThanOrEqual(num(s.streak));

    // zero-sum: player's net gain == pot's net loss == (wins - losses) * WAGER
    const playerDelta = stxBal(w1) - playerBefore;
    expect(playerDelta).toBe(-(pot() - potBefore));
    expect(playerDelta).toBe(BigInt(wins - losses) * WAGER);
  });

  it("only the owner can withdraw, and it reduces the pot", () => {
    fund(1_000_000n);
    expect(withdraw(100n, w1)).toBeErr(Cl.uint(702));
    const before = pot();
    expect(withdraw(100n, deployer)).toBeOk(Cl.bool(true));
    expect(before - pot()).toBe(100n);
  });

  it("reports the wager and names a champion once wins exist", () => {
    expect(num(cvToValue(simnet.callReadOnlyFn(C, "get-wager", [], w1).result, true))).toBe(1000);
    const top = cvToValue(simnet.callReadOnlyFn(C, "get-top", [], w1).result, true);
    if (num(top.wins) > 0) expect(unwrap(top.player)).toBeTruthy();
  });
});
