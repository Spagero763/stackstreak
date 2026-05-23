import { describe, expect, it } from "vitest";
import { Cl, cvToValue } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const w1 = accounts.get("wallet_1")!; // X
const w2 = accounts.get("wallet_2")!; // O

const C = "tictactoe";

// status codes
const OPEN = 0,
  ACTIVE = 1,
  X_WON = 2,
  DRAW = 4;

const create = (who: string) => simnet.callPublicFn(C, "create-game", [], who).result;
const join = (id: number, who: string) =>
  simnet.callPublicFn(C, "join-game", [Cl.uint(id)], who).result;
const move = (id: number, pos: number, who: string) =>
  simnet.callPublicFn(C, "play-move", [Cl.uint(id), Cl.uint(pos)], who).result;
const game = (id: number) =>
  cvToValue(simnet.callReadOnlyFn(C, "get-game", [Cl.uint(id)], w1).result, true);
const record = (who: string) =>
  cvToValue(simnet.callReadOnlyFn(C, "get-record", [Cl.principal(who)], w1).result, true);

// get-game returns (optional tuple); cvToValue(.., true) -> { value: {...} } | null
const fields = (g: any) => g.value ?? g;
// Recursively peel { value: ... } wrappers (optional -> principal, uint, etc.)
const unwrap = (x: any) => {
  while (x && typeof x === "object" && "value" in x) x = x.value;
  return x;
};

describe("TicTacToe", () => {
  it("opens a game; creator is X, status open", () => {
    expect(create(w1)).toBeOk(Cl.uint(1));
    expect(simnet.callReadOnlyFn(C, "get-game-count", [], w1).result).toBeUint(1);
    const g = fields(game(1));
    expect(Number(unwrap(g.status))).toBe(OPEN);
    expect(unwrap(g["player-x"])).toBe(w1);
  });

  it("rejects joining your own game", () => {
    create(w1);
    expect(join(1, w1)).toBeErr(Cl.uint(202));
  });

  it("activates when an opponent joins", () => {
    create(w1);
    expect(join(1, w2)).toBeOk(Cl.bool(true));
    expect(Number(unwrap(fields(game(1)).status))).toBe(ACTIVE);
  });

  it("enforces turn order, taken cells and bad positions", () => {
    create(w1);
    join(1, w2);
    expect(move(1, 0, w2)).toBeErr(Cl.uint(204)); // O cannot start
    expect(move(1, 0, w1)).toBeOk(Cl.uint(ACTIVE)); // X takes 0
    expect(move(1, 0, w2)).toBeErr(Cl.uint(205)); // cell taken
    expect(move(1, 9, w2)).toBeErr(Cl.uint(206)); // off the board
    expect(move(1, 4, w1)).toBeErr(Cl.uint(204)); // not X's turn
  });

  it("plays to an X win across the top row and records it", () => {
    create(w1);
    join(1, w2);
    expect(move(1, 0, w1)).toBeOk(Cl.uint(ACTIVE)); // X
    expect(move(1, 3, w2)).toBeOk(Cl.uint(ACTIVE)); // O
    expect(move(1, 1, w1)).toBeOk(Cl.uint(ACTIVE)); // X
    expect(move(1, 4, w2)).toBeOk(Cl.uint(ACTIVE)); // O
    expect(move(1, 2, w1)).toBeOk(Cl.uint(X_WON)); // X wins 0,1,2

    const g = fields(game(1));
    expect(Number(unwrap(g.status))).toBe(X_WON);
    expect(unwrap(g.winner)).toBe(w1);
    expect(Number(unwrap(record(w1).wins))).toBe(1);
    expect(Number(unwrap(record(w2).losses))).toBe(1);
  });

  it("ends in a draw and records draws for both players", () => {
    create(w1);
    join(1, w2);
    // X X O / O O X / X X O  -> full, no line
    const seq: [number, string][] = [
      [0, w1],
      [2, w2],
      [1, w1],
      [3, w2],
      [5, w1],
      [4, w2],
      [6, w1],
      [8, w2],
      [7, w1],
    ];
    let last;
    for (const [pos, who] of seq) last = move(1, pos, who);
    expect(last).toBeOk(Cl.uint(DRAW));
    expect(Number(unwrap(fields(game(1)).status))).toBe(DRAW);
    expect(Number(unwrap(record(w1).draws))).toBe(1);
    expect(Number(unwrap(record(w2).draws))).toBe(1);
  });

  it("rejects moves after the game is over", () => {
    create(w1);
    join(1, w2);
    move(1, 0, w1);
    move(1, 3, w2);
    move(1, 1, w1);
    move(1, 4, w2);
    move(1, 2, w1); // X wins
    expect(move(1, 5, w2)).toBeErr(Cl.uint(203)); // not active
  });
});
