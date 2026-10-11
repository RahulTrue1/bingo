import { Bet888TableSummary } from "./poker-types";

export type StakeTier = "all" | "micro" | "low" | "medium" | "high" | "vip";

export interface BasepokerTableItem extends Bet888TableSummary {
  tier: "micro" | "low" | "medium" | "high" | "vip";
  avgPot?: number;
  handsPerHour?: number;
  waitlist?: number;
  currency?: string;
}

export const INITIAL_BASEPOKER_TABLES: BasepokerTableItem[] = [
  // Micro Stakes
  {
    id: "micro-001-002",
    name: "Micro NLH 0.01/0.02",
    feeType: "RAKE",
    feeLabel: "RAKE 5%",
    sb: 0.01,
    bb: 0.02,
    minBuyIn: 0.8,
    maxBuyIn: 4.0,
    maxSeats: 6,
    seatsOccupied: 4,
    status: "playing",
    isPrivate: false,
    theme: "green",
    tier: "micro",
    avgPot: 0.45,
    handsPerHour: 88,
    waitlist: 0,
    currency: "EUR",
  },
  {
    id: "shkodra-micro-1-2",
    name: "Shkodra Micro 1/2",
    feeType: "RAKE",
    feeLabel: "RAKE 5%",
    sb: 1,
    bb: 2,
    minBuyIn: 40,
    maxBuyIn: 400,
    maxSeats: 6,
    seatsOccupied: 4,
    status: "playing",
    isPrivate: false,
    theme: "green",
    tier: "micro",
    avgPot: 28,
    handsPerHour: 74,
    waitlist: 1,
    currency: "EUR",
  },
  // Low Stakes
  {
    id: "prishtina-2-5",
    name: "Prishtina 2/5",
    feeType: "RAKE",
    feeLabel: "RAKE 5%",
    sb: 2,
    bb: 5,
    minBuyIn: 100,
    maxBuyIn: 1000,
    maxSeats: 6,
    seatsOccupied: 6,
    status: "playing",
    isPrivate: false,
    theme: "green",
    tier: "low",
    avgPot: 65,
    handsPerHour: 68,
    waitlist: 2,
    currency: "EUR",
  },
  {
    id: "prizren-1-2",
    name: "Prizren 1/2 Heads-Up",
    feeType: "RAKE",
    feeLabel: "RAKE 5%",
    sb: 1,
    bb: 2,
    minBuyIn: 40,
    maxBuyIn: 200,
    maxSeats: 2,
    seatsOccupied: 2,
    status: "playing",
    isPrivate: false,
    theme: "blue",
    tier: "low",
    avgPot: 32,
    handsPerHour: 110,
    waitlist: 0,
    currency: "EUR",
  },
  // Medium Stakes
  {
    id: "prishtina-5-10",
    name: "Prishtina 5/10",
    feeType: "RAKE",
    feeLabel: "RAKE 5%",
    sb: 5,
    bb: 10,
    minBuyIn: 200,
    maxBuyIn: 2000,
    maxSeats: 6,
    seatsOccupied: 5,
    status: "playing",
    isPrivate: false,
    theme: "green",
    tier: "medium",
    avgPot: 145,
    handsPerHour: 65,
    waitlist: 1,
    currency: "EUR",
  },
  {
    id: "mitrovica-10-20",
    name: "Mitrovica 10/20",
    feeType: "HAND_FEE",
    feeLabel: "€2 / HAND",
    sb: 10,
    bb: 20,
    minBuyIn: 400,
    maxBuyIn: 4000,
    maxSeats: 9,
    seatsOccupied: 7,
    status: "playing",
    isPrivate: false,
    theme: "blue",
    tier: "medium",
    avgPot: 310,
    handsPerHour: 55,
    waitlist: 0,
    currency: "EUR",
  },
  // High Stakes
  {
    id: "peja-vip-25-50",
    name: "Peja VIP 25/50",
    feeType: "TABLE_FEE",
    feeLabel: "€20 / 30MIN",
    sb: 25,
    bb: 50,
    minBuyIn: 1000,
    maxBuyIn: 10000,
    maxSeats: 6,
    seatsOccupied: 4,
    status: "playing",
    isPrivate: false,
    theme: "red",
    tier: "high",
    avgPot: 820,
    handsPerHour: 52,
    waitlist: 0,
    currency: "EUR",
  },
  {
    id: "tirana-50-100",
    name: "Tirana High Roller",
    feeType: "RAKE",
    feeLabel: "RAKE 5% (max €100)",
    sb: 50,
    bb: 100,
    minBuyIn: 2000,
    maxBuyIn: 20000,
    maxSeats: 9,
    seatsOccupied: 6,
    status: "playing",
    isPrivate: false,
    theme: "green",
    tier: "high",
    avgPot: 1750,
    handsPerHour: 48,
    waitlist: 0,
    currency: "EUR",
  },
  // VIP Stakes
  {
    id: "vip-monaco-100-200",
    name: "Monaco Elite 100/200",
    feeType: "RAKE",
    feeLabel: "RAKE 5% (max €200)",
    sb: 100,
    bb: 200,
    minBuyIn: 5000,
    maxBuyIn: 50000,
    maxSeats: 6,
    seatsOccupied: 3,
    status: "playing",
    isPrivate: false,
    theme: "purple",
    tier: "vip",
    avgPot: 4200,
    handsPerHour: 42,
    waitlist: 0,
    currency: "EUR",
  },
  // Private Friends Table Demo
  {
    id: "private-demo-7kj8p9",
    name: "VIP Private Friends Club",
    feeType: "RAKE",
    feeLabel: "PRIVATE 5%",
    sb: 5,
    bb: 10,
    minBuyIn: 200,
    maxBuyIn: 2000,
    maxSeats: 6,
    seatsOccupied: 2,
    status: "waiting",
    isPrivate: true,
    inviteCode: "7KJ8P9",
    owner: "Player 1",
    theme: "purple",
    tier: "medium",
    avgPot: 120,
    handsPerHour: 60,
    waitlist: 0,
    currency: "EUR",
  },
];

const LOCAL_STORAGE_KEY = "basepoker_tables_registry_v1";

export function getStoredPokerTables(): BasepokerTableItem[] {
  if (typeof window === "undefined") return INITIAL_BASEPOKER_TABLES;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_BASEPOKER_TABLES));
      return INITIAL_BASEPOKER_TABLES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return INITIAL_BASEPOKER_TABLES;
  } catch (e) {
    console.warn("Failed to read poker tables from localStorage", e);
    return INITIAL_BASEPOKER_TABLES;
  }
}

export function saveStoredPokerTables(tables: BasepokerTableItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tables));
    window.dispatchEvent(new Event("basepoker_tables_updated"));
  } catch (e) {
    console.warn("Failed to persist poker tables", e);
  }
}

export function findPokerTable(idOrCode: string): BasepokerTableItem | undefined {
  const tables = getStoredPokerTables();
  const query = idOrCode.trim().toLowerCase();
  return tables.find(
    (t) =>
      t.id.toLowerCase() === query ||
      (t.inviteCode && t.inviteCode.toLowerCase() === query)
  );
}

export function createAndStorePokerTable(data: {
  name: string;
  sb: number;
  bb: number;
  maxSeats: number;
  minBuyIn?: number;
  maxBuyIn?: number;
  feeType?: "RAKE" | "HAND_FEE" | "TABLE_FEE";
  feeLabel?: string;
  isPrivate?: boolean;
  inviteCode?: string;
  owner?: string;
}): BasepokerTableItem {
  const tables = getStoredPokerTables();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = data.inviteCode;
  if (!code && data.isPrivate) {
    code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }

  let tier: "micro" | "low" | "medium" | "high" | "vip" = "medium";
  if (data.bb <= 0.1) tier = "micro";
  else if (data.bb <= 2) tier = "low";
  else if (data.bb <= 20) tier = "medium";
  else if (data.bb <= 100) tier = "high";
  else tier = "vip";

  const newTable: BasepokerTableItem = {
    id: `tbl-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    name: data.name,
    feeType: data.feeType || "RAKE",
    feeLabel: data.feeLabel || (data.feeType === "HAND_FEE" ? "€2 / HAND" : data.feeType === "TABLE_FEE" ? "€20 / 30MIN" : "RAKE 5%"),
    sb: data.sb,
    bb: data.bb,
    minBuyIn: data.minBuyIn || data.bb * 20,
    maxBuyIn: data.maxBuyIn || data.bb * 200,
    maxSeats: data.maxSeats,
    seatsOccupied: 1,
    status: "waiting",
    isPrivate: !!data.isPrivate,
    inviteCode: code,
    owner: data.owner || "Player 1",
    theme: data.isPrivate ? "purple" : data.feeType === "HAND_FEE" ? "blue" : data.feeType === "TABLE_FEE" ? "red" : "green",
    tier,
    avgPot: data.bb * 8,
    handsPerHour: 60,
    waitlist: 0,
    currency: "EUR",
  };

  const updated = [newTable, ...tables];
  saveStoredPokerTables(updated);
  return newTable;
}

export function togglePokerTableStatus(id: string): BasepokerTableItem[] {
  const tables = getStoredPokerTables();
  const updated = tables.map((t) => {
    if (t.id === id) {
      const nextStatus = t.status === "playing" ? "paused" : "playing";
      return { ...t, status: nextStatus as "playing" | "waiting" | "paused" };
    }
    return t;
  });
  saveStoredPokerTables(updated);
  return updated;
}

export function deletePokerTable(id: string): BasepokerTableItem[] {
  const tables = getStoredPokerTables();
  const updated = tables.filter((t) => t.id !== id);
  saveStoredPokerTables(updated);
  return updated;
}

export function resetPokerTables(): BasepokerTableItem[] {
  saveStoredPokerTables(INITIAL_BASEPOKER_TABLES);
  return INITIAL_BASEPOKER_TABLES;
}

/* ========================================================================= */
/* ================== REAL-TIME LIVE TABLE COMMAND BUS ===================== */
/* ========================================================================= */

export interface LivePokerCommand {
  tableId: string;
  action: "pause" | "resume" | "next_street" | "reset_hand" | "set_pot";
  pot?: number;
  timestamp?: number;
}

export function sendLivePokerCommand(command: LivePokerCommand) {
  if (typeof window === "undefined") return;
  const payload = { ...command, timestamp: Date.now() };
  try {
    localStorage.setItem("basepoker_live_command", JSON.stringify(payload));
  } catch (_) {}
  window.dispatchEvent(new CustomEvent("basepoker_live_command", { detail: payload }));
}

export function subscribeLivePokerCommand(callback: (cmd: LivePokerCommand) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handleCustom = (e: Event) => {
    const custom = e as CustomEvent<LivePokerCommand>;
    if (custom.detail) callback(custom.detail);
  };
  const handleStorage = (e: StorageEvent) => {
    if (e.key === "basepoker_live_command" && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        callback(parsed);
      } catch (_) {}
    }
  };
  window.addEventListener("basepoker_live_command", handleCustom);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener("basepoker_live_command", handleCustom);
    window.removeEventListener("storage", handleStorage);
  };
}

/* ========================================================================= */
/* =================== COMMISSION MODELS & RULES STORE ===================== */
/* ========================================================================= */

export interface PokerCommissionSettings {
  rakePercent: number; // default 5.0
  rakeCapEur: number; // default 15.0
  handFeeEur: number; // default 2.0
  tableFeeEur: number; // default 20.0
  tableFeeIntervalMin: number; // default 30
  noFlopNoDrop: boolean;
}

export const DEFAULT_COMMISSION_SETTINGS: PokerCommissionSettings = {
  rakePercent: 5.0,
  rakeCapEur: 15.0,
  handFeeEur: 2.0,
  tableFeeEur: 20.0,
  tableFeeIntervalMin: 30,
  noFlopNoDrop: true,
};

const COMMISSION_STORAGE_KEY = "basepoker_commission_rules_v1";

export function getStoredCommissionSettings(): PokerCommissionSettings {
  if (typeof window === "undefined") return DEFAULT_COMMISSION_SETTINGS;
  try {
    const raw = localStorage.getItem(COMMISSION_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(COMMISSION_STORAGE_KEY, JSON.stringify(DEFAULT_COMMISSION_SETTINGS));
      return DEFAULT_COMMISSION_SETTINGS;
    }
    return { ...DEFAULT_COMMISSION_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_COMMISSION_SETTINGS;
  }
}

export function saveStoredCommissionSettings(settings: PokerCommissionSettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COMMISSION_STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new Event("basepoker_commission_updated"));
  } catch (e) {
    console.warn("Failed to persist commission rules", e);
  }
}

/* ========================================================================= */
/* ================= PLAYER 360 & POKER PERMISSIONS STORE ================== */
/* ========================================================================= */

export interface BackofficePokerPlayer {
  id: string;
  name: string;
  username: string;
  avatar: string;
  balanceEur: number;
  pokerAccess: boolean; // Dynamic "Poker Online" permission toggle
  vipTier: "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";
  handsPlayed: number;
  rakeGeneratedEur: number;
  lastActive: string;
  country: string;
  status: "active" | "flagged" | "banned";
}

export const INITIAL_POKER_PLAYERS: BackofficePokerPlayer[] = [
  {
    id: "usr-001",
    name: "Player 1 (Hero)",
    username: "hero_pro",
    avatar: "👑",
    balanceEur: 2500.0,
    pokerAccess: true,
    vipTier: "Platinum",
    handsPlayed: 1420,
    rakeGeneratedEur: 385.5,
    lastActive: "Just now",
    country: "XK",
    status: "active",
  },
  {
    id: "usr-002",
    name: "Arben Shark",
    username: "arben_shark",
    avatar: "🦈",
    balanceEur: 8420.5,
    pokerAccess: true,
    vipTier: "Diamond",
    handsPlayed: 5820,
    rakeGeneratedEur: 1640.0,
    lastActive: "3 min ago",
    country: "XK",
    status: "active",
  },
  {
    id: "usr-003",
    name: "Dardan HighRoller",
    username: "dardan_hr",
    avatar: "⚡",
    balanceEur: 14500.0,
    pokerAccess: true,
    vipTier: "Diamond",
    handsPlayed: 8120,
    rakeGeneratedEur: 2890.0,
    lastActive: "10 min ago",
    country: "AL",
    status: "active",
  },
  {
    id: "usr-004",
    name: "Vesa Aces",
    username: "vesa_poker",
    avatar: "♠️",
    balanceEur: 1250.0,
    pokerAccess: true,
    vipTier: "Gold",
    handsPlayed: 940,
    rakeGeneratedEur: 210.0,
    lastActive: "25 min ago",
    country: "XK",
    status: "active",
  },
  {
    id: "usr-005",
    name: "Blendi CheckRaise",
    username: "blendi_cr",
    avatar: "🎯",
    balanceEur: 620.0,
    pokerAccess: false,
    vipTier: "Silver",
    handsPlayed: 320,
    rakeGeneratedEur: 75.0,
    lastActive: "2 hours ago",
    country: "XK",
    status: "flagged",
  },
  {
    id: "usr-006",
    name: "Krenar Fish",
    username: "krenar_tilt",
    avatar: "🐟",
    balanceEur: 310.0,
    pokerAccess: true,
    vipTier: "Bronze",
    handsPlayed: 190,
    rakeGeneratedEur: 42.0,
    lastActive: "Yesterday",
    country: "AL",
    status: "active",
  },
];

const PLAYERS_STORAGE_KEY = "basepoker_players_registry_v1";

export function getStoredPokerPlayers(): BackofficePokerPlayer[] {
  if (typeof window === "undefined") return INITIAL_POKER_PLAYERS;
  try {
    const raw = localStorage.getItem(PLAYERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PLAYERS_STORAGE_KEY, JSON.stringify(INITIAL_POKER_PLAYERS));
      return INITIAL_POKER_PLAYERS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return INITIAL_POKER_PLAYERS;
  } catch (e) {
    return INITIAL_POKER_PLAYERS;
  }
}

export function saveStoredPokerPlayers(players: BackofficePokerPlayer[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PLAYERS_STORAGE_KEY, JSON.stringify(players));
    window.dispatchEvent(new Event("basepoker_players_updated"));
  } catch (e) {
    console.warn("Failed to persist poker players", e);
  }
}

export function togglePlayerPokerAccess(playerId: string): BackofficePokerPlayer[] {
  const players = getStoredPokerPlayers();
  const updated = players.map((p) => {
    if (p.id === playerId) {
      return { ...p, pokerAccess: !p.pokerAccess };
    }
    return p;
  });
  saveStoredPokerPlayers(updated);
  return updated;
}
