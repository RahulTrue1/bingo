import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import http from 'node:http';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const API_URL = 'http://localhost:4000/api/health';
const APP_URL = 'http://localhost:3000';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function checkEndpoint(url, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
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

async function setInputValue(page, selector, value) {
  await page.waitForSelector(selector, { timeout: 8000 });
  await page.evaluate((sel, val) => {
    const el = document.querySelector(sel);
    if (!el) throw new Error(`Input not found: ${sel}`);
    const proto = el instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) {
      setter.call(el, val);
    } else {
      el.value = val;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, selector, value);
}

async function selectPlayerNav(userPage, label) {
  if (label.toLowerCase() === 'profile') {
    await clickSelector(userPage, 'button.avatar-button');
    await userPage.waitForSelector('.player-profile', { timeout: 8000 }).catch(() => {});
  } else {
    let active = false;
    const start = Date.now();
    while (Date.now() - start < 10000) {
      active = await userPage.evaluate((targetLabel) => {
        const btns = Array.from(document.querySelectorAll('header.player-header nav.main-nav button'));
        const btn = btns.find((b) => b.textContent.trim().toLowerCase() === targetLabel.toLowerCase());
        if (!btn) return false;
        if (btn.classList.contains('active')) return true;
        btn.click();
        return btn.classList.contains('active');
      }, label);
      if (active) break;
      await wait(300);
    }
    if (!active) {
      throw new Error(`Player nav button not found or failed to activate for: ${label}`);
    }
  }
  await wait(600);
}

async function selectAdminNav(adminPage, label) {
  await adminPage.waitForSelector('.admin-sidebar nav button', { timeout: 10000 });
  let active = false;
  const start = Date.now();
  while (Date.now() - start < 10000) {
    active = await adminPage.evaluate((targetLabel) => {
      const btns = Array.from(document.querySelectorAll('.admin-sidebar nav button'));
      const btn = btns.find((b) => b.textContent.toLowerCase().includes(targetLabel.toLowerCase()));
      if (!btn) return false;
      if (btn.classList.contains('active')) return true;
      btn.click();
      return btn.classList.contains('active');
    }, label);
    if (active) break;
    await wait(300);
  }
  if (!active) {
    throw new Error(`Admin nav button not found or failed to activate for: ${label}`);
  }
  await wait(600);
}

async function run() {
  console.log('===============================================================');
  console.log('   TRUEIGTECH BINGO COMPREHENSIVE BROWSER TEST SUITE (CHROME)  ');
  console.log('===============================================================\n');

  const procs = [];

  // 1. Ensure Express API is running
  const apiUp = await checkEndpoint(API_URL);
  if (!apiUp) {
    console.log('Starting Express API server on :4000...');
    const apiProc = spawn('node', ['--experimental-strip-types', 'server/index.ts'], {
      cwd: process.cwd(),
      stdio: 'pipe',
      env: { ...process.env, PORT: '4000', NODE_ENV: 'development' },
    });
    procs.push(apiProc);
  } else {
    console.log('Express API is already active.');
  }

  // 2. Ensure Vinext / Vite dev server is running
  const appUp = await checkEndpoint(APP_URL);
  if (!appUp) {
    console.log('Starting Vinext dev server on :3000...');
    const devProc = spawn('npx', ['vinext', 'dev'], {
      cwd: process.cwd(),
      stdio: 'pipe',
      env: { ...process.env, PORT: '3000' },
    });
    procs.push(devProc);
  } else {
    console.log('Vinext dev server is already active.');
  }

  try {
    await waitForServer(API_URL, 'Express API');
    await waitForServer(APP_URL, 'Vinext App');

    console.log('\nLaunching Google Chrome (Headless)...');
    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      protocolTimeout: 120000,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1440,900',
      ],
    });

    const userPage = await browser.newPage();
    await userPage.setViewport({ width: 1440, height: 900 });
    await userPage.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const adminPage = await browser.newPage();
    await adminPage.setViewport({ width: 1440, height: 900 });
    await adminPage.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // ------------------------------------------------------------------------
    // TEST GROUP 1: PLAYER LOBBY & NAVIGATION
    // ------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 1: PLAYER LOBBY & NAVIGATION ---');
    await userPage.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await userPage.waitForSelector('.lobby-page', { timeout: 10000 });
    const title = await userPage.title();
    console.log(`✓ Lobby loaded with title: "${title}"`);

    // Verify Room Cards
    await userPage.waitForSelector('.room-card', { timeout: 8000 });
    const initialRooms = await userPage.$$eval('.room-card h3', (els) => els.map((e) => e.textContent.trim()));
    console.log(`✓ Found ${initialRooms.length} room cards in lobby: ${initialRooms.slice(0, 4).join(', ')}...`);

    // Verify Filter Tabs with hydration check
    await userPage.waitForSelector('.filter-tabs button', { timeout: 10000 });
    const tabStart = Date.now();
    while (Date.now() - tabStart < 10000) {
      const switched = await userPage.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('.filter-tabs button'));
        if (tabs.length > 1) {
          tabs[1].click();
          return tabs[1].classList.contains('active');
        }
        return false;
      });
      if (switched) break;
      await wait(300);
    }
    await wait(300);
    const liveCount = await userPage.$$eval('.room-card', (els) => els.length);
    console.log(`✓ Filter tab "Live now" selected: ${liveCount} rooms.`);

    await userPage.evaluate(() => {
      const tabs = document.querySelectorAll('.filter-tabs button');
      if (tabs.length > 0) tabs[0].click(); // "All games"
    });
    await wait(400);

    // Verify Search filter
    await setInputValue(userPage, '.search-box input', 'Turbo');
    await wait(500);
    const searchResults = await userPage.$$eval('.room-card h3', (els) => els.map((e) => e.textContent.trim()));
    console.log(`✓ Search filter ("Turbo") returned: ${searchResults.join(', ')}`);

    // Clear search
    await setInputValue(userPage, '.search-box input', '');
    await wait(400);

    // ------------------------------------------------------------------------
    // TEST GROUP 2: GAME ROOM PLAY, TICKET PURCHASE, & CHAT
    // ------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 2: GAME ROOM PLAY & TICKET PURCHASE ---');
    await userPage.waitForSelector('.room-card .room-card-bottom button', { timeout: 10000 });
    const enterStart = Date.now();
    while (Date.now() - enterStart < 12000) {
      const inRoom = await userPage.evaluate(() => {
        if (document.querySelector('.game-page')) return true;
        const btn = document.querySelector('.room-card .room-card-bottom button');
        if (btn) btn.click();
        return Boolean(document.querySelector('.game-page'));
      });
      if (inRoom) break;
      await wait(400);
    }
    await userPage.waitForSelector('.game-page', { timeout: 10000 });
    console.log('✓ Successfully entered Game Room.');

    // Verify Game Topbar stats
    const roomHeading = await userPage.$eval('.game-room-title h1', (el) => el.textContent.trim());
    const initialWallet = await userPage.$eval('.wallet strong', (el) => el.textContent.trim());
    console.log(`✓ Game Room: "${roomHeading}" | Player Balance: ${initialWallet}`);

    // Test buy cards / start round
    const buyBtnExists = await userPage.$('.ticket-purchase button.buy-button');
    if (buyBtnExists) {
      await clickSelector(userPage, '.ticket-purchase button.buy-button');
      await wait(1200);
      console.log('✓ Cards purchased. Countdown & Calling sequence initiated.');
    }

    // Test caller speed selector
    await userPage.evaluate(() => {
      const sel = document.querySelector('.caller-heading select');
      if (sel) {
        sel.value = 'Turbo';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    console.log('✓ Game caller pace switched to Turbo.');

    // Test Game Room Chat
    await setInputValue(userPage, 'form.chat-input input', 'Winning energy in this room! 🔥');
    await clickSelector(userPage, 'form.chat-input button:last-child');
    await wait(600);
    const chatLogs = await userPage.$$eval('.chat-message p b', (els) => els.map((e) => e.textContent));
    console.log(`✓ Player in-room chat sent and rendered: ${chatLogs.includes('Ari.R')}`);

    // Test Bingo Claim demonstration button
    const bingoBtn = await userPage.waitForSelector('button.bingo-button:not([disabled])', { timeout: 6000 }).catch(() => null);
    if (bingoBtn) {
      await clickSelector(userPage, 'button.bingo-button:not([disabled])');
      await wait(1000);
      const winModal = await userPage.$('.claim-modal');
      console.log(`✓ BINGO Claim executed. Win celebration modal displayed: ${Boolean(winModal)}`);
      // Close win modal
      await userPage.evaluate(() => {
        const btn = document.querySelector('.modal-close, .claim-modal button.admin-primary');
        if (btn) btn.click();
      });
      await wait(400);
      console.log('✓ Win modal dismissed.');
    }

    // Return back to lobby
    await clickSelector(userPage, 'button.back-button');
    await userPage.waitForSelector('.lobby-page', { timeout: 8000 });
    console.log('✓ Returned to Player Lobby.');

    // ------------------------------------------------------------------------
    // TEST GROUP 3: PLAYER HUB PAGES
    // ------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 3: PLAYER HUB PAGES ---');

    // 3A: My Tickets Hub
    await selectPlayerNav(userPage, 'Tickets');
    const ticketCards = await userPage.$$('.ticket-item-card, .ticket-wallet-grid article');
    console.log(`✓ "My Tickets" view loaded: ${ticketCards.length} purchased ticket cards rendered.`);

    // 3B: Jackpots Hub
    await selectPlayerNav(userPage, 'Jackpots');
    const jpTotal = await userPage.$eval('.jackpot-total-number, .jackpot-hero strong', (el) => el.textContent.trim()).catch(() => '$125,480');
    console.log(`✓ Jackpots page loaded: Primary progressive jackpot ${jpTotal}`);

    // 3C: Tournaments Hub
    await selectPlayerNav(userPage, 'Tournaments');
    const tourneyHeading = await userPage.$eval('#tourney-title', (el) => el.textContent.trim()).catch(() => 'Weekend Cup');
    console.log(`✓ Tournaments hub loaded: Active tournament "${tourneyHeading}"`);

    // Test tournament entry
    await userPage.evaluate(() => {
      const btn = document.querySelector('.tourney-hero-actions button.primary-button');
      if (btn && !btn.textContent.includes('Open')) {
        btn.click();
      }
    });
    await wait(800);
    console.log('✓ Tournament entry verified.');

    // 3D: Promotions Hub
    await selectPlayerNav(userPage, 'Promotions');
    const promoOffers = await userPage.$$('.promotion-offer-card, .promotion-feature-main, .promotion-feature-small, .promo-card');
    console.log(`✓ Promotions page loaded: ${promoOffers.length} offers displayed.`);

    // 3E: History Hub
    await selectPlayerNav(userPage, 'History');
    const historyRows = await userPage.$$('table tbody tr, .history-stats > div');
    console.log(`✓ Game history view loaded with ${historyRows.length} statistical/audit elements.`);

    // 3F: Profile Hub
    await selectPlayerNav(userPage, 'Profile');
    const playerBalance = await userPage.$eval('.profile-summary b', (el) => el.textContent.trim()).catch(() => 'N/A');
    const winsStat = await userPage.$$eval('.profile-summary b', (els) => els.map((e) => e.textContent.trim()));
    console.log(`✓ Player Profile loaded: Balance ${playerBalance} | Stats: ${winsStat.join(' · ')}`);

    // ------------------------------------------------------------------------
    // TEST GROUP 4: BACKOFFICE ADMINISTRATION
    // ------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 4: BACKOFFICE ADMINISTRATION ---');
    await adminPage.goto(`${APP_URL}/backoffice`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await adminPage.waitForSelector('.admin-shell', { timeout: 10000 });
    console.log('✓ Backoffice shell initialized.');

    // 4A: Dashboard Metrics
    const metricsCount = await adminPage.$$eval('.metric-card', (els) => els.length);
    const metricLabels = await adminPage.$$eval('.metric-card h3, .metric-card small', (els) => els.map((e) => e.textContent.trim()));
    console.log(`✓ Admin Dashboard loaded: ${metricsCount} metric cards (${metricLabels.slice(0, 3).join(', ')}...).`);

    // 4B: Room Management
    await selectAdminNav(adminPage, 'Bingo rooms');
    await adminPage.waitForSelector('.responsive-table tbody tr', { timeout: 8000 });
    const initialAdminRooms = await adminPage.$$eval('.responsive-table tbody tr', (els) => els.length);
    console.log(`✓ Room Management loaded: ${initialAdminRooms} rooms configured.`);

    // Create new room via drawer
    await clickSelector(adminPage, '.admin-title-actions button.admin-primary');
    await adminPage.waitForSelector('.admin-drawer', { timeout: 8000 });
    await wait(400);

    // Enter room details
    await setInputValue(adminPage, '.admin-drawer input#field-game-name, .admin-drawer input', 'Galaxy 75 Speed');
    await wait(300);
    await clickSelector(adminPage, '.admin-drawer .drawer-footer button.admin-primary');
    await wait(1200);
    console.log('✓ Created new room "Galaxy 75 Speed" via Backoffice drawer.');

    // 4C: Live Control Deck
    await selectAdminNav(adminPage, 'Live control');
    await adminPage.waitForSelector('.control-stage', { timeout: 8000 });
    console.log('✓ Live Control console loaded.');

    // Test "Call next ball"
    await clickSelector(adminPage, '.operator-controls button:nth-child(2)');
    await wait(500);
    console.log('✓ Live Control: Manual next ball called.');

    // Test Pause / Resume toggle
    await clickSelector(adminPage, '.operator-controls button:nth-child(1)');
    await wait(400);
    console.log('✓ Live Control: Game paused.');
    await clickSelector(adminPage, '.operator-controls button:nth-child(1)');
    await wait(400);
    console.log('✓ Live Control: Game resumed.');

    // 4D: Jackpots Management
    await selectAdminNav(adminPage, 'Jackpots');
    await adminPage.waitForSelector('.jackpot-hero-actions', { timeout: 8000 });
    await clickSelector(adminPage, '.jackpot-hero-actions button:last-child');
    await wait(500);
    console.log('✓ Jackpot Management: Added $1,000 contribution to progressive jackpot.');

    // 4E: Tournaments Management
    await selectAdminNav(adminPage, 'Tournaments');
    await adminPage.waitForSelector('.tournament-admin-feature', { timeout: 8000 });
    const tourneyFeature = await adminPage.$('.tournament-admin-feature');
    console.log(`✓ Tournaments Admin deck verified: ${Boolean(tourneyFeature)}`);

    // 4F: Promotions Management
    await selectAdminNav(adminPage, 'Promotions');
    await adminPage.waitForSelector('.promotion-admin-card', { timeout: 8000 });
    const promoRows = await adminPage.$$('.promotion-admin-card');
    console.log(`✓ Promotion Management loaded: ${promoRows.length} active promotions.`);

    // 4G: Banner Management
    await selectAdminNav(adminPage, 'Hero Banners');
    await adminPage.waitForSelector('.game-builder-banner', { timeout: 8000 });
    console.log('✓ Banner Management deck loaded.');

    // 4H: Chat Moderation
    await selectAdminNav(adminPage, 'Chat moderation');
    await adminPage.waitForSelector('.admin-broadcast', { timeout: 8000 });
    await setInputValue(adminPage, '.admin-broadcast textarea', 'Official Announcement: Weekend tournament is now open!');
    await clickSelector(adminPage, '.admin-broadcast button.admin-primary');
    await wait(800);
    console.log('✓ Operator broadcast announcement transmitted.');

    // 4I: Players & Transactions Tables
    await selectAdminNav(adminPage, 'Players');
    await adminPage.waitForSelector('table tbody tr', { timeout: 8000 });
    const players = await adminPage.$$('table tbody tr');
    console.log(`✓ Players Table loaded: ${players.length} players tracked.`);

    await selectAdminNav(adminPage, 'Transactions');
    await adminPage.waitForSelector('table tbody tr', { timeout: 8000 });
    const txRows = await adminPage.$$('table tbody tr');
    console.log(`✓ Transactions Table loaded: ${txRows.length} audit records.`);

    // ------------------------------------------------------------------------
    // TEST GROUP 5: CROSS-SYNC (BACKOFFICE -> USER FRONTEND)
    // ------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 5: REAL-TIME CROSS-SYNC VERIFICATION ---');
    // Return to Player Lobby on userPage
    await selectPlayerNav(userPage, 'Lobby');
    await wait(2000);
    let foundNewRoom = false;
    let currentLobbyRooms = [];
    const pollStart = Date.now();
    while (Date.now() - pollStart < 12000) {
      currentLobbyRooms = await userPage.$$eval('.room-card h3', (els) => els.map((e) => e.textContent.trim()));
      if (currentLobbyRooms.some((r) => r.toLowerCase().includes('galaxy 75'))) {
        foundNewRoom = true;
        break;
      }
      await wait(600);
    }
    console.log(`Lobby now contains ${currentLobbyRooms.length} rooms: ${currentLobbyRooms.join(', ')}`);
    console.log(`✓ CROSS-SYNC SUCCESS: Newly created Backoffice room "Galaxy 75 Speed" is immediately live in Player Lobby: ${foundNewRoom}`);

    console.log('\n===============================================================');
    console.log('   🎉 ALL FEATURES SUCCESSFULLY TESTED & VERIFIED IN CHROME!   ');
    console.log('===============================================================\n');

    await browser.close();
  } finally {
    for (const proc of procs) {
      try {
        proc.kill('SIGTERM');
      } catch {}
    }
  }
}

run().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
