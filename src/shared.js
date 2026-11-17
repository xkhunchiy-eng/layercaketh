/* มินิเกมสนามร่วม: เจ้าของห้องจำลองฟิสิกส์ ผู้เล่นส่งแค่ปุ่มที่กด แล้วทุกคนเห็นภาพเดียวกัน
   อินเทอร์เฟซ: make(players[slot], seed) -> sim { dur, input(slot,{x,y,a}), tick(dt), done, scores(), snapshot(), remove(slot) }
   draw(g, snap, env)  env = { me, names, sprite(slot,dir) } */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./minigames.js'));
  else root.CakeShared = factory(root.CakeMini);
})(typeof self !== 'undefined' ? self : globalThis, function (Mini) {
  'use strict';
  var W = 480, H = 270, rng = Mini.rng;
  var COLORS = ['#ff5d73', '#4dabf7', '#ffd43b', '#69db7c'];

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function num(v) { return typeof v === 'number' && isFinite(v) ? v : 0; }
  function baseInput(p, i) {
    if (!i || typeof i !== 'object') return;
    var x = clamp(num(i.x), -1, 1), y = clamp(num(i.y), -1, 1), l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    p.ix = x; p.iy = y; p.a = !!i.a;
    if (i.ax !== undefined) { p.ax = clamp(num(i.ax), 74, 406); p.ay = clamp(num(i.ay), 190, 390); }
  }
  function byslot(P, s) { for (var i = 0; i < P.length; i++) if (P[i].slot === s) return P[i]; return null; }
  function text(g, s, x, y, size, color, align) {
    g.font = 'bold ' + size + 'px TAGBA, sans-serif'; g.textAlign = align || 'center'; g.textBaseline = 'middle';
    g.lineWidth = 3; g.strokeStyle = '#1b1226'; g.strokeText(s, x, y); g.fillStyle = color || '#fff'; g.fillText(s, x, y);
  }
  function person(g, env, slot, x, y, dir, alpha) {
    var sp = env.sprite(slot, dir || 'front'); if (!sp) return;
    g.globalAlpha = alpha === undefined ? 1 : alpha;
    g.drawImage(sp, Math.round(x - 12), Math.round(y - 30), 24, 36);
    g.globalAlpha = 1;
    var nm = (slot === env.me ? '★' : '') + (env.names[slot] || '');
    text(g, nm, x, y - 36, 9, '#fff');
  }
  function dirOf(p) { return Math.abs(p.ix) > Math.abs(p.iy) ? (p.ix > 0 ? 'right' : 'left') : (p.iy < 0 ? 'back' : 'front'); }
  function scoreBar(g, snap, env) {
    var x = 8; (snap.S || []).forEach(function (r) {
      text(g, (env.names[r[0]] || '') + ' ' + r[1], x, 12, 10, COLORS[r[0] % 4], 'left'); x += 110;
    });
  }
  function common(sim, players, dur, seed) {
    sim.dur = dur; sim.time = 0; sim.done = false; sim.n = players.length; sim.rnd = rng(seed);
    sim.input = function (slot, i) { var p = byslot(sim.P, slot); if (p) baseInput(p, i); };
    return sim;
  }

  /* 1) กำแพงเจาะรู */
  function wall(players, seed) {
    var sim = { P: players.map(function (s, i) { return { slot: s, x: 110 + i * 40, y: 135, ix: 0, iy: 0, a: false, alive: true, ts: 0, fx: 1, fy: 0, cd: 0, stun: 0 }; }), walls: [], next: 1.2, lastGap: 135 };
    common(sim, players, 60, seed);
    var PUSH = { range: 36, imp: 380, stun: 0.55, cd: 2.4 };
    sim.tick = function (dt) {
      if (sim.done) return; sim.time += dt; var t = sim.time, i, j;
      sim.P.forEach(function (p) { if (!p.alive) return; dstep(sim, p, dt, 110, [-60, 380, 24, 246], { push: PUSH }); });
      if (t >= sim.next) { var gc = clamp(sim.lastGap + (sim.rnd() - 0.5) * 160, 60, 210); sim.walls.push({ x: 422, gy: gc, gh: 84 }); sim.lastGap = gc; sim.next += Math.max(0.8, 2.3 - t * 0.02); }
      var sp = 85 + Math.min(t, 60) * 3.4;
      sim.walls.forEach(function (w) { w.x -= sp * dt; });
      sim.walls = sim.walls.filter(function (w) { return w.x > -30; });
      sim.P.forEach(function (p) {
        if (!p.alive) return;
        sim.walls.forEach(function (w) { if (Math.abs(p.x - w.x) < 22 && (p.y - 10 < w.gy - w.gh / 2 || p.y + 10 > w.gy + w.gh / 2)) p.x = p.x < w.x ? w.x - 22 : Math.min(380, w.x + 22); });
        if (p.x < -4) { p.alive = false; p.ts = t; }
      });
      var alive = sim.P.filter(function (p) { return p.alive; }).length;
      if ((sim.n > 1 ? alive <= 1 : alive === 0) || t >= sim.dur) sim.done = true;
    };
    sim.scores = function () { return sim.P.map(function (p) { return [p.slot, Math.floor((p.alive ? sim.time : p.ts) * 10) + (sim.done && p.alive && sim.n > 1 ? 50 : 0)]; }); };
    sim.remove = function (slot) { var p = byslot(sim.P, slot); if (p && p.alive) { p.alive = false; p.ts = sim.time; } };
    sim.snapshot = function () {
      return { tl: Math.max(0, Math.round(sim.dur - sim.time)), done: sim.done, S: sim.scores(), P: sim.P.map(function (p) { return [p.slot, Math.round(p.x), Math.round(p.y), p.alive ? 1 : 0, p.cd <= 0 ? 1 : 0, p.stun > 0 ? 1 : 0, Math.round(p.cd * 10)]; }),
        Wl: sim.walls.map(function (w) { return [Math.round(w.x), Math.round(w.gy), w.gh]; }) };
    };
    return sim;
  }
  function drawWall(g, s, env) {
    g.fillStyle = '#2b1a45'; g.fillRect(0, 0, W, H); g.fillStyle = '#3a2158'; g.fillRect(0, 262, W, 8); g.fillRect(0, 0, W, 8);
    s.Wl.forEach(function (w) { g.fillStyle = '#f3b3c4'; g.fillRect(w[0] - 12, 8, 24, w[1] - w[2] / 2 - 8); g.fillRect(w[0] - 12, w[1] + w[2] / 2, 24, 262 - (w[1] + w[2] / 2)); g.strokeStyle = '#6b3f2a'; g.strokeRect(w[0] - 12, 8, 24, w[1] - w[2] / 2 - 8); g.strokeRect(w[0] - 12, w[1] + w[2] / 2, 24, 262 - (w[1] + w[2] / 2)); });
    s.P.slice().sort(function (a, b) { return a[2] - b[2]; }).forEach(function (p) { person(g, env, p[0], p[1], p[2], p[4] > 0 ? 'right' : 'front', p[3] ? 1 : 0.25); });
    scoreBar(g, s, env);
  }

  /* 2) ไฟแดงไฟเขียว */
  function redlight(players, seed) {
    var LEN = 1800, X0 = 30;
    var sim = { P: players.map(function (s, i) { return { slot: s, x: X0, y: 70 + i * 48, ix: 0, iy: 0, a: false, fin: false, ft: 0, frozen: 0 }; }), green: true, next: 2.5, redAt: -9, nfin: 0 };
    common(sim, players, 60, seed);
    sim.tick = function (dt) {
      if (sim.done) return; sim.time += dt; var t = sim.time;
      if (t >= sim.next) { sim.green = !sim.green; sim.next = t + (sim.green ? 2 + sim.rnd() * 3 : 1.6 + sim.rnd() * 1.2); if (!sim.green) sim.redAt = t; }
      sim.P.forEach(function (p) {
        if (p.fin || t < p.frozen) return;
        var moving = Math.abs(p.ix) > 0.2;
        if (!sim.green && t - sim.redAt > 0.45 && moving) { p.x = Math.max(X0, p.x - 120); p.frozen = t + 1.0; return; }
        if (moving) p.x = clamp(p.x + p.ix * 95 * dt, X0, LEN);
        if (p.x >= LEN && !p.fin) { p.fin = true; p.ft = t; sim.nfin++; p.rank = sim.nfin; }
      });
      if (sim.P.every(function (p) { return p.fin; }) || (sim.n > 1 && sim.nfin >= sim.n - 1) || t >= sim.dur) sim.done = true;
    };
    sim.scores = function () { return sim.P.map(function (p) { return [p.slot, p.fin ? 100 + Math.max(0, Math.floor((sim.dur - p.ft) * 2)) : Math.floor((p.x - X0) / (LEN - X0) * 99)]; }); };
    sim.remove = function (slot) { var p = byslot(sim.P, slot); if (p) { p.fin = true; p.ft = sim.dur; p.x = X0; sim.nfin++; } };
    sim.snapshot = function () { return { tl: Math.max(0, Math.round(sim.dur - sim.time)), done: sim.done, S: sim.scores(), green: sim.green, warn: sim.green && sim.next - sim.time < 0.8 ? 1 : 0, L: LEN, P: sim.P.map(function (p) { return [p.slot, Math.round(p.x), Math.round(p.y), p.fin ? 1 : 0, sim.time < p.frozen ? 1 : 0]; }) }; };
    return sim;
  }
  function drawRed(g, s, env) {
    g.fillStyle = s.green ? '#1f3d2b' : '#4a1f2b'; g.fillRect(0, 0, W, H);
    s.P.forEach(function (p) { g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(20, p[2] - 20, 430, 38); });
    g.fillStyle = '#fff'; for (var i = 0; i < 12; i++) { g.fillRect(445, 40 + i * 16, 8, 8); }
    g.fillStyle = s.green ? '#69db7c' : '#ff6b6b'; g.beginPath(); g.arc(W / 2, 28, 16, 0, Math.PI * 2); g.fill();
    text(g, s.green ? 'เดินได้! (กดขวา/D ค้าง)' : 'หยุด! ห้ามขยับ', W / 2, 55, 12, '#fff');
    s.P.forEach(function (p) { person(g, env, p[0], p[1], p[2], 'right', p[4] ? 0.4 : 1); });
    scoreBar(g, s, env);
  }

  /* 3) รับขนมที่ตกลงมา */
  function catcher(players, seed) {
    var sim = { P: players.map(function (s, i) { return { slot: s, x: 80 + i * 100, y: 245, ix: 0, iy: 0, a: false, sc: 0, cd: 0, stun: 0, dash: 0, dir: 1, kx: 0, hit: {} }; }), cand: [], nextC: 0.5 };
    common(sim, players, 60, seed);
    var DK = { t: 0.15, sp: 560, cd: 2.2, range: 30, knock: 380, stun: 0.55 };
    sim.tick = function (dt) {
      if (sim.done) return; sim.time += dt;
      sim.P.forEach(function (p) {
        p.cd = Math.max(0, p.cd - dt); p.stun = Math.max(0, p.stun - dt); p.dash = Math.max(0, p.dash - dt);
        if (Math.abs(p.ix) > 0.2) p.dir = p.ix > 0 ? 1 : -1;
        if (p.a && p.cd <= 0 && p.stun <= 0 && p.dash <= 0) { p.dash = DK.t; p.cd = DK.cd; p.hit = {}; }
        if (p.dash > 0) {
          p.x = clamp(p.x + p.dir * DK.sp * dt, 16, 464);
          sim.P.forEach(function (q) { if (q !== p && !p.hit[q.slot] && Math.abs(q.x - p.x) < DK.range) { p.hit[q.slot] = 1; q.kx = p.dir * DK.knock; q.stun = DK.stun; } });
        } else if (p.stun <= 0) p.x = clamp(p.x + p.ix * 210 * dt, 16, 464);
        if (Math.abs(p.kx) > 1) { p.x = clamp(p.x + p.kx * dt, 16, 464); p.kx *= Math.max(0, 1 - 7 * dt); } else p.kx = 0;
      });
      while (sim.time >= sim.nextC) { sim.cand.push({ x: 20 + sim.rnd() * 440, y: -10, v: 90 + sim.rnd() * 60, gold: sim.rnd() < 0.12, kind: Math.floor(sim.rnd() * 4) }); sim.nextC += 0.32; }
      sim.cand.forEach(function (c) {
        c.y += c.v * dt; if (c.dead) return;
        var best = null, bd = 1e9;
        if (c.y >= 222 && c.y <= 262) sim.P.forEach(function (p) { var d = Math.abs(p.x - c.x); if (d < 22 && d < bd) { bd = d; best = p; } });
        if (best) { best.sc += c.gold ? 3 : 1; c.dead = true; }
      });
      sim.cand = sim.cand.filter(function (c) { return !c.dead && c.y < 285; });
      if (sim.time >= sim.dur) sim.done = true;
    };
    sim.scores = function () { return sim.P.map(function (p) { return [p.slot, p.sc]; }); };
    sim.remove = function (slot) { sim.P = sim.P.filter(function (p) { return p.slot !== slot; }); };
    sim.snapshot = function () { return { tl: Math.max(0, Math.round(sim.dur - sim.time)), done: sim.done, S: sim.scores(), P: sim.P.map(function (p) { return [p.slot, Math.round(p.x), p.y, 1, p.cd <= 0 && p.stun <= 0 ? 1 : 0, p.stun > 0 ? 1 : 0, Math.round(p.cd * 10), Math.round(p.ix * 2)]; }), C: sim.cand.map(function (c) { return [Math.round(c.x), Math.round(c.y), c.gold ? 1 : 0, c.kind]; }) }; };
    return sim;
  }
  function drawCatch(g, s, env) {
    g.fillStyle = '#3a2158'; g.fillRect(0, 0, W, H); g.fillStyle = '#e8d4f0'; g.fillRect(0, 252, W, 18);
    s.C.forEach(function (c) { g.fillStyle = c[2] ? '#ffe066' : '#ff8fb1'; g.beginPath(); g.arc(c[0], c[1], c[2] ? 9 : 7, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#1b1226'; g.stroke(); });
    s.P.forEach(function (p) { person(g, env, p[0], p[1], p[2], 'back', 1); });
    scoreBar(g, s, env);
  }


  // ฟิสิกส์ผลักกันแบบซูโม่ (ใช้ร่วมกันหลายเกม): เร่งตามปุ่ม แรงเสียดทาน พุ่งชน (Space) และชนกัน
  /* สิ่งกีดขวางแบบกึ่งเขาวงกต (สี่เหลี่ยม [cx,cy,hw,hh] รอบจุดกลาง 240,140) */
  var MAZE = [[-300, -110, 90, 14], [300, -110, 90, 14], [-300, 110, 90, 14], [300, 110, 90, 14], [-120, 0, 14, 70], [120, 0, 14, 70], [0, -150, 70, 14], [0, 150, 70, 14], [-430, 0, 14, 60], [430, 0, 14, 60], [0, 0, 24, 24], [-210, -185, 14, 40], [210, -185, 14, 40], [-210, 185, 14, 40], [210, 185, 14, 40]]
    .map(function (o) { return [240 + o[0], 140 + o[1], o[2], o[3]]; });
  function obPush(p, r) {
    MAZE.forEach(function (o) {
      var dx = p.x - o[0], dy = p.y - o[1], qx = clamp(dx, -o[2], o[2]), qy = clamp(dy, -o[3], o[3]), ex = dx - qx, ey = dy - qy, d = Math.hypot(ex, ey);
      if (d >= r) return;
      if (d > 1e-6) { p.x += ex / d * (r - d); p.y += ey / d * (r - d); }
      else { var px = o[2] - Math.abs(dx), py = o[3] - Math.abs(dy); if (px < py) p.x = o[0] + (dx < 0 ? -1 : 1) * (o[2] + r); else p.y = o[1] + (dy < 0 ? -1 : 1) * (o[3] + r); }
    });
  }
  function inOb(x, y, m) { return MAZE.some(function (o) { return Math.abs(x - o[0]) < o[2] + m && Math.abs(y - o[1]) < o[3] + m; }); }
  /* ตัวช่วยร่วม: ผลัก/พุ่ง/มึน/กระเด็น */
  function actPush(sim, p, o) {
    var fl = Math.hypot(p.fx, p.fy) || 1, fx = p.fx / fl, fy = p.fy / fl;
    sim.P.forEach(function (q) {
      if (q === p || !q.alive) return;
      var dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy);
      if (d > o.range || d < 0.01 || (dx * fx + dy * fy) / d < -0.1) return;
      var nx = dx / d + fx, ny = dy / d + fy, nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      if (o.phys) { q.vx += nx * o.imp; q.vy += ny * o.imp; } else { q.kx = (q.kx || 0) + nx * o.imp; q.ky = (q.ky || 0) + ny * o.imp; }
      q.stun = o.stun; q.hit = sim.time;
    });
    p.cd = o.cd; p.pushT = sim.time;
  }
  // เดินตรง (ไม่ใช่ฟิสิกส์) + มึน + กระเด็น + พุ่งสั้น/ผลัก
  function dstep(sim, p, dt, speed, B, o) {
    p.cd = Math.max(0, (p.cd || 0) - dt); p.stun = Math.max(0, (p.stun || 0) - dt); p.dsh = Math.max(0, (p.dsh || 0) - dt);
    if (Math.hypot(p.ix, p.iy) > 0.1) { p.fx = p.ix; p.fy = p.iy; }
    if (o && p.a && p.cd <= 0 && p.stun <= 0) { if (o.push) actPush(sim, p, o.push); else { p.dsh = o.dash.t; p.cd = o.dash.cd; } }
    var ix = p.stun > 0 ? 0 : p.ix, iy = p.stun > 0 ? 0 : p.iy, k = 1;
    if (p.dsh > 0) { var fl = Math.hypot(p.fx, p.fy) || 1; ix = p.fx / fl; iy = p.fy / fl; k = o.dash.k; }
    p.x += (ix * speed * k + (p.kx || 0)) * dt; p.y += (iy * speed * k + (p.ky || 0)) * dt;
    var f = Math.exp(-5 * dt); p.kx = (p.kx || 0) * f; p.ky = (p.ky || 0) * f;
    p.x = clamp(p.x, B[0], B[1]); p.y = clamp(p.y, B[2], B[3]);
  }
  function rankPts(sim, key) {   // แต้มรอบ: อันดับดีได้มาก
    var L = sim.P.slice().sort(function (a, b) { return key(b) - key(a); });
    L.forEach(function (p, i) { if (i > 0 && key(L[i - 1]) === key(p)) p.rk = L[i - 1].rk; else p.rk = i; p.pts += sim.n - p.rk; });
  }
  function physics(P, dt, rad, o) {
    o = o || {}; var acc = o.acc || 1500, fr = o.fr || 6;
    var L = P.filter(function (p) { return p.alive; }), i, j;
    L.forEach(function (p) {
      p.cd = Math.max(0, p.cd - dt); p.stun = Math.max(0, (p.stun || 0) - dt); p.dashT = Math.max(0, (p.dashT || 0) - dt);
      if (Math.hypot(p.ix, p.iy) > 0.1) { p.fx = p.ix; p.fy = p.iy; }
      var ix = p.stun > 0 ? 0 : p.ix, iy = p.stun > 0 ? 0 : p.iy;
      p.vx += ix * acc * dt; p.vy += iy * acc * dt;
      var f = Math.exp(-fr * dt); p.vx *= f; p.vy *= f;
      if (p.a && p.cd <= 0 && p.stun <= 0) {
        if (o.push && o.sim) actPush(o.sim, p, o.push);
        else if (!o.push) { var l = Math.hypot(p.fx, p.fy) || 1; p.vx += p.fx / l * (o.dash || 300); p.vy += p.fy / l * (o.dash || 300); p.cd = 1.5; p.dashT = 0.35; p.hitD = false; }
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
    });
    for (i = 0; i < L.length; i++) for (j = i + 1; j < L.length; j++) {
      var a = L[i], b = L[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d < rad * 2) {
        var nx, ny; if (d < 1e-6) { nx = 1; ny = 0; d = 0; } else { nx = dx / d; ny = dy / d; }
        var ov = (rad * 2 - d) / 2; a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
        var vr = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (vr > 0) { var k = 0.95 * vr; a.vx -= k * nx; a.vy -= k * ny; b.vx += k * nx; b.vy += k * ny; }
        if (o.knock) { if (a.dashT > 0 && !a.hitD) { a.hitD = true; b.vx += nx * o.knock; b.vy += ny * o.knock; } if (b.dashT > 0 && !b.hitD) { b.hitD = true; a.vx -= nx * o.knock; a.vy -= ny * o.knock; } }
      }
    }
  }

  /* 4) ซูโม่บนจานเค้ก */
  function sumo(players, seed) {
    var n = players.length, RM = n > 1 ? 3 : 1;
    var sim = { P: players.map(function (s) { return { slot: s, x: 0, y: 0, vx: 0, vy: 0, fx: 0, fy: 1, ix: 0, iy: 0, a: false, alive: true, ts: 0, cd: 0, stun: 0, pts: 0 }; }), R: 150, rd: 1, RM: RM, pause: 0, rt: 0 };
    common(sim, players, RM * 70 + 20, seed);
    var rad = 13;
    function setup() {
      sim.P.forEach(function (p, i) { var a = i / n * Math.PI * 2 + 0.6; p.x = 240 + Math.cos(a) * 85; p.y = 140 + Math.sin(a) * 85; p.vx = p.vy = 0; p.alive = !p.gone; p.ts = 0; p.cd = 0; p.stun = 0; p.fx = -Math.cos(a); p.fy = -Math.sin(a); });
      sim.R = 150; sim.rt = 0;
    }
    setup();
    sim.tick = function (dt) {
      if (sim.done) return; sim.time += dt;
      if (sim.pause > 0) { sim.pause -= dt; if (sim.pause <= 0) { if (sim.rd >= RM) sim.done = true; else { sim.rd++; setup(); } } return; }
      sim.rt += dt; var t = sim.rt;
      sim.R = Math.max(60, 150 - Math.max(0, t - 8) * 2.4);
      physics(sim.P, dt, rad, { acc: 300, fr: 1.7, dash: 130, knock: 150 });
      sim.P.forEach(function (p) { if (p.alive && Math.hypot(p.x - 240, p.y - 140) > sim.R + 6) { p.alive = false; p.ts = t; } });
      var alive = sim.P.filter(function (p) { return p.alive; }).length;
      if ((n > 1 ? alive <= 1 : alive === 0) || t >= 60) { rankPts(sim, function (p) { return p.alive ? 1e6 : p.ts; }); sim.pause = 2.2; }
      if (sim.time >= sim.dur) sim.done = true;
    };
    sim.scores = function () { return sim.P.map(function (p) { return [p.slot, p.pts * 10 + (sim.pause <= 0 && !sim.done ? 0 : 0)]; }); };
    sim.remove = function (slot) { var p = byslot(sim.P, slot); if (p) { p.gone = true; if (p.alive) { p.alive = false; p.ts = sim.rt; } } };
    sim.snapshot = function () { return { tl: -1, rd: sim.rd, RM: RM, pz: sim.pause > 0 ? 1 : 0, done: sim.done, S: sim.scores(), R: Math.round(sim.R), P: sim.P.map(function (p) { return [p.slot, Math.round(p.x), Math.round(p.y), p.alive ? 1 : 0, p.cd <= 0 ? 1 : 0, p.stun > 0 ? 1 : 0, Math.round(p.cd * 10)]; }) }; };
    return sim;
  }
  function drawSumo(g, s, env) {
    g.fillStyle = '#1a0f2b'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffe3ec'; g.beginPath(); g.arc(240, 140, s.R, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#c98a5a'; g.lineWidth = 5; g.stroke(); g.lineWidth = 1;
    s.P.slice().sort(function (a, b) { return a[2] - b[2]; }).forEach(function (p) { if (p[3]) { g.fillStyle = 'rgba(40,10,50,0.3)'; g.beginPath(); g.ellipse(p[1], p[2] + 5, 12, 5, 0, 0, Math.PI * 2); g.fill(); } person(g, env, p[0], p[1], p[2], 'front', p[3] ? 1 : 0.2); if (p[3] && p[0] === env.me) { g.fillStyle = p[4] ? '#69db7c' : '#868e96'; g.fillRect(p[1] - 10, p[2] + 9, 20, 3); } });
    text(g, 'ดันเพื่อนให้ตกจาน! Space = พุ่งชน', W / 2, 255, 11, '#c9b6e0');
    scoreBar(g, s, env);
  }


  /* 5) ปั๊มระเบิด */
  function bomb(players, seed) {
    var sim = { P: players.map(function (s) { return { slot: s, ix: 0, iy: 0, a: false, prev: false, sc: 0 }; }), round: 0, pressure: 0, thr: 0, cj: 1, pause: 0, boom: -1, turn: 0, tt: 0, presses: 0 };
    common(sim, players, 60, seed);
    var ROUNDS = 3, TURN = 3, MINP = 2;
    function cur() { return sim.P.length ? sim.P[sim.turn % sim.P.length] : null; }
    function newRound() { sim.round++; sim.pressure = 0; sim.thr = 21 + Math.floor(sim.rnd() * 18); sim.cj = 0.85 + sim.rnd() * 0.3; sim.boom = -1; sim.turn = (sim.round - 1) % Math.max(1, sim.P.length); sim.tt = TURN; sim.presses = 0; }
    newRound();
    function explode(loser) { sim.boom = loser; sim.pause = 2.2; sim.P.forEach(function (p) { if (p.slot !== loser) p.sc++; }); }
    sim.tick = function (dt) {
      if (sim.done) return; sim.time += dt;
      if (sim.pause > 0) { sim.pause -= dt; if (sim.pause <= 0) { if (sim.round >= ROUNDS) sim.done = true; else newRound(); } return; }
      var c = cur(); if (!c) { sim.done = true; return; }
      if (c.a && !c.prev) { sim.pressure++; sim.presses++; if (sim.pressure >= sim.thr) explode(c.slot); }
      sim.P.forEach(function (p) { p.prev = p.a; });
      if (sim.boom < 0) {
        sim.tt -= dt;
        if (sim.tt <= 0) {
          if (sim.presses < MINP) { sim.pressure += MINP - sim.presses; if (sim.pressure >= sim.thr) { explode(c.slot); return; } }
          sim.turn = (sim.turn + 1) % sim.P.length; sim.tt = TURN; sim.presses = 0;
        }
      }
      if (sim.time >= sim.dur) sim.done = true;
    };
    sim.scores = function () { return sim.P.map(function (p) { return [p.slot, p.sc]; }); };
    sim.remove = function (slot) { sim.P = sim.P.filter(function (p) { return p.slot !== slot; }); if (!sim.P.length) sim.done = true; };
    sim.snapshot = function () { var c = cur(); return { tl: Math.max(0, Math.round(sim.dur - sim.time)), done: sim.done, S: sim.scores(), rd: sim.round, RM: ROUNDS, size: Math.round(Math.min(0.97, sim.pressure / (sim.thr * sim.cj)) * 100) / 100, boom: sim.boom, cur: sim.boom === -1 && c ? c.slot : -1, tt: Math.round(Math.max(0, sim.tt) * 10) / 10, pc: sim.presses, P: sim.P.map(function (p) { return [p.slot, c && c.slot === p.slot && p.a ? 1 : 0, 0, 1]; }) }; };
    return sim;
  }
  function drawBomb(g, s, env) {
    g.fillStyle = s.boom !== -1 ? '#5a1f1f' : '#2b1a45'; g.fillRect(0, 0, W, H);
    var r = 30 + s.size * 60;
    if (s.boom === -1) { g.fillStyle = '#212529'; g.beginPath(); g.arc(240, 140, r, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#868e96'; g.lineWidth = 3; g.stroke(); g.lineWidth = 1; g.fillStyle = '#ffa94d'; g.fillRect(236, 140 - r - 14, 8, 14); }
    else { text(g, 'ตู้ม!', 240, 130, 60, '#ffa94d'); text(g, s.boom >= 0 ? (env.names[s.boom] || '') + ' ทำระเบิดแตก!' : 'ไส้ติดไฟระเบิดเอง ไม่มีใครแพ้', 240, 185, 16, '#fff'); }
    text(g, 'รอบ ' + s.rd + '/3 — กด Space ปั๊มระเบิด ใครทำให้แตกแพ้!', 240, 250, 12, '#c9b6e0');
    s.P.forEach(function (p, i) { g.fillStyle = p[1] ? '#ffe066' : '#444'; g.beginPath(); g.arc(60 + i * 120, 215, 9, 0, Math.PI * 2); g.fill(); text(g, env.names[p[0]] || '', 60 + i * 120, 232, 9); });
    scoreBar(g, s, env);
  }

  /* 6) โยนครีมสลับกัน */
  function cream(players, seed) {
    var n = players.length, T = n <= 1 ? 30 : Math.min(30, Math.max(8, Math.floor(60 / n) - 3)), SW = 2.5, SHOT_T = 0.75, SPL = 74, CD = 0.8, DXr = [74, 406], DYr = [190, 390];
    var sim = { P: players.map(function (s) { return { slot: s, x: 240, y: 290, ix: 0, iy: 0, a: false, prev: false, sc: 0, acc: 0, hit: 0, cd: 0, ax: 240, ay: 290 }; }), ri: 0, rt: T, phase: 'play', sw: 0, shots: [], spl: [], order: players.slice() };
    common(sim, players, n * (T + SW) + 2, seed);
    function shooter() { return byslot(sim.P, sim.order[sim.ri]); }
    function role(p) { return p.slot === sim.order[sim.ri] ? 1 : 0; }
    function setup() {
      var dg = sim.P.filter(function (p) { return role(p) === 0; });
      dg.forEach(function (p, i) { p.x = 240 + (i - (dg.length - 1) / 2) * 90; p.y = 290; p.hit = 0; p.cd = 0; });
      var sg = shooter(); if (sg) { sg.x = 240; sg.y = 290; sg.cd = 0.6; sg.ax = 240; sg.ay = 290; }
      sim.shots = []; sim.spl = []; sim.rt = T;
    }
    setup();
    sim.tick = function (dt) {
      if (sim.done) return; sim.time += dt;
      if (sim.phase === 'swap') { sim.sw -= dt; if (sim.sw <= 0) { sim.phase = 'play'; sim.ri++; setup(); } return; }
      sim.rt -= dt;
      sim.P.forEach(function (p) {
        p.cd = Math.max(0, p.cd - dt); p.hit = Math.max(0, p.hit - dt);
        if (role(p) === 1) { if (p.a && !p.prev && p.cd <= 0) { p.cd = CD; sim.shots.push({ x: p.ax, y: p.ay, t: 0, by: p.slot }); } }
        else if (p.hit <= 0) { p.x = clamp(p.x + p.ix * 175 * dt, DXr[0], DXr[1]); p.y = clamp(p.y + p.iy * 175 * dt, DYr[0], DYr[1]); }
        p.prev = p.a;
      });
      sim.shots.forEach(function (sh) {
        sh.t += dt;
        if (sh.t >= SHOT_T) {
          sh.dead = true; sim.spl.push({ x: sh.x, y: sh.y, age: 0 });
          var by = byslot(sim.P, sh.by);
          sim.P.forEach(function (q) { if (role(q) === 0 && q.hit <= 0 && Math.hypot(q.x - sh.x, q.y - sh.y) < SPL) { q.hit = 1.6; if (by) by.sc += 2; } });
        }
      });
      sim.shots = sim.shots.filter(function (sh) { return !sh.dead; });
      sim.spl.forEach(function (q) { q.age += dt; }); sim.spl = sim.spl.filter(function (q) { return q.age < 3; });
      if (sim.rt <= 0) { if (sim.ri >= sim.order.length - 1) sim.done = true; else { sim.phase = 'swap'; sim.sw = SW; sim.shots = []; } }
      if (sim.time >= sim.dur + 3) sim.done = true;
    };
    sim.scores = function () { return sim.P.map(function (p) { return [p.slot, p.sc]; }); };
    sim.remove = function (slot) { sim.P = sim.P.filter(function (p) { return p.slot !== slot; }); if (!sim.P.length) { sim.done = true; return; } if (slot === sim.order[sim.ri] && sim.phase === 'play') sim.rt = Math.min(sim.rt, 0.01); };
    sim.snapshot = function () {
      return { tl: Math.max(0, Math.ceil(sim.rt)), done: sim.done, S: sim.scores(), rd: sim.ri + 1, nr: sim.order.length, ph: sim.phase, sw: Math.round(sim.sw * 10) / 10, sh: sim.order[sim.ri],
        P: sim.P.map(function (p) { return [p.slot, Math.round(p.x), Math.round(p.y), 1, p.cd <= 0 ? 1 : 0, Math.round(p.hit * 10), Math.round(p.cd * 10), role(p), Math.round(p.ax), Math.round(p.ay)]; }),
        Sh: sim.shots.map(function (q) { return [Math.round(q.x), Math.round(q.y), Math.round(q.t / SHOT_T * 100) / 100, q.by]; }), Sp: sim.spl.map(function (q) { return [Math.round(q.x), Math.round(q.y), Math.round(q.age * 10)]; }), SR: SPL };
    };
    return sim;
  }
  function drawCream(g, s, env) {
    g.fillStyle = '#2b1a45'; g.fillRect(0, 0, W, H);
    var mx = function (x) { return 20 + (x - 74) / 332 * 440; }, my = function (y) { return 50 + (y - 190) / 200 * 190; };
    g.fillStyle = '#7fc8f8'; g.fillRect(20, 50, 440, 190);
    s.Sp.forEach(function (q) { g.fillStyle = 'rgba(255,244,248,0.9)'; g.beginPath(); g.arc(mx(q[0]), my(q[1]), s.SR * 1.3, 0, 6.3); g.fill(); });
    s.Sh.forEach(function (q) { g.strokeStyle = '#ff5d73'; g.beginPath(); g.arc(mx(q[0]), my(q[1]), s.SR * 1.3, 0, 6.3); g.stroke(); });
    s.P.forEach(function (p) { if (p[7] === 0) person(g, env, p[0], mx(p[1]), my(p[2]), 'front', p[5] ? 0.3 : 1); });
    text(g, 'รอบ ' + s.rd + '/' + s.nr + ' — ผู้ยิงเล็งด้วยเมาส์แล้วคลิก · คนอื่นหนีวงครีม', 240, 25, 12, '#ffe066');
    scoreBar(g, s, env);
  }

  /* 6b) หลบหยดครีม (เล่นพร้อมกันทั้งห้อง) */
  function dodge(players, seed) {
    var sim = { P: players.map(function (s, i) { return { slot: s, x: 130 + i * 70, y: 170, ix: 0, iy: 0, a: false, hits: 0, stun: 0, wv: 0, ok: 0, fx: 0, fy: 1, cd: 0, mv: 0, hp: 6 }; }), drops: [], wave: 0, nextWave: 1.6, queue: [], wcount: 0, wAlive: 0 };
    common(sim, players, 60, seed);
    var R = 34, B = [30, 450, 30, 244];
    function warnT() { return Math.max(0.3, 1.15 - sim.wave * 0.075); }
    sim.tick = function (dt) {
      if (sim.done) return; sim.time += dt; var t = sim.time;
      sim.P.forEach(function (p) { var px = p.x, py = p.y; dstep(sim, p, dt, 108, B, null); p.mv = Math.hypot(p.x - px, p.y - py) > 0.2 ? 1 : 0; });
      if (!sim.queue.length && sim.wAlive === 0 && t >= sim.nextWave && t < sim.dur - 2) {
        sim.wave++; var cnt = Math.min(20, 3 + Math.floor(sim.wave * 1.3) + sim.n), gap = Math.max(0.05, 0.4 - sim.wave * 0.03), k;
        for (k = 0; k < cnt; k++) { var tgt = sim.P.length && sim.rnd() < 0.55 ? sim.P[Math.floor(sim.rnd() * sim.P.length)] : null; sim.queue.push({ at: t + k * gap, x: tgt ? clamp(tgt.x + (sim.rnd() - 0.5) * 70, 40, 440) : 40 + sim.rnd() * 400, y: tgt ? clamp(tgt.y + (sim.rnd() - 0.5) * 60, 40, 234) : 40 + sim.rnd() * 194 }); }
        sim.P.forEach(function (p) { p.wh = 0; });
      }
      while (sim.queue.length && sim.queue[0].at <= t) { var q = sim.queue.shift(); sim.drops.push({ x: q.x, y: q.y, age: 0, w: warnT(), done: false }); sim.wAlive++; }
      sim.drops.forEach(function (d) {
        d.age += dt;
        if (!d.done && d.age >= d.w) {
          d.done = true; d.fl = 0;
          sim.P.forEach(function (p) { if (p.stun <= 0 && p.hp > 0 && Math.hypot(p.x - d.x, p.y - d.y) < R) { p.stun = 0.7; p.hits++; p.hp--; p.wh = 1; } });
        }
        if (d.done) { d.fl += dt; if (d.fl > 0.5 && !d.gone) { d.gone = true; sim.wAlive--; if (!sim.queue.length && sim.wAlive === 0) { sim.nextWave = t + Math.max(0.25, 1.3 - sim.wave * 0.09); sim.P.forEach(function (p) { if (!p.wh) { p.ok++; } }); } } }
      });
      sim.drops = sim.drops.filter(function (d) { return !d.gone; });
      if (t >= sim.dur) sim.done = true;
    };
    sim.scores = function () { return sim.P.map(function (p) { return [p.slot, p.hp]; }); };
    sim.remove = function (slot) { sim.P = sim.P.filter(function (p) { return p.slot !== slot; }); if (!sim.P.length) sim.done = true; };
    sim.snapshot = function () {
      return { tl: Math.max(0, Math.round(sim.dur - sim.time)), done: sim.done, S: sim.scores(), R: R, wv: sim.wave,
        P: sim.P.map(function (p) { return [p.slot, Math.round(p.x), Math.round(p.y), 1, 0, p.stun > 0 ? 1 : 0, p.mv, p.hits, p.hp]; }),
        D: sim.drops.map(function (d) { return [Math.round(d.x), Math.round(d.y), Math.round(Math.min(1, d.age / d.w) * 100) / 100, d.done ? 1 : 0, Math.round((d.fl || 0) * 100)]; }) };
    };
    return sim;
  }
  function drawDodge(g, s, env) {
    g.fillStyle = '#2b1a45'; g.fillRect(0, 0, W, H); g.fillStyle = '#7fc8f8'; g.fillRect(10, 10, 460, 250);
    s.D.forEach(function (d) { g.strokeStyle = d[3] ? '#fff' : '#ff5d73'; g.beginPath(); g.arc(d[0], d[1], s.R * (d[3] ? 1 : d[2]), 0, 6.3); g.stroke(); });
    s.P.forEach(function (p) { person(g, env, p[0], p[1], p[2], 'front', p[5] ? 0.4 : 1); });
    scoreBar(g, s, env);
  }

  /* 7) ยึดจุดบนเค้ก */
  var PUSH_H = { range: 38, imp: 640, stun: 0.4, cd: 1.6, phys: true };
  function hill(players, seed) {
    var n = players.length;
    var sim = { P: players.map(function (s, i) { var a = i / n * Math.PI * 2; return { slot: s, x: 240 + Math.cos(a) * 80, y: 140 + Math.sin(a) * 60, vx: 0, vy: 0, fx: 0, fy: 1, ix: 0, iy: 0, a: false, alive: true, cd: 0, sc: 0 }; }), zx: 240, zy: 135, wx: 240, wy: 135 };
    common(sim, players, 60, seed);
    sim.tick = function (dt) {
      if (sim.done) return; sim.time += dt;
      physics(sim.P, dt, 13, { acc: 1500, fr: 6, push: PUSH_H, sim: sim });
      sim.P.forEach(function (p) { p.x = clamp(p.x, 16, 464); p.y = clamp(p.y, 20, 250); });
      var dx = sim.wx - sim.zx, dy = sim.wy - sim.zy, d = Math.hypot(dx, dy);
      if (d < 4) { sim.wx = 70 + sim.rnd() * 340; sim.wy = 60 + sim.rnd() * 150; } else { sim.zx += dx / d * 28 * dt; sim.zy += dy / d * 28 * dt; }
      var inside = sim.P.filter(function (p) { return Math.hypot(p.x - sim.zx, p.y - sim.zy) < 40; });
      if (inside.length === 1) inside[0].sc += dt * 2;
      if (sim.time >= sim.dur) sim.done = true;
    };
    sim.scores = function () { return sim.P.map(function (p) { return [p.slot, Math.floor(p.sc)]; }); };
    sim.remove = function (slot) { sim.P = sim.P.filter(function (p) { return p.slot !== slot; }); if (!sim.P.length) sim.done = true; };
    sim.snapshot = function () { return { tl: Math.max(0, Math.round(sim.dur - sim.time)), done: sim.done, S: sim.scores(), zx: Math.round(sim.zx), zy: Math.round(sim.zy), P: sim.P.map(function (p) { return [p.slot, Math.round(p.x), Math.round(p.y), 1, p.cd <= 0 ? 1 : 0, p.stun > 0 ? 1 : 0, Math.round(p.cd * 10)]; }) }; };
    return sim;
  }
  function drawHill(g, s, env) {
    g.fillStyle = '#2b1a45'; g.fillRect(0, 0, W, H); g.fillStyle = '#3a2158'; g.fillRect(10, 14, W - 20, 246);
    g.fillStyle = 'rgba(255,224,102,0.35)'; g.beginPath(); g.arc(s.zx, s.zy, 40, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#ffe066'; g.lineWidth = 3; g.stroke(); g.lineWidth = 1;
    s.P.slice().sort(function (a, b) { return a[2] - b[2]; }).forEach(function (p) { person(g, env, p[0], p[1], p[2], 'front', 1); if (p[0] === env.me) { g.fillStyle = p[4] ? '#69db7c' : '#868e96'; g.fillRect(p[1] - 10, p[2] + 9, 20, 3); } });
    text(g, 'อยู่ในวงเหลืองคนเดียวถึงจะได้แต้ม! Space = พุ่งชน', W / 2, 255, 11, '#c9b6e0');
    scoreBar(g, s, env);
  }


  function mkP(players, f) { return players.map(function (s, i) { var p = { slot: s, ix: 0, iy: 0, a: false, vx: 0, vy: 0, fx: 0, fy: 1, alive: true, cd: 0, sc: 0, ts: 0 }; f(p, i); return p; }); }
  function stdRemove(sim) { return function (slot) { var p = byslot(sim.P, slot); if (p && p.alive) { p.alive = false; p.ts = sim.time; } if (sim.P.every(function (q) { return !q.alive; })) sim.done = true; }; }

  /* 8) ชิงเหรียญ */
  function coinrush(players, seed) {
    var sim = { P: [], coins: [], nextC: 0.4 }; sim.P = mkP(players, function (p, i) { var a = i / players.length * Math.PI * 2; p.x = 240 + Math.cos(a) * 200; p.y = 140 + Math.sin(a) * 120; obPush(p, 14); });
    common(sim, players, 60, seed);
    sim.tick = function (dt) {
      if (sim.done) return; sim.time += dt;
      physics(sim.P, dt, 13, { acc: 1500, fr: 6, dash: 260 }); sim.P.forEach(function (p) { p.x = clamp(p.x, -223, 703); p.y = clamp(p.y, -95, 375); obPush(p, 13); });
      while (sim.time >= sim.nextC) { if (sim.coins.length < 16) { var cx, cy, tr = 0; do { cx = -200 + sim.rnd() * 880; cy = -70 + sim.rnd() * 420; } while (inOb(cx, cy, 14) && ++tr < 20); var rv = sim.rnd(); sim.coins.push({ x: cx, y: cy, v: rv < 0.12 ? 3 : rv < 0.4 ? 2 : 1 }); } sim.nextC += 0.45; }
      sim.coins = sim.coins.filter(function (c) {
        var best = null, bd = 1e9; sim.P.forEach(function (p) { var d = Math.hypot(p.x - c.x, p.y - c.y); if (d < 20 && d < bd) { bd = d; best = p; } });
        if (best) { best.sc += c.v; return false; } return true;
      });
      if (sim.time >= sim.dur) sim.done = true;
    };
    sim.scores = function () { return sim.P.map(function (p) { return [p.slot, p.sc]; }); };
    sim.remove = function (slot) { sim.P = sim.P.filter(function (p) { return p.slot !== slot; }); if (!sim.P.length) sim.done = true; };
    sim.snapshot = function () { return { tl: Math.max(0, Math.round(sim.dur - sim.time)), done: sim.done, S: sim.scores(), C: sim.coins.map(function (c) { return [Math.round(c.x), Math.round(c.y), c.v]; }), B: [-223, 703, -95, 375], Ob: MAZE, P: sim.P.map(function (p) { return [p.slot, Math.round(p.x), Math.round(p.y), 1, p.cd <= 0 ? 1 : 0, p.stun > 0 ? 1 : 0, Math.round(p.cd * 10)]; }) }; };
    return sim;
  }
  function drawCoins(g, s, env) {
    g.fillStyle = '#2b1a45'; g.fillRect(0, 0, W, H); g.fillStyle = '#3a2158'; g.fillRect(10, 20, W - 20, 240);
    s.C.forEach(function (c) { g.fillStyle = c[2] ? '#ff922b' : '#ffe066'; g.beginPath(); g.arc(c[0], c[1], c[2] ? 10 : 7, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#1b1226'; g.stroke(); });
    s.P.slice().sort(function (a, b) { return a[2] - b[2]; }).forEach(function (p) { person(g, env, p[0], p[1], p[2], 'front', 1); });
    text(g, 'ชิงเหรียญให้ได้มากที่สุด! Space = พุ่งชน (ทอง = 3)', W / 2, 262, 11, '#c9b6e0'); scoreBar(g, s, env);
  }

  /* 9) ไล่จับครีม */
  function tag(players, seed) {
    var n = players.length, B = [-223, 703, -95, 375], sim = { P: [], it: -1, imm: 0 };
    sim.P = mkP(players, function (p, i) { var a = i / n * Math.PI * 2 + 0.3; p.x = 240 + Math.cos(a) * 260; p.y = 140 + Math.sin(a) * 150; obPush(p, 14); p.acc = 0; p.stun = 0; });
    common(sim, players, 60, seed);
    sim.it = n > 1 ? players[Math.floor(sim.rnd() * n)] : -1;
    var DASH = { dash: { t: 0.14, k: 2.6, cd: 2.6 } };
    sim.tick = function (dt) {
      if (sim.done) return; sim.time += dt; sim.imm = Math.max(0, sim.imm - dt);
      sim.P.forEach(function (p) {
        var sp = p.slot === sim.it ? 150 : 135; dstep(sim, p, dt, sp, B, DASH);
        obPush(p, 12);
        if (p.slot !== sim.it) p.acc += dt * 10;
      });
      for (var bi = 0; bi < sim.P.length; bi++) for (var bj = bi + 1; bj < sim.P.length; bj++) { var pa = sim.P[bi], pb = sim.P[bj], bdx = pb.x - pa.x, bdy = pb.y - pa.y, bd = Math.hypot(bdx, bdy) || 0.01; if (bd < 28) { var bn = (28 - bd) / 2, ux = bdx / bd, uy = bdy / bd; pa.x -= ux * bn; pa.y -= uy * bn; pb.x += ux * bn; pb.y += uy * bn; pa.kx = (pa.kx || 0) - ux * 60; pa.ky = (pa.ky || 0) - uy * 60; pb.kx = (pb.kx || 0) + ux * 60; pb.ky = (pb.ky || 0) + uy * 60; } }
      var it = byslot(sim.P, sim.it);
      if (it && it.stun <= 0) sim.P.forEach(function (p) { if (p !== it && it.slot === sim.it && !(sim.imm > 0 && p.slot === sim.lt) && Math.hypot(p.x - it.x, p.y - it.y) < 36) { sim.lt = it.slot; sim.it = p.slot; sim.imm = 1.5; p.stun = 0.6; p.kx = (p.x - it.x) * 6; p.ky = (p.y - it.y) * 6; it = p; } });
      if (sim.time >= sim.dur) sim.done = true;
    };
    sim.scores = function () { return sim.P.map(function (p) { return [p.slot, Math.floor(p.acc)]; }); };
    sim.remove = function (slot) { sim.P = sim.P.filter(function (p) { return p.slot !== slot; }); if (!sim.P.length) sim.done = true; else if (sim.it === slot) sim.it = sim.P[0].slot; };
    sim.snapshot = function () { return { tl: Math.max(0, Math.round(sim.dur - sim.time)), done: sim.done, S: sim.scores(), it: sim.it, lt: sim.lt, imm: sim.imm > 0 ? 1 : 0, B: B, Ob: MAZE, P: sim.P.map(function (p) { return [p.slot, Math.round(p.x), Math.round(p.y), 1, p.cd <= 0 ? 1 : 0, p.stun > 0 ? 1 : 0, Math.round(p.cd * 10)]; }) }; };
    return sim;
  }
  function drawTag(g, s, env) {
    g.fillStyle = '#2b1a45'; g.fillRect(0, 0, W, H); g.fillStyle = '#3a2158'; g.fillRect(10, 20, W - 20, 240);
    s.P.slice().sort(function (a, b) { return a[2] - b[2]; }).forEach(function (p) {
      if (p[0] === s.it) { g.fillStyle = s.imm ? 'rgba(255,255,255,0.5)' : 'rgba(255,107,107,0.6)'; g.beginPath(); g.arc(p[1], p[2] - 10, 22, 0, Math.PI * 2); g.fill(); }
      person(g, env, p[0], p[1], p[2], p[4] ? 'right' : 'front', 1);
    });
    var itName = env.names[s.it]; text(g, s.it === env.me ? 'คุณเป็นตัวจับ! ไล่แตะคนอื่น' : (s.it < 0 ? 'วิ่งไปเรื่อยๆ' : (itName || '') + ' เป็นตัวจับ หนีให้พ้น!'), W / 2, 262, 12, '#ffe066'); scoreBar(g, s, env);
  }

  /* 10) พื้นเค้กถล่ม */
  function floorgame(players, seed) {
    var n = players.length, C = 11, Rw = 8, TW = 46, TH = 40, TX = 240 - C * TW / 2, TY = 140 - Rw * TH / 2, RM = n > 1 ? 3 : 1;
    var sim = { P: [], tiles: [], next: 1.5, rd: 1, RM: RM, pause: 0, rt: 0 };
    sim.P = mkP(players, function (p) { p.pts = 0; p.stun = 0; });
    common(sim, players, RM * 90 + 20, seed);
    var PUSH = { range: 34, imp: 330, stun: 0.5, cd: 2.0 }, B = [TX - 4, TX + C * TW + 4, TY - 4, TY + Rw * TH + 4];
    function setup() {
      sim.tiles = []; for (var i = 0; i < C * Rw; i++) sim.tiles.push({ st: 0, at: 0 }); sim.next = 1.5; sim.rt = 0;
      sim.P.forEach(function (p, k) { var a = k / n * Math.PI * 2; p.x = 240 + Math.cos(a) * 80; p.y = 140 + Math.sin(a) * 55; p.alive = !p.gone; p.ts = 0; p.kx = p.ky = 0; p.stun = 0; p.cd = 0; });
    }
    setup();
    function tileAt(x, y) { var c = Math.floor((x - TX) / TW), r = Math.floor((y - TY) / TH); return c < 0 || r < 0 || c >= C || r >= Rw ? -1 : r * C + c; }
    sim.tick = function (dt) {
      if (sim.done) return; sim.time += dt;
      if (sim.pause > 0) { sim.pause -= dt; if (sim.pause <= 0) { if (sim.rd >= RM) sim.done = true; else { sim.rd++; setup(); } } return; }
      sim.rt += dt; var t = sim.rt;
      sim.P.forEach(function (p) { if (p.alive) dstep(sim, p, dt, 130, [TX - 40, TX + C * TW + 40, TY - 40, TY + Rw * TH + 40], { push: PUSH }); });
      if (t >= sim.next) {
        var ok = []; sim.tiles.forEach(function (q, k) { if (q.st === 0) ok.push(k); });
        var cnt = Math.min(ok.length, 5 + Math.floor(sim.rnd() * 4) + Math.floor(t / 12));
        for (var i = 0; i < cnt; i++) { var j = Math.floor(sim.rnd() * ok.length), k = ok.splice(j, 1)[0]; sim.tiles[k].st = 1; sim.tiles[k].at = t + 1.0; }
        sim.next = t + Math.max(0.7, 1.4 - t * 0.015);
      }
      sim.tiles.forEach(function (q) { if (q.st === 1 && t >= q.at) q.st = 2; });
      sim.P.forEach(function (p) { if (!p.alive) return; var k = tileAt(p.x, p.y); if (k < 0 || sim.tiles[k].st === 2) { p.alive = false; p.ts = t; } });
      var alive = sim.P.filter(function (p) { return p.alive; }).length;
      if ((n > 1 ? alive <= 1 : alive === 0) || t >= 80) { rankPts(sim, function (p) { return p.alive ? 1e6 : p.ts; }); sim.pause = 2.2; }
      if (sim.time >= sim.dur) sim.done = true;
    };
    sim.scores = function () { return sim.P.map(function (p) { return [p.slot, p.pts * 10]; }); };
    sim.remove = function (slot) { var p = byslot(sim.P, slot); if (p) { p.gone = true; if (p.alive) { p.alive = false; p.ts = sim.rt; } } };
    sim.snapshot = function () { return { tl: -1, rd: sim.rd, RM: RM, pz: sim.pause > 0 ? 1 : 0, done: sim.done, S: sim.scores(), G: [C, Rw, TX, TY, TW, TH], T: sim.tiles.map(function (q) { return q.st; }), P: sim.P.map(function (p) { return [p.slot, Math.round(p.x), Math.round(p.y), p.alive ? 1 : 0, p.cd <= 0 ? 1 : 0, p.stun > 0 ? 1 : 0, Math.round(p.cd * 10)]; }) }; };
    return sim;
  }
  function drawFloor(g, s, env) {
    g.fillStyle = '#1a0f2b'; g.fillRect(0, 0, W, H);
    s.T.forEach(function (st, k) { if (st === 2) return; var x = 40 + (k % 8) * 50, y = 25 + Math.floor(k / 8) * 44; g.fillStyle = st === 1 ? '#ff8787' : (((k % 8) + Math.floor(k / 8)) % 2 ? '#ffe3ec' : '#ffc8d9'); g.fillRect(x, y, 49, 43); });
    s.P.slice().sort(function (a, b) { return a[2] - b[2]; }).forEach(function (p) { person(g, env, p[0], p[1], p[2], p[4] ? 'right' : 'front', p[3] ? 1 : 0.2); });
    text(g, 'พื้นสีแดงกำลังจะพัง! ย้ายไปช่องอื่น คนสุดท้ายที่ไม่ตกชนะ', W / 2, 252, 11, '#c9b6e0'); scoreBar(g, s, env);
  }

  /* 11) เก้าอี้ดนตรี */
  function chairs(players, seed) {
    var n = players.length, sim = { P: [], phase: 'music', pt: 0, mlen: 3, chairs: [], round: 1, maxR: 3 };
    sim.P = mkP(players, function (p, i) { var a = i / n * Math.PI * 2; p.x = 240 + Math.cos(a) * 160; p.y = 140 + Math.sin(a) * 90; p.seat = -1; p.pts = 0; p.stun = 0; });
    common(sim, players, 3 * 16 + 20, seed);
    sim.mlen = 2.5 + sim.rnd() * 2.5;
    var B = [-130, 610, -43, 323], DASH = { dash: { t: 0.14, k: 2.6, cd: 1.4 } };
    sim.tick = function (dt) {
      if (sim.done) return; sim.time += dt; sim.pt += dt;
      sim.P.forEach(function (p) { if (p.seat < 0) dstep(sim, p, dt, 150, B, DASH); });
      var live = sim.P.filter(function (p) { return !p.gone; });
      if (sim.phase === 'music') {
        if (sim.pt >= sim.mlen) {
          sim.phase = 'scramble'; sim.pt = 0; sim.chairs = [];
          var cn = Math.max(1, live.length - 1); for (var i = 0; i < cn; i++) sim.chairs.push({ x: -90 + sim.rnd() * 660, y: -10 + sim.rnd() * 300, by: -1 });
        }
      } else if (sim.phase === 'scramble') {
        live.forEach(function (p) { if (p.seat >= 0) return; sim.chairs.forEach(function (c, k) { if (c.by < 0 && p.seat < 0 && Math.hypot(p.x - c.x, p.y - c.y) < 22) { c.by = p.slot; p.seat = k; } }); });
        var taken = sim.chairs.every(function (c) { return c.by >= 0; });
        if (taken || sim.pt >= 4) {
          live.forEach(function (p) { if (p.seat >= 0) p.pts++; });
          sim.phase = 'show'; sim.pt = 0;
        }
      } else if (sim.phase === 'show' && sim.pt >= 1.8) {
        if (sim.round >= sim.maxR) { sim.done = true; return; }
        sim.round++; sim.phase = 'music'; sim.pt = 0; sim.mlen = 2.5 + sim.rnd() * 2.5; sim.chairs = []; sim.P.forEach(function (p) { p.seat = -1; });
      }
      if (sim.time >= sim.dur) sim.done = true;
    };
    sim.scores = function () { return sim.P.map(function (p) { return [p.slot, p.pts * 10]; }); };
    sim.remove = function (slot) { var p = byslot(sim.P, slot); if (p) { p.gone = true; p.alive = false; } if (sim.P.every(function (q) { return q.gone; })) sim.done = true; };
    sim.snapshot = function () { return { tl: -1, done: sim.done, S: sim.scores(), ph: sim.phase, rd: sim.round, RM: sim.maxR, B: B, Ch: sim.chairs.map(function (c) { return [Math.round(c.x), Math.round(c.y), c.by]; }), P: sim.P.map(function (p) { return [p.slot, Math.round(p.x), Math.round(p.y), p.gone ? 0 : 1, p.seat >= 0 ? 1 : 0, p.cd <= 0 ? 1 : 0]; }) }; };
    return sim;
  }
  function drawChairs(g, s, env) {
    g.fillStyle = s.ph === 'music' ? '#2b1a45' : '#4a2f1f'; g.fillRect(0, 0, W, H);
    s.Ch.forEach(function (c) { g.fillStyle = c[2] >= 0 ? '#69db7c' : '#ffe066'; g.beginPath(); g.arc(c[0], c[1], 20, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#1b1226'; g.stroke(); });
    s.P.slice().sort(function (a, b) { return a[2] - b[2]; }).forEach(function (p) { person(g, env, p[0], p[1], p[2], 'front', p[3] ? 1 : 0.2); });
    text(g, s.ph === 'music' ? '♪ ดนตรีเล่นอยู่ เดินวนไป... (เก้าอี้จะโผล่ตอนดนตรีหยุด)' : s.ph === 'scramble' ? 'ดนตรีหยุด! วิ่งไปนั่งเก้าอี้เร็ว!' : 'รอบที่ ' + s.rd + ' จบ', W / 2, 252, 12, '#ffe066'); scoreBar(g, s, env);
  }

  var GAMES = {
    wall:     { name: 'กำแพงเจาะรู', how: 'WASD ลอดช่องว่างกำแพง · อย่าให้ถูกดันตกขอบ · คลิกซ้ายผลักเพื่อน · อยู่รอดนานสุดชนะ', make: wall, draw: drawWall, v3: 'wall' },
    redlight: { name: 'ไฟแดงไฟเขียว', how: 'กด W ค้างเพื่อวิ่ง · ไฟแดงต้องหยุด ถ้าขยับจะถูกถอยหลัง · คนสุดท้ายแพ้', make: redlight, draw: drawRed, v3: 'redlight' },
    catcher:  { v3: 'catcher', name: 'รับขนมตกลงมา', how: 'A/D รับขนมที่ตกลงมา · ขนมทองได้ 3 คะแนน · คลิกซ้าย/Space พุ่งชนเพื่อนให้กระเด็น', make: catcher, draw: drawCatch },
    bomb:     { v3: 'bomb', name: 'ปั๊มระเบิด', how: 'ผลัดกันปั๊มคนละ 3 วินาที กดกี่ครั้งก็ได้ (ต้องปั๊มอย่างน้อย 2) · ระเบิดยิ่งแดงยิ่งใกล้แตก · คนทำแตกแพ้รอบนั้น · 3 รอบ', make: bomb, draw: drawBomb },
    cream:    { v3: 'cream', name: 'โยนครีมสลับกัน', how: 'ผลัดกันเป็นคนยิงครั้งละ 1 คน · คนยิงเล็งด้วยเมาส์แล้วคลิกซ้ายยิงครีม (ยิงโดนได้ +2 ยิงพลาดไม่ได้) · คนอื่น WASD หนีวงครีม (ไม่นับแต้ม)', make: cream, draw: drawCream },
    dodge:    { v3: 'dodge', name: 'หลบหยดครีม', how: 'WASD หนีวงแดงบนพื้น ครีมจะตกใส่ทุกคนพร้อมกัน ยิ่งนานยิ่งเร็ว · โดนครีมเสียเลือด 1 หน่วย (เริ่ม 6) · จบเกมคนที่เลือดเหลือมากที่สุดชนะ', make: dodge, draw: drawDodge },
    hill:     { v3: 'hill', name: 'ยึดจุดบนเค้ก', how: 'ยืนในวงเหลืองคนเดียวถึงได้แต้ม · คลิกซ้าย/Space พุ่งสั้นๆ', make: hill, draw: drawHill },
    coinrush: { v3: 'coinrush', name: 'ชิงเหรียญ', how: 'วิ่งเก็บเหรียญให้มากที่สุด (ทอง = 3) · คลิกซ้าย/Space พุ่งสั้นๆ', make: coinrush, draw: drawCoins },
    tag:      { v3: 'tag', name: 'ไล่จับครีม', how: 'ตัวจับแตะใครคนนั้นจะเป็นตัวจับแทน · ยิ่งไม่โดนจับยิ่งได้แต้ม · คลิกซ้าย/Space พุ่ง', make: tag, draw: drawTag },
    floor:    { v3: 'floor', name: 'พื้นเค้กถล่ม', how: 'พื้นสีแดงจะพัง ย้ายหนีไปช่องอื่น · คลิกซ้ายผลักเพื่อน · 3 รอบ', make: floorgame, draw: drawFloor },
    chairs:   { v3: 'chairs', name: 'เก้าอี้ดนตรี', how: 'เดินวนตอนดนตรีเล่น พอหยุดรีบวิ่งไปนั่งเก้าอี้ · คลิกซ้าย/Space พุ่ง · 3 รอบ', make: chairs, draw: drawChairs },
    sumo:     { name: 'ซูโม่จานเค้ก', how: 'พื้นลื่น! ผลักเพื่อนให้ตกจาน (จานหดเล็กลง) · คลิกซ้าย/Space พุ่งสั้นๆ · 3 รอบ', make: sumo, draw: drawSumo, v3: 'sumo' }
  };

  return { GAMES: GAMES, IDS: Object.keys(GAMES) };
});
