# StackStreak

A fully **on-chain, provably-fair daily game** on [Stacks](https://www.stacks.co/), the Bitcoin L2.

Tap **Play** → the Clarity contract rolls a score from `1–100` using on-chain
entropy (your address + the current Bitcoin/Stacks block + your play count) →
your score, your daily streak, and your spot on the global leaderboard update
instantly. No wagering, no house, no admin keys. **Every play is one
transaction.**

**▶ Play:** https://stackstreak-nine.vercel.app · seven on-chain games in one hub.

---

## How it works

| Piece | What it does |
|-------|--------------|
| `contracts/stackstreak.clar` | Daily game: `play`, per-player stats, streaks, leaderboard registry, champion tracker. |
| `contracts/tictactoe.clar` | PvP Tic-Tac-Toe: `create-game`, `join-game`, `play-move`, win/draw detection, records. |
| `contracts/coinflip.clar` | Solo Coin Flip: `flip` heads/tails, wins build a streak, one miss resets. |
| `contracts/rps.clar` | Solo Rock-Paper-Scissors vs the contract: `play`, win/loss/draw, streak. |
| `contracts/hilo.clar` | Solo Higher-or-Lower: `start` reveals a number, `guess` extends your run. |
| `contracts/connectfour.clar` | PvP Connect Four (7×6): `create-game`, `join-game`, `drop`, 4-in-a-row detection. |
| `contracts/reels.clar` | Solo Lucky Reels: `spin` draws three symbols from on-chain entropy — pair wins, three-of-a-kind is a jackpot. |
| `contracts/quests.clar` | Daily Quests: `check-in` snapshots your play counters across every game, `claim` verifies you made 3+ plays today — completion is contract-verified, never self-reported. |
| `frontend/` | React + Vite multi-game app using `@stacks/connect` + `@stacks/transactions`. |
| `sdk/` | [`stackstreak-sdk`](sdk/README.md) — npm package (reads + signed writes) and a `stackstreak` CLI. |

### The roll is provably fair
Each play hashes a tuple of `{ your address, burn-block-height, stacks-block-height, your play number }`
with `sha256` and maps it into `[1, 100]`. It's deterministic and verifiable —
nobody (including the deployer) can pre-pick or replay a result.

### Streaks
Time is bucketed by the Bitcoin burn-block height (~144 blocks/day). Play on
consecutive days and your streak grows; miss a day and it resets to 1.

## License

MIT
