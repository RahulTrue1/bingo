"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BasepokerTableItem,
  StakeTier,
  getStoredPokerTables,
  createAndStorePokerTable,
  subscribeLivePokerCommand,
  broadcastPlayerJoin,
} from "../poker/poker-tables-store";
import { PlayerHeader } from "../components/player/PlayerHeader";
import { AuthModal } from "../components/player/AuthModal";
import { apiClient, type PlayerModel } from "../api-client";
import "../poker/poker.css";

export const PLO_TABLES: BasepokerTableItem[] = [
  {
    id: "plo-micro-001",
    name: "PLO-4 Micro Action",
    feeType: "RAKE",
    feeLabel: "RAKE 5%",
    sb: 0.05,
    bb: 0.10,
    minBuyIn: 4,
    maxBuyIn: 20,
    maxSeats: 6,
    seatsOccupied: 4,
    seats: [
      { seatNo: 0, player: "OmahaKing", stack: 18.5 },
      { seatNo: 1, player: "FeltShark", stack: 24.0 },
      { seatNo: 3, player: "CardCrafter", stack: 12.0 },
      { seatNo: 4, player: "BluffHero", stack: 9.5 },
    ],
    status: "playing",
    isPrivate: false,
    theme: "green",
    tier: "micro",
    avgPot: 3.2,
    handsPerHour: 72,
    waitlist: 0,
    currency: "EUR",
  },
  {
    id: "plo-low-1-2",
    name: "PLO 4-Card Rush 1/2",
    feeType: "RAKE",
    feeLabel: "RAKE 5%",
    sb: 1,
    bb: 2,
    minBuyIn: 50,
    maxBuyIn: 300,
    maxSeats: 6,
    seatsOccupied: 5,
    seats: [
      { seatNo: 0, player: "Viktor_B", stack: 280 },
      { seatNo: 1, player: "OmahaPro", stack: 310 },
      { seatNo: 2, player: "AceHunter", stack: 150 },
      { seatNo: 4, player: "RiverRat", stack: 220 },
      { seatNo: 5, player: "PotLimit99", stack: 195 },
    ],
    status: "playing",
    isPrivate: false,
    theme: "blue",
    tier: "low",
    avgPot: 42,
    handsPerHour: 68,
    waitlist: 1,
    currency: "EUR",
  },
  {
    id: "plo-med-5-10",
    name: "Omaha High Roller 5/10",
    feeType: "HAND_FEE",
    feeLabel: "€2 / HAND",
    sb: 5,
    bb: 10,
    minBuyIn: 400,
    maxBuyIn: 2500,
    maxSeats: 6,
    seatsOccupied: 3,
    seats: [
      { seatNo: 0, player: "MonacoVip", stack: 3200 },
      { seatNo: 2, player: "ApexGrinder", stack: 1900 },
      { seatNo: 5, player: "HighRoller88", stack: 2400 },
    ],
    status: "playing",
    isPrivate: false,
    theme: "red",
    tier: "medium",
    avgPot: 380,
    handsPerHour: 55,
    waitlist: 0,
    currency: "EUR",
  },
  {
    id: "plo-vip-25-50",
    name: "VIP Deepstack PLO 25/50",
    feeType: "TABLE_FEE",
    feeLabel: "€50 / 30MIN",
    sb: 25,
    bb: 50,
    minBuyIn: 2500,
    maxBuyIn: 15000,
    maxSeats: 6,
    seatsOccupied: 4,
    seats: [
      { seatNo: 1, player: "WhaleBoss", stack: 18400 },
      { seatNo: 2, player: "IveyStyle", stack: 14200 },
      { seatNo: 4, player: "CryptoKing", stack: 11000 },
      { seatNo: 5, player: "ShadowBet", stack: 9800 },
    ],
    status: "playing",
    isPrivate: false,
    theme: "purple",
    tier: "vip",
    avgPot: 2950,
    handsPerHour: 48,
    waitlist: 2,
    currency: "EUR",
  },
];

export const SPIN_TABLES: BasepokerTableItem[] = [
  {
    id: "spin-1-hyper",
    name: "Spin & Cash €1 (Up to €12,000)",
    feeType: "RAKE",
    feeLabel: "7% RAKE (JACKPOT POOL)",
    sb: 0.5,
    bb: 1.0,
    minBuyIn: 1,
    maxBuyIn: 1,
    maxSeats: 3,
    seatsOccupied: 2,
    seats: [
      { seatNo: 0, player: "HyperSpeed", stack: 500 },
      { seatNo: 1, player: "FastCash", stack: 500 },
    ],
    status: "playing",
    isPrivate: false,
    theme: "blue",
    tier: "low",
    avgPot: 3,
    handsPerHour: 180,
    waitlist: 0,
    currency: "EUR",
  },
  {
    id: "spin-5-turbo",
    name: "Spin & Cash €5 (Up to €60,000)",
    feeType: "RAKE",
    feeLabel: "7% RAKE (JACKPOT POOL)",
    sb: 2.5,
    bb: 5.0,
    minBuyIn: 5,
    maxBuyIn: 5,
    maxSeats: 3,
    seatsOccupied: 1,
    seats: [
      { seatNo: 0, player: "JackpotHunter", stack: 500 },
    ],
    status: "playing",
    isPrivate: false,
    theme: "green",
    tier: "medium",
    avgPot: 15,
    handsPerHour: 190,
    waitlist: 0,
    currency: "EUR",
  },
  {
    id: "spin-25-ultra",
    name: "Spin & Cash €25 (Up to €300,000)",
    feeType: "RAKE",
    feeLabel: "6% RAKE (JACKPOT POOL)",
    sb: 12.5,
    bb: 25.0,
    minBuyIn: 25,
    maxBuyIn: 25,
    maxSeats: 3,
    seatsOccupied: 2,
    seats: [
      { seatNo: 0, player: "ProSpinner", stack: 500 },
      { seatNo: 2, player: "VoltGamer", stack: 500 },
    ],
    status: "playing",
    isPrivate: false,
    theme: "purple",
    tier: "high",
    avgPot: 75,
    handsPerHour: 200,
    waitlist: 0,
    currency: "EUR",
  },
  {
    id: "spin-100-diamond",
    name: "Spin & Cash €100 (Up to €1,200,000)",
    feeType: "RAKE",
    feeLabel: "5% RAKE (JACKPOT POOL)",
    sb: 50,
    bb: 100,
    minBuyIn: 100,
    maxBuyIn: 100,
    maxSeats: 3,
    seatsOccupied: 2,
    seats: [
      { seatNo: 0, player: "DiamondKing", stack: 500 },
      { seatNo: 1, player: "HighVolt88", stack: 500 },
    ],
    status: "playing",
    isPrivate: false,
    theme: "red",
    tier: "vip",
    avgPot: 300,
    handsPerHour: 220,
    waitlist: 1,
    currency: "EUR",
  },
];

export const AOF_TABLES: BasepokerTableItem[] = [
  {
    id: "aof-micro-010",
    name: "AoF Micro Blitz 0.05/0.10",
    feeType: "RAKE",
    feeLabel: "RAKE 4%",
    sb: 0.05,
    bb: 0.10,
    minBuyIn: 0.8,
    maxBuyIn: 0.8,
    maxSeats: 4,
    seatsOccupied: 3,
    seats: [
      { seatNo: 0, player: "ShoveMaster", stack: 0.8 },
      { seatNo: 1, player: "AllInHero", stack: 0.8 },
      { seatNo: 3, player: "QuickFold", stack: 0.8 },
    ],
    status: "playing",
    isPrivate: false,
    theme: "green",
    tier: "micro",
    avgPot: 1.6,
    handsPerHour: 160,
    waitlist: 0,
    currency: "EUR",
  },
  {
    id: "aof-low-1-2",
    name: "AoF Action Shove 1/2",
    feeType: "RAKE",
    feeLabel: "RAKE 4%",
    sb: 1,
    bb: 2,
    minBuyIn: 16,
    maxBuyIn: 16,
    maxSeats: 4,
    seatsOccupied: 4,
    seats: [
      { seatNo: 0, player: "FireStorm", stack: 16 },
      { seatNo: 1, player: "CoinFlipPro", stack: 16 },
      { seatNo: 2, player: "GambleGuy", stack: 16 },
      { seatNo: 3, player: "PushOrFold", stack: 16 },
    ],
    status: "playing",
    isPrivate: false,
    theme: "red",
    tier: "low",
    avgPot: 32,
    handsPerHour: 175,
    waitlist: 2,
    currency: "EUR",
  },
  {
    id: "aof-med-5-10",
    name: "AoF High Stakes 5/10",
    feeType: "HAND_FEE",
    feeLabel: "€1 / HAND",
    sb: 5,
    bb: 10,
    minBuyIn: 80,
    maxBuyIn: 80,
    maxSeats: 4,
    seatsOccupied: 2,
    seats: [
      { seatNo: 0, player: "MegaPush", stack: 80 },
      { seatNo: 2, player: "TitanStack", stack: 80 },
    ],
    status: "playing",
    isPrivate: false,
    theme: "blue",
    tier: "medium",
    avgPot: 160,
    handsPerHour: 180,
    waitlist: 0,
    currency: "EUR",
  },
  {
    id: "aof-vip-25-50",
    name: "AoF VIP Shove Arena 25/50",
    feeType: "TABLE_FEE",
    feeLabel: "€30 / 30MIN",
    sb: 25,
    bb: 50,
    minBuyIn: 400,
    maxBuyIn: 400,
    maxSeats: 4,
    seatsOccupied: 3,
    seats: [
      { seatNo: 0, player: "VipShove", stack: 400 },
      { seatNo: 1, player: "RiskTaker", stack: 400 },
      { seatNo: 3, player: "NutsOnly", stack: 400 },
    ],
    status: "playing",
    isPrivate: false,
    theme: "purple",
    tier: "vip",
    avgPot: 800,
    handsPerHour: 190,
    waitlist: 1,
    currency: "EUR",
  },
];

export const TOURNAMENT_TABLES: BasepokerTableItem[] = [
  {
    id: "mtt-sunday-million",
    name: "Sunday Championship €1,000,000 GTD",
    feeType: "RAKE",
    feeLabel: "BUY-IN €100 (€92+€8)",
    sb: 100,
    bb: 200,
    minBuyIn: 100,
    maxBuyIn: 100,
    maxSeats: 8,
    seatsOccupied: 7,
    seats: [
      { seatNo: 0, player: "Champion_1", stack: 25000 },
      { seatNo: 1, player: "FinalTableGuy", stack: 32000 },
      { seatNo: 2, player: "PokerGhost", stack: 18000 },
      { seatNo: 3, player: "ChipLeader99", stack: 54000 },
      { seatNo: 4, player: "DeepStackAce", stack: 21000 },
      { seatNo: 6, player: "TitanPoker", stack: 29000 },
      { seatNo: 7, player: "BountyMaster", stack: 16000 },
    ],
    status: "playing",
    isPrivate: false,
    theme: "purple",
    tier: "high",
    avgPot: 1400,
    handsPerHour: 62,
    waitlist: 0,
    currency: "EUR",
  },
  {
    id: "mtt-daily-turbo",
    name: "Daily €25,000 Turbo Masters",
    feeType: "RAKE",
    feeLabel: "BUY-IN €20 (€18+€2)",
    sb: 50,
    bb: 100,
    minBuyIn: 20,
    maxBuyIn: 20,
    maxSeats: 8,
    seatsOccupied: 6,
    seats: [
      { seatNo: 0, player: "TurboRider", stack: 12000 },
      { seatNo: 1, player: "QuickChips", stack: 9500 },
      { seatNo: 2, player: "CardShark", stack: 15400 },
      { seatNo: 4, player: "SpeedKing", stack: 8200 },
      { seatNo: 5, player: "AceHigh", stack: 11000 },
      { seatNo: 7, player: "AllInTurbo", stack: 13500 },
    ],
    status: "playing",
    isPrivate: false,
    theme: "green",
    tier: "medium",
    avgPot: 800,
    handsPerHour: 85,
    waitlist: 0,
    currency: "EUR",
  },
  {
    id: "mtt-micro-kickoff",
    name: "Micro Kickoff €5,000 GTD",
    feeType: "RAKE",
    feeLabel: "BUY-IN €2 (€1.80+€0.20)",
    sb: 10,
    bb: 20,
    minBuyIn: 2,
    maxBuyIn: 2,
    maxSeats: 8,
    seatsOccupied: 8,
    seats: [
      { seatNo: 0, player: "MicroFan", stack: 5000 },
      { seatNo: 1, player: "BeginnerAce", stack: 4200 },
      { seatNo: 2, player: "GrindStar", stack: 6800 },
      { seatNo: 3, player: "PokerLover", stack: 5500 },
      { seatNo: 4, player: "CheckRaise", stack: 3900 },
      { seatNo: 5, player: "RiverCard", stack: 7100 },
      { seatNo: 6, player: "BankrollHero", stack: 4600 },
      { seatNo: 7, player: "LuckySeven", stack: 5200 },
    ],
    status: "playing",
    isPrivate: false,
    theme: "blue",
    tier: "micro",
    avgPot: 180,
    handsPerHour: 75,
    waitlist: 4,
    currency: "EUR",
  },
  {
    id: "mtt-high-roller-apex",
    name: "High Roller Apex €250,000 GTD",
    feeType: "RAKE",
    feeLabel: "BUY-IN €500 (€470+€30)",
    sb: 500,
    bb: 1000,
    minBuyIn: 500,
    maxBuyIn: 500,
    maxSeats: 6,
    seatsOccupied: 5,
    seats: [
      { seatNo: 0, player: "ApexTitan", stack: 105000 },
      { seatNo: 1, player: "VipLegend", stack: 82000 },
      { seatNo: 2, player: "MonacoStar", stack: 120000 },
      { seatNo: 3, player: "HighStack", stack: 64000 },
      { seatNo: 5, player: "WhalePro", stack: 98000 },
    ],
    status: "playing",
    isPrivate: false,
    theme: "red",
    tier: "vip",
    avgPot: 8500,
    handsPerHour: 55,
    waitlist: 1,
    currency: "EUR",
  },
];

export default function BasepokerCashgameLobby() {
  const router = useRouter();

  // Tables State
  const [tables, setTables] = useState<BasepokerTableItem[]>([]);
  const [mounted, setMounted] = useState(false);

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<"holdem" | "plo" | "spin" | "aof" | "tournaments">("holdem");

  // View Mode: Group vs Table
  const [viewMode, setViewMode] = useState<"group" | "table">("group");

  // Filter States
  const [tierFilter, setTierFilter] = useState<StakeTier>("all");
  const [seatsFilter, setSeatsFilter] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTableId, setSelectedTableId] = useState<string>("");

  // Join by Invite Code
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [joinError, setJoinError] = useState("");

  // Create Table Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    sb: 5,
    bb: 10,
    seats: 6,
    feeType: "RAKE" as "RAKE" | "HAND_FEE" | "TABLE_FEE",
    isPrivate: false,
  });

  // Wallet & Player Authentication State (matching Bingo)
  const [wallet, setWallet] = useState(10000);
  const [currentUser, setCurrentUser] = useState<PlayerModel | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [blockedAlert, setBlockedAlert] = useState<string | null>(null);

  // Private Table Passcode Modal State
  const [privateTableToUnlock, setPrivateTableToUnlock] = useState<BasepokerTableItem | null>(null);
  const [privateCodeInput, setPrivateCodeInput] = useState("");
  const [privateCodeError, setPrivateCodeError] = useState("");

  // Created Invite Code Modal State
  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const isCurrentUserBlocked = useMemo(() => {
    if (!currentUser) return false;
    return (
      currentUser.status === "Restricted" ||
      currentUser.status === "Suspended"
    );
  }, [currentUser]);

  const refreshWallet = useCallback((targetUsername?: string) => {
    const user = targetUsername || currentUser?.username || apiClient.auth.getStoredUsername();
    apiClient.wallet.get(user || undefined).then((w) => {
      if (w && typeof w.balance === "number") setWallet(w.balance);
    }).catch(() => {});
  }, [currentUser?.username]);

  const refreshUser = useCallback((targetUsername?: string) => {
    const user = targetUsername || currentUser?.username || apiClient.auth.getStoredUsername();
    apiClient.auth.me(user || undefined).then((res) => {
      if (res?.user) {
        setCurrentUser(res.user);
        if (typeof res.wallet === "number") setWallet(res.wallet);
      }
    }).catch(() => {});
  }, [currentUser?.username]);

  const handleAuthSuccess = (user: PlayerModel, newWallet: number) => {
    apiClient.auth.setStoredUsername(user.username);
    setCurrentUser(user);
    setWallet(newWallet);
    setAuthModalOpen(false);
  };

  const handleLogout = () => {
    apiClient.auth.logout();
    setCurrentUser(null);
    refreshWallet();
  };

  // Synchronize server poker tables with local store
  const loadServerTables = useCallback(async () => {
    try {
      const res = await apiClient.poker.getTables();
      const stored = getStoredPokerTables();
      if (res?.success && Array.isArray(res.tables)) {
        const mappedServer: BasepokerTableItem[] = res.tables.map((t: any) => {
          const tier: StakeTier =
            t.bb <= 0.1 ? "micro" : t.bb <= 2 ? "low" : t.bb <= 20 ? "medium" : t.bb <= 100 ? "high" : "vip";
          const feeLabel =
            t.feeType === "HAND_FEE"
              ? `€${t.handFeeAmount || 2} / HAND`
              : t.feeType === "TABLE_FEE"
              ? `€${t.tableFeeAmount || 20} / ${t.tableFeeIntervalMinutes || 30}MIN`
              : t.rakeCap
              ? `RAKE ${t.rakePercent || 5}% (max €${t.rakeCap})`
              : `RAKE ${t.rakePercent || 5}%`;
          const theme: "green" | "blue" | "red" | "purple" =
            t.isPrivate
              ? "purple"
              : t.feeType === "HAND_FEE"
              ? "blue"
              : t.feeType === "TABLE_FEE"
              ? "red"
              : "green";

          return {
            id: t.id,
            name: t.name,
            feeType: t.feeType,
            feeLabel,
            sb: t.sb,
            bb: t.bb,
            minBuyIn: t.minBuyIn,
            maxBuyIn: t.maxBuyIn,
            maxSeats: t.maxSeats,
            seatsOccupied: (t.seats || []).filter((s: any) => Boolean(s.player)).length,
            status: t.status === "paused" ? "paused" : t.status === "closed" ? "waiting" : "playing",
            isPrivate: t.isPrivate,
            inviteCode: t.inviteCode || "", // stripped by server for private tables
            theme,
            tier,
            avgPot: t.pot || t.bb * 8,
            handsPerHour: 60,
            waitlist: 0,
            currency: "EUR",
            seats: t.seats || [],
          };
        });

        // Merge: prioritize server tables, then append any unique stored local tables
        const serverIds = new Set(mappedServer.map((s) => s.id));
        const serverNames = new Set(mappedServer.map((s) => s.name.toLowerCase()));
        const uniqueStored = stored.filter((st) => !serverIds.has(st.id) && !serverNames.has(st.name.toLowerCase()));
        const combined = [...mappedServer, ...uniqueStored];

        setTables(combined);
        if (combined.length > 0 && !combined.some((t) => t.id === selectedTableId)) {
          setSelectedTableId(combined[0].id);
        }
      } else {
        setTables(stored);
      }
    } catch (_) {
      setTables(getStoredPokerTables());
    }
  }, [selectedTableId]);

  // Load tables, user, and wallet on mount, and subscribe to updates
  useEffect(() => {
    loadServerTables();
    setMounted(false);
    const t = setTimeout(() => setMounted(true), 10);

    refreshWallet();
    refreshUser();

    const handleWalletUpdate = (e: Event) => {
      const custom = e as CustomEvent<{ balance: number }>;
      if (typeof custom.detail?.balance === "number") {
        setWallet(custom.detail.balance);
      }
    };
    window.addEventListener("wallet_balance_updated", handleWalletUpdate);

    const handleStorage = () => loadServerTables();
    window.addEventListener("basepoker_tables_updated", handleStorage);
    window.addEventListener("storage", handleStorage);

    const unsubCmd = subscribeLivePokerCommand((cmd) => {
      if (cmd.action === "pause" || cmd.action === "resume") {
        setTables((prev) =>
          prev.map((t) => {
            const match =
              !cmd.tableId ||
              cmd.tableId === "all" ||
              cmd.tableId.toLowerCase() === t.id.toLowerCase() ||
              (t.name && cmd.tableId.toLowerCase() === t.name.toLowerCase());
            if (match) {
              return { ...t, status: cmd.action === "pause" ? "paused" : "playing" };
            }
            return t;
          })
        );
      }
    });

    const unsub = apiClient.sync.subscribe((event) => {
      if (event.entity === "wallet" || event.entity === "players") {
        refreshWallet();
        refreshUser();
      }
      if (event.entity === "rooms" || event.action?.includes("poker")) {
        loadServerTables();
      }
    });

    return () => {
      clearTimeout(t);
      window.removeEventListener("wallet_balance_updated", handleWalletUpdate);
      window.removeEventListener("basepoker_tables_updated", handleStorage);
      window.removeEventListener("storage", handleStorage);
      unsubCmd();
      unsub();
    };
  }, [refreshWallet, refreshUser, loadServerTables]);

  // Synchronize URL search params with activeTab
  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const tabParam = p.get("tab") as any;
      if (tabParam && ["holdem", "plo", "spin", "aof", "tournaments"].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  const handleTabChange = (tab: "holdem" | "plo" | "spin" | "aof" | "tournaments") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
    }
  };

  // Dynamic tables based on selected game mode tab
  const currentModeTables = useMemo(() => {
    switch (activeTab) {
      case "plo":
        return PLO_TABLES;
      case "spin":
        return SPIN_TABLES;
      case "aof":
        return AOF_TABLES;
      case "tournaments":
        return TOURNAMENT_TABLES;
      case "holdem":
      default:
        return tables;
    }
  }, [activeTab, tables]);

  // Filtered Tables
  const filteredTables = useMemo(() => {
    return currentModeTables.filter((t) => {
      // Stake Tier
      if (tierFilter !== "all" && t.tier !== tierFilter) return false;
      // Seats
      if (seatsFilter !== "all" && t.maxSeats !== seatsFilter) return false;
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = t.name.toLowerCase().includes(q);
        const matchesBlinds = `${t.sb}/${t.bb}`.includes(q);
        const matchesCode = t.inviteCode && t.inviteCode.toLowerCase().includes(q);
        if (!matchesName && !matchesBlinds && !matchesCode) return false;
      }
      return true;
    });
  }, [currentModeTables, tierFilter, seatsFilter, searchQuery]);

  // Selected Table for Table Preview
  const selectedTable = useMemo(() => {
    return (
      currentModeTables.find((t) => t.id === selectedTableId) ||
      filteredTables[0] ||
      currentModeTables[0] ||
      tables[0]
    );
  }, [currentModeTables, selectedTableId, filteredTables, tables]);

  // Open Table in `/holdem/tables?tableId=...&code=...`
  const handleOpenTable = async (tableId: string) => {
    if (isCurrentUserBlocked) {
      setBlockedAlert(
        "Account Restricted: Your account status is restricted. Please contact customer support."
      );
      return;
    }

    // Auto-enable poker access if disabled so gameplay is instant
    if (currentUser && currentUser.poker_enabled === false) {
      try {
        await apiClient.poker.enableAccess(currentUser.username);
        refreshUser();
      } catch (_) {}
    }

    const target = currentModeTables.find((t) => t.id === tableId) || tables.find((t) => t.id === tableId);
    if (!target) return;

    if (target.status === "paused") {
      alert(`Table "${target.name}" is temporarily paused by poker operator supervision. Real-money play will resume shortly.`);
      return;
    }

    // Broadcast player join to admin console & trigger buy-in on server
    const currentUsername = currentUser?.username || apiClient.auth.getStoredUsername() || "Ari.R";
    broadcastPlayerJoin(target.id, currentUsername, 1, target.minBuyIn);
    apiClient.poker.buyIn(target.id, target.minBuyIn).catch(() => {});

    // If private table, prompt for invite code
    if (target.isPrivate) {
      setPrivateTableToUnlock(target);
      setPrivateCodeInput("");
      setPrivateCodeError("");
      return;
    }

    const code = target.inviteCode || target.id || tableId;
    router.push(`/holdem/tables?tableId=${encodeURIComponent(target.id)}&code=${encodeURIComponent(code)}`);
  };

  // Submit Private Table Passcode with Server Rate-Limiting & Validation
  const handleUnlockPrivateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!privateTableToUnlock) return;
    const cleanInput = privateCodeInput.trim().toUpperCase();

    if (!cleanInput) {
      setPrivateCodeError("Please enter the invite code.");
      return;
    }

    if (currentUser && currentUser.poker_enabled === false) {
      try {
        await apiClient.poker.enableAccess(currentUser.username);
        refreshUser();
      } catch (_) {}
    }

    try {
      const res = await apiClient.poker.joinPrivateTable(cleanInput);
      if (res?.success && res.table) {
        setPrivateTableToUnlock(null);
        setPrivateCodeInput("");
        setPrivateCodeError("");
        router.push(`/holdem/tables?tableId=${encodeURIComponent(res.table.id)}&code=${encodeURIComponent(cleanInput)}`);
      } else {
        setPrivateCodeError(res?.error || "Incorrect invite code. Please enter a valid 6-character code.");
      }
    } catch (err: any) {
      setPrivateCodeError(err.message || "Error validating invite code.");
    }
  };

  // Join by Invite Code (Server brute-force lockout & CSPRNG validation)
  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCurrentUserBlocked) {
      setBlockedAlert(
        "Account Restricted: Your account is restricted. Please contact customer support."
      );
      return;
    }
    const clean = inviteCodeInput.trim().toUpperCase();
    if (!clean) return;

    if (currentUser && currentUser.poker_enabled === false) {
      try {
        await apiClient.poker.enableAccess(currentUser.username);
        refreshUser();
      } catch (_) {}
    }

    try {
      const res = await apiClient.poker.joinPrivateTable(clean);
      if (res?.success && res.table) {
        setJoinError("");
        router.push(`/holdem/tables?tableId=${encodeURIComponent(res.table.id)}&code=${encodeURIComponent(clean)}`);
      } else {
        // Fallback: search local tables
        const localTarget =
          currentModeTables.find(
            (t) => t.inviteCode?.toUpperCase() === clean || t.id.toLowerCase() === clean.toLowerCase()
          ) ||
          tables.find(
            (t) => t.inviteCode?.toUpperCase() === clean || t.id.toLowerCase() === clean.toLowerCase()
          );
        if (localTarget) {
          router.push(`/holdem/tables?tableId=${encodeURIComponent(localTarget.id)}&code=${encodeURIComponent(clean)}`);
        } else {
          setJoinError(res?.error || `Table with code "${clean}" not found.`);
        }
      }
    } catch (err: any) {
      setJoinError(err.message || `Table with code "${clean}" not found.`);
    }
  };

  // Create Table Handler (Section 6 & 7 CSPRNG 6-char Code)
  const handleCreateTableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) return;

    if (isCurrentUserBlocked) {
      setBlockedAlert("Account Restricted: Your account is restricted. Please contact customer support.");
      return;
    }

    if (currentUser && currentUser.poker_enabled === false) {
      try {
        await apiClient.poker.enableAccess(currentUser.username);
        refreshUser();
      } catch (_) {}
    }

    try {
      // 1. Create on server
      const res = await apiClient.poker.createPrivateTable({
        name: createForm.name.trim(),
        sb: Number(createForm.sb),
        bb: Number(createForm.bb),
        seats: Number(createForm.seats),
        feeType: createForm.feeType,
      });

      if (res?.success && res.table && res.inviteCode) {
        // 2. Also register in local store
        const newLocalTable = createAndStorePokerTable({
          name: res.table.name,
          sb: res.table.sb,
          bb: res.table.bb,
          maxSeats: res.table.maxSeats,
          feeType: res.table.feeType,
          isPrivate: true,
          inviteCode: res.inviteCode,
        });

        setShowCreateModal(false);
        setCreatedInviteCode(res.inviteCode);
        setSelectedTableId(newLocalTable.id);
        loadServerTables();
      } else {
        alert(res?.error || "Failed to create table. Please check input parameters.");
      }
    } catch (err: any) {
      alert(err.message || "Failed to create table. Please check input parameters.");
    }
  };

  return (
    <div className="player-shell basepoker-root">
      {/* ================= BINGO UNIFIED PLAYER HEADER ================= */}
      <PlayerHeader
        wallet={wallet}
        currentUser={currentUser}
        currentApp="poker"
        onOpenAuth={() => setAuthModalOpen(true)}
        openAuthModal={() => setAuthModalOpen(true)}
        handleLogout={handleLogout}
        activePokerTab={activeTab}
        onPokerTabChange={handleTabChange}
      />

      {/* ================= CONTROL & FILTER BAR ================= */}
      <section className="bp-controls-section">
        <div className="bp-controls-container">
          {/* Left: View Mode Toggle & Stake Filters */}
          <div className="bp-controls-left">
            {/* View Mode Toggle: Group vs Table */}
            <div className="bp-view-switcher" role="radiogroup" aria-label="View layout">
              <button
                className={`bp-view-btn ${viewMode === "group" ? "active" : ""}`}
                onClick={() => setViewMode("group")}
                title="Switch to Grouped Card View"
              >
                <span className="bp-btn-icon">▦</span>
                <span>Group</span>
              </button>
              <button
                className={`bp-view-btn ${viewMode === "table" ? "active" : ""}`}
                onClick={() => setViewMode("table")}
                title="Switch to Table List View"
              >
                <span className="bp-btn-icon">☰</span>
                <span>Table</span>
              </button>
            </div>

            {/* Stake Tier Filter Tabs */}
            <div className="bp-stake-tabs">
              {(["all", "micro", "low", "medium", "high", "vip"] as StakeTier[]).map((tier) => (
                <button
                  key={tier}
                  className={`bp-stake-tab ${tierFilter === tier ? "active" : ""}`}
                  onClick={() => setTierFilter(tier)}
                >
                  {tier.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Seats Filter */}
            <select
              className="bp-seats-select"
              value={seatsFilter}
              onChange={(e) => setSeatsFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
            >
              <option value="all">All Seats</option>
              <option value={2}>2-Max (Heads-Up)</option>
              <option value={6}>6-Max</option>
              <option value={9}>9-Max (Full Ring)</option>
            </select>
          </div>

          {/* Right: Search, Invite Code, and Create Table */}
          <div className="bp-controls-right">
            {/* Search Input */}
            <div className="bp-search-box">
              <span className="bp-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search table or blinds..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="bp-search-clear" onClick={() => setSearchQuery("")}>
                  ×
                </button>
              )}
            </div>

            {/* Quick Join by Code */}
            <form className="bp-join-code-form" onSubmit={handleJoinByCode}>
              <input
                type="text"
                placeholder="Invite Code (e.g. 7KJ8P9)"
                maxLength={8}
                value={inviteCodeInput}
                onChange={(e) => {
                  setInviteCodeInput(e.target.value.toUpperCase());
                  setJoinError("");
                }}
              />
              <button type="submit" className="bp-join-btn">
                Join
              </button>
            </form>

            {/* Create Table / Friends Table Button */}
            <button
              type="button"
              className="bp-create-table-btn"
              onClick={() => {
                if (isCurrentUserBlocked) {
                  setBlockedAlert("Account Restricted: Your account status is restricted. Please contact customer support.");
                  return;
                }
                setShowCreateModal(true);
              }}
              title="Create a private table with invite code"
            >
              + Create Table
            </button>
          </div>
        </div>

        {joinError && (
          <div className="bp-error-bar">
            <span>⚠️ {joinError}</span>
          </div>
        )}
      </section>

      {/* ================= MAIN CONTENT: GROUP VIEW OR TABLE VIEW ================= */}
      <main className="bp-main-container">
        {viewMode === "group" ? (
          /* ================= GROUP VIEW (Cards Grid) ================= */
          <div className="bp-group-grid">
            {filteredTables.map((tbl) => {
              return (
                <div
                  key={tbl.id}
                  className={`bp-card theme-${tbl.theme} ${tbl.isPrivate ? "is-private" : ""}`}
                  onClick={() => handleOpenTable(tbl.id)}
                >
                  {/* Top Ambient Accent Bar */}
                  <div className={`bp-card-top-glow glow-bar-${tbl.theme}`} />

                  {/* Card Header */}
                  <div className="bp-card-header">
                    <div className="bp-card-title-group">
                      <div className="bp-card-title-row">
                        <h3 className="bp-card-title">{tbl.name}</h3>
                        {tbl.isPrivate && (
                          <span className="bp-private-lock-badge" title="Private Table with Passcode">
                            🔒
                          </span>
                        )}
                      </div>
                      <div className="bp-card-pill-tags">
                        <span className={`bp-tier-pill tier-${tbl.tier}`}>
                          {tbl.tier.toUpperCase()}
                        </span>
                        <span className="bp-format-tag">
                          {tbl.maxSeats}-MAX NLH
                        </span>
                      </div>
                    </div>
                    <div className="bp-card-header-right">
                      {tbl.status === "paused" && (
                        <span className="bp-paused-pill">
                          ⏸ PAUSED
                        </span>
                      )}
                      <span className={`bp-card-badge badge-${tbl.theme}`}>
                        {tbl.feeLabel}
                      </span>
                    </div>
                  </div>

                  {/* Private Table Lock Indicator */}
                  {tbl.isPrivate && (
                    <div className="bp-card-private-code is-locked">
                      <span>🔒 <b>PRIVATE TABLE</b> · CODE REQUIRED</span>
                    </div>
                  )}

                  {/* Mini 3D Stadium Table Visual */}
                  <div className="bp-card-table-stage">
                    {tbl.status === "paused" && (
                      <div className="bp-paused-stage-overlay">
                        <span>⏸ TABLE PAUSED BY OPERATOR</span>
                      </div>
                    )}
                    <div className={`bp-stadium-wrap stadium-${tbl.theme}`}>
                      <div className="bp-stadium-rail">
                        <div className="bp-stadium-felt">
                          <div className="bp-felt-watermark">BET888</div>

                          {/* Center Blinds Medallion */}
                          <div className="bp-felt-center">
                            <div className="bp-felt-blinds-pill">
                              <span className="bp-felt-coin">🪙</span>
                              <span className="bp-felt-blinds-text">€{tbl.sb} / €{tbl.bb}</span>
                            </div>
                            <span className="bp-felt-sub-text">
                              {activeTab === "holdem" && "NO-LIMIT HOLD'EM"}
                              {activeTab === "plo" && "POT-LIMIT OMAHA"}
                              {activeTab === "spin" && "SPIN & CASH 3-MAX"}
                              {activeTab === "aof" && "ALL-IN OR FOLD"}
                              {activeTab === "tournaments" && "CHAMPIONSHIP MTT"}
                            </span>
                          </div>

                          {/* Dynamic Stadium Seat Cushions with Avatars */}
                          {Array.from({ length: tbl.maxSeats }).map((_, sIdx) => {
                            const occupied = sIdx < tbl.seatsOccupied;
                            const angle = (sIdx / tbl.maxSeats) * 2 * Math.PI - Math.PI / 2;
                            const x = 50 + 44 * Math.cos(angle);
                            const y = 50 + 40 * Math.sin(angle);
                            return (
                              <div
                                key={sIdx}
                                className={`bp-seat-cushion ${occupied ? "is-occupied" : "is-empty"}`}
                                style={{ left: `${x}%`, top: `${y}%` }}
                                title={occupied ? `Seat ${sIdx + 1}: Player Seated` : `Seat ${sIdx + 1}: Empty Seat`}
                              >
                                {occupied ? (
                                  <span className="bp-seat-avatar">👤</span>
                                ) : (
                                  <span className="bp-seat-plus">+</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Metadata (Cockpit HUD) */}
                  <div className="bp-card-meta">
                    <div className="bp-meta-item">
                      <span className="bp-meta-lbl">STAKES (SB/BB)</span>
                      <span className="bp-meta-val font-gold">€{tbl.sb} / €{tbl.bb}</span>
                    </div>
                    <div className="bp-meta-divider" />
                    <div className="bp-meta-item">
                      <span className="bp-meta-lbl">BUY-IN RANGE</span>
                      <span className="bp-meta-val">€{tbl.minBuyIn} - €{tbl.maxBuyIn}</span>
                    </div>
                  </div>

                  {/* Players Row & Action CTA */}
                  <div className="bp-card-footer">
                    <div className="bp-card-players">
                      <span className={`bp-status-radar ${tbl.status === "paused" ? "paused" : tbl.status === "playing" ? "playing" : "waiting"}`}>
                        <span className="bp-radar-ping" />
                        <span className="bp-radar-dot" />
                      </span>
                      <span className="bp-players-count-text">
                        <b>{tbl.seatsOccupied}/{tbl.maxSeats}</b> Players
                        <span className="bp-players-status-sub">
                          {tbl.status === "paused" ? " • PAUSED" : tbl.status === "playing" ? " (In Hand)" : " (Waiting)"}
                        </span>
                      </span>
                    </div>
                    <button
                      type="button"
                      className={`bp-play-cta ${tbl.status === "paused" ? "is-paused" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenTable(tbl.id);
                      }}
                    >
                      {tbl.status === "paused" ? "PAUSED" : "PLAY NOW →"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ================= TABLE VIEW (List + Table Preview) ================= */
          <div className="bp-table-view-split">
            {/* Left: Table List */}
            <div className="bp-table-list-panel">
              <div className="bp-table-grid-header">
                <span>TABLE NAME</span>
                <span>STAKES</span>
                <span>BUY-IN</span>
                <span>PLAYERS</span>
                <span>COMMISSION</span>
                <span>ACTION</span>
              </div>

              <div className="bp-table-grid-body">
                {filteredTables.map((tbl) => {
                  const isSelected = selectedTable?.id === tbl.id;
                  return (
                    <div
                      key={tbl.id}
                      className={`bp-table-row ${isSelected ? "selected" : ""}`}
                      onClick={() => setSelectedTableId(tbl.id)}
                    >
                      <div className="bp-col-name">
                        <strong className="bp-tbl-title">{tbl.name}</strong>
                        {tbl.status === "paused" && (
                          <span style={{
                            background: "rgba(245, 158, 11, 0.2)",
                            border: "1px solid #f59e0b",
                            color: "#fbbf24",
                            padding: "1px 6px",
                            borderRadius: 4,
                            fontSize: 9,
                            fontWeight: 800,
                            marginLeft: 6,
                          }}>
                            ⏸ PAUSED
                          </span>
                        )}
                        {tbl.isPrivate ? (
                          <span className="bp-badge-private">🔒 PRIVATE</span>
                        ) : (
                          <span className="bp-badge-public">PUBLIC</span>
                        )}
                      </div>

                      <div className="bp-col-stakes">
                        €{tbl.sb} / €{tbl.bb}
                      </div>

                      <div className="bp-col-buyin">
                        €{tbl.minBuyIn} - €{tbl.maxBuyIn}
                      </div>

                      <div className="bp-col-players">
                        <span className="bp-players-count">
                          {tbl.seatsOccupied} / {tbl.maxSeats}
                        </span>
                        <div className="bp-progress-bar">
                          <div
                            className="bp-progress-fill"
                            style={{
                              width: `${Math.min(100, (tbl.seatsOccupied / tbl.maxSeats) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="bp-col-fee">
                        <span className={`bp-fee-tag tag-${tbl.theme}`}>
                          {tbl.feeLabel}
                        </span>
                      </div>

                      <div className="bp-col-action">
                        <button
                          type="button"
                          className={`bp-btn-open-row ${tbl.status === "paused" ? "is-paused" : ""}`}
                          style={tbl.status === "paused" ? {
                            background: "rgba(245, 158, 11, 0.2)",
                            border: "1px solid #f59e0b",
                            color: "#fbbf24",
                          } : undefined}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenTable(tbl.id);
                          }}
                        >
                          {tbl.status === "paused" ? "PAUSED" : "Open Table"}
                        </button>
                      </div>
                    </div>
                  );
                })}

                {filteredTables.length === 0 && (
                  <div className="bp-no-tables">
                    <p>No tables matching the selected filters.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Table Preview Pane */}
            {selectedTable && (
              <aside className="bp-preview-panel">
                <div className="bp-preview-header">
                  <div>
                    <h3 className="bp-preview-title">{selectedTable.name}</h3>
                    <span className="bp-preview-sub">
                      Blinds €{selectedTable.sb} / €{selectedTable.bb} • {selectedTable.maxSeats}-Max
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {selectedTable.status === "paused" && (
                      <span style={{
                        background: "rgba(245, 158, 11, 0.2)",
                        border: "1px solid #f59e0b",
                        color: "#fbbf24",
                        padding: "2px 7px",
                        borderRadius: 4,
                        fontSize: 9,
                        fontWeight: 800,
                      }}>
                        ⏸ PAUSED
                      </span>
                    )}
                    <span className={`bp-card-badge badge-${selectedTable.theme}`}>
                      {selectedTable.feeLabel}
                    </span>
                  </div>
                </div>

                {selectedTable.status === "paused" && (
                  <div style={{
                    background: "rgba(245, 158, 11, 0.15)",
                    border: "1px solid #f59e0b",
                    color: "#fbbf24",
                    padding: "8px 12px",
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}>
                    ⏸ <span>This table is currently PAUSED by poker supervisor. Real-money actions on hold.</span>
                  </div>
                )}

                {/* Table Felt Graphic with Seats Preview */}
                <div className="bp-preview-felt-wrap">
                  <div className={`bp-preview-stadium stadium-${selectedTable.theme}`}>
                    <div className="bp-stadium-rail">
                      <div className="bp-stadium-felt">
                        <div className="bp-preview-dealer">
                          {activeTab === "holdem" && "♠ BET888 HOLD'EM LIVE"}
                          {activeTab === "plo" && "🃘 BET888 OMAHA LIVE"}
                          {activeTab === "spin" && "⚡ BET888 SPIN & CASH"}
                          {activeTab === "aof" && "🔥 BET888 ALL-IN OR FOLD"}
                          {activeTab === "tournaments" && "🏆 BET888 CHAMPIONSHIP MTT"}
                        </div>
                        <div className="bp-preview-center">
                          <div className="bp-preview-chips">🪙 €{selectedTable.bb * 8} POT</div>
                          <div className="bp-preview-board">
                            <span className="c">🂠</span>
                            <span className="c">🂠</span>
                            <span className="c">🂠</span>
                            <span className="c">🂠</span>
                            <span className="c">🂠</span>
                          </div>
                        </div>

                        {/* Preview Seat Dots with Avatars */}
                        {Array.from({ length: selectedTable.maxSeats }).map((_, sIdx) => {
                          const occupied = sIdx < selectedTable.seatsOccupied;
                          const angle = (sIdx / selectedTable.maxSeats) * 2 * Math.PI - Math.PI / 2;
                          const x = 50 + 44 * Math.cos(angle);
                          const y = 50 + 40 * Math.sin(angle);
                          return (
                            <div
                              key={sIdx}
                              className={`bp-preview-seat ${occupied ? "occupied" : "empty"}`}
                              style={{ left: `${x}%`, top: `${y}%` }}
                              title={occupied ? `Seat ${sIdx + 1}: Player Seated` : `Seat ${sIdx + 1}: Empty`}
                            >
                              {occupied ? `P${sIdx + 1}` : "+"}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Table Details List */}
                <div className="bp-preview-details">
                  <div className="bp-detail-row">
                    <span className="lbl">Game Variant:</span>
                    <span className="val">No-Limit Texas Hold&apos;em</span>
                  </div>
                  <div className="bp-detail-row">
                    <span className="lbl">Stakes (SB/BB):</span>
                    <span className="val">€{selectedTable.sb} / €{selectedTable.bb}</span>
                  </div>
                  <div className="bp-detail-row">
                    <span className="lbl">Buy-in Range:</span>
                    <span className="val">€{selectedTable.minBuyIn} - €{selectedTable.maxBuyIn}</span>
                  </div>
                  <div className="bp-detail-row">
                    <span className="lbl">Company Commission:</span>
                    <span className="val font-gold">{selectedTable.feeLabel}</span>
                  </div>
                  <div className="bp-detail-row">
                    <span className="lbl">Seats Capacity:</span>
                    <span className="val">{selectedTable.maxSeats} Players Max</span>
                  </div>
                  <div className="bp-detail-row">
                    <span className="lbl">Current Seated:</span>
                    <span className="val">{selectedTable.seatsOccupied} Players</span>
                  </div>
                  {selectedTable.isPrivate && (
                    <div className="bp-detail-row highlight-code">
                      <span className="lbl">Access:</span>
                      <span className="val code" style={{ color: "#c084fc" }}>🔒 Private (Code Required)</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="bp-preview-actions">
                  <button
                    className="bp-btn-preview-open"
                    onClick={() => handleOpenTable(selectedTable.id)}
                  >
                    Open Table
                  </button>
                  <button
                    className="bp-btn-preview-spectate"
                    onClick={() => handleOpenTable(selectedTable.id)}
                  >
                    Spectate
                  </button>
                </div>
              </aside>
            )}
          </div>
        )}
      </main>

      {/* ================= BLOCKED ACCOUNT ALERT MODAL ================= */}
      {blockedAlert && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: 20,
          }}
          onClick={() => setBlockedAlert(null)}
        >
          <div
            style={{
              background: "#181432",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              borderRadius: 16,
              maxWidth: 440,
              width: "100%",
              padding: 24,
              boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 44, marginBottom: 12 }}>🚫</div>
            <h3 style={{ color: "#fff", margin: "0 0 8px", fontSize: 18, fontWeight: 800 }}>
              Account Access Notice
            </h3>
            <p style={{ color: "#a5a2bb", fontSize: 13, lineHeight: 1.5, margin: "0 0 20px" }}>
              {blockedAlert}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              {currentUser && currentUser.poker_enabled === false && (
                <button
                  type="button"
                  onClick={async () => {
                    await apiClient.poker.enableAccess(currentUser.username);
                    refreshUser();
                    setBlockedAlert(null);
                  }}
                  style={{
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 20px",
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Activate &amp; Play Now
                </button>
              )}
              <button
                type="button"
                onClick={() => setBlockedAlert(null)}
                style={{
                  background: "rgba(255,255,255,0.12)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 20px",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= AUTH MODAL (LOGIN / SIGNUP) ================= */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentUser={currentUser}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* ================= PRIVATE TABLE PASSCODE PROMPT MODAL ================= */}
      {privateTableToUnlock && (
        <div
          className="bp-modal-overlay"
          onClick={() => {
            setPrivateTableToUnlock(null);
            setPrivateCodeInput("");
            setPrivateCodeError("");
          }}
        >
          <div className="bp-unlock-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bp-unlock-header">
              <div className="bp-unlock-icon">🔒</div>
              <div className="bp-unlock-title-box">
                <h3 className="bp-unlock-title">Private Table Access</h3>
                <span className="bp-unlock-sub">
                  {privateTableToUnlock.name} • €{privateTableToUnlock.sb}/€{privateTableToUnlock.bb} NLH
                </span>
              </div>
              <button
                type="button"
                className="bp-unlock-close"
                onClick={() => {
                  setPrivateTableToUnlock(null);
                  setPrivateCodeInput("");
                  setPrivateCodeError("");
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUnlockPrivateTable} className="bp-unlock-form">
              <p className="bp-unlock-desc">
                This table is private. Please enter the invite code provided by the table host to join.
              </p>

              <div className="bp-unlock-input-wrap">
                <label htmlFor="private-table-code-input" className="bp-unlock-label">
                  Table Invite Code
                </label>
                <input
                  id="private-table-code-input"
                  type="text"
                  className="bp-unlock-input"
                  placeholder="e.g. 7KJ8P9"
                  maxLength={12}
                  autoFocus
                  value={privateCodeInput}
                  onChange={(e) => {
                    setPrivateCodeInput(e.target.value.toUpperCase());
                    if (privateCodeError) setPrivateCodeError("");
                  }}
                />
              </div>

              {privateCodeError && (
                <div className="bp-unlock-error">
                  <span>⚠️ {privateCodeError}</span>
                </div>
              )}

              <div className="bp-unlock-actions">
                <button
                  type="button"
                  className="bp-unlock-cancel-btn"
                  onClick={() => {
                    setPrivateTableToUnlock(null);
                    setPrivateCodeInput("");
                    setPrivateCodeError("");
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="bp-unlock-submit-btn">
                  Unlock & Join
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= CREATE PRIVATE TABLE MODAL ================= */}
      {showCreateModal && (
        <div className="bp-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="bp-unlock-modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="bp-unlock-header">
              <div className="bp-unlock-icon" style={{ background: "rgba(120, 104, 255, 0.2)", borderColor: "#7868ff" }}>
                ♠
              </div>
              <div className="bp-unlock-title-box">
                <h3 className="bp-unlock-title">Create Private Table</h3>
                <span className="bp-unlock-sub">Create a Hold&apos;em table with a secure 6-character CSPRNG invite code</span>
              </div>
              <button
                type="button"
                className="bp-unlock-close"
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateTableSubmit} className="bp-unlock-form">
              <div className="bp-unlock-input-wrap">
                <label className="bp-unlock-label">Table Name</label>
                <input
                  type="text"
                  required
                  className="bp-unlock-input"
                  style={{ fontSize: 14, fontWeight: 600, color: "#fff", textAlign: "left", letterSpacing: "normal" }}
                  placeholder="e.g. Friends VIP Hold'em"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="bp-unlock-input-wrap">
                  <label className="bp-unlock-label">Stakes (Blinds)</label>
                  <select
                    className="bp-unlock-input"
                    style={{ fontSize: 13, fontWeight: 700, color: "#f6bd49", textAlign: "left", letterSpacing: "normal" }}
                    value={`${createForm.sb}/${createForm.bb}`}
                    onChange={(e) => {
                      const [sb, bb] = e.target.value.split("/").map(Number);
                      setCreateForm({ ...createForm, sb, bb });
                    }}
                  >
                    <option value="0.01/0.02">€0.01 / €0.02 (Micro)</option>
                    <option value="0.05/0.1">€0.05 / €0.10 (Micro)</option>
                    <option value="0.25/0.5">€0.25 / €0.50 (Low)</option>
                    <option value="1/2">€1.00 / €2.00 (Low)</option>
                    <option value="2/5">€2.00 / €5.00 (Medium)</option>
                    <option value="5/10">€5.00 / €10.00 (Medium)</option>
                    <option value="10/20">€10.00 / €20.00 (High)</option>
                    <option value="25/50">€25.00 / €50.00 (High)</option>
                    <option value="50/100">€50.00 / €100.00 (VIP)</option>
                  </select>
                </div>

                <div className="bp-unlock-input-wrap">
                  <label className="bp-unlock-label">Max Seats</label>
                  <select
                    className="bp-unlock-input"
                    style={{ fontSize: 13, fontWeight: 700, color: "#fff", textAlign: "left", letterSpacing: "normal" }}
                    value={createForm.seats}
                    onChange={(e) => setCreateForm({ ...createForm, seats: Number(e.target.value) })}
                  >
                    <option value="2">2 Players (Heads Up)</option>
                    <option value="6">6 Players (6-Max)</option>
                    <option value="9">9 Players (Full Ring)</option>
                  </select>
                </div>
              </div>

              <div className="bp-unlock-input-wrap">
                <label className="bp-unlock-label">Commission Model</label>
                <select
                  className="bp-unlock-input"
                  style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa", textAlign: "left", letterSpacing: "normal" }}
                  value={createForm.feeType}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      feeType: e.target.value as "RAKE" | "HAND_FEE" | "TABLE_FEE",
                    })
                  }
                >
                  <option value="RAKE">Standard Rake (5% capped at €5, No Flop No Drop)</option>
                  <option value="HAND_FEE">Hand Fee (€2 fixed from pot of each hand)</option>
                  <option value="TABLE_FEE">Table Fee (€20 / seat every 30 minutes)</option>
                </select>
                <small style={{ color: "#94a3b8", fontSize: 11, marginTop: 4 }}>
                  {createForm.feeType === "RAKE" && "• 5% rake is deducted from the pot (only if the flop is seen)."}
                  {createForm.feeType === "HAND_FEE" && "• Fixed €2 hand fee deducted at the start of each hand."}
                  {createForm.feeType === "TABLE_FEE" && "• Table fee of €20 charged every 30 minutes per seated player."}
                </small>
              </div>

              <div className="bp-unlock-actions">
                <button
                  type="button"
                  className="bp-unlock-cancel-btn"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bp-unlock-submit-btn"
                  style={{ background: "linear-gradient(135deg, #7868ff, #9333ea)" }}
                >
                  Create &amp; Generate Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= CREATED INVITE CODE SUCCESS MODAL ================= */}
      {createdInviteCode && (
        <div className="bp-modal-overlay" onClick={() => setCreatedInviteCode(null)}>
          <div className="bp-unlock-modal" style={{ maxWidth: 460, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "28px 24px 20px" }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>🎉</div>
              <h3 style={{ color: "#fff", fontSize: 20, fontWeight: 900, margin: "0 0 6px" }}>
                Private Table Created!
              </h3>
              <p style={{ color: "#a5a2bb", fontSize: 13, margin: "0 0 20px", lineHeight: 1.5 }}>
                Your private table is ready. Share this invite code with your friends to join:
              </p>

              <div
                style={{
                  background: "#090616",
                  border: "2px solid #a855f7",
                  borderRadius: 14,
                  padding: "16px 20px",
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: "0 0 30px rgba(168, 85, 247, 0.25)",
                }}
              >
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 10, color: "#c084fc", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>
                    INVITE CODE (CSPRNG)
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "#f6bd49", letterSpacing: 4, fontFamily: "monospace" }}>
                    {createdInviteCode}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(createdInviteCode);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }
                  }}
                  style={{
                    background: copiedCode ? "#10b981" : "rgba(168, 85, 247, 0.25)",
                    border: "1px solid " + (copiedCode ? "#10b981" : "#a855f7"),
                    color: "#fff",
                    borderRadius: 8,
                    padding: "8px 14px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {copiedCode ? "✓ Copied!" : "Copy"}
                </button>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button
                  type="button"
                  className="bp-unlock-cancel-btn"
                  onClick={() => setCreatedInviteCode(null)}
                  style={{ flex: 1 }}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="bp-unlock-submit-btn"
                  style={{ flex: 1, background: "linear-gradient(135deg, #7868ff, #9333ea)" }}
                  onClick={() => {
                    const code = createdInviteCode;
                    setCreatedInviteCode(null);
                    router.push(`/holdem/tables?tableId=${encodeURIComponent(selectedTableId)}&code=${encodeURIComponent(code)}`);
                  }}
                >
                  Join Table Now →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= INLINE STYLES ================= */}
      <style jsx>{`
        .basepoker-root {
          min-height: 100vh;
          background: #0c0920;
          color: #ffffff;
          font-family: 'Plus Jakarta Sans', 'Manrope', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          display: flex;
          flex-direction: column;
        }

        /* Controls & Filter Bar */
        .bp-controls-section {
          background: rgba(12, 9, 28, 0.95);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 16px 24px;
          position: sticky;
          top: 118px;
          z-index: 20;
        }

        .bp-controls-container {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .bp-controls-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        /* View switcher (Group / Table) */
        .bp-view-switcher {
          display: flex;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 3px;
          gap: 3px;
        }

        .bp-view-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: none;
          color: #94a3b8;
          padding: 7px 13px;
          border-radius: 9px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .bp-view-btn:hover:not(.active) {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.06);
        }

        .bp-view-btn.active {
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4);
        }

        .bp-stake-tabs {
          display: flex;
          gap: 4px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 3px;
          border-radius: 12px;
          flex-wrap: wrap;
        }

        .bp-stake-tab {
          background: transparent;
          border: none;
          color: #94a3b8;
          padding: 7px 12px;
          border-radius: 9px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.5px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .bp-stake-tab:hover:not(.active) {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.06);
        }

        .bp-stake-tab.active {
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.35);
        }

        .bp-seats-select {
          background: #151030;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #ffffff;
          font-size: 12px;
          font-weight: 700;
          padding: 8px 14px;
          border-radius: 10px;
          cursor: pointer;
          outline: none;
          transition: all 0.2s ease;
        }

        .bp-seats-select:focus {
          border-color: #8b5cf6;
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.25);
        }

        .bp-controls-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .bp-search-box {
          position: relative;
          display: flex;
          align-items: center;
        }

        .bp-search-icon {
          position: absolute;
          left: 10px;
          font-size: 12px;
          color: #94a3b8;
        }

        .bp-search-box input {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          padding: 8px 28px 8px 30px;
          color: #ffffff;
          font-size: 12px;
          width: 175px;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .bp-search-box input:focus {
          border-color: #8b5cf6;
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.25);
        }

        .bp-search-clear {
          position: absolute;
          right: 8px;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          font-size: 14px;
        }

        .bp-join-code-form {
          display: flex;
          gap: 0;
        }

        .bp-join-code-form input {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px 0 0 10px;
          padding: 8px 12px;
          color: #ffffff;
          font-size: 12px;
          width: 130px;
          text-transform: uppercase;
          outline: none;
          transition: border-color 0.2s;
        }

        .bp-join-code-form input:focus {
          border-color: #8b5cf6;
        }

        .bp-join-btn {
          background: #7c3aed;
          border: none;
          color: #ffffff;
          padding: 0 14px;
          border-radius: 0 10px 10px 0;
          font-weight: 800;
          font-size: 12px;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .bp-join-btn:hover {
          background: #6d28d9;
        }

        .bp-create-table-btn {
          background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #ffffff;
          font-weight: 800;
          font-size: 12px;
          letter-spacing: 0.3px;
          padding: 9px 18px;
          border-radius: 10px;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(139, 92, 246, 0.35);
          transition: transform 0.15s, box-shadow 0.15s;
        }

        .bp-create-table-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(139, 92, 246, 0.5);
        }

        .bp-error-bar {
          max-width: 1400px;
          margin: 8px auto 0;
          background: rgba(255, 114, 94, 0.15);
          border: 1px solid #ff725e;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          color: #ff9d8f;
        }

        /* Main Container */
        .bp-main-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px;
          flex: 1;
          width: 100%;
        }

        /* Group View (Grid) */
        .bp-group-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
          gap: 22px;
        }

        .bp-card {
          background: linear-gradient(165deg, rgba(22, 17, 44, 0.92) 0%, rgba(12, 9, 28, 0.96) 100%);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 20px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 14px;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45);
          transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s ease, border-color 0.22s ease;
          position: relative;
          overflow: hidden;
          backdrop-filter: blur(12px);
        }

        .bp-card:hover {
          transform: translateY(-5px);
          border-color: rgba(255, 255, 255, 0.2);
          box-shadow: 0 22px 48px rgba(0, 0, 0, 0.6);
        }

        .bp-card-top-glow {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          border-radius: 20px 20px 0 0;
        }

        .glow-bar-green {
          background: linear-gradient(90deg, transparent 0%, #10b981 50%, transparent 100%);
        }

        .glow-bar-blue {
          background: linear-gradient(90deg, transparent 0%, #3b82f6 50%, transparent 100%);
        }

        .glow-bar-red {
          background: linear-gradient(90deg, transparent 0%, #f43f5e 50%, transparent 100%);
        }

        .glow-bar-purple {
          background: linear-gradient(90deg, transparent 0%, #a855f7 50%, transparent 100%);
        }

        .bp-card.theme-green:hover {
          box-shadow: 0 20px 45px rgba(16, 185, 129, 0.15), 0 0 20px rgba(16, 185, 129, 0.1);
          border-color: rgba(16, 185, 129, 0.35);
        }

        .bp-card.theme-blue:hover {
          box-shadow: 0 20px 45px rgba(59, 130, 246, 0.15), 0 0 20px rgba(59, 130, 246, 0.1);
          border-color: rgba(59, 130, 246, 0.35);
        }

        .bp-card.theme-red:hover {
          box-shadow: 0 20px 45px rgba(244, 63, 94, 0.15), 0 0 20px rgba(244, 63, 94, 0.1);
          border-color: rgba(244, 63, 94, 0.35);
        }

        .bp-card.theme-purple:hover {
          box-shadow: 0 20px 45px rgba(168, 85, 247, 0.18), 0 0 20px rgba(168, 85, 247, 0.12);
          border-color: rgba(168, 85, 247, 0.35);
        }

        .bp-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .bp-card-title-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
          min-width: 0;
        }

        .bp-card-title-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .bp-card-title {
          font-size: 16px;
          font-weight: 800;
          color: #ffffff;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          letter-spacing: -0.3px;
        }

        .bp-private-lock-badge {
          font-size: 13px;
          line-height: 1;
        }

        .bp-card-pill-tags {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .bp-tier-pill {
          font-size: 9px;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: 6px;
          letter-spacing: 0.8px;
        }

        .tier-micro {
          background: rgba(59, 130, 246, 0.15);
          border: 1px solid rgba(59, 130, 246, 0.35);
          color: #60a5fa;
        }

        .tier-low {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.35);
          color: #34d399;
        }

        .tier-medium {
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.35);
          color: #fbbf24;
        }

        .tier-high {
          background: rgba(244, 63, 94, 0.15);
          border: 1px solid rgba(244, 63, 94, 0.35);
          color: #fb7185;
        }

        .tier-vip {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(168, 85, 247, 0.25));
          border: 1px solid rgba(245, 158, 11, 0.6);
          color: #fde047;
        }

        .bp-format-tag {
          font-size: 9px;
          font-weight: 700;
          color: #94a3b8;
          background: rgba(255, 255, 255, 0.05);
          padding: 2px 6px;
          border-radius: 5px;
          letter-spacing: 0.5px;
        }

        .bp-card-header-right {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .bp-paused-pill {
          font-size: 9px;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: 5px;
          background: rgba(245, 158, 11, 0.2);
          border: 1px solid #f59e0b;
          color: #fbbf24;
          letter-spacing: 0.5px;
        }

        .bp-card-badge {
          font-size: 10px;
          font-weight: 800;
          padding: 3px 9px;
          border-radius: 8px;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          white-space: nowrap;
        }

        .badge-green {
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.45);
          color: #34d399;
        }

        .badge-blue {
          background: rgba(59, 130, 246, 0.12);
          border: 1px solid rgba(59, 130, 246, 0.45);
          color: #60a5fa;
        }

        .badge-red {
          background: rgba(244, 63, 94, 0.12);
          border: 1px solid rgba(244, 63, 94, 0.45);
          color: #fb7185;
        }

        .badge-purple {
          background: rgba(168, 85, 247, 0.15);
          border: 1px solid rgba(168, 85, 247, 0.45);
          color: #c084fc;
        }

        .bp-card-private-code {
          background: rgba(246, 189, 73, 0.12);
          border: 1px dashed rgba(246, 189, 73, 0.5);
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 11px;
          color: #f6bd49;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          letter-spacing: 0.5px;
          transition: all 0.2s ease;
        }

        .bp-card-private-code.is-locked {
          background: rgba(168, 85, 247, 0.15);
          border: 1px dashed #a855f7;
          color: #e9d5ff;
        }

        .bp-card-private-code.is-locked:hover {
          background: rgba(168, 85, 247, 0.25);
          border-color: #c084fc;
        }

        /* Private Table Passcode Modal */
        .bp-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.82);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          padding: 20px;
        }

        .bp-unlock-modal {
          background: linear-gradient(180deg, #1f153a 0%, #100b24 100%);
          border: 1px solid rgba(168, 85, 247, 0.45);
          border-radius: 18px;
          max-width: 440px;
          width: 100%;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.75), 0 0 40px rgba(168, 85, 247, 0.25);
          overflow: hidden;
          animation: bpModalPop 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes bpModalPop {
          0% {
            transform: scale(0.94);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .bp-unlock-header {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px 22px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.02);
        }

        .bp-unlock-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: rgba(168, 85, 247, 0.2);
          border: 1px solid rgba(168, 85, 247, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }

        .bp-unlock-title-box {
          flex: 1;
        }

        .bp-unlock-title {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
          color: #ffffff;
        }

        .bp-unlock-sub {
          font-size: 12px;
          color: #c4b5fd;
          font-weight: 500;
        }

        .bp-unlock-close {
          background: transparent;
          border: none;
          color: #928ca7;
          font-size: 24px;
          cursor: pointer;
          line-height: 1;
          padding: 4px;
          transition: color 0.15s;
        }

        .bp-unlock-close:hover {
          color: #ffffff;
        }

        .bp-unlock-form {
          padding: 22px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .bp-unlock-desc {
          margin: 0;
          font-size: 13px;
          line-height: 1.5;
          color: #a5a2bb;
        }

        .bp-unlock-input-wrap {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .bp-unlock-label {
          font-size: 11px;
          font-weight: 700;
          color: #e2e0ed;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .bp-unlock-input {
          width: 100%;
          background: #090616;
          border: 1.5px solid rgba(168, 85, 247, 0.4);
          border-radius: 10px;
          padding: 12px 16px;
          font-size: 16px;
          font-weight: 800;
          color: #f6bd49;
          letter-spacing: 2px;
          text-transform: uppercase;
          outline: none;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .bp-unlock-input:focus {
          border-color: #a855f7;
          box-shadow: 0 0 16px rgba(168, 85, 247, 0.35);
          background: #0d0822;
        }

        .bp-unlock-error {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #fca5a5;
          font-size: 12px;
          padding: 10px 12px;
          border-radius: 8px;
          font-weight: 600;
        }

        .bp-unlock-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 6px;
        }

        .bp-unlock-cancel-btn {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #d1cddb;
          padding: 10px 18px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .bp-unlock-cancel-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
        }

        .bp-unlock-submit-btn {
          background: linear-gradient(135deg, #7868ff 0%, #a855f7 100%);
          border: none;
          color: #ffffff;
          padding: 10px 22px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(120, 104, 255, 0.4);
          transition: all 0.2s;
        }

        .bp-unlock-submit-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(168, 85, 247, 0.5);
        }

        /* 3D Stadium Mini Table Visual */
        .bp-card-table-stage {
          display: flex;
          justify-content: center;
          padding: 8px 0;
          position: relative;
        }

        .bp-paused-stage-overlay {
          position: absolute;
          inset: 0;
          background: rgba(8, 6, 20, 0.85);
          backdrop-filter: blur(4px);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fbbf24;
          font-weight: 800;
          font-size: 11px;
          letter-spacing: 0.8px;
          z-index: 5;
          border: 1px dashed rgba(245, 158, 11, 0.4);
        }

        .bp-stadium-wrap {
          width: 228px;
          height: 116px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .bp-stadium-rail {
          width: 100%;
          height: 100%;
          border-radius: 58px;
          padding: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          box-sizing: border-box;
          transition: all 0.25s ease;
        }

        /* Stadium Theme Rails & Felts */
        .stadium-green .bp-stadium-rail {
          background: linear-gradient(145deg, #164030, #081f16);
          border: 2px solid rgba(52, 211, 153, 0.45);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6), inset 0 2px 3px rgba(255, 255, 255, 0.25), inset 0 -3px 6px rgba(0, 0, 0, 0.8);
        }

        .stadium-green .bp-stadium-felt {
          background: radial-gradient(ellipse at 50% 50%, #0d5239 0%, #063323 70%, #031b13 100%);
          box-shadow: inset 0 0 16px rgba(0, 0, 0, 0.85), inset 0 0 6px rgba(52, 211, 153, 0.3);
          border: 1px solid rgba(52, 211, 153, 0.25);
        }

        .stadium-blue .bp-stadium-rail {
          background: linear-gradient(145deg, #1b2f60, #0b1533);
          border: 2px solid rgba(96, 165, 250, 0.45);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6), inset 0 2px 3px rgba(255, 255, 255, 0.25), inset 0 -3px 6px rgba(0, 0, 0, 0.8);
        }

        .stadium-blue .bp-stadium-felt {
          background: radial-gradient(ellipse at 50% 50%, #173677 0%, #0e214d 70%, #061026 100%);
          box-shadow: inset 0 0 16px rgba(0, 0, 0, 0.85), inset 0 0 6px rgba(96, 165, 250, 0.3);
          border: 1px solid rgba(96, 165, 250, 0.25);
        }

        .stadium-red .bp-stadium-rail {
          background: linear-gradient(145deg, #4d1523, #24070e);
          border: 2px solid rgba(251, 113, 133, 0.45);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6), inset 0 2px 3px rgba(255, 255, 255, 0.25), inset 0 -3px 6px rgba(0, 0, 0, 0.8);
        }

        .stadium-red .bp-stadium-felt {
          background: radial-gradient(ellipse at 50% 50%, #681529 0%, #3d0c18 70%, #1a0309 100%);
          box-shadow: inset 0 0 16px rgba(0, 0, 0, 0.85), inset 0 0 6px rgba(251, 113, 133, 0.3);
          border: 1px solid rgba(251, 113, 133, 0.25);
        }

        .stadium-purple .bp-stadium-rail {
          background: linear-gradient(145deg, #3d175b, #1e0930);
          border: 2px solid rgba(192, 132, 252, 0.45);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6), inset 0 2px 3px rgba(255, 255, 255, 0.25), inset 0 -3px 6px rgba(0, 0, 0, 0.8);
        }

        .stadium-purple .bp-stadium-felt {
          background: radial-gradient(ellipse at 50% 50%, #461872 0%, #290a46 70%, #130322 100%);
          box-shadow: inset 0 0 16px rgba(0, 0, 0, 0.85), inset 0 0 6px rgba(192, 132, 252, 0.3);
          border: 1px solid rgba(192, 132, 252, 0.25);
        }

        .bp-stadium-felt {
          width: 100%;
          height: 100%;
          border-radius: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          box-sizing: border-box;
          overflow: hidden;
        }

        .bp-felt-watermark {
          position: absolute;
          font-size: 26px;
          font-weight: 900;
          color: rgba(255, 255, 255, 0.05);
          letter-spacing: 4px;
          user-select: none;
          pointer-events: none;
        }

        .bp-felt-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          z-index: 2;
        }

        .bp-felt-blinds-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(251, 191, 36, 0.55);
          border-radius: 12px;
          padding: 2px 8px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
        }

        .bp-felt-coin {
          font-size: 10px;
          line-height: 1;
        }

        .bp-felt-blinds-text {
          font-size: 11px;
          font-weight: 800;
          color: #fbbf24;
          letter-spacing: 0.3px;
        }

        .bp-felt-sub-text {
          font-size: 7.5px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.55);
          letter-spacing: 0.8px;
          text-transform: uppercase;
          margin-top: 2px;
        }

        /* Stadium Seats */
        .bp-seat-cushion {
          position: absolute;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 3;
          transition: transform 0.15s ease;
        }

        .bp-seat-cushion.is-occupied {
          background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%);
          border: 1.5px solid #ffffff;
          box-shadow: 0 0 8px rgba(251, 191, 36, 0.7);
        }

        .bp-seat-avatar {
          font-size: 8px;
          line-height: 1;
          color: #000;
        }

        .bp-seat-cushion.is-empty {
          background: rgba(12, 10, 26, 0.7);
          border: 1.5px dashed rgba(255, 255, 255, 0.35);
        }

        .bp-seat-plus {
          font-size: 10px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.6);
          line-height: 1;
        }

        /* Cockpit Metadata Box */
        .bp-card-meta {
          display: flex;
          align-items: center;
          background: rgba(0, 0, 0, 0.35);
          padding: 10px 14px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .bp-meta-item {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .bp-meta-divider {
          width: 1px;
          height: 24px;
          background: rgba(255, 255, 255, 0.1);
          margin: 0 12px;
        }

        .bp-meta-lbl {
          font-size: 9px;
          color: #94a3b8;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .bp-meta-val {
          font-size: 12px;
          font-weight: 800;
          color: #ffffff;
          margin-top: 1px;
        }

        .bp-meta-val.font-gold {
          color: #fbbf24;
        }

        /* Card Footer & Radar */
        .bp-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: auto;
          gap: 10px;
        }

        .bp-card-players {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .bp-status-radar {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 12px;
          height: 12px;
          flex-shrink: 0;
        }

        .bp-radar-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .bp-radar-ping {
          position: absolute;
          width: 16px;
          height: 16px;
          border-radius: 50%;
        }

        .bp-status-radar.playing .bp-radar-dot {
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
        }

        .bp-status-radar.playing .bp-radar-ping {
          background: rgba(16, 185, 129, 0.4);
          animation: bpRadarPulse 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        .bp-status-radar.waiting .bp-radar-dot {
          background: #94a3b8;
        }

        .bp-status-radar.paused .bp-radar-dot {
          background: #f59e0b;
          box-shadow: 0 0 8px #f59e0b;
        }

        .bp-status-radar.paused .bp-radar-ping {
          background: rgba(245, 158, 11, 0.4);
          animation: bpRadarPulse 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        @keyframes bpRadarPulse {
          0% { transform: scale(0.6); opacity: 1; }
          100% { transform: scale(2.2); opacity: 0; }
        }

        .bp-players-count-text {
          font-size: 11px;
          color: #cbd5e1;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .bp-players-count-text b {
          color: #ffffff;
          font-weight: 800;
        }

        .bp-players-status-sub {
          color: #94a3b8;
          font-size: 10px;
        }

        .bp-play-cta {
          background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
          border: 1px solid rgba(168, 85, 247, 0.3);
          color: #ffffff;
          font-weight: 800;
          font-size: 11px;
          letter-spacing: 0.5px;
          padding: 8px 16px;
          border-radius: 10px;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(124, 58, 237, 0.35);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          white-space: nowrap;
          flex-shrink: 0;
        }

        .bp-play-cta:hover {
          background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(124, 58, 237, 0.55);
        }

        .bp-play-cta.is-paused {
          background: linear-gradient(135deg, #d97706, #b45309);
          border: 1px solid #f59e0b;
          box-shadow: 0 3px 10px rgba(217, 119, 6, 0.35);
        }

        /* Table View Split */
        .bp-table-view-split {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 24px;
          align-items: start;
        }

        .bp-table-list-panel {
          background: #17122f;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(10, 7, 30, 0.2);
        }

        .bp-table-grid-header {
          display: grid;
          grid-template-columns: 2fr 1fr 1.2fr 1.2fr 1.4fr 1fr;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.03);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 11px;
          font-weight: 800;
          color: #928ca7;
          text-transform: uppercase;
        }

        .bp-table-grid-body {
          display: flex;
          flex-direction: column;
        }

        .bp-table-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1.2fr 1.2fr 1.4fr 1fr;
          padding: 12px 16px;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          cursor: pointer;
          font-size: 13px;
          transition: background 0.15s ease;
        }

        .bp-table-row:hover {
          background: rgba(120, 104, 255, 0.08);
        }

        .bp-table-row.selected {
          background: rgba(120, 104, 255, 0.16);
          border-left: 3px solid #7868ff;
        }

        .bp-col-name {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .bp-tbl-title {
          color: #fff;
          font-weight: 700;
        }

        .bp-badge-private {
          font-size: 9px;
          color: #f6bd49;
          font-weight: 800;
        }

        .bp-badge-public {
          font-size: 9px;
          color: #27d7ad;
          font-weight: 800;
        }

        .bp-col-players {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .bp-progress-bar {
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
          width: 80px;
        }

        .bp-progress-fill {
          height: 100%;
          background: #27d7ad;
        }

        .bp-fee-tag {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .tag-green {
          background: rgba(39, 215, 173, 0.15);
          color: #27d7ad;
        }

        .tag-blue {
          background: rgba(120, 104, 255, 0.15);
          color: #a496ff;
        }

        .tag-red {
          background: rgba(255, 114, 94, 0.15);
          color: #ff725e;
        }

        .tag-purple {
          background: rgba(120, 104, 255, 0.25);
          color: #c4b5fd;
        }

        .bp-btn-open-row {
          background: #7868ff;
          border: none;
          color: #fff;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .bp-btn-open-row:hover {
          background: #5943e9;
        }

        /* Table Preview Panel */
        .bp-preview-panel {
          background: #17122f;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-shadow: 0 10px 30px rgba(10, 7, 30, 0.2);
        }

        .bp-preview-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .bp-preview-title {
          font-size: 17px;
          font-weight: 900;
          color: #fff;
          margin: 0;
        }

        .bp-preview-sub {
          font-size: 11px;
          color: #928ca7;
          font-weight: 600;
        }

        .bp-preview-felt-wrap {
          display: flex;
          justify-content: center;
          padding: 8px 0;
        }

        .bp-preview-stadium {
          width: 260px;
          height: 130px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .bp-preview-stadium .bp-stadium-rail {
          width: 100%;
          height: 100%;
          border-radius: 65px;
          padding: 8px;
        }

        .bp-preview-stadium .bp-stadium-felt {
          border-radius: 56px;
        }

        .bp-preview-dealer {
          font-size: 9px;
          color: #94a3b8;
          font-weight: 800;
          letter-spacing: 1px;
          margin-bottom: 2px;
          z-index: 2;
        }

        .bp-preview-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          z-index: 2;
        }

        .bp-preview-chips {
          font-size: 11px;
          font-weight: 800;
          color: #fbbf24;
          background: rgba(0, 0, 0, 0.6);
          padding: 2px 8px;
          border-radius: 10px;
          border: 1px solid rgba(251, 191, 36, 0.4);
          margin-bottom: 3px;
        }

        .bp-preview-board {
          display: flex;
          gap: 2px;
          font-size: 13px;
          color: #ffffff;
        }

        .bp-preview-seat {
          position: absolute;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 800;
          z-index: 3;
        }

        .bp-preview-seat.occupied {
          background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%);
          color: #000;
          border: 1.5px solid #fff;
          box-shadow: 0 0 8px rgba(251, 191, 36, 0.7);
        }

        .bp-preview-seat.empty {
          background: rgba(12, 10, 26, 0.75);
          color: rgba(255, 255, 255, 0.6);
          border: 1.5px dashed rgba(255, 255, 255, 0.35);
        }

        .bp-preview-details {
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: rgba(0, 0, 0, 0.3);
          padding: 14px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .bp-detail-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
        }

        .bp-detail-row .lbl {
          color: #928ca7;
        }

        .bp-detail-row .val {
          color: #fff;
          font-weight: 700;
        }

        .bp-detail-row .font-gold {
          color: #f6bd49;
        }

        .highlight-code {
          background: rgba(246, 189, 73, 0.15);
          padding: 4px 6px;
          border-radius: 4px;
        }

        .highlight-code .code {
          color: #f6bd49;
          font-family: monospace;
          font-size: 13px;
        }

        .bp-preview-actions {
          display: flex;
          gap: 10px;
        }

        .bp-btn-preview-open {
          flex: 1;
          background: linear-gradient(135deg, #7868ff, #5943e9);
          border: none;
          color: #fff;
          padding: 10px;
          border-radius: 8px;
          font-weight: 800;
          font-size: 13px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(120, 104, 255, 0.35);
          transition: transform 0.15s ease;
        }

        .bp-btn-preview-open:hover {
          transform: translateY(-1px);
        }

        .bp-btn-preview-spectate {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          padding: 10px 16px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .bp-btn-preview-spectate:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        /* Modal */
        .bp-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(10, 7, 30, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 16px;
        }

        .bp-modal {
          background: #17122f;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          width: 100%;
          max-width: 500px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
        }

        .bp-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: #120e28;
        }

        .bp-modal-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
          color: #fff;
        }

        .bp-modal-close {
          background: none;
          border: none;
          color: #928ca7;
          font-size: 20px;
          cursor: pointer;
        }

        .bp-modal-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .bp-modal-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
          color: #cbd5e1;
        }

        .bp-modal-field input,
        .bp-modal-field select {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
          padding: 8px 12px;
          border-radius: 10px;
          font-size: 13px;
          outline: none;
        }

        .bp-modal-field input:focus,
        .bp-modal-field select:focus {
          border-color: #7868ff;
          box-shadow: 0 0 0 3px rgba(120, 104, 255, 0.2);
        }

        .bp-modal-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .bp-modal-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #cbd5e1;
          cursor: pointer;
        }

        .bp-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 8px;
        }

        .bp-btn-cancel {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          padding: 8px 16px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
        }

        .bp-btn-submit {
          background: linear-gradient(135deg, #7868ff, #5943e9);
          border: none;
          color: #fff;
          padding: 9px 20px;
          border-radius: 10px;
          font-weight: 800;
          font-size: 12px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(120, 104, 255, 0.35);
        }

        @keyframes pulse {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
          100% {
            opacity: 1;
          }
        }

        @media (max-width: 900px) {
          .bp-table-view-split {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
