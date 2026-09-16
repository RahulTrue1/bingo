import express, { type Request, type Response } from "express";
import { store } from "../db/store.ts";
import type { Promotion } from "../types.ts";

export const promotionsRouter = express.Router();

// GET /api/promotions - List all promotions
promotionsRouter.get("/", (req: Request, res: Response) => {
  const { category, status } = req.query;
  let result = store.promotions;

  if (category && typeof category === "string" && category !== "All offers") {
    result = result.filter((p) => p.category.toLowerCase() === category.toLowerCase());
  }

  if (status && typeof status === "string") {
    result = result.filter((p) => p.status.toLowerCase() === status.toLowerCase());
  }

  res.json({
    success: true,
    promotions: result,
  });
});

// POST /api/promotions/:id/claim - Claim promotion bonus
promotionsRouter.post("/:id/claim", (req: Request, res: Response) => {
  const { userId = "USR-11804", playerName = "Ari.R" } = req.body;
  const promo = store.promotions.find((p) => p.id === req.params.id);

  if (!promo) {
    res.status(404).json({ success: false, error: "Promotion not found" });
    return;
  }

  if (promo.status !== "Active") {
    res.status(400).json({ success: false, error: "This promotion is not currently active" });
    return;
  }

  if (promo.claimedBy.includes(userId)) {
    res.status(409).json({ success: false, error: "You have already claimed this promotion" });
    return;
  }

  promo.claimedBy.push(userId);

  // Apply reward
  if (promo.rewardType === "credits") {
    store.wallet += promo.rewardValue;
    store.addTransaction({
      player: playerName,
      room: "Promotions",
      type: "Promotional credit",
      amount: promo.rewardValue,
      status: "Completed",
    });
  }

  store.addAudit("player", "Promotion claimed", `${playerName} claimed ${promo.title}`);
  store.save();

  res.json({
    success: true,
    promotion: promo,
    wallet: store.wallet,
    message: `Claimed ${promo.title}! Reward applied to your account.`,
  });
});

// PUT /api/promotions/:id - Admin update promotion (toggle/edit)
promotionsRouter.put("/:id", (req: Request, res: Response) => {
  const promo = store.promotions.find((p) => p.id === req.params.id);
  if (!promo) {
    res.status(404).json({ success: false, error: "Promotion not found" });
    return;
  }

  const updates = req.body as Partial<Promotion>;
  Object.assign(promo, updates);

  store.addAudit("alert", "Promotion updated", `${promo.title} status changed to ${promo.status}`);
  store.save();

  res.json({ success: true, promotion: promo });
});
