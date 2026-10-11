"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import "./poker.css";
import { Bet888TableSummary, CardModel } from "./poker-types";
import { bestHand, buildDeck, cardStr, parseCard, shuffle, VARIANTS } from "./poker-engine";
import { Gear, SpeakerHigh, SpeakerSimpleSlash, ChatCircleDots, List } from "@phosphor-icons/react";
import { apiClient, type WalletTransaction } from "../api-client";
import { subscribeLivePokerCommand } from "./poker-tables-store";

interface TableSeatPlayer {
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

interface Bet888LiveTableProps {
  table: Bet888TableSummary;
  onLeaveTable: (cashedOutStack?: number) => void;
  walletBalance: number;
  userName?: string;
  embedded?: boolean;
  onDeductBuyIn?: (amount: number) => void;
  onCreditCashOut?: (amount: number) => void;
  isUserBlocked?: boolean;
  onWalletChange?: (newBalance: number) => void;
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

function initializeTableState(table: Bet888TableSummary, walletBalance: number, userName: string) {
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

  const board: CardModel[] = staged.slice(0, 3);

  const bb = table.bb || 2;
  const sb = table.sb || 1;
  const pot = Math.round((sb + bb) * (2 + (absSeed % 3)));
  const currentBet = bb;

  const minBuyIn = table.minBuyIn || bb * 20;
  const heroInitialStack =
    walletBalance > 0
      ? Math.min(walletBalance, Math.max(minBuyIn, bb * 100))
      : Math.max(minBuyIn, bb * 100);

  const heroCards: CardModel[] = [
    deck.pop() || { r: 14, s: 0 },
    deck.pop() || { r: 11, s: 1 },
  ];

  const players: TableSeatPlayer[] = [];
  players.push({
    seatNo: 0,
    name: userName,
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
      bet: i === 0 ? currentBet : 0,
      folded: i === 3,
      allIn: false,
      cards: [c1, c2],
      lastAction: i === 0 ? `BET ${currentBet}` : i === 3 ? "FOLD" : "CALL",
    });
  }

  return {
    handNo,
    staged,
    board,
    pot,
    currentBet,
    players,
  };
}

export function Bet888LiveTable({
  table,
  onLeaveTable,
  walletBalance,
  userName = "You",
  embedded = false,
  onDeductBuyIn,
  onCreditCashOut,
  isUserBlocked = false,
  onWalletChange,
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

  // Initialize unique game session for this table
  const initialDataRef = useRef<ReturnType<typeof initializeTableState> | null>(null);
  if (!initialDataRef.current) {
    initialDataRef.current = initializeTableState(table, walletBalance, userName);
  }
  const init = initialDataRef.current;

  // Game session & state
  const [handNo, setHandNo] = useState(init.handNo);
  const [stage, setStage] = useState<"preflop" | "flop" | "turn" | "river" | "showdown">("flop");
  const [board, setBoard] = useState<CardModel[]>(init.board);
  const [pot, setPot] = useState(init.pot);
  const [currentBet, setCurrentBet] = useState(init.currentBet);
  const [activeSeat, setActiveSeat] = useState<number>(0); // 0 is Hero
  const [actionTimeLeft, setActionTimeLeft] = useState(20);
  const [heroHandName, setHeroHandName] = useState("One pair");
  const [soundMuted, setSoundMuted] = useState(false);
  const [isTablePaused, setIsTablePaused] = useState(table.status === "paused");
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

  // Calculate live hand evaluation for Hero
  useEffect(() => {
    const hero = players.find((p) => p.isHero);
    if (!hero || hero.folded || hero.cards.length < 2) return;
    if (board.length >= 3) {
      try {
        const res = bestHand(hero.cards, board, VARIANTS.NLH);
        if (res && res.name) {
          setHeroHandName(res.name);
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
          return 20;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeSeat, currentBet, stage, isTablePaused, isUserBlocked]);

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
              kick: 0,
              cards: p.cards,
              name: "High card",
            },
          };
        }
      });

      // Sort by score descending
      evaluated.sort((a, b) => b.result.score - a.result.score);
      const best = evaluated[0];

      const info: HandWinnerInfo = {
        winnerSeatNo: best.player.seatNo,
        winnerName: best.player.name,
        isHero: best.player.isHero,
        potWon: currentPot,
        handRankName: best.result.name,
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
    setActionTimeLeft(20);
  }, [stage, players, pot, evaluateShowdown]);

  // Listen for Live Commands from Admin Backoffice
  useEffect(() => {
    const unsub = subscribeLivePokerCommand((cmd) => {
      const match =
        !cmd.tableId ||
        cmd.tableId === "all" ||
        cmd.tableId === table.id ||
        (table.inviteCode && cmd.tableId === table.inviteCode);
      if (!match) return;

      if (cmd.action === "pause") {
        setIsTablePaused(true);
      } else if (cmd.action === "resume") {
        setIsTablePaused(false);
      } else if (cmd.action === "next_street") {
        advanceStreet();
      } else if (cmd.action === "reset_hand") {
        handleDealNextHand();
      } else if (cmd.action === "set_pot" && typeof cmd.pot === "number") {
        setPot(cmd.pot);
      }
    });
    return unsub;
  }, [table.id, table.inviteCode, advanceStreet, handleDealNextHand]);

  const advanceTurn = useCallback(() => {
    if (stage === "showdown") return;
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
      setActionTimeLeft(20);
    }
  }, [activeSeat, players, pot, stage, advanceStreet, triggerWinByFold]);

  // Bot automation turns
  useEffect(() => {
    if (stage === "showdown") return;
    if (activeSeat === 0) {
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
      return res?.name || "";
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
                      className={`seat-container ${p.isHero ? "hero-seat" : "opponent-seat"} ${p.folded ? "is-folded" : ""} ${isWinner ? "is-winner" : ""}`}
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

                          {/* Opponents' Red Card Backs or Showdown Cards */}
                          {!p.isHero && !p.folded && (
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
                          {p.isHero && !p.folded && (
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

                          {/* Hand Rank under Seat Pill */}
                          {p.isHero && !p.folded && (
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

        {/* Action Buttons: FOLD (black), CHECK/CALL (gold outline), BET/RAISE (red), ALL-IN (green) */}
        <div className="action-buttons-group">
          <button
            className="action-btn fold-btn"
            onClick={() => handleHeroAction("fold")}
            disabled={isUserBlocked || isTablePaused || hero.folded || activeSeat !== 0 || stage === "showdown"}
          >
            FOLD
          </button>

          {canCheck ? (
            <button
              className="action-btn check-btn"
              onClick={() => handleHeroAction("check")}
              disabled={isUserBlocked || isTablePaused || hero.folded || activeSeat !== 0 || stage === "showdown"}
            >
              CHECK
            </button>
          ) : (
            <button
              className="action-btn call-btn"
              onClick={() => handleHeroAction("call")}
              disabled={isUserBlocked || isTablePaused || hero.folded || activeSeat !== 0 || hero.stack === 0 || stage === "showdown"}
            >
              CALL {toCall.toLocaleString()}
            </button>
          )}

          <button
            className="action-btn bet-btn"
            onClick={() => handleHeroAction("raise")}
            disabled={isUserBlocked || isTablePaused || hero.folded || activeSeat !== 0 || hero.stack <= toCall || stage === "showdown"}
          >
            {currentBet === 0 ? "BET" : "RAISE"} {raiseAmount.toLocaleString()}
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
