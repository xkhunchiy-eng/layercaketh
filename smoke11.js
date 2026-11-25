const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/cakeparty/dist/index.html'); await p.waitForTimeout(1500);
  await p.screenshot({ path: '/tmp/claude-0/y_start.png' });
  await p.evaluate(() => document.getElementById('btn-start-menu').click()); await p.mouse.move(150, 300); await p.waitForTimeout(1500);
  await p.screenshot({ path: '/tmp/claude-0/y_main1.png' });
  await p.mouse.move(1100, 100); await p.waitForTimeout(1200);
  await p.screenshot({ path: '/tmp/claude-0/y_main2.png' });
  console.log('errors:', JSON.stringify(errs)); await b.close();
})();
