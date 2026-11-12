import { chromium } from '@playwright/test';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));

  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });

  // 1. Customer Ledger
  const clBtn = page.locator('button:has-text("Customer Ledger")').first();
  await clBtn.click();
  await page.waitForTimeout(600);
  const clExportBtn = await page.locator('button:has-text("Print / Export Full Ledger PDF")').isVisible();
  console.log('Customer Ledger Export Button visible:', clExportBtn);

  // 2. Supplier Ledger
  const slBtn = page.locator('button:has-text("Supplier Ledger")').first();
  await slBtn.click();
  await page.waitForTimeout(600);
  const slExportBtn = await page.locator('button:has-text("Print / Export Full Ledger PDF")').isVisible();
  console.log('Supplier Ledger Export Button visible:', slExportBtn);

  // 3. Payment Vouchers
  const payBtn = page.locator('button:has-text("Payment Vouchers")').first();
  await payBtn.click();
  await page.waitForTimeout(600);
  const payCount = await page.locator('table tr').count();
  console.log('Payment Vouchers rows rendered:', payCount);

  console.log('Total Console / Page Errors:', errors.length);
  if (errors.length > 0) {
    console.error('Errors:', errors);
  }

  await browser.close();
}

run().catch(console.error);
