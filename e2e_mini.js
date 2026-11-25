const { chromium } = require('playwright');
const { spawn } = require('child_process');
(async () => {
  const srv = spawn('node', ['server.js'], { env: { ...process.env, PORT: '8098' }, cwd: __dirname + '/..' });
  await new Promise(r => setTimeout(r, 700));
  const b = await chromium.launch(); const errs = [];
  const mk = async () => { const p = await b.newPage({ viewport: { width: 900, height: 600 } }); p.on('pageerror', e => errs.push(e.stack.split('\n').slice(0, 3).join(' | '))); await p.goto('http://localhost:8098/'); await p.waitForTimeout(500); return p; };
  const A = await mk(), B = await mk();
  await A.evaluate(() => document.getElementById('btn-start-menu').click()); await A.evaluate(() => document.getElementById('btn-create').click()); await A.waitForTimeout(1000);
  const code = await A.evaluate(() => document.getElementById('lobby-code').textContent);
  await B.evaluate(() => document.getElementById('btn-start-menu').click()); await B.evaluate(c => { document.getElementById('code-in').value = c; document.getElementById('btn-join').click(); }, code); await B.waitForTimeout(1000);
  await B.evaluate(() => document.getElementById('btn-ready').click()); await B.waitForTimeout(400);
  await A.evaluate(() => document.getElementById('btn-start').click()); await A.waitForTimeout(800);
  const seen = {}; const t0 = Date.now(); let shot = 0;
  while (Date.now() - t0 < 170000) {
    for (const P of [A, B]) {
      const ph = await P.evaluate(() => window.__cake.game && window.__cake.game.phase);
      seen[ph] = (seen[ph] || 0) + 1;
      if (ph === 'intro') await P.evaluate(() => document.getElementById('btn-skip').click());
      if (ph === 'roll') await P.keyboard.press('Space');
      if (ph === 'mgprep') await P.evaluate(() => document.getElementById('btn-mgready').click());
      if (ph === 'mg' && shot < 2) { shot++; await P.waitForTimeout(3000); await P.screenshot({ path: '/tmp/claude-0/e2emg' + shot + '.png' }); const g = await P.evaluate(() => window.__cake.game.mg && window.__cake.game.mg.id); console.log('mg id', g); }
    }
    await A.waitForTimeout(500);
    if (seen.mini) break;
  }
  console.log('phases', JSON.stringify(seen), 'errors', errs.length, JSON.stringify(errs.slice(0, 2)));
  await b.close(); srv.kill();
})();
