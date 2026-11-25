const ML = require('../src/modelload.js'); let ok = 0; const eq = (c, m) => { if (!c) { console.log('ล้ม:', m); process.exit(1); } ok++; };
const obj = 'v -1 0 -1\nv 1 0 -1\nv 1 4 -1\nv -1 4 -1\nv 0 2 1\nusemtl a\nf 1 2 3 4\nf 1 2 5\n', mtl = 'newmtl a\nKd 1 0 0\n';
const r = ML.fromOBJ(obj, mtl, { height: 2 });
eq(r.tris === 3, 'สามเหลี่ยม 3'); eq(Math.abs(r.size[1] - 2) < 1e-6, 'สูง 2'); eq(r.builder.v.length === 3 * 27, 'ข้อมูล');
// สร้าง GLB เล็กๆ: สามเหลี่ยมเดียว
const pos = new Float32Array([0, 0, 0, 1, 0, 0, 0, 3, 0]), json = { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, scale: [2, 2, 2] }], meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }], materials: [{ pbrMetallicRoughness: { baseColorFactor: [0, 1, 0, 1] } }], accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3' }], bufferViews: [{ buffer: 0, byteLength: 36 }], buffers: [{ byteLength: 36 }] };
let js = Buffer.from(JSON.stringify(json)); while (js.length % 4) js = Buffer.concat([js, Buffer.from(' ')]);
const bin = Buffer.from(pos.buffer), total = 12 + 8 + js.length + 8 + bin.length, out = Buffer.alloc(total);
out.writeUInt32LE(0x46546C67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(total, 8);
out.writeUInt32LE(js.length, 12); out.writeUInt32LE(0x4E4F534A, 16); js.copy(out, 20);
out.writeUInt32LE(bin.length, 20 + js.length); out.writeUInt32LE(0x004E4942, 24 + js.length); bin.copy(out, 28 + js.length);
const g = ML.fromGLB(out.buffer.slice(out.byteOffset, out.byteOffset + out.length), { height: 2 });
eq(g.tris === 1, 'GLB 1 สามเหลี่ยม'); eq(Math.abs(g.size[1] - 2) < 1e-6, 'GLB สูง 2'); eq(g.builder.v[7] > 0.9 && g.builder.v[6] < 0.1, 'สีเขียว');
console.log('ผ่าน', ok, 'ข้อ');
