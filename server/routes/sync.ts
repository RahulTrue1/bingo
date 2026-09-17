import express, { type Request, type Response } from "express";
import { syncBus, type SyncEvent } from "../services/sync-bus.ts";
import { store } from "../db/store.ts";

export const syncRouter = express.Router();

// GET /api/sync/events - Real-time Server-Sent Events (SSE) stream
syncRouter.get("/events", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable proxy buffering if any

  // Send initial connect handshake event
  const initialEvent: SyncEvent = {
    id: `handshake-${Date.now()}`,
    revision: syncBus.currentRevision,
    timestamp: new Date().toISOString(),
    entity: "all",
    action: "connected",
    message: "Connected to Trueigtech Bingo Real-time Event Bus",
  };
  res.write(`data: ${JSON.stringify(initialEvent)}\n\n`);

  // Listener for future changes
  const onChange = (event: SyncEvent) => {
    try {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch {
      cleanup();
    }
  };

  syncBus.on("change", onChange);

  // Keep-alive heartbeat ping every 15s to prevent connection dropouts
  const heartbeat = setInterval(() => {
    try {
      res.write(": ping\n\n");
    } catch {
      cleanup();
    }
  }, 15000);

  const cleanup = () => {
    syncBus.off("change", onChange);
    clearInterval(heartbeat);
  };

  req.on("close", cleanup);
  req.on("end", cleanup);
  res.on("close", cleanup);
  res.on("error", cleanup);
});

// GET /api/sync/status - Lightweight polling endpoint for drift-free state checks
syncRouter.get("/status", (req: Request, res: Response) => {
  const since = Number(req.query.since) || 0;
  res.json({
    success: true,
    revision: syncBus.currentRevision,
    timestamp: new Date().toISOString(),
    events: syncBus.getHistory(since),
    summary: {
      roomsCount: store.rooms.length,
      wallet: store.wallet,
      jackpotsCount: store.jackpots.length,
      promotionsCount: store.promotions.length,
      bannersCount: store.banners.length,
    },
  });
});

// POST /api/sync/broadcast - Operator broadcast announcement or trigger
syncRouter.post("/broadcast", (req: Request, res: Response) => {
  const { entity = "announcement", action = "broadcast", message, data, roomId } = req.body;
  if (!message && !data) {
    res.status(400).json({ success: false, error: "Message or data payload is required" });
    return;
  }

  const event = syncBus.emitChange(entity, action, data, roomId, message);
  if (message) {
    store.addAudit("alert", "Broadcast announcement", message);
  }

  res.json({ success: true, event });
});
