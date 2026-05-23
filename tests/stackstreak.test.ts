import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const w1 = accounts.get("wallet_1")!;
const w2 = accounts.get("wallet_2")!;
const w3 = accounts.get("wallet_3")!;

const CONTRACT = "stackstreak";

// --- helpers to read values out of Clarity result objects ---
function okTuple(result: any) {
  // (ok { ... }) -> the inner tuple's field map
  return result.value.value;
}
function tupleOf(result: any) {
  // bare { ... } -> the field map
  return result.value;
}
function uintOf(result: any) {
  return Number(result.value);
}

function play(who: string) {
  return simnet.callPublicFn(CONTRACT, "play", [], who).result;
}
function getStats(who: string) {
  return simnet.callReadOnlyFn(CONTRACT, "get-stats", [Cl.principal(who)], who)
    .result;
}
function getPlayerCount() {
  return uintOf(
    simnet.callReadOnlyFn(CONTRACT, "get-player-count", [], w1).result,
  );
}
function getTotalPlays() {
  return uintOf(
    simnet.callReadOnlyFn(CONTRACT, "get-total-plays", [], w1).result,
  );
}
function getTop() {
  return tupleOf(simnet.callReadOnlyFn(CONTRACT, "get-top", [], w1).result);
}

describe("StackStreak", () => {
  it("initialises simnet", () => {
    expect(simnet.blockHeight).toBeDefined();
  });

  it("a play returns a score in [1,100] and updates the player's stats", () => {
    const res = play(w1);
    const out = okTuple(res);
    const score = Number(out.score.value);

    expect(score).toBeGreaterThanOrEqual(1);
    expect(score).toBeLessThanOrEqual(100);

    const stats = tupleOf(getStats(w1));
    expect(Number(stats.plays.value)).toBe(1);
    expect(Number(stats["total-score"].value)).toBe(score);
    expect(Number(stats["best-score"].value)).toBe(score);
    expect(Number(stats.streak.value)).toBe(1);
    expect(Number(stats["best-streak"].value)).toBe(1);
  });

  it("registers a first-time player exactly once in the registry", () => {
    expect(getPlayerCount()).toBe(0);
    play(w1);
    play(w1);
    play(w1);
    expect(getPlayerCount()).toBe(1); // same wallet, still one entry
    expect(Number(tupleOf(getStats(w1)).plays.value)).toBe(3);
  });

  it("accumulates total score across plays and tracks best score", () => {
    let runningTotal = 0;
    let best = 0;
    for (let i = 0; i < 8; i++) {
      const score = Number(okTuple(play(w1)).score.value);
      expect(score).toBeGreaterThanOrEqual(1);
      expect(score).toBeLessThanOrEqual(100);
      runningTotal += score;
      best = Math.max(best, score);
    }
    const stats = tupleOf(getStats(w1));
    expect(Number(stats.plays.value)).toBe(8);
    expect(Number(stats["total-score"].value)).toBe(runningTotal);
    expect(Number(stats["best-score"].value)).toBe(best);
  });

  it("tracks distinct players and the global play counter", () => {
    play(w1);
    play(w2);
    play(w2);
    play(w3);
    expect(getPlayerCount()).toBe(3);
    expect(getTotalPlays()).toBe(4);
  });

  it("crowns the champion by cumulative score", () => {
    const s1 = Number(okTuple(play(w1)).score.value);
    const s2 = Number(okTuple(play(w2)).score.value);
    const top = getTop();
    const expectedScore = Math.max(s1, s2);
    expect(Number(top.score.value)).toBe(expectedScore);
    // optional principal -> some(...) wrapper
    expect(top.player.value.value).toBe(s1 >= s2 ? w1 : w2);
  });

  it("starts new wallets from a clean slate", () => {
    const stats = tupleOf(getStats(w3));
    expect(Number(stats.plays.value)).toBe(0);
    expect(Number(stats["total-score"].value)).toBe(0);
    expect(Number(stats.streak.value)).toBe(0);
  });

  it("keeps every score in range over many plays (fairness sanity)", () => {
    for (let i = 0; i < 40; i++) {
      const score = Number(okTuple(play(w1)).score.value);
      expect(score).toBeGreaterThanOrEqual(1);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});
