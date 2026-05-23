# StackStreak

A fully **on-chain, provably-fair daily game** on [Stacks](https://www.stacks.co/), the Bitcoin L2.

Tap **Play** → the Clarity contract rolls a score from `1–100` using on-chain
entropy (your address + the current Bitcoin/Stacks block + your play count) →
your score, your daily streak, and your spot on the global leaderboard update
instantly. No wagering, no house, no admin keys. **Every play is one
transaction.**

---

## How it works

| Piece | What it does |
|-------|--------------|
| `contracts/stackstreak.clar` | The whole game: `play`, per-player stats, daily streaks, an on-chain leaderboard registry, and a champion tracker. |
| `frontend/` | A React + Vite app using `@stacks/connect` (wallet + transactions) and `@stacks/transactions` (read-only calls). |

### The roll is provably fair
Each play hashes a tuple of `{ your address, burn-block-height, stacks-block-height, your play number }`
with `sha256` and maps it into `[1, 100]`. It's deterministic and verifiable —
nobody (including the deployer) can pre-pick or replay a result.

### Streaks
Time is bucketed by the Bitcoin burn-block height (~144 blocks/day). Play on
consecutive days and your streak grows; miss a day and it resets to 1.

## License

MIT
