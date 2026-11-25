const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/cakeparty/dist/index.html'); await p.waitForTimeout(1000);
  await p.screenshot({ path: '/tmp/claude-0/s_1.png' });
  await p.evaluate(() => document.getElementById('btn-solo2').click()); await p.waitForTimeout(500);
  const lobby = await p.evaluate(() => document.getElementById('screen-lobby').classList.contains('on'));
  await p.click('#btn-start'); await p.waitForTimeout(1500);
  const game = await p.evaluate(() => document.getElementById('screen-game').classList.contains('on'));
  console.log('lobby', lobby, 'game', game, 'errors:', JSON.stringify(errs)); await b.close();
})();
