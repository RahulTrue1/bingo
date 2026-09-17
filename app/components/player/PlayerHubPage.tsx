import type { BingoRoomData } from "../../bingo-core";
import { JackpotExperience } from "./JackpotExperience";
import { PlayerProfile } from "./PlayerProfile";
import { PlayerTicketsView } from "./PlayerTicketsView";
import { PromotionExperience } from "./PromotionExperience";

export function PlayerHubPage({
  type,
  rooms,
  enterRoom,
  notify,
}: {
  type: "tickets" | "jackpots" | "promotions" | "profile";
  rooms: BingoRoomData[];
  enterRoom: (room: BingoRoomData) => void;
  notify: (message: string) => void;
}) {
  if (type === "profile") return <PlayerProfile />;
  if (type === "tickets") return <PlayerTicketsView rooms={rooms} enterRoom={enterRoom} />;
  if (type === "jackpots") return <JackpotExperience rooms={rooms} enterRoom={enterRoom} notify={notify} />;
  return <PromotionExperience rooms={rooms} enterRoom={enterRoom} notify={notify} />;
}
