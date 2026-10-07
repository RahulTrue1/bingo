import puppeteer from 'puppeteer-core';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ARTIFACT_DIR = '/Users/vikashpatidar/.gemini/antigravity/brain/4bcbe6c4-e03e-4c82-9d87-403d4b4c733f';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  try {
    const page = await browser.newPage();

    // 1. /poker tournament table at 1150px (desktop with sidebar category list)
    await page.setViewport({ width: 1150, height: 800 });
    await page.goto('http://localhost:3000/poker', { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 600));
    // Click Tournaments category
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.cats button'));
      const b = btns.find(x => x.textContent.includes('Tournaments'));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: `${ARTIFACT_DIR}/poker_tournaments_1150.png`, fullPage: false });
    console.log('Saved poker_tournaments_1150.png');

    // 2. /poker tournament table at 1024px (responsive layout where categories wrap on top)
    await page.setViewport({ width: 1024, height: 800 });
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: `${ARTIFACT_DIR}/poker_tournaments_1024.png`, fullPage: false });
    console.log('Saved poker_tournaments_1024.png');

    // 3. /poker-backoffice sidebar at 1280px (check full label text, no ...)
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('http://localhost:3000/poker-backoffice', { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: `${ARTIFACT_DIR}/poker_backoffice_sidebar_fixed.png`, fullPage: false });
    console.log('Saved poker_backoffice_sidebar_fixed.png');

    // 4. /poker-backoffice on mobile/tablet (768px) with drawer open
    await page.setViewport({ width: 768, height: 900 });
    await new Promise(r => setTimeout(r, 400));
    await page.click('.mobile-menu');
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: `${ARTIFACT_DIR}/poker_backoffice_mobile_drawer.png`, fullPage: false });
    console.log('Saved poker_backoffice_mobile_drawer.png');

  } catch (err) {
    console.error('Error during screenshot capture:', err);
  } finally {
    await browser.close();
  }
})();
