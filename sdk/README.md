# stackstreak-sdk

JavaScript SDK for the [StackStreak](https://github.com/Spagero763/stackstreak)
and Tic-Tac-Toe on-chain games on [Stacks](https://www.stacks.co/) (Bitcoin L2).

Reads run anywhere (browser or Node). Signed write helpers require a private
key, so use them only with a wallet **you** control (a CLI or backend you run).

## Install

```bash
npm install stackstreak-sdk
```

## Read example

```js
import { createClient } from "stackstreak-sdk";

const sdk = createClient(); // defaults to the mainnet deployment

console.log(await sdk.getTotalPlays());
console.log(await sdk.getLeaderboard(10));
console.log(await sdk.getStats("SP2…"));
console.log(await sdk.getGame(1)); // tic-tac-toe game #1
```

## Signed write example (Node)

```js
import { createClient } from "stackstreak-sdk";

const sdk = createClient();
const key = process.env.STACKS_PRIVATE_KEY; // a wallet you control — never commit this

const txid = await sdk.play(key); // one StackStreak roll
console.log("https://explorer.hiro.so/txid/" + txid + "?chain=mainnet");
```

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

`TTT_STATUS` maps status codes (`OPEN`, `ACTIVE`, `X_WON`, `O_WON`, `DRAW`).

## License

MIT
