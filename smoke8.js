const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/cakeparty/dist/index.html'); await p.waitForTimeout(500);
  await p.evaluate(() => document.getElementById('btn-start-menu').click()); await p.fill('#name-in', 'ฟ้า'); await p.click('#btn-solo'); await p.waitForTimeout(300);
  await p.click('#btn-start');
  const marks = [1.5, 5, 8.0, 12, 21.6, 22.9, 24, 26]; let t0 = Date.now();
  for (const m of marks) {
    const wait = m * 1000 - (Date.now() - t0); if (wait > 0) await p.waitForTimeout(wait);
    await p.screenshot({ path: '/tmp/claude-0/v_' + m + '.png' });
  }
  console.log('phase', await p.evaluate(() => __cake.game.phase), 'errors:', JSON.stringify(errs));
  await b.close();
})();
