import express, { type Request, type Response } from "express";
import { store } from "../db/store.ts";
import { syncBus } from "../services/sync-bus.ts";
import type { PlatformSettings } from "../types.ts";

export const settingsRouter = express.Router();

// GET /api/settings - Fetch global platform configuration
settingsRouter.get("/", (_req: Request, res: Response) => {
  res.json({
    success: true,
    settings: store.settings,
  });
});

// PUT /api/settings - Update global platform configuration and broadcast immediately
settingsRouter.put("/", (req: Request, res: Response) => {
  const incoming = req.body as Partial<PlatformSettings>;
  const current = store.settings;

  const updated: PlatformSettings = {
    ...current,
    ...incoming,
    updatedAt: new Date().toISOString(),
    updatedBy: incoming.updatedBy || "Super Admin",
  };

  store.settings = updated;
  store.addAudit("alert", "Platform settings updated", `Updated settings by ${updated.updatedBy}`);

  // Broadcast to all connected clients immediately
  syncBus.emitChange("settings", "update", updated, undefined, "Platform settings updated");

  res.json({
    success: true,
    settings: updated,
    message: "Settings saved and synchronized across all connected clients.",
  });
});
