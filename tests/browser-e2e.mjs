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
    const response = await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 15000 });
    console.log('Lobby response status:', response.status());

    const title = await page.title();
    console.log('Lobby page title:', title);

    const backofficePage = await browser.newPage();
    await backofficePage.setViewport({ width: 1440, height: 900 });
    console.log('Navigating to http://localhost:3000/backoffice...');
    const boResponse = await backofficePage.goto('http://localhost:3000/backoffice', { waitUntil: 'networkidle0', timeout: 15000 });
    console.log('Backoffice response status:', boResponse.status());

    console.log('SUCCESS: Browser connected to both user and backoffice pages');
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
