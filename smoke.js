const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/cakeparty/dist/index.html');
  await p.evaluate(() => document.getElementById('btn-start-menu').click()); await p.fill('#name-in', 'ฟ้า');
  await p.screenshot({ path: '/tmp/claude-0/shot_menu.png' });
  await p.click('#btn-solo');
  console.log('lobby:', await p.textContent('#plist'));
  await p.click('#btn-start');
  await p.keyboard.down('KeyD'); await p.waitForTimeout(600); await p.keyboard.up('KeyD');
  await p.screenshot({ path: '/tmp/claude-0/shot_arena.png' });
  console.log('errors:', JSON.stringify(errs));
  await b.close();
})();
