import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { adminRouter } from "./routes/admin.ts";
import { chatRouter } from "./routes/chat.ts";
import { gameRouter } from "./routes/game.ts";
import { jackpotsRouter } from "./routes/jackpots.ts";
import { patternsRouter } from "./routes/patterns.ts";
import { promotionsRouter } from "./routes/promotions.ts";
import { roomsRouter } from "./routes/rooms.ts";
import { ticketsRouter } from "./routes/tickets.ts";
import { tournamentsRouter } from "./routes/tournaments.ts";
import { walletRouter } from "./routes/wallet.ts";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV !== "test") {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  }
  next();
});

// Health check endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "trueigtech-bingo-api",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Mount domain API routes
app.use("/api/rooms", roomsRouter);
app.use("/api/game", gameRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/wallet", walletRouter);
app.use("/api/jackpots", jackpotsRouter);
app.use("/api/tournaments", tournamentsRouter);
app.use("/api/promotions", promotionsRouter);
app.use("/api/chat", chatRouter);
app.use("/api/patterns", patternsRouter);
app.use("/api/admin", adminRouter);

// 404 handler for unmatched routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: "API endpoint not found",
  });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  void _next;
  console.error("Unhandled API error:", err);
  res.status(500).json({
    success: false,
    error: err.message || "Internal server error",
  });
});

// Start listening if not running in test mode
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`🚀 Trueigtech Bingo Express API running on http://localhost:${PORT}`);
  });
}

export default app;
