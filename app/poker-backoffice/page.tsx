import { Metadata } from "next";
import PokerBackofficeApp from "./PokerBackofficeApp";

export const metadata: Metadata = {
  title: "TIG Poker Backoffice — Operator & Risk Console",
  description:
    "Comprehensive B2B Poker Operator & Risk Management Backoffice. Monitor live ring tables, rake schemes, tournaments, anti-collusion telemetry, KYC/RG limits, and multi-state compliance.",
};

export default function PokerBackofficePage() {
  return <PokerBackofficeApp />;
}
