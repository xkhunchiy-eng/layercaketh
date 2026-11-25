const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/cakeparty/dist/index.html#tag'); await p.waitForTimeout(1200);
  await p.evaluate(() => { const s = window.__cake; });
  // two-player sim to check the 'it' tint
  await p.evaluate(() => { window.__tagfake = true; });
  console.log('errors', JSON.stringify(errs)); await b.close();
})();
