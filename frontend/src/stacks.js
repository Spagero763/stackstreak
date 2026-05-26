// Thin wrapper around @stacks/connect (wallet + tx) and @stacks/transactions
// (read-only calls) for the StackStreak contract.
import {
  connect,
  disconnect,
  isConnected,
  getLocalStorage,
  request,
} from "@stacks/connect";
import {
  fetchCallReadOnlyFunction,
  cvToValue,
  hexToCV,
  Cl,
} from "@stacks/transactions";
import {
  NETWORK,
  CONTRACT_ADDRESS,
  CONTRACT_NAME,
  TTT_CONTRACT_NAME,
  COINFLIP_CONTRACT_NAME,
  RPS_CONTRACT_NAME,
  HILO_CONTRACT_NAME,
  C4_CONTRACT_NAME,
  API_BASE,
} from "./config";

// --- value coercion helpers (robust to clarity-value shape differences) ---
const val = (x) => (x && typeof x === "object" && "value" in x ? x.value : x);
const num = (x) => Number(val(x) ?? 0);
const addr = (x) => {
  const v = val(x);
  if (v == null) return null;
  return typeof v === "string" ? v : val(v);
};

// --- wallet ---
export function isWalletConnected() {
  return isConnected();
}

export function getStxAddress() {
  const data = getLocalStorage();
  return data?.addresses?.stx?.[0]?.address ?? null;
}

export async function connectWallet() {
  await connect();
  return getStxAddress();
}

export function disconnectWallet() {
  disconnect();
}

// --- generic contract helpers (work for any contract from the same deployer) ---
async function callContract(contractName, functionName, functionArgs = []) {
  const res = await request("stx_callContract", {
    contract: `${CONTRACT_ADDRESS}.${contractName}`,
    functionName,
    functionArgs,
    network: NETWORK,
  });
  return res.txid ?? res.txId ?? res;
}

async function readOnly(contractName, functionName, functionArgs = []) {
  const cv = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName,
    functionName,
    functionArgs,
    senderAddress: CONTRACT_ADDRESS,
    network: NETWORK,
  });
  return cvToValue(cv, true);
}

const asList = (x) =>
  Array.isArray(x) ? x : Array.isArray(val(x)) ? val(x) : [];

/* ===================== StackStreak (daily game) ===================== */

export async function play() {
  return callContract(CONTRACT_NAME, "play", []);
}

function normStats(t) {
  return {
    plays: num(t.plays),
    total: num(t["total-score"]),
    best: num(t["best-score"]),
    streak: num(t.streak),
    bestStreak: num(t["best-streak"]),
    lastDay: num(t["last-day"]),
  };
}

export async function getStats(address) {
  const t = await readOnly(CONTRACT_NAME, "get-stats", [Cl.principal(address)]);
  return normStats(t);
}

export async function getPlayers() {
  const players = await readOnly(CONTRACT_NAME, "get-players", []);
  return asList(players).map(addr).filter(Boolean);
}

export async function getTotalPlays() {
  return num(await readOnly(CONTRACT_NAME, "get-total-plays", []));
}

export async function getTop() {
  const t = await readOnly(CONTRACT_NAME, "get-top", []);
  return { player: addr(t.player), score: num(t.score) };
}

// Live activity feed, decoded from the contract's `print` events.
export async function getRecentPlays(limit = 15) {
  const id = `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`;
  const res = await fetch(
    `${API_BASE}/extended/v1/contract/${id}/events?limit=${limit}&offset=0`,
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
      // skip events we can't decode
    }
  }
  return out;
}

// Build the ranked leaderboard from the on-chain player registry.
// Fine for early scale; swap for an indexer if the registry grows large.
export async function getLeaderboard(limit = 25) {
  const players = await getPlayers();
  const rows = await Promise.all(
    players.map(async (address) => ({ address, ...(await getStats(address)) })),
  );
  rows.sort((a, b) => b.total - a.total || b.best - a.best);
  return rows.slice(0, limit);
}

/* ===================== Tic-Tac-Toe ===================== */

// Status codes mirror the contract.
export const TTT_STATUS = {
  OPEN: 0,
  ACTIVE: 1,
  X_WON: 2,
  O_WON: 3,
  DRAW: 4,
};

function normGame(t, id) {
  return {
    id,
    playerX: addr(t["player-x"]),
    playerO: addr(t["player-o"]),
    board: asList(t.board).map(num),
    turn: num(t.turn), // 1 = X to move, 2 = O to move
    status: num(t.status),
    winner: addr(t.winner),
    createdAt: num(t["created-at"]),
  };
}

export async function createGame() {
  return callContract(TTT_CONTRACT_NAME, "create-game", []);
}

export async function joinGame(id) {
  return callContract(TTT_CONTRACT_NAME, "join-game", [Cl.uint(id)]);
}

export async function playMove(id, pos) {
  return callContract(TTT_CONTRACT_NAME, "play-move", [
    Cl.uint(id),
    Cl.uint(pos),
  ]);
}

export async function getGameCount() {
  return num(await readOnly(TTT_CONTRACT_NAME, "get-game-count", []));
}

export async function getGame(id) {
  const raw = await readOnly(TTT_CONTRACT_NAME, "get-game", [Cl.uint(id)]);
  const t = raw && raw.value ? raw.value : raw;
  if (!t || !t["player-x"]) return null;
  return normGame(t, id);
}

export async function getTttRecord(address) {
  const r = await readOnly(TTT_CONTRACT_NAME, "get-record", [
    Cl.principal(address),
  ]);
  return { wins: num(r.wins), losses: num(r.losses), draws: num(r.draws) };
}

// Recent games, newest first.
export async function getRecentGames(limit = 12) {
  const count = await getGameCount();
  const ids = [];
  for (let i = count; i > 0 && ids.length < limit; i--) ids.push(i);
  const games = await Promise.all(ids.map((i) => getGame(i).catch(() => null)));
  return games.filter(Boolean);
}

/* ===================== Coin Flip ===================== */

export async function coinFlip(guess) {
  return callContract(COINFLIP_CONTRACT_NAME, "flip", [Cl.uint(guess)]);
}
export async function getCoinStats(address) {
  const t = await readOnly(COINFLIP_CONTRACT_NAME, "get-stats", [
    Cl.principal(address),
  ]);
  return {
    flips: num(t.flips),
    wins: num(t.wins),
    losses: num(t.losses),
    streak: num(t.streak),
    bestStreak: num(t["best-streak"]),
  };
}

/* ===================== Rock-Paper-Scissors ===================== */

export async function rpsPlay(move) {
  return callContract(RPS_CONTRACT_NAME, "play", [Cl.uint(move)]);
}
export async function getRpsStats(address) {
  const t = await readOnly(RPS_CONTRACT_NAME, "get-stats", [
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
}

/* ===================== Higher or Lower ===================== */

export async function hiloStart() {
  return callContract(HILO_CONTRACT_NAME, "start", []);
}
export async function hiloGuess(higher) {
  return callContract(HILO_CONTRACT_NAME, "guess", [Cl.bool(higher)]);
}
export async function getHiloState(address) {
  const t = await readOnly(HILO_CONTRACT_NAME, "get-state", [
    Cl.principal(address),
  ]);
  return {
    current: num(t.current),
    run: num(t.run),
    bestRun: num(t["best-run"]),
    plays: num(t.plays),
    active: val(t.active) === true || val(t.active) === "true",
  };
}

/* ===================== Connect Four ===================== */

export async function c4Create() {
  return callContract(C4_CONTRACT_NAME, "create-game", []);
}
export async function c4Join(id) {
  return callContract(C4_CONTRACT_NAME, "join-game", [Cl.uint(id)]);
}
export async function c4Drop(id, col) {
  return callContract(C4_CONTRACT_NAME, "drop", [Cl.uint(id), Cl.uint(col)]);
}
export async function getC4Count() {
  return num(await readOnly(C4_CONTRACT_NAME, "get-game-count", []));
}
export async function getC4Game(id) {
  const raw = await readOnly(C4_CONTRACT_NAME, "get-game", [Cl.uint(id)]);
  const t = raw && raw.value ? raw.value : raw;
  if (!t || !t["player-x"]) return null;
  return { ...normGame(t, id) };
}
export async function getC4Record(address) {
  const r = await readOnly(C4_CONTRACT_NAME, "get-record", [
    Cl.principal(address),
  ]);
  return { wins: num(r.wins), losses: num(r.losses), draws: num(r.draws) };
}
export async function getC4RecentGames(limit = 12) {
  const count = await getC4Count();
  const ids = [];
  for (let i = count; i > 0 && ids.length < limit; i--) ids.push(i);
  const games = await Promise.all(
    ids.map((i) => getC4Game(i).catch(() => null)),
  );
  return games.filter(Boolean);
}
