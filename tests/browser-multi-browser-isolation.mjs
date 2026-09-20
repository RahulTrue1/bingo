import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SCREENSHOTS_DIR = '/Users/vikashpatidar/.gemini/antigravity/brain/c1a530e1-0cc4-4d8d-9512-3ea851fe5138/screenshots';

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function openAuthModal(page) {
  for (let attempt = 0; attempt < 5; attempt++) {
    await page.click('.user-auth-button');
    try {
      await page.waitForSelector('.auth-modal-card', { visible: true, timeout: 2500 });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 800));
    }
  }
  throw new Error('Failed to open auth modal');
}

async function switchAccount(page, targetName) {
  await openAuthModal(page);
  await new Promise((r) => setTimeout(r, 600));
  const pills = await page.$$('.quick-user-pill');
  for (const p of pills) {
    const text = await page.evaluate((el) => el.textContent, p);
    if (text.includes(targetName)) {
      await p.click();
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 1200));
}

async function signupNewPlayer(page, username, password) {
  await openAuthModal(page);
  await new Promise((r) => setTimeout(r, 500));

  // Click "Sign Up" tab
  const tabClicked = await page.evaluate(() => {
    const tabButtons = Array.from(document.querySelectorAll('.auth-tab-btn, .auth-modal-tabs button'));
    const target = tabButtons.find((b) => b.textContent.includes('Sign Up'));
    if (target) {
      target.click();
      return true;
    }
    return false;
  });
  if (!tabClicked) {
    throw new Error('Sign Up tab not found');
  }
  await new Promise((r) => setTimeout(r, 600));

  // Focus and type username
  const userInput = await page.$('.auth-modal-card input[placeholder*="NovaPlayer"], .auth-modal-card input[type="text"]');
  if (userInput) {
    await userInput.click();
    await userInput.type(username);
  }

  // Focus and type password
  const passInput = await page.$('.auth-modal-card input[placeholder*="Create password"], .auth-modal-card input[type="password"]');
  if (passInput) {
    await passInput.click();
    await passInput.type(password);
  }

  await new Promise((r) => setTimeout(r, 400));

  // Submit form
  await page.evaluate(() => {
    const form = document.querySelector('.auth-form');
    if (form) {
      form.requestSubmit();
    } else {
      const btn = document.querySelector('.auth-submit-btn');
      if (btn) btn.click();
    }
  });

  // Wait for modal to disappear
  await page.waitForFunction(() => document.querySelector('.auth-modal-card') === null, { timeout: 8000 });
  await new Promise((r) => setTimeout(r, 1000));
}

async function navigateToTab(page, tabName) {
  const navButtons = await page.$$('.main-nav button');
  for (const b of navButtons) {
    const text = await page.evaluate((el) => el.textContent.trim().toLowerCase(), b);
    if (text === tabName.toLowerCase() || text.includes(tabName.toLowerCase())) {
      await b.click();
      await new Promise((r) => setTimeout(r, 1200));
      return;
    }
  }
  throw new Error(`Nav button "${tabName}" not found`);
}

async function run() {
  console.log('=== Starting Multi-Browser Concurrency & Session Isolation E2E ===');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,920']
  });

  try {
    // ==========================================
    // 1. CONTEXT 1: Browser 1 (Default context) - Player 1 (Ari.R)
    // ==========================================
    console.log('\n--- 1. Setting up Browser 1 (Player 1: Ari.R) ---');
    const context1 = browser.defaultBrowserContext();
    const page1 = await context1.newPage();
    await page1.setViewport({ width: 1440, height: 920 });

    await page1.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Ensure Browser 1 is logged in as Ari.R
    await switchAccount(page1, 'Ari.R');
    const user1Text = await page1.$eval('.user-auth-button b', (el) => el.textContent.trim());
    const wallet1Text = await page1.$eval('.wallet strong', (el) => el.textContent.trim());
    console.log(`Browser 1 logged in as: ${user1Text}, Wallet: ${wallet1Text}`);

    // Navigate to "My tickets" in Browser 1
    await navigateToTab(page1, 'tickets');
    await page1.waitForFunction(() => document.querySelectorAll('.wallet-ticket').length > 0, { timeout: 8000 });
    const page1TicketCount = await page1.$$eval('.wallet-ticket', (els) => els.length);
    console.log(`Browser 1 (Ari.R) sees ${page1TicketCount} tickets.`);

    const shot1 = path.join(SCREENSHOTS_DIR, '20-multi-browser-context1-arir.png');
    await page1.screenshot({ path: shot1, fullPage: false });
    console.log(`Saved screenshot: ${shot1}`);

    // ==========================================
    // 2. CONTEXT 2: Browser 2 (Incognito context) - Player 2 (Fresh Signup)
    // ==========================================
    const newPlayerName = `Player2_${Date.now()}`;
    console.log(`\n--- 2. Setting up Browser 2 (Player 2: ${newPlayerName} - Incognito Window) ---`);
    const context2 = await browser.createBrowserContext();
    const page2 = await context2.newPage();
    await page2.setViewport({ width: 1440, height: 920 });

    await page2.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Sign up as a brand new independent player in Browser 2
    console.log(`Signing up as ${newPlayerName} in Browser 2...`);
    await signupNewPlayer(page2, newPlayerName, 'Secr3tPass!');
    const user2Text = await page2.$eval('.user-auth-button b', (el) => el.textContent.trim());
    const wallet2Text = await page2.$eval('.wallet strong', (el) => el.textContent.trim());
    console.log(`Browser 2 logged in as: ${user2Text}, Wallet: ${wallet2Text}`);

    // Navigate to "My tickets" in Browser 2
    await navigateToTab(page2, 'tickets');
    await page2.waitForFunction(() => document.querySelector('.ticket-wallet-empty') !== null, { timeout: 8000 });
    const emptyState2 = await page2.$('.ticket-wallet-empty');
    console.log(`Browser 2 (${newPlayerName}) empty state visible: ${Boolean(emptyState2)}`);

    const shot2 = path.join(SCREENSHOTS_DIR, '21-multi-browser-context2-riskyb.png');
    await page2.screenshot({ path: shot2, fullPage: false });
    console.log(`Saved screenshot: ${shot2}`);

    // ==========================================
    // 3. VERIFY CONCURRENCY: Check Browser 1 STILL belongs to Ari.R!
    // ==========================================
    console.log('\n--- 3. Verifying Browser 1 was NOT kicked out or overwritten ---');
    const user1Check = await page1.$eval('.user-auth-button b', (el) => el.textContent.trim());
    const wallet1Check = await page1.$eval('.wallet strong', (el) => el.textContent.trim());
    const tickets1Check = await page1.$$eval('.wallet-ticket', (els) => els.length);
    console.log(`Browser 1 check -> User: "${user1Check}", Wallet: "${wallet1Check}", Tickets: ${tickets1Check}`);

    if (!user1Check.includes('Ari.R')) {
      throw new Error(`Browser 1 session was overwritten! Expected Ari.R, found "${user1Check}"`);
    }
    if (tickets1Check !== page1TicketCount) {
      throw new Error('Browser 1 ticket count changed after Browser 2 signed up!');
    }
    console.log('✅ Browser 1 and Browser 2 are successfully running concurrent isolated sessions!');

    // ==========================================
    // 4. CONTEXT 3: Browser 3 - Admin Backoffice (/backoffice)
    // ==========================================
    console.log('\n--- 4. Setting up Browser 3 (Admin Backoffice) ---');
    const context3 = await browser.createBrowserContext();
    const page3 = await context3.newPage();
    await page3.setViewport({ width: 1440, height: 920 });

    await page3.goto('http://localhost:3000/backoffice', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2000));

    const shot3 = path.join(SCREENSHOTS_DIR, '22-backoffice-live-control.png');
    await page3.screenshot({ path: shot3, fullPage: false });
    console.log(`Saved screenshot: ${shot3}`);

    // Backoffice deposits $50 to Player 2 via admin API
    console.log(`\n--- 5. Admin adding $50 to ${newPlayerName} via Backoffice ---`);
    const depositRes = await fetch(`http://localhost:4000/api/admin/players/${newPlayerName}/add-funds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 50, reason: 'Backoffice deposit test' }),
    });
    const depositJson = await depositRes.json();
    console.log(`Admin deposit result: ${depositJson.message}`);

    // Wait for SSE propagation
    await new Promise((r) => setTimeout(r, 2000));

    // Verify Browser 2 (Player 2) updated balance to $150 (initial 100 + 50)
    const wallet2Updated = await page2.$eval('.wallet strong', (el) => el.textContent.trim());
    console.log(`Browser 2 (${newPlayerName}) balance after admin deposit: ${wallet2Updated}`);
    if (!wallet2Updated.includes('150')) {
      throw new Error(`Expected Browser 2 to show $150, found "${wallet2Updated}"`);
    }

    // Verify Browser 1 (Ari.R) balance did NOT change
    const wallet1Untouched = await page1.$eval('.wallet strong', (el) => el.textContent.trim());
    console.log(`Browser 1 (Ari.R) balance after Player 2 deposit: ${wallet1Untouched}`);
    if (wallet1Untouched !== wallet1Check) {
      throw new Error(`Browser 1 balance unexpectedly changed from ${wallet1Check} to ${wallet1Untouched}!`);
    }
    console.log('✅ Admin deposit accurately updated only Player 2 without touching Ari.R!');

    // ==========================================
    // 6. Player 2 purchases 1 ticket in Browser 2
    // ==========================================
    console.log(`\n--- 6. Browser 2 (${newPlayerName}) purchasing 1 ticket ---`);
    const buyRes = await fetch('http://localhost:4000/api/tickets/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: 'trueig-90',
        count: 1,
        username: newPlayerName,
      })
    });
    console.log(`Purchased ticket for ${newPlayerName}, status: ${buyRes.status}`);

    // Refresh tickets view on Browser 2
    await navigateToTab(page2, 'lobby');
    await navigateToTab(page2, 'tickets');

    await page2.waitForFunction(() => document.querySelectorAll('.wallet-ticket').length === 1, { timeout: 8000 });
    const player2TicketsCount = await page2.$$eval('.wallet-ticket', (els) => els.length);
    console.log(`Browser 2 (${newPlayerName}) now sees: ${player2TicketsCount} ticket(s)`);

    const shot4 = path.join(SCREENSHOTS_DIR, '23-riskyb-after-deposit-and-buy.png');
    await page2.screenshot({ path: shot4, fullPage: false });
    console.log(`Saved screenshot: ${shot4}`);

    // Verify Browser 1 (Ari.R) still sees only Ari.R's tickets
    const page1FinalCount = await page1.$$eval('.wallet-ticket', (els) => els.length);
    console.log(`Browser 1 (Ari.R) still sees: ${page1FinalCount} ticket(s)`);
    if (page1FinalCount !== page1TicketCount) {
      throw new Error('Browser 1 ticket count changed when Player 2 bought a ticket!');
    }

    console.log('\n🎉 ALL MULTI-BROWSER ISOLATION CHECKS PASSED PERFECTLY! 🎉');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
