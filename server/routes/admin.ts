import express, { type Request, type Response } from "express";
import { store } from "../db/store.ts";
import { syncBus } from "../services/sync-bus.ts";

export const adminRouter = express.Router();

// GET /api/admin/dashboard - High-level metrics, revenue trend, live ops, top rooms, activity feed
adminRouter.get("/dashboard", (_req: Request, res: Response) => {
  const activeRooms = store.rooms.filter((r) => r.status === "Live" || r.status === "Starting Soon" || r.status === "Open").length;
  const totalPlayers = store.rooms.reduce((acc, r) => acc + r.players, 0) + 1200; // includes lobby visitors
  const ticketRevenue = store.transactions
    .filter((t) => t.type === "Ticket purchase")
    .reduce((acc, t) => acc + Math.abs(t.amount), 0) + 48620; // baseline today
  const prizePayouts = store.transactions
    .filter((t) => t.type === "Prize payout")
    .reduce((acc, t) => acc + t.amount, 0) + 31840;
  const jackpotLiability = store.jackpots.reduce((acc, j) => acc + j.currentAmount, 0);
  const ggrToday = ticketRevenue - prizePayouts;

  const metrics = [
    { label: "ACTIVE ROOMS", value: String(activeRooms), change: "+2", icon: "▦", description: "Rooms currently open, selling tickets or calling a live game." },
    { label: "ONLINE PLAYERS", value: totalPlayers.toLocaleString(), change: "+12.4%", icon: "♙", description: "Unique players connected to the platform within the last five minutes." },
    { label: "TICKET REVENUE", value: `$${Math.round(ticketRevenue).toLocaleString()}`, change: "+8.2%", icon: "$", description: "Gross ticket sales collected today before prizes, credits and jackpot contributions." },
    { label: "PRIZE PAYOUT", value: `$${Math.round(prizePayouts).toLocaleString()}`, change: `${Math.round((prizePayouts / ticketRevenue) * 1000) / 10}%`, icon: "◇", description: "Prizes paid or committed today. The percentage compares payouts with ticket revenue." },
    { label: "JACKPOT LIABILITY", value: `$${Math.round(jackpotLiability).toLocaleString()}`, change: "+$842", icon: "✦", description: "Total prize value reserved across every active progressive jackpot." },
    { label: "GGR TODAY", value: `$${Math.round(ggrToday).toLocaleString()}`, change: "+11.6%", icon: "↗", description: "Gross gaming revenue after prizes, bonuses and jackpot contributions are deducted." },
  ];

  const liveOps = [
    { name: "Diamond 75", ball: "B-12", players: "286", progress: "28/75", prize: "$2,000" },
    { name: "Turbo 30", ball: "24", players: "84", progress: "11/30", prize: "$300" },
    { name: "Quick 80", ball: "52", players: "136", progress: "42/80", prize: "$750" },
  ];

  const topRooms = [
    { name: "Mega Trueig Jackpot", games: "22", tickets: "8,420", revenue: "$42,100", ggr: "$12,840", trend: "+18%" },
    { name: "Diamond 75", games: "34", tickets: "6,812", revenue: "$13,624", ggr: "$4,218", trend: "+9%" },
    { name: "Trueig 90 Classic", games: "48", tickets: "18,240", revenue: "$9,120", ggr: "$2,680", trend: "+12%" },
    { name: "Turbo 30", games: "96", tickets: "8,450", revenue: "$8,450", ggr: "$2,210", trend: "−3%" },
  ];

  res.json({
    success: true,
    metrics,
    liveOps,
    topRooms,
    activityFeed: store.auditFeed.slice(0, 10),
  });
});

// GET /api/admin/players - List players and their telemetry
adminRouter.get("/players", (req: Request, res: Response) => {
  const { search, status } = req.query;
  let result = store.players;

  if (search && typeof search === "string") {
    const q = search.toLowerCase();
    result = result.filter((p) => p.username.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
  }

  if (status && typeof status === "string" && status !== "All account statuses") {
    result = result.filter((p) => p.status.toLowerCase() === status.toLowerCase());
  }

  const mapped = result.map((p) => ({
    ...p,
    password: p.password || "demo123",
    balance: p.username === "Ari.R" ? store.wallet : p.balance,
    cardsPurchased: p.username === "Ari.R" ? Math.max(p.cardsPurchased || 0, store.tickets.length) : p.cardsPurchased,
    totalEntry: (p as unknown as { totalEntry?: number }).totalEntry ?? Math.round((p.cardsPurchased || 0) * 1.5),
    winnings: (p as unknown as { winnings?: number }).winnings ?? p.totalPrizes ?? 0,
  }));

  res.json({
    success: true,
    count: mapped.length,
    players: mapped,
  });
});

// GET /api/admin/players/:id - Get detailed profile with credentials
adminRouter.get("/players/:id", (req: Request, res: Response) => {
  const target = req.params.id.toLowerCase();
  const p = store.players.find((item) => item.id.toLowerCase() === target || item.username.toLowerCase() === target);
  if (!p) {
    res.status(404).json({ success: false, error: "Player not found" });
    return;
  }
  res.json({
    success: true,
    player: {
      ...p,
      password: p.password || "demo123",
      balance: p.username === "Ari.R" ? store.wallet : p.balance,
      cardsPurchased: p.username === "Ari.R" ? Math.max(p.cardsPurchased || 0, store.tickets.length) : p.cardsPurchased,
      totalEntry: (p as unknown as { totalEntry?: number }).totalEntry ?? Math.round((p.cardsPurchased || 0) * 1.5),
      winnings: (p as unknown as { winnings?: number }).winnings ?? p.totalPrizes ?? 0,
    },
  });
});

// POST /api/admin/players/:id/action - Apply restriction or bonus
adminRouter.post("/players/:id/action", (req: Request, res: Response) => {
  const { action } = req.body;
  const player = store.players.find((p) => p.id === req.params.id || p.username === req.params.id);

  if (!player) {
    res.status(404).json({ success: false, error: "Player not found" });
    return;
  }

  if (action === "Suspend") player.status = "Suspended";
  if (action === "Block") player.status = "Restricted";
  if (action === "Activate" || action === "Unblock" || action === "Activate / Unblock") player.status = "Active";
  if (action === "Add Bonus Card") {
    store.addAudit("player", "Bonus card granted", `Bonus card added to ${player.username}`);
  }

  store.save();

  syncBus.emitChange("players", "action", { player, action }, undefined, `Action '${action}' applied to ${player.username}.`);

  res.json({
    success: true,
    player: {
      ...player,
      password: player.password || "demo123",
      balance: player.username === "Ari.R" ? store.wallet : player.balance,
      cardsPurchased: player.username === "Ari.R" ? Math.max(player.cardsPurchased || 0, store.tickets.length) : player.cardsPurchased,
      totalEntry: (player as unknown as { totalEntry?: number }).totalEntry ?? Math.round((player.cardsPurchased || 0) * 1.5),
      winnings: (player as unknown as { winnings?: number }).winnings ?? player.totalPrizes ?? 0,
    },
    message: `Action '${action}' applied to ${player.username}.`,
  });
});

// POST /api/admin/players/:id/add-funds - Admin credits or adjusts player balance
adminRouter.post("/players/:id/add-funds", (req: Request, res: Response) => {
  const { amount, reason = "Admin deposit" } = req.body;
  const num = Number(amount);

  if (isNaN(num) || num <= 0) {
    res.status(400).json({ success: false, error: "Valid positive amount is required" });
    return;
  }

  const player = store.players.find((p) => p.id === req.params.id || p.username.toLowerCase() === req.params.id.toLowerCase());
  if (!player) {
    res.status(404).json({ success: false, error: "Player not found" });
    return;
  }

  player.balance = Math.round((player.balance + num) * 100) / 100;

  // If this player is the active player, sync global wallet
  if (player.username.toLowerCase() === (store.activeUsername || "Ari.R").toLowerCase()) {
    store.wallet = player.balance;
  }

  const tx = store.addTransaction({
    player: player.username,
    room: "Backoffice Admin",
    type: "Deposit",
    amount: num,
    status: "Completed",
  });

  store.addAudit("player", "Admin wallet credit", `Operator added +$${num.toFixed(2)} to ${player.username} (${reason})`);
  store.save();

  syncBus.emitChange("wallet", "admin-deposit", {
    player: player.username,
    amount: num,
    balance: player.balance,
    transaction: tx,
  }, undefined, `+$${num.toFixed(2)} added to wallet by Admin`);

  syncBus.emitChange("players", "update", player, player.id, `+$${num.toFixed(2)} credited to ${player.username}`);

  res.json({
    success: true,
    player: {
      ...player,
      password: player.password || "demo123",
      balance: player.username === "Ari.R" ? store.wallet : player.balance,
      cardsPurchased: player.username === "Ari.R" ? Math.max(player.cardsPurchased || 0, store.tickets.length) : player.cardsPurchased,
      totalEntry: (player as unknown as { totalEntry?: number }).totalEntry ?? Math.round((player.cardsPurchased || 0) * 1.5),
      winnings: (player as unknown as { winnings?: number }).winnings ?? player.totalPrizes ?? 0,
    },
    wallet: player.balance,
    amount: num,
    transaction: tx,
    message: `Successfully added $${num.toFixed(2)} to ${player.username}'s wallet. New balance: $${player.balance.toFixed(2)}.`,
  });
});

// GET /api/admin/live-control - Live games for live control deck
adminRouter.get("/live-control", (_req: Request, res: Response) => {
  const controllers = ["Nora Tran", "Evan Wu", "Mika K", "Alex Rivera", "Sam Chen"];
  const liveGames = store.rooms.map((room, idx) => {
    const session = store.gameSessions[room.id];
    const ball = session?.current ?? (session?.called && session.called.length > 0 ? session.called[session.called.length - 1] : (idx === 0 ? 28 : idx === 1 ? 11 : 52));
    const isPaused = session?.paused ?? (idx === 1);
    const state = isPaused ? "paused" : (room.status.toLowerCase() === "live" ? "live" : "live");
    const stage = room.winningStages?.[session?.stageIndex ?? 0]?.name || room.pattern;
    return {
      id: `TRUEIG-${2842 + idx * 169}`,
      roomId: room.id,
      name: room.name,
      controller: controllers[idx % controllers.length],
      state,
      ball: ball ?? 1,
      players: room.players || 100,
      cardsSold: room.cardsSold || 250,
      revenue: `$${Math.round((room.cardsSold || 250) * room.ticketPrice).toLocaleString()}`,
      prize: `$${room.prize.toLocaleString()}`,
      stage,
    };
  });

  res.json({
    success: true,
    liveGames,
  });
});

