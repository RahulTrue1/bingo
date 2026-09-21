import express, { type Request, type Response } from "express";
import { store } from "../db/store.ts";
import { syncBus } from "../services/sync-bus.ts";
import type { PlayerProfile } from "../types.ts";

export const authRouter = express.Router();

// GET /api/auth/users - List available accounts for switching
authRouter.get("/users", (_req: Request, res: Response) => {
  res.json({
    success: true,
    users: store.players.map((p) => ({
      id: p.id,
      username: p.username,
      displayName: p.displayName || p.username,
      tier: p.tier,
      balance: p.balance,
      status: p.status,
      lastLogin: p.lastLogin,
      password: p.password || "demo123",
    })),
    activeUsername: store.activeUsername || "Ari.R",
  });
});

function sanitizePlayer(player: PlayerProfile) {
  const { password, ...safe } = player;
  return safe;
}

// GET /api/auth/me - Get current logged-in user profile
authRouter.get("/me", (req: Request, res: Response) => {
  const resolved = store.resolveUser(req);
  let player = resolved;

  if (!player) {
    const queryUsername = (req.query.username as string) || (req.query.player as string);
    if (queryUsername) {
      player = store.players.find(
        (p) => p.username.toLowerCase() === queryUsername.toLowerCase() || p.id.toLowerCase() === queryUsername.toLowerCase()
      );
    }
  }

  if (!player) {
    player = store.players.find((p) => p.username.toLowerCase() === (store.activeUsername || "Ari.R").toLowerCase()) || store.players[0] || {
      id: "USR-11804",
      username: "Ari.R",
      displayName: "Ari Rivera",
      tier: "Standard",
      balance: store.wallet,
      gamesPlayed: 128,
      cardsPurchased: 346,
      wins: 18,
      totalPrizes: 2840,
      restrictions: [],
      lastLogin: "Today",
      status: "Active",
    };
  }

  res.json({
    success: true,
    user: sanitizePlayer(player),
    wallet: player.balance,
  });
});

// POST /api/auth/login - Log in with existing account
authRouter.post("/login", (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || typeof username !== "string" || !username.trim()) {
    res.status(400).json({ success: false, error: "Username is required" });
    return;
  }

  const cleanUsername = username.trim();
  let player = store.players.find(
    (p) => p.username.toLowerCase() === cleanUsername.toLowerCase() || p.id.toLowerCase() === cleanUsername.toLowerCase()
  );

  if (!player) {
    res.status(404).json({ success: false, error: `Account "${cleanUsername}" not found. Please sign up.` });
    return;
  }

  if (player.status === "Suspended") {
    res.status(403).json({ success: false, error: "Account is suspended. Please contact support." });
    return;
  }

  // Password verification
  const expectedPassword = player.password || "demo123";
  const isDemoPlayer = !player.password || player.password === "demo123" || ["TrueigQueen", "MikaK", "Ari.R", "RiskyB"].includes(player.username);
  if (password !== undefined && password !== null && password !== "") {
    if (password !== expectedPassword && password !== "demo123") {
      res.status(401).json({ success: false, error: "Incorrect password. Please try again." });
      return;
    }
  } else if (!isDemoPlayer) {
    res.status(401).json({ success: false, error: "Password is required to sign in." });
    return;
  }

  player.lastLogin = "Just now";
  const session = store.createSession(player.username, player.id);
  store.activeUsername = player.username;
  store.wallet = player.balance;
  store.save();

  syncBus.emitChange("auth", "login", { user: sanitizePlayer(player), player: player.username, token: session.token });
  syncBus.emitChange("wallet", "sync", { balance: player.balance, player: player.username });

  res.json({
    success: true,
    token: session.token,
    user: sanitizePlayer(player),
    wallet: player.balance,
    message: `Welcome back, ${player.displayName || player.username}!`,
  });
});

// POST /api/auth/signup - Create new dynamic player account
authRouter.post("/signup", (req: Request, res: Response) => {
  const { username, email, displayName, bonus = 100, password } = req.body;

  if (!username || typeof username !== "string" || username.trim().length < 2) {
    res.status(400).json({ success: false, error: "Username must be at least 2 characters long." });
    return;
  }

  const cleanUsername = username.trim();
  const existing = store.players.find(
    (p) => p.username.toLowerCase() === cleanUsername.toLowerCase()
  );

  if (existing) {
    res.status(409).json({ success: false, error: `Username "${cleanUsername}" is already taken.` });
    return;
  }

  const cleanPassword = typeof password === "string" ? password.trim() : "";
  if (cleanPassword && cleanPassword.length < 3) {
    res.status(400).json({ success: false, error: "Password must be at least 3 characters long." });
    return;
  }

  const bonusAmount = Math.max(0, Number(bonus) || 100);
  const newPlayer: PlayerProfile = {
    id: `USR-${Math.floor(10000 + Math.random() * 90000)}`,
    username: cleanUsername,
    password: cleanPassword || "demo123",
    displayName: displayName?.trim() || cleanUsername,
    email: email?.trim() || `${cleanUsername.toLowerCase()}@player.trueigtech.com`,
    joinedDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    tier: "Standard",
    balance: bonusAmount,
    gamesPlayed: 0,
    cardsPurchased: 0,
    wins: 0,
    totalPrizes: 0,
    restrictions: [],
    lastLogin: "Just now",
    status: "Active",
  };

  const session = store.createSession(newPlayer.username, newPlayer.id);
  store.players.push(newPlayer);
  store.activeUsername = newPlayer.username;
  store.wallet = newPlayer.balance;

  if (bonusAmount > 0) {
    store.addTransaction({
      player: newPlayer.username,
      room: "Cashier",
      type: "Promotional credit",
      amount: bonusAmount,
      status: "Completed",
    });
  }

  store.addAudit("player", "Player registered", `New player ${newPlayer.username} signed up (ID: ${newPlayer.id}, Bonus: $${bonusAmount})`);
  store.save();

  syncBus.emitChange("players", "signup", sanitizePlayer(newPlayer), newPlayer.id, `New player ${newPlayer.username} registered!`);
  syncBus.emitChange("wallet", "sync", { balance: newPlayer.balance, player: newPlayer.username });

  res.status(201).json({
    success: true,
    token: session.token,
    user: sanitizePlayer(newPlayer),
    wallet: newPlayer.balance,
    message: `Account created for ${newPlayer.username}! Welcome bonus: $${bonusAmount.toFixed(2)}.`,
  });
});

// POST /api/auth/logout - Invalidate session token
authRouter.post("/logout", (req: Request, res: Response) => {
  const token = (req.headers["x-session-token"] || req.body?.token) as string | undefined;
  if (token) {
    store.deleteSession(token);
  }
  res.json({ success: true, message: "Logged out successfully" });
});
