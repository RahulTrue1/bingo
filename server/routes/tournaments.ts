import express, { type Request, type Response } from "express";
import { store } from "../db/store.ts";
import { syncBus } from "../services/sync-bus.ts";
import type { Tournament } from "../types.ts";

export const tournamentsRouter = express.Router();

// GET /api/tournaments - List tournaments
tournamentsRouter.get("/", (_req: Request, res: Response) => {
  res.json({
    success: true,
    tournaments: store.tournaments,
  });
});

// GET /api/tournaments/:id - Get specific tournament with standings
tournamentsRouter.get("/:id", (req: Request, res: Response) => {
  const t = store.tournaments.find((item) => item.id === req.params.id);
  if (!t) {
    res.status(404).json({ success: false, error: "Tournament not found" });
    return;
  }
  res.json({ success: true, tournament: t });
});

// POST /api/tournaments/:id/register - Register player for tournament
tournamentsRouter.post("/:id/register", (req: Request, res: Response) => {
  const { playerName = "Ari.R" } = req.body;
  const t = store.tournaments.find((item) => item.id === req.params.id);

  if (!t) {
    res.status(404).json({ success: false, error: "Tournament not found" });
    return;
  }

  if (store.wallet < t.entryFee) {
    res.status(400).json({
      success: false,
      error: `Insufficient balance for $${t.entryFee} entry fee. Current balance: $${store.wallet}`,
    });
    return;
  }

  // Deduct entry fee
  store.wallet -= t.entryFee;
  t.playersCount = Math.min(t.maxPlayers, t.playersCount + 1);
  if (!t.registeredPlayers) t.registeredPlayers = [];
  if (!t.registeredPlayers.includes(playerName)) {
    t.registeredPlayers.push(playerName);
  }

  // Add to standings if not present
  if (!t.standings.some((s) => s.player === playerName)) {
    t.standings.push({
      rank: t.standings.length + 1,
      player: playerName,
      points: 0,
      wins: 0,
      status: "Qualified",
    });
  }

  store.addTransaction({
    player: playerName,
    room: t.name,
    type: "Ticket purchase",
    amount: -t.entryFee,
    status: "Completed",
  });

  store.addAudit("player", "Tournament registration", `${playerName} joined ${t.name}`);
  store.save();

  syncBus.emitChange("tournaments", "register", t, t.id, `${playerName} registered for ${t.name}`);
  syncBus.emitChange("wallet", "tournament-fee", { wallet: store.wallet, fee: t.entryFee });

  res.json({
    success: true,
    tournament: t,
    wallet: store.wallet,
    message: `Registered for ${t.name} successfully!`,
  });
});

// POST /api/tournaments - Create a new tournament
tournamentsRouter.post("/", (req: Request, res: Response) => {
  const body = req.body as Partial<Tournament>;
  if (!body.name || !body.name.trim()) {
    res.status(400).json({ success: false, error: "Tournament name is required" });
    return;
  }

  const id = body.id || body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  if (store.tournaments.some((item) => item.id === id)) {
    res.status(409).json({ success: false, error: "Tournament ID already exists" });
    return;
  }

  const newTournament: Tournament = {
    id,
    name: body.name.trim(),
    description: body.description || "Multi-round progressive bingo tournament.",
    entryFee: body.entryFee !== undefined ? Math.max(0, Number(body.entryFee)) : 10,
    prizePool: body.prizePool !== undefined ? Math.max(1, Number(body.prizePool)) : 10000,
    playersCount: 0,
    maxPlayers: body.maxPlayers !== undefined ? Math.max(10, Number(body.maxPlayers)) : 256,
    startsAt: body.startsAt || "Tomorrow · 20:00",
    status: body.status || "Registration open",
    rounds: body.rounds || ["Qualifiers", "Round of 128", "Semi Final", "Grand Final"],
    scoringRules: body.scoringRules || {
      "Line win": "10 pts",
      "Pattern win": "25 pts",
      "Full house": "50 pts",
    },
    standings: [
      { rank: 1, player: "LuckyStar", points: 280, wins: 3, status: "Qualified" },
      { rank: 2, player: "TrueigQueen", points: 240, wins: 2, status: "Qualified" },
      { rank: 3, player: "MikaK", points: 210, wins: 2, status: "Qualified" },
    ],
  };

  store.tournaments.push(newTournament);
  store.addAudit("alert", "Tournament created", `New tournament: ${newTournament.name} (Prize: $${newTournament.prizePool})`);
  store.save();

  syncBus.emitChange("tournaments", "create", newTournament, newTournament.id, `Tournament "${newTournament.name}" created.`);

  res.status(201).json({ success: true, tournament: newTournament });
});

// PUT /api/tournaments/:id - Update tournament configuration
tournamentsRouter.put("/:id", (req: Request, res: Response) => {
  const t = store.tournaments.find((item) => item.id === req.params.id);
  if (!t) {
    res.status(404).json({ success: false, error: "Tournament not found" });
    return;
  }

  const updates = req.body as Partial<Tournament>;
  Object.assign(t, updates);

  store.addAudit("alert", "Tournament updated", `${t.name} rules edited`);
  store.save();

  syncBus.emitChange("tournaments", "update", t, t.id, `Tournament "${t.name}" updated.`);

  res.json({ success: true, tournament: t });
});

// DELETE /api/tournaments/:id - Remove tournament
tournamentsRouter.delete("/:id", (req: Request, res: Response) => {
  const index = store.tournaments.findIndex((item) => item.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ success: false, error: "Tournament not found" });
    return;
  }

  const [removed] = store.tournaments.splice(index, 1);
  store.addAudit("alert", "Tournament deleted", `Tournament ${removed.name} deleted`);
  store.save();

  syncBus.emitChange("tournaments", "delete", { id: req.params.id }, req.params.id, `Tournament "${removed.name}" deleted.`);

  res.json({ success: true, message: `Tournament "${removed.name}" deleted.` });
});

// POST /api/tournaments/:id/start - Start tournament
tournamentsRouter.post("/:id/start", (req: Request, res: Response) => {
  const t = store.tournaments.find((item) => item.id === req.params.id);
  if (!t) {
    res.status(404).json({ success: false, error: "Tournament not found" });
    return;
  }

  t.status = "Live";
  t.currentRoundIndex = 0;
  t.currentStageName = t.rounds?.[0] || "Qualifiers";
  t.stageStatus = "in_progress";
  delete t.winner;

  // Ensure default registered players exist
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
    t.standings = defaultContenders;
  } else if (!t.standings.some((s) => s.player === "Ari.R")) {
    t.standings.push({ rank: t.standings.length + 1, player: "Ari.R", points: 60, wins: 0, status: "Qualified", fast: "29 balls" });
  }

  // Also update tournament game room in store.rooms if present
  const tourneyRoom = store.rooms.find((r) => r.id === "tournament" || r.id === t.id);
  if (tourneyRoom) {
    tourneyRoom.status = "Live";
    tourneyRoom.startsIn = `LIVE · ${t.currentStageName}`;
  }

  store.addAudit("alert", "Tournament started", `${t.name} launched with Stage 1: ${t.currentStageName}`);
  store.save();

  syncBus.emitChange("tournaments", "start", t, t.id, `Tournament "${t.name}" is now LIVE! Stage 1 (${t.currentStageName}) has started.`);
  syncBus.emitChange("rooms", "update", tourneyRoom, "tournament", "Tournament room is now live.");

  res.json({ success: true, tournament: t });
});

// POST /api/tournaments/:id/score-stage - Score current stage
tournamentsRouter.post("/:id/score-stage", (req: Request, res: Response) => {
  const t = store.tournaments.find((item) => item.id === req.params.id);
  if (!t) {
    res.status(404).json({ success: false, error: "Tournament not found" });
    return;
  }

  const { playerScores } = req.body as { playerScores?: Array<{ player: string; points: number; wins?: number; fast?: string }> };

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
    // Dynamic simulated stage scoring
    const isFinalStage = (t.currentRoundIndex ?? 0) >= (t.rounds.length - 1);
    t.standings.forEach((s, idx) => {
      // Ari.R gets strong results to progress
      if (s.player === "Ari.R") {
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

  // Sort standings by points descending
  t.standings.sort((a, b) => b.points - a.points);
  t.standings.forEach((s, idx) => {
    s.rank = idx + 1;
    const isGrandFinal = (t.currentRoundIndex ?? 0) >= (t.rounds.length - 1);
    if (isGrandFinal) {
      s.status = idx === 0 ? "Champion" : idx <= 2 ? "Runner-up" : "Finalist";
    } else {
      // Top half qualify for the next round
      s.status = idx < Math.max(2, Math.ceil(t.standings.length / 2)) ? "Qualified" : "Eliminated";
    }
  });

  t.stageStatus = "scored";
  store.addAudit("alert", "Tournament stage scored", `${t.name} ${t.currentStageName} scored. Leader: ${t.standings[0]?.player}`);
  store.save();

  syncBus.emitChange("tournaments", "score", t, t.id, `${t.name}: ${t.currentStageName} scored! Standings updated.`);

  res.json({ success: true, tournament: t });
});

// POST /api/tournaments/:id/advance - Advance to next tournament stage
tournamentsRouter.post("/:id/advance", (req: Request, res: Response) => {
  const t = store.tournaments.find((item) => item.id === req.params.id);
  if (!t) {
    res.status(404).json({ success: false, error: "Tournament not found" });
    return;
  }

  const currentIndex = t.currentRoundIndex ?? 0;
  if (currentIndex >= t.rounds.length - 1) {
    res.status(400).json({ success: false, error: "Tournament is already at final round. Use /complete to finish." });
    return;
  }

  t.currentRoundIndex = currentIndex + 1;
  t.currentStageName = t.rounds[t.currentRoundIndex];
  t.stageStatus = "in_progress";

  const tourneyRoom = store.rooms.find((r) => r.id === "tournament" || r.id === t.id);
  if (tourneyRoom) {
    tourneyRoom.status = "Live";
    tourneyRoom.startsIn = `LIVE · ${t.currentStageName}`;
  }

  store.addAudit("alert", "Tournament stage advanced", `${t.name} moved to Stage ${t.currentRoundIndex + 1}: ${t.currentStageName}`);
  store.save();

  syncBus.emitChange("tournaments", "advance", t, t.id, `${t.name} advanced to Stage ${t.currentRoundIndex + 1}: ${t.currentStageName}!`);
  syncBus.emitChange("rooms", "update", tourneyRoom, "tournament", `Tournament stage: ${t.currentStageName}`);

  res.json({ success: true, tournament: t });
});

// POST /api/tournaments/:id/complete - Complete tournament and award prizes
tournamentsRouter.post("/:id/complete", (req: Request, res: Response) => {
  const t = store.tournaments.find((item) => item.id === req.params.id);
  if (!t) {
    res.status(404).json({ success: false, error: "Tournament not found" });
    return;
  }

  const { winnerName } = req.body as { winnerName?: string };
  const champion = winnerName || t.standings[0]?.player || "Ari.R";

  t.status = "Completed";
  t.winner = champion;
  t.stageStatus = "completed";

  // Calculate prizes: 1st place gets 60%, 2nd place gets 25%, 3rd gets 15%
  const pool = t.prizePool || 25000;
  const firstPrize = Math.round(pool * 0.6);
  const secondPrize = Math.round(pool * 0.25);
  const thirdPrize = Math.round(pool * 0.15);
  t.prizeDistribution = { "1st": firstPrize, "2nd": secondPrize, "3rd": thirdPrize };

  // Set champion status in standings
  const champStanding = t.standings.find((s) => s.player === champion);
  if (champStanding) {
    champStanding.status = "Champion";
    champStanding.rank = 1;
  }

  // Credit user wallet if champion is Ari.R
  let awardedWallet = store.wallet;
  if (champion === "Ari.R") {
    store.wallet += firstPrize;
    awardedWallet = store.wallet;

    store.addTransaction({
      player: champion,
      room: t.name,
      type: "Prize payout",
      amount: firstPrize,
      status: "Completed",
    });

    store.addAudit("player", "Tournament champion prize", `${champion} won $${firstPrize} as Champion of ${t.name}`);
    syncBus.emitChange("wallet", "tournament-champion", { wallet: awardedWallet, payout: firstPrize });
  }

  const tourneyRoom = store.rooms.find((r) => r.id === "tournament" || r.id === t.id);
  if (tourneyRoom) {
    tourneyRoom.status = "Open";
    tourneyRoom.startsIn = "Completed";
  }

  store.save();

  syncBus.emitChange("tournaments", "complete", t, t.id, `🏆 ${champion} has won the ${t.name}! $${firstPrize.toLocaleString()} prize awarded.`);
  syncBus.emitChange("rooms", "update", tourneyRoom, "tournament", "Tournament completed.");

  res.json({
    success: true,
    tournament: t,
    champion,
    payout: champion === "Ari.R" ? firstPrize : 0,
    wallet: awardedWallet,
  });
});

// POST /api/tournaments/:id/reset - Reset tournament for replaying
tournamentsRouter.post("/:id/reset", (req: Request, res: Response) => {
  const t = store.tournaments.find((item) => item.id === req.params.id);
  if (!t) {
    res.status(404).json({ success: false, error: "Tournament not found" });
    return;
  }

  t.status = "Registration open";
  t.currentRoundIndex = 0;
  t.currentStageName = t.rounds?.[0] || "Qualifiers";
  t.stageStatus = "waiting";
  delete t.winner;
  t.registeredPlayers = [];

  t.standings = [
    { rank: 1, player: "LuckyStar", points: 285, wins: 4, status: "Qualified", fast: "21 balls" },
    { rank: 2, player: "BingoMaster", points: 240, wins: 3, status: "Qualified", fast: "24 balls" },
    { rank: 3, player: "SpeedySam", points: 215, wins: 2, status: "Qualified", fast: "26 balls" },
    { rank: 4, player: "TrueigQueen", points: 175, wins: 1, status: "Qualified", fast: "28 balls" },
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

  res.json({ success: true, tournament: t });
});


