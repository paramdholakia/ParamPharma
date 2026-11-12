import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.resolve('..', 'docs', 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: 'desktop_1080p', width: 1920, height: 1080 },
  { name: 'laptop_1366x768', width: 1366, height: 768 },
  { name: 'desktop_720p', width: 1280, height: 720 },
  { name: 'legacy_1024x768', width: 1024, height: 768 },
  { name: 'tablet_portrait', width: 768, height: 1024 },
  { name: 'mobile_390x844', width: 390, height: 844 },
];

async function runBaseline() {
  console.log('Launching Playwright Chromium...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  const pageErrors = [];
  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });

  console.log('Navigating to http://127.0.0.1:5173 ...');
  const t0 = Date.now();
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });
  const loadTimeMs = Date.now() - t0;
  console.log(`Page loaded in ${loadTimeMs}ms`);

  // Count DOM nodes
  const domNodeCount = await page.evaluate(() => document.querySelectorAll('*').length);
  console.log(`Initial DOM node count: ${domNodeCount}`);

  // Capture baseline screenshots across all viewports for Dashboard
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(300);
    const screenshotPath = path.join(SCREENSHOT_DIR, `baseline_dashboard_${vp.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`Captured: ${screenshotPath}`);
  }

  // Test Sales Billing view
  console.log('Testing Sales Billing Counter...');
  await page.setViewportSize({ width: 1366, height: 768 });
  const billingBtn = page.locator('button:has-text("Sales Billing")').first();
  if (await billingBtn.isVisible()) {
    await billingBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'baseline_sales_billing_1366.png') });
  }

  // Test Products view
  console.log('Testing Product Master...');
  const productsBtn = page.locator('button:has-text("Product Master")').first();
  if (await productsBtn.isVisible()) {
    await productsBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'baseline_products_1366.png') });
  }

  // Test Profit & Loss view
  console.log('Testing Profit & Loss...');
  const plBtn = page.locator('button:has-text("Profit & Loss")').first();
  if (await plBtn.isVisible()) {
    await plBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'baseline_profit_loss_1366.png') });
  }

  console.log('\n--- VERIFICATION REPORT ---');
  console.log(`Console Errors: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.log('Errors:', consoleErrors);
  }
  console.log(`Page Unhandled Exceptions: ${pageErrors.length}`);
  if (pageErrors.length > 0) {
    console.log('Page Errors:', pageErrors);
  }

  await browser.close();

  const report = {
    loadTimeMs,
    domNodeCount,
    consoleErrors,
    pageErrors,
    viewportsTested: VIEWPORTS.map((v) => `${v.name} (${v.width}x${v.height})`),
  };

  fs.writeFileSync(
    path.join('..', 'docs', 'baseline_playwright_result.json'),
    JSON.stringify(report, null, 2)
  );
  console.log('Saved baseline report to docs/baseline_playwright_result.json');
}

runBaseline().catch((err) => {
  console.error('Playwright execution error:', err);
  process.exit(1);
});
