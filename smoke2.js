const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 820 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error') errs.push('console: '+m.text()); });
  await p.goto('file:///home/claude/cakeparty/dist/index.html');
  await p.evaluate(() => document.getElementById('btn-start-menu').click()); await p.fill('#name-in', 'ฟ้า'); await p.click('#btn-solo'); await p.click('#btn-start');
  await p.waitForTimeout(500);
  await p.screenshot({ path: '/tmp/claude-0/g1.png' });
  for (let i = 0; i < 6; i++) { await p.keyboard.press('Space'); await p.waitForTimeout(1500); await p.screenshot({ path: '/tmp/claude-0/g' + (i+2) + '.png' }); await p.waitForTimeout(3500); }
  console.log(await p.textContent('#gmsg'), '|', await p.textContent('#ginfo'));
  console.log('errors:', JSON.stringify(errs));
  await b.close();
})();
