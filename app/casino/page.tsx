import { Metadata } from "next";
import { Bet888CasinoLobbyWrapper } from "./Bet888CasinoLobbyWrapper";

export const metadata: Metadata = {
  title: "BET888CASH Casino & Poker Live — EGT Digital & Texas Hold'em",
  description:
    "Official BET888CASH Casino Lobby featuring Poker Live Texas Hold'em, EGT Digital, and Pragmatic Play slots. Real-time multiplayer ring tables with invite codes.",
};

export default function CasinoPage() {
  return <Bet888CasinoLobbyWrapper />;
}
