'use strict';
const assert = require('assert');
const { G, Game } = require('../src/game.js');
let passed = 0;
function test(n, f) { try { f(); passed++; console.log('ok   ' + n); } catch (e) { console.log('FAIL ' + n + '\n     ' + e.stack); process.exitCode = 1; } }
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };           // rng แบบกำหนดค่า
const mk = (n, rng, extra) => new Game(Array.from({ length: n }, (_, i) => ({ slot: i, name: 'P' + i })), Object.assign({ rng }, extra));
const roll6 = () => 0.999;                                                       // ทอยได้ 6 เสมอ
Game.shortTimers = true;   // การจำลองใช้เวลาสั้นเพื่อให้เกมเดินเอง (ของจริงไม่จำกัด)
const until = (g, f, max) => { for (let i = 0; i < (max || 400); i++) { if (f()) return; g.tick(0.1); } };
const adv = (g, secs) => { for (let t = 0; t < secs * 10; t++) g.tick(0.1); };

test('เลย์เอาต์: 25 ช่อง จำนวนช่องพิเศษถูกต้อง เริ่ม/ยอดอยู่ปลาย', () => {
  const g = mk(2);
  for (let k = 0; k < 50; k++) {
    const l = g._makeLayout();
    assert.strictEqual(l.length, 25); assert.strictEqual(l[0], 'start'); assert.strictEqual(l[24], 'cherry');
    const c = {}; l.forEach(t => c[t] = (c[t] || 0) + 1);
    assert.strictEqual(c.coin, 5); assert.strictEqual(c.minus, 3); assert.strictEqual(c.mystery, 3); assert.strictEqual(c.shop, 2); assert.strictEqual(c.plain, 10);
  }
});
test('ทอยได้เฉพาะคนที่ถึงตา และเฉพาะช่วง roll', () => {
  const g = mk(2, roll6); const cur = g.order[g.turn], other = g.order[1 - g.turn];
  assert.ok(!g.roll(other)); assert.ok(g.roll(cur)); assert.ok(!g.roll(cur)); assert.strictEqual(g.phase, 'busy');
});
test('เดินตามแต้มเต๋า 1-6', () => {
  const g = mk(2, seq(0, 0.2, 0.5, 0.8, 0.999));
  g.layout = g.layout.map(() => 'plain'); g.layout[0] = 'start'; g.layout[24] = 'cherry';
  g.order = [0, 1]; g.turn = 0;
  g.rng = seq(0.5); g.roll(0); assert.strictEqual(g.last.v, 4); assert.strictEqual(g.pos[0], 4);
});
test('ช่องเหรียญ +COIN_GAIN ช่องหัก -3 (ไม่ติดลบ)', () => {
  const g = mk(2, seq(0)); // ทอยได้ 1
  g.layout = g.layout.map(() => 'plain'); g.layout[1] = 'coin'; g.order = [0, 1]; g.turn = 0;
  g.roll(0); assert.strictEqual(g.coins[0], G.START_COINS + G.COIN_GAIN);
  const h = mk(2, seq(0)); h.layout = h.layout.map(() => 'plain'); h.layout[1] = 'minus'; h.order = [0, 1]; h.turn = 0; h.coins[0] = 1;
  h.roll(0); assert.strictEqual(h.coins[0], 0);
});
test('ถึงยอด เหรียญพอ: ซื้อเชอร์รี่ +10 แต้ม จบรอบ ทุกคนกลับจุดเริ่ม ผู้ซื้อไปท้ายสุด', () => {
  const g = mk(3, roll6); g.order = [0, 1, 2]; g.turn = 1; g.pos[1] = 22; g.coins[1] = G.CHERRY_PRICE + 10;
  g.coins[0] = 30; g.coins[2] = 5; g.pos[0] = 7;
  g.roll(1); assert.strictEqual(g.pos[1], 24); assert.strictEqual(g.last.cherry, 'ask'); adv(g, 8); assert.strictEqual(g.phase, 'cherry'); assert.strictEqual(g.snapshot().cs, 1);
  assert.ok(!g.cherryChoice(0, true)); assert.ok(g.cherryChoice(1, true)); assert.strictEqual(g.points[1], 10); assert.strictEqual(g.coins[1], 10); assert.strictEqual(g.last.cherry, 'buy');
  adv(g, 6);
  assert.strictEqual(g.round, 2); assert.deepStrictEqual(g.pos, [0, 0, 0, 0]);
  assert.deepStrictEqual(g.order, [2, 0, 1]);   // เหรียญน้อยสุดก่อน ผู้ซื้อท้าย
  assert.strictEqual(g.phase, 'roll');
});
test('ถึงยอดแต่เหรียญไม่พอ: ถูกส่งกลับจุดเริ่ม ไม่ได้แต้ม และไม่จบรอบ', () => {
  const g = mk(2, roll6); g.order = [0, 1]; g.turn = 0; g.pos[0] = 20; g.coins[0] = 39;
  g.roll(0); assert.strictEqual(g.pos[0], 0); assert.strictEqual(g.points[0], 0); assert.ok(g.last.back);
  adv(g, 15); assert.strictEqual(g.round, 1);
});
test('ทอยเกินยอด: ขึ้นยอดอัตโนมัติ (ไม่เกิน 24)', () => {
  const g = mk(2, roll6); g.order = [0, 1]; g.turn = 0; g.pos[0] = 23; g.coins[0] = 99;
  g.roll(0); assert.strictEqual(g.last.to, 24); adv(g, 8); g.cherryChoice(0, true); assert.strictEqual(g.points[0], 10);
});
test('ถึงยอดแล้วเลือกไม่ซื้อ: กลับจุดเริ่ม เหรียญไม่หาย / หมดเวลาซื้อให้เอง', () => {
  const g = mk(2, roll6); g.order = [0, 1]; g.turn = 0; g.pos[0] = 23; g.coins[0] = 99;
  g.roll(0); adv(g, 8); assert.ok(g.cherryChoice(0, false)); assert.strictEqual(g.pos[0], 0); assert.strictEqual(g.coins[0], 99); assert.strictEqual(g.points[0], 0); assert.strictEqual(g.last.cherry, 'no');
  const h = mk(2, roll6); h.order = [0, 1]; h.turn = 0; h.pos[0] = 23; h.coins[0] = 99; h.roll(0); adv(h, 8); assert.strictEqual(h.phase, 'cherry'); adv(h, 21); assert.strictEqual(h.points[0], 10);
});
test('ครบรอบผู้เล่นแล้วมีมินิเกมจำลองแจกเหรียญ 10/7/4/2 แล้วกลับมาทอยต่อ', () => {
  const g = mk(2, roll6); g.layout = g.layout.map(() => 'plain'); g.layout[24] = 'cherry';
  const before = g.coins.slice();
  g.roll(g.order[0]); adv(g, 10); g.roll(g.order[1]); until(g, () => g.phase === 'mini');
  assert.strictEqual(g.phase, 'mini');
  const gain = g.coins[0] + g.coins[1] - before[0] - before[1];
  assert.strictEqual(gain, 10 + 7);
  until(g, () => g.phase === 'roll'); assert.strictEqual(g.phase, 'roll'); assert.strictEqual(g.turn, 0);
});
test('ไม่จำกัดเวลาคิด: รอทอยได้เรื่อยๆ ไม่ทอยให้เอง', () => {
  assert.ok(G.TURN_TIME > 3600 && G.SHOP_TIME > 3600 && G.CHERRY_TIME > 3600); Game.shortTimers = false; const g = mk(2, roll6); Game.shortTimers = false; adv(g, 600); assert.strictEqual(g.phase, 'roll'); Game.shortTimers = true;
  g.roll(g.order[g.turn], false); adv(g, 0.1); assert.strictEqual(g.phase, 'busy'); assert.strictEqual(g.last.v, 6);
});
test('เล่นครบ 4 รอบ: จบเกม มีผู้ชนะ เรียงตามแต้ม', () => {
  const g = mk(2, roll6);
  for (let r = 0; r < 4; r++) {
    const cur = g.order[g.turn]; g.pos[cur] = 23; g.coins[cur] = 99; g.roll(cur); adv(g, 8); g.cherryChoice(cur, true); adv(g, 8);
  }
  assert.strictEqual(g.phase, 'end'); assert.strictEqual(g.cherries, 4);
  assert.strictEqual(g.points[g.winners[0]] >= g.points[g.winners[1]], true);
  assert.ok(!g.roll(g.winners[0]));
});
test('จำลองสุ่ม 300 เกมจนจบ: ไม่ค้าง ค่าเหรียญไม่ติดลบ ตำแหน่งอยู่ในช่วง', () => {
  for (let k = 0; k < 300; k++) {
    const n = 1 + (k % 4), g = mk(n, Math.random); let steps = 0;
    while (g.phase !== 'end' && steps++ < 200000) {
      g.tick(0.1);
      g.coins.forEach(c => assert.ok(c >= 0)); g.pos.forEach(p => assert.ok(p >= 0 && p <= 24));
      if (g.phase === 'roll' && Math.random() < 0.5) g.roll(g.order[g.turn]);
    }
    assert.strictEqual(g.phase, 'end', 'เกมไม่จบ รอบ ' + g.round);
  }
});
test('ผู้เล่นออกกลางเกม: ลำดับตาไม่เพี้ยน เกมไม่ค้าง', () => {
  const g = mk(3, roll6); g.order = [0, 1, 2]; g.turn = 1;
  g.removePlayer(0); assert.deepStrictEqual(g.order, [1, 2]); assert.strictEqual(g.turn, 0);
  assert.strictEqual(g.order[g.turn], 1);
  g.removePlayer(2); g.removePlayer(1); // ว่างเปล่าไม่พัง
  adv(g, 5);
});
test('snapshot เป็น JSON ได้และมีฟิลด์สำคัญ', () => {
  const g = mk(2); const s = JSON.parse(JSON.stringify(g.snapshot()));
  assert.strictEqual(s.layout.length, 25); assert.strictEqual(s.coins.length, 4); assert.ok(s.order.length === 2);
});

const { ITEMS, ITEM_IDS } = require('../src/game.js');
const plain = g => { g.layout = g.layout.map(() => 'plain'); g.layout[0] = 'start'; g.layout[24] = 'cherry'; return g; };
const ready = (n, rng) => { const g = plain(mk(n, rng)); g.order = Array.from({ length: n }, (_, i) => i); g.turn = 0; return g; };
test('ไอเทม: ใช้ได้เฉพาะตัวเองก่อนทอย ช่องเต็ม 4', () => {
  const g = ready(2, seq(0.5)); g.items[0] = ['lock']; g.items[1] = ['lock'];
  assert.ok(!g.useItem(1, 0)); assert.ok(g.useItem(0, 0)); assert.strictEqual(g.items[0].length, 0);
  g.roll(0); assert.strictEqual(g.last.v, 4);
  assert.ok(!g._giveItem(0, 'x') === false); g.items[0] = ['a', 'b', 'c', 'd', 'a', 'b', 'c', 'd']; assert.ok(!g._giveItem(0, 'slow'));
});
test('เต๋าพิเศษ: ช่วงแต้มถูกต้อง และใช้ได้ 1 ลูกต่อตา', () => {
  const range = (id, lo, hi) => { for (let k = 0; k < 200; k++) { const g = ready(2, Math.random); g.items[0] = [id]; g.useItem(0, 0); g.pos[0] = 12; g.roll(0); assert.ok(g.last.v >= lo && g.last.v <= hi, id + ' ' + g.last.v); } };
  range('double', 2, 12); range('giant', 1, 10); range('slow', 1, 3); range('triple', 1, 6);
  const g = ready(2, seq(0.1)); g.items[0] = ['lock', 'slow']; g.useItem(0, 0); assert.ok(!g.useItem(0, 0)); assert.strictEqual(g.items[0].length, 1);
  const h = ready(2, seq(0.1)); h.items[0] = ['gamble']; h.useItem(0, 0); h.roll(0); assert.strictEqual(h.last.v, 0); assert.strictEqual(h.pos[0], 0);
});
test('เต๋ากลับด้าน: ถอยหลัง ไม่ต่ำกว่า 0', () => {
  const g = ready(2, seq(0.999)); g.pos[0] = 3; g.items[0] = ['reverse']; g.useItem(0, 0); g.roll(0); assert.strictEqual(g.pos[0], 0);
});
test('ปืนสลับที่ / ขโมย / แช่แข็ง / แม่เหล็ก / ตั๋วทอง', () => {
  const g = ready(3, seq(0.5)); g.pos = [5, 15, 9, 0];
  g.items[0] = ['swap', 'steal', 'freeze', 'magnet', 'ticket'];
  assert.ok(!g.useItem(0, 0));                       // 3 คน ต้องเลือกเป้าหมาย
  assert.ok(g.useItem(0, 0, 1)); assert.deepStrictEqual([g.pos[0], g.pos[1]], [15, 5]);
  assert.ok(!g.useItem(0, 0, 0));                    // ใช้กับตัวเองไม่ได้
  const c1 = g.coins[1]; assert.ok(g.useItem(0, 0, 1)); assert.strictEqual(g.coins[1], c1 - 5 < 0 ? 0 : c1 - 5);
  assert.ok(g.useItem(0, 0, 2)); assert.strictEqual(g.skip[2], 1);
  assert.ok(g.useItem(0, 0)); assert.ok(g.useItem(0, 0)); assert.ok(g.ticket[0]);
});
test('ไอเทมที่ต้องมีเป้าหมาย: เหลือเพื่อนคนเดียวเลือกให้อัตโนมัติ', () => {
  const g = ready(2, seq(0.5)); g.pos = [5, 15, 0, 0]; g.items[0] = ['swap']; assert.ok(g.useItem(0, 0));
  assert.deepStrictEqual([g.pos[0], g.pos[1]], [15, 5]);
});
test('ครีมลื่น: คนอื่นเหยียบถอย 3 ช่อง เจ้าของไม่โดน กับดักหายหลังโดน', () => {
  const g = ready(2, seq(0.5)); g.pos = [7, 3, 0, 0]; g.items[0] = ['slip']; g.useItem(0, 0); assert.strictEqual(g.traps[7], 0);
  g.order = [1, 0]; g.turn = 0; g.rng = seq(0.5); g.roll(1);   // 4+3=7
  assert.strictEqual(g.pos[1], 4); assert.strictEqual(g.traps[7], undefined); assert.strictEqual(g.last.via, 7);
});
test('แช่แข็ง: ข้ามตาถัดไปเพียงครั้งเดียว', () => {
  const g = ready(2, roll6); g.skip[1] = 1; g.roll(0); until(g, () => /แช่แข็ง/.test(g.msg));
  assert.strictEqual(g.phase, 'busy'); assert.ok(/แช่แข็ง/.test(g.msg)); assert.strictEqual(g.skip[1], 0);
  adv(g, 2); assert.ok(g.phase === 'mini' || g.phase === 'busy');
});
test('ร้านค้า: ลงช่องร้านแล้วซื้อได้ เหรียญ/ช่องไม่พอซื้อไม่ได้ ออกจากร้านแล้วตาต่อไป', () => {
  const g = ready(2, seq(0)); g.layout[1] = 'shop'; g.coins[0] = 100;
  g.roll(0); adv(g, 9); assert.strictEqual(g.phase, 'shop'); assert.ok(g.shop.stock.length >= 3 && g.shop.stock.length <= 4);
  assert.ok(!g.buy(1, 0));                              // ไม่ใช่เจ้าของร้าน
  const id = g.shop.stock[0], price = ITEMS[id].price;
  assert.ok(g.buy(0, 0)); assert.strictEqual(g.coins[0], 100 - price); assert.deepStrictEqual(g.items[0], [id]);
  assert.ok(!g.buy(0, 0));                              // ซื้อชิ้นเดิมซ้ำไม่ได้
  g.items[0] = ['a', 'b', 'c', 'd', 'a', 'b', 'c', 'd']; assert.ok(!g.buy(0, 1));
  g.coins[0] = 0; g.items[0] = []; assert.ok(!g.buy(0, 1));
  assert.ok(g.leaveShop(0)); assert.strictEqual(g.phase, 'roll'); assert.strictEqual(g.order[g.turn], 1);
});
test('ร้านค้า: หมดเวลาออกเอง', () => {
  const g = ready(2, seq(0)); g.layout[1] = 'shop'; g.roll(0); adv(g, 9); assert.strictEqual(g.phase, 'shop'); adv(g, 31); assert.notStrictEqual(g.phase, 'shop');
});
test('ช่องปริศนา: ทุกเหตุการณ์ทำงานโดยไม่พัง ช่องเต็มไม่ได้ไอเทม', () => {
  const { EVENTS } = require('../src/game.js');
  EVENTS.forEach((e, k) => {
    const g = ready(3, Math.random); g.layout[3] = 'mystery'; g.rng = (() => { let n = 0; return () => n++ === 0 ? 0.5 : Math.random(); })();
    g._pick = a => a === EVENTS ? e : a[0];
    g.items[0] = ['a', 'b', 'c', 'd', 'a', 'b', 'c', 'd'];
    g.pos[0] = 0; g.rng = seq(0.4); g.roll(0);       // 0.4*6 → 3
    assert.strictEqual(g.last.to, 3, e.id); assert.ok(/ช่องปริศนา/.test(g.msg));
    g.coins.forEach(c => assert.ok(c >= 0)); g.pos.forEach(p => assert.ok(p >= 0 && p < 24));
    assert.strictEqual(g.items[0].length, 8);
  });
});
test('จำลองสุ่มใช้ไอเทมและร้านค้า 300 เกม: ไม่ค้าง ค่าไม่ผิดปกติ', () => {
  for (let k = 0; k < 300; k++) {
    const g = mk(1 + (k % 4), Math.random); let st = 0;
    while (g.phase !== 'end' && st++ < 300000) {
      g.tick(0.1);
      g.coins.forEach(c => assert.ok(c >= 0 && isFinite(c))); g.pos.forEach(p => assert.ok(p >= 0 && p <= 24));
      g.items.forEach(a => assert.ok(a.length <= 8));
      const cur = g.order[g.turn];
      if (g.phase === 'roll') {
        if (Math.random() < 0.3 && g.items[cur].length) { const o = g.order.filter(x => x !== cur); g.useItem(cur, 0, o.length ? o[Math.floor(Math.random() * o.length)] : undefined); }
        if (Math.random() < 0.5) g.roll(cur);
      } else if (g.phase === 'shop') { if (Math.random() < 0.5) g.buy(cur, Math.floor(Math.random() * 4)); else g.leaveShop(cur); }
      if (Math.random() < 0.002 && g.order.length > 1) g.removePlayer(g.order[Math.floor(Math.random() * g.order.length)]);
    }
    assert.strictEqual(g.phase, 'end', 'ค้างที่ ' + g.phase);
  }
});
const MINIS = { a: { name: 'ก', dur: 2000 }, b: { name: 'ข', dur: 3000 } };
const mkm = (n, rng) => { const g = plain(mk(n, rng, { minis: MINIS })); g.order = Array.from({ length: n }, (_, i) => i); g.turn = 0; return g; };
const toMg = g => { g.order.forEach(() => { g.roll(g.order[g.turn]); adv(g, 12); }); if (g.phase === 'mgprep') g.order.slice().forEach(o => g.mgReady(o)); };
test('มินิเกม: ครบรอบแล้วเข้าเฟส mg พร้อม seed และคะแนนเริ่ม 0', () => {
  const g = mkm(2, roll6); toMg(g); assert.strictEqual(g.phase, 'mg'); assert.ok(g.mg.seed > 0); assert.ok(MINIS[g.mg.id]);
  assert.deepStrictEqual(g.snapshot().mg.scores, [0, 0, 0, 0]);
});
test('มินิเกม: ทุกคนส่งคะแนนสุดท้ายแล้วจบทันที แจก 10/7 ตามอันดับ', () => {
  const g = mkm(2, roll6); const c = g.coins.slice(); toMg(g); const c2 = g.coins.slice();
  g.mgScore(0, 30, false); g.mgScore(1, 55, true); assert.strictEqual(g.phase, 'mg'); g.mgScore(0, 31, true);
  assert.strictEqual(g.phase, 'mini'); assert.strictEqual(g.coins[1] - c2[1], 10); assert.strictEqual(g.coins[0] - c2[0], 7);
});
test('มินิเกม: คะแนนเท่ากันได้รางวัลอันดับสูงกว่าร่วมกัน', () => {
  const g = mkm(3, roll6); toMg(g); const c = g.coins.slice();
  g.mgScore(0, 10, true); g.mgScore(1, 10, true); g.mgScore(2, 5, true);
  assert.strictEqual(g.coins[0] - c[0], 10); assert.strictEqual(g.coins[1] - c[1], 10); assert.strictEqual(g.coins[2] - c[2], 4);
});
test('มินิเกม: ตั๋วทองคูณ 2, ข้อมูลคะแนนแปลกๆ ถูกเมิน, หมดเวลาจบเอง', () => {
  const g = mkm(2, roll6); g.ticket[0] = true; toMg(g); const c = g.coins.slice();
  assert.ok(!g.mgScore(0, NaN, true)); assert.ok(!g.mgScore(0, 'x', true)); assert.ok(!g.mgScore(5, 3, true));
  g.mgScore(0, 9e9, false); assert.strictEqual(g.mg.scores[0], 9999);
  adv(g, 9.2); assert.strictEqual(g.phase, 'mini'); assert.strictEqual(g.coins[0] - c[0], 20);
  adv(g, 6); assert.strictEqual(g.phase, 'roll');
});
test('มินิเกม: ไม่ซ้ำเกมเดิมติดกัน และคนออกกลางมินิเกมไม่ค้าง', () => {
  const g = mkm(2, Math.random); toMg(g); const first = g.mg.id; g.mgScore(0, 1, true); g.removePlayer(1); assert.strictEqual(g.phase, 'mini');
  const h = mkm(2, Math.random); h.lastMg = 'a'; toMg(h); assert.strictEqual(h.mg.id, 'b');
});
test('จำลองสุ่มพร้อมมินิเกม 200 เกม', () => {
  for (let k = 0; k < 200; k++) {
    const g = mk(1 + (k % 4), Math.random, { minis: MINIS }); let st = 0;
    while (g.phase !== 'end' && st++ < 300000) {
      g.tick(0.1); const cur = g.order[g.turn];
      if (g.phase === 'roll' && Math.random() < 0.5) g.roll(cur);
      if (g.phase === 'shop') g.leaveShop(cur);
      if (g.phase === 'mg') g.order.forEach(o => { if (Math.random() < 0.3) g.mgScore(o, Math.floor(Math.random() * 50), Math.random() < 0.3); });
      g.coins.forEach(c => assert.ok(c >= 0));
    }
    assert.strictEqual(g.phase, 'end');
  }
});
const SH = require('../src/shared.js');
test('มินิเกมสนามร่วม: เข้าเฟส mg พร้อม sim, อินพุตมีผล, จบแล้วแจกเหรียญ', () => {
  const g = plain(mk(2, roll6, { minis: {}, shared: { sumo: SH.GAMES.sumo } })); g.order = [0, 1]; g.turn = 0;
  g.roll(0); adv(g, 12); g.roll(1); adv(g, 12);
  assert.strictEqual(g.phase, 'mgprep'); g.mgReady(0); assert.strictEqual(g.phase, 'mgprep'); g.mgReady(1);
  assert.strictEqual(g.phase, 'mg'); assert.ok(g.sim); assert.strictEqual(g.snapshot().mg.kind, 'shared');
  g.mgScore(0, 99, true); assert.strictEqual(g.mg.scores[0], 0);       // ส่งคะแนนเองไม่ได้
  g.simInput(0, { x: 1, y: 0, a: false }); const c = g.coins.slice();
  for (let q = 0; q < 3000 && g.phase === 'mg'; q++) g.tick(0.1); assert.ok(g.phase === 'mini' || g.phase === 'roll', g.phase);
  assert.strictEqual(g.coins[0] + g.coins[1] - c[0] - c[1] >= 17, true);
});
test('จำลองสุ่มพร้อมสนามร่วม 100 เกม', () => {
  for (let k = 0; k < 100; k++) {
    const g = mk(1 + (k % 4), Math.random, { minis: MINIS, shared: SH.GAMES }); let st = 0;
    while (g.phase !== 'end' && st++ < 300000) {
      g.tick(0.1); const cur = g.order[g.turn];
      if (g.phase === 'roll' && Math.random() < 0.5) g.roll(cur);
      if (g.phase === 'shop') g.leaveShop(cur);
      if (g.phase === 'mg') g.order.forEach(o => { g.simInput(o, { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, a: Math.random() < 0.2 }); if (Math.random() < 0.2) g.mgScore(o, 5, true); });
      if (Math.random() < 0.003 && g.order.length > 1) g.removePlayer(g.order[0]);
    }
    assert.strictEqual(g.phase, 'end');
  }
});
test('ฉากเปิดรอบ: เริ่มด้วย intro ทอยไม่ได้ ข้ามครบทุกคนหรือหมดเวลาแล้วเริ่มตา', () => {
  const g = mk(2, roll6, { intro: true }); assert.strictEqual(g.phase, 'intro'); assert.ok(!g.roll(g.order[0]));
  g.skipIntro(0); assert.strictEqual(g.phase, 'intro'); g.skipIntro(1); assert.strictEqual(g.phase, 'roll');
  const h = mk(2, roll6, { intro: true }); adv(h, 27.5); assert.strictEqual(h.phase, 'roll');
});
test('ฉากเปิดรอบ: ขึ้นรอบใหม่ก็มี intro อีก และคนออกกลาง intro ไม่ค้าง', () => {
  const g = mk(2, roll6, { intro: true }); g.skipIntro(0); g.skipIntro(1);
  const cur = g.order[g.turn]; g.pos[cur] = 23; g.coins[cur] = 99; g.roll(cur); adv(g, 8); g.cherryChoice(cur, true); adv(g, 6);
  assert.strictEqual(g.phase, 'intro'); assert.strictEqual(g.round, 2);
  g.skipIntro(0); g.removePlayer(1); assert.strictEqual(g.phase, 'roll');
});

test('ห้องซ้อมมินิเกม: ทุกคนพร้อมจึงเริ่ม / หมดเวลาเริ่มเอง / คนออกแล้วเริ่มได้ / มีตารางผล', () => {
  const g = mkm(3, roll6); g.order.forEach(() => { g.roll(g.order[g.turn]); adv(g, 12); });
  assert.strictEqual(g.phase, 'mgprep'); assert.deepStrictEqual(g.snapshot().mg.ready, [false, false, false, false]);
  assert.ok(!g.mgReady(9)); g.mgScore(0, 5, true); assert.strictEqual(g.mg.scores[0], 0, 'ซ้อมไม่นับคะแนน');
  g.mgReady(0); g.mgReady(1); assert.strictEqual(g.phase, 'mgprep'); g.removePlayer(2); assert.strictEqual(g.phase, 'mg');
  const h = mkm(2, roll6); h.order.forEach(() => { h.roll(h.order[h.turn]); adv(h, 12); }); assert.strictEqual(h.phase, 'mgprep'); adv(h, 41); assert.strictEqual(h.phase, 'mg');
  g.mgScore(0, 30, true); g.mgScore(1, 10, true);
  const s = g.snapshot(); assert.strictEqual(g.phase, 'mini'); assert.deepStrictEqual(s.res.map(r => r.rank), [1, 2]); assert.strictEqual(s.res[0].slot, 0);
});
console.log('\nผ่าน ' + passed + ' ข้อ');
