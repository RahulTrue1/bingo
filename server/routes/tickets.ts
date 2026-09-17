import express, { type Request, type Response } from "express";
import { store } from "../db/store.ts";
import { BingoEngine } from "../services/bingo-engine.ts";
import { syncBus } from "../services/sync-bus.ts";
import type { PlayerTicket } from "../types.ts";

export const ticketsRouter = express.Router();

// GET /api/tickets - List active purchased tickets for user
ticketsRouter.get("/", (req: Request, res: Response) => {
  const { roomId } = req.query;
  let result = store.tickets;
  if (roomId && typeof roomId === "string") {
    result = result.filter((t) => t.roomId === roomId);
  }
  res.json({
    success: true,
    count: result.length,
    tickets: result,
  });
});

// POST /api/tickets/buy - Purchase bingo tickets for a room
ticketsRouter.post("/buy", (req: Request, res: Response) => {
  const { roomId, count = 1, userId = "USR-11804" } = req.body;
  const numCount = Math.max(1, Math.min(8, Number(count)));

  const room = store.rooms.find((r) => r.id === roomId);
  if (!room) {
    res.status(404).json({ success: false, error: "Room not found" });
    return;
  }

  const totalCost = room.ticketPrice * numCount;

  if (store.wallet < totalCost) {
    res.status(400).json({
      success: false,
      error: `Insufficient funds. Cost is $${totalCost.toFixed(2)}, but current balance is $${store.wallet.toFixed(2)}.`,
    });
    return;
  }

  // Deduct wallet
  store.wallet -= totalCost;

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
      userId,
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
        user: "Auto Contribution",
      });
    }
  }

  // Add transaction
  const tx = store.addTransaction({
    player: "Ari.R",
    room: room.name,
    type: "Ticket purchase",
    amount: -totalCost,
    status: "Completed",
  });

  store.addAudit(
    "player",
    "Tickets purchased",
    `${numCount} card${numCount > 1 ? "s" : ""} bought for ${room.name} ($${totalCost.toFixed(2)})`
  );

  store.save();

  syncBus.emitChange("wallet", "ticket-purchase", { wallet: store.wallet, totalCost, count: numCount }, room.id);
  syncBus.emitChange("rooms", "update", room, room.id);

  res.status(201).json({
    success: true,
    purchasedCount: numCount,
    totalCost,
    wallet: store.wallet,
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
