export function patternCells(name: string, rows: number, columns: number, ballCount: number): number[] {
  if (ballCount === 90) return name.includes("Two") ? Array.from({ length: 18 }, (_, index) => index) : name.includes("Full") ? Array.from({ length: 27 }, (_, index) => index) : Array.from({ length: 9 }, (_, index) => index);
  if (ballCount === 30 || name.includes("Full") || name.includes("Blackout")) return Array.from({ length: rows * columns }, (_, index) => index);
  if (name.includes("Four")) return [0, columns - 1, (rows - 1) * columns, rows * columns - 1];
  if (name.includes("Diamond")) return rows === 5 ? [2, 6, 8, 10, 12, 14, 16, 18, 22] : [1, 4, 7, 10, 13];
  if (name.includes("X")) return Array.from({ length: rows }, (_, index) => [index * columns + index, index * columns + (columns - 1 - index)]).flat();
  if (name.includes("Cross")) return Array.from({ length: rows }, (_, index) => [Math.floor(rows / 2) * columns + index, index * columns + Math.floor(columns / 2)]).flat();
  if (name.includes("Two")) return Array.from({ length: columns * 2 }, (_, index) => index);
  return Array.from({ length: columns }, (_, index) => index);
}
