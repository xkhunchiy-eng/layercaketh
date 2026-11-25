'use strict';
const assert = require('assert');
const C = require('../src/core.js');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('ok   ' + name); }
  catch (e) { console.log('FAIL ' + name + '\n     ' + e.message); process.exitCode = 1; }
}

function mkRoom() {
  const sent = [];
  const room = new C.HostRoom({ code: 'ABCDE', send: (id, m) => sent.push([id, m]) });
  return { room, sent };
}

test('รหัสห้อง: ยาว 5 ตัวและอยู่ในตัวอักษรที่อนุญาต', () => {
  for (let i = 0; i < 200; i++) {
    const c = C.makeCode();
    assert.strictEqual(c.length, 4);
    assert.ok(C.isValidCode(c), c);
  }
  assert.ok(!C.isValidCode('ABC0'));   // 0 ไม่อยู่ในชุดตัวอักษร
  assert.ok(!C.isValidCode('ABC'));
  assert.strictEqual(C.normalizeCode(' ab-cd2e9 '), 'ABCD');
});

test('ชื่อผู้เล่น: ตัดอักขระอันตราย ความยาว และค่าเริ่มต้น', () => {
  assert.strictEqual(C.sanitizeName('<b>ฟ้า</b>', 'x'), 'bฟ้า/b');
  assert.strictEqual(C.sanitizeName('   ', 'ผู้เล่น 1'), 'ผู้เล่น 1');
  assert.strictEqual(C.sanitizeName(123, 'ค่าเริ่ม'), 'ค่าเริ่ม');
  assert.strictEqual(Array.from(C.sanitizeName('a'.repeat(50), 'x')).length, 12);
});

test('เข้าห้อง: รับสูงสุด 4 คน คนที่ 5 ถูกปฏิเสธว่าเต็ม', () => {
  const { room, sent } = mkRoom();
  assert.ok(room.addPlayer('host', 'เจ้าของ', true).ok);
  ['g1', 'g2', 'g3'].forEach((id, i) => room.handle(id, { t: 'join', name: 'เพื่อน' + i }));
  assert.strictEqual(room.players.size, 4);
  room.handle('g4', { t: 'join', name: 'เกิน' });
  assert.strictEqual(room.players.size, 4);
  const rej = sent.filter(([id, m]) => id === 'g4' && m.t === 'rejected');
  assert.strictEqual(rej.length, 1);
  assert.strictEqual(rej[0][1].reason, 'full');
});

test('ช่องผู้เล่น: ไม่ซ้ำกัน และคนออกแล้วช่องว่างถูกใช้ซ้ำ', () => {
  const { room } = mkRoom();
  room.addPlayer('host', 'h', true);
  room.handle('a', { t: 'join', name: 'a' });
  room.handle('b', { t: 'join', name: 'b' });
  const slots = Array.from(room.players.values()).map(p => p.slot).sort();
  assert.deepStrictEqual(slots, [0, 1, 2]);
  room.removePlayer('a');
  room.handle('c', { t: 'join', name: 'c' });
  assert.strictEqual(room.players.get('c').slot, 1);
});

test('เข้าห้องซ้ำด้วย id เดิม: ไม่เพิ่มคน', () => {
  const { room } = mkRoom();
  room.addPlayer('host', 'h', true);
  room.handle('a', { t: 'join', name: 'a' });
  room.handle('a', { t: 'join', name: 'a' });
  assert.strictEqual(room.players.size, 2);
});

test('ส่ง lobby ให้ทุกคนที่ไม่ใช่เจ้าของห้องเมื่อมีคนเข้า', () => {
  const { room, sent } = mkRoom();
  room.addPlayer('host', 'h', true);
  room.handle('a', { t: 'join', name: 'a' });
  const toA = sent.filter(([id, m]) => id === 'a' && m.t === 'lobby');
  assert.ok(toA.length >= 1);
  assert.strictEqual(toA[toA.length - 1][1].players.length, 2);
  assert.ok(!sent.some(([id]) => id === 'host'));
});

test('ผู้เล่นอื่นสั่งเริ่มเกมไม่ได้ เฉพาะเมธอดของเจ้าของห้อง', () => {
  const { room } = mkRoom();
  room.addPlayer('host', 'h', true);
  room.handle('a', { t: 'join', name: 'a' });
  room.handle('a', { t: 'start' });
  assert.strictEqual(room.phase, 'lobby');
  assert.ok(room.hostStart());
  assert.strictEqual(room.phase, 'arena');
});

test('เกมเริ่มแล้วไม่รับคนเข้าเพิ่ม', () => {
  const { room, sent } = mkRoom();
  room.addPlayer('host', 'h', true);
  room.hostStart();
  room.handle('late', { t: 'join', name: 'late' });
  assert.strictEqual(room.players.size, 1);
  assert.strictEqual(sent.find(([id]) => id === 'late')[1].reason, 'started');
});

test('การเดิน: ความเร็วตรงตามค่าและทิศหันถูกต้อง', () => {
  const { room } = mkRoom();
  room.addPlayer('host', 'h', true);
  room.hostStart();
  const p = room.players.get('host');
  const x0 = p.x, z0 = p.z;
  room.setInput('host', 0, 1);
  for (let i = 0; i < 10; i++) room.tick(0.05); // 0.5 วินาที
  assert.ok(Math.abs((p.z - z0) - C.CFG.SPEED * 0.5) < 1e-6, 'เดินระยะผิด ' + (p.z - z0));
  assert.ok(Math.abs(p.x - x0) < 1e-9);
  assert.ok(Math.abs(p.h - 0) < 1e-9);   // เดินไป +z = หันหลังให้กล้อง = heading 0
  room.setInput('host', 1, 0);
  room.tick(0.05);
  assert.ok(Math.abs(p.h - Math.PI / 2) < 1e-9);
});

test('เดินเฉียงไม่เร็วกว่าเดินตรง (ปรับให้ยาวไม่เกิน 1)', () => {
  const { room } = mkRoom();
  room.addPlayer('host', 'h', true);
  room.hostStart();
  const p = room.players.get('host');
  const x0 = p.x, z0 = p.z;
  room.setInput('host', 1, 1);
  room.tick(0.1);
  const d = Math.hypot(p.x - x0, p.z - z0);
  assert.ok(Math.abs(d - C.CFG.SPEED * 0.1) < 1e-6, String(d));
});

test('ข้อมูลอินพุตแปลกๆ จากเครือข่ายไม่ทำให้พัง', () => {
  const { room } = mkRoom();
  room.addPlayer('host', 'h', true);
  room.handle('a', { t: 'join', name: 'a' });
  room.hostStart();
  [null, undefined, 5, 'x', [], { t: 'input', x: NaN, z: Infinity }, { t: 'input', x: 'a', z: {} },
    { t: 'input', x: 9999, z: -9999 }, { t: 'nope' }].forEach(m => room.handle('a', m));
  room.tick(0.05);
  const p = room.players.get('a');
  assert.ok(isFinite(p.x) && isFinite(p.z));
  assert.ok(Math.hypot(p.ix, p.iz) <= 1 + 1e-9);
});

test('ผู้เล่นที่ไม่ได้อยู่ในห้องส่ง input ไม่มีผล', () => {
  const { room } = mkRoom();
  room.addPlayer('host', 'h', true);
  room.hostStart();
  room.handle('stranger', { t: 'input', x: 1, z: 1 });
  assert.strictEqual(room.players.size, 1);
});

test('ขอบสนาม: เดินไม่ทะลุออกนอกจาน', () => {
  const { room } = mkRoom();
  room.addPlayer('host', 'h', true);
  room.hostStart();
  room.setInput('host', 1, 0);
  for (let i = 0; i < 200; i++) room.tick(0.05);
  const p = room.players.get('host');
  assert.ok(Math.hypot(p.x, p.z) <= C.CFG.ARENA_R - C.CFG.PLAYER_R + 1e-9);
});

test('การชน: ผู้เล่นไม่ซ้อนกัน', () => {
  const { room } = mkRoom();
  room.addPlayer('host', 'h', true);
  room.handle('a', { t: 'join', name: 'a' });
  room.hostStart();
  const h = room.players.get('host'), a = room.players.get('a');
  h.x = 0; h.z = 0; a.x = 0.1; a.z = 0;
  room.tick(0.016);
  assert.ok(Math.hypot(h.x - a.x, h.z - a.z) >= C.CFG.PLAYER_R * 2 - 1e-6);
  // ตำแหน่งตรงกันพอดีก็ต้องแยกออก ไม่เกิด NaN
  h.x = 1; h.z = 1; a.x = 1; a.z = 1;
  room.tick(0.016);
  assert.ok(isFinite(h.x) && isFinite(a.x));
  assert.ok(Math.hypot(h.x - a.x, h.z - a.z) >= C.CFG.PLAYER_R * 2 - 1e-6);
});

test('การชนเมื่อ 4 คนเบียดกันตรงขอบ: ยังอยู่ในสนามและไม่เป็น NaN', () => {
  const { room } = mkRoom();
  room.addPlayer('host', 'h', true);
  ['a', 'b', 'c'].forEach(id => room.handle(id, { t: 'join', name: id }));
  room.hostStart();
  room.players.forEach(p => { p.x = 6; p.z = 0; });
  for (let i = 0; i < 30; i++) room.tick(0.016);
  room.players.forEach(p => {
    assert.ok(isFinite(p.x) && isFinite(p.z));
    assert.ok(Math.hypot(p.x, p.z) <= C.CFG.ARENA_R - C.CFG.PLAYER_R + 1e-6);
  });
});

test('tick ในล็อบบี้: เดินได้ในห้องรอ (ยังไม่เริ่มเกม)', () => {
  const { room } = mkRoom();
  room.addPlayer('host', 'h', true);
  room.setInput('host', 1, 0);
  const x = room.players.get('host').x;
  room.tick(0.1);
  assert.ok(room.players.get('host').x !== x);
});

test('snapshot: รูปแบบถูกต้อง และ broadcast ส่งเฉพาะคนที่ไม่ใช่เจ้าของห้อง', () => {
  const { room, sent } = mkRoom();
  room.addPlayer('host', 'h', true);
  room.handle('a', { t: 'join', name: 'a' });
  room.hostStart();
  sent.length = 0;
  const snap = room.broadcastState();
  assert.strictEqual(snap.t, 'state');
  assert.strictEqual(snap.p.length, 2);
  snap.p.forEach(r => { assert.strictEqual(r.length, 6); r.forEach(v => assert.ok(isFinite(v))); });
  assert.strictEqual(sent.length, 1);
  assert.strictEqual(sent[0][0], 'a');
});

test('กลับล็อบบี้: หยุดเดินและกลับมารับคนเข้าได้', () => {
  const { room } = mkRoom();
  room.addPlayer('host', 'h', true);
  room.hostStart();
  room.setInput('host', 1, 0);
  assert.ok(room.hostBack());
  assert.strictEqual(room.phase, 'lobby');
  assert.strictEqual(room.players.get('host').ix, 0);
  room.handle('n', { t: 'join', name: 'n' });
  assert.strictEqual(room.players.size, 2);
});

test('dt ผิดปกติ (ติดลบ ยักษ์ NaN) ไม่ทำให้ตำแหน่งกระโดด', () => {
  const { room } = mkRoom();
  room.addPlayer('host', 'h', true);
  room.hostStart();
  const p = room.players.get('host');
  room.setInput('host', 0, 1);
  const z0 = p.z;
  room.tick(-5); room.tick(NaN);
  assert.strictEqual(p.z, z0);
  room.tick(100); // ถูกจำกัดที่ 0.1 วินาที
  assert.ok(Math.abs(p.z - z0) <= C.CFG.SPEED * 0.1 + 1e-9);
});

console.log('\nผ่าน ' + passed + ' ข้อ' + (process.exitCode ? ' (มีข้อที่ไม่ผ่าน)' : ''));

// ---- เกมหลักผ่านห้อง ----
(function () {
  const { Game } = require('../src/game.js');
  const sent = [];
  const room = new C.HostRoom({ code: 'ABCDE', send: (id, m) => sent.push([id, m]), Game });
  room.addPlayer('host', 'h', true); room.handle('a', { t: 'join', name: 'a' });
  test('เริ่มเกมหลัก: ส่ง game ให้ผู้เล่นอื่น และเฉพาะเจ้าของห้องสั่งเริ่มได้', () => {
    room.handle('a', { t: 'startgame' }); assert.strictEqual(room.phase, 'lobby');
    assert.ok(room.hostStartGame()); assert.strictEqual(room.phase, 'game');
    assert.ok(sent.some(([id, m]) => id === 'a' && m.t === 'game'));
  });
  test('roll จากเครือข่าย: เฉพาะคนที่ถึงตา (หลังข้ามฉากเปิดรอบ)', () => {
    assert.strictEqual(room.game.phase, 'intro'); room.handle('a', { t: 'skip' }); room.handle('host', { t: 'skip' }); assert.strictEqual(room.game.phase, 'roll');
    const cur = room.game.order[room.game.turn]; const curId = cur === room.players.get('host').slot ? 'host' : 'a';
    const otherId = curId === 'host' ? 'a' : 'host';
    room.handle(otherId, { t: 'roll' }); assert.strictEqual(room.game.phase, 'roll');
    room.handle(curId, { t: 'roll' }); assert.strictEqual(room.game.phase, 'busy');
  });
  test('ผู้เล่นหลุดกลางเกม: เกมยังเดินต่อ', () => {
    room.removePlayer('a'); for (let i = 0; i < 400; i++) room.tick(0.05);
    assert.ok(room.game.order.length === 1);
  });
  test('กลับห้องรอจากเกม', () => { assert.ok(room.hostBack()); assert.strictEqual(room.game, null); });
  console.log('\nผ่าน ' + passed + ' ข้อ (รวมเกมหลัก)');
})();

test('ห้องรอ: กดพร้อม/เดินได้ในห้องรอ และเริ่มได้เมื่อทุกคนพร้อม', () => {
  const out = [];
  const room = new C.HostRoom({ code: 'ABCD', send: (id, m) => out.push([id, m]), Game: function () { this.snapshot = () => ({}); this.tick = () => {}; } });
  room.addPlayer('host', 'เจ้าของ', true); room.addPlayer('g1', 'เพื่อน', false);
  assert.strictEqual(room.allReady(), false);
  room.handle('g1', { t: 'ready', v: true });
  assert.strictEqual(room.allReady(), true);
  assert.ok(room.lobbyInfo().players.find(p => p.slot === 1).ready);
  const x0 = room.players.get('g1').x;
  room.handle('g1', { t: 'input', x: 1, z: 0 }); room.tick(0.1);
  assert.ok(room.players.get('g1').x > x0, 'เดินได้ในห้องรอ');
  room.handle('g1', { t: 'ready', v: false });
  assert.strictEqual(room.allReady(), false);
  const solo = new C.HostRoom({ code: 'SOLO' }); solo.addPlayer('host', 'a', true);
  assert.strictEqual(solo.allReady(), true);
});
test('สีอัตโนมัติ: เลือกตัวละครเดียวกันแล้วสีไม่ซ้ำ + มีตัวละคร 4 แบบ', () => {
  const { room } = mkRoom();
  room.addPlayer('a', 'เอ', true, 0); room.addPlayer('b', 'บี', false, 0); room.addPlayer('c', 'ซี', false, 1); room.addPlayer('d', 'ดี', false, 3);
  const cols = [...room.players.values()].map(p => p.col); assert.strictEqual(new Set(cols).size, 4);
  assert.strictEqual(room.players.get('a').col, 0);   // คนแรกได้สีประจำตัวละคร
  assert.notStrictEqual(room.players.get('b').col, 0); // คนที่สองเลือกลูกอมเหมือนกัน → เปลี่ยนสีให้
});
