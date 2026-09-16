import express, { type Request, type Response } from "express";
import { store } from "../db/store.ts";
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

  res.json({
    success: true,
    tournament: t,
    wallet: store.wallet,
    message: `Registered for ${t.name} successfully!`,
  });
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

  res.json({ success: true, tournament: t });
});
