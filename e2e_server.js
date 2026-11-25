const { chromium } = require('playwright');
const { spawn } = require('child_process');
(async () => {
  const srv = spawn('node', ['server.js'], { env: { ...process.env, PORT: '8099' }, cwd: __dirname + '/..' });
  srv.stderr.on('data', d => console.log('SRV ERR', String(d)));
  await new Promise(r => setTimeout(r, 700));
  const b = await chromium.launch(); const errs = [];
  const mk = async () => { const p = await b.newPage({ viewport: { width: 900, height: 600 } }); p.on('pageerror', e => errs.push(e.stack.split('\n').slice(0,3).join(' | '))); await p.goto('http://localhost:8099/'); await p.waitForTimeout(500); return p; };
  const A = await mk(), B = await mk();
  await A.evaluate(() => document.getElementById('btn-start-menu').click()); await A.waitForTimeout(300);
  await A.evaluate(() => document.getElementById('btn-create').click()); await A.waitForTimeout(1200);
  const code = await A.evaluate(() => document.getElementById('lobby-code').textContent);
  console.log('code', code);
  await B.evaluate(() => document.getElementById('btn-start-menu').click()); await B.waitForTimeout(300);
  await B.evaluate(c => { document.getElementById('code-in').value = c; document.getElementById('btn-join').click(); }, code); await B.waitForTimeout(1200);
  const st = async p => p.evaluate(() => ({ scr: (window.__cake.lobby && window.__cake.lobby.players.length), slot: window.__cake.slot, owner: window.__cake.owner, game: window.__cake.game && window.__cake.game.phase, vis: document.getElementById('btn-start').style.display }));
  console.log('A', JSON.stringify(await st(A)), 'B', JSON.stringify(await st(B)));
  await B.evaluate(() => document.getElementById('btn-ready').click()); await B.waitForTimeout(500);
  await A.evaluate(() => document.getElementById('btn-start').click()); await A.waitForTimeout(1500);
  console.log('A', JSON.stringify(await st(A)), 'B', JSON.stringify(await st(B)));
  await A.evaluate(() => document.getElementById('btn-skip').click()); await B.evaluate(() => document.getElementById('btn-skip').click()); await A.waitForTimeout(1500);
  console.log('A', JSON.stringify(await st(A)), 'B', JSON.stringify(await st(B)));
  // ผู้เล่นคนแรกทอย
  const turn = await A.evaluate(() => window.__cake.game && window.__cake.game.order[window.__cake.game.turn]);
  const P = turn === (await st(A)).slot ? A : B;
  await P.keyboard.press('Space'); await P.waitForTimeout(3500);
  console.log('roll ok, last', JSON.stringify(await A.evaluate(() => window.__cake.game.last)));
  await A.screenshot({ path: '/tmp/claude-0/e2eA.png' });
  // host ออก → B ถูกส่งกลับเมนู
  await A.close(); await B.waitForTimeout(800);
  console.log('B after host left:', await B.evaluate(() => document.getElementById('menu-msg').textContent));
  console.log('errors', errs.length, JSON.stringify(errs.slice(0,2))); await b.close(); srv.kill();
})();
