import express, { type Request, type Response } from "express";
import { store } from "../db/store.ts";

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

  res.json({
    success: true,
    count: result.length,
    players: result,
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
  if (action === "Add Bonus Card") {
    store.addAudit("player", "Bonus card granted", `Bonus card added to ${player.username}`);
  }

  store.save();

  res.json({
    success: true,
    player,
    message: `Action '${action}' applied to ${player.username}.`,
  });
});

// GET /api/admin/live-control - Live games for live control deck
adminRouter.get("/live-control", (_req: Request, res: Response) => {
  const liveGames = [
    { id: "TRUEIG-2842", name: "Diamond 75", controller: "Nora Tran", state: "live", ball: 28, players: 300, cardsSold: 934, revenue: "$1,868", prize: "$2,000", stage: "One Line" },
    { id: "TRUEIG-3011", name: "Turbo 30", controller: "Evan Wu", state: "paused", ball: 11, players: 184, cardsSold: 412, revenue: "$680", prize: "$300", stage: "Final Line" },
    { id: "TRUEIG-3197", name: "Quick 80", controller: "Mika K", state: "live", ball: 52, players: 136, cardsSold: 310, revenue: "$750", prize: "$750", stage: "Four Corners" },
  ];

  res.json({
    success: true,
    liveGames,
  });
});
