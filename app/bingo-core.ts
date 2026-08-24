export type BingoStatus = "Live" | "Selling Tickets" | "Starting Soon" | "Open" | "Scheduled";

export type BingoRoomData = {
  id: string;
  name: string;
  variant: string;
  status: BingoStatus;
  ticketPrice: number;
  prize: number;
  jackpot?: number;
  players: number;
  maxPlayers: number;
  cardsSold: number;
  startsIn: string;
  pattern: string;
  accent: string;
  featured?: boolean;
  tag: string;
  frequency?: string;
  winningStages?: Array<{ name: string; prize: number; continueAfterWin: boolean }>;
  cardRows?: number;
  cardColumns?: number;
  callDelay?: number;
  vipOnly?: boolean;
  progressiveBallLimit?: number;
};

export const demoRooms: BingoRoomData[] = [
  { id: "trueig-90", name: "Trueig 90 Classic", variant: "90-Ball Classic", status: "Starting Soon", ticketPrice: 0.5, prize: 1500, players: 192, maxPlayers: 300, cardsSold: 682, startsIn: "00:46", pattern: "1 Line → 2 Lines → Full House", accent: "teal", featured: true, tag: "CLASSIC", frequency: "Every 10 min", cardRows: 3, cardColumns: 9, callDelay: 1350, winningStages: [{ name: "One Line", prize: 50, continueAfterWin: true }, { name: "Two Lines", prize: 150, continueAfterWin: true }, { name: "Full House", prize: 500, continueAfterWin: false }] },
  { id: "turbo-30", name: "Turbo 30", variant: "30-Ball Speed", status: "Live", ticketPrice: 1, prize: 300, players: 84, maxPlayers: 150, cardsSold: 256, startsIn: "LIVE · Ball 11", pattern: "3 × 3 Coverall", accent: "coral", featured: true, tag: "SPEED", frequency: "Every 2 min", cardRows: 3, cardColumns: 3, callDelay: 650, winningStages: [{ name: "Speed Full House", prize: 300, continueAfterWin: false }] },
  { id: "diamond-75", name: "Diamond 75", variant: "75-Ball Pattern", status: "Live", ticketPrice: 2, prize: 2000, players: 286, maxPlayers: 400, cardsSold: 934, startsIn: "LIVE · Ball 28", pattern: "Diamond", accent: "violet", featured: true, tag: "PATTERN", frequency: "Every 5 min", cardRows: 5, cardColumns: 5, callDelay: 1200, winningStages: [{ name: "Four Corners", prize: 200, continueAfterWin: true }, { name: "One Line", prize: 400, continueAfterWin: true }, { name: "Diamond", prize: 1400, continueAfterWin: false }] },
  { id: "mega-jackpot", name: "Mega Trueig Jackpot", variant: "75-Ball Progressive", status: "Selling Tickets", ticketPrice: 5, prize: 5000, jackpot: 125480, players: 348, maxPlayers: 500, cardsSold: 1248, startsIn: "02:18", pattern: "Full House ≤ 42 balls", accent: "gold", featured: true, tag: "JACKPOT", frequency: "Every 15 min", cardRows: 5, cardColumns: 5, callDelay: 1050, progressiveBallLimit: 42, winningStages: [{ name: "One Line", prize: 250, continueAfterWin: true }, { name: "Full House", prize: 5000, continueAfterWin: false }] },
  { id: "quick-80", name: "Quick 80", variant: "80-Ball Grid", status: "Selling Tickets", ticketPrice: 1, prize: 750, players: 136, maxPlayers: 250, cardsSold: 504, startsIn: "05:10", pattern: "Single Line → Full House", accent: "pink", tag: "80-BALL", frequency: "Every 8 min", cardRows: 4, cardColumns: 4, callDelay: 950, winningStages: [{ name: "Single Line", prize: 150, continueAfterWin: true }, { name: "Four Corners", prize: 200, continueAfterWin: true }, { name: "Full House", prize: 400, continueAfterWin: false }] },
  { id: "pattern-arena", name: "Trueig Pattern Arena", variant: "75-Ball Pattern Series", status: "Open", ticketPrice: 1.5, prize: 1200, players: 168, maxPlayers: 300, cardsSold: 472, startsIn: "03:24", pattern: "Round 1 · X Pattern", accent: "violet", tag: "5 ROUNDS", frequency: "Every 12 min", cardRows: 5, cardColumns: 5, callDelay: 1100, winningStages: [{ name: "X Pattern", prize: 1200, continueAfterWin: false }] },
  { id: "free-party", name: "Free Bingo Party", variant: "75-Ball Community", status: "Open", ticketPrice: 0, prize: 100, players: 118, maxPlayers: 500, cardsSold: 438, startsIn: "08:32", pattern: "Four Corners", accent: "blue", tag: "FREE", frequency: "Every hour", cardRows: 5, cardColumns: 5, callDelay: 1300, winningStages: [{ name: "Four Corners", prize: 100, continueAfterWin: false }] },
  { id: "midnight-90", name: "Midnight Bingo", variant: "90-Ball After Dark", status: "Scheduled", ticketPrice: 2, prize: 5000, players: 224, maxPlayers: 400, cardsSold: 752, startsIn: "23:00", pattern: "1 Line → 2 Lines → Full House", accent: "blue", tag: "NIGHT", frequency: "Nightly", cardRows: 3, cardColumns: 9, callDelay: 1150, winningStages: [{ name: "One Line", prize: 500, continueAfterWin: true }, { name: "Two Lines", prize: 1000, continueAfterWin: true }, { name: "Full House", prize: 3500, continueAfterWin: false }] },
  { id: "vip-gold", name: "VIP Gold Room", variant: "75-Ball VIP", status: "Scheduled", ticketPrice: 10, prize: 20000, players: 42, maxPlayers: 80, cardsSold: 126, startsIn: "21:00", pattern: "X Pattern → Blackout", accent: "gold", tag: "VIP", frequency: "Daily", cardRows: 5, cardColumns: 5, callDelay: 1450, vipOnly: true, winningStages: [{ name: "X Pattern", prize: 5000, continueAfterWin: true }, { name: "Blackout", prize: 15000, continueAfterWin: false }] },
  { id: "tournament", name: "Trueigtech Weekend Cup", variant: "Tournament · 5 Rounds", status: "Open", ticketPrice: 8, prize: 25000, players: 384, maxPlayers: 512, cardsSold: 768, startsIn: "FRI · 20:00", pattern: "Points Series", accent: "violet", tag: "TOURNAMENT", frequency: "Weekly", cardRows: 5, cardColumns: 5, callDelay: 900 },
];

export type BingoCardCell = { value: number | "FREE"; column: string };

export function make75Card(seed = 1): BingoCardCell[] {
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

export function makeGridCard(rows: number, columns: number, ballCount: number, seed = 1): BingoCardCell[] {
  const total = rows * columns;
  const values = new Set<number>();
  let cursor = seed * 13 + 7;
  while (values.size < total) {
    cursor = (cursor * 17 + 11) % ballCount;
    values.add(cursor + 1);
  }
  return Array.from(values).map((value, index) => ({ value, column: String(index % columns) }));
}

export function make90Ticket(seed = 1): Array<number | null> {
  const ticket: Array<number | null> = Array(27).fill(null);
  const rowColumns = [[0, 2, 4, 6, 8], [1, 2, 3, 5, 7], [0, 1, 4, 6, 8]];
  rowColumns.forEach((columns, row) => columns.forEach((column, slot) => {
    const min = column === 0 ? 1 : column * 10;
    const max = column === 8 ? 90 : column * 10 + 9;
    const value = min + ((seed * 7 + row * 5 + slot * 3) % (max - min + 1));
    ticket[row * 9 + column] = value;
  }));
  return ticket;
}

export class BingoEngine {
  static nextNumber(called: number[], ballCount = 75): number | null {
    const remaining = Array.from({ length: ballCount }, (_, index) => index + 1).filter((n) => !called.includes(n));
    if (!remaining.length) return null;
    return remaining[Math.floor(Math.random() * remaining.length)];
  }

  static label(value: number): string {
    const letter = value <= 15 ? "B" : value <= 30 ? "I" : value <= 45 ? "N" : value <= 60 ? "G" : "O";
    return `${letter}-${value}`;
  }
}

export class PatternValidator {
  static isFourCorners(card: BingoCardCell[], called: number[]): boolean {
    return [0, 4, 20, 24].every((index) => card[index].value === "FREE" || called.includes(card[index].value as number));
  }

  static completion(card: BingoCardCell[], called: number[]): number {
    const marked = card.filter((cell) => cell.value === "FREE" || called.includes(cell.value as number)).length;
    return Math.round((marked / card.length) * 100);
  }
}

export class PrizeEngine {
  static split(amount: number, winners: number): number {
    return Math.round((amount / Math.max(1, winners)) * 100) / 100;
  }
}

export class JackpotEngine {
  static contribution(ticketRevenue: number, percent = 2.5): number {
    return Math.round(ticketRevenue * (percent / 100) * 100) / 100;
  }
}

export class TournamentEngine {
  static points(lineWins: number, patternWins: number, fullHouses: number): number {
    return lineWins * 10 + patternWins * 25 + fullHouses * 50;
  }
}

export class GameScheduler {
  static nextOccurrence(hour: number): string {
    return `${String(hour).padStart(2, "0")}:00`;
  }
}

export class PlayerManager {
  static canBuy(currentCards: number, requested: number, maximum = 8): boolean {
    return currentCards + requested <= maximum;
  }
}

export class TransactionManager {
  static reference(prefix = "TXN"): string {
    return `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
  }
}
