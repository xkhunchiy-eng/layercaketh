/* หน้าจอคลังไอเทม 3D: ไอเทมวางบนถาด เลื่อนด้วยล้อเมาส์ คลิกครั้งแรกดูคำอธิบาย คลิกอีกครั้งเพื่อใช้ + แอนิเมชันตอนใช้ของแต่ละชิ้น */
(function (root, factory) { root.InvView = factory(root.GL3, root.ItemModels); })(typeof self !== 'undefined' ? self : this, function (G, ItemModels) {
  var M4 = G.M4, PI = Math.PI;
  var USE_T = 1.2, FIT = { normal: 1.0, giant: 0.68, gamble: 0.85, triple: 0.9, double: 0.95, freeze: 0.78, slip: 0.92, ticket: 0.62, steal: 0.8, swap: 1.15, magnet: 0.9 };   // วินาทีของแอนิเมชันตอนใช้
  function ease(t) { return t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t); }
  function proj(vp, x, y, z, w, h) { var cx = vp[0] * x + vp[4] * y + vp[8] * z + vp[12], cy = vp[1] * x + vp[5] * y + vp[9] * z + vp[13], cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15]; return [(cx / cw * 0.5 + 0.5) * w, (1 - (cy / cw * 0.5 + 0.5)) * h]; }

  function InvView(cv, fx) {
    this.cv = cv; this.fx = fx; var R = this.R = new G.Renderer(cv, { transparent: true, bloom: 0 }), self = this;
    this.IM = ItemModels(G, R);
    var pb = new G.Builder(); pb.jit = 0.015;
    pb.push().tr(0, -0.6, 0); pb.cyl(1.9, 2.0, 0.6, 28, { t: '#ff8fb8', b: '#c98a5a', s: '#f0c27a' }); pb.pop();
    pb.push().tr(0, -0.02, 0); pb.cyl(1.84, 1.9, 0.1, 28, '#ffa6c6'); pb.pop();
    this.plate = R.mesh(pb);
    var sb = new G.Builder(); sb.jit = 0.02;
    sb.push().tr(0, -1.0, 0); sb.cyl(1.7, 1.85, 1.0, 22, { t: '#fff4f8', b: '#7a4a2a', s: '#c98a5a' }); sb.pop();
    sb.push().tr(0, -0.12, 0); sb.cyl(1.72, 1.72, 0.12, 22, { t: '#ff8fb8', b: '#ff8fb8', s: '#ff6fa4' }); sb.pop();
        var bb2 = new G.Builder(); bb2.push().tr(0, -0.95, 1.8).rx(-0.3); bb2.push().tr(0, 0, -0.04); bb2.box(2.7, 1.1, 0.08, '#5a2a48'); bb2.pop(); bb2.push().tr(0, 0.07, 0); bb2.box(2.5, 0.94, 0.08, '#35183a'); bb2.pop(); bb2.pop(); this.board = R.mesh(bb2);
    this.stand = R.mesh(sb);
    var Ld = R.light; this.lvp = M4.mul(M4.ortho(-9, 9, -6, 6, 1, 50), M4.look([Ld[0] * 16, 1 + Ld[1] * 16, Ld[2] * 16], [0, 1, 0], [0, 1, 0]));
    this.eye = [0, 4.2, 13.5]; this.look = [0, 0.7, 0]; this.w = 0; this.h = 0;
    this.list = []; this.sel = 0; this.pos = 0; this.t0 = 0; this.use = null; this.open = false; this.info = false;
  }
  InvView.prototype.setItems = function (ids) { var keep = this.list[this.sel]; this.list = ids; var k = ids.indexOf(keep); this.sel = k >= 0 ? k : Math.min(this.sel, Math.max(0, ids.length - 1)); };
  InvView.prototype.move = function (d) { if (this.use || !this.list.length) return; this.sel = (this.sel + d + this.list.length) % this.list.length; this.info = false; };
  InvView.prototype.layoutX = function (d) { return d * 4.8; };
  InvView.prototype._size = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5), w = Math.round(this.cv.clientWidth * dpr), h = Math.round(this.cv.clientHeight * dpr);
    if (w !== this.w || h !== this.h) { this.w = w; this.h = h; this.R.resize(w, h); this.fx.width = w; this.fx.height = h; this.vp = M4.mul(M4.persp(36 * PI / 180, w / h, 0.5, 100), M4.look(this.eye, this.look, [0, 1, 0])); this.eyeR = [0, 8.6, 10.6]; this.vpR = M4.mul(M4.persp(36 * PI / 180, w / h, 0.5, 100), M4.look(this.eyeR, [0, 0.5, 0], [0, 1, 0])); this.eyeS = [0, 5.4, 19]; this.vpS = M4.mul(M4.persp(36 * PI / 180, w / h, 0.5, 100), M4.look(this.eyeS, [0, 0.3, 0], [0, 1, 0])); }
  };
  // ตำแหน่งบนจอ (0..1) ของไอเทมที่เลือก ใช้ตรวจการคลิก
  InvView.prototype.hit = function (mx, my) {   // mx,my เป็นสัดส่วน 0..1 → คืน offset ช่อง (0 = กลาง)
    if (!this.vp || !this.list.length) return null;
    for (var d = -3; d <= 3; d++) {
      var i = this.sel + d; if (i < 0 || i >= this.list.length) continue;
      var c = proj(this.vp, this.layoutX(d), d === 0 ? 2.0 : 1.1, d === 0 ? 0 : -1.5, 1, 1), r = d === 0 ? 0.3 : 0.14, cy = c[1] + (d === 0 ? 0.06 : 0.02);
      if (Math.abs(mx - c[0]) < r * (this.h / this.w) * 1.9 && Math.abs(my - cy) < r) return d;
    }
    return null;
  };
  InvView.prototype.startUse = function (id, done, side) { this.use = { id: id, t: 0, done: done, fired: false, side: side || 1 }; this.info = false; };

  /* ---------- วาดเอฟเฟกต์ 2D (ไฟ ลูกศร ประกาย) ---------- */
  function flameBall(o, cx, cy, S, a, tt) {
    o.save(); o.globalAlpha = a; var i, t;
    function blob(R, amp, tip, k, g) { o.beginPath(); for (i = 0; i <= 90; i++) { t = i / 90 * PI * 2; var up = Math.max(0, -Math.sin(t)), r = R + Math.sin(t * k + tt * 5) * amp + Math.pow(up, 2) * tip * (0.6 + 0.4 * Math.sin(t * 5 + tt * 7)); var px = cx + Math.cos(t) * r * 1.05, py = cy + Math.sin(t) * r * 0.95; if (i) o.lineTo(px, py); else o.moveTo(px, py); } o.closePath(); o.fillStyle = g; o.fill(); }
    function rg(r0, r1, st) { var g = o.createRadialGradient(cx, cy, r0 * S, cx, cy, r1 * S); st.forEach(function (s) { g.addColorStop(s[0], s[1]); }); return g; }
    o.shadowBlur = 22 * S; o.shadowColor = 'rgba(255,90,0,.6)';
    blob(150 * S, 12 * S, 70 * S, 7, rg(60, 230, [[0, 'rgba(255,70,0,0)'], [0.45, 'rgba(255,70,0,.22)'], [0.7, 'rgba(255,90,0,.62)'], [1, 'rgba(255,60,0,0)']]));
    blob(125 * S, 14 * S, 55 * S, 9, rg(70, 190, [[0, 'rgba(255,140,20,0)'], [0.5, 'rgba(255,130,10,.22)'], [0.8, 'rgba(255,160,20,.55)'], [1, 'rgba(255,140,0,0)']]));
    blob(100 * S, 10 * S, 35 * S, 11, rg(75, 150, [[0, 'rgba(255,230,120,0)'], [0.6, 'rgba(255,220,90,.22)'], [1, 'rgba(255,200,60,0)']]));
    o.shadowBlur = 0;
    for (i = 0; i < 12; i++) { var ph = (tt * 0.8 + i * 0.37) % 1, ax = cx + Math.sin(i * 2.3) * 130 * S, ay = cy - 40 * S - ph * 200 * S; o.globalAlpha = a * (1 - ph); o.fillStyle = '#ffc850'; o.beginPath(); o.arc(ax, ay, (2 + i % 3) * S * 1.2, 0, 7); o.fill(); }
    o.restore();
  }
  function arrow(o, x, y, w, h, a) {
    o.save(); o.translate(x, y); o.globalAlpha = a; o.lineWidth = 3.5; o.strokeStyle = '#fff'; var g = o.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#d7efff'); g.addColorStop(1, '#4dabf7'); o.fillStyle = g;
    o.beginPath(); o.moveTo(-w * 0.28, 0); o.lineTo(w * 0.28, 0); o.lineTo(w * 0.28, h * 0.55); o.lineTo(w * 0.62, h * 0.55); o.lineTo(0, h); o.lineTo(-w * 0.62, h * 0.55); o.lineTo(-w * 0.28, h * 0.55); o.closePath(); o.stroke(); o.fill(); o.restore();
  }
  function burst(o, cx, cy, r, a, col) { o.save(); o.globalAlpha = a; var g = o.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, col || 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); o.fillStyle = g; o.beginPath(); o.arc(cx, cy, r, 0, 7); o.fill(); o.restore(); }
  function sparks(o, cx, cy, R, p, n, col) { o.save(); for (var i = 0; i < n; i++) { var an = i / n * PI * 2 + i * 0.7, r = R * ease(p) * (0.6 + 0.4 * ((i * 7) % 5) / 4); o.globalAlpha = Math.max(0, 1 - p); o.fillStyle = col; o.beginPath(); o.arc(cx + Math.cos(an) * r, cy + Math.sin(an) * r * 0.8, 4 + (i % 3) * 2, 0, 7); o.fill(); } o.restore(); }

  function coin(o, x, y, r, a) { o.save(); o.globalAlpha = a; o.fillStyle = '#c98a00'; o.beginPath(); o.arc(x, y, r, 0, 7); o.fill(); o.fillStyle = '#ffd24a'; o.beginPath(); o.arc(x, y, r * 0.82, 0, 7); o.fill(); o.fillStyle = '#fff1a8'; o.beginPath(); o.arc(x - r * 0.25, y - r * 0.25, r * 0.28, 0, 7); o.fill(); o.restore(); }
  function snow(o, cx, cy, R, tt, a, n) { o.save(); o.strokeStyle = '#e8f8ff'; o.fillStyle = '#e8f8ff'; o.lineWidth = 3; for (var i = 0; i < n; i++) { var ph = (tt * 0.5 + i * 0.173) % 1, x = cx + Math.sin(i * 12.9) * R, y = cy - R * 0.9 + ph * R * 1.9; o.globalAlpha = a * Math.sin(ph * PI); o.beginPath(); o.arc(x, y, 4 + i % 4 * 2, 0, 7); o.fill(); } o.restore(); }
  function ringw(o, cx, cy, r, w, a, col) { o.save(); o.globalAlpha = a; o.strokeStyle = col; o.lineWidth = w; o.beginPath(); o.ellipse(cx, cy, r, r * 0.55, 0, 0, 7); o.stroke(); o.restore(); }
  function splat(o, cx, cy, S, p, a) { o.save(); o.globalAlpha = a; for (var i = 0; i < 9; i++) { var an = i / 9 * PI * 2, r = (60 + (i % 3) * 30) * S * ease(p); o.fillStyle = i % 2 ? '#fff4f8' : '#ffb3cf'; o.beginPath(); o.ellipse(cx + Math.cos(an) * r, cy + Math.sin(an) * r * 0.7, 16 * S, 11 * S, an, 0, 7); o.fill(); } o.restore(); }
  // หน้าที่หันขึ้นบน: 1=+Y 6=-Y 2=+Z 5=-Z 3=+X 4=-X
  function faceM(v) { return v === 6 ? M4.rotX(PI) : v === 2 ? M4.rotX(-PI / 2) : v === 5 ? M4.rotX(PI / 2) : v === 3 ? M4.rotZ(PI / 2) : v === 4 ? M4.rotZ(-PI / 2) : M4.rotY(0); }
  function rnd(seed, i) { var x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453; return x - Math.floor(x); }
  var T_FALL = 0.5, T_B1 = 0.5, T_B2 = 0.3, T_LAND = T_FALL + T_B1 + T_B2;
  function dieY(tau, H, hb) {
    hb = hb || 1;   // ความสูงฐานลูกเต๋า: ร่วงจากนอกจอ เด้ง 2 ครั้ง
    if (tau < 0) return H;
    if (tau < T_FALL) { var u = tau / T_FALL; return H * (1 - u * u); }
    tau -= T_FALL; if (tau < T_B1) { var u1 = tau / T_B1; return 1.5 * hb * 4 * u1 * (1 - u1); }
    tau -= T_B1; if (tau < T_B2) { var u2 = tau / T_B2; return 0.5 * hb * 4 * u2 * (1 - u2); }
    return 0;
  }
  InvView.prototype._setShake = function (x, y) {
    var tr = Math.abs(x) + Math.abs(y) > 0.3 ? 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)' : '';
    if (tr || this._shk) { this.cv.style.transform = tr; this.fx.style.transform = tr; this._shk = !!tr; }
  };
  InvView.prototype._drawRoll = function () {
    var R = this.R, self = this, r = this.roll, t = r.t, o = this.fx.getContext('2d'), id = r.id, sc = this.w / 1400, S1 = sc * 1.15, seed = (r.seed || 1) % 997 + 1;
    o.clearRect(0, 0, this.w, this.h);
    var defs = (this.IM.roll && (this.IM.roll[id] || this.IM.roll.normal)) || [], faces = r.dice && r.dice.length ? r.dice : [Math.max(1, Math.min(6, r.v | 0))];
    var n = Math.min(defs.length, faces.length) || 1, items = [], i, lockGear = null;
    var out = t > 2.15 ? Math.min(1, (t - 2.15) / 0.3) : 0, outS = 1 - out * out;
    var LK = id === 'lock', tL = LK ? 0.85 : T_LAND, tp = LK ? (t < 0.85 ? t * T_LAND / 0.85 : T_LAND + t - 0.85) : t, hb = id === 'giant' ? 0.4 : 1, P0 = null;
    var IMP = id === 'giant' || id === 'gamble' ? [[T_FALL, 1], [T_FALL + T_B1, 0.55], [T_LAND, 0.3]] : [];
    var shk = 0; if (id === 'giant') IMP.forEach(function (q) { var a = t - q[0]; if (a > 0 && a < 0.6) shk += q[1] * Math.exp(-a * 7) * Math.sin(a * 60); });
    this._setShake(shk * 16 * sc, shk * 10 * sc);
    if (outS <= 0.02) { this._setShake(0, 0); return; }
    for (i = 0; i < n; i++) {
      var d = defs[Math.min(i, defs.length - 1)], dd = defs.length === 1 && faces.length > 1 ? defs[0] : d, tau = tp - i * 0.12, s = dd.s;
      var gap = s * 1.3 + 0.35, x = (i - (n - 1) / 2) * gap + (rnd(seed, i) - 0.5) * 0.4, z = (rnd(seed, i + 9) - 0.5) * 0.8;
      var y = dieY(tau, 8 + i * 0.6, hb), pr = Math.max(0, Math.min(1, tau / (T_LAND + 0.1))), dk = Math.pow(1 - pr, 2);
      var drift = 1 - Math.min(1, Math.max(0, tau / T_LAND)), xx = x + ((i - (n - 1) / 2) * 1.1 + (rnd(seed, i + 3) - 0.5) * 1.2) * drift, zz = z + (rnd(seed, i + 5) - 0.5) * 1.0 * drift;
      if (LK) { var hu = (t - (tL + 0.56)) / 0.3; if (hu > 0 && hu < 1) y += 0.5 * 4 * hu * (1 - hu); }
      if (i === 0) P0 = { x: x, z: z, dx: (i - (n - 1) / 2) * 1.1 + (rnd(seed, i + 3) - 0.5) * 1.2, dz: (rnd(seed, i + 5) - 0.5) * 1.0, s: s };
      var fin;
      if (dd.fm) { var fl = dd.fm[r.v] || dd.fm[Object.keys(dd.fm)[0]], fr = fl[Math.floor(rnd(seed, i + 7) * fl.length) % fl.length], rr = fr.r, nn = fr.n, uu = fr.u;
        fin = M4.mul(M4.rotY((rnd(seed, i + 1) - 0.5) * (dd.fm || LK ? 0 : PI * 2)), [rr[0], nn[0], -uu[0], 0, rr[1], nn[1], -uu[1], 0, rr[2], nn[2], -uu[2], 0, 0, 0, 0, 1]); }
      else fin = M4.mul(M4.rotY((rnd(seed, i + 1) - 0.5) * (dd.fm || LK ? 0 : PI * 2)), faceM(faces[i]));
      var tum = M4.mul(M4.rotY((6 + rnd(seed, i + 2) * 4) * dk), M4.mul(M4.rotX((9 + rnd(seed, i + 4) * 5) * dk * (id === 'reverse' ? -1 : 1)), M4.rotZ((7 + rnd(seed, i + 6) * 4) * dk)));
      var ks = 1, keep = 0, kx = xx;
      if (id === 'triple') { for (var kk = 1; kk < n; kk++) if (faces[kk] > faces[keep]) keep = kk; var tv = Math.max(0, Math.min(1, (t - T_LAND - 0.35) / 0.35)); if (i !== keep) ks = 1 - ease(tv); else { ks = 1 + 0.18 * Math.sin(tv * PI); kx = xx * (1 - ease(tv)); } }
      var m = M4.mul(M4.translate(kx, y + s / 2, zz), M4.mul(M4.scale(outS * ks, outS * ks, outS * ks), M4.mul(tum, M4.mul(fin, M4.translate(0, -s / 2, 0)))));
      if (LK) lockGear = { Gc: M4.mul(M4.translate(kx, y + s / 2, zz), M4.mul(M4.scale(outS, outS, outS), tum)), tb: t - tL, kl: s / 1.3, s: s, x: kx, y: y, z: zz, outS: outS };
      items.push({ mesh: d.mesh, m: m, x: xx, y: y, z: zz, s: s });
    }
    function clamp01(v) { return Math.max(0, Math.min(1, v)); }
    var lg = lockGear, kpos = null, gear = function () {
      if (!lg) return; var K = lg.kl, tb = lg.tb, Gc = lg.Gc, s0 = lg.s, IMm = self.IM.mesh, K2 = K * 1.5, Sk = M4.scale(K, K, K), Sp = M4.scale(K2, K2, K2);
      var tr = tb > 0.4 && tb < 0.56 ? Math.sin(tb * 140) * 0.03 : 0;
      if (tb < 0.56) R.draw(IMm.lockchain, M4.mul(Gc, M4.mul(M4.translate(tr, -s0 / 2, 0), Sk)), null);
      var Bm = M4.mul(Gc, M4.translate(0, s0 / 2 + 0.26 * K2, 0)), f = tb - 0.8;
      if (f > 0) Bm = M4.mul(M4.translate(0.5 * f, 2.4 * f - 10 * f * f, 3.2 * f), M4.mul(Bm, M4.mul(M4.rotX(4.5 * f), M4.rotZ(2.2 * f))));
      var BS = M4.mul(Bm, Sp), lift = ease(clamp01((tb - 0.56) / 0.1)) * 0.14, sw = ease(clamp01((tb - 0.66) / 0.16)) * -2.3;
      R.draw(IMm.lockbody, M4.mul(BS, M4.translate(tr, 0, 0)), null);
      R.draw(IMm.lockshackle, M4.mul(BS, M4.mul(M4.translate(-0.22 + tr, 0.26 + lift, 0), M4.rotY(sw))), null);
      if (tb > 0) {   // กุญแจบินเข้ามา เสียบ แล้วหมุน
        var k1 = ease(clamp01(tb / 0.3)), k2 = ease(clamp01((tb - 0.3) / 0.1)), k3 = ease(clamp01((tb - 0.4) / 0.16)), ks = ease(clamp01(tb / 0.08));
        var kx = 1.9 * (1 - k1), ky = 0.06 + (-0.9 * (1 - k1) + Math.sin(k1 * PI) * 0.5), kz = 0.17 + (0.75 * (1 - k2)) + 1.5 * (1 - k1);
        var Km = M4.mul(BS, M4.mul(M4.translate(kx, ky, kz), M4.mul(M4.rotZ(-k3 * PI / 2 + (1 - k1) * 2.5), M4.mul(M4.rotY((1 - k1) * -0.6), M4.scale(ks * 1.25, ks * 1.25, ks * 1.25)))));
        R.draw(IMm.lockkey, Km, null);
      }
      if (tb >= 0.56) {   // โซ่แตกเป็นเศษ
        var tk = tb - 0.56;
        for (var si = 0; si < 22; si++) { var an = si / 22 * PI * 2 + rnd(seed, 50 + si), rad = 0.7 * K, sp = 2.2 + rnd(seed, 70 + si) * 2.8, ss = (0.12 + rnd(seed, 90 + si) * 0.12) * Math.max(0, 1 - tk / 0.7) * lg.outS;
          if (ss > 0.01) { var sx = lg.x + Math.cos(an) * (rad + sp * tk), sy = lg.y + s0 * 0.5 + (1.5 + rnd(seed, 110 + si) * 3) * tk - 9 * tk * tk, sz = lg.z + Math.sin(an) * (rad + sp * tk); R.draw(IMm.shard, M4.mul(M4.translate(sx, Math.max(0.05, sy), sz), M4.mul(M4.rotY(tk * 9 + si), M4.mul(M4.rotX(tk * 7 + si * 2), M4.scale(ss, ss, ss)))), null); } }
      }
    };
    var scene = function () { items.forEach(function (q) { R.draw(q.mesh, q.m, null); }); gear(); };
    R.shadowBegin(this.lvp); scene(); R.sceneBegin(this.vpR, this.eyeR, '#000000', 400, 800); scene(); R.post();
    items.forEach(function (q) { var p = proj(self.vpR, q.x, 0, q.z, self.w, self.h), hh = Math.max(0, 1 - q.y / 9); o.save(); o.globalAlpha = 0.28 * hh * outS; o.fillStyle = '#3a1830'; o.beginPath(); o.ellipse(p[0], p[1] + 6 * sc, q.s * 38 * sc * (0.6 + 0.4 * hh), q.s * 12 * sc * (0.6 + 0.4 * hh), 0, 0, 7); o.fill(); o.restore(); });
    var cx = proj(this.vpR, 0, 1.2, 0, this.w, this.h), tt = t + 0.3, deco = Math.max(0, 1 - Math.max(0, t - 1.5) / 0.5) * outS;
    if (deco > 0 && t > 0.25) {
      if (id === 'slow') { for (i = 0; i < 6; i++) { var ph = (tt * 0.13 + i * 0.31) % 1, an = i / 6 * PI * 2; arrow(o, cx[0] + Math.cos(an) * 220 * S1, cx[1] - 110 * S1 + ph * 170 * S1, 34 * S1, 80 * S1, deco * Math.sin(ph * PI)); } }
      else if (id === 'reverse') { for (var j = 0; j < 3; j++) { o.save(); o.globalAlpha = deco * 0.8; o.strokeStyle = '#6ff0d4'; o.lineWidth = 8 * S1; o.lineCap = 'round'; var a0 = -tt * 5 + j * 2.1; o.beginPath(); o.ellipse(cx[0], cx[1] + 40 * S1, (230 + j * 20) * S1, (110 + j * 14) * S1, 0, a0, a0 + 1.4); o.stroke(); o.restore(); } }
    }
    if (id === 'gamble' && P0) {   // สะเก็ดไฟเล็กๆ กระเด็นจากลูกเต๋า
      var posAt = function (tq) { var dr = 1 - clamp01(tq / T_LAND); return [P0.x + P0.dx * dr, dieY(tq, 8, hb) + P0.s / 2, P0.z + P0.dz * dr]; };
      o.save(); o.lineCap = 'round'; o.shadowColor = '#ff8a1e'; o.shadowBlur = 9 * S1;
      for (var k = 0; k < 120; k++) {
        var tbk, bur = false, ib = 0;
        if (k < 50) tbk = 0.1 + k * 0.026; else if (k < 90) { bur = true; ib = (k - 50) % 3; tbk = IMP[ib][0]; } else tbk = T_LAND + (k - 90) * 0.02;
        var age = t - tbk; if (age < 0) continue; var life = 0.6 + rnd(seed, 200 + k) * 0.9; if (age > life) continue;
        var bp = posAt(Math.min(tbk, T_LAND)), spd = bur ? 2.2 + rnd(seed, 210 + k) * 4.2 : 0.5 + rnd(seed, 210 + k) * 1.6, ang = rnd(seed, 220 + k) * PI * 2;
        var vx = Math.cos(ang) * spd, vz = Math.sin(ang) * spd * 0.7, vy = bur ? 3 + rnd(seed, 230 + k) * 5 : 0.4 + rnd(seed, 230 + k) * 2.4, by0 = bur ? 0.15 : bp[1];
        var pf = function (a2) { var yy = by0 + vy * a2 - 7 * a2 * a2; if (yy < 0.04) yy = 0.04 + (0.04 - yy) * 0.35; return proj(self.vpR, bp[0] + vx * a2, yy, bp[2] + vz * a2, self.w, self.h); };
        var pa = pf(age), pb = pf(Math.max(0, age - 0.045)), fr = age / life, fl = 0.65 + 0.35 * Math.sin(age * 60 + k * 3);
        o.globalAlpha = Math.max(0, (1 - fr)) * fl * outS; o.strokeStyle = fr < 0.3 ? '#fff4b8' : fr < 0.65 ? '#ffb53b' : '#ff5a18'; o.lineWidth = (2 + rnd(seed, 240 + k) * 2.2) * S1 * (1 - fr * 0.55);
        o.beginPath(); o.moveTo(pb[0], pb[1]); o.lineTo(pa[0], pa[1]); o.stroke();
      }
      o.restore();
    }
    IMP.forEach(function (q) {   // แรงกระแทก: คลื่นและฝุ่นที่พื้น (เด่นสุดกับเต๋ายักษ์)
      if (id !== 'giant' || !P0) return; var a = t - q[0]; if (a < 0 || a > 0.7) return; var dr = 1 - clamp01(q[0] / T_LAND), gx = P0.x + P0.dx * dr, gz = P0.z + P0.dz * dr, R0 = (1.2 + a * 7) * (0.5 + q[1] * 0.5);
      var c0 = proj(self.vpR, gx, 0, gz, self.w, self.h), c1 = proj(self.vpR, gx + R0, 0, gz, self.w, self.h), rx = Math.abs(c1[0] - c0[0]), fa = 1 - a / 0.7;
      o.save(); o.globalAlpha = fa * 0.85 * outS; o.strokeStyle = '#fff3d6'; o.lineWidth = 12 * S1 * fa * q[1]; o.beginPath(); o.ellipse(c0[0], c0[1], rx, rx * 0.4, 0, 0, 7); o.stroke();
      for (var pi2 = 0; pi2 < 12; pi2++) { var an2 = pi2 / 12 * PI * 2 + rnd(seed, 400 + pi2) * 0.4; o.globalAlpha = fa * 0.55 * outS; o.fillStyle = pi2 % 2 ? '#e9ddd0' : '#cdbfb2'; o.beginPath(); o.arc(c0[0] + Math.cos(an2) * rx * 0.85, c0[1] + Math.sin(an2) * rx * 0.34 - a * 60 * S1 * q[1], (22 + a * 70) * S1 * q[1], 0, 7); o.fill(); }
      o.restore();
    });
    if (lg && lg.tb > 0.56 && lg.tb < 1.2) {   // ติ๊ก! ปลดล็อก — ประกายทอง
      var ka = lg.tb - 0.56, kp = proj(self.vpR, lg.x, lg.y + lg.s + 0.3 * lg.kl, lg.z, self.w, self.h), kq = clamp01(ka / 0.5);
      burst(o, kp[0], kp[1], 170 * S1 * (0.5 + kq), (1 - kq) * 0.9 * outS, 'rgba(255,236,140,1)'); ringw(o, kp[0], kp[1], 40 * S1 + 190 * S1 * ease(kq), 8 * S1 * (1 - kq), (1 - kq) * outS, '#ffe27a'); sparks(o, kp[0], kp[1], 210 * S1, kq, 16, '#ffd43b');
    }
    var showNum = true;
    var tn = tL + (LK ? 0.58 : 0); if (showNum && t > tn) { var pp = Math.min(1, (t - tn) * 5); o.save(); o.globalAlpha = pp * outS; o.font = 'bold ' + Math.round(150 * S1) + 'px TAGBA,monospace'; o.textAlign = 'center'; o.textBaseline = 'middle'; o.lineWidth = 14 * S1; o.lineJoin = 'round'; o.strokeStyle = '#000'; o.fillStyle = '#fff'; var top = 0; items.forEach(function (q) { top = Math.max(top, q.s); }); var pn = proj(this.vpR, 0, top + 0.9, 0, this.w, this.h), ty = Math.max(this.h * 0.17, pn[1]) - pp * 14 * S1; o.strokeText(String(r.v), pn[0], ty); o.fillText(String(r.v), pn[0], ty); o.restore(); }
  };
  InvView.prototype.shopPos = function (n, i) { return (i - (n - 1) / 2) * 4.9; };
  InvView.prototype.shopHit = function (mx, my) {
    if (!this.shop || !this.vp) return -1; var n = this.shop.stock.length;
    for (var i = 0; i < n; i++) { if (!this.shop.stock[i]) continue; var c = proj(this.vpS, this.shopPos(n, i), 1.0, 0, 1, 1); if (Math.abs(mx - c[0]) < 0.075 * (1.4) && Math.abs(my - c[1]) < 0.17) return i; }
    return -1;
  };
  InvView.prototype._drawShop = function (now) {
    var R = this.R, self = this, tt = now / 1000, sh = this.shop, n = sh.stock.length, o = this.fx.getContext('2d'), S1 = this.w / 1400;
    o.clearRect(0, 0, this.w, this.h);
    var scene = function () {
      for (var i = 0; i < n; i++) {
        var x = self.shopPos(n, i); R.draw(self.stand, M4.translate(x, 0, 0), null); R.draw(self.board, M4.translate(x, 0, 0), { unlit: true, noCast: true, grain: 0 });
        var id = sh.stock[i]; if (!id) continue; var hv = sh.hover === i, s = (hv ? 1.45 : 1.2) * (FIT[id] || 1), by = hv ? Math.abs(Math.sin(tt * 4)) * 0.18 : 0;
        R.draw(self.IM.mesh[id], M4.mul(M4.translate(x, by, 0), M4.mul(M4.rotY(tt * (hv ? 1.4 : 0.5) + i), M4.scale(s, s, s))), null);
      }
    };
    R.shadowBegin(this.lvp); scene(); R.sceneBegin(this.vpS, this.eyeS, '#000000', 400, 800); scene(); R.post();
    for (var j = 0; j < n; j++) {
      var cc = proj(this.vpS, this.shopPos(n, j), -0.45, 1.88, this.w, this.h), id2 = sh.stock[j], it = id2 && CakeGame.ITEMS[id2];
      o.save(); o.textAlign = 'center'; o.textBaseline = 'middle'; o.lineJoin = 'round';
      if (!it) { o.font = 'bold ' + Math.round(34 * S1 * 1.4) + 'px TAGBA,monospace'; o.lineWidth = 8 * S1; o.strokeStyle = '#000'; o.fillStyle = '#ddd'; o.strokeText('ขายแล้ว', cc[0], cc[1]); o.fillText('ขายแล้ว', cc[0], cc[1]); }
      else { var ok = sh.can[j]; o.font = 'bold ' + Math.round(48 * S1 * 1.4) + 'px TAGBA,monospace'; var txt = String(it.price), tw = o.measureText(txt).width, r = 22 * S1 * 1.4; coin(o, cc[0] - tw / 2 - r * 0.9, cc[1], r, 1);
        o.fillStyle = '#000a'; o.textAlign = 'left'; o.fillText(txt, cc[0] - tw / 2 + r * 0.2 + 3 * S1, cc[1] + 5 * S1); o.fillStyle = ok ? '#ffe9a8' : '#ff6b6b'; o.fillText(txt, cc[0] - tw / 2 + r * 0.2, cc[1] + 2 * S1); }
      o.restore();
    }
  };
  InvView.prototype.draw = function (now) {
    this._size(); if (!this.vp) return; if (this.roll) { this._drawRoll(); return; } if (this._shk) this._setShake(0, 0); if (this.shop) { this._drawShop(now); return; }
    var R = this.R, self = this, tt = now / 1000, dt = Math.min(0.1, tt - (this.t0 || tt)); this.t0 = tt; if (typeof window !== "undefined" && window.__invSlow) dt *= window.__invSlow;
    this.pos += (this.sel - this.pos) * Math.min(1, dt * 12);
    var u = this.use, up = 0, id = u && u.id;
    if (u) { u.t += dt; up = u.t / USE_T; if (up >= 1 && !u.fired) { u.fired = true; var f = u.done; this.use = null; u = null; if (f) f(); } }
    var o = this.fx.getContext('2d'); o.clearRect(0, 0, this.w, this.h);
    var list = this.list, sc = this.w / 1400, items = [], i;
    // รายการที่จะวาด: ไอเทมในแถว + (ถ้ากำลังใช้) ชิ้นที่ใช้
    for (i = 0; i < list.length; i++) {
      var d = i - this.pos, ad = Math.abs(d); if (ad > 3.6) continue;
      var isSel = i === this.sel, big = Math.max(0, 1 - ad), s = 0.6 + 0.7 * big, y = 0.0 + big * 0.9, z = -1.5 * (1 - big), x = this.layoutX(d);
      var m = M4.translate(x, y, z);
      if (isSel) m = M4.mul(m, M4.rotY(this.use ? 0 : tt * 0.6 + 0.4));
      else m = M4.mul(m, M4.rotY(-0.5 * d));
      items.push({ id: list[i], m: m, ps: s, s: s * (FIT[list[i]] || 1), sel: isSel, d: d, x: x, y: y, z: z });
    }
    var selIt = items.filter(function (q) { return q.sel; })[0];
    var scene = function () {
      items.forEach(function (q) {
        if (q.sel && self.use) return;   // ชิ้นที่ใช้ แยกวาดตามแอนิเมชัน
        R.draw(self.plate, M4.mul(M4.translate(q.x, q.y - 0.02 * 0, q.z), M4.scale(q.ps * 0.9, q.ps * 0.9, q.ps * 0.9)), null);
        R.draw(self.IM.mesh[q.id], M4.mul(M4.mul(q.m, M4.translate(0, 0, 0)), M4.scale(q.s, q.s, q.s)), null);
      });
      if (self.use && selIt) { self._home = selIt; self._drawUse(selIt, up, tt, o); }
    };
    R.shadowBegin(this.lvp); scene(); R.sceneBegin(this.vp, this.eye, '#000000', 400, 800); scene(); R.post();
    if (this.tgMark && !this.use) { var tm = this.tgMark(); if (tm) { var rx = tm[0] * this.w, ry = tm[1] * this.h, mx = Math.max(0.07 * this.w, Math.min(0.93 * this.w, rx)), my = Math.max(0.24 * this.h, Math.min(0.8 * this.h, ry)), off = mx !== rx || my !== ry, ang = off ? Math.atan2(ry - my, rx - mx) - PI / 2 : 0, bob = Math.sin(tt * 6) * 10 * sc; o.save(); o.translate(mx, my + (off ? 0 : bob - 20 * sc)); o.rotate(ang); o.lineWidth = 6 * sc; o.strokeStyle = '#000'; o.fillStyle = '#ffd24a'; o.beginPath(); o.moveTo(-34 * sc, -40 * sc); o.lineTo(34 * sc, -40 * sc); o.lineTo(34 * sc, -10 * sc); o.lineTo(0, 30 * sc); o.lineTo(-34 * sc, -10 * sc); o.closePath(); o.stroke(); o.fill(); o.restore(); if (!off) ringw(o, mx, my + 50 * sc, 70 * sc, 8 * sc, 0.9, '#ffd24a'); } }
    // เอฟเฟกต์ 2D ของแอนิเมชันใช้ไอเทม (วาดทับ)
    this._badges(o, items, sc);
  };
  // ตำแหน่ง/ขนาดของไอเทมที่กำลังใช้ในแต่ละช่วง
  InvView.prototype._useXf = function (q, up) {
    var a = ease(up / 0.28), px = q.x * (1 - a), py = q.y + a * 0.3, pz = q.z + a * 0.8, s = (0.6 + 0.7) * (1 + a * 0.2);
    return { x: px, y: py, z: pz, s: s, a: a };
  };
  InvView.prototype._drawUse = function (q, up, tt, o) {
    var R = this.R, id = q.id, X = this._useXf(q, up), lock = id === 'lock', k = ease(((lock ? (up - 0.1) / 0.9 : up) - 0.22) / 0.78), s = X.s * (1 - k * 0.98) * (FIT[id] || 1), mesh = this.IM.mesh[id];
    var q0 = this._home; if (q0) R.draw(this.plate, M4.mul(M4.translate(q0.x, q0.y, q0.z), M4.scale(q0.ps * 0.9, q0.ps * 0.9, q0.ps * 0.9)), null);
    if (s <= 0.01) return;
    var ang = 0.4 + tt * 0.6 + k * k * PI * 7 * (id === 'reverse' ? -1 : 1), sq = 1, sy = 1;   // หมุนเร็วขึ้นเรื่อยๆ แล้วหุบเข้าไป
    if (lock) {   // เต๋าล็อก: หันแม่กุญแจเข้าหากล้อง แล้ว "คลิก" ก่อนหุบ
      var e = ease(up / 0.3); ang = (0.4 + tt * 0.6) * (1 - e) + k * k * PI * 6;
      var ck = up > 0.36 && up < 0.52 ? Math.sin((up - 0.36) / 0.16 * PI) : 0; sq = 1 + 0.1 * ck; sy = 1 - 0.14 * ck;
      if (ck > 0.02 && o) { var pp = proj(this.vp, X.x, X.y + 0.5 * X.s, X.z + 0.8 * X.s, this.w, this.h), sc2 = this.w / 1400, pr = (up - 0.36) / 0.16; o.save(); o.globalAlpha = 1 - pr; o.strokeStyle = '#fff1a8'; o.lineWidth = 6 * sc2; o.lineCap = 'round';
        for (var si = 0; si < 10; si++) { var an = si / 10 * PI * 2, r0 = (60 + pr * 40) * sc2, r1 = r0 + (24 + (si % 2) * 14) * sc2; o.beginPath(); o.moveTo(pp[0] + Math.cos(an) * r0, pp[1] + Math.sin(an) * r0); o.lineTo(pp[0] + Math.cos(an) * r1, pp[1] + Math.sin(an) * r1); o.stroke(); } o.restore(); }
    }
    var m = M4.mul(M4.translate(X.x, X.y + k * 0.5, X.z), M4.mul(M4.rotY(ang), M4.scale(s * sq, s * sy, s * sq)));
    R.draw(mesh, m, null);
  };
  // ป้ายจำนวนมุมขวาบนของโมเดลแต่ละชิ้น
  InvView.prototype._badges = function (o, items, sc) {
    var self = this; if (!this.counts) return;
    items.forEach(function (q) {
      var c = self.counts[q.id]; if (c === undefined || c === null) return;
      if (self.use && q.sel) return;
      var p = proj(self.vp, q.x + 1.05 * q.ps, q.y + 1.9 * q.ps, q.z, self.w, self.h), r = (q.sel ? 30 : 21) * sc * 1.15, txt = String(c);
      o.save(); o.globalAlpha = Math.max(0, 1 - Math.abs(q.d) * 0.3); o.fillStyle = '#ff5a8a'; o.strokeStyle = '#fff'; o.lineWidth = 4 * sc * 1.15; o.beginPath(); o.arc(p[0], p[1], r, 0, 7); o.fill(); o.stroke();
      o.font = 'bold ' + Math.round(r * (txt.length > 1 && txt !== '∞' ? 1.15 : 1.45)) + 'px TAGBA,monospace'; o.textAlign = 'center'; o.textBaseline = 'middle'; o.fillStyle = '#fff'; o.fillText(txt, p[0], p[1] + 1 * sc); o.restore();
    });
  };
  return InvView;
});
