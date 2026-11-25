const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/cakeparty/dist/index.html');
  await p.evaluate(() => document.getElementById('btn-start-menu').click()); await p.fill('#name-in', 'ฟ้า'); await p.click('#btn-solo'); await p.click('#btn-start'); await p.waitForTimeout(300);
  for (const id of ['mash', 'slice', 'stack', 'mole', 'maze', 'reaction']) {
    await p.evaluate(id => { const g = __cake.room.game; g.lastMg = null; g.minis = { [id]: CakeMini.GAMES[id] }; g.phase = 'roll'; g._miniStub(); g.order.forEach(o => g.mgReady(o)); }, id);
    await p.waitForTimeout(3300);
    for (let i = 0; i < 12; i++) { await p.keyboard.press(['Space', 'KeyQ', 'ArrowUp', 'KeyS'][i % 4]); await p.waitForTimeout(120); }
    await p.screenshot({ path: '/tmp/claude-0/m_' + id + '.png' });
    console.log(id, 'screen on:', await p.evaluate(() => document.querySelector('.screen.on').id), await p.textContent('#mgboard'));
    await p.evaluate(() => { __cake.room.game.mgScore(0, 5, true); });   // จบทันที
    await p.waitForTimeout(300);
    console.log('  after:', await p.evaluate(() => document.querySelector('.screen.on').id), (await p.textContent('#gmsg')).slice(0, 60));
    await p.evaluate(() => { const g = __cake.room.game; g.phase = 'roll'; g.timer = 25; g.onChange(); });
  }
  console.log('errors:', JSON.stringify(errs));
  await b.close();
})();
