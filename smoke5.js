const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/cakeparty/dist/index.html');
  await p.evaluate(() => document.getElementById('btn-start-menu').click()); await p.fill('#name-in', 'ฟ้า'); await p.click('#btn-solo'); await p.click('#btn-start'); await p.waitForTimeout(300);
  for (const id of ['wall', 'redlight', 'catcher', 'sumo']) {
    await p.evaluate(id => { const g = __cake.room.game; g.lastMg = null; g.minis = {}; g.sharedDefs = { [id]: CakeShared.GAMES[id] }; g.phase = 'roll'; g._miniStub(); g.order.forEach(o => g.mgReady(o)); }, id);
    await p.waitForTimeout(3400);
    await p.keyboard.down('KeyD'); await p.waitForTimeout(1500);
    await p.screenshot({ path: '/tmp/claude-0/s_' + id + '.png' });
    await p.keyboard.up('KeyD');
    console.log(id, await p.evaluate(() => document.querySelector('.screen.on').id), await p.textContent('#mgtime'));
    await p.evaluate(() => { const g = __cake.room.game; if (g.sim) g.sim.done = true; g.simEnd = 0.01; });
    await p.waitForTimeout(500);
    console.log('  after:', await p.evaluate(() => document.querySelector('.screen.on').id), (await p.textContent('#gmsg')).slice(0, 50));
    await p.evaluate(() => { const g = __cake.room.game; g.phase = 'roll'; g.timer = 25; g.onChange(); });
  }
  console.log('errors:', JSON.stringify(errs));
  await b.close();
})();
