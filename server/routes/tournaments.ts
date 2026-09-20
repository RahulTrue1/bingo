import express, { type Request, type Response } from "express";
import { store } from "../db/store.ts";
import { syncBus } from "../services/sync-bus.ts";
import { TournamentEngine } from "../services/tournament-engine.ts";
import type { Tournament } from "../types.ts";

export const tournamentsRouter = express.Router();

// GET /api/tournaments - List tournaments
tournamentsRouter.get("/", (_req: Request, res: Response) => {
  store.tournaments.forEach((t) => TournamentEngine.getEngine(t));
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
  TournamentEngine.getEngine(t);
  res.json({ success: true, tournament: t });
});

// POST /api/tournaments/:id/register - Register player for tournament
tournamentsRouter.post("/:id/register", (req: Request, res: Response) => {
  const resolved = store.resolveUser(req);
  const { playerName = resolved?.username || store.activeUsername || "Ari.R" } = req.body;
  const t = store.tournaments.find((item) => item.id === req.params.id);

  if (!t) {
    res.status(404).json({ success: false, error: "Tournament not found" });
    return;
  }

  const playerObj = resolved || store.players.find((p) => p.username.toLowerCase() === playerName.toLowerCase());
  const currentBalance = playerObj ? playerObj.balance : store.wallet;

  if (currentBalance < t.entryFee) {
    res.status(400).json({
      success: false,
      error: `Insufficient balance for $${t.entryFee} entry fee. Current balance: $${currentBalance}`,
    });
    return;
  }

  // Deduct entry fee
  if (playerObj) {
    playerObj.balance = Math.round((playerObj.balance - t.entryFee) * 100) / 100;
    if (playerObj.username.toLowerCase() === (store.activeUsername || "Ari.R").toLowerCase()) {
      store.wallet = playerObj.balance;
    }
  } else {
    store.wallet = Math.round((store.wallet - t.entryFee) * 100) / 100;
  }

  const effectiveWallet = playerObj ? playerObj.balance : store.wallet;

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
  syncBus.emitChange("wallet", "tournament-fee", { wallet: effectiveWallet, fee: t.entryFee, player: playerName });

  res.json({
    success: true,
    tournament: t,
    wallet: effectiveWallet,
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
  const result = TournamentEngine.startTournament(req.params.id);
  if (!result.success) {
    res.status(404).json({ success: false, error: result.error });
    return;
  }
  res.json({ success: true, tournament: result.tournament });
});

// POST /api/tournaments/:id/score-stage - Score current stage
tournamentsRouter.post("/:id/score-stage", (req: Request, res: Response) => {
  const { playerScores } = (req.body || {}) as { playerScores?: Array<{ player: string; points: number; wins?: number; fast?: string }> };
  const result = TournamentEngine.scoreStage(req.params.id, playerScores);
  if (!result.success) {
    res.status(404).json({ success: false, error: result.error });
    return;
  }
  res.json({ success: true, tournament: result.tournament });
});

// POST /api/tournaments/:id/advance - Advance to next tournament stage
tournamentsRouter.post("/:id/advance", (req: Request, res: Response) => {
  const result = TournamentEngine.advanceStage(req.params.id);
  if (!result.success) {
    res.status(result.error?.includes("already at final") ? 400 : 404).json({ success: false, error: result.error });
    return;
  }
  res.json({ success: true, tournament: result.tournament });
});

// POST /api/tournaments/:id/complete - Complete tournament and award prizes
tournamentsRouter.post("/:id/complete", (req: Request, res: Response) => {
  const { winnerName } = (req.body || {}) as { winnerName?: string };
  const result = TournamentEngine.completeTournament(req.params.id, winnerName);
  if (!result.success) {
    res.status(404).json({ success: false, error: result.error });
    return;
  }
  res.json({
    success: true,
    tournament: result.tournament,
    champion: result.champion,
    payout: result.payout,
    wallet: result.wallet,
  });
});

// POST /api/tournaments/:id/reset - Reset tournament for replaying
tournamentsRouter.post("/:id/reset", (req: Request, res: Response) => {
  const result = TournamentEngine.resetTournament(req.params.id);
  if (!result.success) {
    res.status(404).json({ success: false, error: result.error });
    return;
  }
  res.json({ success: true, tournament: result.tournament });
});

// POST /api/tournaments/:id/schedule - Schedule tournament auto-start countdown
tournamentsRouter.post("/:id/schedule", (req: Request, res: Response) => {
  const { delaySeconds = 30, cancel = false } = req.body || {};
  if (cancel) {
    const result = TournamentEngine.cancelSchedule(req.params.id);
    if (!result.success) {
      res.status(404).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true, tournament: result.tournament, message: "Tournament schedule cancelled" });
    return;
  }

  const result = TournamentEngine.schedule(req.params.id, Number(delaySeconds));
  if (!result.success) {
    res.status(404).json({ success: false, error: result.error });
    return;
  }
  res.json({
    success: true,
    tournament: result.tournament,
    message: `Tournament scheduled to start in ${result.tournament?.engine?.scheduledStartSeconds}s`,
  });
});

// POST /api/tournaments/:id/auto-config - Toggle auto-progression or update round duration
tournamentsRouter.post("/:id/auto-config", (req: Request, res: Response) => {
  const { autoMode, roundDuration, isPaused } = req.body || {};
  const result = TournamentEngine.setAutoConfig(req.params.id, { autoMode, roundDuration, isPaused });
  if (!result.success) {
    res.status(404).json({ success: false, error: result.error });
    return;
  }
  res.json({
    success: true,
    tournament: result.tournament,
    engine: result.tournament?.engine,
    message: "Auto-progression configuration updated",
  });
});

// GET /api/tournaments/:id/engine - Get live engine configuration & state
tournamentsRouter.get("/:id/engine", (req: Request, res: Response) => {
  const t = store.tournaments.find((item) => item.id === req.params.id);
  if (!t) {
    res.status(404).json({ success: false, error: "Tournament not found" });
    return;
  }
  res.json({
    success: true,
    engine: TournamentEngine.getEngine(t),
  });
});


