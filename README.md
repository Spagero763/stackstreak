# StackStreak

A fully **on-chain, provably-fair daily game** on [Stacks](https://www.stacks.co/), the Bitcoin L2.

Tap **Play** → the Clarity contract rolls a score from `1–100` using on-chain
entropy (your address + the current Bitcoin/Stacks block + your play count) →
your score, your daily streak, and your spot on the global leaderboard update
instantly. No wagering, no house, no admin keys. **Every play is one
transaction.**

**▶ Play:** https://stackstreak-nine.vercel.app · also includes on-chain **Tic-Tac-Toe**.

---

## How it works

| Piece | What it does |
|-------|--------------|
| `contracts/stackstreak.clar` | Daily game: `play`, per-player stats, streaks, leaderboard registry, champion tracker. |
| `contracts/tictactoe.clar` | PvP Tic-Tac-Toe: `create-game`, `join-game`, `play-move`, win/draw detection, records. |
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
