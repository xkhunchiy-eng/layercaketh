const { chromium } = require('playwright');
(async () => {
  const id = process.argv[2] || 'coinrush';
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file:///home/claude/cakeparty/dist/index.html#' + id); await p.waitForTimeout(1500);
  await p.keyboard.down('d'); await p.waitForTimeout(1500); await p.keyboard.up('d'); await p.keyboard.down('s'); await p.waitForTimeout(1200); await p.keyboard.up('s');
  await p.screenshot({ path: '/tmp/claude-0/g_' + id + '.png' });
  console.log('errors', JSON.stringify(errs)); await b.close();
})();
