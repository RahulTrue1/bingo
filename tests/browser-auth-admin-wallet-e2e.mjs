import puppeteer from "puppeteer-core";
import { spawn } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const API_URL = "http://localhost:4000/api/health";
const APP_URL = "http://localhost:3000";

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

async function waitForServer(url, name, maxTries = 45) {
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

async function getPlayerWallet(page) {
  return await page.evaluate(() => {
    const chip = document.querySelector(".wallet strong");
    if (!chip) return 0;
    const txt = chip.textContent || "0";
    return parseFloat(txt.replace(/[^0-9.]/g, "")) || 0;
  });
}

async function getPlayerHeaderName(page) {
  return await page.evaluate(() => {
    const el = document.querySelector(".user-auth-button b, .player-user-pill b, .player-profile-btn b");
    return el ? el.textContent.trim() : "";
  });
}

async function run() {
  console.log("========================================================================");
  console.log("   TRUEIGTECH AUTH MODAL & OPERATOR WALLET MANAGEMENT BROWSER E2E TEST  ");
  console.log("========================================================================\n");

  const screenshotDir = path.resolve(process.cwd(), "test-screenshots");
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

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

    console.log("Warming up Vinext dev server...");
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
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // -------------------------------------------------------------------------
    // STAGE 1: PLAYER APP LOAD & AUTH MODAL OPENING
    // -------------------------------------------------------------------------
    console.log("\n--- STAGE 1: PLAYER FRONTEND LOAD & AUTH MODAL ---");
    await page.goto(APP_URL, { waitUntil: "networkidle2", timeout: 60000 });
    await page.waitForSelector("header.player-header", { timeout: 15000 });
    console.log("✓ Player frontend loaded successfully.");

    // Click the Auth button in the header
    const authBtn = await page.waitForSelector(".user-auth-button", { timeout: 8000 });
    await authBtn.click();
    await page.waitForSelector(".auth-modal-card", { timeout: 5000 });
    console.log("✓ Auth modal popped up successfully.");

    await page.screenshot({ path: path.join(screenshotDir, "01-auth-modal-open.png") });

    // -------------------------------------------------------------------------
    // STAGE 2: SIGN UP A DYNAMIC USER (NovaPlayer) WITH $100 WELCOME BONUS
    // -------------------------------------------------------------------------
    console.log("\n--- STAGE 2: CREATE DYNAMIC ACCOUNT ---");
    // Click "Sign Up" tab
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll(".auth-modal-tabs button, .auth-tab-btn"));
      const signupTab = tabs.find((t) => t.textContent.includes("Sign Up") || t.textContent.includes("Create"));
      if (signupTab) signupTab.click();
    });
    await wait(500);

    const testUser = `NovaPlayer_${Math.floor(1000 + Math.random() * 9000)}`;
    const testEmail = `${testUser.toLowerCase()}@trueigtech.com`;

    // Type username and email
    await page.waitForSelector('form.auth-form input[type="text"]', { timeout: 5000 });
    await page.type('form.auth-form input[type="text"]', testUser);
    const emailInput = await page.$('form.auth-form input[type="email"]');
    if (emailInput) {
      await emailInput.type(testEmail);
    }

    // Select $100 Welcome Bonus
    await page.evaluate(() => {
      const bonusBtns = Array.from(document.querySelectorAll(".bonus-options button, .bonus-option-pill"));
      const b100 = bonusBtns.find((b) => b.textContent.includes("100"));
      if (b100) b100.click();
    });
    await wait(300);

    await page.screenshot({ path: path.join(screenshotDir, "02-auth-signup-filled.png") });

    // Submit Signup Form
    await page.evaluate(() => {
      const submitBtn = document.querySelector(".auth-submit-btn");
      if (submitBtn) submitBtn.click();
    });

    // Wait for modal to close and header to update
    await page.waitForFunction(() => !document.querySelector(".auth-modal-backdrop"), { timeout: 8000 });
    await wait(800);

    const headerName = await getPlayerHeaderName(page);
    const initialWallet = await getPlayerWallet(page);
    console.log(`✓ Signed up dynamic user: "${headerName}" with initial wallet: $${initialWallet}`);
    if (!headerName.includes("NovaPlayer")) {
      throw new Error(`Expected header to include NovaPlayer, got: "${headerName}"`);
    }
    if (initialWallet !== 100) {
      throw new Error(`Expected initial bonus wallet of 100, got: ${initialWallet}`);
    }

    await page.screenshot({ path: path.join(screenshotDir, "03-auth-signup-success.png") });

    // -------------------------------------------------------------------------
    // STAGE 3: VERIFY DYNAMIC PROFILE VIEW
    // -------------------------------------------------------------------------
    console.log("\n--- STAGE 3: VERIFY DYNAMIC USER PROFILE ---");
    const avatarBtn = await page.waitForSelector(".avatar-button", { timeout: 8000 });
    await avatarBtn.click();
    await page.waitForSelector(".profile-summary", { timeout: 8000 });

    const profileText = await page.evaluate(() => document.body.innerText);
    if (!profileText.includes(testUser)) {
      throw new Error(`Profile does not contain dynamic username "${testUser}"`);
    }
    if (profileText.includes("TRUEIG-11804") && !profileText.includes(testUser)) {
      throw new Error("Profile is still using hardcoded user Ari.R");
    }
    console.log(`✓ Dynamic Profile accurately reflects ${testUser} with dynamic ID and stats.`);
    await page.screenshot({ path: path.join(screenshotDir, "04-dynamic-profile-view.png") });

    // -------------------------------------------------------------------------
    // STAGE 4: ENTER GAME ROOM & VERIFY TICKET PURCHASE
    // -------------------------------------------------------------------------
    console.log("\n--- STAGE 4: GAMEPLAY WITH DYNAMIC PLAYER ---");
    await selectPlayerNav(page, "Lobby");
    await page.waitForSelector(".room-card-v2, .room-card", { timeout: 8000 });

    // Click Diamond 75 Play button
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll(".room-card-v2, .room-card"));
      const diamond = cards.find((c) => c.textContent.includes("Diamond 75")) || cards[0];
      const playBtn = diamond.querySelector(".room-card-bottom button");
      if (playBtn) playBtn.click();
    });

    await page.waitForSelector(".game-page", { timeout: 10000 });
    console.log("✓ Successfully entered Diamond 75 game room.");

    // Buy cards in room
    const walletBeforeBuy = await getPlayerWallet(page);
    const buyBtn = await page.waitForSelector(".ticket-purchase .buy-button, .buy-button", { timeout: 8000 });
    await buyBtn.click();
    await wait(1500);

    const walletAfterBuy = await getPlayerWallet(page);
    console.log(`✓ Ticket purchased. Wallet updated from $${walletBeforeBuy} to $${walletAfterBuy}`);
    if (walletAfterBuy >= walletBeforeBuy) {
      throw new Error(`Wallet was not deducted after ticket purchase: ${walletAfterBuy} vs ${walletBeforeBuy}`);
    }

    await page.screenshot({ path: path.join(screenshotDir, "05-game-ticket-bought.png") });

    // -------------------------------------------------------------------------
    // STAGE 5: ADMIN BACKOFFICE - VIEW DYNAMIC PLAYER & ADD PLAYING FUNDS
    // -------------------------------------------------------------------------
    console.log("\n--- STAGE 5: ADMIN BACKOFFICE OPERATOR WALLET MANAGEMENT ---");
    const adminPage = await browser.newPage();
    await adminPage.setViewport({ width: 1440, height: 900 });
    await adminPage.goto(`${APP_URL}/backoffice`, { waitUntil: "networkidle2", timeout: 60000 });
    await adminPage.waitForSelector(".admin-shell", { timeout: 15000 });
    console.log("✓ Admin Backoffice loaded successfully.");

    // Navigate to Players section
    await selectAdminNav(adminPage, "Players");
    await adminPage.waitForSelector(".responsive-table", { timeout: 8000 });
    console.log("✓ Players table loaded.");

    // Search for the newly created user in Players table
    const searchInput = await adminPage.waitForSelector('.search-box input, input[placeholder*="Search"]', { timeout: 5000 });
    await searchInput.type(testUser);
    await wait(500);

    // Verify row for testUser is present and click "View →"
    const foundUserInTable = await adminPage.evaluate((target) => {
      const rows = Array.from(document.querySelectorAll(".responsive-table tbody tr"));
      const userRow = rows.find((r) => r.textContent.includes(target));
      if (!userRow) return false;
      const viewBtn = userRow.querySelector("button");
      if (viewBtn) {
        viewBtn.click();
        return true;
      }
      return false;
    }, testUser);

    if (!foundUserInTable) {
      throw new Error(`Player ${testUser} not found in Admin Players table.`);
    }
    console.log(`✓ Located ${testUser} in Admin Players table and opened drawer.`);

    // Wait for AdminPlayerDrawer to open
    await adminPage.waitForSelector(".admin-drawer.wide, .operator-wallet-box", { timeout: 8000 });
    console.log("✓ AdminPlayerDrawer with Operator Wallet Management opened.");

    await adminPage.screenshot({ path: path.join(screenshotDir, "06-admin-drawer-open.png") });

    // Add $150.00 to the player's wallet via Operator Wallet Box
    console.log("Crediting $150.00 to player wallet via Operator Wallet Box...");
    await adminPage.evaluate(() => {
      const box = document.querySelector(".operator-wallet-box");
      const input = box.querySelector('input[type="number"]');
      if (input) {
        input.value = "";
        input.focus();
      }
    });
    const amountInput = await adminPage.$(".operator-wallet-box input[type=\"number\"]");
    await amountInput.type("150");

    // Click "+ Add to Player Wallet" button
    await adminPage.evaluate(() => {
      const box = document.querySelector(".operator-wallet-box");
      const addBtn = box.querySelector(".operator-wallet-row button");
      if (addBtn) addBtn.click();
    });

    // Wait for success banner
    await adminPage.waitForSelector(".operator-wallet-success", { timeout: 8000 });
    const successMsg = await adminPage.evaluate(() => {
      const el = document.querySelector(".operator-wallet-success");
      return el ? el.textContent.trim() : "";
    });
    console.log(`✓ Admin confirmed wallet injection: "${successMsg}"`);

    await adminPage.screenshot({ path: path.join(screenshotDir, "07-admin-funds-added.png") });

    // -------------------------------------------------------------------------
    // STAGE 6: VERIFY REAL-TIME SSE WALLET SYNC ON PLAYER FRONTEND
    // -------------------------------------------------------------------------
    console.log("\n--- STAGE 6: REAL-TIME WALLET SYNCHRONIZATION ON PLAYER FRONTEND ---");
    await page.bringToFront();
    // Wait for SSE or polling drift to update wallet
    let synced = false;
    const startSync = Date.now();
    let currentWallet = 0;
    while (Date.now() - startSync < 8000) {
      currentWallet = await getPlayerWallet(page);
      if (currentWallet >= walletAfterBuy + 149) {
        synced = true;
        break;
      }
      await wait(500);
    }

    console.log(`✓ Player frontend wallet successfully synced to: $${currentWallet}`);
    if (!synced) {
      throw new Error(`Player wallet did not receive the +$150.00 injection. Got: $${currentWallet}, expected >= $${walletAfterBuy + 149}`);
    }

    await page.screenshot({ path: path.join(screenshotDir, "08-player-wallet-synced.png") });

    // -------------------------------------------------------------------------
    // STAGE 7: QUICK USER SWITCHER VERIFICATION
    // -------------------------------------------------------------------------
    console.log("\n--- STAGE 7: QUICK USER SWITCHER MODAL ---");
    // Return to lobby
    await page.evaluate(() => {
      const backBtn = document.querySelector(".back-button");
      if (backBtn) backBtn.click();
    });
    await wait(600);

    // Click user auth button to open modal
    const switchBtn = await page.waitForSelector(".user-auth-button", { timeout: 5000 });
    await switchBtn.click();
    await page.waitForSelector(".auth-modal-card", { timeout: 5000 });

    // Click the "TrueigQueen" quick user pill
    const clickedPill = await page.evaluate(() => {
      const pills = Array.from(document.querySelectorAll(".quick-user-pill"));
      const queen = pills.find((p) => p.textContent.includes("TrueigQueen"));
      if (queen) {
        queen.click();
        return true;
      }
      return false;
    });

    if (!clickedPill) {
      throw new Error("Quick user pill for TrueigQueen not found in Auth Modal");
    }
    await wait(400);

    // Click Sign In
    await page.evaluate(() => {
      const submit = document.querySelector(".auth-submit-btn");
      if (submit) submit.click();
    });

    // Wait for modal to close and header to reflect TrueigQueen
    await page.waitForFunction(() => !document.querySelector(".auth-modal-backdrop"), { timeout: 8000 });
    await wait(600);

    const switchedUser = await getPlayerHeaderName(page);
    console.log(`✓ Successfully switched user to: "${switchedUser}"`);
    if (!switchedUser.includes("TrueigQueen")) {
      throw new Error(`Expected switched user to be TrueigQueen, got: "${switchedUser}"`);
    }

    await page.screenshot({ path: path.join(screenshotDir, "09-switched-user-success.png") });

    console.log("\n========================================================================");
    console.log("   🎉 ALL 7 STAGES OF AUTH & OPERATOR WALLET VERIFIED SUCCESSFULLY!    ");
    console.log("========================================================================\n");

  } finally {
    if (browser) {
      await browser.close();
    }
    for (const proc of procs) {
      try {
        proc.kill();
      } catch {}
    }
  }
}

run().catch((err) => {
  console.error("\n❌ Test Failed:", err);
  process.exit(1);
});
