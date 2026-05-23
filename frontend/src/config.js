// Runtime configuration, read from Vite env vars (see .env.example).
const env = import.meta.env;

export const APP_NAME = "StackStreak";
export const NETWORK = env.VITE_NETWORK || "testnet";
export const CONTRACT_ADDRESS = env.VITE_CONTRACT_ADDRESS || "";
export const CONTRACT_NAME = env.VITE_CONTRACT_NAME || "stackstreak";

// True once a contract address has been configured.
export const IS_CONFIGURED = Boolean(CONTRACT_ADDRESS);

export function explorerTx(txid) {
  return `https://explorer.hiro.so/txid/${txid}?chain=${NETWORK}`;
}

export function explorerContract() {
  return `https://explorer.hiro.so/txid/${CONTRACT_ADDRESS}.${CONTRACT_NAME}?chain=${NETWORK}`;
}
