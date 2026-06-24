// Runtime configuration, read from Vite env vars (see .env.example).
const env = import.meta.env;

export const APP_NAME = "StackStreak";
// Defaults point at the live mainnet deployment (a public on-chain address,
// not a secret). Override per-environment via Vite env vars if needed.
export const NETWORK = env.VITE_NETWORK || "mainnet";
export const CONTRACT_ADDRESS =
  env.VITE_CONTRACT_ADDRESS || "SP3JKFGFTQZSDYDRA4JSV0HST1D610WMR1G7K367T";
export const CONTRACT_NAME = env.VITE_CONTRACT_NAME || "stackstreak";
// All games are deployed from the same wallet, so they share CONTRACT_ADDRESS.
export const TTT_CONTRACT_NAME = env.VITE_TTT_CONTRACT_NAME || "tictactoe";
export const COINFLIP_CONTRACT_NAME = "coinflip";
export const RPS_CONTRACT_NAME = "rps";
export const HILO_CONTRACT_NAME = "hilo";
export const C4_CONTRACT_NAME = "connectfour";
export const REELS_CONTRACT_NAME = "reels";
export const QUESTS_CONTRACT_NAME = "quests";
export const FLIPBET_CONTRACT_NAME = "flipbet";
// Must match the WAGER constant in contracts/flipbet.clar (microSTX).
export const BET_WAGER = 1000;

// Hiro API base for the configured network.
export const API_BASE =
  NETWORK === "mainnet"
    ? "https://api.hiro.so"
    : "https://api.testnet.hiro.so";

// True once a contract address has been configured.
export const IS_CONFIGURED = Boolean(CONTRACT_ADDRESS);

export function explorerTx(txid) {
  return `https://explorer.hiro.so/txid/${txid}?chain=${NETWORK}`;
}

export function explorerContract() {
  return `https://explorer.hiro.so/txid/${CONTRACT_ADDRESS}.${CONTRACT_NAME}?chain=${NETWORK}`;
}
