/**
 * Two-phone behavioural suite.
 *
 * Drives two independent browser contexts — two real phones, separate storage —
 * through the whole demo script, including the parts that are easy to get
 * subtly wrong and impossible to notice by hand:
 *
 *   * no pairing step at all; each phone just picks a role
 *   * the customer phone must NOT reveal the downgrade
 *   * an unchecked payment must read "completed", never "approved", and must
 *     list what it cannot tell you
 *   * a checked payment against a swapped model must be stopped, in plain prose
 *   * the suggestions must still work after a payment has completed
 *   * the survey must NOT appear on its own after the unchecked payment
 *   * NEXT PARTICIPANT must start a new record and leak nothing
 *
 * Usage:
 *   npm run build && npm start        # or: npm run dev
 *   npm run test:e2e
 *   BASE_URL=https://your-demo.vercel.app npm run test:e2e
 *
 * Uses the locally installed Google Chrome, so there is no browser to download.
 * Each run leaves its rows behind, which is intentional — the data is
 * inspectable afterwards. Clean up with
 *   delete from vdemo_events; delete from vdemo_responses; delete from vdemo_rigs;
 */

const { chromium } = require('playwright');
const fs = require('node:fs');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const SHOTS = `${__dirname}/screenshots`;
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };

const OPUS = 'Claude Opus 5';
const HAIKU = 'Claude Haiku 4.5';

const log = (...a) => console.log(...a);
let failures = 0;
function check(name, cond, extra = '') {
  log(`${cond ? '  PASS' : '  FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
  if (!cond) failures++;
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome' });
  const ctxB = await browser.newContext(PHONE);
  const ctxA = await browser.newContext(PHONE);
  const B = await ctxB.newPage(); // provider / researcher
  const A = await ctxA.newPage(); // customer

  const errors = [];
  for (const [label, p] of [['B', B], ['A', A]]) {
    p.on('pageerror', (e) => errors.push(`${label} pageerror: ${e.message}`));
    p.on('console', (m) => { if (m.type() === 'error') errors.push(`${label} console: ${m.text()}`); });
  }

  log('\n=== SETUP: pick a role on each phone, no codes ===');
  const t0 = Date.now();
  await B.goto(BASE);
  await B.getByRole('button', { name: /Model provider/i }).click();
  await B.waitForURL(/\/provider/, { timeout: 20000 });
  await B.waitForSelector('text=Model serving control', { timeout: 20000 });

  // Normalise onto a FRESH record. The rig is a singleton that outlives any
  // single run, so a previous failure could leave it downgraded or mid-survey.
  // "Next participant" rather than "Reset demo" specifically because reset keeps
  // the same record — starting there would let this run's first survey update a
  // previous run's row instead of inserting, which is correct behaviour but
  // makes the response-count assertions below meaningless.
  await B.getByRole('button', { name: /Researcher controls/i }).click();
  await B.getByRole('button', { name: /Next participant/i }).click();
  await B.getByText(/The model the customer approved/i).waitFor({ timeout: 15000 });
  await B.waitForTimeout(1200);
  const baselineParticipant = Number(
    (await B.textContent('body')).match(/P(\d{3})/)?.[1] ?? '0'
  );
  const savedMatch = (await B.textContent('body')).match(/(\d+) response/);
  const baselineSaved = Number(savedMatch?.[1] ?? '0');
  await B.getByRole('button', { name: /Researcher controls/i }).click();
  log(`  normalised (participant P${String(baselineParticipant).padStart(3, '0')}, ${baselineSaved} responses on file)`);

  await A.goto(BASE);
  await A.getByRole('button', { name: /^Customer/i }).click();
  await A.waitForURL(/\/customer/, { timeout: 20000 });
  await A.waitForSelector('text=AI Payment Assistant', { timeout: 20000 });
  log(`  both phones live in ${Date.now() - t0}ms, zero codes typed`);

  const aStart = await A.textContent('body');
  check('customer shows the chosen model', aStart.includes(OPUS));
  check('verification starts OFF', (await A.locator('button[aria-pressed]').first().getAttribute('aria-pressed')) === 'false');
  check('OFF state says nobody is checking', /Nobody is checking which model/i.test(aStart));
  check('no "research prototype" label anywhere', !/research prototype/i.test(aStart));
  check('no "simulated" label anywhere', !/simulated/i.test(aStart));

  log('\n=== PHASE 1: researcher silently downgrades ===');
  await B.getByRole('button', { name: new RegExp(`Downgrade to ${HAIKU}`, 'i') }).click();
  await B.getByText(/Not the model the customer approved/i).waitFor({ timeout: 10000 });
  const bAfter = await B.textContent('body');
  check('provider shows the downgrade', /Not the model the customer approved/i.test(bAfter));
  check('provider names the cheaper tier', /Fastest, cheapest/i.test(bAfter));

  await A.waitForTimeout(2500);
  const aAfterSwap = await A.textContent('body');
  check('CUSTOMER CANNOT SEE THE DOWNGRADE', !aAfterSwap.includes(HAIKU),
    aAfterSwap.includes(HAIKU) ? 'LEAKED!' : `still shows only ${OPUS}`);

  log('\n=== PHASE 1: unchecked payment goes through anyway ===');
  await A.getByRole('button', { name: 'Pay my electricity bill' }).click();
  await A.waitForSelector('text=Confirm payment', { timeout: 10000 });
  const card = await A.textContent('body');
  check('payment card shows the amount', card.includes('₹1,850'));
  check('card warns nobody will check, before paying', /Nobody will check which model/i.test(card));

  const t1 = Date.now();
  await A.getByRole('button', { name: /Pay ₹1,850/i }).click();
  await A.waitForSelector('text=Payment completed', { timeout: 15000 });
  log(`  tap -> completed in ${Date.now() - t1}ms`);

  const unverified = await A.textContent('body');
  check('says "Payment completed", like a UPI app', unverified.includes('Payment completed'));
  check('does NOT say "approved"', !/payment approved/i.test(unverified));
  check('does NOT say "verified"', !/payment verified/i.test(unverified));
  check('gives a reference number', /SIMULATED-UPI-/.test(unverified));
  check('lists what it cannot tell you', /What this receipt cannot tell you/i.test(unverified));
  check('names the unknown model', /Which AI model actually handled this payment/i.test(unverified));
  check('says it is the provider’s word', /provider.s word/i.test(unverified));
  check('receipt never names the substituted model', !unverified.includes(HAIKU));
  check('survey does NOT auto-appear after unchecked payment', !/how comfortable were you/i.test(unverified));
  await A.screenshot({ path: `${SHOTS}/shot-unchecked.png`, fullPage: true });

  log('\n=== BUG FIX: can still start another payment afterwards ===');
  await A.getByRole('button', { name: 'Pay my phone bill' }).click();
  await A.waitForSelector('text=Mobile Postpaid', { timeout: 10000 });
  check('suggestions still work after a completed payment', (await A.textContent('body')).includes('₹799'));
  await A.getByPlaceholder('Ask me to pay something…').fill('Pay my electricity bill');
  await A.getByRole('button', { name: 'Send', exact: true }).click();
  await A.waitForSelector('text=Confirm payment', { timeout: 10000 });
  check('free-text input still works too', true);

  log('\n=== PHASE 2: participant turns the check on ===');
  const toggle = A.locator('button[aria-pressed]').first();
  const tToggle = Date.now();
  await toggle.click();
  await A.locator('button[aria-pressed="true"]').first().waitFor({ timeout: 10000 });
  const toggleMs = Date.now() - tToggle;
  log(`  toggle responded in ${toggleMs}ms`);
  check('toggle feels instant (<400ms)', toggleMs < 400, `${toggleMs}ms`);
  check('ON state promises a check', /checked before any money moves/i.test(await A.textContent('body')));

  await A.getByRole('button', { name: /Pay ₹1,850/i }).last().click();
  const t2 = Date.now();
  await A.waitForSelector('text=Payment stopped', { timeout: 15000 });
  log(`  tap -> STOPPED in ${Date.now() - t2}ms`);

  const stopped = await A.textContent('body');
  check('headline is plain: "Payment stopped"', stopped.includes('Payment stopped'));
  check('plain-prose caption, not jargon', /being served a cheaper model/i.test(stopped));
  check('does NOT say "model mismatch"', !/model mismatch/i.test(stopped));
  check('does NOT say "verification failed"', !/verification failed/i.test(stopped));
  check('names what you approved', stopped.includes(OPUS));
  check('names what actually ran', stopped.includes(HAIKU));
  check('says the money is still yours', /still in your account/i.test(stopped));
  check('shows both fingerprints', stopped.includes('0x83ab...7f21') && stopped.includes('0x91cd...42aa'));
  check('labels the two ID rows distinctly', /Approved model ID/i.test(stopped) && /Model ID that ran/i.test(stopped));

  // Regression guard: a colour token named `base` once collided with Tailwind's
  // `text-base` font-size utility, which silently painted this value in the
  // canvas colour. Assert the rendered pixels, not the class list.
  const sameModel = await A.locator('dd').filter({ hasText: /^No/ }).first().evaluate((el) => {
    const inner = el.firstElementChild ?? el;
    return { outer: getComputedStyle(el).color, inner: getComputedStyle(inner).color };
  });
  check('verdict value is actually rendered in rose',
    sameModel.inner === 'rgb(225, 29, 72)' && sameModel.outer === 'rgb(225, 29, 72)',
    `outer=${sameModel.outer} inner=${sameModel.inner}`);
  await A.screenshot({ path: `${SHOTS}/shot-stopped.png`, fullPage: true });

  log('\n=== "Why was my payment stopped?" ===');
  await A.getByRole('button', { name: /Why was my payment stopped/i }).click();
  await A.waitForSelector('text=Your money stayed put.', { timeout: 10000 });
  const why = await A.textContent('body');
  check('reframes as protection', /Your money stayed put/i.test(why));
  check('names the counterfactual', /would simply have gone through/i.test(why));
  await A.screenshot({ path: `${SHOTS}/shot-why.png`, fullPage: true });
  await A.getByRole('button', { name: 'Close' }).last().click();

  log('\n=== RECOVERY: restore -> pay again -> verified ===');
  await A.getByRole('button', { name: /Back to assistant/i }).click();
  const t3 = Date.now();
  await B.getByRole('button', { name: new RegExp(`Restore ${OPUS}`, 'i') }).click();
  await B.getByText(/The model the customer approved/i).waitFor({ timeout: 10000 });

  await A.getByRole('button', { name: 'Pay my electricity bill' }).click();
  await A.waitForSelector('text=Confirm payment', { timeout: 10000 });
  await A.getByRole('button', { name: /Pay ₹1,850/i }).last().click();
  await A.waitForSelector('text=Payment verified', { timeout: 15000 });
  const recoveryMs = Date.now() - t3;
  log(`  restore -> verified in ${recoveryMs}ms`);

  const verified = await A.textContent('body');
  check('says "Payment verified"', verified.includes('Payment verified'));
  check('states what was established', /Checked before the money moved/i.test(verified));
  check('names the model that ran it', /is the model that actually ran this/i.test(verified));
  check('states the counterfactual', /would have been stopped/i.test(verified));
  check('stopped -> verified under 10s', recoveryMs < 10000, `${recoveryMs}ms`);
  await A.screenshot({ path: `${SHOTS}/shot-verified.png`, fullPage: true });
  await B.screenshot({ path: `${SHOTS}/shot-provider.png`, fullPage: true });

  log('\n=== SURVEY: researcher-triggered, after BOTH conditions ===');
  await B.getByRole('button', { name: /Researcher controls/i }).click();
  await B.getByRole('button', { name: /Ask the questions/i }).click();
  await B.getByRole('button', { name: /Hide questions/i }).waitFor({ timeout: 10000 });
  await A.waitForSelector('text=Thinking back to the first payment', { timeout: 10000 });
  const survey = await A.textContent('body');
  check('asks comfort WITHOUT the check', /Thinking back to the first payment/i.test(survey));
  check('survey intro is not shouted in caps', /You just saw the same payment two ways/.test(survey));
  check('asks comfort WITH the check', /And with the check switched on/i.test(survey));
  check('asks spend limit without', /With no checking, what is the most/i.test(survey));
  check('asks spend limit with', /With the check switched on, what is the most/i.test(survey));
  check('asks whether they noticed', /did you have any idea a different model/i.test(survey));
  check('asks which half mattered', /Which part mattered more/i.test(survey));
  check('asks whether they would switch', /Would you move to a provider/i.test(survey));
  check('labels the two conditions', /Not checked/i.test(survey) && /Checked/i.test(survey));

  // A tall card scrolled to its bottom would hand them the submit button first.
  await A.waitForTimeout(900);
  const firstQVisible = await A.getByText(/Thinking back to the first payment/i).first().isVisible();
  const inViewport = await A.getByText(/Thinking back to the first payment/i).first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.top >= 0 && r.top < window.innerHeight * 0.75;
  });
  check('first question is on screen, not scrolled past', firstQVisible && inViewport);
  await A.screenshot({ path: `${SHOTS}/shot-survey.png`, fullPage: true });

  // Answer it the way a convinced participant would.
  const scales = A.locator('fieldset').filter({ hasText: 'Thinking back to the first payment' });
  await scales.getByRole('button', { name: /^2 —/ }).click();
  await A.locator('fieldset').filter({ hasText: 'And with the check switched on' })
    .getByRole('button', { name: /^5 —/ }).click();
  await A.locator('fieldset').filter({ hasText: 'With no checking, what is the most' })
    .getByRole('button', { name: 'Nothing' }).click();
  await A.locator('fieldset').filter({ hasText: 'With the check switched on, what is the most' })
    .getByRole('button', { name: 'Up to ₹50,000' }).click();
  await A.locator('fieldset').filter({ hasText: 'did you have any idea' })
    .getByRole('button', { name: 'No idea' }).click();
  await A.locator('fieldset').filter({ hasText: 'Which part mattered more' })
    .getByRole('button', { name: /That I could see which model ran/i }).click();
  await A.locator('fieldset').filter({ hasText: 'Would you move to a provider' })
    .getByRole('button', { name: 'Yes' }).click();
  await A.getByLabel('What would make you trust an AI agent with your money?')
    .fill('Knowing the check runs every single time.');
  await A.getByRole('button', { name: 'Submit' }).click();
  await A.waitForSelector('text=Saved — thank you.', { timeout: 10000 });
  check('survey saved to the backend', true);

  await B.waitForTimeout(2000);
  const afterFirst = Number((await B.textContent('body')).match(/(\d+) response/)?.[1] ?? '-1');
  check('researcher panel confirms it reached the backend',
    afterFirst === baselineSaved + 1, `${baselineSaved} -> ${afterFirst}`);

  log('\n=== NEXT PARTICIPANT: new record, zero typing ===');
  const t4 = Date.now();
  await B.getByRole('button', { name: /Next participant/i }).click();
  await A.waitForSelector('text=Ready for the next person', { timeout: 10000 });
  log(`  customer phone auto-reset in ${Date.now() - t4}ms`);
  await A.waitForSelector('text=What would you like to pay', { timeout: 10000 });
  const reset = await A.textContent('body');
  const handoffMs = Date.now() - t4;
  check('conversation cleared', !/Payment completed|Payment verified|Payment stopped/.test(reset));
  check('questions cleared', !/Thinking back to the first payment/i.test(reset));
  check('verification back to OFF', (await A.locator('button[aria-pressed]').first().getAttribute('aria-pressed')) === 'false');
  check(`model back to ${OPUS}`, reset.includes(OPUS));
  check('no leaked downgrade after reset', !reset.includes(HAIKU));
  check('handoff under 5s', handoffMs < 5000, `${handoffMs}ms`);
  const nowParticipant = Number((await B.textContent('body')).match(/P(\d{3})/)?.[1] ?? '0');
  check('participant counter advanced by one', nowParticipant === baselineParticipant + 1,
    `P${baselineParticipant} -> P${nowParticipant}`);

  // The isolation claim that actually matters for the research data.
  await B.getByRole('button', { name: /Ask the questions/i }).click();
  await A.waitForSelector('text=Thinking back to the first payment', { timeout: 10000 });
  await A.locator('fieldset').filter({ hasText: 'And with the check switched on' })
    .getByRole('button', { name: /^4 —/ }).click();
  await A.getByRole('button', { name: 'Submit' }).click();
  await A.waitForSelector('text=Saved — thank you.', { timeout: 10000 });
  await B.waitForTimeout(2000);
  const afterSecond = Number((await B.textContent('body')).match(/(\d+) response/)?.[1] ?? '-1');
  check('second participant gets their OWN row, not an overwrite',
    afterSecond === baselineSaved + 2, `${baselineSaved} -> ${afterSecond}`);

  log('\n=== Runtime errors ===');
  check('no page or console errors', errors.length === 0, errors.slice(0, 5).join(' | '));

  log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error('HARNESS ERROR:', e.message); process.exit(2); });
