const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/cakeparty/dist/index.html');
  await p.evaluate(() => document.getElementById('btn-start-menu').click()); await p.fill('#name-in', 'ฟ้า'); await p.click('#btn-solo'); await p.click('#btn-start');
  await p.waitForTimeout(300);
  await p.evaluate(() => { const g = __cake.room.game; g.items[g.order[0]] = ['double', 'slip', 'magnet']; g.layout[2] = 'shop'; g.coins[0] = 60; g.pos[0] = 0; g.onChange(); });
  await p.waitForTimeout(300);
  await p.screenshot({ path: '/tmp/claude-0/h1.png' });
  await p.click('.slot.usable >> nth=0'); await p.waitForTimeout(200);   // เต๋าคู่
  await p.evaluate(() => { const g = __cake.room.game; g.rng = () => 0.0; });  // เต๋า 1+1=2 -> ช่อง 2 ร้านค้า
  await p.keyboard.press('Space'); await p.waitForTimeout(2500);
  await p.screenshot({ path: '/tmp/claude-0/h2.png' });
  console.log(await p.textContent('#gmsg'));
  const btns = await p.$$('#gshop .sitem button'); console.log('shop buttons', btns.length);
  if (btns.length) await btns[0].click();
  await p.waitForTimeout(300); await p.screenshot({ path: '/tmp/claude-0/h3.png' });
  console.log(await p.textContent('#gitems'));
  console.log('errors:', JSON.stringify(errs));
  await b.close();
})();
