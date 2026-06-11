// stackstreak-sdk
// A small JavaScript SDK for the StackStreak family of on-chain games.
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
export const COINFLIP_CONTRACT_NAME = "coinflip";
export const RPS_CONTRACT_NAME = "rps";
export const HILO_CONTRACT_NAME = "hilo";
export const C4_CONTRACT_NAME = "connectfour";
export const REELS_CONTRACT_NAME = "reels";
export const QUESTS_CONTRACT_NAME = "quests";

export const TTT_STATUS = {
  OPEN: 0,
  ACTIVE: 1,
  X_WON: 2,
  O_WON: 3,
  DRAW: 4,
};
// Connect Four uses the same status codes (0..4).
export const C4_STATUS = TTT_STATUS;

// --- value coercion (robust to clarity-value shapes) ---
const val = (x) => (x && typeof x === "object" && "value" in x ? x.value : x);
const num = (x) => Number(val(x) ?? 0);
const bool = (x) => {
  const v = val(x);
  return v === true || v === "true";
};
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

  // Generic decoded-event reader. Each game emits `print` events shaped like
  // { event: "<name>", ... }; this returns the raw decoded tuples newest-first
  // so callers can shape them into per-game feed rows.
  async function getContractEvents(contractName, limit = 20) {
    const id = `${contractAddress}.${contractName}`;
    const res = await fetch(
      `${apiBase(network)}/extended/v1/contract/${id}/events?limit=${limit}&offset=0`,
    );
    if (!res.ok) throw new Error(`events ${res.status}`);
    const data = await res.json();
    const out = [];
    for (const ev of data.results || []) {
      const hex = ev?.contract_log?.value?.hex;
      if (!hex) continue;
      try {
        const decoded = cvToValue(hexToCV(hex), true);
        out.push({ ...decoded, txId: ev.tx_id });
      } catch {
        /* skip */
      }
    }
    return out;
  }

  // ---- StackStreak ----
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
  const getRecentPlays = async (limit = 15) =>
    (await getContractEvents(STREAK_CONTRACT_NAME, limit))
      .filter((v) => (val(v.event) ?? v.event) === "play")
      .map((v) => ({
        player: addr(v.player),
        score: num(v.score),
        streak: num(v.streak),
        total: num(v.total),
        txId: v.txId,
      }));

  // ---- Tic-Tac-Toe ----
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

  // ---- Coin Flip ----
  const flip = (guess, senderKey) =>
    write(COINFLIP_CONTRACT_NAME, "flip", [Cl.uint(guess)], senderKey);
  const getCoinStats = async (address) => {
    const t = await read(COINFLIP_CONTRACT_NAME, "get-stats", [
      Cl.principal(address),
    ]);
    return {
      flips: num(t.flips),
      wins: num(t.wins),
      losses: num(t.losses),
      streak: num(t.streak),
      bestStreak: num(t["best-streak"]),
    };
  };
  const getCoinTop = async () => {
    const t = await read(COINFLIP_CONTRACT_NAME, "get-top", []);
    return { player: addr(t.player), streak: num(t.streak) };
  };
  const getRecentFlips = async (limit = 15) =>
    (await getContractEvents(COINFLIP_CONTRACT_NAME, limit))
      .filter((v) => (val(v.event) ?? v.event) === "flip")
      .map((v) => ({
        player: addr(v.player),
        guess: num(v.guess),
        result: num(v.result),
        won: bool(v.won),
        streak: num(v.streak),
        txId: v.txId,
      }));

  // ---- Rock-Paper-Scissors ----
  const rpsPlay = (move, senderKey) =>
    write(RPS_CONTRACT_NAME, "play", [Cl.uint(move)], senderKey);
  const getRpsStats = async (address) => {
    const t = await read(RPS_CONTRACT_NAME, "get-stats", [
      Cl.principal(address),
    ]);
    return {
      plays: num(t.plays),
      wins: num(t.wins),
      losses: num(t.losses),
      draws: num(t.draws),
      streak: num(t.streak),
      bestStreak: num(t["best-streak"]),
    };
  };
  const getRpsTop = async () => {
    const t = await read(RPS_CONTRACT_NAME, "get-top", []);
    return { player: addr(t.player), streak: num(t.streak) };
  };
  const getRecentRps = async (limit = 15) =>
    (await getContractEvents(RPS_CONTRACT_NAME, limit))
      .filter((v) => (val(v.event) ?? v.event) === "play")
      .map((v) => ({
        player: addr(v.player),
        move: num(v.move),
        house: num(v.house),
        outcome: num(v.outcome),
        txId: v.txId,
      }));

  // ---- Higher or Lower ----
  const hiloStart = (senderKey) =>
    write(HILO_CONTRACT_NAME, "start", [], senderKey);
  const hiloGuess = (higher, senderKey) =>
    write(HILO_CONTRACT_NAME, "guess", [Cl.bool(higher)], senderKey);
  const getHiloState = async (address) => {
    const t = await read(HILO_CONTRACT_NAME, "get-state", [
      Cl.principal(address),
    ]);
    return {
      current: num(t.current),
      run: num(t.run),
      bestRun: num(t["best-run"]),
      plays: num(t.plays),
      active: bool(t.active),
    };
  };
  const getHiloTop = async () => {
    const t = await read(HILO_CONTRACT_NAME, "get-top", []);
    return { player: addr(t.player), run: num(t.run) };
  };
  const getRecentHilo = async (limit = 15) =>
    (await getContractEvents(HILO_CONTRACT_NAME, limit)).map((v) => ({
      event: val(v.event) ?? v.event,
      player: addr(v.player),
      higher: bool(v.higher),
      prev: num(v.prev),
      next: num(v.next),
      current: num(v.current),
      correct: bool(v.correct),
      run: num(v.run),
      txId: v.txId,
    }));

  // ---- Connect Four ----
  const c4Create = (senderKey) =>
    write(C4_CONTRACT_NAME, "create-game", [], senderKey);
  const c4Join = (id, senderKey) =>
    write(C4_CONTRACT_NAME, "join-game", [Cl.uint(id)], senderKey);
  const c4Drop = (id, col, senderKey) =>
    write(C4_CONTRACT_NAME, "drop", [Cl.uint(id), Cl.uint(col)], senderKey);
  const getC4Count = async () =>
    num(await read(C4_CONTRACT_NAME, "get-game-count", []));
  const getC4Game = async (id) => {
    const raw = await read(C4_CONTRACT_NAME, "get-game", [Cl.uint(id)]);
    const t = raw && raw.value ? raw.value : raw;
    if (!t || !t["player-x"]) return null;
    return normGame(t, id);
  };
  const getC4Record = async (address) => {
    const r = await read(C4_CONTRACT_NAME, "get-record", [
      Cl.principal(address),
    ]);
    return { wins: num(r.wins), losses: num(r.losses), draws: num(r.draws) };
  };
  const getC4RecentGames = async (limit = 12) => {
    const count = await getC4Count();
    const ids = [];
    for (let i = count; i > 0 && ids.length < limit; i--) ids.push(i);
    const games = await Promise.all(
      ids.map((i) => getC4Game(i).catch(() => null)),
    );
    return games.filter(Boolean);
  };
  const getRecentC4 = async (limit = 15) =>
    (await getContractEvents(C4_CONTRACT_NAME, limit)).map((v) => ({
      event: val(v.event) ?? v.event,
      id: num(v.id),
      col: num(v.col),
      row: num(v.row),
      mark: num(v.mark),
      status: num(v.status),
      player: addr(v.player) || addr(v["player-x"]) || addr(v["player-o"]),
      txId: v.txId,
    }));

  // ---- Lucky Reels (slots) ----
  const reelsSpin = (senderKey) =>
    write(REELS_CONTRACT_NAME, "spin", [], senderKey);
  const getReelsStats = async (address) => {
    const t = await read(REELS_CONTRACT_NAME, "get-stats", [
      Cl.principal(address),
    ]);
    return {
      spins: num(t.spins),
      wins: num(t.wins),
      jackpots: num(t.jackpots),
      streak: num(t.streak),
      bestStreak: num(t["best-streak"]),
    };
  };
  const getReelsTop = async () => {
    const t = await read(REELS_CONTRACT_NAME, "get-top", []);
    return { player: addr(t.player), jackpots: num(t.jackpots) };
  };
  const getRecentSpins = async (limit = 15) =>
    (await getContractEvents(REELS_CONTRACT_NAME, limit))
      .filter((v) => (val(v.event) ?? v.event) === "spin")
      .map((v) => ({
        player: addr(v.player),
        reels: [num(v.r1), num(v.r2), num(v.r3)],
        tier: num(v.tier),
        streak: num(v.streak),
        txId: v.txId,
      }));

  // ---- Daily Quests ----
  const questCheckIn = (senderKey) =>
    write(QUESTS_CONTRACT_NAME, "check-in", [], senderKey);
  const questClaim = (senderKey) =>
    write(QUESTS_CONTRACT_NAME, "claim", [], senderKey);
  const getQuestProgress = async (address) => {
    const t = await read(QUESTS_CONTRACT_NAME, "get-progress", [
      Cl.principal(address),
    ]);
    return {
      active: bool(t.active),
      claimed: bool(t.claimed),
      done: num(t.done),
      goal: num(t.goal),
      day: num(t.day),
    };
  };
  const getQuestStats = async (address) => {
    const t = await read(QUESTS_CONTRACT_NAME, "get-quest-stats", [
      Cl.principal(address),
    ]);
    return {
      completed: num(t.completed),
      streak: num(t.streak),
      bestStreak: num(t["best-streak"]),
      lastDay: num(t["last-day"]),
    };
  };
  const getQuestTop = async () => {
    const t = await read(QUESTS_CONTRACT_NAME, "get-top", []);
    return { player: addr(t.player), completed: num(t.completed) };
  };
  const getRecentQuests = async (limit = 15) =>
    (await getContractEvents(QUESTS_CONTRACT_NAME, limit)).map((v) => ({
      event: val(v.event) ?? v.event,
      player: addr(v.player),
      plays: num(v.plays),
      completed: num(v.completed),
      streak: num(v.streak),
      txId: v.txId,
    }));

  // ---- Signed writes (legacy aliases kept for back-compat) ----
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
    // coin flip
    flip,
    getCoinStats,
    getCoinTop,
    getRecentFlips,
    // rps
    rpsPlay,
    getRpsStats,
    getRpsTop,
    getRecentRps,
    // hi-lo
    hiloStart,
    hiloGuess,
    getHiloState,
    getHiloTop,
    getRecentHilo,
    // connect four
    c4Create,
    c4Join,
    c4Drop,
    getC4Count,
    getC4Game,
    getC4Record,
    getC4RecentGames,
    getRecentC4,
    // lucky reels
    reelsSpin,
    getReelsStats,
    getReelsTop,
    getRecentSpins,
    // daily quests
    questCheckIn,
    questClaim,
    getQuestProgress,
    getQuestStats,
    getQuestTop,
    getRecentQuests,
    // generic
    getContractEvents,
  };
}

export default createClient;
