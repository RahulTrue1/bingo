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
  tournament,
  wallet,
  setWallet,
  goBack,
  notify,
  currentUser,
}: {
  room: BingoRoomData;
  tournament?: any;
  wallet: number;
  setWallet: (value: number | ((prev: number) => number)) => void;
  goBack: () => void;
  notify: (message: string) => void;
  currentUser?: any;
}) {
  const currentUsername = currentUser?.username || "Ari.R";
  const isTournament = Boolean(
    tournament ||
    room.id === "tournament" ||
    room.id.startsWith("tournament-") ||
    room.tag === "TOURNAMENT" ||
    (room.variant && room.variant.includes("Tournament"))
  );

  const [tourneyData, setTourneyData] = useState<any>(tournament || null);
  const [tourneyCountdown, setTourneyCountdown] = useState<number | null>(
    tournament?.engine?.scheduledStartSeconds ?? null
  );
  const [actionLoading, setActionLoading] = useState(false);

  const targetTourneyId = tournament?.id || (room.id.startsWith("tournament-") ? room.id.replace("tournament-", "") : (room.id === "tournament" ? "weekend-cup" : room.id));

  const refreshTourneyState = useCallback(async () => {
    if (!isTournament) return;
    try {
      const list = await apiClient.tournaments.list();
      if (list && list.length > 0) {
        const matched = list.find((t: any) =>
          t.id === targetTourneyId ||
          t.id === tournament?.id ||
          t.name.toLowerCase() === room.name.toLowerCase() ||
          (targetTourneyId === "weekend-cup" && t.id === "weekend-cup")
        ) || list[0];
        if (matched) {
          setTourneyData(matched);
          if (typeof matched.engine?.scheduledStartSeconds === "number" && matched.engine.scheduledStartSeconds > 0) {
            setTourneyCountdown(matched.engine.scheduledStartSeconds);
          } else {
            setTourneyCountdown(null);
          }
          if (matched.status === "Live") {
            setPhase((prev) => (prev === "selling" ? "live" : prev));
          } else if (matched.status === "Registration open" || matched.status === "Awaiting start") {
            setPhase((prev) => (prev === "live" ? "selling" : prev));
          }
        }
      }
    } catch {}
  }, [isTournament, targetTourneyId, tournament?.id, room.name]);

  useEffect(() => {
    if (isTournament) {
      refreshTourneyState();
    }
  }, [isTournament, refreshTourneyState]);

  useEffect(() => {
    if (!isTournament || tourneyCountdown === null || tourneyCountdown <= 0) return;
    const timer = window.setInterval(() => {
      setTourneyCountdown((prev) => {
        if (prev === null || prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isTournament, tourneyCountdown]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const isRegistered = Boolean(
    tourneyData?.registeredPlayers?.some((p: string) => p.toLowerCase() === currentUsername.toLowerCase()) ||
    tourneyData?.standings?.some((s: any) => s.player?.toLowerCase() === currentUsername.toLowerCase())
  );
  const userStanding = tourneyData?.standings?.find(
    (s: any) => s.player?.toLowerCase() === currentUsername.toLowerCase()
  );

  const handleRegisterTournament = async () => {
    if (!tourneyData) return;
    setActionLoading(true);
    try {
      const res = await apiClient.tournaments.register(tourneyData.id, currentUsername);
      if (res && res.success) {
        if (typeof res.wallet === "number") setWallet(res.wallet);
        notify(`✓ Registered for ${tourneyData.name}! Seat confirmed.`);
        await refreshTourneyState();
      } else {
        notify(`⚠️ ${res?.error || "Registration failed. Check wallet balance."}`);
      }
    } catch (err: any) {
      notify(`⚠️ ${err.message || "Registration failed"}`);
    } finally {
      setActionLoading(false);
    }
  };

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
  const [selectedCards, setSelectedCards] = useState<number[]>(() => (isTournament ? [0] : []));
  const [tourneyModal, setTourneyModal] = useState<"advance" | "eliminated" | "champion" | null>(null);

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
  const maxRoomCapacity = Math.max(1, Number(room.maxPlayers) || 1);
  const livePlayers = Math.min(maxRoomCapacity, Math.max(1, Math.min(maxRoomCapacity, room.players) + driftPlayers));
  const liveCards = Math.max(0, room.cardsSold + driftCards);
  const liveJackpot = Math.max(0, (room.jackpot ?? 0) + driftJackpot);

  const [lastWinner, setLastWinner] = useState("LuckyStar · $420");
  const [messages, setMessages] = useState([
    ["Trueigtech", `Welcome to ${room.name}. ${room.pattern} is the opening target.`, "now"],
    ["PixelPete", room.variant.includes("Speed") ? "Ready for turbo mode ⚡" : "Good luck, everyone!", "1m"],
    ["MikaK", "Cards locked in. Eyes down!", "1m"],
  ]);

  useEffect(() => {
    apiClient.chat.get(room.id).then((res) => {
      if (res?.messages && res.messages.length > 0) {
        setMessages(res.messages.map((m) => [m.sender, m.text, m.time]));
      }
    }).catch(() => {});
  }, [room.id]);

  const activeVariant = tourneyData?.variant || room.variant || "75-Ball Pattern";
  const ballCount = activeVariant.includes("90") ? 90 : activeVariant.includes("30") ? 30 : activeVariant.includes("80") ? 80 : 75;
  const rows = (isTournament ? (ballCount === 90 ? 3 : ballCount === 30 ? 3 : ballCount === 80 ? 4 : 5) : room.cardRows) ?? (ballCount === 90 ? 3 : ballCount === 30 ? 3 : ballCount === 80 ? 4 : 5);
  const columns = (isTournament ? (ballCount === 90 ? 9 : ballCount === 30 ? 3 : ballCount === 80 ? 4 : 5) : room.cardColumns) ?? (ballCount === 90 ? 9 : ballCount === 30 ? 3 : ballCount === 80 ? 4 : 5);
  const tourneyCardsCount = tourneyData?.cardsPerPlayer || 1;
  const maxOpenBalls = isTournament ? (tourneyData?.maxOpenBalls || (ballCount === 30 ? 20 : ballCount === 90 ? 35 : 30)) : ballCount;
  const patternSeries = ["X Pattern", "Diamond", "Four Corners", "Cross", "Blackout"];
  const stages = useMemo(() => {
    if (room.id === "pattern-arena") {
      return [{ name: patternSeries[patternRound], pattern: patternSeries[patternRound], prize: Math.max(10, room.prize || 580), continueAfterWin: false }];
    }
    if (isTournament && tourneyData?.rounds) {
      const is90 = activeVariant.includes("90");
      const is30 = activeVariant.includes("30");
      return tourneyData.rounds.map((roundName: string, idx: number, arr: string[]) => {
        const defaultPattern = is90
          ? (idx === arr.length - 1 ? "Full House" : idx === 1 ? "Two Lines" : "One Line")
          : is30
          ? (idx === arr.length - 1 ? "Speed Full House" : idx === 1 ? "Two Lines" : "One Line")
          : (idx === arr.length - 1 ? "Full House" : idx === 2 ? "Diamond" : idx === 1 ? "Four Corners" : "One Line");
        const stagePattern = tourneyData.stagePatterns?.[idx] || defaultPattern;
        return {
          name: roundName,
          pattern: stagePattern,
          prize: Math.max(0, Math.round((tourneyData.prizePool || room.prize) / arr.length)),
          continueAfterWin: idx < arr.length - 1,
        };
      });
    }
    const rawStages = room.winningStages && room.winningStages.length > 0
      ? room.winningStages
      : [{ name: room.pattern, prize: room.prize, continueAfterWin: false }];

    const totalRoomPrize = Math.max(25, Number(room.prize) || 100);
    return rawStages.map((stage, idx, arr) => {
      if (stage.prize && Number(stage.prize) > 0) return stage;
      // Fallback: allocate remainder or major share to last stage (Full House)
      const priorAllocated = arr.slice(0, idx).reduce((acc, s) => acc + (s.prize > 0 ? s.prize : 0), 0);
      const remaining = Math.max(0, totalRoomPrize - priorAllocated);
      const fallbackPrize = idx === arr.length - 1
        ? Math.max(Math.round(totalRoomPrize * 0.5), remaining > 0 ? remaining : Math.round(totalRoomPrize / arr.length))
        : Math.round(totalRoomPrize / arr.length);
      return { ...stage, prize: Math.max(10, fallbackPrize) };
    });
  }, [room.id, patternRound, isTournament, tourneyData, activeVariant, room.winningStages, room.pattern, room.prize]);
  const activeStage = stages[Math.min(stageIndex, stages.length - 1)] || { name: room.pattern, pattern: room.pattern, prize: Math.max(25, room.prize || 100), continueAfterWin: false };
  const currentStagePattern = activeStage.pattern || activeStage.name;

  // Promotion calculation
  const freeCards = room.promotion === "Buy 3 Get 1" ? Math.floor(selectedCards.length / 4) : 0;
  const payableCards = Math.max(0, selectedCards.length - freeCards);
  const rawPrice = room.ticketPrice * payableCards;
  const price = room.promotion === "Happy Hour" ? Math.round(rawPrice * 0.75 * 100) / 100 : rawPrice;

  const [cardSeed, setCardSeed] = useState(0);
  const cardValues = useMemo(() => Array.from({ length: maxCards }, (_, index) => {
    const seedOffset = cardSeed * 17;
    if (ballCount === 90) return make90Ticket(index + 2 + seedOffset);
    if (ballCount === 80) return makeGridCard(4, 4, 80, index + 2 + seedOffset).map((cell) => cell.value);
    if (ballCount === 30) return makeGridCard(3, 3, 30, index + 2 + seedOffset).map((cell) => cell.value);
    return make75Card(index + 2 + seedOffset).map((cell) => cell.value);
  }), [ballCount, maxCards, cardSeed]);

  const ballLabel = useCallback((value: number) => ballCount === 75 ? BingoEngine.label(value) : `${value}`, [ballCount]);
  const targetCells = (name: string) => patternCells(name, rows, columns, ballCount);

  const requiredPatternIndices = useMemo(() => {
    return patternCells(currentStagePattern, rows, columns, ballCount);
  }, [currentStagePattern, rows, columns, ballCount]);

  const isUserPatternComplete = useMemo(() => {
    if (!requiredPatternIndices.length) return false;
    const cardsToCheck = isTournament ? (selectedCards.length > 0 ? selectedCards : [0]) : [safeActiveCard];
    return cardsToCheck.some((cIdx) => {
      const card = cardValues[cIdx];
      if (!card || !card.length) return false;
      return requiredPatternIndices.every((cellIdx) => {
        const cellVal = card[cellIdx];
        return cellVal === "FREE" || called.includes(cellVal as number) || manualMarks.includes(cellVal as number);
      });
    });
  }, [requiredPatternIndices, isTournament, selectedCards, safeActiveCard, cardValues, called, manualMarks]);

  const patternMatchedCount = useMemo(() => {
    const card = cardValues[safeActiveCard];
    if (!card || !card.length || !requiredPatternIndices.length) return 0;
    return requiredPatternIndices.filter((cellIdx) => {
      const cellVal = card[cellIdx];
      return cellVal === "FREE" || called.includes(cellVal as number) || manualMarks.includes(cellVal as number);
    }).length;
  }, [cardValues, safeActiveCard, requiredPatternIndices, called, manualMarks]);

  // Real-time synchronization with server game session and backoffice live control
  useEffect(() => {
    // 1. Fresh state reset on entering room
    setCalled([]);
    setCurrent(null);
    setManualMarks([]);
    setSelectedCards(isTournament ? Array.from({ length: tourneyCardsCount }, (_, i) => i) : [0]);
    setActiveCard(0);
    setPhase(isTournament && tourneyData?.status === "Live" ? "live" : "selling");
    setWinnerNames([]);
    setWinnerPrize(0);
    setWinnerPattern("");
    setHasShownEndModal(false);
    setShowWinModal(false);
    setTourneyModal(null);

    // 2. Initial hydration from server
    apiClient.chat.get(room.id).then((res) => {
      if (res?.messages && res.messages.length > 0) {
        setMessages(res.messages.map((m) => [m.sender, m.text, m.time]));
      }
    }).catch(() => {});

    apiClient.game.getState(room.id).then((res) => {
      if (res?.state) {
        if (res.state.paused !== undefined) setPaused(res.state.paused);
        // Only adopt called numbers if the room is actively in a live calling phase for non-tournament rooms
        if (!isTournament && res.state.phase === "live" && Array.isArray(res.state.called) && res.state.called.length > 0) {
          setCalled(res.state.called);
          if (res.state.current) setCurrent(res.state.current);
          setPhase("live");
        } else if (isTournament) {
          setCalled([]);
          setCurrent(null);
          setPhase(tourneyData?.status === "Live" ? "live" : "selling");
        } else {
          setCalled([]);
          setCurrent(null);
          setPhase("selling");
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
          setManualMarks([]);
          setCardSeed((s) => s + 1);
          setSelectedCards([0]);
          setActiveCard(0);
          setPhase("selling");
          setPaused(false);
          setClaimLocked(false);
          setWinnerNames([]);
          setShowWinModal(false);
          setHasShownEndModal(false);
          setTourneyModal(null);
          notify("Round reset. Select your cards to play!");
        } else if (event.action === "declare-winner") {
          const d = event.data as { player?: string; prize?: number; pattern?: string };
          if (d?.player) {
            setWinnerNames([d.player]);
            if (d.prize) setWinnerPrize(d.prize);
            if (d.pattern) setWinnerPattern(d.pattern);
            setPhase("results");
            const isWinner = d.player.toLowerCase() === currentUsername.toLowerCase();
            if (isWinner) {
              setShowWinModal(true);
              setHasShownEndModal(true);
            }
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

      // Tournament engine events
      if (event.entity === "tournaments" || event.entity === "tournament") {
        const t = event.data as any;
        const evtId = event.roomId || t?.id;
        if (!evtId || evtId === targetTourneyId || evtId === tourneyData?.id || t?.name?.toLowerCase() === room.name.toLowerCase()) {
          if (event.action === "schedule-tick") {
            if (typeof t?.engine?.scheduledStartSeconds === "number") {
              setTourneyCountdown(t.engine.scheduledStartSeconds);
            }
          } else if (event.action === "start") {
            notify(`🚀 Tournament "${t?.name || room.name}" is now LIVE! Stage 1: ${t?.currentStageName || "Qualifiers"}`);
            setPhase("live");
            refreshTourneyState();
          } else if (event.action === "complete") {
            setPhase("results");
            refreshTourneyState();
          } else {
            refreshTourneyState();
          }
        }
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
    if (isTournament && called.length >= maxOpenBalls) return;
    const delays: Record<string, number> = { Slow: 3200, Normal: 2100, Fast: room.callDelay ?? 1200, Turbo: 600 };
    const timer = window.setInterval(() => {
      setCalled((previous) => {
        if (isTournament && previous.length >= maxOpenBalls) return previous;
        const next = BingoEngine.nextNumber(previous, ballCount);
        if (next === null) return previous;
        setCurrent(next);
        if ((previous.length + 1) % 5 === 0) setMessages((items) => [...items.slice(-7), ["System", `Ball ${ballLabel(next)} has been called.`, "now"]]);
        return [...previous, next];
      });
      apiClient.game.callNext(room.id).catch(() => {});
    }, delays[speed]);
    return () => window.clearInterval(timer);
  }, [phase, paused, speed, ballCount, room.callDelay, ballLabel, room.id, isTournament, maxOpenBalls, called.length]);

  useEffect(() => {
    if (phase !== "live") return;
    if (maxRoomCapacity <= 1) return;
    const timer = window.setInterval(() => {
      setDriftPlayers((v) => {
        const total = room.players + v;
        if (total >= maxRoomCapacity) return Math.max(0, maxRoomCapacity - room.players);
        return v + (Math.random() > 0.35 ? 1 : -1);
      });
      setDriftCards((v) => v + (Math.random() > 0.4 ? 1 : 0));
      if (room.jackpot) setDriftJackpot((v) => v + 0.25);
    }, 2200);
    return () => window.clearInterval(timer);
  }, [phase, room.jackpot, maxRoomCapacity, room.players]);

  useEffect(() => {
    if (phase !== "live" || claimLocked) return;
    if (isTournament) {
      if (called.length >= maxOpenBalls) {
        handleTourneyStageComplete(isUserPatternComplete);
      }
      return;
    }
    const thresholds = ballCount === 90 ? [7, 13, 19] : ballCount === 30 ? [8] : ballCount === 80 ? [7, 12, 18] : stages.length > 1 ? [7, 13, 20, 26] : [12];
    if (called.length >= (thresholds[stageIndex] ?? 14)) triggerWinner(stageIndex === 1 ? ["LuckyStar", "MikaK"] : [stageIndex === 0 ? "LuckyStar" : currentUsername]);
    // triggerWinner intentionally reads the current render state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [called.length, phase, stageIndex, claimLocked, ballCount, stages.length, isTournament, maxOpenBalls, isUserPatternComplete]);

  function injectWinningNumbers() {
    const values = cardValues[safeActiveCard];
    const winning = targetCells(currentStagePattern).map((index) => values[index]).filter((value): value is number => typeof value === "number");
    setCalled((previous) => Array.from(new Set([...previous, ...winning])));
  }

  const handleTourneyStageComplete = async (userClaimed = false) => {
    if (claimLocked) return;
    setClaimLocked(true);
    setPaused(true);

    const isFinalStage = stageIndex >= stages.length - 1;
    const didUserWin = Boolean(userClaimed || isUserPatternComplete);

    if (isFinalStage) {
      if (didUserWin) {
        apiClient.tournaments.complete(targetTourneyId, currentUsername).catch(() => {});
        const grandPrize = tourneyData?.prizePool || room.prize || 25000;
        setWallet((w) => Math.round((w + grandPrize) * 100) / 100);
        setLastWinner(`${currentUsername} · ${money(grandPrize)}`);
        setWinnerPrize(grandPrize);
        setWinnerNames([currentUsername]);
        setMessages((items) => [
          ...items,
          ["System", `🏆 TOURNAMENT CHAMPION! ${currentUsername} completed ${currentStagePattern} in Grand Final and takes home ${money(grandPrize)}!`, "now"],
        ]);
        notify(`🏆 GRAND CHAMPION! You won the Tournament and ${money(grandPrize)}!`);
        setTourneyModal("champion");
      } else {
        setLastWinner(`LuckyStar · ${money(tourneyData?.prizePool || 25000)}`);
        setMessages((items) => [
          ...items,
          ["System", `📢 Grand Final complete. LuckyStar completed ${currentStagePattern} and takes 1st Place.`, "now"],
        ]);
        notify(`💔 Tournament completed. You did not achieve ${currentStagePattern} in time.`);
        setTourneyModal("eliminated");
      }
      return;
    }

    // Intermediate stage (Qualifiers, Round of 256, Round of 128, Semi Final)
    if (didUserWin) {
      apiClient.tournaments.scoreStage(targetTourneyId, [
        { player: currentUsername, points: 85, wins: 1, fast: `${called.length} balls` },
      ]).catch(() => {});
      setLastWinner(`${currentUsername} · Stage ${stageIndex + 1} Qualified`);
      setMessages((items) => [
        ...items,
        ["System", `🎉 ${currentUsername} completed ${currentStagePattern} in Stage ${stageIndex + 1} (${activeStage.name})! Advancing to ${stages[stageIndex + 1]?.name || "next stage"}.`, "now"],
      ]);
      notify(`🎉 Congratulations! You completed ${currentStagePattern} in ${activeStage.name}! Moving to Stage ${stageIndex + 2}.`);
      setTourneyModal("advance");
    } else {
      setLastWinner(`LuckyStar · Cut applied`);
      setMessages((items) => [
        ...items,
        ["System", `📢 Stage ${stageIndex + 1} ended (${maxOpenBalls} balls). ${currentUsername} did not complete ${currentStagePattern}.`, "now"],
      ]);
      notify(`💔 Stage cut applied. You did not complete ${currentStagePattern} within ${maxOpenBalls} open balls.`);
      setTourneyModal("eliminated");
    }
  };

  const proceedToNextTourneyStage = () => {
    setTourneyModal(null);
    const nextIdx = stageIndex + 1;
    setStageIndex(nextIdx);
    setCardSeed((s) => s + 1);
    setSelectedCards(Array.from({ length: tourneyCardsCount }, (_, i) => i));
    setActiveCard(0);
    apiClient.tournaments.advance(targetTourneyId).catch(() => {});
    setCalled([]);
    setCurrent(null);
    setManualMarks([]);
    setClaimLocked(false);
    setPaused(false);
    setPhase("live");
    notify(`🔔 Round ${nextIdx + 1}: ${stages[nextIdx]?.name || "Next Stage"} is now LIVE! Target: ${stages[nextIdx]?.pattern || "One Line"}`);
  };

  const handleTourneyBingo = () => {
    if (phase !== "live" || claimLocked) return;
    injectWinningNumbers();
    handleTourneyStageComplete(true);
  };

  const startTourneyStage = () => {
    setCalled([]);
    setCurrent(null);
    setManualMarks([]);
    setClaimLocked(false);
    setPaused(false);
    setPhase("live");
    notify(`🚀 Stage ${stageIndex + 1} (${activeStage.name}) is now live!`);
  };

  function triggerWinner(names = [currentUsername]) {
    if (phase !== "live" || claimLocked) return;
    setClaimLocked(true);
    injectWinningNumbers();
    setWinnerNames(names);
    setWinnerPattern(activeStage.name);
    const jackpotQualified = room.jackpot && activeStage.name.includes("Full") && called.length <= (room.progressiveBallLimit ?? 42);
    const stagePrize = activeStage.prize > 0 ? activeStage.prize : Math.max(25, Math.round((room.prize || 100) / (stages.length || 1)));
    const total = jackpotQualified ? liveJackpot : stagePrize;
    const splitPrize = Math.max(1, Math.round((total / Math.max(1, names.length)) * 100) / 100);
    setWinnerPrize(splitPrize);

    const isIntermediate = Boolean(activeStage.continueAfterWin && stageIndex < stages.length - 1);

    if (isIntermediate) {
      // Intermediate stage win: do NOT block screen with modal! Keep user in live game!
      setLastWinner(`${names.join(" & ")} · ${money(total)}`);
      if (names.includes(currentUsername)) {
        setWallet(Math.round((wallet + splitPrize) * 100) / 100);
        apiClient.game.claim(room.id, { ticketId: `CARD-${activeCard}`, playerName: currentUsername, manualPattern: activeStage.name }).then((res) => {
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
      if (names.includes(currentUsername)) {
        if (jackpotQualified) {
          apiClient.jackpots.list().then((list) => {
            const jp = list.find((j) => j.linkedRooms?.includes(room.id) || j.variant?.toLowerCase().includes(room.variant?.toLowerCase().slice(0, 2)));
            if (jp) {
              apiClient.jackpots.trigger(jp.id, currentUsername).then((res) => {
                if (res?.wallet !== undefined) setWallet(res.wallet);
              });
            }
          }).catch(() => {});
          notify(`🎉 MEGA JACKPOT WON! You scored Full House in ${called.length} balls and won ${money(splitPrize)}!`);
        } else {
          setWallet(Math.round((wallet + splitPrize) * 100) / 100);
          apiClient.game.claim(room.id, { ticketId: `CARD-${activeCard}`, playerName: currentUsername, manualPattern: activeStage.name }).then((res) => {
            if (res?.wallet !== undefined) setWallet(res.wallet);
          });
          notify(`🏆 Full House BINGO! You won ${money(splitPrize)}! Round complete.`);
        }
      } else {
        notify(`🏆 Game round complete! ${names.join(" & ")} won ${activeStage.name} (${money(splitPrize)} each).`);
      }
      setMessages((items) => [
        ...items,
        ["System", `🏆 Final stage (${activeStage.name}) won by ${names.join(" & ")}! ${names.length > 1 ? `${money(total)} split equally.` : money(total)}`, "now"],
      ]);
      setPhase("results");
      const isUserWinner = names.some((n) => n.toLowerCase() === currentUsername.toLowerCase());
      if (!hasShownEndModal && isUserWinner) {
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

  const startRound = async () => {
    let cardsToBuy = selectedCards;
    if (!cardsToBuy.length) {
      cardsToBuy = [safeActiveCard];
      setSelectedCards([safeActiveCard]);
    }
    const payableCardsCount = room.promotion === "Buy 3 Get 1" ? cardsToBuy.length - Math.floor(cardsToBuy.length / 4) : cardsToBuy.length;
    const currentCost = room.promotion === "Happy Hour" ? Math.round(room.ticketPrice * payableCardsCount * 0.75 * 100) / 100 : room.ticketPrice * payableCardsCount;
    if (wallet < currentCost) return notify("Not enough wallet balance for these cards.");

    const res = await apiClient.tickets.buy(room.id, cardsToBuy.length, currentUsername, currentUser?.id);
    if (!res || !res.success) {
      notify(`⚠️ ${res?.error || "Cannot join: Room capacity limit reached."}`);
      return;
    }

    if (res?.wallet !== undefined) setWallet(res.wallet);
    setCalled([]);
    setCurrent(null);
    setManualMarks([]);
    setWinnerNames([]);
    setWinnerPrize(0);
    setWinnerPattern("");
    setHasShownEndModal(false);
    setShowWinModal(false);
    setPhase("countdown");
    setCountdown(5);
    notify(`${cardsToBuy.length} card${cardsToBuy.length > 1 ? "s" : ""} secured · ${TransactionManager.reference("TRUEIG")}`);
  };

  const nextRound = () => {
    setCalled([]);
    setCurrent(null);
    setManualMarks([]);
    setCardSeed((s) => s + 1);
    setSelectedCards([0]);
    setActiveCard(0);
    setPhase("selling");
    setCountdown(5);
    setPaused(false);
    setStageIndex(0);
    setClaimLocked(false);
    setWinnerNames([]);
    setShowWinModal(false);
    setHasShownEndModal(false);
    setTourneyModal(null);
    if (room.id === "pattern-arena") setPatternRound((value) => (value + 1) % patternSeries.length);
    apiClient.game.restart(room.id).catch(() => {});
    notify(room.id === "pattern-arena" ? `Next pattern loaded: ${patternSeries[(patternRound + 1) % patternSeries.length]}.` : "Next round is open for tickets. Select cards to play!");
  };

  const sendChat = (event: FormEvent) => {
    event.preventDefault();
    if (!chat.trim()) return;
    const text = chat.trim();
    setMessages((items) => [...items, [currentUsername, text, "now"]]);
    setChat("");
    apiClient.chat.send(room.id, text, currentUsername).catch(() => {});
  };

  const toggleCard = (index: number) => {
    if (phase !== "selling") return setActiveCard(index);
    setSelectedCards((cards) => cards.includes(index) ? cards.filter((item) => item !== index) : cards.length < maxCards ? [...cards, index] : cards);
    setActiveCard(index);
  };

  const visibleCards = [
    ...(isTournament
      ? (selectedCards.length > 0 ? selectedCards : [0])
      : phase === "selling" || selectedCards.length === 0
      ? Array.from({ length: maxCards }, (_, index) => index)
      : selectedCards)
  ].sort((a, b) => (sortDirection === "asc" ? a - b : b - a));

  return (
    <div className="game-page">
      <div className="game-topbar">
        <button className="back-button" onClick={goBack}>← <span>Trueigtech Lobby</span></button>
        <div className="game-room-title">
          <span className={`mini-orb accent-${room.accent}`}>{ballCount}</span>
          <div>
            <h1>{tourneyData ? tourneyData.name : room.name}</h1>
            <p>{isTournament ? `🏆 Tournament Stage: ${tourneyData?.currentStageName || room.round || "Qualifiers"}` : `${room.variant} · Game TRUEIG-${2842 + patternRound}`}</p>
          </div>
          <StatusPill
            status={
              isTournament
                ? (tourneyData?.status === "Live"
                    ? "Live"
                    : tourneyCountdown !== null && tourneyCountdown > 0
                      ? "Starting Soon"
                      : "Scheduled")
                : (phase === "live" ? "Live" : phase === "selling" ? "Selling Tickets" : "Starting Soon")
            }
            label={
              isTournament
                ? (tourneyData?.status === "Live"
                    ? `LIVE · ${tourneyData.currentStageName || "Qualifiers"}`
                    : tourneyCountdown !== null && tourneyCountdown > 0
                      ? `Starts in ${tourneyCountdown}s`
                      : "Awaiting Start")
                : undefined
            }
          />
        </div>
        <div className="game-top-actions">
          {room.promotion && room.promotion !== "None" && !isTournament && (
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
            <small>{isTournament ? "Tournament Prize" : (room.jackpot ? "Jackpot" : "Prize pool")}</small>
            <b>{money(tourneyData ? tourneyData.prizePool : (room.jackpot ? liveJackpot : room.prize))}</b>
          </span>
          <span>
            <small>Players</small>
            <b>{tourneyData ? `${tourneyData.playersCount} / ${tourneyData.maxPlayers}` : `${livePlayers} / ${maxRoomCapacity}`}</b>
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
            {isTournament && tourneyData?.status !== "Live" ? (
              tourneyCountdown !== null && tourneyCountdown > 0 ? (
                <>
                  <small>TOURNAMENT STARTS IN</small>
                  <strong style={{ fontSize: "26px", letterSpacing: "1px" }}>{formatTime(tourneyCountdown)}</strong>
                </>
              ) : tourneyData?.status === "Completed" ? (
                <>
                  <small>CHAMPION</small>
                  <strong style={{ fontSize: "28px" }}>🏆</strong>
                </>
              ) : (
                <>
                  <small>TOURNAMENT</small>
                  <strong style={{ fontSize: "20px" }}>STANDBY</strong>
                </>
              )
            ) : phase === "selling" ? (
              <><small>ROUND OPENS</small><strong>00:18</strong></>
            ) : phase === "countdown" ? (
              <><small>STARTING IN</small><strong>{countdown}</strong></>
            ) : (
              <><small>{current && ballCount === 75 ? BingoEngine.label(current).split("-")[0] : "BALL"}</small><strong>{current ?? "—"}</strong></>
            )}
          </div>
          <div className="caller-state">
            <h2>
              {isTournament && tourneyData?.status !== "Live"
                ? tourneyCountdown !== null && tourneyCountdown > 0
                  ? "Tournament Scheduled"
                  : tourneyData?.status === "Completed"
                    ? "Tournament Completed"
                    : "Awaiting Tournament Start"
                : phase === "selling"
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
              {isTournament && tourneyData?.status !== "Live"
                ? tourneyCountdown !== null && tourneyCountdown > 0
                  ? `Stage 1 (${stages[0]?.name || "Qualifiers"}) auto-starts in ${tourneyCountdown}s`
                  : tourneyData?.status === "Completed"
                    ? `Champion: ${tourneyData?.winner || "Ari.R"}`
                    : `Stage 1: ${stages[0]?.name || "Qualifiers"} · ${tourneyData?.startsAt || "Scheduled"}`
                : phase === "live"
                  ? `${voiceOn ? "Voice on" : "Voice off"} · ${speed} pace · next ball in ${speed === "Turbo" ? "0.6" : "1.2"}s`
                  : activeStage.name}
            </p>
          </div>
          <div className="recent-calls">
            <small>PREVIOUS BALLS</small>
            <div>
              {called.slice(-5).reverse().map((number, index) => (
                <span className={index === 0 ? "latest" : ""} key={`recent-${number}-${index}`}>
                  {ballLabel(number).replace("-", "")}
                </span>
              ))}
              {!called.length && <em>Numbers appear here</em>}
            </div>
          </div>
          <div className="winning-stage-list">
            <small>{isTournament ? `TOURNAMENT STAGES (${stages.length} ROUNDS)` : "WINNING STAGES"}</small>
            {stages.map((stage: any, index: number) => (
              <div className={`${index === stageIndex ? "active" : ""} ${index < stageIndex ? "complete" : ""}`} key={`${stage.name}-${index}`}>
                <i>{index < stageIndex ? "✓" : index + 1}</i>
                <span>
                  <b>{stage.name}</b>
                  <small>{isTournament && stage.pattern ? `${stage.pattern} · ` : ""}{money(stage.prize)} · {stage.continueAfterWin ? "advance" : "final stage"}</small>
                </span>
              </div>
            ))}
          </div>
          <div className="pattern-preview">
            <div>
              <small>{isTournament ? "ACTIVE STAGE TARGET" : "ACTIVE TARGET"}</small>
              <strong>{isTournament ? (activeStage.pattern ? `${activeStage.pattern} (${activeStage.name})` : activeStage.name) : activeStage.name}</strong>
              <span>{isTournament ? `Target: ${currentStagePattern} · ${money(activeStage.prize)}` : (room.jackpot ? `Jackpot within ${room.progressiveBallLimit} balls` : `Prize · ${money(activeStage.prize)}`)}</span>
            </div>
            <div className={`mini-pattern pattern-${columns}`}>
              {Array.from({ length: Math.min(25, rows * columns) }, (_, index) => (
                <i className={targetCells(currentStagePattern).includes(index) ? "marked" : ""} key={index} />
              ))}
            </div>
          </div>
          {isTournament && tourneyData?.status !== "Live" ? (
            tourneyData?.status === "Completed" ? (
              <div style={{
                marginTop: "16px",
                background: "linear-gradient(135deg, rgba(254, 202, 87, 0.1), rgba(255, 159, 67, 0.04))",
                border: "1px solid rgba(254, 202, 87, 0.3)",
                borderRadius: "10px",
                padding: "16px 14px",
                textAlign: "center",
              }}>
                <div style={{ fontSize: "32px", marginBottom: "6px" }}>🏆</div>
                <h3 style={{ margin: "0 0 2px", fontSize: "15px", color: "#fff", fontWeight: 800 }}>
                  Tournament Completed
                </h3>
                <p style={{ margin: "0", fontSize: "12px", color: "#feca57", fontWeight: 700 }}>
                  Champion: {tourneyData.winner || "Ari.R"}
                </p>
                <span style={{ display: "block", fontSize: "11px", color: "#928ca7", margin: "4px 0 10px" }}>
                  1st Prize: {money(tourneyData.prizeDistribution?.["1st"] || 30000)}
                </span>
                <button
                  type="button"
                  className="outline-button"
                  onClick={goBack}
                  style={{
                    borderColor: "rgba(254, 202, 87, 0.5)",
                    color: "#feca57",
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "6px 14px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  ← Return to Tournaments
                </button>
              </div>
            ) : isRegistered ? (
              <div style={{
                marginTop: "16px",
                background: tourneyCountdown !== null && tourneyCountdown > 0
                  ? "linear-gradient(135deg, rgba(254, 202, 87, 0.12), rgba(255, 159, 67, 0.05))"
                  : "rgba(39, 215, 173, 0.06)",
                border: tourneyCountdown !== null && tourneyCountdown > 0
                  ? "1px solid rgba(254, 202, 87, 0.4)"
                  : "1px solid rgba(39, 215, 173, 0.25)",
                borderRadius: "10px",
                padding: "14px",
                textAlign: "center",
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                  paddingBottom: "8px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                }}>
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    color: "#27d7ad",
                    fontWeight: 800,
                    fontSize: "12px",
                  }}>
                    ✓ Seat Confirmed
                  </span>
                  <span style={{
                    color: "#928ca7",
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}>
                    Seat #{tourneyData?.playersCount || 1}
                  </span>
                </div>

                {tourneyCountdown !== null && tourneyCountdown > 0 ? (
                  <div style={{ margin: "8px 0" }}>
                    <span style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "1px", color: "#feca57", textTransform: "uppercase" }}>
                      ⏳ TOURNAMENT STARTS IN
                    </span>
                    <div style={{ fontSize: "34px", fontWeight: 900, color: "#fff", margin: "4px 0", letterSpacing: "2px", fontFamily: "monospace" }}>
                      {formatTime(tourneyCountdown)}
                    </div>
                    <p style={{ margin: "0", fontSize: "11px", color: "#feca57", fontWeight: 600 }}>
                      Round begins automatically · Stand by
                    </p>
                  </div>
                ) : (
                  <div style={{ margin: "6px 0 10px" }}>
                    <div style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "rgba(39, 215, 173, 0.15)",
                      color: "#27d7ad",
                      fontSize: "12px",
                      fontWeight: 700,
                      padding: "5px 12px",
                      borderRadius: "16px",
                      marginBottom: "6px",
                    }}>
                      <span style={{
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        background: "#27d7ad",
                        boxShadow: "0 0 6px #27d7ad",
                        display: "inline-block",
                      }} />
                      Awaiting Tournament Start
                    </div>
                    <p style={{ margin: "0", fontSize: "11px", color: "#928ca7" }}>
                      Your seat is locked in. Ready to play!
                    </p>
                  </div>
                )}

                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 10px",
                  background: "rgba(0, 0, 0, 0.2)",
                  borderRadius: "6px",
                  fontSize: "11px",
                  marginTop: "6px",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                }}>
                  <span style={{ color: "#928ca7" }}>Stage 1</span>
                  <b style={{ color: "#fff" }}>{stages[0]?.name || "Qualifiers"}</b>
                </div>

                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 10px",
                  background: "rgba(0, 0, 0, 0.2)",
                  borderRadius: "6px",
                  fontSize: "11px",
                  marginTop: "4px",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                }}>
                  <span style={{ color: "#928ca7" }}>Prize Pool</span>
                  <b style={{ color: "#feca57" }}>{money(tourneyData?.prizePool || room.prize)}</b>
                </div>
              </div>
            ) : (
              <div style={{
                marginTop: "16px",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "10px",
                padding: "14px",
                textAlign: "center",
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                  paddingBottom: "8px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                }}>
                  <span style={{ color: "#feca57", fontWeight: 700, fontSize: "12px" }}>
                    ⚡ Registration Open
                  </span>
                  <span style={{ color: "#fff", fontWeight: 700, fontSize: "12px" }}>
                    Entry: {money(tourneyData?.entryFee || room.ticketPrice)}
                  </span>
                </div>

                {tourneyCountdown !== null && tourneyCountdown > 0 && (
                  <div style={{
                    padding: "8px",
                    borderRadius: "6px",
                    background: "rgba(254, 202, 87, 0.12)",
                    border: "1px solid rgba(254, 202, 87, 0.3)",
                    marginBottom: "10px",
                  }}>
                    <span style={{ fontSize: "10px", fontWeight: 800, color: "#feca57", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                      ⏳ Auto-starts in {formatTime(tourneyCountdown)}
                    </span>
                  </div>
                )}

                <button
                  className="buy-button"
                  onClick={handleRegisterTournament}
                  disabled={actionLoading}
                  style={{
                    background: "linear-gradient(135deg, #27d7ad, #00b894)",
                    color: "#000",
                    fontWeight: 800,
                    fontSize: "14px",
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  {actionLoading ? "Registering..." : `Enter Tournament · ${money(tourneyData?.entryFee || room.ticketPrice)} →`}
                </button>
                <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#928ca7" }}>
                  One-time fee enters you into all {stages.length} stages.
                </p>
              </div>
            )
          ) : isTournament && tourneyData?.status === "Live" ? (
            <div className="ticket-purchase" style={{ border: "1px solid rgba(43, 221, 170, 0.3)", background: "rgba(43, 221, 170, 0.05)", borderRadius: "12px", padding: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "13px", color: "#2bddaa", fontWeight: 800 }}>
                  🟢 STAGE {stageIndex + 1}: {activeStage.name.toUpperCase()}
                </span>
                <span style={{
                  background: isUserPatternComplete ? "rgba(43,221,170,0.2)" : "rgba(254,202,87,0.15)",
                  color: isUserPatternComplete ? "#2bddaa" : "#feca57",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: 800,
                  border: isUserPatternComplete ? "1px solid #2bddaa" : "1px solid rgba(254,202,87,0.3)"
                }}>
                  {isUserPatternComplete ? "✓ BINGO READY" : "IN PLAY"}
                </span>
              </div>

              <div style={{
                background: "rgba(0,0,0,0.25)",
                borderRadius: "8px",
                padding: "10px",
                margin: "8px 0",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                fontSize: "12px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#928ca7" }}>Target Pattern:</span>
                  <b style={{ color: "#feca57" }}>{currentStagePattern}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#928ca7" }}>Cards in Play:</span>
                  <b style={{ color: "#fff" }}>{selectedCards.length} Card{selectedCards.length > 1 ? "s" : ""} (Fixed)</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#928ca7" }}>Open Balls:</span>
                  <b style={{ color: "#2bddaa" }}>{called.length} / {maxOpenBalls}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#928ca7" }}>Pattern Matches:</span>
                  <b style={{ color: isUserPatternComplete ? "#2bddaa" : "#e2e1e8" }}>
                    {patternMatchedCount} / {requiredPatternIndices.length} cells
                  </b>
                </div>
              </div>

              {phase !== "live" ? (
                <button className="buy-button" onClick={startTourneyStage} style={{ marginTop: "8px" }}>
                  Play Stage {stageIndex + 1}: {activeStage.name} <span>→</span>
                </button>
              ) : (
                <button
                  className={`bingo-button ${isUserPatternComplete ? "ready-win" : ""}`}
                  onClick={handleTourneyBingo}
                  disabled={phase !== "live"}
                  style={{
                    marginTop: "10px",
                    background: isUserPatternComplete ? "linear-gradient(135deg, #2bddaa, #00b894)" : undefined,
                    color: isUserPatternComplete ? "#0c0a1d" : undefined,
                    boxShadow: isUserPatternComplete ? "0 0 20px rgba(43,221,170,0.7)" : undefined,
                    fontWeight: 800,
                  }}
                >
                  <span>{isUserPatternComplete ? "CLAIM BINGO!" : "BINGO!"}</span>
                  <small>{isUserPatternComplete ? `Qualify for Stage ${stageIndex + 2} →` : `Match ${currentStagePattern} to qualify`}</small>
                </button>
              )}
              {phase === "live" && (
                <button className="caller-pause-button" onClick={togglePause} style={{ marginTop: "6px" }}>
                  {paused ? "▶ Resume caller" : "Ⅱ Pause caller"}
                </button>
              )}
            </div>
          ) : phase === "selling" ? (
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
              <button className="bingo-button" onClick={() => triggerWinner([currentUsername])} disabled={phase !== "live"}>
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
              ["PLAYERS ONLINE", tourneyData ? `${tourneyData.playersCount} / ${tourneyData.maxPlayers}` : `${livePlayers} / ${maxRoomCapacity}`],
              ["CARDS SOLD", liveCards],
              ["CARD LIMIT", `Max ${maxCards}`],
              ["PRIZE POOL", money(tourneyData ? tourneyData.prizePool : room.prize)],
              ["LAST WINNER", lastWinner],
              ["PACE", isTournament ? "Elimination Rounds" : (room.frequency ?? "Every 10 min")],
            ].map((stat) => (
              <span key={stat[0]}>
                <small>{stat[0]}</small>
                <b>{stat[1]}</b>
              </span>
            ))}
          </div>
          <div className="cards-toolbar">
            <div>
              <h2>{isTournament ? "Tournament Cards" : (phase === "selling" ? "Choose cards" : "Your cards")} <span>{selectedCards.length}</span></h2>
              <p>
                {isTournament
                  ? `Card #0${activeCard + 1} · Enrolled in ${tourneyData?.currentStageName || activeStage.name} · ${selectedCards.includes(activeCard) ? "In Play" : "Card Standby"}`
                  : phase === "selling"
                  ? `Card #0${activeCard + 1} · ${selectedCards.includes(activeCard) ? "Selected for next round" : "Click card to select"}`
                  : `Card #0${activeCard + 1} · ${called.filter((number) => cardValues[activeCard]?.includes(number)).length} matches`}
              </p>
            </div>
            <div className="card-tools">
              {isTournament ? (
                <>
                  <span className="tourney-status-chip" style={{
                    background: "rgba(124, 77, 255, 0.15)",
                    border: "1px solid rgba(124, 77, 255, 0.4)",
                    color: "#feca57",
                    borderRadius: "6px",
                    padding: "4px 10px",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}>
                    🎯 Target: {currentStagePattern}
                  </span>
                  <span className="tourney-balls-chip" style={{
                    background: "rgba(43, 221, 170, 0.12)",
                    border: "1px solid rgba(43, 221, 170, 0.3)",
                    color: "#2bddaa",
                    borderRadius: "6px",
                    padding: "4px 10px",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}>
                    🎱 {called.length} / {maxOpenBalls} Balls
                  </span>
                  <span style={{
                    background: isUserPatternComplete ? "rgba(43, 221, 170, 0.2)" : "rgba(255, 255, 255, 0.06)",
                    border: isUserPatternComplete ? "1px solid #2bddaa" : "1px solid rgba(255, 255, 255, 0.12)",
                    color: isUserPatternComplete ? "#2bddaa" : "#e2e1e8",
                    borderRadius: "6px",
                    padding: "4px 10px",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}>
                    {isUserPatternComplete ? "✓ BINGO COMPLETE" : `${patternMatchedCount}/${requiredPatternIndices.length} Matched`}
                  </span>
                  {selectedCards.length > 1 && (
                    <button className={multiView ? "active" : ""} onClick={() => setMultiView(!multiView)}>
                      {multiView ? "Single View" : "Multi-view"}
                    </button>
                  )}
                </>
              ) : (
                <>
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
                </>
              )}
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
            {visibleCards.map((index, cardIdx) => (
              <TrueigTicket
                key={`ticket-${index}-${cardIdx}`}
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
                <span className={called.includes(number) ? "called" : ""} key={`board-${number}`}>{number}</span>
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
              ["3", currentUsername, "1 win"],
            ].map((row, idx) => (
              <p key={`leader-${row[0]}-${idx}`}><i>{row[0]}</i><span>{row[1]}</span><small>{row[2]}</small></p>
            ))}
          </div>
        </aside>
      </div>
      {showWinModal && winnerNames.some((name) => name.toLowerCase() === currentUsername.toLowerCase()) && (
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
            <h2>🎉 You Won BINGO!</h2>
            <p>
              {winnerNames.length > 1
                ? `You and ${winnerNames.filter((n) => n.toLowerCase() !== currentUsername.toLowerCase()).join(" & ")} completed ${winnerPattern || activeStage.name} after ${called.length} balls!`
                : `You completed ${winnerPattern || activeStage.name} after ${called.length} balls!`}
            </p>
            <div className="winner-avatars">
              {winnerNames.map((name, idx) => (
                <span
                  key={`${name}-${idx}`}
                  style={{
                    background: name.toLowerCase() === currentUsername.toLowerCase() ? "linear-gradient(135deg, #2bddaa, #00b894)" : undefined,
                    color: name.toLowerCase() === currentUsername.toLowerCase() ? "#000" : undefined,
                    fontWeight: 800,
                  }}
                >
                  {name.slice(0, 2).toUpperCase()}
                </span>
              ))}
            </div>
            {winnerPrize > 0 ? (
              <strong className="winner-prize" style={{ color: room.jackpot && (winnerPattern || activeStage.name).includes("Full") && called.length <= (room.progressiveBallLimit ?? 42) ? "#ffd32a" : "#2bddaa" }}>
                {money(winnerPrize)} won!
              </strong>
            ) : (
              <strong className="winner-prize" style={{ color: "#2bddaa" }}>
                {isTournament ? "Stage Qualified! 🏆" : "Round Won!"}
              </strong>
            )}
            <small>
              {winnerNames.length > 1
                ? `${winnerNames.length} simultaneous winners · prize split equally`
                : room.jackpot && (winnerPattern || activeStage.name).includes("Full") && called.length <= (room.progressiveBallLimit ?? 42)
                  ? `🏆 PROGRESSIVE JACKPOT HIT within ${called.length} balls (under ${room.progressiveBallLimit ?? 42} limit)!`
                  : room.jackpot && (winnerPattern || activeStage.name).includes("Full")
                    ? `Full House achieved after progressive cut (${called.length} balls)`
                    : `Winning Card #0${activeCard + 1}`}
            </small>
            <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.08)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.15)",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
                onClick={() => setShowWinModal(false)}
              >
                View results
              </button>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #2bddaa, #00b894)",
                  color: "#0c0a1d",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 800,
                }}
                onClick={() => {
                  setShowWinModal(false);
                  nextRound();
                }}
              >
                Open next round →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tournament Stage Win / Qualification Modal */}
      {tourneyModal === "advance" && (
        <div className="game-claim-modal" style={{ zIndex: 9999 }}>
          <div className="claim-card" style={{ maxWidth: "460px", textAlign: "center", border: "1px solid rgba(43, 221, 170, 0.4)", boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}>
            <button className="claim-close" onClick={() => setTourneyModal(null)}>×</button>
            <div className="trueig-modal-brand">TRUEIGTECH TOURNAMENT ENGINE</div>
            <div className="claim-icon" style={{ background: "linear-gradient(135deg, #2bddaa, #00b894)", color: "#000", fontSize: "28px" }}>✓</div>
            <span className="section-kicker" style={{ color: "#2bddaa" }}>STAGE {stageIndex + 1} COMPLETE</span>
            <h2 style={{ fontSize: "24px", margin: "8px 0" }}>🎉 Congratulations!</h2>
            <p style={{ fontSize: "14px", color: "#e2e1e8", margin: "0 0 16px" }}>
              You won <b>Stage {stageIndex + 1}: {activeStage.name}</b> and qualified for the next round!
            </p>

            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "12px", padding: "14px", border: "1px solid rgba(255,255,255,0.08)", marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>
                <div>
                  <small style={{ color: "#928ca7", display: "block", fontSize: "11px", fontWeight: 700 }}>YOUR RANK</small>
                  <strong style={{ fontSize: "20px", color: "#2bddaa" }}>#1</strong>
                </div>
                <div style={{ width: "1px", height: "30px", background: "rgba(255,255,255,0.1)" }} />
                <div>
                  <small style={{ color: "#928ca7", display: "block", fontSize: "11px", fontWeight: 700 }}>STATUS</small>
                  <strong style={{ fontSize: "15px", color: "#2bddaa" }}>QUALIFIED ✓</strong>
                </div>
                <div style={{ width: "1px", height: "30px", background: "rgba(255,255,255,0.1)" }} />
                <div>
                  <small style={{ color: "#928ca7", display: "block", fontSize: "11px", fontWeight: 700 }}>NEXT ROUND</small>
                  <strong style={{ fontSize: "15px", color: "#feca57" }}>Stage {stageIndex + 2}</strong>
                </div>
              </div>
            </div>

            <div style={{ padding: "10px", background: "rgba(43,221,170,0.08)", borderRadius: "10px", border: "1px dashed rgba(43,221,170,0.3)", marginBottom: "18px" }}>
              <span style={{ fontSize: "13px", color: "#e2e1e8" }}>
                Moving to <b>{stages[stageIndex + 1]?.name || `Round ${stageIndex + 2}`}</b>! Opponents eliminated.
              </span>
            </div>

            <button
              type="button"
              className="admin-primary"
              style={{
                width: "100%",
                padding: "13px",
                fontSize: "15px",
                fontWeight: 800,
                background: "linear-gradient(135deg, #2bddaa, #00b894)",
                color: "#0c0a1d",
                borderRadius: "10px",
                cursor: "pointer",
              }}
              onClick={proceedToNextTourneyStage}
            >
              Proceed to Stage {stageIndex + 2}: {stages[stageIndex + 1]?.name || `Round ${stageIndex + 2}`} →
            </button>
          </div>
        </div>
      )}

      {/* Tournament Elimination Modal */}
      {tourneyModal === "eliminated" && (
        <div className="game-claim-modal" style={{ zIndex: 9999 }}>
          <div className="claim-card" style={{ maxWidth: "460px", textAlign: "center", border: "1px solid rgba(255, 92, 122, 0.4)", boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}>
            <button className="claim-close" onClick={() => setTourneyModal(null)}>×</button>
            <div className="trueig-modal-brand">TRUEIGTECH TOURNAMENT ENGINE</div>
            <div className="claim-icon" style={{ background: "linear-gradient(135deg, #ff5c7a, #d63031)", color: "#fff", fontSize: "26px" }}>✕</div>
            <span className="section-kicker" style={{ color: "#ff5c7a" }}>ELIMINATION NOTICE</span>
            <h2 style={{ fontSize: "24px", margin: "8px 0" }}>💔 Better Luck Next Time!</h2>
            <p style={{ fontSize: "14px", color: "#e2e1e8", margin: "0 0 16px" }}>
              You were eliminated in <b>Stage {stageIndex + 1}: {activeStage.name}</b>. You did not complete the target pattern (<b>{currentStagePattern}</b>) within the <b>{maxOpenBalls} open balls</b> limit.
            </p>

            <div style={{ background: "rgba(255, 92, 122, 0.06)", borderRadius: "12px", padding: "14px", border: "1px solid rgba(255, 92, 122, 0.2)", marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>
                <div>
                  <small style={{ color: "#928ca7", display: "block", fontSize: "11px", fontWeight: 700 }}>STAGE REACHED</small>
                  <strong style={{ fontSize: "16px", color: "#ff5c7a" }}>Stage {stageIndex + 1}</strong>
                </div>
                <div style={{ width: "1px", height: "30px", background: "rgba(255,255,255,0.1)" }} />
                <div>
                  <small style={{ color: "#928ca7", display: "block", fontSize: "11px", fontWeight: 700 }}>TARGET PATTERN</small>
                  <strong style={{ fontSize: "15px", color: "#feca57" }}>{currentStagePattern}</strong>
                </div>
                <div style={{ width: "1px", height: "30px", background: "rgba(255,255,255,0.1)" }} />
                <div>
                  <small style={{ color: "#928ca7", display: "block", fontSize: "11px", fontWeight: 700 }}>BALLS CALLED</small>
                  <strong style={{ fontSize: "16px", color: "#e2e1e8" }}>{called.length} / {maxOpenBalls}</strong>
                </div>
              </div>
            </div>

            <p style={{ fontSize: "13px", color: "#928ca7", marginBottom: "18px" }}>
              Better luck next time! Try again in the next tournament and compete for the championship!
            </p>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: "13px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #ff5c7a, #d63031)",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "14px",
                }}
                onClick={goBack}
              >
                ← Exit Tournament & Return to Lobby
              </button>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #7c4dff, #651fff)",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
                onClick={() => setTourneyModal(null)}
              >
                Spectate Stages
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tournament Grand Champion Modal */}
      {tourneyModal === "champion" && (
        <div className="game-claim-modal" style={{ zIndex: 9999 }}>
          <div className="claim-card" style={{ maxWidth: "480px", textAlign: "center", border: "1px solid rgba(254, 202, 87, 0.5)", background: "linear-gradient(180deg, #1d1836 0%, #120e24 100%)", boxShadow: "0 25px 70px rgba(0,0,0,0.9)" }}>
            <button className="claim-close" onClick={() => setTourneyModal(null)}>×</button>
            <div className="trueig-modal-brand" style={{ color: "#feca57" }}>🏆 TOURNAMENT GRAND FINAL</div>
            <div className="claim-icon" style={{ background: "linear-gradient(135deg, #feca57, #ff9f43)", color: "#000", fontSize: "36px", width: "72px", height: "72px", margin: "0 auto 12px" }}>🏆</div>
            <span className="section-kicker" style={{ color: "#ffd32a" }}>TOURNAMENT CHAMPION</span>
            <h2 style={{ fontSize: "28px", margin: "8px 0", color: "#fff" }}>YOU WON THE TOURNAMENT!</h2>
            <p style={{ fontSize: "15px", color: "#e2e1e8", margin: "0 0 16px" }}>
              Incredible performance! You defeated all contenders across all {stages.length} rounds to claim the championship cup!
            </p>

            <div style={{ background: "linear-gradient(135deg, rgba(254,202,87,0.15), rgba(43,221,170,0.1))", borderRadius: "14px", padding: "18px", border: "1px solid rgba(254,202,87,0.3)", marginBottom: "18px" }}>
              <small style={{ color: "#feca57", fontSize: "12px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px" }}>GRAND CHAMPION PRIZE</small>
              <strong style={{ display: "block", fontSize: "36px", color: "#2bddaa", fontWeight: 900, margin: "6px 0" }}>
                {money(tourneyData?.prizePool || room.prize || 25000)}
              </strong>
              <span style={{ fontSize: "12px", color: "#928ca7" }}>
                Credited directly to your wallet · Champion status recorded in Hall of Fame
              </span>
            </div>

            <button
              type="button"
              className="admin-primary"
              style={{
                width: "100%",
                padding: "14px",
                fontSize: "16px",
                fontWeight: 800,
                background: "linear-gradient(135deg, #feca57, #ff9f43)",
                color: "#0c0a1d",
                borderRadius: "10px",
                cursor: "pointer",
                boxShadow: "0 6px 20px rgba(254,202,87,0.4)",
              }}
              onClick={() => {
                setTourneyModal(null);
                goBack();
              }}
            >
              Claim Trophy & Return to Lobby 🏆
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
