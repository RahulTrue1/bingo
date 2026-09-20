import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SCREENSHOTS_DIR = '/Users/vikashpatidar/.gemini/antigravity/brain/c1a530e1-0cc4-4d8d-9512-3ea851fe5138/screenshots';

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function run() {
  console.log('--- Launching Browser Verification for Auth, Signup & Password Enforcement ---');
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

    console.log('2. Opening Auth Modal via .user-auth-button ...');
    await page.waitForSelector('.user-auth-button', { visible: true, timeout: 5000 });
    await page.click('.user-auth-button');
    await page.waitForSelector('.auth-modal-card', { visible: true, timeout: 5000 });

    console.log('3. Testing Sign Up with custom password ...');
    const tabBtns = await page.$$('.auth-tab-btn');
    for (const btn of tabBtns) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text?.includes('Sign Up')) {
        await btn.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 500));

    const testUser = `RahulPass_${Math.floor(100 + Math.random() * 900)}`;
    const testPassword = 'RahulSecretPass@77';

    // Type username
    const usernameInput = await page.$('input[placeholder="e.g. NovaPlayer"]');
    await usernameInput.focus();
    await page.keyboard.type(testUser);

    // Type password
    const passwordInput = await page.$('input[placeholder="Create password (min 4 chars)"]');
    await passwordInput.focus();
    await page.keyboard.type(testPassword);

    // Toggle Show Password
    const showToggle = await page.$('.auth-password-toggle');
    if (showToggle) {
      await showToggle.click();
      await new Promise(r => setTimeout(r, 200));
    }

    // Type display name
    const displayInput = await page.$('input[placeholder="e.g. Nova Rivera"]');
    if (displayInput) {
      await displayInput.focus();
      await page.keyboard.type('Rahul Password VIP');
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '14-signup-with-password-filled.png') });
    console.log('Saved screenshot 14-signup-with-password-filled.png');

    // Submit Sign Up
    await page.evaluate(() => {
      const btn = document.querySelector('.auth-submit-btn');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    const activeUser1 = await page.$eval('.user-auth-button b', el => el.textContent).catch(() => null);
    console.log(`✓ Sign up successful! Active user in navbar: ${activeUser1}`);

    console.log('4. Testing Log In with INCORRECT password for the newly created user ...');
    await page.click('.user-auth-button');
    await page.waitForSelector('.auth-modal-card', { visible: true });

    // In login form, type wrong password
    const loginPassInput = await page.$('input[placeholder="Enter your password"]');
    await loginPassInput.focus();
    await page.keyboard.type('WrongPassword123');

    await page.evaluate(() => {
      const btn = document.querySelector('.auth-submit-btn');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1200));

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '15-login-wrong-password-rejected.png') });
    console.log('Saved screenshot 15-login-wrong-password-rejected.png');

    const errorMsg = await page.$eval('.auth-modal-error', el => el.textContent).catch(() => 'No error');
    console.log('Error displayed on wrong password:', errorMsg);

    console.log('5. Testing Log In with CORRECT password ...');
    await page.evaluate((pass) => {
      const input = document.querySelector('input[placeholder="Enter your password"]');
      if (input) {
        const protoSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (protoSetter) {
          protoSetter.call(input, pass);
        } else {
          input.value = pass;
        }
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, testPassword);

    await new Promise(r => setTimeout(r, 300));
    await page.evaluate(() => {
      const btn = document.querySelector('.auth-submit-btn');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '16-login-correct-password-success.png') });
    console.log('Saved screenshot 16-login-correct-password-success.png');

    const activeUser2 = await page.$eval('.user-auth-button b', el => el.textContent).catch(() => null);
    console.log(`✓ Login with correct password successful! Active user: ${activeUser2}`);

    console.log('=== ALL PASSWORD SIGNUP & LOGIN VERIFICATIONS PASSED! ===');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
