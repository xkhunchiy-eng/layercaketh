/* โมเดล 3D ของไอเทม 13 ชิ้น (low-poly) — สร้างจากรูปทรงพื้นฐานของ gl3d  ใช้: var IM = ItemModels(G, R); IM.mesh[id] */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(); else root.ItemModels = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var PI = Math.PI;
  var IDS = ['double', 'giant', 'slow', 'lock', 'gamble', 'triple', 'reverse', 'swap', 'steal', 'slip', 'freeze', 'magnet', 'ticket'];
  var NAMES = { double: 'เต๋าคู่', giant: 'เต๋ายักษ์', slow: 'เต๋าช้า', lock: 'เต๋าล็อกเลข', gamble: 'เต๋าเสี่ยงดวง', triple: 'เต๋าสามลูก', reverse: 'เต๋ากลับด้าน', swap: 'ปืนสลับที่', steal: 'ขโมยเหรียญ', slip: 'ครีมลื่น', freeze: 'แช่แข็ง', magnet: 'แม่เหล็กดูดเหรียญ', ticket: 'ตั๋วทอง' };
  var PIP = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
  function cb(b, x, y, z, sx, sy, sz, col) { b.push().tr(x, y - sy / 2, z); b.box(sx, sy, sz, col); b.pop(); }   // กล่องจัดกึ่งกลาง
  function disc(b, x, y, z, ax, r, t, col, seg) { b.push().tr(x, y, z); if (ax === 'z') b.rx(PI / 2); else if (ax === 'x') b.rz(-PI / 2); b.cyl(r, r, t, seg || 12, col); b.pop(); }   // จานกลมบาง แกน y/z/x
  function ball(b, x, y, z, r, col, sw, sh) { b.push().tr(x, y, z); b.sphere(r, sw || 8, sh || 6, col); b.pop(); }
  // ลูกเต๋ามุมมน (ฐานอยู่ที่ y=0 สูง s) จุดกลมนูน
  function die(b, s, body, pip, nTop, nFront, nRight, rim) {
    var r = s * 0.1, i, k, e = s / 2 - r, h = s / 2, col = body;
    b.push().tr(0, h, 0);
    cb(b, 0, 0, 0, s, s - 2 * r, s - 2 * r, col); cb(b, 0, 0, 0, s - 2 * r, s, s - 2 * r, col); cb(b, 0, 0, 0, s - 2 * r, s - 2 * r, s, col);
    [-1, 1].forEach(function (a) { [-1, 1].forEach(function (c) {
      b.push().tr(a * e, 0, c * e).tr(0, -e, 0); b.cyl(r, r, 2 * e, 7, col); b.pop();
      b.push().tr(0, a * e, c * e).rz(-PI / 2).tr(0, -e, 0); b.cyl(r, r, 2 * e, 7, col); b.pop();
      b.push().tr(a * e, c * e, 0).rx(PI / 2).tr(0, -e, 0); b.cyl(r, r, 2 * e, 7, col); b.pop();
      [-1, 1].forEach(function (d) { ball(b, a * e, c * e, d * e, r, col, 7, 5); });
    }); });
    b.pop();
    var pr = s * 0.095, g = s * 0.25, t = s * 0.035, pc = pip, e2 = 0.002;   // หน้า: บน1 ล่าง6 หน้า2 หลัง5 ขวา3 ซ้าย4
    PIP[1].forEach(function (q) { disc(b, q[0] * g, s - e2, q[1] * g, 'y', pr, t, pc, 12); });
    PIP[6].forEach(function (q) { disc(b, q[0] * g, e2 - t, q[1] * g, 'y', pr, t, pc, 12); });
    PIP[2].forEach(function (q) { disc(b, q[0] * g, s / 2 - q[1] * g, s / 2 - e2, 'z', pr, t, pc, 12); });
    PIP[5].forEach(function (q) { disc(b, q[0] * g, s / 2 - q[1] * g, -s / 2 + e2 - t, 'z', pr, t, pc, 12); });
    PIP[3].forEach(function (q) { disc(b, s / 2 - e2, s / 2 - q[1] * g, q[0] * g, 'x', pr, t, pc, 12); });
    PIP[4].forEach(function (q) { disc(b, -s / 2 + e2 - t, s / 2 - q[1] * g, q[0] * g, 'x', pr, t, pc, 12); });
    if (rim) { /* ขอบสีพิเศษ */ }
  }
  function star(b, r, col, x, y, z) { b.push().tr(x, y, z); b.sphere(r * 0.45, 7, 5, col); for (var i = 0; i < 5; i++) { b.push().rz(i * 1.2566); b.cyl(0, r * 0.4, r, 5, col); b.pop(); } b.pop(); }
  // เส้นโซ่ต่อกันตามเส้นทางสี่เหลี่ยม: pts=[[x,y,z],...] ปิดวง  ลิงก์เว้นระยะ gap
  function chain(b, pts, gap, c1, c2) {
    var n = 0, i, j;
    for (i = 0; i < pts.length; i++) {
      var p = pts[i], q = pts[(i + 1) % pts.length], d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], L = Math.hypot(d[0], d[1], d[2]), steps = Math.max(1, Math.round(L / gap));
      for (j = 0; j < steps; j++) {
        var f = (j + 0.5) / steps, x = p[0] + d[0] * f, y = p[1] + d[1] * f, z = p[2] + d[2] * f; b.push().tr(x, y, z);
        if (Math.abs(d[0]) > 1e-6) b.rz(-PI / 2); else if (Math.abs(d[2]) > 1e-6) b.rx(PI / 2);
        if (n % 2) { b.sc(1, 1, 0.45); b.tr(0, -gap * 0.6, 0); b.cyl(0.085, 0.085, gap * 1.2, 7, c2); } else { b.tr(0, -gap * 0.55, 0); b.cyl(0.06, 0.06, gap * 1.1, 7, c1); }
        b.pop(); n++;
      }
    }
  }
  function coin(b, x, y, z, r, ax) { disc(b, x, y, z, ax || 'y', r, r * 0.22, '#e5a812', 14); disc(b, x, y + (ax === 'z' || ax === 'x' ? 0 : r * 0.02), z, ax || 'y', r * 0.8, r * 0.24, '#ffe066', 14); }

  /* ---------- ลูกเต๋าหลายเหลี่ยม (d10 สิบหน้า / d8 แปดหน้า) พร้อมตัวเลขบนหน้า (เลข 7 ส่วน) ---------- */
  var SEG = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
  function v3sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function v3cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function v3dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function v3n(a) { var l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  function digits(b, c, r, u, n, text, hd, col) {
    var w = hd * 0.55, gap = hd * 0.28, th = hd * 0.17, tk = hd * 0.07, len = text.length, tot = len * w + (len - 1) * gap, i;
    var F = [r[0], r[1], r[2], 0, n[0], n[1], n[2], 0, -u[0], -u[1], -u[2], 0, c[0] + n[0] * 0.004, c[1] + n[1] * 0.004, c[2] + n[2] * 0.004, 1];
    var segs = { a: [0, -hd / 2, 1], b: [w / 2, -hd / 4, 0], c: [w / 2, hd / 4, 0], d: [0, hd / 2, 1], e: [-w / 2, hd / 4, 0], f: [-w / 2, -hd / 4, 0], g: [0, 0, 1] };
    for (i = 0; i < len; i++) {
      var x0 = -tot / 2 + w / 2 + i * (w + gap), code = SEG[+text[i]];
      for (var k = 0; k < code.length; k++) {
        var sg = segs[code[k]]; b.push(); b.m = M4m(b.m, F); b.tr(x0 + sg[0], 0, sg[1]);
        if (sg[2]) b.box(w + th, tk, th, col); else b.box(th, tk, hd / 2 + th * 0.2, col);
        b.pop();
      }
    }
  }
  function M4m(a, b) { var o = new Array(16), i, j, k; for (i = 0; i < 4; i++) for (j = 0; j < 4; j++) { var v = 0; for (k = 0; k < 4; k++) v += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = v; } return o; }
  // faces: [{v:[จุด...], label}] ; คืนกรอบหน้า {label: [{r,u,n}]} (พิกัดรอบจุดกึ่งกลางลูกเต๋า)
  function polyDie(b, h, faces, body, ink, hd) {
    var out = {}; b.push().tr(0, h, 0);
    var edge = shade(body, 0.55);
    faces.forEach(function (f) {
      var vs = f.v, c = [0, 0, 0], i, k = vs.length; vs.forEach(function (p) { c[0] += p[0] / k; c[1] += p[1] / k; c[2] += p[2] / k; });
      var n = v3n(v3cross(v3sub(vs[1], vs[0]), v3sub(vs[2], vs[0]))), flip = v3dot(n, c) < 0; if (flip) { n = [-n[0], -n[1], -n[2]]; }
      // จุดกลางหน้า: ว่าวใช้จุดบนแกนยอด→ปลาย (สมมาตรตาเห็น) สามเหลี่ยมใช้จุดศูนย์กลาง
      var ctr = k === 4 ? [vs[0][0] + (vs[2][0] - vs[0][0]) * 0.58, vs[0][1] + (vs[2][1] - vs[0][1]) * 0.58, vs[0][2] + (vs[2][2] - vs[0][2]) * 0.58] : c;
      for (i = 0; i < k; i++) { var p1 = vs[i], p2 = vs[(i + 1) % k]; if (flip) b.tri(ctr, p2, p1, edge); else b.tri(ctr, p1, p2, edge); }   // ขอบเข้ม
      var off = 0.012 * h, ins = 0.9;   // หน้าเรียบซ้อนนูนเล็กน้อย ย่อ 10% เห็นเป็นกรอบ
      var iv = vs.map(function (p) { return [ctr[0] + (p[0] - ctr[0]) * ins + n[0] * off, ctr[1] + (p[1] - ctr[1]) * ins + n[1] * off, ctr[2] + (p[2] - ctr[2]) * ins + n[2] * off]; });
      var cc = [ctr[0] + n[0] * off, ctr[1] + n[1] * off, ctr[2] + n[2] * off];
      for (i = 0; i < k; i++) { var q1 = iv[i], q2 = iv[(i + 1) % k]; if (flip) b.tri(cc, q2, q1, body); else b.tri(cc, q1, q2, body); }
      var up = [0, 1, 0], d = v3dot(up, n); up = [up[0] - n[0] * d, up[1] - n[1] * d, up[2] - n[2] * d]; if (Math.hypot(up[0], up[1], up[2]) < 0.2) up = [0, 0, 1], d = v3dot(up, n), up = [up[0] - n[0] * d, up[1] - n[1] * d, up[2] - n[2] * d];
      var u = v3n(up), r = v3cross(u, n); r = v3n(r);
      digits(b, [cc[0] + n[0] * 0.004, cc[1] + n[1] * 0.004, cc[2] + n[2] * 0.004], r, u, n, String(f.label), hd, ink);
      (out[f.label] = out[f.label] || []).push({ r: r, u: u, n: n });
    });
    b.pop(); return out;
  }
  function shade(col, k) { var h = col.replace('#', ''), v = [0, 2, 4].map(function (o) { return Math.max(0, Math.min(255, Math.round(parseInt(h.substr(o, 2), 16) * k))); }); return '#' + v.map(function (x) { return (x < 16 ? '0' : '') + x.toString(16); }).join(''); }
  function d10(b, s, body, ink) {
    var h = s / 2, r = h * 0.92, a = 0.10557 * h, U = [], L = [], i, faces = [], T = [0, h, 0], Bt = [0, -h, 0];
    for (i = 0; i < 5; i++) { var an = i * 2 * PI / 5, an2 = an + PI / 5; U.push([Math.sin(an) * r, a, Math.cos(an) * r]); L.push([Math.sin(an2) * r, -a, Math.cos(an2) * r]); }
    for (i = 0; i < 5; i++) {
      faces.push({ v: [T, U[i], L[i], U[(i + 1) % 5]], label: i * 2 + 1 });
      faces.push({ v: [Bt, L[i], U[(i + 1) % 5], L[(i + 1) % 5]], label: i === 4 ? 10 : i * 2 + 2 });
    }
    return polyDie(b, h, faces, body, ink, h * 0.5);
  }
  function d8(b, s, body, ink) {
    var R = s / 2, faces = [];
    [1, -1].forEach(function (sx) { [1, -1].forEach(function (sy) { [1, -1].forEach(function (sz) { faces.push({ v: [[sx * R, 0, 0], [0, sy * R, 0], [0, 0, sz * R]], label: sx * sy * sz > 0 ? 10 : 0 }); }); }); });
    return polyDie(b, R, faces, body, ink, R * 0.42);
  }

  function build(id, G) {
    var b = new G.Builder(), i, a, prop = false; b.jit = 0.012;
    if (/^(steal|slip|ticket|magnet)p$/.test(id)) { prop = true; id = id.slice(0, -1); }
    if (id === 'lockchain') {
      var hh = 0.69, yy = 0.65, YY = 1.34;
      chain(b, [[-hh, yy, -hh], [hh, yy, -hh], [hh, yy, hh], [-hh, yy, hh]], 0.19, '#d3d8de', '#8d96a1');
      chain(b, [[0, -0.04, -hh], [0, -0.04, hh], [0, YY, hh], [0, YY, -hh]], 0.19, '#d3d8de', '#8d96a1');
      return b;
    }
    if (id === 'lockbody') {
      cb(b, 0, 0, 0, 0.72, 0.52, 0.32, { t: '#ffd24a', b: '#a67c00', s: '#f2b705' });
      cb(b, 0, 0, 0.165, 0.58, 0.4, 0.02, '#c99400'); cb(b, 0, 0.23, 0.172, 0.6, 0.035, 0.012, '#ffe9a0');
      [[-0.25, 0.15], [0.25, 0.15], [-0.25, -0.15], [0.25, -0.15]].forEach(function (q) { ball(b, q[0], q[1], 0.18, 0.03, '#fff0b0', 6, 4); });
      disc(b, 0, 0.06, 0.176, 'z', 0.065, 0.02, '#2a1a00', 12); cb(b, 0, -0.04, 0.186, 0.04, 0.13, 0.02, '#2a1a00');
      return b;
    }
    if (id === 'lockshackle') {
      cb(b, 0, 0.15, 0, 0.09, 0.5, 0.09, '#e3e7ec'); cb(b, 0.44, 0.1, 0, 0.09, 0.4, 0.09, '#e3e7ec');
      for (i = 0; i <= 12; i++) { a = i / 12 * PI; ball(b, 0.22 + Math.cos(a) * 0.22, 0.4 + Math.sin(a) * 0.22, 0, 0.055, '#e3e7ec', 6, 4); }
      return b;
    }
    if (id === 'lockkey') {
      cb(b, 0, 0, 0.27, 0.05, 0.05, 0.54, '#ffd43b'); cb(b, 0, -0.06, 0.1, 0.045, 0.08, 0.06, '#ffd43b'); cb(b, 0, -0.05, 0.2, 0.045, 0.06, 0.06, '#ffd43b');
      for (i = 0; i < 12; i++) { a = i / 12 * PI * 2; ball(b, Math.cos(a) * 0.14, 0.14 + Math.sin(a) * 0.14, 0.6, 0.04, '#ffe27a', 6, 4); }
      return b;
    }
    if (id === 'shard') { b.push().tr(0, -0.5, 0); b.box(1, 1, 1, { t: '#f4f6f8', b: '#8d96a1', s: '#d3d8de' }); b.pop(); return b; }
    if (id === 'double') {
      b.push().tr(-0.55, 0, 0.1).ry(0.35); die(b, 1.0, '#ffffff', '#2a2433', 3, 2, 5); b.pop();
      b.push().tr(0.6, 0, -0.1).ry(-0.4); die(b, 1.0, '#fff4d6', '#2a2433', 4, 6, 1); b.pop();
    } else if (id === 'giant') {
      b.push().ry(0.5); d10(b, 1.9, '#e8363f', '#ffffff'); b.pop();
    } else if (id === 'slow') {
      b.push().ry(0.4); die(b, 1.2, '#4dabf7', '#ffffff', 3, 2, 1); b.pop();
    } else if (id === 'lock') {
      b.push().ry(0.3); die(b, 1.3, '#ffd43b', '#3a2a00', 4, 1, 6);
      var h = 0.69, y0 = 0.65, Y1 = 1.34;
      chain(b, [[-h, y0, -h], [h, y0, -h], [h, y0, h], [-h, y0, h]], 0.19, '#d3d8de', '#8d96a1');
      chain(b, [[0, -0.04, -h], [0, -0.04, h], [0, Y1, h], [0, Y1, -h]], 0.19, '#d3d8de', '#8d96a1');
      b.push().tr(0, 0.28, 0.78);
      for (i = 0; i <= 10; i++) { a = i / 10 * PI; ball(b, Math.cos(a) * 0.2, 0.62 + Math.sin(a) * 0.26, 0, 0.065, '#e3e7ec', 6, 4); }
      cb(b, -0.2, 0.7, 0, 0.1, 0.36, 0.1, '#e3e7ec'); cb(b, 0.2, 0.7, 0, 0.1, 0.36, 0.1, '#e3e7ec');
      b.push().tr(0, 0, 0); b.box(0.66, 0.56, 0.3, { t: '#e0a800', b: '#a67c00', s: '#f2b705' }); b.pop();
      cb(b, 0, 0.52, 0.16, 0.5, 0.06, 0.02, '#ffd966'); disc(b, 0, 0.3, 0.16, 'z', 0.07, 0.04, '#33261a', 10); cb(b, 0, 0.24, 0.17, 0.05, 0.14, 0.03, '#33261a');
      b.pop(); b.pop();
    } else if (id === 'gamble') {
      b.push().ry(0.4); d8(b, 1.7, '#22222c', '#ff3b3b'); b.pop();
    } else if (id === 'triple') {
      b.push().tr(-0.52, 0, 0).ry(0.2); die(b, 0.9, '#ffffff', '#2a2433', 2, 5, 3); b.pop();
      b.push().tr(0.52, 0, 0.05).ry(-0.25); die(b, 0.9, '#ffffff', '#2a2433', 6, 4, 2); b.pop();
      b.push().tr(0, 0.9, -0.02).ry(0.5); die(b, 0.9, '#ffd43b', '#3a2a00', 1, 3, 6); b.pop();
    } else if (id === 'reverse') {
      b.push().ry(0.4); die(b, 1.35, '#19c2a0', '#ffffff', 5, 3, 2); b.pop();
    } else if (id === 'swap') {
      var PK = { t: '#ff9ac0', b: '#c2255c', s: '#ff5c93' }, DK = '#8f1c44', ME = '#f1ecff';
      b.push().tr(0, 0.95, 0).rz(0.1).sc(0.85, 0.85, 0.85);
      cb(b, 0, 0, 0, 1.5, 0.7, 0.55, PK);                                   // ตัวปืน
      cb(b, 0.0, 0.43, 0, 1.2, 0.16, 0.4, '#ffd0e2');                       // สันบน
      cb(b, 0.5, 0.55, 0, 0.1, 0.22, 0.1, DK);                              //ศูนย์เล็ง
      cb(b, -0.9, 0.05, 0, 0.36, 0.56, 0.46, DK);                           // ถังพลังงานด้านหลัง
      b.push().tr(0.6, 0, 0).rz(-PI / 2); b.cyl(0.2, 0.2, 1.0, 12, ME); b.pop();   // ลำกล้อง (เริ่มจากในตัวปืน)
      [0.95, 1.15, 1.35].forEach(function (x, k) { disc(b, x, 0, 0, 'x', 0.29, 0.08, k % 2 ? '#ffd43b' : '#c8a600', 14); });   // ขดลวด
      disc(b, 1.62, 0, 0, 'x', 0.3, 0.1, '#7ee8ff', 14); ball(b, 1.74, 0, 0, 0.16, '#d6fbff', 8, 6);   // ปลายกระบอก
      b.push().tr(-0.4, -0.25, 0).rz(0.3); cb(b, 0, -0.38, 0, 0.4, 0.82, 0.44, DK); b.pop();   // ด้าม
      cb(b, 0.05, -0.62, 0, 0.62, 0.07, 0.3, DK); cb(b, 0.33, -0.5, 0, 0.07, 0.3, 0.3, DK);   // โครงไกปืน
      cb(b, 0.08, -0.42, 0, 0.08, 0.22, 0.1, '#ffd43b');                    // ไก
      [-1, 1].forEach(function (zz) { cb(b, 0.0, 0.0, zz * 0.28, 1.0, 0.2, 0.03, '#ffffff'); cb(b, 0.0, -0.2, zz * 0.28, 0.7, 0.06, 0.03, '#ffe066'); });   // แถบข้างลำตัว
      b.pop();
    } else if (id === 'steal') {
      b.push().tr(0, 0.62, 0).sc(1, 0.88, 1); b.sphere(0.82, 14, 10, '#c9983a'); b.pop();
      for (i = 0; i < 6; i++) { a = i / 6 * PI * 2; b.push().tr(Math.cos(a) * 0.62, 0.62, Math.sin(a) * 0.62).rz(0); b.sc(0.12, 0.7, 0.12); b.sphere(0.5, 5, 4, '#b5842a'); b.pop(); }
      b.push().tr(0, 1.2, 0); b.cyl(0.36, 0.5, 0.26, 12, '#c9983a'); b.pop(); b.push().tr(0, 1.42, 0); b.cyl(0.34, 0.34, 0.1, 12, '#b5842a'); b.pop();
      b.push().tr(0, 1.5, 0); b.cyl(0.52, 0.32, 0.4, 12, { t: '#c9983a', b: '#c9983a', s: '#d6a845', sf: function (q) { return q % 2 ? '#d6a845' : '#c9983a'; } }); b.pop();
      b.push().tr(0, 1.34, 0); b.cyl(0.4, 0.4, 0.08, 14, '#d9302f'); b.pop(); ball(b, -0.27, 1.34, 0.28, 0.11, '#d9302f', 6, 4); ball(b, 0.27, 1.34, 0.28, 0.11, '#d9302f', 6, 4);
      disc(b, 0, 0.62, 0.78, 'z', 0.34, 0.07, '#ffd43b', 16); disc(b, 0, 0.62, 0.8, 'z', 0.26, 0.07, '#e5a812', 16);
      cb(b, 0, 0.62, 0.86, 0.07, 0.34, 0.03, '#fff1a8'); cb(b, 0, 0.74, 0.86, 0.16, 0.06, 0.03, '#fff1a8'); cb(b, 0, 0.62, 0.86, 0.16, 0.06, 0.03, '#fff1a8'); cb(b, 0, 0.5, 0.86, 0.16, 0.06, 0.03, '#fff1a8');
      if (!prop) { coin(b, 0.9, 0.04, -0.7, 0.3); coin(b, -0.95, 0.04, 0.55, 0.3); coin(b, -0.85, 0.12, -0.5, 0.26); }
    } else if (id === 'slip') {
      b.push().tr(0, 0.0, 0).sc(2.5, 0.2, 2.1); b.sphere(0.5, 14, 6, '#ff9fc4'); b.pop(); b.push().tr(0, 0.03, 0).sc(2.3, 0.2, 1.9); b.sphere(0.5, 14, 6, '#ffffff'); b.pop();
      if (!prop) [[0.85, 0.05, 0.55, 0.2], [-0.8, 0.05, 0.7, 0.16], [0.6, 0.05, -0.8, 0.14]].forEach(function (q) { b.push().tr(q[0], q[1], q[2]).sc(1, 0.4, 1); b.sphere(q[3], 7, 5, '#ffeef5'); b.pop(); });
      if (!prop) [[0.62, 0.17, '#ffc2d9'], [0.5, 0.17 + 0.22, '#fff4f8'], [0.4, 0.17 + 0.44, '#ffc2d9'], [0.3, 0.17 + 0.64, '#fff4f8'], [0.19, 0.17 + 0.82, '#ffc2d9']].forEach(function (q) { b.push().tr(0, q[1], 0).sc(1, 0.55, 1); b.sphere(q[0], 11, 7, q[2]); b.pop(); });
      b.push().tr(0, 0.17 + 0.95, 0); b.cyl(0.14, 0.0, 0.3, 8, '#fff4f8'); b.pop();
      if (!prop) [[-0.4, 0.38, 0.3, '#ff6b6b'], [0.35, 0.4, 0.4, '#4dabf7'], [-0.15, 0.82, 0.18, '#ffd43b'], [0.18, 0.62, -0.28, '#69db7c'], [-0.32, 0.66, -0.15, '#ff6b6b']].forEach(function (q) { b.push().tr(q[0], q[1], q[2]); b.box(0.12, 0.04, 0.04, q[3]); b.pop(); });
      if (prop) b.push().sc(1.15, 1.15, 1.15); else b.push().tr(0.45, 1.25, -0.1).rz(0.95).ry(0.0);
      b.push().tr(0, 0, 0); b.cyl(0.52, 0.07, 1.5, 12, { t: '#ff9fc4', b: '#ff9fc4', s: '#ff8ab6', sf: function (q) { return q % 2 === 0 ? '#ffffff' : '#ff8ab6'; } }); b.pop();
      b.push().tr(0, -0.08, 0); b.cyl(0.1, 0.07, 0.12, 8, '#fff4f8'); b.pop();
      b.push().tr(0, -0.2, 0); b.cyl(0.14, 0.07, 0.14, 8, '#ffffff'); b.pop();
      for (i = 0; i < 8; i++) { a = i / 8 * 6.283; b.push().tr(Math.cos(a) * 0.1, -0.2, Math.sin(a) * 0.1).rz(0); b.sc(0.5, 1, 0.5); b.sphere(0.05, 4, 3, '#ffffff'); b.pop(); }
      b.push().tr(0, 1.42, 0); b.cyl(0.58, 0.54, 0.16, 12, '#ff6b9d'); b.pop();
      b.push().tr(0.3, 0.3, 0.3); b.sc(0.3, 1.2, 0.2); b.sphere(0.25, 5, 4, '#ffc2d9'); b.pop();
      b.pop();
    } else if (id === 'freeze') {
      b.push().tr(0, 0, 0).sc(1.9, 0.28, 1.6); b.sphere(0.5, 9, 5, '#e8fbff'); b.pop();
      [[0, 0, 0, 0, 0, 1.7, 0.36], [-0.6, 0.05, 0.15, 0.35, 0.25, 1.15, 0.28], [0.62, 0.05, 0.1, -0.3, 0.2, 1.25, 0.3], [-0.2, 0.05, 0.6, 0.1, -0.4, 0.85, 0.24], [0.3, 0.05, -0.55, -0.15, 0.3, 0.95, 0.26], [-0.85, 0.05, -0.3, 0.5, 0.0, 0.6, 0.2], [0.95, 0.05, -0.2, -0.45, 0.1, 0.55, 0.2]].forEach(function (c) {
        b.push().tr(c[0], c[1], c[2]).rz(c[3]).rx(c[4]);
        b.cyl(c[6], c[6], c[5], 6, { t: '#d8f6ff', b: '#9fdcf5', s: '#a9e6fb', sf: function (q) { return q % 2 ? '#bfeeff' : '#8fd8f5'; } });
        b.tr(0, c[5], 0); b.cyl(0, c[6], c[6] * 1.6, 6, '#e6fbff'); b.pop();
      });
      b.push().tr(0, 1.15, 0.95);
      for (i = 0; i < 3; i++) { b.push().rz(i * PI / 3); cb(b, 0, 0, 0, 1.0, 0.09, 0.09, '#ffffff'); b.pop(); [-1, 1].forEach(function (d) { b.push().rz(i * PI / 3).tr(d * 0.38, 0, 0).rz(d * 0.9); cb(b, 0, 0, 0, 0.28, 0.07, 0.07, '#ffffff'); b.pop(); }); }
      b.sphere(0.1, 5, 4, '#ffffff'); b.pop();
      [[-1.0, 0.1, 0.7], [1.0, 0.1, 0.6], [0.2, 0.1, 1.1]].forEach(function (q) { ball(b, q[0], q[1], q[2], 0.07, '#ffffff', 4, 3); });
    } else if (id === 'magnet') {
      for (i = 0; i <= 14; i++) { a = PI + i / 14 * PI; b.push().tr(Math.cos(a) * 0.65, 0.95 + Math.sin(a) * 0.65, 0).rz(a).tr(0, -0.17, 0); b.cyl(0.23, 0.23, 0.36, 10, '#e03131'); b.pop(); }
      [-0.65, 0.65].forEach(function (x) {
        b.push().tr(x, 0.95, 0); b.cyl(0.23, 0.23, 0.8, 10, '#e03131'); b.pop();
        b.push().tr(x, 1.55, 0); b.cyl(0.235, 0.235, 0.09, 10, '#fff4f4'); b.pop();
        b.push().tr(x, 1.64, 0); b.cyl(0.24, 0.24, 0.34, 10, '#d3d8de'); b.pop(); b.push().tr(x, 1.9, 0); b.cyl(0.2, 0.24, 0.08, 10, '#aeb6bf'); b.pop();
      });
      if (!prop) [[0, 2.5, 0.0], [-0.85, 2.2, 0.15], [0.9, 2.35, -0.1]].forEach(function (q, k) { coin(b, q[0], q[1], q[2], 0.3, 'z'); b.push().tr(q[0], q[1], q[2] + 0.01 + k * 0); star(b, 0.1, '#e5a812', 0, 0, 0.08); b.pop(); });
      if (!prop) [[-0.35, 2.05], [0.4, 1.95], [0.05, 2.15]].forEach(function (q) { star(b, 0.08, '#fff1a8', q[0], q[1], 0.3); });
    } else if (id === 'ticket') {
      if (!prop) { b.push().tr(0, 0, 0); b.cyl(0.5, 0.6, 0.12, 14, '#b07a00'); b.pop(); b.push().tr(0, 0.1, 0); b.cyl(0.14, 0.22, 0.62, 10, '#d49a00'); b.pop(); }
      b.push().tr(0, prop ? 0.5 : 0.62, 0).rx(prop ? 0 : -0.15).ry(prop ? 0 : 0.25).sc(1.45);
      b.push().tr(0, 0, -0.01); b.box(2.0, 1.1, 0.12, '#d49a00'); b.pop();
      b.push().tr(0, 0.02, 0.0); b.box(1.9, 1.02, 0.14, '#ffcf2e'); b.pop();
      cb(b, 0, 0.99, 0.075, 1.74, 0.05, 0.02, '#ffefa6'); cb(b, 0, 0.17, 0.075, 1.74, 0.05, 0.02, '#ffefa6'); cb(b, 0.0, 0.58, 0.074, 0.05, 0.82, 0.02, '#ffefa6');
      cb(b, 0.0, 0.58, 0.075, 1.74, 0.05, 0.02, '#ffefa6');
      [-0.93, 0.93].forEach(function (x) { disc(b, x, 0.55, 0.076, 'z', 0.12, 0.02, '#fff4cf', 14); disc(b, x, 0.55, -0.096, 'z', 0.12, 0.02, '#fff4cf', 14); });
      for (i = 0; i < 6; i++) disc(b, -0.72, 0.15 + i * 0.16, 0.075, 'z', 0.04, 0.02, '#a87900', 8);
      disc(b, 0.12, 0.58, 0.078, 'z', 0.36, 0.03, '#fff1a8', 18); star(b, 0.3, '#ffcf2e', 0.12, 0.58, 0.09);
      for (i = 0; i < 4; i++) cb(b, 0.7, 0.82 - i * 0.14, 0.078, 0.38 - (i % 2) * 0.1, 0.06, 0.02, i % 2 ? '#ffffff' : '#c68a00');
      for (i = 0; i < 9; i++) cb(b, -0.45 + i * 0.045, 0.4, 0.078, 0.02 + (i % 3) * 0.012, 0.22, 0.02, '#8a6400');
      b.pop();
    }
    return b;
  }
  // ลูกเต๋าเดี่ยวสำหรับตอนทอย (ฐานที่ y=0 สูง s) หน้าครบ 1-6
  var ROLL = {
    normal: [['#ffffff', '#e0457b', 1.5]], double: [['#ffffff', '#2a2433', 1.35], ['#fff4d6', '#2a2433', 1.35]], giant: [['#e8363f', '#ffffff', 3.8, 'd10']],
    slow: [['#4dabf7', '#ffffff', 1.6]], lock: [['#ffd43b', '#3a2a00', 1.5]], gamble: [['#2a2a36', '#ff7a2a', 2.2, 'd8']],
    triple: [['#ffffff', '#2a2433', 1.2], ['#ffffff', '#2a2433', 1.2], ['#ffd43b', '#3a2a00', 1.2]], reverse: [['#19c2a0', '#ffffff', 1.6]]
  };
  function make(G, R) {
    var mesh = {}, roll = {}; IDS.concat(['stealp', 'slipp', 'ticketp', 'magnetp', 'lockchain', 'lockbody', 'lockshackle', 'lockkey', 'shard']).forEach(function (id) { mesh[id] = R.mesh(build(id, G)); });
    var nb = new G.Builder(); nb.jit = 0.012; nb.push().ry(0.5); die(nb, 1.5, '#ffffff', '#e0457b'); nb.pop(); mesh.normal = R.mesh(nb);
    Object.keys(ROLL).forEach(function (id) { roll[id] = ROLL[id].map(function (d) { var rb = new G.Builder(), fm = null; rb.jit = 0.012; if (d[3] === 'd10') fm = d10(rb, d[2], d[0], d[1]); else if (d[3] === 'd8') fm = d8(rb, d[2], d[0], d[1]); else die(rb, d[2], d[0], d[1]); return { mesh: R.mesh(rb), s: d[2], fm: fm }; }); });
    return { ids: IDS, names: NAMES, mesh: mesh, roll: roll };
  }
  make.IDS = IDS; make.NAMES = NAMES; make.build = build;
  return make;
});
