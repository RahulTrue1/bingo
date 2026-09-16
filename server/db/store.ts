import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type {
  BingoClaim,
  BingoRoomData,
  ChatMessage,
  GameSession,
  Jackpot,
  PlayerProfile,
  PlayerTicket,
  Promotion,
  SavedPattern,
  Tournament,
  Transaction,
} from "../types.ts";

const DATA_DIR = resolve(process.cwd(), "data");
const DB_FILE = resolve(DATA_DIR, "bingo-db.json");

export interface DatabaseSchema {
  rooms: BingoRoomData[];
  wallet: number;
  transactions: Transaction[];
  gameSessions: Record<string, GameSession>;
  tickets: PlayerTicket[];
  claims: BingoClaim[];
  jackpots: Jackpot[];
  tournaments: Tournament[];
  promotions: Promotion[];
  chatMessages: Record<string, ChatMessage[]>;
  mutedUsers: string[];
  patterns: SavedPattern[];
  players: PlayerProfile[];
  auditFeed: Array<{
    id: string;
    type: "claim" | "jackpot" | "player" | "alert";
    title: string;
    detail: string;
    time: string;
  }>;
}

const defaultRooms: BingoRoomData[] = [
  {
    id: "trueig-90",
    name: "Trueig 90 Classic",
    variant: "90-Ball Classic",
    status: "Starting Soon",
    ticketPrice: 0.5,
    prize: 265,
    players: 192,
    maxPlayers: 300,
    cardsSold: 682,
    startsIn: "00:46",
    pattern: "1 Line → 2 Lines → Full House",
    accent: "teal",
    featured: true,
    tag: "CLASSIC",
    frequency: "Every 10 min",
    cardRows: 3,
    cardColumns: 9,
    callDelay: 1350,
    rtp: 80,
    rtpMode: "dynamic",
    winningStages: [
      { name: "One Line", prize: 50, continueAfterWin: true },
      { name: "Two Lines", prize: 80, continueAfterWin: true },
      { name: "Full House", prize: 135, continueAfterWin: false },
    ],
  },
  {
    id: "turbo-30",
    name: "Turbo 30",
    variant: "30-Ball Speed",
    status: "Live",
    ticketPrice: 1,
    prize: 218,
    players: 84,
    maxPlayers: 150,
    cardsSold: 256,
    startsIn: "LIVE · Ball 11",
    pattern: "3 × 3 Coverall",
    accent: "coral",
    featured: true,
    tag: "SPEED",
    frequency: "Every 2 min",
    cardRows: 3,
    cardColumns: 3,
    callDelay: 650,
    rtp: 85,
    rtpMode: "dynamic",
    winningStages: [{ name: "Speed Full House", prize: 218, continueAfterWin: false }],
  },
  {
    id: "diamond-75",
    name: "Diamond 75",
    variant: "75-Ball Pattern",
    status: "Live",
    ticketPrice: 2,
    prize: 1500,
    players: 286,
    maxPlayers: 400,
    cardsSold: 934,
    startsIn: "LIVE · Ball 28",
    pattern: "Diamond",
    accent: "violet",
    featured: true,
    tag: "PATTERN",
    frequency: "Every 5 min",
    cardRows: 5,
    cardColumns: 5,
    callDelay: 1200,
    rtp: 80,
    rtpMode: "fixed",
    winningStages: [
      { name: "Four Corners", prize: 150, continueAfterWin: true },
      { name: "One Line", prize: 350, continueAfterWin: true },
      { name: "Diamond", prize: 1000, continueAfterWin: false },
    ],
  },
  {
    id: "mega-jackpot",
    name: "Mega Trueig Jackpot",
    variant: "75-Ball Progressive",
    status: "Selling Tickets",
    ticketPrice: 5,
    prize: 4836,
    jackpot: 125480,
    players: 348,
    maxPlayers: 500,
    cardsSold: 1248,
    startsIn: "02:18",
    pattern: "Full House ≤ 42 balls",
    accent: "gold",
    featured: true,
    tag: "JACKPOT",
    frequency: "Every 15 min",
    cardRows: 5,
    cardColumns: 5,
    callDelay: 1050,
    progressiveBallLimit: 42,
    rtp: 80,
    rtpMode: "dynamic",
    winningStages: [
      { name: "One Line", prize: 500, continueAfterWin: true },
      { name: "Full House", prize: 4336, continueAfterWin: false },
    ],
  },
  {
    id: "quick-80",
    name: "Quick 80",
    variant: "80-Ball Grid",
    status: "Selling Tickets",
    ticketPrice: 1,
    prize: 400,
    players: 136,
    maxPlayers: 250,
    cardsSold: 504,
    startsIn: "05:10",
    pattern: "Single Line → Full House",
    accent: "pink",
    tag: "80-BALL",
    frequency: "Every 8 min",
    cardRows: 4,
    cardColumns: 4,
    callDelay: 950,
    rtp: 80,
    rtpMode: "fixed",
    winningStages: [
      { name: "Single Line", prize: 80, continueAfterWin: true },
      { name: "Four Corners", prize: 120, continueAfterWin: true },
      { name: "Full House", prize: 200, continueAfterWin: false },
    ],
  },
  {
    id: "pattern-arena",
    name: "Trueig Pattern Arena",
    variant: "75-Ball Pattern Series",
    status: "Open",
    ticketPrice: 1.5,
    prize: 580,
    players: 168,
    maxPlayers: 300,
    cardsSold: 472,
    startsIn: "03:24",
    pattern: "Round 1 · X Pattern",
    accent: "violet",
    tag: "5 ROUNDS",
    frequency: "Every 12 min",
    cardRows: 5,
    cardColumns: 5,
    callDelay: 1100,
    rtp: 82,
    rtpMode: "dynamic",
    winningStages: [{ name: "X Pattern", prize: 580, continueAfterWin: false }],
  },
  {
    id: "free-party",
    name: "Free Bingo Party",
    variant: "75-Ball Community",
    status: "Open",
    ticketPrice: 0,
    prize: 100,
    players: 118,
    maxPlayers: 500,
    cardsSold: 438,
    startsIn: "08:32",
    pattern: "Four Corners",
    accent: "blue",
    tag: "FREE",
    frequency: "Every hour",
    cardRows: 5,
    cardColumns: 5,
    callDelay: 1300,
    rtp: 100,
    rtpMode: "fixed",
    winningStages: [{ name: "Four Corners", prize: 100, continueAfterWin: false }],
  },
  {
    id: "midnight-90",
    name: "Midnight Bingo",
    variant: "90-Ball After Dark",
    status: "Scheduled",
    ticketPrice: 2,
    prize: 1200,
    players: 224,
    maxPlayers: 400,
    cardsSold: 752,
    startsIn: "23:00",
    pattern: "1 Line → 2 Lines → Full House",
    accent: "blue",
    tag: "NIGHT",
    frequency: "Nightly",
    cardRows: 3,
    cardColumns: 9,
    callDelay: 1150,
    rtp: 80,
    rtpMode: "fixed",
    winningStages: [
      { name: "One Line", prize: 200, continueAfterWin: true },
      { name: "Two Lines", prize: 300, continueAfterWin: true },
      { name: "Full House", prize: 700, continueAfterWin: false },
    ],
  },
  {
    id: "vip-gold",
    name: "VIP Gold Room",
    variant: "75-Ball VIP",
    status: "Scheduled",
    ticketPrice: 10,
    prize: 2500,
    players: 42,
    maxPlayers: 80,
    cardsSold: 126,
    startsIn: "21:00",
    pattern: "X Pattern → Blackout",
    accent: "gold",
    tag: "VIP",
    frequency: "Daily",
    cardRows: 5,
    cardColumns: 5,
    callDelay: 1450,
    vipOnly: true,
    rtp: 85,
    rtpMode: "fixed",
    winningStages: [
      { name: "X Pattern", prize: 750, continueAfterWin: true },
      { name: "Blackout", prize: 1750, continueAfterWin: false },
    ],
  },
  {
    id: "tournament",
    name: "Trueigtech Weekend Cup",
    variant: "Tournament · 5 Rounds",
    status: "Open",
    ticketPrice: 8,
    prize: 5000,
    players: 384,
    maxPlayers: 512,
    cardsSold: 768,
    startsIn: "FRI · 20:00",
    pattern: "Points Series",
    accent: "violet",
    tag: "TOURNAMENT",
    frequency: "Weekly",
    cardRows: 5,
    cardColumns: 5,
    callDelay: 900,
    rtp: 80,
    rtpMode: "fixed",
  },
];

const defaultJackpots: Jackpot[] = [
  {
    id: "mega-trueig",
    name: "Mega Trueig Jackpot",
    variant: "75-Ball Progressive",
    currentAmount: 125480.6,
    startingAmount: 50000,
    maximumAmount: 250000,
    resetAmount: 50000,
    contributionPercent: 2.5,
    qualifyingPattern: "Full House",
    qualifyingBallLimit: 42,
    enabled: true,
    linkedRooms: ["mega-jackpot", "diamond-75"],
    history: [
      { type: "Ticket contribution", amount: 42.1, time: "14:31", user: "Auto Contribution" },
      { type: "Ticket contribution", amount: 38.65, time: "14:26", user: "Auto Contribution" },
      { type: "Game contribution", amount: 100.0, time: "14:15", user: "Operator" },
      { type: "Manual adjustment", amount: 500.0, time: "12:00", user: "John Dawson" },
    ],
  },
];

const defaultTournaments: Tournament[] = [
  {
    id: "weekend-cup",
    name: "Trueigtech Weekend Cup",
    description: "Five-round progressive elimination tournament.",
    entryFee: 8.0,
    prizePool: 25000,
    playersCount: 384,
    maxPlayers: 512,
    startsAt: "22 Aug · 20:00",
    status: "Registration open",
    rounds: ["Qualifiers", "Round of 256", "Round of 128", "Semi Final", "Grand Final"],
    scoringRules: {
      "Line win": "10 pts",
      "Pattern win": "25 pts",
      "Full house": "50 pts",
      "Fast Bingo bonus": "+15 pts",
      "Round winner": "+40 pts",
    },
    standings: [
      { rank: 1, player: "LuckyStar", points: 285, wins: 4, status: "Qualified" },
      { rank: 2, player: "BingoMaster", points: 240, wins: 3, status: "Qualified" },
      { rank: 3, player: "SpeedySam", points: 215, wins: 2, status: "Qualified" },
      { rank: 4, player: "Ari.R", points: 190, wins: 2, status: "Qualified" },
      { rank: 5, player: "TrueigQueen", points: 175, wins: 1, status: "Qualified" },
    ],
  },
];

const defaultPromotions: Promotion[] = [
  {
    id: "free-bingo",
    title: "Free Bingo Party",
    description: "Hourly free 75-ball card with real cash prizes.",
    status: "Active",
    category: "Free cards",
    badge: "FREE",
    rewardType: "free_cards",
    rewardValue: 1,
    claimedBy: [],
  },
  {
    id: "buy3-get1",
    title: "Buy 3 Get 1 Free",
    description: "Fourth eligible card is free on any 75-Ball room.",
    status: "Active",
    category: "All offers",
    badge: "POPULAR",
    rewardType: "free_cards",
    rewardValue: 1,
    claimedBy: [],
  },
  {
    id: "happy-hour",
    title: "Happy Hour Bingo",
    description: "50% ticket discount on all evening games from 18:00 to 19:00.",
    status: "Scheduled",
    category: "Deposit bonus",
    badge: "50% OFF",
    rewardType: "credits",
    rewardValue: 15,
    claimedBy: [],
  },
  {
    id: "cashback-10",
    title: "10% Weekly Cashback",
    description: "Receive 10% back on all non-winning cards every Monday.",
    status: "Active",
    category: "Cashback",
    badge: "10%",
    rewardType: "cashback",
    rewardValue: 10,
    claimedBy: [],
  },
  {
    id: "tournament-entry",
    title: "Weekend Cup Ticket Reward",
    description: "Play 20 games in any room to receive a free Weekend Cup ticket.",
    status: "Draft",
    category: "Tournaments",
    badge: "REWARD",
    rewardType: "free_cards",
    rewardValue: 1,
    claimedBy: [],
  },
  {
    id: "vip-access",
    title: "Unlock VIP Gold Room",
    description: "Special high-roller access with boosted prize pools.",
    status: "Active",
    category: "All offers",
    badge: "VIP",
    rewardType: "vip_pass",
    rewardValue: 1,
    claimedBy: [],
  },
  {
    id: "daily-reward",
    title: "Daily Login Bonus",
    description: "Claim $5 bonus credit once every 24 hours.",
    status: "Active",
    category: "Deposit bonus",
    badge: "$5 GIFT",
    rewardType: "credits",
    rewardValue: 5,
    claimedBy: [],
  },
];

const defaultTransactions: Transaction[] = [
  {
    id: "TXN-854201",
    player: "TrueigQueen",
    room: "Mega Trueig Jackpot",
    type: "Ticket purchase",
    amount: -40.0,
    status: "Completed",
    timestamp: "14:32:08",
  },
  {
    id: "PAY-284201",
    player: "Ari.R",
    room: "Diamond 75",
    type: "Prize payout",
    amount: 1250.0,
    status: "Processing",
    timestamp: "14:31:44",
  },
  {
    id: "JP-684212",
    player: "System",
    room: "Mega Trueig Jackpot",
    type: "Jackpot contribution",
    amount: 42.1,
    status: "Completed",
    timestamp: "14:31:02",
  },
  {
    id: "REF-128492",
    player: "MikaK",
    room: "Trueig 90 Classic",
    type: "Refund",
    amount: 3.0,
    status: "Completed",
    timestamp: "14:28:16",
  },
  {
    id: "PROMO-48311",
    player: "SkyJump",
    room: "Free Bingo Party",
    type: "Promotional credit",
    amount: 5.0,
    status: "Completed",
    timestamp: "14:24:54",
  },
];

const defaultPatterns: SavedPattern[] = [
  {
    name: "Four Corners",
    cells: [0, 4, 20, 24],
    layout: "5 × 5",
    allowRotations: true,
    allowMirroring: true,
  },
  {
    name: "Diamond",
    cells: [2, 6, 8, 10, 14, 16, 18, 22],
    layout: "5 × 5",
    allowRotations: true,
    allowMirroring: true,
  },
  {
    name: "X Shape",
    cells: [0, 4, 6, 8, 12, 16, 18, 20, 24],
    layout: "5 × 5",
    allowRotations: true,
    allowMirroring: true,
  },
  {
    name: "Full House",
    cells: Array.from({ length: 25 }, (_, i) => i),
    layout: "5 × 5",
    allowRotations: true,
    allowMirroring: true,
  },
];

const defaultPlayers: PlayerProfile[] = [
  {
    id: "USR-10482",
    username: "TrueigQueen",
    tier: "VIP",
    balance: 12480,
    gamesPlayed: 842,
    cardsPurchased: 2450,
    wins: 142,
    totalPrizes: 24860,
    restrictions: [],
    lastLogin: "Today · 14:29",
    status: "Active",
  },
  {
    id: "USR-09814",
    username: "MikaK",
    tier: "Standard",
    balance: 4820,
    gamesPlayed: 420,
    cardsPurchased: 1100,
    wins: 48,
    totalPrizes: 7980,
    restrictions: [],
    lastLogin: "Today · 14:18",
    status: "Active",
  },
  {
    id: "USR-11804",
    username: "Ari.R",
    tier: "Standard",
    balance: 248.5,
    gamesPlayed: 128,
    cardsPurchased: 346,
    wins: 18,
    totalPrizes: 2840,
    restrictions: [],
    lastLogin: "Today · 14:21",
    status: "Active",
  },
  {
    id: "USR-07226",
    username: "RiskyB",
    tier: "Restricted",
    balance: 0,
    gamesPlayed: 294,
    cardsPurchased: 650,
    wins: 12,
    totalPrizes: 8250,
    restrictions: ["Muted in chat", "Manual claim check"],
    lastLogin: "Yesterday",
    status: "Restricted",
  },
];

const defaultAuditFeed = [
  {
    id: "feed-1",
    type: "claim" as const,
    title: "Bingo claim validated",
    detail: "Diamond 75 · Card #284201",
    time: "14:32",
  },
  {
    id: "feed-2",
    type: "jackpot" as const,
    title: "Jackpot contribution",
    detail: "+$42.10 · Mega Trueig Jackpot",
    time: "14:31",
  },
  {
    id: "feed-3",
    type: "player" as const,
    title: "High-value player joined",
    detail: "TrueigQueen · VIP Gold Room",
    time: "14:29",
  },
  {
    id: "feed-4",
    type: "alert" as const,
    title: "Claim rejected",
    detail: "Turbo 30 · Invalid pattern",
    time: "14:26",
  },
];

const defaultChat: Record<string, ChatMessage[]> = {
  "diamond-75": [
    { id: "c1", roomId: "diamond-75", user: "LuckyStar", text: "BINGO!! That was close 🎉", time: "14:32", role: "player" },
    { id: "c2", roomId: "diamond-75", user: "MikaK", text: "need N-34 to hit diamond!", time: "14:31", role: "player" },
    { id: "c3", roomId: "diamond-75", user: "Ari.R", text: "good luck everyone", time: "14:28", role: "player" },
  ],
  "turbo-30": [
    { id: "c4", roomId: "turbo-30", user: "SpeedySam", text: "ready for another one", time: "14:31", role: "player" },
  ],
};

function createInitialSessions(): Record<string, GameSession> {
  const sessions: Record<string, GameSession> = {};
  for (const r of defaultRooms) {
    const isLive = r.status === "Live";
    const initialCalled = isLive
      ? Array.from({ length: r.id === "diamond-75" ? 28 : 11 }, (_, i) => i + 1)
      : [];
    sessions[r.id] = {
      roomId: r.id,
      phase: isLive ? "live" : "selling",
      countdown: 5,
      called: initialCalled,
      current: initialCalled.length ? initialCalled[initialCalled.length - 1] : null,
      speed: r.variant.includes("Speed") ? "Turbo" : "Fast",
      paused: false,
      stageIndex: 0,
      patternRound: 0,
      winnerNames: [],
      winnerPrize: 0,
      winnerPattern: "",
      livePlayers: r.players,
      liveCards: r.cardsSold,
      liveJackpot: r.jackpot ?? 0,
      lastWinner: "LuckyStar · $420",
    };
  }
  return sessions;
}

class Store {
  private data: DatabaseSchema;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.data = this.loadFromDisk();
  }

  private loadFromDisk(): DatabaseSchema {
    try {
      if (existsSync(DB_FILE)) {
        const raw = readFileSync(DB_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        // Merge with defaults to ensure all keys exist
        return {
          rooms: parsed.rooms?.length ? parsed.rooms : defaultRooms,
          wallet: typeof parsed.wallet === "number" ? parsed.wallet : 248.5,
          transactions: parsed.transactions?.length ? parsed.transactions : defaultTransactions,
          gameSessions: parsed.gameSessions || createInitialSessions(),
          tickets: parsed.tickets || [],
          claims: parsed.claims || [],
          jackpots: parsed.jackpots || defaultJackpots,
          tournaments: parsed.tournaments || defaultTournaments,
          promotions: parsed.promotions || defaultPromotions,
          chatMessages: parsed.chatMessages || defaultChat,
          mutedUsers: parsed.mutedUsers || ["RiskyB"],
          patterns: parsed.patterns || defaultPatterns,
          players: parsed.players || defaultPlayers,
          auditFeed: parsed.auditFeed || defaultAuditFeed,
        };
      }
    } catch (err) {
      console.warn("Could not read db file, initializing with defaults", err);
    }

    return {
      rooms: [...defaultRooms],
      wallet: 248.5,
      transactions: [...defaultTransactions],
      gameSessions: createInitialSessions(),
      tickets: [],
      claims: [],
      jackpots: [...defaultJackpots],
      tournaments: [...defaultTournaments],
      promotions: [...defaultPromotions],
      chatMessages: { ...defaultChat },
      mutedUsers: ["RiskyB"],
      patterns: [...defaultPatterns],
      players: [...defaultPlayers],
      auditFeed: [...defaultAuditFeed],
    };
  }

  public save(): void {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      try {
        if (!existsSync(DATA_DIR)) {
          mkdirSync(DATA_DIR, { recursive: true });
        }
        writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), "utf-8");
      } catch (err) {
        console.error("Failed to persist database state", err);
      }
    }, 150);
    if (this.saveTimeout.unref) this.saveTimeout.unref();
  }

  // Accessors
  get rooms() {
    return this.data.rooms;
  }
  set rooms(v) {
    this.data.rooms = v;
    this.save();
  }

  get wallet() {
    return this.data.wallet;
  }
  set wallet(v) {
    this.data.wallet = Math.round(v * 100) / 100;
    this.save();
  }

  get transactions() {
    return this.data.transactions;
  }

  get gameSessions() {
    return this.data.gameSessions;
  }

  get tickets() {
    return this.data.tickets;
  }

  get claims() {
    return this.data.claims;
  }

  get jackpots() {
    return this.data.jackpots;
  }

  get tournaments() {
    return this.data.tournaments;
  }

  get promotions() {
    return this.data.promotions;
  }

  get chatMessages() {
    return this.data.chatMessages;
  }

  get mutedUsers() {
    return this.data.mutedUsers;
  }

  get patterns() {
    return this.data.patterns;
  }

  get players() {
    return this.data.players;
  }

  get auditFeed() {
    return this.data.auditFeed;
  }

  public addTransaction(tx: Omit<Transaction, "id" | "timestamp">): Transaction {
    const id = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date();
    const timestamp = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    const newTx: Transaction = { id, timestamp, ...tx };
    this.data.transactions.unshift(newTx);
    this.save();
    return newTx;
  }

  public addAudit(type: "claim" | "jackpot" | "player" | "alert", title: string, detail: string) {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    this.data.auditFeed.unshift({
      id: `feed-${Date.now()}`,
      type,
      title,
      detail,
      time,
    });
    if (this.data.auditFeed.length > 50) {
      this.data.auditFeed.pop();
    }
    this.save();
  }
}

export const store = new Store();
