/* ฉากเค้ก 3D โลว์โพลิกอน (WebGL) — ใช้ท่อกล้อง/ข้อมูลเดียวกับ CakeView เดิม */
var Cake3D = (function () {
  'use strict';
  var G = GL3, M4 = G.M4, CR = CakeRender;
  var TIER_R = CR.TIER_R, TIER_BASE = CR.TIER_BASE, TIER_HS = CR.TIER_HS, TOP_Y = CR.TOP_Y, SLAB_OFF = CR.SLAB_OFF, TOP = CR.TOP, tilePos = CR.tilePos, worldAt = CR.worldAt;
  var PIX_H = 360, FOV = 36 * Math.PI / 180, BASE_Y = -0.3, SLAB_T = 0.26, CH = 0.56;
  var HORIZON = '#fff0dc';

  var _sup = null;
  function supported() { if (_sup !== null) return _sup; try { var c = document.createElement('canvas'); var gl = c.getContext('webgl') || c.getContext('experimental-webgl'); _sup = !!gl; try { var ext = gl && gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); } catch (e2) {} return _sup; } catch (e) { return (_sup = false); } }
  function mix(a, b, t) { var A = G.rgb(a), B = G.rgb(b); return [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]; }
  function rng(seed) { var s = seed >>> 0; return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
  function angDiff(t, a) { return Math.atan2(Math.sin(t - a), Math.cos(t - a)); }
  function backOut(t) { t = Math.max(0, Math.min(1, t)); var c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
  function tierOf(i) { return Math.min(2, Math.floor(i / 8)); }

  var SLAB_PLAIN = ['#ffcf8a', '#ff9f7a', '#ffe08a', '#ffb27a'];
  var TYPE_TOP = { start: '#8ce99a', plain: null, coin: '#ffd43b', minus: '#ff8fa8', mystery: '#c4b0ff', shop: '#8fd0ff', cherry: '#ffe066' };
  var SLOT_COAT = ['#ff4d6a', '#4d9bff', '#ffc933', '#4fd16a'];

  /* ---------- โมเดล ---------- */
  function buildCakeBody() {
    var b = new G.Builder(), k, i, rnd = rng(7);
    b.jit = 0.03;
    for (k = 0; k < 3; k++) {
      var R = TIER_R[k], y0 = k === 0 ? BASE_Y : TIER_BASE[k], y1 = TIER_BASE[k] + TIER_HS[k], n = 32, nextR = k < 2 ? TIER_R[k + 1] : 0;
      b.push().tr(0, y0, 0);
      b.cyl(R, R, y1 - y0, n, { t: '#f3d49b', b: '#e6bd7c', sf: function (i) { return (i >> 1) % 2 ? '#f6dba5' : '#eac383'; } });
      b.pop();
      // ครีมชมพูบางๆ คลุมหน้าชั้น ขอบเป็นลอน
      var rj = function (kk) { return function (i) { return 1.0 + (G.hash(i * 13 + kk * 101) - 0.5) * 0.045 + (i % 2 ? 0.012 : 0); }; }(k);
      b.push().tr(0, y1 - 0.42, 0);
      b.cyl(R + 0.28, R + 0.3, 0.46, n, { t: '#ffd6e6', b: '#ffb3cf', s: '#ffc4da' }, { rj: rj });
      b.pop();
      // ครีมย้อยบางๆ ติดกับขอบครีม สั้นยาวไม่เท่ากัน
      for (i = 0; i < n; i++) {
        if (rnd() > 0.55) continue;
        var a = (i + 0.5) / n * Math.PI * 2, len = 0.3 + rnd() * rnd() * 1.6, rr = R + 0.2, w = 0.2 + rnd() * 0.1;
        b.push().tr(Math.cos(a) * rr, y1 - 0.42 - len, Math.sin(a) * rr).ry(-a);
        b.cyl(w, w * 0.55, len + 0.1, 5, { t: '#ffc4da', b: '#ffb3cf', s: '#ffbdd5' }, { noBot: true });
        b.push().tr(0, 0, 0).sc(1, 0.9, 1); b.sphere(w * 0.55, 5, 3, '#ffb3cf'); b.pop();
        b.pop();
      }
      // ลูกกลมเล็กๆ บนครีม (แดง ฟ้า เขียว เหลือง) หลายขนาด
      var cols = ['#ff5a63', '#6f7dff', '#c4ec4b', '#ffd24a'], inner = k < 2 ? nextR + 0.9 : 0.5, cnt = k === 0 ? 26 : k === 1 ? 16 : 8;
      for (i = 0; i < cnt; i++) {
        var ca = rnd() * Math.PI * 2, rad = 0.14 + rnd() * rnd() * 0.5, cr = k === 2 ? 1.5 + rnd() * 1.6 : inner + rnd() * Math.max(0.3, R - 0.7 - inner);
        b.push().tr(Math.cos(ca) * cr, y1 + rad * 0.5, Math.sin(ca) * cr); b.sphere(rad, 7, 4, cols[Math.floor(rnd() * 4)]); b.pop();
      }
      for (i = 0; i < (k === 0 ? 10 : 6); i++) {
        var ra = rnd() * Math.PI * 2, rad2 = 0.2 + rnd() * 0.32;
        b.push().tr(Math.cos(ra) * (R + 0.12), y1 + rad2 * 0.25, Math.sin(ra) * (R + 0.12)); b.sphere(rad2, 7, 4, cols[Math.floor(rnd() * 4)]); b.pop();
      }
    }
    for (i = 0; i < 6; i++) { var da = i / 6 * Math.PI * 2; b.push().tr(Math.cos(da) * 0.9, TOP_Y + 0.08, Math.sin(da) * 0.9).sc(1, 0.7, 1); b.sphere(0.45, 6, 4, '#ffe0ec'); b.pop(); }
    return b;
  }
  function buildCherry() {
    var b = new G.Builder(); b.jit = 0.04;
    b.sphere(0.95, 10, 7, '#ff3f55');
    b.push().tr(0.03, 0.8, 0).rz(-0.35); b.cyl(0.05, 0.07, 1.1, 5, '#4f8f3a'); b.pop();
    b.push().tr(0.45, 1.75, 0).rz(-0.9).sc(1, 0.25, 0.7); b.sphere(0.32, 6, 4, '#5fae45'); b.pop();
    return b;
  }
  function buildSlab(i, topCol, sideCol) {
    var tp = tilePos(i), R = TIER_R[tierOf(i)], b = new G.Builder(), a = tp.a, y = tp.y, yb = y - SLAB_T, ux = Math.cos(a), uz = Math.sin(a), tx = -uz, tz = ux;
    function P(r, w, yy) { return [ux * r + tx * w, yy, uz * r + tz * w]; }
    var rI = R - 0.4, rO = R + SLAB_OFF + 0.75, wi = 0.62, wo = 0.98;
    var A = P(rI, -wi, y), B2 = P(rO, -wo, y), C = P(rO, wo, y), D = P(rI, wi, y), E = P(rI, -wi, yb), F = P(rO, -wo, yb), Gg = P(rO, wo, yb), H = P(rI, wi, yb), ref = P(R + 0.6, 0, y - SLAB_T / 2);
    b.jit = 0.03;
    b.qo(A, B2, C, D, topCol, ref); b.qo(E, F, Gg, H, sideCol, ref);
    b.qo(B2, C, Gg, F, sideCol, ref); b.qo(A, B2, F, E, sideCol, ref); b.qo(D, C, Gg, H, sideCol, ref); b.qo(A, D, H, E, sideCol, ref);
    return b;
  }
  function buildCoin() {
    var b = new G.Builder(); b.jit = 0.06;
    [[0, 0, 0], [0.04, 0.16, 0.02], [-0.03, 0.32, -0.02]].forEach(function (p, i) { b.push().tr(p[0], p[1], p[2]).ry(i * 0.7); b.cyl(0.38, 0.38, 0.14, 12, { t: '#ffe066', b: '#d9a400', s: '#f5c518' }); b.pop(); });
    b.push().tr(0.0, 0.62, 0).rz(0.5).rx(Math.PI / 2); b.cyl(0.32, 0.32, 0.1, 12, { t: '#ffe97d', b: '#ffe97d', s: '#f5c518' }); b.pop();
    return b;
  }
  function buildSpike() {
    var b = new G.Builder(); b.jit = 0.05;
    b.sphere(0.36, 8, 5, '#6b4f9e');
    var n = 12, i;
    for (i = 0; i < n; i++) {   // ทิศกระจายสม่ำเสมอแบบ fibonacci
      var y = 1 - (i + 0.5) * 2 / n, r = Math.sqrt(1 - y * y), t = i * 2.399963;
      b.push().dir([Math.cos(t) * r, y, Math.sin(t) * r]).tr(0, 0.28, 0); b.cyl(0, 0.11, 0.3, 5, '#ff5d7a'); b.pop();
    }
    b.push().tr(0.12, 0.08, 0.32).sc(1, 1, 0.4); b.sphere(0.07, 5, 4, '#fff'); b.pop();
    b.push().tr(-0.12, 0.08, 0.32).sc(1, 1, 0.4); b.sphere(0.07, 5, 4, '#fff'); b.pop();
    return b;
  }
  function buildGift() {
    var b = new G.Builder(); b.jit = 0.05;
    b.box(0.8, 0.55, 0.8, { t: '#9b7bff', b: '#7a5ad6', s: '#8c6cf2' });
    b.push().tr(0, 0.55, 0); b.box(0.9, 0.2, 0.9, { t: '#b095ff', b: '#8c6cf2', s: '#a285fb' }); b.pop();
    b.push().tr(0, 0, 0); b.box(0.16, 0.76, 0.84, '#ffd43b'); b.pop();
    b.push().tr(0, 0, 0); b.box(0.84, 0.76, 0.16, '#ffd43b'); b.pop();
    b.push().tr(0.16, 0.8, 0).rz(0.5).sc(1.3, 0.7, 0.7); b.sphere(0.17, 6, 4, '#ffd43b'); b.pop();
    b.push().tr(-0.16, 0.8, 0).rz(-0.5).sc(1.3, 0.7, 0.7); b.sphere(0.17, 6, 4, '#ffd43b'); b.pop();
    return b;
  }
  function buildGiftBase() {
    var b = new G.Builder(); b.jit = 0.05;
    b.box(0.8, 0.55, 0.8, { t: '#9b7bff', b: '#7a5ad6', s: '#8c6cf2' });
    b.box(0.16, 0.56, 0.84, '#ffd43b'); b.box(0.84, 0.56, 0.16, '#ffd43b');
    return b;
  }
  function buildGiftLid() {
    var b = new G.Builder(); b.jit = 0.05;
    b.push().tr(0, 0.0, 0); b.box(0.9, 0.2, 0.9, { t: '#b095ff', b: '#8c6cf2', s: '#a285fb' }); b.pop();
    b.push().tr(0, 0, 0); b.box(0.16, 0.22, 0.94, '#ffd43b'); b.pop(); b.push().tr(0, 0, 0); b.box(0.94, 0.22, 0.16, '#ffd43b'); b.pop();
    b.push().tr(0.16, 0.25, 0).rz(0.5).sc(1.3, 0.7, 0.7); b.sphere(0.17, 6, 4, '#ffd43b'); b.pop();
    b.push().tr(-0.16, 0.25, 0).rz(-0.5).sc(1.3, 0.7, 0.7); b.sphere(0.17, 6, 4, '#ffd43b'); b.pop();
    return b;
  }
  function buildFlag() {
    var b = new G.Builder(); b.jit = 0.04;
    b.cyl(0.04, 0.05, 1.3, 5, '#f8f8f8');
    b.push().tr(0, 1.3, 0); b.quad([0, 0, 0.0], [0.7, -0.2, 0], [0.7, -0.6, 0], [0, -0.7, 0], '#ff4d6a'); b.quad([0, 0, 0], [0, -0.7, 0], [0.7, -0.6, 0], [0.7, -0.2, 0], '#ff4d6a'); b.pop();
    return b;
  }
  function buildStall() {
    var b = new G.Builder(), i, rnd = rng(3); b.jit = 0.035;
    var navy = '#455a73', ice = '#bfe0f7', slate = '#8da2ba', dark = '#3d4a5c';
    b.box(2.0, 0.8, 1.5, { t: navy, b: navy, s: navy });
    b.push().tr(0, 0.8, -0.05); b.box(1.9, 0.5, 1.25, { t: '#d8ecfa', b: ice, s: ice }); b.pop();
    b.push().tr(0, 1.3, -0.6); b.box(1.9, 1.35, 0.12, slate); b.pop();
    [-0.9, 0.9].forEach(function (x) { b.push().tr(x, 1.3, 0.5); b.box(0.16, 1.45, 0.16, dark); b.pop(); b.push().tr(x, 1.3, -0.45); b.box(0.16, 1.45, 0.16, dark); b.pop(); });
    // หลังคาผ้าใบลายทาง (ครึ่งทรงกระบอกวางตามแกน z)
    var seg = 8, aw = 1.1, ah = 0.7, y0 = 2.35;
    for (i = 0; i < seg; i++) {
      var t0 = Math.PI - i / seg * Math.PI, t1 = Math.PI - (i + 1) / seg * Math.PI, col = i % 2 ? '#ffcf4a' : '#ff6b6b';
      var p0 = [Math.cos(t0) * aw, y0 + Math.sin(t0) * ah], p1 = [Math.cos(t1) * aw, y0 + Math.sin(t1) * ah];
      b.qo([p0[0], p0[1], -0.6], [p1[0], p1[1], -0.6], [p1[0], p1[1], 0.95], [p0[0], p0[1], 0.95], col, [0, y0 - 0.2, 0.2]);
    }
    b.qo([-aw, y0, -0.6], [aw, y0, -0.6], [aw, y0, 0.95], [-aw, y0, 0.95], '#e04c4c', [0, y0 + 0.3, 0.2]);
    b.push().tr(0, y0 + ah - 0.02, -0.1); b.box(1.55, 0.62, 0.5, { t: '#d8ecfa', b: ice, s: '#c8e4f8' }); b.pop();
    for (i = 0; i < 5; i++) { b.push().tr(-0.6 + i * 0.3, y0 + ah + 0.62, -0.1); b.sphere(0.12 + rnd() * 0.06, 6, 4, '#ffffff'); b.pop(); }
    // เม็ดน้ำตาลโรยหน้าเคาน์เตอร์
    for (i = 0; i < 14; i++) { b.push().tr((rnd() - 0.5) * 1.7, 0.1 + rnd() * 0.65, 0.76).rz(rnd() * 3); b.box(0.06, 0.16, 0.03, rnd() > 0.5 ? '#ff5a63' : '#ffd24a'); b.pop(); }
    return b;
  }
  function buildChar(coat) {
    // ตามภาพร่าง: หัวใหญ่กลมแบนสีขาว หูกลมใหญ่ ผมหน้าม้าดำ หมวกฮู้ดแดงยอดแหลม เสื้อคลุมตัว A แขนกว้าง ข้างในเขียว
    var b = new G.Builder(), skin = '#ffffff', green = '#86a852', black = '#1d1b22';
    b.jit = 0.02;
    [-0.16, 0.16].forEach(function (x) {
      b.push().tr(x, 0.1, 0.0); b.cyl(0.07, 0.07, 0.3, 6, green); b.pop();
      b.push().tr(x * 1.3, 0.02, 0.07).sc(1, 0.45, 1.5); b.sphere(0.12, 6, 4, '#ffffff'); b.pop();
    });
    b.push().tr(0, 0.18, 0); b.cyl(0.3, 0.52, 0.8, 8, { t: coat, b: coat, s: coat }); b.pop();
    b.push().tr(0, 0.18, 0.36).rx(-0.2); b.box(0.28, 0.66, 0.08, green); b.pop();
    [-1, 1].forEach(function (sx) {
      b.push().tr(sx * 0.5, 0.78, 0).rz(-sx * 0.28); b.box(0.62, 0.3, 0.3, coat); b.pop();
      b.push().tr(sx * 0.88, 0.7, 0); b.sphere(0.11, 6, 4, '#ffffff'); b.pop();
    });
    b.push().tr(0, 1.2, 0).sc(1.22, 1.0, 1.0); b.sphere(0.5, 12, 8, skin); b.pop();
    [-1, 1].forEach(function (sx) {
      b.push().tr(sx * 0.57, 1.2, 0).sc(0.75, 1, 0.8); b.sphere(0.2, 7, 5, skin); b.pop();
      b.push().tr(sx * 0.2, 1.22, 0.47); b.sphere(0.055, 5, 4, black); b.pop();
      b.push().tr(sx * 0.34, 1.07, 0.4).sc(1, 0.7, 0.4); b.sphere(0.1, 6, 4, '#ffb0c0'); b.pop();
      b.push().tr(sx * 0.5, 0.95, 0.0); b.sphere(0.1, 5, 4, black); b.pop();
    });
    b.push().tr(0, 1.06, 0.48); b.box(0.1, 0.02, 0.02, '#8a6a6a'); b.pop();
    b.push().tr(0, 1.5, 0.0).sc(1.12, 0.5, 1.0); b.sphere(0.5, 10, 6, black); b.pop();
    b.push().tr(0, 1.36, 0.36).sc(1.0, 0.42, 0.4); b.sphere(0.38, 8, 5, black); b.pop();
    b.push().tr(0, 1.5, -0.12).rx(-0.3); b.cyl(0.04, 0.55, 0.85, 8, coat, { noBot: true }); b.pop();
    b.push().tr(0, 1.6, 0.14).sc(1.15, 0.28, 0.6); b.sphere(0.4, 8, 4, coat); b.pop();
    return b;
  }
  // ตัวละครที่ปั้นเองจาก Maya (assets/char.glb) ถ้าอ่านไม่ได้จะกลับไปใช้ตัวเดิม
  function customChars(R) {
    try {
      if (typeof window === 'undefined' || !window.CHAR_GLB || typeof ModelLoad === 'undefined') return null;
      var s = atob(window.CHAR_GLB), ab = new ArrayBuffer(s.length), u = new Uint8Array(ab), i; for (i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
      var m = R.mesh(ModelLoad.fromGLB(ab, { height: 2 }).builder); return [m, m, m, m];
    } catch (e) { return null; }
  }
  function buildMarker() { var b = new G.Builder(); b.jit = 0.06; b.sphere(0.32, 4, 2, '#ffdd33'); return b; }
  function buildSky() {
    var b = new G.Builder(); b.jit = 0; var N = 8;
    b.sphere(150, 14, N, function (a, k) { var t = Math.max(0, (k - 2) / (N - 3)); return G.rgb(HORIZON).map(function (v, i) { return v + (G.rgb('#4fb3ff')[i] - v) * Math.pow(t, 0.55); }); });
    return b;
  }
  function buildGround() {
    var b = new G.Builder(), i, j, rings = [15, 20, 28, 38, 52, 72, 110], seg = 28; b.jit = 0;
    for (j = 0; j < rings.length; j++) for (i = 0; i < seg; i++) {
      var r0 = j ? rings[j - 1] : 0, r1 = rings[j], a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2, y = -0.7, col = ((i + j) % 2) ? '#ffc4da' : '#ffe9f1';
      b.quad([Math.cos(a0) * r0, y, Math.sin(a0) * r0], [Math.cos(a0) * r1, y, Math.sin(a0) * r1], [Math.cos(a1) * r1, y, Math.sin(a1) * r1], [Math.cos(a1) * r0, y, Math.sin(a1) * r0], col);
    }
    // จานรองเค้ก
    b.push().tr(0, -0.7, 0); b.cyl(14.6, 14.8, 0.22, 36, { t: '#ff9ec0', b: '#ff9ec0', s: '#ff8db4' }); b.pop();
    b.push().tr(0, -0.7, 0); b.cyl(14.0, 14.3, 0.4, 36, { t: '#fffaf5', b: '#fffaf5', s: '#f1e6dc' }); b.pop();
    // เกล็ดน้ำตาลโรยบนผ้าปู
    var rnd = rng(11), cols = ['#ff5a63', '#6f7dff', '#c4ec4b', '#ffd24a', '#ff9ec0'];
    for (i = 0; i < 90; i++) { var ang = rnd() * Math.PI * 2, rr = 15.5 + rnd() * 30; b.push().tr(Math.cos(ang) * rr, -0.69, Math.sin(ang) * rr).ry(rnd() * 6); b.box(0.5, 0.1, 0.18, cols[Math.floor(rnd() * 5)]); b.pop(); }
    return b;
  }
  function buildCloud(seed) {
    var b = new G.Builder(), rnd = rng(seed), i; b.jit = 0.03;
    for (i = 0; i < 5; i++) { b.push().tr((i - 2) * 3.2 + rnd(), rnd() * 1.4, rnd() * 2).sc(1.4, 0.8, 1); b.sphere(3 + rnd() * 2, 7, 4, '#ffffff'); b.pop(); }
    return b;
  }



  /* ---------- ตัวละครลูกอมกลม: ลำตัวคือหัวกลมๆ มีแขนขาเป็นเส้นโผล่ออกมา ตากะพริบได้ ขยับได้ ---------- */
  var CANDY_COL = ['#ff5d8a', '#4dabf7', '#ffc933', '#5fd16f'], CY = 1.15, CR = 0.6;
  function makePill(R, col) {
    var P = {}, b, ink = '#3a2a3a', blue = col || '#3d7bf0', HC = 0.38;
    b = new G.Builder(); b.jit = 0.015;
    b.push().tr(0, -HC, 0); b.cyl(0.5, 0.5, HC * 2, 14, blue); b.pop();
    b.push().tr(0, HC, 0); b.sphere(0.5, 14, 8, blue); b.pop(); b.push().tr(0, -HC, 0); b.sphere(0.5, 14, 8, blue); b.pop();
    b.push().tr(0, -0.05, 0); b.cyl(0.512, 0.512, 0.09, 14, '#eaf4ff'); b.pop();
    [[-0.3, 0.55, -0.35], [0.3, 0.6, -0.3], [0, -0.55, -0.4], [-0.35, -0.5, -0.2], [0.4, -0.45, -0.25]].forEach(function (v) { var l = Math.hypot(v[0], v[2]); b.push().tr(v[0] / l * 0.5, v[1], v[2] / l * 0.5); b.sphere(0.075, 6, 4, '#bcd8ff'); b.pop(); });
    b.push().tr(-0.2, 0.62, 0.3).sc(1, 0.6, 0.5).rz(0.4); b.sphere(0.12, 6, 4, '#ffffff'); b.pop();
    P.body = R.mesh(b);
    b = new G.Builder(); b.sphere(0.075, 6, 5, ink); P.eye = R.mesh(b);
    b = new G.Builder(); b.sphere(0.12, 6, 4, '#ff9ab8'); P.cheek = R.mesh(b);
    b = new G.Builder(); b.box(0.12, 0.03, 0.03, '#7a3a4a'); P.mouth = R.mesh(b);
    function limb(L, tipS) { var q = new G.Builder(); q.push().tr(0, -L, 0); q.cyl(0.05, 0.05, L, 5, ink); q.pop(); q.push().tr(0, -L, tipS > 0.09 ? 0.05 : 0).sc(1, tipS > 0.09 ? 0.45 : 1, tipS > 0.09 ? 1.5 : 1); q.sphere(tipS, 6, 4, ink); q.pop(); return R.mesh(q); }
    P.arm = limb(0.62, 0.065); P.leg = limb(0.58, 0.11);
    P.pill = true; P.cy = 1.38; P.hh = 0.88; P.rad = 0.5;
    return P;
  }
  function makeCandy(R, col) {
    var P = {}, b, ink = '#3a2a3a';
    P.cy = CY; P.hh = CR; P.rad = CR; P.face = { ex: 0.21, ey: 0.1, ez: 0.55, cx: 0.36, cy: -0.1, cz: 0.44, my: -0.1, mz: 0.585 };
    b = new G.Builder(); b.jit = 0.015; b.sphere(CR, 14, 9, col);
    var dots = [[-0.5, 0.35, -0.5], [0.55, 0.2, -0.45], [0, 0.55, -0.35], [-0.58, -0.2, -0.2], [0.5, -0.3, -0.4], [0, -0.3, -0.58], [-0.3, 0.55, 0.1], [0.32, 0.56, 0.05]];
    dots.forEach(function (v) { var l = Math.hypot(v[0], v[1], v[2]); b.push().tr(v[0] / l * CR * 0.98, v[1] / l * CR * 0.98, v[2] / l * CR * 0.98); b.sphere(0.1, 6, 4, '#ffffffcc'.slice(0, 7)); b.pop(); });
    b.push().tr(-0.22, 0.4, 0.4).sc(1, 0.7, 0.5); b.sphere(0.13, 6, 4, '#ffffff'); b.pop();
    P.body = R.mesh(b);
    b = new G.Builder(); b.sphere(0.075, 6, 5, ink); P.eye = R.mesh(b);
    b = new G.Builder(); b.sphere(0.12, 6, 4, '#ff9ab8'); P.cheek = R.mesh(b);
    b = new G.Builder(); b.box(0.12, 0.03, 0.03, '#7a3a4a'); P.mouth = R.mesh(b);
    function limb(L, tipS) { var q = new G.Builder(); q.push().tr(0, -L, 0); q.cyl(0.05, 0.05, L, 5, ink); q.pop(); q.push().tr(0, -L, tipS > 0.09 ? 0.05 : 0).sc(1, tipS > 0.09 ? 0.45 : 1, tipS > 0.09 ? 1.5 : 1); q.sphere(tipS, 6, 4, ink); q.pop(); return R.mesh(q); }
    P.arm = limb(0.62, 0.065); P.leg = limb(0.58, 0.11);
    return P;
  }
  function dressChar(R, P, b) {
    var ink = '#3a2a3a', q;
    P.body = R.mesh(b);
    q = new G.Builder(); q.sphere(0.075, 6, 5, ink); P.eye = R.mesh(q);
    q = new G.Builder(); q.sphere(0.12, 6, 4, '#ff9ab8'); P.cheek = R.mesh(q);
    q = new G.Builder(); q.box(0.12, 0.03, 0.03, '#7a3a4a'); P.mouth = R.mesh(q);
    function limb(L, tipS) { var w = new G.Builder(); w.push().tr(0, -L, 0); w.cyl(0.05, 0.05, L, 5, ink); w.pop(); w.push().tr(0, -L, tipS > 0.09 ? 0.05 : 0).sc(1, tipS > 0.09 ? 0.45 : 1, tipS > 0.09 ? 1.5 : 1); w.sphere(tipS, 6, 4, ink); w.pop(); return R.mesh(w); }
    P.arm = limb(0.62, 0.065); P.leg = limb(0.58, 0.11);
    return P;
  }
  // เยลลี่ก้อน: ลูกเต๋าเยลลี่มุมมน มีเม็ดน้ำตาลบนหัว
  function makeJelly(R, col) {
    var P = { cy: 1.03, hh: 0.5, rad: 0.5, face: { ex: 0.25, ey: -0.02, ez: 0.5, cx: 0.37, cy: -0.17, cz: 0.5, my: -0.25, mz: 0.515 } }, b = new G.Builder();
    b.jit = 0.012; b.push().tr(0, -0.45, 0); b.box(0.9, 0.9, 0.9, col); b.pop();
    [-1, 1].forEach(function (x) { [-1, 1].forEach(function (y) { [-1, 1].forEach(function (z) { b.push().tr(x * 0.4, y * 0.4, z * 0.4); b.sphere(0.13, 6, 4, col); b.pop(); }); }); });
    [[-0.25, 0.5, -0.2], [0.2, 0.5, 0.15], [0.05, 0.5, -0.3], [-0.2, 0.5, 0.25]].forEach(function (v) { b.push().tr(v[0], v[1], v[2]); b.sphere(0.075, 5, 4, '#ffffff'); b.pop(); });
    b.push().tr(-0.3, 0.2, 0.46).sc(0.5, 1.6, 0.4); b.sphere(0.1, 6, 4, '#ffffff'); b.pop();
    return dressChar(R, P, b);
  }
  // คัพเค้ก: ถ้วยกระดาษ + ครีมก้อนใหญ่ + เชอร์รี่
  function makeCupcake(R, col) {
    var P = { cy: 1.2, hh: 0.62, rad: 0.55, face: { ex: 0.2, ey: 0.05, ez: 0.56, cx: 0.34, cy: -0.12, cz: 0.47, my: -0.1, mz: 0.585 } }, b = new G.Builder();
    b.jit = 0.012;
    b.push().tr(0, -0.62, 0); b.cyl(0.5, 0.38, 0.5, 12, { t: '#f2c27a', b: '#c98a5a', s: '#f2c27a', sf: function (k) { return k % 2 ? '#f2c27a' : '#e2a85a'; } }); b.pop();
    b.push().tr(0, 0.02, 0); b.sphere(0.6, 12, 8, col); b.pop();
    b.push().tr(0, 0.5, 0); b.sphere(0.4, 10, 7, col); b.pop();
    b.push().tr(0, 0.82, 0); b.sphere(0.2, 8, 6, col); b.pop();
    b.push().tr(0.02, 1.02, 0); b.sphere(0.17, 7, 5, '#ff3d4e'); b.pop();
    [[-0.45, 0.25, 0.3], [0.5, 0.2, 0.25], [-0.3, 0.6, 0.2], [0.25, 0.62, 0.25], [0.4, 0.45, -0.3]].forEach(function (v) { var l = Math.hypot(v[0], v[1] - 0.02, v[2]); b.push().tr(v[0], v[1], v[2]); b.sphere(0.06, 5, 4, '#ffffff'); b.pop(); });
    b.push().tr(-0.25, 0.3, 0.46).sc(1, 0.7, 0.5); b.sphere(0.11, 6, 4, '#ffffff'); b.pop();
    return dressChar(R, P, b);
  }
  var CHAR_NAMES = ['ลูกอม', 'เม็ดยา', 'เยลลี่', 'คัพเค้ก'];
  function getChar(R, skin, hex) {
    var c = R._chr = R._chr || {}, k = skin + hex;
    return c[k] || (c[k] = skin === 1 ? makePill(R, hex) : skin === 2 ? makeJelly(R, hex) : skin === 3 ? makeCupcake(R, hex) : makeCandy(R, hex));
  }
  function drawCandy(R, P, base, tt, moving, ph, tint) {
    var o = { tint: tint || [1.1, 1.1, 1.1], emis: [0.08, 0.08, 0.08] }, w = moving ? tt * 13 + ph : 0, idle = Math.sin(tt * 2.4 + ph);
    var sq = moving ? 1 + Math.abs(Math.sin(w)) * 0.05 : 1 + idle * 0.02, lean = moving ? -0.18 : 0;
        var cy = P.cy, bodyBase = M4.mul(base, M4.translate(0, cy, 0)), body = M4.mul(bodyBase, M4.mul(M4.rotX(-lean), M4.scale(1 / sq, sq, 1 / sq)));
    R.draw(P.body, body, o);
    var per = 3.4 + (ph % 1) * 0.8, bt = (tt + ph * 2) % per, blink = bt < 0.14 ? Math.max(0.08, Math.abs(bt - 0.07) / 0.07) : 1;
    [-1, 1].forEach(function (sx) {
      if (P.pill) {   // ตาเบี้ยวนิดๆ ซ้ายสูง/ใหญ่กว่า ขวาต่ำ/เล็กกว่า
        var ex = sx < 0 ? -0.2 : 0.22, ey = sx < 0 ? 0.36 : 0.22, es = sx < 0 ? 1.25 : 0.9, ez = Math.sqrt(0.25 - ex * ex) - 0.02;
        R.draw(P.eye, M4.mul(body, M4.mul(M4.translate(ex, ey, ez), M4.scale(es, es * blink, 0.7))), { unlit: true, noCast: true, grain: 0 });
        R.draw(P.cheek, M4.mul(body, M4.mul(M4.translate(sx * 0.32, 0.02, 0.37), M4.scale(1, 0.7, 0.4))), { noCast: true, tint: [1.1, 1, 1.05] });
      } else {
      var F = P.face;
      R.draw(P.eye, M4.mul(body, M4.mul(M4.translate(sx * F.ex, F.ey, F.ez), M4.scale(1, blink, 0.7))), { unlit: true, noCast: true, grain: 0 });
      R.draw(P.cheek, M4.mul(body, M4.mul(M4.translate(sx * F.cx, F.cy, F.cz), M4.scale(1, 0.7, 0.4))), { noCast: true, tint: [1.1, 1, 1.05] });
      }
      var sw = moving ? Math.sin(w + (sx > 0 ? 0 : Math.PI)) : 0;
      // ขา
      R.draw(P.leg, M4.mul(base, M4.mul(M4.translate(sx * 0.2, cy - P.hh + 0.05, 0), M4.rotX(sw * 0.85))), o);
      // แขน กางออกเล็กน้อยและแกว่งสวนกับขา
      var arm = moving ? -sw * 0.8 : idle * 0.12 * sx;
      R.draw(P.arm, M4.mul(bodyBase, M4.mul(M4.translate(sx * (P.rad - 0.02), -0.05, 0), M4.mul(M4.rotZ(sx * (0.55 + (moving ? 0.1 : 0.04 * idle))), M4.rotX(arm)))), o);
    });
    R.draw(P.mouth, M4.mul(body, P.pill ? M4.translate(0.03, 0.0, 0.495) : M4.translate(0, P.face.my, P.face.mz)), { unlit: true, noCast: true, grain: 0 });
  }

  /* ---------- ตัวอย่างตัวละครหน้าเมนู (หันหน้าตามเมาส์) ---------- */
  function CharPreview(canvas) {
    this.cv = canvas; this.R = new G.Renderer(canvas); this.R.resize(120, 170); var R = this.R;
    var cc = customChars(R); this.mesh = cc ? cc[0] : null; 
    var pb = new G.Builder(); pb.jit = 0.02; pb.cyl(1.35, 1.45, 0.25, 20, { t: '#ffb3cf', s: '#ff9ec0', b: '#ff9ec0' }); this.plate = R.mesh(pb);
    var Lc = [0, 1, 0], Ld = R.light; this.lvp = M4.mul(M4.ortho(-3, 3, -3, 3, 1, 40), M4.look([Lc[0] + Ld[0] * 12, Lc[1] + Ld[1] * 12, Lc[2] + Ld[2] * 12], Lc, [0, 1, 0]));
    this.vp = M4.mul(M4.persp(30 * Math.PI / 180, 120 / 170, 0.5, 60), M4.look([0, 1.5, 6.2], [0, 1.0, 0], [0, 1, 0]));
    this.eye = [0, 1.5, 6.2]; this.yaw = 0; this.pitch = 0;
  }
  CharPreview.prototype.draw = function (mx, my, now, skin, hex) {
    var R = this.R, k = 0.18, tt = (now || 0) / 1000;
    this.yaw += (Math.max(-1.1, Math.min(1.1, mx * 1.2)) - this.yaw) * k; this.pitch += (Math.max(-0.25, Math.min(0.25, my * 0.3)) - this.pitch) * k;
    var m = M4.mul(M4.translate(0, 0.12 + Math.sin(tt * 2) * 0.03, 0), M4.mul(M4.rotY(this.yaw), M4.mul(M4.rotX(this.pitch), M4.scale(0.95, 0.95, 0.95))));
    var self = this, scene = function () { R.draw(self.plate, null, null); if (self.mesh) R.draw(self.mesh, m, null); else drawCandy(R, getChar(R, skin || 0, hex || CANDY_COL[0]), m, tt, false, 0.3, [1.12, 1.1, 1.1]); };
    R.shadowBegin(this.lvp); scene(); R.sceneBegin(this.vp, this.eye, '#7480b4', 40, 90); scene(); R.post();
  };


  /* ---------- หน้าเลือกตัวละคร: เวทีกลมตัวเต็ม (หันตามเมาส์) + ภาพโปรไฟล์ close-up ---------- */
  function CharStage(canvas) {
    this.cv = canvas; this.R = new G.Renderer(canvas, { transparent: true }); var R = this.R;
    var pb = new G.Builder(); pb.jit = 0.02;
    pb.cyl(1.9, 2.05, 0.3, 28, { t: '#ffd2e3', s: '#ff9ec0', b: '#ff9ec0' }); pb.push().tr(0, 0.16, 0); pb.cyl(1.55, 1.6, 0.06, 28, { t: '#ffc2d9', s: '#ffb0cc', b: '#ffb0cc' }); pb.pop(); this.plate = R.mesh(pb);
    var Ld = R.light; this.lvp = M4.mul(M4.ortho(-4, 4, -4, 4, 1, 40), M4.look([Ld[0] * 12, 1 + Ld[1] * 12, Ld[2] * 12], [0, 1, 0], [0, 1, 0]));
    this.yaw = 0; this.pitch = 0;
  }
  CharStage.prototype.draw = function (mx, my, now, skin, hex) {
    var cw = this.cv.clientWidth, ch = this.cv.clientHeight; if (!cw || !ch) return;
    var R = this.R, tt = (now || 0) / 1000, gh = 420, gw = Math.max(200, Math.round(gh * cw / ch)); R.resize(gw, gh);
    this.yaw += (Math.max(-1.2, Math.min(1.2, mx * 1.3)) - this.yaw) * 0.16; this.pitch += (Math.max(-0.3, Math.min(0.3, my * 0.35)) - this.pitch) * 0.16;
    var eye = [1.95, 2.4, 9.2], vp = M4.mul(M4.persp(32 * Math.PI / 180, cw / ch, 0.5, 60), M4.look(eye, [1.95, 1.0, 0], [0, 1, 0])), self = this;
    var m = M4.mul(M4.translate(0, 0.2 + Math.sin(tt * 2) * 0.03, 0), M4.mul(M4.rotY(this.yaw), M4.mul(M4.rotX(this.pitch), M4.scale(1.0, 1.0, 1.0))));
    var scene = function () { R.draw(self.plate, null, { tint: [0.72, 0.72, 0.78] }); drawCandy(R, getChar(R, skin || 0, hex || CANDY_COL[0]), m, tt, false, 0.3, [1.12, 1.1, 1.1]); };
    R.shadowBegin(this.lvp); scene(); R.sceneBegin(vp, eye, '#8f9bd0', 400, 800); scene(); R.post();
  };
  // ภาพ close-up หน้าตัวละคร หันไปทางซ้ายเล็กน้อย -> คืนค่าเป็น dataURL (ใช้ซ้ำที่อื่นได้)


  /* ใบหน้า close-up สดๆ หันตามเมาส์ (HUD มุมซ้ายบนตอนเล่น) */
  function HeadView(canvas) { this.cv = canvas; this.R = new G.Renderer(canvas); this.R.resize(canvas.width, canvas.height); this.yaw = 0; this.pitch = 0; var Ld = this.R.light; this.lvp = M4.mul(M4.ortho(-3, 3, -3, 3, 1, 40), M4.look([Ld[0] * 12, 1.2 + Ld[1] * 12, Ld[2] * 12], [0, 1.2, 0], [0, 1, 0])); }
  HeadView.prototype.draw = function (mx, my, now, skin, hex) {
    var R = this.R, tt = (now || 0) / 1000; R.resize(this.cv.width, this.cv.height);
    this.yaw += (Math.max(-1.0, Math.min(1.0, mx * 1.1)) - this.yaw) * 0.2; this.pitch += (Math.max(-0.35, Math.min(0.35, my * 0.5)) - this.pitch) * 0.2;
    var eye = [0, 1.75, 4.0], vp = M4.mul(M4.persp(30 * Math.PI / 180, 1, 0.5, 40), M4.look(eye, [0, 1.65, 0], [0, 1, 0]));
    var P = getChar(R, skin || 0, hex || CANDY_COL[0]), m = M4.mul(M4.translate(0, 0.1, 0), M4.mul(M4.rotY(this.yaw), M4.mul(M4.rotX(this.pitch), M4.scale(1.5, 1.5, 1.5))));
    var scene = function () { drawCandy(R, P, m, tt, false, 0.3, [1.12, 1.1, 1.1]); };
    R.shadowBegin(this.lvp); scene(); R.sceneBegin(vp, eye, ['#ffd0de', '#cfe7ff', '#fff0b8', '#d3f5d8'][(skin || 0) % 4], 80, 160); scene(); R.post();
  };

  function buildBag() {
    var b = new G.Builder(); b.jit = 0.03;
    b.push().tr(0, 0.0, 0); b.box(1.5, 1.15, 0.7, { t: '#ff9ab5', b: '#d4587a', s: '#ff7d98' }); b.pop();
    b.push().tr(0, 0.78, 0.02); b.box(1.56, 0.35, 0.76, { t: '#ffc2d3', b: '#ffa0b8', s: '#ffb0c4' }); b.pop();
    b.push().tr(0, 0.5, 0.4); b.box(0.28, 0.3, 0.1, '#ffd24a'); b.pop();
    b.push().tr(-0.42, 1.1, 0).rz(0.0); b.box(0.12, 0.5, 0.14, '#8a5a3a'); b.pop(); b.push().tr(0.42, 1.1, 0); b.box(0.12, 0.5, 0.14, '#8a5a3a'); b.pop();
    b.push().tr(0, 1.4, 0); b.box(0.96, 0.12, 0.14, '#8a5a3a'); b.pop();
    return b;
  }
  var _icons = {};
  function icon3d(kind, size) {
    if (_icons[kind]) return _icons[kind]; size = size || 96;
    var cv = document.createElement('canvas'); cv.width = size; cv.height = size; var R = new G.Renderer(cv); R.resize(size, size);
    var mesh = R.mesh(kind === 'cherry' ? buildCherry() : kind === 'coin' ? buildCoin() : buildBag()), cy = kind === 'cherry' ? 0.45 : kind === 'coin' ? 0.3 : 0.7, ex = kind === 'cherry' ? 3.2 : kind === 'coin' ? 1.7 : 3.4, ry = kind === 'bag' ? -0.5 : 0.6;
    var Ld = R.light, lvp = M4.mul(M4.ortho(-3, 3, -3, 3, 1, 40), M4.look([Ld[0] * 12, 1 + Ld[1] * 12, Ld[2] * 12], [0, 0.5, 0], [0, 1, 0]));
    var eye = [0, cy + ex * 0.3, ex * 1.6], vp = M4.mul(M4.persp(26 * Math.PI / 180, 1, 0.5, 40), M4.look(eye, [0, cy, 0], [0, 1, 0]));
    var m = M4.mul(M4.rotX(kind === 'coin' ? 0.0 : 0), M4.rotY(ry));
    var scene = function () { R.draw(mesh, m, kind === 'cherry' ? { emis: [0.12, 0.03, 0.04] } : null); };
    R.shadowBegin(lvp); scene(); R.sceneBegin(vp, eye, '#ff00ff', 80, 160); scene(); R.post();
    var c2 = document.createElement('canvas'); c2.width = size; c2.height = size; var g = c2.getContext('2d'); g.drawImage(cv, 0, 0);
    var id = g.getImageData(0, 0, size, size), d = id.data;
    for (var i = 0; i < d.length; i += 4) { var dm = Math.abs(d[i] - 255) + d[i + 1] + Math.abs(d[i + 2] - 255); if (dm < 140) d[i + 3] = 0; }
    g.putImageData(id, 0, 0);
    return (_icons[kind] = c2.toDataURL('image/png'));
  }

  /* ---------- หน้าสรุปคะแนน 3D: โหลแก้ว + ดาว 3 มิติ + โต๊ะ + มงกุฎ ---------- */
  function buildStar3() {
    var b = new G.Builder(); b.jit = 0.012; var pts = [], i, a, r; var T = 0.34, TC = 0.62;
    for (i = 0; i < 10; i++) { a = i * Math.PI / 5 + Math.PI / 2; r = i % 2 ? 0.46 : 1; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
    for (i = 0; i < 10; i++) { var p = pts[i], q = pts[(i + 1) % 10], rim = i % 2 ? '#f2a516' : '#ffd24a';
      b.tri([0, 0, TC], [q[0], q[1], T * 0.5], [p[0], p[1], T * 0.5], i % 2 ? '#ffe270' : '#ffd24a');
      b.tri([0, 0, -TC], [p[0], p[1], -T * 0.5], [q[0], q[1], -T * 0.5], i % 2 ? '#ffe270' : '#ffd24a');
      b.quad([p[0], p[1], T * 0.5], [q[0], q[1], T * 0.5], [q[0], q[1], -T * 0.5], [p[0], p[1], -T * 0.5], '#e0951a'); }
    return b;
  }
  function buildJar3(Rj, jh) {
    var b = new G.Builder(), n = 28, i; b.jit = 0;
    for (i = 0; i < n; i++) { var a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2, c0 = Math.cos(a0) * Rj, s0 = Math.sin(a0) * Rj, c1 = Math.cos(a1) * Rj, s1 = Math.sin(a1) * Rj;
      b.quad([c0, 0, s0], [c1, 0, s1], [c1, jh, s1], [c0, jh, s0], '#dff4ff');
      b.tri([0, 0.01, 0], [c1, 0.01, s1], [c0, 0.01, s0], '#cfeaff'); }
    return b;
  }
  function buildRim3(Rj, jh) {
    var b = new G.Builder(), n = 28, i, w = 0.09; b.jit = 0;
    for (i = 0; i < n; i++) { var a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      b.quad([c0 * Rj, jh, s0 * Rj], [c1 * Rj, jh, s1 * Rj], [c1 * (Rj + w), jh, s1 * (Rj + w)], [c0 * (Rj + w), jh, s0 * (Rj + w)], '#ffffff');
      b.quad([c0 * Rj, jh - 0.04, s0 * Rj], [c1 * Rj, jh - 0.04, s1 * Rj], [c1 * Rj, jh + 0.05, s1 * Rj], [c0 * Rj, jh + 0.05, s0 * Rj], '#ffffff');
      b.quad([c0 * (Rj + w), jh + 0.05, s0 * (Rj + w)], [c1 * (Rj + w), jh + 0.05, s1 * (Rj + w)], [c1 * Rj, jh + 0.05, s1 * Rj], [c0 * Rj, jh + 0.05, s0 * Rj], '#ffffff');
      b.quad([c0 * Rj, 0.0, s0 * Rj], [c1 * Rj, 0.0, s1 * Rj], [c1 * (Rj + w), 0.0, s1 * (Rj + w)], [c0 * (Rj + w), 0.0, s0 * (Rj + w)], '#ffffff'); }
    return b;
  }
  function buildCrown3() {   // มงกุฎผิวเดียวต่อเนื่อง: วงแหวนปลายแหลม 5 แฉก + อัญมณีนูนบนแถบ
    var b = new G.Builder(), N = 60, K = 5, P = Math.PI * 2, TH = 0.07; b.jit = 0;
    var ys = [0, 0.08, 0.26, 0.36], gold = '#ffd24a', lite = '#ffe680', dark = '#e0951a', jc = ['#e0314f', '#3aa0ff', '#3fcf6a', '#e0314f', '#b46bff'];
    function rad(y) { return 0.6 + 0.16 * y; }
    function top(i) { var per = N / K, m = ((i % per) + per) % per, t = Math.abs(m - per / 2) / (per / 2); /* 1 ที่หุบ(m=0), 0 ที่ยอด(m=per/2) */ return 0.36 + 0.66 * Math.pow(1 - t, 1.1); }
    function jew(i) { var per = N / K, m = ((i % per) + per) % per; return m === 0 ? 1 : 0; }   // อัญมณีที่หุบระหว่างแฉก
    function jx(i) { var per = N / K, m = ((i % per) + per) % per, k = Math.floor(i / per) % K; if (m <= 2) return { d: m, k: k }; if (m >= per - 2) return { d: per - m, k: (k + 1) % K }; return null; }
    function V(i, y, ex) { var a = i / N * P, r = rad(y) + (ex || 0); return [Math.cos(a) * r, y, Math.sin(a) * r]; }
    function bump(i, li) { var q = jx(i); if (!q || li < 1 || li > 2) return 0; return q.d === 0 ? 0.05 : q.d === 1 ? 0.04 : 0; }
    var i, li;
    for (i = 0; i < N; i++) {
      var i1 = i + 1, t0 = top(i), t1 = top(i1);
      for (li = 0; li < 3; li++) {   // แถบล่าง 3 แถว
        var y0 = ys[li], y1 = ys[li + 1], q = jx(i), q1 = jx(i1), isJ = li === 1 && q && q1 && q.d <= 1 && q1.d <= 1 && (q.d + q1.d) <= 1 + 0 + (q.d === 0 && q1.d === 0 ? 1 : 0), col = li === 1 ? lite : gold;
        if (li === 1 && ((q && q.d <= 1) || (q1 && q1.d <= 1)) && q && q1 && q.d <= 1 && q1.d <= 1) col = jc[(q.d === 0 ? q.k : q1.k) % 5];
        b.quad(V(i, y0, bump(i, li)), V(i1, y0, bump(i1, li)), V(i1, y1, bump(i1, li + 1)), V(i, y1, bump(i, li + 1)), col);
      }
      // ผนังนอกส่วนยอดแหลม (จาก y=0.36 ถึงปลาย)
      b.quad(V(i, ys[3]), V(i1, ys[3]), [V(i1, t1)[0], t1, V(i1, t1)[2]], [V(i, t0)[0], t0, V(i, t0)[2]], gold);
      // ผนังใน
      var ri0 = rad(0) - TH, ri1 = ri0;
      function W(ii, y) { var a = ii / N * P, r = rad(y) - TH; return [Math.cos(a) * r, y, Math.sin(a) * r]; }
      b.quad(W(i1, 0), W(i, 0), W(i, t0), W(i1, t1), dark);
      // หน้าตัดขอบบน (ผนังหนา)
      b.quad([V(i, t0)[0], t0, V(i, t0)[2]], [V(i1, t1)[0], t1, V(i1, t1)[2]], W(i1, t1), W(i, t0), lite);
      // ฐานล่าง
      b.quad(V(i1, 0), V(i, 0), W(i, 0), W(i1, 0), dark);
    }
    return b;
  }
  function buildMedal3() {   // เหรียญรางวัล: วงนอก + หน้าเหรียญนูน + ดาวตรงกลาง + ริบบิ้น (แกนเหรียญ = y)
    var b = new G.Builder(), i, n = 28; b.jit = 0; b.push().tr(0, -0.08, 0);
    b.cyl(0.62, 0.62, 0.16, n, { t: '#e0951a', b: '#b8730a', s: '#c98310' });
    b.push().tr(0, 0.16, 0); b.cyl(0.5, 0.52, 0.05, n, { t: '#ffe270', b: '#ffd24a', s: '#ffd24a' }); b.pop();
    b.push().tr(0, -0.05, 0); b.cyl(0.52, 0.5, 0.05, n, { t: '#ffd24a', b: '#ffe270', s: '#ffd24a' }); b.pop();
    var pts = []; for (i = 0; i < 10; i++) { var a = i * Math.PI / 5; var r = i % 2 ? 0.17 : 0.37; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
    for (i = 0; i < 10; i++) { var p = pts[i], q = pts[(i + 1) % 10]; b.tri([0, 0.23, 0], [q[0], 0.205, q[1]], [p[0], 0.205, p[1]], i % 2 ? '#e0951a' : '#ffb320'); b.tri([0, -0.12, 0], [p[0], -0.095, p[1]], [q[0], -0.095, q[1]], i % 2 ? '#e0951a' : '#ffb320'); }
    b.pop();
    b.quad([-0.34, 0.02, -0.5], [-0.04, 0.02, -0.5], [-0.04, 0.02, -0.95], [-0.34, 0.02, -0.95], '#e0314f');
    b.quad([0.04, 0.02, -0.5], [0.34, 0.02, -0.5], [0.34, 0.02, -0.95], [0.04, 0.02, -0.95], '#3a7bff');
    b.quad([-0.34, 0.02, -0.95], [-0.04, 0.02, -0.95], [-0.19, 0.02, -0.85], [-0.34, 0.02, -0.95], '#e0314f');
    return b;
  }
  function buildTrophy3() {   // ถ้วยรางวัล: กลึงเป็นผิวเดียว + หูจับ
    var b = new G.Builder(), N = 28, i, k, P = Math.PI * 2; b.jit = 0;
    var prof = [[0.001, 0], [0.62, 0], [0.66, 0.06], [0.6, 0.15], [0.34, 0.22], [0.14, 0.36], [0.11, 0.72], [0.24, 0.8], [0.46, 0.9], [0.5, 1.0], [0.7, 1.28], [0.8, 1.85], [0.74, 1.88], [0.6, 1.8], [0.4, 1.45], [0.001, 1.38]];
    var cols = ['#b8730a', '#e0951a', '#ffd24a', '#ffe270', '#ffd24a', '#ffe270', '#ffd24a', '#ffe270', '#ffd24a', '#ffe270', '#ffd24a', '#fff3b0', '#ffe270', '#ffd24a', '#e0951a'];
    for (k = 0; k < prof.length - 1; k++) for (i = 0; i < N; i++) {
      var a0 = i / N * P, a1 = (i + 1) / N * P, p = prof[k], q = prof[k + 1];
      b.quad([Math.cos(a0) * p[0], p[1], Math.sin(a0) * p[0]], [Math.cos(a1) * p[0], p[1], Math.sin(a1) * p[0]], [Math.cos(a1) * q[0], q[1], Math.sin(a1) * q[0]], [Math.cos(a0) * q[0], q[1], Math.sin(a0) * q[0]], cols[k % cols.length]);
    }
    [-1, 1].forEach(function (sd) {   // หูจับ = ท่อวงแหวนติดข้างถ้วย
      var M = 18, m = 8, R0 = 0.3, r0 = 0.075, cx = sd * 0.78, cy = 1.45, j;
      for (i = 0; i < M; i++) for (j = 0; j < m; j++) {
        function T(ii, jj) { var u = ii / M * P, v = jj / m * P; return [cx + sd * (R0 + r0 * Math.cos(v)) * Math.cos(u) * 0.9, cy + (R0 + r0 * Math.cos(v)) * Math.sin(u), r0 * Math.sin(v)]; }
        b.quad(T(i, j), T(i + 1, j), T(i + 1, j + 1), T(i, j + 1), (i + j) % 2 ? '#ffd24a' : '#ffe270');
      }
    });
    return b;
  }
  function FinalView(canvas) {
    this.cv = canvas; var R = this.R = new G.Renderer(canvas, { transparent: true, bloom: 0.3 });
    this.star = R.mesh(buildStar3()); this.crown = R.mesh(buildCrown3()); this.medal = R.mesh(buildMedal3()); this.trophy = R.mesh(buildTrophy3()); this.jarR = -1;
    var tb = new G.Builder(); tb.jit = 0.02; tb.push().tr(0, -0.3, 0); tb.box(60, 0.6, 9, { t: '#e0a66e', s: '#b97c48', b: '#a56a3e' }); tb.pop(); tb.push().tr(0, -0.02, 4.42); tb.box(60, 0.08, 0.16, '#f2c08a'); tb.pop(); this.table = R.mesh(tb);
  }
  FinalView.prototype.draw = function (S, now) {
    var R = this.R, cv = this.cv, cw = cv.clientWidth, ch = cv.clientHeight; if (!cw || !ch) return null; var gh = Math.min(720, ch), gw = Math.round(gh * cw / ch); R.resize(gw, gh);
    if (this.jarR !== S.Rj || this.jarH !== S.jh) { this.jar = R.mesh(buildJar3(S.Rj, S.jh)); this.rim = R.mesh(buildRim3(S.Rj, S.jh)); this.jarR = S.Rj; this.jarH = S.jh; }
    var asp = cw / ch, fov = 34 * Math.PI / 180, dist = Math.max(8.6, (S.span / 2 + 1.0) / (Math.tan(fov / 2) * asp)), eye = [0, 3.3, dist], look = [0, 1.45, 0];
    var vp = M4.mul(M4.persp(fov, asp, 0.5, 80), M4.look(eye, look, [0, 1, 0])), self = this, i, Ld = R.light;
    var ex = S.span / 2 + 3, lvp = M4.mul(M4.ortho(-ex, ex, -5, 7, 1, 60), M4.look([Ld[0] * 20, 3 + Ld[1] * 20, Ld[2] * 20], [0, 1, 0], [0, 1, 0]));
    var FL = S.flat == null ? 1 : S.flat, PRE = FL === 1 ? null : M4.scale(1, FL, 1), W = function (m) { return PRE ? M4.mul(PRE, m) : m; };
    var scene = function () {
      R.draw(self.table, null, null);
      S.jars.forEach(function (J) { var m = M4.translate(J.cx, J.lift, 0); if (J.crown) R.draw(self.crown, W(M4.mul(M4.mul(M4.translate(J.cx, S.jh + 0.5 + J.lift + Math.sin(now / 200) * 0.06, 0), M4.rotY(now / 900)), M4.scale(1.25, 1.25, 1.25))), { emis: [0.07, 0.05, 0.0], double: true }); });
      if (S.medal) R.draw(self.medal, M4.mul(M4.mul(M4.translate(S.medal.x, S.medal.y + Math.sin(now / 300) * 0.05, S.medal.z || 0), M4.mul(M4.rotY(now / 650), M4.rotX(Math.PI / 2))), M4.scale(S.medal.s, S.medal.s, S.medal.s)), { emis: [0.12, 0.08, 0.0], double: true });
      (S.chars || []).forEach(function (c) { var P = getChar(R, c.skin, c.hex), sq = c.sq || 1; drawCandy(R, P, W(M4.mul(M4.translate(c.x, c.y, c.z), M4.mul(M4.rotY(c.ry || 0), M4.scale(c.s * sq, c.s / sq, c.s * sq)))), now / 1000, false, c.ph || 0.3, [1.12, 1.1, 1.1]); });
      if (S.trophy) { var T = S.trophy, tq = T.sq || 1; R.draw(self.trophy, M4.mul(M4.translate(T.x, T.y, T.z), M4.mul(M4.rotY(T.ry || 0), M4.scale(T.s * tq, T.s / tq, T.s * tq))), { emis: [0.12, 0.08, 0.0], double: true }); }
      S.stars.forEach(function (st) {
        var m = M4.mul(M4.translate(st.x, st.y + (st.ly || 0), st.z), M4.mul(M4.rotZ(st.az), M4.mul(M4.rotY(st.ay), M4.mul(M4.rotX(st.ax), M4.scale(S.rs, S.rs, S.rs)))));
        R.draw(self.star, W(m), { tint: st.tint || [1, 1, 1], emis: [0.1, 0.07, 0.0] });
      });
      S.jars.forEach(function (J) { var m = M4.translate(J.cx, J.lift, 0); R.draw(self.rim, W(m), { alpha: 0.95, double: true, emis: [0.2, 0.2, 0.25] }); R.draw(self.jar, W(m), { alpha: J.glow ? 0.34 : 0.2, double: true, emis: J.glow ? [0.35, 0.3, 0.1] : [0.08, 0.1, 0.14], noCast: true }); });
    };
    R.shadowBegin(lvp); scene(); R.sceneBegin(vp, eye, '#000000', 400, 800); scene(); R.post();
    return vp;
  };
  var _pcache = {}, _pcv = null, _pR = null;
  function portrait(skin, hex, size) {
    if (window.PORTART && window.PORTART[skin]) return window.PORTART[skin];   // รูปวาดจริงจากผู้ออกแบบ
    var key = skin + '|' + hex; if (_pcache[key]) return _pcache[key]; size = size || 160;
    if (!_pcv) { _pcv = document.createElement('canvas'); _pcv.width = size; _pcv.height = size; _pR = new G.Renderer(_pcv); _pR.resize(size, size); }
    var R = _pR, Ld = R.light, lvp = M4.mul(M4.ortho(-3, 3, -3, 3, 1, 40), M4.look([Ld[0] * 12, 1.2 + Ld[1] * 12, Ld[2] * 12], [0, 1.2, 0], [0, 1, 0]));
    var eye = [0.1, 1.9, 4.5], vp = M4.mul(M4.persp(30 * Math.PI / 180, 1, 0.5, 40), M4.look(eye, [-0.05, 1.65, 0], [0, 1, 0]));
    var P = getChar(R, skin, hex), m = M4.mul(M4.translate(0, 0.1, 0), M4.mul(M4.rotY(-0.62), M4.mul(M4.rotX(0.06), M4.scale(1.5, 1.5, 1.5))));
    var scene = function () { drawCandy(R, P, m, 0.4, false, 0.3, [1.12, 1.1, 1.1]); };
    R.shadowBegin(lvp); scene(); R.sceneBegin(vp, eye, ['#ffd0de', '#cfe7ff', '#fff0b8', '#d3f5d8'][skin % 4], 80, 160); scene(); R.post();
    return (_pcache[key] = _pcv.toDataURL('image/png'));
  }
  var _portraits = null;
  function portraits(hexes, size) {
    if (window.PORTART && window.PORTART.length >= 4) return window.PORTART.slice(0, 4);
    if (_portraits) return _portraits; size = size || 220;
    var cv = document.createElement('canvas'); cv.width = size; cv.height = size;
    var R = new G.Renderer(cv); R.resize(size, size); var out = [], bgs = ['#ffd0de', '#cfe7ff', '#fff0b8', '#d3f5d8'];
    var pb = new G.Builder(); pb.jit = 0; pb.cyl(0.01, 0.01, 0.01, 4, '#fff'); var dummy = R.mesh(pb);
    var Ld = R.light, lvp = M4.mul(M4.ortho(-3, 3, -3, 3, 1, 40), M4.look([Ld[0] * 12, 1.2 + Ld[1] * 12, Ld[2] * 12], [0, 1.2, 0], [0, 1, 0]));
    var eye = [0.1, 1.9, 4.5], vp = M4.mul(M4.persp(30 * Math.PI / 180, 1, 0.5, 40), M4.look(eye, [-0.05, 1.65, 0], [0, 1, 0]));
    for (var k = 0; k < 4; k++) {
      (function (k) {
        var P = getChar(R, k, hexes[k] || CANDY_COL[k]), m = M4.mul(M4.translate(0, 0.1, 0), M4.mul(M4.rotY(-0.62), M4.mul(M4.rotX(0.06), M4.scale(1.5, 1.5, 1.5))));
        var scene = function () { drawCandy(R, P, m, 0.4, false, 0.3, [1.12, 1.1, 1.1]); };
        R.shadowBegin(lvp); scene(); R.sceneBegin(vp, eye, bgs[k], 80, 160); scene(); R.post();
        out.push(cv.toDataURL('image/png'));
      })(k);
    }
    _portraits = out; return out;
  }

  /* ---------- ห้องรอ 3D: แท่นลอยฟ้า ตัวละครลูกอมเดินเล่นได้ ---------- */
  function LobbyView(canvas) {
    this.cv = canvas; var R = this.R = new G.Renderer(canvas), rnd = rng(11), i;
    var pb = new G.Builder(); pb.jit = 0.02;
    pb.push().tr(0, -0.5, 0); pb.cyl(7.4, 7.9, 0.5, 40, { t: '#fff1f6', b: '#ffb3cf', s: '#ffc4da', sf: function (k) { return k % 2 ? '#ffc4da' : '#ffd8e6'; } }); pb.pop();
    pb.push().tr(0, -0.02, 0); pb.cyl(7.0, 7.2, 0.14, 40, { t: '#ffe9f1', b: '#ffb3cf', s: '#ff9ec0' }); pb.pop();
    for (i = 0; i < 40; i++) { var a = i / 40 * Math.PI * 2; pb.push().tr(Math.cos(a) * 7.55, -0.5, Math.sin(a) * 7.55).sc(1, 0.8, 1); pb.sphere(0.45, 6, 4, i % 2 ? '#ffffff' : '#ffd0e2'); pb.pop(); }
    var cols = ['#ff5a63', '#6f7dff', '#c4ec4b', '#ffd24a', '#ff9ec0'];
    for (i = 0; i < 46; i++) { var sa = rnd() * 6.283, sr = 1 + Math.sqrt(rnd()) * 5.7; pb.push().tr(Math.cos(sa) * sr, 0.1, Math.sin(sa) * sr).ry(rnd() * 6.28); pb.box(0.34, 0.07, 0.12, cols[i % 5]); pb.pop(); }
    this.plate = R.mesh(pb);
    this.sky = R.mesh(buildSky());
    this.clouds = [1, 2, 3, 4, 5, 6].map(function (s) { return R.mesh(buildCloud(s)); });
    
    var Lc = [0, 0, 0], Ld = R.light; this.lvp = M4.mul(M4.ortho(-11, 11, -11, 11, 1, 70), M4.look([Ld[0] * 25, Ld[1] * 25, Ld[2] * 25], Lc, [0, 1, 0]));
    this.eye = [0, 13.5, 16.5];
  }
  LobbyView.prototype.draw = function (list, now) {
    var cw = this.cv.clientWidth, ch = this.cv.clientHeight; if (!cw || !ch) return [];
    var R = this.R, self = this, tt = (now || 0) / 1000, gh = 300, gw = Math.max(160, Math.min(960, Math.round(gh * cw / ch)));
    R.resize(gw, gh);
    this.vp = M4.mul(M4.persp(38 * Math.PI / 180, cw / ch, 0.5, 400), M4.look(this.eye, [0, 0.2, 0.8], [0, 1, 0]));
    var scene = function () {
      R.draw(self.sky, M4.translate(self.eye[0], self.eye[1], self.eye[2]), { unlit: true, noFog: true, double: true, noCast: true, grain: 0 });
      self.clouds.forEach(function (m, k) { var a = k / 6 * 6.283 + tt * 0.02; R.draw(m, M4.translate(Math.cos(a) * 60, -12 - (k % 3) * 3, Math.sin(a) * 60), { noCast: true, tint: [1.08, 1.08, 1.1], grain: 0.05 }); });
      R.draw(self.plate, null, null);
      list.forEach(function (p) {
        var hop = p.mv ? Math.abs(Math.sin(p.walk * 1.7)) * 0.05 : 0;
        var base = M4.mul(M4.translate(p.x, hop, p.z), M4.mul(M4.rotY(p.h), M4.scale(CH * 1.15, CH * 1.15, CH * 1.15)));
        drawCandy(R, getChar(R, p.skin || 0, p.col || CANDY_COL[p.slot % 4]), base, tt, p.mv, p.slot * 1.7, [1.12, 1.1, 1.1]);
      });
    };
    R.shadowBegin(this.lvp); scene(); R.sceneBegin(this.vp, this.eye, HORIZON, 60, 200); scene(); R.post();
    return list.map(function (p) {
      var q = [p.x, 1.75 * CH * 1.15 + 0.3, p.z], m = self.vp, w = m[3] * q[0] + m[7] * q[1] + m[11] * q[2] + m[15], v = M4.pt(m, q); return { slot: p.slot, x: (v[0] / w * 0.5 + 0.5) * cw, y: (0.5 - v[1] / w * 0.5) * ch };
    });
  };


  /* ---------- ฉากมินิเกม 3D (เต็มจอ) ---------- */
  function hexRGB(h, k) { var n = parseInt(h.replace('#', ''), 16); return [((n >> 16) & 255) / 255 * (k || 1) + 0.15, ((n >> 8) & 255) / 255 * (k || 1) + 0.15, (n & 255) / 255 * (k || 1) + 0.15]; }
  function MgView(canvas) {
    var self_tiles0, self_tiles1;
    this.cv = canvas; var R = this.R = new G.Renderer(canvas), rnd = rng(23), i, b;
    this.sky = R.mesh(buildSky());
    this.clouds = [1, 2, 3, 4, 5, 6].map(function (s) { return R.mesh(buildCloud(s)); });
    
    b = new G.Builder(); b.jit = 0.015; b.push().tr(0, -0.7, 0); b.cyl(1, 1.04, 0.7, 36, { t: '#ff8fb8', b: '#c98a5a', s: '#f0c27a', sf: function (k) { return k % 2 ? '#f0c27a' : '#e8b568'; } }); b.pop();
    b.push().tr(0, -0.02, 0); b.cyl(0.985, 1.0, 0.12, 36, { t: '#ffa6c6', b: '#ff8fb8', s: '#ff8fb8' }); b.pop();
    this.plate = R.mesh(b);
    b = new G.Builder(); b.sphere(0.42, 7, 5, '#ffd0e2'); this.pipe = R.mesh(b);
    b = new G.Builder(); b.box(0.28, 0.08, 0.08, '#ff5a63'); this.spr = R.mesh(b);
    b = new G.Builder(); b.sphere(0.2, 5, 4, '#ffffff'); this.puff = R.mesh(b);
    b = new G.Builder(); b.jit = 0.01; b.push().tr(0, -0.9, 0); b.box(29.6, 0.9, 15.6, { t: '#ffd9a0', b: '#c98a5a', s: '#f0c27a' }); b.pop(); b.push().tr(0, -0.02, 0); b.box(29.2, 0.1, 15.2, '#ff9ec4'); b.pop();
    [[0, 7.7, 29.6, 0.5], [0, -7.7, 29.6, 0.5], [14.7, 0, 0.5, 15.6], [-14.7, 0, 0.5, 15.6]].forEach(function (r) { b.push().tr(r[0], 0, r[1]); b.box(r[2], 0.3, r[3], '#fff0f6'); b.pop(); });
    this.tray = R.mesh(b);
    b = new G.Builder(); b.push().rx(Math.PI / 2); b.cyl(0.55, 0.55, 0.14, 12, { t: '#c9743a', b: '#c9743a', s: '#8a4a22' }); b.pop(); b.push().tr(0, 0.08, 0).rx(Math.PI / 2); b.cyl(0.38, 0.38, 0.14, 12, { t: '#e09a62', b: '#e09a62', s: '#e09a62' }); b.pop(); b.push().tr(0, 0.16, 0).rx(Math.PI / 2); b.cyl(0.12, 0.12, 0.1, 6, { t: '#8a4a22', b: '#8a4a22', s: '#8a4a22' }); b.pop(); this.coinC = R.mesh(b);
    b = new G.Builder(); b.push().rx(Math.PI / 2); b.cyl(0.55, 0.55, 0.14, 12, { t: '#d6dbe6', b: '#d6dbe6', s: '#8f98ad' }); b.pop(); b.push().tr(0, 0.08, 0).rx(Math.PI / 2); b.cyl(0.38, 0.38, 0.14, 12, { t: '#f2f5fb', b: '#f2f5fb', s: '#f2f5fb' }); b.pop(); b.push().tr(0, 0.16, 0).rx(Math.PI / 2); b.cyl(0.12, 0.12, 0.1, 6, { t: '#8f98ad', b: '#8f98ad', s: '#8f98ad' }); b.pop(); this.coinS = R.mesh(b);
    b = new G.Builder(); b.push().rx(Math.PI / 2); b.cyl(0.55, 0.55, 0.14, 12, { t: '#ffd43b', b: '#ffd43b', s: '#c99400' }); b.pop(); b.push().tr(0, 0.08, 0).rx(Math.PI / 2); b.cyl(0.38, 0.38, 0.14, 12, { t: '#fff0a0', b: '#fff0a0', s: '#fff0a0' }); b.pop(); b.push().tr(0, 0.16, 0).rx(Math.PI / 2); b.cyl(0.12, 0.12, 0.1, 6, { t: '#c99400', b: '#c99400', s: '#c99400' }); b.pop(); this.coinG = R.mesh(b);
    b = new G.Builder(); b.sphere(0.2, 5, 4, '#ffe066'); this.spark = R.mesh(b);
    b = new G.Builder(); b.push().tr(0, 0.1, 0); b.cyl(1, 1, 0.06, 28, { t: '#ffe066', b: '#d9a400', s: '#d9a400' }); b.pop(); b.push().tr(0, 0.14, 0); b.cyl(0.86, 0.86, 0.04, 28, { t: '#fff6c8', b: '#fff6c8', s: '#fff6c8' }); b.pop(); this.zone = R.mesh(b);
    ['#ffb8d2', '#ff9ec0'].forEach(function (c, k) { var q = new G.Builder(); q.jit = 0.01; q.push().tr(0, -1.3, 0); q.box(2.9, 1.3, 2.55, { t: c, b: '#c98a5a', s: '#f0c27a' }); q.pop(); q.push().tr(0, -0.02, 0); q.box(2.9, 0.1, 2.55, { t: c, b: c, s: '#fff6fa' }); q.pop(); if (k === 0) self_tiles0 = R.mesh(q); else self_tiles1 = R.mesh(q); });
    this.tiles = [self_tiles0, self_tiles1];
    b = new G.Builder(); b.jit = 0.01; b.push(); b.cyl(0.55, 0.62, 0.5, 12, { t: '#f0c27a', b: '#c98a5a', s: '#e8b568' }); b.pop(); this.stool = R.mesh(b);
    b = new G.Builder(); b.push().tr(0, 0.5, 0); b.cyl(0.78, 0.78, 0.22, 14, { t: '#ffffff', b: '#ffffff', s: '#fff6fa' }); b.pop(); b.push().tr(0, 0.72, 0); b.sphere(0.08, 4, 3, '#ff5a63'); b.pop(); this.cush = R.mesh(b);
    b = new G.Builder(); b.jit = 0.004; b.box(1, 1, 1, '#5b3020');
    b.push().tr(0, 0.12, 0); b.box(1.05, 0.76, 0.7, '#7c4428'); b.pop(); b.push().tr(0, 0.12, 0); b.box(0.7, 0.76, 1.05, '#7c4428'); b.pop(); b.push().tr(0, 0.94, 0); b.box(0.74, 0.1, 0.74, '#a3623c'); b.pop(); this.wallB = R.mesh(b);
    this.lane = ['#ffeaf2', '#ffd9c2'].map(function (c) { var q = new G.Builder(); q.box(24.6, 0.05, 2.8, c); return R.mesh(q); });
    b = new G.Builder(); for (i = 0; i < 14; i++) for (var cc2 = 0; cc2 < 2; cc2++) { b.push().tr(cc2 * 0.5, 0.06, (i - 6.5) * 1.05); b.box(0.5, 0.04, 1.05, (i + cc2) % 2 ? '#ffffff' : '#3a2a30'); b.pop(); } this.fin = R.mesh(b);
    b = new G.Builder(); b.push(); b.cyl(0.18, 0.22, 3.2, 8, { t: '#c98a5a', b: '#c98a5a', s: '#c98a5a' }); b.pop(); this.pole = R.mesh(b);
    b = new G.Builder(); b.sphere(1, 9, 7, '#ffffff'); this.bulb = R.mesh(b);
    b = new G.Builder(); b.push(); b.cyl(0.5, 0.5, 0.02, 10, '#b04a74'); b.pop(); this.shd = R.mesh(b);
    b = new G.Builder(); b.jit = 0.01; b.push(); b.cyl(1, 0.85, 0.9, 12, { t: '#f0c27a', b: '#c98a5a', s: '#e8b568' }); b.pop(); b.push().tr(0, 0.85, 0); b.sphere(0.95, 9, 6, '#ff7aa8'); b.pop(); b.push().tr(0, 1.7, 0); b.sphere(0.2, 5, 4, '#ff3d4e'); b.pop(); this.ob = R.mesh(b); this.obT = [];
    for (var tn = 1; tn <= 4; tn++) { b = new G.Builder(); b.jit = 0.01; b.cyl(0.78, 0.92, 0.5, 12, { t: '#ff9ec0', b: '#e2709a', s: '#ffb3cc' }); var y0 = 0.5; for (var ti = 0; ti < tn; ti++) { var sh = ti ? 0.9 : 0.55; b.push().tr(0, y0, 0); b.cyl(0.95, 0.95, sh, 12, { t: '#f0c27a', b: '#c98a5a', s: '#e8b568' }); b.pop(); y0 += sh; var fh = ti ? 0.8 : 0.65; b.push().tr(0, y0 - 0.05, 0); b.cyl(1.02, 0.78, fh, 12, ti % 2 ? '#ff7aa8' : '#ffd1e3'); b.pop(); y0 += fh - 0.05; } b.push().tr(0, y0 + 0.12, 0); b.sphere(0.24, 6, 4, '#ff3d4e'); b.pop(); this.obT[tn] = R.mesh(b); }
    this.crk = [0.3, 0.62, 1].map(function (frac) { var bb = new G.Builder(); (function () { var sd = 7, rr = function () { sd = (sd * 16807) % 2147483647; return sd / 2147483647; }, PX = 0.17;
      var px = function (x, z, big) { bb.push().tr(x, 0.2, z); bb.box(PX + (big ? 0.07 : 0.05), 0.02, PX + (big ? 0.07 : 0.05), '#fff1cf'); bb.pop(); bb.push().tr(x, 0.23, z); bb.box(PX, 0.03, PX, '#1d0b04'); bb.pop(); };
      px(0, 0, 1); for (var br = 0; br < 6; br++) { var dx = [1, 1, 0, -1, -1, 0][br] || 0, dz = [0, 1, 1, 1, 0, -1][br], x = 0, z = 0, len = Math.floor((5 + rr() * 5) * frac); for (var k = 0; k < len; k++) { if (rr() < 0.45) { if (dx && dz) { if (rr() < 0.5) dx = 0; else dz = 0; } else if (dx) dz = rr() < 0.5 ? 1 : -1; else dx = rr() < 0.5 ? 1 : -1; if (!dx && !dz) dx = 1; } x += dx * PX * 1.0; z += dz * PX * 1.0; px(x, z, 0); if (k === 3 && frac > 0.5) { var bx2 = x, bz2 = z, ex = -dz || 1, ez = dx; for (var q = 0; q < 3 * frac; q++) { bx2 += ex * PX; bz2 += ez * PX; px(bx2, bz2, 0); } } } }
    })(); return R.mesh(bb); }); this.crack = this.crk[2];
    this.sp = []; var cols = ['#ff5a63', '#6f7dff', '#c4ec4b', '#ffd24a', '#7fd8ff'];
    for (i = 0; i < 46; i++) { var sa = rnd() * 6.283, sr = Math.sqrt(rnd()) * 0.92; this.sp.push([Math.cos(sa) * sr, Math.sin(sa) * sr, rnd() * 6.28, cols[i % 5]]); }
    this.sprs = cols.map(function (c) { var q = new G.Builder(); q.box(0.28, 0.08, 0.08, c); return R.mesh(q); });
    this.st = {};   // สถานะตัวละครต่อช่อง: ตำแหน่งเรียบ/ทิศ/การตก
    this.parts = []; this.lastNow = 0;
    var Lc = [0, 0, 0], Ld = R.light; this.lvp = M4.mul(M4.ortho(-10, 10, -10, 10, 1, 70), M4.look([Ld[0] * 25, Ld[1] * 25, Ld[2] * 25], Lc, [0, 1, 0]));
  }
  MgView.prototype.reset = function () { this.st = {}; this.parts = []; this.lastNow = 0; this.coinT = {}; this.prevC = {}; this.lastIt = undefined; this.tileT = {}; this.cp = null; this.so4 = null; this.dgSeen = {}; this.crSw = null; this.cs = null; this.yaw = undefined; this.chPh = ''; this.chT = 0; this.bst = {}; this.so = null; this.so2 = null; this.camP = null; this.spSeen = {}; this.tagB = 0; this.crPh = ''; this.bRd = 0; this.bBoomT = 0; };
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  // ธีมของแต่ละด่าน: สีถาด + ของตกแต่งมุม
  var THEMES = {
    wall: { top: '#58a8e8', layers: ['#7a4a2e', '#5a331f', '#7a4a2e'], rim: '#ffffff', deco: 'lolly', dc: '#ff7aa8' },
    redlight: { top: '#5ccf7a', layers: ['#ffffff', '#ff8fb8', '#ffffff'], rim: '#ffffff', deco: 'cup', dc: '#ff7aa8' },
    coinrush: { top: '#2fb4c8', layers: ['#fff5e0', '#d9a066', '#fff5e0'], rim: '#fff5e0', deco: 'cone', dc: '#ffb84a' },
    tag: { top: '#38cf9a', layers: ['#7a4326', '#c98a5a', '#7a4326'], rim: '#ffffff', deco: 'cup', dc: '#ffb8d2' },
    hill: { top: '#ffb3cf', layers: ['#ff7aa8', '#fff0f6', '#ff7aa8'], rim: '#ffffff', deco: 'cherry', dc: '#ff3d4e' },
    chairs: { top: '#f09a52', layers: ['#f2c27a', '#d99a52', '#f2c27a'], rim: '#ffe066', deco: 'butter', dc: '#ffe066' },
    catcher: { top: '#ff9ec4', layers: ['#fff0f6', '#ffb8d2', '#fff0f6'], rim: '#ffffff', deco: 'cone', dc: '#ffb84a' },
    cream: { top: '#bfe6ff', layers: ['#ffffff', '#7fc8f8', '#ffffff'], rim: '#ffffff', deco: 'cherry', dc: '#ff3d4e' },
    dodge: { top: '#ffe3a8', layers: ['#fff5e0', '#f0c27a', '#fff5e0'], rim: '#ffffff', deco: 'cup', dc: '#ff7aa8' },
    basket: { top: '#9ae6a8', layers: ['#ffffff', '#69db7c', '#ffffff'], rim: '#ffffff', deco: 'lolly', dc: '#ff7aa8' },
    runner: { top: '#ffd0a8', layers: ['#7a4326', '#c98a5a', '#7a4326'], rim: '#ffffff', deco: 'cone', dc: '#ffb84a' },
    mole: { top: '#8a5a38', layers: ['#4a2f1f', '#7a4326', '#4a2f1f'], rim: '#c98a5a', deco: 'cup', dc: '#ff7aa8' },
    balance: { top: '#bfe6ff', layers: ['#ffffff', '#7fc8f8', '#ffffff'], rim: '#ffffff', deco: 'cherry', dc: '#ff3d4e' },
    stack: { top: '#e8d4f0', layers: ['#ffffff', '#c9a6e8', '#ffffff'], rim: '#ffffff', deco: 'cherry', dc: '#ff3d4e' },
    bomb: { top: '#8a62d8', layers: ['#4a3278', '#b78cff', '#4a3278'], rim: '#ffe066', deco: 'candle', dc: '#ff9a3d' },
    sumo: { top: '#ff8fb8', layers: ['#fff0f6', '#ff8fb8', '#fff0f6'], rim: '#ffffff', deco: 'candle', dc: '#ffe066' },
    floor: { top: '#ffb8d2', layers: ['#7a4326', '#c98a5a', '#7a4326'], rim: '#ffffff', deco: 'lolly', dc: '#69db7c' }
  };
  var PUSHG = { wall: 1, floor: 1, hill: 1 }, DASHG = { tag: 1, chairs: 1, sumo: 1, coinrush: 1 };
  MgView.prototype.themeMesh = function (game) {
    var th = THEMES[game] || THEMES.wall; this.tm = this.tm || {};
    if (this.tm[game]) return this.tm[game];
    var R = this.R, b = new G.Builder(), o = {}, i, k;
    b.jit = 0.01;
    for (i = 0; i < 3; i++) { b.push().tr(0, -0.57 - i * 0.55, 0); b.box(29.6 - i * 0.5, 0.55, 15.6 - i * 0.5, th.layers[i]); b.pop(); }
    b.push().tr(0, -0.02, 0); b.box(29.2, 0.1, 15.2, th.top); b.pop();
    for (k = (game === 'wall' ? -13.5 : -14.4); k <= 14.4; k += 0.95) { [-7.4, 7.4].forEach(function (z) { b.push().tr(k, 0.08, z); b.sphere(0.34, 6, 5, th.rim); b.pop(); }); }
    for (k = -7.0; k <= 7.0; k += 0.95) { [-14.4, 14.4].forEach(function (x) { if (game === 'wall' && x < 0) return; b.push().tr(x, 0.08, k); b.sphere(0.34, 6, 5, th.rim); b.pop(); }); }
    o.tray = R.mesh(b);
    b = new G.Builder(); b.jit = 0.01;
    if (th.deco === 'lolly') { b.push(); b.cyl(0.12, 0.12, 2.2, 6, '#ffffff'); b.pop(); b.push().tr(0, 2.2, 0); b.sphere(0.8, 8, 6, th.dc); b.pop(); b.push().tr(0, 2.2, 0); b.sphere(0.5, 6, 5, '#ffffff'); b.pop(); }
    else if (th.deco === 'cup') { b.push(); b.cyl(0.6, 0.45, 0.9, 10, { t: '#f0c27a', b: '#c98a5a', s: '#e8b568' }); b.pop(); b.push().tr(0, 0.9, 0); b.sphere(0.7, 8, 6, th.dc); b.pop(); b.push().tr(0, 1.6, 0); b.sphere(0.22, 5, 4, '#ff3d4e'); b.pop(); }
    else if (th.deco === 'cone') { b.push(); b.cyl(0.55, 0.06, 1.5, 8, { t: '#e0a860', b: '#c98a5a', s: '#e0a860' }); b.pop(); b.push().tr(0, 1.7, 0); b.sphere(0.8, 8, 6, th.dc); b.pop(); b.push().tr(0, 2.5, 0); b.sphere(0.2, 5, 4, '#ff3d4e'); b.pop(); }
    else if (th.deco === 'cherry') { b.push(); b.cyl(0.05, 0.05, 1.2, 5, '#3a8a3a'); b.pop(); b.push().tr(0, 0.5, 0); b.sphere(0.65, 8, 6, th.dc); b.pop(); b.push().tr(0.3, 1.2, 0); b.box(0.7, 0.12, 0.3, '#3a8a3a'); b.pop(); }
    else if (th.deco === 'butter') { b.push(); b.box(1.3, 0.7, 1.3, th.dc); b.pop(); b.push().tr(0, 0.7, 0); b.box(1.0, 0.1, 1.0, '#fff7b0'); b.pop(); }
    else { b.push(); b.cyl(0.14, 0.14, 1.6, 6, th.dc); b.pop(); b.push().tr(0, 1.6, 0); b.sphere(0.2, 5, 4, '#ff9a1a'); b.pop(); }
    o.deco = R.mesh(b);
    return (this.tm[game] = o);
  };
  // ปั๊มระเบิด: ฉากโต๊ะกลมกับระเบิดลูกใหญ่กลางวง ผู้เล่นล้อมรอบ
  MgView.prototype.drawBomb = function (snap, env, now, asp) {
    var cw = this.cv.clientWidth, ch = this.cv.clientHeight; if (!cw || !ch) return [];
    var R = this.R, self = this, tt = now / 1000, dt = Math.min(0.1, this.lastNow ? (now - this.lastNow) / 1000 : 0.016); this.lastNow = now;
    var gh = Math.max(240, Math.min(720, ch)), gw = Math.max(160, Math.min(1800, Math.round(gh * cw / ch))); R.resize(gw, gh);
    var th = THEMES.bomb, theme = this.themeMesh('bomb'), Rw = 8.2, n = snap ? snap.P.length : 0, bst = this.bst = this.bst || {};
    if (!this.bombM) {
      var b = new G.Builder(); b.jit = 0.01; b.sphere(1, 12, 9, '#9a9aa8'); b.push().tr(-0.35, 0.45, 0.62); b.sphere(0.3, 6, 5, '#e6e6f4'); b.pop();
      b.push().tr(0, 1.0, 0); b.cyl(0.26, 0.3, 0.3, 8, '#8c8c9e'); b.pop(); b.push().tr(0, 1.35, 0); b.cyl(0.07, 0.07, 0.5, 5, '#c98a5a'); b.pop();
      this.bombM = R.mesh(b);
      b = new G.Builder(); b.sphere(0.45, 6, 5, '#ff7a1a'); this.flame = R.mesh(b);
    }
    var tags = [], list = [];
    if (snap) {
      if (snap.rd !== this.bRd) { this.bRd = snap.rd; this.bBoomT = 0; this.bSz = 0; }
      this.bSz = (this.bSz || 0) + ((snap.size || 0) - (this.bSz || 0)) * Math.min(1, dt * 2.2);
      if (snap.boom !== -1 && !this.bBoomT) {
        this.bBoomT = tt;
        for (var q = 0; q < 34; q++) { var a1 = q / 34 * 6.283 + (q % 3) * 0.4, sp1 = 3 + (q % 5) * 1.1; this.parts.push({ x: 0, y: 1.6, z: 0, vx: Math.cos(a1) * sp1, vz: Math.sin(a1) * sp1, vy: 3 + (q % 4) * 1.2, t0: tt, sp: q % 2, life: 1.1, sc: 3 + (q % 3) }); }
      }
      if (snap.boom === -1) this.bBoomT = 0;
      var meIdx = Math.max(0, snap.P.map(function (p) { return p[0]; }).indexOf(env.me));
      snap.P.forEach(function (p, k) {
        var o = bst[p[0]] || (bst[p[0]] = { prev: 0, t: -9 });
        if (p[1] && !o.prev) { o.t = tt; for (var q = 0; q < 5; q++) { var qa = Math.random() * 6.283; self.parts.push({ x: 0, y: 0.4, z: 0, vx: Math.cos(qa) * 2, vz: Math.sin(qa) * 2, vy: 1.4, t0: tt }); } }
        o.prev = p[1];
        var kk = (k - meIdx + n) % n, ang = Math.PI / 2 + kk / Math.max(1, n) * 6.2832, rr = 5.2;
        list.push({ slot: p[0], x: Math.cos(ang) * rr, z: Math.sin(ang) * rr, o: o });
      });
    }
    var size = this.bSz || 0, boomed = snap && snap.boom !== -1, eye = [0, 10.5, 12.5], look = [0, 1.0, 0.4], cp = M4.persp(52 * Math.PI / 180, cw / ch, 0.5, 400);
    this.camF = null;
    var vp = M4.mul(cp, M4.look(eye, look, [0, 1, 0])), lvp = this.lvp;
    var scene = function () {
      R.draw(self.sky, M4.translate(eye[0], eye[1], eye[2]), { unlit: true, noFog: true, double: true, noCast: true, grain: 0 });
      self.clouds.forEach(function (m, k) { var a = k / 6 * 6.283 + tt * 0.02; R.draw(m, M4.translate(eye[0] + Math.cos(a) * 60, -12 - (k % 3) * 3, eye[2] + Math.sin(a) * 60), { noCast: true, noFog: true, grain: 0 }); });
      R.draw(self.plateT('bomb'), M4.scale(Rw, 1, Rw), null);
      var pn = Math.round(Rw * 6.2);
      for (var i = 0; i < pn; i++) { var a = i / pn * 6.2832; R.draw(self.pipe, M4.mul(M4.translate(Math.cos(a) * Rw * 0.985, 0.05, Math.sin(a) * Rw * 0.985), M4.scale(1, 0.75, 1)), { noCast: true }); }
      self.sp.forEach(function (q, k) { R.draw(self.sprs[k % 5], M4.mul(M4.translate(q[0] * Rw, 0.12, q[1] * Rw), M4.rotY(q[2])), { noCast: true }); });
      if (snap && !boomed) {
        var last = 0; list.forEach(function (L) { last = Math.max(last, 1 - Math.min(1, (tt - L.o.t) / 0.25)); });
        var sc = 1.1 + size * 1.1 + last * 0.18, sh = size > 0.6 ? Math.sin(tt * 40) * 0.05 * (size - 0.6) * 2.5 : 0, rr0 = Math.pow(size, 1.25), tint = [0.38 + rr0 * 1.9, 0.38 - rr0 * 0.1, 0.44 - rr0 * 0.15];
        var bm = M4.mul(M4.translate(sh, 0.02 + sc, 0), M4.scale(sc * (1 + last * 0.06), sc * (1 - last * 0.08), sc));
        R.draw(self.bombM, bm, { tint: tint });
        var fy = 0.02 + sc + sc * 1.55, fl = 0.7 + 0.4 * Math.sin(tt * 25);
        R.draw(self.flame, M4.mul(M4.translate(sh, fy, 0), M4.scale(fl, fl, fl)), { noCast: true, unlit: true, grain: 0, tint: [1.6, 1.1, 0.5] });
        R.draw(self.spark, M4.mul(M4.translate(sh + Math.cos(tt * 9) * 0.4, fy + 0.5 + Math.abs(Math.sin(tt * 7)) * 0.4, Math.sin(tt * 9) * 0.4), M4.scale(1.6, 1.6, 1.6)), { noCast: true, unlit: true, grain: 0 });
      }
      if (snap && snap.cur >= 0) list.forEach(function (L) { if (L.slot === snap.cur) R.draw(self.zone, M4.mul(M4.translate(L.x, 0.03, L.z), M4.scale(1.9, 1, 1.9)), { noCast: true, tint: [1.4 + Math.sin(tt * 8) * 0.2, 1.2, 0.5] }); });
      list.forEach(function (L, k) {
        var o = L.o, u = Math.min(1, (tt - o.t) / 0.28), hop = u < 1 ? Math.sin(u * Math.PI) * 0.9 : 0, y = 0.1 + hop + (snap && snap.cur === L.slot ? 0.12 + Math.sin(tt * 8) * 0.1 : 0), rz = 0, rx = 0, sq = 1, pv = 0;
        var lose = boomed && snap.boom === L.slot, since = tt - (self.bBoomT || tt);
        if (boomed) {
          if (lose) { y = 0.1 + Math.max(0, 2.4 * since - 6 * since * since) * 1.0; rz = Math.min(1.6, since * 4); pv = 1; }
          else if (snap.boom >= -1) { y = 0.1 + Math.abs(Math.sin(tt * 9 + k)) * 0.5; }
          else { rz = Math.sin(tt * 30) * 0.12; }
        }
        var hd = Math.atan2(-L.x, -L.z), base = M4.mul(M4.translate(L.x, y, L.z), M4.mul(M4.rotY(hd), M4.mul(M4.rotZ(rz), M4.scale(1.5, 1.5 * (1 - (u < 1 ? 0.1 * Math.sin(u * Math.PI) : 0)), 1.5))));
        drawCandy(R, getChar(R, (env.skins || [])[L.slot] || 0, (env.cols || [])[L.slot] || CANDY_COL[L.slot % 4]), base, tt, false, L.slot * 1.7, lose ? [1.7, 0.7, 0.7] : [1.12, 1.1, 1.1]);
      });
      self.parts.forEach(function (q) { var u = tt - q.t0, Lf = q.life || 0.45, s0 = (1 - u / Lf * 0.75) * (q.sc || 1); R.draw(q.sp ? self.spark : self.puff, M4.mul(M4.translate(q.x + q.vx * u, q.y + q.vy * u - 6 * u * u, q.z + q.vz * u), M4.scale(s0, s0, s0)), { noCast: true, unlit: true, grain: 0 }); });
    };
    this.parts = this.parts.filter(function (q) { return tt - q.t0 < (q.life || 0.45); });
    R.shadowBegin(lvp); scene(); R.sceneBegin(vp, eye, HORIZON, 60, 200); scene(); R.post();
    list.forEach(function (L) {
      var q = [L.x, 3.4, L.z], m = vp, w = m[3] * q[0] + m[7] * q[1] + m[11] * q[2] + m[15]; if (w <= 0.1) return; var v = M4.pt(m, q);
      tags.push({ slot: L.slot, x: v[0] / w * 0.5 + 0.5, y: 0.5 - v[1] / w * 0.5, ready: false });
    });
    return tags;
  };
  MgView.prototype._rowInit = function () {
    if (this.cdK) return; var R = this.R;
      var b, K0 = [], bb2;
      bb2 = new G.Builder(); bb2.jit = 0.01; bb2.sphere(0.5, 9, 7, '#ff6f9c'); bb2.push().tr(0, 0.05, 0.42); bb2.sphere(0.16, 5, 4, '#ffffff'); bb2.pop(); bb2.push().tr(-0.25, 0.25, 0.35); bb2.sphere(0.1, 4, 3, '#ffd43b'); bb2.pop(); bb2.push().tr(0.22, -0.22, 0.38); bb2.sphere(0.1, 4, 3, '#4dabf7'); bb2.pop();
      [1, -1].forEach(function (sg) { bb2.push().tr(sg * 0.42, 0, 0).rz(-sg * Math.PI / 2); bb2.cyl(0.42, 0.12, 0.5, 8, { t: '#ffffff', b: '#ffffff', s: '#ffffff', sf: function (i) { return i % 2 ? '#ffffff' : '#ffb3cc'; } }); bb2.pop(); });
      K0.push(R.mesh(bb2));
      bb2 = new G.Builder(); bb2.jit = 0.01; bb2.push().tr(0, -1.5, 0); bb2.cyl(0.06, 0.06, 1.1, 5, '#ffffff'); bb2.pop(); bb2.push().tr(0, 0, -0.06).rx(Math.PI / 2); bb2.cyl(0.62, 0.62, 0.12, 14, '#ff5d73'); bb2.pop(); bb2.push().tr(0, 0, 0.04).rx(Math.PI / 2); bb2.cyl(0.48, 0.48, 0.1, 14, '#ffffff'); bb2.pop(); bb2.push().tr(0, 0, 0.1).rx(Math.PI / 2); bb2.cyl(0.34, 0.34, 0.08, 12, '#ffd43b'); bb2.pop(); bb2.push().tr(0, 0, 0.15).rx(Math.PI / 2); bb2.cyl(0.18, 0.18, 0.08, 10, '#4dabf7'); bb2.pop();
      K0.push(R.mesh(bb2));
      bb2 = new G.Builder(); bb2.jit = 0.01; for (var di = 0; di < 12; di++) { var da = di / 12 * 6.283; bb2.push().tr(Math.cos(da) * 0.5, Math.sin(da) * 0.5, 0); bb2.sphere(0.2, 5, 4, '#e8b568'); bb2.pop(); bb2.push().tr(Math.cos(da) * 0.5, Math.sin(da) * 0.5, 0.1); bb2.sphere(0.17, 5, 4, '#ff8fb8'); bb2.pop(); if (di % 2) { bb2.push().tr(Math.cos(da) * 0.5, Math.sin(da) * 0.5, 0.27); bb2.box(0.14, 0.05, 0.05, ['#ffffff', '#ffd43b', '#4dabf7'][di % 3]); bb2.pop(); } }
      K0.push(R.mesh(bb2));
      bb2 = new G.Builder(); bb2.jit = 0.01; bb2.push().tr(0, -0.3, 0); bb2.cyl(0.55, 0.6, 0.25, 10, '#4cc66a'); bb2.pop(); bb2.push().tr(0, -0.05, 0); bb2.sphere(0.52, 9, 6, '#69db7c'); bb2.pop(); for (var gi = 0; gi < 9; gi++) { var ga = gi / 9 * 6.283; bb2.push().tr(Math.cos(ga) * 0.42, 0.05 + (gi % 3) * 0.12, Math.sin(ga) * 0.42); bb2.sphere(0.07, 4, 3, '#ffffff'); bb2.pop(); }
      K0.push(R.mesh(bb2));
      this.cdK = K0;
      b = new G.Builder(); b.jit = 0.01; b.sphere(0.62, 9, 7, '#ffc82a'); b.push().tr(0.1, 0.2, 0.5); b.sphere(0.2, 5, 4, '#fff3a0'); b.pop(); b.push().tr(-0.3, -0.2, 0.5); b.sphere(0.12, 5, 4, '#fff3a0'); b.pop();
      [1, -1].forEach(function (sg) { b.push().tr(sg * 0.5, 0, 0).rz(-sg * Math.PI / 2); b.cyl(0.52, 0.14, 0.62, 8, { t: '#fff3a0', b: '#fff3a0', s: '#fff3a0', sf: function (i) { return i % 2 ? '#fff3a0' : '#ffb61a'; } }); b.pop(); }); this.cdG = R.mesh(b);
      b = new G.Builder(); b.jit = 0.01; b.sphere(0.9, 9, 7, '#fff4f8'); b.push().tr(0, 0.75, 0); b.sphere(0.55, 7, 5, '#ffd6e6'); b.pop(); b.push().tr(0, 1.2, 0); b.sphere(0.22, 5, 4, '#ff3d4e'); b.pop(); this.crM = R.mesh(b);
      var bv = new G.Builder(); bv.jit = 0.01; bv.push(); bv.cyl(0.18, 0.24, 0.7, 6, '#9be08a'); bv.pop(); [[0, 1.0, 0, 0.5], [-0.38, 0.85, 0.05, 0.38], [0.38, 0.85, -0.05, 0.38], [0, 0.8, 0.32, 0.34], [0, 1.3, 0, 0.32]].forEach(function (c) { bv.push().tr(c[0], c[1], c[2]); bv.sphere(c[3], 6, 5, '#3fae4a'); bv.pop(); }); this.vegM = R.mesh(bv);
      var bd = new G.Builder(); bd.jit = 0.01; bd.sphere(0.5, 8, 6, '#fff4f8'); bd.push().tr(0, 0.45, 0); bd.sphere(0.32, 7, 5, '#ffd6e6'); bd.pop(); bd.push().tr(0, 0.75, 0); bd.sphere(0.14, 5, 4, '#ffffff'); bd.pop(); this.dropM = R.mesh(bd);
      var bk = new G.Builder(); bk.jit = 0.01; bk.push(); bk.cyl(1.25, 0.95, 0.9, 12, { t: '#e9a76b', b: '#c98a5a', s: '#d99a5c', sf: function (i) { return i % 2 ? '#d99a5c' : '#e9b57c'; } }); bk.pop(); bk.push().tr(0, 0.85, 0); bk.cyl(1.35, 1.25, 0.14, 12, '#fff0f6'); bk.pop(); this.basketM = R.mesh(bk);
  };
  // ฉากกลางสำหรับมินิเกมแถวเดียว (รับขนม / โยนครีม)
  MgView.prototype.drawRow = function (game, snap, env, now) {
    var cw = this.cv.clientWidth, ch = this.cv.clientHeight; if (!cw || !ch) return [];
    var R = this.R, self = this, tt = now / 1000, K = 0.06; this.lastNow = now;
    var gh = Math.max(240, Math.min(720, ch)), gw = Math.max(160, Math.min(1800, Math.round(gh * cw / ch))); R.resize(gw, gh);
    var theme = this.themeMesh(game), isC = game === 'catcher', st = this.st, list = [], tags = [], skins = env.skins || [], cols = env.cols || [];
    this._rowInit();
    var eye = isC ? [0, 9.5, 18] : [0, 15, 17.5], look = isC ? [0, 5.2, 0] : [0, 0, -3.4], fov = isC ? 66 : 56;
    this.camF = null;
    var vp = M4.mul(M4.persp(fov * Math.PI / 180, cw / ch, 0.5, 400), M4.look(eye, look, [0, 1, 0])), n = snap ? snap.P.length : 0;
    if (snap) {
      snap.P.forEach(function (p, k) {
        var o = st[p[0]] || (st[p[0]] = { x: (p[1] - 240) * K, hop: -9, ps: 0, h: 0 }), tx = (p[1] - 240) * K;
        o.x += (tx - o.x) * Math.min(1, 0.016 * 20);
        var sc0 = 0; snap.S.forEach(function (r) { if (r[0] === p[0]) sc0 = r[1]; });
        if (sc0 > o.ps) { o.hop = tt; if (isC) for (var q = 0; q < 6; q++) { var qa = q / 6 * 6.283; self.parts.push({ x: o.x, y: 2, z: 2, vx: Math.cos(qa) * 2.2, vz: Math.sin(qa) * 1, vy: 2.4, t0: tt, sp: 1 }); } }
        o.ps = sc0;
        if (isC) {
          var rdv = p[4]; if (o.rdy && !rdv && !p[5]) { o.dash = tt; for (var q4 = 0; q4 < 8; q4++) self.parts.push({ x: o.x - (o.dir || 1) * 0.6, y: 0.2, z: 2.2, vx: -(o.dir || 1) * (1 + q4 * 0.3), vz: (q4 % 3 - 1) * 0.8, vy: 1.2 + (q4 % 3) * 0.4, t0: tt }); }
          o.rdy = rdv; if (p[7]) o.dir = p[7] > 0 ? 1 : -1;
        }
        var z = isC ? 2.2 + (k - (n - 1) / 2) * 0.55 : (p[0] === snap.th ? -5.5 : 3.6);
        list.push({ slot: p[0], o: o, z: z, v: p });
      });
      if (!isC) {
        if (snap.ph === 'splash' && this.crPh !== 'splash') { var tx0 = (snap.tx - 240) * K; for (var q2 = 0; q2 < 16; q2++) { var qb = q2 / 16 * 6.283; this.parts.push({ x: tx0, y: 0.4, z: 3.6, vx: Math.cos(qb) * 3, vz: Math.sin(qb) * 3, vy: 2.5 + (q2 % 3), t0: tt, life: 0.8, sc: 2 }); } }
        this.crPh = snap.ph;
      }
    }
    this.parts = this.parts.filter(function (q) { return tt - q.t0 < (q.life || 0.45); });
    var scene = function () {
      R.draw(self.sky, M4.translate(eye[0], eye[1], eye[2]), { unlit: true, noFog: true, double: true, noCast: true, grain: 0 });
      self.clouds.forEach(function (m, k) { var a = k / 6 * 6.283 + tt * 0.02; R.draw(m, M4.translate(eye[0] + Math.cos(a) * 60, -12 - (k % 3) * 3, eye[2] + Math.sin(a) * 60), { noCast: true, noFog: true, grain: 0 }); });
      R.draw(theme.tray, null, null);
      self.sp.forEach(function (q, k) { R.draw(self.sprs[k % 5], M4.mul(M4.translate(q[0] * 13.8, 0.12, q[1] * 7.0), M4.rotY(q[2])), { noCast: true }); });
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) { R.draw(theme.deco, M4.translate(c[0] * 15.7, 0, c[1] * 8.7), null); });
      if (snap && isC && snap.C) snap.C.forEach(function (c, k) {
        var x = (c[0] - 240) * K, y = (245 - c[1]) * K + 1.6, g = c[2];
        R.draw(self.shd, M4.mul(M4.translate(x, 0.1, 2.2), M4.scale(g ? 1.3 : 0.9, 1, g ? 1.3 : 0.9)), { noCast: true });
        var cm = M4.mul(M4.translate(x, y, 2.2), M4.mul(M4.rotZ(0.5 * Math.sin(tt * 3 + k)), M4.mul(M4.rotY(tt * 2.2 + k), M4.scale(1.6, 1.6, 1.6))));
        R.draw(g ? self.cdG : self.cdK[c[3] % 4], g ? M4.mul(cm, M4.scale(1.3, 1.3, 1.3)) : cm, { noCast: true, tint: g ? [1.4, 1.3, 0.9] : [1.1, 1.1, 1.1] });
        if (g) R.draw(self.spark, M4.mul(M4.translate(x + Math.cos(tt * 6 + k) * 1.2, y + Math.sin(tt * 7 + k) * 0.8, 2.6), M4.scale(1.4, 1.4, 1.4)), { noCast: true, unlit: true, grain: 0 });
      });
      if (snap && !isC) {
        var tx1 = (snap.tx - 240) * K, pul = 1 + Math.sin(tt * (snap.ph === 'aim' ? 6 + snap.pt * 3 : 12)) * 0.05;
        if (snap.ph === 'aim' || snap.ph === 'fly') R.draw(self.zone, M4.mul(M4.translate(tx1, 0.02, 3.6), M4.scale(1.92 * pul, 1, 1.92 * pul)), { noCast: true, tint: [1.6, 0.5, 0.55] });
        if (snap.ph === 'splash') R.draw(self.zone, M4.mul(M4.translate(tx1, 0.05, 3.6), M4.scale(2.0, 1, 2.0)), { noCast: true, tint: [1.7, 1.7, 1.8] });
        if (snap.ph === 'fly') { var f = Math.min(1, snap.pt / 1.1), th = list.filter(function (L) { return L.slot === snap.th; })[0], sx = th ? th.o.x : 0; R.draw(self.crM, M4.mul(M4.translate(sx + (tx1 - sx) * f, 1.8 + 7 * Math.sin(f * Math.PI) - 1.4 * f, -5.5 + 9.1 * f), M4.mul(M4.rotY(tt * 4), M4.scale(1.3, 1.3, 1.3))), { noCast: true }); }
        list.forEach(function (L) { if (L.slot === snap.th) R.draw(self.stool, M4.mul(M4.translate(L.o.x, 0, L.z), M4.scale(2.6, 2.2, 2.6)), null); });
      }
      list.forEach(function (L) {
        var o = L.o, u = Math.min(1, (tt - o.hop) / 0.3), y = 0.1 + (u < 1 ? Math.sin(u * Math.PI) * 0.8 : 0), hit = !isC && L.v[4], thr = !isC && snap.th === L.slot, dd = isC && o.dash ? tt - o.dash : 9, lean = isC ? (dd < 0.28 ? (o.dir || 1) * 1.45 : (L.v[7] || 0) * 0.45) : 0, stn = isC && L.v[5];
        if (thr) y += 1.1; var sq = hit ? 0.6 : 1;
        var sqd = dd < 0.25 ? 1 + 0.25 * Math.sin(dd / 0.25 * Math.PI) : 1, base = M4.mul(M4.translate(o.x, y, L.z), M4.mul(M4.rotY(isC ? lean : thr ? 0 : Math.PI), M4.mul(M4.rotZ(stn ? Math.sin(tt * 30) * 0.18 : 0), M4.scale(1.5, 1.5 * sq, 1.5 * sqd))));
        drawCandy(R, getChar(R, skins[L.slot] || 0, cols[L.slot] || CANDY_COL[L.slot % 4]), base, tt, isC && (!!L.v[7] || dd < 0.3), L.slot * 1.7, hit ? [1.9, 1.9, 2.0] : stn ? [1.5, 1.5, 0.7] : [1.12, 1.1, 1.1]);
        if (stn) for (var si = 0; si < 3; si++) { var sa = tt * 7 + si * 2.094; R.draw(self.spark, M4.mul(M4.translate(o.x + Math.cos(sa) * 0.8, y + 3.3, L.z + Math.sin(sa) * 0.8), M4.scale(1.4, 1.4, 1.4)), { noCast: true, unlit: true, grain: 0 }); }
      });
      self.parts.forEach(function (q) { var u = tt - q.t0, Lf = q.life || 0.45, s0 = (1 - u / Lf * 0.75) * (q.sc || 1); R.draw(q.sp ? self.spark : self.puff, M4.mul(M4.translate(q.x + q.vx * u, q.y + q.vy * u - 6 * u * u, q.z + q.vz * u), M4.scale(s0, s0, s0)), { noCast: true, unlit: true, grain: 0 }); });
    };
    R.shadowBegin(this.lvp); scene(); R.sceneBegin(vp, eye, HORIZON, 60, 200); scene(); R.post();
    list.forEach(function (L) {
      var q = [L.o.x, 3.4 + (!isC && snap.th === L.slot ? 1.1 : 0), L.z], m = vp, w = m[3] * q[0] + m[7] * q[1] + m[11] * q[2] + m[15]; if (w <= 0.1) return; var v = M4.pt(m, q);
      tags.push({ slot: L.slot, x: v[0] / w * 0.5 + 0.5, y: 0.5 - v[1] / w * 0.5, ready: false });
    });
    return tags;
  };
  // โยนครีม: มุมมองบุคคลที่ 1 สองฝั่ง (คนยิง / คนหลบ)
  MgView.prototype.drawCreamFP = function (snap, env, now) {
    var cw = this.cv.clientWidth, ch = this.cv.clientHeight; if (!cw || !ch) return [];
    var R = this.R, self = this, tt = now / 1000, dt = Math.min(0.1, this.lastNow ? (now - this.lastNow) / 1000 : 0.016), K = 0.06; this.lastNow = now;
    var gh = Math.max(240, Math.min(720, ch)), gw = Math.max(160, Math.min(1800, Math.round(gh * cw / ch))); R.resize(gw, gh);
    var st = this.st, skins = env.skins || [], cols = env.cols || [];
    if (!this.fpPl) {
      var mk = function (th) {
        var b = new G.Builder(), W2 = 21, D2 = 12.4, i, k; b.jit = 0.01;
        for (i = 0; i < 3; i++) { b.push().tr(0, -0.57 - i * 0.55, 0); b.box(W2 - i * 0.5, 0.55, D2 - i * 0.5, th.layers[i]); b.pop(); }
        b.push().tr(0, -0.02, 0); b.box(W2 - 0.4, 0.1, D2 - 0.4, th.top); b.pop();
        for (k = -W2 / 2 + 0.3; k <= W2 / 2 - 0.3; k += 0.95) [-1, 1].forEach(function (sg) { b.push().tr(k, 0.08, sg * (D2 / 2 - 0.3)); b.sphere(0.34, 6, 5, th.rim); b.pop(); });
        for (k = -D2 / 2 + 0.3; k <= D2 / 2 - 0.3; k += 0.95) [-1, 1].forEach(function (sg) { b.push().tr(sg * (W2 / 2 - 0.3), 0.08, k); b.sphere(0.34, 6, 5, th.rim); b.pop(); });
        return R.mesh(b);
      };
      this.fpPl = [mk({ top: '#ffb8d2', layers: ['#fff0f6', '#ff8fb8', '#fff0f6'], rim: '#ffffff' }), mk({ top: '#bfe6ff', layers: ['#ffffff', '#7fc8f8', '#ffffff'], rim: '#ffffff' })];
      var b2 = new G.Builder(); b2.jit = 0.01; b2.sphere(0.9, 9, 7, '#fff4f8'); b2.push().tr(0, 0.75, 0); b2.sphere(0.55, 7, 5, '#ffd6e6'); b2.pop(); b2.push().tr(0, 1.2, 0); b2.sphere(0.22, 5, 4, '#ff3d4e'); b2.pop(); this.crM2 = R.mesh(b2);
    }
    var list = [], tags = [], me = env.me, meL = null, shooters = [], myAim = null;
    if (snap) {
      snap.P.forEach(function (p) {
        var o = st[p[0]] || (st[p[0]] = { x: (p[1] - 240) * K, z: (p[2] - 140) * K, ax: 0, az: 9, hop: -9, yaw: Math.PI, mv: 0 }), role = p[7], wx = (p[1] - 240) * K, wz = (p[2] - 140) * K;
        var L = { slot: p[0], o: o, v: p, role: role };
        if (role === 1) { L.x = 0; L.z = -4.4; var k = Math.min(1, dt * 12), tx = (p[8] - 240) * K, tz = (p[9] - 140) * K; o.ax += (tx - o.ax) * k; o.az += (tz - o.az) * k; o.yaw = Math.atan2(o.ax - L.x, o.az - L.z); shooters.push(L); if (p[0] === me) myAim = [tx, tz]; o.mv = 0; }
        else { var k2 = Math.min(1, dt * 18), dx0 = wx - o.x, dz0 = wz - o.z; o.x += dx0 * k2; o.z += dz0 * k2; L.x = o.x; L.z = o.z; var sp = Math.hypot(dx0, dz0) / Math.max(dt, 0.001); o.mv = sp > 0.8 ? Math.min(1, o.mv + dt * 10) : Math.max(0, o.mv - dt * 10); if (sp > 0.8) o.yaw = Math.atan2(dx0, dz0); else o.yaw += (Math.PI - o.yaw) * Math.min(1, dt * 4); }
        list.push(L); if (p[0] === me) meL = L;
      });
      var seen = this.spSeen = this.spSeen || {};
      snap.Sp.forEach(function (q) { var key = q[0] + '_' + q[1] + '_' + snap.rd; if (!seen[key]) { seen[key] = 1; var wx = (q[0] - 240) * K, wz = (q[1] - 140) * K; for (var i = 0; i < 16; i++) { var a = i / 16 * 6.283; self.parts.push({ x: wx, y: 0.4, z: wz, vx: Math.cos(a) * 3, vz: Math.sin(a) * 3, vy: 2.5, t0: tt, sp: i % 2, life: 0.7, sc: 1.4 }); } } });
    }
    var eye = [0, 19, 25], look = [0, 0, 6.5], fov = 56, Ld = R.light;
    this.camF = [0, -1];
    if (meL && meL.role === 1) { var so3 = this.crSw = this.crSw || { x: 0 }; so3.x += ((myAim ? myAim[0] * 0.3 : 0) - so3.x) * Math.min(1, dt * 5); eye = [so3.x * 0.4, 11.5, -17]; look = [so3.x, 0, 7]; fov = 58; this.camF = [0, 1]; }
    this.camP = { eye: eye, look: look, fov: fov, asp: cw / ch };
    var vp = M4.mul(M4.persp(fov * Math.PI / 180, cw / ch, 0.4, 400), M4.look(eye, look, [0, 1, 0]));
    var lvp = M4.mul(M4.ortho(-24, 24, -24, 24, 1, 120), M4.look([Ld[0] * 40, Ld[1] * 40, Ld[2] * 40], [0, 0, 0], [0, 1, 0]));
    this.parts = this.parts.filter(function (q) { return tt - q.t0 < (q.life || 0.45); });
    var SRw = (snap && snap.SR ? snap.SR : 48) * K;
    var scene = function () {
      R.draw(self.sky, M4.translate(eye[0], eye[1], eye[2]), { unlit: true, noFog: true, double: true, noCast: true, grain: 0 });
      self.clouds.forEach(function (m, k) { var a = k / 6 * 6.283 + tt * 0.02; R.draw(m, M4.translate(eye[0] + Math.cos(a) * 60, -12 - (k % 3) * 3, eye[2] + Math.sin(a) * 60), { noCast: true, noFog: true, grain: 0 }); });
      R.draw(self.fpPl[0], M4.translate(0, 0, -9), null); R.draw(self.fpPl[1], M4.translate(0, 0, 9), null);
      [[-1, -9], [1, -9], [-1, 9], [1, 9]].forEach(function (c, k) { R.draw(k < 2 ? THEMES_CAKE_DECO(self, 'catcher') : THEMES_CAKE_DECO(self, 'cream'), M4.translate(c[0] * 11.4, 0, c[1] + (c[1] < 0 ? -6.9 : 6.9)), null); });
      if (snap) {
        snap.Sp.forEach(function (q) { var ag = q[2] / 10, u = Math.max(0.35, 1 - ag / 5); R.draw(self.zone, M4.mul(M4.translate((q[0] - 240) * K, 0.07, (q[1] - 140) * K), M4.scale(SRw * u, 1, SRw * u)), { noCast: true, tint: [1.7, 1.7, 1.8] }); });
        snap.Sh.forEach(function (q) {
          var tx = (q[0] - 240) * K, tz = (q[1] - 140) * K, t = q[2], sL = shooters.filter(function (L) { return L.slot === q[3]; })[0], sx = sL ? sL.x : 0, sz = sL ? sL.z : -9;
          var pul = 1 + Math.sin(tt * (8 + t * 14)) * 0.06;
          R.draw(self.zone, M4.mul(M4.translate(tx, 0.09, tz), M4.scale(SRw * pul, 1, SRw * pul)), { noCast: true, tint: [1.7, 0.45 + t * 0.2, 0.5] });
          R.draw(self.crM2, M4.mul(M4.translate(sx + (tx - sx) * t, 3.2 + 7 * Math.sin(t * Math.PI) - 2.8 * t, sz + (tz - sz) * t), M4.mul(M4.rotY(tt * 5), M4.scale(2.6, 2.6, 2.6))), { noCast: true });
        });
        if (meL && meL.role === 1 && myAim) R.draw(self.zone, M4.mul(M4.translate(myAim[0], 0.1, myAim[1]), M4.scale(SRw * 0.98, 1, SRw * 0.98)), { noCast: true, tint: [1.4, 1.3, 0.45 + 0.2 * Math.sin(tt * 9)] });
      }
      list.forEach(function (L) {
        var o = L.o, hit = L.role === 0 && L.v[5] > 0, y = 0.1;
        var base = M4.mul(M4.translate(L.x, y, L.z), M4.mul(M4.rotY(L.role === 1 ? o.yaw : o.yaw), M4.scale(1.5, 1.5 * (hit ? 0.6 : 1), 1.5)));
        drawCandy(R, getChar(R, skins[L.slot] || 0, cols[L.slot] || CANDY_COL[L.slot % 4]), base, tt, L.role === 0 && !hit && o.mv > 0.3, L.slot * 1.7, hit ? [1.9, 1.9, 2.0] : [1.12, 1.1, 1.1]);
        if (L.role === 1) R.draw(self.crM2, M4.mul(M4.translate(L.x + Math.sin(o.yaw) * 1.1, 2.6, L.z + Math.cos(o.yaw) * 1.1), M4.scale(0.8, 0.8, 0.8)), { noCast: true });
      });
      self.parts.forEach(function (q) { var u = tt - q.t0, Lf = q.life || 0.45, s0 = Math.max(0.05, (1 - u / Lf * 0.75) * (q.sc || 1)); R.draw(q.sp ? self.spark : self.puff, M4.mul(M4.translate(q.x + q.vx * u, q.y + q.vy * u - 6 * u * u, q.z + q.vz * u), M4.scale(s0, s0, s0)), { noCast: true, unlit: true, grain: 0 }); });
    };
    R.shadowBegin(lvp); scene(); R.sceneBegin(vp, eye, HORIZON, 60, 260); scene(); R.post();
    list.forEach(function (L) {
      var q = [L.x, 3.5, L.z], m = vp, w = m[3] * q[0] + m[7] * q[1] + m[11] * q[2] + m[15]; if (w <= 0.1) return; var v = M4.pt(m, q);
      tags.push({ slot: L.slot, x: v[0] / w * 0.5 + 0.5, y: 0.5 - v[1] / w * 0.5, ready: false });
    });
    return tags;
  };
  MgView.prototype.drawDodge = function (snap, env, now, asp) {
    var cw = this.cv.clientWidth, ch = this.cv.clientHeight; if (!cw || !ch) return [];
    var R = this.R, self = this, tt = now / 1000, dt = Math.min(0.1, this.lastNow ? (now - this.lastNow) / 1000 : 0.016), K = 0.06; this.lastNow = now;
    var gh = Math.max(240, Math.min(720, ch)), gw = Math.max(160, Math.min(1800, Math.round(gh * cw / ch))); R.resize(gw, gh);
    var st = this.st, skins = env.skins || [], cols = env.cols || [], theme = this.themeMesh('dodge'), list = [], tags = [], me = env.me;
    if (!this.crM2) { var b2 = new G.Builder(); b2.jit = 0.01; b2.sphere(0.9, 9, 7, '#fff4f8'); b2.push().tr(0, 0.75, 0); b2.sphere(0.55, 7, 5, '#ffd6e6'); b2.pop(); b2.push().tr(0, 1.2, 0); b2.sphere(0.22, 5, 4, '#ff3d4e'); b2.pop(); this.crM2 = R.mesh(b2); }
    if (snap) snap.P.forEach(function (p) {
      var o = st[p[0]] || (st[p[0]] = { x: (p[1] - 240) * K, z: (p[2] - 140) * K, yaw: 0, mv: 0 }), wx = (p[1] - 240) * K, wz = (p[2] - 140) * K, dx0 = wx - o.x, dz0 = wz - o.z, k = Math.min(1, dt * 18);
      o.x += dx0 * k; o.z += dz0 * k; var sp = Math.hypot(dx0, dz0) / Math.max(dt, 0.001);
      o.mv = p[6] ? Math.min(1, o.mv + dt * 10) : Math.max(0, o.mv - dt * 10); if (sp > 0.5) o.yaw = Math.atan2(dx0, dz0); list.push({ slot: p[0], o: o, v: p });
    });
    var eye = [0, 21, 17.5], look = [0, 0, 0.6], fov = 52, Ld = R.light; this.camF = [0, -1]; this.camP = null;
    var vp = M4.mul(M4.persp(fov * Math.PI / 180, cw / ch, 0.4, 400), M4.look(eye, look, [0, 1, 0]));
    var lvp = M4.mul(M4.ortho(-22, 22, -22, 22, 1, 120), M4.look([Ld[0] * 40, Ld[1] * 40, Ld[2] * 40], [0, 0, 0], [0, 1, 0]));
    this.parts = this.parts.filter(function (q) { return tt - q.t0 < (q.life || 0.45); });
    var seen = this.dgSeen = this.dgSeen || {}, SRw = (snap && snap.R ? snap.R : 34) * K;
    if (snap) snap.D.forEach(function (d) { var key = d[0] + '_' + d[1] + '_' + snap.wv; if (d[3] && !seen[key]) { seen[key] = 1; var wx = (d[0] - 240) * K, wz = (d[1] - 140) * K; for (var i = 0; i < 14; i++) { var a = i / 14 * 6.283; self.parts.push({ x: wx, y: 0.4, z: wz, vx: Math.cos(a) * 3, vz: Math.sin(a) * 3, vy: 2.6, t0: tt, sp: i % 2, life: 0.6, sc: 1.3 }); } } });
    var scene = function () {
      R.draw(self.sky, M4.translate(eye[0], eye[1], eye[2]), { unlit: true, noFog: true, double: true, noCast: true, grain: 0 });
      self.clouds.forEach(function (m, k) { var a = k / 6 * 6.283 + tt * 0.02; R.draw(m, M4.translate(eye[0] + Math.cos(a) * 60, -12 - (k % 3) * 3, eye[2] + Math.sin(a) * 60), { noCast: true, noFog: true, grain: 0 }); });
      R.draw(theme.tray, null, null);
      self.sp.forEach(function (q, k) { R.draw(self.sprs[k % 5], M4.mul(M4.translate(q[0] * 13.8, 0.12, q[1] * 7.0), M4.rotY(q[2])), { noCast: true }); });
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) { R.draw(theme.deco, M4.translate(c[0] * 15.7, 0, c[1] * 8.7), null); });
      if (snap) snap.D.forEach(function (d) {
        var tx = (d[0] - 240) * K, tz = (d[1] - 140) * K, pr = d[2];
        if (!d[3]) {
          var pul = 1 + Math.sin(tt * (8 + pr * 16)) * 0.05;
          R.draw(self.zone, M4.mul(M4.translate(tx, 0.09, tz), M4.scale(SRw * pul, 1, SRw * pul)), { noCast: true, tint: [1.7, 0.45 + pr * 0.3, 0.5] });
          R.draw(self.zone, M4.mul(M4.translate(tx, 0.1, tz), M4.scale(SRw * 0.25 + SRw * 0.7 * pr, 1, SRw * 0.25 + SRw * 0.7 * pr)), { noCast: true, tint: [1.9, 1.2, 1.2] });
          var hh = 0.4 + 17 * Math.pow(1 - pr, 2); R.draw(self.crM2, M4.mul(M4.translate(tx, hh, tz), M4.mul(M4.rotY(tt * 4), M4.scale(1.1, 1.1, 1.1))), { noCast: true });
        } else { var u = Math.min(1, d[4] / 50); R.draw(self.zone, M4.mul(M4.translate(tx, 0.1, tz), M4.scale(SRw * (1 + u * 0.2), 1, SRw * (1 + u * 0.2))), { noCast: true, tint: [1.8, 1.7, 1.8] }); }
      });
      list.forEach(function (L) {
        var o = L.o, hit = L.v[5] > 0, base = M4.mul(M4.translate(o.x, 0.1, o.z), M4.mul(M4.rotY(o.yaw), M4.scale(1.5, 1.5 * (hit ? 0.6 : 1), 1.5)));
        drawCandy(R, getChar(R, skins[L.slot] || 0, cols[L.slot] || CANDY_COL[L.slot % 4]), base, tt, !hit && o.mv > 0.3, L.slot * 1.7, hit ? [1.9, 1.9, 2.0] : [1.12, 1.1, 1.1]);
        if (hit) for (var si = 0; si < 3; si++) { var sa = tt * 7 + si * 2.094; R.draw(self.spark, M4.mul(M4.translate(o.x + Math.cos(sa) * 0.8, 2.3, o.z + Math.sin(sa) * 0.8), M4.scale(1.2, 1.2, 1.2)), { noCast: true, unlit: true, grain: 0 }); }
      });
      self.parts.forEach(function (q) { var u = tt - q.t0, Lf = q.life || 0.45, s0 = Math.max(0.05, (1 - u / Lf * 0.75) * (q.sc || 1)); R.draw(q.sp ? self.spark : self.puff, M4.mul(M4.translate(q.x + q.vx * u, q.y + q.vy * u - 6 * u * u, q.z + q.vz * u), M4.scale(s0, s0, s0)), { noCast: true, unlit: true, grain: 0 }); });
    };
    R.shadowBegin(lvp); scene(); R.sceneBegin(vp, eye, HORIZON, 60, 260); scene(); R.post();
    list.forEach(function (L) { var q = [L.o.x, 3.5, L.o.z], m = vp, w = m[3] * q[0] + m[7] * q[1] + m[11] * q[2] + m[15]; if (w <= 0.1) return; var v = M4.pt(m, q); tags.push({ slot: L.slot, x: v[0] / w * 0.5 + 0.5, y: 0.5 - v[1] / w * 0.5, ready: false }); });
    return tags;
  };
  function THEMES_CAKE_DECO(view, g) { return view.themeMesh(g).deco; }
  // มินิเกมแยกจอ (เล่นคนเดียวคะแนนแข่ง): หลบหยดครีม / เก็บขนมหลบผัก / กระโดดข้ามขนม
  // กราวด์พิกเซล -> พิกัดโลก: ยิงรังสีจากกล้อง (ใช้กับมินิเกมที่ต้องคลิกบนฉาก 3D)
  MgView.prototype.unproj = function (nx, ny, pz) {
    var c = this.camP, f = [c.look[0] - c.eye[0], c.look[1] - c.eye[1], c.look[2] - c.eye[2]], fl = Math.hypot(f[0], f[1], f[2]); f = [f[0] / fl, f[1] / fl, f[2] / fl];
    var rt = [-f[2], 0, f[0]], rl = Math.hypot(rt[0], rt[2]) || 1; rt = [rt[0] / rl, 0, rt[2] / rl]; var up = [rt[1] * f[2] - rt[2] * f[1], rt[2] * f[0] - rt[0] * f[2], rt[0] * f[1] - rt[1] * f[0]];
    var th = Math.tan(c.fov * Math.PI / 360), sx = (nx * 2 - 1) * th * c.asp, sy = (1 - ny * 2) * th, d = [f[0] + rt[0] * sx + up[0] * sy, f[1] + rt[1] * sx + up[1] * sy, f[2] + rt[2] * sx + up[2] * sy], t = (pz - c.eye[2]) / d[2];
    return [c.eye[0] + d[0] * t, c.eye[1] + d[1] * t, pz];
  };
  MgView.prototype.rotAdd = function (d) { this.so5 = this.so5 || {}; this.so5.rot = (this.so5.rot || 0) + d; };
  MgView.prototype.pickSim = function (game, nx, ny) {
    var c = this.camP; if (!c) return null;
    var f = [c.look[0] - c.eye[0], c.look[1] - c.eye[1], c.look[2] - c.eye[2]], fl = Math.hypot(f[0], f[1], f[2]); f = [f[0] / fl, f[1] / fl, f[2] / fl];
    var rt = [f[1] * 0 - f[2] * 1, f[2] * 0 - f[0] * 0, f[0] * 1 - f[1] * 0]; rt = [-f[2], 0, f[0]]; var rl = Math.hypot(rt[0], rt[2]) || 1; rt = [rt[0] / rl, 0, rt[2] / rl];
    var up = [rt[1] * f[2] - rt[2] * f[1], rt[2] * f[0] - rt[0] * f[2], rt[0] * f[1] - rt[1] * f[0]];
    var th = Math.tan(c.fov * Math.PI / 360), sx = (nx * 2 - 1) * th * c.asp, sy = (1 - ny * 2) * th;
    var d = [f[0] + rt[0] * sx + up[0] * sy, f[1] + rt[1] * sx + up[1] * sy, f[2] + rt[2] * sx + up[2] * sy];
    if (game === 'mole') { if (Math.abs(d[1]) < 1e-5) return null; var t1 = (1.0 - c.eye[1]) / d[1]; if (t1 < 0) return null; return [(c.eye[0] + d[0] * t1) / 0.055 + 240, (c.eye[2] + d[2] * t1) / 0.07 + 160]; }
    if (game === 'shoot') { if (Math.abs(d[2]) < 1e-5) return null; var t2 = -c.eye[2] / d[2]; if (t2 < 0) return null; return [(c.eye[0] + d[0] * t2) / 0.06 + 240, 240 - ((c.eye[1] + d[1] * t2) - 1) / 0.06]; }
    if (game === 'maze' || game === 'color' || game === 'compare' || game === 'simon' || game === 'addmath' || game === 'sweetveg' || game === 'count' || game === 'shadow') return [nx * 480, ny * 270];
    if (game === 'order') { if (d[1] > -1e-5) return null; var t7 = (1.85 * 1.3 + 0.9 - c.eye[1]) / d[1]; if (t7 < 0) return null; return [((c.eye[0] + d[0] * t7 - 7.4) / 1.3) * 10 + 240, ((c.eye[2] + d[2] * t7) / 1.3) * 10 + 135]; }
    if (game === 'memory') { if (d[1] > -1e-5) return null; var t6 = (0.5 - c.eye[1]) / d[1]; if (t6 < 0) return null; return [(c.eye[0] + d[0] * t6) / 0.05 + 251, (c.eye[2] + d[2] * t6) / 0.05 + 142]; }
    if (game === 'numbers') { if (d[1] > -1e-5) return null; var t5 = (0.6 - c.eye[1]) / d[1]; if (t5 < 0) return null; return [(c.eye[0] + d[0] * t5) / 0.05 + 240, (c.eye[2] + d[2] * t5) / 0.05 + 140]; }
    if (game === 'cream') { if (d[1] > -1e-5) return null; var t3 = -c.eye[1] / d[1]; if (t3 < 0) return null; return [(c.eye[0] + d[0] * t3) / 0.06 + 240, (c.eye[2] + d[2] * t3) / 0.06 + 140]; }
    return null;
  };
  // เกมเดี่ยวแบบใช้วัตถุ (ไม่มีตัวละคร): รัวสเปซ / ทรงตัวไอศกรีม / กดค้าง(เทแก้ว) / เชอร์รี่ / หั่นเค้ก
  MgView.prototype.drawSolo4 = function (game, v, env, now) {
    var cw = this.cv.clientWidth, ch = this.cv.clientHeight; if (!cw || !ch) return;
    var R = this.R, self = this, tt = now / 1000, dt4 = Math.min(0.1, this.lastNow ? (now - this.lastNow) / 1000 : 0.016); this.lastNow = now;
    var gh = Math.max(240, Math.min(720, ch)), gw = Math.max(160, Math.min(1800, Math.round(gh * cw / ch))); R.resize(gw, gh);
    var so = this.so4 = this.so4 || { k: -1, st: 0, hit: 0, ct: -9, sk: -1 }, ub = this.ubc = this.ubc || {};
    var bx = function (x, y, z, w, h, d, hex, o, rot) { var m = ub[hex]; if (!m) { var b0 = new G.Builder(); b0.jit = 0.005; b0.box(1, 1, 1, hex); m = ub[hex] = R.mesh(b0); } R.draw(m, M4.mul(M4.translate(x, y - h / 2, z), M4.mul(rot || M4.id(), M4.scale(w, h, d))), o || null); };
    if (!this.m4) {
      var b, sc = ['#ff8fb8', '#fff1c9', '#8a5a3a', '#8fe6c4'];
      this.scY = (function () { var bb = new G.Builder(); bb.jit = 0.012; bb.sphere(1, 10, 8, '#ffd31f'); return R.mesh(bb); })();
      this.scM = sc.map(function (c) { var bb = new G.Builder(); bb.jit = 0.012; bb.sphere(1, 10, 8, c); return R.mesh(bb); });
      b = new G.Builder(); b.jit = 0.01; b.cyl(1.0, 0.12, 2.5, 10, { t: '#e0a860', b: '#c98a5a', s: '#e0a860', sf: function (i) { return i % 2 ? '#e0a860' : '#c98a5a'; } }); this.cn4 = R.mesh(b);
      b = new G.Builder(); b.jit = 0.01; b.sphere(1, 10, 8, '#7ee0ff'); this.jel = R.mesh(b);
      b = new G.Builder(); b.jit = 0.01; b.cyl(1, 1, 1, 18, { t: '#8fd8ff', b: '#6cc4f5', s: '#7ccdf8' }); this.gl4 = R.mesh(b);
      b = new G.Builder(); b.jit = 0.01; b.cyl(1, 1, 1, 16, { t: '#ff8fb8', b: '#ff8fb8', s: '#ff8fb8' }); this.liq = R.mesh(b);
      b = new G.Builder(); b.jit = 0.01; b.cyl(1, 1, 1, 16, { t: '#ffd43b', b: '#ffd43b', s: '#ffd43b' }); this.liqG = R.mesh(b);
      b = new G.Builder(); b.jit = 0.01; b.sphere(1, 9, 7, '#ff2a44'); b.push().tr(-0.35, 0.4, 0.7); b.sphere(0.22, 4, 3, '#ffd0d6'); b.pop(); b.push().tr(0, 1.0, 0).rz(0.3); b.box(0.12, 0.7, 0.12, '#4a7a2a'); b.pop(); this.chM = R.mesh(b);
      b = new G.Builder(); b.jit = 0.01; b.cyl(1, 1, 1, 24, { t: '#ffb3cc', b: '#ffb3cc', s: '#ffb3cc' }); this.fr4 = R.mesh(b);
      b = new G.Builder(); b.jit = 0.01; b.cyl(1, 1, 1, 24, { t: '#f0bd7e', b: '#d49a5a', s: '#e9a76b' }); this.sp4 = R.mesh(b);
      b = new G.Builder(); b.jit = 0.01; b.cyl(1, 1, 1, 24, { t: '#fffaf0', b: '#fffaf0', s: '#fffaf0' }); this.cr4 = R.mesh(b);
      this.m4 = 1;
    }
    var eye = [0, 5.4, 13.5], look = [0, 2.6, 0], fov = 56, asp = cw / ch;
    if (game === 'balance') {
      var stN = v ? v.st : 0, endp = v && v.end;
      if (endp && env.cnts) {
        var kN = v.k || 0, mk = kN > 0 ? 6.4 + (kN - 1) * 1.9 : 3.0, wn2 = v.ext !== undefined && kN >= v.ext && v.et > 1.5, topM = 6.4 + (v.ext || 0) * 1.9 + 1.6, tcy2 = wn2 ? topM / 2 : Math.max(4.6, mk - 0.5), tcz2 = wn2 ? Math.max(20, topM * 1.12 + 3) : 20;
        so.cy = so.cy === undefined ? tcy2 : so.cy + (tcy2 - so.cy) * Math.min(1, dt4 * (v.et < 1.2 ? 2.2 : wn2 ? 1.8 : 5)); so.cz2 = so.cz2 === undefined ? 20 : so.cz2 + (tcz2 - so.cz2) * Math.min(1, dt4 * 1.8); this.balCz = so.cz2;
        eye = [0, so.cy + 1.0, so.cz2]; look = [0, so.cy, 0]; fov = 58;
      }
      else {
        so.off = (so.off || 0) + ((stN * 1.9) - (so.off || 0)) * Math.min(1, dt4 * 4); var tcy = 6.6 + so.off; so.cy = so.cy === undefined ? tcy : so.cy + (tcy - so.cy) * Math.min(1, dt4 * 6); eye = [0, so.cy + 0.9, 17]; look = [0, so.cy, 0]; fov = 58;
      }
    }
    else if (game === 'holdbar') { eye = [0, 5.4, 15]; look = [0, 3.8, 0]; fov = 54; }
    else if (game === 'reaction') { eye = [0, 15, 7.5]; look = [0, 2.2, 0.2]; fov = 56; }
    else if (game === 'slice') { eye = [0, 7.6, 14.5]; look = [0, 1.9, 0]; fov = 54; }
    this.camP = null; this.camF = null;
    var vp = M4.mul(M4.persp(fov * Math.PI / 180, asp, 0.5, 400), M4.look(eye, look, [0, 1, 0])), lvp = this.lvp;
    this.parts = this.parts.filter(function (q) { return tt - q.t0 < (q.life || 0.45); });
    var burst = function (x, y, z, n, sp, life, sc) { for (var i = 0; i < n; i++) { var a = i / n * 6.283; self.parts.push({ x: x, y: y, z: z, vx: Math.cos(a) * 3, vz: Math.sin(a) * 1.2 + 0.8, vy: 2.4 + (i % 3), t0: tt, sp: sp, life: life || 0.55, sc: sc || 1.3 }); } };
    // ------- เหตุการณ์ (สร้างอนุภาค / จับเวลา) -------
    if (v) {
      if (game === 'balance') { if (v.hit && !so.hit) burst((v.x - 240) * 0.045, 3.4 + Math.min(v.st, 7) * 0.4, 0.5, 8, 1, 0.45, 1.1); so.hit = v.hit; so.st = v.st; }
      if (game === 'mash') { if (v.age < 60 && so.ma !== v.score) { burst(0, 2.6, 0.5, 4, v.score % 2, 0.35, 0.9); } so.ma = v.score; }
      if (game === 'holdbar' && v.id !== so.k) { so.k = v.id; if (v.held) { so.ct = tt; if (v.pts >= 20) burst(0, 6.4, 0.5, 14, 1, 0.7, 1.4); } }
      if (game === 'reaction' && v.id !== so.k) { so.k = v.id; if (v.held) so.ct = tt; }
      if (game === 'reaction' && v.fall >= 1 && so.lf !== v.id) { so.lf = v.id; if (v.on === 1) burst((v.pl[v.pl.length - 1] || [0, 0])[0], 3.0, (v.pl[v.pl.length - 1] || [0, 0])[1], 12, 1, 0.6, 1.3); else burst(v.pos * 5, 0.6, 0.5, 6, 0, 0.5, 1.1); }
      if (game === 'slice' && v.id !== so.k) { so.k = v.id; if (v.held) { so.ct = tt; so.cp = v.pos; so.cq = v.pts; } else so.ct = -9; }
    }
    var scene = function () {
      R.draw(self.sky, M4.translate(eye[0], eye[1], eye[2]), { unlit: true, noFog: true, double: true, noCast: true, grain: 0 });
      self.clouds.forEach(function (m, k) { var a = k / 6 * 6.283 + tt * 0.02; R.draw(m, M4.translate(eye[0] + Math.cos(a) * 60, -12 - (k % 3) * 3, eye[2] + Math.sin(a) * 60), { noCast: true, noFog: true, grain: 0 }); });
      if (game === 'mash') {
        var age = v ? v.age : 999, sq = age < 70 ? 0.55 * (1 - age / 70) : (age >= 300 && age < 460 ? 0.8 * (1 - (age - 300) / 160) : 0), idle = Math.sin(tt * 4) * 0.03, sy = 1 - 0.38 * sq + idle, sxz = 1 + 0.2 * sq - idle * 0.5;
        R.draw(self.plateT('balance'), M4.scale(5.5, 1, 5.5), null);
        R.draw(self.jel, M4.mul(M4.translate(0, 0.1, 0), M4.scale(3.0 * sxz, 1.9 * sy, 3.0 * sxz)), { alpha: 0.6, noCast: true, tint: [1.05, 1.05, 1.1] });
        var top = 0.1 + 1.9 * sy * 0.92, hop = age < 320 ? Math.sin(Math.max(0, age - 40) / 280 * Math.PI) * 2.4 : 0;
        drawCandy(R, getChar(R, (env.skins || [])[env.me] || 0, (env.cols || [])[env.me] || CANDY_COL[0]), M4.mul(M4.translate(0, top + hop, 0), M4.mul(M4.rotY(0), M4.scale(1.7, 1.7 * (1 - sq * 0.1), 1.7))), tt, false, 0, [1.12, 1.1, 1.1]);
      } else if (game === 'balance' && v && v.end && env.cnts) {
        var cn = env.cnts.slice().sort(function (a, b) { return a[0] - b[0]; }), nn = cn.length, kk = v.k || 0, wn = v.ext !== undefined && kk >= v.ext && v.et > 1.5, wide = Math.max(11.5, nn * 6.2 + 3);
        R.draw(self.plateT('balance'), M4.scale(wide, 1, 5), null);
        cn.forEach(function (r, qi) {
          var bx0 = (qi - (nn - 1) / 2) * 6.2, out = !wn ? kk > r[1] : r[1] < v.ext, al = out ? { alpha: 0.4 } : null, wob = wn && r[1] === v.ext ? Math.sin(tt * 8) * 0.04 : 0;
          R.draw(self.cn4, M4.mul(M4.translate(bx0, 0.2, 0), M4.mul(M4.rotZ(wob), M4.scale(2.3, 2.3, 2.3))), al);
          for (var i = 0; i < r[1]; i++) { var cur = !wn && !out && i === kk - 1; var sx0 = bx0 + Math.sin(i * 0.7) * 0.03 * Math.min(i, 12), sy0 = 6.4 + i * 1.9 + (cur ? 0.25 : 0), cl = r[0] === env.me && v.cols && v.cols[i] !== undefined ? v.cols[i] : (i + r[0]) % 4;
            if (cur) { R.draw(self.scY, M4.mul(M4.translate(sx0, sy0, 0), M4.scale(2.5 + 0.2 * Math.sin(tt * 14), 2.2 + 0.2 * Math.sin(tt * 14), 2.5)), { alpha: 0.3, unlit: true, noCast: true, noFog: true }); R.draw(self.scY, M4.mul(M4.translate(sx0, sy0, 0), M4.scale(1.95, 1.68, 1.95)), { unlit: true, noCast: true }); }
            else R.draw(self.scM[cl], M4.mul(M4.translate(sx0, sy0, 0), M4.scale(1.8, 1.55, 1.8)), al ? al : null); }
        });
      } else if (game === 'balance') {
        R.draw(self.plateT('balance'), M4.scale(11.5, 1, 5), null);
        var cx = v ? (v.x - 240) * 0.045 : 0, st = v ? v.st : 0, tilt = v ? -v.dir * 0.1 : 0;
        R.draw(self.cn4, M4.mul(M4.translate(cx, 0.2, 0), M4.mul(M4.rotZ(tilt), M4.scale(2.3, 2.3, 2.3))), null);
        for (var i = 0; i < st; i++) R.draw(self.scM[v.cols && v.cols[i] !== undefined ? v.cols[i] : i % 4], M4.mul(M4.translate(cx + Math.sin(tt * 3 + i * 0.7) * 0.025 * Math.min(i, 12) + tilt * i * 0.25, 6.4 + i * 1.9, 0), M4.mul(M4.rotZ(tilt * (1 + i * 0.1)), M4.scale(1.8, 1.55, 1.8))), null);
        if (v) v.sc.forEach(function (q, k) { var wy = 16.4 - q[1] * 0.0525 + (so.off || 0), wx = (q[0] - 240) * 0.045; R.draw(self.scM[q[2] % 4], M4.mul(M4.translate(wx, wy, 0), M4.mul(M4.rotY(tt * 2 + k), M4.scale(1.8, 1.55, 1.8))), { noCast: true }); R.draw(self.shd, M4.mul(M4.translate(wx, 0.15, 0.6), M4.scale(1.6, 1, 1.6)), { noCast: true, alpha: 0.45 * (so.off > 1 ? 0 : 1) }); });
      } else if (game === 'holdbar') {
        R.draw(self.plateT('stack'), M4.scale(5.5, 1, 5.5), null);
        var GH = 5.0, GR = 2.1, fill = v ? v.pos : 0, held = v && v.held, good = held && v.pts >= 20, zc = v ? v.zc : 0.5;
        if (fill > 0.001) R.draw(good ? self.liqG : self.liq, M4.mul(M4.translate(0, 0.15, 0), M4.scale(GR * 0.94, fill * GH, GR * 0.94)), { noCast: true });
        R.draw(self.gl4, M4.mul(M4.translate(0, 0.1, 0), M4.scale(GR, GH, GR)), { alpha: 0.4, noCast: true });
        R.draw(self.gl4, M4.mul(M4.translate(0, 0.1, 0), M4.scale(GR * 1.02, 0.2, GR * 1.02)), { noCast: true });
        for (var rg = 0; rg < 80; rg++) { var ra = rg / 80 * 6.283; R.draw(self.puff, M4.mul(M4.translate(Math.cos(ra) * (GR + 0.12), 0.1 + zc * GH, Math.sin(ra) * (GR + 0.12)), M4.scale(0.4, 0.4, 0.4)), { noCast: true, noFog: true, unlit: true, tint: [1.0, 0.15, 0.2] }); }
        bx(0, 9.4, 0, 1.0, 1.6, 1.0, '#e9a76b'); bx(0, 8.4, 0, 0.6, 0.5, 0.6, '#c98a5a');
        if (v && !v.held && fill > 0.001 && fill < 1) bx(0, (8.2 + 0.15 + fill * GH) / 2, 0, 0.3, 8.2 - 0.15 - fill * GH, 0.3, '#ff8fb8', { noCast: true });
      } else if (game === 'reaction') {
        R.draw(self.plateT('stack'), M4.scale(6.5, 1, 6.5), null);
        var CR = 3.6;
        R.draw(self.sp4, M4.mul(M4.translate(0, 0.0, 0), M4.scale(CR, 0.9, CR)), null); R.draw(self.cr4, M4.mul(M4.translate(0, 0.9, 0), M4.scale(CR * 1.04, 0.3, CR * 1.04)), null);
        R.draw(self.sp4, M4.mul(M4.translate(0, 1.2, 0), M4.scale(CR, 0.9, CR)), null); R.draw(self.fr4, M4.mul(M4.translate(0, 2.1, 0), M4.scale(CR * 1.04, 0.4, CR * 1.04)), null);
        for (var ci = 0; ci < 12; ci++) { var ca = ci / 12 * 6.283; R.draw(self.puff, M4.mul(M4.translate(Math.cos(ca) * CR * 0.96, 2.35, Math.sin(ca) * CR * 0.96), M4.scale(0.28, 0.28, 0.28)), { noCast: true, tint: [1.4, 1.3, 1.3] }); }
        if (v) {
          var ringP = 0.6 + 0.4 * Math.sin(tt * 5); R.draw(self.zone, M4.mul(M4.translate(v.tx, 2.62, v.tz), M4.scale(1.15, 1, 1.15)), { noCast: true, tint: [1.6, 0.5, 0.5] }); R.draw(self.zone, M4.mul(M4.translate(v.tx, 2.64, v.tz), M4.scale(0.8 + 0.1 * ringP, 1, 0.8 + 0.1 * ringP)), { noCast: true, tint: [1.9, 1.7, 1.6] });
          v.pl.forEach(function (q) { R.draw(self.chM, M4.mul(M4.translate(q[0], 2.9, q[1]), M4.scale(0.5, 0.5, 0.5)), { noCast: true }); });
          
          var held2 = v.held, cxp = v.tx + Math.cos(v.th) * v.pos * 5, czp = v.tz + Math.sin(v.th) * v.pos * 5, cyp = 7.4, dxs = Math.cos(v.th) * (v.pos > 0 ? 1 : -1), dzs = Math.sin(v.th) * (v.pos > 0 ? 1 : -1);
          if (held2) { var u = v.fall, onC = v.on === 1; cyp = onC ? 7.4 - (7.4 - 2.95) * u * u : 7.4 - (7.4 - 0.7) * u * u; if (onC && v.fall >= 1) cyp = 2.95; if (!onC && v.fall >= 1) { cyp = 0.7; cxp += (tt - so.ct - 0.26) * 2 * dxs; czp += (tt - so.ct - 0.26) * 2 * dzs; } }
          else bx(cxp, 8.3, czp, 0.07, 1.8, 0.07, '#ffffff', { noCast: true });
          bx(cxp, 9.25, czp, 0.5, 0.35, 0.5, '#3a2158', { noCast: true });
          R.draw(self.chM, M4.mul(M4.translate(cxp, cyp, czp), M4.mul(M4.rotZ(held2 ? (tt - so.ct) * 3 : Math.sin(tt * 5) * 0.2), M4.scale(0.5, 0.5 * (held2 && v.fall >= 1 && v.on === 1 ? 0.8 : 1), 0.5))), { noCast: !held2 ? false : true });
        }
      } else if (game === 'slice') {
        R.draw(self.plateT('stack'), M4.scale(9, 1, 6), null);
        var cutting = v && v.held, ex = cutting ? (tt - so.ct) : -1, cutx = cutting ? -6 + so.cp * 12 : 0, msy = cutting && so.cq < 10;
        var gap = cutting ? Math.min(1, ex * 2.2) * (so.cq >= 20 ? 0.45 : so.cq >= 10 ? 0.8 : 1.3) : 0, rot = cutting ? Math.min(1, ex * 2.2) * (so.cq >= 20 ? 0 : so.cq >= 10 ? 0.07 : 0.2) : 0;
        var piece = function (x0, x1, side) {
          var w = Math.max(0.05, x1 - x0), cxm = (x0 + x1) / 2 + side * gap, r2 = M4.rotZ(-side * rot);
          bx(cxm, 0.55, 0, w, 1.1, 4, '#e9a76b', null, r2); bx(cxm, 1.2, 0, w, 0.22, 4.04, '#fffaf0', null, r2); bx(cxm, 1.9, 0, w, 1.15, 4, '#e9a76b', null, r2); bx(cxm, 2.55, 0, w, 0.22, 4.06, '#ffb3cc', null, r2); bx(cxm, 2.45, 0, w, 0.1, 4.1, '#ff7aa8', null, r2);
          if (side >= 0 || !cutting) { var nb = Math.max(1, Math.floor(w / 1.4)); for (var si = 0; si < nb; si++) bx(x0 + (si + 0.5) * w / nb + side * gap, 2.78, 1.3, 0.55, 0.28, 0.55, '#fffaf0', { noCast: true }, r2); }
          if (msy && side !== 0) bx(cxm - side * w * 0.45, 2.0, 2.05, 0.5, 0.9, 0.12, '#b9753d', { noCast: true });
        };
        if (!cutting) { piece(-6, 6, 0); for (var dd = -2; dd <= 2; dd++) bx(-6 + (v ? v.zc : 0.5) * 12, 2.95, dd * 0.85, 0.3, 0.5, 0.45, '#e0102e', { noCast: true }); bx(-6 + (v ? v.zc : 0.5) * 12, 3.4, 0, 0.12, 2.4, 4.2, '#ff3d4e', { noCast: true, alpha: 0.3 }); }
        else { piece(-6, cutx, -1); piece(cutx, 6, 1); }
        var kn = v ? v.pos : 0.5, kx = cutting ? cutx : -6 + kn * 12, ky = cutting ? Math.max(1.6, 7.6 - ex * 22 * 1) : 6.2 + Math.sin(tt * 6) * 0.08;
        if (cutting && ex > 0.28) ky = 1.6 + Math.min(1, (ex - 0.28) * 3) * 2.5;
        bx(kx, ky, 0, 0.14, 2.6, 3.8, '#e8eef7', null); bx(kx, ky + 1.45, 0, 0.22, 0.5, 3.6, '#c3cfe0', null); bx(kx, ky + 2.2, 1.5, 0.45, 1.1, 1.0, '#5a3b1f', null);
        if (cutting && ex < 0.4 && !so.sp) { so.sp = 1; burst(cutx, 2.8, 1, so.cq >= 20 ? 6 : 14, so.cq >= 20 ? 1 : 0, 0.6, so.cq >= 20 ? 1.4 : 1.1); } if (!cutting) so.sp = 0;
      }
      self.parts.forEach(function (q) { var u = tt - q.t0, Lf = q.life || 0.45, s0 = Math.max(0.05, (1 - u / Lf * 0.75) * (q.sc || 1)); R.draw(q.sp ? self.spark : self.puff, M4.mul(M4.translate(q.x + q.vx * u, q.y + q.vy * u - 6 * u * u, q.z + q.vz * u), M4.scale(s0, s0, s0)), { noCast: true, unlit: true, grain: 0 }); });
    };
    R.shadowBegin(lvp); scene(); R.sceneBegin(vp, eye, HORIZON, 60, 220); scene(); R.post();
  };
  // มินิเกมแยกจอ ชุดคลิก/ทรงตัว: ตีตัวตุ่น / ยิงเป้า / ทรงตัวไอศกรีม

  // แปลงจุดโลก -> พิกัดจอ 0..1 (ใช้วางตัวเลข HUD)
  MgView.prototype.project = function (x, y, z) {
    var c = this.camP; if (!c) return null;
    var f = [c.look[0] - c.eye[0], c.look[1] - c.eye[1], c.look[2] - c.eye[2]], fl = Math.hypot(f[0], f[1], f[2]); f = [f[0] / fl, f[1] / fl, f[2] / fl];
    var rt = [-f[2], 0, f[0]], rl = Math.hypot(rt[0], rt[2]) || 1; rt = [rt[0] / rl, 0, rt[2] / rl];
    var up = [rt[1] * f[2] - rt[2] * f[1], rt[2] * f[0] - rt[0] * f[2], rt[0] * f[1] - rt[1] * f[0]];
    var r = [x - c.eye[0], y - c.eye[1], z - c.eye[2]], zz = r[0] * f[0] + r[1] * f[1] + r[2] * f[2]; if (zz <= 0.1) return null;
    var th = Math.tan(c.fov * Math.PI / 360), xx = r[0] * rt[0] + r[1] * rt[1] + r[2] * rt[2], yy = r[0] * up[0] + r[1] * up[1] + r[2] * up[2];
    return [0.5 + xx / (zz * th * c.asp) / 2, 0.5 - yy / (zz * th) / 2];
  };
  // ลูกศร / กดเลขเรียง (เกมเดี่ยวแบบ 3D)
  MgView.prototype.drawSolo5 = function (game, v, env, now) {
    var cw = this.cv.clientWidth, ch = this.cv.clientHeight; if (!cw || !ch) return;
    var R = this.R, self = this, tt = now / 1000; this.lastNow = now;
    var gh = Math.max(240, Math.min(720, ch)), gw = Math.max(160, Math.min(1800, Math.round(gh * cw / ch))); R.resize(gw, gh);
    var isA = game === 'maze', so = this.so5 = this.so5 || { sc: 0, id: -1, t0: -9, a: null };
    if (!this.m5) {
      var WH = 3.6, WL = 3.3, WT = 0.5, wm = function (c1, c2) { var b = new G.Builder(); b.jit = 0.012; b.box(WL, WH, WT, c1);
        for (var sd = -1; sd <= 1; sd += 2) { for (var ci = -1; ci <= 1; ci++) for (var rw = 0; rw < 2; rw++) { b.push().tr(ci * 1.08, 0.25 + rw * 1.45, sd * (WT / 2 + 0.02)); b.box(0.9, 1.3, 0.09, c2); b.pop(); }
          for (var dd = -1; dd <= 1; dd++) { b.push().tr(dd * 1.1 + 0.15 * sd, WH - 0.62, sd * (WT / 2 + 0.07)); b.box(0.4, 0.62 + (dd + 1) * 0.12, 0.1, '#fffaf0'); b.pop(); } }
        b.push().tr(0, WH, 0); b.box(WL, 0.28, WT + 0.2, '#fffaf0'); b.pop(); return R.mesh(b); };
      this.mzW = [wm('#6e4126', '#86532f'), wm('#ff7fae', '#ff9cc2'), wm('#74d3b0', '#9aeacb'), wm('#d9a35f', '#eebf80')];
      this.mzP = ['#ff4d6d', '#ffd43b', '#4dd4ff', '#8f7bff'].map(function (gc) { var b = new G.Builder(); b.jit = 0.01; b.cyl(0.42, 0.42, 3.8, 8, { t: '#fff', b: '#fff', s: '#fff', sf: function (k) { return k % 2 ? '#ff4d6d' : '#ffffff'; } }); b.push().tr(0, 3.8, 0); b.sphere(0.55, 8, 6, gc); b.pop(); return R.mesh(b); });
      this.clMesh = function (hex, shp) { self.clM = self.clM || {}; var key = hex + shp, m = self.clM[key]; if (m) return m; var b = new G.Builder(), k, a; b.jit = 0.012;
        var cream = '#fffaf0', P = function (x, y, z) { b.push().tr(x, y, z); }, Q = function () { b.pop(); };
        if (shp === 0) {   // เค้กสามชั้น
          [[2.9, 3.0, 1.5, 0], [2.1, 2.2, 1.3, 1.7], [1.4, 1.5, 1.1, 3.2]].forEach(function (T, ti) {
            P(0, T[3], 0); b.cyl(T[0], T[1], T[2], 22, hex); Q(); P(0, T[3] + T[2], 0); b.cyl(T[0] + 0.1, T[0] + 0.1, 0.2, 22, cream); Q();
            var nd = 16 - ti * 3; for (k = 0; k < nd; k++) { a = k / nd * 6.283; var hh = 0.3 + ((k * 7) % 5) * 0.12; P(Math.cos(a) * (T[1] + 0.05), T[3] + T[2] - hh, Math.sin(a) * (T[1] + 0.05)); b.cyl(0.13, 0.13, hh + 0.1, 6, cream); Q(); P(Math.cos(a) * T[0], T[3] + T[2] + 0.2, Math.sin(a) * T[0]); b.sphere(0.2, 5, 4, cream); Q(); }
          });
          for (k = 0; k < 6; k++) { a = k / 6 * 6.283; P(Math.cos(a) * 0.85, 4.5, Math.sin(a) * 0.85); b.sphere(0.24, 6, 5, k % 2 ? '#ff2a44' : '#ff5d8f'); Q(); }
          P(0, 4.45, 0); b.sphere(0.5, 8, 6, '#ff2a44'); Q();
          for (k = 0; k < 3; k++) { a = k / 3 * 6.283 + 0.5; P(Math.cos(a) * 0.45, 4.9, Math.sin(a) * 0.45); b.cyl(0.07, 0.07, 0.55, 6, k % 2 ? '#fff' : '#ffd43b'); Q(); P(Math.cos(a) * 0.45, 5.45, Math.sin(a) * 0.45); b.sphere(0.12, 5, 4, '#ffd31f'); Q(); }
        } else if (shp === 1) {   // คัพเค้ก
          P(0, 0, 0); b.cyl(2.0, 1.4, 2.0, 18, { t: '#f1d9a8', b: '#e6c58a', s: '#f1d9a8', sf: function (q) { return q % 2 ? '#e6c58a' : '#f6e4bd'; } }); Q();
          [[2.15, 2.0], [1.75, 2.55], [1.3, 3.05], [0.85, 3.5], [0.45, 3.9]].forEach(function (L) { P(0, L[1], 0); b.cyl(L[0], L[0] + 0.1, 0.55, 18, hex); Q(); });
          for (k = 0; k < 9; k++) { a = k / 9 * 6.283; P(Math.cos(a) * 1.9, 2.5, Math.sin(a) * 1.9); b.sphere(0.09, 4, 3, ['#fff', '#ffd43b', '#4dd4ff'][k % 3]); Q(); }
          P(0, 4.4, 0); b.sphere(0.5, 8, 6, '#ff2a44'); Q();
        } else if (shp === 2) {   // ไอศกรีมโคน
          P(0, 0, 0); b.cyl(1.55, 0.12, 3.6, 12, { t: '#e8b574', b: '#c9924d', s: '#e8b574', sf: function (q) { return q % 2 ? '#d49a5a' : '#ecc085'; } }); Q();
          P(0, 3.5, 0); b.cyl(1.75, 1.6, 0.3, 14, '#f0bd7e'); Q();
          P(0, 4.5, 0); b.sphere(1.75, 12, 8, hex); Q(); P(0, 6.0, 0); b.sphere(1.4, 10, 7, hex); Q();
          for (k = 0; k < 10; k++) { a = k / 10 * 6.283; P(Math.cos(a) * 1.55, 3.85, Math.sin(a) * 1.55); b.sphere(0.32, 5, 4, cream); Q(); }
          P(0, 7.35, 0); b.sphere(0.45, 8, 6, '#ff2a44'); Q();
        } else if (shp === 3) {   // โดนัท (ตั้งเอียงให้เห็นรู)
          P(0, 3.1, 0); b.rx(-1.0);
          for (k = 0; k < 22; k++) { a = k / 22 * 6.283; b.push().tr(Math.cos(a) * 2.3, Math.sin(a) * 2.3, 0); b.sphere(0.95, 7, 5, hex); b.pop(); }
          for (k = 0; k < 22; k++) { a = k / 22 * 6.283 + 0.14; b.push().tr(Math.cos(a) * 2.3, Math.sin(a) * 2.3, 0.7); b.sphere(0.5, 5, 4, cream); b.pop(); }
          for (k = 0; k < 14; k++) { a = k * 2.4; var rr = 1.7 + (k % 3) * 0.45; b.push().tr(Math.cos(a) * rr, Math.sin(a) * rr, 1.15); b.box(0.35, 0.12, 0.12, ['#ff5d8f', '#ffd43b', '#4dd4ff'][k % 3]); b.pop(); }
          Q();
        } else {   // อมยิ้ม
          P(0, 0, 0); b.cyl(0.22, 0.22, 3.4, 8, '#fffaf0'); Q();
          P(0, 5.2, 0); b.sphere(2.3, 14, 10, hex); Q();
          for (k = 0; k < 16; k++) { a = k / 16 * 6.283; P(Math.cos(a) * 1.5, 5.2 + Math.sin(a) * 1.5, 2.0); b.sphere(0.2, 4, 3, cream); Q(); }
          for (k = 0; k < 8; k++) { a = k / 8 * 6.283; P(Math.cos(a) * 0.7, 5.2 + Math.sin(a) * 0.7, 2.25); b.sphere(0.16, 4, 3, cream); Q(); }
          P(-0.6, 3.5, 0); b.box(0.9, 0.35, 0.3, '#ff5d8f'); Q(); P(0.6, 3.5, 0); b.box(0.9, 0.35, 0.3, '#ff5d8f'); Q();
        }
        return (self.clM[key] = R.mesh(b)); };
      this.cmpMesh = function (hex) { self.cpM = self.cpM || {}; var m = self.cpM[hex]; if (!m) { var b = new G.Builder(); b.jit = 0.01; b.cyl(2.6, 2.7, 1.8, 20, hex); b.push().tr(0, 1.8, 0); b.cyl(2.7, 2.7, 0.22, 20, '#fffaf0'); b.pop(); b.push().tr(0, 2.02, 0); b.cyl(1.8, 1.9, 1.3, 18, hex); b.pop(); b.push().tr(0, 3.32, 0); b.cyl(1.9, 1.9, 0.2, 18, '#fffaf0'); b.pop(); b.push().tr(0, 3.5, 0); b.sphere(0.6, 8, 6, '#ff2a44'); b.pop(); m = self.cpM[hex] = R.mesh(b); } return m; };
      this.padMesh = function (hex) { self.pdM = self.pdM || {}; var m = self.pdM[hex]; if (!m) { var b = new G.Builder(), k, a; b.jit = 0.012; b.cyl(2.5, 2.6, 1.6, 20, hex); b.push().tr(0, 1.6, 0); b.cyl(2.6, 2.6, 0.22, 20, '#fffaf0'); b.pop(); b.push().tr(0, 1.82, 0); b.cyl(1.9, 2.0, 0.9, 18, hex); b.pop(); for (k = 0; k < 14; k++) { a = k / 14 * 6.283; b.push().tr(Math.cos(a) * 2.62, 1.2 - ((k * 5) % 3) * 0.12, Math.sin(a) * 2.62); b.cyl(0.14, 0.14, 0.5, 6, '#fffaf0'); b.pop(); } b.push().tr(0, 2.72, 0); b.sphere(0.55, 8, 6, '#ff2a44'); b.pop(); m = self.pdM[hex] = R.mesh(b); } return m; };
      (function () { var b = new G.Builder(); b.jit = 0.01; b.push().tr(0, 0, -0.15); b.box(10.4, 6.2, 0.6, '#fffaf0'); b.pop(); b.push().tr(0, 0.3, 0); b.box(9.8, 5.6, 0.8, '#3b2a52'); b.pop(); for (var k = 0; k < 18; k++) { var a = k / 18 * 6.283; b.push().tr(Math.cos(a) * 0 + (k - 8.5) * 0.55, 6.2, 0.1); b.sphere(0.26, 5, 4, k % 2 ? '#ff8fb8' : '#fffaf0'); b.pop(); } self.boardM = R.mesh(b); })();
      this.cardM = function (sy, col) { self.cdM = self.cdM || {}; var m = self.cdM[sy]; if (!m) { var b = new G.Builder(); b.jit = 0.01; b.push().tr(0, 0, 0); b.box(3.3, 0.18, 2.3, '#7a4fb5'); b.pop(); b.push().tr(0, 0.18, 0); b.box(2.7, 0.06, 1.7, '#fff1c9'); b.pop(); b.push().tr(0, 0.24, 0); b.sphere(0.3, 6, 4, '#ffb3d9'); b.pop();
        b.push().tr(0, -0.18, 0); b.box(3.3, 0.18, 2.3, '#7a4fb5'); b.pop(); b.push().tr(0, -0.36, 0); b.box(3.3, 0.18, 2.3, col); b.pop(); b.push().tr(0, -0.42, 0); b.box(2.9, 0.06, 1.9, '#fffaf0'); b.pop();
        var K = 1.8, C = function (a, bb, h, sg, c, x, y, z) { b.push().tr((x || 0) * K, -0.46 - (y || 0) * K, (z || 0) * K).rx(Math.PI); b.cyl(a * K, bb * K, h * K, sg, c); b.pop(); }, Sp = function (r, c, x, y, z) { b.push().tr((x || 0) * K, -0.46 - y * K, (z || 0) * K); b.sphere(r * K, 7, 5, c); b.pop(); }, Bx = function (w, h, d, c, x, y, z) { b.push().tr((x || 0) * K, -0.46 - (y || 0) * K, (z || 0) * K).rx(Math.PI); b.box(w * K, h * K, d * K, c); b.pop(); }, k;
        if (sy === 0) { C(0.5, 0.36, 0.5, 12, '#f1d9a8', 0, 0); C(0.55, 0.55, 0.22, 12, '#ff8fb8', 0, 0.5); C(0.42, 0.42, 0.22, 12, '#ff8fb8', 0, 0.7); C(0.28, 0.28, 0.2, 10, '#ff8fb8', 0, 0.9); Sp(0.17, '#ff2a44', 0, 1.2); }
        else if (sy === 1) { C(0.42, 0.04, 0.95, 10, '#e8b574', 0, 0); Sp(0.5, '#ffb3d9', 0, 1.25); Sp(0.4, '#fff1c9', 0, 1.7); Sp(0.13, '#ff2a44', 0, 2.1); }
        else if (sy === 2) { for (k = 0; k < 14; k++) { var a2 = k / 14 * 6.283; Sp(0.2, '#ff8fb8', Math.cos(a2) * 0.55, 0.25, Math.sin(a2) * 0.55); } for (k = 0; k < 10; k++) { var a3 = k / 10 * 6.283 + 0.2; Sp(0.09, ['#ffd43b', '#fff', '#4dd4ff'][k % 3], Math.cos(a3) * 0.55, 0.45, Math.sin(a3) * 0.55); } }
        else if (sy === 3) { C(0.06, 0.06, 1.1, 6, '#fffaf0', 0, 0); Sp(0.58, '#ff5d8f', 0, 1.5); for (k = 0; k < 6; k++) { var a4 = k / 6 * 6.283; Sp(0.12, '#fff', Math.cos(a4) * 0.4, 1.5 + Math.sin(a4) * 0.4, 0.4); } }
        else if (sy === 4) { C(0.55, 0.08, 0.95, 10, '#ff3b5c', 0, 0.1); C(0.5, 0.5, 0.1, 8, '#37b24d', 0, 1.05); for (k = 0; k < 6; k++) { var a5 = k / 6 * 6.283; Sp(0.05, '#ffe066', Math.cos(a5) * 0.3, 0.55 + (k % 2) * 0.2, Math.sin(a5) * 0.3 + 0.05); } }
        else if (sy === 5) { Sp(0.38, '#e0143c', -0.4, 0.4); Sp(0.38, '#c2102f', 0.4, 0.35); Bx(0.06, 0.9, 0.06, '#4a7a2a', -0.2, 0.6); Bx(0.06, 0.9, 0.06, '#4a7a2a', 0.2, 0.55); Bx(0.3, 0.1, 0.18, '#37b24d', 0, 1.45); }
        else if (sy === 6) { Bx(1.3, 0.4, 0.9, '#f6cf8e', 0, 0); Bx(1.3, 0.1, 0.9, '#fff', 0, 0.4); Bx(1.3, 0.35, 0.9, '#ff9ec0', 0, 0.5); Bx(1.36, 0.14, 0.96, '#fffaf0', 0, 0.85); Sp(0.16, '#ff2a44', 0, 1.12); }
        else { C(0.62, 0.62, 0.2, 14, '#6fe0b4', 0, 0); C(0.58, 0.58, 0.16, 14, '#fff', 0, 0.2); C(0.34, 0.62, 0.3, 14, '#8af0c8', 0, 0.36); }
        m = self.cdM[sy] = R.mesh(b); } return m; };
      this.vegM = [0, 1].map(function (kind) { var b = new G.Builder(), k; b.jit = 0.012;
        if (kind === 0) { b.cyl(0.45, 0.6, 1.8, 8, '#9be15d'); [[0, 2.3, 0, 1.1], [0.9, 2.0, 0.2, 0.8], [-0.9, 2.0, -0.2, 0.8], [0.2, 2.0, 0.9, 0.8], [-0.2, 2.0, -0.9, 0.8]].forEach(function (u) { b.push().tr(u[0], u[1], u[2]); b.sphere(u[3], 8, 6, '#2fb344'); b.pop(); }); }
        else { b.push().tr(0, 0, 0); b.cyl(1.0, 0.12, 3.4, 10, '#ff922b'); b.pop(); for (k = 0; k < 5; k++) { b.push().tr(Math.cos(k * 1.26) * 0.3, 3.3, Math.sin(k * 1.26) * 0.3).rz(Math.cos(k * 1.26) * 0.4); b.cyl(0.12, 0.2, 1.1, 5, '#37b24d'); b.pop(); } }
        return R.mesh(b); });
      (function () { var b = new G.Builder(), k; b.jit = 0.01; [[7.6, 0, 0.5], [7.4, 0.5, 0.7], [6.8, 1.2, 0.8], [5.8, 2.0, 0.9], [4.4, 2.9, 0.9], [2.6, 3.8, 0.8]].forEach(function (L) { b.push().tr(0, L[1], 0); b.cyl(L[0] * 0.92, L[0], L[2], 24, '#cfd6de'); b.pop(); }); b.push().tr(0, 4.6, 0); b.sphere(0.8, 8, 6, '#9aa5b1'); b.pop(); self.clocheM = R.mesh(b); })();
      (function () { var b = new G.Builder(); b.jit = 0.01; b.box(4, 2.3, 4, '#ff8fb8'); b.push().tr(0, 0, 0); b.box(0.9, 2.31, 4.02, '#fffaf0'); b.pop(); self.giftB = R.mesh(b); b = new G.Builder(); b.jit = 0.01; b.box(4.4, 0.6, 4.4, '#ff6fa3'); b.push().tr(0, 0, 0); b.box(0.9, 0.62, 4.42, '#fffaf0'); b.pop(); b.push().tr(-0.7, 0.6, 0); b.sphere(0.7, 6, 5, '#fffaf0'); b.pop(); b.push().tr(0.7, 0.6, 0); b.sphere(0.7, 6, 5, '#fffaf0'); b.pop(); self.giftL = R.mesh(b); })();
      this.mzT = {}; this.mzTile = function (hex) { var m = self.mzT[hex]; if (!m) { var b = new G.Builder(); b.jit = 0.008; b.box(4, 0.3, 4, hex); m = self.mzT[hex] = R.mesh(b); } return m; };
      var mc = new G.Builder(), SEG = 24, k0; mc.jit = 0.01;
      mc.cyl(4.5, 4.7, 0.22, 28, '#fffaf0');
      var tiers = [[3.3, 3.4, 1.0, 0.22, '#ffb3c7', '#ff9ec0'], [2.45, 2.55, 0.85, 1.4, '#7a4a2d', '#8a5a3a'], [1.65, 1.75, 0.7, 2.4, '#fff1c9', '#ffe2a8']];
      tiers.forEach(function (T, ti) {
        mc.push().tr(0, T[3], 0); mc.cyl(T[0], T[1], T[2], SEG, { t: T[4], b: T[4], s: T[4], sf: function (k) { return k % 2 ? T[5] : T[4]; } }); mc.pop();
        mc.push().tr(0, T[3] + T[2], 0); mc.cyl(T[0] + 0.08, T[0] + 0.08, 0.14, SEG, '#fffaf0'); mc.pop();
        var nd = 16 - ti * 2; for (k0 = 0; k0 < nd; k0++) { var aa = k0 / nd * 6.283, hh = 0.25 + ((k0 * 7) % 5) * 0.1; mc.push().tr(Math.cos(aa) * (T[1] + 0.06), T[3] + T[2] - hh, Math.sin(aa) * (T[1] + 0.06)); mc.cyl(0.13, 0.13, hh + 0.1, 6, '#fffaf0'); mc.pop(); mc.push().tr(Math.cos(aa) * T[0], T[3] + T[2] + 0.12, Math.sin(aa) * T[0]); mc.sphere(0.2, 6, 5, '#fffaf0'); mc.pop(); }
      });
      for (k0 = 0; k0 < 8; k0++) { var ab = k0 / 8 * 6.283; mc.push().tr(Math.cos(ab) * 1.15, 3.2, Math.sin(ab) * 1.15); mc.sphere(0.26, 6, 5, k0 % 2 ? '#ff2a44' : '#ff5d8f'); mc.pop(); }
      mc.push().tr(0, 3.15, 0); mc.sphere(0.62, 8, 6, '#ff2a44'); mc.pop(); mc.push().tr(0, 3.7, 0).rz(0.3); mc.box(0.1, 0.4, 0.1, '#4a7a2a'); mc.pop();
      for (k0 = 0; k0 < 4; k0++) { var ac = k0 / 4 * 6.283 + 0.4; mc.push().tr(Math.cos(ac) * 0.55, 3.55, Math.sin(ac) * 0.55); mc.cyl(0.07, 0.07, 0.55, 6, k0 % 2 ? '#fff' : '#ffd43b'); mc.pop(); mc.push().tr(Math.cos(ac) * 0.55, 4.1, Math.sin(ac) * 0.55); mc.sphere(0.12, 5, 4, '#ffd31f'); mc.pop(); }
      this.mzCake = R.mesh(mc);
      var b2 = new G.Builder(); b2.jit = 0.012; b2.cyl(0.95, 1.0, 0.34, 18, '#ffc21a');
      b2.push().tr(0, 0.34, 0); b2.cyl(0.98, 0.98, 0.3, 18, '#ffffff'); b2.pop();
      b2.push().tr(0, 0.64, 0); b2.cyl(0.55, 1.0, 0.42, 18, '#ffd84d'); b2.pop();
      for (var fk = 0; fk < 14; fk++) { var fa = fk / 14 * 6.283; b2.push().tr(Math.cos(fa) * 0.96, 0.02, Math.sin(fa) * 0.96); b2.sphere(0.08, 4, 3, '#ffe27a'); b2.pop(); }
      b2.push().tr(0, 0.96, 0); b2.sphere(0.1, 4, 3, '#fff'); b2.pop(); this.nbY = R.mesh(b2);
      b2 = new G.Builder(); b2.jit = 0.01; b2.cyl(0.95, 1.0, 0.2, 14, '#6c757d'); for (fk = 0; fk < 5; fk++) { b2.push().tr(Math.cos(fk * 1.3) * 0.7, 0.2, Math.sin(fk * 1.3) * 0.7); b2.sphere(0.1, 4, 3, '#868e96'); b2.pop(); } this.nbG = R.mesh(b2);
      (function () {
        var PI = Math.PI;
        function tm(id) {
          var b = new G.Builder(), i, a; b.jit = 0.008;
          if (id === 0) { b.push().tr(-0.22, -0.22, 0); b.sphere(0.27, 10, 7, '#e03131'); b.pop(); b.push().tr(0.22, -0.28, 0); b.sphere(0.27, 10, 7, '#c92a2a'); b.pop(); b.push().tr(-0.22, 0, 0).rz(-0.38); b.cyl(0.03, 0.03, 0.6, 5, '#5c7a29'); b.pop(); b.push().tr(0.22, -0.05, 0).rz(0.38); b.cyl(0.03, 0.03, 0.6, 5, '#5c7a29'); b.pop(); b.push().tr(0.02, 0.5, 0).rz(0.5); b.box(0.32, 0.03, 0.16, '#37b24d'); b.pop(); }
          else if (id === 1) { b.push().sc(1.25, 1, 1); b.sphere(0.26, 10, 7, '#ff5fa2'); b.pop(); b.push().tr(0.3, 0, 0).rz(-PI / 2); b.cyl(0, 0.22, 0.26, 6, '#ffd43b'); b.pop(); b.push().tr(-0.3, 0, 0).rz(PI / 2); b.cyl(0, 0.22, 0.26, 6, '#ffd43b'); b.pop(); b.push().tr(0, 0, 0); b.sc(1.3, 1, 1); b.sphere(0.265, 10, 3, function (x, y) { return y === 1 ? '#fff' : '#ff5fa2'; }); b.pop(); }
          else if (id === 2) { b.push().rx(0.9).ry(0.35); b.push().tr(0, -0.06, -0.05); b.box(0.55, 0.12, 0.8, '#5b3a29'); b.pop(); for (i = 0; i < 8; i++) { b.push().tr(-0.14 + (i % 2) * 0.28, 0.06, -0.38 + Math.floor(i / 2) * 0.2 + 0.1); b.box(0.2, 0.05, 0.16, '#7a4b33'); b.pop(); } b.push().tr(0, -0.065, 0.36); b.box(0.57, 0.13, 0.28, '#e63946'); b.pop(); b.push().tr(0, -0.06, 0.5); b.box(0.59, 0.14, 0.05, '#cfd4da'); b.pop(); b.pop(); }
          else if (id === 3) { b.push().tr(0, -0.5, 0); b.cyl(0.34, 0.03, 0.7, 10, '#e8374a'); b.pop(); b.push().tr(0, 0.2, 0).sc(1, 0.7, 1); b.sphere(0.34, 10, 6, '#e8374a'); b.pop(); for (i = 0; i < 5; i++) { b.push().tr(0, 0.4, 0).ry(i * 1.2566).tr(0.12, 0, 0).rz(-0.5); b.box(0.26, 0.04, 0.1, '#2f9e44'); b.pop(); } b.push().tr(0, 0.4, 0); b.cyl(0.03, 0.03, 0.16, 5, '#2f9e44'); b.pop(); for (i = 0; i < 7; i++) { a = i * 2.4; b.push().tr(Math.cos(a) * 0.2, -0.2 + (i % 3) * 0.16, Math.sin(a) * 0.2 + 0.18 * Math.cos(a) * 0).sc(1, 1, 1); b.sphere(0.03, 4, 3, '#ffe066'); b.pop(); } }
          else if (id === 4) { b.push().rx(0.9); b.push().tr(0, -0.2, 0); b.cyl(0.42, 0.4, 0.14, 14, '#ffa8c8'); b.pop(); b.push().tr(0, -0.06, 0); b.cyl(0.38, 0.38, 0.1, 14, '#fff4df'); b.pop(); b.push().tr(0, 0.04, 0); b.cyl(0.4, 0.42, 0.14, 14, '#ffa8c8'); b.pop(); b.pop(); }
          else if (id === 5) { b.push().tr(0, -0.5, 0); b.cyl(0.32, 0.2, 0.32, 10, { t: '#e8a86b', b: '#e8a86b', s: '#e3a05f', sf: function (q) { return q % 2 ? '#e3a05f' : '#f0b97a'; } }); b.pop(); b.push().tr(0, -0.18, 0); b.cyl(0.34, 0.28, 0.18, 10, '#ff9ec0'); b.pop(); b.push().tr(0, 0, 0); b.cyl(0.26, 0.22, 0.16, 10, '#ffb3d1'); b.pop(); b.push().tr(0, 0.16, 0); b.cyl(0.14, 0.18, 0.12, 10, '#ff9ec0'); b.pop(); b.push().tr(0, 0.36, 0); b.sphere(0.1, 7, 5, '#e03131'); b.pop(); }
          else if (id === 6) { b.push().tr(0, -0.5, 0); b.cyl(0.28, 0.02, 0.62, 8, { t: '#e8b565', b: '#e8b565', s: '#e8b565', sf: function (q) { return q % 2 ? '#d9a44f' : '#f0c27a'; } }); b.pop(); b.push().tr(0, 0.22, 0); b.sphere(0.3, 10, 7, '#ffb3d1'); b.pop(); b.push().tr(0, 0.5, 0); b.sphere(0.22, 9, 6, '#fff0b3'); b.pop(); }
          else if (id === 7) { b.push().tr(0, 0.2, 0).rx(PI / 2); b.cyl(0.34, 0.34, 0.1, 16, '#ff6bd0'); b.pop(); b.push().tr(0, 0.2, 0.01).rx(PI / 2); b.cyl(0.22, 0.22, 0.1, 16, '#fff'); b.pop(); b.push().tr(0, 0.2, 0.02).rx(PI / 2); b.cyl(0.1, 0.1, 0.1, 12, '#ff6bd0'); b.pop(); b.push().tr(0, -0.55, 0); b.cyl(0.03, 0.03, 0.78, 6, '#f1f3f5'); b.pop(); }
          else if (id === 8) { b.push().rx(0.9); b.push().tr(0, -0.06, 0); b.cyl(0.42, 0.42, 0.12, 14, '#d9a05b'); b.pop(); [[0.2, 0.1], [-0.2, 0.15], [0, -0.25], [0.15, -0.12], [-0.12, -0.05], [0.05, 0.28]].forEach(function (c) { b.push().tr(c[0], 0.06, c[1]); b.box(0.1, 0.05, 0.1, '#4a2c1a'); b.pop(); }); b.pop(); }
          else if (id === 9) { b.push().rz(PI / 2).rx(PI / 2).tr(0, -0.3, 0); b.cyl(0.5, 0.5, 0.6, 3, { t: '#fff0d0', b: '#fff0d0', s: '#f0c98a', sf: function (q) { return q % 2 ? '#fff' : '#f0c98a'; } }); b.pop(); b.push().tr(0, 0.56, 0); b.sphere(0.1, 7, 5, '#e03131'); b.pop(); }
          else if (id === 10) { b.sphere(0.2, 8, 6, '#ffe066'); for (i = 0; i < 5; i++) { b.push().rz(i * 1.2566); b.cyl(0, 0.17, 0.52, 5, '#ffd43b'); b.pop(); } }
          else if (id === 11) { b.push().tr(0, -0.1, 0).sc(0.9, 1.1, 0.8); b.sphere(0.28, 9, 6, '#ff6b6b'); b.pop(); b.push().tr(0, 0.28, 0); b.sphere(0.2, 9, 6, '#ff6b6b'); b.pop(); [-0.15, 0.15].forEach(function (x) { b.push().tr(x, 0.44, 0); b.sphere(0.08, 5, 4, '#ff6b6b'); b.pop(); b.push().tr(x * 2, 0, 0); b.sphere(0.09, 5, 4, '#ff6b6b'); b.pop(); b.push().tr(x, -0.38, 0); b.sphere(0.11, 5, 4, '#ff6b6b'); b.pop(); }); }
          else if (id === 12) { b.push().tr(0, -0.5, 0); b.cyl(0.07, 0.07, 0.8, 8, { t: '#fff', b: '#fff', s: '#fff', sf: function (q) { return q % 2 ? '#e03131' : '#fff'; } }); b.pop(); for (i = 0; i <= 6; i++) { a = i / 6 * PI; b.push().tr(0.2 - 0.2 * Math.cos(a), 0.3 + 0.2 * Math.sin(a), 0); b.sphere(0.085, 5, 4, i % 2 ? '#e03131' : '#fff'); b.pop(); } }
          else if (id === 13) { for (i = 0; i < 14; i++) { a = i / 14 * PI * 2; b.push().tr(Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0); b.sphere(0.13, 6, 4, '#e0a458'); b.pop(); b.push().tr(Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0.07); b.sphere(0.115, 6, 4, '#ff7eb6'); b.pop(); } }
          else if (id === 14) { b.push().tr(-0.16, 0.16, 0); b.sphere(0.26, 9, 6, '#ff4d7a'); b.pop(); b.push().tr(0.16, 0.16, 0); b.sphere(0.26, 9, 6, '#ff4d7a'); b.pop(); b.push().tr(0, -0.5, 0); b.cyl(0.4, 0.02, 0.7, 12, '#ff4d7a'); b.pop(); }
          else { b.push().tr(0, -0.5, 0); b.cyl(0.5, 0.5, 0.04, 14, '#ffffff'); b.pop(); b.push().tr(0, -0.46, 0); b.cyl(0.3, 0.4, 0.4, 12, '#ffcf66'); b.pop(); b.push().tr(0, -0.06, 0); b.cyl(0.31, 0.3, 0.07, 12, '#8b4513'); b.pop(); b.push().tr(0, 0.1, 0); b.sphere(0.1, 7, 5, '#e03131'); b.pop(); }
          return R.mesh(b);
        }
        self.treatM = []; for (var q = 0; q < 16; q++) self.treatM.push(tm(q));
        var bb = new G.Builder(); bb.cyl(0.55, 0.55, 0.05, 14, '#ffffff'); self.ringM = R.mesh(bb);
        bb = new G.Builder(); bb.box(1, 1, 0.1, '#f8f0dc'); self.wallM = R.mesh(bb);
        self.ordCake = function (hex) { self.ordC = self.ordC || {}; if (self.ordC[hex]) return self.ordC[hex]; var b = new G.Builder(), i; b.jit = 0.008; b.cyl(5.5, 5.7, 0.25, 30, '#fffaf0');
          b.push().tr(0, 0.25, 0); b.cyl(4.95, 5.05, 1.3, 30, { t: '#f2c98b', b: '#f2c98b', s: '#e8b574', sf: function (q) { return q % 2 ? '#e8b574' : '#f2c98b'; } }); b.pop();
          b.push().tr(0, 1.55, 0); b.cyl(5.08, 5.08, 0.3, 30, hex); b.pop();
          for (i = 0; i < 22; i++) { var a = i / 22 * 6.283, h = 0.35 + ((i * 7) % 5) * 0.14; b.push().tr(Math.cos(a) * 5.06, 1.75 - h, Math.sin(a) * 5.06); b.cyl(0.2, 0.2, h, 6, hex); b.pop(); }
          return (self.ordC[hex] = R.mesh(b)); };
      })();
      this.m5 = 1;
    }
    if (v && v.sid !== undefined && so.sid !== v.sid) { so.sid = v.sid; so.p = null; so.a = null; so.ey = undefined; so.op = null; so.sc = 0; }
    var upv = [0, 1, 0], CS = 4, eye, look, fov = isA ? 72 : 58, asp = cw / ch, dtm = Math.min(0.1, this.lastNow5 ? (now - this.lastNow5) / 1000 : 0.016); this.lastNow5 = now;
    if (isA) {
      var NM = v ? v.N : 11, tx = v ? (v.x - NM / 2 + 0.5) * CS : 0, tz = v ? (v.y - NM / 2 + 0.5) * CS : 0, fin0 = v && v.fin, ta = v ? v.d * Math.PI / 2 : 0, fin = v && v.fin;
      if (!so.p) so.p = [tx, tz]; if (so.a === null) so.a = ta; if (so.ey === undefined) so.ey = 1.5;
      if (fin) { tx *= 1.7; tz *= 1.7; var fa = Math.atan2(-tx, tz); ta = fa + Math.round((so.a - fa) / 6.283) * 6.283; }
      var kk = Math.min(1, dtm * 11); so.p[0] += (tx - so.p[0]) * kk; so.p[1] += (tz - so.p[1]) * kk;
      var da = ta - so.a; while (da > Math.PI) { da -= 6.283; so.a += 6.283; } while (da < -Math.PI) { da += 6.283; so.a -= 6.283; } so.a += (ta - so.a) * Math.min(1, dtm * (fin ? 3 : 12));
      so.ey += ((fin ? 6.2 : 1.5) - so.ey) * Math.min(1, dtm * 2.5);
      eye = [so.p[0], so.ey + (fin ? 0 : Math.sin(tt * 9 * Math.min(1, Math.hypot(tx - so.p[0], tz - so.p[1]))) * 0.04), so.p[1]]; look = fin ? [0, 1.8, 0] : [eye[0] + Math.sin(so.a) * 5, 1.35, eye[2] - Math.cos(so.a) * 5];
    }
    else if (game === 'sweetveg') { eye = [0, 6.5, 16]; look = [0, 2.4, 0]; fov = 52; }
    else if (game === 'color' || game === 'compare' || game === 'simon' || game === 'addmath') { eye = [0, 6.5, 16]; look = [0, game === 'color' ? 2.2 : game === 'simon' ? 1.2 : 3.2, 0]; fov = 52; }
    else if (game === 'order') { eye = [0, 20, 15.5]; look = [0, 0, -0.3]; fov = 58; }
    else if (game === 'shadow') { eye = [0, 4.4, 16]; look = [0, 3.0, 0]; fov = 48; }
    else { eye = [0, 17, 9.5]; look = [0, 0, game === 'memory' ? -2.3 : -1.6]; }
    this.camP = { eye: eye, look: look, fov: fov, asp: asp }; this.camF = null;
    var vp = M4.mul(M4.persp(fov * Math.PI / 180, asp, 0.5, 400), M4.look(eye, look, upv)), lvp = this.lvp;
    this.parts = this.parts.filter(function (q) { return tt - q.t0 < (q.life || 0.45); });
    if (v && game !== 'globe' && v.score > so.sc) { var cx0 = isA ? eye[0] + Math.sin(so.a) * 2 : 0, cy0 = isA ? 1.5 : 1.5; for (var i = 0; i < 10; i++) { var a = i / 10 * 6.283; this.parts.push({ x: cx0, y: cy0, z: 1, vx: Math.cos(a) * 3, vz: 1, vy: Math.sin(a) * 3 + 1.5, t0: tt, sp: i % 2, life: 0.5, sc: 1.2 }); } }
    if (v) so.sc = v.score;
    if (v && v.id !== so.id) { so.id = v.id; so.t0 = tt; }
    var scene = function () {
      R.draw(self.sky, M4.translate(eye[0], eye[1], eye[2]), { unlit: true, noFog: true, double: true, noCast: true, grain: 0 });
      self.clouds.forEach(function (m, k) { var a = k / 6 * 6.283 + tt * 0.02; R.draw(m, M4.translate(eye[0] + Math.cos(a) * 60, -12 - (k % 3) * 3, eye[2] + Math.sin(a) * 60), { noCast: true, noFog: true, grain: 0 }); });
      if (isA && v) {
        var NM2 = v.N, cc = function (k) { return (k - NM2 / 2 + 0.5) * CS; }, nr = function (cx, cz) { return Math.abs(cx - eye[0]) < 22 && Math.abs(cz - eye[2]) < 22; };
        var wall = function (cx, cz, vert, kx) { if (!nr(cx, cz)) return; R.draw(self.mzW[kx & 3], vert ? M4.mul(M4.translate(cx, 0, cz), M4.rotY(Math.PI / 2)) : M4.translate(cx, 0, cz), { noCast: true }); };
        var PC = ['#f2c98b', '#e8b574'], RC = ['#ffb3c7', '#ffe08a', '#a8e6cf'];
        for (var yy = 0; yy < NM2; yy++) for (var xx = 0; xx < NM2; xx++) {
          var q = v.op[yy * NM2 + xx], cx = cc(xx), cz = cc(yy), kh = (xx * 7 + yy * 13 + (xx * yy)) % 4, inPl = xx >= v.p0 && xx <= v.p1 && yy >= v.p0 && yy <= v.p1;
          if (!nr(cx, cz)) continue;
          R.draw(self.mzTile(inPl ? RC[(xx + yy) % 3] : PC[(xx + yy) % 2]), M4.translate(cx, -0.3, cz), { noCast: true });
          if (q.charAt(0) === '0') wall(cx, cz - CS / 2, false, kh); if (q.charAt(3) === '0') wall(cx - CS / 2, cz, true, kh + 1);
          if (yy === NM2 - 1 && q.charAt(2) === '0') wall(cx, cz + CS / 2, false, kh + 2); if (xx === NM2 - 1 && q.charAt(1) === '0') wall(cx + CS / 2, cz, true, kh + 3);
        }
        for (var py2 = 0; py2 <= NM2; py2++) for (var px2 = 0; px2 <= NM2; px2++) { var pcx = (px2 - NM2 / 2) * CS, pcz = (py2 - NM2 / 2) * CS; if (px2 > v.p0 && px2 <= v.p1 && py2 > v.p0 && py2 <= v.p1) continue; if (nr(pcx, pcz)) R.draw(self.mzP[(px2 + py2 * 3) & 3], M4.translate(pcx, 0, pcz), { noCast: true }); }
        R.draw(self.mzCake, M4.rotY(tt * 0.35), { noCast: true });
        for (var sk = 0; sk < 10; sk++) { var sa = tt * 0.7 + sk / 10 * 6.283, sr = 3.9 + Math.sin(tt * 2 + sk) * 0.3; R.draw(self.spark, M4.mul(M4.translate(Math.cos(sa) * sr, 0.9 + (sk % 3) * 0.9 + Math.sin(tt * 3 + sk * 2) * 0.25, Math.sin(sa) * sr), M4.scale(0.22, 0.22, 0.22)), { noCast: true, unlit: true, grain: 0 }); }
        (env.others || []).forEach(function (o) { var tx2 = cc(o.x), tz2 = cc(o.y), ps = so.op = so.op || {}, pq = ps[o.slot] = ps[o.slot] || [tx2, tz2, 0]; var dx = tx2 - pq[0], dz = tz2 - pq[1]; if (Math.hypot(dx, dz) > 0.05) pq[2] = Math.atan2(dx, dz); pq[0] += dx * 0.12; pq[1] += dz * 0.12;
          drawCandy(R, getChar(R, (env.skins || [])[o.slot] || 0, (env.cols || [])[o.slot] || CANDY_COL[o.slot % 4]), M4.mul(M4.translate(pq[0], 0.1, pq[1]), M4.mul(M4.rotY(pq[2]), M4.scale(2.3, 2.3, 2.3))), tt, false, 0, [1.12, 1.1, 1.1]); });
      } else if (game === 'count' && v) {
        R.draw(self.plateT('stack'), M4.scale(16, 1, 9), null);
        var CH = ['#ff6b6b', '#4dabf7', '#ffd43b', '#69db7c', '#da77f2'][v.kind], age0 = tt - so.t0;
        if (v.ph !== 1) v.items.forEach(function (q, k) { var ag = age0 - k * 0.06, yy = ag < 0 ? 99 : Math.max(0, (1 - ag / 0.4)) * 9; if (v.ph === 2 && v.sel >= 0) yy = 0; R.draw(self.clMesh(CH, v.kind), M4.mul(M4.translate(q[0], yy, q[1]), M4.mul(M4.rotY(q[2]), M4.scale(0.5, 0.5, 0.5))), { noCast: true }); });
        so.cy = (so.cy === undefined ? 12 : so.cy); so.cy += ((v.ph === 1 ? 0 : 12) - so.cy) * Math.min(1, dtm * 9);
        if (so.cy < 11.5) R.draw(self.clocheM, M4.translate(0, so.cy, 0), { noCast: true });
      } else if (game === 'order' && v) {
        var OT = [0, 1, 2, 3, 4, 10, 14, 8], FR = ['#ffb3c7', '#bfe6ff', '#e6d4ff'][v.rd % 3], CK = 1.3, CX = 7.4, TOP = 1.85 * CK + 0.9;
        R.draw(self.ordCake(FR), M4.mul(M4.translate(-CX, 0, 0), M4.scale(CK, CK, CK)), { noCast: true }); R.draw(self.ordCake(FR), M4.mul(M4.translate(CX, 0, 0), M4.scale(CK, CK, CK)), { noCast: true });
        v.tg.forEach(function (q) { R.draw(self.treatM[OT[q[0]]], M4.mul(M4.translate(-CX + q[1] * CK, TOP, q[2] * CK), M4.scale(2.3, 2.3, 2.3)), { noCast: true }); });
        if (v.id !== so.oid) { so.oid = v.id; so.pn = v.pl.length; so.pt = []; for (var oq = 0; oq < v.pl.length; oq++) so.pt[oq] = -9; }
        while (so.pn < v.pl.length) so.pt[so.pn++] = tt; if (so.pn > v.pl.length) so.pn = v.pl.length;
        v.pl.forEach(function (q, k) { var dr = Math.max(0, 1 - (tt - (so.pt[k] || -9)) / 0.25); R.draw(self.treatM[OT[q[0]]], M4.mul(M4.translate(CX + q[1] * CK, TOP + dr * dr * 3, q[2] * CK), M4.scale(2.3, 2.3, 2.3)), { noCast: true }); });
        if (v.hv && v.next >= 0) { var hx = CX + v.hv[0] * CK, hz = v.hv[1] * CK; R.draw(self.ringM, M4.mul(M4.translate(hx, TOP - 0.4, hz), M4.scale(2.2, 1, 2.2)), { noCast: true, unlit: true, grain: 0 }); R.draw(self.treatM[OT[v.next]], M4.mul(M4.translate(hx, TOP + 0.9 + Math.sin(tt * 8) * 0.12, hz), M4.scale(2.6, 2.6, 2.6)), { noCast: true }); }
        if (v.rev) v.tg.forEach(function (q) { R.draw(self.ringM, M4.mul(M4.translate(CX + q[1] * CK, TOP - 0.38, q[2] * CK), M4.scale(2.2, 1, 2.2)), { noCast: true, unlit: true, grain: 0 }); var pq = v.pl.filter(function (z) { return z[0] === q[0]; })[0]; if (pq) for (var li = 1; li < 7; li++) { var f2 = li / 7; R.draw(self.spark, M4.mul(M4.translate(CX + (pq[1] + (q[1] - pq[1]) * f2) * CK, TOP + 0.3, (pq[2] + (q[2] - pq[2]) * f2) * CK), M4.scale(0.14, 0.14, 0.14)), { noCast: true, unlit: true, grain: 0 }); } });
        if (v.next >= 0) R.draw(self.treatM[OT[v.next]], M4.mul(M4.translate(0, 1.8, 8.4), M4.scale(4.2, 4.2, 4.2)), { noCast: true });
      } else if (game === 'shadow' && v) {
        if (v.id !== so.sid2) { so.sid2 = v.id; if (v.ph === 0) so.rot = 0; }
        var P0 = self.unproj(130 / 480, 36 / 270, -0.7), P1 = self.unproj(350 / 480, 136 / 270, -0.7), wcx = (P0[0] + P1[0]) / 2, wcy = (P0[1] + P1[1]) / 2, w3 = Math.abs(P1[0] - P0[0]), h3 = Math.abs(P0[1] - P1[1]), u3 = w3 / 220, rot = so.rot || 0;
        R.draw(self.wallM, M4.mul(M4.translate(wcx, wcy - h3 / 2 - 0.12, -0.85), M4.scale(w3 + 0.4, h3 + 0.24, 1)), { noCast: true, unlit: true, grain: 0, tint: [0.08, 0.05, 0.12] });
        R.draw(self.wallM, M4.mul(M4.translate(wcx, wcy - h3 / 2, -0.75), M4.scale(w3, h3, 1)), { noCast: true, unlit: true, grain: 0 });
        v.shapes.forEach(function (q) { var base = M4.mul(M4.rotY(rot), M4.mul(M4.translate(q.x * u3, q.y * u3, q.z * u3), M4.mul(M4.rotY(q.rot), M4.scale(q.s * 55 * u3, q.s * 55 * u3, q.s * 55 * u3))));
          if (v.ph === 1) R.draw(self.treatM[q.id], M4.mul(M4.translate(wcx, wcy, 0.9), base), { noCast: true });
          else R.draw(self.treatM[q.id], M4.mul(M4.translate(wcx, wcy, -0.6), M4.mul(M4.scale(1, 1, 0.002), base)), { noCast: true, unlit: true, grain: 0, tint: [0.1, 0.07, 0.14] }); });
        var ga = self.unproj(0.5, 0.6, 0.5), gb = self.unproj(0.6, 0.6, 0.5), u2 = Math.abs(gb[0] - ga[0]) / 48;
        v.cands.forEach(function (cd2, k) { var pg = self.unproj((54 + (k % 6) * 62 + 30) / 480, (144 + Math.floor(k / 6) * 52 + 22) / 270, 0.5); R.draw(self.treatM[cd2[0]], M4.mul(M4.translate(pg[0], pg[1], pg[2]), M4.mul(M4.rotY(tt * 0.9 + k), M4.scale(40 * u2, 40 * u2, 40 * u2))), { noCast: true }); });
      } else if (game === 'memory' && v) {
        R.draw(self.plateT('stack'), M4.scale(15, 1, 9.5), null);
        var ms = so.fl = so.fl || [];
        v.cs.forEach(function (c, k) { var cx = (134 + 78 * (k % 4) - 251) * 0.05, cz = (58 + 56 * Math.floor(k / 4) - 142) * 0.05, tg = c[1] ? 1 : 0; ms[k] = (ms[k] === undefined ? tg : ms[k]) + (tg - (ms[k] === undefined ? tg : ms[k])) * Math.min(1, dtm * 14);
          var ang = ms[k] * Math.PI, lift = Math.sin(ms[k] * Math.PI) * 1.2 + (c[1] === 2 ? 0.08 + Math.sin(tt * 4 + k) * 0.06 : 0);
          R.draw(self.cardM(c[0], v.scl[c[0]]), M4.mul(M4.translate(cx, 0.45 + lift, cz), M4.rotX(ang)), { noCast: true }); });
      } else if (game === 'sweetveg' && v) {
        R.draw(self.plateT('stack'), M4.scale(13, 1, 6.5), null);
        var skv = v.st ? Math.sin(tt * 50) * 0.2 : 0, ctv = v.st ? { tint: [0.6, 0.6, 0.7], noCast: true } : { noCast: true };
        [['#ff8fb8', -5.6], ['#6ec9ff', -8.2]].forEach(function (u, k) { R.draw(self.clMesh(u[0], 1), M4.mul(M4.translate(u[1] + (k ? 4.1 : 0) + skv, 0.1, k ? 0.6 : -0.6), M4.scale(0.7, 0.7, 0.7)), ctv); });
        R.draw(self.clMesh('#ffd43b', 2), M4.mul(M4.translate(-6.6 + skv, 0.1, 1.6), M4.scale(0.55, 0.55, 0.55)), ctv);
        [[5.2, -0.6, 0], [8.0, 0.6, 1], [6.6, 1.8, 0]].forEach(function (u) { R.draw(self.vegM[u[2]], M4.mul(M4.translate(u[0] + skv, 0.1, u[1]), M4.scale(1.05, 1.05, 1.05)), ctv); });
        R.draw(self.boardM, M4.mul(M4.translate(skv, 0.3, -3.4), M4.scale(0.82, 0.82, 0.82)), ctv);
      } else if (game === 'simon' && v) {
        R.draw(self.plateT('stack'), M4.scale(12, 1, 8), null);
        var PH = ['#ff6b6b', '#4dabf7', '#ffd43b', '#69db7c'], PX = [[0, -4.2], [5.4, -0.6], [0, 2.4], [-5.4, -0.6]];
        for (var pi = 0; pi < 4; pi++) { var on = v.lit === pi || v.pr === pi, bounce = on ? 0.5 + Math.sin(tt * 30) * 0.05 : 0, sc2 = (on ? 1.12 : 1) * 0.72;
          R.draw(self.padMesh(PH[pi]), M4.mul(M4.translate(PX[pi][0], 0.1 + bounce, PX[pi][1]), M4.scale(sc2, sc2, sc2)), on ? { unlit: true, noCast: true } : (v.bad ? { tint: [0.6, 0.6, 0.7], noCast: true } : { noCast: true })); }
        drawCandy(R, getChar(R, (env.skins || [])[env.me] || 0, (env.cols || [])[env.me] || CANDY_COL[0]), M4.mul(M4.translate(-9, 0.1 + Math.abs(Math.sin(tt * 4)) * 0.12, 2.4), M4.scale(2.3, 2.3, 2.3)), tt, false, 0, [1.12, 1.1, 1.1]);
      } else if (game === 'addmath' && v) {
        R.draw(self.plateT('stack'), M4.scale(11, 1, 6), null);
        var sk2 = v.st ? Math.sin(tt * 50) * 0.2 : 0, ct2 = v.st ? { tint: [0.6, 0.6, 0.7], noCast: true } : { noCast: true };
        R.draw(self.boardM, M4.translate(sk2, 0.3, -1), ct2);
        R.draw(self.clMesh('#ff8fb8', 1), M4.mul(M4.translate(-7.2, 0.1, 0.5), M4.scale(0.6, 0.6, 0.6)), { noCast: true }); R.draw(self.clMesh('#6ec9ff', 1), M4.mul(M4.translate(7.2, 0.1, 0.5), M4.scale(0.6, 0.6, 0.6)), { noCast: true });
      } else if (game === 'color' || game === 'compare') {
        R.draw(self.plateT('stack'), M4.scale(game === 'compare' ? 15 : 9, 1, 6), null);
        var shk = v && v.st ? Math.sin(tt * 50) * 0.25 : 0, pp = v ? Math.min(1, (tt - so.t0) * 9) : 1, ps = 0.85 + 0.15 * pp, ct = v && v.st ? { tint: [0.6, 0.6, 0.7], noCast: true } : { noCast: true };
        if (game === 'color' && v) R.draw(self.clMesh(['#ff6b6b', '#4dabf7', '#ffd43b', '#69db7c'][v.c], v.sh), M4.mul(M4.translate(shk, 0.1, 0), M4.mul(M4.rotY(Math.sin(tt * 1.2) * 0.25), M4.scale(ps * 0.95, ps * 0.95, ps * 0.95))), ct);
        if (game === 'compare' && v) { R.draw(self.cmpMesh('#ff8fb8'), M4.mul(M4.translate(-5.2 + shk, 0.1, 0), M4.scale(ps, ps, ps)), ct); R.draw(self.cmpMesh('#6ec9ff'), M4.mul(M4.translate(5.2 + shk, 0.1, 0), M4.scale(ps, ps, ps)), ct); }
        if (game === 'compare') drawCandy(R, getChar(R, (env.skins || [])[env.me] || 0, (env.cols || [])[env.me] || CANDY_COL[0]), M4.mul(M4.translate(game === 'compare' ? 0 : -6.6, 0.1 + (v && v.st ? 0 : Math.abs(Math.sin(tt * 4)) * 0.15), game === 'compare' ? 4 : 0.5), M4.scale(1.6, 1.6, 1.6)), tt, false, 0, v && v.st ? [1.5, 0.8, 0.8] : [1.12, 1.1, 1.1]);
      } else {
        R.draw(self.plateT('stack'), M4.scale(16, 1, 9), null);
        if (v) v.b.forEach(function (b) { var done = b[0] < v.next, w = v.wr && b[0] === v.wr; R.draw(done ? self.nbG : self.nbY, M4.mul(M4.translate((b[1] - 240) * 0.05, 0.1, (b[2] - 140) * 0.05), M4.scale(1.2, 1.2, 1.2)), w ? { tint: [2.0, 0.5, 0.5] } : null); });
      }
      self.parts.forEach(function (q) { var u = tt - q.t0, Lf = q.life || 0.45, s0 = Math.max(0.05, (1 - u / Lf * 0.75) * (q.sc || 1)); R.draw(q.sp ? self.spark : self.puff, M4.mul(M4.translate(q.x + q.vx * u, q.y + q.vy * u - 6 * u * u, q.z + q.vz * u), M4.scale(s0, s0, s0)), { noCast: true, unlit: true, grain: 0 }); });
    };
    R.shadowBegin(lvp); scene(); R.sceneBegin(vp, eye, HORIZON, 60, 220); scene(); R.post();
  };
  MgView.prototype.drawSolo2 = function (game, v, env, now) {
    var cw = this.cv.clientWidth, ch = this.cv.clientHeight; if (!cw || !ch) return;
    var R = this.R, self = this, tt = now / 1000; this.lastNow = now;
    var gh = Math.max(240, Math.min(720, ch)), gw = Math.max(160, Math.min(1800, Math.round(gh * cw / ch))); R.resize(gw, gh);
    var theme = THEMES[game] ? this.themeMesh(game) : null, isM = game === 'mole', isS = game === 'shoot', isK = game === 'stack', isH = game === 'mash', isRc = game === 'reaction', isG = game === 'timing' || game === 'holdbar', so = this.so2 = this.so2 || { sc: 0, hitT: -9, hh: -1, cy: 0, nc: 0, age: 9, k: -1 };
    if (!this.m2) {
      var b = new G.Builder(); b.jit = 0.01; b.sphere(0.9, 9, 7, '#9a6a40'); b.push().tr(0, 0.1, 0.8); b.sphere(0.25, 5, 4, '#ff8fb8'); b.pop(); b.push().tr(-0.35, 0.45, 0.7); b.sphere(0.12, 4, 3, '#1b1226'); b.pop(); b.push().tr(0.35, 0.45, 0.7); b.sphere(0.12, 4, 3, '#1b1226'); b.pop(); b.push().tr(0, -0.25, 0.8); b.box(0.3, 0.2, 0.1, '#ffffff'); b.pop(); b.push().tr(-0.85, -0.2, 0.3); b.sphere(0.25, 4, 3, '#7a4a2a'); b.pop(); b.push().tr(0.85, -0.2, 0.3); b.sphere(0.25, 4, 3, '#7a4a2a'); b.pop(); this.moleM = R.mesh(b);
      b = new G.Builder(); b.jit = 0.01; b.push(); b.cyl(1.45, 1.55, 0.18, 14, '#a96f45'); b.pop(); b.push().tr(0, 0.1, 0); b.cyl(1.1, 1.1, 0.12, 14, '#120a06'); b.pop(); this.holeM = R.mesh(b);
      b = new G.Builder(); b.jit = 0.01; b.push().tr(0, 0, 0); b.cyl(0.14, 0.14, 2.6, 6, '#c98a5a'); b.pop(); b.push().tr(0, 2.5, 0); b.box(1.5, 0.9, 0.9, '#ff6f9c'); b.pop(); this.malletM = R.mesh(b);
      b = new G.Builder(); b.jit = 0.01; b.push().rx(Math.PI / 2); b.cyl(1, 1, 0.2, 16, '#ff5d73'); b.pop(); b.push().tr(0, 0, 0.12).rx(Math.PI / 2); b.cyl(0.74, 0.74, 0.1, 16, '#ffffff'); b.pop(); b.push().tr(0, 0, 0.2).rx(Math.PI / 2); b.cyl(0.46, 0.46, 0.1, 14, '#ff5d73'); b.pop(); b.push().tr(0, 0, 0.28).rx(Math.PI / 2); b.cyl(0.2, 0.2, 0.1, 10, '#ffd43b'); b.pop(); this.targM = R.mesh(b);
      b = new G.Builder(); b.jit = 0.01; b.push(); b.cyl(0.95, 0.14, 2.4, 10, { t: '#e0a860', b: '#c98a5a', s: '#e0a860', sf: function (i) { return i % 2 ? '#e0a860' : '#c98a5a'; } }); b.pop(); b.push().tr(0, 2.5, 0); b.sphere(1.0, 9, 7, '#ff8fb8'); b.pop(); b.push().tr(0, 3.4, 0); b.sphere(0.85, 9, 7, '#fff4f8'); b.pop(); b.push().tr(0, 4.2, 0); b.sphere(0.7, 8, 6, '#a8683a'); b.pop(); b.push().tr(0, 4.95, 0); b.sphere(0.25, 5, 4, '#ff3d4e'); b.pop(); this.coneM = R.mesh(b);
      var vr = [['#f2c98b', '#ffb3cc'], ['#8a5a3a', '#fff4f8'], ['#ffb3c7', '#fffaf0'], ['#a8d98a', '#fff4f8']]; this.stM = vr.map(function (c) { var bb = new G.Builder(); bb.jit = 0.004; bb.box(1, 0.7, 1, c[0]); bb.push().tr(0, 0.7, 0); bb.box(1.03, 0.12, 1.03, '#fffaf0'); bb.pop(); bb.push().tr(0, 0.82, 0); bb.box(1.04, 0.18, 1.04, c[1]); bb.pop(); [-0.36, -0.1, 0.18, 0.4].forEach(function (dx, q) { bb.push().tr(dx, 0.5 - (q % 2) * 0.12, 0.5); bb.box(0.12, 0.4 + (q % 2) * 0.12, 0.06, c[1]); bb.pop(); }); return R.mesh(bb); });
      b = new G.Builder(); b.jit = 0.01; b.sphere(0.5, 8, 6, '#ff2a44'); b.push().tr(0, 0.5, 0).rz(0.3); b.box(0.08, 0.4, 0.08, '#4a7a2a'); b.pop(); this.chS = R.mesh(b);
      b = new G.Builder(); b.jit = 0.01; b.push(); b.cyl(1.9, 1.9, 0.5, 14, '#ff8fb8'); b.pop(); b.push().tr(0, 0.5, 0); b.cyl(1.7, 1.7, 0.5, 14, '#fff4f8'); b.pop(); b.push().tr(0, 1.0, 0); b.cyl(1.5, 1.5, 0.5, 14, '#e9a76b'); b.pop(); b.push().tr(0, 1.5, 0); b.sphere(0.3, 6, 5, '#ff3d4e'); b.pop(); this.cakeM = R.mesh(b);
      b = new G.Builder(); b.jit = 0.01; b.push(); b.cyl(0.18, 1.0, 2.4, 10, '#ffffff'); b.pop(); b.push().tr(0, -0.35, 0); b.cyl(0.05, 0.16, 0.4, 8, '#ffb3cc'); b.pop(); b.push().tr(0, 2.3, 0); b.sphere(1.05, 9, 6, '#ffb3cc'); b.pop(); this.bagM = R.mesh(b);
      b = new G.Builder(); b.jit = 0.01; b.push(); b.cyl(2.4, 2.6, 0.7, 16, '#ff6fa8'); b.pop(); b.push().tr(0, 0.7, 0); b.cyl(2.0, 2.4, 0.3, 16, '#ffd6e6'); b.pop(); this.btnM = R.mesh(b);
      b = new G.Builder(); b.jit = 0.005; b.box(1, 1, 1, '#ffffff'); this.ubox = R.mesh(b);
      this.m2 = 1;
    }
    var eye, look, fov = 52, asp = cw / ch;
    if (isK) { var nL = v ? v.layers.length : 1; so.cy += (Math.max(0, nL - 4) * 0.9 - so.cy) * 0.08; }
    if (isG) { eye = [0, 7.2, 14]; look = [0, 1.4, 0]; fov = 54; } else if (isK) { eye = [0, so.cy + 4.8, 17]; look = [0, so.cy + 2.2, 0]; fov = 55; } else if (isH) { eye = [0, 5.4, 13.5]; look = [0, 2.6, 0]; fov = 56; } else if (isRc) { eye = [0, 5.2, 15]; look = [0, 4.0, 0]; fov = 56; } else
    if (isM) { eye = [0, 17, 14]; look = [0, 0, 0.8]; } else if (isS) { eye = [0, 6.9, 17.5]; look = [0, 6.7, 0]; fov = 58; } else { eye = [0, 5.2, 14]; look = [0, 3.4, 0]; fov = 56; }
    this.camP = isS || isM ? { eye: eye, look: look, fov: fov, asp: asp } : null; this.camF = null;
    var vp = M4.mul(M4.persp(fov * Math.PI / 180, asp, 0.5, 400), M4.look(eye, look, [0, 1, 0])), lvp = this.lvp;
    if (isS) { var Ld = R.light; lvp = M4.mul(M4.ortho(-20, 20, -20, 20, 1, 100), M4.look([Ld[0] * 30, 6 + Ld[1] * 30, 0 + Ld[2] * 30], [0, 6, 0], [0, 1, 0])); }
    if (isM && v) v.m.forEach(function (q) { if (q[1] === 2 && so.hh !== q[0] + '_' + Math.floor(now / 400)) { } });
    this.parts = this.parts.filter(function (q) { return tt - q.t0 < (q.life || 0.45); });
    if (isG && v && v.id !== so.k) { so.k = v.id; if (v.held && v.pts >= 20) { for (var i4 = 0; i4 < 14; i4++) { var a4 = i4 / 14 * 6.283; self.parts.push({ x: (v.zc * 2 - 1) * 7, y: 1.5, z: 0, vx: Math.cos(a4) * 3, vz: 1.5, vy: 2.5 + (i4 % 3), t0: tt, sp: i4 % 2, life: 0.6, sc: 1.3 }); } } }
    if (isK && v) { if (v.cuts.length && v.nc !== so.nc) { so.nc = v.nc; } if (v.flash && !so.fl) { for (var i = 0; i < 12; i++) { var a = i / 12 * 6.283; self.parts.push({ x: 0, y: (v.layers.length) * 0.9, z: 2, vx: Math.cos(a) * 3, vz: 1, vy: 2.5, t0: tt, sp: 1, life: 0.5, sc: 1.4 }); } } so.fl = v.flash; }
    if (isH && v && v.age < 60 && so.age > v.age) { for (var i2 = 0; i2 < 6; i2++) { var a2 = i2 / 6 * 6.283; self.parts.push({ x: 0, y: 3.6, z: 0, vx: Math.cos(a2) * 3, vz: 1.4, vy: 2 + (i2 % 3), t0: tt, sp: i2 % 2, life: 0.4, sc: 1.1 }); } }
    if (isH && v) so.age = v.age;
    if (isRc && v && v.id !== so.k) { so.k = v.id; if (v.held && v.lp > 0) { for (var i3 = 0; i3 < 14; i3++) { var a3 = i3 / 14 * 6.283; self.parts.push({ x: 0, y: 2.2, z: 0, vx: Math.cos(a3) * 3, vz: 1, vy: 2.5, t0: tt, sp: 1, life: 0.6, sc: 1.3 }); } } }
    if (isM && v) v.m.forEach(function (q) { if (q[1] === 2 && q[2] < 0.1 && so.hitH !== q[0] + '_' + so.sc) { so.hitH = q[0] + '_' + so.sc; var hx = ((q[0] % 3) - 1) * 4.95, hz = (Math.floor(q[0] / 3) - 1) * 4.9; for (var i = 0; i < 8; i++) { var a = i / 8 * 6.283; self.parts.push({ x: hx, y: 1.4, z: hz, vx: Math.cos(a) * 2.4, vz: Math.sin(a) * 2.4, vy: 2.4, t0: tt, sp: 1, life: 0.5, sc: 1.2 }); } } });
    if (isS && v) v.fl.forEach(function (f) { if (f[2] >= 240 && f[2] < 330 && so.fk !== f[0] + '_' + f[1]) { so.fk = f[0] + '_' + f[1]; for (var i = 0; i < 10; i++) { var a = i / 10 * 6.283; self.parts.push({ x: (f[0] - 240) * 0.06, y: (240 - f[1]) * 0.06 + 1, z: 0.5, vx: Math.cos(a) * 3, vz: 1, vy: Math.sin(a) * 3, t0: tt, sp: 1, life: 0.5, sc: 1.4 }); } } });
    var scene = function () {
      R.draw(self.sky, M4.translate(eye[0], eye[1], eye[2]), { unlit: true, noFog: true, double: true, noCast: true, grain: 0 });
      self.clouds.forEach(function (m, k) { var a = k / 6 * 6.283 + tt * 0.02; R.draw(m, M4.translate(eye[0] + Math.cos(a) * 60, -12 - (k % 3) * 3, eye[2] + Math.sin(a) * 60), { noCast: true, noFog: true, grain: 0 }); });
      if (isM) {
        R.draw(theme.tray, null, null);
        for (var h = 0; h < 9; h++) { var hx = ((h % 3) - 1) * 4.95, hz = (Math.floor(h / 3) - 1) * 4.9; R.draw(self.holeM, M4.translate(hx, 0, hz), null); }
        if (v) v.m.forEach(function (q) {
          if (!q[1]) return; var hx = ((q[0] % 3) - 1) * 4.95, hz = (Math.floor(q[0] / 3) - 1) * 4.9, u = q[1] === 2 ? 1 : q[2];
          R.draw(self.moleM, M4.mul(M4.translate(hx, -1.7 + (q[1] === 2 ? 1 - q[2] * 0.5 : u) * 2.5, hz), M4.scale(1.15, q[1] === 2 ? 0.75 : 1.15, 1.15)), q[1] === 2 ? { tint: [2.0, 0.45, 0.45] } : null);
        });
      } else if (isS) {
        R.draw(self.tray, M4.mul(M4.translate(0, -0.6, 0), M4.scale(1.1, 1, 1.0)), null);
        var bw = new G.Builder(); if (!self.shW) { bw.jit = 0.01; bw.push().tr(0, 7, -2); bw.box(40, 20, 0.8, '#e8f4ff'); bw.pop(); for (var i = -6; i <= 6; i++) { bw.push().tr(i * 3, 7, -1.5); bw.box(0.25, 20, 0.2, '#b9d9f5'); bw.pop(); } self.shW = R.mesh(bw); }
        R.draw(self.shW, null, null);
        if (!self.cakeT) { var cb = new G.Builder(); cb.jit = 0.008; cb.cyl(1, 1, 0.55, 16, { t: '#f0bd7e', b: '#d49a5a', s: '#e9a76b' }); cb.push().tr(0, 0.55, 0); cb.cyl(1.03, 1.03, 0.14, 16, '#fffaf0'); cb.pop(); cb.push().tr(0, 0.69, 0); cb.cyl(1, 1, 0.5, 16, { t: '#f0bd7e', b: '#d49a5a', s: '#e9a76b' }); cb.pop(); cb.push().tr(0, 1.19, 0); cb.cyl(1.06, 1.0, 0.3, 16, '#ffb3cc'); cb.pop(); cb.push().tr(0, 1.55, 0); cb.sphere(0.28, 7, 5, '#ff2a44'); cb.pop(); self.cakeT = R.mesh(cb); }
        if (v) v.tg.forEach(function (q, k) { var x = (q[0] - 240) * 0.06, y = (240 - q[1]) * 0.06 + 1, r = q[2] * 0.06 * 1.6, sc = r * (1 - q[3] * 0.25), pop = Math.min(1, q[3] * 8); R.draw(self.targM, M4.mul(M4.translate(x, y, -0.8), M4.mul(M4.rotY(Math.sin(tt * 3 + k) * 0.2), M4.scale(sc * pop, sc * pop, sc * pop))), { noCast: true }); });
        if (v) v.fl.forEach(function (f) { var FT = 240, x = (f[0] - 240) * 0.06, y = (240 - f[1]) * 0.06 + 1, r = f[3] * 0.06 * 1.6;
          if (f[2] < FT) { var p0 = f[2] / FT; R.draw(self.targM, M4.mul(M4.translate(x, y, -0.8), M4.scale(r, r, r)), { noCast: true });
            R.draw(self.cakeT, M4.mul(M4.translate(x * p0, -1.5 + (y + 1.5) * p0 + Math.sin(p0 * 3.14) * 1.6, 8 - 8.8 * p0), M4.mul(M4.rotX(0.9 + p0 * 6), M4.scale(0.75 - p0 * 0.25, 0.75 - p0 * 0.25, 0.75 - p0 * 0.25))), { noCast: true }); return; }
          var u = (f[2] - FT) / 1100, yy = y - u * u * 0.9, al = Math.min(1, 1.7 - u * 1.7); if (al <= 0) return; var sq = Math.min(1, (f[2] - FT) / 90);
          R.draw(self.puff, M4.mul(M4.translate(x, yy, -0.75), M4.scale(r * 1.8 * (0.4 + 0.6 * sq), r * 1.4 * (0.4 + 0.6 * sq), 0.12)), { noCast: true, alpha: al, tint: [1.5, 0.9, 1.1] });
          for (var sp = 0; sp < 6; sp++) { var sa = sp / 6 * 6.283 + 0.4; R.draw(self.puff, M4.mul(M4.translate(x + Math.cos(sa) * r * 1.1 * sq, yy + Math.sin(sa) * r * 0.9 * sq - u * u * 0.6, -0.72), M4.scale(r * 0.38, r * 0.38, 0.1)), { noCast: true, alpha: al, tint: sp % 2 ? [1.7, 1.6, 1.5] : [1.4, 0.7, 0.8] }); }
          R.draw(self.puff, M4.mul(M4.translate(x, yy - r * 0.9 - u * 0.5, -0.72), M4.scale(r * 0.5, r * 0.9 * (0.5 + u), 0.1)), { noCast: true, alpha: al * 0.8, tint: [1.4, 0.8, 0.9] }); });
      } else if (isG) {
        var hb = game === 'holdbar', X0 = -7, WD = 14, ub = self.ubc = self.ubc || {};
        var bx = function (x, y, z, w, h, d, hex) { var m = ub[hex]; if (!m) { var b0 = new G.Builder(); b0.jit = 0.005; b0.box(1, 1, 1, hex); m = ub[hex] = R.mesh(b0); } R.draw(m, M4.mul(M4.translate(x, y, z), M4.scale(w, h, d)), null); };
        R.draw(self.plateT('stack'), M4.scale(10, 1, 6), null);
        if (v && !v.over) {
          bx(0, 0.5, 0, WD + 0.7, 0.9, 2.8, '#3a2158');
          bx(X0 + v.zc * WD, 1.05, 0, Math.max(0.9, v.zw * 2 * WD), 0.4, 2.5, '#3fd45a');
          if (hb) bx(X0 + v.pos * WD / 2, 1.1, 0, Math.max(0.01, v.pos * WD), 0.42, 2.2, v.held && v.pts >= 20 ? '#ffd43b' : '#ff8fb8');
          else { var mx = X0 + v.pos * WD; bx(mx, 2.0, 0, 0.35, 2.6, 2.9, v.held ? '#ffd43b' : '#ffffff'); }
          for (var di = 0; di < v.n; di++) R.draw(self.puff, M4.mul(M4.translate((di - (v.n - 1) / 2) * 1.5, 7.5, -1), M4.scale(0.55, 0.55, 0.55)), { noCast: true, unlit: true, grain: 0, tint: di < v.k ? [1.6, 1.4, 0.4] : [0.5, 0.5, 0.6] });
        }
        var cj = v && v.held && v.pts >= 20 ? Math.abs(Math.sin(tt * 10)) * 0.8 : 0;
        drawCandy(R, getChar(R, (env.skins || [])[env.me] || 0, (env.cols || [])[env.me] || CANDY_COL[0]), M4.mul(M4.translate(0, 0.1 + cj, -3.6), M4.scale(2.6, 2.6, 2.6)), tt, false, 0, [1.12, 1.1, 1.1]);
      } else if (isK) {
        R.draw(self.plateT('stack'), M4.scale(7.5, 1, 7.5), null);
        if (v) {
          if (so.nl !== v.layers.length) { so.nl = v.layers.length; so.lt = tt; } var lu = tt - (so.lt || -9), sqy = lu < 0.8 ? 1 - 0.28 * Math.exp(-lu * 6) * Math.cos(lu * 22) : 1, nL2 = v.layers.length;
          v.layers.forEach(function (l, i) { var top = i === nL2 - 1, sy = top ? sqy : 1, sw = Math.sin(tt * 1.6 + i * 0.4) * 0.012 * i; R.draw(self.stM[i % 4], M4.mul(M4.translate((l[0] + l[1] / 2 - 240) * 0.05 + sw, i * 0.9, 0), M4.scale(l[1] * 0.05, 0.9 * sy, 3.2)), null); });
          if (v.layers.length && v.ct >= 0) { var tl = v.layers[nL2 - 1], cu = Math.max(0, (v.ct - 700) / 1000), ctx = (tl[0] + tl[1] / 2 - 240) * 0.05, cty = nL2 * 0.9 + 0.3, ok = v.topW >= 24, cyy, cxx = ctx, csq = 1;
            if (cu < 0.55) { var fu = cu / 0.55; cyy = cty + 6 * (1 - fu * fu); } else if (ok) { var bu = cu - 0.55; cyy = cty + Math.abs(Math.sin(bu * 9)) * 0.9 * Math.exp(-bu * 4); csq = bu < 0.2 ? 0.75 + bu * 1.25 : 1; } else { var bu2 = cu - 0.55; cxx = ctx + Math.min(bu2, 0.5) * 3 + Math.max(0, bu2 - 0.5) * 2.2; cyy = bu2 < 0.5 ? cty + Math.sin(Math.min(1, bu2 * 4) * 3.14) * 0.15 - bu2 * 0.5 : cty - 0.25 - (bu2 - 0.5) * (bu2 - 0.5) * 14; }
            if (cyy > -6) R.draw(self.chS, M4.mul(M4.translate(cxx, cyy, 0.2), M4.mul(M4.rotZ(-(ok ? 0 : Math.max(0, cu - 0.55) * 6)), M4.scale(1.2, 1.2 * csq, 1.2))), { noCast: true }); }
          if (v.cur) R.draw(self.stM[v.layers.length % 4], M4.mul(M4.translate((v.cur[0] + v.cur[1] / 2 - 240) * 0.05, v.layers.length * 0.9 + 0.35, 0), M4.scale(v.cur[1] * 0.05, 0.9, 3.2)), { tint: [1.12, 1.1, 1.05], noCast: false });
          v.cuts.forEach(function (c, k) { var u = c[3] / 1000, y0 = c[2] * 0.9; R.draw(self.stM[c[2] % 4], M4.mul(M4.translate((c[0] + c[1] / 2 - 240) * 0.05 + u * 2 * (c[0] < 240 ? -1 : 1), y0 - 12 * u * u, u * 3), M4.mul(M4.rotZ(u * 3 * (c[0] < 240 ? 1 : -1)), M4.scale(c[1] * 0.05, 0.9, 3.2))), { noCast: true }); });
        }
      } else if (isH) {
        var pr = v ? Math.max(0, 1 - v.age / 110) : 0;
        R.draw(self.plateT('balance'), M4.scale(5.5, 1, 5.5), null);
        R.draw(self.btnM, M4.mul(M4.translate(0, 0.9 - pr * 0.0, 0), M4.scale(1.0, 1 - pr * 0.35, 1.0)), null);
        drawCandy(R, getChar(R, (env.skins || [])[env.me] || 0, (env.cols || [])[env.me] || CANDY_COL[0]), M4.mul(M4.translate(0, 0.9 + 0.3 * (1 - pr * 0.35) + pr * 0.7, 0), M4.scale(1.6, 1.6 * (1 - pr * 0.12), 1.6)), tt, false, 0, [1.12 + pr * 0.4, 1.1 + pr * 0.3, 1.1]);
      } else if (isRc) {
        R.draw(self.plateT('stack'), M4.scale(6.5, 1, 6.5), null);
        self.sp.forEach(function (q, k) { R.draw(self.sprs[k % 5], M4.mul(M4.translate(q[0] * 6, 0.12, q[1] * 6), M4.rotY(q[2])), { noCast: true }); });
        var fl2 = v ? v.fall : -1, held = v && v.held, early = held && v.lp < 0;
        R.draw(self.cakeM, M4.mul(M4.translate(0, 0, 0.5), M4.scale(1.2, 1.2, 1.2)), null);
        R.draw(self.bagM, M4.mul(M4.translate(Math.sin(tt * 30) * (fl2 < 0 && !held && v && v.ok === false ? 0.03 : 0), 7.2, 0.5), M4.scale(1.0, 1.0, 1.0)), early ? { tint: [1.6, 0.6, 0.6] } : null);
        if (fl2 >= 0) R.draw(self.dropM, M4.mul(M4.translate(0, 7.0 - fl2 * 4.3, 0.5), M4.scale(1.3, 1.3 + fl2 * 0.5, 1.3)), { noCast: true });
        if (held && v.lp > 0) R.draw(self.dropM, M4.mul(M4.translate(0, 2.7, 0.5), M4.scale(2.2, 0.6, 2.2)), { noCast: true });
        drawCandy(R, getChar(R, (env.skins || [])[env.me] || 0, (env.cols || [])[env.me] || CANDY_COL[0]), M4.mul(M4.translate(-4.4, 0.1, 1.5), M4.mul(M4.rotY(0.5), M4.scale(1.6, 1.6, 1.6))), tt, false, 0, held && v.lp > 0 ? [1.4, 1.35, 0.8] : [1.12, 1.1, 1.1]);
      } else {
        R.draw(self.plateT('balance'), M4.scale(5.5, 1, 5.5), null);
        self.sp.forEach(function (q, k) { R.draw(self.sprs[k % 5], M4.mul(M4.translate(q[0] * 5, 0.12, q[1] * 5), M4.rotY(q[2])), { noCast: true }); });
        var a = v ? v.a : 0, fl = v ? v.fall : -1, bad = Math.abs(a) > 0.4, tilt = -a, cy = 0, cx = 0;
        if (fl >= 0) { var dir = a >= 0 ? 1 : -1; tilt = -dir * Math.min(1.6, 0.5 + fl * 2.4); cy = -Math.min(1.7, fl * 3.4); cx = dir * fl * 3; }
        drawCandy(R, getChar(R, (env.skins || [])[env.me] || 0, (env.cols || [])[env.me] || CANDY_COL[0]), M4.mul(M4.translate(0, 0.1, 0), M4.mul(M4.rotZ(fl >= 0 ? 0 : -a * 0.18), M4.scale(2.3, 2.3, 2.3))), tt, false, 0, fl >= 0 ? [1.5, 1.5, 0.8] : [1.12, 1.1, 1.1]);
        R.draw(self.coneM, M4.mul(M4.translate(cx, 2.5 + cy, 1.3), M4.mul(M4.rotZ(tilt), M4.scale(0.9, 0.9, 0.9))), bad && fl < 0 ? { tint: [1.5, 0.8, 0.8] } : null);
      }
      self.parts.forEach(function (q) { var u = tt - q.t0, Lf = q.life || 0.45, s0 = Math.max(0.05, (1 - u / Lf * 0.75) * (q.sc || 1)); R.draw(q.sp ? self.spark : self.puff, M4.mul(M4.translate(q.x + q.vx * u, q.y + q.vy * u - 6 * u * u, q.z + q.vz * u), M4.scale(s0, s0, s0)), { noCast: true, unlit: true, grain: 0 }); });
    };
    R.shadowBegin(lvp); scene(); R.sceneBegin(vp, eye, HORIZON, 60, 220); scene(); R.post();
    if (v && typeof v.score === 'number') so.sc = v.score;
  };
  MgView.prototype.drawSolo = function (game, v, env, now) {
    if (game === 'balance' || game === 'mash' || game === 'reaction' || game === 'slice' || game === 'holdbar') return this.drawSolo4(game, v, env, now);
    if (game === 'mole' || game === 'shoot' || game === 'stack') return this.drawSolo2(game, v, env, now);
    if (game === 'maze' || game === 'numbers' || game === 'color' || game === 'compare' || game === 'simon' || game === 'addmath' || game === 'memory' || game === 'sweetveg' || game === 'count' || game === 'order' || game === 'shadow') return this.drawSolo5(game, v, env, now);
    var cw = this.cv.clientWidth, ch = this.cv.clientHeight; if (!cw || !ch) return;
    var R = this.R, self = this, tt = now / 1000, dt = Math.min(0.1, this.lastNow ? (now - this.lastNow) / 1000 : 0.016), K = 0.06; this.lastNow = now;
    var gh = Math.max(240, Math.min(720, ch)), gw = Math.max(160, Math.min(1800, Math.round(gh * cw / ch))); R.resize(gw, gh);
    this._rowInit(); var theme = this.themeMesh(game), isR = game === 'runner', isB = game === 'basket', so = this.so = this.so || { x: 0, hit: -9, sc: 0, h: 0 };
    if (!v) v = isR ? { h: 0, obs: [], t: 0, stun: 0, score: 0 } : { x: 240, d: [], score: 0, stun: 0 };
    var cx = isR ? 0 : (v.x - 240) * K; so.x += (cx - so.x) * Math.min(1, dt * 25);
    if (!isR && !isB && v.hits > (so.hits || 0)) { so.hit = tt; for (var q = 0; q < 10; q++) { var qa = q / 10 * 6.283; this.parts.push({ x: so.x, y: 1.4, z: 2, vx: Math.cos(qa) * 2.6, vz: Math.sin(qa) * 1.2, vy: 2.5, t0: tt, life: 0.6, sc: 1.6 }); } }
    if (!isR && !isB) so.hits = v.hits;
    if (isB && v.score !== so.sc) { var up = v.score > so.sc; for (var q2 = 0; q2 < 8; q2++) { var qb = q2 / 8 * 6.283; this.parts.push({ x: so.x, y: 3, z: 2, vx: Math.cos(qb) * 2.2, vz: Math.sin(qb) * 1, vy: 2.4, t0: tt, sp: up ? 1 : 0, life: 0.5, sc: up ? 1 : 1.5 }); } so.sc = v.score; }
    if (isR && v.stun && !so.stn) so.hit = tt; so.stn = v.stun;
    this.parts = this.parts.filter(function (q) { return tt - q.t0 < (q.life || 0.45); });
    var eye, look, fov;
    if (isR) { eye = [4.5, 4.6, 14]; look = [4.5, 1.8, 0]; fov = 52; } else { eye = [0, 9.5, 18]; look = [0, 5, 0]; fov = 62; }
    this.camF = null;
    var vp = M4.mul(M4.persp(fov * Math.PI / 180, cw / ch, 0.5, 400), M4.look(eye, look, [0, 1, 0])), lvp = this.lvp;
    if (isR) { var Ld = R.light; lvp = M4.mul(M4.ortho(-16, 16, -16, 16, 1, 90), M4.look([4.5 + Ld[0] * 28, Ld[1] * 28, Ld[2] * 28], [4.5, 0, 0], [0, 1, 0])); }
    var scroll = isR ? (v.t || 0) / 1000 * (v.spd || 330) * 0.05 : 0, skin = (env.skins || [])[env.me] || 0, col = (env.cols || [])[env.me] || CANDY_COL[0], zc = 2.0;
    var scene = function () {
      R.draw(self.sky, M4.translate(eye[0], eye[1], eye[2]), { unlit: true, noFog: true, double: true, noCast: true, grain: 0 });
      self.clouds.forEach(function (m, k) { var a = k / 6 * 6.283 + tt * 0.02; R.draw(m, M4.translate(eye[0] + Math.cos(a) * 60, -12 - (k % 3) * 3, eye[2] + Math.sin(a) * 60), { noCast: true, noFog: true, grain: 0 }); });
      if (isR) {
        R.draw(theme.tray, M4.mul(M4.translate(6, 0, 0), M4.scale(1.5, 1, 0.5)), null);
        self.sp.forEach(function (q, k) { var x = ((q[0] * 20 - scroll) % 44 + 44) % 44 - 14; R.draw(self.sprs[k % 5], M4.mul(M4.translate(x, 0.12, q[1] * 3.4), M4.rotY(q[2])), { noCast: true }); });
        for (var m0 = 0; m0 < 9; m0++) { var mx = ((m0 * 5 - scroll) % 45 + 45) % 45 - 14; R.draw(self.shd, M4.mul(M4.translate(mx, 0.08, 3.1), M4.scale(1.6, 1, 0.5)), { noCast: true }); }
        var ubr = self.ubc = self.ubc || {}, rb = function (x, y, z, w, h, d, hex) { var m = ubr[hex]; if (!m) { var b0 = new G.Builder(); b0.jit = 0.005; b0.box(1, 1, 1, hex); m = ubr[hex] = R.mesh(b0); } R.draw(m, M4.mul(M4.translate(x, y - h / 2, z), M4.scale(w, h, d)), null); };
        (v.obs || []).forEach(function (o) { var cn = Math.round(o[1] / 36), x0 = (o[0] - (v.px || 90)) * 0.05, s0 = 0.8; for (var oc = 0; oc < cn; oc++) R.draw(self.obT[Math.min(4, Math.max(1, o[2]))], M4.mul(M4.translate(x0 + (oc + 0.5) * 1.8, 0, 0), M4.scale(s0, s0, s0)), null); });
      } else {
        R.draw(theme.tray, null, null);
        self.sp.forEach(function (q, k) { R.draw(self.sprs[k % 5], M4.mul(M4.translate(q[0] * 13.8, 0.12, q[1] * 7.0), M4.rotY(q[2])), { noCast: true }); });
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) { R.draw(theme.deco, M4.translate(c[0] * 15.7, 0, c[1] * 8.7), null); });
        (v.d || []).forEach(function (d, k) {
          var x = (d[0] - 240) * K, y = (245 - d[1]) * K + (isB ? 3.0 : 1.6), near = Math.max(0.3, 1 - y / 14);
          R.draw(self.shd, M4.mul(M4.translate(x, 0.1, zc), M4.scale((isB ? 1.0 : 1.2) * near, 1, (isB ? 1.0 : 1.2) * near)), { noCast: true, tint: !isB ? [1.6, 0.5, 0.6] : [1, 1, 1] });
          if (!isB) R.draw(self.dropM, M4.mul(M4.translate(x, y, zc), M4.mul(M4.rotY(tt * 3 + k), M4.scale(2.3, 2.3, 2.3))), { noCast: true });
          else if (d[2] === 1) R.draw(self.vegM, M4.mul(M4.translate(x, y - 0.4, zc), M4.mul(M4.rotY(tt * 2 + k), M4.scale(1.4, 1.4, 1.4))), { noCast: true });
          else if (d[2] === 2) R.draw(self.cdG, M4.mul(M4.translate(x, y, zc), M4.mul(M4.rotZ(0.4 * Math.sin(tt * 3 + k)), M4.mul(M4.rotY(tt * 2 + k), M4.scale(1.9, 1.9, 1.9)))), { noCast: true, tint: [1.4, 1.3, 0.9] });
          else R.draw(self.cdK[k % 4], M4.mul(M4.translate(x, y, zc), M4.mul(M4.rotZ(0.4 * Math.sin(tt * 3 + k)), M4.mul(M4.rotY(tt * 2 + k), M4.scale(1.6, 1.6, 1.6)))), { noCast: true });
        });
      }
      var hit = tt - so.hit, hurt = hit < 0.6, jy = isR ? (v.h || 0) * 0.05 : 0, y0 = 0.1 + jy + (isB ? 0 : 0);
      var wob = hurt ? Math.sin(tt * 30) * 0.15 : 0, base = M4.mul(M4.translate(isR ? 0 : so.x, y0, isR ? 0 : zc), M4.mul(M4.rotY(isR ? Math.PI / 2 : 0), M4.mul(M4.rotZ(wob), M4.scale(1.5, 1.5 * (hurt && !isB ? 0.85 : 1) * (isR && v.sl ? 0.5 : 1), 1.5))));
      drawCandy(R, getChar(R, skin, col), base, tt, isR ? (!jy && !v.sl) : false, 0, hurt && !isB ? [1.8, 0.8, 0.8] : [1.12, 1.1, 1.1]);
      if (isB) R.draw(self.basketM, M4.mul(M4.translate(so.x, 2.0, zc), M4.scale(1.3, 1.3, 1.3)), null);
      if (hurt && !isB) for (var si = 0; si < 3; si++) { var sa = tt * 7 + si * 2.094; R.draw(self.spark, M4.mul(M4.translate((isR ? 0 : so.x) + Math.cos(sa) * 0.8, y0 + 3.3, (isR ? 0 : zc) + Math.sin(sa) * 0.8), M4.scale(1.4, 1.4, 1.4)), { noCast: true, unlit: true, grain: 0 }); }
      self.parts.forEach(function (q) { var u = tt - q.t0, Lf = q.life || 0.45, s0 = Math.max(0.05, (1 - u / Lf * 0.75) * (q.sc || 1)); R.draw(q.sp ? self.spark : self.puff, M4.mul(M4.translate(q.x + q.vx * u, q.y + q.vy * u - 6 * u * u, q.z + q.vz * u), M4.scale(s0, s0, s0)), { noCast: true, unlit: true, grain: 0 }); });
    };
    R.shadowBegin(lvp); scene(); R.sceneBegin(vp, eye, HORIZON, 60, 220); scene(); R.post();
  };
  MgView.prototype.drawArena = function (game, snap, env, now, asp) {
    if (game === 'cream') return this.drawCreamFP(snap, env, now);
    if (game === 'dodge') return this.drawDodge(snap, env, now, asp);
    if (game === 'catcher') return this.drawRow(game, snap, env, now);
    if (game === 'bomb') return this.drawBomb(snap, env, now, asp);
    var cw = this.cv.clientWidth, ch = this.cv.clientHeight; if (!cw || !ch) return [];
    var R = this.R, self = this, tt = now / 1000, dt = Math.min(0.1, this.lastNow ? (now - this.lastNow) / 1000 : 0.016); this.lastNow = now;
    var gh = Math.max(240, Math.min(720, ch)), gw = Math.max(160, Math.min(1800, Math.round(gh * cw / ch))); R.resize(gw, gh);
    var K = 0.06, Rw = snap && snap.R ? snap.R * K : 6.9, list = [], isC = game === 'coinrush', isT = isC || game === 'tag' || game === 'hill' || game === 'chairs' || game === 'wall' || game === 'redlight', isF = game === 'floor';
    var big = isC || game === 'tag', TS = big ? 2 : game === 'chairs' ? 1.6 : 1, CS = big ? 1.5 : game === 'chairs' ? 1.35 : isF ? 1.45 : game === 'wall' ? 1.6 : 1.25, isRL = game === 'redlight' || game === 'wall', follow = game === 'hill' || big || game === 'chairs' || isF, cam3 = isRL || follow;
    var theme = THEMES[game] ? this.themeMesh(game) : null;
    if (snap) snap.P.forEach(function (p) {
      var o = self.st[p[0]]; var tx = (p[1] - 240) * K, tz = (p[2] - 140) * K;
      if (!o) o = self.st[p[0]] = { x: tx, z: tz, h: isRL ? Math.PI / 2 : 0, mv: 0, rdy: 0, fall: -1, alive: !!p[3], stun: 0 };
      var px = o.x, pz = o.z;
      if (o.fall < 0) { var k = Math.min(1, dt * 20); o.x += (tx - o.x) * k; o.z += (tz - o.z) * k; }
      var vx = (o.x - px) / Math.max(dt, 0.001), vz = (o.z - pz) / Math.max(dt, 0.001), sp = Math.hypot(vx, vz);
      o.mv += ((sp > 0.6 ? 1 : 0) - o.mv) * Math.min(1, dt * 10);
      if (sp > 0.8 && o.fall < 0) { var th = Math.atan2(vx, vz), d = th - o.h; d = Math.atan2(Math.sin(d), Math.cos(d)); o.h += d * Math.min(1, dt * 14); }
      var rdv = game === 'chairs' ? p[5] : p[4], pushed = PUSHG[game];
      if (game !== 'redlight' && o.rdy && !rdv && p[3] && (PUSHG[game] || DASHG[game])) {
        o.dash = tt;
        for (var q = 0; q < 8; q++) { var qa = pushed ? o.h + (q - 3.5) * 0.28 : o.h + Math.PI + (q - 3.5) * 0.35, sg = pushed ? 3.2 : 2.2; self.parts.push({ x: o.x + (pushed ? Math.sin(o.h) * 0.9 : 0), y: pushed ? 0.9 : 0.15, z: o.z + (pushed ? Math.cos(o.h) * 0.9 : 0), vx: Math.sin(qa) * sg, vz: Math.cos(qa) * sg, vy: pushed ? 0.4 : 1.3 + (q % 3) * 0.4, t0: tt }); }
      }
      o.rdy = rdv;
      var stun = (PUSHG[game] || game === 'tag') ? p[5] : 0;
      if (stun && !o.stun) { for (var q2 = 0; q2 < 6; q2++) { var qb = q2 / 6 * 6.283; self.parts.push({ x: o.x, y: 1.6, z: o.z, vx: Math.cos(qb) * 1.8, vz: Math.sin(qb) * 1.8, vy: 1.6, t0: tt, sp: 1 }); } }
      o.stun = stun; o.pcd = (p[6] || 0);
      o.sit = game === 'chairs' && p[3] && p[4] === 1;
      if (o.sit && snap.Ch) { var ch0 = snap.Ch.filter(function (c) { return c[2] === p[0]; })[0]; if (ch0) { o.x += ((ch0[0] - 240) * K - o.x) * Math.min(1, dt * 14); o.z += ((ch0[1] - 140) * K - o.z) * Math.min(1, dt * 14); } }
      if (o.alive && !p[3]) { o.alive = false; o.fall = tt; o.fvx = vx * 0.5; o.fvz = vz * 0.5; }
      if (!o.alive && p[3] && game !== 'redlight') { o.alive = true; o.fall = -1; o.x = tx; o.z = tz; }   // เริ่มรอบใหม่
      list.push({ slot: p[0], o: o, ready: !!rdv });
    });
    this.parts = this.parts.filter(function (q) { return tt - q.t0 < (q.life || 0.45); });
    if (game === 'tag' && snap) {
      if (this.lastIt !== undefined && this.lastIt !== snap.it && snap.it >= 0 && this.st[snap.it]) { var no = this.st[snap.it]; for (var q = 0; q < 9; q++) { var qa = q / 9 * 6.283; this.parts.push({ x: no.x, y: 0.8, z: no.z, vx: Math.cos(qa) * 2.6, vz: Math.sin(qa) * 2.6, vy: 2.2, t0: tt }); } }
      this.lastIt = snap.it;
    }
    if (game === 'tag' && snap) {
      if (snap.done && snap.it >= 0 && !this.tagB && this.st[snap.it]) {
        this.tagB = tt; var bo = this.st[snap.it];
        for (var q3 = 0; q3 < 40; q3++) { var a3 = q3 / 40 * 6.283 + (q3 % 3) * 0.3, s3 = 3 + (q3 % 6) * 1.2; this.parts.push({ x: bo.x, y: 1.2, z: bo.z, vx: Math.cos(a3) * s3, vz: Math.sin(a3) * s3, vy: 3 + (q3 % 4) * 1.3, t0: tt, sp: q3 % 2, life: 1.2, sc: 3 + (q3 % 3) }); }
      }
      if (!snap.done) this.tagB = 0;
    }
    if (game === 'chairs' && snap) { if (snap.ph !== this.chPh) { this.chPh = snap.ph; this.chT = tt; } }
    var coins = [];
    if (isC && snap && snap.C) {
      var cur = {}; snap.C.forEach(function (c) { var k = c[0] + '_' + c[1]; cur[k] = c; if (!self.coinT[k]) self.coinT[k] = tt; coins.push({ x: (c[0] - 240) * K, z: (c[1] - 140) * K, g: c[2], t0: self.coinT[k] }); });
      Object.keys(self.prevC).forEach(function (k) { if (!cur[k]) { var c = self.prevC[k]; for (var q = 0; q < 7; q++) { var qa = q / 7 * 6.283; self.parts.push({ x: (c[0] - 240) * K, y: 1.2, z: (c[1] - 140) * K, vx: Math.cos(qa) * 2.4, vz: Math.sin(qa) * 2.4, vy: 2.4, t0: tt, sp: 1 }); } delete self.coinT[k]; } });
      this.prevC = cur;
    }
    // ---- กล้อง ----
    var eye, look, fov = 50, Fv = null, cp = [0, 0], me = env.me, mo = this.st[me];
    if (game === 'wall') { Fv = [1, 0]; eye = [-27, 18, 0]; look = [-8.5, 0, 0]; fov = 62; if (mo && (mo.fall < 0)) this.cp = [mo.x, mo.z]; }
    else if (cam3 && mo) {
      if (mo.fall < 0 && (mo.alive || game === 'redlight') || !this.cp) this.cp = [mo.x, mo.z];
      if (!this.cs) this.cs = [this.cp[0], this.cp[1]];
      var kk = Math.min(1, dt * 5); this.cs[0] += (this.cp[0] - this.cs[0]) * kk; this.cs[1] += (this.cp[1] - this.cs[1]) * kk;
      cp = this.cs;
      if (isRL) {
        Fv = [1, 0]; var czz = clamp(cp[1], -4, 4);
        eye = [cp[0] - 7.2, 4.7, czz]; look = [cp[0] + 10, 0.9, czz]; fov = 58;
      } else {
        var P2 = { hill: [8, 8.5], coinrush: [8.5, 10.5], tag: [8, 12.5], chairs: [9, 13.5], floor: [8, 12.5] }[game], ex = isF ? 7.5 : 14.8 * TS - 9, ez = isF ? 4.6 : 7.8 * TS - 3;
        var fx = clamp(cp[0], -ex, ex), fz = clamp(cp[1], -ez, ez);
        eye = [fx, P2[1], fz + P2[0]]; look = [fx, 0, fz - 1.5];
      }
    } else if (game === 'sumo') { eye = [0, 14, 17.5]; look = [0, 0, 0.4]; fov = 52; cam3 = false; }
    else { cam3 = false; Fv = null; eye = isF ? [0, 27, 19] : [0, 22 * TS, 15.5 * TS]; look = [0, 0, 0.5]; }
    this.camF = Fv;
    var vp = M4.mul(M4.persp(fov * Math.PI / 180, cw / ch, 0.5, 400), M4.look(eye, look, [0, 1, 0]));
    var lvp = this.lvp;
    if (cam3) { var Ld = R.light, Lc = [look[0], 0, look[2]], SH = game === 'wall' ? 22 : 17; lvp = M4.mul(M4.ortho(-SH, SH, -SH, SH, 1, 90), M4.look([Lc[0] + Ld[0] * 28, Ld[1] * 28, Lc[2] + Ld[2] * 28], Lc, [0, 1, 0])); }
    var skins = env.skins || [], cols = env.cols || [];
    var scene = function () {
      R.draw(self.sky, M4.translate(eye[0], eye[1], eye[2]), { unlit: true, noFog: true, double: true, noCast: true, grain: 0 });
      self.clouds.forEach(function (m, k) { var a = k / 6 * 6.283 + tt * 0.02; R.draw(m, M4.translate(eye[0] + Math.cos(a) * 60, -12 - (k % 3) * 3, eye[2] + Math.sin(a) * 60), { noCast: true, noFog: true, grain: 0 }); });
      if (isF && snap && snap.T) {
        var Gd = snap.G || [8, 5, 40, 25, 50, 44], tw = Gd[4], th2 = Gd[5];
        snap.T.forEach(function (st, k) {
          var c = k % Gd[0], r = Math.floor(k / Gd[0]), x = (Gd[2] + (c + 0.5) * tw - 240) * K, z = (Gd[3] + (r + 0.5) * th2 - 140) * K, y = 0, rz = 0, rx = 0, tint = null, cr = false, crG = 0;
          if (st === 2) { if (self.tileT[k] === undefined) { self.tileT[k] = tt; for (var pq = 0; pq < 10; pq++) { var pa = pq / 10 * 6.283; self.parts.push({ x: x, y: 0.3, z: z, vx: Math.cos(pa) * 2.4, vz: Math.sin(pa) * 2.4, vy: 2.2 + (pq % 3), t0: tt, sp: pq % 3 === 0, life: 0.7, sc: 1.4 }); } } var f = tt - self.tileT[k]; if (f > 1.3) return;
            for (var pi = 0; pi < 3; pi++) for (var pj = 0; pj < 2; pj++) { var ox = (pi - 1) * tw * K * 0.33, oz = (pj - 0.5) * th2 * K * 0.5, hs = Math.sin(k * 7.3 + pi * 2.1 + pj * 4.7), vx = ox * 3 + hs * 0.8, vz = oz * 3 + Math.cos(k * 5.1 + pi + pj * 3) * 0.8, yy = 2.4 * f - 9 * f * f; R.draw(self.tiles[(c + r) % 2], M4.mul(M4.translate(x + ox + vx * f, yy, z + oz + vz * f), M4.mul(M4.mul(M4.rotZ(f * 3 * hs), M4.rotX(f * 2.2 * Math.cos(hs * 5))), M4.scale(tw / 50 * 0.32, 1, th2 / 44 * 0.48))), { noCast: true }); }
            return; }
          else { delete self.tileT[k]; if (st === 1) { if (!self.crT) self.crT = {}; if (self.crT[k] === undefined) self.crT[k] = tt; var ca = tt - self.crT[k]; crG = Math.min(1, ca / 0.45); var w = Math.sin(tt * 45 + k) * (0.4 + Math.min(ca, 1.6)); x += w * 0.03; y = w * 0.02 - 0.04 * crG; z += Math.cos(tt * 38 + k) * 0.012 * (0.4 + Math.min(ca, 1.6)); tint = [1 - 0.22 * crG, 1 - 0.34 * crG, 1 - 0.38 * crG]; cr = true; } else if (self.crT) delete self.crT[k]; }
          var tm0 = M4.mul(M4.translate(x, y, z), M4.mul(M4.mul(M4.rotZ(rz), M4.rotX(rx)), M4.scale(tw / 50, 1, th2 / 44)));
          R.draw(self.tiles[(c + r) % 2], tm0, tint ? { tint: tint } : null);
          if (cr) R.draw(self.crk[(self.crT && self.crT[k] !== undefined ? tt - self.crT[k] : 0) < 0.25 ? 0 : (tt - self.crT[k]) < 0.7 ? 1 : 2], M4.mul(tm0, M4.scale(1.1, 1, 1.1)), { noCast: true, unlit: true });
        });
      } else if (isT) {
        var trM = theme ? theme.tray : self.tray;
        if (isRL && snap) {
          var Ln = ((snap.L || 1800) - 240) * K + 6, sx = (Ln + 12.6 + 16) / 29.6, cx0 = (Ln - 12.6 - 16 + 2 * 12.6) / 2 - 12.6 + 12.6;
          if (game === 'wall') { var wsx = (Ln + 14.64) / 29.6; R.draw(trM, M4.mul(M4.translate((Ln - 14.64) / 2, 0, 0), M4.scale(wsx, 1, 1)), null); } else
          R.draw(trM, M4.mul(M4.translate((-12.6 - 8 + Ln + 8) / 2, 0, 0), M4.scale(sx, 1, 1)), null);
          var seg = 27.6, base0 = Math.floor(cp[0] / seg) * seg;
          for (var sk = -1; sk <= 2; sk++) self.sp.forEach(function (q, k) { R.draw(self.sprs[k % 5], M4.mul(M4.translate(base0 + sk * seg + q[0] * 13.8, 0.12, q[1] * 7.0), M4.rotY(q[2])), { noCast: true }); });
        } else {
          R.draw(trM, game === 'wall' ? M4.mul(M4.translate(-1.65, 0, 0), M4.scale(0.89, 1, 1)) : TS === 1 ? null : M4.scale(TS, 1, TS), null);
          for (var ps = 0; ps < (TS > 1.5 ? 2 : 1); ps++) self.sp.forEach(function (q, k) { R.draw(self.sprs[k % 5], M4.mul(M4.translate(q[0] * 13.8 * TS * (ps ? -0.93 : 1), 0.12, q[1] * 7.0 * TS * (ps ? -0.9 : 1)), M4.rotY(q[2] + ps)), { noCast: true }); });
          if (theme) [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) { R.draw(theme.deco, M4.translate(c[0] * (14.9 * TS + 0.8), 0, c[1] * (7.9 * TS + 0.8)), { noCast: false }); });
        }
        if ((game === 'tag' || isC) && snap && snap.Ob) snap.Ob.forEach(function (o) {
          var cx = (o[0] - 240) * K, cz = (o[1] - 140) * K, hw = o[2] * K, hh2 = o[3] * K, along = hw >= hh2, len = (along ? hw : hh2) * 2, cnt = Math.max(1, Math.round(len / 1.5)), sg = len / cnt, tn = game === 'tag' ? [1.7, 1.45, 1.4] : [1.0, 1.0, 1.0];
          for (var bi = 0; bi < cnt; bi++) for (var lv = 0; lv < 2; lv++) { var off = -len / 2 + sg * (bi + 0.5); R.draw(self.wallB, M4.mul(M4.translate(cx + (along ? off : 0), lv * 1.5, cz + (along ? 0 : off)), M4.scale(along ? sg : hw * 2, 1.5, along ? hh2 * 2 : sg)), { tint: tn }); }
        });
        if (isRL && snap) {
          var fxp = ((snap.L + 1) - 240) * K;
          R.draw(self.fin, M4.translate(fxp, 0.07, 0), { noCast: true });
          R.draw(self.pole, M4.translate(fxp + 1.2, 0, -7.2), null); R.draw(self.pole, M4.translate(fxp + 1.2, 0, 7.2), null);
          [-1, 1].forEach(function (sd) { R.draw(self.bulb, M4.mul(M4.translate(fxp + 1.2, 3.7, 7.2 * sd), M4.scale(0.9, 0.9, 0.9)), { unlit: true, tint: [1.4, 1.1, 0.4] }); });
          snap.P.forEach(function (p, k) { R.draw(self.lane[k % 2], M4.mul(M4.translate((fxp - 12.6) / 2, 0.07, (p[2] - 140) * K), M4.scale((fxp + 12.6 + 0.4) / 24.6, 1, 1)), { noCast: true }); });
        }
        if (game === 'chairs' && snap && snap.Ch) snap.Ch.forEach(function (c, k) {
          var u = Math.min(1, Math.max(0, (tt - self.chT - k * 0.08) / 0.35)), pop = u < 1 ? 1.25 * Math.sin(u * Math.PI / 2 * 1.0) : 1, sc = snap.ph === 'show' ? 1 : pop; if (snap.ph === 'music') return;
          var m0 = M4.mul(M4.translate((c[0] - 240) * K, 0, (c[1] - 140) * K), M4.scale(sc * 1.35, sc * 1.35, sc * 1.35));
          R.draw(self.stool, m0, null); R.draw(self.cush, m0, c[2] >= 0 ? { tint: [0.6, 1.25, 0.65] } : { tint: [1.2, 1.1, 0.5] });
        });
        if (game === 'hill' && snap) {
          var zx = (snap.zx - 240) * K, zz = (snap.zy - 140) * K, zr = 40 * K, ins = list.filter(function (L) { return L.o.fall < 0 && Math.hypot(L.o.x - zx, L.o.z - zz) < zr; }), pu = 1 + Math.sin(tt * 5) * 0.03;
          var tn2 = ins.length === 0 ? [1, 1, 1] : ins.length === 1 ? hexRGB(cols[ins[0].slot] || CANDY_COL[ins[0].slot % 4], 1.15) : [1.5 + 0.4 * Math.sin(tt * 12), 0.55, 0.55];
          R.draw(self.zone, M4.mul(M4.translate(zx, 0, zz), M4.scale(zr * pu, 1, zr * pu)), { noCast: true, tint: tn2 });
          if (ins.length === 1 && Math.floor(tt * 6) !== self.lastSpk) { self.lastSpk = Math.floor(tt * 6); self.parts.push({ x: ins[0].o.x + (Math.random() - 0.5) * 0.8, y: 1.2, z: ins[0].o.z, vx: 0, vz: 0, vy: 1.6, t0: tt, sp: 1 }); }
        }
        if (game === 'wall' && snap && snap.Wl) snap.Wl.forEach(function (w) {
          var x = (w[0] - 240) * K, wd = 24 * K;
          if (x > cp[0] + 30 || x < -18) return;
          [[-7.7, (w[1] - w[2] / 2 - 140) * K], [(w[1] + w[2] / 2 - 140) * K, 7.7]].forEach(function (sg) {
            var len = sg[1] - sg[0], cnt = Math.max(1, Math.round(len / 1.45)), q = len / cnt;
            for (var bi = 0; bi < cnt; bi++) for (var lv = 0; lv < 3; lv++) R.draw(self.wallB, M4.mul(M4.translate(x, lv * 1.45, sg[0] + q * (bi + 0.5)), M4.scale(wd, 1.45, q)), null);
          });
        });
        coins.forEach(function (c) {
          var u = Math.min(1, (tt - c.t0) / 0.3), sc = 1 + 0.3 * Math.sin(u * Math.PI) * (u < 1 ? 1 : 0), bob = 1.25 + Math.sin(tt * 4 + c.x) * 0.15 + (c.g === 3 ? 1.3 : c.g === 2 ? 0.8 : 0);
          R.draw(self.shd, M4.mul(M4.translate(c.x, 0.1, c.z), M4.scale((0.8 + c.g * 0.25) * u * (1 - (bob - 1.25) * 0.08), 1, (0.8 + c.g * 0.25) * u * (1 - (bob - 1.25) * 0.08))), { noCast: true, alpha: 0.55 });
          var cs0 = c.g === 3 ? 3.4 : c.g === 2 ? 2.7 : 2.0; R.draw(c.g === 3 ? self.coinG : c.g === 2 ? self.coinS : self.coinC, M4.mul(M4.translate(c.x, bob, c.z), M4.mul(M4.rotY(tt * 3 + c.z), M4.scale(cs0 * u * sc, cs0 * u * sc, cs0 * u * sc))), { noCast: true, tint: [1.15, 1.12, 1.05] });
        });
      } else {
        var pl = theme ? self.plateT(game) : self.plate; R.draw(pl, M4.scale(Rw, 1, Rw), null);
        var n = Math.round(Rw * 6.2);
        for (var i = 0; i < n; i++) { var a = i / n * 6.2832; R.draw(self.pipe, M4.mul(M4.translate(Math.cos(a) * Rw * 0.985, 0.05, Math.sin(a) * Rw * 0.985), M4.scale(1, 0.75, 1)), { noCast: true }); }
        self.sp.forEach(function (q, k) { R.draw(self.sprs[k % 5], M4.mul(M4.translate(q[0] * Rw, 0.12, q[1] * Rw), M4.rotY(q[2])), { noCast: true }); });
        if (game === 'sumo') for (var ci = 0; ci < 10; ci++) { var ca = ci / 10 * 6.2832 + 0.3; R.draw(theme.deco, M4.mul(M4.translate(Math.cos(ca) * (Rw + 1.1), 0, Math.sin(ca) * (Rw + 1.1)), M4.scale(1.4, 1.4, 1.4)), null); }
      }
      list.forEach(function (L) {
        var o = L.o, y = 0.1, rz = 0, x = o.x, z = o.z;
        var shr = 1;
        if (game === 'tag' && self.tagB && snap.it === L.slot && tt - self.tagB > 0.06) return;
        if (o.fall >= 0) { var f = tt - o.fall; if (f > 1.6) return; if (game === 'chairs') { y = 0.1 + f * 3; rz = f * 9; shr = Math.max(0, 1 - f * 1.7); if (shr <= 0) return; } else { y = 0.1 - 5 * f * f; x += o.fvx * f; z += o.fvz * f; rz = f * 4; } }
        if (o.sit) y += 0.62;
        if (o.stun && o.fall < 0) { rz += Math.sin(tt * 30) * 0.18; }
        var dd = o.dash ? tt - o.dash : 9, sq = dd < 0.22 ? 1 + 0.25 * Math.sin(dd / 0.22 * Math.PI) : 1;
        var base = M4.mul(M4.translate(x, y, z), M4.mul(M4.rotY(o.h), M4.mul(M4.rotX(o.fall >= 0 ? 0.6 : 0.0), M4.mul(M4.rotZ(rz), M4.scale(1.05 * shr * CS, 1.05 * shr * CS * (o.sit ? 0.9 : 1), 1.05 * shr * CS * sq)))));
        var isIt = game === 'tag' && snap && snap.it === L.slot, pl2 = 0.5 + 0.5 * Math.sin(tt * 10);
        drawCandy(R, getChar(R, skins[L.slot] || 0, cols[L.slot] || CANDY_COL[L.slot % 4]), base, tt, o.mv > 0.5 || dd < 0.3, (o.sit ? 0 : L.slot * 1.7), isIt ? (snap.imm ? [1.6, 1.6, 1.7] : (Math.floor(tt * 7) % 2 ? [2.0, 0.6, 0.6] : [1.2, 1.2, 0.5])) : o.stun ? [1.5, 1.5, 0.7] : [1.12, 1.1, 1.1]);
        if (o.stun && o.fall < 0) for (var si = 0; si < 4; si++) { var sa = tt * 7 + si * 1.571; R.draw(self.spark, M4.mul(M4.translate(x + Math.cos(sa) * 0.9 * CS, y + 2.3 * CS, z + Math.sin(sa) * 0.9 * CS), M4.scale(1.9, 1.9, 1.9)), { noCast: true, unlit: true, grain: 0 }); }
      });
      self.parts.forEach(function (q) { var u = tt - q.t0, Lf = q.life || 0.45, s0 = Math.max(0.05, (1 - u / Lf * 0.75) * (q.sc || 1)); R.draw(q.sp ? self.spark : self.puff, M4.mul(M4.translate(q.x + q.vx * u, q.y + q.vy * u - 3 * u * u, q.z + q.vz * u), M4.scale(s0, s0, s0)), { noCast: true, unlit: true, grain: 0 }); });
    };
    R.shadowBegin(lvp); scene(); R.sceneBegin(vp, eye, HORIZON, 60, cam3 ? 320 : 200); scene(); R.post();
    var out = [];
    list.forEach(function (L) {
      if (L.o.fall >= 0) return;
      var q = [L.o.x, 2.4 * CS, L.o.z], m = vp, w = m[3] * q[0] + m[7] * q[1] + m[11] * q[2] + m[15]; if (w <= 0.1) return; var v = M4.pt(m, q);
      out.push({ slot: L.slot, x: v[0] / w * 0.5 + 0.5, y: 0.5 - v[1] / w * 0.5, ready: L.ready, it: game === 'tag' && snap && snap.it === L.slot });
    });
    return out;
  };
  MgView.prototype.plateT = function (game) {
    this.pt2 = this.pt2 || {}; if (this.pt2[game]) return this.pt2[game];
    var th = THEMES[game], b = new G.Builder(), i; b.jit = 0.015;
    for (i = 0; i < 3; i++) { b.push().tr(0, -0.57 - i * 0.55, 0); b.cyl(1 - i * 0.02, 1 - i * 0.02 + 0.01, 0.55, 36, th.layers[i]); b.pop(); }
    b.push().tr(0, -0.02, 0); b.cyl(0.985, 1.0, 0.12, 36, th.top); b.pop();
    return (this.pt2[game] = this.R.mesh(b));
  };

  /* ---------- มุมมอง ---------- */
  function View(canvas, overlay) {
    this.cv = canvas; this.ov = overlay || null; this.R = new G.Renderer(canvas);
    this.H = 270; this.W = 480; this.sc = 1; this.ox = 0; this.g = null; this.ok = false;
    this.tokPos = {}; this.cam = { a: -Math.PI / 2, rc: 18, yc: 12, rl: 0, yl: 5.2 };
    var Lc = [0, 6, 0], Ld = this.R.light; this.lvp = M4.mul(M4.ortho(-21, 21, -21, 21, 1, 130), M4.look([Lc[0] + Ld[0] * 50, Lc[1] + Ld[1] * 50, Lc[2] + Ld[2] * 50], Lc, [0, 1, 0]));
    var R = this.R; this.slabs = {};
    this.mesh = {
      body: R.mesh(buildCakeBody()), ground: R.mesh(buildGround()), sky: R.mesh(buildSky()), cherry: R.mesh(buildCherry()),
      coin: R.mesh(buildCoin()), spike: R.mesh(buildSpike()), gift: R.mesh(buildGift()), gbase: R.mesh(buildGiftBase()), glid: R.mesh(buildGiftLid()), flag: R.mesh(buildFlag()), stall: R.mesh(buildStall()), marker: R.mesh(buildMarker()),
      clouds: [R.mesh(buildCloud(1)), R.mesh(buildCloud(2)), R.mesh(buildCloud(3)), R.mesh(buildCloud(4)), R.mesh(buildCloud(5)), R.mesh(buildCloud(6))],
      chars: customChars(R) || null,
      candy: CANDY_COL.map(function (cc) { return makeCandy(R, cc); }), pill: makePill(R)
    };
    var bb = new G.Builder(); bb.cyl(0.6, 0.6, 5, 12, '#ffffff', { noTop: true, noBot: true }); this.mesh.beam = R.mesh(bb);
    var rb = new G.Builder(), ri;
    for (ri = 0; ri < 28; ri++) { var r0 = ri / 28 * Math.PI * 2, r1 = (ri + 1) / 28 * Math.PI * 2; rb.quad([Math.cos(r0), 0, Math.sin(r0)], [Math.cos(r0) * 0.8, 0, Math.sin(r0) * 0.8], [Math.cos(r1) * 0.8, 0, Math.sin(r1) * 0.8], [Math.cos(r1), 0, Math.sin(r1)], '#ffffff'); }
    this.mesh.ring = R.mesh(rb);
    var pb = new G.Builder(); pb.jit = 0.03;
    pb.push().tr(0, 0, 0); pb.cyl(0.62, 0.66, 0.06, 18, { t: '#fff0f6', b: '#ffb3cf', s: '#ffd0e2' }); pb.pop();
    [[0.38, 0.22, 0.4, 0.0], [0.34, 0.2, 0.5, 0.1], [0.28, 0.18, 0.6, 0.2], [0.2, 0.15, 0.68, 0.3]].forEach(function (q, qi) { pb.push().tr(q[3] * 0.4, 0.06 + qi * 0.14, 0.05); pb.cyl(q[0] * 0.6, q[0], 0.17, 14, qi % 2 ? '#fff6fa' : '#ffc2d8'); pb.pop(); });
    pb.push().tr(0.08, 0.64, 0.05).rz(0.3); pb.cyl(0.0, 0.1, 0.2, 8, '#ffffff'); pb.pop();
    this.mesh.puddle = R.mesh(pb);
    var ib = new G.Builder(); ib.jit = 0.03;
    for (ri = 0; ri < 7; ri++) { var ia = ri / 7 * Math.PI * 2; ib.push().tr(Math.cos(ia) * 0.5, 0, Math.sin(ia) * 0.5).rz(Math.cos(ia) * -0.25).rx(Math.sin(ia) * 0.25); ib.cyl(0.02, 0.11 + (ri % 3) * 0.02, 0.8 + (ri % 3) * 0.22, 5, { t: '#e8f8ff', b: '#7fc8f0', s: '#b6e4ff' }); ib.pop(); }
    ib.push().tr(0, -0.02, 0); ib.cyl(0.55, 0.6, 0.06, 14, '#cdeeff'); ib.pop();
    this.mesh.ice = R.mesh(ib);
  }
  View.prototype.tilePos = tilePos;
  View.prototype.updateCam = function (t, dt, snap) {
    var c = this.cam, k = snap ? 1 : 1 - Math.exp(-dt * (t.rate || 4.5));
    c.a += angDiff(t.a, c.a) * k;
    ['rc', 'yc', 'rl', 'yl'].forEach(function (key) { c[key] += (t[key] - c[key]) * k; });
  };
  View.prototype.resize = function () {
    var cw = this.cv.clientWidth, ch = this.cv.clientHeight; if (!cw || !ch) { this.ok = false; return false; }
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5), pw = Math.round(cw * dpr), ph = Math.round(ch * dpr);
    var gh = PIX_H, gw = Math.max(160, Math.min(960, Math.round(PIX_H * cw / ch))); this.R.resize(gw, gh);
    this.sc = ph / this.H; this.W = pw / this.sc; this.asp = pw / ph;
    if (this.ov) {
      if (this.ov.width !== pw || this.ov.height !== ph) { this.ov.width = pw; this.ov.height = ph; }
      this.g = this.ov.getContext('2d'); this.g.setTransform(this.sc, 0, 0, this.sc, 0, 0); this.g.clearRect(0, 0, this.W, this.H);
    }
    this.ok = true; return true;
  };
  View.prototype._camera = function () {
    var c = this.cam, cx = Math.cos(c.a), cz = Math.sin(c.a);
    this.eye = [cx * c.rc, c.yc, cz * c.rc]; var look = [cx * c.rl, c.yl, cz * c.rl];
    var vp = M4.mul(M4.persp(FOV, this.asp, 0.3, 400), M4.look(this.eye, look, [0, 1, 0]));
    if (this.ox) vp = M4.mul(M4.translate(this.ox * 2 / this.W, 0, 0), vp);
    this.vp = vp;
  };
  // โลก -> พิกัดโอเวอร์เลย์ (หน่วย 270 สูง) : [x, y, พิกเซลต่อหน่วยโลก, ความลึก]
  View.prototype.pr = function (x, y, z) {
    var m = this.vp, w = m[3] * x + m[7] * y + m[11] * z + m[15]; if (w < 0.4) return null;
    var cx = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w, cy = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
    return [(cx + 1) / 2 * this.W, (1 - cy) / 2 * this.H, (this.H / 2) / Math.tan(FOV / 2) / w, w];
  };
  View.prototype._slab = function (i, top) {
    var key = i + top; if (!this.slabs[key]) this.slabs[key] = this.R.mesh(buildSlab(i, top, '#e0a56b')); return this.slabs[key];
  };

  View.prototype.draw = function (st, tokens, colors, now, extra) {
    extra = extra || {}; if (!this.resize()) return;
    var R = this.R, M = this.mesh, i, tt = (now || 0) / 1000, self = this;
    this._camera();
    var labels = [], cf = 1, self2 = this;
    var scene = function () {
      var main = R.pass === 'main'; if (main) labels.length = 0;
    R.draw(M.sky, M4.translate(self.eye[0], self.eye[1], self.eye[2]), { unlit: true, noFog: true, double: true, noCast: true, grain: 0 });
    R.draw(M.ground, null, { noCast: true });
    M.clouds.forEach(function (m, k) {
      var a = k / 6 * Math.PI * 2 + tt * 0.01, d = 95 + (k % 3) * 18;
      R.draw(m, M4.mul(M4.translate(Math.cos(a) * d, 24 + (k % 3) * 8, Math.sin(a) * d), M4.rotY(-a)), { noCast: true, tint: [1.08, 1.08, 1.1], grain: 0.05 });
    });
    R.draw(M.body, null, null);
    // ช่องเดิน + ไอคอน
    var layout = st.layout || [], pop = extra.pop || null, hide = extra.hide || {};
    for (i = 0; i <= 23; i++) {
      var type = layout[i] || 'plain'; if (i === 0) type = 'start'; if (hide[i]) type = 'plain';
      var top = type === 'plain' || !TYPE_TOP[type] ? SLAB_PLAIN[i % 4] : TYPE_TOP[type];
      R.draw(self._slab(i, top), null, null);
      var tp = tilePos(i), sc = pop && pop.i === i ? backOut(pop.p * 1.3) : 1, bob = Math.sin(tt * 2 + i) * 0.08;
      if (sc <= 0.001) continue;
      if (type === 'shop') {
        var th = Math.PI / 2 - tp.a;
        R.draw(M.stall, M4.mul(M4.translate(tp.x, tp.y, tp.z), M4.mul(M4.rotY(th), M4.scale(0.5 * sc, 0.5 * sc, 0.5 * sc))), { tint: [0.9, 0.9, 0.95] });
      } else if (type === 'coin' || type === 'minus' || type === 'mystery' || type === 'start') {
        var mesh = type === 'coin' ? M.coin : type === 'minus' ? M.spike : type === 'mystery' ? M.gift : M.flag, yy = tp.y + (type === 'start' ? 0 : 0.5 + bob * 0.5);
        R.draw(mesh, M4.mul(M4.translate(tp.x, yy, tp.z), M4.mul(M4.rotY(tt * 1.2 + i), M4.scale(sc * 0.55, sc * 0.55, sc * 0.55))), null);
      }
    }
    (st.traps || []).forEach(function (tr) { var tq = tilePos(tr[0]), ts = extra.trapS && extra.trapS.i === tr[0] ? extra.trapS.s : 1; if (ts <= 0.01) return; R.draw(M.puddle, M4.mul(M4.translate(tq.x, tq.y + 0.03, tq.z), M4.mul(M4.rotY(tr[0] * 1.3), M4.scale(0.75 * ts, 0.75 * (0.4 + 0.6 * ts), 0.75 * ts))), null); });
    // เชอร์รี่
    cf = extra.cherry === undefined ? 1 : extra.cherry;
    if (cf > 0) {
      var cpop = cf < 1 ? 0.35 + 0.65 * backOut(Math.min(1, cf * 1.4)) : 1;
      R.draw(M.cherry, M4.mul(M4.translate(0, TOP_Y + 0.9 * cpop, 0), M4.mul(M4.rotY(tt * 0.6), M4.scale(cpop, cpop, cpop))), null);
    }
    if (extra.gift) {
      var gf = extra.gift, gm = M4.mul(M4.translate(gf.x, gf.y, gf.z), M4.mul(M4.rotY(gf.ry || 0), M4.rotZ(gf.rz || 0))), gs = gf.s || 1;
      R.draw(M.gbase, M4.mul(gm, M4.scale(gs, gs, gs)), { tint: [1.12, 1.1, 1.1], emis: [0.12, 0.09, 0.18] });
      if (gf.lid > 0.01) R.draw(M.glid, M4.mul(M4.translate(gf.x + (gf.lx || 0), gf.y + 0.45 * gs + (gf.ly || 0), gf.z), M4.mul(M4.rotY((gf.ry || 0) + (gf.lry || 0)), M4.mul(M4.rotZ(gf.lrz || 0), M4.scale(gs * gf.lid, gs * gf.lid, gs * gf.lid)))), { tint: [1.12, 1.1, 1.1], emis: [0.12, 0.09, 0.18] });
    }
    if (extra.cherryX) { var cx = extra.cherryX; R.draw(M.cherry, M4.mul(M4.translate(cx.x, cx.y, cx.z), M4.mul(M4.rotY(cx.ry), M4.scale(cx.s, cx.s, cx.s))), { emis: [0.3, 0.12, 0.12] }); }
    // ตัวละคร
    var eye = self.eye;
    tokens.forEach(function (t) { if (t.hidden) return;
      var w = worldAt(t.idx), hop = w.f > 0 && w.f < 1 ? Math.sin(w.f * Math.PI) * 0.3 : 0, x = w.x, z = w.z, moving = w.f > 0, head;
      if (t.idx < TOP - 0.01) {
        var off = (t.slot - 1.5) * 0.3; x += -Math.sin(w.a) * off; z += Math.cos(w.a) * off;
        var w2 = worldAt(Math.min(TOP, t.idx + 0.2)), dx = w2.x - w.x, dz = w2.z - w.z;
        head = moving && Math.hypot(dx, dz) > 1e-4 ? Math.atan2(dx, dz) : Math.PI / 2 - w.a;
      } else { var sa = t.slot / 4 * Math.PI * 2 + Math.PI / 4; x = Math.cos(sa) * 2.0; z = Math.sin(sa) * 2.0; head = Math.atan2(eye[0] - x, eye[2] - z); }
      var fx = t.fx || {}; if (fx.hide) return;
      var bobv = moving ? Math.abs(Math.sin(tt * 14)) * 0.04 : Math.sin(tt * 2.4 + t.slot) * 0.02, y = w.y + hop + bobv + (fx.lift || 0), s = CH * (fx.scale === undefined ? 1 : fx.scale); head += fx.spin || 0; if (s <= 0.001) { self.tokPos[t.slot] = [x, y, z]; return; }
      if (fx.shake) { x += Math.cos(w.a) * Math.sin(tt * 60) * fx.shake; z += Math.sin(w.a) * Math.sin(tt * 60) * fx.shake; }
      self.tokPos[t.slot] = [x, y, z];
      var bm0 = M4.mul(M4.translate(x, y, z), M4.mul(M4.rotY(head), M4.scale(s, s, s)));
      if (M.chars) R.draw(M.chars[t.slot % 4], bm0, { tint: [1.18, 1.14, 1.14], emis: [0.1, 0.1, 0.1] });
      else drawCandy(R, getChar(R, t.skin || 0, (colors && colors[t.slot]) || CANDY_COL[t.slot % 4]), bm0, tt, moving, t.slot * 1.7, fx.flash ? [1.1 + 1.4 * fx.flash, 1.1 - 0.7 * fx.flash, 1.1 - 0.7 * fx.flash] : t.ice ? [0.78, 1.0, 1.35] : [1.12, 1.1, 1.1]);
      if (t.ice) R.draw(M.ice, M4.mul(M4.translate(x, y - 0.05, z), M4.mul(M4.rotY(0.4 + t.slot), M4.scale(1.0, 1.0, 1.0))), { tint: [0.9, 1.05, 1.2], emis: [0.05, 0.1, 0.16] });
      if (t.turn) R.draw(M.marker, M4.mul(M4.translate(x, y + 1.35 + Math.sin(tt * 4) * 0.1, z), M4.mul(M4.rotY(tt * 3), M4.scale(0.35, 0.5, 0.35))), { unlit: true, noCast: true, emis: [0.25, 0.2, 0], grain: 0 });
      var ro = Math.hypot(x, z), vis = t.idx >= TOP - 0.01 || ro < 0.5 || ((eye[0] - x) * x + (eye[2] - z) * z) / ro > 0.5;
      if (vis && main) labels.push({ t: t, x: x, y: y + 1.2, z: z });
    });
    // พร็อพไอเทม + วงพอร์ทัล (คัตซีน)
    if (extra.props && extra.props.length) {
      if (!self.IM && window.ItemModels) { try { self.IM = window.ItemModels(G, R); } catch (e) { self.IM = null; } }
      if (self.IM) extra.props.forEach(function (pp) {
        var mm = self.IM.mesh[pp.id]; if (!mm || pp.s <= 0.001) return;
        var m = M4.translate(pp.x, pp.y, pp.z); if (pp.ry) m = M4.mul(m, M4.rotY(pp.ry)); if (pp.rx) m = M4.mul(m, M4.rotX(pp.rx)); if (pp.rz) m = M4.mul(m, M4.rotZ(pp.rz));
        var sx = pp.s * (pp.sx || 1), sy = pp.s * (pp.sy || 1);
        R.draw(mm, M4.mul(m, M4.scale(sx, sy, sx)), { tint: [1.12, 1.1, 1.1], emis: pp.emis || [0.1, 0.09, 0.06] });
      });
    }
    (extra.rings || []).forEach(function (rg) {
      var c = G.rgb(rg.col || '#ffffff'), a = rg.a === undefined ? 0.7 : rg.a; if (a <= 0.01) return;
      if (rg.beam) R.draw(M.beam, M4.mul(M4.translate(rg.x, rg.y, rg.z), M4.scale(rg.r, rg.h || 1, rg.r)), { tint: c, emis: [c[0] * 0.5, c[1] * 0.5, c[2] * 0.5], alpha: a, unlit: true, add: !rg.noadd, double: true });
      else R.draw(M.ring, M4.mul(M4.translate(rg.x, rg.y, rg.z), M4.mul(M4.rotY(rg.rot || 0), M4.scale(rg.r, 1, rg.r))), { tint: c, alpha: a, unlit: true, add: !rg.noadd, double: true });
    });
    // เอฟเฟกต์ช่องโผล่ (โปร่งใส)
    if (pop && pop.i >= 0) {
      var q = tilePos(pop.i), pc = G.rgb(TYPE_TOP[layout[pop.i]] || '#ffffff'), pk = Math.min(1, Math.max(0, pop.p));
      R.draw(M.beam, M4.mul(M4.translate(q.x, q.y, q.z), M4.scale(0.55 + pk * 0.5, 1, 0.55 + pk * 0.5)), { tint: pc, emis: [pc[0] * 0.5, pc[1] * 0.5, pc[2] * 0.5], alpha: 0.28 * (1 - pk), unlit: true, add: true, double: true });
      var rs = 0.8 + pk * 2.4; R.draw(M.ring, M4.mul(M4.translate(q.x, q.y + 0.05, q.z), M4.scale(rs, 1, rs)), { tint: pc, alpha: 0.6 * (1 - pk), unlit: true, add: true, double: true });
    }
    };
    R.shadowBegin(this.lvp); scene();
    R.sceneBegin(this.vp, this.eye, HORIZON, 90, 260); scene();
    R.post();
    this._overlay(labels, cf, now, extra);
  };

  View.prototype._overlay = function (labels, cf, now, extra) {
    var g = this.g; if (!g) return; var tt = (now || 0) / 1000, i;
    labels.forEach(function (L) {
      if (L.t.fx && (L.t.fx.hide || (L.t.fx.scale !== undefined && L.t.fx.scale < 0.4))) return;
      var p = this.pr(L.x, L.y, L.z); if (!p) return;
      var nm = (L.t.me ? '★ ' : '') + L.t.name; g.font = 'bold 10px "TAGBA",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      var w = g.measureText(nm).width + 10, x = p[0], y = p[1];
      g.fillStyle = 'rgba(255,255,255,0.88)'; this._pill(g, x - w / 2, y - 7, w, 14, 7); g.fillStyle = '#5a3a55'; g.fillText(nm, x, y + 0.5);
    }, this);
    if (cf > 0 && cf < 1) {     // แสงเปล่งตอนเชอร์รี่โผล่
      var c0 = this.pr(0, TOP_Y + 0.9, 0); if (!c0) return;
      var rr0 = c0[2] * 0.6, gl = Math.min(this.H * 0.4, rr0 * (3 + 4 * Math.sin(cf * Math.PI))), prev = g.globalCompositeOperation;
      g.globalCompositeOperation = 'lighter';
      var rg = g.createRadialGradient(c0[0], c0[1], 0, c0[0], c0[1], gl); rg.addColorStop(0, 'rgba(255,240,150,' + (0.55 * Math.sin(cf * Math.PI)) + ')'); rg.addColorStop(1, 'rgba(255,120,60,0)');
      g.fillStyle = rg; g.fillRect(c0[0] - gl, c0[1] - gl, gl * 2, gl * 2);
      g.fillStyle = 'rgba(255,230,140,' + (0.16 * Math.sin(cf * Math.PI)) + ')';
      for (i = 0; i < 12; i++) { var ra = i / 12 * Math.PI * 2 + tt * 0.8, w2 = 0.09; g.beginPath(); g.moveTo(c0[0], c0[1]); g.lineTo(c0[0] + Math.cos(ra - w2) * gl * 1.5, c0[1] + Math.sin(ra - w2) * gl * 1.5); g.lineTo(c0[0] + Math.cos(ra + w2) * gl * 1.5, c0[1] + Math.sin(ra + w2) * gl * 1.5); g.closePath(); g.fill(); }
      for (i = 0; i < 14; i++) { var sa = i * 2.4 + tt * 1.5, sr = rr0 * (1.2 + ((i * 37) % 10) / 10 * 3.2) * cf, sx = c0[0] + Math.cos(sa) * sr, sy = c0[1] + Math.sin(sa) * sr * 0.8 - cf * rr0, ss = 1.5 + (i % 3);
        g.fillStyle = 'rgba(255,255,220,' + (0.9 * (1 - cf * 0.6)) + ')'; g.fillRect(sx - ss / 2, sy - 0.5, ss, 1); g.fillRect(sx - 0.5, sy - ss / 2, 1, ss); }
      g.globalCompositeOperation = prev;
    }
  };
  View.prototype._pill = function (g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2); g.lineTo(x + r, y + h); g.arc(x + r, y + r, r, Math.PI / 2, Math.PI * 1.5); g.closePath(); g.fill();
  };

  return { CHAR_NAMES: CHAR_NAMES, supported: supported, View: View, CharPreview: CharPreview, CharStage: CharStage, HeadView: HeadView, FinalView: FinalView, portraits: portraits, portrait: portrait, icon3d: icon3d, LobbyView: LobbyView, MgView: MgView };
})();
