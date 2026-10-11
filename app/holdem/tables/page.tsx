import { Metadata } from "next";
import { Suspense } from "react";
import BasepokerHoldemTablesView from "./BasepokerHoldemTablesView";

export const metadata: Metadata = {
  title: "Hold'em Tables Live — Basepoker BET888",
  description:
    "Live No-Limit Texas Hold'em multi-table gameplay. Direct stadium oval table with dealer, turn countdown timers, chips, and 3 commission models.",
};

export default function HoldemTablesPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            width: "100vw",
            height: "100vh",
            background: "#040814",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#38bdf8",
            fontSize: "16px",
            fontWeight: 800,
          }}
        >
          ♠ Opening Hold&apos;em Table...
        </div>
      }
    >
      <BasepokerHoldemTablesView />
    </Suspense>
  );
}
