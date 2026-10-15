// Public, unauthenticated captures for the Toss Place application documents.
// Only GET page loads; no form submission, no login.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(os.tmpdir(), 'fullstack-review-tools', 'node_modules', 'playwright'));
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'assets', 'portfolio', 'tossplace');
const capturedOn = new Date().toISOString().slice(0, 10);

(async () => {
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('https://bslawwin.co.kr/cases', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
    const links = await page.locator('a[href*="/cases/"]').evaluateAll(items => [...new Set(items.map(a => a.href).filter(h => /\/cases\/\d+/.test(h)))]);
    // The summary and FAQ appear only on cases whose FAQ was approved, so try a few.
    for (const href of links.slice(0, 12)) {
      const response = await page.goto(href, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
      const summary = page.locator('aside[aria-label="핵심 요약"]');
      const faq = page.locator('#case-faq');
      if (!(await summary.count()) || !(await faq.count())) continue;
      await page.evaluate(async () => { await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 3000))]); });
      // The sticky consultation bar and floating buttons would cover the captured blocks.
      await page.evaluate(() => {
        for (const el of document.querySelectorAll('body *')) {
          const position = getComputedStyle(el).position;
          if (position === 'fixed' || position === 'sticky') el.style.setProperty('display', 'none', 'important');
        }
      });
      await summary.first().scrollIntoViewIfNeeded();
      await summary.first().screenshot({ path: path.join(dir, 'case-summary.png') });
      await faq.first().scrollIntoViewIfNeeded();
      await faq.first().screenshot({ path: path.join(dir, 'case-faq.png') });
      results.push({ id: 'case-summary-faq', url: href, title: await page.title(), status: response?.status(), capturedOn, viewport: { width: 1280, height: 900, deviceScaleFactor: 2 }, capture: 'Public page, unauthenticated browser, no form submission' });
      break;
    }
    if (!results.length) throw new Error('No public case with summary and FAQ found in the first list page');
    await context.close();
    fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
