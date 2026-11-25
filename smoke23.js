// ตรวจว่ากด W ในเกมกล้องไล่หลัง ตัวละครเดินเข้าหาจุดที่กล้องมอง และคลิกซ้ายทำงานเป็นปุ่มกระทำ
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/cakeparty/dist/index.html#sumo'); await p.waitForTimeout(4500);
  const get = () => p.evaluate(() => { const m = window.__mg || null; return m; });
  const pos = async () => p.evaluate(() => (window.__psnap ? window.__psnap() : null));
  const has = await p.evaluate(() => typeof window.__psnap);
  console.log('hook', has);
  if (has === 'function') {
    const a = await pos(); await p.keyboard.down('KeyW'); await p.waitForTimeout(700); await p.keyboard.up('KeyW'); const c = await pos();
    const me = s => s.P.filter(q => q[0] === 0)[0]; const d = s => Math.hypot(me(s)[1] - 240, me(s)[2] - 140);
    console.log('dist centre before/after', d(a).toFixed(1), d(c).toFixed(1));
    await p.mouse.move(600, 400); await p.mouse.down(); await p.waitForTimeout(150); const e = await pos(); await p.mouse.up();
    console.log('push cd after click', me(e)[6]);
  }
  console.log('errors', JSON.stringify(errs)); await b.close();
})();
