const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1000, height: 640 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/cakeparty/dist/index.html'); await p.waitForTimeout(600);
  await p.evaluate(() => document.getElementById('btn-solo2').click()); await p.waitForTimeout(400);
  await p.click('#btn-start'); await p.waitForTimeout(600); await p.click('#btn-skip'); await p.waitForTimeout(2500);
  const shots = [['gain', 0.9], ['gain', 1.5], ['hit', 0.3], ['hit', 0.8], ['gift', 1.5], ['gift', 2.0], ['cherry', 1.0], ['cherry', 2.0]];
  for (let i = 0; i < shots.length; i++) {
    const [k, t] = shots[i];
    await p.evaluate(([k, t]) => { const now = performance.now(); window.__fxpush({ k, slot: 0, n: 6, src: -1, gift: k === 'gift' ? 'double' : null, text: 'x', t0: now - t * 1000 }); }, [k, t]);
    await p.screenshot({ path: `/tmp/claude-0/f${i}.png` });
    await p.waitForTimeout(400);
  }
  console.log('errors', JSON.stringify(errs)); await b.close();
})();
