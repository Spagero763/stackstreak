# stackstreak-sdk examples

Small, runnable scripts showing how to build on the
[`stackstreak-sdk`](https://www.npmjs.com/package/stackstreak-sdk) npm package —
the client for StackStreak's seven on-chain games + daily quests on
[Stacks](https://www.stacks.co/) (Bitcoin L2).

```bash
cd examples
npm install
```

| Example | What it shows | Needs a key? |
|---------|---------------|--------------|
| `npm run leaderboard` | Champions of every game + the daily-streak top 10 | No |
| `npm run quest-status -- <address>` | Contract-verified daily-quest progress for any address | No |
| `STACKS_PRIVATE_KEY=… npm run play-coinflip -- heads` | One signed coin flip, then watches the feed for the result | Yes |

Reads work from anywhere — browser or Node, no wallet needed. Signed writes
need a private key, so use them only with a wallet **you** control.

> ⚠️ Play honestly: don't script many wallets or loop plays to inflate
> on-chain metrics — that breaks the Builder Rewards rules and risks
> disqualification.
