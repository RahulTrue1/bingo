import express, { type Request, type Response } from "express";
import { store } from "../db/store.ts";
import type { SavedPattern } from "../types.ts";

export const patternsRouter = express.Router();

// GET /api/patterns - List saved patterns
patternsRouter.get("/", (_req: Request, res: Response) => {
  res.json({
    success: true,
    patterns: store.patterns,
  });
});

// POST /api/patterns - Save custom pattern
patternsRouter.post("/", (req: Request, res: Response) => {
  const { name, cells, layout = "5 × 5", allowRotations = true, allowMirroring = true } = req.body;
  if (!name || !cells || !Array.isArray(cells)) {
    res.status(400).json({ success: false, error: "Pattern name and cells array are required" });
    return;
  }

  const existingIndex = store.patterns.findIndex((p) => p.name.toLowerCase() === name.toLowerCase());
  const pattern: SavedPattern = {
    name,
    cells,
    layout,
    allowRotations: Boolean(allowRotations),
    allowMirroring: Boolean(allowMirroring),
  };

  if (existingIndex >= 0) {
    store.patterns[existingIndex] = pattern;
  } else {
    store.patterns.unshift(pattern);
  }

  store.addAudit("alert", "Pattern saved", `${name} (${cells.length} cells)`);
  store.save();

  res.status(201).json({
    success: true,
    pattern,
    message: `Pattern ${name} saved successfully with ${cells.length} cells.`,
  });
});
