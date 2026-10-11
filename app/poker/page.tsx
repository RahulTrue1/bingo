import { redirect } from "next/navigation";

export const metadata = {
  title: "Redirecting to Cash Game — BET888CASH Poker Live",
};

export default function PokerRedirectPage() {
  redirect("/cashgame");
}

