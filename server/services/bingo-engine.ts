import type { BingoCardCell } from "../types.ts";

function seededRandom(seed: number): () => number {
  let state = (Math.abs(Math.trunc(seed)) * 2654435761) % 4294967296 || 1;
  return () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
}

export class BingoEngine {
  static getBallCount(variant: string): number {
    if (variant.includes("90")) return 90;
    if (variant.includes("30")) return 30;
    if (variant.includes("80")) return 80;
    return 75;
  }

  static label(value: number): string {
    const letter =
      value <= 15 ? "B" : value <= 30 ? "I" : value <= 45 ? "N" : value <= 60 ? "G" : "O";
    return `${letter}-${value}`;
  }

  static nextNumber(called: number[], ballCount = 75): number | null {
    const remaining = Array.from({ length: ballCount }, (_, index) => index + 1).filter(
      (n) => !called.includes(n)
    );
    if (!remaining.length) return null;
    return remaining[Math.floor(Math.random() * remaining.length)];
  }

  static make75Card(seed = 1): BingoCardCell[] {
    const offsets = [1, 16, 31, 46, 61];
    const letters = ["B", "I", "N", "G", "O"];
    const card: BingoCardCell[] = [];
    for (let row = 0; row < 5; row += 1) {
      for (let column = 0; column < 5; column += 1) {
        if (row === 2 && column === 2) {
          card.push({ value: "FREE", column: "N" });
        } else {
          const value = offsets[column] + ((row * 7 + seed * 3 + column * 5) % 15);
          card.push({ value, column: letters[column] });
        }
      }
    }
    return card;
  }

  static makeGridCard(rows: number, columns: number, ballCount: number, seed = 1): BingoCardCell[] {
    const total = Math.min(rows * columns, ballCount);
    const pool = Array.from({ length: ballCount }, (_, index) => index + 1);
    const random = seededRandom(seed);
    for (let index = pool.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(random() * (index + 1));
      [pool[index], pool[swap]] = [pool[swap], pool[index]];
    }
    return pool.slice(0, total).map((value, index) => ({
      value,
      column: String(index % columns),
    }));
  }

  static make90Ticket(seed = 1): BingoCardCell[] {
    const rowColumns = [
      [0, 2, 4, 6, 8],
      [1, 2, 3, 5, 7],
      [0, 1, 4, 6, 8],
    ];
    const cells: BingoCardCell[] = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 9; c++) {
        if (rowColumns[r].includes(c)) {
          const min = c === 0 ? 1 : c * 10;
          const max = c === 8 ? 90 : c * 10 + 9;
          const val = min + ((seed * 7 + r * 5 + c * 3) % (max - min + 1));
          cells.push({ value: val, column: String(c) });
        } else {
          cells.push({ value: "FREE", column: String(c) });
        }
      }
    }
    return cells;
  }

  static generateCardForVariant(variant: string, seed: number): BingoCardCell[] {
    if (variant.includes("90")) {
      return this.make90Ticket(seed);
    }
    if (variant.includes("30")) {
      return this.makeGridCard(3, 3, 30, seed);
    }
    if (variant.includes("80")) {
      return this.makeGridCard(4, 4, 80, seed);
    }
    return this.make75Card(seed);
  }
}

export class PatternValidator {
  static isCellMarked(cell: BingoCardCell, called: number[]): boolean {
    if (cell.value === "FREE") return true;
    return called.includes(cell.value as number);
  }

  static checkPattern(card: BingoCardCell[], called: number[], patternName: string): boolean {
    const isMarked = (index: number) =>
      index >= 0 && index < card.length && PatternValidator.isCellMarked(card[index], called);

    const norm = patternName.toLowerCase();

    // 5x5 Grid Checks (75-ball standard)
    if (card.length === 25) {
      if (norm.includes("four corner")) {
        return [0, 4, 20, 24].every(isMarked);
      }
      if (norm.includes("diamond")) {
        return [2, 6, 8, 10, 14, 16, 18, 22].every(isMarked);
      }
      if (norm.includes("x shape") || norm.includes("x pattern")) {
        return [0, 4, 6, 8, 12, 16, 18, 20, 24].every(isMarked);
      }
      if (norm.includes("full house") || norm.includes("blackout") || norm.includes("coverall")) {
        return card.every((cell) => PatternValidator.isCellMarked(cell, called));
      }
      if (norm.includes("one line") || norm.includes("single line") || norm.includes("line")) {
        // Any row
        for (let r = 0; r < 5; r++) {
          if ([0, 1, 2, 3, 4].every((col) => isMarked(r * 5 + col))) return true;
        }
        // Any column
        for (let c = 0; c < 5; c++) {
          if ([0, 1, 2, 3, 4].every((row) => isMarked(row * 5 + c))) return true;
        }
        // Diagonals
        if ([0, 6, 12, 18, 24].every(isMarked)) return true;
        if ([4, 8, 12, 16, 20].every(isMarked)) return true;
      }
      if (norm.includes("two line")) {
        let linesCount = 0;
        for (let r = 0; r < 5; r++) {
          if ([0, 1, 2, 3, 4].every((col) => isMarked(r * 5 + col))) linesCount++;
        }
        return linesCount >= 2;
      }
    }

    // 3x3 Grid Checks (30-ball speed)
    if (card.length === 9) {
      if (norm.includes("coverall") || norm.includes("full house") || norm.includes("speed")) {
        return card.every((cell) => PatternValidator.isCellMarked(cell, called));
      }
      for (let r = 0; r < 3; r++) {
        if ([0, 1, 2].every((col) => isMarked(r * 3 + col))) return true;
      }
    }

    // 4x4 Grid Checks (80-ball)
    if (card.length === 16) {
      if (norm.includes("four corner")) {
        return [0, 3, 12, 15].every(isMarked);
      }
      if (norm.includes("full house") || norm.includes("blackout")) {
        return card.every((cell) => PatternValidator.isCellMarked(cell, called));
      }
      for (let r = 0; r < 4; r++) {
        if ([0, 1, 2, 3].every((col) => isMarked(r * 4 + col))) return true;
      }
    }

    // 3x9 Ticket Checks (90-ball)
    if (card.length === 27) {
      if (norm.includes("one line") || norm.includes("1 line")) {
        for (let r = 0; r < 3; r++) {
          const rowIndices = Array.from({ length: 9 }, (_, c) => r * 9 + c);
          if (rowIndices.filter((idx) => card[idx].value !== "FREE").every(isMarked)) {
            return true;
          }
        }
      }
      if (norm.includes("two line") || norm.includes("2 line")) {
        let completedRows = 0;
        for (let r = 0; r < 3; r++) {
          const rowIndices = Array.from({ length: 9 }, (_, c) => r * 9 + c);
          if (rowIndices.filter((idx) => card[idx].value !== "FREE").every(isMarked)) {
            completedRows++;
          }
        }
        return completedRows >= 2;
      }
      if (norm.includes("full house")) {
        return card.filter((c) => c.value !== "FREE").every((cell) => called.includes(cell.value as number));
      }
    }

    // Default fallback: check completion percentage >= 90% or all marked
    const markedCount = card.filter((cell) => PatternValidator.isCellMarked(cell, called)).length;
    return (markedCount / card.length) >= 0.8;
  }

  static completion(card: BingoCardCell[], called: number[]): number {
    if (!card.length) return 0;
    const marked = card.filter((cell) => PatternValidator.isCellMarked(cell, called)).length;
    return Math.round((marked / card.length) * 100);
  }
}

export class RTPEngine {
  static calculateDynamicPrize(
    cardsSold: number,
    ticketPrice: number,
    targetRtp = 80,
    jackpotPercent = 2.5
  ): number {
    const grossRevenue = cardsSold * ticketPrice;
    if (grossRevenue <= 0) return 0;
    const effectiveRtp = Math.max(10, Math.min(99, targetRtp - jackpotPercent));
    return Math.round(grossRevenue * (effectiveRtp / 100) * 100) / 100;
  }

  static calculateHouseMargin(targetRtp: number, jackpotPercent = 2.5): number {
    return Math.max(0, Math.round((100 - targetRtp - jackpotPercent) * 10) / 10);
  }
}
