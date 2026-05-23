// Runtime configuration, read from Vite env vars (see .env.example).
const env = import.meta.env;

export const APP_NAME = "StackStreak";
// Defaults point at the live mainnet deployment (a public on-chain address,
// not a secret). Override per-environment via Vite env vars if needed.
export const NETWORK = env.VITE_NETWORK || "mainnet";
export const CONTRACT_ADDRESS =
  env.VITE_CONTRACT_ADDRESS || "SP3JKFGFTQZSDYDRA4JSV0HST1D610WMR1G7K367T";
export const CONTRACT_NAME = env.VITE_CONTRACT_NAME || "stackstreak";

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
