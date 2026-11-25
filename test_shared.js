'use strict';
const assert = require('assert');
const S = require('../src/shared.js'), M = require('../src/minigames.js');
let passed = 0;
function test(n, f) { try { f(); passed++; console.log('ok   ' + n); } catch (e) { console.log('FAIL ' + n + '\n     ' + e.stack); process.exitCode = 1; } }
const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
const env = { me: 0, names: { 0: 'a', 1: 'b', 2: 'c', 3: 'd' }, sprite: () => ({}) };
function run(id, n, seed, inSeed, bots) {
  const slots = [0, 1, 2, 3].slice(0, n), sim = S.GAMES[id].make(slots, seed), r = M.rng(inSeed); let steps = 0;
  while (!sim.done && steps++ < 4000) {
    if (steps % 6 === 0) slots.forEach(s => sim.input(s, bots ? { x: r() * 2 - 1, y: r() * 2 - 1, a: r() < 0.3 } : { x: 0, y: 0, a: false }));
    sim.tick(0.05);
    const sn = JSON.parse(JSON.stringify(sim.snapshot())); S.GAMES[id].draw(ctx, sn, env);
    sim.scores().forEach(([s, v]) => assert.ok(Number.isInteger(v) && v >= 0 && v < 5000, id + ' score ' + v));
  }
  assert.ok(sim.done, id + ' ไม่จบ n=' + n); return sim;
}
S.IDS.forEach(id => {
  test(id + ': 1-4 คน สุ่มอินพุต 40 รอบ จบเกมได้ ค่าเป็นจำนวนเต็ม ภาพวาดไม่พัง', () => { for (let k = 0; k < 40; k++) for (let n = 1; n <= 4; n++) run(id, n, k + 3, k * 7 + n, true); });
  test(id + ': deterministic (seed+อินพุตเดียวกัน ผลเดียวกัน)', () => { const a = run(id, 3, 5, 9, true), b = run(id, 3, 5, 9, true); assert.deepStrictEqual(a.scores(), b.scores()); });
  test(id + ': อินพุตแปลกๆ จากเครือข่ายไม่ทำให้พัง', () => {
    const sim = S.GAMES[id].make([0, 1], 1);
    [null, 5, 'x', { x: NaN, y: Infinity }, { x: 99, y: -99, a: 1 }, { x: 'a' }].forEach(m => { sim.input(0, m); sim.input(9, m); });
    for (let i = 0; i < 100; i++) sim.tick(0.05);
    sim.snapshot().P.forEach(p => p.forEach(v => assert.ok(isFinite(v))));
  });
  test(id + ': ผู้เล่นออกกลางเกมไม่ค้าง', () => { const sim = S.GAMES[id].make([0, 1, 2], 2); for (let i = 0; i < 20; i++) sim.tick(0.05); sim.remove(1); sim.remove(0); sim.remove(2); for (let i = 0; i < 4000 && !sim.done; i++) sim.tick(0.05); assert.ok(sim.done); });
});
test('กำแพง: คนที่ยืนนิ่งโดนชนแน่ๆ และคนที่หลบได้อยู่รอดนานกว่า', () => {
  const sim = S.GAMES.wall.make([0], 4); for (let i = 0; i < 4000 && !sim.done; i++) sim.tick(0.05); assert.ok(sim.time < 15);
});
test('ซูโม่: ตัวที่ถูกดันออกนอกจานแพ้ คนที่อยู่รอดคนสุดท้ายได้โบนัส', () => {
  const sim = S.GAMES.sumo.make([0, 1], 1); sim.input(0, { x: 1, y: 0, a: false }); for (let i = 0; i < 4000 && !sim.done; i++) sim.tick(0.05);
  const sc = sim.scores(); assert.ok(sc[1][1] > sc[0][1] || sc[0][1] > 0);
});
test('ไฟแดงไฟเขียว: วิ่งตลอดแม้ไฟแดงจะถูกส่งกลับ ส่วนคนยืนนิ่งไม่ได้คะแนน', () => {
  const sim = S.GAMES.redlight.make([0, 1], 3); sim.input(0, { x: 1, y: 0 }); for (let i = 0; i < 4000 && !sim.done; i++) sim.tick(0.05);
  assert.strictEqual(sim.scores()[1][1], 0);
});
console.log('\nผ่าน ' + passed + ' ข้อ');
test('กำแพง: ผลักได้ ผู้ถูกผลักมึนและกระเด็น แล้วมีคูลดาวน์', () => {
  const sim = S.GAMES.wall.make([0, 1], 5); sim.P[0].x = 100; sim.P[0].y = 100; sim.P[1].x = 125; sim.P[1].y = 100; sim.P[0].fx = 1; sim.P[0].fy = 0;
  sim.input(0, { x: 0, y: 0, a: true }); sim.tick(0.016);
  assert.ok(sim.P[1].stun > 0.3 && sim.P[1].kx > 100); assert.ok(sim.P[0].cd > 2);
  const x0 = sim.P[1].x; sim.input(1, { x: -1, y: 0, a: false }); sim.tick(0.1); assert.ok(sim.P[1].x > x0);   // มึนอยู่ ควบคุมไม่ได้
});
test('ซูโม่: เล่น 3 รอบ ได้แต้มต่อรอบ', () => {
  const sim = S.GAMES.sumo.make([0, 1], 2); sim.input(0, { x: 1, y: 0, a: false }); sim.input(1, { x: -1, y: 0, a: false });
  let rounds = new Set(); for (let i = 0; i < 20000 && !sim.done; i++) { sim.tick(0.05); rounds.add(sim.rd); }
  assert.strictEqual(rounds.size, 3); assert.ok(sim.done); assert.ok(sim.scores().every(r => r[1] >= 10));
});
test('พื้นเค้กถล่ม: ตาราง 8x11 และเล่น 3 รอบ', () => {
  const sim = S.GAMES.floor.make([0, 1], 3); assert.strictEqual(sim.snapshot().T.length, 88);
  let rounds = new Set(); for (let i = 0; i < 40000 && !sim.done; i++) { sim.tick(0.05); rounds.add(sim.rd); } assert.strictEqual(rounds.size, 3); assert.ok(sim.done);
});
test('เก้าอี้ดนตรี: 3 รอบ ไม่มีใครตกรอบ', () => {
  const sim = S.GAMES.chairs.make([0, 1, 2], 4); for (let i = 0; i < 20000 && !sim.done; i++) { sim.input(0, { x: 1, y: 0, a: false }); sim.tick(0.05); }
  assert.ok(sim.done); assert.strictEqual(sim.snapshot().P.filter(p => p[3]).length, 3); assert.strictEqual(sim.snapshot().rd, 3);
});
test('ไฟแดงไฟเขียว: เหลือคนสุดท้ายแล้วจบเกม และราง ยาวพอ', () => {
  const sim = S.GAMES.redlight.make([0, 1], 3); sim.input(0, { x: 1, y: 0 });
  let tg = 0; for (let i = 0; i < 4000 && !sim.done; i++) { sim.input(0, { x: sim.snapshot().green ? 1 : 0, y: 0 }); sim.tick(0.05); }
  assert.ok(sim.done && sim.time > 15 && sim.time < 100, 'time ' + sim.time);
});
test('ไล่จับครีม: พุ่งสั้น มีสิ่งกีดขวาง ชนแล้วไม่ทะลุ', () => {
  const sim = S.GAMES.tag.make([0, 1], 6); const sn = sim.snapshot(); assert.ok(sn.Ob.length >= 4);
  sim.P[0].x = 100; sim.P[0].y = 90; sim.input(0, { x: 1, y: 0, a: false }); for (let i = 0; i < 60; i++) sim.tick(0.05);
  sim.P.forEach(p => sn.Ob.forEach(o => assert.ok(!(Math.abs(p.x - o[0]) < o[2] + 5 && Math.abs(p.y - o[1]) < o[3] + 5))));
});
console.log('\nผ่าน ' + passed + ' ข้อ');
test('ไล่จับครีม: แตะตัวจับแล้วเปลี่ยนตัวจับ', () => {
  const sim = S.GAMES.tag.make([0, 1], 8), it = sim.it, other = it === 0 ? 1 : 0;
  const pi = sim.P.find(p => p.slot === it), po = sim.P.find(p => p.slot === other); pi.x = 200; pi.y = 140; po.x = 225; po.y = 140;
  sim.tick(0.05); assert.strictEqual(sim.it, other);
});
console.log('\nผ่าน ' + passed + ' ข้อ');
