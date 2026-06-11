# stackstreak-sdk

JavaScript SDK + CLI for the [StackStreak](https://github.com/Spagero763/stackstreak)
on-chain game hub on [Stacks](https://www.stacks.co/) (Bitcoin L2).

**Seven games + Daily Quests**, one client:
Daily Streak · Tic-Tac-Toe · Coin Flip · Rock-Paper-Scissors · Higher-or-Lower · Connect Four · Lucky Reels · Daily Quests.

Reads run anywhere (browser or Node). Signed write helpers require a private
key, so use them only with a wallet **you** control (a CLI or backend you run).

## Install

```bash
npm install stackstreak-sdk
```

Ships with **full TypeScript declarations** — autocomplete and type-checking
work out of the box, no `@types` package needed.

Runnable scripts live in [`examples/`](https://github.com/Spagero763/stackstreak/tree/main/examples)
— a leaderboard reader, a quest-status checker, and a signed coin flip.

## Read example

```js
import { createClient } from "stackstreak-sdk";

const sdk = createClient(); // defaults to the mainnet deployment

console.log(await sdk.getTotalPlays());
console.log(await sdk.getLeaderboard(10));
console.log(await sdk.getStats("SP2…"));
console.log(await sdk.getCoinTop());          // top coin-flip streak
console.log(await sdk.getRecentFlips(10));    // decoded flip events
console.log(await sdk.getC4RecentGames(5));   // recent connect-four games
```

## Signed write example (Node)

```js
import { createClient } from "stackstreak-sdk";

const sdk = createClient();
const key = process.env.STACKS_PRIVATE_KEY; // a wallet you control — never commit this

await sdk.play(key);             // StackStreak roll
await sdk.flip(0, key);          // coin flip, 0 = heads, 1 = tails
await sdk.rpsPlay(1, key);       // RPS, 0 rock / 1 paper / 2 scissors
await sdk.hiloStart(key);        // start a HiLo run
await sdk.hiloGuess(true, key);  // guess higher
await sdk.c4Create(key);         // open a connect-four game
await sdk.reelsSpin(key);        // spin the Lucky Reels slot machine
```

## CLI

```bash
npx stackstreak --help                 # full list
npx stackstreak leaderboard            # top 10 by score
STACKS_PRIVATE_KEY=… npx stackstreak play           # roll once
STACKS_PRIVATE_KEY=… npx stackstreak flip heads     # coin flip
STACKS_PRIVATE_KEY=… npx stackstreak rps rock       # RPS
STACKS_PRIVATE_KEY=… npx stackstreak hilo-guess up  # hi-lo
STACKS_PRIVATE_KEY=… npx stackstreak c4-drop 1 3    # drop into col 3
```

The CLI prints an explorer link for every submitted transaction.

> ⚠️ The CLI is for **your own** wallet. Don't script many wallets to inflate
> on-chain metrics — that breaks the Builder Rewards rules and risks
> disqualification.

## API

`createClient({ network = "mainnet", contractAddress } )` returns:

**StackStreak**
- `getStats(address)` → `{ plays, total, best, streak, bestStreak, lastDay }`
- `getPlayers()` · `getTotalPlays()` · `getTop()` · `getLeaderboard(limit)`
- `getRecentPlays(limit)` — decoded activity feed
- `play(senderKey)` — signed write, returns txid

**Tic-Tac-Toe**
- `getGameCount()` · `getGame(id)` · `getTttRecord(address)`
- `createGame(senderKey)` · `joinGame(id, senderKey)` · `playMove(id, pos, senderKey)`

**Coin Flip**
- `getCoinStats(address)` → `{ flips, wins, losses, streak, bestStreak }`
- `getCoinTop()` · `getRecentFlips(limit)`
- `flip(guess, senderKey)` — guess `0` heads or `1` tails

**Rock-Paper-Scissors**
- `getRpsStats(address)` → `{ plays, wins, losses, draws, streak, bestStreak }`
- `getRpsTop()` · `getRecentRps(limit)`
- `rpsPlay(move, senderKey)` — move `0` rock, `1` paper, `2` scissors

**Higher or Lower**
- `getHiloState(address)` → `{ current, run, bestRun, plays, active }`
- `getHiloTop()` · `getRecentHilo(limit)`
- `hiloStart(senderKey)` · `hiloGuess(higher, senderKey)`

**Connect Four**
- `getC4Count()` · `getC4Game(id)` · `getC4Record(address)`
- `getC4RecentGames(limit)` · `getRecentC4(limit)` — decoded drop events
- `c4Create(senderKey)` · `c4Join(id, senderKey)` · `c4Drop(id, col, senderKey)`

**Lucky Reels**
- `getReelsStats(address)` → `{ spins, wins, jackpots, streak, bestStreak }`
- `getReelsTop()` — most jackpots · `getRecentSpins(limit)` — decoded spin events
- `reelsSpin(senderKey)` — one spin, returns three symbols (`0..5`)

**Daily Quests**
- `getQuestProgress(address)` → `{ active, claimed, done, goal, day }` (live, contract-verified)
- `getQuestStats(address)` → `{ completed, streak, bestStreak, lastDay }`
- `getQuestTop()` — most quests completed · `getRecentQuests(limit)` — check-ins & claims
- `questCheckIn(senderKey)` · `questClaim(senderKey)` — start / claim today's quest

**Constants:** `TTT_STATUS` and `C4_STATUS` map status codes (`OPEN`, `ACTIVE`, `X_WON`, `O_WON`, `DRAW`).

## License

MIT
