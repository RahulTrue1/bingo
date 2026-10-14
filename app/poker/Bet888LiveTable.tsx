"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import "./poker.css";
import { Bet888TableSummary, CardModel } from "./poker-types";
import { bestHand, buildDeck, cardStr, parseCard, shuffle, VARIANTS, evalName } from "./poker-engine";
import { Gear, SpeakerHigh, SpeakerSimpleSlash, ChatCircleDots, List } from "@phosphor-icons/react";
import { apiClient, type WalletTransaction } from "../api-client";
import {
  subscribeLivePokerCommand,
  sendLivePokerCommand,
  broadcastPlayerLeave,
  subscribePlayerPresence,
} from "./poker-tables-store";

export interface TableSeatPlayer {
  seatNo: number;
  name: string;
  avatarColor: string;
  isHero: boolean;
  stack: number;
  bet: number;
  folded: boolean;
  allIn: boolean;
  cards: CardModel[];
  lastAction: string;
}

export interface LiveTableTelemetry {
  stage: string;
  pot: number;
  currentBet: number;
  activeSeat: number;
  players: TableSeatPlayer[];
  board: CardModel[];
  handNo: number;
  isTablePaused: boolean;
}

export function suitSymbol(s: number): string {
  return ["♠", "♥", "♦", "♣"][s] || "♠";
}

export function rankLabel(r: number): string {
  return r === 14 ? "A" : r === 13 ? "K" : r === 12 ? "Q" : r === 11 ? "J" : String(r);
}

export interface Bet888LiveTableProps {
  table: Bet888TableSummary;
  onLeaveTable: (cashedOutStack?: number) => void;
  walletBalance: number;
  userName?: string;
  embedded?: boolean;
  operatorMode?: boolean;
  onDeductBuyIn?: (amount: number) => void;
  onCreditCashOut?: (amount: number) => void;
  isUserBlocked?: boolean;
  onWalletChange?: (newBalance: number) => void;
  onTableStateChange?: (state: LiveTableTelemetry) => void;
  allowBots?: boolean;
}

// Web Audio sound synthesizer for instant zero-dependency sound effects
class PokerAudio {
  private ctx: AudioContext | null = null;
  public muted = false;

  private getContext() {
    try {
      if (!this.ctx && typeof window !== "undefined") {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch (_) {
      return null;
    }
  }

  playDeal() {
    if (this.muted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (_) {}
  }

  playChip() {
    if (this.muted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (_) {}
  }

  playCheck() {
    if (this.muted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch (_) {}
  }

  playTurn() {
    if (this.muted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } catch (_) {}
  }

  playWin() {
    if (this.muted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);
        gain.gain.setValueAtTime(0.18, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.35);
      });
    } catch (_) {}
  }
}

const audio = new PokerAudio();

const BOT_POOL = [
  { name: "Alex", color: "#3B6FB6" },
  { name: "Marko", color: "#8E4DB0" },
  { name: "Sara", color: "#B0543F" },
  { name: "Luka", color: "#2E8B77" },
  { name: "Deni", color: "#A1782F" },
  { name: "Lea", color: "#B03C6E" },
  { name: "Genti", color: "#4E5FC7" },
  { name: "Besa", color: "#16a085" },
];

export interface HandWinnerInfo {
  winnerSeatNo: number;
  winnerName: string;
  isHero: boolean;
  potWon: number;
  handRankName: string;
  winningCards?: CardModel[];
  wonByFold?: boolean;
}

function getResolvedPlayerName(userName?: string): string {
  if (userName && userName !== "You" && userName !== "Hero") return userName;
  if (typeof window !== "undefined") {
    const stored = apiClient.auth.getStoredUsername();
    if (stored) return stored;
  }
  return "Ari.R";
}

function initializeTableState(
  table: Bet888TableSummary,
  walletBalance: number,
  userName: string,
  allowBots: boolean = false,
  operatorMode: boolean = false
) {
  // Deterministic seed based on table ID to give each table unique cards and state
  const str = `${table.id || "table"}-${table.name || "cash"}`;
  let seed = 0;
  for (let i = 0; i < str.length; i++) {
    seed = (seed * 31 + str.charCodeAt(i)) & 0xffffffff;
  }
  const absSeed = Math.abs(seed);
  const handNo = 2000 + (absSeed % 7000);

  // Pseudo-random generator seeded with table ID
  let s = absSeed || 123456789;
  const rng = () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 4294967296;
  };

  const deck = shuffle(buildDeck(false), rng);

  // 5 staged community cards
  const staged: CardModel[] = [
    deck.pop() || { r: 14, s: 0 },
    deck.pop() || { r: 13, s: 1 },
    deck.pop() || { r: 12, s: 0 },
    deck.pop() || { r: 10, s: 2 },
    deck.pop() || { r: 7, s: 1 },
  ];

  const bb = table.bb || 2;
  const sb = table.sb || 1;
  const minBuyIn = table.minBuyIn || bb * 20;
  const resolvedHeroName = getResolvedPlayerName(userName);
  const heroInitialStack =
    walletBalance > 0
      ? Math.min(walletBalance, Math.max(minBuyIn, bb * 100))
      : Math.max(minBuyIn, bb * 100);

  const rawSeats = (table.seats || []).filter((s) => Boolean(s.player));
  const players: TableSeatPlayer[] = [];

  if (rawSeats.length > 0) {
    // Populate strictly from real seats
    for (const seat of rawSeats) {
      const isHero = seat.player?.toLowerCase() === resolvedHeroName.toLowerCase();
      const c1 = deck.pop() || { r: 14, s: 0 };
      const c2 = deck.pop() || { r: 11, s: 1 };
      players.push({
        seatNo: seat.seatNo != null ? seat.seatNo : players.length,
        name: seat.player!,
        avatarColor: isHero ? "#B08A3E" : "#3B6FB6",
        isHero,
        stack: seat.stack || heroInitialStack,
        bet: seat.bet || 0,
        folded: seat.folded || false,
        allIn: false,
        cards: [c1, c2],
        lastAction: seat.bet ? `BET €${seat.bet}` : "",
      });
    }
  } else if (allowBots) {
    // Explicit demo bot testing mode
    const heroCards: CardModel[] = [
      deck.pop() || { r: 14, s: 0 },
      deck.pop() || { r: 11, s: 1 },
    ];
    players.push({
      seatNo: 0,
      name: resolvedHeroName,
      avatarColor: "#B08A3E",
      isHero: true,
      stack: heroInitialStack,
      bet: 0,
      folded: false,
      allIn: false,
      cards: heroCards,
      lastAction: "",
    });

    const maxSeats = table.maxSeats || 6;
    const botCount = Math.min(maxSeats - 1, 5);
    const botOffset = absSeed % BOT_POOL.length;

    for (let i = 0; i < botCount; i++) {
      const bot = BOT_POOL[(botOffset + i) % BOT_POOL.length];
      const c1 = deck.pop() || { r: 10 + (i % 4), s: (i % 4) as any };
      const c2 = deck.pop() || { r: 8 + (i % 4), s: ((i + 1) % 4) as any };
      players.push({
        seatNo: i + 1,
        name: bot.name,
        avatarColor: bot.color,
        isHero: false,
        stack: Math.floor(minBuyIn * (2 + (i + 1) * 0.7)),
        bet: i === 0 ? bb : 0,
        folded: i === 3,
        allIn: false,
        cards: [c1, c2],
        lastAction: i === 0 ? `BET ${bb}` : i === 3 ? "FOLD" : "CALL",
      });
    }
  } else if (!operatorMode) {
    // Player view when table has no other players: Hero is seated at seat 0
    players.push({
      seatNo: 0,
      name: resolvedHeroName,
      avatarColor: "#B08A3E",
      isHero: true,
      stack: heroInitialStack,
      bet: 0,
      folded: false,
      allIn: false,
      cards: [deck.pop() || { r: 14, s: 0 }, deck.pop() || { r: 11, s: 1 }],
      lastAction: "",
    });
  }

  const isLiveHand = players.length >= 2;
  const board: CardModel[] = isLiveHand ? staged.slice(0, 3) : [];
  const pot = isLiveHand ? Math.round((sb + bb) * (2 + (absSeed % 3))) : 0;
  const currentBet = isLiveHand ? bb : 0;
  const initialStage = isLiveHand ? "flop" : "waiting";

  return {
    handNo,
    staged,
    board,
    pot,
    currentBet,
    players,
    initialStage,
  };
}

export function Bet888LiveTable({
  table,
  onLeaveTable,
  walletBalance,
  userName = "You",
  embedded = false,
  operatorMode = false,
  onDeductBuyIn,
  onCreditCashOut,
  isUserBlocked = false,
  onWalletChange,
  onTableStateChange,
  allowBots = false,
}: Bet888LiveTableProps) {
  // Live reactive wallet state
  const [currentWallet, setCurrentWallet] = useState<number>(walletBalance);
  useEffect(() => {
    setCurrentWallet(walletBalance);
  }, [walletBalance]);

  const notifyWalletChange = useCallback((newBalance: number, delta: number, type: string) => {
    const rounded = Math.round(newBalance * 100) / 100;
    setCurrentWallet(rounded);
    onWalletChange?.(rounded);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("wallet_balance_updated", {
          detail: { balance: rounded, delta, username: userName, type },
        })
      );
    }
  }, [onWalletChange, userName]);

  // Toast and Modal notices for real-time operator alerts
  const [toastNotification, setToastNotification] = useState<{ text: string; type: "info" | "warning" | "success" } | null>(null);
  const [standUpModalMessage, setStandUpModalMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!toastNotification) return;
    const t = setTimeout(() => setToastNotification(null), 3000);
    return () => clearTimeout(t);
  }, [toastNotification]);

  // Initialize unique game session for this table
  const initialDataRef = useRef<ReturnType<typeof initializeTableState> | null>(null);
  if (!initialDataRef.current) {
    initialDataRef.current = initializeTableState(table, walletBalance, userName, allowBots, operatorMode);
  }
  const init = initialDataRef.current;

  // Game session & state
  const [handNo, setHandNo] = useState(init.handNo);
  const [stage, setStage] = useState<"waiting" | "preflop" | "flop" | "turn" | "river" | "showdown">(init.initialStage as any);
  const [board, setBoard] = useState<CardModel[]>(init.board);
  const [pot, setPot] = useState(init.pot);
  const [currentBet, setCurrentBet] = useState(init.currentBet);
  const [activeSeat, setActiveSeat] = useState<number>(0);
  const [actionTimeLeft, setActionTimeLeft] = useState(15);
  const [actionTimeLimit, setActionTimeLimit] = useState(15);
  const [heroHandName, setHeroHandName] = useState("One pair");
  const [soundMuted, setSoundMuted] = useState(false);
  const [isTablePaused, setIsTablePaused] = useState(table.status === "paused");

  useEffect(() => {
    setIsTablePaused(table.status === "paused");
  }, [table.status]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsg, setChatMsg] = useState("");
  const [chatLogs, setChatLogs] = useState<Array<{ from: string; text: string; time: string }>>([
    { from: "Alex", text: "Hello everyone!", time: "14:30" },
    { from: "Marko", text: "Good luck all", time: "14:31" },
  ]);

  // Winner & Showdown state
  const [winnerInfo, setWinnerInfo] = useState<HandWinnerInfo | null>(null);
  const [nextHandCountdown, setNextHandCountdown] = useState<number>(0);
  const stagedCommunityRef = useRef<CardModel[]>(init.staged);

  // Bet Slider state
  const [raiseAmount, setRaiseAmount] = useState(Math.max(table.bb, init.currentBet * 2));

  // Players seated
  const [players, setPlayers] = useState<TableSeatPlayer[]>(init.players);

  // Effective active user name: prioritize prop, fallback to stored session user
  const effectiveUsername = useMemo(() => {
    return getResolvedPlayerName(userName);
  }, [userName]);

  // Synchronize player 0's name with effectiveUsername whenever it changes
  useEffect(() => {
    setPlayers((prev) =>
      prev.map((p) => (p.isHero ? { ...p, name: effectiveUsername } : p))
    );
  }, [effectiveUsername]);

  // Deal Next Hand with randomized deck
  const handleDealNextHand = useCallback(() => {
    setWinnerInfo(null);
    setNextHandCountdown(0);
    setHandNo((h) => h + 1);

    // Fresh deck
    const deck = shuffle(buildDeck(false), Math.random);

    // 5 staged community cards
    const nextStaged: CardModel[] = [
      deck.pop()!,
      deck.pop()!,
      deck.pop()!,
      deck.pop()!,
      deck.pop()!,
    ];
    stagedCommunityRef.current = nextStaged;

    // Reset players with fresh cards
    setPlayers((prev) =>
      prev.map((p) => {
        const c1 = deck.pop() || { r: 14, s: 0 };
        const c2 = deck.pop() || { r: 13, s: 1 };
        return {
          ...p,
          cards: [c1, c2],
          bet: 0,
          folded: false,
          allIn: false,
          lastAction: "",
        };
      })
    );

    setBoard([]);
    setStage("preflop");
    setPot(table.sb + table.bb);
    setCurrentBet(table.bb);
    setActiveSeat(0);
    setActionTimeLeft(20);
    audio.playDeal();
  }, [table.bb, table.sb]);

  // Automatic countdown to next hand when showdown begins
  useEffect(() => {
    if (stage !== "showdown" || !winnerInfo) {
      setNextHandCountdown(0);
      return;
    }
    const timer = setInterval(() => {
      setNextHandCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleDealNextHand();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [stage, winnerInfo, handleDealNextHand]);

  // Dispatch real-time table state to parent backoffice supervisor
  useEffect(() => {
    if (onTableStateChange) {
      onTableStateChange({
        stage,
        pot,
        currentBet,
        activeSeat,
        players,
        board,
        handNo,
        isTablePaused,
      });
    }
  }, [stage, pot, currentBet, activeSeat, players, board, handNo, isTablePaused, onTableStateChange]);

  // Calculate live hand evaluation for Hero
  useEffect(() => {
    const hero = players.find((p) => p.isHero);
    if (!hero || hero.folded || hero.cards.length < 2) return;
    if (board.length >= 3) {
      try {
        const res = bestHand(hero.cards, board, VARIANTS.NLH);
        if (res) {
          setHeroHandName(evalName(res));
        }
      } catch (_) {}
    } else {
      const [c1, c2] = hero.cards;
      if (c1.r === c2.r) {
        setHeroHandName("Pocket pair");
      } else {
        setHeroHandName("High card");
      }
    }
  }, [board, players]);

  // Turn timer countdown ring
  useEffect(() => {
    if (stage === "showdown" || isTablePaused) return;
    const timer = setInterval(() => {
      setActionTimeLeft((prev) => {
        if (prev <= 1) {
          // Auto-check or auto-fold on expiration
          if (activeSeat === 0 && !isUserBlocked && !isTablePaused) {
            handleHeroAction(currentBet === 0 ? "check" : "fold");
          }
          return actionTimeLimit;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeSeat, currentBet, stage, isTablePaused, isUserBlocked, actionTimeLimit]);

  // Desktop keyboard hotkeys: Section 16.3 (F = Fold, C = Check/Call, R = Raise)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === "input" || targetTag === "textarea" || targetTag === "select") {
        return;
      }

      if (isUserBlocked || isTablePaused || stage === "showdown" || activeSeat !== 0) {
        return;
      }

      const hero = players[0];
      if (!hero || hero.folded) return;

      const key = e.key.toLowerCase();
      if (key === "f") {
        e.preventDefault();
        handleHeroAction("fold");
      } else if (key === "c") {
        e.preventDefault();
        const canCheck = hero.bet === currentBet;
        handleHeroAction(canCheck ? "check" : "call");
      } else if (key === "r") {
        e.preventDefault();
        if (hero.stack > (currentBet - hero.bet)) {
          handleHeroAction("raise");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [players, activeSeat, currentBet, isTablePaused, isUserBlocked, stage]);

  // Trigger win by fold when all other players fold
  const triggerWinByFold = useCallback((winner: TableSeatPlayer, currentPot: number) => {
    const info: HandWinnerInfo = {
      winnerSeatNo: winner.seatNo,
      winnerName: winner.name,
      isHero: winner.isHero,
      potWon: currentPot,
      handRankName: "Won by all folds",
      winningCards: [],
      wonByFold: true,
    };

    setWinnerInfo(info);
    setStage("showdown");
    setNextHandCountdown(6);

    setPlayers((prev) =>
      prev.map((p) =>
        p.seatNo === winner.seatNo ? { ...p, stack: p.stack + currentPot } : p
      )
    );

    if (winner.isHero) {
      audio.playWin();
      if (currentPot > 0) {
        const optimisticBalance = Math.round((currentWallet + currentPot) * 100) / 100;
        notifyWalletChange(optimisticBalance, currentPot, "Poker Win");

        apiClient.wallet
          .pokerTransaction({
            username: userName,
            type: "Poker Win",
            amount: currentPot,
            tableName: table.name,
            handNo,
            detail: "Won by all folds",
          })
          .then((res) => {
            if (res?.success && typeof res.balance === "number") {
              notifyWalletChange(res.balance, currentPot, "Poker Win");
            }
          })
          .catch(() => {});
      }
    } else {
      audio.playChip();
    }
  }, [userName, table.name, handNo, currentWallet, notifyWalletChange]);

  // Evaluate showdown between remaining active players
  const evaluateShowdown = useCallback(
    (currentBoard: CardModel[], currentPlayers: TableSeatPlayer[], currentPot: number) => {
      const alivePlayers = currentPlayers.filter((p) => !p.folded);
      if (alivePlayers.length === 0) return;

      if (alivePlayers.length === 1) {
        triggerWinByFold(alivePlayers[0], currentPot);
        return;
      }

      const evaluated = alivePlayers.map((p) => {
        try {
          const res = bestHand(p.cards, currentBoard, VARIANTS.NLH);
          return {
            player: p,
            result: res,
          };
        } catch (_) {
          return {
            player: p,
            result: {
              score: 0,
              cat: 0,
              kick: [2],
              cards: p.cards,
            },
          };
        }
      });

      // Sort by score descending
      evaluated.sort((a, b) => b.result.score - a.result.score);
      const best = evaluated[0];
      if (!best) return;

      const info: HandWinnerInfo = {
        winnerSeatNo: best.player.seatNo,
        winnerName: best.player.name,
        isHero: best.player.isHero,
        potWon: currentPot,
        handRankName: evalName(best.result),
        winningCards: best.result.cards || [],
        wonByFold: false,
      };

      setWinnerInfo(info);
      setStage("showdown");
      setNextHandCountdown(6);

      // Credit pot to winner
      setPlayers((prev) =>
        prev.map((p) =>
          p.seatNo === best.player.seatNo ? { ...p, stack: p.stack + currentPot } : p
        )
      );

      if (best.player.isHero) {
        audio.playWin();
        if (currentPot > 0) {
          const optimisticBalance = Math.round((currentWallet + currentPot) * 100) / 100;
          notifyWalletChange(optimisticBalance, currentPot, "Poker Win");

          apiClient.wallet
            .pokerTransaction({
              username: userName,
              type: "Poker Win",
              amount: currentPot,
              tableName: table.name,
              handNo,
              detail: best.result.name,
            })
            .then((res) => {
              if (res?.success && typeof res.balance === "number") {
                notifyWalletChange(res.balance, currentPot, "Poker Win");
              }
            })
            .catch(() => {});
        }
      } else {
        audio.playChip();
      }
    },
    [triggerWinByFold, userName, table.name, handNo, currentWallet, notifyWalletChange]
  );

  const advanceStreet = useCallback(() => {
    if (stage === "waiting" || players.length < 2) return;
    audio.playDeal();
    if (stage === "preflop") {
      setStage("flop");
      setBoard(stagedCommunityRef.current.slice(0, 3));
    } else if (stage === "flop") {
      setStage("turn");
      setBoard(stagedCommunityRef.current.slice(0, 4));
    } else if (stage === "turn") {
      setStage("river");
      setBoard(stagedCommunityRef.current.slice(0, 5));
    } else if (stage === "river") {
      const fullBoard = stagedCommunityRef.current.slice(0, 5);
      setBoard(fullBoard);
      evaluateShowdown(fullBoard, players, pot);
      return;
    }
    setCurrentBet(0);
    setActiveSeat(0);
    setActionTimeLeft(actionTimeLimit);
  }, [stage, players, pot, evaluateShowdown, actionTimeLimit]);

  const advanceTurn = useCallback(() => {
    if (stage === "showdown" || stage === "waiting" || players.length < 2) return;
    const alivePlayers = players.filter((p) => !p.folded);
    if (alivePlayers.length <= 1) {
      if (alivePlayers.length === 1) {
        triggerWinByFold(alivePlayers[0], pot);
      }
      return;
    }

    const aliveSeats = alivePlayers.map((p) => p.seatNo);
    const nextIdx = (aliveSeats.indexOf(activeSeat) + 1) % aliveSeats.length;
    const nextSeat = aliveSeats[nextIdx];

    // If a complete betting round finished, advance street
    if (nextSeat === 0 && Math.random() < 0.45) {
      advanceStreet();
    } else {
      setActiveSeat(nextSeat);
      setActionTimeLeft(actionTimeLimit);
    }
  }, [activeSeat, players, pot, stage, advanceStreet, triggerWinByFold, actionTimeLimit]);

  // Listen for Live Commands from Admin Backoffice
  useEffect(() => {
    const unsub = subscribeLivePokerCommand((cmd) => {
      const match =
        !cmd.tableId ||
        cmd.tableId === "all" ||
        cmd.tableId.toLowerCase() === table.id.toLowerCase() ||
        (table.inviteCode && cmd.tableId.toLowerCase() === table.inviteCode.toLowerCase()) ||
        (table.name && cmd.tableId.toLowerCase() === table.name.toLowerCase());
      if (!match) return;

      if (cmd.action === "pause") {
        setIsTablePaused(true);
        setToastNotification({ type: "warning", text: "Table paused by supervisor." });
      } else if (cmd.action === "resume") {
        setIsTablePaused(false);
        setToastNotification({ type: "success", text: "Table resumed by supervisor." });
      } else if (cmd.action === "set_speed" && typeof cmd.speed === "number") {
        setActionTimeLimit(cmd.speed);
        setActionTimeLeft(cmd.speed);
        setToastNotification({ type: "info", text: `Action clock set to ${cmd.speed}s by supervisor.` });
      } else if (cmd.action === "next_street") {
        advanceStreet();
        setToastNotification({ type: "info", text: "Dealer dealt next street by operator override." });
      } else if (cmd.action === "skip_turn") {
        advanceTurn();
        setToastNotification({ type: "info", text: "Turn skipped / advanced by operator supervisor." });
      } else if (cmd.action === "reset_hand") {
        handleDealNextHand();
        setToastNotification({ type: "info", text: "Hand re-dealt by operator supervisor." });
      } else if (cmd.action === "set_pot" && typeof cmd.pot === "number") {
        setPot(cmd.pot);
      } else if (cmd.action === "stand") {
        const heroPlayer = players.find((p) => p.isHero);
        const heroSeatNo = heroPlayer?.seatNo;
        const isTargetHero =
          (cmd.playerName && cmd.playerName.toLowerCase() === effectiveUsername.toLowerCase()) ||
          (typeof cmd.seat === "number" && heroSeatNo === cmd.seat);

        if (isTargetHero) {
          const refundStack = heroPlayer?.stack || 0;
          if (refundStack > 0) {
            const newBal = Math.round((currentWallet + refundStack) * 100) / 100;
            notifyWalletChange(newBal, refundStack, "Poker Cashout");
          }
          setPlayers((prev) => prev.filter((p) => !p.isHero));
          setStandUpModalMessage(
            "You have been stood up from the table by operator supervisor. Your chips have been refunded to your wallet."
          );
          setTimeout(() => {
            onLeaveTable?.(refundStack);
          }, 2400);
        } else {
          if (cmd.playerName) {
            setPlayers((prev) => prev.filter((p) => p.name.toLowerCase() !== cmd.playerName!.toLowerCase()));
            setToastNotification({ type: "info", text: `Player ${cmd.playerName} stood up from seat.` });
          } else if (typeof cmd.seat === "number") {
            setPlayers((prev) => prev.filter((p) => p.seatNo !== cmd.seat));
          }
        }
      }
    });
    return unsub;
  }, [table.id, table.inviteCode, table.name, advanceStreet, advanceTurn, handleDealNextHand, players, effectiveUsername, currentWallet, notifyWalletChange, onLeaveTable]);

  // Synchronize seated players with server table.seats in operatorMode
  useEffect(() => {
    if (operatorMode && !allowBots) {
      const rawSeats = (table.seats || []).filter((s) => Boolean(s.player));
      setPlayers((prev) => {
        if (rawSeats.length === 0) {
          if (prev.length > 0) {
            setStage("waiting");
            setBoard([]);
            setPot(0);
            setCurrentBet(0);
          }
          return [];
        }
        return rawSeats.map((s, idx) => {
          const existing = prev.find((p) => p.name.toLowerCase() === s.player!.toLowerCase() || p.seatNo === s.seatNo);
          return {
            seatNo: s.seatNo != null ? s.seatNo : idx,
            name: s.player!,
            avatarColor: existing?.avatarColor || (s.player === effectiveUsername ? "#B08A3E" : idx === 1 ? "#3B6FB6" : "#8E4DB0"),
            isHero: s.player === effectiveUsername,
            stack: s.stack,
            bet: s.bet || existing?.bet || 0,
            folded: s.folded || existing?.folded || false,
            allIn: existing?.allIn || false,
            cards: existing?.cards?.length ? existing.cards : [],
            lastAction: existing?.lastAction || "",
          };
        });
      });
    }
  }, [table.seats, operatorMode, allowBots, effectiveUsername]);

  // Listen for real-time player join and leave across browser sessions
  useEffect(() => {
    const unsubPresence = subscribePlayerPresence({
      onJoin: (d) => {
        const match =
          !d.tableId ||
          d.tableId.toLowerCase() === table.id.toLowerCase() ||
          (table.name && d.tableId.toLowerCase() === table.name.toLowerCase());
        if (!match) return;

        setPlayers((prev) => {
          if (prev.some((p) => p.name.toLowerCase() === d.player.toLowerCase())) {
            return prev;
          }
          const isHero = d.player.toLowerCase() === effectiveUsername.toLowerCase();
          const seatNo = d.seatNo != null ? d.seatNo : (prev.length > 0 ? Math.max(...prev.map((p) => p.seatNo)) + 1 : 0);
          const newPlayer: TableSeatPlayer = {
            seatNo,
            name: d.player,
            avatarColor: isHero ? "#B08A3E" : "#3B6FB6",
            isHero,
            stack: d.stack || table.minBuyIn || 100,
            bet: 0,
            folded: false,
            allIn: false,
            cards: [],
            lastAction: "JOINED",
          };
          const next = [...prev, newPlayer];
          if (next.length >= 2 && stage === "waiting") {
            setTimeout(() => handleDealNextHand(), 300);
          }
          return next;
        });
      },
      onLeave: (d) => {
        const match =
          !d.tableId ||
          d.tableId.toLowerCase() === table.id.toLowerCase() ||
          (table.name && d.tableId.toLowerCase() === table.name.toLowerCase());
        if (!match) return;

        setPlayers((prev) => {
          const next = prev.filter((p) => p.name.toLowerCase() !== d.player.toLowerCase() && (d.seatNo == null || p.seatNo !== d.seatNo));
          if (next.length < 2) {
            setStage("waiting");
            setBoard([]);
            setPot(0);
            setCurrentBet(0);
          }
          return next;
        });
      },
    });
    return unsubPresence;
  }, [table.id, table.name, table.minBuyIn, effectiveUsername, stage, handleDealNextHand]);

  // Bot automation turns
  useEffect(() => {
    if (stage === "showdown") return;
    if (activeSeat === 0) {
      if (operatorMode) {
        // In operator supervision mode: Seat 0 acts automatically so the table never freezes
        const actingHero = players.find((p) => p.isHero && !p.folded);
        if (!actingHero) {
          advanceTurn();
          return;
        }
        const heroDelay = setTimeout(() => {
          const decisionRoll = Math.random();
          if (currentBet > 0 && decisionRoll < 0.2) {
            audio.playCheck();
            const updated = players.map((p) =>
              p.isHero ? { ...p, folded: true, lastAction: "FOLD" } : p
            );
            setPlayers(updated);
            const alive = updated.filter((p) => !p.folded);
            if (alive.length === 1) {
              triggerWinByFold(alive[0], pot);
              return;
            }
            advanceTurn();
          } else if (currentBet === 0 || decisionRoll < 0.85) {
            const callAmt = Math.min(actingHero.stack, currentBet - actingHero.bet);
            if (callAmt > 0) audio.playChip();
            else audio.playCheck();
            setPlayers((prev) =>
              prev.map((p) =>
                p.isHero
                  ? {
                      ...p,
                      stack: p.stack - callAmt,
                      bet: p.bet + callAmt,
                      lastAction: callAmt > 0 ? `CALL ${callAmt}` : "CHECK",
                    }
                  : p
              )
            );
            setPot((p) => p + callAmt);
            advanceTurn();
          } else {
            const raiseVal = Math.min(actingHero.stack, currentBet + table.bb * 2);
            audio.playChip();
            setPlayers((prev) =>
              prev.map((p) =>
                p.isHero
                  ? {
                      ...p,
                      stack: p.stack - raiseVal,
                      bet: p.bet + raiseVal,
                      lastAction: `RAISE ${raiseVal}`,
                    }
                  : p
              )
            );
            setCurrentBet(raiseVal);
            setPot((p) => p + raiseVal);
            advanceTurn();
          }
        }, 1200 + Math.random() * 600);
        return () => clearTimeout(heroDelay);
      }
      audio.playTurn();
      return;
    }
    const actingBot = players.find((p) => p.seatNo === activeSeat && !p.folded);
    if (!actingBot) {
      advanceTurn();
      return;
    }

    const botDelay = setTimeout(() => {
      const decisionRoll = Math.random();
      if (currentBet > 0 && decisionRoll < 0.25) {
        // Fold
        audio.playCheck();
        const updated = players.map((p) =>
          p.seatNo === activeSeat ? { ...p, folded: true, lastAction: "FOLD" } : p
        );
        setPlayers(updated);
        const alive = updated.filter((p) => !p.folded);
        if (alive.length === 1) {
          triggerWinByFold(alive[0], pot);
          return;
        }
        advanceTurn();
      } else if (currentBet === 0 || decisionRoll < 0.85) {
        // Check or Call
        const callAmt = Math.min(actingBot.stack, currentBet - actingBot.bet);
        if (callAmt > 0) audio.playChip();
        else audio.playCheck();
        setPlayers((prev) =>
          prev.map((p) =>
            p.seatNo === activeSeat
              ? {
                  ...p,
                  stack: p.stack - callAmt,
                  bet: p.bet + callAmt,
                  lastAction: callAmt > 0 ? `CALL ${callAmt}` : "CHECK",
                }
              : p
          )
        );
        setPot((p) => p + callAmt);
        advanceTurn();
      } else {
        // Raise
        const raiseVal = Math.min(actingBot.stack, currentBet + table.bb * 2);
        audio.playChip();
        setPlayers((prev) =>
          prev.map((p) =>
            p.seatNo === activeSeat
              ? {
                  ...p,
                  stack: p.stack - raiseVal,
                  bet: p.bet + raiseVal,
                  lastAction: `RAISE ${raiseVal}`,
                }
              : p
          )
        );
        setCurrentBet(raiseVal);
        setPot((p) => p + raiseVal);
        advanceTurn();
      }
    }, 1200 + Math.random() * 800);

    return () => clearTimeout(botDelay);
  }, [activeSeat, currentBet, players, table.bb, stage, pot, advanceTurn, triggerWinByFold]);

  // Hero Actions
  const handleHeroAction = (action: "fold" | "check" | "call" | "raise" | "allin") => {
    const hero = players[0];
    if (!hero || hero.folded || stage === "showdown") return;

    if (action === "fold") {
      audio.playCheck();
      const updated = players.map((p) => (p.isHero ? { ...p, folded: true, lastAction: "FOLD" } : p));
      setPlayers(updated);
      const alive = updated.filter((p) => !p.folded);
      if (alive.length === 1) {
        setTimeout(() => triggerWinByFold(alive[0], pot), 250);
        return;
      }
      advanceTurn();
    } else if (action === "check") {
      audio.playCheck();
      setPlayers((prev) =>
        prev.map((p) => (p.isHero ? { ...p, lastAction: "CHECK" } : p))
      );
      advanceTurn();
    } else if (action === "call") {
      const toCall = Math.min(hero.stack, currentBet - hero.bet);
      audio.playChip();
      if (toCall > 0) {
        const optimisticBalance = Math.max(0, Math.round((currentWallet - toCall) * 100) / 100);
        notifyWalletChange(optimisticBalance, -toCall, "Poker Bet");

        apiClient.wallet
          .pokerTransaction({
            username: userName,
            type: "Poker Bet",
            amount: toCall,
            tableName: table.name,
            handNo,
            detail: `Call €${toCall}`,
          })
          .then((res) => {
            if (res?.success && typeof res.balance === "number") {
              notifyWalletChange(res.balance, -toCall, "Poker Bet");
            }
          })
          .catch(() => {});
      }
      setPlayers((prev) =>
        prev.map((p) =>
          p.isHero
            ? {
                ...p,
                stack: p.stack - toCall,
                bet: p.bet + toCall,
                lastAction: `CALL ${toCall}`,
              }
            : p
        )
      );
      setPot((p) => p + toCall);
      advanceTurn();
    } else if (action === "raise") {
      const raiseVal = Math.min(hero.stack, raiseAmount);
      audio.playChip();
      if (raiseVal > 0) {
        const optimisticBalance = Math.max(0, Math.round((currentWallet - raiseVal) * 100) / 100);
        notifyWalletChange(optimisticBalance, -raiseVal, "Poker Bet");

        apiClient.wallet
          .pokerTransaction({
            username: userName,
            type: "Poker Bet",
            amount: raiseVal,
            tableName: table.name,
            handNo,
            detail: `Raise €${raiseVal}`,
          })
          .then((res) => {
            if (res?.success && typeof res.balance === "number") {
              notifyWalletChange(res.balance, -raiseVal, "Poker Bet");
            }
          })
          .catch(() => {});
      }
      setPlayers((prev) =>
        prev.map((p) =>
          p.isHero
            ? {
                ...p,
                stack: p.stack - raiseVal,
                bet: p.bet + raiseVal,
                lastAction: `RAISE ${raiseVal}`,
              }
            : p
        )
      );
      setCurrentBet(raiseVal);
      setPot((p) => p + raiseVal);
      advanceTurn();
    } else if (action === "allin") {
      const allInVal = hero.stack;
      audio.playChip();
      if (allInVal > 0) {
        const optimisticBalance = Math.max(0, Math.round((currentWallet - allInVal) * 100) / 100);
        notifyWalletChange(optimisticBalance, -allInVal, "Poker Bet");

        apiClient.wallet
          .pokerTransaction({
            username: userName,
            type: "Poker Bet",
            amount: allInVal,
            tableName: table.name,
            handNo,
            detail: `All-in €${allInVal}`,
          })
          .then((res) => {
            if (res?.success && typeof res.balance === "number") {
              notifyWalletChange(res.balance, -allInVal, "Poker Bet");
            }
          })
          .catch(() => {});
      }
      setPlayers((prev) =>
        prev.map((p) =>
          p.isHero
            ? {
                ...p,
                stack: 0,
                bet: p.bet + allInVal,
                allIn: true,
                lastAction: `ALL-IN ${allInVal}`,
              }
            : p
        )
      );
      if (allInVal > currentBet) setCurrentBet(allInVal);
      setPot((p) => p + allInVal);
      advanceTurn();
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMsg.trim()) return;
    setChatLogs((prev) => [
      ...prev,
      { from: userName, text: chatMsg.trim(), time: "Now" },
    ]);
    setChatMsg("");
  };

  const toggleSound = () => {
    const next = !soundMuted;
    setSoundMuted(next);
    audio.muted = next;
  };

  // Helper to render card face
  const suitSymbol = (s: number) => ["♠", "♥", "♦", "♣"][s];
  const rankLabel = (r: number) =>
    r === 14 ? "A" : r === 13 ? "K" : r === 12 ? "Q" : r === 11 ? "J" : String(r);

  // Helper to test if a card is in the winning 5-card hand
  const isWinningCard = (card: CardModel | null | undefined): boolean => {
    if (!card || stage !== "showdown" || !winnerInfo || !winnerInfo.winningCards || winnerInfo.wonByFold) {
      return false;
    }
    return winnerInfo.winningCards.some((wc) => wc.r === card.r && wc.s === card.s);
  };

  // Helper to get evaluated showdown hand description for any player
  const getShowdownHandName = (p: TableSeatPlayer): string => {
    if (p.cards.length < 2 || board.length < 3) return "";
    try {
      const res = bestHand(p.cards, board, VARIANTS.NLH);
      return res ? evalName(res) : "";
    } catch (_) {
      return "";
    }
  };

  const hero = players[0];
  const toCall = currentBet - hero.bet;
  const canCheck = toCall === 0;

  return (
    <div className={`bet888-table-root ${embedded ? "is-embedded" : ""}`}>
      {/* ================= 1. TOP HUD ================= */}
      <header className="bet888-table-hud">
        <div className="table-hud-left">
          <div className="hud-blinds-badge">
            <span className="lbl">BLINDS</span>
            <span className="val">{table.sb}/{table.bb}</span>
          </div>
          <div className="hud-round-badge">
            <span className="lbl">ROUND</span>
            <span className="val">Hand #{handNo}</span>
          </div>
          {table.isPrivate && table.inviteCode && (
            <button
              className="hud-invite-chip"
              onClick={() => {
                navigator.clipboard.writeText(table.inviteCode!);
                alert(`Invite code copied: ${table.inviteCode}`);
              }}
              title="Copy invite code"
            >
              <span>CODE: <b>{table.inviteCode}</b></span>
              <span className="copy-icon">⎘</span>
            </button>
          )}
        </div>

        <div className="table-hud-right">
          <button
            className={`hud-ctrl-btn ${historyOpen ? "active" : ""}`}
            onClick={() => setHistoryOpen(!historyOpen)}
            title="Hand history"
          >
            <Gear size={18} weight="bold" />
          </button>
          <button
            className={`hud-ctrl-btn ${soundMuted ? "muted" : ""}`}
            onClick={toggleSound}
            title={soundMuted ? "Unmute audio" : "Mute audio"}
          >
            {soundMuted ? <SpeakerSimpleSlash size={18} weight="bold" /> : <SpeakerHigh size={18} weight="bold" />}
          </button>
          <button
            className="hud-ctrl-btn"
            onClick={() => setChatOpen(!chatOpen)}
            title="Player chat"
          >
            <ChatCircleDots size={18} weight="bold" />
          </button>
          <button
            className="hud-ctrl-btn menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            title="Table menu"
          >
            <List size={18} weight="bold" />
          </button>
        </div>
      </header>

      {/* ================= 2. STADIUM OVAL FELT STAGE ================= */}
      <main className="bet888-stadium-stage">
        {/* TOP DEALER AREA WITH ARTWORK & CHIP TRAY (Section 16) */}
        <div className="bet888-dealer-section">
          <div className="dealer-avatar-wrapper">
            <div className="dealer-portrait-art">
              <span className="dealer-tie">♠</span>
            </div>
            <div className="dealer-name-tag">LIVE DEALER</div>
          </div>
          {/* Dealer Chip Tray */}
          <div className="dealer-chip-tray">
            <div className="tray-slot" />
            <div className="tray-slot" />
            <div className="tray-slot gold" />
            <div className="tray-slot" />
            <div className="tray-slot" />
          </div>
        </div>

        {/* THE OVAL FELT TABLE */}
        <div className="bet888-stadium-table">
          {/* Neon Rail & Rim Glow */}
          <div className="bet888-table-rail">
            {/* Deep Emerald Radial Felt */}
            <div className="bet888-table-felt">
              {/* Table Center Watermark */}
              <div className="felt-watermark">
                <span>BET888<b>CASH</b></span>
                <small>TEXAS HOLD&apos;EM LIVE</small>
              </div>

              {/* CENTRE BOARD: POT PILL + 5 COMMUNITY CARDS */}
              <div className="bet888-center-board">
                {/* Pot Pill */}
                <div className="board-pot-pill">
                  <span className="pot-chip-icon">🪙</span>
                  <span className="pot-label">POT</span>
                  <span className="pot-value">{pot.toLocaleString()}</span>
                  {stage !== "preflop" && (
                    <span className="stage-pill-tag">{stage.toUpperCase()}</span>
                  )}
                </div>

                {/* 5 Community Cards */}
                <div className="board-community-cards">
                  {board.map((card, idx) => {
                    const isWinning = isWinningCard(card);
                    const isDimmed = stage === "showdown" && winnerInfo && !winnerInfo.wonByFold && !isWinning;
                    return (
                      <div
                        key={idx}
                        className={`felt-card ${card.s === 1 || card.s === 2 ? "red-card" : "black-card"} ${isWinning ? "is-winning-card" : ""} ${isDimmed ? "is-dimmed" : ""}`}
                      >
                        <span className="card-rank">{rankLabel(card.r)}</span>
                        <span className="card-suit">{suitSymbol(card.s)}</span>
                      </div>
                    );
                  })}
                  {Array.from({ length: 5 - board.length }).map((_, emptyIdx) => (
                    <div key={emptyIdx} className="felt-card empty-card-slot" />
                  ))}
                </div>
              </div>

              {/* Winner spotlight is displayed directly on the winning seat (Image 3) */}

              {/* SEATS DISTRIBUTED AROUND THE TABLE (Super-ellipse) */}
              <div className="bet888-seats-layer">
                {players.map((p, idx) => {
                  const n = players.length;
                  // Geometric angle: Hero is at bottom-center (Seat 0)
                  const angle = (Math.PI / 2) + ((idx / n) * 2 * Math.PI);
                  const x = 50 + 41 * Math.cos(angle);
                  const y = p.isHero ? 79.5 : (50 + 33 * Math.sin(angle));

                  const isTurn = activeSeat === p.seatNo && stage !== "showdown";
                  const isWinner = stage === "showdown" && winnerInfo?.winnerSeatNo === p.seatNo;
                  // Timer ring color based on actionTimeLeft
                  const timerColor =
                    actionTimeLeft > 10 ? "#e9b95a" : actionTimeLeft > 5 ? "#f39c12" : "#e74c3c";

                  return (
                    <div
                      key={p.seatNo}
                      className={`seat-container ${p.isHero && !operatorMode ? "hero-seat" : "opponent-seat"} ${p.folded ? "is-folded" : ""} ${isWinner ? "is-winner" : ""}`}
                      style={{ left: `${x}%`, top: `${y}%` }}
                    >
                      {isWinner ? (
                        /* ================= ZYNGA-STYLE POKER WINNER SPOTLIGHT ================= */
                        <div className="poker-winner-spotlight">
                          {/* Fanned Hole Cards on left behind avatar */}
                          <div className="winner-fanned-cards">
                            {(p.cards || []).filter(Boolean).map((c, cIdx) => (
                              <div
                                key={cIdx}
                                className={`winner-fanned-card card-${cIdx} ${c.s === 1 || c.s === 2 ? "red-card" : "black-card"}`}
                              >
                                <div className="w-card-corner">
                                  <span className="w-card-rank">{rankLabel(c.r)}</span>
                                  <span className="w-card-suit">{suitSymbol(c.s)}</span>
                                </div>
                                <span className="w-card-center-suit">{suitSymbol(c.s)}</span>
                              </div>
                            ))}
                          </div>

                          {/* Glowing Circular Avatar Disc */}
                          <div className="winner-avatar-disc">
                            {/* Golden Royal Crown tilted on top-left of the avatar */}
                            <div className="winner-crown-wrapper">
                              <svg className="winner-crown-svg" viewBox="0 0 64 48" width={48} height={36}>
                                <defs>
                                  <linearGradient id={`crownGoldGrad-${p.seatNo}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#fff89a" />
                                    <stop offset="35%" stopColor="#ffd214" />
                                    <stop offset="70%" stopColor="#f39c12" />
                                    <stop offset="100%" stopColor="#b76e00" />
                                  </linearGradient>
                                  <filter id={`crownGlow-${p.seatNo}`} x="-20%" y="-20%" width="140%" height="140%">
                                    <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000" floodOpacity="0.75" />
                                  </filter>
                                </defs>
                                <g filter={`url(#crownGlow-${p.seatNo})`}>
                                  <path
                                    d="M7 36 L11 16 L24 26 L32 7 L40 26 L53 16 L57 36 Z"
                                    fill={`url(#crownGoldGrad-${p.seatNo})`}
                                    stroke="#8a4f00"
                                    strokeWidth="1.2"
                                  />
                                  <rect x="7" y="36" width="50" height="7" rx="2" fill={`url(#crownGoldGrad-${p.seatNo})`} stroke="#8a4f00" strokeWidth="1" />
                                  <circle cx="32" cy="7" r="3.2" fill="#e74c3c" stroke="#fff" strokeWidth="0.8" />
                                  <circle cx="11" cy="16" r="2.8" fill="#e74c3c" stroke="#fff" strokeWidth="0.8" />
                                  <circle cx="53" cy="16" r="2.8" fill="#e74c3c" stroke="#fff" strokeWidth="0.8" />
                                  <polygon points="32,19 35,24 32,29 29,24" fill="#e74c3c" stroke="#ffeaa7" strokeWidth="0.5" />
                                  <circle cx="19" cy="39.5" r="2" fill="#2ecc71" stroke="#fff" strokeWidth="0.4" />
                                  <circle cx="32" cy="39.5" r="2.3" fill="#e74c3c" stroke="#fff" strokeWidth="0.4" />
                                  <circle cx="45" cy="39.5" r="2" fill="#3498db" stroke="#fff" strokeWidth="0.4" />
                                </g>
                              </svg>
                            </div>

                            {/* Sparkling stars orbiting the ring */}
                            <span className="winner-star star-1">★</span>
                            <span className="winner-star star-2">✦</span>
                            <span className="winner-star star-3">★</span>
                            <span className="winner-star star-4">✦</span>

                            {/* Inner Avatar Portrait */}
                            <div className="winner-avatar-portrait" style={{ background: p.avatarColor }}>
                              {p.name.slice(0, 2).toUpperCase()}
                            </div>

                            {/* WINNER text stamped across avatar */}
                            <div className="winner-stamp-overlay">
                              <svg viewBox="0 0 100 32" className="winner-stamp-svg">
                                <defs>
                                  <linearGradient id={`winnerTxtGrad-${p.seatNo}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#fff875" />
                                    <stop offset="50%" stopColor="#ffc700" />
                                    <stop offset="100%" stopColor="#ff8c00" />
                                  </linearGradient>
                                  <filter id={`winnerTxtShadow-${p.seatNo}`} x="-10%" y="-10%" width="120%" height="120%">
                                    <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#000" floodOpacity="0.9" />
                                  </filter>
                                </defs>
                                <text
                                  x="50"
                                  y="24"
                                  textAnchor="middle"
                                  filter={`url(#winnerTxtShadow-${p.seatNo})`}
                                  fontFamily="'Impact', 'Arial Black', sans-serif"
                                  fontSize="22"
                                  fontWeight="900"
                                  letterSpacing="0.8"
                                  stroke="#c0392b"
                                  strokeWidth="3.2"
                                  paintOrder="stroke fill"
                                  fill={`url(#winnerTxtGrad-${p.seatNo})`}
                                >
                                  WINNER
                                </text>
                              </svg>
                            </div>
                          </div>

                          {/* Chip Stack Pill below avatar */}
                          <div className="winner-chips-pill">
                            <div className="winner-green-chip">
                              <span>$</span>
                            </div>
                            <span className="winner-chip-value">{(winnerInfo?.potWon || pot || 0).toLocaleString()}</span>
                          </div>

                          {/* Hand rank badge below chips */}
                          <div className="winner-hand-rank-badge">
                            {winnerInfo?.wonByFold ? "Won by all folds" : winnerInfo?.handRankName || "Winner"}
                          </div>
                        </div>
                      ) : (
                        /* ================= REGULAR SEAT RENDERING ================= */
                        <>
                          {/* Player Bet Chips on Table */}
                          {p.bet > 0 && (
                            <div className="seat-bet-chips">
                              <span className="bet-coin">🪙</span>
                              <span className="bet-amt">{p.bet.toLocaleString()}</span>
                            </div>
                          )}

                          {/* Card Backs or Showdown Cards */}
                          {(!p.isHero || operatorMode) && !p.folded && (
                            stage === "showdown" ? (
                              <div className="opponent-showdown-cards">
                                {p.cards.map((c, cIdx) => {
                                  const isWinning = isWinningCard(c);
                                  const isDimmed = stage === "showdown" && winnerInfo && !winnerInfo.wonByFold && !isWinning;
                                  return (
                                    <div
                                      key={cIdx}
                                      className={`opp-card-face ${c.s === 1 || c.s === 2 ? "red-card" : "black-card"} ${isWinning ? "is-winning-card" : ""} ${isDimmed ? "is-dimmed" : ""}`}
                                    >
                                      <span className="c-rank">{rankLabel(c.r)}</span>
                                      <span className="c-suit">{suitSymbol(c.s)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="opponent-card-backs">
                                <div className="opp-card c-left" />
                                <div className="opp-card c-right" />
                              </div>
                            )
                          )}

                          {/* Hero Face-Up Cards with Live Hand Rank Indicator */}
                          {p.isHero && !operatorMode && !p.folded && (
                            <div className="hero-hole-cards-display">
                              {p.cards.map((c, cIdx) => {
                                const isWinning = isWinningCard(c);
                                const isDimmed = stage === "showdown" && winnerInfo && !winnerInfo.wonByFold && !isWinning;
                                return (
                                  <div
                                    key={cIdx}
                                    className={`hero-card-face ${c.s === 1 || c.s === 2 ? "red-card" : "black-card"} ${isWinning ? "is-winning-card" : ""} ${isDimmed ? "is-dimmed" : ""}`}
                                  >
                                    <span className="c-rank">{rankLabel(c.r)}</span>
                                    <span className="c-suit">{suitSymbol(c.s)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Player Seat Pill with Gold Ring & Timer */}
                          <div className={`seat-pill ${isTurn ? "is-active-turn" : ""}`}>
                            {/* Avatar with Turn Countdown Ring */}
                            <div className="seat-avatar-box">
                              {isTurn && (
                                <svg
                                  className="timer-svg-ring"
                                  viewBox="0 0 44 44"
                                  width={44}
                                  height={44}
                                  style={{
                                    position: "absolute",
                                    inset: -5,
                                    width: 44,
                                    height: 44,
                                    transform: "rotate(-90deg)",
                                    pointerEvents: "none",
                                  }}
                                >
                                  <circle
                                    cx="22"
                                    cy="22"
                                    r="20"
                                    fill="none"
                                    stroke={timerColor}
                                    strokeWidth="3"
                                    strokeDasharray={125.6}
                                    strokeDashoffset={125.6 * (1 - actionTimeLeft / 20)}
                                  />
                                </svg>
                              )}
                              <div className="seat-avatar-inner" style={{ background: p.avatarColor }}>
                                {p.name.slice(0, 2).toUpperCase()}
                              </div>
                            </div>

                            {/* Name & Stack */}
                            <div className="seat-meta">
                              <span className="seat-name">{p.name}</span>
                              <span className="seat-stack">{p.stack.toLocaleString()}</span>
                            </div>
                          </div>

                          {/* Hand Rank under Seat Pill (only in player mode) */}
                          {p.isHero && !operatorMode && !p.folded && (
                            <div className="hero-hand-rank-pill">
                              <span>{heroHandName}</span>
                            </div>
                          )}

                          {/* Opponent Showdown Hand Rank Pill */}
                          {!p.isHero && !p.folded && stage === "showdown" && (
                            <div className="showdown-hand-rank-pill">
                              <span>{getShowdownHandName(p)}</span>
                            </div>
                          )}

                          {/* Last Action Tag below pill */}
                          {p.lastAction && (
                            <div className={`seat-action-tag ${p.lastAction.startsWith("FOLD") ? "tag-fold" : "tag-active"}`}>
                              {p.lastAction}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ================= 3. BOTTOM ACTION BAR ================= */}
      <footer className={`bet888-table-actionbar ${stage === "showdown" ? "is-showdown" : ""}`}>
        {isUserBlocked && (
          <div
            style={{
              background: "linear-gradient(135deg, rgba(220, 38, 38, 0.95), rgba(185, 28, 28, 0.95))",
              color: "#fff",
              padding: "7px 16px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 800,
              textAlign: "center",
              marginBottom: 8,
              width: "100%",
              boxShadow: "0 4px 15px rgba(0,0,0,0.5)",
            }}
          >
            🚫 Gaming Restricted: Your poker privileges have been restricted by the administrator. Real-money actions are disabled.
          </div>
        )}
        {isTablePaused && !isUserBlocked && (
          <div
            style={{
              background: "linear-gradient(135deg, rgba(217, 119, 6, 0.95), rgba(180, 83, 9, 0.95))",
              color: "#fff",
              padding: "7px 16px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 800,
              textAlign: "center",
              marginBottom: 8,
              width: "100%",
              boxShadow: "0 4px 15px rgba(0,0,0,0.5)",
            }}
          >
            ⏸ Table Paused: Live play has been temporarily paused by the poker room supervisor.
          </div>
        )}

        {operatorMode ? (
          <div
            className="operator-broadcast-bar"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 16px",
              background: "rgba(10, 15, 30, 0.95)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 10,
              backdropFilter: "blur(8px)",
              gap: 12,
              width: "100%",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#10b981",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  padding: "4px 8px",
                  borderRadius: 12,
                  fontSize: 10,
                  fontWeight: 800,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  letterSpacing: 0.5,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
                OPERATOR SUPERVISOR
              </span>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>
                Stage: <b style={{ color: "#fff", textTransform: "uppercase" }}>{stage}</b> · Pot: <b style={{ color: "#f6bd49" }}>€{pot}</b> · Hand #{handNo}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                type="button"
                onClick={() => {
                  const nextPaused = !isTablePaused;
                  setIsTablePaused(nextPaused);
                  sendLivePokerCommand({
                    tableId: table.id,
                    action: nextPaused ? "pause" : "resume",
                  });
                  apiClient.admin.poker.updateTable(table.id, {
                    status: nextPaused ? "paused" : "open",
                  }).catch(() => {});
                }}
                style={{
                  background: isTablePaused ? "#16a34a" : "rgba(245, 158, 11, 0.2)",
                  border: `1px solid ${isTablePaused ? "#22c55e" : "#f59e0b"}`,
                  color: isTablePaused ? "#fff" : "#fbbf24",
                  padding: "6px 12px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {isTablePaused ? "▶ Resume Table" : "⏸ Pause Table"}
              </button>

              <button
                type="button"
                onClick={advanceStreet}
                style={{
                  background: "#4f46e5",
                  border: "1px solid #6366f1",
                  color: "#fff",
                  padding: "6px 14px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Deal Next Street ({stage === "preflop" ? "Flop" : stage === "flop" ? "Turn" : stage === "turn" ? "River" : "Showdown"}) →
              </button>

              <button
                type="button"
                onClick={handleDealNextHand}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#e2e8f0",
                  padding: "6px 12px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Re-deal Hand
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Action Buttons: FOLD (black), CHECK/CALL (gold outline), BET/RAISE (red), ALL-IN (green) */}
            <div className="action-buttons-group">
              <button
                className="action-btn fold-btn"
                onClick={() => handleHeroAction("fold")}
                disabled={isUserBlocked || isTablePaused || hero.folded || activeSeat !== 0 || stage === "showdown"}
                title="Desktop shortcut: F"
              >
                <span style={{ opacity: 0.65, fontSize: "11px", marginRight: "3px" }}>[F]</span> FOLD
              </button>

              {canCheck ? (
                <button
                  className="action-btn check-btn"
                  onClick={() => handleHeroAction("check")}
                  disabled={isUserBlocked || isTablePaused || hero.folded || activeSeat !== 0 || stage === "showdown"}
                  title="Desktop shortcut: C"
                >
                  <span style={{ opacity: 0.65, fontSize: "11px", marginRight: "3px" }}>[C]</span> CHECK
                </button>
              ) : (
                <button
                  className="action-btn call-btn"
                  onClick={() => handleHeroAction("call")}
                  disabled={isUserBlocked || isTablePaused || hero.folded || activeSeat !== 0 || hero.stack === 0 || stage === "showdown"}
                  title="Desktop shortcut: C"
                >
                  <span style={{ opacity: 0.65, fontSize: "11px", marginRight: "3px" }}>[C]</span> CALL {toCall.toLocaleString()}
                </button>
              )}

              <button
                className="action-btn bet-btn"
                onClick={() => handleHeroAction("raise")}
                disabled={isUserBlocked || isTablePaused || hero.folded || activeSeat !== 0 || hero.stack <= toCall || stage === "showdown"}
                title="Desktop shortcut: R"
              >
                <span style={{ opacity: 0.65, fontSize: "11px", marginRight: "3px" }}>[R]</span> {currentBet === 0 ? "BET" : "RAISE"} {raiseAmount.toLocaleString()}
              </button>

              <button
                className="action-btn allin-btn"
                onClick={() => handleHeroAction("allin")}
                disabled={isUserBlocked || isTablePaused || hero.folded || activeSeat !== 0 || hero.stack === 0 || stage === "showdown"}
              >
                ALL-IN {hero.stack.toLocaleString()}
              </button>
            </div>

            {/* Bet Sizing Slider with -, +, Amount, ½ POT and POT presets */}
            <div className="bet-slider-group">
              <button
                className="slider-step-btn"
                onClick={() => setRaiseAmount((prev) => Math.max(table.bb, prev - table.bb))}
                disabled={stage === "showdown"}
              >
                −
              </button>

              <div className="slider-range-box">
                <input
                  type="range"
                  min={Math.max(table.bb, toCall + table.bb)}
                  max={hero.stack}
                  step={table.bb}
                  value={raiseAmount}
                  onChange={(e) => setRaiseAmount(Number(e.target.value))}
                  disabled={stage === "showdown"}
                />
                <span className="slider-amount-indicator">
                  🪙 {raiseAmount.toLocaleString()}
                </span>
              </div>

              <button
                className="slider-step-btn"
                onClick={() => setRaiseAmount((prev) => Math.min(hero.stack, prev + table.bb))}
                disabled={stage === "showdown"}
              >
                +
              </button>

              <button
                className="slider-preset-chip"
                onClick={() => setRaiseAmount(Math.min(hero.stack, Math.max(table.bb, Math.floor(pot / 2))))}
                disabled={stage === "showdown"}
              >
                ½ POT
              </button>

              <button
                className="slider-preset-chip"
                onClick={() => setRaiseAmount(Math.min(hero.stack, Math.max(table.bb, pot)))}
                disabled={stage === "showdown"}
              >
                POT
              </button>
            </div>
          </>
        )}
      </footer>

      {/* ================= 4. TABLE MENU DRAWER ================= */}
      {menuOpen && (
        <div className="bet888-drawer-backdrop" onClick={() => setMenuOpen(false)}>
          <div className="bet888-table-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="poker-drawer-header">
              <h3>{table.name}</h3>
              <button className="drawer-close-btn" onClick={() => setMenuOpen(false)}>×</button>
            </div>

            <div className="drawer-body">
              <div className="drawer-wallet-box">
                <span className="lbl">WALLET BALANCE</span>
                <span className="val">€{currentWallet.toLocaleString()}</span>
              </div>

              {table.isPrivate && table.inviteCode && (
                <div className="drawer-invite-card">
                  <span className="lbl">INVITE CODE</span>
                  <div className="invite-val-row">
                    <b>{table.inviteCode}</b>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(table.inviteCode!);
                        alert("Code copied!");
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              <div className="drawer-links-list">
                <button
                  className="drawer-action-btn primary"
                  onClick={() => {
                    onLeaveTable(hero.stack);
                  }}
                >
                  🚪 Return to Lobby
                </button>
                <button
                  className="drawer-action-btn"
                  onClick={() => {
                    handleHeroAction("fold");
                    alert("You will sit out at the end of this hand.");
                  }}
                >
                  Stand Up / Leave Seat
                </button>
                <button
                  className="drawer-action-btn"
                  onClick={() => {
                    setHistoryOpen(true);
                    setMenuOpen(false);
                  }}
                >
                  📜 Hand History
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= 5. TABLE CHAT DRAWER ================= */}
      {chatOpen && (
        <div className="bet888-drawer-backdrop" onClick={() => setChatOpen(false)}>
          <div className="bet888-chat-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="poker-drawer-header">
              <h3>Table Chat</h3>
              <button className="drawer-close-btn" onClick={() => setChatOpen(false)}>×</button>
            </div>
            <div className="chat-messages-container">
              {chatLogs.map((msg, i) => (
                <div key={i} className={`chat-line ${msg.from === userName ? "hero-msg" : ""}`}>
                  <b>{msg.from}:</b> <span>{msg.text}</span>
                  <small>{msg.time}</small>
                </div>
              ))}
            </div>
            <form className="chat-input-form" onSubmit={handleSendChat}>
              <input
                placeholder="Type a message…"
                value={chatMsg}
                onChange={(e) => setChatMsg(e.target.value)}
                maxLength={200}
              />
              <button type="submit">Send</button>
            </form>
          </div>
        </div>
      )}

      {/* ================= 6. HAND HISTORY MODAL ================= */}
      {historyOpen && (
        <div className="bet888-drawer-backdrop" onClick={() => setHistoryOpen(false)}>
          <div className="bet888-history-modal" onClick={(e) => e.stopPropagation()}>
            <div className="poker-drawer-header">
              <h3>Hand #{handNo} History</h3>
              <button className="drawer-close-btn" onClick={() => setHistoryOpen(false)}>×</button>
            </div>
            <div className="history-modal-body">
              <p>Table: <b>{table.name}</b> · Commission: <b>{table.feeLabel}</b></p>
              <div className="history-hand-details">
                <div className="h-row">
                  <span>Pre-flop:</span>
                  <span>Small Blind ({table.sb}), Big Blind ({table.bb}) posted blinds.</span>
                </div>
                <div className="h-row">
                  <span>Flop:</span>
                  <span>A♠ K♥ Q♠ · Pot reached {pot}</span>
                </div>
                <div className="h-row">
                  <span>Commission:</span>
                  <span>
                    {table.feeType === "RAKE"
                      ? `${Math.min(50, Math.floor(pot * 0.05))} chips (5% No-Flop-No-Drop)`
                      : table.feeLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Bet888LiveTable;
