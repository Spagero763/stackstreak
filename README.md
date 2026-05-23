# ⚡ StackStreak

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

---

## Contract API

| Function | Type | Description |
|----------|------|-------------|
| `(play)` | public | Roll once. Returns `{ score, total, streak, best }`. |
| `(get-stats (who principal))` | read-only | A player's `{ plays, total-score, best-score, streak, best-streak, last-day }`. |
| `(get-players)` | read-only | The registry of distinct players. |
| `(get-player-count)` | read-only | Number of distinct players. |
| `(get-total-plays)` | read-only | All-time play count. |
| `(get-top)` | read-only | Current champion `{ player, score }` by cumulative score. |
| `(get-today)` | read-only | Current day bucket. |

---

## Develop

Requires [Clarinet](https://github.com/hirosystems/clarinet) and Node 18+.

```bash
# contract: type-check + run tests
clarinet check
npm install
npm test

# explore in the console
clarinet console

# frontend
cd frontend
npm install
cp .env.example .env      # fill in after you deploy (see below)
npm run dev
```

---

## Deploy

> Deployment needs **your** wallet and some STX for gas. Your secret key lives
> only in `settings/Testnet.toml` / `settings/Mainnet.toml`, which are
> **git-ignored** — never commit them.

### 1. Add your deployment mnemonic
Edit `settings/Testnet.toml` (or `Mainnet.toml`) and set your 24-word
`mnemonic`. Get testnet STX from the [faucet](https://explorer.hiro.so/sandbox/faucet?chain=testnet).

### 2. Generate & broadcast the deployment plan
```bash
# testnet first
clarinet deployments generate --testnet --low-cost
clarinet deployments apply --testnet

# when you're ready for mainnet
clarinet deployments generate --mainnet --low-cost
clarinet deployments apply --mainnet
```

### 3. Point the frontend at your contract
In `frontend/.env`:
```
VITE_NETWORK=testnet            # or mainnet
VITE_CONTRACT_ADDRESS=SP...     # the address you deployed from
VITE_CONTRACT_NAME=stackstreak
```
Then `npm run build` and host the `frontend/dist` folder (e.g. Vercel).

---

## License

MIT
