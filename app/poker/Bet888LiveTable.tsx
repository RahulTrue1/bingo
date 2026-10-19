"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import "./poker.css";
import {
  Gear,
  SpeakerHigh,
  SpeakerSimpleSlash,
  ChatCircleDots,
  List,
  Sparkle,
  Plus,
  Coins,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { pokerSocketService } from "./poker-socket-service";
import type {
  PokerCard,
  PokerLiveState,
  PokerSeatPlayer,
  PokerChatMessage,
} from "./poker-live-types";

export interface TableSeatPlayer {
  seatNo: number;
  name: string;
  avatarColor?: string;
  isHero?: boolean;
  stack: number;
  bet: number;
  folded: boolean;
  allIn: boolean;
  cards: Array<{ r: number; s: any }>;
  lastAction: string;
}

export interface LiveTableTelemetry {
  stage: string;
  pot: number;
  currentBet: number;
  activeSeat: number;
  players: TableSeatPlayer[];
  board: any[];
  handNo: number;
  isTablePaused: boolean;
}

export function suitSymbol(s: number | string): string {
  if (typeof s === "number") {
    return ["♠", "♥", "♦", "♣"][s] || "♠";
  }
  const norm = String(s).toLowerCase();
  if (norm === "h" || norm === "♥") return "♥";
  if (norm === "d" || norm === "♦") return "♦";
  if (norm === "c" || norm === "♣") return "♣";
  return "♠";
}

export interface Bet888LiveTableProps {
  table: {
    id: number | string;
    name?: string;
    inviteCode?: string;
    sb?: number;
    bb?: number;
    minBuyIn?: number;
    maxBuyIn?: number;
    maxSeats?: number;
    feeType?: string;
    [key: string]: any;
  };
  onLeaveTable?: (cashedOutStack?: number) => void;
  walletBalance?: number;
  userName?: string;
  embedded?: boolean;
  operatorMode?: boolean;
  isUserBlocked?: boolean;
  onWalletChange?: (newBalance: number) => void;
  onTableStateChange?: (state: LiveTableTelemetry) => void;
  allowBots?: boolean;
}

// Convert rank number to human-readable label
export function rankLabel(r: number): string {
  if (r === 14) return "A";
  if (r === 13) return "K";
  if (r === 12) return "Q";
  if (r === 11) return "J";
  if (r === 10) return "10";
  return String(r);
}

// Convert suit code to symbol and color class
export function suitMeta(s: string): { symbol: string; colorClass: string; isRed: boolean } {
  const norm = (s || "").toLowerCase();
  if (norm === "h" || norm === "♥") return { symbol: "♥", colorClass: "suit-heart font-red", isRed: true };
  if (norm === "d" || norm === "♦") return { symbol: "♦", colorClass: "suit-diamond font-red", isRed: true };
  if (norm === "c" || norm === "♣") return { symbol: "♣", colorClass: "suit-club font-green", isRed: false };
  return { symbol: "♠", colorClass: "suit-spade font-dark", isRed: false };
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

  playTurn() {
    if (this.muted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
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

export function CasinoChipStack({ amount, size = "md" }: { amount: number; size?: "sm" | "md" | "lg" }) {
  if (amount <= 0) return null;

  let chipClass = "chip-1";
  if (amount >= 5000) chipClass = "chip-5k";
  else if (amount >= 1000) chipClass = "chip-1k";
  else if (amount >= 500) chipClass = "chip-500";
  else if (amount >= 100) chipClass = "chip-100";
  else if (amount >= 25) chipClass = "chip-25";
  else if (amount >= 5) chipClass = "chip-5";

  const layerCount = amount >= 500 ? 3 : amount >= 50 ? 2 : 1;

  return (
    <div className={`poker-chip-stack-wrapper size-${size}`}>
      <div className="poker-chips-visual">
        {Array.from({ length: layerCount }).map((_, i) => (
          <div key={i} className={`single-chip-disc chip-layer-${i} ${chipClass}`} />
        ))}
      </div>
      <span className="poker-chip-amount">{amount.toLocaleString()}</span>
    </div>
  );
}

export function Bet888LiveTable({
  table,
  onLeaveTable,
  walletBalance = 1000,
  userName = "Player",
  isUserBlocked = false,
  onWalletChange,
}: Bet888LiveTableProps) {
  const numericTableId = typeof table.id === "number" ? table.id : parseInt(String(table.id).replace(/\D/g, ""), 10) || 1;
  const inviteCode = table.inviteCode || "";

  // Authoritative server state
  const [gameState, setGameState] = useState<PokerLiveState | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  // Sound & Chat
  const [muted, setMuted] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<PokerChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Buy-in Modal (when clicking "+ SIT")
  const [buyInSeat, setBuyInSeat] = useState<number | null>(null);
  const [buyInAmount, setBuyInAmount] = useState<number>(table.minBuyIn || 20);

  // Topup Modal
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState<number>(50);

  // Raise slider state
  const [raiseSliderVal, setRaiseSliderVal] = useState<number>(0);

  // Hand history log drawer
  const [logOpen, setLogOpen] = useState(false);

  // Turn sound trigger tracking
  const prevCurrentRef = useRef<number | null>(null);

  // Connect to Socket and Join Table
  useEffect(() => {
    pokerSocketService.connect();
    setSocketConnected(pokerSocketService.isConnected());

    // Join table over socket
    pokerSocketService.joinTable(numericTableId, inviteCode).then((res) => {
      if (res.errors && res.errors.length > 0) {
        setErrorMessage(res.errors[0].message || res.errors[0].code);
      }
    });

    // Subscribe to state updates
    const unsubState = pokerSocketService.onState(numericTableId, (state) => {
      setGameState(state);
      setActionBusy(false);

      // Play turn sound when it becomes hero's turn
      if (state.me >= 0 && state.current === state.me && prevCurrentRef.current !== state.me) {
        audio.playTurn();
      }
      prevCurrentRef.current = state.current;

      // Set default raise slider value if actions available
      if (state.actions && state.actions.canRaise) {
        setRaiseSliderVal((prev) => {
          if (prev < state.actions!.minTo || prev > state.actions!.maxTo) {
            return state.actions!.minTo;
          }
          return prev;
        });
      }

      // Check for showdown win audio
      if (state.lastResult && state.lastResult.winners.some((w) => w.seat === state.me)) {
        audio.playWin();
      }
    });

    // Subscribe to wallet balance updates
    const unsubBalance = pokerSocketService.onBalance((newBal) => {
      onWalletChange?.(newBal);
    });

    // Subscribe to chat
    const unsubChat = pokerSocketService.onChat(numericTableId, (msg) => {
      setChatMessages((prev) => [...prev.slice(-49), msg]);
    });

    // Subscribe to error notifications
    const unsubError = pokerSocketService.onError((err) => {
      setErrorMessage(err.message || err.code);
      setActionBusy(false);
    });

    // Subscribe to table closed
    const unsubClosed = pokerSocketService.onClosed((closedEvt) => {
      if (closedEvt.tableId === numericTableId) {
        alert(`Table was closed (${closedEvt.reason === "empty" ? "Idle for 30 minutes" : "By administrator"}). Returning to lobby.`);
        onLeaveTable?.();
      }
    });

    return () => {
      unsubState();
      unsubBalance();
      unsubChat();
      unsubError();
      unsubClosed();
      pokerSocketService.leaveTable(numericTableId);
    };
  }, [numericTableId, inviteCode, onLeaveTable, onWalletChange]);

  // Handle Mute toggle
  const toggleMute = () => {
    audio.muted = !muted;
    setMuted(!muted);
  };

  // Auto-scroll chat
  useEffect(() => {
    if (chatOpen && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, chatOpen]);

  // Keyboard Shortcuts for Desktop: F = Fold, C = Check/Call, R = Raise
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (chatOpen || !gameState || gameState.me < 0 || gameState.current !== gameState.me) return;
      if (actionBusy || !gameState.actions) return;

      const key = e.key.toUpperCase();
      if (key === "F") {
        handleAction("fold");
      } else if (key === "C") {
        if (gameState.actions.canCheck) {
          handleAction("check");
        } else {
          handleAction("call");
        }
      } else if (key === "R") {
        if (gameState.actions.canRaise) {
          handleAction("raise", raiseSliderVal || gameState.actions.minTo);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState, actionBusy, chatOpen, raiseSliderVal]);

  // Dispatch Action Intent
  const handleAction = async (
    type: "fold" | "check" | "call" | "raise" | "allin",
    amount?: number
  ) => {
    if (!gameState || actionBusy) return;
    setActionBusy(true);
    setErrorMessage(null);
    audio.playChip();

    try {
      const res = await pokerSocketService.action(numericTableId, type, amount, gameState.handNo);
      if (res.errors && res.errors.length > 0) {
        setErrorMessage(res.errors[0].message || res.errors[0].code);
      }
    } catch (e: any) {
      setErrorMessage(e?.message || "Failed to submit action");
    } finally {
      // Small timeout safety in case state delay
      setTimeout(() => setActionBusy(false), 800);
    }
  };

  // Sit Down / Buy In
  const handleConfirmSit = async () => {
    if (buyInSeat === null || isUserBlocked) return;
    setActionBusy(true);
    setErrorMessage(null);
    audio.playChip();

    try {
      const res = await pokerSocketService.sit(numericTableId, buyInSeat, buyInAmount);
      if (res.errors && res.errors.length > 0) {
        setErrorMessage(res.errors[0].message || res.errors[0].code);
      } else {
        setBuyInSeat(null);
      }
    } catch (e: any) {
      setErrorMessage(e?.message || "Failed to sit down");
    } finally {
      setActionBusy(false);
    }
  };

  // Stand Up / Leave Seat
  const handleStand = async () => {
    if (!confirm("Are you sure you want to stand up? Your chips will return to your wallet.")) return;
    try {
      await pokerSocketService.stand(numericTableId);
    } catch (e: any) {
      setErrorMessage(e?.message || "Stand failed");
    }
  };

  // Sitout Toggle
  const handleToggleSitout = async () => {
    if (!gameState || gameState.me < 0) return;
    const isSittingOut = gameState.seats[gameState.me]?.sittingOut;
    try {
      if (isSittingOut) {
        await pokerSocketService.sitin(numericTableId);
      } else {
        await pokerSocketService.sitout(numericTableId);
      }
    } catch (e: any) {
      setErrorMessage(e?.message || "Sitout toggle failed");
    }
  };

  // Top Up Chips
  const handleConfirmTopup = async () => {
    try {
      await pokerSocketService.topup(numericTableId, topupAmount);
      setTopupOpen(false);
    } catch (e: any) {
      setErrorMessage(e?.message || "Top-up failed");
    }
  };

  // Send Chat Message
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    try {
      await pokerSocketService.sendChat(numericTableId, chatInput.trim());
      setChatInput("");
    } catch (e: any) {
      setErrorMessage(e?.message || "Chat failed");
    }
  };

  // Calculations for Seat Rotation: Hero always at bottom center (spec 7.4)
  const maxSeats = gameState?.maxSeats || table.maxSeats || 6;
  const heroSeatIndex = gameState ? gameState.me : -1;

  // Reorder seat indices so hero is at position 0 (bottom center)
  const rotatedSeats = useMemo(() => {
    const list: Array<{ seatIndex: number; seat: PokerSeatPlayer | null }> = [];
    const rotationOffset = heroSeatIndex >= 0 ? heroSeatIndex : 0;

    for (let i = 0; i < maxSeats; i++) {
      const actualIndex = (i + rotationOffset) % maxSeats;
      const seat = gameState?.seats[actualIndex] ?? null;
      list.push({ seatIndex: actualIndex, seat });
    }
    return list;
  }, [gameState?.seats, maxSeats, heroSeatIndex]);

  // Derived Pot calculation (Collected Pot + Bets from current street)
  const totalCurrentStreetBets = useMemo(() => {
    if (!gameState?.seats) return 0;
    return gameState.seats.reduce((sum, s) => sum + (s?.bet || 0), 0);
  }, [gameState?.seats]);

  const displayedTotalPot = (gameState?.pot || 0) + totalCurrentStreetBets;

  // Active turn timer calculation (percentage)
  const timerPct = useMemo(() => {
    if (!gameState || gameState.current < 0 || !gameState.actionMs) return 100;
    return Math.max(0, Math.min(100, (gameState.timeLeft / gameState.actionMs) * 100));
  }, [gameState?.timeLeft, gameState?.actionMs, gameState?.current]);

  const timerColor = timerPct < 25 ? "#ef4444" : timerPct < 50 ? "#f59e0b" : "#22c55e";

  // Raise preset calculations per Spec 7.3:
  // pot-sized raise-to = currentBet + potAfterCall
  // half-pot raise-to = currentBet + potAfterCall / 2
  const actions = gameState?.actions;
  const halfPotRaise = useMemo(() => {
    if (!actions) return 0;
    const val = actions.currentBet + Math.round(actions.potAfterCall / 2);
    return Math.min(actions.maxTo, Math.max(actions.minTo, val));
  }, [actions]);

  const fullPotRaise = useMemo(() => {
    if (!actions) return 0;
    const val = actions.currentBet + actions.potAfterCall;
    return Math.min(actions.maxTo, Math.max(actions.minTo, val));
  }, [actions]);

  return (
    <div className="poker-table-viewport">
      {/* ================= HUD TOP BAR ================= */}
      <header className="poker-table-topbar">
        <div className="topbar-left">
          <button
            className="topbar-btn back-btn"
            onClick={() => onLeaveTable?.()}
            title="Leave Table"
          >
            ← Lobby
          </button>
          <div className="table-hud-meta">
            <span className="table-hud-name">{gameState?.name || table.name || `Table #${numericTableId}`}</span>
            <span className="table-hud-blinds">
              BLINDS €{gameState?.sb ?? table.sb ?? 1}/€{gameState?.bb ?? table.bb ?? 2}
            </span>
            {gameState?.handNo ? (
              <span className="table-hud-round">ROUND #{gameState.handNo}</span>
            ) : null}
            {gameState?.inviteCode && (
              <span className="table-hud-code-badge" title="Private Table Invite Code">
                🔑 {gameState.inviteCode}
              </span>
            )}
            {gameState?.feeLabel && (
              <span className="table-hud-fee">{gameState.feeLabel}</span>
            )}
          </div>
        </div>

        <div className="topbar-right">
          <button
            className={`topbar-icon-btn ${muted ? "muted" : ""}`}
            onClick={toggleMute}
            title={muted ? "Unmute Audio" : "Mute Audio"}
          >
            {muted ? <SpeakerSimpleSlash size={20} /> : <SpeakerHigh size={20} />}
          </button>

          <button
            className={`topbar-icon-btn ${chatOpen ? "active" : ""}`}
            onClick={() => setChatOpen(!chatOpen)}
            title="Table Chat"
          >
            <ChatCircleDots size={20} />
          </button>

          <button
            className={`topbar-icon-btn ${logOpen ? "active" : ""}`}
            onClick={() => setLogOpen(!logOpen)}
            title="Hand Action Log"
          >
            <List size={20} />
          </button>

          {heroSeatIndex >= 0 && (
            <>
              <button
                className="topbar-btn topup-btn"
                onClick={() => {
                  const currentStack = gameState?.seats[heroSeatIndex]?.stack || 0;
                  const maxAllowed = Math.max(0, (gameState?.maxBuyIn || table.maxBuyIn || 200) - currentStack);
                  setTopupAmount(Math.min(maxAllowed, Math.max(10, (gameState?.bb || 2) * 20)));
                  setTopupOpen(true);
                }}
                title="Top-up Stack"
              >
                + Top-up
              </button>

              <button
                className="topbar-btn sitout-btn"
                onClick={handleToggleSitout}
                title={gameState?.seats[heroSeatIndex]?.sittingOut ? "Sit back in" : "Sit out next hand"}
              >
                {gameState?.seats[heroSeatIndex]?.sittingOut ? "Sit In" : "Sit Out"}
              </button>

              <button
                className="topbar-btn stand-btn"
                onClick={handleStand}
                title="Leave seat and cash out"
              >
                Stand
              </button>
            </>
          )}
        </div>
      </header>

      {/* Error / Warning Alert Banner */}
      {errorMessage && (
        <div className="poker-table-alert-banner">
          <span>⚠️ {errorMessage}</span>
          <button onClick={() => setErrorMessage(null)}>✕</button>
        </div>
      )}

      {/* Table Paused Overlay */}
      {gameState?.status === "paused" && (
        <div className="poker-table-paused-overlay">
          <div className="paused-badge">
            <span>⏸ TABLE PAUSED BY OPERATOR</span>
            <p>Finishing active hand. No further hands will be dealt while paused.</p>
          </div>
        </div>
      )}

      {/* ================= MAIN POKER FELT ARENA ================= */}
      <div className="poker-felt-arena">
        <div className="poker-stadium-outer">
          <div className="poker-stadium-rail">
            <div className="poker-stadium-felt felt-emerald">
              <div className="poker-felt-watermark">BET888 LIVE</div>

              {/* Center Community Area */}
              <div className="poker-felt-board-area">
                {/* Total Pot Pill */}
                <div className="poker-pot-display">
                  <span className="pot-label">TOTAL POT</span>
                  <div className="pot-amount-wrap">
                    <CasinoChipStack amount={displayedTotalPot} size="sm" />
                    <span className="pot-val">€{displayedTotalPot.toLocaleString()}</span>
                  </div>
                </div>

                {/* 5 Community Cards */}
                <div className="poker-community-cards">
                  {Array.from({ length: 5 }).map((_, cIdx) => {
                    const card: PokerCard | undefined = gameState?.board?.[cIdx];
                    if (!card) {
                      return (
                        <div key={cIdx} className="poker-card-slot empty">
                          <span className="card-slot-idx">{cIdx + 1}</span>
                        </div>
                      );
                    }
                    const meta = suitMeta(card.s);
                    // Check if this card is part of the showdown winning hand
                    const isWinningCard = gameState?.lastResult?.winners.some((w) =>
                      w.cards?.some((wc) => wc.r === card.r && wc.s === card.s)
                    );

                    return (
                      <div
                        key={cIdx}
                        className={`poker-live-card rank-${card.r} suit-${card.s} ${meta.colorClass} ${
                          isWinningCard ? "highlight-winner-card" : ""
                        }`}
                      >
                        <div className="card-corner top-left">
                          <span className="card-rank">{rankLabel(card.r)}</span>
                          <span className="card-suit">{meta.symbol}</span>
                        </div>
                        <div className="card-center-suit">{meta.symbol}</div>
                        <div className="card-corner bottom-right">
                          <span className="card-rank">{rankLabel(card.r)}</span>
                          <span className="card-suit">{meta.symbol}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Stage Indicator: Preflop, Flop, Turn, River, Showdown */}
                {gameState && (
                  <div className="poker-stage-badge">
                    <span>{gameState.stage.toUpperCase()}</span>
                  </div>
                )}
              </div>

              {/* Showdown Result Banner */}
              {gameState?.lastResult && (
                <div className="poker-showdown-banner animate-fade-in">
                  <div className="showdown-winner-title">
                    🏆 {gameState.lastResult.winners.map((w) => w.username).join(", ")} Won!
                  </div>
                  {gameState.lastResult.winners[0]?.handName && (
                    <div className="showdown-hand-name">
                      {gameState.lastResult.winners[0].handName}
                    </div>
                  )}
                  {gameState.lastResult.rake > 0 && (
                    <div className="showdown-rake">
                      Rake: €{gameState.lastResult.rake.toFixed(2)}
                    </div>
                  )}
                </div>
              )}

              {/* Dynamic Seats around the Oval Table */}
              {rotatedSeats.map(({ seatIndex, seat }, visualIdx) => {
                const angle = (visualIdx / maxSeats) * 2 * Math.PI + Math.PI / 2;
                // Oval coordinates
                const x = 50 + 42 * Math.cos(angle);
                const y = 50 + 38 * Math.sin(angle);

                const isHero = seatIndex === heroSeatIndex;
                const isCurrentTurn = gameState?.current === seatIndex;
                const isDealer = gameState?.dealer === seatIndex;
                const isSB = gameState?.sbIdx === seatIndex;
                const isBB = gameState?.bbIdx === seatIndex;

                if (!seat) {
                  // Empty Seat (+ SIT)
                  return (
                    <div
                      key={seatIndex}
                      className="poker-seat-anchor empty-seat"
                      style={{ left: `${x}%`, top: `${y}%` }}
                    >
                      {heroSeatIndex === -1 && gameState?.status !== "paused" && (
                        <button
                          className="seat-sit-plus-btn"
                          onClick={() => {
                            setBuyInSeat(seatIndex);
                            const minB = gameState?.minBuyIn || table.minBuyIn || 20;
                            const maxB = gameState?.maxBuyIn || table.maxBuyIn || 200;
                            setBuyInAmount(Math.min(walletBalance, Math.max(minB, (gameState?.bb || 2) * 50)));
                          }}
                          title={`Sit at seat #${seatIndex + 1}`}
                        >
                          <Plus size={18} weight="bold" />
                          <span>SIT</span>
                        </button>
                      )}
                    </div>
                  );
                }

                // Occupied Seat
                return (
                  <div
                    key={seatIndex}
                    className={`poker-seat-anchor occupied-seat ${isHero ? "is-hero" : ""} ${
                      isCurrentTurn ? "is-turn" : ""
                    } ${seat.folded ? "is-folded" : ""}`}
                    style={{ left: `${x}%`, top: `${y}%` }}
                  >
                    {/* Dealer / Blind Badges */}
                    {isDealer && <div className="dealer-button-pill" title="Dealer Button">D</div>}
                    {isSB && <div className="blind-button-pill sb" title="Small Blind">SB</div>}
                    {isBB && <div className="blind-button-pill bb" title="Big Blind">BB</div>}

                    {/* Timer Ring SVG around Avatar */}
                    {isCurrentTurn && (
                      <svg className="seat-timer-ring" viewBox="0 0 100 100">
                        <circle
                          className="timer-ring-bg"
                          cx="50"
                          cy="50"
                          r="44"
                          stroke="rgba(255,255,255,0.15)"
                          strokeWidth="5"
                          fill="none"
                        />
                        <circle
                          className="timer-ring-fg"
                          cx="50"
                          cy="50"
                          r="44"
                          stroke={timerColor}
                          strokeWidth="5"
                          fill="none"
                          strokeDasharray="276"
                          strokeDashoffset={276 - (276 * timerPct) / 100}
                          style={{ transition: "stroke-dashoffset 0.2s linear" }}
                        />
                      </svg>
                    )}

                    {/* Player Info Box */}
                    <div className="seat-avatar-badge">
                      <div className="seat-name-row">
                        <span className="seat-username" title={seat.username}>
                          {seat.username}
                        </span>
                        {seat.disconnected && (
                          <span className="seat-disconnect-dot" title="Disconnected">⚡</span>
                        )}
                      </div>
                      <div className="seat-stack-val">€{seat.stack.toLocaleString()}</div>
                    </div>

                    {/* Last Action Label (e.g. Check, Bet €50, Fold) */}
                    {seat.lastAction && (
                      <div className={`seat-last-action-tag action-${seat.lastAction.toLowerCase().split(" ")[0]}`}>
                        {seat.lastAction}
                      </div>
                    )}

                    {/* Sitting Out Indicator */}
                    {seat.sittingOut && (
                      <div className="seat-sitout-tag">SITTING OUT</div>
                    )}

                    {/* Player Hole Cards */}
                    <div className="seat-hole-cards">
                      {seat.cards && seat.cards.length > 0 ? (
                        seat.cards.map((c, idx) => {
                          if (!c) {
                            // Hidden opponent card back
                            return (
                              <div key={idx} className="poker-card-back" />
                            );
                          }
                          const meta = suitMeta(c.s);
                          return (
                            <div
                              key={idx}
                              className={`poker-seat-card rank-${c.r} suit-${c.s} ${meta.colorClass}`}
                            >
                              <span className="card-rank">{rankLabel(c.r)}</span>
                              <span className="card-suit">{meta.symbol}</span>
                            </div>
                          );
                        })
                      ) : null}
                    </div>

                    {/* Live Hand Strength Name (for hero only, spec 7.2) */}
                    {isHero && seat.handName && (
                      <div className="hero-live-hand-name">
                        <Sparkle size={13} weight="fill" />
                        <span>{seat.handName}</span>
                      </div>
                    )}

                    {/* Current Street Bet Chips on Felt */}
                    {seat.bet > 0 && (
                      <div className="seat-street-bet-chips">
                        <CasinoChipStack amount={seat.bet} size="sm" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ================= ACTION BAR (HERO'S TURN) ================= */}
      {actions && gameState && gameState.current === gameState.me ? (
        <footer className="poker-action-bar animate-slide-up">
          <div className="action-bar-top-row">
            {/* Quick Raise Presets (1/2 POT, POT, ALL-IN) */}
            {actions.canRaise && (
              <div className="raise-presets-group">
                <button
                  className="preset-btn"
                  onClick={() => setRaiseSliderVal(halfPotRaise)}
                >
                  ½ Pot (€{halfPotRaise})
                </button>
                <button
                  className="preset-btn"
                  onClick={() => setRaiseSliderVal(fullPotRaise)}
                >
                  Pot (€{fullPotRaise})
                </button>
                <button
                  className="preset-btn allin-preset"
                  onClick={() => setRaiseSliderVal(actions.maxTo)}
                >
                  All-in (€{actions.maxTo})
                </button>
              </div>
            )}

            {/* Raise Slider */}
            {actions.canRaise && (
              <div className="raise-slider-wrap">
                <input
                  type="range"
                  min={actions.minTo}
                  max={actions.maxTo}
                  step={gameState.bb || 1}
                  value={raiseSliderVal}
                  onChange={(e) => setRaiseSliderVal(Number(e.target.value))}
                  disabled={actionBusy}
                  className="raise-range-input"
                />
                <span className="raise-slider-val">€{raiseSliderVal}</span>
              </div>
            )}
          </div>

          <div className="action-bar-buttons-row">
            {/* Fold Button */}
            <button
              className="action-btn fold-btn"
              onClick={() => handleAction("fold")}
              disabled={actionBusy}
              title="Keyboard shortcut: F"
            >
              <span className="btn-label">FOLD</span>
              <span className="btn-shortcut">F</span>
            </button>

            {/* Check Button */}
            {actions.canCheck && (
              <button
                className="action-btn check-btn"
                onClick={() => handleAction("check")}
                disabled={actionBusy}
                title="Keyboard shortcut: C"
              >
                <span className="btn-label">CHECK</span>
                <span className="btn-shortcut">C</span>
              </button>
            )}

            {/* Call Button */}
            {!actions.canCheck && (
              <button
                className="action-btn call-btn"
                onClick={() => handleAction("call")}
                disabled={actionBusy}
                title="Keyboard shortcut: C"
              >
                <span className="btn-label">CALL €{actions.toCall}</span>
                <span className="btn-shortcut">C</span>
              </button>
            )}

            {/* Bet / Raise Button */}
            {actions.canRaise && (
              <button
                className="action-btn raise-btn"
                onClick={() => handleAction("raise", raiseSliderVal)}
                disabled={actionBusy}
                title="Keyboard shortcut: R"
              >
                <span className="btn-label">
                  {actions.currentBet === 0 ? "BET" : "RAISE TO"} €{raiseSliderVal}
                </span>
                <span className="btn-shortcut">R</span>
              </button>
            )}

            {/* Direct All-in Button */}
            {actions.canRaise && (
              <button
                className="action-btn allin-btn"
                onClick={() => handleAction("allin")}
                disabled={actionBusy}
              >
                <span className="btn-label">ALL-IN (€{actions.maxTo})</span>
              </button>
            )}
          </div>
        </footer>
      ) : (
        /* Status Bar when not Hero's Turn */
        <footer className="poker-status-bar">
          {heroSeatIndex >= 0 ? (
            <span className="status-text">
              {gameState?.current != null && gameState.current >= 0 && gameState.seats[gameState.current]
                ? `Waiting for ${gameState.seats[gameState.current]?.username} to act...`
                : "Waiting for round to progress..."}
            </span>
          ) : (
            <span className="status-text spectator">
              Spectator Mode · Click <b>+ SIT</b> on an empty seat to join the game
            </span>
          )}
        </footer>
      )}

      {/* ================= BUY-IN MODAL (+ SIT) ================= */}
      {buyInSeat !== null && (
        <div className="poker-modal-backdrop" onClick={() => setBuyInSeat(null)}>
          <div className="poker-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Take Seat #{buyInSeat + 1}</h3>
              <button className="close-btn" onClick={() => setBuyInSeat(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="buyin-limits-info">
                <div>Min: <b>€{gameState?.minBuyIn || table.minBuyIn || 20}</b></div>
                <div>Max: <b>€{gameState?.maxBuyIn || table.maxBuyIn || 200}</b></div>
                <div>Balance: <b>€{walletBalance.toLocaleString()}</b></div>
              </div>

              <div className="buyin-slider-field">
                <label>Buy-in Amount: <b>€{buyInAmount}</b></label>
                <input
                  type="range"
                  min={gameState?.minBuyIn || table.minBuyIn || 20}
                  max={Math.min(gameState?.maxBuyIn || table.maxBuyIn || 200, walletBalance)}
                  step={gameState?.bb || 1}
                  value={buyInAmount}
                  onChange={(e) => setBuyInAmount(Number(e.target.value))}
                />
              </div>

              <div className="buyin-presets-row">
                <button
                  onClick={() => setBuyInAmount(gameState?.minBuyIn || table.minBuyIn || 20)}
                >
                  Min
                </button>
                <button
                  onClick={() =>
                    setBuyInAmount(
                      Math.round(
                        ((gameState?.minBuyIn || table.minBuyIn || 20) +
                          Math.min(gameState?.maxBuyIn || table.maxBuyIn || 200, walletBalance)) /
                          2
                      )
                    )
                  }
                >
                  Mid
                </button>
                <button
                  onClick={() =>
                    setBuyInAmount(Math.min(gameState?.maxBuyIn || table.maxBuyIn || 200, walletBalance))
                  }
                >
                  Max
                </button>
              </div>

              {walletBalance < (gameState?.minBuyIn || table.minBuyIn || 20) && (
                <div className="modal-error-notice">
                  ⚠️ Wallet balance is lower than the minimum buy-in.
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="secondary-btn" onClick={() => setBuyInSeat(null)}>Cancel</button>
              <button
                className="primary-btn"
                onClick={handleConfirmSit}
                disabled={actionBusy || walletBalance < (gameState?.minBuyIn || table.minBuyIn || 20)}
              >
                Confirm Buy-in €{buyInAmount}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TOP-UP MODAL ================= */}
      {topupOpen && (
        <div className="poker-modal-backdrop" onClick={() => setTopupOpen(false)}>
          <div className="poker-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Top-up Stack</h3>
              <button className="close-btn" onClick={() => setTopupOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <label>Top-up Amount: <b>€{topupAmount}</b></label>
              <input
                type="range"
                min={10}
                max={Math.max(10, (gameState?.maxBuyIn || table.maxBuyIn || 200) - (gameState?.seats[heroSeatIndex]?.stack || 0))}
                step={10}
                value={topupAmount}
                onChange={(e) => setTopupAmount(Number(e.target.value))}
              />
              <p className="modal-hint">Top-up chips bought during a hand will be added after that hand ends.</p>
            </div>
            <div className="modal-footer">
              <button className="secondary-btn" onClick={() => setTopupOpen(false)}>Cancel</button>
              <button className="primary-btn" onClick={handleConfirmTopup}>
                Add €{topupAmount}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= LIVE CHAT DRAWER ================= */}
      {chatOpen && (
        <aside className="poker-chat-drawer animate-slide-left">
          <div className="chat-drawer-header">
            <h4>Table Chat</h4>
            <button className="close-btn" onClick={() => setChatOpen(false)}>✕</button>
          </div>
          <div className="chat-messages-list">
            {chatMessages.length === 0 ? (
              <div className="chat-empty">No messages yet. Say hello!</div>
            ) : (
              chatMessages.map((m, idx) => (
                <div key={idx} className="chat-msg-row">
                  <span className="chat-sender">{m.from}:</span>
                  <span className="chat-text">{m.text}</span>
                </div>
              ))
            )}
            <div ref={chatBottomRef} />
          </div>
          <form className="chat-input-form" onSubmit={handleSendChat}>
            <input
              type="text"
              placeholder="Type message (max 200 chars)..."
              value={chatInput}
              maxLength={200}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button type="submit">Send</button>
          </form>
        </aside>
      )}

      {/* ================= ACTION LOG DRAWER ================= */}
      {logOpen && (
        <aside className="poker-log-drawer animate-slide-left">
          <div className="log-drawer-header">
            <h4>Hand Action History</h4>
            <button className="close-btn" onClick={() => setLogOpen(false)}>✕</button>
          </div>
          <div className="log-entries-list">
            {(!gameState?.log || gameState.log.length === 0) ? (
              <div className="log-empty">No actions logged for this hand yet.</div>
            ) : (
              gameState.log.map((entry, idx) => (
                <div key={idx} className={`log-entry-row log-type-${entry.type}`}>
                  <span className="log-time">
                    {new Date(entry.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                  <span className="log-text">{entry.text}</span>
                </div>
              ))
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
