import express, { type Request, type Response } from "express";
import { store } from "../db/store.ts";
import { syncBus } from "../services/sync-bus.ts";
import type { PokerFeeType, PokerTable } from "../types.ts";

export const pokerRouter = express.Router();

function getClientIdentifier(req: Request): string {
  const user = store.resolveUser(req);
  if (user?.username) return user.username.toLowerCase();
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.ip || "127.0.0.1";
}

// GET /api/poker/tables - Public table lobby
pokerRouter.get("/tables", (_req: Request, res: Response) => {
  const tables = store.pokerTables
    .filter((t) => t.status !== "closed")
    .map((t) => {
      // In compliance with Section 7: Private table invite codes are NEVER sent in public lists
      const { inviteCode, ...safeTable } = t;
      return {
        ...safeTable,
        hasCode: Boolean(inviteCode),
        seatedCount: (t.seats || []).filter((s) => Boolean(s.player)).length,
      };
    });

  res.json({
    success: true,
    count: tables.length,
    tables,
  });
});

// POST /api/poker/private-tables - Quick create private friends table ("Tavolinë për shokë")
pokerRouter.post("/private-tables", (req: Request, res: Response) => {
  const { name, sb = 5, bb = 10, seats = 6, feeType = "RAKE" as PokerFeeType, minBuyIn, maxBuyIn } = req.body;
  const user = store.resolveUser(req);
  const username = user?.username || (req.headers["x-player-username"] as string) || store.activeUsername || "Player";

  const numSb = Number(sb);
  const numBb = Number(bb);
  const numSeats = Number(seats);

  if (isNaN(numSb) || isNaN(numBb) || numSb <= 0 || numBb <= numSb) {
    res.status(400).json({ success: false, error: "Invalid small/big blinds specified" });
    return;
  }

  // Generate 6-char CSPRNG code excluding 0, O, 1, I
  const inviteCode = store.generatePokerInviteCode();
  const tableId = `tbl-pvt-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const tableName = (name && String(name).trim()) || `Friends Table ${numSb}/${numBb}`;

  const calculatedMinBuyIn = Number(minBuyIn) || numBb * 20;
  const calculatedMaxBuyIn = Number(maxBuyIn) || numBb * 200;

  const newTable: PokerTable = {
    id: tableId,
    name: tableName,
    gameType: "texas_holdem",
    sb: numSb,
    bb: numBb,
    minBuyIn: calculatedMinBuyIn,
    maxBuyIn: calculatedMaxBuyIn,
    maxSeats: [2, 4, 6, 9].includes(numSeats) ? numSeats : 6,
    feeType: feeType === "HAND_FEE" || feeType === "TABLE_FEE" ? feeType : "RAKE",
    rakePercent: feeType === "RAKE" ? 5.0 : 0,
    rakeCap: feeType === "RAKE" ? numBb * 2.5 : 0,
    handFeeAmount: feeType === "HAND_FEE" ? 2 : 0,
    tableFeeAmount: feeType === "TABLE_FEE" ? 20 : 0,
    tableFeeIntervalMinutes: 30,
    isPrivate: true,
    inviteCode,
    status: "open",
    createdBy: username,
    createdAt: new Date().toISOString(),
    seats: [],
    pot: 0,
    tier: numBb <= 4 ? "low" : numBb <= 20 ? "mid" : "high",
  };

  store.pokerTables.unshift(newTable);
  store.addAudit("player", "POKER_PRIVATE_CREATE", `${username} created private table '${tableName}' with code ${inviteCode}`);
  store.save();

  syncBus.emitChange("rooms", "poker-table-created", { tableId, name: tableName });

  res.json({
    success: true,
    table: newTable,
    inviteCode,
    message: `Private table created successfully. Share invite code: ${inviteCode}`,
  });
});

// POST /api/poker/private-tables/join - Verify private table invite code with brute-force lockout protection
pokerRouter.post("/private-tables/join", (req: Request, res: Response) => {
  const { code } = req.body;
  const identifier = getClientIdentifier(req);

  // 1. Check Rate Limit / Lockout
  const rateLimit = store.checkPokerCodeRateLimit(identifier);
  if (!rateLimit.allowed) {
    res.status(429).json({
      success: false,
      error: `Too many failed attempts. Account locked out for ${Math.ceil((rateLimit.remainingLockoutSeconds || 900) / 60)} minutes.`,
      lockout: true,
      remainingSeconds: rateLimit.remainingLockoutSeconds,
    });
    return;
  }

  if (!code || typeof code !== "string" || !code.trim()) {
    res.status(400).json({ success: false, error: "Invite code is required" });
    return;
  }

  const cleanCode = code.trim().toUpperCase();

  // Find private table matching code
  const table = store.pokerTables.find(
    (t) => t.isPrivate && t.status !== "closed" && t.inviteCode?.toUpperCase() === cleanCode
  );

  if (!table) {
    const attempt = store.recordFailedPokerCodeAttempt(identifier);
    if (attempt.locked) {
      res.status(429).json({
        success: false,
        error: "Too many failed attempts. Account locked out for 15 minutes.",
        lockout: true,
        remainingSeconds: 15 * 60,
      });
      return;
    }

    res.status(400).json({
      success: false,
      error: `Invalid invite code. ${attempt.attemptsLeft} attempts remaining before a 15-minute lockout.`,
      attemptsLeft: attempt.attemptsLeft,
    });
    return;
  }

  // Code verified! Reset failed attempts
  store.resetFailedPokerCodeAttempts(identifier);

  res.json({
    success: true,
    table: {
      ...table,
      seatedCount: (table.seats || []).filter((s) => Boolean(s.player)).length,
    },
    message: `Table '${table.name}' unlocked successfully.`,
  });
});

// DELETE /api/poker/private-tables/:id - Delete private table
pokerRouter.delete("/private-tables/:id", (req: Request, res: Response) => {
  const targetId = String(req.params.id);
  const user = store.resolveUser(req);
  const username = user?.username || (req.headers["x-player-username"] as string) || store.activeUsername || "Player";

  const table = store.pokerTables.find((t) => t.id === targetId && t.isPrivate);
  if (!table) {
    res.status(404).json({ success: false, error: "Private table not found" });
    return;
  }

  // Refund seated players before closing
  const result = store.closePokerTable(targetId, username);

  res.json({
    success: true,
    tableId: targetId,
    refundedCount: result.refundedCount,
    totalRefunded: result.totalRefunded,
    message: `Table '${table.name}' deleted. Refunded ${result.refundedCount} seated players.`,
  });
});

// POST /api/poker/tables/:id/buyin - Single-wallet buy-in
pokerRouter.post("/tables/:id/buyin", (req: Request, res: Response) => {
  const tableId = String(req.params.id);
  const { amount, seatNo } = req.body;
  const numAmount = Number(amount);

  if (isNaN(numAmount) || numAmount <= 0) {
    res.status(400).json({ success: false, error: "Valid buy-in amount is required" });
    return;
  }

  const resolved = store.resolveUser(req);
  const currentUsername =
    resolved?.username ||
    (req.headers["x-player-username"] as string) ||
    (req.body.username as string) ||
    store.activeUsername ||
    "Ari.R";

  const player =
    resolved ||
    store.players.find(
      (p) =>
        p.username.toLowerCase() === currentUsername.toLowerCase() ||
        p.id.toLowerCase() === currentUsername.toLowerCase()
    );

  if (!player) {
    res.status(404).json({ success: false, error: "Player not found" });
    return;
  }

  // Opt-in access enforcement (Section 3: poker_enabled defaults to false)
  if (player.poker_enabled === false) {
    res.status(403).json({
      success: false,
      error: "Poker Live is not enabled on this account. Please request access from an operator.",
      pokerAccessDenied: true,
    });
    return;
  }

  const result = store.buyInPoker(tableId, player, numAmount, seatNo ? Number(seatNo) : undefined);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error });
    return;
  }

  syncBus.emitChange("wallet", "poker-buyin", {
    player: player.username,
    amount: numAmount,
    balance: player.balance,
    tableId,
  });

  const updatedTable = store.pokerTables.find((t) => t.id === tableId);
  syncBus.emitChange("rooms", "poker-player-joined", {
    player: player.username,
    seat: result.seat,
    amount: numAmount,
    tableId,
    table: updatedTable,
  });

  res.json({
    success: true,
    balance: player.balance,
    seat: result.seat,
    message: `Successfully bought into table for $${numAmount}. New balance: $${player.balance}.`,
  });
});

// POST /api/poker/tables/:id/cashout - Single-wallet cash-out
pokerRouter.post("/tables/:id/cashout", (req: Request, res: Response) => {
  const tableId = String(req.params.id);
  const resolved = store.resolveUser(req);
  const currentUsername =
    resolved?.username ||
    (req.headers["x-player-username"] as string) ||
    (req.body.username as string) ||
    store.activeUsername ||
    "Ari.R";

  const player =
    resolved ||
    store.players.find(
      (p) =>
        p.username.toLowerCase() === currentUsername.toLowerCase() ||
        p.id.toLowerCase() === currentUsername.toLowerCase()
    );

  if (!player) {
    res.status(404).json({ success: false, error: "Player not found" });
    return;
  }

  const result = store.cashOutPoker(tableId, player);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error });
    return;
  }

  syncBus.emitChange("wallet", "poker-cashout", {
    player: player.username,
    amount: result.amountCashedOut,
    balance: player.balance,
    tableId,
  });

  const updatedTable = store.pokerTables.find((t) => t.id === tableId);
  syncBus.emitChange("rooms", "poker-player-left", {
    player: player.username,
    tableId,
    table: updatedTable,
  });

  res.json({
    success: true,
    amountCashedOut: result.amountCashedOut,
    balance: player.balance,
    message: `Successfully cashed out $${result.amountCashedOut}. New balance: $${player.balance}.`,
  });
});

// POST /api/poker/enable-access - Activate poker access for current player
pokerRouter.post("/enable-access", (req: Request, res: Response) => {
  const resolved = store.resolveUser(req);
  const currentUsername =
    (req.body.username as string) ||
    resolved?.username ||
    store.activeUsername ||
    "Ari.R";

  const player =
    resolved ||
    store.players.find(
      (p) =>
        p.username.toLowerCase() === currentUsername.toLowerCase() ||
        p.id.toLowerCase() === currentUsername.toLowerCase()
    );

  if (!player) {
    res.status(404).json({ success: false, error: "Player not found" });
    return;
  }

  player.poker_enabled = true;
  syncBus.emitChange("players", "poker_access_updated", {
    playerId: player.id,
    username: player.username,
    poker_enabled: true,
  });

  res.json({
    success: true,
    message: `Poker Live access activated for ${player.username}.`,
    poker_enabled: true,
    username: player.username,
  });
});

