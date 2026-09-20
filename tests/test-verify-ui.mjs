import puppeteer from 'puppeteer-core';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SCREENSHOT_DIR = '/Users/vikashpatidar/.gemini/antigravity/brain/c1a530e1-0cc4-4d8d-9512-3ea851fe5138/screenshots';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  await wait(800);
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
  await wait(800);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    protocolTimeout: 120000,
    defaultViewport: { width: 1440, height: 1000 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000 });
    
    // 1. Visit Player Tournaments Lobby
    console.log('Navigating to Player Tournaments lobby...');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('header.player-header nav.main-nav button', { timeout: 15000 });
    
    await selectPlayerNav(page, 'Tournaments');
    await page.waitForSelector('.tourney-selector-section', { timeout: 15000 });
    await page.waitForSelector('.tourney-rules-guide', { timeout: 15000 });
    console.log('✓ Found .tourney-selector-section and .tourney-rules-guide!');
    
    // Verify no operator buttons exist on player page
    const operatorButtons = await page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
      return allButtons.filter(text => 
        text.includes('Start Tournament') || 
        text.includes('Score & End Round') || 
        text.includes('Advance to Stage') || 
        text.includes('Advance to Round') ||
        text.includes('Crown Champion')
      );
    });
    console.log('Operator buttons found in player lobby (must be empty):', operatorButtons);
    if (operatorButtons.length > 0) {
      throw new Error('Operator buttons leaked to player UI: ' + operatorButtons.join(', '));
    }
    console.log('✓ VERIFIED: Player frontend contains ZERO operator buttons!');
    
    // Capture Player Lobby with Multi-Tournament Cards and Rules
    await page.screenshot({ path: `${SCREENSHOT_DIR}/36-player-lobby-multi-tournaments-and-rules.png`, fullPage: false });
    console.log('✓ Captured: 36-player-lobby-multi-tournaments-and-rules.png');
    
    // Scroll to the Rules section and capture it
    await page.evaluate(() => {
      const el = document.querySelector('.tourney-rules-guide');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await wait(600);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/38-player-tournament-rules-guide.png`, fullPage: false });
    console.log('✓ Captured: 38-player-tournament-rules-guide.png');
    
    // 2. Visit Backoffice Admin
    console.log('Navigating to Admin Backoffice Tournaments...');
    await page.goto('http://localhost:3000/backoffice', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.admin-sidebar nav button', { timeout: 15000 });
    
    await selectAdminNav(page, 'Tournaments');
    await page.waitForSelector('.admin-tourney-tabs', { timeout: 10000 });
    console.log('✓ Backoffice tournament switcher tabs rendered.');
    
    // Click + Create New Tournament button to open modal
    await page.click('.admin-create-tourney-btn');
    await page.waitForSelector('form input[placeholder*="Sunday"]', { timeout: 5000 });
    console.log('✓ Backoffice Create Tournament modal opened.');
    
    await page.screenshot({ path: `${SCREENSHOT_DIR}/37-backoffice-create-tournament-modal.png`, fullPage: false });
    console.log('✓ Captured: 37-backoffice-create-tournament-modal.png');
    
    console.log('\n========================================================================');
    console.log('   🎉 ALL PLAYER & BACKOFFICE UI OVERHAUL VERIFICATIONS PASSED!         ');
    console.log('========================================================================');
  } finally {
    await browser.close();
  }
})();
