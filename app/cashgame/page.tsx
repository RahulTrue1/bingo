import { Metadata } from "next";
import { Suspense } from "react";
import BasepokerCashgameLobby from "./BasepokerCashgameLobby";

export const metadata: Metadata = {
  title: "Cash Game — Texas Hold'em Live | Basepoker BET888",
  description:
    "Play No-Limit Texas Hold'em cash games against real players. Group and Table views, full blinds breakdown, and private friends tables.",
};

export default function CashgamePage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            background: "#070d18",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#38bdf8",
            fontSize: "16px",
            fontWeight: 800,
          }}
        >
          ♠ Loading Basepoker Cash Games...
        </div>
      }
    >
      <BasepokerCashgameLobby />
    </Suspense>
  );
}
