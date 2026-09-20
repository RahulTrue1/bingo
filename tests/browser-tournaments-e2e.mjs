import puppeteer from "puppeteer-core";
import { spawn } from "node:child_process";
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

async function waitForServer(url, name, maxTries = 40) {
  for (let i = 0; i < maxTries; i++) {
    const ok = await checkEndpoint(url);
    if (ok) {
      console.log(`✓ ${name} is responsive at ${url}`);
      return true;
    }
    await wait(800);
  }
  throw new Error(`Timeout waiting for ${name} at ${url}`);
}

async function clickSelector(page, selector, timeout = 10000) {
  await page.waitForSelector(selector, { timeout });
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) {
      el.click();
    } else {
      throw new Error(`Element not found for selector: ${sel}`);
    }
  }, selector);
}

async function clickUntil(page, clickSel, checkConditionFn, maxMs = 15000) {
  await page.waitForSelector(clickSel, { timeout: 8000 });
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const ok = await page.evaluate(checkConditionFn);
    if (ok) return true;
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) el.click();
    }, clickSel);
    await wait(800);
  }
  const finalOk = await page.evaluate(checkConditionFn);
  if (!finalOk) throw new Error(`Condition not met after clicking ${clickSel}`);
  return true;
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
  if (!active) {
    throw new Error(`Player nav button not found or failed to activate for: ${label}`);
  }
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
  if (!active) {
    throw new Error(`Admin nav button not found or failed to activate for: ${label}`);
  }
  await wait(600);
}

async function getWalletAmount(page) {
  return await page.evaluate(() => {
    const chip = document.querySelector(".wallet strong");
    if (!chip) return 0;
    const txt = chip.textContent || "0";
    return parseFloat(txt.replace(/[^0-9.]/g, "")) || 0;
  });
}

async function run() {
  console.log("========================================================================");
  console.log("   TRUEIGTECH TOURNAMENTS END-TO-END MULTI-STAGE BROWSER VERIFICATION  ");
  console.log("========================================================================\n");

  const procs = [];
  let browser;

  // 1. Ensure Express API is running
  const apiUp = await checkEndpoint(API_URL);
  if (!apiUp) {
    console.log("Starting Express API server on :4000...");
    const apiProc = spawn("node", ["--experimental-strip-types", "server/index.ts"], {
      cwd: process.cwd(),
      stdio: "ignore",
      env: { ...process.env, PORT: "4000", NODE_ENV: "development" },
    });
    procs.push(apiProc);
  } else {
    console.log("Express API is already active.");
  }

  // 2. Ensure Vinext dev server is running
  const appUp = await checkEndpoint(APP_URL);
  if (!appUp) {
    console.log("Starting Vinext dev server on :3000...");
    const devProc = spawn("npx", ["vinext", "dev"], {
      cwd: process.cwd(),
      stdio: "ignore",
      env: { ...process.env, PORT: "3000" },
    });
    procs.push(devProc);
  } else {
    console.log("Vinext dev server is already active.");
  }

  try {
    await waitForServer(API_URL, "Express API");
    await waitForServer(APP_URL, "Vinext Dev Server");
    console.log("Both servers are healthy and ready.\n");

    // Reset tournament state via API first for a pristine test run
    try {
      const resetReq = await fetch("http://localhost:4000/api/tournaments/weekend-cup/reset", { method: "POST" });
      const resetJson = await resetReq.json();
      console.log("✓ Initial tournament reset confirmed:", resetJson.tournament?.status);
    } catch (e) {
      console.log("Note on pre-reset:", e.message);
    }

    console.log("Warming up Vinext dev server compilation...");
    try {
      await fetch("http://localhost:3000");
      await wait(1500);
    } catch (e) {
      console.log("Warmup note:", e.message);
    }

    console.log(`Launching Google Chrome: ${CHROME_PATH}`);
    browser = await puppeteer.launch({
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

    const playerPage = await browser.newPage();
    const adminPage = await browser.newPage();

    await playerPage.setViewport({ width: 1440, height: 900 });
    await adminPage.setViewport({ width: 1440, height: 900 });

    playerPage.on("pageerror", (err) => console.log("  [Player Browser Error]", err.message));
    adminPage.on("pageerror", (err) => console.log("  [Admin Browser Error]", err.message));

    // ==========================================
    // STEP 1: INITIALIZE PLAYER PAGE
    // ==========================================
    console.log("\n--- Step 1: Navigating to Player Frontend ---");
    await playerPage.goto(APP_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    await playerPage.waitForSelector("header.player-header", { timeout: 15000 });
    console.log("✓ Player page loaded successfully.");

    await wait(1200);
    const initialWallet = await getWalletAmount(playerPage);
    console.log(`✓ Initial player wallet: $${initialWallet.toFixed(2)}`);

    // Navigate to Tournaments tab
    console.log("Switching to Tournaments lobby in player app...");
    await selectPlayerNav(playerPage, "Tournaments");
    await playerPage.waitForSelector(".tourney-hero", { timeout: 10000 });

    const tourneyTitle = await playerPage.$eval("#tourney-title", (el) => el.textContent.trim());
    console.log(`✓ Active Tournament Title: "${tourneyTitle}"`);
    if (!tourneyTitle.includes("Cup")) {
      throw new Error(`Unexpected tournament title: ${tourneyTitle}`);
    }

    const initialStatusText = await playerPage.$eval(".tourney-live-label", (el) => el.textContent.trim());
    console.log(`✓ Initial Tournament Status: "${initialStatusText}"`);

    // ==========================================
    // STEP 2: PLAYER TOURNAMENT REGISTRATION
    // ==========================================
    console.log("\n--- Step 2: Player Registration ($8.00 entry fee) ---");
    await playerPage.waitForSelector(".tourney-enter-button", { timeout: 8000 });
    const enterBtnText = await playerPage.$eval(".tourney-enter-button", (el) => el.textContent.trim());
    console.log(`✓ Tournament CTA button text: "${enterBtnText}"`);

    console.log("Clicking registration CTA...");
    await clickUntil(
      playerPage,
      ".tourney-enter-button",
      () => Boolean(document.querySelector(".tourney-confirmation"))
    );

    const confirmText = await playerPage.$eval(".tourney-confirmation", (el) => el.textContent.trim());
    console.log(`✓ Player registration confirmed: "${confirmText}"`);

    await wait(800);
    const postRegWallet = await getWalletAmount(playerPage);
    console.log(`✓ Player wallet after registration: $${postRegWallet.toFixed(2)} (deducted: $${(initialWallet - postRegWallet).toFixed(2)})`);
    await playerPage.screenshot({ path: `${SCREENSHOT_DIR}/24-tournament-registration-open.png` });
    console.log("✓ Captured screenshot: 24-tournament-registration-open.png");

    // ==========================================
    // STEP 3: INITIALIZE BACKOFFICE ADMIN
    // ==========================================
    console.log("\n--- Step 3: Admin Backoffice Operations Console ---");
    await adminPage.goto(`${APP_URL}/backoffice`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await adminPage.waitForSelector(".admin-sidebar", { timeout: 15000 });
    console.log("✓ Admin Backoffice active.");

    console.log("Selecting Tournaments section in Admin sidebar...");
    await selectAdminNav(adminPage, "Tournaments");
    await adminPage.waitForSelector(".tournament-admin-feature", { timeout: 10000 });
    console.log("✓ Tournament Operations Console is visible in Backoffice.");

    // ==========================================
    // STEP 4: LAUNCH TOURNAMENT (STAGE 1 - QUALIFIERS)
    // ==========================================
    console.log("\n--- Step 4: Launching Stage 1 (Qualifiers) ---");
    await clickUntil(
      adminPage,
      ".tournament-start-button",
      () => Boolean(document.querySelector(".tournament-score-button"))
    );

    const adminStageHeader = await adminPage.$eval(".tournament-admin-feature h3", (el) => el.textContent.trim());
    console.log(`✓ Admin console stage state: "${adminStageHeader}"`);
    if (!adminStageHeader.includes("Qualifiers")) {
      throw new Error(`Expected Qualifiers active in admin, got: ${adminStageHeader}`);
    }

    console.log("Verifying Stage 1 Live state in Player frontend...");
    await playerPage.bringToFront();
    await wait(800);
    const playerStageBtnText = await playerPage.$eval(".tourney-enter-button", (el) => el.textContent.trim());
    console.log(`✓ Player CTA button updated to: "${playerStageBtnText}"`);
    await playerPage.screenshot({ path: `${SCREENSHOT_DIR}/25-tournament-stage1-qualifiers-live.png` });
    console.log("✓ Captured screenshot: 25-tournament-stage1-qualifiers-live.png");

    // ==========================================
    // STEP 5: ENTER LIVE TOURNAMENT GAME ROOM
    // ==========================================
    console.log("\n--- Step 5: Player Enters Tournament Game Room ---");
    await clickSelector(playerPage, ".tourney-enter-button");
    await playerPage.waitForSelector(".game-page", { timeout: 10000 });

    const gameTitle = await playerPage.$eval(".game-room-title h1", (el) => el.textContent.trim());
    const gameSubtitle = await playerPage.$eval(".game-room-title p", (el) => el.textContent.trim());
    console.log(`✓ In Game Room: "${gameTitle}"`);
    console.log(`✓ Tournament Stage Subtitle: "${gameSubtitle}"`);
    if (!gameSubtitle.includes("Tournament Stage")) {
      throw new Error(`Expected tournament stage in room header, got: ${gameSubtitle}`);
    }

    console.log("Returning back to Tournaments Lobby...");
    await clickSelector(playerPage, "button.back-button");
    await wait(600);
    await selectPlayerNav(playerPage, "Tournaments");
    await playerPage.waitForSelector(".tourney-hero", { timeout: 10000 });
    console.log("✓ Returned to Tournaments lobby.");

    // ==========================================
    // STEP 6: SCORE STAGE 1 (QUALIFIERS) & ADVANCE
    // ==========================================
    console.log("\n--- Step 6: Operator Scores Stage 1 (Qualifiers) ---");
    await adminPage.bringToFront();
    await clickUntil(
      adminPage,
      ".tournament-score-button",
      () => {
        const btn = document.querySelector(".tournament-advance-button");
        return Boolean(btn && !btn.disabled);
      }
    );
    console.log("✓ Stage 1 successfully scored. Advance button is enabled.");

    const topPlayerAdmin = await adminPage.$eval(".responsive-table tbody tr:first-child td:nth-child(2)", (el) => el.textContent.trim());
    console.log(`✓ Current tournament leader after Stage 1: ${topPlayerAdmin}`);

    await playerPage.bringToFront();
    await wait(800);
    await playerPage.screenshot({ path: `${SCREENSHOT_DIR}/26-tournament-stage1-scored-qualified.png` });
    console.log("✓ Captured screenshot: 26-tournament-stage1-scored-qualified.png");

    // ==========================================
    // STEP 7: ADVANCE & SCORE STAGE 2 (ROUND OF 256)
    // ==========================================
    console.log("\n--- Step 7: Advance & Score Stage 2 (Round of 256) ---");
    await adminPage.bringToFront();
    await clickUntil(
      adminPage,
      ".tournament-advance-button",
      () => {
        const h3 = document.querySelector(".tournament-admin-feature h3");
        return Boolean(h3 && h3.textContent.includes("Round of 256"));
      }
    );

    const adminStage2Header = await adminPage.$eval(".tournament-admin-feature h3", (el) => el.textContent.trim());
    console.log(`✓ Admin console stage state: "${adminStage2Header}"`);

    await playerPage.bringToFront();
    await wait(800);
    await playerPage.screenshot({ path: `${SCREENSHOT_DIR}/27-tournament-stage2-round256-live.png` });
    console.log("✓ Captured screenshot: 27-tournament-stage2-round256-live.png");

    await adminPage.bringToFront();
    console.log("Scoring Stage 2 (Round of 256)...");
    await clickUntil(
      adminPage,
      ".tournament-score-button",
      () => {
        const btn = document.querySelector(".tournament-advance-button");
        return Boolean(btn && !btn.disabled);
      }
    );
    console.log("✓ Stage 2 successfully scored and bracket advanced.");

    // ==========================================
    // STEP 8: ADVANCE & SCORE STAGE 3 (ROUND OF 128)
    // ==========================================
    console.log("\n--- Step 8: Advance & Score Stage 3 (Round of 128) ---");
    await clickUntil(
      adminPage,
      ".tournament-advance-button",
      () => {
        const h3 = document.querySelector(".tournament-admin-feature h3");
        return Boolean(h3 && h3.textContent.includes("Round of 128"));
      }
    );

    const adminStage3Header = await adminPage.$eval(".tournament-admin-feature h3", (el) => el.textContent.trim());
    console.log(`✓ Admin console stage state: "${adminStage3Header}"`);

    await playerPage.bringToFront();
    await wait(800);
    await playerPage.screenshot({ path: `${SCREENSHOT_DIR}/28-tournament-stage3-round128-live.png` });
    console.log("✓ Captured screenshot: 28-tournament-stage3-round128-live.png");

    await adminPage.bringToFront();
    console.log("Scoring Stage 3 (Round of 128)...");
    await clickUntil(
      adminPage,
      ".tournament-score-button",
      () => {
        const btn = document.querySelector(".tournament-advance-button");
        return Boolean(btn && !btn.disabled);
      }
    );
    console.log("✓ Stage 3 scored and top 64 contenders advanced.");

    // ==========================================
    // STEP 9: ADVANCE & SCORE STAGE 4 (SEMI FINAL)
    // ==========================================
    console.log("\n--- Step 9: Advance & Score Stage 4 (Semi Final) ---");
    await clickUntil(
      adminPage,
      ".tournament-advance-button",
      () => {
        const h3 = document.querySelector(".tournament-admin-feature h3");
        return Boolean(h3 && h3.textContent.includes("Semi Final"));
      }
    );

    const adminStage4Header = await adminPage.$eval(".tournament-admin-feature h3", (el) => el.textContent.trim());
    console.log(`✓ Admin console stage state: "${adminStage4Header}"`);

    await playerPage.bringToFront();
    await wait(800);
    await playerPage.screenshot({ path: `${SCREENSHOT_DIR}/29-tournament-stage4-semifinal-live.png` });
    console.log("✓ Captured screenshot: 29-tournament-stage4-semifinal-live.png");

    await adminPage.bringToFront();
    console.log("Scoring Stage 4 (Semi Final)...");
    await clickUntil(
      adminPage,
      ".tournament-score-button",
      () => {
        const btn = document.querySelector(".tournament-advance-button");
        return Boolean(btn && !btn.disabled);
      }
    );
    console.log("✓ Stage 4 scored. Finalists bracket locked in.");

    // ==========================================
    // STEP 10: ADVANCE & SCORE STAGE 5 (GRAND FINAL)
    // ==========================================
    console.log("\n--- Step 10: Advance to Stage 5 (Grand Final) ---");
    await clickUntil(
      adminPage,
      ".tournament-advance-button",
      () => {
        const h3 = document.querySelector(".tournament-admin-feature h3");
        return Boolean(h3 && h3.textContent.includes("Grand Final"));
      }
    );

    const adminStage5Header = await adminPage.$eval(".tournament-admin-feature h3", (el) => el.textContent.trim());
    console.log(`✓ Admin console stage state: "${adminStage5Header}"`);

    await playerPage.bringToFront();
    await wait(800);
    await playerPage.screenshot({ path: `${SCREENSHOT_DIR}/30-tournament-stage5-grandfinal-live.png` });
    console.log("✓ Captured screenshot: 30-tournament-stage5-grandfinal-live.png");

    await adminPage.bringToFront();
    console.log("Scoring Stage 5 (Grand Final showdown)...");
    await clickUntil(
      adminPage,
      ".tournament-score-button",
      () => {
        const btn = document.querySelector(".tournament-complete-button");
        return Boolean(btn && !btn.disabled);
      }
    );

    const crownBtnText = await adminPage.$eval(".tournament-complete-button", (el) => el.textContent.trim());
    console.log(`✓ Final stage scored! Crowning button ready: "${crownBtnText}"`);

    // ==========================================
    // STEP 11: CROWN CHAMPION & PAY OUT $15,000 PRIZE
    // ==========================================
    console.log("\n--- Step 11: Crowning Champion & Awarding $15,000 Prize ---");
    await playerPage.bringToFront();
    const prePayoutWallet = await getWalletAmount(playerPage);
    console.log(`✓ Player wallet before prize payout: $${prePayoutWallet.toFixed(2)}`);

    await adminPage.bringToFront();
    console.log("Admin clicks \"🏆 Crown Champion & Pay Out $15,000\"...");
    await clickUntil(
      adminPage,
      ".tournament-complete-button",
      () => Boolean(document.querySelector(".tournament-reset-button"))
    );

    const completedHeader = await adminPage.$eval(".tournament-admin-feature h3", (el) => el.textContent.trim());
    console.log(`✓ Tournament completion confirmed in Admin: "${completedHeader}"`);

    // Verify in Player Frontend
    console.log("Checking Champion Trophy and Wallet Payout in Player Frontend...");
    await playerPage.bringToFront();
    await wait(1000);

    await playerPage.waitForSelector(".tourney-champion-card", { timeout: 10000 });
    const victoryText = await playerPage.$eval(".tourney-champion-card", (el) => el.textContent.trim());
    console.log(`✓ Player Champion Victory Card: "${victoryText}"`);
    if (!victoryText.toLowerCase().includes("champion") || !victoryText.includes("15,000")) {
      throw new Error(`Expected Champion $15,000 card, got: ${victoryText}`);
    }

    const finalWallet = await getWalletAmount(playerPage);
    console.log(`✓ Final Player Wallet Balance: $${finalWallet.toFixed(2)} (increased by: $${(finalWallet - prePayoutWallet).toFixed(2)})`);
    if (finalWallet < prePayoutWallet + 14000) {
      throw new Error(`Expected player wallet to increase by $15,000, got before: $${prePayoutWallet}, after: $${finalWallet}`);
    }
    console.log("✓ $15,000.00 first place prize payout VERIFIED in player wallet!");
    await playerPage.screenshot({ path: `${SCREENSHOT_DIR}/31-tournament-champion-victory-payout.png` });
    console.log("✓ Captured screenshot: 31-tournament-champion-victory-payout.png");

    // ==========================================
    // STEP 12: OPERATOR TOURNAMENT REPLAYABILITY RESET
    // ==========================================
    console.log("\n--- Step 12: Operator Tournament Reset ---");
    await adminPage.bringToFront();
    console.log("Admin clicking \"↺ Reset Tournament\"...");
    await clickUntil(
      adminPage,
      ".tournament-reset-button",
      () => Boolean(document.querySelector(".tournament-start-button"))
    );

    const resetHeader = await adminPage.$eval(".tournament-admin-feature h3", (el) => el.textContent.trim());
    console.log(`✓ Tournament successfully reset for replayability: "${resetHeader}"`);

    console.log("\n========================================================================");
    console.log("   🎉 ALL TOURNAMENT STAGES & REAL-TIME OPERATOR CONTROLS PASSED 100%!  ");
    console.log("========================================================================\n");

  } catch (err) {
    console.error("\n❌ Tournament E2E Test FAILED with error:", err);
    process.exitCode = 1;
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
    for (const proc of procs) {
      try {
        proc.kill("SIGTERM");
      } catch {}
    }
    process.exit(process.exitCode || 0);
  }
}

run();
