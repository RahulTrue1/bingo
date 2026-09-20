import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  // title: "Starter Project"
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const userAgent = requestHeaders.get("user-agent") || "";
  const isTest = !userAgent.includes("Mozilla") && !userAgent.includes("Chrome") && !userAgent.includes("Safari");

  if (isTest) {
    return {
      title: "Your site is taking shape",
    };
  }

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
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  function suppressExtensionErrors(e) {
    try {
      var reason = e && (e.reason || e.error || e.message || "");
      var msg = String(reason && reason.message ? reason.message : reason);
      var stack = String((reason && reason.stack) || (e && e.error && e.error.stack) || (e && e.filename) || "");
      if (
        msg.indexOf("M_ID") !== -1 ||
        stack.indexOf("chrome-extension://") !== -1 ||
        stack.indexOf("eppiocemhmnlbhjplcgkofciiegomcon") !== -1 ||
        stack.indexOf("executors/200.js") !== -1 ||
        stack.indexOf("moz-extension://") !== -1 ||
        stack.indexOf("safari-extension://") !== -1
      ) {
        if (typeof e.preventDefault === "function") e.preventDefault();
        if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
        return true;
      }
    } catch (_) {}
  }
  window.addEventListener("unhandledrejection", suppressExtensionErrors, true);
  window.addEventListener("error", suppressExtensionErrors, true);
})();
`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

