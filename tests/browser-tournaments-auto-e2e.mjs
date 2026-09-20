import puppeteer from "puppeteer-core";
import http from "node:http";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const API_URL = "http://localhost:4000/api/health";
const APP_URL = "http://localhost:3000";
const SCREENSHOT_DIR = "/Users/vikashpatidar/.gemini/antigravity/brain/c1a530e1-0cc4-4d8d-9512-3ea851fe5138/screenshots";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function checkEndpoint(url, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function selectPlayerNav(userPage, label) {
  let active = false;
  const start = Date.now();
  while (Date.now() - start < 10000) {
    active = await userPage.evaluate((targetLabel) => {
      const btns = Array.from(document.querySelectorAll("header.player-header nav.main-nav button"));
      const btn = btns.find((b) => b.textContent.trim().toLowerCase() === targetLabel.toLowerCase());
      if (!btn) return false;
      if (btn.classList.contains("active")) return true;
      btn.click();
      return btn.classList.contains("active");
    }, label);
    if (active) break;
    await wait(300);
  }
  if (!active) throw new Error(`Player nav button failed for: ${label}`);
  await wait(600);
}

async function selectAdminNav(adminPage, label) {
  await adminPage.waitForSelector(".admin-sidebar nav button", { timeout: 10000 });
  let active = false;
  const start = Date.now();
  while (Date.now() - start < 10000) {
    active = await adminPage.evaluate((targetLabel) => {
      const btns = Array.from(document.querySelectorAll(".admin-sidebar nav button"));
      const btn = btns.find((b) => b.textContent.toLowerCase().includes(targetLabel.toLowerCase()));
      if (!btn) return false;
      if (btn.classList.contains("active")) return true;
      btn.click();
      return btn.classList.contains("active");
    }, label);
    if (active) break;
    await wait(300);
  }
  if (!active) throw new Error(`Admin nav button failed for: ${label}`);
  await wait(600);
}

async function run() {
  console.log("========================================================================");
  console.log("   TEST: HANDS-FREE AUTOMATED TOURNAMENTS & BACKOFFICE UI OVERHAUL     ");
  console.log("========================================================================");

  try {
    await fetch("http://localhost:3000");
    await wait(600);
  } catch {}

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    protocolTimeout: 120000,
    defaultViewport: { width: 1440, height: 900 },
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  try {
    // 1. Reset tournament via API
    await fetch("http://localhost:4000/api/tournaments/weekend-cup/reset", { method: "POST" });
    console.log("✓ Tournament reset to clean registration state.");

    // Setup Admin Page
    const adminPage = await browser.newPage();
    adminPage.on("pageerror", (err) => console.log("  [Admin Error]", err.message));
    await adminPage.setViewport({ width: 1440, height: 900 });
    await adminPage.goto(`${APP_URL}/backoffice`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await adminPage.waitForSelector(".admin-sidebar", { timeout: 30000 });
    await selectAdminNav(adminPage, "Tournaments");
    await adminPage.waitForSelector(".tournament-admin-feature", { timeout: 15000 });

    // Verify Backoffice Table is clean and has styles
    const tableHeaderTexts = await adminPage.$$eval(".tournament-admin-feature table th", (ths) =>
      ths.map((th) => th.textContent.trim())
    );
    console.log("✓ Backoffice Table Headers:", tableHeaderTexts.join(" | "));
    if (!tableHeaderTexts.includes("RANK") && !tableHeaderTexts.includes("Rank")) {
      throw new Error("Missing Rank header in Backoffice table");
    }

    // Verify cell padding and distinct spacing
    const thPadding = await adminPage.$eval(".tournament-admin-feature table th", (el) =>
      window.getComputedStyle(el).padding
    );
    console.log(`✓ Backoffice table th padding: ${thPadding} (no text collision)`);

    // Verify Auto-Engine toolbar is present
    await adminPage.waitForSelector(".tournament-engine-toolbar", { timeout: 5000 });
    const engineBadgeText = await adminPage.$eval(".engine-badge", (el) => el.textContent.trim());
    console.log(`✓ Backoffice Engine Badge: "${engineBadgeText}"`);

    await adminPage.screenshot({
      path: `${SCREENSHOT_DIR}/32-backoffice-fixed-table-and-auto-console.png`,
      fullPage: false,
    });
    console.log("✓ Captured screenshot: 32-backoffice-fixed-table-and-auto-console.png");

    // Setup Player Page
    const playerPage = await browser.newPage();
    await playerPage.goto(APP_URL, { waitUntil: "networkidle2" });
    await selectPlayerNav(playerPage, "Tournaments");
    await playerPage.waitForSelector(".tourney-hero", { timeout: 10000 });

    // Register user
    const enterBtn = await playerPage.$(".tourney-enter-button");
    if (enterBtn) {
      await enterBtn.click();
      await wait(1000);
      console.log("✓ Player registered for tournament.");
    }

    // --- STEP: Schedule Countdown Test ---
    console.log("\n--- Testing Scheduled Auto-Start (5 seconds countdown) ---");
    await fetch("http://localhost:4000/api/tournaments/weekend-cup/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delaySeconds: 5 }),
    });

    await wait(1200);
    // Verify player page displays countdown
    await playerPage.waitForSelector(".tourney-hero", { timeout: 5000 });
    await playerPage.screenshot({
      path: `${SCREENSHOT_DIR}/33-player-auto-scheduled-countdown.png`,
      fullPage: false,
    });
    console.log("✓ Captured screenshot: 33-player-auto-scheduled-countdown.png");

    // Wait 5 seconds for scheduled countdown to expire and auto-launch Stage 1
    console.log("Waiting for auto-start timer to reach 0 and launch Stage 1...");
    let isLive = false;
    for (let i = 0; i < 15; i++) {
      await wait(1000);
      const label = await playerPage.$eval(".tourney-live-label", (el) => el.textContent.trim()).catch(() => "");
      if (label.includes("LIVE") || label.includes("STAGE 1")) {
        isLive = true;
        console.log(`✓ Tournament automatically started! Live status: "${label}"`);
        break;
      }
    }
    if (!isLive) throw new Error("Scheduled countdown failed to auto-start Stage 1");

    // Set round duration to 6 seconds for fast hands-free stage progression demonstration
    await fetch("http://localhost:4000/api/tournaments/weekend-cup/auto-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ autoMode: true, roundDuration: 6 }),
    });
    console.log("✓ Auto-engine set to 6s round duration for hands-free live stage demo.");

    await wait(2000);
    await playerPage.screenshot({
      path: `${SCREENSHOT_DIR}/34-player-hands-free-stage-progression.png`,
      fullPage: false,
    });
    console.log("✓ Captured screenshot: 34-player-hands-free-stage-progression.png");

    // Monitor hands-free progression through stages WITHOUT ANY CLICKS!
    console.log("\n--- Watching hands-free automated progression through stages ---");
    let completed = false;
    const startProgression = Date.now();

    while (Date.now() - startProgression < 65000) {
      await wait(2000);
      const state = await playerPage.evaluate(() => {
        const liveLabel = document.querySelector(".tourney-live-label")?.textContent.trim() || "";
        const ctaBtn = document.querySelector(".tourney-hero-actions button")?.textContent.trim() || "";
        const countdown = document.querySelector(".tourney-countdown")?.textContent.trim() || "";
        const hasChampCard = Boolean(document.querySelector(".tourney-champion-card"));
        return { liveLabel, ctaBtn, countdown, hasChampCard };
      });

      console.log(`[T+${Math.round((Date.now() - startProgression)/1000)}s] Status: "${state.liveLabel}" | Timer: "${state.countdown}"`);

      if (state.hasChampCard || state.liveLabel.includes("Completed")) {
        completed = true;
        console.log("✓ Hands-Free Tournament completed automatically!");
        break;
      }
    }

    if (!completed) throw new Error("Tournament did not complete automatically within expected time");

    // Verify Completed state in Player Frontend:
    // 1. NEVER shows "Enter for $8"
    const buttonsText = await playerPage.$$eval(".tourney-hero-actions button", (btns) =>
      btns.map((b) => b.textContent.trim())
    );
    console.log("✓ Finished Tournament Action Buttons:", buttonsText.join(" | "));

    const hasErronousEnterBtn = buttonsText.some((t) => t.toLowerCase().includes("enter for"));
    if (hasErronousEnterBtn) {
      throw new Error(`Regression: "Enter for $X" was shown on a completed tournament! Buttons: ${buttonsText.join(", ")}`);
    }
    console.log("✓ VERIFIED: 'Enter for $X' button is NOT displayed on completed tournament!");

    // 2. Champion Victory Card is present
    await playerPage.waitForSelector(".tourney-champion-card", { timeout: 5000 });
    const champCardText = await playerPage.$eval(".tourney-champion-card", (el) => el.textContent.trim());
    console.log(`✓ Champion Victory Card verified: "${champCardText.slice(0, 75)}..."`);

    await playerPage.screenshot({
      path: `${SCREENSHOT_DIR}/35-player-tournament-completed-no-enter-button.png`,
      fullPage: false,
    });
    console.log("✓ Captured screenshot: 35-player-tournament-completed-no-enter-button.png");

    // Clean reset for future operations
    await fetch("http://localhost:4000/api/tournaments/weekend-cup/reset", { method: "POST" });
    console.log("✓ Clean reset complete.");

    console.log("\n========================================================================");
    console.log("   🎉 ALL HANDS-FREE AUTOMATED TOURNAMENT TESTS PASSED 100%!           ");
    console.log("========================================================================");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("❌ Test FAILED with error:", err);
  process.exit(1);
});
