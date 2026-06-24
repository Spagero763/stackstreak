// Multi-account simnet demo: many players sit at the FlipBet table and bet.
// Run it on its own with:
//   npx vitest run tests/flipbet.table.test.ts
//
// It's a local, in-memory chain — nothing here touches mainnet, the explorer,
// or any metric. It exists to *see* the contract behave with many players and
// to prove the money is conserved (no STX created or destroyed).
import { describe, expect, it } from "vitest";
import { Cl, cvToValue } from "@stacks/transactions";

const C = "flipbet";
const WAGER = 1000n;
const BETS_EACH = 5;

const unwrap = (x: any) => {
  while (x && typeof x === "object" && "value" in x) x = x.value;
  return x;
};
const num = (x: any) => Number(unwrap(x));
const pot = (caller: string): bigint =>
  BigInt(num(cvToValue(simnet.callReadOnlyFn(C, "get-pot", [], caller).result, true)));
const bal = (who: string): bigint =>
  ((simnet.getAssetsMap().get("STX")?.get(who) as bigint) ?? 0n);

describe("FlipBet — multi-account table (simnet only)", () => {
  it("runs every wallet through the table and conserves money", () => {
    const accounts = simnet.getAccounts();
    const deployer = accounts.get("deployer")!;
    // every wallet except the deployer/faucet becomes a "player"
    const players = [...accounts.entries()]
      .filter(([name]) => name.startsWith("wallet_"))
      .map(([, addr]) => addr);

    // seed the pot generously so wins can always pay out
    simnet.callPublicFn(C, "fund", [Cl.uint(10_000_000)], deployer);

    const potStart = pot(deployer);
    const balStart = new Map(players.map((p) => [p, bal(p)]));

    let totalBets = 0;
    let totalWins = 0;
    console.log(`\n  FlipBet table — ${players.length} players × ${BETS_EACH} bets each\n`);

    for (const p of players) {
      for (let i = 0; i < BETS_EACH; i++) {
        simnet.callPublicFn(C, "bet", [Cl.uint(i % 2)], p);
        totalBets++;
      }
      const net = bal(p) - (balStart.get(p) ?? 0n);
      const s = cvToValue(
        simnet.callReadOnlyFn(C, "get-stats", [Cl.principal(p)], p).result,
        true,
      );
      totalWins += num(s.wins);
      console.log(
        `  ${p.slice(0, 6)}…${p.slice(-4)}  ${num(s.wins)}W/${num(s.losses)}L  net ${net >= 0n ? "+" : ""}${net} µSTX`,
      );
    }

    const potEnd = pot(deployer);
    const playersNet = players.reduce((acc, p) => acc + (bal(p) - (balStart.get(p) ?? 0n)), 0n);

    console.log(`\n  total bets: ${totalBets}  ·  wins: ${totalWins}  ·  losses: ${totalBets - totalWins}`);
    console.log(`  pot: ${potStart} -> ${potEnd} µSTX  (Δ ${potEnd - potStart})`);
    console.log(`  players' combined net: ${playersNet} µSTX\n`);

    // The core invariant: every microSTX the players gained came out of the pot
    // and vice-versa. Nothing is created or destroyed.
    expect(playersNet).toBe(-(potEnd - potStart));
    // And the pot moved by exactly (losses - wins) * WAGER.
    const losses = totalBets - totalWins;
    expect(potEnd - potStart).toBe(BigInt(losses - totalWins) * WAGER);
    expect(totalBets).toBe(players.length * BETS_EACH);
  });
});
