import { Metadata } from "next";
import { Suspense } from "react";
import PokerApp from "./PokerApp";

export const metadata: Metadata = {
  title: "TIG Poker — Multi-Variant Platform & Backoffice",
  description:
    "Interactive online poker platform powered by TRUEiGTECH, featuring No-Limit Hold'em, Omaha, Short Deck, Fast-Fold Blitz, Tournaments, and Operator Backoffice.",
};

export default function PokerPage() {
  return (
    <Suspense fallback={<div className="poker-app" style={{ minHeight: "100vh", background: "#0c0920" }} />}>
      <PokerApp />
    </Suspense>
  );
}

