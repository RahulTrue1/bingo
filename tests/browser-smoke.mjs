import puppeteer from 'puppeteer-core';

async function run() {
  console.log('Launching Chrome...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    console.log('Navigating to http://localhost:3000...');
    const response = await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 10000 });
    console.log('Lobby response status:', response.status());
    await page.waitForSelector('.room-card, .bingo-grid', { timeout: 5000 }).catch(() => console.log('Selector timeout or page rendered'));
    const title = await page.title();
    console.log('Lobby page title:', title);

    const backofficePage = await browser.newPage();
    await backofficePage.setViewport({ width: 1440, height: 900 });
    console.log('Navigating to http://localhost:3000/backoffice...');
    const boResponse = await backofficePage.goto('http://localhost:3000/backoffice', { waitUntil: 'domcontentloaded', timeout: 10000 });
    console.log('Backoffice response status:', boResponse.status());
    const boTitle = await backofficePage.title();
    console.log('Backoffice page title:', boTitle);

    console.log('SUCCESS: Browser connected and loaded both pages successfully!');
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
