const { chromium } = require('playwright');
(async () => {
  const id = process.argv[2]; const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/cakeparty/dist/index.html#' + id); await p.waitForTimeout(4000);
  for (let i=0;i<12;i++){ await p.mouse.click(300+i*50, 250+(i%3)*80); await p.waitForTimeout(200);}
  await p.screenshot({ path: '/tmp/claude-0/c_' + id + '.png' });
  console.log('errors', JSON.stringify(errs)); await b.close();
})();
