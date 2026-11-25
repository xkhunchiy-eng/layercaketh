/* วาดภาพ 2.5D สไตล์ PS1: กล้องตายตัว มองเฉียงลงมา ตัวละครเป็นสไปรต์ที่หันหน้าเข้าหากล้อง */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CakeRender = factory();
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  var SPRITE_H = 1.7;       // ความสูงตัวละครในหน่วยโลก
  var PLATE_T = 0.9;        // ความหนาจานสนาม

  function makeProjection(W, H, R) {
    var cam = [0, 11.5, -14], tgt = [0, 0, 1.5];
    var f = [tgt[0] - cam[0], tgt[1] - cam[1], tgt[2] - cam[2]];
    var fl = Math.hypot(f[0], f[1], f[2]); f = f.map(function (v) { return v / fl; });
    var r = [1, 0, 0];
    var u = [f[1] * r[2] - f[2] * r[1], f[2] * r[0] - f[0] * r[2], f[0] * r[1] - f[1] * r[0]];
    function raw(x, y, z) {
      var d = [x - cam[0], y - cam[1], z - cam[2]];
      var depth = d[0] * f[0] + d[1] * f[1] + d[2] * f[2];
      return [(d[0] * r[0] + d[1] * r[1] + d[2] * r[2]) / depth, (d[0] * u[0] + d[1] * u[1] + d[2] * u[2]) / depth, depth];
    }
    // หาขอบเขตของสิ่งที่ต้องมองเห็นแล้วปรับซูม/กึ่งกลางให้พอดีจอ
    var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, i, a, p;
    for (i = 0; i < 72; i++) {
      a = i / 72 * Math.PI * 2;
      [[0], [-PLATE_T], [SPRITE_H + 0.5]].forEach(function (yy) {
        var rr = yy[0] > 1 ? R - 0.5 : R;
        p = raw(Math.cos(a) * rr, yy[0], Math.sin(a) * rr);
        minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
        minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
      });
    }
    var m = 0.94;
    var focal = Math.min(W * m / (maxX - minX), H * m / (maxY - minY));
    var cx = W / 2 - focal * (minX + maxX) / 2;
    var cy = H / 2 + focal * (minY + maxY) / 2;
    return {
      focal: focal,
      project: function (x, y, z) {
        var q = raw(x, y, z);
        return [cx + focal * q[0], cy - focal * q[1], focal / q[2]];  // [sx, sy, พิกเซลต่อหน่วยโลก]
      },
      bounds: { minX: cx + focal * minX, maxX: cx + focal * maxX, minY: cy - focal * maxY, maxY: cy - focal * minY }
    };
  }

  function dirOf(h) {
    h = Math.atan2(Math.sin(h), Math.cos(h));
    if (Math.abs(h) < Math.PI / 4) return 'back';
    if (Math.abs(h) > Math.PI * 3 / 4) return 'front';
    return h > 0 ? 'right' : 'left';
  }

  function shade(hex, k) {
    var n = parseInt(hex.slice(1), 16);
    var c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) { return Math.max(0, Math.min(255, Math.round(v * k))); });
    return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
  }

  // สไปรต์ชั่วคราว 24x36 วาดเป็นพิกเซลด้วยโค้ด (จะถูกแทนด้วยภาพที่ผู้ใช้วาด)
  function buildSprite(doc, color, dir) {
    var W = 24, H = 36, cv = doc.createElement('canvas'); cv.width = W; cv.height = H;
    var g = cv.getContext('2d');
    function ell(cx, cy, rx, ry, fill) {
      g.fillStyle = fill;
      for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
        var dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) g.fillRect(x, y, 1, 1);
      }
    }
    var OUT = '#1b1226', body = shade(color, 0.72), head = color, light = shade(color, 1.18);
    ell(12, 28, 9, 8, OUT); ell(12, 13, 11, 11.5, OUT);
    ell(8, 34, 4.2, 2.4, OUT); ell(16, 34, 4.2, 2.4, OUT);
    ell(8, 33.5, 3.2, 1.6, '#3a2a4d'); ell(16, 33.5, 3.2, 1.6, '#3a2a4d');
    ell(12, 28, 8, 7, body);
    ell(12, 13, 10, 10.5, head);
    ell(9, 8, 4, 3, light);
    g.fillStyle = OUT; g.fillRect(11, 0, 2, 3); g.fillStyle = head; g.fillRect(11, 1, 2, 2);  // ปลายฮู้ด
    var ex = dir === 'front' ? [8, 15] : dir === 'right' ? [15, 19] : dir === 'left' ? [4, 8] : null;
    if (ex) {
      ex.forEach(function (x) {
        g.fillStyle = OUT; g.fillRect(x, 12, 2, 4);
        g.fillStyle = '#fff'; g.fillRect(x, 12, 1, 1);
      });
      if (dir === 'front') { g.fillStyle = 'rgba(255,120,150,0.8)'; g.fillRect(5, 17, 2, 1); g.fillRect(17, 17, 2, 1); }
    } else {
      g.fillStyle = shade(color, 0.6); g.fillRect(11, 5, 1, 17);   // รอยตะเข็บหลังฮู้ด
    }
    return cv;
  }

  function ArenaView(canvas, R) {
    var doc = canvas.ownerDocument || document;
    this.cv = canvas; this.g = canvas.getContext('2d');
    this.W = canvas.width; this.H = canvas.height; this.R = R;
    this.P = makeProjection(this.W, this.H, R);
    this.sprites = {};
    this.floor = this._buildFloor(doc);
  }

  ArenaView.prototype._buildFloor = function (doc) {
    var W = this.W, H = this.H, P = this.P, R = this.R;
    var cv = doc.createElement('canvas'); cv.width = W; cv.height = H;
    var g = cv.getContext('2d');
    var bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#2a1a3d'); bg.addColorStop(1, '#120a1c');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    var N = 36, i, a0, a1, p;
    // ด้านข้างจาน (เห็นเฉพาะครึ่งหน้า)
    for (i = 0; i < N; i++) {
      a0 = i / N * Math.PI * 2; a1 = (i + 1) / N * Math.PI * 2;
      if (Math.sin((a0 + a1) / 2) > 0.05) continue;
      var t0 = P.project(Math.cos(a0) * R, 0, Math.sin(a0) * R), t1 = P.project(Math.cos(a1) * R, 0, Math.sin(a1) * R);
      var b0 = P.project(Math.cos(a0) * R, -PLATE_T, Math.sin(a0) * R), b1 = P.project(Math.cos(a1) * R, -PLATE_T, Math.sin(a1) * R);
      g.fillStyle = i % 2 ? '#c98a5a' : '#b97a4c';
      g.beginPath(); g.moveTo(t0[0], t0[1]); g.lineTo(t1[0], t1[1]); g.lineTo(b1[0], b1[1]); g.lineTo(b0[0], b0[1]); g.closePath(); g.fill();
    }
    // พื้นผิวจาน: ครีมสลับสี แบบวงแหวน x ช่อง
    var rings = 7, secs = 24, ri, si;
    for (ri = 0; ri < rings; ri++) for (si = 0; si < secs; si++) {
      var r0 = ri / rings * R, r1 = (ri + 1) / rings * R;
      a0 = si / secs * Math.PI * 2; a1 = (si + 1) / secs * Math.PI * 2;
      var pts = [[r0, a0], [r1, a0], [r1, a1], [r0, a1]].map(function (q) { return P.project(Math.cos(q[1]) * q[0], 0, Math.sin(q[1]) * q[0]); });
      g.fillStyle = (ri + si) % 2 ? '#ffe3ec' : '#ffc8d9';
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      for (p = 1; p < 4; p++) g.lineTo(pts[p][0], pts[p][1]);
      g.closePath(); g.fill();
    }
    // ขอบจาน
    g.strokeStyle = '#6b3f2a'; g.lineWidth = 1.5; g.beginPath();
    for (i = 0; i <= N * 2; i++) {
      a0 = i / (N * 2) * Math.PI * 2; p = P.project(Math.cos(a0) * R, 0, Math.sin(a0) * R);
      if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]);
    }
    g.stroke();
    return cv;
  };

  ArenaView.prototype._sprite = function (slot, color, dir) {
    var k = slot + dir;
    if (!this.sprites[k]) this.sprites[k] = buildSprite(this.cv.ownerDocument || document, color, dir);
    return this.sprites[k];
  };

  // players: [{slot,name,x,z,h,mv,walk,me}] colors: ตามช่อง
  ArenaView.prototype.draw = function (players, colors) {
    var g = this.g, P = this.P;
    g.imageSmoothingEnabled = false;
    g.drawImage(this.floor, 0, 0);
    var list = players.slice().sort(function (a, b) { return b.z - a.z; });
    for (var i = 0; i < list.length; i++) {
      var q = list[i], base = P.project(q.x, 0, q.z), px = base[2];
      // เงา
      g.fillStyle = 'rgba(40,10,50,0.35)';
      g.beginPath(); g.ellipse(base[0], base[1], px * 0.5, px * 0.2, 0, 0, Math.PI * 2); g.fill();
      var bob = q.mv ? Math.abs(Math.sin(q.walk * 2)) : 0;
      var squash = q.mv ? 1 - 0.06 * Math.sin(q.walk * 4) : 1;
      var hh = px * SPRITE_H * squash, ww = hh * 24 / 36;
      var sp = this._sprite(q.slot, colors[q.slot % colors.length], dirOf(q.h));
      var x = Math.round(base[0] - ww / 2), y = Math.round(base[1] - hh - bob * px * 0.18);
      g.drawImage(sp, x, y, Math.round(ww), Math.round(hh));
      if (q.me) {   // ลูกศรชี้ตัวเรา
        g.fillStyle = '#fff'; var ax = Math.round(base[0]), ay = y - 7 - Math.round(Math.sin(Date.now() / 200) * 1.5);
        g.beginPath(); g.moveTo(ax - 4, ay - 4); g.lineTo(ax + 4, ay - 4); g.lineTo(ax, ay + 1); g.closePath(); g.fill();
      }
      g.font = 'bold 9px TAGBA, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      var ty = y - (q.me ? 13 : 3);
      g.lineWidth = 3; g.strokeStyle = '#1b1226'; g.strokeText(q.name, base[0], ty);
      g.fillStyle = '#fff'; g.fillText(q.name, base[0], ty);
    }
  };


  /* ---------- เค้กก้นหอย (เกมหลัก) พร้อมกล้องเคลื่อนที่ ---------- */
  // สัดส่วนเค้กใหญ่ (ตัวละครสูงประมาณ 1.1 หน่วย) ชั้นล่างสูงและกว้างที่สุดตามแบบที่วาด
  var TIER_R = [10, 6.6, 3.8], TIER_BASE = [0, 5.5, 9.3], TIER_HS = [5.5, 3.8, 3.2], TOP_Y = 12.5, TIER_H = 4, STEP_Y = TOP_Y / 24, TOP = 24, SLAB_OFF = 0.8;

  function tilePos(i) {
    if (i >= TOP) return { x: 0, y: TOP_Y, z: 0, a: -Math.PI / 2, r: 0 };
    var tier = Math.min(2, Math.floor(i / 8)), a = -Math.PI / 2 + i * (Math.PI / 4), r = TIER_R[tier] + SLAB_OFF, y = TIER_BASE[tier] + (i % 8) * TIER_HS[tier] / 8;
    return { x: Math.cos(a) * r, y: y, z: Math.sin(a) * r, a: a, r: r };
  }
  function tierOf(i) { return Math.min(2, Math.floor(i / 8)); }
  function worldAt(idx) {
    var a = Math.floor(idx), b = Math.min(TOP, a + 1), f = idx - a, A = tilePos(Math.min(TOP, a)), B = tilePos(b);
    return { x: A.x + (B.x - A.x) * f, y: A.y + (B.y - A.y) * f, z: A.z + (B.z - A.z) * f, a: A.a, f: f };
  }
  function angDiff(t, a) { return Math.atan2(Math.sin(t - a), Math.cos(t - a)); }

  var TILE_STYLE = {
    start: ['#8ce99a', 'GO'], plain: ['#fff3d6', ''], coin: ['#ffd43b', '+'], minus: ['#ff8787', '-'],
    mystery: ['#b197fc', '?'], shop: ['#74c0fc', '$'], cherry: ['#ffe066', '']
  };
  var PIN = { shop: ['ร้านค้า', '#74c0fc'], coin: ['เหรียญ', '#ffd43b'], minus: ['โดนหัก', '#ff8787'], mystery: ['ปริศนา', '#b197fc'] };

  function CakeView(canvas) {
    this.cv = canvas; this.g = canvas.getContext('2d'); this.W = canvas.width; this.H = canvas.height;
    this.sprites = {}; this.focal = this.H * 1.6;
    this.cam = { a: -Math.PI / 2, rc: 18, yc: 12, rl: 0, yl: 5.2 };
    this.M = null;
  }
  CakeView.prototype.tilePos = tilePos;
  CakeView.prototype._sprite = ArenaView.prototype._sprite;

  // ขยับกล้องเข้าหาเป้าหมายแบบนุ่มนวล (มุมเลี้ยวทางสั้นที่สุด) snap=true ให้กระโดดทันที
  CakeView.prototype.updateCam = function (t, dt, snap) {
    var c = this.cam, k = snap ? 1 : 1 - Math.exp(-dt * 4.5);
    c.a += angDiff(t.a, c.a) * k;
    ['rc', 'yc', 'rl', 'yl'].forEach(function (key) { c[key] += (t[key] - c[key]) * k; });
  };

  // ปรับความกว้างพิกเซลให้ตามสัดส่วนหน้าต่าง (เต็มจอ ไม่ยืดภาพ) ความสูงคงที่ 270 เพื่อคงความหยาบแบบ PS1
  CakeView.prototype.resize = function () {
    var cw = this.cv.clientWidth, ch = this.cv.clientHeight; if (!cw || !ch) return;
    var w = Math.max(320, Math.min(720, Math.round(this.H * cw / ch)));
    if (w !== this.cv.width) { this.cv.width = w; this.W = w; this.g = this.cv.getContext('2d'); }
  };
  CakeView.prototype._begin = function () {
    var c = this.cam, cx = Math.cos(c.a), cz = Math.sin(c.a);
    var P = [cx * c.rc, c.yc, cz * c.rc], L = [cx * c.rl, c.yl, cz * c.rl];
    var f = [L[0] - P[0], L[1] - P[1], L[2] - P[2]], fl = Math.hypot(f[0], f[1], f[2]); f = f.map(function (v) { return v / fl; });
    var r = [f[2], 0, -f[0]], rl = Math.hypot(r[0], r[2]) || 1; r = [r[0] / rl, 0, r[2] / rl];
    var u = [f[1] * r[2] - f[2] * r[1], f[2] * r[0] - f[0] * r[2], f[0] * r[1] - f[1] * r[0]];
    this.M = { P: P, f: f, r: r, u: u };
  };
  CakeView.prototype.pr = function (x, y, z) {
    var M = this.M, d0 = x - M.P[0], d1 = y - M.P[1], d2 = z - M.P[2];
    var dep = d0 * M.f[0] + d1 * M.f[1] + d2 * M.f[2]; if (dep < 0.4) return null;
    var sc = this.focal / dep;
    return [this.W / 2 + (this.ox || 0) + (d0 * M.r[0] + d2 * M.r[2]) * sc, this.H / 2 - (d0 * M.u[0] + d1 * M.u[1] + d2 * M.u[2]) * sc, sc, dep];
  };
  CakeView.prototype._poly = function (pts, fill, stroke) {
    var g = this.g, i, q = [];
    for (i = 0; i < pts.length; i++) { var p = this.pr(pts[i][0], pts[i][1], pts[i][2]); if (!p) return; q.push(p); }
    g.beginPath(); g.moveTo(q[0][0], q[0][1]); for (i = 1; i < q.length; i++) g.lineTo(q[i][0], q[i][1]); g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1; g.stroke(); }
  };
  CakeView.prototype._disc = function (r, y, fill, stroke, n) {
    n = n || 16; var pts = [], i; for (i = 0; i < n; i++) { var a = i / n * Math.PI * 2; pts.push([Math.cos(a) * r, y, Math.sin(a) * r]); }
    this._poly(pts, fill, stroke);
  };
  // แสงทิศคงที่ในโลก ทำให้หน้าเหลี่ยมแต่ละด้านสว่างต่างกัน (โลว์โพลิกอนแบบแฟลตเชด)
  var LIGHT = (function () { var l = [-0.45, 0.8, -0.4], n = Math.hypot(l[0], l[1], l[2]); return l.map(function (v) { return v / n; }); })();
  function lit(nx, ny, nz) { return 0.84 + 0.4 * Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]); }
  // ลูกกลมโลว์โพลิ (ตัดหน้าหลัง + แฟลตเชด) ใช้กับเชอร์รี่
  CakeView.prototype._sphere = function (cx, cy, cz, r, hex, lon, lat) {
    var M = this.M, a, b, g = this.g;
    for (b = 0; b < lat; b++) for (a = 0; a < lon; a++) {
      var p0 = -Math.PI / 2 + b / lat * Math.PI, p1 = -Math.PI / 2 + (b + 1) / lat * Math.PI, t0 = a / lon * Math.PI * 2, t1 = (a + 1) / lon * Math.PI * 2;
      var pts = [[p0, t0], [p0, t1], [p1, t1], [p1, t0]].map(function (q) { return [cx + Math.cos(q[0]) * Math.cos(q[1]) * r, cy + Math.sin(q[0]) * r, cz + Math.cos(q[0]) * Math.sin(q[1]) * r]; });
      var pm = (p0 + p1) / 2, tm = (t0 + t1) / 2, nx = Math.cos(pm) * Math.cos(tm), ny = Math.sin(pm), nz = Math.cos(pm) * Math.sin(tm);
      if (nx * (M.P[0] - cx) + ny * (M.P[1] - cy) + nz * (M.P[2] - cz) <= 0) continue;
      this._poly(pts, shade(hex, lit(nx, ny, nz) * 0.95), 'rgba(40,0,10,0.35)');
    }
  };

  CakeView.prototype._tier = function (k) {
    var R = TIER_R[k], y0 = k * TIER_H, y1 = y0 + TIER_H, n = 12, i, M = this.M, Ra = R * Math.cos(Math.PI / n);
    var side = [['#e9a76b', '#f6c98e'], ['#d98a5b', '#f3b3c4'], ['#c4745a', '#fff4f8']][k];
    for (i = 0; i < n; i++) {
      var a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2, am = (a0 + a1) / 2, cm = Math.cos(am), sm = Math.sin(am);
      if (cm * M.P[0] + sm * M.P[2] <= Ra) continue;     // หันหลังให้กล้อง
      var X0 = Math.cos(a0) * R, Z0 = Math.sin(a0) * R, X1 = Math.cos(a1) * R, Z1 = Math.sin(a1) * R, ym = y1 - 0.6, f = lit(cm, 0, sm);
      this._poly([[X0, y1, Z0], [X1, y1, Z1], [X1, y0, Z1], [X0, y0, Z0]], shade(side[0], f), 'rgba(70,30,20,0.4)');
      this._poly([[X0, y1, Z0], [X1, y1, Z1], [X1, ym, Z1], [X0, ym, Z0]], shade(side[1], f), 'rgba(120,60,70,0.35)');
      // หยดครีมรูปสี่เหลี่ยมคางหมูกลางแต่ละหน้า
      var mx = (X0 + X1) / 2, mz = (Z0 + Z1) / 2, dx = (X1 - X0) * 0.16, dz = (Z1 - Z0) * 0.16, o = 1.004;
      this._poly([[(mx - dx) * o, ym, (mz - dz) * o], [(mx + dx) * o, ym, (mz + dz) * o], [(mx + dx * 0.5) * o, ym - 0.75, (mz + dz * 0.5) * o], [(mx - dx * 0.5) * o, ym - 0.75, (mz - dz * 0.5) * o]], shade(side[1], f * 1.02), 'rgba(120,60,70,0.35)');
    }
    this._disc(R, y1, shade('#fff4f8', 1.0), '#d9a5b8', n);
  };

  // วัตถุที่ยืนอยู่บนเค้ก: far = อยู่หลังเค้กเมื่อมองจากกล้อง (ต้องวาดก่อนตัวเค้กชั้นนั้น)
  CakeView.prototype._isFar = function (x, z) {
    var M = this.M, l = Math.hypot(x, z); if (l < 0.5) return false;
    return (x * M.P[0] + z * M.P[2]) / (l * Math.hypot(M.P[0], M.P[2])) < -0.05;
  };

  CakeView.prototype._tile = function (i, st, extra) {
    var tp = tilePos(i), type = st.layout[i] || 'plain', g = this.g;
    if (extra && extra.hide && extra.hide[i]) type = 'plain';
    var style = TILE_STYLE[type];
    var rI = tp.r - 0.55, rO = tp.r + 0.55, a0 = tp.a - 0.3, a1 = tp.a + 0.3, y = tp.y;
    var corners = [[rI, a0], [rO, a0], [rO, a1], [rI, a1]].map(function (q) { return [Math.cos(q[1]) * q[0], y, Math.sin(q[1]) * q[0]]; });
    this._poly(corners.map(function (c) { return [c[0], c[1] - 0.12, c[2]]; }), '#6b3f2a');
    this._poly(corners, style[0], '#5a3a28');
    var ctr = this.pr(Math.cos(tp.a) * tp.r, y, Math.sin(tp.a) * tp.r);
    if (ctr && style[1]) { g.font = 'bold ' + Math.max(7, Math.min(16, ctr[2] * 0.5)) + 'px TAGBA, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#3a2a4d'; g.fillText(style[1], ctr[0], ctr[1]); }
    if (st.traps) st.traps.forEach(function (t) { if (t[0] === i && ctr) { g.fillStyle = '#ff8fb1'; g.beginPath(); g.arc(ctr[0], ctr[1] + 2, Math.max(3, ctr[2] * 0.25), 0, Math.PI * 2); g.fill(); } });
  };

  CakeView.prototype._token = function (L, colors, now) {
    var g = this.g, bp = this.pr(L.x, L.y, L.z); if (!bp) return;
    var px = bp[2], M = this.M;
    g.fillStyle = 'rgba(40,10,50,0.4)'; g.beginPath(); g.ellipse(bp[0], bp[1], px * 0.3, px * 0.12, 0, 0, Math.PI * 2); g.fill();
    var hh = px * 1.5, ww = hh * 24 / 36, dir = 'front';
    if (L.moving && L.tx !== undefined) {   // ทิศเดินเทียบกับกล้อง
      var dr = L.tx * M.r[0] + L.tz * M.r[2], df = L.tx * M.f[0] + L.tz * M.f[2];
      dir = Math.abs(dr) > Math.abs(df) ? (dr > 0 ? 'right' : 'left') : (df > 0 ? 'back' : 'front');
    }
    var sp = this._sprite(L.t.slot, colors[L.t.slot % colors.length], dir);
    var x = Math.round(bp[0] - ww / 2), y = Math.round(bp[1] - hh);
    g.drawImage(sp, x, y, Math.round(ww), Math.round(hh));
    if (L.t.turn) {
      var ax = Math.round(bp[0]), ay = y - 12 - Math.round(Math.sin((now || 0) / 180) * 2);
      g.fillStyle = '#ffe066'; g.strokeStyle = '#1b1226'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(ax - 4, ay - 4); g.lineTo(ax + 4, ay - 4); g.lineTo(ax, ay + 2); g.closePath(); g.fill(); g.stroke();
    }
    g.font = 'bold ' + Math.max(8, Math.min(11, px * 0.3)) + 'px TAGBA, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    var nm = (L.t.me ? '★' : '') + L.t.name, ty = y - 2;
    g.lineWidth = 3; g.strokeStyle = '#1b1226'; g.strokeText(nm, bp[0], ty); g.fillStyle = '#fff'; g.fillText(nm, bp[0], ty);
  };

  // st = snapshot, tokens = [{slot,name,idx,me,turn}], extra = { pins:bool, ring:idx, ringText }
  CakeView.prototype.draw = function (st, tokens, colors, now, extra) {
    this.resize(); var g = this.g, i, self = this; extra = extra || {};
    g.imageSmoothingEnabled = false;
    this._begin();
    var grad = g.createLinearGradient(0, 0, 0, this.H); grad.addColorStop(0, '#3a2158'); grad.addColorStop(1, '#1a0f2b');
    g.fillStyle = grad; g.fillRect(0, 0, this.W, this.H);
    this._disc(6.6, -0.5, '#e8d4f0', '#8d6bb0', 14);
    var list = tokens.map(function (t) {
      var w = worldAt(t.idx), off = (t.slot - 1.5) * 0.28, hop = w.f > 0 && w.f < 1 ? Math.sin(w.f * Math.PI) * 0.5 : 0;
      var x = w.x, z = w.z; if (t.idx < TOP) { x += -Math.sin(w.a) * off; z += Math.cos(w.a) * off; }
      var w2 = worldAt(Math.min(TOP, t.idx + 0.2));
      return { t: t, x: x, y: w.y + hop, z: z, moving: w.f > 0, tx: w2.x - w.x, tz: w2.z - w.z, tier: tierOf(Math.min(TOP - 1, Math.floor(t.idx))), top: t.idx >= TOP - 0.01 };
    });
    var camD = function (x, y, z) { var M = self.M; return Math.hypot(x - M.P[0], y - M.P[1], z - M.P[2]); };
    for (var k = 0; k < 3; k++) {
      var tiles = []; for (i = k * 8; i < k * 8 + 8; i++) { var tp = tilePos(i); tiles.push({ i: i, far: this._isFar(tp.x, tp.z), d: camD(tp.x, tp.y, tp.z) }); }
      var toks = list.filter(function (L) { return L.tier === k && !L.top; }).map(function (L) { return { L: L, far: self._isFar(L.x, L.z), d: camD(L.x, L.y, L.z) }; });
      var pass = function (far) {
        var items = [];
        tiles.forEach(function (q) { if (q.far === far) items.push({ d: q.d, f: function () { self._tile(q.i, st, extra); } }); });
        toks.forEach(function (q) { if (q.far === far) items.push({ d: q.d - 0.01, f: function () { self._token(q.L, colors, now); } }); });
        items.sort(function (a, b) { return b.d - a.d; }).forEach(function (it) { it.f(); });
      };
      pass(true); this._tier(k); pass(false);
    }
    // ยอดเค้ก + เชอร์รี่
    var tcenter = this.pr(0, TOP * STEP_Y, 0);
    this._disc(1.0, TOP * STEP_Y, '#ffe066', '#a07a00', 8);
    var cf = extra.cherry === undefined ? 1 : extra.cherry;
    if (cf > 0) {
      var cy = TOP * STEP_Y + 0.95, cpop = cf < 1 ? 0.35 + 0.65 * Math.min(1, cf * 1.4) + Math.sin(cf * Math.PI) * 0.25 : 1;
      var c0 = this.pr(0, cy, 0);
      if (c0 && cf < 1) {     // แสงเปล่งตอนเชอร์รี่โผล่
        var rr0 = c0[2] * 0.6, tt = (now || 0) / 1000, gl = rr0 * (3 + 5 * Math.sin(cf * Math.PI)), prev = g.globalCompositeOperation;
        g.globalCompositeOperation = 'lighter';
        var rg = g.createRadialGradient(c0[0], c0[1], 0, c0[0], c0[1], gl); rg.addColorStop(0, 'rgba(255,240,150,' + (0.9 * Math.sin(cf * Math.PI)) + ')'); rg.addColorStop(1, 'rgba(255,120,60,0)');
        g.fillStyle = rg; g.fillRect(c0[0] - gl, c0[1] - gl, gl * 2, gl * 2);
        g.fillStyle = 'rgba(255,230,140,' + (0.35 * Math.sin(cf * Math.PI)) + ')';
        for (i = 0; i < 12; i++) { var ra = i / 12 * Math.PI * 2 + tt * 0.8, w2 = 0.09; g.beginPath(); g.moveTo(c0[0], c0[1]); g.lineTo(c0[0] + Math.cos(ra - w2) * gl * 1.5, c0[1] + Math.sin(ra - w2) * gl * 1.5); g.lineTo(c0[0] + Math.cos(ra + w2) * gl * 1.5, c0[1] + Math.sin(ra + w2) * gl * 1.5); g.closePath(); g.fill(); }
        for (i = 0; i < 14; i++) { var sa = i * 2.4 + tt * 1.5, sr = rr0 * (1.2 + ((i * 37) % 10) / 10 * 3.2) * cf, sx = c0[0] + Math.cos(sa) * sr, sy = c0[1] + Math.sin(sa) * sr * 0.8 - cf * rr0, ss = 1.5 + (i % 3);
          g.fillStyle = 'rgba(255,255,220,' + (0.9 * (1 - cf * 0.6)) + ')'; g.fillRect(sx - ss / 2, sy - 0.5, ss, 1); g.fillRect(sx - 0.5, sy - ss / 2, 1, ss); }
        g.globalCompositeOperation = prev;
      }
      this._sphere(0, cy, 0, 0.62 * cpop, '#e03131', 8, 5);
      var st0 = this.pr(0, cy + 0.6 * cpop, 0), st1 = this.pr(0.35, cy + 1.1 * cpop, 0.1), st2 = this.pr(0.7, cy + 1.0 * cpop, 0.2);
      if (st0 && st1 && st2) { g.strokeStyle = '#2b8a3e'; g.lineWidth = Math.max(1.5, st0[2] * 0.06); g.beginPath(); g.moveTo(st0[0], st0[1]); g.lineTo(st1[0], st1[1]); g.lineTo(st2[0], st2[1]); g.stroke(); }
    }
    list.filter(function (L) { return L.top; }).forEach(function (L) { self._token(L, colors, now); });
    // ป้ายชี้ช่องพิเศษ / วงไฮไลต์ (ฉากเปิดรอบ)
    if (extra.pins) {
      for (i = 1; i < TOP; i++) {
        var pn = PIN[st.layout[i]]; if (!pn) continue;
        if (extra.pinOnly && extra.pinOnly !== st.layout[i]) continue;
        var tp2 = tilePos(i), a = this.pr(tp2.x, tp2.y + 0.2, tp2.z), b = this.pr(tp2.x, tp2.y + 1.9, tp2.z); if (!a || !b) continue;
        g.strokeStyle = pn[1]; g.lineWidth = 2; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
        g.font = 'bold ' + Math.max(8, Math.min(13, b[2] * 0.42)) + 'px TAGBA, sans-serif'; var tw = g.measureText(pn[0]).width + 8;
        g.fillStyle = pn[1]; g.fillRect(b[0] - tw / 2, b[1] - 12, tw, 13); g.strokeStyle = '#1b1226'; g.lineWidth = 1; g.strokeRect(b[0] - tw / 2, b[1] - 12, tw, 13);
        g.fillStyle = '#1b1226'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(pn[0], b[0], b[1] - 5);
      }
    }
    if (extra.pop && extra.pop.i >= 0) {     // ช่องโผล่: ลำแสงพุ่งขึ้น + วงขยาย
      var pp = extra.pop, tq = tilePos(pp.i), pb = this.pr(tq.x, tq.y, tq.z), pt = this.pr(tq.x, tq.y + 3.2, tq.z), pc = (TILE_STYLE[st.layout[pp.i]] || TILE_STYLE.plain)[0], pk = Math.min(1, pp.p);
      if (pb && pt) {
        var prevc = g.globalCompositeOperation; g.globalCompositeOperation = 'lighter';
        var lg = g.createLinearGradient(0, pb[1], 0, pt[1]); lg.addColorStop(0, pc); lg.addColorStop(1, 'rgba(255,255,255,0)');
        g.globalAlpha = 0.65 * (1 - pk); g.fillStyle = lg; var bw = pb[2] * 0.55 * (1 - pk * 0.5); g.fillRect(pb[0] - bw, pt[1], bw * 2, pb[1] - pt[1]);
        g.globalAlpha = 0.9 * (1 - pk); g.strokeStyle = pc; g.lineWidth = 3; g.beginPath(); g.ellipse(pb[0], pb[1], pb[2] * (0.6 + pk * 1.8), pb[2] * (0.3 + pk * 0.9), 0, 0, Math.PI * 2); g.stroke();
        g.globalAlpha = 1; g.globalCompositeOperation = prevc;
      }
    }
    if (extra.ring !== undefined && extra.ring >= 0) {
      var tr = tilePos(extra.ring), p = this.pr(tr.x, tr.y, tr.z);
      if (p) { var pulse = 1 + Math.sin((now || 0) / 150) * 0.12; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.ellipse(p[0], p[1], p[2] * 0.9 * pulse, p[2] * 0.45 * pulse, 0, 0, Math.PI * 2); g.stroke(); }
    }
  };

  return { TIER_R: TIER_R, TIER_BASE: TIER_BASE, TIER_HS: TIER_HS, TOP_Y: TOP_Y, SLAB_OFF: SLAB_OFF, TIER_H: TIER_H, TOP: TOP, STEP_Y: STEP_Y, CakeView: CakeView, tilePos: tilePos, worldAt: worldAt, makeProjection: makeProjection, ArenaView: ArenaView, dirOf: dirOf, buildSprite: buildSprite, SPRITE_H: SPRITE_H };
});
