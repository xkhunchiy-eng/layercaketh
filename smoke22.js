const { chromium } = require('playwright');
(async () => {
  const id = process.argv[2]; const n = +process.argv[3] || 6, gap = +process.argv[4] || 1000;
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/cakeparty/dist/index.html#' + id); await p.waitForTimeout(800);
  for (let i = 0; i < n; i++) { await p.waitForTimeout(gap); await p.screenshot({ path: `/tmp/claude-0/s_${i}.png` }); }
  console.log('errors', JSON.stringify(errs)); await b.close();
})();
