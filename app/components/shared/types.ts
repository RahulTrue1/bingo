import type { BingoRoomData } from "../../bingo-core";

export type AppMode = "player" | "admin";
export type PlayerView = "lobby" | "room" | "tickets" | "jackpots" | "tournaments" | "promotions" | "history" | "profile";
export type GamePhase = "selling" | "countdown" | "live" | "review" | "winner" | "results";
export type PromotionCategory = "All offers" | "Free cards" | "Ticket deals" | "VIP" | "Tournaments";

export interface AdminAction {
  kind: string;
  room?: BingoRoomData;
  label?: string;
}

export const money = (value: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value < 10 ? 2 : 0,
  }).format(value);
