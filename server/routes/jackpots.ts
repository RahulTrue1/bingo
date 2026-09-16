import express, { type Request, type Response } from "express";
import { store } from "../db/store.ts";
import type { Jackpot } from "../types.ts";

export const jackpotsRouter = express.Router();

// GET /api/jackpots - List all active progressive jackpots
jackpotsRouter.get("/", (_req: Request, res: Response) => {
  res.json({
    success: true,
    jackpots: store.jackpots,
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

  store.addAudit("jackpot", "Jackpot contribution", `+$${num.toFixed(2)} · ${jp.name}`);
  store.save();

  res.json({
    success: true,
    jackpot: jp,
    message: `Added $${num.toFixed(2)} contribution to ${jp.name}.`,
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

  store.addAudit("alert", "Jackpot configuration updated", `${jp.name} settings changed`);
  store.save();

  res.json({ success: true, jackpot: jp });
});

// POST /api/jackpots/:id/reset - Reset jackpot to starting value
jackpotsRouter.post("/:id/reset", (req: Request, res: Response) => {
  const jp = store.jackpots.find((j) => j.id === req.params.id);
  if (!jp) {
    res.status(404).json({ success: false, error: "Jackpot not found" });
    return;
  }

  jp.currentAmount = jp.resetAmount;
  store.addAudit("jackpot", "Jackpot reset", `${jp.name} reset to $${jp.resetAmount}`);
  store.save();

  res.json({
    success: true,
    jackpot: jp,
    message: `${jp.name} reset to $${jp.resetAmount.toFixed(2)}.`,
  });
});
