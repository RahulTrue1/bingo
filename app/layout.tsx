import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    metadataBase: new URL(origin),
    title: "Trueigtech Bingo — Multi-Game Platform & Backoffice",
    description: "An interactive multiplayer Bingo platform demo with live number calling, progressive jackpots, tournaments, cards, claims, and a complete operator backoffice.",
    openGraph: {
      title: "Trueigtech Bingo — Every game. One powerful platform.",
      description: "Live multiplayer Bingo, rapid rounds, progressive jackpots and complete operator control.",
      type: "website",
      images: [{ url: `${origin}/og.png`, width: 1672, height: 941, alt: "Trueigtech Multi-Bingo Platform" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Trueigtech Bingo — Every game. One powerful platform.",
      description: "A complete live Bingo platform and backoffice proof of concept.",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
