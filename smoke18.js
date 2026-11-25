const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/cakeparty/dist/index.html'); await p.waitForTimeout(700);
  await p.evaluate(() => document.getElementById('btn-mgtest').click()); await p.waitForTimeout(300);
  await p.screenshot({ path: '/tmp/claude-0/t_list.png' });
  await p.evaluate(() => [...document.querySelectorAll('#mgtestlist button')].find(b => /sumo/.test(b.textContent)).click()); await p.waitForTimeout(1200);
  await p.keyboard.down('d'); await p.waitForTimeout(500); await p.keyboard.up('d');
  await p.screenshot({ path: '/tmp/claude-0/t_sumo.png' });
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await p.evaluate(() => [...document.querySelectorAll('#mgtestlist button')].find(b => /slice/.test(b.textContent)).click()); await p.waitForTimeout(1500);
  await p.screenshot({ path: '/tmp/claude-0/t_slice.png' });
  const n = await p.evaluate(() => document.querySelectorAll('#mgtestlist button').length);
  await p.goto('file:///home/claude/cakeparty/dist/index.html#sumo'); await p.waitForTimeout(1200);
  const on = await p.evaluate(() => document.getElementById('screen-mg').classList.contains('on'));
  console.log('games', n, 'hash opens', on, 'errors', JSON.stringify(errs)); await b.close();
})();
