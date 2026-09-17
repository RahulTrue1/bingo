import express, { type Request, type Response } from "express";
import { store } from "../db/store.ts";
import { syncBus } from "../services/sync-bus.ts";
import type { HeroBanner } from "../types.ts";

export const bannersRouter = express.Router();

// GET /api/banners - List all active carousel slides / banners
bannersRouter.get("/", (_req: Request, res: Response) => {
  res.json({
    success: true,
    count: store.banners.length,
    banners: store.banners,
  });
});

// POST /api/banners - Add a banner (Admin)
bannersRouter.post("/", (req: Request, res: Response) => {
  const data = req.body as Partial<HeroBanner>;
  if (!data.title || !data.image) {
    res.status(400).json({ success: false, error: "Title and image are required" });
    return;
  }

  const banner: HeroBanner = {
    id: data.id || `banner-${Date.now()}`,
    roomId: data.roomId || "diamond-75",
    kicker: data.kicker || "SPECIAL EVENT",
    title: data.title,
    body: data.body || "",
    cta: data.cta || "Play now",
    alt: data.alt || "View games",
    seconds: data.seconds || 3000,
    theme: data.theme || "host",
    value: data.value || "$1,000",
    image: data.image,
    imageAlt: data.imageAlt || data.title,
    imageWidth: data.imageWidth || 1880,
    imageHeight: data.imageHeight || 836,
    active: data.active !== false,
  };

  store.banners.push(banner);
  store.addAudit("alert", "Banner created", `Banner "${banner.title}" added to lobby`);
  store.save();

  syncBus.emitChange("banners", "create", banner, banner.id, `Banner "${banner.title}" created.`);

  res.status(201).json({ success: true, banner });
});

// PUT /api/banners/:id - Update banner
bannersRouter.put("/:id", (req: Request, res: Response) => {
  const banner = store.banners.find((b) => b.id === req.params.id);
  if (!banner) {
    res.status(404).json({ success: false, error: "Banner not found" });
    return;
  }

  Object.assign(banner, req.body);
  store.save();

  syncBus.emitChange("banners", "update", banner, banner.id, `Banner "${banner.title}" updated.`);

  res.json({ success: true, banner });
});
