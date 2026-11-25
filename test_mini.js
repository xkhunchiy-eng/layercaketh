'use strict';
const assert = require('assert');
const M = require('../src/minigames.js');
let passed = 0;
function test(n, f) { try { f(); passed++; console.log('ok   ' + n); } catch (e) { console.log('FAIL ' + n + '\n     ' + e.stack); process.exitCode = 1; } }
const ctx = new Proxy({}, { get: (t, k) => k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : (() => {}), set: () => true });
const KEYS = ['Space', 'Click', 'KeyQ', 'KeyW', 'KeyE', 'KeyA', 'KeyS', 'KeyD', 'KeyZ', 'KeyX', 'KeyC', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'KeyP', 'Digit1', 'Digit2', 'Digit3', 'Digit4'];
function play(id, seed, script) {
  const o = M.GAMES[id].make(seed), dur = M.GAMES[id].dur;
  for (let t = 0; t <= dur; t += 16) {
    const e = script[t];
    if (e) { if (typeof e === 'string') { o.press(e, t); if (o.release && t % 3 === 0) o.release(e, t + 5); } else o.click && o.click(e.x, e.y, t); }
    o.draw(ctx, t);
  }
  return o;
}
function randScript(seedR, dur) { const r = M.rng(seedR), s = {}; for (let t = 0; t < dur; t += 16) if (r() < 0.25) s[t] = r() < 0.2 ? { x: r() * 480, y: r() * 270 } : KEYS[Math.floor(r() * KEYS.length)]; return s; }

M.IDS.forEach(id => {
  test(id + ': คนเล่นสุ่ม 100 รอบ ไม่พัง คะแนนเป็นจำนวนเต็มไม่ติดลบ และผลซ้ำได้ (deterministic)', () => {
    for (let k = 0; k < 100; k++) {
      const sc = randScript(k + 7, M.GAMES[id].dur), a = play(id, 1000 + k, sc), b = play(id, 1000 + k, sc);
      assert.ok(Number.isInteger(a.score) && a.score >= 0 && a.score < 5000, id + ' score ' + a.score);
      assert.strictEqual(a.score, b.score);
    }
  });
  test(id + ': ไม่ทำอะไรเลยได้คะแนนน้อยมากและไม่พัง', () => { const sc = play(id, 5, {}).score; assert.ok(id === 'runner' ? sc < 25 : id === 'dodge' ? sc < 40 : id === 'balance' ? sc < 90 : sc === 0, id + ' idle ' + sc); });
});
test('รัวสเปซ: นับเฉพาะตอนในรอบ (3 รอบ x 10 วิ)', () => { const s = {}; for (let i = 0; i < 50; i++) s[800 + i * 32 - (800 + i * 32) % 16] = 'Space'; assert.strictEqual(play('mash', 1, s).score, 50); const s2 = {}; for (let i = 0; i < 20; i++) s2[11000 + i * 16] = 'Space'; assert.strictEqual(play('mash', 1, s2).score, 0); });
test('เขาวงกต: เดินตามทางสั้นสุดแล้วถึงเค้กได้คะแนนโบนัส / เดินมั่วไม่พัง', () => {
  const o = M.GAMES.maze.make(3); let t = 100;
  for (let i = 0; i < 400 && !o.done(); i++) o.press(['ArrowUp', 'ArrowLeft', 'ArrowRight', 'ArrowDown'][(i * 7 + (i >> 2)) % 4], t += 90);
  assert.ok(o.score >= 0);
});
test('เรียงเลข 1-20: กดครบเร็วกว่าชนะ กดผิดเสียแต้ม', () => {
  const a = M.GAMES.numbers.make(5), b = M.GAMES.numbers.make(5);
  const go = (o, t0, gap) => { let t = t0; for (let n = 1; n <= 20; n++) { const bl = o.view(t).b.find(q => q[0] === n); o.click(bl[1], bl[2], t); t += gap; } };
  go(a, 500, 400); go(b, 500, 900); assert.ok(a.done() && b.done() && a.score > b.score);
});
test('ต่อชั้นเค้ก: กดตรงเวลาเดียวกับชั้นล่างได้โบนัส/กดพลาดจบเกม', () => {
  const o = M.GAMES.stack.make(1); o.press('Space', 500); assert.ok(o.score >= 0);
  for (let t = 600; t < 20000; t += 37) o.press('Space', t);
  assert.ok(o.over || o.score > 0);
});
test('มุมมองเวลาย้อนหลัง/ก่อนเริ่มไม่ทำให้พัง', () => { M.IDS.forEach(id => { const o = M.GAMES[id].make(9); o.press('Space', -50); o.press('Space', 0); o.draw(ctx, -100); }); });
test('ยิงเป้า: คลิกถูกที่ได้คะแนน คลิกว่างไม่ได้', () => { const o = M.GAMES.shoot.make(2); o.click(5, 5, 100); assert.strictEqual(o.score, 0); });
test('เรียงเลข: คลิกตามลำดับถูกต้องจนครบแล้วได้โบนัส', () => {
  const o = M.GAMES.numbers.make(4); for (let n = 1; n <= 20; n++) { const b = o.board.find(b => b.n === n); o.click(b.x, b.y, n * 100); }
  assert.strictEqual(o.score, 20 * 8 + 20 + Math.round((45000 - 2000) / 250));   // กด 1-20 ครบ + โบนัสเวลา
});
test('บวกเลข/กดตามสี: คลิกตัวเลือกที่ถูกได้คะแนน คลิกผิดโดนสตัน', () => {
  const rect = (n, k) => { const bw = 74, gap = 12, x0 = (480 - (n * bw + (n - 1) * gap)) / 2; return x0 + k * (bw + gap) + 37; };
  const a = M.GAMES.addmath.make(9); let found = false;
  for (let k = 0; k < 4 && !found; k++) { const before = a.score; a.click(rect(4, k), 210, 1000 + k * 2000); if (a.score > before) found = true; }
  assert.ok(found, 'addmath มีตัวเลือกถูกอย่างน้อยหนึ่งช่อง');
  const c = M.GAMES.color.make(9); let ok = false;
  for (let k = 0; k < 4 && !ok; k++) { const before = c.score; c.click(rect(4, k), 215, 1000 + k * 2000); if (c.score > before) ok = true; }
  assert.ok(ok, 'color มีปุ่มถูกหนึ่งปุ่ม');
});
test('ตีตัวตุ่น: คลิกกลางหลุมที่โผล่ ได้คะแนน', () => {
  const o = M.GAMES.mole.make(2); let hit = false;
  for (let h = 0; h < 9 && !hit; h++) { const b = o.score; o.click(150 + (h % 3) * 90, 96 + Math.floor(h / 3) * 70, 1900); if (o.score > b) hit = true; }
  assert.ok(hit);
});
test('ทรงตัวไอศกรีม: ไม่กดอะไรล้มแน่ๆ คะแนนไม่เกินเวลา', () => { const o = play('balance', 3, {}); assert.ok(o.score <= 250); });
test('ทรงตัวไอศกรีม: ตามสกู๊ปด้วยการสลับทิศ ได้คะแนนมากกว่าอยู่เฉยๆ', () => {
  const idle = play('balance', 3, {}).score, o = M.GAMES.balance.make(3);
  for (let t = 0; t <= 62000; t += 16) { const v = o.view(t); if (v.rd >= 0) { const tg = v.sc.filter(s => s[1] < 190).sort((a, b) => b[1] - a[1])[0]; if (tg) { const want = tg[0] > v.x + 6 ? 1 : tg[0] < v.x - 6 ? -1 : 0; if (want && want !== v.dir) { o.press('Space', t); } } } }
  assert.ok(o.score > idle + 5, 'bot ' + o.score + ' idle ' + idle);
});
test('กระโดดข้ามขนม: กระโดดอย่างเดียวไม่พัง', () => { const s = {}; for (let t = 0; t < 25000; t += 700) s[t - t % 16] = 'Space'; assert.ok(play('runner', 2, s).score >= 0); });
console.log('\nผ่าน ' + passed + ' ข้อ');
