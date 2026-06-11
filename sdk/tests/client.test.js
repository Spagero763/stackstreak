// API-surface tests for the SDK client. These run offline — they verify the
// exported constants and the full client method surface without touching the
// network, so they're deterministic in CI.
import { describe, expect, it } from "vitest";
import createClientDefault, {
  createClient,
  DEFAULT_CONTRACT_ADDRESS,
  STREAK_CONTRACT_NAME,
  TTT_CONTRACT_NAME,
  COINFLIP_CONTRACT_NAME,
  RPS_CONTRACT_NAME,
  HILO_CONTRACT_NAME,
  C4_CONTRACT_NAME,
  REELS_CONTRACT_NAME,
  QUESTS_CONTRACT_NAME,
  TTT_STATUS,
  C4_STATUS,
} from "../src/index.js";

const READS = [
  // streak
  "getStats", "getPlayers", "getTotalPlays", "getTop", "getLeaderboard", "getRecentPlays",
  // tic-tac-toe
  "getGameCount", "getGame", "getTttRecord",
  // coin flip
  "getCoinStats", "getCoinTop", "getRecentFlips",
  // rps
  "getRpsStats", "getRpsTop", "getRecentRps",
  // hilo
  "getHiloState", "getHiloTop", "getRecentHilo",
  // connect four
  "getC4Count", "getC4Game", "getC4Record", "getC4RecentGames", "getRecentC4",
  // reels
  "getReelsStats", "getReelsTop", "getRecentSpins",
  // quests
  "getQuestProgress", "getQuestStats", "getQuestTop", "getRecentQuests",
  // generic
  "getContractEvents",
];

const WRITES = [
  "play",
  "createGame", "joinGame", "playMove",
  "flip", "rpsPlay",
  "hiloStart", "hiloGuess",
  "c4Create", "c4Join", "c4Drop",
  "reelsSpin",
  "questCheckIn", "questClaim",
];

describe("exports", () => {
  it("exposes the deployed contract names", () => {
    expect(STREAK_CONTRACT_NAME).toBe("stackstreak");
    expect(TTT_CONTRACT_NAME).toBe("tictactoe");
    expect(COINFLIP_CONTRACT_NAME).toBe("coinflip");
    expect(RPS_CONTRACT_NAME).toBe("rps");
    expect(HILO_CONTRACT_NAME).toBe("hilo");
    expect(C4_CONTRACT_NAME).toBe("connectfour");
    expect(REELS_CONTRACT_NAME).toBe("reels");
    expect(QUESTS_CONTRACT_NAME).toBe("quests");
  });

  it("default export is createClient", () => {
    expect(createClientDefault).toBe(createClient);
  });

  it("status code tables match the contracts", () => {
    expect(TTT_STATUS).toEqual({ OPEN: 0, ACTIVE: 1, X_WON: 2, O_WON: 3, DRAW: 4 });
    expect(C4_STATUS).toEqual(TTT_STATUS);
  });

  it("the default deployer address is a mainnet principal", () => {
    expect(DEFAULT_CONTRACT_ADDRESS).toMatch(/^SP[0-9A-Z]{38,40}$/);
  });
});

describe("createClient", () => {
  it("defaults to mainnet and the production deployer", () => {
    const c = createClient();
    expect(c.network).toBe("mainnet");
    expect(c.contractAddress).toBe(DEFAULT_CONTRACT_ADDRESS);
  });

  it("honors network and contractAddress overrides", () => {
    const c = createClient({ network: "testnet", contractAddress: "ST000000000000000000002AMW42H" });
    expect(c.network).toBe("testnet");
    expect(c.contractAddress).toBe("ST000000000000000000002AMW42H");
  });

  it("exposes every read function", () => {
    const c = createClient();
    for (const fn of READS) {
      expect(typeof c[fn], `client.${fn}`).toBe("function");
    }
  });

  it("exposes every signed-write function", () => {
    const c = createClient();
    for (const fn of WRITES) {
      expect(typeof c[fn], `client.${fn}`).toBe("function");
    }
  });

  it("signed writes refuse to run without a sender key", async () => {
    const c = createClient();
    await expect(c.play()).rejects.toThrow(/senderKey/i);
    await expect(c.flip(0)).rejects.toThrow(/senderKey/i);
    await expect(c.questClaim()).rejects.toThrow(/senderKey/i);
  });
});
