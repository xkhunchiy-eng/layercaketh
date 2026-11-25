const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/cakeparty/dist/index.html');
  await p.evaluate(() => document.getElementById('btn-start-menu').click()); await p.fill('#name-in', 'ฟ้า'); await p.click('#btn-solo'); await p.click('#btn-start'); await p.waitForTimeout(300);
  const solo = ['order', 'addmath', 'memory', 'holdbar', 'sweetveg'], shared = ['coinrush', 'tag', 'floor', 'chairs'];
  for (const id of solo.concat(shared)) {
    const isShared = shared.includes(id);
    await p.evaluate(([id, isShared]) => { const g = __cake.room.game; g.lastMg = null; g.minis = isShared ? {} : { [id]: CakeMini.GAMES[id] }; g.sharedDefs = isShared ? { [id]: CakeShared.GAMES[id] } : {}; g.phase = 'roll'; g._miniStub(); g.order.forEach(o => g.mgReady(o)); }, [id, isShared]);
    await p.waitForTimeout(3300);
    await p.mouse.click(550, 450); await p.keyboard.down('KeyA'); await p.keyboard.press('Space'); await p.keyboard.press('Digit1'); await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(900); await p.keyboard.up('KeyA');
    await p.screenshot({ path: '/tmp/claude-0/n_' + id + '.png' });
    console.log(id, await p.evaluate(() => document.querySelector('.screen.on').id), await p.textContent('#mgtime'));
    await p.evaluate(() => { __cake.room.game.mgScore(0, 5, true); const g = __cake.room.game; if (g.sim) { g.sim.done = true; g.simEnd = 0.01; } });
    await p.waitForTimeout(400);
    await p.evaluate(() => { const g = __cake.room.game; g.phase = 'roll'; g.timer = 25; g.onChange(); });
  }
  console.log('errors:', JSON.stringify(errs));
  await b.close();
})();
