import express, { type Request, type Response } from "express";
import { store } from "../db/store.ts";
import { BingoEngine } from "../services/bingo-engine.ts";
import { syncBus } from "../services/sync-bus.ts";
import type { PlayerTicket } from "../types.ts";

export const ticketsRouter = express.Router();

// GET /api/tickets - List active purchased tickets for user
ticketsRouter.get("/", (req: Request, res: Response) => {
  const { roomId, userId, username, player, all } = req.query;
  let result = store.tickets;
  if (roomId && typeof roomId === "string") {
    result = result.filter((t) => t.roomId === roomId);
  }

  // Filter by user: explicit query param or session user or fallback to store.activeUsername (unless all=true requested)
  const resolved = store.resolveUser(req);
  const requestedUser = (username || player || userId || (all === "true" ? null : resolved?.username)) as string | undefined;
  const filterUser = requestedUser || (all === "true" ? null : store.activeUsername);

  if (filterUser && typeof filterUser === "string" && filterUser.trim() !== "") {
    const q = filterUser.trim().toLowerCase();
    result = result.filter((t) => {
      const p = (t.player || "").toLowerCase();
      const u = (t.userId || "").toLowerCase();
      if (p === q || u === q) return true;
      const matchedPlayer = store.players.find(
        (pl) => pl.username.toLowerCase() === q || pl.id.toLowerCase() === q
      );
      if (matchedPlayer) {
        if (p === matchedPlayer.username.toLowerCase() || u === matchedPlayer.id.toLowerCase()) return true;
      }
      return false;
    });
  }

  res.json({
    success: true,
    count: result.length,
    tickets: result,
  });
});

// POST /api/tickets/buy - Purchase bingo tickets for a room
ticketsRouter.post("/buy", (req: Request, res: Response) => {
  const { roomId, count = 1, userId, username, player } = req.body;

  const room = store.rooms.find((r) => r.id === roomId);
  if (!room) {
    res.status(404).json({ success: false, error: "Room not found" });
    return;
  }

  const maxAllowed = Math.max(1, room.cardLimit ?? 8);
  const numCount = Math.max(1, Math.min(maxAllowed, Number(count)));

  // Calculate promotion discount if configured
  const freeCards = room.promotion === "Buy 3 Get 1" ? Math.floor(numCount / 4) : 0;
  const payableCards = Math.max(0, numCount - freeCards);
  const baseCost = room.ticketPrice * payableCards;
  const totalCost = room.promotion === "Happy Hour" ? Math.round(baseCost * 0.75 * 100) / 100 : baseCost;

  // Resolve buyer identity from session token or body
  const resolved = store.resolveUser(req);
  const activeUser = ((username || player || resolved?.username || store.activeUsername || "Ari.R") as string).trim();
  const playerObj = resolved || store.players.find(
    (p) => p.username.toLowerCase() === activeUser.toLowerCase() || (userId && p.id.toLowerCase() === String(userId).toLowerCase())
  );
  const effectiveUserId = (userId || playerObj?.id || (activeUser === "Ari.R" ? "USR-11804" : `USR-${Math.floor(10000 + Math.random() * 90000)}`)).trim();
  const effectiveUsername = playerObj?.username || activeUser;

  const currentBalance = playerObj !== undefined ? playerObj.balance : store.wallet;
  if (currentBalance < totalCost) {
    res.status(400).json({
      success: false,
      error: `Insufficient funds. Cost is $${totalCost.toFixed(2)}, but current balance is $${currentBalance.toFixed(2)}.`,
    });
    return;
  }

  // Deduct wallet for the specific player
  if (playerObj) {
    playerObj.balance = Math.max(0, Math.round((playerObj.balance - totalCost) * 100) / 100);
    playerObj.cardsPurchased = (playerObj.cardsPurchased ?? 0) + numCount;
    playerObj.totalEntry = (playerObj.totalEntry ?? 0) + totalCost;
    if (playerObj.username.toLowerCase() === (store.activeUsername || "Ari.R").toLowerCase()) {
      store.wallet = playerObj.balance;
    }
  } else {
    store.wallet = Math.max(0, Math.round((store.wallet - totalCost) * 100) / 100);
  }

  // Generate cards
  const newTickets: PlayerTicket[] = [];
  const baseSeed = Date.now();

  for (let i = 0; i < numCount; i++) {
    const ticketId = `TCK-${Math.floor(100000 + Math.random() * 900000)}`;
    const cells = BingoEngine.generateCardForVariant(room.variant, baseSeed + i * 13);
    const ticket: PlayerTicket = {
      id: ticketId,
      ticketIndex: i,
      roomId: room.id,
      userId: effectiveUserId,
      player: effectiveUsername,
      variant: room.variant,
      cells,
      daubed: [],
      purchasedAt: new Date().toISOString(),
    };
    newTickets.push(ticket);
    store.tickets.unshift(ticket);
  }

  // Update room stats
  room.cardsSold += numCount;
  room.players = Math.min(room.maxPlayers, room.players + 1);

  // Progressive jackpot contribution
  if (room.jackpot) {
    const contribution = Math.round(totalCost * 0.025 * 100) / 100;
    room.jackpot += contribution;
    const mainJp = store.jackpots.find((jp) => jp.linkedRooms.includes(room.id));
    if (mainJp) {
      mainJp.currentAmount += contribution;
      mainJp.history.unshift({
        type: "Ticket contribution",
        amount: contribution,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        user: effectiveUsername,
      });
    }
  }

  // Add transaction
  const tx = store.addTransaction({
    player: effectiveUsername,
    room: room.name,
    type: "Ticket purchase",
    amount: -totalCost,
    status: "Completed",
  });

  store.addAudit(
    "player",
    "Tickets purchased",
    `${numCount} card${numCount > 1 ? "s" : ""} bought for ${room.name} ($${totalCost.toFixed(2)}) by ${effectiveUsername}`
  );

  store.save();

  const effectiveWallet = playerObj ? playerObj.balance : store.wallet;

  syncBus.emitChange("wallet", "ticket-purchase", { wallet: effectiveWallet, totalCost, count: numCount, player: effectiveUsername }, room.id);
  syncBus.emitChange("tickets", "purchase", { tickets: newTickets, count: numCount, player: effectiveUsername, userId: effectiveUserId }, room.id);
  if (playerObj) {
    syncBus.emitChange("players", "update", playerObj, playerObj.id, "Ticket purchase");
  }
  syncBus.emitChange("rooms", "update", room, room.id);

  res.status(201).json({
    success: true,
    purchasedCount: numCount,
    totalCost,
    wallet: effectiveWallet,
    tickets: newTickets,
    transaction: tx,
    message: `Purchased ${numCount} card${numCount > 1 ? "s" : ""} for ${room.name}.`,
  });
});

// POST /api/tickets/:ticketId/daub - Daub a number on ticket
ticketsRouter.post("/:ticketId/daub", (req: Request, res: Response) => {
  const { number } = req.body;
  const num = Number(number);
  const ticket = store.tickets.find((t) => t.id === req.params.ticketId);

  if (!ticket) {
    res.status(404).json({ success: false, error: "Ticket not found" });
    return;
  }

  if (!ticket.daubed.includes(num)) {
    ticket.daubed.push(num);
    store.save();
  }

  res.json({
    success: true,
    ticket,
  });
});
