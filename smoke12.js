const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console:' + m.text()); });
  await p.addInitScript(() => { window.Peer = function (id) { const h = {}; this.on = (e, f) => { h[e] = f; if (e === 'open') setTimeout(() => f(id), 200); }; this.destroy = () => {}; }; });
  await p.goto('file:///home/claude/cakeparty/dist/index.html'); await p.waitForTimeout(800);
  await p.evaluate(() => document.getElementById('btn-start-menu').click()); await p.waitForTimeout(300);
  await p.fill('#name-in', 'ฟ้า'); await p.click('#btn-create'); await p.waitForTimeout(1500);
  await p.screenshot({ path: '/tmp/claude-0/z_lobby.png' });
  console.log('errors:', JSON.stringify(errs)); await b.close();
})();
