// Type declarations for stackstreak-sdk.
// The runtime is plain ESM JavaScript (src/index.js); these typings describe
// the full client API so TypeScript consumers get autocomplete and checking.

export declare const DEFAULT_CONTRACT_ADDRESS: string;

export declare const STREAK_CONTRACT_NAME: "stackstreak";
export declare const TTT_CONTRACT_NAME: "tictactoe";
export declare const COINFLIP_CONTRACT_NAME: "coinflip";
export declare const RPS_CONTRACT_NAME: "rps";
export declare const HILO_CONTRACT_NAME: "hilo";
export declare const C4_CONTRACT_NAME: "connectfour";
export declare const REELS_CONTRACT_NAME: "reels";
export declare const QUESTS_CONTRACT_NAME: "quests";

/** Game status codes shared by Tic-Tac-Toe and Connect Four. */
export interface GameStatus {
  OPEN: 0;
  ACTIVE: 1;
  X_WON: 2;
  O_WON: 3;
  DRAW: 4;
}
export declare const TTT_STATUS: GameStatus;
export declare const C4_STATUS: GameStatus;

export type Network = "mainnet" | "testnet";

export interface ClientOptions {
  /** Defaults to "mainnet". */
  network?: Network;
  /** Deployer address owning every game contract. Defaults to the mainnet deployment. */
  contractAddress?: string;
  /** Sender used for read-only calls. Defaults to `contractAddress`. */
  senderAddress?: string;
}

/* ---------- per-game data shapes ---------- */

export interface StreakStats {
  plays: number;
  total: number;
  best: number;
  streak: number;
  bestStreak: number;
  lastDay: number;
}

export interface LeaderboardRow extends StreakStats {
  address: string;
}

export interface StreakPlay {
  player: string;
  score: number;
  streak: number;
  total: number;
  txId: string;
}

export interface BoardGame {
  id: number;
  playerX: string | null;
  playerO: string | null;
  board: number[];
  /** 1 = X to move, 2 = O to move. */
  turn: number;
  status: number;
  winner: string | null;
  createdAt: number;
}

export interface WinLossRecord {
  wins: number;
  losses: number;
  draws: number;
}

export interface CoinStats {
  flips: number;
  wins: number;
  losses: number;
  streak: number;
  bestStreak: number;
}

export interface CoinFlipEvent {
  player: string;
  /** 0 = heads, 1 = tails. */
  guess: number;
  result: number;
  won: boolean;
  streak: number;
  txId: string;
}

export interface RpsStats {
  plays: number;
  wins: number;
  losses: number;
  draws: number;
  streak: number;
  bestStreak: number;
}

export interface RpsEvent {
  player: string;
  /** 0 rock, 1 paper, 2 scissors. */
  move: number;
  house: number;
  /** 0 draw, 1 player won, 2 player lost. */
  outcome: number;
  txId: string;
}

export interface HiloState {
  current: number;
  run: number;
  bestRun: number;
  plays: number;
  active: boolean;
}

export interface HiloEvent {
  event: "start" | "guess" | string;
  player: string;
  higher: boolean;
  prev: number;
  next: number;
  current: number;
  correct: boolean;
  run: number;
  txId: string;
}

export interface C4Event {
  event: string;
  id: number;
  col: number;
  row: number;
  mark: number;
  status: number;
  player: string | null;
  txId: string;
}

export interface ReelsStats {
  spins: number;
  wins: number;
  jackpots: number;
  streak: number;
  bestStreak: number;
}

export interface ReelsSpinEvent {
  player: string;
  /** Three symbols, each 0..5. */
  reels: number[];
  /** 0 none, 1 pair, 2 jackpot. */
  tier: number;
  streak: number;
  txId: string;
}

export interface QuestProgress {
  active: boolean;
  claimed: boolean;
  done: number;
  goal: number;
  day: number;
}

export interface QuestStats {
  completed: number;
  streak: number;
  bestStreak: number;
  lastDay: number;
}

export interface QuestEvent {
  event: "check-in" | "claim" | string;
  player: string;
  plays: number;
  completed: number;
  streak: number;
  txId: string;
}

export type StreakTop = { player: string | null; score: number };
export type CoinTop = { player: string | null; streak: number };
export type RpsTop = { player: string | null; streak: number };
export type HiloTop = { player: string | null; run: number };
export type ReelsTop = { player: string | null; jackpots: number };
export type QuestTop = { player: string | null; completed: number };

/** A decoded contract `print` event tuple plus its transaction id. */
export type RawEvent = Record<string, unknown> & { txId: string };

export interface StackStreakClient {
  network: Network;
  contractAddress: string;

  /* StackStreak (daily game) */
  getStats(address: string): Promise<StreakStats>;
  getPlayers(): Promise<string[]>;
  getTotalPlays(): Promise<number>;
  getTop(): Promise<StreakTop>;
  getLeaderboard(limit?: number): Promise<LeaderboardRow[]>;
  getRecentPlays(limit?: number): Promise<StreakPlay[]>;
  /** Signed write: one daily-streak roll. Returns the txid. */
  play(senderKey: string): Promise<string>;

  /* Tic-Tac-Toe */
  getGameCount(): Promise<number>;
  getGame(id: number): Promise<BoardGame | null>;
  getTttRecord(address: string): Promise<WinLossRecord>;
  createGame(senderKey: string): Promise<string>;
  joinGame(id: number, senderKey: string): Promise<string>;
  playMove(id: number, pos: number, senderKey: string): Promise<string>;

  /* Coin Flip */
  flip(guess: 0 | 1, senderKey: string): Promise<string>;
  getCoinStats(address: string): Promise<CoinStats>;
  getCoinTop(): Promise<CoinTop>;
  getRecentFlips(limit?: number): Promise<CoinFlipEvent[]>;

  /* Rock-Paper-Scissors */
  rpsPlay(move: 0 | 1 | 2, senderKey: string): Promise<string>;
  getRpsStats(address: string): Promise<RpsStats>;
  getRpsTop(): Promise<RpsTop>;
  getRecentRps(limit?: number): Promise<RpsEvent[]>;

  /* Higher or Lower */
  hiloStart(senderKey: string): Promise<string>;
  hiloGuess(higher: boolean, senderKey: string): Promise<string>;
  getHiloState(address: string): Promise<HiloState>;
  getHiloTop(): Promise<HiloTop>;
  getRecentHilo(limit?: number): Promise<HiloEvent[]>;

  /* Connect Four */
  c4Create(senderKey: string): Promise<string>;
  c4Join(id: number, senderKey: string): Promise<string>;
  c4Drop(id: number, col: number, senderKey: string): Promise<string>;
  getC4Count(): Promise<number>;
  getC4Game(id: number): Promise<BoardGame | null>;
  getC4Record(address: string): Promise<WinLossRecord>;
  getC4RecentGames(limit?: number): Promise<BoardGame[]>;
  getRecentC4(limit?: number): Promise<C4Event[]>;

  /* Lucky Reels */
  reelsSpin(senderKey: string): Promise<string>;
  getReelsStats(address: string): Promise<ReelsStats>;
  getReelsTop(): Promise<ReelsTop>;
  getRecentSpins(limit?: number): Promise<ReelsSpinEvent[]>;

  /* Daily Quests */
  questCheckIn(senderKey: string): Promise<string>;
  questClaim(senderKey: string): Promise<string>;
  getQuestProgress(address: string): Promise<QuestProgress>;
  getQuestStats(address: string): Promise<QuestStats>;
  getQuestTop(): Promise<QuestTop>;
  getRecentQuests(limit?: number): Promise<QuestEvent[]>;

  /* Generic */
  getContractEvents(contractName: string, limit?: number): Promise<RawEvent[]>;
}

export declare function createClient(opts?: ClientOptions): StackStreakClient;
export default createClient;
