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
  function arrows(seed) {
    var r = rng(seed), seq = [], rev = [], i; for (i = 0; i < 600; i++) { seq.push(ARROWS[Math.floor(r() * 4)]); rev.push(r() < 0.3); }
    var OPP = { ArrowUp: 'ArrowDown', ArrowDown: 'ArrowUp', ArrowLeft: 'ArrowRight', ArrowRight: 'ArrowLeft' };
    var o = { score: 0, stun: -1, idx: 0 };
    function want(k) { return rev[k] ? OPP[seq[k]] : seq[k]; }
    o.press = function (c, t) {
      c = ALT[c] || c; if (ARROWS.indexOf(c) < 0 || t < o.stun) return;
      if (c === want(o.idx)) { o.score++; o.idx++; } else o.stun = t + 1400;
    };
    o.click = function (x, y, t) { var k = rowHit(4, x, y, 214); if (k >= 0) o.press(ARROWS[k], t); };
    o.done = function () { return false; };
    o.draw = function (g, t) {
      var st = t < o.stun; bg(g, st ? '#5a1f2b' : '#1f3d2b', st ? '#2a0e14' : '#0e2016');
      text(g, GLYPH[seq[o.idx]], W / 2, 100, 100, st ? '#ff8787' : (rev[o.idx] ? '#ff6b6b' : '#fff'));
      text(g, GLYPH[seq[o.idx + 1]], W / 2 + 130, 110, 36, rev[o.idx + 1] ? '#a05a5a' : '#8a9a90');
      text(g, st ? 'กดผิด! รอสักครู่...' : (rev[o.idx] ? 'ลูกศรแดง = กดทิศตรงข้าม!' : 'คลิกปุ่มทิศให้ตรง (หรือ WASD)'), W / 2, 170, 15, rev[o.idx] ? '#ff8787' : '#c9b6e0');
      drawRow(g, ['↑', '→', '↓', '←'], null, 214, '#fff');
      text(g, 'คะแนน ' + o.score, W / 2, 25, 18);
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

  /* 8) เรียงเลข 1-9 (เมาส์) */
  function numbers(seed) {
    var r = rng(seed), o = { score: 0, next: 1, board: null, wrong: -1 };
    function mkBoard() {
      var ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], i; for (i = 11; i > 0; i--) { var j = Math.floor(r() * (i + 1)), tmp = ids[i]; ids[i] = ids[j]; ids[j] = tmp; }
      return ids.map(function (n, k) { return { n: n, x: 70 + (k % 4) * 114 + (r() - 0.5) * 50, y: 62 + Math.floor(k / 4) * 74 + (r() - 0.5) * 24 }; });
    }
    o.board = mkBoard();
    o.press = function () {};
    o.click = function (x, y, t) {
      for (var i = 0; i < o.board.length; i++) { var b = o.board[i]; if (Math.hypot(x - b.x, y - b.y) <= 20) {
        if (b.n === o.next) { o.score++; o.next++; if (o.next > 12) { o.score += 4; o.next = 1; o.board = mkBoard(); } } else { o.wrong = t; o.score = Math.max(0, o.score - 1); }
        return; } }
    };
    o.done = function () { return false; };
    o.draw = function (g, t) {
      bg(g, '#1f3a5f', '#0e1c30');
      o.board.forEach(function (b) { var done = b.n < o.next; g.fillStyle = done ? '#495057' : (o.wrong >= 0 && t - o.wrong < 200 && b.n === o.next ? '#ff8787' : '#ffd43b'); g.beginPath(); g.arc(b.x, b.y, 19, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#1b1226'; g.stroke(); text(g, String(b.n), b.x, b.y, 16, done ? '#adb5bd' : '#3a0f26'); });
      text(g, 'คลิกเลขเรียง 1→12 (กดผิด -1)  คะแนน ' + o.score, W / 2, 20, 14);
    };
    return o;
  }

  /* 9) กดตามสี (1-4) */
  var COL = [['#ff6b6b', 'แดง'], ['#4dabf7', 'ฟ้า'], ['#ffd43b', 'เหลือง'], ['#69db7c', 'เขียว']];
  function colorgame(seed) {
    var r = rng(seed), seq = [], perm = [], i; for (i = 0; i < 600; i++) { seq.push(Math.floor(r() * 4)); var p = [0, 1, 2, 3], j; for (j = 3; j > 0; j--) { var q = Math.floor(r() * (j + 1)), tmp = p[j]; p[j] = p[q]; p[q] = tmp; } perm.push(p); }
    var o = { score: 0, idx: 0, stun: -1 };
    function pick(ci, t) { if (t < o.stun) return; if (ci === seq[o.idx]) { o.score++; o.idx++; } else o.stun = t + 1200; }
    o.press = function (c, t) { if (c in DIGITS) pick(DIGITS[c], t); };
    o.click = function (x, y, t) { var k = rowHit(4, x, y, 196); if (k >= 0) pick(perm[o.idx][k], t); };
    o.done = function () { return false; };
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
      if (c === seq[o.pos]) { o.pos++; if (o.pos >= o.len) { o.score += o.len; o.len++; o.phase = 'show'; o.ps = t + 700; } }
      else { o.bad = t; o.phase = 'show'; o.ps = t + 1000; }
    };
    o.click = function (x, y, t) { var k = rowHit(4, x, y, 214); if (k >= 0) o.press(ARROWS[k], t); };
    o.done = function () { return false; };
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
    var r = rng(seed), RA = 1000, RL = 30000, GAP = 2000;
    var o = { score: 0, x: 240, dir: 0, sc: [], st: 0, rd0: -9, nx: 0, fl: 0, nrd: 0 };
    function rdOf(t) { var u = t - RA; if (u < 0) return -1; var q = Math.floor(u / (RL + GAP)); if (q > 1) return -2; return (u - q * (RL + GAP)) < RL ? q : -1; }
    stepper(o, 10, function (t, dt) {
      var q = rdOf(t);
      if (q !== o.rd0) { o.rd0 = q; o.sc = []; if (q >= 0) { o.x = 240; o.dir = 0; o.st = 0; o.nx = t + 700; } }
      if (q < 0) return;
      var el = (t - RA - q * (RL + GAP)) / 1000;
      o.x = Math.max(34, Math.min(446, o.x + o.dir * 170 * dt));
      if (t >= o.nx) { o.sc.push({ x: 40 + r() * 400, y: -20, k: Math.floor(r() * 4) }); o.nx = t + Math.max(420, 860 - el * 14); }
      var vy = 115 + el * 3.2, line = 196;
      o.sc = o.sc.filter(function (s) {
        s.y += vy * dt;
        if (s.y >= line && s.y <= line + 36 && Math.abs(s.x - o.x) < 36) { o.score++; o.st++; o.fl = t; return false; }
        return s.y < 290;
      });
    });
    o.press = function (c, t) {
      if (!(isGo(c) || c === 'KeyA' || c === 'KeyD' || c === 'ArrowLeft' || c === 'ArrowRight')) return;
      o.adv(t); if (rdOf(t) < 0) return; o.dir = o.dir === -1 ? 1 : -1;
    };
    o.release = function () {};
    o.done = function () { return false; };
    o.view = function (t) {
      o.adv(t); var q = rdOf(t), el = q >= 0 ? (t - RA - q * (RL + GAP)) / 1000 : 0;
      return { score: o.score, x: o.x, dir: o.dir, st: o.st, rd: q, hit: t - o.fl < 220 ? 1 : 0, end: t >= RA + RL + GAP + RL ? 1 : 0, sc: o.sc.map(function (s) { return [s.x, s.y, s.k]; }), msg2: q >= 0 ? 'รอบ ' + (q + 1) + '/2  เหลือ ' + Math.max(0, Math.ceil(RL / 1000 - el)) + ' วิ' : t < RA ? '' : q === -2 ? '' : 'พักแป๊บ... รอบที่ 2', id: 0 };
    };
    o.draw = function (g, t) { var v = o.view(t); bg(g, '#1f3a5f', '#0e1c30'); g.fillStyle = '#e9a76b'; g.fillRect(v.x - 10, 200, 20, 40); text(g, 'คะแนน ' + o.score, W / 2, 20, 14); };
    return o;
  }

  /* 13) หลบหยดครีม (A/D ค้าง) */

  /* 14) กระโดดข้ามขนม (Space) */
  function runner(seed) {
    var r = rng(seed), PX = 90, RL = 30000, GAP = 2000, T0 = 1200, CW = 36;
    var o = { score: 0, rd: 0, rs: T0, y: 0, vy: 0, hold: false, ht: 0, buf: -9999, dead: false, deadAt: 0, rsec: [0, 0], fin: false, obs: [], wait: -1, hurt: -9999 };
    function D(s) { return 230 * s + 4 * s * s; }
    function spd(s) { return 230 + 8 * s; }
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
      return { t: t, h: o.y, stun: o.dead ? 1 : 0, score: o.score, spd: spd(tr), px: PX, obs: vis, msg: o.dead && !o.fin ? 'ชน!' : o.surv && o.wait >= 0 ? 'รอดครบ 30 วิ!' : '', msz: 40, my: 90, msg2: 'รอบ ' + Math.min(2, o.rd + 1) + '/2 · รอดมา ' + Math.floor(tr) + ' วิ', my2: 250, id: 0 };
    };
    o.draw = function (g, t) { var v = o.view(t); bg(g, '#2b1a45', '#12081f'); g.fillStyle = '#ffd43b'; g.fillRect(PX - 12, 192 - v.h, 24, 28); v.obs.forEach(function (b) { g.fillStyle = '#e9a76b'; g.fillRect(b[0], 192, b[1], 28); }); text(g, 'รอดรวม ' + o.score + ' วิ', W / 2, 20, 14); };
    return o;
  }


  /* ---------- ชุดที่ 3 ---------- */
  function clampN(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* 15) เก็บขนมหลบผัก */
  function basket(seed) {
    var r = rng(seed), items = [], t0 = 600;
    while (t0 < 21500) { var q = r(); items.push({ t: t0, x: 24 + r() * 432, v: 190 + r() * 100, k: q < 0.07 ? 2 : q < 0.55 ? 0 : 1, done: false }); t0 += 220 + Math.floor(r() * 200); }
    var o = { score: 0, x: 240, held: {}, last2: 0 };
    stepper(o, 10, function (t, dt) {
      var mv = (o.held.ArrowRight || o.held.KeyD ? 1 : 0) - (o.held.ArrowLeft || o.held.KeyA ? 1 : 0);
      o.x = clampN(o.x + mv * 250 * dt, 28, 452);
      items.forEach(function (c) {
        if (c.done || t < c.t) return; var y = -10 + (t - c.t) / 1000 * c.v;
        if (y >= 232 && y <= 262 && Math.abs(c.x - o.x) < 28) { c.done = true; o.score = Math.max(0, o.score + (c.k === 0 ? 1 : c.k === 2 ? 3 : -2)); o.last2 = t; }
        else if (y > 272) c.done = true;
      });
    });
    o.press = function (c, t) { o.adv(t); o.held[c] = true; };
    o.release = function (c, t) { o.adv(t); o.held[c] = false; };
    o.done = function () { return false; };
    o.view = function (t) { o.adv(t); return { x: o.x, score: o.score, d: items.filter(function (c) { return !c.done && t >= c.t; }).map(function (c) { return [c.x, -10 + (t - c.t) / 1000 * c.v, c.k]; }) }; };
    o.draw = function (g, t) {
      o.adv(t); bg(g, '#2b1a45', '#12081f'); g.fillStyle = '#e8d4f0'; g.fillRect(0, 262, W, 8);
      items.forEach(function (c) { if (!c.done && t >= c.t) { var y = -10 + (t - c.t) / 1000 * c.v; g.fillStyle = c.k === 1 ? '#51cf66' : c.k === 2 ? '#ffe066' : '#ff8fb1'; g.beginPath(); g.arc(c.x, y, 9, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#1b1226'; g.stroke(); if (c.k === 1) text(g, 'ผัก', c.x, y, 8, '#12310a'); } });
      g.fillStyle = '#e9a76b'; g.fillRect(o.x - 28, 240, 56, 22); g.strokeStyle = '#1b1226'; g.strokeRect(o.x - 28, 240, 56, 22);
      text(g, 'A/D ขยับ รับขนม (ชมพู+1 ทอง+3) หลบผัก (-2)  คะแนน ' + o.score, W / 2, 16, 12);
    };
    return o;
  }

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
    o.draw = function (g, t) {
      var st = t < o.stun; bg(g, st ? '#4a1f2b' : '#2b1a45', '#12081f');
      g.fillStyle = 'rgba(105,219,124,0.0)'; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(10, 40, 225, 190); g.fillRect(245, 40, 225, 190);
      text(g, q[o.idx].w, W / 2, 120, 54, st ? '#ff8787' : '#fff');
      text(g, '← คลิกซ้าย = ขนม      คลิกขวา = ผัก →', W / 2, 205, 18, '#c9b6e0'); text(g, st ? 'ผิด!' : 'คะแนน ' + o.score, W / 2, 25, 18, st ? '#ff8787' : '#fff');
    };
    return o;
  }

  var GAMES = {
    slice:    { v3: 'slice', name: 'หั่นเค้ก', how: 'มีดแกว่งไปมา คลิก (หรือ Space) ให้มีดหั่นลงตรงเส้นประบนเค้ก ตรงเป๊ะจะเรียบสวย พลาดเค้กจะแหว่ง 5 ครั้ง', dur: 30000, make: timing },
    stack:    { v3: 'stack', name: 'ต่อชั้นเค้ก', how: 'คลิก (หรือ Space) ให้ชั้นเค้กหล่นทับชั้นล่าง ส่วนที่ล้นจะถูกตัดออก ยิ่งชั้นสูงยิ่งเร็ว', dur: 45000, make: stack },
    mole:     { v3: 'mole', name: 'ตีตัวตุ่น', how: 'คลิกเมาส์ที่ตัวตุ่นที่โผล่ในหลุมให้ทันก่อนมุดหนี ยิ่งนานยิ่งโผล่เร็ว 45 วินาที', dur: 45000, make: mole },
    mash:     { v3: 'mash', name: 'รัวสเปซบาร์', how: 'คลิกเมาส์หรือกด Space รัวให้เร็วที่สุด 10 วินาที ทั้งหมด 3 รอบ เล่นพร้อมกัน', dur: 36000, make: mash },
    arrows:   { name: 'แข่งลูกศร', how: 'คลิกปุ่มทิศ (หรือ WASD) ตามลูกศร ถ้าลูกศรเป็นสีแดงให้กดทิศตรงข้าม ผิดติดสตัน', dur: 20000, make: arrows },
    shoot:    { v3: 'shoot', name: 'ยิงเป้า', how: 'คลิกเค้กที่โผล่ขึ้นมาให้เละ ยิ่งเล็กยิ่งได้เยอะ ยิ่งนานยิ่งเร็ว คลิกพลาดไม่เสียแต้ม 45 วินาที', dur: 45000, make: shoot },
    numbers:  { name: 'เรียงเลข 1-9', how: 'คลิกตัวเลขเรียงจาก 1 ไป 12 เร็วที่สุด คลิกผิด -1 ครบแล้วได้โบนัสและขึ้นกระดานใหม่', dur: 25000, make: numbers },
    color:    { name: 'กดตามสี', how: 'คลิกปุ่มที่เป็นสีเดียวกับกล่องสีด้านบน ตำแหน่งปุ่มสลับทุกข้อ กดผิดโดนสตัน', dur: 20000, make: colorgame },
    compare:  { name: 'เลขไหนมากกว่า', how: 'เลขสองตัวต่างกันนิดเดียว คลิกฝั่งที่มากกว่า (หรือ A/D) กดผิดโดนสตัน', dur: 20000, make: compare },
    simon:    { name: 'จำลำดับลูกศร', how: 'ดูลูกศรที่กะพริบแล้วคลิกปุ่มทิศซ้ำตามลำดับ ยิ่งจำได้ยาวยิ่งได้เยอะ', dur: 40000, make: simon },
    balance:  { v3: 'balance', name: 'ทรงตัวไอศกรีม', how: 'กด Space ครั้งหนึ่งไอศกรีมเลื่อนซ้าย กดอีกทีเลื่อนขวา สลับไปเรื่อยๆ รับสกู๊ปที่ตกลงมา 2 รอบ รอบละ 30 วิ', dur: 68000, make: balance },
    runner:   { v3: 'runner', name: 'กระโดดข้ามขนม', how: 'Space / W / คลิก = กระโดด (กดค้าง = สูงขึ้น) รอดนานสุดชนะ 2 รอบ', dur: 68000, make: runner },
    basket:   { v3: 'basket', name: 'เก็บขนมหลบผัก', how: 'ขยับตะกร้าด้วย A/D รับขนม (ชมพู +1 ทอง +3) ห้ามรับผักสีเขียว (-2)', dur: 22000, make: basket },
    addmath:  { name: 'บวกเลขไว', how: 'แก้โจทย์บวกเลขในใจ แล้วคลิกคำตอบที่ถูกจาก 4 ตัวเลือก กดผิดโดนสตัน', dur: 20000, make: addmath },
    memory:   { name: 'จับคู่การ์ด', how: 'คลิกเปิดการ์ดทีละใบหาคู่ที่เหมือนกัน 16 ใบ ครบทั้งกระดานได้โบนัส', dur: 30000, make: memory },
    holdbar:  { v3: 'holdbar', name: 'กดค้างให้พอดี', how: 'กดค้าง (เมาส์หรือ Space) เพื่อเทไอศกรีมลงแก้ว ปล่อยเมื่อถึงเส้นประแดง 5 ครั้ง', dur: 30000, make: holdbar },
    sweetveg: { name: 'ขนมหรือผัก', how: 'ดูคำแล้วคลิกฝั่งซ้ายถ้าเป็นขนม ฝั่งขวาถ้าเป็นผัก (หรือ A/D) กดผิดโดนสตัน', dur: 20000, make: sweetveg },
    reaction: { v3: 'reaction', name: 'วางเชอร์รี่บนเค้ก', how: 'คลิก/Space ให้เชอร์รี่ตกลงในวงบนเค้ก ยิ่งใกล้กลางยิ่งได้เยอะ', dur: 30000, make: reaction },
  };

  return { rng: rng, GAMES: GAMES, IDS: Object.keys(GAMES), MOLE_KEYS: MOLE_KEYS, W: W, H: H };
});
