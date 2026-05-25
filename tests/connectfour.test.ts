import { describe, expect, it } from "vitest";
import { Cl, cvToValue } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const w1 = accounts.get("wallet_1")!; // X
const w2 = accounts.get("wallet_2")!; // O
const C = "connectfour";

const OPEN = 0,
  ACTIVE = 1,
  X_WON = 2;

const unwrap = (x: any) => {
  while (x && typeof x === "object" && "value" in x) x = x.value;
  return x;
};
const num = (x: any) => Number(unwrap(x));
const create = (who: string) => simnet.callPublicFn(C, "create-game", [], who).result;
const join = (id: number, who: string) =>
  simnet.callPublicFn(C, "join-game", [Cl.uint(id)], who).result;
const drop = (id: number, col: number, who: string) =>
  simnet.callPublicFn(C, "drop", [Cl.uint(id), Cl.uint(col)], who).result;
const game = (id: number) =>
  cvToValue(simnet.callReadOnlyFn(C, "get-game", [Cl.uint(id)], w1).result, true);
const record = (who: string) =>
  cvToValue(simnet.callReadOnlyFn(C, "get-record", [Cl.principal(who)], w1).result, true);
const fields = (g: any) => g.value ?? g;

describe("ConnectFour", () => {
  it("opens, rejects self-join, activates on join", () => {
    expect(create(w1)).toBeOk(Cl.uint(1));
    expect(Number(unwrap(fields(game(1)).status))).toBe(OPEN);
    expect(join(1, w1)).toBeErr(Cl.uint(602));
    expect(join(1, w2)).toBeOk(Cl.bool(true));
    expect(Number(unwrap(fields(game(1)).status))).toBe(ACTIVE);
  });

  it("enforces turns and bad columns", () => {
    create(w1);
    join(1, w2);
    expect(drop(1, 0, w2)).toBeErr(Cl.uint(604)); // O can't start
    expect(drop(1, 7, w1)).toBeErr(Cl.uint(606)); // column out of range
    expect(drop(1, 0, w1)).toBeOk(Cl.uint(ACTIVE));
  });

  it("rejects dropping into a full column", () => {
    create(w1);
    join(1, w2);
    // alternate filling column 0 (no vertical 4 of one color)
    drop(1, 0, w1);
    drop(1, 0, w2);
    drop(1, 0, w1);
    drop(1, 0, w2);
    drop(1, 0, w1);
    drop(1, 0, w2); // 6 discs, column full
    expect(drop(1, 0, w1)).toBeErr(Cl.uint(605));
  });

  it("detects a vertical win and records it", () => {
    create(w1);
    join(1, w2);
    // X stacks column 0, O plays column 1
    drop(1, 0, w1); // X r0c0
    drop(1, 1, w2);
    drop(1, 0, w1); // X r1c0
    drop(1, 1, w2);
    drop(1, 0, w1); // X r2c0
    drop(1, 1, w2);
    expect(drop(1, 0, w1)).toBeOk(Cl.uint(X_WON)); // X r3c0 -> 4 in a column

    const g = fields(game(1));
    expect(Number(unwrap(g.status))).toBe(X_WON);
    expect(unwrap(g.winner)).toBe(w1);
    expect(Number(unwrap(record(w1).wins))).toBe(1);
    expect(Number(unwrap(record(w2).losses))).toBe(1);
  });

  it("detects a horizontal win", () => {
    create(w1);
    join(1, w2);
    // X across row 0 cols 0-3, O on row 1
    drop(1, 0, w1);
    drop(1, 0, w2);
    drop(1, 1, w1);
    drop(1, 1, w2);
    drop(1, 2, w1);
    drop(1, 2, w2);
    expect(drop(1, 3, w1)).toBeOk(Cl.uint(X_WON)); // row 0 cols 0,1,2,3
  });
});
