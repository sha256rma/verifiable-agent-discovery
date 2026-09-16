/**
 * Two-phone behavioural suite.
 *
 * Drives two independent browser contexts — two real phones, separate storage —
 * through the entire demo script, including the parts that are easy to get
 * subtly wrong and impossible to notice by hand:
 *
 *   * the customer phone must NOT reveal the downgrade
 *   * verification OFF + downgraded model must still approve (the vulnerability)
 *   * verification ON + downgraded model must block, naming both commitments
 *   * restore -> retry must pass again, inside ten seconds
 *   * NEXT PARTICIPANT must leak nothing and need no typing
 *
 * Usage:
 *   npm run build && npm start        # or: npm run dev
 *   npm run test:e2e
 *   BASE_URL=https://your-demo.vercel.app npm run test:e2e
 *
 * Uses the locally installed Google Chrome, so there is no browser to download.
 * Each run creates a real rig and leaves its rows behind, which is intentional:
 * the data is inspectable afterwards. Clean up with
 *   delete from vdemo_events; delete from vdemo_responses; delete from vdemo_rigs;
 */

const { chromium } = require('playwright');
const fs = require('node:fs');
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const SHOTS = `${__dirname}/screenshots`;
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };

const log = (...a) => console.log(...a);
let failures = 0;
function check(name, cond, extra = '') {
  log(`${cond ? '  PASS' : '  FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
  if (!cond) failures++;
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome' });
  // Two independent contexts = two independent phones (separate localStorage).
  const ctxB = await browser.newContext(PHONE);
  const ctxA = await browser.newContext(PHONE);
  const B = await ctxB.newPage();  // provider / researcher
  const A = await ctxA.newPage();  // customer

  const errors = [];
  for (const [label, p] of [['B', B], ['A', A]]) {
    p.on('pageerror', e => errors.push(`${label} pageerror: ${e.message}`));
    p.on('console', m => { if (m.type() === 'error') errors.push(`${label} console: ${m.text()}`); });
  }

  log('\n=== SETUP: researcher creates rig ===');
  await B.goto(BASE);
  await B.getByRole('button', { name: 'Start new demo' }).click();
  await B.waitForURL(/\/rig\/[A-Z0-9]{4}\/provider/, { timeout: 20000 });
  const rig = B.url().match(/\/rig\/([A-Z0-9]{4})\//)[1];
  log(`  rig code = ${rig}`);
  await B.waitForSelector('text=Frontier Model Control');
  check('provider shows the pairing code', (await B.textContent('body')).includes(rig));

  log('\n=== SETUP: customer pairs once ===');
  await A.goto(BASE);
  await A.getByLabel('Demo code from the researcher phone').fill(rig);
  await A.getByRole('button', { name: 'Join as customer' }).click();
  await A.waitForURL(new RegExp(`/rig/${rig}/customer`), { timeout: 20000 });
  await A.waitForSelector('text=AI Payment Assistant');
  const aBody1 = await A.textContent('body');
  check('customer shows the authorized model', aBody1.includes('Frontier Model X'));
  check('customer starts with verification OFF', aBody1.includes('OFF'));

  log('\n=== PHASE 1: researcher secretly downgrades ===');
  await B.getByRole('button', { name: /Downgrade model/i }).click();
  await B.waitForSelector('text=Frontier Model Lite', { timeout: 10000 });
  check('provider now shows the downgrade', (await B.textContent('body')).includes('Not the customer-authorized model'));

  // The load-bearing assertion of the whole demo.
  await A.waitForTimeout(2500);
  const aBody2 = await A.textContent('body');
  check('CUSTOMER CANNOT SEE THE DOWNGRADE', !aBody2.includes('Frontier Model Lite'),
    aBody2.includes('Frontier Model Lite') ? 'LEAKED!' : 'still shows only Frontier Model X');

  log('\n=== PHASE 1: unverified payment must succeed anyway ===');
  await A.getByRole('button', { name: 'Pay my electricity bill' }).click();
  await A.waitForSelector('text=Confirm payment', { timeout: 10000 });
  check('payment card shows the bill amount', (await A.textContent('body')).includes('₹1,850'));

  const t0 = Date.now();
  await A.getByRole('button', { name: 'Confirm payment' }).click();
  await A.waitForSelector('text=Payment approved', { timeout: 15000 });
  log(`  tap -> approved in ${Date.now() - t0}ms`);
  const aBody3 = await A.textContent('body');
  check('payment APPROVED with verification off', aBody3.includes('Payment approved'));
  check('receipt never names the substituted model', !aBody3.includes('Frontier Model Lite'));
  check('baseline trust question auto-appeared', aBody3.includes('How comfortable would you be'));

  log('\n=== PHASE 1: participant answers baseline ===');
  await A.getByRole('button', { name: /^3\s*Neutral$/ }).click().catch(async () => {
    await A.locator('button', { hasText: 'Neutral' }).first().click();
  });
  await A.locator('button', { hasText: 'Maybe' }).first().click();
  await A.getByRole('button', { name: 'Submit' }).click();
  await A.waitForSelector('text=Thank you', { timeout: 10000 });
  check('baseline answer accepted', true);

  log('\n=== PHASE 2: verification ON, model still downgraded ===');
  const toggle = A.locator('button[aria-pressed]').filter({ hasText: 'AI verification' });
  check('toggle starts OFF', (await toggle.getAttribute('aria-pressed')) === 'false');
  const tToggle = Date.now();
  await toggle.click();
  await A.locator('button[aria-pressed="true"]').filter({ hasText: 'AI verification' })
    .waitFor({ timeout: 10000 });
  log(`  toggle responded in ${Date.now() - tToggle}ms`);
  check('verification toggled ON', (await toggle.getAttribute('aria-pressed')) === 'true');
  check('toggle feels instant (<400ms)', Date.now() - tToggle < 400, `${Date.now() - tToggle}ms`);
  await B.waitForTimeout(2500);
  check('provider mirror sees verification ON', (await B.textContent('body')).includes('ON'));

  await A.getByPlaceholder('Ask me to pay something…').fill('Pay my electricity bill');
  await A.getByRole('button', { name: 'Send' }).click();
  await A.waitForSelector('text=Confirm payment', { timeout: 10000 });

  const t1 = Date.now();
  await A.getByRole('button', { name: 'Confirm payment' }).click();
  await A.waitForSelector('text=Verification failed', { timeout: 15000 });
  const blockedMs = Date.now() - t1;
  log(`  tap -> VERIFICATION FAILED in ${blockedMs}ms`);

  const failBody = await A.textContent('body');
  check('shows VERIFICATION FAILED', failBody.includes('Verification failed'));
  check('shows PAYMENT BLOCKED', failBody.includes('Payment blocked'));
  check('names the authorized model', failBody.includes('Frontier Model X'));
  check('names the detected model', failBody.includes('Frontier Model Lite'));
  check('shows expected commitment', failBody.includes('0x83ab...7f21'));
  check('shows reported commitment', failBody.includes('0x91cd...42aa'));
  check('shows the mismatch cross', failBody.includes('✕'));
  check('states the amount was NOT sent', failBody.includes('was NOT sent'));
  check('carries the simulation label', failBody.toLowerCase().includes('simulated'));
  await A.screenshot({ path: `${SHOTS}/shot-blocked.png`, fullPage: true });

  log('\n=== "Why was my payment blocked?" ===');
  await A.getByRole('button', { name: /Why was my payment blocked/i }).click();
  await A.waitForSelector('text="Your payment was protected."', { timeout: 10000 });
  const whyBody = await A.textContent('body');
  check('explainer reframes as protection', whyBody.includes('Your payment was protected'));
  check('explainer states the production caveat', whyBody.includes('would be backed by cryptographic proofs'));
  await A.screenshot({ path: `${SHOTS}/shot-why.png`, fullPage: true });
  await A.getByRole('button', { name: 'Close' }).last().click();

  log('\n=== Verification details ===');
  await A.getByRole('button', { name: 'View verification details' }).last().click();
  await A.waitForSelector('text=Model identity', { timeout: 10000 });
  const detBody = await A.textContent('body');
  check('details show MISMATCH', detBody.includes('MISMATCH'));
  check('details show a nonce', /Nonce/.test(detBody));
  check('details carry the narrow-claim note', detBody.includes('does not assess whether the model is safe'));
  await A.screenshot({ path: `${SHOTS}/shot-details.png`, fullPage: true });
  await A.getByRole('button', { name: 'Close' }).last().click();

  log('\n=== THE RECOVERY: restore -> retry must pass ===');
  await A.getByRole('button', { name: /Back to assistant/i }).click();
  const t2 = Date.now();
  await B.getByRole('button', { name: /Restore verified model/i }).click();
  await B.waitForSelector('text=Verified model', { timeout: 10000 });

  await A.getByPlaceholder('Ask me to pay something…').fill('Pay my electricity bill');
  await A.getByRole('button', { name: 'Send' }).click();
  await A.waitForSelector('text=Confirm payment', { timeout: 10000 });
  await A.getByRole('button', { name: 'Confirm payment' }).click();
  await A.waitForSelector('text=Model verified', { timeout: 15000 });
  const recoveryMs = Date.now() - t2;
  log(`  restore -> verified & approved in ${recoveryMs}ms`);
  const okBody = await A.textContent('body');
  check('shows MODEL VERIFIED', okBody.includes('Model verified'));
  check('shows Execution VALID', okBody.includes('VALID'));
  check('payment approved after verification', okBody.includes('Payment approved'));
  check('full blocked->approved cycle under 10s', recoveryMs < 10000, `${recoveryMs}ms`);
  await A.screenshot({ path: `${SHOTS}/shot-verified.png`, fullPage: true });
  await B.screenshot({ path: `${SHOTS}/shot-provider.png`, fullPage: true });

  log('\n=== Researcher asks phase-2 trust questions ===');
  await B.getByRole('button', { name: /Researcher controls/i }).click();
  await B.getByRole('button', { name: /Ask trust questions/i }).click();
  await A.waitForSelector('text=How comfortable would you NOW be', { timeout: 10000 });
  check('phase-2 survey pushed to customer phone', true);
  await A.locator('button', { hasText: 'Very comfortable' }).first().click();
  await A.locator('button', { hasText: 'Yes' }).first().click();
  await A.getByLabel('What would make you trust an AI agent with your money?')
    .fill('Seeing the model check run every single time.');
  await A.getByRole('button', { name: 'Submit' }).click();
  await A.waitForSelector('text=Thank you', { timeout: 10000 });
  check('phase-2 answer accepted', true);

  log('\n=== NEXT PARTICIPANT: zero-typing handoff ===');
  const t3 = Date.now();
  await B.getByRole('button', { name: /Next participant/i }).click();
  await A.waitForSelector('text=Ready for next participant', { timeout: 10000 });
  log(`  customer phone auto-reset in ${Date.now() - t3}ms (no typing)`);
  await A.screenshot({ path: `${SHOTS}/shot-handoff.png`, fullPage: true });
  await A.waitForSelector('text=What would you like to pay', { timeout: 10000 });
  const resetBody = await A.textContent('body');
  const handoffMs = Date.now() - t3;
  check('conversation cleared', !resetBody.includes('Payment approved') && !resetBody.includes('Payment blocked'));
  check('trust questions cleared', !resetBody.includes('How comfortable'));
  check('verification reset to OFF', resetBody.includes('OFF'));
  check('model reset to Frontier Model X', resetBody.includes('Frontier Model X'));
  check('no leaked downgrade after reset', !resetBody.includes('Frontier Model Lite'));
  check('handoff completed under 5s', handoffMs < 5000, `${handoffMs}ms`);
  check('participant counter advanced', (await B.textContent('body')).includes('P002'));

  log('\n=== Runtime errors ===');
  check('no page or console errors', errors.length === 0, errors.slice(0, 5).join(' | '));

  log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}  (rig ${rig})`);
  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
})().catch(e => { console.error('HARNESS ERROR:', e.message); process.exit(2); });
