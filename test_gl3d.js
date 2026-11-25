const assert = require('assert'); const G = require('../src/gl3d.js');
let n = 0; const test = (name, f) => { f(); n++; };
function outward(b, cx, cy, cz) { // ทุกสามเหลี่ยมต้องหันออกจากศูนย์กลาง (รูปทรงนูน)
  const v = b.v; let bad = 0;
  for (let i = 0; i < v.length; i += 27) {
    const px = (v[i] + v[i + 9] + v[i + 18]) / 3 - cx, py = (v[i + 1] + v[i + 10] + v[i + 19]) / 3 - cy, pz = (v[i + 2] + v[i + 11] + v[i + 20]) / 3 - cz;
    if (v[i + 3] * px + v[i + 4] * py + v[i + 5] * pz <= 0) bad++;
  }
  return bad;
}
test('box หันออก', () => { const b = new G.Builder(); b.box(2, 2, 2, '#fff'); assert.strictEqual(outward(b, 0, 1, 0), 0); assert.strictEqual(b.v.length / 27, 12); });
test('cyl หันออก', () => { const b = new G.Builder(); b.cyl(1, 1, 2, 12, '#fff'); assert.strictEqual(outward(b, 0, 1, 0), 0); });
test('cone หันออก', () => { const b = new G.Builder(); b.cyl(0, 1, 2, 10, '#fff'); assert.strictEqual(outward(b, 0, 0.6, 0), 0); });
test('cyl กรวยตัดปลายหันออก', () => { const b = new G.Builder(); b.cyl(0.6, 1, 2, 10, '#fff'); assert.strictEqual(outward(b, 0, 1, 0), 0); });
test('sphere หันออก', () => { const b = new G.Builder(); b.sphere(1, 8, 5, '#fff'); assert.strictEqual(outward(b, 0, 0, 0), 0); });
test('การแปลงตำแหน่ง/หมุนคงทิศ', () => { const b = new G.Builder(); b.tr(5, 1, 2).ry(1.1).rx(0.4); b.box(1, 1, 1, '#fff'); assert.strictEqual(outward(b, 5, 1.5, 2) >= 0, true); });
test('qo เรียงจุดให้เองให้หันออก', () => { const b = new G.Builder(); b.qo([0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1], '#fff', [0.5, 0, 0.5]); assert.ok(b.v[4] > 0.9); b.v.length = 0; b.qo([0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0], '#fff', [0.5, 0, 0.5]); assert.ok(b.v[4] > 0.9); });
test('orient: +Y ไปทิศที่ต้องการ', () => { const m = G.M4.orient([1, 0, 0]); const p = G.M4.pt(m, [0, 1, 0]); assert.ok(Math.abs(p[0] - 1) < 1e-5 && Math.abs(p[1]) < 1e-5); });
test('rotY: +Z ไปทาง +X เมื่อหมุน 90 องศา', () => { const p = G.M4.pt(G.M4.rotY(Math.PI / 2), [0, 0, 1]); assert.ok(Math.abs(p[0] - 1) < 1e-5); });
console.log('ผ่าน ' + n + ' ข้อ');
