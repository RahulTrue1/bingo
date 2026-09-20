import express, { type Request, type Response } from "express";
import { store } from "../db/store.ts";
import { syncBus } from "../services/sync-bus.ts";

export const walletRouter = express.Router();

// GET /api/wallet - Get wallet balance and overview
walletRouter.get("/", (req: Request, res: Response) => {
  const resolved = store.resolveUser(req);
  const currentUsername = (req.query.username as string) || (req.query.player as string) || resolved?.username || store.activeUsername || "Ari.R";
  const player = resolved || store.players.find((p) => p.username.toLowerCase() === currentUsername.toLowerCase() || p.id.toLowerCase() === currentUsername.toLowerCase());
  const balance = player ? player.balance : store.wallet;

  const purchases = store.transactions.filter((t) => t.type === "Ticket purchase" && (!t.player || t.player.toLowerCase() === currentUsername.toLowerCase()));
  const payouts = store.transactions.filter((t) => t.type === "Prize payout" && (!t.player || t.player.toLowerCase() === currentUsername.toLowerCase()));

  const totalSpent = purchases.reduce((acc, t) => acc + Math.abs(t.amount), 0);
  const totalWon = payouts.reduce((acc, t) => acc + t.amount, 0);

  res.json({
    success: true,
    balance,
    player: currentUsername,
    currency: "USD",
    totalSpent: Math.round(totalSpent * 100) / 100,
    totalWon: Math.round(totalWon * 100) / 100,
    transactionCount: store.transactions.length,
  });
});

// POST /api/wallet/deposit - Deposit funds
walletRouter.post("/deposit", (req: Request, res: Response) => {
  const { amount = 50, username } = req.body;
  const num = Number(amount);

  if (isNaN(num) || num <= 0) {
    res.status(400).json({ success: false, error: "Invalid deposit amount" });
    return;
  }

  const resolved = store.resolveUser(req);
  const currentUsername = username || (req.headers["x-player-username"] as string) || resolved?.username || store.activeUsername || "Ari.R";
  const player = resolved || store.players.find((p) => p.username.toLowerCase() === currentUsername.toLowerCase() || p.id.toLowerCase() === currentUsername.toLowerCase());

  let updatedBalance: number;
  if (player) {
    player.balance = Math.round((player.balance + num) * 100) / 100;
    updatedBalance = player.balance;
    if (player.username.toLowerCase() === (store.activeUsername || "Ari.R").toLowerCase()) {
      store.wallet = player.balance;
    }
  } else {
    store.wallet = Math.round((store.wallet + num) * 100) / 100;
    updatedBalance = store.wallet;
  }

  const tx = store.addTransaction({
    player: currentUsername,
    room: "Cashier",
    type: "Deposit",
    amount: num,
    status: "Completed",
  });

  store.addAudit("player", "Wallet deposit", `+$${num.toFixed(2)} deposited by ${currentUsername}`);
  store.save();

  syncBus.emitChange("wallet", "deposit", { balance: updatedBalance, transaction: tx, player: currentUsername });

  res.json({
    success: true,
    balance: updatedBalance,
    transaction: tx,
    message: `Deposited $${num.toFixed(2)} to wallet successfully.`,
  });
});

// POST /api/wallet/withdraw - Request withdrawal
walletRouter.post("/withdraw", (req: Request, res: Response) => {
  const { amount = 50, username } = req.body;
  const num = Number(amount);

  if (isNaN(num) || num <= 0) {
    res.status(400).json({ success: false, error: "Invalid withdrawal amount" });
    return;
  }

  const resolved = store.resolveUser(req);
  const currentUsername = username || (req.headers["x-player-username"] as string) || resolved?.username || store.activeUsername || "Ari.R";
  const player = resolved || store.players.find((p) => p.username.toLowerCase() === currentUsername.toLowerCase() || p.id.toLowerCase() === currentUsername.toLowerCase());
  const balance = player ? player.balance : store.wallet;

  if (balance < num) {
    res.status(400).json({
      success: false,
      error: `Insufficient balance. Available: $${balance.toFixed(2)}`,
    });
    return;
  }

  let updatedBalance: number;
  if (player) {
    player.balance = Math.round((player.balance - num) * 100) / 100;
    updatedBalance = player.balance;
    if (player.username.toLowerCase() === (store.activeUsername || "Ari.R").toLowerCase()) {
      store.wallet = player.balance;
    }
  } else {
    store.wallet = Math.round((store.wallet - num) * 100) / 100;
    updatedBalance = store.wallet;
  }

  const tx = store.addTransaction({
    player: currentUsername,
    room: "Cashier",
    type: "Withdrawal",
    amount: -num,
    status: "Completed",
  });

  store.addAudit("player", "Wallet withdrawal", `-$${num.toFixed(2)} withdrawn by ${currentUsername}`);
  store.save();

  syncBus.emitChange("wallet", "withdraw", { balance: updatedBalance, transaction: tx, player: currentUsername });

  res.json({
    success: true,
    balance: updatedBalance,
    transaction: tx,
    message: `Withdrew $${num.toFixed(2)} from wallet successfully.`,
  });
});

// GET /api/wallet/transactions - List transactions
walletRouter.get("/transactions", (req: Request, res: Response) => {
  const { type, limit } = req.query;
  let txs = store.transactions;

  if (type && typeof type === "string" && type !== "All types") {
    txs = txs.filter((t) => t.type.toLowerCase().includes(type.toLowerCase()));
  }

  const max = limit ? Number(limit) : 50;
  res.json({
    success: true,
    count: txs.length,
    transactions: txs.slice(0, max),
  });
});
