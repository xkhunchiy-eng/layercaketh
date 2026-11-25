const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/cakeparty/dist/index.html');
  await p.waitForTimeout(600);
  await p.screenshot({ path: '/tmp/claude-0/u_menu.png' });
  await p.evaluate(() => document.getElementById('btn-start-menu').click()); await p.fill('#name-in', 'ฟ้า'); await p.click('#btn-solo'); await p.waitForTimeout(400);
  await p.screenshot({ path: '/tmp/claude-0/u_lobby.png' });
  await p.click('#btn-start'); await p.waitForTimeout(1200);
  await p.screenshot({ path: '/tmp/claude-0/u_intro1.png' });
  await p.waitForTimeout(3500);
  await p.screenshot({ path: '/tmp/claude-0/u_intro2.png' });
  await p.waitForTimeout(5000);
  await p.screenshot({ path: '/tmp/claude-0/u_intro3.png' });
  await p.click('#btn-skip'); await p.waitForTimeout(1500);
  console.log('phase', await p.evaluate(() => __cake.game.phase));
  // ย้ายไปด้านหลังเค้ก ช่อง 5, 11, 17, 22
  for (const pos of [5, 11, 17, 22]) {
    await p.evaluate(pos => { const g = __cake.room.game; g.pos[g.order[0]] = pos; g.onChange(); __cake.idx[g.order[0]] = pos; }, pos);
    await p.waitForTimeout(1800);
    await p.screenshot({ path: '/tmp/claude-0/u_follow' + pos + '.png' });
  }
  await p.keyboard.press('KeyC'); await p.waitForTimeout(1500); await p.screenshot({ path: '/tmp/claude-0/u_orbit.png' });
  console.log('errors:', JSON.stringify(errs));
  await b.close();
})();
