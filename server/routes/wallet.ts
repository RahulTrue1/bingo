import express, { type Request, type Response } from "express";
import { store } from "../db/store.ts";
import { syncBus } from "../services/sync-bus.ts";

export const walletRouter = express.Router();

// GET /api/wallet - Get wallet balance and overview
walletRouter.get("/", (req: Request, res: Response) => {
  const purchases = store.transactions.filter((t) => t.type === "Ticket purchase");
  const payouts = store.transactions.filter((t) => t.type === "Prize payout");

  const totalSpent = purchases.reduce((acc, t) => acc + Math.abs(t.amount), 0);
  const totalWon = payouts.reduce((acc, t) => acc + t.amount, 0);

  res.json({
    success: true,
    balance: store.wallet,
    currency: "USD",
    totalSpent: Math.round(totalSpent * 100) / 100,
    totalWon: Math.round(totalWon * 100) / 100,
    transactionCount: store.transactions.length,
  });
});

// POST /api/wallet/deposit - Deposit funds
walletRouter.post("/deposit", (req: Request, res: Response) => {
  const { amount = 50 } = req.body;
  const num = Number(amount);

  if (isNaN(num) || num <= 0) {
    res.status(400).json({ success: false, error: "Invalid deposit amount" });
    return;
  }

  store.wallet += num;

  const tx = store.addTransaction({
    player: "Ari.R",
    room: "Cashier",
    type: "Deposit",
    amount: num,
    status: "Completed",
  });

  store.addAudit("player", "Wallet deposit", `+$${num.toFixed(2)} deposited by Ari.R`);

  syncBus.emitChange("wallet", "deposit", { balance: store.wallet, transaction: tx });

  res.json({
    success: true,
    balance: store.wallet,
    transaction: tx,
    message: `Deposited $${num.toFixed(2)} to wallet successfully.`,
  });
});

// POST /api/wallet/withdraw - Request withdrawal
walletRouter.post("/withdraw", (req: Request, res: Response) => {
  const { amount = 50 } = req.body;
  const num = Number(amount);

  if (isNaN(num) || num <= 0) {
    res.status(400).json({ success: false, error: "Invalid withdrawal amount" });
    return;
  }

  if (store.wallet < num) {
    res.status(400).json({
      success: false,
      error: `Insufficient balance. Available: $${store.wallet.toFixed(2)}`,
    });
    return;
  }

  store.wallet -= num;

  const tx = store.addTransaction({
    player: "Ari.R",
    room: "Cashier",
    type: "Withdrawal",
    amount: -num,
    status: "Completed",
  });

  store.addAudit("player", "Wallet withdrawal", `-$${num.toFixed(2)} withdrawn by Ari.R`);

  syncBus.emitChange("wallet", "withdraw", { balance: store.wallet, transaction: tx });

  res.json({
    success: true,
    balance: store.wallet,
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
