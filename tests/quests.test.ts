import { describe, expect, it } from "vitest";
import { Cl, cvToValue } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const w1 = accounts.get("wallet_1")!;
const w2 = accounts.get("wallet_2")!;
const C = "quests";

const unwrap = (x: any) => {
  while (x && typeof x === "object" && "value" in x) x = x.value;
  return x;
};
const num = (x: any) => Number(unwrap(x));
const bool = (x: any) => unwrap(x) === true || unwrap(x) === "true";

const checkIn = (who = w1) => simnet.callPublicFn(C, "check-in", [], who).result;
const claim = (who = w1) => simnet.callPublicFn(C, "claim", [], who).result;
const playCoin = (who = w1) =>
  simnet.callPublicFn("coinflip", "flip", [Cl.uint(0)], who);
const progress = (who = w1) =>
  cvToValue(simnet.callReadOnlyFn(C, "get-progress", [Cl.principal(who)], who).result, true);
const stats = (who = w1) =>
  cvToValue(simnet.callReadOnlyFn(C, "get-quest-stats", [Cl.principal(who)], who).result, true);
const top = () =>
  cvToValue(simnet.callReadOnlyFn(C, "get-top", [], w1).result, true);

describe("Daily Quests", () => {
  it("rejects a claim before checking in", () => {
    expect(claim()).toBeErr(Cl.uint(601));
  });

  it("checks in once per day", () => {
    expect(checkIn()).toBeOk(
      Cl.tuple({ day: Cl.uint(0), goal: Cl.uint(3) }),
    );
    expect(checkIn()).toBeErr(Cl.uint(600));
  });

  it("rejects a claim before the goal is met, tracks live progress, then pays out", () => {
    checkIn();
    expect(claim()).toBeErr(Cl.uint(603));

    playCoin();
    playCoin();
    let p = progress();
    expect(bool(p.active)).toBe(true);
    expect(num(p.done)).toBe(2);
    expect(claim()).toBeErr(Cl.uint(603));

    playCoin();
    p = progress();
    expect(num(p.done)).toBe(3);

    const r: any = claim();
    const out = (r.value as any).value;
    expect(num(out.completed)).toBe(1);
    expect(num(out.streak)).toBe(1);

    const s = stats();
    expect(num(s.completed)).toBe(1);
    expect(num(s["best-streak"])).toBe(1);
  });

  it("rejects a double claim", () => {
    checkIn();
    playCoin();
    playCoin();
    playCoin();
    expect(num(progress().done)).toBe(3);
    const r: any = claim();
    expect(num((r.value as any).value.completed)).toBe(1);
    expect(claim()).toBeErr(Cl.uint(602));
  });

  it("counts plays from any game toward the same quest", () => {
    expect(checkIn(w2)).toBeOk(
      Cl.tuple({ day: Cl.uint(0), goal: Cl.uint(3) }),
    );
    simnet.callPublicFn("rps", "play", [Cl.uint(0)], w2);
    simnet.callPublicFn("reels", "spin", [], w2);
    simnet.callPublicFn("stackstreak", "play", [], w2);
    expect(num(progress(w2).done)).toBe(3);
    const r: any = claim(w2);
    expect(num((r.value as any).value.completed)).toBe(1);
  });

  it("names a champion once someone claims", () => {
    checkIn(w2);
    playCoin(w2);
    playCoin(w2);
    playCoin(w2);
    claim(w2);
    const t = top();
    expect(num(t.completed)).toBe(1);
    expect(unwrap(t.player)).toBeTruthy();
  });
});
