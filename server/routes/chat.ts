import express, { type Request, type Response } from "express";
import { store } from "../db/store.ts";
import { syncBus } from "../services/sync-bus.ts";
import type { ChatMessage } from "../types.ts";

export const chatRouter = express.Router();

// GET /api/chat/:roomId - Get chat messages for room
chatRouter.get("/:roomId", (req: Request, res: Response) => {
  const messages = store.chatMessages[req.params.roomId] || [];
  res.json({
    success: true,
    roomId: req.params.roomId,
    messages,
    mutedUsers: store.mutedUsers,
  });
});

// POST /api/chat/:roomId - Post new message
chatRouter.post("/:roomId", (req: Request, res: Response) => {
  const { user = "Ari.R", text, role = "player" } = req.body;
  if (!text || typeof text !== "string" || !text.trim()) {
    res.status(400).json({ success: false, error: "Message text is required" });
    return;
  }

  if (store.mutedUsers.includes(user)) {
    res.status(403).json({ success: false, error: "You are currently muted from chat." });
    return;
  }

  if (!store.chatMessages[req.params.roomId]) {
    store.chatMessages[req.params.roomId] = [];
  }

  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const message: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    roomId: req.params.roomId,
    user,
    text: text.trim(),
    time,
    role: role as "player" | "admin" | "system",
  };

  store.chatMessages[req.params.roomId].unshift(message);
  if (store.chatMessages[req.params.roomId].length > 50) {
    store.chatMessages[req.params.roomId].pop();
  }

  store.save();

  syncBus.emitChange("chat", "message", message, req.params.roomId);

  res.status(201).json({
    success: true,
    message,
  });
});

// POST /api/chat/:roomId/moderate - Mute user or delete message
chatRouter.post("/:roomId/moderate", (req: Request, res: Response) => {
  const { action, targetMessageId, targetUser } = req.body;

  if (action === "delete" && targetMessageId) {
    const list = store.chatMessages[req.params.roomId] || [];
    store.chatMessages[req.params.roomId] = list.filter((m) => m.id !== targetMessageId);
    store.addAudit("alert", "Chat message deleted", `Deleted message from ${req.params.roomId}`);
    store.save();
    syncBus.emitChange("chat", "delete-message", { targetMessageId }, req.params.roomId);
    res.json({ success: true, message: "Message deleted" });
    return;
  }

  if (action === "toggle-mute" && targetUser) {
    if (store.mutedUsers.includes(targetUser)) {
      store.mutedUsers = store.mutedUsers.filter((u) => u !== targetUser);
      store.addAudit("player", "Player unmuted", `${targetUser} unmuted in chat`);
      syncBus.emitChange("chat", "unmute", { user: targetUser }, req.params.roomId);
    } else {
      store.mutedUsers.push(targetUser);
      store.addAudit("alert", "Player muted", `${targetUser} muted for 30 minutes`);
      syncBus.emitChange("chat", "mute", { user: targetUser }, req.params.roomId);
    }
    store.save();
    res.json({ success: true, mutedUsers: store.mutedUsers });
    return;
  }

  res.status(400).json({ success: false, error: "Invalid moderation action" });
});

// POST /api/chat/broadcast - Operator broadcast message
chatRouter.post("/broadcast", (req: Request, res: Response) => {
  const { text, target = "all" } = req.body;
  if (!text) {
    res.status(400).json({ success: false, error: "Broadcast text required" });
    return;
  }

  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const targetRooms = target === "all" ? store.rooms.map((r) => r.id) : [target];

  for (const rid of targetRooms) {
    if (!store.chatMessages[rid]) store.chatMessages[rid] = [];
    store.chatMessages[rid].unshift({
      id: `bc-${Date.now()}-${rid}`,
      roomId: rid,
      user: "Trueigtech Admin",
      text,
      time,
      role: "admin",
    });
  }

  store.addAudit("alert", "Admin broadcast sent", text);
  store.save();

  syncBus.emitChange("chat", "broadcast", { text, time, targetRooms }, undefined, text);
  syncBus.emitChange("announcement", "broadcast", { text, time }, undefined, text);

  res.json({ success: true, message: "Broadcast sent", targetRoomsCount: targetRooms.length });
});
