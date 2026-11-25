const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/cakeparty/dist/index.html'); await p.waitForTimeout(600);
  await p.evaluate(() => document.getElementById('btn-solo2').click()); await p.waitForTimeout(400);
  await p.click('#btn-start'); await p.waitForTimeout(600); await p.click('#btn-skip'); await p.waitForTimeout(1200);
  const ids = ['slice', 'sumo'];
  for (const id of ids) {
    await p.evaluate(id => { const g = __cake.room.game; g.lastMg = null; const sh = !!CakeShared.GAMES[id] && !CakeMini.GAMES[id]; g.minis = sh ? {} : { [id]: CakeMini.GAMES[id] }; g.sharedDefs = sh ? { [id]: CakeShared.GAMES[id] } : {}; g.phase = 'roll'; g._miniStub(); }, id);
    await p.waitForTimeout(1200); await p.mouse.click(600, 300);
    await p.screenshot({ path: '/tmp/claude-0/m_prep_' + id + '.png' });
    await p.click('#btn-mgready'); await p.waitForTimeout(3000); await p.keyboard.down('d'); await p.waitForTimeout(800); await p.screenshot({ path: '/tmp/claude-0/m_play_' + id + '.png' }); await p.keyboard.up('d'); await p.waitForTimeout(600);
    await p.evaluate(() => { const g = __cake.room.game; g.mgScore(0, 25, true); if (g.sim) { g.sim.done = true; g.simEnd = 0.01; } }); await p.waitForTimeout(1500);
    await p.screenshot({ path: '/tmp/claude-0/m_res_' + id + '.png' });
    await p.waitForTimeout(6000);
  }
  console.log('errors:', JSON.stringify(errs)); await b.close();
})();
