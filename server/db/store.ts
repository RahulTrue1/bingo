import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type {
  BingoClaim,
  BingoRoomData,
  ChatMessage,
  GameSession,
  HeroBanner,
  Jackpot,
  PlatformSettings,
  PlayerProfile,
  PlayerTicket,
  PokerHandHistory,
  PokerReconciliationReport,
  PokerSeat,
  PokerTable,
  Promotion,
  SavedPattern,
  Tournament,
  Transaction,
  UserSession,
} from "../types.ts";

const isVercel = Boolean(process.env.VERCEL);
const DATA_DIR = isVercel ? "/tmp" : resolve(process.cwd(), "data");
const DB_FILE = resolve(DATA_DIR, "bingo-db.json");
const SEED_FILE = resolve(process.cwd(), "data", "bingo-db.json");

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
  banners: HeroBanner[];
  chatMessages: Record<string, ChatMessage[]>;
  mutedUsers: string[];
  patterns: SavedPattern[];
  players: PlayerProfile[];
  settings: PlatformSettings;
  auditFeed: Array<{
    id: string;
    type: "claim" | "jackpot" | "player" | "alert";
    title: string;
    detail: string;
    time: string;
  }>;
  sessions?: Record<string, UserSession>;
  pokerTables?: PokerTable[];
  pokerHands?: PokerHandHistory[];
  pokerRakeStats?: { shopRake: number; managerRake: number; agentRake: number; operatorRake: number };
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
    key: "mega",
    name: "Mega Trueig Jackpot",
    variant: "75-Ball Progressive",
    currentAmount: 125480.6,
    startingAmount: 50000,
    maximumAmount: 250000,
    resetAmount: 50000,
    contributionPercent: 2.5,
    qualifyingPattern: "Full House in 42 balls",
    qualifyingBallLimit: 42,
    enabled: true,
    linkedRooms: ["mega-jackpot", "diamond-75"],
    price: 5,
    players: 127,
    difficulty: "Legendary",
    reward: "Life-changing",
    iconKey: "diamond",
    history: [
      { type: "Ticket contribution", amount: 42.1, time: "14:31", user: "Auto Contribution" },
      { type: "Ticket contribution", amount: 38.65, time: "14:26", user: "Auto Contribution" },
      { type: "Game contribution", amount: 100.0, time: "14:15", user: "Operator" },
      { type: "Manual adjustment", amount: 500.0, time: "12:00", user: "John Dawson" },
    ],
  },
  {
    id: "major-trueig",
    key: "major",
    name: "Major Trueig Jackpot",
    variant: "90-Ball Classic",
    currentAmount: 24375.0,
    startingAmount: 25000,
    maximumAmount: 100000,
    resetAmount: 25000,
    contributionPercent: 2.0,
    qualifyingPattern: "Coverall in 50 balls",
    qualifyingBallLimit: 50,
    enabled: true,
    linkedRooms: ["trueig-90", "midnight-90"],
    price: 2,
    players: 98,
    difficulty: "Hard",
    reward: "Huge",
    iconKey: "star",
    history: [
      { type: "Ticket contribution", amount: 18.5, time: "14:28", user: "Auto Contribution" },
      { type: "Game contribution", amount: 50.0, time: "13:50", user: "Operator" },
    ],
  },
  {
    id: "minor-trueig",
    key: "minor",
    name: "Minor Trueig Jackpot",
    variant: "75-Ball Pattern",
    currentAmount: 6250.0,
    startingAmount: 5000,
    maximumAmount: 25000,
    resetAmount: 5000,
    contributionPercent: 1.5,
    qualifyingPattern: "4 Corners in 20 balls",
    qualifyingBallLimit: 20,
    enabled: true,
    linkedRooms: ["pattern-arena", "free-party"],
    price: 1.5,
    players: 63,
    difficulty: "Medium",
    reward: "Great",
    iconKey: "diamond",
    history: [
      { type: "Ticket contribution", amount: 9.25, time: "14:20", user: "Auto Contribution" },
    ],
  },
  {
    id: "mini-trueig",
    key: "mini",
    name: "Mini Trueig Jackpot",
    variant: "30-Ball Speed",
    currentAmount: 1540.0,
    startingAmount: 1000,
    maximumAmount: 10000,
    resetAmount: 1000,
    contributionPercent: 1.0,
    qualifyingPattern: "Any Line in 15 balls",
    qualifyingBallLimit: 15,
    enabled: true,
    linkedRooms: ["turbo-30"],
    price: 0.5,
    players: 42,
    difficulty: "Easy",
    reward: "Nice",
    iconKey: "club",
    history: [
      { type: "Ticket contribution", amount: 4.1, time: "14:12", user: "Auto Contribution" },
    ],
  },
];

const defaultTournaments: Tournament[] = [
  {
    id: "weekend-cup",
    name: "Trueigtech Weekend Cup",
    description: "Five-round progressive elimination tournament with $25,000 guaranteed prize.",
    entryFee: 8.0,
    prizePool: 25000,
    playersCount: 384,
    maxPlayers: 512,
    startsAt: "22 Aug · 20:00",
    status: "Registration open",
    rounds: ["Qualifiers", "Round of 256", "Round of 128", "Semi Final", "Grand Final"],
    currentRoundIndex: 0,
    currentStageName: "Qualifiers",
    stageStatus: "waiting",
    scoringRules: {
      "Line win": "10 pts",
      "Pattern win": "25 pts",
      "Full house": "50 pts",
      "Fast Bingo bonus": "+15 pts",
      "Round winner": "+40 pts",
    },
    registeredPlayers: [],
    standings: [
      { rank: 1, player: "LuckyStar", points: 0, wins: 0, status: "In play" },
      { rank: 2, player: "BingoMaster", points: 0, wins: 0, status: "In play" },
      { rank: 3, player: "SpeedySam", points: 0, wins: 0, status: "In play" },
      { rank: 4, player: "TrueigQueen", points: 0, wins: 0, status: "In play" },
    ],
  },
  {
    id: "daily-masters",
    name: "Daily High Roller Masters",
    description: "Elite 4-round high stakes showdown with $50,000 prize pool.",
    entryFee: 25.0,
    prizePool: 50000,
    playersCount: 192,
    maxPlayers: 256,
    startsAt: "Daily · 21:00",
    status: "Registration open",
    rounds: ["Open Heat", "Quarterfinal", "Semifinal", "Grand Final"],
    currentRoundIndex: 0,
    currentStageName: "Open Heat",
    stageStatus: "waiting",
    scoringRules: {
      "Line win": "15 pts",
      "Pattern win": "35 pts",
      "Full house": "75 pts",
      "Fast Bingo bonus": "+25 pts",
      "Round winner": "+50 pts",
    },
    registeredPlayers: [],
    standings: [
      { rank: 1, player: "TrueigQueen", points: 0, wins: 0, status: "In play" },
      { rank: 2, player: "BallisticB", points: 0, wins: 0, status: "In play" },
      { rank: 3, player: "MikaK", points: 0, wins: 0, status: "In play" },
      { rank: 4, player: "LuckyStar", points: 0, wins: 0, status: "In play" },
    ],
  },
  {
    id: "speed-sprint",
    name: "Turbo 30 Speed Sprint",
    description: "Fast-paced 3-round blitz tournament with instant progression.",
    entryFee: 5.0,
    prizePool: 10000,
    playersCount: 96,
    maxPlayers: 128,
    startsAt: "Every 2 Hours",
    status: "Registration open",
    rounds: ["Sprint Qualifiers", "Semi-Sprint", "Speed Final"],
    currentRoundIndex: 0,
    currentStageName: "Sprint Qualifiers",
    stageStatus: "waiting",
    scoringRules: {
      "Single Line": "10 pts",
      "Two Lines": "25 pts",
      "Full House": "50 pts",
      "Fastest Bingo": "+20 pts",
    },
    registeredPlayers: [],
    standings: [
      { rank: 1, player: "SpeedySam", points: 0, wins: 0, status: "In play" },
      { rank: 2, player: "SkyJump", points: 0, wins: 0, status: "In play" },
      { rank: 3, player: "BingoMaster", points: 0, wins: 0, status: "In play" },
    ],
  },
];

const defaultPromotions: Promotion[] = [
  {
    id: "free-bingo",
    code: "FREE75",
    title: "Free Bingo every hour",
    shortTitle: "Free card. Real prizes.",
    description: "Claim one 75-ball card every hour and play Four Corners for the $100 community prize.",
    roomId: "free-party",
    category: "Free cards",
    badge: "FREE",
    image: "/promotions/free-bingo-reward.png",
    accent: "cyan",
    reward: "1 free card",
    rewardType: "free_cards",
    rewardValue: 1,
    ends: "Renews hourly",
    featured: true,
    status: "Active",
    claimedBy: [],
  },
  {
    id: "vip-gold-access",
    code: "VIP",
    title: "VIP Gold access",
    shortTitle: "Tonight belongs to Gold.",
    description: "Unlock the private VIP room, premium cards and tonight’s $20,000 guaranteed prize pool.",
    roomId: "vip-gold",
    category: "VIP",
    badge: "VIP",
    image: "/promotions/vip-gold-access.png",
    accent: "gold",
    reward: "$20,000 room",
    rewardType: "vip_pass",
    rewardValue: 1,
    ends: "Tonight · 9 PM",
    featured: true,
    status: "Active",
    claimedBy: [],
  },
  {
    id: "weekend-cup-reward",
    code: "CUP",
    title: "Weekend Cup ticket",
    shortTitle: "Five rounds. One champion.",
    description: "Complete five eligible games to unlock an $8 tournament entry at no extra cost.",
    roomId: "tournament",
    category: "Tournaments",
    badge: "REWARD",
    image: "/promotions/weekend-cup.png",
    accent: "violet",
    reward: "Free $8 entry",
    rewardType: "free_cards",
    rewardValue: 1,
    ends: "Ends Sunday",
    featured: true,
    status: "Active",
    claimedBy: [],
  },
  {
    id: "buy3-get1",
    code: "BUY3",
    title: "Buy 3, get 1 free",
    shortTitle: "More cards. More chances.",
    description: "Add three Diamond 75 cards to your basket and your fourth qualifying card is free.",
    roomId: "diamond-75",
    category: "Ticket deals",
    badge: "POPULAR",
    image: "/rooms/diamond-75.png",
    accent: "mint",
    reward: "4th card free",
    rewardType: "free_cards",
    rewardValue: 1,
    ends: "3 days left",
    featured: false,
    status: "Active",
    claimedBy: [],
  },
  {
    id: "happy-hour",
    code: "HAPPY",
    title: "Happy Hour Bingo",
    shortTitle: "Half-price happy hour.",
    description: "Enjoy 50% off Trueig 90 Classic tickets between 18:00 and 19:00 every weekday.",
    roomId: "trueig-90",
    category: "Ticket deals",
    badge: "50% OFF",
    image: "/rooms/trueig-90-classic.png",
    accent: "amber",
    reward: "50% off",
    rewardType: "credits",
    rewardValue: 15,
    ends: "Starts 18:00",
    featured: false,
    status: "Scheduled",
    claimedBy: [],
  },
  {
    id: "cashback-10",
    code: "CASH",
    title: "10% Bingo cashback",
    shortTitle: "Play today. Get some back.",
    description: "Receive 10% of eligible ticket spend as playable credit after your final game today.",
    roomId: "turbo-30",
    category: "Ticket deals",
    badge: "10%",
    image: "/rooms/turbo-30.png",
    accent: "coral",
    reward: "Up to $25",
    rewardType: "cashback",
    rewardValue: 10,
    ends: "Resets midnight",
    featured: false,
    status: "Active",
    claimedBy: [],
  },
  {
    id: "daily-reward",
    code: "DAILY",
    title: "Daily Login Bonus",
    shortTitle: "Daily free credit.",
    description: "Claim $5 bonus credit once every 24 hours.",
    roomId: "free-party",
    category: "Free cards",
    badge: "$5 GIFT",
    image: "/promotions/free-bingo-reward.png",
    accent: "cyan",
    reward: "$5 bonus",
    rewardType: "credits",
    rewardValue: 5,
    ends: "Daily",
    featured: false,
    status: "Active",
    claimedBy: [],
  },
];

const defaultBanners: HeroBanner[] = [
  {
    id: "tournament-banner",
    roomId: "tournament",
    kicker: "TRUEIGTECH WEEKEND CUP",
    title: "Five rounds, One champion.",
    body: "Build points across patterns and Full House wins. The top 128 advance after every stage.",
    cta: "Play now",
    alt: "View games",
    seconds: 3000,
    theme: "tournament",
    value: "$25,000",
    image: "/banners/weekend-cup-jackpot.png",
    imageAlt: "Trueigtech Bingo Weekend Cup. Five rounds, one champion, with a $25,000 jackpot prize.",
    imageWidth: 1880,
    imageHeight: 836,
    active: true,
  },
  {
    id: "fun-is-calling",
    roomId: "trueig-90",
    kicker: "BINGO FUN IS CALLING",
    title: "Fun is calling, are you in?",
    body: "Join thousands of players and win amazing rewards.",
    cta: "Play now",
    alt: "View games",
    seconds: 480,
    theme: "host",
    value: "$1,500",
    image: "/banners/fun-is-calling.png",
    imageAlt: "Trueigtech Bingo. Fun is calling, are you in? Join thousands of players and win amazing rewards.",
    imageWidth: 1672,
    imageHeight: 941,
    active: true,
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
    password: "QueenBingo#2026",
    poker_enabled: true,
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
    password: "MikaWin#2026",
    poker_enabled: true,
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
    password: "demo123",
    poker_enabled: true,
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
    password: "RiskItAll#77",
    poker_enabled: false,
  },
];

const defaultPokerTables: PokerTable[] = [
  {
    id: "tbl-tirana-1-2",
    name: "Tirana 1/2",
    gameType: "texas_holdem",
    sb: 1,
    bb: 2,
    minBuyIn: 40,
    maxBuyIn: 400,
    maxSeats: 6,
    feeType: "RAKE",
    rakePercent: 5.0,
    rakeCap: 10,
    handFeeAmount: 0,
    tableFeeAmount: 0,
    tableFeeIntervalMinutes: 30,
    isPrivate: false,
    status: "open",
    createdAt: new Date().toISOString(),
    seats: [],
    pot: 0,
    tier: "low",
  },
  {
    id: "tbl-prishtina-5-10",
    name: "Prishtina 5/10",
    gameType: "texas_holdem",
    sb: 5,
    bb: 10,
    minBuyIn: 200,
    maxBuyIn: 2000,
    maxSeats: 6,
    feeType: "RAKE",
    rakePercent: 5.0,
    rakeCap: 25,
    handFeeAmount: 0,
    tableFeeAmount: 0,
    tableFeeIntervalMinutes: 30,
    isPrivate: false,
    status: "open",
    createdAt: new Date().toISOString(),
    seats: [],
    pot: 0,
    tier: "mid",
  },
  {
    id: "tbl-durres-10-20",
    name: "Durrës 10/20",
    gameType: "texas_holdem",
    sb: 10,
    bb: 20,
    minBuyIn: 400,
    maxBuyIn: 4000,
    maxSeats: 6,
    feeType: "HAND_FEE",
    rakePercent: 0,
    rakeCap: 0,
    handFeeAmount: 2,
    tableFeeAmount: 0,
    tableFeeIntervalMinutes: 30,
    isPrivate: false,
    status: "open",
    createdAt: new Date().toISOString(),
    seats: [],
    pot: 0,
    tier: "mid",
  },
  {
    id: "tbl-vlora-25-50",
    name: "Vlora 25/50",
    gameType: "texas_holdem",
    sb: 25,
    bb: 50,
    minBuyIn: 1000,
    maxBuyIn: 10000,
    maxSeats: 6,
    feeType: "TABLE_FEE",
    rakePercent: 0,
    rakeCap: 0,
    handFeeAmount: 0,
    tableFeeAmount: 20,
    tableFeeIntervalMinutes: 30,
    isPrivate: false,
    status: "open",
    createdAt: new Date().toISOString(),
    seats: [],
    pot: 0,
    tier: "high",
  },
  {
    id: "tbl-gjakova-50-100",
    name: "Gjakova 50/100",
    gameType: "texas_holdem",
    sb: 50,
    bb: 100,
    minBuyIn: 2000,
    maxBuyIn: 20000,
    maxSeats: 9,
    feeType: "RAKE",
    rakePercent: 4.5,
    rakeCap: 50,
    handFeeAmount: 0,
    tableFeeAmount: 0,
    tableFeeIntervalMinutes: 30,
    isPrivate: false,
    status: "open",
    createdAt: new Date().toISOString(),
    seats: [],
    pot: 0,
    tier: "high",
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

export const defaultSettings: PlatformSettings = {
  initialCountdown: 5,
  timeBetweenBalls: 1.2,
  voiceCaller: "Trueigtech Nova",
  animation: "Premium ball motion",
  autoCall: true,
  manualCallEnabled: true,
  pauseOnBingoClaim: true,
  resumeAfterWinner: true,
  gameEndDelay: 4,
  autoDaubDefault: true,
  soundEffects: true,
  maintenanceMode: false,
  platformName: "Trueigtech Bingo",
  currencySymbol: "$",
  updatedAt: new Date().toISOString(),
  updatedBy: "Super Admin",
};

class Store {
  private data: DatabaseSchema;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.data = this.loadFromDisk();
  }

  private loadFromDisk(): DatabaseSchema {
    try {
      const fileToRead = existsSync(DB_FILE) ? DB_FILE : (existsSync(SEED_FILE) ? SEED_FILE : null);
      if (fileToRead) {
        const raw = readFileSync(fileToRead, "utf-8");
        const parsed = JSON.parse(raw);

        // Ensure promotions have full catalog with rich metadata
        const loadedPromotions: Promotion[] = parsed.promotions?.length ? parsed.promotions : [...defaultPromotions];
        for (const defPromo of defaultPromotions) {
          const existing = loadedPromotions.find((p) => p.code === defPromo.code || p.id === defPromo.id);
          if (existing) {
            Object.assign(existing, {
              code: existing.code || defPromo.code,
              image: existing.image || defPromo.image,
              accent: existing.accent || defPromo.accent,
              reward: existing.reward || defPromo.reward,
              ends: existing.ends || defPromo.ends,
              shortTitle: existing.shortTitle || defPromo.shortTitle,
              roomId: existing.roomId || defPromo.roomId,
              featured: existing.featured !== undefined ? existing.featured : defPromo.featured,
            });
          } else {
            loadedPromotions.push(defPromo);
          }
        }

        // Ensure jackpots have all 4 tiers with rich metadata
        const loadedJackpots: Jackpot[] = parsed.jackpots?.length ? parsed.jackpots : [...defaultJackpots];
        for (const defJp of defaultJackpots) {
          const existing = loadedJackpots.find((j) => j.id === defJp.id || j.key === defJp.key);
          if (existing) {
            Object.assign(existing, {
              key: existing.key || defJp.key,
              price: existing.price !== undefined ? existing.price : defJp.price,
              players: existing.players !== undefined ? existing.players : defJp.players,
              difficulty: existing.difficulty || defJp.difficulty,
              reward: existing.reward || defJp.reward,
              iconKey: existing.iconKey || defJp.iconKey,
            });
          } else {
            loadedJackpots.push(defJp);
          }
        }

        // Ensure tournaments have all default entries
        const loadedTournaments: Tournament[] = parsed.tournaments?.length ? parsed.tournaments : [...defaultTournaments];
        for (const defT of defaultTournaments) {
          const existing = loadedTournaments.find((t) => t.id === defT.id);
          if (!existing) {
            loadedTournaments.push(defT);
          }
        }

        // Merge with defaults to ensure all keys exist
        return {
          rooms: parsed.rooms?.length ? parsed.rooms : defaultRooms,
          wallet: typeof parsed.wallet === "number" ? parsed.wallet : 248.5,
          transactions: parsed.transactions?.length ? parsed.transactions : defaultTransactions,
          gameSessions: parsed.gameSessions || createInitialSessions(),
          tickets: parsed.tickets || [],
          claims: parsed.claims || [],
          jackpots: loadedJackpots,
          tournaments: loadedTournaments,
          promotions: loadedPromotions,
          banners: parsed.banners?.length ? parsed.banners : [...defaultBanners],
          chatMessages: parsed.chatMessages || defaultChat,
          mutedUsers: parsed.mutedUsers || ["RiskyB"],
          patterns: parsed.patterns || defaultPatterns,
          players: (parsed.players || defaultPlayers).map((p: any) => ({
            ...p,
            password: p.password || (p.username?.toLowerCase().includes("rahul") ? "RahulSecretPass@77" : "demo123"),
            poker_enabled: typeof p.poker_enabled === "boolean" ? p.poker_enabled : false,
          })),
          settings: parsed.settings ? { ...defaultSettings, ...parsed.settings } : { ...defaultSettings },
          auditFeed: parsed.auditFeed || defaultAuditFeed,
          sessions: parsed.sessions || {},
          pokerTables: parsed.pokerTables?.length ? parsed.pokerTables : [...defaultPokerTables],
          pokerHands: parsed.pokerHands || [],
          pokerRakeStats: parsed.pokerRakeStats || { shopRake: 0, managerRake: 0, agentRake: 0, operatorRake: 0 },
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
      banners: [...defaultBanners],
      chatMessages: { ...defaultChat },
      mutedUsers: ["RiskyB"],
      patterns: [...defaultPatterns],
      players: [...defaultPlayers],
      settings: { ...defaultSettings },
      auditFeed: [...defaultAuditFeed],
      sessions: {},
      pokerTables: [...defaultPokerTables],
      pokerHands: [],
      pokerRakeStats: { shopRake: 0, managerRake: 0, agentRake: 0, operatorRake: 0 },
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

  get banners() {
    return this.data.banners || defaultBanners;
  }
  set banners(v) {
    this.data.banners = v;
    this.save();
  }

  get chatMessages() {
    return this.data.chatMessages;
  }

  get mutedUsers() {
    return this.data.mutedUsers;
  }

  set mutedUsers(val: string[]) {
    this.data.mutedUsers = val;
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

  get settings(): PlatformSettings {
    return this.data.settings || defaultSettings;
  }
  set settings(v: PlatformSettings) {
    this.data.settings = v;
    this.save();
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

  // Multi-user session management
  public activeUsername: string = "Ari.R";

  get sessions(): Record<string, UserSession> {
    if (!this.data.sessions) {
      this.data.sessions = {};
    }
    return this.data.sessions;
  }

  public createSession(username: string, userId: string): UserSession {
    if (!this.data.sessions) {
      this.data.sessions = {};
    }
    const token = `tig_sess_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
    const now = new Date().toISOString();
    const session: UserSession = {
      token,
      username,
      userId,
      createdAt: now,
      lastSeen: now,
    };
    this.data.sessions[token] = session;
    this.save();
    return session;
  }

  public getSession(token?: string): UserSession | undefined {
    if (!token || !this.data.sessions) return undefined;
    return this.data.sessions[token];
  }

  public deleteSession(token?: string): void {
    if (token && this.data.sessions && this.data.sessions[token]) {
      delete this.data.sessions[token];
      this.save();
    }
  }

  public resolveUser(req: any): PlayerProfile | undefined {
    if (!req) return undefined;

    // 1. Session token from x-session-token header, Authorization Bearer, or query
    const authHeader = typeof req.headers?.authorization === "string" ? req.headers.authorization : "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.substring(7).trim() : null;
    const sessionToken = (
      req.headers?.["x-session-token"] ||
      bearerToken ||
      req.query?.sessionToken
    ) as string | undefined;

    if (sessionToken && this.data.sessions?.[sessionToken]) {
      const session = this.data.sessions[sessionToken];
      session.lastSeen = new Date().toISOString();
      const matched = this.players.find(
        (p) =>
          p.username.toLowerCase() === session.username.toLowerCase() ||
          p.id.toLowerCase() === session.userId.toLowerCase()
      );
      if (matched) return matched;
    }

    // 2. Explicit username from x-player-username header or query
    const explicitUser = (
      req.headers?.["x-player-username"] ||
      req.query?.username ||
      req.query?.player
    ) as string | undefined;

    if (explicitUser && typeof explicitUser === "string" && explicitUser.trim()) {
      const clean = explicitUser.trim().toLowerCase();
      const matched = this.players.find(
        (p) => p.username.toLowerCase() === clean || p.id.toLowerCase() === clean
      );
      if (matched) return matched;
    }

    return undefined;
  }

  // =================== POKER MODULE METHODS & INVARIANTS ===================
  get pokerTables(): PokerTable[] {
    if (!this.data.pokerTables) {
      this.data.pokerTables = [...defaultPokerTables];
    }
    return this.data.pokerTables;
  }

  set pokerTables(v: PokerTable[]) {
    this.data.pokerTables = v;
    this.save();
  }

  get pokerHands(): PokerHandHistory[] {
    if (!this.data.pokerHands) {
      this.data.pokerHands = [];
    }
    return this.data.pokerHands;
  }

  get pokerRakeStats() {
    if (!this.data.pokerRakeStats) {
      this.data.pokerRakeStats = { shopRake: 0, managerRake: 0, agentRake: 0, operatorRake: 0 };
    }
    return this.data.pokerRakeStats;
  }

  // 1. CSPRNG 6-character invite code (Alphabet: ABCDEFGHJKLMNPQRSTUVWXYZ23456789, excluding 0, O, 1, I)
  public generatePokerInviteCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    const bytes = randomBytes(6);
    for (let i = 0; i < 6; i++) {
      code += chars[bytes[i] % chars.length];
    }
    return code;
  }

  // 2. Brute-Force Rate Limiting & Lockout Protection (Section 7: 10 attempts / 10 min -> 15 min lockout)
  private failedCodeAttempts: Map<string, { count: number; firstAttemptAt: number; lockedUntil: number }> = new Map();

  public checkPokerCodeRateLimit(identifier: string): { allowed: boolean; remainingLockoutSeconds?: number } {
    const now = Date.now();
    const entry = this.failedCodeAttempts.get(identifier);
    if (!entry) return { allowed: true };

    if (entry.lockedUntil > now) {
      return {
        allowed: false,
        remainingLockoutSeconds: Math.ceil((entry.lockedUntil - now) / 1000),
      };
    }

    // Reset if window has elapsed
    if (now - entry.firstAttemptAt > 10 * 60 * 1000) {
      this.failedCodeAttempts.delete(identifier);
      return { allowed: true };
    }

    return { allowed: true };
  }

  public recordFailedPokerCodeAttempt(identifier: string): { locked: boolean; attemptsLeft: number; remainingLockoutSeconds?: number } {
    const now = Date.now();
    let entry = this.failedCodeAttempts.get(identifier);
    if (!entry || (now - entry.firstAttemptAt > 10 * 60 * 1000)) {
      entry = { count: 1, firstAttemptAt: now, lockedUntil: 0 };
    } else {
      entry.count += 1;
    }

    if (entry.count >= 10) {
      entry.lockedUntil = now + 15 * 60 * 1000; // 15 minute lockout
      this.failedCodeAttempts.set(identifier, entry);
      return { locked: true, attemptsLeft: 0, remainingLockoutSeconds: 15 * 60 };
    }

    this.failedCodeAttempts.set(identifier, entry);
    return { locked: false, attemptsLeft: 10 - entry.count };
  }

  public resetFailedPokerCodeAttempts(identifier: string) {
    this.failedCodeAttempts.delete(identifier);
  }

  // 3. Single-Wallet Reconciliation Audit (Section 3 & 4)
  // Invariant: sum(buy-ins) + sum(top-ups) = sum(cash-outs) + sum(refunds) + sum(current stacks) + sum(current pots) + sum(poker fees)
  public calculatePokerReconciliation(): PokerReconciliationReport {
    const buyIns = this.data.transactions
      .filter((t) => t.type === "POKER_BUYIN" || t.type === "Poker Buy-in")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const topUps = this.data.transactions
      .filter((t) => t.type === "POKER_TOPUP" || t.type === "Poker Top-up")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const cashOuts = this.data.transactions
      .filter((t) => t.type === "POKER_CASHOUT" || t.type === "Poker Cashout")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const refunds = this.data.transactions
      .filter((t) => t.type === "POKER_REFUND" || t.type === "Poker Refund")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const activeStacks = (this.data.pokerTables || []).reduce((sum, table) => {
      if (table.status === "closed") return sum;
      return sum + (table.seats || []).reduce((sSum, seat) => sSum + (seat.stack || 0), 0);
    }, 0);

    const currentPots = (this.data.pokerTables || []).reduce((sum, table) => {
      if (table.status === "closed") return sum;
      return sum + (table.pot || 0);
    }, 0);

    const pokerFees = this.data.transactions
      .filter((t) => t.type === "POKER_COMMISSION" || t.type === "Poker Commission")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const leftSide = Math.round((buyIns + topUps) * 100) / 100;
    const rightSide = Math.round((cashOuts + refunds + activeStacks + currentPots + pokerFees) * 100) / 100;
    const discrepancy = Math.round(Math.abs(leftSide - rightSide) * 100) / 100;
    const balanced = discrepancy < 0.01;

    const seatedPlayerCount = (this.data.pokerTables || []).reduce((sum, table) => {
      if (table.status === "closed") return sum;
      return sum + (table.seats || []).filter((s) => Boolean(s.player)).length;
    }, 0);

    return {
      balanced,
      discrepancy,
      timestamp: new Date().toISOString(),
      metrics: {
        totalBuyIns: buyIns,
        totalTopUps: topUps,
        totalCashOuts: cashOuts,
        totalRefunds: refunds,
        totalActiveStacks: activeStacks,
        totalCurrentPots: currentPots,
        totalPokerFees: pokerFees,
      },
      hierarchyBreakdown: this.data.pokerRakeStats || {
        shopRake: Math.round(pokerFees * 0.4 * 100) / 100,
        managerRake: Math.round(pokerFees * 0.2 * 100) / 100,
        agentRake: Math.round(pokerFees * 0.15 * 100) / 100,
        operatorRake: Math.round(pokerFees * 0.25 * 100) / 100,
      },
      tableCount: (this.data.pokerTables || []).filter((t) => t.status !== "closed").length,
      seatedPlayerCount,
    };
  }

  // 4. Atomic Player Buy-In
  public buyInPoker(tableId: string, player: PlayerProfile, amount: number, seatNo?: number): { success: boolean; error?: string; seat?: PokerSeat } {
    const table = this.pokerTables.find((t) => t.id === tableId && t.status !== "closed");
    if (!table) return { success: false, error: "Table not found or closed" };

    if (amount < table.minBuyIn || amount > table.maxBuyIn) {
      return { success: false, error: `Buy-in must be between ${table.minBuyIn} and ${table.maxBuyIn}` };
    }

    if (player.balance < amount) {
      return { success: false, error: `Insufficient wallet balance. Available: ${player.balance}` };
    }

    if (table.seats.some((s) => s.player?.toLowerCase() === player.username.toLowerCase())) {
      return { success: false, error: "Player already seated at this table" };
    }

    const occupiedSeats = new Set(table.seats.map((s) => s.seatNo));
    let targetSeat = seatNo;
    if (!targetSeat || occupiedSeats.has(targetSeat) || targetSeat < 1 || targetSeat > table.maxSeats) {
      for (let i = 1; i <= table.maxSeats; i++) {
        if (!occupiedSeats.has(i)) {
          targetSeat = i;
          break;
        }
      }
    }

    if (!targetSeat) {
      return { success: false, error: "Table is full" };
    }

    player.balance = Math.round((player.balance - amount) * 100) / 100;
    if (player.username.toLowerCase() === (this.activeUsername || "Ari.R").toLowerCase()) {
      this.wallet = player.balance;
    }

    const nextFeeAt = table.feeType === "TABLE_FEE"
      ? new Date(Date.now() + (table.tableFeeIntervalMinutes || 30) * 60000).toISOString()
      : undefined;

    const newSeat: PokerSeat = {
      seatNo: targetSeat,
      player: player.username,
      stack: amount,
      bet: 0,
      folded: false,
      sittingOut: false,
      joinedAt: new Date().toISOString(),
      nextFeeAt,
    };
    table.seats.push(newSeat);

    this.addTransaction({
      player: player.username,
      room: table.name,
      type: "POKER_BUYIN",
      amount: -amount,
      status: "Completed",
    });

    this.addAudit("player", "POKER_BUYIN", `${player.username} bought into ${table.name} for $${amount}`);
    this.save();
    return { success: true, seat: newSeat };
  }

  // 5. Atomic Player Cashout
  public cashOutPoker(tableId: string, player: PlayerProfile): { success: boolean; amountCashedOut: number; error?: string } {
    const table = this.pokerTables.find((t) => t.id === tableId);
    if (!table) return { success: false, amountCashedOut: 0, error: "Table not found" };

    const seatIndex = table.seats.findIndex((s) => s.player?.toLowerCase() === player.username.toLowerCase());
    if (seatIndex === -1) {
      return { success: false, amountCashedOut: 0, error: "Player not seated at this table" };
    }

    const seat = table.seats[seatIndex];
    const amount = seat.stack;
    table.seats.splice(seatIndex, 1);

    if (amount > 0) {
      player.balance = Math.round((player.balance + amount) * 100) / 100;
      if (player.username.toLowerCase() === (this.activeUsername || "Ari.R").toLowerCase()) {
        this.wallet = player.balance;
      }

      this.addTransaction({
        player: player.username,
        room: table.name,
        type: "POKER_CASHOUT",
        amount: amount,
        status: "Completed",
      });

      this.addAudit("player", "POKER_CASHOUT", `${player.username} cashed out $${amount} from ${table.name}`);
    }

    this.save();
    return { success: true, amountCashedOut: amount };
  }

  // 6. Force-close Table & Refund All Active Player Stacks
  public closePokerTable(tableId: string, closedBy: string = "Admin"): { success: boolean; refundedCount: number; totalRefunded: number; error?: string } {
    const table = this.pokerTables.find((t) => t.id === tableId);
    if (!table) return { success: false, refundedCount: 0, totalRefunded: 0, error: "Table not found" };

    table.status = "closed";
    let refundedCount = 0;
    let totalRefunded = 0;

    for (const seat of [...table.seats]) {
      if (seat.player && seat.stack > 0) {
        const p = this.players.find((item) => item.username.toLowerCase() === seat.player!.toLowerCase());
        if (p) {
          p.balance = Math.round((p.balance + seat.stack) * 100) / 100;
          if (p.username.toLowerCase() === (this.activeUsername || "Ari.R").toLowerCase()) {
            this.wallet = p.balance;
          }
          this.addTransaction({
            player: p.username,
            room: table.name,
            type: "POKER_REFUND",
            amount: seat.stack,
            status: "Completed",
          });
          refundedCount++;
          totalRefunded += seat.stack;
        }
      }
    }
    table.seats = [];
    table.pot = 0;

    this.addAudit("alert", "POKER_TABLE_CLOSED", `Table ${table.name} closed by ${closedBy}. Refunded ${refundedCount} players for total $${totalRefunded}`);
    this.save();
    return { success: true, refundedCount, totalRefunded };
  }
}


export const store = new Store();
