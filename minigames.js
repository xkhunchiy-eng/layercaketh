/* มินิเกมแยกจอ: ทุกคนเล่นเกมเดียวกัน (seed เดียวกัน) แล้วแข่งกันที่คะแนน
   ไม่แตะ DOM (วาดผ่าน ctx ที่ส่งเข้ามา) จึงทดสอบด้วย Node ได้
   อินเทอร์เฟซ: make(seed) -> { press(code,t), draw(g,t), score, done(t) }  เวลา t = มิลลิวินาทีนับจากเริ่มเล่น */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CakeMini = factory();
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';
  var W = 480, H = 270;

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0; var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function tri(x) { x = ((x % 2) + 2) % 2; return x <= 1 ? x : 2 - x; }
  function isGo(c) { return c === 'Space' || c === 'Click'; }

  // แถวปุ่มคลิกใต้จอ: n ปุ่ม กว้าง 74 สูง 42
  function rowRect(n, k, y) { var bw = 74, gap = 12, tot = n * bw + (n - 1) * gap, x0 = (W - tot) / 2; return { x: x0 + k * (bw + gap), y: y, w: bw, h: 42 }; }
  function rowHit(n, x, y, ry) { for (var k = 0; k < n; k++) { var q = rowRect(n, k, ry); if (x >= q.x && x <= q.x + q.w && y >= q.y - 6 && y <= q.y + q.h + 6) return k; } return -1; }
  function drawRow(g, labels, colors, y, tcol) {
    for (var k = 0; k < labels.length; k++) { var q = rowRect(labels.length, k, y); g.fillStyle = colors ? colors[k] : '#6c4a99'; g.fillRect(q.x, q.y, q.w, q.h); g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(q.x, q.y, q.w, q.h); g.lineWidth = 1; text(g, labels[k], q.x + q.w / 2, q.y + q.h / 2, labels[k].length > 3 ? 16 : 22, tcol || '#1b1226'); }
  }
  function bg(g, c1, c2) { var gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
  function text(g, s, x, y, size, color) {
    g.font = 'bold ' + size + 'px TAGBA, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 4; g.strokeStyle = '#1b1226'; g.strokeText(s, x, y); g.fillStyle = color || '#fff'; g.fillText(s, x, y);
  }

  /* 1) จังหวะเส้นเขียว */
  function timing(seed) {
    var r = rng(seed), N = 5, zones = [], i;
    for (i = 0; i < N; i++) zones.push({ c: 0.2 + r() * 0.6, w: 0.05 - i * 0.006, period: 1100 - i * 130 });
    var o = { score: 0, k: 0, ts: 600, hold: -1, last: null };
    function pos(t) { var z = zones[o.k]; return tri((t - o.ts) / z.period * 2); }
    o.press = function (c, t) {
      if (!isGo(c) || o.k >= N || t < o.ts || o.hold >= 0) return;
      var z = zones[o.k], p = pos(t), d = Math.abs(p - z.c), pts = Math.max(0, Math.round(20 * (1 - d / 0.35)));
      if (d <= z.w) pts += 5;
      o.score += pts; o.last = { pts: pts, p: p }; o.hold = t + 800;
    };
    o.done = function (t) { return o.k >= N; };
    o.view = function (t) {
      if (o.hold >= 0 && t >= o.hold) { o.k++; o.hold = -1; o.ts = t; }
      if (o.k >= N) return { score: o.score, k: N, n: N, over: true, msg: 'ครบ 5 ครั้ง!', msz: 24, my: 200, id: N * 2 };
      var z = zones[o.k], held = o.hold >= 0;
      return { score: o.score, k: o.k, n: N, zc: z.c, zw: z.w, pos: held ? o.last.p : pos(t), held: held, pts: held ? o.last.pts : 0, id: o.k * 2 + (held ? 1 : 0), msg: held ? '+' + o.last.pts : '', msz: 32, my: 200 };
    };
    o.draw = function (g, t) {
      if (o.hold >= 0 && t >= o.hold) { o.k++; o.hold = -1; o.ts = t; }
      bg(g, '#3a2158', '#1a0f2b');
      if (o.k >= N) { text(g, 'ครบ 5 ครั้ง! คะแนน ' + o.score, W / 2, H / 2, 24); return; }
      var z = zones[o.k], x0 = 40, wd = W - 80;
      g.fillStyle = '#120a1c'; g.fillRect(x0, 110, wd, 50);
      g.fillStyle = '#69db7c'; g.fillRect(x0 + (z.c - z.w) * wd, 110, z.w * 2 * wd, 50);
      var p = o.hold >= 0 ? o.last.p : pos(t);
      g.fillStyle = '#fff'; g.fillRect(x0 + p * wd - 3, 100, 6, 70);
      text(g, 'ครั้งที่ ' + (o.k + 1) + '/' + N, W / 2, 50, 20);
      if (o.last && o.hold >= 0) text(g, '+' + o.last.pts, W / 2, 210, 30, '#ffe066');
      text(g, 'คะแนน ' + o.score, W / 2, 245, 16, '#c9b6e0');
    };
    return o;
  }

  /* 2) ต่อชั้นเค้ก */
  function stack(seed) {
    var LH = 16, LO = 20, HI = 460;
    var o = { score: 0, over: false, layers: [{ x0: 190, w: 100 }], ts: 500, w: 100, flash: -9999, cuts: [] };
    function speed() { return 230 + (o.layers.length - 1) * 18; }
    function xAt(t) { var span = HI - LO - o.w; return LO + tri((t - o.ts) / 1000 * speed() / span) * span; }
    o.press = function (c, t) {
      if (!isGo(c) || o.over || t < o.ts) return;
      var x = xAt(t), prev = o.layers[o.layers.length - 1];
      var ov = Math.min(x + o.w, prev.x0 + prev.w) - Math.max(x, prev.x0);
      if (ov <= 0) { o.over = true; o.tOver = t; o.cuts.push({ x0: x, w: o.w, n: o.layers.length, t: t }); return; }
      if (x < prev.x0 - 4) o.cuts.push({ x0: x, w: prev.x0 - x, n: o.layers.length, t: t }); else if (x + o.w > prev.x0 + prev.w + 4) o.cuts.push({ x0: prev.x0 + prev.w, w: x + o.w - prev.x0 - prev.w, n: o.layers.length, t: t });
      if (Math.abs(x - prev.x0) <= 4) { o.layers.push({ x0: prev.x0, w: prev.w }); o.score += 2; o.flash = t; }
      else { o.layers.push({ x0: Math.max(x, prev.x0), w: ov }); o.w = ov; o.score += 1; }
      o.ts = t;
    };
    o.done = function () { return o.over && (o.lastT || 0) - o.tOver > 3200; };
    o.view = function (t) { o.lastT = t; if (!o.over && t >= 44500) { o.over = true; o.tOver = t; } var topW = o.layers[o.layers.length - 1].w; return { ct: o.over ? t - o.tOver : -1, topW: topW, score: o.score, over: o.over, layers: o.layers.map(function (l) { return [l.x0, l.w]; }), cur: o.over ? null : [xAt(t), o.w], flash: t - o.flash < 500 ? 1 : 0, cuts: o.cuts.filter(function (c) { return t - c.t < 1400; }).map(function (c) { return [c.x0, c.w, c.n, t - c.t]; }), nc: o.cuts.length }; };
    o.draw = function (g, t) {
      bg(g, '#2b1a45', '#12081f');
      var n = o.layers.length, cam = Math.max(0, n - 8) * LH, i, cols = ['#f6c98e', '#f3b3c4', '#e9a76b', '#fff4f8'];
      for (i = 0; i < n; i++) { var y = 250 - i * LH + cam; g.fillStyle = cols[i % 4]; g.fillRect(o.layers[i].x0, y, o.layers[i].w, LH - 1); g.strokeStyle = '#6b3f2a'; g.strokeRect(o.layers[i].x0, y, o.layers[i].w, LH - 1); }
      if (!o.over) { var yy = 250 - n * LH + cam; g.fillStyle = '#ffd43b'; g.fillRect(xAt(t), yy, o.w, LH - 1); }
      text(g, o.over ? 'เค้กล้ม! คะแนน ' + o.score : 'คะแนน ' + o.score, W / 2, 25, 18, o.over ? '#ff8787' : '#fff');
    };
    return o;
  }

  /* 3) ตีตัวตุ่น (กดปุ่มตามหลุม) */
  var MOLE_KEYS = { KeyQ: 0, KeyW: 1, KeyE: 2, KeyA: 3, KeyS: 4, KeyD: 5, KeyZ: 6, KeyX: 7, KeyC: 8 };
  var MOLE_LABEL = ['Q', 'W', 'E', 'A', 'S', 'D', 'Z', 'X', 'C'];
  function mole(seed) {
    var r = rng(seed), ev = [], t = 1500, DUR = 45000;
    while (t < DUR - 1500) { var q = t / DUR; ev.push({ t: t, hole: Math.floor(r() * 9), until: t + Math.round(1700 - 1250 * Math.pow(q, 1.4)), hit: false }); t += Math.round(1100 - 880 * Math.pow(q, 1.3) + r() * 160 * (1 - q)); }
    var o = { score: 0, pops: [] };
    o.press = function (c, tt) {
      if (!(c in MOLE_KEYS)) return;
      var h = MOLE_KEYS[c];
      for (var i = 0; i < ev.length; i++) { var e = ev[i]; if (e.hole === h && !e.hit && tt >= e.t && tt < e.until) { e.hit = true; o.score++; o.pops.push({ h: h, t: tt }); return; } }
    };
    o.click = function (x, y, t) {
      var best = -1, bd = 40;
      for (var h = 0; h < 9; h++) { var d = Math.hypot(x - (150 + (h % 3) * 90), y - (90 + Math.floor(h / 3) * 70 + 6)); if (d < bd) { bd = d; best = h; } }
      if (best >= 0) o.press(Object.keys(MOLE_KEYS)[best], t);
    };
    o.done = function () { return false; };
    o.view = function (tt) {
      var hs = []; for (var h = 0; h < 9; h++) {
        var k = 0, u = 0; ev.forEach(function (e) { if (e.hole === h && !e.hit && tt >= e.t && tt < e.until) { k = 1; u = Math.max(0, Math.min(1, (tt - e.t) / 450, (e.until - tt) / 300)); } });
        o.pops.forEach(function (p) { if (p.h === h && tt - p.t < 400) { k = 2; u = (tt - p.t) / 400; } });
        hs.push([h, k, u]);
      }
      return { m: hs, score: o.score, msg2: 'เหลือ ' + Math.max(0, Math.ceil((DUR - tt) / 1000)) + ' วิ', my2: 250 };
    };
    o.draw = function (g, tt) {
      bg(g, '#4a2f1f', '#2a1a10');
      for (var h = 0; h < 9; h++) {
        var cx = 150 + (h % 3) * 90, cy = 90 + Math.floor(h / 3) * 70;
        g.fillStyle = '#120a06'; g.beginPath(); g.ellipse(cx, cy + 18, 30, 11, 0, 0, Math.PI * 2); g.fill();
        var up = ev.some(function (e) { return e.hole === h && !e.hit && tt >= e.t && tt < e.until; });
        var hitNow = o.pops.some(function (p) { return p.h === h && tt - p.t < 250; });
        if (up || hitNow) { g.fillStyle = hitNow ? '#ffe066' : '#c98a5a'; g.beginPath(); g.arc(cx, cy, 20, Math.PI, 0); g.lineTo(cx + 20, cy + 16); g.lineTo(cx - 20, cy + 16); g.fill(); g.fillStyle = '#1b1226'; g.fillRect(cx - 9, cy - 8, 4, 5); g.fillRect(cx + 5, cy - 8, 4, 5); }
        
      }
      text(g, 'คลิกตัวตุ่น! คะแนน ' + o.score, W / 2, 20, 18);
    };
    return o;
  }

  /* 4) รัวสเปซบาร์ */
  function mash(seed) {
    var RD = 3, ACT = 10000, REST = 2200, T0 = 600, o = { score: 0, rs: [0, 0, 0], t: -9999 };
    function ph(t) {
      var u = t - T0; if (u < 0) return { rd: 0, act: false, wait: -u, left: 0 };
      var rd = Math.floor(u / (ACT + REST)); if (rd >= RD) return { rd: RD, over: true, act: false, left: 0 };
      var w = u - rd * (ACT + REST); return w < ACT ? { rd: rd, act: true, left: ACT - w } : { rd: rd, act: false, rest: true, left: 0, wait: ACT + REST - w };
    }
    o.press = function (c, t) { if (c !== 'Space' && c !== 'Click') return; var p = ph(t); if (!p.act) return; o.rs[p.rd]++; o.score++; o.t = t; };
    o.done = function () { return false; };
    o.view = function (t) {
      var p = ph(t), sum = (p.over || (p.rd === RD - 1 && p.rest)) ? o.rs.map(function (v, i) { return 'รอบ ' + (i + 1) + ': ' + v; }).join('   ') + '   รวม ' + o.score : '';
      var msg = p.act ? String(Math.ceil(p.left / 1000)) : p.over ? '' : p.rest ? 'รอบที่ ' + (p.rd + 2 > RD ? RD : p.rd + 2) + ' อีก ' + Math.ceil(p.wait / 1000) : 'เตรียมตัว';
      if (p.rest && p.rd === RD - 1) msg = 'ครบ 3 รอบ!';
      return { score: o.score, age: t - o.t, rd: p.rd, act: p.act, rs: o.rs.slice(), nt: 1, msg: msg, msz: p.act ? 72 : 28, my: 64, msg2: p.act ? 'รอบ ' + (p.rd + 1) + '/' + RD + '  ' + o.rs[p.rd] + ' ครั้ง' : '', sum: sum, id: p.rd * 2 + (p.act ? 1 : 0) };
    };
    o.draw = function (g, t) {
      var v = o.view(t); bg(g, '#1f3a5f', '#0e1c30');
      var s = 1 + Math.max(0, 1 - (t - o.t) / 120) * 0.15;
      g.save(); g.translate(W / 2, 140); g.scale(s, s); g.fillStyle = '#ff9ec0'; g.fillRect(-120, -22, 240, 44); g.restore();
      text(g, v.msg, W / 2, 60, 40, '#ffe066'); text(g, String(o.score), W / 2, 220, 20, '#fff');
    };
    return o;
  }

  /* 5) แข่งลูกศร */
  var ARROWS = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'], ALT = { KeyW: 'ArrowUp', KeyD: 'ArrowRight', KeyS: 'ArrowDown', KeyA: 'ArrowLeft' };
  var GLYPH = { ArrowUp: '↑', ArrowRight: '→', ArrowDown: '↓', ArrowLeft: '←' };
  /* 5) เขาวงกต first person: เลี้ยวซ้าย/ขวา เดินหน้า/ถอยหลัง ไปให้ถึงลานเค้กกลางเขาวงกต */
  var MZ_N = 11, MZ_DUR = 70000;
  function maze(seed) { var o, a; for (a = 0; a < 60; a++) { o = mazeTry(seed + a * 977); if (o.best >= 20 && o.best <= 34) break; } return o; }
  function mazeTry(seed) {
    var r = rng(seed), N = MZ_N, DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0], open = [], i, x, y, d;
    for (i = 0; i < N * N; i++) open.push([0, 0, 0, 0]);
    function link(ax, ay, k) { var bx = ax + DX[k], by = ay + DY[k]; if (bx < 0 || by < 0 || bx >= N || by >= N) return; open[ay * N + ax][k] = 1; open[by * N + bx][(k + 2) % 4] = 1; }
    var seen = {}, stack = [[0, 0]]; seen['0_0'] = 1;
    while (stack.length) {
      var c = stack[stack.length - 1], opts = [];
      for (d = 0; d < 4; d++) { var nx = c[0] + DX[d], ny = c[1] + DY[d]; if (nx >= 0 && ny >= 0 && nx < N && ny < N && !seen[nx + '_' + ny]) opts.push(d); }
      if (!opts.length) { stack.pop(); continue; }
      d = opts[Math.floor(r() * opts.length)]; link(c[0], c[1], d); seen[(c[0] + DX[d]) + '_' + (c[1] + DY[d])] = 1; stack.push([c[0] + DX[d], c[1] + DY[d]]);
    }
    var P0 = Math.floor(N / 2) - 1, P1 = P0 + 2;   // ลานเค้ก 3x3 กลางแผนที่
    for (y = P0; y <= P1; y++) for (x = P0; x <= P1; x++) { if (x < P1) link(x, y, 1); if (y < P1) link(x, y, 2); }
    for (i = 0; i < 1; i++) { var s0 = Math.floor(r() * 12), px, py, kd; if (s0 < 3) { px = P0 + s0; py = P0; kd = 0; } else if (s0 < 6) { px = P1; py = P0 + s0 - 3; kd = 1; } else if (s0 < 9) { px = P0 + s0 - 6; py = P1; kd = 2; } else { px = P0; py = P0 + s0 - 9; kd = 3; } link(px, py, kd); }
    for (i = 0; i < 3; i++) { x = Math.floor(r() * N); y = Math.floor(r() * N); if (inP(x, y)) continue; link(x, y, Math.floor(r() * 4)); }
    function inP(a, b) { return a >= P0 && a <= P1 && b >= P0 && b <= P1; }
    function bfs(srcs) { var dist = {}, q = []; srcs.forEach(function (c) { dist[c[0] + '_' + c[1]] = 0; q.push(c); }); for (var h = 0; h < q.length; h++) { var cc = q[h]; for (var k = 0; k < 4; k++) if (open[cc[1] * N + cc[0]][k]) { var kx = cc[0] + DX[k], ky = cc[1] + DY[k]; if (dist[kx + '_' + ky] === undefined) { dist[kx + '_' + ky] = dist[cc[0] + '_' + cc[1]] + 1; q.push([kx, ky]); } } } return dist; }
    var plaza = []; for (y = P0; y <= P1; y++) for (x = P0; x <= P1; x++) plaza.push([x, y]);
    var DG = bfs(plaza), corners = [[0, 0], [N - 1, 0], [0, N - 1], [N - 1, N - 1]], cs = corners[0]; corners.forEach(function (cc) { if (DG[cc[0] + '_' + cc[1]] > DG[cs[0] + '_' + cs[1]]) cs = cc; }); var sx = cs[0], sy = cs[1];
    var best = DG[sx + '_' + sy], sd = 0; for (d = 0; d < 4; d++) if (open[sy * N + sx][d]) { sd = d; break; }
    var o = { best: best, score: 0, x: sx, y: sy, d: sd, ft: -1, prog: 0, N: N, pk: sy * N + sx, vis: {} }; o.vis[sx + '_' + sy] = 1;
    function upd() { var pr = best - DG[o.x + '_' + o.y]; if (pr > o.prog) o.prog = pr; if (o.ft < 0) o.score = o.prog * 5; o.pk = o.y * N + o.x; o.vis[o.x + '_' + o.y] = 1; }
    o.press = function (c, t) {
      if (o.ft >= 0) return; c = ALT[c] || c;
      if (c === 'ArrowLeft') o.d = (o.d + 3) % 4; else if (c === 'ArrowRight') o.d = (o.d + 1) % 4;
      else if (c === 'ArrowUp' && open[o.y * N + o.x][o.d]) { o.x += DX[o.d]; o.y += DY[o.d]; }
      else if (c === 'ArrowDown' && open[o.y * N + o.x][(o.d + 2) % 4]) { o.x += DX[(o.d + 2) % 4]; o.y += DY[(o.d + 2) % 4]; }
      else return;
      upd();
      if (inP(o.x, o.y)) { o.ft = t; o.score = best * 5 + 20 + Math.max(0, Math.round((MZ_DUR - t) / 250)); }
    };
    var KEYS = ['ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight'];
    o.click = function (x, y, t) { var k = rowHit(4, x, y, 214); if (k >= 0) o.press(KEYS[k], t); };
    o.done = function () { return o.ft >= 0; };
    var opS = open.map(function (q) { return q.join(''); });
    o.view = function (t) { var vs = []; for (var k = 0; k < N * N; k++) vs.push(o.vis[(k % N) + '_' + Math.floor(k / N)] ? 1 : 0); return { sid: seed, score: o.score, x: o.x, y: o.y, d: o.d, p0: P0, p1: P1, N: N, op: opS, vs: vs, fin: o.ft >= 0 ? 1 : 0, id: o.pk + (o.ft >= 0 ? 999 : 0), msg: o.ft >= 0 ? 'ถึงลานเค้กแล้ว!' : '', msz: 30, my: 52 }; };
    o.draw = function (g, t) {
      bg(g, '#3a2158', '#1a0f2b'); var cs2 = 24, ox = (W - N * cs2) / 2, oy = 12;
      for (var yy = 0; yy < N; yy++) for (var xx = 0; xx < N; xx++) { var q = open[yy * N + xx], px = ox + xx * cs2, py = oy + yy * cs2; g.fillStyle = inP(xx, yy) ? '#ff8fb8' : '#5a3a7a'; g.fillRect(px + 2, py + 2, cs2 - 4, cs2 - 4); g.fillStyle = '#5a3a7a'; if (q[1]) g.fillRect(px + cs2 - 3, py + 2, 6, cs2 - 4); if (q[2]) g.fillRect(px + 2, py + cs2 - 3, cs2 - 4, 6); }
      g.fillStyle = '#ffd43b'; g.beginPath(); g.arc(ox + o.x * cs2 + cs2 / 2, oy + o.y * cs2 + cs2 / 2, 6, 0, 6.283); g.fill();
      text(g, '←→ หมุน  ↑ เดิน  ↓ ถอย', W / 2, 245, 14);
      drawRow(g, ['←', '↑', '↓', '→'], null, 214, '#fff');
    };
    return o;
  }

  /* 6) ทดสอบปฏิกิริยา: ครีมหยด */
  function reaction(seed) {
    var r = rng(seed), N = 5, i, per = [], CR = 3.6, o = { score: 0, k: 0, ts: 500, hold: -1, last: '', pl: [], pt: 0 };
    var PER = [2300, 1800, 1350, 1000, 700], TH = [0, 0.55, 1.5707, 1.0, 2.2], tgs = [];
    for (i = 0; i < N; i++) { per.push(PER[i]); var phi = r() * 6.283, rho = 0.4 + r() * 1.5; tgs.push({ x: Math.cos(phi) * rho, z: Math.sin(phi) * rho, th: TH[i] * (r() < 0.5 ? 1 : -1) + (i === 0 ? 0 : (r() - 0.5) * 0.3) }); }
    function pos(t) { return (tri((t - o.ts) / per[o.k] * 2) * 2 - 1) * 1.15; }
    o.press = function (c, t) {
      if (!isGo(c) || o.k >= N || t < o.ts || o.hold >= 0) return;
      var p = pos(t), tg = tgs[o.k], s5 = p * 5, wx = tg.x + Math.cos(tg.th) * s5, wz = tg.z + Math.sin(tg.th) * s5, d = Math.abs(s5), onC = Math.hypot(wx, wz) <= CR, pts = onC && d <= 2.5 ? Math.round(25 * (1 - d / 2.5)) + (d < 0.3 ? 5 : 0) : 0;
      o.score += pts; o.lp = pts; o.lpos = p; o.pt = t; o.hold = t + 1500; o.lon = onC; o.lw = [wx, wz]; if (onC) o.pl.push([wx, wz]); o.last = pts > 0 ? '+' + pts : onC ? 'ห่างวงเกินไป' : 'ตกจานแล้ว!';
    };
    o.done = function () { return o.k >= N; };
    o.view = function (t) {
      if (o.hold >= 0 && t >= o.hold) { o.k++; o.hold = -1; o.ts = t + 200; o.pl = []; }
      if (o.k >= N) return { score: o.score, k: N, n: N, fall: -1, held: false, pos: 0, pl: [], tx: 0, tz: 0, th: 0, on: 1, msg: 'ครบ 5 ครั้ง!', msz: 24, my: 190, lp: 0, id: N };
      var held = o.hold >= 0, tg = tgs[o.k];
      return { score: o.score, k: o.k, n: N, pos: held ? o.lpos : pos(t), fall: held ? Math.min(1, (t - o.pt) / 260) : -1, held: held, lp: held ? o.lp : 0, on: held ? (o.lon ? 1 : 0) : 1, tx: tg.x, tz: tg.z, th: tg.th, pl: o.pl.slice(), id: o.k * 2 + (held ? 1 : 0), msg: held ? o.last : '', msz: 32, my: 200, msg2: 'ครั้งที่ ' + (o.k + 1) + '/' + N, my2: 250 };
    };
    o.draw = function (g, t) { var v = o.view(t); bg(g, '#3a2158', '#1a0f2b'); g.fillStyle = '#e9a76b'; g.fillRect(190, 200, 100, 40); g.fillStyle = '#ff3d4e'; g.beginPath(); g.arc(W / 2 + v.pos * 80, 80, 9, 0, 7); g.fill(); text(g, 'คะแนน ' + o.score, W / 2, 255, 14, '#c9b6e0'); };
    return o;
  }


  /* ---------- ชุดที่ 2 ---------- */
  var DIGITS = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3 };
  function stepper(o, step, fn) { o.last = 0; o.adv = function (t) { var n = 0; while (o.last + step <= t && n++ < 3000) { o.last += step; fn(o.last, step / 1000); } }; }

  /* 7) ยิงเป้า (เมาส์) */
  function shoot(seed) {
    var r = rng(seed), ev = [], t = 1200, DUR = 45000;
    while (t < DUR - 1800) { var q = t / DUR, rd = 11 + Math.floor(r() * 12); ev.push({ t: t, x: 40 + r() * 400, y: 55 + r() * 180, r: rd, until: t + Math.round(1900 - 1450 * Math.pow(q, 1.4)), hit: false }); t += Math.round(1000 - 830 * Math.pow(q, 1.3) + r() * 150 * (1 - q)); }
    var o = { score: 0, flash: [] };
    o.press = function () {};
    o.click = function (x, y, tt) {
      for (var i = 0; i < ev.length; i++) { var e = ev[i]; if (!e.hit && tt >= e.t && tt < e.until && Math.hypot(x - e.x, y - e.y) <= e.r + 5) { e.hit = true; o.score += e.r < 14 ? 3 : e.r < 19 ? 2 : 1; o.flash.push({ x: e.x, y: e.y, r: e.r, t: tt }); return; } }
    };
    o.done = function () { return false; };
    o.view = function (tt) { return { score: o.score, tg: ev.filter(function (e) { return !e.hit && tt >= e.t && tt < e.until; }).map(function (e) { return [e.x, e.y, e.r, (tt - e.t) / (e.until - e.t)]; }), fl: o.flash.filter(function (f) { return tt - f.t < 1200; }).map(function (f) { return [f.x, f.y, tt - f.t, f.r]; }), msg2: 'เหลือ ' + Math.max(0, Math.ceil((DUR - tt) / 1000)) + ' วิ', my2: 250 }; };
    o.draw = function (g, tt) {
      bg(g, '#2b1a45', '#12081f');
      ev.forEach(function (e) { if (!e.hit && tt >= e.t && tt < e.until) { g.fillStyle = '#ff6b6b'; g.beginPath(); g.arc(e.x, e.y, e.r, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(e.x, e.y, e.r * 0.6, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ff6b6b'; g.beginPath(); g.arc(e.x, e.y, e.r * 0.25, 0, Math.PI * 2); g.fill(); } });
      o.flash.forEach(function (f) { if (tt - f.t < 300) text(g, '+', f.x, f.y, 20, '#ffe066'); });
      text(g, 'คะแนน ' + o.score + '  (คลิกเป้า เล็กได้เยอะ)', W / 2, 18, 14);
    };
    return o;
  }

  /* 8) เรียงเลข 1-12 (เมาส์) */
  function numbers(seed) {
    var r = rng(seed), NN = 20, DUR = 45000, o = { score: 0, next: 1, board: null, wrong: -1, wi: -1, ft: -1, wrongs: 0 };
    (function () {
      var ids = [], i; for (i = 1; i <= NN; i++) ids.push(i); for (i = NN - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), tmp = ids[i]; ids[i] = ids[j]; ids[j] = tmp; }
      o.board = ids.map(function (n, k) { return { n: n, x: 50 + (k % 5) * 95 + (r() - 0.5) * 26, y: 50 + Math.floor(k / 5) * 60 + (r() - 0.5) * 14 }; });
    })();
    function upd() { o.score = (o.next - 1) * 8; }
    o.press = function () {};
    o.click = function (x, y, t) {
      if (o.ft >= 0) return;
      for (var i = 0; i < o.board.length; i++) { var b = o.board[i]; if (Math.hypot(x - b.x, y - b.y) <= 20) {
        if (b.n < o.next) return;
        if (b.n === o.next) { o.next++; upd(); if (o.next > NN) { o.ft = t; o.score = NN * 8 + 20 + Math.max(0, Math.round((DUR - t) / 250)); } } else { o.wrong = t; o.wi = b.n; o.wrongs++; upd(); }
        return; } }
    };
    o.done = function () { return o.ft >= 0; };
    o.view = function (t) { return { score: o.score, next: o.next, wr: o.wrong >= 0 && t - o.wrong < 250 ? o.wi : 0, b: o.board.map(function (b) { return [b.n, b.x, b.y]; }), id: o.next }; };
    o.draw = function (g, t) {
      bg(g, '#1f3a5f', '#0e1c30');
      o.board.forEach(function (b) { var done = b.n < o.next; g.fillStyle = done ? '#495057' : (o.wrong >= 0 && t - o.wrong < 200 && b.n === o.wi ? '#ff8787' : '#ffd43b'); g.beginPath(); g.arc(b.x, b.y, 19, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#1b1226'; g.stroke(); if (!done) text(g, String(b.n), b.x, b.y, 16, '#1b1226'); });
      text(g, 'คลิกเลขเรียง 1→20 ใครเสร็จก่อนชนะ  คะแนน ' + o.score, W / 2, 20, 14);
    };
    return o;
  }

  /* 9) กดตามสี (1-4) */
  var COL = [['#ff6b6b', 'แดง'], ['#4dabf7', 'ฟ้า'], ['#ffd43b', 'เหลือง'], ['#69db7c', 'เขียว']];
  function colorgame(seed) {
    var r = rng(seed), seq = [], perm = [], i; for (i = 0; i < 600; i++) { seq.push(Math.floor(r() * 4)); var p = [0, 1, 2, 3], j; for (j = 3; j > 0; j--) { var q = Math.floor(r() * (j + 1)), tmp = p[j]; p[j] = p[q]; p[q] = tmp; } perm.push(p); }
    var shp = []; for (i = 0; i < 600; i++) shp.push(Math.floor(r() * 5));
    var o = { score: 0, idx: 0, stun: -1 };
    function pick(ci, t) { if (t < o.stun) return; if (ci === seq[o.idx]) { o.score++; o.idx++; } else o.stun = t + 1200; }
    o.press = function (c, t) { if (c in DIGITS) pick(DIGITS[c], t); };
    o.click = function (x, y, t) { var k = rowHit(4, x, y, 196); if (k >= 0) pick(perm[o.idx][k], t); };
    o.done = function () { return false; };
    o.view = function (t) { var st = t < o.stun; return { score: o.score, st: st ? 1 : 0, c: seq[o.idx], sh: shp[o.idx], btn: perm[o.idx].map(function (c) { return [COL[c][0], COL[c][1]]; }), id: o.idx, msg: st ? 'กดผิด!' : '', msz: 26, my: 52 }; };
    o.draw = function (g, t) {
      var st = t < o.stun; bg(g, st ? '#4a1f2b' : '#2b1a45', '#12081f');
      g.fillStyle = COL[seq[o.idx]][0]; g.fillRect(180, 50, 120, 100); g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeRect(180, 50, 120, 100); g.lineWidth = 1;
      var pm = perm[o.idx]; drawRow(g, pm.map(function (c) { return COL[c][1]; }), pm.map(function (c) { return COL[c][0]; }), 196, '#1b1226');
      text(g, st ? 'กดผิด!' : 'คลิกปุ่มสีที่ตรงกับสีด้านบน (ปุ่มสลับที่ทุกข้อ!)', W / 2, 20, 14, st ? '#ff8787' : '#c9b6e0'); text(g, 'คะแนน ' + o.score, W / 2, 250, 16);
    };
    return o;
  }

  /* 10) เลขไหนมากกว่า */
  function compare(seed) {
    var r = rng(seed), q = [], i; for (i = 0; i < 400; i++) { var a = 100 + Math.floor(r() * 880), b = a + (r() < 0.5 ? -1 : 1) * (1 + Math.floor(r() * 14)); if (r() < 0.5) { var tt2 = a; a = b; b = tt2; } q.push([a, b]); }
    var o = { score: 0, idx: 0, stun: -1 };
    o.press = function (c, t) {
      if (t < o.stun) return; var left = c === 'ArrowLeft' || c === 'KeyA', right = c === 'ArrowRight' || c === 'KeyD'; if (!left && !right) return;
      var p = q[o.idx]; if ((p[0] > p[1]) === left) { o.score++; o.idx++; } else o.stun = t + 1200;
    };
    o.click = function (x, y, t) { o.press(x < W / 2 ? 'KeyA' : 'KeyD', t); };
    o.done = function () { return false; };
    o.view = function (t) { var st = t < o.stun; return { score: o.score, st: st ? 1 : 0, a: q[o.idx][0], b: q[o.idx][1], id: o.idx, msg: st ? 'ผิด!' : '', msz: 26, my: 52 }; };
    o.draw = function (g, t) {
      var st = t < o.stun; bg(g, st ? '#4a1f2b' : '#1f3d2b', '#0e2016');
      g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(10, 40, 225, 170); g.fillRect(245, 40, 225, 170);
      text(g, String(q[o.idx][0]), 130, 130, 70); text(g, String(q[o.idx][1]), 350, 130, 70);
      text(g, st ? 'ผิด! รอสักครู่' : 'คลิกฝั่งที่เลขมากกว่า (หรือกด A / D)', W / 2, 220, 15, '#c9b6e0'); text(g, 'คะแนน ' + o.score, W / 2, 25, 18);
    };
    return o;
  }

  /* 11) จำลำดับ (Simon) */
  function simon(seed) {
    var r = rng(seed), seq = [], i; for (i = 0; i < 40; i++) seq.push(ARROWS[Math.floor(r() * 4)]);
    var o = { score: 0, len: 3, pos: 0, phase: 'show', ps: 600, bad: -1 };
    function sync(t) { if (o.phase === 'show' && t >= o.ps + o.len * 560 + 300) { o.phase = 'input'; o.pos = 0; } }
    o.press = function (c, t) {
      sync(t); c = ALT[c] || c; if (o.phase !== 'input' || ARROWS.indexOf(c) < 0 || o.len > 40) return;
      o.lp = ARROWS.indexOf(c); o.lpt = t;
      if (c === seq[o.pos]) { o.pos++; if (o.pos >= o.len) { o.score += o.len; o.len++; o.phase = 'show'; o.ps = t + 700; } }
      else { o.bad = t; o.phase = 'show'; o.ps = t + 1000; }
    };
    o.click = function (x, y, t) { var k = rowHit(4, x, y, 214); if (k >= 0) o.press(ARROWS[k], t); };
    o.done = function () { return false; };
    o.view = function (t) {
      sync(t); var lit = -1; if (o.phase === 'show') { var k = Math.floor((t - o.ps) / 560), w = (t - o.ps) - k * 560; if (t >= o.ps && k < o.len && w < 380) lit = ARROWS.indexOf(seq[k]); }
      var bad = o.bad >= 0 && t - o.bad < 1000 ? 1 : 0, pr = o.lpt !== undefined && t - o.lpt < 220 ? o.lp : -1;
      return { score: o.score, lit: lit, ph: o.phase === 'show' ? 0 : 1, bad: bad, pr: pr, len: o.len, id: o.score * 100 + o.len * 3 + (o.phase === 'show' ? 0 : 1) + (bad ? 7 : 0), msg: bad ? 'ผิด! ดูใหม่' : '', msz: 26, my: 52 };
    };
    o.draw = function (g, t) {
      sync(t); bg(g, '#2b1a45', '#12081f'); drawRow(g, ['↑', '→', '↓', '←'], null, 214, '#fff');
      var lit = -1; if (o.phase === 'show') { var k = Math.floor((t - o.ps) / 560), within = (t - o.ps) - k * 560; if (t >= o.ps && k < o.len && within < 380) lit = k; }
      var big = lit >= 0 ? seq[lit] : null;
      text(g, big ? GLYPH[big] : (o.phase === 'input' ? '?' : '…'), W / 2, 100, 90, big ? '#ffe066' : '#6c5a8a');
      text(g, o.phase === 'show' ? (o.bad >= 0 && t - o.bad < 1000 ? 'ผิด! ดูใหม่อีกครั้ง' : 'จำลำดับให้ดี (' + o.len + ' ตัว)') : 'คลิกปุ่มตามลำดับ ' + o.pos + '/' + o.len, W / 2, 175, 15, o.phase === 'show' && o.bad >= 0 && t - o.bad < 1000 ? '#ff8787' : '#c9b6e0');
      text(g, 'คะแนน ' + o.score, W / 2, 25, 18);
    };
    return o;
  }

  /* 12) ทรงตัวไอศกรีม (กดซ้าย/ขวาค้าง) */
  function balance(seed) {
    var r = rng(seed), RA = 1000, RL = 30000, PAN = 1.2;
    var o = { score: 0, x: 240, dir: 0, sc: [], st: 0, rd0: -9, nx: 0, fl: 0, lastT: 0, ext: undefined, cols: [] };
    function rdOf(t) { var u = t - RA; if (u < 0) return -1; return u < RL ? 0 : -2; }
    function iv() { return Math.max(0.12, Math.min(0.35, 7 / Math.max(1, o.ext || 1))); }
    stepper(o, 10, function (t, dt) {
      var q = rdOf(t);
      if (q !== o.rd0) { o.rd0 = q; o.sc = []; if (q >= 0) { o.x = 240; o.dir = 0; o.st = 0; o.cols = []; o.nx = t + 700; } }
      if (q < 0) return;
      var el = (t - RA) / 1000;
      o.x = Math.max(34, Math.min(446, o.x + o.dir * 170 * dt));
      if (t >= o.nx) { o.sc.push({ x: 40 + r() * 400, y: -20, k: Math.floor(r() * 4) }); o.nx = t + Math.max(420, 860 - el * 14); }
      var vy = 115 + el * 3.2, line = 196;
      o.sc = o.sc.filter(function (s) {
        s.y += vy * dt;
        if (s.y >= line && s.y <= line + 36 && Math.abs(s.x - o.x) < 36) { o.score++; o.st++; o.cols.push(s.k); o.fl = t; return false; }
        return s.y < 290;
      });
    });
    o.press = function (c, t) {
      if (!(isGo(c) || c === 'KeyA' || c === 'KeyD' || c === 'ArrowLeft' || c === 'ArrowRight')) return;
      o.adv(t); if (rdOf(t) < 0) return; o.dir = o.dir === -1 ? 1 : -1;
    };
    o.release = function () {};
    // จบเมื่อนับไอศกรีมแข่งกันเสร็จ (ui ส่งจำนวนก้อนสูงสุดของทุกคนมาใน o.ext)
    o.done = function () { var ex = o.ext === undefined ? 12 : o.ext; return o.lastT >= RA + RL + (PAN + ex * iv() + 3.2) * 1000; };
    o.view = function (t) {
      o.adv(t); o.lastT = t; var q = rdOf(t), el = q >= 0 ? (t - RA) / 1000 : 0, end = t >= RA + RL, et = end ? (t - RA - RL) / 1000 : 0;
      var k = o.ext === undefined ? 0 : Math.max(0, Math.min(o.ext, Math.floor((et - PAN) / iv()) + (et >= PAN ? 1 : 0)));
      return { score: o.score, x: o.x, dir: o.dir, st: o.st, rd: q, hit: t - o.fl < 220 ? 1 : 0, end: end ? 1 : 0, et: et, k: k, ext: o.ext, nt: 1, cols: o.cols.slice(), sc: o.sc.map(function (s) { return [s.x, s.y, s.k]; }), msg2: q >= 0 ? 'เหลือ ' + Math.max(0, Math.ceil(RL / 1000 - el)) + ' วิ' : '' };
    };
    o.draw = function (g, t) { var v = o.view(t); bg(g, '#1f3a5f', '#0e1c30'); g.fillStyle = '#e9a76b'; g.fillRect(v.x - 10, 200, 20, 40); text(g, 'คะแนน ' + o.score, W / 2, 20, 14); };
    return o;
  }

  /* 13) หลบหยดครีม (A/D ค้าง) */

  /* 14) กระโดดข้ามขนม (Space) */
  function runner(seed) {
    var r = rng(seed), PX = 90, RL = 21000, GAP = 2000, T0 = 1200, CW = 36;
    var o = { score: 0, rd: 0, rs: T0, y: 0, vy: 0, hold: false, ht: 0, buf: -9999, dead: false, deadAt: 0, rsec: [0, 0], fin: false, obs: [], wait: -1, hurt: -9999 };
    function D(s) { return 230 * s + 4 * s * s; }
    function spd(s) { return 230 + 11.4 * s; }
    function gen() {
      var out = [], d = 760;
      while (d < D(RL / 1000) - 200) {
        var q = r(), prog = d / D(RL / 1000), mx = prog < 0.25 ? 2 : prog < 0.55 ? 3 : 4, n = 1 + Math.floor(Math.pow(r(), 1.3) * mx), c = r() < 0.2 + prog * 0.2 ? 2 : 1;
        out.push({ d: d, w: c * CW, n: n, done: false });
        d += c * CW + 220 + r() * 230 + n * 40 - prog * 50;
      }
      return out;
    }
    o.obs = gen();
    function startRound(t) { o.rd++; o.rs = t; o.y = 0; o.vy = 0; o.hold = false; o.dead = false; o.wait = -1; o.obs = gen(); }
    function jump(t) { o.vy = 640; o.hold = true; o.ht = 0; o.buf = -9999; }
    stepper(o, 10, function (t, dt) {
      if (o.fin) return;
      if (o.wait >= 0) { if (t >= o.wait) { if (o.rd >= 1) o.fin = true; else startRound(t); } return; }
      var tr = (t - o.rs) / 1000; if (tr < 0) return;
      if (o.y > 0 || o.vy > 0) { var g = (o.hold && o.vy > 0 && o.ht < 0.26) ? 1000 : 2500; o.ht += dt; o.vy -= g * dt; o.y += o.vy * dt; if (o.y <= 0) { o.y = 0; o.vy = 0; if (t - o.buf < 130) jump(t); } }
      var dist = D(tr);
      for (var i = 0; i < o.obs.length; i++) { var b = o.obs[i], x = PX + b.d - dist; if (x < PX + 11 && x + b.w > PX - 11 && o.y < b.n * 34 - 4) { o.dead = true; o.deadAt = t; o.hurt = t; o.wait = t + 1800; o.rsec[o.rd] = Math.floor(tr); break; } }
      if (!o.dead && tr >= RL / 1000) { o.rsec[o.rd] = RL / 1000; o.wait = t + 1500; o.deadAt = t; o.surv = true; }
      o.score = o.rsec[0] + o.rsec[1] + (o.dead || o.wait >= 0 ? 0 : Math.floor(tr));
    });
    o.press = function (c, t) {
      if (!(isGo(c) || c === 'KeyW' || c === 'ArrowUp')) return; o.adv(t);
      if (o.dead || o.wait >= 0 || o.fin || t < o.rs) return;
      if (o.y <= 0 && o.vy <= 0) jump(t); else o.buf = t;
    };
    o.release = function (c, t) { if (isGo(c) || c === 'KeyW' || c === 'ArrowUp') o.hold = false; };
    o.done = function () { return o.fin; };
    o.view = function (t) {
      o.adv(t); var tr = Math.max(0, ((o.wait >= 0 ? o.deadAt : t) - o.rs) / 1000), dist = D(tr);
      var vis = o.obs.map(function (b) { return [PX + b.d - dist, b.w, b.n]; }).filter(function (b) { return b[0] > -150 && b[0] < 600; });
      return { t: t, h: o.y, stun: o.dead ? 1 : 0, score: o.score, spd: spd(tr), px: PX, obs: vis, msg: o.dead && !o.fin ? 'ชน!' : o.surv && o.wait >= 0 ? 'รอดครบ 21 วิ!' : '', msz: 40, my: 90, msg2: 'รอบ ' + Math.min(2, o.rd + 1) + '/2 · รอดมา ' + Math.floor(tr) + ' วิ', my2: 250, id: 0 };
    };
    o.draw = function (g, t) { var v = o.view(t); bg(g, '#2b1a45', '#12081f'); g.fillStyle = '#ffd43b'; g.fillRect(PX - 12, 192 - v.h, 24, 28); v.obs.forEach(function (b) { g.fillStyle = '#e9a76b'; g.fillRect(b[0], 192, b[1], 28); }); text(g, 'รอดรวม ' + o.score + ' วิ', W / 2, 20, 14); };
    return o;
  }


  /* ---------- ชุดที่ 3 ---------- */
  function clampN(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* 16) บวกเลขไว */
  function addmath(seed) {
    var r = rng(seed), q = [], i; for (i = 0; i < 400; i++) {
      var a = 6 + Math.floor(r() * 44), b = 6 + Math.floor(r() * 44), ans = a + b, opts = [ans], offs = [-10, -2, -1, 1, 2, 10];
      while (opts.length < 4) { var cand = ans + offs[Math.floor(r() * offs.length)]; if (opts.indexOf(cand) < 0) opts.push(cand); }
      for (var j = 3; j > 0; j--) { var k2 = Math.floor(r() * (j + 1)), tmp = opts[j]; opts[j] = opts[k2]; opts[k2] = tmp; }
      q.push([a, b, opts]);
    }
    var o = { score: 0, idx: 0, stun: -1 };
    function pick(v, t) { if (t < o.stun) return; if (v === q[o.idx][0] + q[o.idx][1]) { o.score++; o.idx++; } else o.stun = t + 1200; }
    o.press = function () {};
    o.click = function (x, y, t) { var k = rowHit(4, x, y, 190); if (k >= 0) pick(q[o.idx][2][k], t); };
    o.done = function () { return false; };
    o.view = function (t) { var st = t < o.stun; return { score: o.score, st: st ? 1 : 0, a: q[o.idx][0], b: q[o.idx][1], opts: q[o.idx][2], id: o.idx, msg: st ? 'ผิด!' : '', msz: 26, my: 52 }; };
    o.draw = function (g, t) {
      var st = t < o.stun; bg(g, st ? '#4a1f2b' : '#1f3a5f', '#0e1c30');
      text(g, q[o.idx][0] + ' + ' + q[o.idx][1] + ' = ?', W / 2, 100, 56, st ? '#ff8787' : '#fff');
      drawRow(g, q[o.idx][2].map(String), null, 190, '#fff'); text(g, 'คลิกคำตอบที่ถูก', W / 2, 250, 14, '#c9b6e0'); text(g, 'คะแนน ' + o.score, W / 2, 25, 18);
    };
    return o;
  }

  /* 17) จับคู่การ์ด (เมาส์) */
  function memory(seed) {
    var r = rng(seed), o = { score: 0, cards: null, fl: [], hideAt: -1 };
    var SYM = [['A', '#ff6b6b'], ['B', '#4dabf7'], ['C', '#ffd43b'], ['D', '#69db7c'], ['E', '#da77f2'], ['F', '#ffa94d'], ['G', '#3bc9db'], ['H', '#f783ac']];
    function board() { var ids = [0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7], i; for (i = 15; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = ids[i]; ids[i] = ids[j]; ids[j] = t; } return ids.map(function (s) { return { s: s, m: false }; }); }
    o.cards = board();
    function sync(t) { if (o.hideAt >= 0 && t >= o.hideAt) { o.fl = []; o.hideAt = -1; } }
    function rect(k) { return { x: 100 + (k % 4) * 78, y: 34 + Math.floor(k / 4) * 56, w: 68, h: 48 }; }
    o.press = function () {};
    o.click = function (x, y, t) {
      sync(t); if (o.hideAt >= 0) return;
      for (var k = 0; k < 16; k++) {
        var q = rect(k); if (x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h) {
          if (o.cards[k].m || o.fl.indexOf(k) >= 0) return;
          o.fl.push(k);
          if (o.fl.length === 2) {
            if (o.cards[o.fl[0]].s === o.cards[o.fl[1]].s) { o.cards[o.fl[0]].m = o.cards[o.fl[1]].m = true; o.score += 2; o.fl = []; if (o.cards.every(function (c) { return c.m; })) { o.score += 6; o.cards = board(); } }
            else o.hideAt = t + 600;
          }
          return;
        }
      }
    };
    o.done = function () { return false; };
    o.view = function (t) { sync(t); return { score: o.score, cs: o.cards.map(function (c, k) { return [c.s, c.m ? 2 : (o.fl.indexOf(k) >= 0 ? 1 : 0)]; }), id: o.score * 10 + o.fl.length, msg: '', msz: 26, my: 52, sym: SYM.map(function (z) { return z[0]; }), scl: SYM.map(function (z) { return z[1]; }) }; };
    o.draw = function (g, t) {
      sync(t); bg(g, '#2b1a45', '#12081f');
      o.cards.forEach(function (c, k) { var q = rect(k), up = c.m || o.fl.indexOf(k) >= 0; g.fillStyle = up ? SYM[c.s][1] : '#6c4a99'; g.fillRect(q.x, q.y, q.w, q.h); g.strokeStyle = '#fff'; g.strokeRect(q.x, q.y, q.w, q.h); if (up) text(g, SYM[c.s][0], q.x + q.w / 2, q.y + q.h / 2, 30, '#1b1226'); else text(g, '?', q.x + q.w / 2, q.y + q.h / 2, 24, '#c9b6e0'); });
      text(g, 'คลิกเปิดการ์ดหาคู่ที่เหมือนกัน  คะแนน ' + o.score, W / 2, 20, 14);
    };
    return o;
  }

  /* 18) กดค้างให้พอดี */
  function holdbar(seed) {
    var r = rng(seed), N = 5, zones = [], i; for (i = 0; i < N; i++) zones.push({ c: 0.25 + r() * 0.6, w: 0.06 - i * 0.008 });
    var o = { score: 0, k: 0, hs: -1, ready: 500, last: null, hold: -1 };
    o.press = function (c, t) { if (!isGo(c) || o.k >= N || o.hs >= 0 || t < o.ready || o.hold >= 0) return; o.hs = t; };
    function finish(t, fill) {
      var z = zones[o.k], d = Math.abs(fill - z.c), pts = fill > 1 ? 0 : Math.max(0, Math.round(20 * (1 - d / 0.4))); if (fill <= 1 && d <= z.w) pts += 5;
      o.score += pts; o.last = { pts: pts, fill: Math.min(1, fill) }; o.hold = t + 900; o.hs = -1;
    }
    o.release = function (c, t) { if (!isGo(c) || o.hs < 0) return; finish(t, (t - o.hs) / 1100); };
    o.done = function () { return o.k >= N; };
    o.view = function (t) {
      if (o.hold >= 0 && t >= o.hold) { o.k++; o.hold = -1; o.ready = t + 300; }
      if (o.hs >= 0 && (t - o.hs) / 1100 > 1) finish(t, 2);
      if (o.k >= N) return { score: o.score, k: N, n: N, over: true, msg: 'ครบ 5 ครั้ง!', msz: 24, my: 200, id: N * 2 };
      var z = zones[o.k], held = o.hold >= 0, fill = held ? o.last.fill : o.hs >= 0 ? Math.min(1, (t - o.hs) / 1100) : 0;
      return { score: o.score, k: o.k, n: N, zc: z.c, zw: z.w, pos: fill, held: held, pts: held ? o.last.pts : 0, id: o.k * 2 + (held ? 1 : 0), msg: held ? '+' + o.last.pts : '', msz: 32, my: 200 };
    };
    o.draw = function (g, t) {
      if (o.hold >= 0 && t >= o.hold) { o.k++; o.hold = -1; o.ready = t + 300; }
      if (o.hs >= 0 && (t - o.hs) / 1100 > 1) finish(t, 2);
      bg(g, '#3a2158', '#1a0f2b');
      if (o.k >= N) { text(g, 'ครบ 5 ครั้ง! คะแนน ' + o.score, W / 2, H / 2, 24); return; }
      var z = zones[o.k], x0 = 90, wd = 300, fill = o.hold >= 0 ? o.last.fill : o.hs >= 0 ? Math.min(1, (t - o.hs) / 1100) : 0;
      g.fillStyle = '#120a1c'; g.fillRect(x0, 110, wd, 46); g.fillStyle = '#69db7c'; g.fillRect(x0 + (z.c - z.w) * wd, 110, z.w * 2 * wd, 46);
      g.fillStyle = '#ffd6e3'; g.fillRect(x0, 114, fill * wd, 38); g.strokeStyle = '#fff'; g.strokeRect(x0, 110, wd, 46);
      text(g, 'กด Space (หรือกดเมาส์) ค้าง ปล่อยเมื่อถึงโซนเขียว (' + (o.k + 1) + '/' + N + ')', W / 2, 60, 14); if (o.last && o.hold >= 0) text(g, '+' + o.last.pts, W / 2, 200, 28, '#ffe066');
      text(g, 'คะแนน ' + o.score, W / 2, 245, 16, '#c9b6e0');
    };
    return o;
  }

  /* 19) ขนมหรือผัก */
  var SWEET = ['เค้ก', 'คุกกี้', 'ช็อกโกแลต', 'ไอศกรีม', 'โดนัท', 'มาการอง', 'พุดดิ้ง', 'เยลลี่', 'ลูกอม', 'วาฟเฟิล'];
  var VEG = ['บรอกโคลี', 'แครอท', 'ผักกาด', 'มะระ', 'หัวหอม', 'พริก', 'ผักชี', 'บวบ', 'กะหล่ำปลี', 'ถั่วฝักยาว'];
  function sweetveg(seed) {
    var r = rng(seed), q = [], i; for (i = 0; i < 400; i++) { var v = r() < 0.5; q.push({ v: v, w: (v ? VEG : SWEET)[Math.floor(r() * 10)] }); }
    var o = { score: 0, idx: 0, stun: -1 };
    o.press = function (c, t) {
      if (t < o.stun) return; var left = c === 'ArrowLeft' || c === 'KeyA', right = c === 'ArrowRight' || c === 'KeyD'; if (!left && !right) return;
      if (right === q[o.idx].v) { o.score++; o.idx++; } else o.stun = t + 1300;
    };
    o.click = function (x, y, t) { o.press(x < W / 2 ? 'KeyA' : 'KeyD', t); };
    o.done = function () { return false; };
    o.view = function (t) { var st = t < o.stun; return { score: o.score, st: st ? 1 : 0, w: q[o.idx].w, k: (q[o.idx].v ? VEG : SWEET).indexOf(q[o.idx].w), v: q[o.idx].v ? 1 : 0, id: o.idx, msg: st ? 'ผิด!' : '', msz: 26, my: 52 }; };
    o.draw = function (g, t) {
      var st = t < o.stun; bg(g, st ? '#4a1f2b' : '#2b1a45', '#12081f');
      g.fillStyle = 'rgba(105,219,124,0.0)'; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(10, 40, 225, 190); g.fillRect(245, 40, 225, 190);
      text(g, q[o.idx].w, W / 2, 120, 54, st ? '#ff8787' : '#fff');
      text(g, '← คลิกซ้าย = ขนม      คลิกขวา = ผัก →', W / 2, 205, 18, '#c9b6e0'); text(g, st ? 'ผิด!' : 'คะแนน ' + o.score, W / 2, 25, 18, st ? '#ff8787' : '#fff');
    };
    return o;
  }


  /* นับขนมให้ถูก: ขนมหล่นลงถาดแวบเดียวแล้วถูกครอบ นับแล้วเลือกคำตอบ */
  function count(seed) {
    var SHOW = 2200, o = { score: 0, rd: 0, phase: 0, rs: 500, ansT: -1, sel: -1, ok: 0 };
    function mk(rd) {
      var rr = rng(seed * 7 + rd * 131 + 1), n = Math.min(16, 5 + Math.floor(rd * 1.5) + Math.floor(rr() * 3)), kind = Math.floor(rr() * 5), items = [], tries = 0;
      var md = 2.5; while (items.length < n && md > 1.2) { tries = 0; while (items.length < n && tries < 400) { tries++; var x = (rr() * 2 - 1) * 6.4, z = (rr() * 2 - 1) * 3.3; if (items.every(function (q) { return Math.hypot(q[0] - x, q[1] - z) > md; })) items.push([x, z, rr() * 6.28]); } md -= 0.2; }
      n = items.length; var opts = [n], offs = [-3, -2, -1, 1, 2, 3], j; while (opts.length < 4) { var c = n + offs[Math.floor(rr() * 4)]; if (c > 0 && opts.indexOf(c) < 0) opts.push(c); }
      for (j = 3; j > 0; j--) { var k2 = Math.floor(rr() * (j + 1)), tmp = opts[j]; opts[j] = opts[k2]; opts[k2] = tmp; }
      return { n: n, kind: kind, items: items, opts: opts };
    }
    var cur = mk(0);
    function sync(t) { if (o.phase === 0 && t >= o.rs + SHOW) o.phase = 1; if (o.phase === 2 && t >= o.ansT + 1100) { o.rd++; cur = mk(o.rd); o.phase = 0; o.rs = o.ansT + 1100; o.sel = -1; } }
    function pick(k, t) { sync(t); if (o.phase !== 1) return; o.sel = k; o.ok = cur.opts[k] === cur.n ? 1 : 0; o.ansT = t; o.phase = 2; if (o.ok) o.score += 10 + Math.max(0, 5 - Math.floor((t - o.rs - SHOW) / 700)); }
    o.press = function (c, t) { if (c in DIGITS) pick(DIGITS[c], t); };
    o.click = function (x, y, t) { var k = rowHit(4, x, y, 196); if (k >= 0) pick(k, t); };
    o.done = function () { return false; };
    o.view = function (t) { sync(t); return { score: o.score, ph: o.phase, items: o.phase === 1 ? [] : cur.items, kind: cur.kind, opts: cur.opts, sel: o.sel, ok: o.ok, n: cur.n, id: o.rd * 10 + o.phase, msg: o.phase === 2 ? (o.ok ? 'ถูกต้อง!' : 'ผิด! มี ' + cur.n + ' ชิ้น') : '', msz: 26, my: 52 }; };
    o.draw = function (g, t) {
      sync(t); bg(g, '#1f3a5f', '#0e1c30'); text(g, o.phase === 0 ? 'จำนวนขนมในถาด...' : 'มีกี่ชิ้น?  คะแนน ' + o.score, W / 2, 24, 16);
      if (o.phase !== 1) cur.items.forEach(function (q) { g.fillStyle = '#ffd43b'; g.beginPath(); g.arc(240 + q[0] * 28, 120 + q[1] * 28, 8, 0, 6.283); g.fill(); });
      if (o.phase === 1) drawRow(g, cur.opts.map(String), null, 196, '#fff');
    };
    return o;
  }

  /* ตกแต่งเค้กตามออเดอร์: กดค้างลากของชิ้นถัดไปไปเหนือเค้ก ปล่อยเมาส์เพื่อวาง คะแนน = % ความแม่น */
  function order(seed) {
    var RN = [3, 5, 7], RV = 2600, o = { score: 0, rd: 0, pl: [], rev: -1, rp: 0, pcs: [], now: 0, fin: false, ends: 0 }, rounds = [];
    RN.forEach(function (n, rd) { var rr = rng(seed * 17 + rd * 311 + 7), ty = [0, 1, 2, 3, 4, 5, 6, 7], i, j, tg = []; for (i = 7; i > 0; i--) { j = Math.floor(rr() * (i + 1)); var tm = ty[i]; ty[i] = ty[j]; ty[j] = tm; }
      var md = 2.4; while (tg.length < n && md > 1.2) { var tries = 0; while (tg.length < n && tries++ < 600) { var a = rr() * 6.2832, d = Math.sqrt(rr()) * 3.6, x = Math.cos(a) * d, z = Math.sin(a) * d; if (tg.every(function (q) { return Math.hypot(q[1] - x, q[2] - z) > md; })) tg.push([ty[tg.length], x, z]); } md -= 0.15; }
      var ord = tg.map(function (q) { return q[0]; }), k; for (k = ord.length - 1; k > 0; k--) { var k2 = Math.floor(rr() * (k + 1)), t3 = ord[k]; ord[k] = ord[k2]; ord[k2] = t3; }
      rounds.push({ tg: tg, ord: ord }); });
    o.dr = false; o.hv = null;
    function R0() { return rounds[Math.min(o.rd, 2)]; }
    function fin(t) {
      var R = R0(), tot = 0; o.pcs = R.ord.map(function (ty, i) { var tg = R.tg.filter(function (q) { return q[0] === ty; })[0], pp = o.pl[i]; if (!pp) return 0; var e = Math.hypot(pp[1] - tg[1], pp[2] - tg[2]); return Math.round(100 * Math.max(0, 1 - Math.max(0, e - 0.15) / 3.2)); });
      o.pcs.forEach(function (q) { tot += q; }); o.rp = Math.round(tot / R.ord.length); o.score += o.rp; o.rev = t; o.ends = t + RV;
    }
    function sync(t) { o.now = t; if (o.rev >= 0 && t >= o.ends) { o.rev = -1; o.rd++; o.pl = []; o.pcs = []; if (o.rd >= 3) o.fin = true; } }
    o.press = function (c, t) { sync(t); if ((c === 'KeyZ' || c === 'Backspace') && o.rev < 0 && o.pl.length && !o.fin) o.pl.pop(); };
    function inside(x, y) { var lx = (x - 240) / 10, lz = (y - 135) / 10; return Math.hypot(lx, lz) <= 4.7 ? [lx, lz] : null; }
    function place(x, y, t) {
      if (o.rev >= 0 || o.fin || x == null) return; var R = R0(), q = inside(x, y); if (!q) return;
      o.pl.push([R.ord[o.pl.length], q[0], q[1]]); if (o.pl.length >= R.ord.length) fin(t);
    }
    o.down = function (x, y, t) {
      sync(t); if (o.rev >= 0 || o.fin || x == null) return; var lp = o.pl[o.pl.length - 1], q = inside(x, y);
      if (lp && q && Math.hypot(lp[1] - q[0], lp[2] - q[1]) < 0.7) o.pl.pop();
      o.dr = true; o.hv = q;
    };
    o.move = function (x, y, t) { sync(t); if (o.dr) o.hv = x == null ? null : inside(x, y); };
    o.up = function (x, y, t) { sync(t); if (!o.dr) return; o.dr = false; o.hv = null; place(x, y, t); };
    o.click = function (x, y, t) { sync(t); place(x, y, t); };
    o.done = function () { return o.fin; };
    o.view = function (t) { sync(t); var R = R0(); return { score: o.score, rd: o.rd, n: R.ord.length, tg: R.tg, pl: o.pl, next: o.rev < 0 && !o.fin ? R.ord[o.pl.length] : -1, rev: o.rev >= 0 ? 1 : 0, hv: o.dr && o.hv ? o.hv : null, pcs: o.pcs, rp: o.rp, id: o.rd * 10 + (o.rev >= 0 ? 1 : 0), sid: seed }; };
    o.draw = function (g, t) { bg(g, '#2b1a45', '#12081f'); text(g, 'วางตามต้นแบบ รอบ ' + (o.rd + 1) + '  คะแนน ' + o.score, W / 2, 20, 14); };
    return o;
  }

  /* เงาขนม 3D: เงาของขนมหลายชิ้นซ้อนกัน ลากเมาส์หมุนดูเงา ติ๊กช่องว่ามีอะไรบ้างแล้วกดส่งคำตอบ */
  var TREAT = ['เชอรี่', 'ลูกอมห่อ', 'ช็อกโกแลตแท่ง', 'สตรอว์เบอร์รี', 'มาการอง', 'คัพเค้ก', 'ไอศกรีมโคน', 'อมยิ้ม', 'คุกกี้', 'เค้กชิ้น', 'ดาวน้ำตาล', 'หมีกัมมี่', 'ลูกอมไม้เท้า', 'โดนัท', 'หัวใจน้ำตาล', 'พุดดิ้ง'];
  function shadow(seed) {
    var o = { score: 0, rd: 0, tick: [], ph: 0, res: [0, 0, 0], at: -9, now: 0 }, cur = null;
    function mk(rd) {
      var rr = rng(seed * 19 + rd * 401 + 3), all = [], i, j; for (i = 0; i < 16; i++) all.push(i);
      for (i = 15; i > 0; i--) { j = Math.floor(rr() * (i + 1)); var tm = all[i]; all[i] = all[j]; all[j] = tm; }
      var cands = all.slice(0, 12), m = 2 + Math.min(2, Math.floor(rd / 2)) + (rr() < 0.4 ? 1 : 0), truth = cands.slice(0, m), shapes = truth.map(function (id, k) { return { id: id, x: (rr() * 2 - 1) * 8 + (k - (m - 1) / 2) * 30, y: (rr() * 2 - 1) * 12, z: (rr() * 2 - 1) * 30, rot: (rr() * 2 - 1) * 1.2, s: 0.9 + rr() * 0.25 }; });
      for (i = 11; i > 0; i--) { j = Math.floor(rr() * (i + 1)); var t2 = cands[i]; cands[i] = cands[j]; cands[j] = t2; }
      return { cands: cands, truth: truth, shapes: shapes, m: m };
    }
    function reset() { cur = mk(o.rd); o.tick = cur.cands.map(function () { return 0; }); o.ph = 0; }
    reset();
    function sync(t) { o.now = t; if (o.ph === 1 && t >= o.at + 2300) { o.rd++; reset(); } }
    function submit(t) {
      sync(t); if (o.ph !== 0) return; var ok = 0, bad = 0; cur.cands.forEach(function (id, k) { if (o.tick[k]) { if (cur.truth.indexOf(id) >= 0) ok++; else bad++; } });
      var pts = Math.max(0, ok * 3 - bad * 2) + (ok === cur.m && bad === 0 ? 4 : 0); o.score += pts; o.res = [ok, bad, pts]; o.ph = 1; o.at = t;
    }
    function cell(x, y) { for (var k = 0; k < 12; k++) { var cx = 54 + (k % 6) * 62, cy = 144 + Math.floor(k / 6) * 52; if (x >= cx && x < cx + 60 && y >= cy && y < cy + 50) return k; } return -1; }
    o.press = function (c, t) { sync(t); if (c === 'Enter' || c === 'Space') submit(t); };
    o.click = function (x, y, t) { sync(t); if (o.ph !== 0) return; if (x >= 362 && x <= 450 && y >= 66 && y <= 110) { submit(t); return; } var k = cell(x, y); if (k >= 0) o.tick[k] ^= 1; };
    o.done = function () { return false; };
    o.view = function (t) { sync(t); return { score: o.score, rd: o.rd, id: o.rd * 10 + o.ph, sid: seed * 100 + o.rd, cands: cur.cands.map(function (id) { return [id, TREAT[id]]; }), tick: o.tick.slice(), shapes: cur.shapes, truth: o.ph === 1 ? cur.cands.map(function (id) { return cur.truth.indexOf(id) >= 0 ? 1 : 0; }) : null, ph: o.ph, m: cur.m, res: o.res, msg: o.ph === 1 ? (o.res[0] === cur.m && !o.res[1] ? 'ถูกหมด! +' + o.res[2] : 'ถูก ' + o.res[0] + '/' + cur.m + ' ผิด ' + o.res[1] + '  +' + o.res[2]) : '', msz: 18, my: 48 }; };
    o.draw = function (g, t) { bg(g, '#2b1a45', '#12081f'); text(g, 'ติ๊กว่าในเงามีอะไร  คะแนน ' + o.score, W / 2, 20, 14); };
    return o;
  }

  var GAMES = {
    slice:    { v3: 'slice', name: 'หั่นเค้ก', how: 'มีดแกว่งไปมา คลิก (หรือ Space) ให้มีดหั่นลงตรงเส้นประบนเค้ก ตรงเป๊ะจะเรียบสวย พลาดเค้กจะแหว่ง 5 ครั้ง', dur: 30000, make: timing },
    stack:    { v3: 'stack', name: 'ต่อชั้นเค้ก', how: 'คลิก (หรือ Space) ให้ชั้นเค้กหล่นทับชั้นล่าง ส่วนที่ล้นจะถูกตัดออก ยิ่งชั้นสูงยิ่งเร็ว', dur: 45000, make: stack },
    mole:     { v3: 'mole', name: 'ตีตัวตุ่น', how: 'คลิกเมาส์ที่ตัวตุ่นที่โผล่ในหลุมให้ทันก่อนมุดหนี ยิ่งนานยิ่งโผล่เร็ว 45 วินาที', dur: 45000, make: mole },
    mash:     { v3: 'mash', name: 'รัวสเปซบาร์', how: 'คลิกเมาส์หรือกด Space รัวให้เร็วที่สุด 10 วินาที ทั้งหมด 3 รอบ เล่นพร้อมกัน', dur: 36000, make: mash },
    maze:     { v3: 'maze', name: 'เขาวงกตเค้ก', how: '← → เลี้ยว ↑ เดิน ↓ ถอย (หรือ WASD) ไปให้ถึงลานเค้กกลางเขาวงกตก่อนใคร', dur: 65000, make: maze },
    shoot:    { v3: 'shoot', name: 'ยิงเป้า', how: 'คลิกเค้กที่โผล่ขึ้นมาให้เละ ยิ่งเล็กยิ่งได้เยอะ ยิ่งนานยิ่งเร็ว คลิกพลาดไม่เสียแต้ม 45 วินาที', dur: 45000, make: shoot },
    numbers:  { v3: 'numbers', name: 'เรียงเลข 1-20', how: 'คลิกตัวเลขเรียงจาก 1 ไป 20 ให้เร็วที่สุด ใครกดครบก่อนชนะ', dur: 45000, make: numbers },
    color:    { v3: 'color', name: 'กดตามสี', how: 'คลิกปุ่มที่เป็นสีเดียวกับกล่องสีด้านบน ตำแหน่งปุ่มสลับทุกข้อ กดผิดโดนสตัน', dur: 45000, make: colorgame },
    order:    { v3: 'order', name: 'ตกแต่งเค้กตามออเดอร์', how: 'ดูเค้กต้นแบบทางซ้าย แล้วกดเมาส์ค้างบนเค้กของคุณ เลื่อนดูตำแหน่ง ปล่อยเพื่อวางของชิ้นถัดไปให้ตรงต้นแบบ คะแนน = % ความแม่น 3 รอบ (กดค้างที่ชิ้นล่าสุดเพื่อหยิบใหม่ หรือกด Z)', dur: 85000, make: order },
    shadow:   { v3: 'shadow', name: 'เงาขนม', how: 'ดูเงาขนมที่ซ้อนกัน กดเมาส์ค้างแล้วลากเพื่อหมุนดูเงา ติ๊กช่องขนมที่อยู่ในเงา แล้วกดส่ง ติ๊กถูก +3 ติ๊กผิด -2 ถูกหมดโบนัส +4', dur: 50000, make: shadow },
    count:    { v3: 'count', name: 'นับขนม', how: 'ขนมหล่นลงถาดแวบเดียวแล้วถูกครอบ นับให้ถูกแล้วเลือกคำตอบ ถูกและตอบไวได้แต้มเยอะ', dur: 45000, make: count },
    simon:    { v3: 'simon', name: 'จำลำดับลูกศร', how: 'ดูลูกศรที่กะพริบแล้วคลิกปุ่มทิศซ้ำตามลำดับ ยิ่งจำได้ยาวยิ่งได้เยอะ', dur: 40000, make: simon },
    balance:  { v3: 'balance', name: 'ทรงตัวไอศกรีม', how: 'กด Space ครั้งหนึ่งไอศกรีมเลื่อนซ้าย กดอีกทีเลื่อนขวา สลับไปเรื่อยๆ รับสกู๊ปที่ตกลงมา 30 วินาที เมื่อหมดเวลาจะนับก้อนไอศกรีมแข่งกันทีละก้อน ใครน้อยสุดตกรอบ', dur: 50000, make: balance },
    runner:   { v3: 'runner', name: 'กระโดดข้ามขนม', how: 'Space / W / คลิก = กระโดด (กดค้าง = สูงขึ้น) รอดนานสุดชนะ 2 รอบ', dur: 50000, make: runner },
    addmath:  { v3: 'addmath', name: 'บวกเลขไว', how: 'แก้โจทย์บวกเลขในใจ แล้วคลิกคำตอบที่ถูกจาก 4 ตัวเลือก กดผิดโดนสตัน', dur: 20000, make: addmath },
    memory:   { v3: 'memory', name: 'จับคู่การ์ด', how: 'คลิกเปิดการ์ดทีละใบหาคู่ที่เหมือนกัน 16 ใบ ครบทั้งกระดานได้โบนัส', dur: 30000, make: memory },
    holdbar:  { v3: 'holdbar', name: 'กดค้างให้พอดี', how: 'กดค้าง (เมาส์หรือ Space) เพื่อเทไอศกรีมลงแก้ว ปล่อยเมื่อถึงเส้นประแดง 5 ครั้ง', dur: 30000, make: holdbar },
    sweetveg: { v3: 'sweetveg', name: 'ขนมหรือผัก', how: 'ดูคำแล้วคลิกฝั่งซ้ายถ้าเป็นขนม ฝั่งขวาถ้าเป็นผัก (หรือ A/D) กดผิดโดนสตัน', dur: 20000, make: sweetveg },
    reaction: { v3: 'reaction', name: 'วางเชอร์รี่บนเค้ก', how: 'คลิก/Space ให้เชอร์รี่ตกลงในวงบนเค้ก ยิ่งใกล้กลางยิ่งได้เยอะ', dur: 30000, make: reaction },
  };

  return { rng: rng, GAMES: GAMES, IDS: Object.keys(GAMES), MOLE_KEYS: MOLE_KEYS, W: W, H: H };
});
