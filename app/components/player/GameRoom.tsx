import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "../../api-client";
import {
  BingoEngine,
  BingoRoomData,
  TransactionManager,
  makeGridCard,
  make90Ticket,
  make75Card,
} from "../../bingo-core";
import { patternCells } from "../shared/pattern-utils";
import { StatusPill } from "../shared/StatusPill";
import { money, type GamePhase } from "../shared/types";
import { TrueigTicket } from "./TrueigTicket";

export function GameRoom({
  room,
  wallet,
  setWallet,
  goBack,
  notify,
}: {
  room: BingoRoomData;
  wallet: number;
  setWallet: (value: number) => void;
  goBack: () => void;
  notify: (message: string) => void;
}) {
  const [phase, setPhase] = useState<GamePhase>("selling");
  const [countdown, setCountdown] = useState(5);
  const [called, setCalled] = useState<number[]>([]);
  const [current, setCurrent] = useState<number | null>(null);
  const [autoDaub, setAutoDaub] = useState(true);
  const [manualMarks, setManualMarks] = useState<number[]>([]);
  const maxCards = Math.max(1, room.cardLimit ?? 8);
  const defaultSpeed = room.callDelay
    ? room.callDelay <= 700
      ? "Turbo"
      : room.callDelay <= 1300
        ? "Fast"
        : room.callDelay <= 2200
          ? "Normal"
          : "Slow"
    : room.variant.includes("Speed")
      ? "Turbo"
      : "Fast";
  const [userSpeed, setUserSpeed] = useState<string | null>(null);
  const speed = userSpeed ?? defaultSpeed;
  const setSpeed = (val: string) => setUserSpeed(val);

  const [paused, setPaused] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [selectedCards, setSelectedCards] = useState<number[]>(() =>
    Array.from({ length: Math.min(3, Math.max(1, room.cardLimit ?? 8)) }, (_, i) => i)
  );

  const [activeCard, setActiveCard] = useState(0);
  const safeActiveCard = Math.min(activeCard, Math.max(0, maxCards - 1));

  const [multiView, setMultiView] = useState(true);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [stageIndex, setStageIndex] = useState(0);
  const [patternRound, setPatternRound] = useState(0);
  const [winnerNames, setWinnerNames] = useState<string[]>([]);
  const [winnerPrize, setWinnerPrize] = useState(0);
  const [winnerPattern, setWinnerPattern] = useState("");
  const [claimLocked, setClaimLocked] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);
  const [hasShownEndModal, setHasShownEndModal] = useState(false);
  const [chat, setChat] = useState("");

  const [driftPlayers, setDriftPlayers] = useState(0);
  const [driftCards, setDriftCards] = useState(0);
  const [driftJackpot, setDriftJackpot] = useState(0);
  const livePlayers = Math.max(1, room.players + driftPlayers);
  const liveCards = Math.max(0, room.cardsSold + driftCards);
  const liveJackpot = Math.max(0, (room.jackpot ?? 0) + driftJackpot);

  const [lastWinner, setLastWinner] = useState("LuckyStar · $420");
  const [messages, setMessages] = useState([
    ["Trueigtech", `Welcome to ${room.name}. ${room.pattern} is the opening target.`, "now"],
    ["PixelPete", room.variant.includes("Speed") ? "Ready for turbo mode ⚡" : "Good luck, everyone!", "1m"],
    ["MikaK", "Cards locked in. Eyes down!", "1m"],
  ]);

  useEffect(() => {
    apiClient.chat.get(room.id).then((chatMessages) => {
      if (chatMessages && chatMessages.length > 0) {
        setMessages(chatMessages.map((m) => [m.sender, m.text, m.time]));
      }
    }).catch(() => {});
  }, [room.id]);

  const ballCount = room.variant.includes("90") ? 90 : room.variant.includes("30") ? 30 : room.variant.includes("80") ? 80 : 75;
  const rows = room.cardRows ?? (ballCount === 90 ? 3 : ballCount === 30 ? 3 : ballCount === 80 ? 4 : 5);
  const columns = room.cardColumns ?? (ballCount === 90 ? 9 : ballCount === 30 ? 3 : ballCount === 80 ? 4 : 5);
  const patternSeries = ["X Pattern", "Diamond", "Four Corners", "Cross", "Blackout"];
  const stages = room.id === "pattern-arena"
    ? [{ name: patternSeries[patternRound], prize: room.prize, continueAfterWin: false }]
    : room.winningStages ?? [{ name: room.pattern, prize: room.prize, continueAfterWin: false }];
  const activeStage = stages[Math.min(stageIndex, stages.length - 1)];

  // Promotion calculation
  const freeCards = room.promotion === "Buy 3 Get 1" ? Math.floor(selectedCards.length / 4) : 0;
  const payableCards = Math.max(0, selectedCards.length - freeCards);
  const rawPrice = room.ticketPrice * payableCards;
  const price = room.promotion === "Happy Hour" ? Math.round(rawPrice * 0.75 * 100) / 100 : rawPrice;

  const cardValues = useMemo(() => Array.from({ length: maxCards }, (_, index) => {
    if (ballCount === 90) return make90Ticket(index + 2);
    if (ballCount === 80) return makeGridCard(4, 4, 80, index + 2).map((cell) => cell.value);
    if (ballCount === 30) return makeGridCard(3, 3, 30, index + 2).map((cell) => cell.value);
    return make75Card(index + 2).map((cell) => cell.value);
  }), [ballCount, maxCards]);

  const ballLabel = useCallback((value: number) => ballCount === 75 ? BingoEngine.label(value) : `${value}`, [ballCount]);
  const targetCells = (name: string) => patternCells(name, rows, columns, ballCount);

  // Real-time synchronization with server game session and backoffice live control
  useEffect(() => {
    // 1. Initial hydration from server
    apiClient.chat.get(room.id).then((chatMessages) => {
      if (chatMessages && chatMessages.length > 0) {
        setMessages(chatMessages.map((m) => [m.sender, m.text, m.time]));
      }
    }).catch(() => {});

    apiClient.game.getState(room.id).then((res) => {
      if (res?.state) {
        if (res.state.paused !== undefined) setPaused(res.state.paused);
        if (Array.isArray(res.state.called) && res.state.called.length > 0) {
          setCalled(res.state.called);
          if (res.state.current) setCurrent(res.state.current);
        }
      }
    }).catch(() => {});

    // 2. Real-time Server-Sent Events (SSE) listener
    const unsubscribe = apiClient.sync.subscribe((event) => {
      // Game session events
      if (event.entity === "game" && (!event.roomId || event.roomId === room.id)) {
        if (event.action === "pause") {
          setPaused(true);
          notify("⏸ Game paused by operator.");
        } else if (event.action === "resume") {
          setPaused(false);
          notify("▶ Game resumed by operator.");
        } else if (event.action === "manual-call") {
          const num = (event.data as { ball?: number })?.ball;
          if (num) {
            setCurrent(num);
            setCalled((prev) => (prev.includes(num) ? prev : [...prev, num]));
            notify(`Ball ${ballLabel(num)} called manually by operator.`);
          }
        } else if (event.action === "cancel") {
          setPaused(true);
          setPhase("selling");
          notify(event.message || "Round was cancelled and refunded by operator.");
          apiClient.wallet.get().then((w) => {
            if (w && typeof w.balance === "number") setWallet(w.balance);
          });
        } else if (event.action === "restart") {
          setCalled([]);
          setCurrent(null);
          setPhase("countdown");
          setCountdown(5);
          setPaused(false);
          notify("Round restarted by operator.");
        } else if (event.action === "declare-winner") {
          const d = event.data as { player?: string; prize?: number; pattern?: string };
          if (d?.player) {
            setWinnerNames([d.player]);
            if (d.prize) setWinnerPrize(d.prize);
            if (d.pattern) setWinnerPattern(d.pattern);
            setPhase("results");
            setShowWinModal(true);
            setHasShownEndModal(true);
            setLastWinner(`${d.player} · ${money(d.prize || 400)}`);
          }
        }
      }

      // Chat events
      if (event.entity === "chat" && (!event.roomId || event.roomId === room.id)) {
        if (event.action === "message") {
          const m = event.data as { user: string; text: string; time: string };
          if (m) setMessages((prev) => [...prev.slice(-20), [m.user, m.text, m.time]]);
        } else if (event.action === "broadcast") {
          const b = event.data as { text: string; time: string };
          if (b?.text) setMessages((prev) => [...prev.slice(-20), ["Operator", `📢 ${b.text}`, b.time || "now"]]);
        }
      }

      // System announcements
      if (event.entity === "announcement") {
        const msg = event.message || (event.data as { text?: string })?.text;
        if (msg) notify(`📢 ${msg}`);
      }

      // Platform Settings changes
      if (event.entity === "settings") {
        const s = event.data as { autoDaubDefault?: boolean; voiceCaller?: string };
        if (s?.autoDaubDefault !== undefined) setAutoDaub(s.autoDaubDefault);
        if (s?.voiceCaller !== undefined) setVoiceOn(s.voiceCaller !== "Off");
      }
    });

    // 3. Periodic state sync polling
    const pollInterval = window.setInterval(async () => {
      try {
        const res = await apiClient.game.getState(room.id);
        if (res?.state) {
          if (res.state.paused !== undefined && res.state.paused !== paused) {
            setPaused(res.state.paused);
          }
        }
      } catch {
        // quiet fallback
      }
    }, 2500);

    return () => {
      unsubscribe();
      window.clearInterval(pollInterval);
    };
  }, [ballLabel, notify, paused, room.id, setWallet]);

  useEffect(() => {
    if (phase !== "countdown") return;
    const timer = window.setTimeout(() => {
      if (countdown <= 0) {
        setPhase("live");
        notify(`${room.name} is live — ${activeStage.name} is the first stage.`);
        return;
      }
      setCountdown((value) => value - 1);
    }, countdown <= 0 ? 0 : 1000);
    return () => window.clearTimeout(timer);
  }, [phase, countdown, activeStage.name, notify, room.name]);

  useEffect(() => {
    if (phase !== "live" || paused) return;
    const delays: Record<string, number> = { Slow: 3200, Normal: 2100, Fast: room.callDelay ?? 1200, Turbo: 600 };
    const timer = window.setInterval(() => {
      setCalled((previous) => {
        const next = BingoEngine.nextNumber(previous, ballCount);
        if (next === null) return previous;
        setCurrent(next);
        if ((previous.length + 1) % 5 === 0) setMessages((items) => [...items.slice(-7), ["System", `Ball ${ballLabel(next)} has been called.`, "now"]]);
        return [...previous, next];
      });
      apiClient.game.callNext(room.id).catch(() => {});
    }, delays[speed]);
    return () => window.clearInterval(timer);
  }, [phase, paused, speed, ballCount, room.callDelay, ballLabel, room.id]);

  useEffect(() => {
    if (phase !== "live") return;
    const timer = window.setInterval(() => {
      setDriftPlayers((v) => v + (Math.random() > 0.35 ? 1 : -1));
      setDriftCards((v) => v + (Math.random() > 0.4 ? 1 : 0));
      if (room.jackpot) setDriftJackpot((v) => v + 0.25);
    }, 2200);
    return () => window.clearInterval(timer);
  }, [phase, room.jackpot]);

  useEffect(() => {
    if (phase !== "live" || claimLocked) return;
    const thresholds = ballCount === 90 ? [7, 13, 19] : ballCount === 30 ? [8] : ballCount === 80 ? [7, 12, 18] : stages.length > 1 ? [7, 13, 20, 26] : [12];
    if (called.length >= (thresholds[stageIndex] ?? 14)) triggerWinner(stageIndex === 1 ? ["LuckyStar", "MikaK"] : [stageIndex === 0 ? "LuckyStar" : "Ari.R"]);
    // triggerWinner intentionally reads the current render state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [called.length, phase, stageIndex, claimLocked, ballCount, stages.length]);

  function injectWinningNumbers() {
    const values = cardValues[safeActiveCard];
    const winning = targetCells(activeStage.name).map((index) => values[index]).filter((value): value is number => typeof value === "number");
    setCalled((previous) => Array.from(new Set([...previous, ...winning])));
  }

  function triggerWinner(names = ["Ari.R"]) {
    if (phase !== "live" || claimLocked) return;
    setClaimLocked(true);
    injectWinningNumbers();
    setWinnerNames(names);
    setWinnerPattern(activeStage.name);
    const jackpotQualified = room.jackpot && activeStage.name.includes("Full") && called.length <= (room.progressiveBallLimit ?? 42);
    const total = jackpotQualified ? liveJackpot : activeStage.prize;
    const splitPrize = Math.round((total / names.length) * 100) / 100;
    setWinnerPrize(splitPrize);

    const isIntermediate = Boolean(activeStage.continueAfterWin && stageIndex < stages.length - 1);

    if (isIntermediate) {
      // Intermediate stage win: do NOT block screen with modal! Keep user in live game!
      setLastWinner(`${names.join(" & ")} · ${money(total)}`);
      if (names.includes("Ari.R")) {
        setWallet(Math.round((wallet + splitPrize) * 100) / 100);
        apiClient.game.claim(room.id, { ticketId: `CARD-${activeCard}`, playerName: "Ari.R", manualPattern: activeStage.name }).then((res) => {
          if (res?.wallet !== undefined) setWallet(res.wallet);
        });
        notify(`🎉 BINGO! You won ${activeStage.name} (${money(splitPrize)})! Game continuing to ${stages[stageIndex + 1]?.name ?? "next stage"}...`);
      } else {
        notify(`📢 ${names.join(" & ")} completed ${activeStage.name} (${money(splitPrize)} each). Round continues to ${stages[stageIndex + 1]?.name ?? "next stage"}!`);
      }
      setMessages((items) => [
        ...items,
        ["System", `🎉 ${names.join(" & ")} won ${activeStage.name}! ${names.length > 1 ? `${money(total)} split equally.` : money(total)} · Advancing to ${stages[stageIndex + 1]?.name}`, "now"],
      ]);
      window.setTimeout(() => {
        setStageIndex((value) => value + 1);
        setClaimLocked(false);
      }, 1500);
    } else {
      // Final stage win: Game Ends! Show modal once!
      setLastWinner(`${names.join(" & ")} · ${money(total)}`);
      if (names.includes("Ari.R")) {
        setWallet(Math.round((wallet + splitPrize) * 100) / 100);
        apiClient.game.claim(room.id, { ticketId: `CARD-${activeCard}`, playerName: "Ari.R", manualPattern: activeStage.name }).then((res) => {
          if (res?.wallet !== undefined) setWallet(res.wallet);
        });
        notify(`🏆 Full House BINGO! You won ${money(splitPrize)}! Round complete.`);
      } else {
        notify(`🏆 Game round complete! ${names.join(" & ")} won ${activeStage.name} (${money(splitPrize)} each).`);
      }
      setMessages((items) => [
        ...items,
        ["System", `🏆 Final stage (${activeStage.name}) won by ${names.join(" & ")}! ${names.length > 1 ? `${money(total)} split equally.` : money(total)}`, "now"],
      ]);
      setPhase("results");
      if (!hasShownEndModal) {
        setShowWinModal(true);
        setHasShownEndModal(true);
      }
    }
  }

  const togglePause = () => {
    const next = !paused;
    setPaused(next);
    if (next) {
      apiClient.game.pause(room.id).catch(() => {});
    } else {
      apiClient.game.resume(room.id).catch(() => {});
    }
  };

  const startRound = () => {
    if (!selectedCards.length) return notify("Select at least one card before starting the round.");
    if (wallet < price) return notify("Not enough wallet balance for these cards.");
    setWallet(Math.round((wallet - price) * 100) / 100); setPhase("countdown"); setCountdown(5);
    apiClient.tickets.buy(room.id, selectedCards.length).then((res) => {
      if (res?.wallet !== undefined) setWallet(res.wallet);
    });
    notify(`${selectedCards.length} card${selectedCards.length > 1 ? "s" : ""} secured · ${TransactionManager.reference("TRUEIG")}`);
  };

  const nextRound = () => {
    setCalled([]);
    setCurrent(null);
    setManualMarks([]);
    setPhase("selling");
    setCountdown(5);
    setPaused(false);
    setStageIndex(0);
    setClaimLocked(false);
    setWinnerNames([]);
    setShowWinModal(false);
    setHasShownEndModal(false);
    if (room.id === "pattern-arena") setPatternRound((value) => (value + 1) % patternSeries.length);
    apiClient.game.restart(room.id).catch(() => {});
    notify(room.id === "pattern-arena" ? `Next pattern loaded: ${patternSeries[(patternRound + 1) % patternSeries.length]}.` : "Next round is open for tickets.");
  };

  const sendChat = (event: FormEvent) => {
    event.preventDefault();
    if (!chat.trim()) return;
    const text = chat.trim();
    setMessages((items) => [...items, ["Ari.R", text, "now"]]);
    setChat("");
    apiClient.chat.send(room.id, text, "Ari.R").catch(() => {});
  };

  const toggleCard = (index: number) => {
    if (phase !== "selling") return setActiveCard(index);
    setSelectedCards((cards) => cards.includes(index) ? cards.filter((item) => item !== index) : cards.length < maxCards ? [...cards, index] : cards);
    setActiveCard(index);
  };

  const visibleCards = [...(phase === "selling" ? Array.from({ length: maxCards }, (_, index) => index) : selectedCards)].sort((a, b) => sortDirection === "asc" ? a - b : b - a);

  return (
    <div className="game-page">
      <div className="game-topbar">
        <button className="back-button" onClick={goBack}>← <span>Trueigtech Lobby</span></button>
        <div className="game-room-title">
          <span className={`mini-orb accent-${room.accent}`}>{ballCount}</span>
          <div>
            <h1>{room.name}</h1>
            <p>{room.variant} · Game TRUEIG-{2842 + patternRound}</p>
          </div>
          <StatusPill status={phase === "live" ? "Live" : phase === "selling" ? "Selling Tickets" : "Starting Soon"} />
        </div>
        <div className="game-top-actions">
          {room.promotion && room.promotion !== "None" && (
            <span style={{
              background: "rgba(254, 202, 87, 0.2)",
              border: "1px solid rgba(254, 202, 87, 0.6)",
              color: "#feca57",
              fontSize: "11px",
              fontWeight: 700,
              padding: "4px 8px",
              borderRadius: "8px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}>
              🎁 {room.promotion}
            </span>
          )}
          <span>
            <small>{room.jackpot ? "Jackpot" : "Prize pool"}</small>
            <b>{money(room.jackpot ? liveJackpot : room.prize)}</b>
          </span>
          <span>
            <small>Players</small>
            <b>{livePlayers} / {room.maxPlayers}</b>
          </span>
          <span>
            <small>Card limit</small>
            <b>Max {maxCards}</b>
          </span>
          <button onClick={() => setVoiceOn(!voiceOn)} aria-label="Voice caller">{voiceOn ? "◖" : "×"}</button>
          <button onClick={togglePause} aria-label="Pause or resume">{paused ? "▶" : "Ⅱ"}</button>
          <button aria-label="Full screen">⛶</button>
        </div>
      </div>
      <div className="phase-rail">
        {[
          ["selling", "Cards"],
          ["countdown", "Countdown"],
          ["live", "Calling"],
          ["review", "Validation"],
          ["winner", "Winner"],
          ["results", "Results"],
        ].map(([key, label], index) => {
          const order = ["selling", "countdown", "live", "review", "winner", "results"];
          const activeIndex = order.indexOf(phase);
          return (
            <div className={`${key === phase ? "active" : ""} ${index < activeIndex ? "done" : ""}`} key={key}>
              <span>{index < activeIndex ? "✓" : index + 1}</span>
              <small>{label}</small>
            </div>
          );
        })}
      </div>
      <div className="game-layout">
        <section className="caller-panel">
          <div className="caller-heading">
            <div><span className="live-dot" /><b>TRUEIGTECH CALLER</b></div>
            <select value={speed} onChange={(event) => setSpeed(event.target.value)}>
              {["Slow", "Normal", "Fast", "Turbo"].map((value) => <option key={value}>{value}</option>)}
            </select>
          </div>
          <div className={`current-ball ${phase === "live" && !paused ? "calling" : ""}`}>
            {phase === "selling" ? (
              <><small>ROUND OPENS</small><strong>00:18</strong></>
            ) : phase === "countdown" ? (
              <><small>STARTING IN</small><strong>{countdown}</strong></>
            ) : (
              <><small>{current && ballCount === 75 ? BingoEngine.label(current).split("-")[0] : "BALL"}</small><strong>{current ?? "—"}</strong></>
            )}
          </div>
          <div className="caller-state">
            <h2>
              {phase === "selling"
                ? "Select your cards"
                : phase === "countdown"
                  ? "Eyes down"
                  : phase === "review"
                    ? "Validating ticket…"
                    : phase === "winner"
                      ? "BINGO confirmed!"
                      : phase === "results"
                        ? "Round complete"
                        : paused
                          ? "Calling paused"
                          : current
                            ? `${ballLabel(current)} called`
                            : "Ready for first ball"}
            </h2>
            <p>
              {phase === "live"
                ? `${voiceOn ? "Voice on" : "Voice off"} · ${speed} pace · next ball in ${speed === "Turbo" ? "0.6" : "1.2"}s`
                : activeStage.name}
            </p>
          </div>
          <div className="recent-calls">
            <small>PREVIOUS BALLS</small>
            <div>
              {called.slice(-5).reverse().map((number, index) => (
                <span className={index === 0 ? "latest" : ""} key={number}>
                  {ballLabel(number).replace("-", "")}
                </span>
              ))}
              {!called.length && <em>Numbers appear here</em>}
            </div>
          </div>
          <div className="winning-stage-list">
            <small>WINNING STAGES</small>
            {stages.map((stage, index) => (
              <div className={`${index === stageIndex ? "active" : ""} ${index < stageIndex ? "complete" : ""}`} key={stage.name}>
                <i>{index < stageIndex ? "✓" : index + 1}</i>
                <span>
                  <b>{stage.name}</b>
                  <small>{money(stage.prize)} · {stage.continueAfterWin ? "game continues" : "final stage"}</small>
                </span>
              </div>
            ))}
          </div>
          <div className="pattern-preview">
            <div>
              <small>ACTIVE TARGET</small>
              <strong>{activeStage.name}</strong>
              <span>{room.jackpot ? `Jackpot within ${room.progressiveBallLimit} balls` : `Prize · ${money(activeStage.prize)}`}</span>
            </div>
            <div className={`mini-pattern pattern-${columns}`}>
              {Array.from({ length: Math.min(25, rows * columns) }, (_, index) => (
                <i className={targetCells(activeStage.name).includes(index) ? "marked" : ""} key={index} />
              ))}
            </div>
          </div>
          {phase === "selling" ? (
            <div className="ticket-purchase">
              {room.promotion && room.promotion !== "None" && (
                <div style={{
                  background: "rgba(254, 202, 87, 0.15)",
                  border: "1px solid rgba(254, 202, 87, 0.4)",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  fontSize: "12px",
                  color: "#feca57",
                  fontWeight: 700,
                  marginBottom: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}>
                  <span>🎁 {room.promotion}</span>
                  {room.promotion === "Buy 3 Get 1" && (
                    <small style={{ color: "#2bddaa", fontWeight: 700 }}>
                      {freeCards > 0 ? `✓ ${freeCards} FREE card applied!` : "Buy 4 cards to get 1 free"}
                    </small>
                  )}
                  {room.promotion === "Happy Hour" && (
                    <small style={{ color: "#2bddaa", fontWeight: 700 }}>✓ 25% OFF active!</small>
                  )}
                </div>
              )}
              <div>
                <button onClick={() => setSelectedCards((cards) => cards.slice(0, -1))} disabled={selectedCards.length === 0}>−</button>
                <strong>{selectedCards.length}<small>SELECTED</small></strong>
                <button
                  onClick={() =>
                    setSelectedCards((cards) => {
                      if (cards.length >= maxCards) return cards;
                      const next = Array.from({ length: maxCards }, (_, i) => i).find((i) => !cards.includes(i));
                      return next !== undefined ? [...cards, next] : cards;
                    })
                  }
                  disabled={selectedCards.length >= maxCards}
                >+</button>
              </div>
              <button className="buy-button" onClick={startRound}>
                Buy cards · {price ? money(price) : "Free"}<span>→</span>
              </button>
              <p>Choose specific cards below · Maximum {maxCards}</p>
            </div>
          ) : phase === "results" ? (
            <button className="buy-button" onClick={nextRound}>
              Open next round <span>→</span>
            </button>
          ) : (
            <>
              <button className="bingo-button" onClick={() => triggerWinner(["Ari.R"])} disabled={phase !== "live"}>
                <span>BINGO!</span>
                <small>Demonstrate {activeStage.name}</small>
              </button>
              {phase === "live" && (
                <button className="caller-pause-button" onClick={togglePause}>
                  {paused ? "▶ Resume caller" : "Ⅱ Pause caller"}
                </button>
              )}
            </>
          )}
        </section>
        <section className="cards-panel">
          <div className="room-stats-strip">
            {[
              ["PLAYERS ONLINE", `${livePlayers} / ${room.maxPlayers}`],
              ["CARDS SOLD", liveCards],
              ["CARD LIMIT", `Max ${maxCards}`],
              ["PRIZE POOL", money(room.prize)],
              ["LAST WINNER", lastWinner],
              ["PACE", room.frequency ?? "Every 10 min"],
            ].map((stat) => (
              <span key={stat[0]}>
                <small>{stat[0]}</small>
                <b>{stat[1]}</b>
              </span>
            ))}
          </div>
          <div className="cards-toolbar">
            <div>
              <h2>{phase === "selling" ? "Choose cards" : "Your cards"} <span>{selectedCards.length}</span></h2>
              <p>Card #0{activeCard + 1} · {called.filter((number) => cardValues[activeCard]?.includes(number)).length} matches</p>
            </div>
            <div className="card-tools">
              <button onClick={() => setSelectedCards(Array.from({ length: Math.min(maxCards >= 4 ? 4 : 2, maxCards) }, (_, i) => i))}>
                Auto-select {Math.min(maxCards >= 4 ? 4 : 2, maxCards)}
              </button>
              {maxCards > 4 && (
                <button onClick={() => setSelectedCards(Array.from({ length: maxCards }, (_, i) => i))}>
                  All {maxCards} cards
                </button>
              )}
              <button onClick={() => setSortDirection((value) => value === "asc" ? "desc" : "asc")}>
                Sort {sortDirection === "asc" ? "↓" : "↑"}
              </button>
              <button className={multiView ? "active" : ""} onClick={() => setMultiView(!multiView)}>Multi-view</button>
            </div>
            <div className="daub-control">
              <span>
                <small>AUTO DAUB</small>
                <b>{autoDaub ? "All matches marked" : "Manual mode"}</b>
              </span>
              <button className={autoDaub ? "on" : ""} onClick={() => setAutoDaub(!autoDaub)}><i /></button>
            </div>
          </div>
          <div className={`ticket-grid ${!multiView ? "single" : ""}`}>
            {visibleCards.map((index) => (
              <TrueigTicket
                key={index}
                index={index}
                values={cardValues[index]}
                rows={rows}
                columns={columns}
                ballCount={ballCount}
                selected={selectedCards.includes(index)}
                active={activeCard === index}
                selling={phase === "selling"}
                called={called}
                manualMarks={manualMarks}
                autoDaub={autoDaub}
                targetCells={targetCells(activeStage.name)}
                onSelect={() => toggleCard(index)}
                onPreview={() => setActiveCard(index)}
                onMark={(value) => {
                  if (!called.includes(value)) return notify("That number has not been called yet.");
                  setManualMarks((values) => values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
                }}
              />
            ))}
          </div>
          <div className="number-board">
            <div>
              <h3>Full number board & history</h3>
              <span>{called.length} of {ballCount} called · {paused ? "Paused" : `${speed} caller`}</span>
            </div>
            <div className={`number-board-grid board-${ballCount}`}>
              {Array.from({ length: ballCount }, (_, index) => index + 1).map((number) => (
                <span className={called.includes(number) ? "called" : ""} key={number}>{number}</span>
              ))}
            </div>
          </div>
        </section>
        <aside className="social-panel">
          <div className="social-tabs">
            <button className="active">Chat</button>
            <button>Players <span>{livePlayers}</span></button>
          </div>
          <div className="chat-messages">
            <div className="system-message">
              <span>◇</span>
              <p>Stage {stageIndex + 1}: <b>{activeStage.name}</b> for {money(activeStage.prize)}.</p>
            </div>
            {messages.map((message, index) => (
              <div className="chat-message" key={`${message[0]}-${index}`}>
                <span className={`chat-avatar chat-${index % 4}`}>{message[0].slice(0, 2).toUpperCase()}</span>
                <div>
                  <p><b>{message[0]}</b><small>{message[2]}</small></p>
                  <span>{message[1]}</span>
                </div>
              </div>
            ))}
            {winnerNames.length > 0 && phase === "winner" && (
              <div className="winner-announcement">
                <span>★</span>
                <p><b>{winnerNames.join(" & ")} called BINGO!</b>{winnerPattern} · {money(winnerPrize)} each</p>
              </div>
            )}
          </div>
          <form className="chat-input" onSubmit={sendChat}>
            <button type="button" onClick={() => setChat((value) => `${value} 🎉`)}>☺</button>
            <input value={chat} onChange={(event) => setChat(event.target.value)} placeholder="Say something…" />
            <button>↑</button>
          </form>
          <div className="mini-leaderboard">
            <div><h3>Trueigtech room leaders</h3><button>•••</button></div>
            {[
              ["1", "TrueigQueen", "3 wins"],
              ["2", "MikaK", "2 wins"],
              ["3", "Ari.R", "1 win"],
            ].map((row) => (
              <p key={row[0]}><i>{row[0]}</i><span>{row[1]}</span><small>{row[2]}</small></p>
            ))}
          </div>
        </aside>
      </div>
      {showWinModal && winnerNames.length > 0 && (
        <div className="claim-overlay confirmed">
          <div className="claim-modal">
            <button
              type="button"
              className="modal-close"
              aria-label="Close win modal"
              onClick={() => setShowWinModal(false)}
            >
              ×
            </button>
            <div className="trueig-modal-brand">TRUEIGTECH BINGO ENGINE</div>
            <div className="claim-icon">✓</div>
            <span className="section-kicker">GAME TRUEIG-{2842 + patternRound}</span>
            <h2>Bingo confirmed!</h2>
            <p>
              {winnerNames.join(" & ")} completed {winnerPattern || activeStage.name} after {called.length} balls.
            </p>
            <div className="winner-avatars">
              {winnerNames.map((name) => (
                <span key={name}>{name.slice(0, 2).toUpperCase()}</span>
              ))}
            </div>
            <strong className="winner-prize">{money(winnerPrize)} each</strong>
            <small>
              {winnerNames.length > 1
                ? `${winnerNames.length} simultaneous winners · prize split equally`
                : room.jackpot && (winnerPattern || activeStage.name).includes("Full")
                  ? `Progressive qualified within ${room.progressiveBallLimit ?? 42} balls`
                  : `Winning Card #0${activeCard + 1}`}
            </small>
            <button
              type="button"
              className="admin-primary"
              style={{ marginTop: "18px", width: "100%", padding: "10px" }}
              onClick={() => setShowWinModal(false)}
            >
              Continue to round results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
