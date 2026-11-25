const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/cakeparty/dist/index.html'); await p.waitForTimeout(800);
  await p.evaluate(() => document.getElementById('btn-solo2').click()); await p.waitForTimeout(800);
  await p.keyboard.down('KeyD'); await p.keyboard.down('KeyW'); await p.waitForTimeout(900);
  await p.screenshot({ path: '/tmp/claude-0/l_1.png' });
  await p.keyboard.up('KeyD'); await p.keyboard.up('KeyW'); await p.waitForTimeout(500);
  await p.evaluate(() => { const r = __cake.room; r.addPlayer('g1', 'มะลิ', false); r.addPlayer('g2', 'ส้ม', false); r.players.get('g1').ready = true; r.pushLobby(); });
  await p.waitForTimeout(600); await p.screenshot({ path: '/tmp/claude-0/l_2.png' });
  console.log('errors:', JSON.stringify(errs)); await b.close();
})();
