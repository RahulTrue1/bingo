import express, { type Request, type Response } from "express";
import { store } from "../db/store.ts";
import type { Promotion } from "../types.ts";

export const promotionsRouter = express.Router();

// Helper to find promotion by ID or Code (case-insensitive)
function findPromo(idOrCode: string): Promotion | undefined {
  const target = idOrCode.toLowerCase();
  return store.promotions.find(
    (p) => p.id.toLowerCase() === target || (p.code && p.code.toLowerCase() === target)
  );
}

// GET /api/promotions - List all promotions with optional category and status filtering
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
    count: result.length,
    promotions: result,
  });
});

// GET /api/promotions/:id - Get single promotion
promotionsRouter.get("/:id", (req: Request, res: Response) => {
  const promo = findPromo(req.params.id);
  if (!promo) {
    res.status(404).json({ success: false, error: "Promotion not found" });
    return;
  }
  res.json({ success: true, promotion: promo });
});

// POST /api/promotions - Create new promotion (Admin)
promotionsRouter.post("/", (req: Request, res: Response) => {
  const data = req.body as Partial<Promotion>;
  if (!data.title || !data.category) {
    res.status(400).json({ success: false, error: "Title and category are required" });
    return;
  }

  const promo: Promotion = {
    id: data.id || `promo-${Date.now()}`,
    code: data.code || `PRM${Math.floor(100 + Math.random() * 900)}`,
    title: data.title,
    shortTitle: data.shortTitle || data.title,
    description: data.description || "",
    status: data.status || "Active",
    category: data.category as Promotion["category"],
    badge: data.badge || "NEW",
    rewardType: data.rewardType || "credits",
    rewardValue: Number(data.rewardValue) || 10,
    reward: data.reward || "$10 Reward",
    image: data.image || "/promotions/free-bingo-reward.png",
    accent: data.accent || "cyan",
    roomId: data.roomId || "free-party",
    ends: data.ends || "Ongoing",
    featured: Boolean(data.featured),
    claimedBy: [],
  };

  store.promotions.push(promo);
  store.addAudit("alert", "Promotion created", `${promo.title} added to catalog`);
  store.save();

  res.status(201).json({ success: true, promotion: promo });
});

// POST /api/promotions/:id/claim - Claim promotion bonus
promotionsRouter.post("/:id/claim", (req: Request, res: Response) => {
  const { userId = "USR-11804", playerName = "Ari.R" } = req.body;
  const promo = findPromo(req.params.id);

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
  if (promo.rewardType === "credits" && promo.rewardValue > 0) {
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
  const promo = findPromo(req.params.id);
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
