const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/cakeparty/dist/index.html'); await p.waitForTimeout(500);
  await p.evaluate(() => document.getElementById('btn-start-menu').click()); await p.fill('#name-in', 'ฟ้า'); await p.click('#btn-solo'); await p.waitForTimeout(300);
  await p.click('#btn-start'); await p.waitForTimeout(800); await p.click('#btn-skip'); await p.waitForTimeout(1200);
  await p.evaluate(() => { const g = __cake.room.game, s = g.order[0]; g.items[s] = ['double', 'lock', 'freeze', 'ticket']; g.coins[s] = 30; g.onChange(); });
  await p.waitForTimeout(600); await p.screenshot({ path: '/tmp/claude-0/x_items.png' });
  await p.evaluate(() => { const g = __cake.room.game; g.items[g.order[0]] = []; g.shop = { slot: g.order[0], stock: ['giant', 'swap', 'steal', 'slip', 'magnet', 'reverse'] }; g.phase = 'shop'; g.onChange(); });
  await p.waitForTimeout(600); await p.screenshot({ path: '/tmp/claude-0/x_shop.png' });
  console.log('errors:', JSON.stringify(errs)); await b.close();
})();
