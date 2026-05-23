// stackstreak-sdk
// A small JavaScript SDK for the StackStreak and Tic-Tac-Toe on-chain games.
//
// Reads work anywhere (browser or Node). The signed write helpers use
// @stacks/transactions' makeContractCall and therefore require a private key —
// use them only with a wallet you control (e.g. a CLI or backend you operate).
import {
  fetchCallReadOnlyFunction,
  cvToValue,
  hexToCV,
  makeContractCall,
  broadcastTransaction,
  Cl,
} from "@stacks/transactions";

export const DEFAULT_CONTRACT_ADDRESS =
  "SP3JKFGFTQZSDYDRA4JSV0HST1D610WMR1G7K367T";
export const STREAK_CONTRACT_NAME = "stackstreak";
export const TTT_CONTRACT_NAME = "tictactoe";

export const TTT_STATUS = {
  OPEN: 0,
  ACTIVE: 1,
  X_WON: 2,
  O_WON: 3,
  DRAW: 4,
};

// --- value coercion (robust to clarity-value shapes) ---
const val = (x) => (x && typeof x === "object" && "value" in x ? x.value : x);
const num = (x) => Number(val(x) ?? 0);
const addr = (x) => {
  let v = val(x);
  while (v && typeof v === "object" && "value" in v) v = v.value;
  return v == null ? null : v;
};
const asList = (x) =>
  Array.isArray(x) ? x : Array.isArray(val(x)) ? val(x) : [];

const apiBase = (network) =>
  network === "mainnet" ? "https://api.hiro.so" : "https://api.testnet.hiro.so";

/**
 * Create an SDK client.
 * @param {object} [opts]
 * @param {"mainnet"|"testnet"} [opts.network="mainnet"]
 * @param {string} [opts.contractAddress] deployer address (defaults to mainnet deployment)
 */
export function createClient(opts = {}) {
  const network = opts.network || "mainnet";
  const contractAddress = opts.contractAddress || DEFAULT_CONTRACT_ADDRESS;
  const sender = opts.senderAddress || contractAddress;

  async function read(contractName, functionName, functionArgs = []) {
    const cv = await fetchCallReadOnlyFunction({
      contractAddress,
      contractName,
      functionName,
      functionArgs,
      senderAddress: sender,
      network,
    });
    return cvToValue(cv, true);
  }

  async function write(contractName, functionName, functionArgs, senderKey) {
    if (!senderKey) throw new Error("senderKey required for write calls");
    const tx = await makeContractCall({
      contractAddress,
      contractName,
      functionName,
      functionArgs,
      senderKey,
      network,
    });
    const res = await broadcastTransaction({ transaction: tx, network });
    if (res.error) {
      throw new Error(`${res.error}: ${res.reason || ""}`.trim());
    }
    return res.txid;
  }

  // ---- StackStreak reads ----
  const getStats = async (address) => {
    const t = await read(STREAK_CONTRACT_NAME, "get-stats", [
      Cl.principal(address),
    ]);
    return {
      plays: num(t.plays),
      total: num(t["total-score"]),
      best: num(t["best-score"]),
      streak: num(t.streak),
      bestStreak: num(t["best-streak"]),
      lastDay: num(t["last-day"]),
    };
  };
  const getPlayers = async () =>
    asList(await read(STREAK_CONTRACT_NAME, "get-players", []))
      .map(addr)
      .filter(Boolean);
  const getTotalPlays = async () =>
    num(await read(STREAK_CONTRACT_NAME, "get-total-plays", []));
  const getTop = async () => {
    const t = await read(STREAK_CONTRACT_NAME, "get-top", []);
    return { player: addr(t.player), score: num(t.score) };
  };
  const getLeaderboard = async (limit = 25) => {
    const players = await getPlayers();
    const rows = await Promise.all(
      players.map(async (a) => ({ address: a, ...(await getStats(a)) })),
    );
    rows.sort((a, b) => b.total - a.total || b.best - a.best);
    return rows.slice(0, limit);
  };

  // ---- Tic-Tac-Toe reads ----
  const normGame = (t, id) => ({
    id,
    playerX: addr(t["player-x"]),
    playerO: addr(t["player-o"]),
    board: asList(t.board).map(num),
    turn: num(t.turn),
    status: num(t.status),
    winner: addr(t.winner),
    createdAt: num(t["created-at"]),
  });
  const getGameCount = async () =>
    num(await read(TTT_CONTRACT_NAME, "get-game-count", []));
  const getGame = async (id) => {
    const raw = await read(TTT_CONTRACT_NAME, "get-game", [Cl.uint(id)]);
    const t = raw && raw.value ? raw.value : raw;
    if (!t || !t["player-x"]) return null;
    return normGame(t, id);
  };
  const getTttRecord = async (address) => {
    const r = await read(TTT_CONTRACT_NAME, "get-record", [
      Cl.principal(address),
    ]);
    return { wins: num(r.wins), losses: num(r.losses), draws: num(r.draws) };
  };

  // ---- Activity feed (decoded print events) ----
  const getRecentPlays = async (limit = 15) => {
    const id = `${contractAddress}.${STREAK_CONTRACT_NAME}`;
    const res = await fetch(
      `${apiBase(network)}/extended/v1/contract/${id}/events?limit=${limit}`,
    );
    if (!res.ok) throw new Error(`events ${res.status}`);
    const data = await res.json();
    const out = [];
    for (const ev of data.results || []) {
      const hex = ev?.contract_log?.value?.hex;
      if (!hex) continue;
      try {
        const v = cvToValue(hexToCV(hex), true);
        if ((val(v.event) ?? v.event) !== "play") continue;
        out.push({
          player: addr(v.player),
          score: num(v.score),
          streak: num(v.streak),
          total: num(v.total),
          txId: ev.tx_id,
        });
      } catch {
        /* skip */
      }
    }
    return out;
  };

  // ---- Signed writes (require a private key you control) ----
  const play = (senderKey) =>
    write(STREAK_CONTRACT_NAME, "play", [], senderKey);
  const createGame = (senderKey) =>
    write(TTT_CONTRACT_NAME, "create-game", [], senderKey);
  const joinGame = (id, senderKey) =>
    write(TTT_CONTRACT_NAME, "join-game", [Cl.uint(id)], senderKey);
  const playMove = (id, pos, senderKey) =>
    write(TTT_CONTRACT_NAME, "play-move", [Cl.uint(id), Cl.uint(pos)], senderKey);

  return {
    network,
    contractAddress,
    // streak
    getStats,
    getPlayers,
    getTotalPlays,
    getTop,
    getLeaderboard,
    getRecentPlays,
    play,
    // tic-tac-toe
    getGameCount,
    getGame,
    getTttRecord,
    createGame,
    joinGame,
    playMove,
  };
}

export default createClient;
