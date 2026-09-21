import express, { type Request, type Response } from "express";
import { store } from "../db/store.ts";
import { syncBus } from "../services/sync-bus.ts";
import type { Jackpot } from "../types.ts";

export const jackpotsRouter = express.Router();

// GET /api/jackpots - List all active progressive jackpots
jackpotsRouter.get("/", (_req: Request, res: Response) => {
  res.json({
    success: true,
    jackpots: store.jackpots,
  });
});

// POST /api/jackpots - Create a new progressive jackpot
jackpotsRouter.post("/", (req: Request, res: Response) => {
  const {
    name,
    variant = "75-Ball Progressive",
    startingAmount = 10000,
    currentAmount,
    maximumAmount = 100000,
    resetAmount,
    contributionPercent = 2.0,
    qualifyingPattern = "Full House in 42 balls",
    qualifyingBallLimit = 42,
    linkedRooms = [],
    price = 2,
    players = 50,
    difficulty = "Medium",
    reward = "Huge",
    iconKey = "diamond",
  } = req.body;

  if (!name || typeof name !== "string") {
    res.status(400).json({ success: false, error: "Jackpot name is required" });
    return;
  }

  let slug = (req.body.id || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")) || `jp-${Date.now()}`;
  if (store.jackpots.some((j) => j.id === slug)) {
    slug = `${slug}-${Date.now().toString().slice(-4)}`;
  }

  const startVal = Number(startingAmount) || 10000;
  const currVal = currentAmount !== undefined ? Number(currentAmount) : startVal;
  const resetVal = resetAmount !== undefined ? Number(resetAmount) : startVal;
  const maxVal = Number(maximumAmount) || 100000;
  const contribVal = Number(contributionPercent) || 2.0;
  const ballLimitVal = Number(qualifyingBallLimit) || 42;

  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const newJackpot: Jackpot = {
    id: slug,
    name: name.trim(),
    variant,
    key: slug.split("-")[0] || "custom",
    startingAmount: startVal,
    currentAmount: currVal,
    maximumAmount: maxVal,
    resetAmount: resetVal,
    contributionPercent: contribVal,
    qualifyingPattern,
    qualifyingBallLimit: ballLimitVal,
    enabled: true,
    linkedRooms: Array.isArray(linkedRooms) ? linkedRooms : [],
    price: Number(price) || 2,
    players: Number(players) || 50,
    difficulty,
    reward,
    iconKey: iconKey as "diamond" | "star" | "club",
    history: [
      {
        type: "Created",
        amount: currVal,
        time,
        user: "Backoffice Admin",
      },
    ],
  };

  // Sync linked rooms
  newJackpot.linkedRooms.forEach((roomId) => {
    const room = store.rooms.find((r) => r.id === roomId);
    if (room) {
      room.jackpot = newJackpot.currentAmount;
      room.progressiveBallLimit = newJackpot.qualifyingBallLimit;
    }
  });

  store.jackpots.push(newJackpot);
  store.addAudit("jackpot", "Jackpot created", `${newJackpot.name} (${slug}) initialized with $${currVal}`);
  store.save();

  syncBus.emitChange(
    "jackpots",
    "create",
    newJackpot,
    newJackpot.id,
    `New progressive jackpot "${newJackpot.name}" created with $${currVal.toLocaleString()} seed!`
  );

  res.status(201).json({
    success: true,
    jackpot: newJackpot,
    message: `Jackpot "${newJackpot.name}" created successfully.`,
  });
});

// GET /api/jackpots/:id - Get specific jackpot details
jackpotsRouter.get("/:id", (req: Request, res: Response) => {
  const jp = store.jackpots.find((j) => j.id === req.params.id);
  if (!jp) {
    res.status(404).json({ success: false, error: "Jackpot not found" });
    return;
  }
  res.json({ success: true, jackpot: jp });
});

// POST /api/jackpots/:id/contribute - Add manual contribution (Admin)
jackpotsRouter.post("/:id/contribute", (req: Request, res: Response) => {
  const { amount = 1000, user = "John Dawson" } = req.body;
  const num = Number(amount);
  const jp = store.jackpots.find((j) => j.id === req.params.id);

  if (!jp) {
    res.status(404).json({ success: false, error: "Jackpot not found" });
    return;
  }

  jp.currentAmount += num;
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  jp.history.unshift({
    type: "Manual adjustment",
    amount: num,
    time,
    user,
  });

  // Sync linked rooms
  jp.linkedRooms?.forEach((roomId) => {
    const room = store.rooms.find((r) => r.id === roomId);
    if (room) {
      room.jackpot = jp.currentAmount;
    }
  });

  store.addAudit("jackpot", "Jackpot contribution", `+$${num.toFixed(2)} · ${jp.name}`);
  store.save();

  syncBus.emitChange(
    "jackpots",
    "contribute",
    jp,
    jp.id,
    `Jackpot ${jp.name} increased to $${jp.currentAmount.toFixed(2)}`
  );

  res.json({
    success: true,
    jackpot: jp,
    message: `Added $${num.toFixed(2)} contribution to ${jp.name}.`,
  });
});

// POST /api/jackpots/:id/trigger - Award jackpot to player (Win trigger)
jackpotsRouter.post("/:id/trigger", (req: Request, res: Response) => {
  const jp = store.jackpots.find((j) => j.id === req.params.id);
  if (!jp) {
    res.status(404).json({ success: false, error: "Jackpot not found" });
    return;
  }

  const winnerName = req.body?.winnerName || (req.headers["x-player-username"] as string) || "Ari.R";
  const wonAmount = jp.currentAmount;

  // Credit player wallet
  let player = store.players.find((p) => p.username.toLowerCase() === winnerName.toLowerCase());
  if (!player) {
    player = store.players[0];
  }

  if (player) {
    player.balance += wonAmount;
  }

  // Create completed transaction
  const txId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  store.transactions.unshift({
    id: txId,
    player: player ? player.username : winnerName,
    room: jp.linkedRooms[0] || "jackpot",
    type: "Prize payout",
    amount: wonAmount,
    status: "Completed",
    timestamp: "Just now",
  });

  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  jp.history.unshift({
    type: "Jackpot Won · Payout",
    amount: wonAmount,
    time,
    user: player ? player.username : winnerName,
  });

  // Reset jackpot to base reset amount
  jp.currentAmount = jp.resetAmount;

  // Sync linked rooms
  jp.linkedRooms?.forEach((roomId) => {
    const room = store.rooms.find((r) => r.id === roomId);
    if (room) {
      room.jackpot = jp.resetAmount;
    }
  });

  store.addAudit(
    "jackpot",
    "Jackpot Won!",
    `${player ? player.username : winnerName} won ${jp.name} for $${wonAmount.toFixed(2)}! Reset to $${jp.resetAmount}`
  );
  store.save();

  syncBus.emitChange(
    "jackpots",
    "win",
    { winner: player ? player.username : winnerName, amount: wonAmount, jackpot: jp },
    jp.id,
    `🏆 ${player ? player.username : winnerName} WON the ${jp.name} for $${wonAmount.toLocaleString()}!`
  );

  if (player) {
    syncBus.emitChange(
      "wallet",
      "credit",
      { player: player.username, amount: wonAmount, balance: player.balance },
      player.id,
      `Jackpot prize credited: +$${wonAmount.toLocaleString()}`
    );
  }

  res.json({
    success: true,
    jackpot: jp,
    winner: player ? player.username : winnerName,
    payout: wonAmount,
    wallet: player?.balance ?? 0,
    message: `Jackpot ${jp.name} awarded to ${player ? player.username : winnerName}! Prize $${wonAmount.toLocaleString()} credited.`,
  });
});

// PUT /api/jackpots/:id - Update jackpot config / toggle
jackpotsRouter.put("/:id", (req: Request, res: Response) => {
  const jp = store.jackpots.find((j) => j.id === req.params.id);
  if (!jp) {
    res.status(404).json({ success: false, error: "Jackpot not found" });
    return;
  }

  const updates = req.body as Partial<Jackpot>;
  Object.assign(jp, updates);

  // Sync linked rooms
  jp.linkedRooms?.forEach((roomId) => {
    const room = store.rooms.find((r) => r.id === roomId);
    if (room) {
      room.jackpot = jp.currentAmount;
      if (jp.qualifyingBallLimit) {
        room.progressiveBallLimit = jp.qualifyingBallLimit;
      }
    }
  });

  store.addAudit("alert", "Jackpot configuration updated", `${jp.name} settings changed`);
  store.save();

  syncBus.emitChange(
    "jackpots",
    "update",
    jp,
    jp.id,
    `Jackpot ${jp.name} configuration updated.`
  );

  res.json({ success: true, jackpot: jp });
});

// POST /api/jackpots/:id/reset - Reset jackpot to starting value
jackpotsRouter.post("/:id/reset", (req: Request, res: Response) => {
  const jp = store.jackpots.find((j) => j.id === req.params.id);
  if (!jp) {
    res.status(404).json({ success: false, error: "Jackpot not found" });
    return;
  }

  const resetVal = req.body?.resetAmount !== undefined ? Number(req.body.resetAmount) : jp.resetAmount;
  jp.currentAmount = resetVal;

  // Sync linked rooms
  jp.linkedRooms?.forEach((roomId) => {
    const room = store.rooms.find((r) => r.id === roomId);
    if (room) {
      room.jackpot = resetVal;
    }
  });

  store.addAudit("jackpot", "Jackpot reset", `${jp.name} reset to $${resetVal}`);
  store.save();

  syncBus.emitChange(
    "jackpots",
    "reset",
    jp,
    jp.id,
    `Jackpot ${jp.name} reset to $${jp.currentAmount.toFixed(2)}.`
  );

  res.json({
    success: true,
    jackpot: jp,
    message: `${jp.name} reset to $${jp.currentAmount.toFixed(2)}.`,
  });
});

// DELETE /api/jackpots/:id - Delete a jackpot
jackpotsRouter.delete("/:id", (req: Request, res: Response) => {
  const index = store.jackpots.findIndex((j) => j.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ success: false, error: "Jackpot not found" });
    return;
  }

  if (store.jackpots.length <= 1) {
    res.status(400).json({
      success: false,
      error: "Cannot delete the only jackpot. At least one jackpot must remain configured.",
    });
    return;
  }

  const [removed] = store.jackpots.splice(index, 1);

  // Unlink rooms
  removed.linkedRooms?.forEach((roomId) => {
    const room = store.rooms.find((r) => r.id === roomId);
    if (room) {
      delete room.jackpot;
    }
  });

  store.addAudit("jackpot", "Jackpot deleted", `Removed jackpot ${removed.name} (${removed.id})`);
  store.save();

  syncBus.emitChange(
    "jackpots",
    "delete",
    { id: req.params.id, name: removed.name },
    req.params.id,
    `Jackpot "${removed.name}" was deleted.`
  );

  res.json({
    success: true,
    message: `Jackpot "${removed.name}" deleted successfully.`,
    remainingCount: store.jackpots.length,
  });
});
