import express, { type Request, type Response } from "express";
import { store } from "../db/store.ts";
import { BingoEngine, PatternValidator } from "../services/bingo-engine.ts";
import { syncBus } from "../services/sync-bus.ts";
import type { BingoClaim, GameSession } from "../types.ts";

export const gameRouter = express.Router();

function getOrCreateSession(roomId: string): GameSession {
  if (!store.gameSessions[roomId]) {
    const room = store.rooms.find((r) => r.id === roomId);
    store.gameSessions[roomId] = {
      roomId,
      phase: "selling",
      countdown: 5,
      called: [],
      current: null,
      speed: room?.variant.includes("Speed") ? "Turbo" : "Fast",
      paused: false,
      stageIndex: 0,
      patternRound: 0,
      winnerNames: [],
      winnerPrize: 0,
      winnerPattern: "",
      livePlayers: room?.players ?? 100,
      liveCards: room?.cardsSold ?? 250,
      liveJackpot: room?.jackpot ?? 0,
      lastWinner: "LuckyStar · $420",
    };
    store.save();
  }
  return store.gameSessions[roomId];
}

// GET /api/game/:roomId/state - Get live game session state
gameRouter.get("/:roomId/state", (req: Request, res: Response) => {
  const session = getOrCreateSession(req.params.roomId);
  if (session.phase === "selling" && session.called.length > 0) {
    session.called = [];
    session.current = null;
    store.save();
  }
  const room = store.rooms.find((r) => r.id === req.params.roomId);
  res.json({
    success: true,
    state: session,
    room,
  });
});

// POST /api/game/:roomId/call-next - Draw next ball in session
gameRouter.post("/:roomId/call-next", (req: Request, res: Response) => {
  const session = getOrCreateSession(req.params.roomId);
  const room = store.rooms.find((r) => r.id === req.params.roomId);
  const ballCount = room ? BingoEngine.getBallCount(room.variant) : 75;

  const next = BingoEngine.nextNumber(session.called, ballCount);
  if (next === null) {
    res.json({
      success: false,
      message: "All balls have been called",
      state: session,
    });
    return;
  }

  session.called.push(next);
  session.current = next;
  session.phase = "live";
  store.save();

  syncBus.emitChange(
    "game",
    "call-next",
    { ball: next, label: BingoEngine.label(next), state: session },
    req.params.roomId,
    `Ball ${BingoEngine.label(next)} called.`
  );

  res.json({
    success: true,
    ball: next,
    label: BingoEngine.label(next),
    state: session,
  });
});

// POST /api/game/:roomId/manual-call - Manually call a specific ball number
gameRouter.post("/:roomId/manual-call", (req: Request, res: Response) => {
  const { number } = req.body;
  const num = Number(number);
  const session = getOrCreateSession(req.params.roomId);

  if (isNaN(num) || num < 1 || num > 90) {
    res.status(400).json({ success: false, error: "Invalid ball number" });
    return;
  }

  if (session.called.includes(num)) {
    res.status(409).json({ success: false, error: `Ball ${num} has already been called` });
    return;
  }

  session.called.push(num);
  session.current = num;
  session.phase = "live";
  store.save();

  store.addAudit("alert", "Manual ball call", `${BingoEngine.label(num)} called manually in ${req.params.roomId}`);

  syncBus.emitChange(
    "game",
    "manual-call",
    { ball: num, label: BingoEngine.label(num), state: session },
    req.params.roomId,
    `Ball ${BingoEngine.label(num)} called manually by operator.`
  );

  res.json({
    success: true,
    ball: num,
    label: BingoEngine.label(num),
    state: session,
  });
});

// POST /api/game/:roomId/pause - Pause caller
gameRouter.post("/:roomId/pause", (req: Request, res: Response) => {
  const session = getOrCreateSession(req.params.roomId);
  session.paused = true;
  store.save();

  syncBus.emitChange(
    "game",
    "pause",
    { state: session },
    req.params.roomId,
    "Game paused by operator."
  );

  res.json({ success: true, state: session });
});

// POST /api/game/:roomId/resume - Resume caller
gameRouter.post("/:roomId/resume", (req: Request, res: Response) => {
  const session = getOrCreateSession(req.params.roomId);
  session.paused = false;
  session.phase = "live";
  store.save();

  syncBus.emitChange(
    "game",
    "resume",
    { state: session },
    req.params.roomId,
    "Game resumed by operator."
  );

  res.json({ success: true, state: session });
});

// POST /api/game/:roomId/restart - Restart game round
gameRouter.post("/:roomId/restart", (req: Request, res: Response) => {
  const session = getOrCreateSession(req.params.roomId);
  session.called = [];
  session.current = null;
  session.phase = "selling";
  session.countdown = 5;
  session.paused = false;
  session.winnerNames = [];
  session.winnerPrize = 0;
  session.winnerPattern = "";
  store.save();

  store.addAudit("alert", "Round restarted", `Game round reset in ${req.params.roomId}`);

  syncBus.emitChange(
    "game",
    "restart",
    { state: session },
    req.params.roomId,
    "Game round restarted."
  );

  res.json({ success: true, state: session });
});

// POST /api/game/:roomId/cancel - Cancel round & issue refunds
gameRouter.post("/:roomId/cancel", (req: Request, res: Response) => {
  const session = getOrCreateSession(req.params.roomId);
  session.phase = "selling";
  session.paused = true;

  // Process refunds for any purchased tickets for this room
  const userTickets = store.tickets.filter((t) => t.roomId === req.params.roomId);
  const room = store.rooms.find((r) => r.id === req.params.roomId);
  const refundAmount = room ? userTickets.length * room.ticketPrice : 0;
  let awardedWallet = store.wallet;

  if (refundAmount > 0) {
    const resolved = store.resolveUser(req);
    const targetPlayerName = (req.body?.player as string) || (req.headers["x-player-username"] as string) || resolved?.username || store.activeUsername || "Ari.R";
    const player = resolved || store.players.find(
      (p) => p.username.toLowerCase() === targetPlayerName.toLowerCase() || p.id.toLowerCase() === targetPlayerName.toLowerCase()
    );
    if (player) {
      player.balance = Math.round((player.balance + refundAmount) * 100) / 100;
      awardedWallet = player.balance;
      if (player.username.toLowerCase() === (store.activeUsername || "Ari.R").toLowerCase()) {
        store.wallet = player.balance;
      }
    } else {
      store.wallet = Math.round((store.wallet + refundAmount) * 100) / 100;
      awardedWallet = store.wallet;
    }
    store.addTransaction({
      player: targetPlayerName,
      room: room?.name ?? req.params.roomId,
      type: "Refund",
      amount: refundAmount,
      status: "Completed",
    });
    syncBus.emitChange("wallet", "refund", { wallet: awardedWallet, balance: awardedWallet, refundAmount, player: targetPlayerName }, req.params.roomId);
  }

  store.addAudit("alert", "Round cancelled", `Cancelled and refunded ${req.params.roomId}`);
  store.save();

  syncBus.emitChange(
    "game",
    "cancel",
    { state: session, refundAmount },
    req.params.roomId,
    `Round cancelled by operator. Refunded $${refundAmount.toFixed(2)} to wallet.`
  );

  res.json({
    success: true,
    message: `Round cancelled. Refunded $${refundAmount.toFixed(2)} to wallet.`,
    refundAmount,
    wallet: awardedWallet,
    state: session,
  });
});

// POST /api/game/:roomId/claim - Submit a Bingo claim
gameRouter.post("/:roomId/claim", (req: Request, res: Response) => {
  const { ticketId, playerName = "Ari.R", manualPattern } = req.body;
  const session = getOrCreateSession(req.params.roomId);
  const room = store.rooms.find((r) => r.id === req.params.roomId);

  if (!room) {
    res.status(404).json({ success: false, error: "Room not found" });
    return;
  }

  const resolved = store.resolveUser(req);
  const targetPlayerName = playerName || (req.headers["x-player-username"] as string) || resolved?.username || store.activeUsername || "Ari.R";
  const winnerPlayer = resolved || store.players.find(
    (p) => p.username.toLowerCase() === targetPlayerName.toLowerCase() || p.id.toLowerCase() === targetPlayerName.toLowerCase()
  );

  // Find ticket
  const ticket = store.tickets.find((t) => t.id === ticketId);
  const calledBalls: number[] = (Array.isArray(req.body.called) && req.body.called.length > 0)
    ? req.body.called
    : (Array.isArray(req.body.calledNumbers) && req.body.calledNumbers.length > 0)
    ? req.body.calledNumbers
    : session.called;

  const patternToTest =
    manualPattern ||
    (room.winningStages && room.winningStages[session.stageIndex]
      ? room.winningStages[session.stageIndex].name
      : room.pattern);

  const isValid = ticket && calledBalls.length > 0
    ? PatternValidator.checkPattern(ticket.cells, calledBalls, patternToTest)
    : true; // fallback if claimed without specific ticket record or in client-managed session

  const currentStage = room.winningStages?.[session.stageIndex];
  let prize = currentStage && currentStage.prize > 0 ? currentStage.prize : room.prize;
  if (!prize || prize <= 0) {
    const stageCount = room.winningStages?.length || 1;
    prize = Math.max(25, Math.round((room.prize || 100) / stageCount));
  }

  const claim: BingoClaim = {
    id: `CLM-${Math.floor(100000 + Math.random() * 900000)}`,
    roomId: req.params.roomId,
    ticketId: ticketId || "DEFAULT",
    playerName: targetPlayerName,
    pattern: patternToTest,
    status: isValid ? "approved" : "rejected",
    prize: isValid ? prize : 0,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    cells: calledBalls.length > 0 ? calledBalls : session.called,
  };

  store.claims.unshift(claim);
  let awardedWallet = store.wallet;

  if (isValid) {
    session.winnerNames = [targetPlayerName];
    session.winnerPrize = prize;
    session.winnerPattern = patternToTest;
    session.lastWinner = `${targetPlayerName} · $${prize}`;

    // Credit player wallet
    if (winnerPlayer) {
      winnerPlayer.balance = Math.round((winnerPlayer.balance + prize) * 100) / 100;
      winnerPlayer.wins = (winnerPlayer.wins ?? 0) + 1;
      winnerPlayer.totalPrizes = Math.round(((winnerPlayer.totalPrizes ?? 0) + prize) * 100) / 100;
      awardedWallet = winnerPlayer.balance;
      if (winnerPlayer.username.toLowerCase() === (store.activeUsername || "Ari.R").toLowerCase()) {
        store.wallet = winnerPlayer.balance;
      }
    } else {
      store.wallet = Math.round((store.wallet + prize) * 100) / 100;
      awardedWallet = store.wallet;
    }

    store.addTransaction({
      player: targetPlayerName,
      room: room.name,
      type: "Prize payout",
      amount: prize,
      status: "Completed",
    });

    store.addAudit(
      "claim",
      "Bingo claim validated",
      `${room.name} · ${targetPlayerName} won $${prize} on ${patternToTest}`
    );

    // If more stages exist and continueAfterWin is true
    if (room.winningStages && session.stageIndex < room.winningStages.length - 1 && currentStage?.continueAfterWin) {
      session.stageIndex += 1;
      session.phase = "live";
    } else {
      session.phase = "winner";
    }

    syncBus.emitChange(
      "game",
      "claim",
      { claim, state: session },
      req.params.roomId,
      `🎉 BINGO! ${targetPlayerName} won $${prize.toFixed(2)} with ${patternToTest}!`
    );
    syncBus.emitChange("wallet", "win", { wallet: awardedWallet, balance: awardedWallet, prize, player: targetPlayerName });
    if (winnerPlayer) {
      syncBus.emitChange("players", "update", { player: winnerPlayer, user: winnerPlayer, username: winnerPlayer.username });
    }
  } else {
    store.addAudit("alert", "Claim rejected", `${room.name} · Invalid pattern claimed by ${targetPlayerName}`);
  }

  store.save();

  res.json({
    success: isValid,
    claim,
    state: session,
    wallet: awardedWallet,
    message: isValid
      ? `🎉 BINGO! Validated ${patternToTest}! Won $${prize.toFixed(2)}!`
      : "Claim rejected: Pattern conditions not yet satisfied.",
  });
});

// POST /api/game/:roomId/declare-winner - Operator manual winner declaration
gameRouter.post("/:roomId/declare-winner", (req: Request, res: Response) => {
  const { player = "LuckyStar", prize = 400, pattern = "One Line" } = req.body;
  const numPrize = Number(prize);
  const session = getOrCreateSession(req.params.roomId);
  const room = store.rooms.find((r) => r.id === req.params.roomId);

  session.winnerNames = [player];
  session.winnerPrize = numPrize;
  session.winnerPattern = pattern;
  session.phase = "winner";
  session.lastWinner = `${player} · $${prize}`;

  let awardedWallet = store.wallet;
  const winnerPlayer = store.players.find(
    (p) => p.username.toLowerCase() === player.toLowerCase() || p.id.toLowerCase() === player.toLowerCase()
  );
  if (winnerPlayer) {
    winnerPlayer.balance = Math.round((winnerPlayer.balance + numPrize) * 100) / 100;
    winnerPlayer.wins = (winnerPlayer.wins ?? 0) + 1;
    winnerPlayer.totalPrizes = Math.round(((winnerPlayer.totalPrizes ?? 0) + numPrize) * 100) / 100;
    awardedWallet = winnerPlayer.balance;
    if (winnerPlayer.username.toLowerCase() === (store.activeUsername || "Ari.R").toLowerCase()) {
      store.wallet = winnerPlayer.balance;
    }
  } else {
    store.wallet = Math.round((store.wallet + numPrize) * 100) / 100;
    awardedWallet = store.wallet;
  }

  store.addTransaction({
    player,
    room: room?.name ?? req.params.roomId,
    type: "Prize payout",
    amount: numPrize,
    status: "Completed",
  });

  store.addAudit("claim", "Operator declared winner", `${player} awarded $${prize} in ${room?.name ?? req.params.roomId}`);
  store.save();

  syncBus.emitChange(
    "game",
    "declare-winner",
    { state: session, player, prize: numPrize, pattern },
    req.params.roomId,
    `Operator declared ${player} the winner with prize $${numPrize.toFixed(2)}!`
  );
  syncBus.emitChange("wallet", "payout", { wallet: awardedWallet, balance: awardedWallet, prize: numPrize, player });
  if (winnerPlayer) {
    syncBus.emitChange("players", "update", { player: winnerPlayer, user: winnerPlayer, username: winnerPlayer.username });
  }

  res.json({
    success: true,
    state: session,
    wallet: awardedWallet,
    message: `Winner ${player} declared manually with prize $${prize}.`,
  });
});

// GET /api/game/:roomId/claims - List claims for room
gameRouter.get("/:roomId/claims", (req: Request, res: Response) => {
  const claims = store.claims.filter((c) => c.roomId === req.params.roomId);
  res.json({ success: true, claims });
});

// POST /api/game/:roomId/claims/:claimId/review - Admin approve or reject claim
gameRouter.post("/:roomId/claims/:claimId/review", (req: Request, res: Response) => {
  const { action } = req.body; // "approve" or "reject"
  const claim = store.claims.find((c) => c.id === req.params.claimId);
  if (!claim) {
    res.status(404).json({ success: false, error: "Claim not found" });
    return;
  }

  claim.status = action === "approve" ? "approved" : "rejected";
  let awardedWallet = store.wallet;

  if (action === "approve" && claim.prize > 0) {
    const winnerPlayer = store.players.find(
      (p) => p.username.toLowerCase() === claim.playerName.toLowerCase() || p.id.toLowerCase() === claim.playerName.toLowerCase()
    );
    if (winnerPlayer) {
      winnerPlayer.balance = Math.round((winnerPlayer.balance + claim.prize) * 100) / 100;
      winnerPlayer.wins = (winnerPlayer.wins ?? 0) + 1;
      winnerPlayer.totalPrizes = Math.round(((winnerPlayer.totalPrizes ?? 0) + claim.prize) * 100) / 100;
      awardedWallet = winnerPlayer.balance;
      if (winnerPlayer.username.toLowerCase() === (store.activeUsername || "Ari.R").toLowerCase()) {
        store.wallet = winnerPlayer.balance;
      }
    } else {
      store.wallet = Math.round((store.wallet + claim.prize) * 100) / 100;
      awardedWallet = store.wallet;
    }
  }

  store.addAudit(
    action === "approve" ? "claim" : "alert",
    `Claim ${action}d`,
    `${claim.playerName} · ${claim.pattern} in ${req.params.roomId}`
  );
  store.save();

  syncBus.emitChange(
    "game",
    "review-claim",
    { claim, action },
    req.params.roomId,
    `Claim ${action}d for ${claim.playerName}.`
  );
  if (action === "approve" && claim.prize > 0) {
    syncBus.emitChange("wallet", "claim-approved", { wallet: awardedWallet, balance: awardedWallet, prize: claim.prize, player: claim.playerName });
    const winnerPlayer = store.players.find(
      (p) => p.username.toLowerCase() === claim.playerName.toLowerCase() || p.id.toLowerCase() === claim.playerName.toLowerCase()
    );
    if (winnerPlayer) {
      syncBus.emitChange("players", "update", { player: winnerPlayer, user: winnerPlayer, username: winnerPlayer.username });
    }
  }

  res.json({ success: true, claim, wallet: awardedWallet });
});
