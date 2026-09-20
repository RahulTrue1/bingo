import { store } from "../db/store.ts";
import { syncBus } from "./sync-bus.ts";
import type { Tournament, TournamentEngineConfig } from "../types.ts";

export class TournamentEngine {
  private static tickerInterval: NodeJS.Timeout | null = null;

  static getDefaultEngine(roundDuration = 15): TournamentEngineConfig {
    return {
      autoMode: true,
      roundDuration,
      stageSecondsRemaining: roundDuration,
      scheduledStartSeconds: null,
      startsAtText: "Starts Today · 20:00",
      isPaused: false,
    };
  }

  static getEngine(t: Tournament): TournamentEngineConfig {
    if (!t.engine) {
      t.engine = this.getDefaultEngine();
    }
    return t.engine;
  }

  static init() {
    if (this.tickerInterval) return;

    // Ensure all existing tournaments have an engine config attached
    for (const t of store.tournaments) {
      this.getEngine(t);
    }

    this.tickerInterval = setInterval(() => {
      this.tick();
    }, 1000);
  }

  static stop() {
    if (this.tickerInterval) {
      clearInterval(this.tickerInterval);
      this.tickerInterval = null;
    }
  }

  static tick() {
    for (const t of store.tournaments) {
      const engine = this.getEngine(t);

      // 1. Scheduled Countdown Tick
      if (typeof engine.scheduledStartSeconds === "number" && engine.scheduledStartSeconds > 0) {
        engine.scheduledStartSeconds -= 1;
        t.startsAt = engine.scheduledStartSeconds > 0
          ? `Starts in ${engine.scheduledStartSeconds}s`
          : "Starting now...";

        if (engine.scheduledStartSeconds <= 0) {
          engine.scheduledStartSeconds = null;
          this.startTournament(t.id);
        } else if (engine.scheduledStartSeconds % 5 === 0 || engine.scheduledStartSeconds <= 5) {
          syncBus.emitChange("tournaments", "schedule-tick", t, t.id, `Countdown: ${engine.scheduledStartSeconds}s until start`);
        }
        continue;
      }

      // 2. Live Auto-Progression Tick
      if (t.status === "Live" && engine.autoMode && !engine.isPaused) {
        if (engine.stageSecondsRemaining > 0) {
          engine.stageSecondsRemaining -= 1;
        }

        if (engine.stageSecondsRemaining <= 0) {
          if (t.stageStatus === "in_progress") {
            // Auto score current stage
            this.scoreStage(t.id);
          } else if (t.stageStatus === "scored") {
            // Auto advance or complete
            const currentIndex = t.currentRoundIndex ?? 0;
            const rounds = t.rounds || ["Qualifiers", "Round of 256", "Round of 128", "Semi Final", "Grand Final"];
            if (currentIndex < rounds.length - 1) {
              this.advanceStage(t.id);
            } else {
              this.completeTournament(t.id);
            }
          }
        } else if (engine.stageSecondsRemaining % 3 === 0 || engine.stageSecondsRemaining <= 3) {
          syncBus.emitChange("tournaments", "timer-tick", t, t.id);
        }
      }
    }
  }

  // --- Core Tournament Operations ---

  static startTournament(id: string): { success: boolean; tournament?: Tournament; error?: string } {
    const t = store.tournaments.find((item) => item.id === id);
    if (!t) return { success: false, error: "Tournament not found" };

    const engine = this.getEngine(t);
    t.status = "Live";
    t.currentRoundIndex = 0;
    t.currentStageName = t.rounds?.[0] || "Qualifiers";
    t.stageStatus = "in_progress";
    engine.stageSecondsRemaining = engine.roundDuration || 15;
    engine.scheduledStartSeconds = null;
    delete t.winner;

    const defaultContenders = [
      { rank: 1, player: "LuckyStar", points: 80, wins: 1, status: "Qualified", fast: "24 balls" },
      { rank: 2, player: "TrueigQueen", points: 70, wins: 1, status: "Qualified", fast: "26 balls" },
      { rank: 3, player: "MikaK", points: 65, wins: 0, status: "Qualified", fast: "28 balls" },
      { rank: 4, player: "Ari.R", points: 60, wins: 0, status: "Qualified", fast: "29 balls" },
      { rank: 5, player: "BallisticB", points: 55, wins: 0, status: "In play", fast: "31 balls" },
      { rank: 6, player: "SpeedySam", points: 45, wins: 0, status: "In play", fast: "32 balls" },
      { rank: 7, player: "SkyJump", points: 40, wins: 0, status: "In play", fast: "34 balls" },
      { rank: 8, player: "LunaAce", points: 35, wins: 0, status: "In play", fast: "35 balls" },
    ];

    if (!t.standings || t.standings.length < 4) {
      t.standings = [...defaultContenders];
    }

    if (t.registeredPlayers && t.registeredPlayers.length > 0) {
      for (const rp of t.registeredPlayers) {
        if (!t.standings.some((s) => s.player.toLowerCase() === rp.toLowerCase())) {
          t.standings.push({
            rank: t.standings.length + 1,
            player: rp,
            points: 60,
            wins: 0,
            status: "Qualified",
            fast: "28 balls",
          });
        }
      }
    }

    const tourneyRoom = store.rooms.find((r) => r.id === "tournament" || r.id === t.id);
    if (tourneyRoom) {
      tourneyRoom.status = "Live";
      tourneyRoom.startsIn = `LIVE · ${t.currentStageName}`;
    }

    store.addAudit("alert", "Tournament started", `${t.name} launched with Stage 1: ${t.currentStageName}`);
    store.save();

    syncBus.emitChange("tournaments", "start", t, t.id, `Tournament "${t.name}" is now LIVE! Stage 1 (${t.currentStageName}) has started.`);
    syncBus.emitChange("rooms", "update", tourneyRoom, "tournament", "Tournament room is now live.");

    return { success: true, tournament: t };
  }

  static scoreStage(id: string, playerScores?: Array<{ player: string; points: number; wins?: number; fast?: string }>): { success: boolean; tournament?: Tournament; error?: string } {
    const t = store.tournaments.find((item) => item.id === id);
    if (!t) return { success: false, error: "Tournament not found" };

    const engine = this.getEngine(t);

    if (playerScores && Array.isArray(playerScores) && playerScores.length > 0) {
      for (const ps of playerScores) {
        const standing = t.standings.find((s) => s.player === ps.player);
        if (standing) {
          standing.points += ps.points;
          if (ps.wins) standing.wins += ps.wins;
          if (ps.fast) standing.fast = ps.fast;
        } else {
          t.standings.push({
            rank: t.standings.length + 1,
            player: ps.player,
            points: ps.points,
            wins: ps.wins || 0,
            status: "In play",
            fast: ps.fast || "25 balls",
          });
        }
      }
    } else {
      const isFinalStage = (t.currentRoundIndex ?? 0) >= (t.rounds.length - 1);
      t.standings.forEach((s, idx) => {
        const isContender = (t.registeredPlayers && t.registeredPlayers.some((rp) => rp.toLowerCase() === s.player.toLowerCase())) || s.player === "Ari.R";
        if (isContender) {
          s.points += isFinalStage ? 120 : 85;
          s.wins += 1;
          s.fast = isFinalStage ? "18 balls" : "22 balls";
        } else {
          const bonus = Math.floor(Math.random() * 40) + 30;
          s.points += bonus;
          if (idx < 2 && Math.random() > 0.5) s.wins += 1;
        }
      });
    }

    t.standings.sort((a, b) => b.points - a.points);
    const totalContenders = t.standings.length;
    t.standings.forEach((s, idx) => {
      s.rank = idx + 1;
      const isGrandFinal = (t.currentRoundIndex ?? 0) >= (t.rounds.length - 1);
      if (isGrandFinal) {
        s.status = idx === 0 ? "Champion" : idx <= 2 ? "Runner-up" : "Finalist";
      } else {
        const qualifyCutoff = Math.max(2, Math.ceil(totalContenders / 2));
        s.status = idx < qualifyCutoff ? "Qualified" : "Eliminated";
      }
    });

    t.stageStatus = "scored";
    // 3-second pause to celebrate cut line before auto advancing
    engine.stageSecondsRemaining = 3;

    store.addAudit("alert", "Tournament stage scored", `${t.name} ${t.currentStageName} scored. Leader: ${t.standings[0]?.player}`);
    store.save();

    syncBus.emitChange("tournaments", "score", t, t.id, `${t.name}: ${t.currentStageName} scored! Standings updated.`);

    return { success: true, tournament: t };
  }

  static advanceStage(id: string): { success: boolean; tournament?: Tournament; error?: string } {
    const t = store.tournaments.find((item) => item.id === id);
    if (!t) return { success: false, error: "Tournament not found" };

    const currentIndex = t.currentRoundIndex ?? 0;
    if (currentIndex >= t.rounds.length - 1) {
      return { success: false, error: "Tournament is already at final round. Use complete to finish." };
    }

    const engine = this.getEngine(t);
    t.currentRoundIndex = currentIndex + 1;
    t.currentStageName = t.rounds[t.currentRoundIndex];
    t.stageStatus = "in_progress";
    engine.stageSecondsRemaining = engine.roundDuration || 15;

    const tourneyRoom = store.rooms.find((r) => r.id === "tournament" || r.id === t.id);
    if (tourneyRoom) {
      tourneyRoom.status = "Live";
      tourneyRoom.startsIn = `LIVE · ${t.currentStageName}`;
    }

    store.addAudit("alert", "Tournament stage advanced", `${t.name} moved to Stage ${t.currentRoundIndex + 1}: ${t.currentStageName}`);
    store.save();

    syncBus.emitChange("tournaments", "advance", t, t.id, `${t.name} advanced to Stage ${t.currentRoundIndex + 1}: ${t.currentStageName}!`);
    syncBus.emitChange("rooms", "update", tourneyRoom, "tournament", `Tournament stage: ${t.currentStageName}`);

    return { success: true, tournament: t };
  }

  static completeTournament(id: string, winnerName?: string): { success: boolean; tournament?: Tournament; champion?: string; payout?: number; wallet?: number; error?: string } {
    const t = store.tournaments.find((item) => item.id === id);
    if (!t) return { success: false, error: "Tournament not found" };

    const engine = this.getEngine(t);
    const champion = winnerName || t.standings[0]?.player || "Ari.R";

    t.status = "Completed";
    t.winner = champion;
    t.stageStatus = "completed";
    engine.stageSecondsRemaining = 0;
    engine.scheduledStartSeconds = null;

    // Single winner prize: 60% of prize pool (default $15,000 for $25,000 pool)
    const pool = t.prizePool || 25000;
    const firstPrize = Math.round(pool * 0.6);
    const secondPrize = Math.round(pool * 0.25);
    const thirdPrize = Math.round(pool * 0.15);
    t.prizeDistribution = { "1st": firstPrize, "2nd": secondPrize, "3rd": thirdPrize };

    const champStanding = t.standings.find((s) => s.player === champion);
    if (champStanding) {
      champStanding.status = "Champion";
      champStanding.rank = 1;
    }

    let awardedWallet = store.wallet;
    const winnerPlayer = store.players.find((p) => p.username.toLowerCase() === champion.toLowerCase());
    if (winnerPlayer) {
      winnerPlayer.balance = Math.round((winnerPlayer.balance + firstPrize) * 100) / 100;
      if (winnerPlayer.username.toLowerCase() === (store.activeUsername || "Ari.R").toLowerCase()) {
        store.wallet = winnerPlayer.balance;
      }
      awardedWallet = winnerPlayer.balance;
    } else {
      store.wallet = Math.round((store.wallet + firstPrize) * 100) / 100;
      awardedWallet = store.wallet;
    }

    store.addTransaction({
      player: champion,
      room: t.name,
      type: "Prize payout",
      amount: firstPrize,
      status: "Completed",
    });

    store.addAudit("player", "Tournament champion prize", `${champion} won $${firstPrize} as Champion of ${t.name}`);
    syncBus.emitChange("wallet", "tournament-champion", { wallet: awardedWallet, payout: firstPrize, player: champion });

    const tourneyRoom = store.rooms.find((r) => r.id === "tournament" || r.id === t.id);
    if (tourneyRoom) {
      tourneyRoom.status = "Open";
      tourneyRoom.startsIn = "Completed";
    }

    store.save();

    syncBus.emitChange("tournaments", "complete", t, t.id, `🏆 ${champion} has won the ${t.name}! $${firstPrize.toLocaleString()} prize awarded.`);
    syncBus.emitChange("rooms", "update", tourneyRoom, "tournament", "Tournament completed.");

    return {
      success: true,
      tournament: t,
      champion,
      payout: firstPrize,
      wallet: awardedWallet,
    };
  }

  static resetTournament(id: string): { success: boolean; tournament?: Tournament; error?: string } {
    const t = store.tournaments.find((item) => item.id === id);
    if (!t) return { success: false, error: "Tournament not found" };

    const engine = this.getEngine(t);
    t.status = "Registration open";
    t.currentRoundIndex = 0;
    t.currentStageName = t.rounds?.[0] || "Qualifiers";
    t.stageStatus = "waiting";
    delete t.winner;
    t.registeredPlayers = [];
    engine.stageSecondsRemaining = engine.roundDuration || 15;
    engine.scheduledStartSeconds = null;
    t.startsAt = "Tomorrow · 20:00";

    t.standings = [
      { rank: 1, player: "LuckyStar", points: 0, wins: 0, status: "In play", fast: "21 balls" },
      { rank: 2, player: "BingoMaster", points: 0, wins: 0, status: "In play", fast: "24 balls" },
      { rank: 3, player: "SpeedySam", points: 0, wins: 0, status: "In play", fast: "26 balls" },
      { rank: 4, player: "TrueigQueen", points: 0, wins: 0, status: "In play", fast: "28 balls" },
    ];

    const tourneyRoom = store.rooms.find((r) => r.id === "tournament" || r.id === t.id);
    if (tourneyRoom) {
      tourneyRoom.status = "Open";
      tourneyRoom.startsIn = "FRI · 20:00";
    }

    store.addAudit("alert", "Tournament reset", `${t.name} reset to initial registration phase`);
    store.save();

    syncBus.emitChange("tournaments", "reset", t, t.id, `Tournament "${t.name}" has been reset.`);
    syncBus.emitChange("rooms", "update", tourneyRoom, "tournament", "Tournament reset.");

    return { success: true, tournament: t };
  }

  static schedule(id: string, delaySeconds: number): { success: boolean; tournament?: Tournament; error?: string } {
    const t = store.tournaments.find((item) => item.id === id);
    if (!t) return { success: false, error: "Tournament not found" };

    const engine = this.getEngine(t);
    engine.scheduledStartSeconds = Math.max(1, Math.round(delaySeconds));
    t.status = "Registration open";
    t.startsAt = `Starts in ${engine.scheduledStartSeconds}s`;

    store.addAudit("alert", "Tournament scheduled", `${t.name} scheduled to start in ${engine.scheduledStartSeconds} seconds`);
    store.save();

    syncBus.emitChange("tournaments", "schedule", t, t.id, `${t.name} scheduled to start in ${engine.scheduledStartSeconds}s`);
    return { success: true, tournament: t };
  }

  static cancelSchedule(id: string): { success: boolean; tournament?: Tournament; error?: string } {
    const t = store.tournaments.find((item) => item.id === id);
    if (!t) return { success: false, error: "Tournament not found" };

    const engine = this.getEngine(t);
    engine.scheduledStartSeconds = null;
    t.startsAt = "Tomorrow · 20:00";

    store.save();
    syncBus.emitChange("tournaments", "schedule-cancel", t, t.id, `${t.name} schedule cancelled`);
    return { success: true, tournament: t };
  }

  static setAutoConfig(id: string, updates: Partial<TournamentEngineConfig>): { success: boolean; tournament?: Tournament; error?: string } {
    const t = store.tournaments.find((item) => item.id === id);
    if (!t) return { success: false, error: "Tournament not found" };

    const engine = this.getEngine(t);
    if (typeof updates.autoMode === "boolean") {
      engine.autoMode = updates.autoMode;
    }
    if (typeof updates.roundDuration === "number") {
      engine.roundDuration = Math.max(5, Math.min(600, updates.roundDuration));
      if (t.status === "Registration open" || engine.stageSecondsRemaining > engine.roundDuration) {
        engine.stageSecondsRemaining = engine.roundDuration;
      }
    }
    if (typeof updates.isPaused === "boolean") {
      engine.isPaused = updates.isPaused;
    }

    store.save();
    syncBus.emitChange("tournaments", "engine-config", t, t.id, `${t.name} auto-engine configuration updated`);
    return { success: true, tournament: t };
  }
}
