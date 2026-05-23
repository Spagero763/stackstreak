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
  Cl,
} from "@stacks/transactions";
import { NETWORK, CONTRACT_ADDRESS, CONTRACT_NAME } from "./config";

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

// --- write: play one round (one transaction) ---
export async function play() {
  const res = await request("stx_callContract", {
    contract: `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`,
    functionName: "play",
    functionArgs: [],
    network: NETWORK,
  });
  return res.txid ?? res.txId ?? res;
}

// --- read-only ---
async function readOnly(functionName, functionArgs = []) {
  const cv = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName,
    functionArgs,
    senderAddress: CONTRACT_ADDRESS,
    network: NETWORK,
  });
  return cvToValue(cv, true);
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
  const t = await readOnly("get-stats", [Cl.principal(address)]);
  return normStats(t);
}

export async function getPlayers() {
  const list = await readOnly("get-players", []);
  return (Array.isArray(list) ? list : []).map(addr).filter(Boolean);
}

export async function getTotalPlays() {
  return num(await readOnly("get-total-plays", []));
}

export async function getTop() {
  const t = await readOnly("get-top", []);
  return { player: addr(t.player), score: num(t.score) };
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
