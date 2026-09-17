import express, { type Request, type Response } from "express";
import { store } from "../db/store.ts";
import { RTPEngine } from "../services/bingo-engine.ts";
import { syncBus } from "../services/sync-bus.ts";
import type { BingoRoomData } from "../types.ts";

export const roomsRouter = express.Router();

// GET /api/rooms - List all rooms with optional filtering
roomsRouter.get("/", (req: Request, res: Response) => {
  const { variant, status, search } = req.query;
  let result = [...store.rooms];

  if (variant && typeof variant === "string" && variant !== "All variants") {
    result = result.filter((r) => r.variant.toLowerCase().includes(variant.toLowerCase()));
  }

  if (status && typeof status === "string" && status !== "All statuses") {
    result = result.filter((r) => r.status.toLowerCase() === status.toLowerCase());
  }

  if (search && typeof search === "string") {
    const q = search.toLowerCase();
    result = result.filter((r) => r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q));
  }

  res.json({
    success: true,
    count: result.length,
    rooms: result,
  });
});

// GET /api/rooms/:id - Get single room
roomsRouter.get("/:id", (req: Request, res: Response) => {
  const room = store.rooms.find((r) => r.id === req.params.id);
  if (!room) {
    res.status(404).json({ success: false, error: "Room not found" });
    return;
  }
  res.json({ success: true, room });
});

// POST /api/rooms - Create new room
roomsRouter.post("/", (req: Request, res: Response) => {
  const body = req.body as Partial<BingoRoomData>;
  if (!body.name) {
    res.status(400).json({ success: false, error: "Room name is required" });
    return;
  }

  const id = body.id || body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  if (store.rooms.some((r) => r.id === id)) {
    res.status(409).json({ success: false, error: "Room ID already exists" });
    return;
  }

  const variant = body.variant || "75-Ball Pattern";
  const newRoom: BingoRoomData = {
    id,
    name: body.name,
    variant,
    status: body.status || "Open",
    ticketPrice: typeof body.ticketPrice === "number" ? body.ticketPrice : 1,
    prize: typeof body.prize === "number" ? body.prize : 500,
    jackpot: body.jackpot,
    players: 0,
    maxPlayers: body.maxPlayers || 300,
    cardsSold: 0,
    startsIn: body.startsIn || "10:00",
    pattern: body.pattern || (body.winningStages ? body.winningStages.map((s) => s.name).join(" → ") : "One Line"),
    accent: body.accent || "violet",
    tag: body.tag || "NEW",
    frequency: body.frequency || "Every 10 min",
    cardRows: variant.includes("90") ? 3 : variant.includes("30") ? 3 : variant.includes("80") ? 4 : 5,
    cardColumns: variant.includes("90") ? 9 : variant.includes("30") ? 3 : variant.includes("80") ? 4 : 5,
    callDelay: body.callDelay || 1200,
    winningStages: body.winningStages || [
      { name: "One Line", prize: 100, continueAfterWin: true },
      { name: "Full House", prize: 400, continueAfterWin: false },
    ],
    rtp: body.rtp ?? 80,
    rtpMode: body.rtpMode ?? "dynamic",
    customRtp: body.customRtp ?? false,
  };

  store.rooms = [...store.rooms, newRoom];
  store.addAudit("player", "New room created", `${newRoom.name} (${newRoom.variant})`);

  syncBus.emitChange("rooms", "create", newRoom, newRoom.id, `Room "${newRoom.name}" created.`);

  res.status(201).json({ success: true, room: newRoom });
});

// PUT /api/rooms/:id - Update room
roomsRouter.put("/:id", (req: Request, res: Response) => {
  const index = store.rooms.findIndex((r) => r.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ success: false, error: "Room not found" });
    return;
  }

  const existing = store.rooms[index];
  const updates = req.body as Partial<BingoRoomData>;

  const updated: BingoRoomData = {
    ...existing,
    ...updates,
    id: existing.id, // preserve ID
  };

  // If dynamic RTP mode and price/cards changed, auto adjust dynamic prize if applicable
  if (updated.rtpMode === "dynamic" && (updates.ticketPrice !== undefined || updates.rtp !== undefined)) {
    const dyn = RTPEngine.calculateDynamicPrize(
      updated.cardsSold,
      updated.ticketPrice,
      updated.rtp ?? 80,
      updated.jackpot ? 2.5 : 0
    );
    if (dyn > 0) updated.prize = Math.round(dyn);
  }

  const nextRooms = [...store.rooms];
  nextRooms[index] = updated;
  store.rooms = nextRooms;

  store.addAudit("alert", "Room updated", `${updated.name} settings modified`);

  syncBus.emitChange("rooms", "update", updated, updated.id, `Room "${updated.name}" updated.`);

  res.json({ success: true, room: updated });
});

// POST /api/rooms/:id/duplicate - Duplicate room
roomsRouter.post("/:id/duplicate", (req: Request, res: Response) => {
  const original = store.rooms.find((r) => r.id === req.params.id);
  if (!original) {
    res.status(404).json({ success: false, error: "Original room not found" });
    return;
  }

  const duplicateId = `${original.id}-copy-${Date.now().toString().slice(-4)}`;
  const duplicate: BingoRoomData = {
    ...original,
    id: duplicateId,
    name: `${original.name} Copy`,
    status: "Open",
    players: 0,
    cardsSold: 0,
  };

  store.rooms = [...store.rooms, duplicate];
  syncBus.emitChange("rooms", "duplicate", duplicate, duplicate.id, `Room "${duplicate.name}" duplicated.`);

  res.status(201).json({ success: true, room: duplicate });
});

// DELETE /api/rooms/:id - Delete room
roomsRouter.delete("/:id", (req: Request, res: Response) => {
  const exists = store.rooms.some((r) => r.id === req.params.id);
  if (!exists) {
    res.status(404).json({ success: false, error: "Room not found" });
    return;
  }

  store.rooms = store.rooms.filter((r) => r.id !== req.params.id);
  store.addAudit("alert", "Room deleted", req.params.id);
  syncBus.emitChange("rooms", "delete", { id: req.params.id }, req.params.id, `Room "${req.params.id}" deleted.`);

  res.json({ success: true, message: "Room deleted" });
});

// POST /api/rooms/rtp-policy - Apply network-wide RTP policy
roomsRouter.post("/rtp-policy", (req: Request, res: Response) => {
  const { targetRtp = 80, syncMode = "all" } = req.body;
  const numRtp = Number(targetRtp);

  const updatedRooms = store.rooms.map((room) => {
    if (syncMode === "non-custom" && room.customRtp) return room;
    const newPrize =
      room.rtpMode === "dynamic"
        ? RTPEngine.calculateDynamicPrize(room.cardsSold, room.ticketPrice, numRtp, room.jackpot ? 2.5 : 0)
        : room.prize;

    return {
      ...room,
      rtp: numRtp,
      customRtp: false,
      prize: newPrize > 0 ? Math.round(newPrize) : room.prize,
    };
  });

  store.rooms = updatedRooms;
  store.addAudit("alert", "Network RTP updated", `Global target set to ${numRtp}% (${syncMode})`);

  syncBus.emitChange("rooms", "rtp-policy", updatedRooms, undefined, `Network RTP policy set to ${numRtp}%.`);

  res.json({
    success: true,
    policyRtp: numRtp,
    houseMargin: RTPEngine.calculateHouseMargin(numRtp),
    roomsCount: updatedRooms.length,
    rooms: updatedRooms,
  });
});
