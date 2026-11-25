const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/cakeparty/dist/index.html'); await p.waitForTimeout(600);
  await p.evaluate(() => document.getElementById('skin-1').click());
  await p.screenshot({ path: '/tmp/claude-0/z_menu.png' });
  await p.evaluate(() => document.getElementById('btn-solo2').click()); await p.waitForTimeout(400);
  await p.click('#btn-start'); await p.waitForTimeout(600); await p.click('#btn-skip'); await p.waitForTimeout(1500);
  await p.evaluate(() => { const g = __cake.room.game; g.items[g.order[g.turn]] = ['double', 'double', 'slow']; g.onChange(); });
  await p.waitForTimeout(300); await p.mouse.move(120, 700);
  await p.screenshot({ path: '/tmp/claude-0/z_cards.png' });
  await p.hover('.card:nth-child(2)'); await p.waitForTimeout(200);
  await p.screenshot({ path: '/tmp/claude-0/z_tip.png' });
  // find a coin tile and place player right before it
  const info = await p.evaluate(() => { const g = __cake.room.game; const i = g.layout.findIndex((t, k) => k > 3 && t === 'coin'); const m = g.layout.findIndex((t, k) => k > 3 && t === 'mystery'); return { i, m }; });
  await p.evaluate(i => { const g = __cake.room.game; g.pos[g.order[g.turn]] = i - 1; g.rollOverride = 1; }, info.i);
  await p.evaluate(() => { const g = __cake.room.game; g.rng = (() => { let s = 0; return () => 0.0; })(); });
  await p.waitForTimeout(100); await p.click('.dieCard'); 
  for (let k = 0; k < 12; k++) { await p.waitForTimeout(150); await p.screenshot({ path: '/tmp/claude-0/z_roll' + k + '.png' }); }
  console.log(JSON.stringify(info), 'errors:', JSON.stringify(errs)); await b.close();
})();
