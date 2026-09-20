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
      await page.waitForSelector('.auth-modal-card', { visible: true, timeout: 2000 });
      return;
    } catch {
      await new Promise(r => setTimeout(r, 800));
    }
  }
  throw new Error('Failed to open auth modal after 5 attempts');
}

async function run() {
  console.log('--- Starting Browser Verification for User Ticket Isolation ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  page.on('console', (msg) => {
    const text = msg.text();
    if (!text.includes('Urban VPN') && !text.includes('M_ID')) {
      console.log(`[Browser Console] ${msg.type()}: ${text}`);
    }
  });

  try {
    console.log('1. Navigating to http://localhost:3000 ...');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2000));

    // 2. Switch to RiskyB account
    console.log('2. Switching to RiskyB');
    await openAuthModal(page);
    await new Promise(r => setTimeout(r, 500));
    for (const p of await page.$$('.quick-user-pill')) {
      if ((await page.evaluate(el => el.textContent, p)).includes('RiskyB')) {
        await p.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1000));

    // 3. Go to Tickets as RiskyB
    console.log('3. Navigating to Tickets as RiskyB');
    for (const b of await page.$$('.main-nav button')) {
      if ((await page.evaluate(el => el.textContent, b)).trim().toLowerCase() === 'tickets') {
        await b.click();
        break;
      }
    }

    // Wait for empty state to render
    await page.waitForFunction(() => document.querySelector('.ticket-wallet-empty') !== null, { timeout: 8000 });
    const riskyInitialCount = await page.$$eval('.wallet-ticket', els => els.length);
    console.log(`RiskyB initial tickets count (expected 0): ${riskyInitialCount}`);
    if (riskyInitialCount !== 0) {
      throw new Error(`Expected 0 tickets for RiskyB, but found ${riskyInitialCount}`);
    }

    const ss17 = path.join(SCREENSHOTS_DIR, '17-riskyb-empty-tickets.png');
    await page.screenshot({ path: ss17, fullPage: false });
    console.log(`Captured screenshot: ${ss17}`);

    // 4. Switch to Ari.R
    console.log('4. Switching to Ari.R');
    await openAuthModal(page);
    await new Promise(r => setTimeout(r, 500));
    for (const p of await page.$$('.quick-user-pill')) {
      if ((await page.evaluate(el => el.textContent, p)).includes('Ari.R')) {
        await p.click();
        break;
      }
    }
    await page.waitForFunction(() => document.querySelectorAll('.wallet-ticket').length > 0, { timeout: 8000 });
    const ariCount = await page.$$eval('.wallet-ticket', els => els.length);
    console.log(`Ari.R tickets count (expected 30): ${ariCount}`);
    if (ariCount === 0) {
      throw new Error('Expected Ari.R to have active tickets');
    }

    const ss18 = path.join(SCREENSHOTS_DIR, '18-arir-tickets-visible.png');
    await page.screenshot({ path: ss18, fullPage: false });
    console.log(`Captured screenshot: ${ss18}`);

    // 5. Switch back to RiskyB and buy a ticket
    console.log('5. Switching back to RiskyB');
    await openAuthModal(page);
    await new Promise(r => setTimeout(r, 500));
    for (const p of await page.$$('.quick-user-pill')) {
      if ((await page.evaluate(el => el.textContent, p)).includes('RiskyB')) {
        await p.click();
        break;
      }
    }
    await page.waitForFunction(() => document.querySelector('.ticket-wallet-empty') !== null, { timeout: 8000 });

    // Add funds for RiskyB
    await fetch('http://localhost:4000/api/admin/players/USR-07226/add-funds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 50 })
    });

    // Buy 1 ticket for RiskyB
    console.log('Purchasing 1 ticket for RiskyB in trueig-90...');
    const buyRes = await fetch('http://localhost:4000/api/tickets/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: 'trueig-90',
        count: 1,
        username: 'RiskyB',
        userId: 'USR-07226'
      })
    });
    console.log('Purchased ticket for RiskyB, status:', buyRes.status);

    // Refresh view by toggling to Lobby and back to Tickets
    for (const b of await page.$$('.main-nav button')) {
      if ((await page.evaluate(el => el.textContent, b)).trim().toLowerCase() === 'lobby') {
        await b.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 500));
    for (const b of await page.$$('.main-nav button')) {
      if ((await page.evaluate(el => el.textContent, b)).trim().toLowerCase() === 'tickets') {
        await b.click();
        break;
      }
    }

    await page.waitForFunction(() => document.querySelectorAll('.wallet-ticket').length === 1, { timeout: 8000 });
    const riskyPurchased = await page.$$eval('.wallet-ticket', els => els.length);
    console.log(`RiskyB tickets count after buy (expected 1): ${riskyPurchased}`);

    const ss19 = path.join(SCREENSHOTS_DIR, '19-riskyb-own-tickets-purchased.png');
    await page.screenshot({ path: ss19, fullPage: false });
    console.log(`Captured screenshot: ${ss19}`);

    console.log('\n🎉 ALL TICKET ISOLATION BROWSER TESTS COMPLETED SUCCESSFULLY!\n');
  } catch (err) {
    console.error('Error during browser verification:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
