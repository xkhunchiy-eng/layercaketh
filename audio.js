/* CakeAudio — เพลงพื้นหลัง (ซีเควนเซอร์สังเคราะห์ 8 บิตนุ่มๆ) + เสียงเอฟเฟกต์ทั้งหมด ไม่ใช้ไฟล์เสียง */
(function (root) {
  'use strict';
  var CA = {}, ctx = null, master = null, musicBus = null, sfxBus = null, noiseBuf = null;
  var S = { music: true, muted: false, cur: null, tracks: [], timer: 0 };
  try { if (localStorage.getItem('cp_music') === '0') S.music = false; if (localStorage.getItem('cp_mute') === '1') S.muted = true; } catch (e) {}

  /* ---------- พื้นฐาน ---------- */
  function mk(c) {
    var m = c.createGain(), comp = c.createDynamicsCompressor(), mb = c.createGain(), sb = c.createGain();
    comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    mb.connect(m); sb.connect(m); m.connect(comp); comp.connect(c.destination);
    return { master: m, music: mb, sfx: sb };
  }
  function ensure() {
    if (ctx) return ctx;
    try {
      ctx = new (root.AudioContext || root.webkitAudioContext)();
      var n = mk(ctx); master = n.master; musicBus = n.music; sfxBus = n.sfx; applyVol();
    } catch (e) { ctx = null; }
    return ctx;
  }
  function applyVol() {
    if (!ctx) return; var t = ctx.currentTime;
    master.gain.setTargetAtTime(S.muted ? 0 : 0.9, t, 0.03);
    musicBus.gain.setTargetAtTime(S.music ? 0.5 : 0, t, 0.08);
    sfxBus.gain.setTargetAtTime(0.9, t, 0.03);
  }
  function getNoise(c) {
    if (noiseBuf && noiseBuf.sampleRate === c.sampleRate) return noiseBuf;
    var n = c.sampleRate, b = c.createBuffer(1, n, c.sampleRate), a = b.getChannelData(0), s = 12345;
    for (var i = 0; i < n; i++) { s = (s * 1664525 + 1013904223) >>> 0; a[i] = s / 2147483648 - 1; }
    return (noiseBuf = b);
  }
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  // เสียงโน้ต: osc -> envelope -> (lowpass) -> bus
  function tone(c, bus, t, f, d, v, type, o) {
    o = o || {};
    var os = c.createOscillator(), g = c.createGain(), att = o.att || 0.005, rel = o.rel || Math.min(0.12, d * 0.6), out = g;
    os.type = type || 'square'; os.frequency.setValueAtTime(f, t);
    if (o.f2) os.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t + d);
    if (o.det) os.detune.value = o.det;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + att);
    g.gain.setValueAtTime(v, Math.max(t + att, t + d - rel)); g.gain.exponentialRampToValueAtTime(0.0001, t + d + rel * 0.5 + 0.01);
    os.connect(g);
    if (o.lp) { var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.lp; g.connect(lp); out = lp; }
    out.connect(bus); os.start(t); os.stop(t + d + rel + 0.05);
  }
  function noise(c, bus, t, d, v, type, f, q, f2) {
    var s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    s.buffer = getNoise(c); s.loop = true; fl.type = type || 'highpass'; fl.frequency.setValueAtTime(f || 4000, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + d); fl.Q.value = q || 0.7;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(fl); fl.connect(g); g.connect(bus); s.start(t, Math.random() * 0.5); s.stop(t + d + 0.02);
  }
  var DR = {
    k: function (c, b, t, v) { tone(c, b, t, 150, 0.16, v, 'sine', { f2: 42, att: 0.002, rel: 0.05 }); noise(c, b, t, 0.02, v * 0.2, 'lowpass', 900); },
    s: function (c, b, t, v) { noise(c, b, t, 0.14, v * 0.7, 'bandpass', 1900, 0.9); tone(c, b, t, 200, 0.09, v * 0.5, 'triangle', { f2: 130, att: 0.002, rel: 0.03 }); },
    h: function (c, b, t, v) { noise(c, b, t, 0.04, v * 0.4, 'highpass', 7000); },
    o: function (c, b, t, v) { noise(c, b, t, 0.2, v * 0.35, 'highpass', 6500); },
    c: function (c, b, t, v) { noise(c, b, t, 0.05, v * 0.5, 'bandpass', 1300, 1.2); noise(c, b, t + 0.012, 0.06, v * 0.5, 'bandpass', 1300, 1.2); noise(c, b, t + 0.026, 0.12, v * 0.55, 'bandpass', 1300, 1.2); },
    t: function (c, b, t, v) { tone(c, b, t, 880, 0.05, v * 0.5, 'sine', { att: 0.001 }); }
  };

  /* ---------- ซีเควนเซอร์เพลง ---------- */
  var SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], mixo: [0, 2, 4, 5, 7, 9, 10] };
  function semi(sc, i) { var n = sc.length, o = Math.floor(i / n), r = ((i % n) + n) % n; return o * 12 + sc[r]; }
  function P(s) { return s.split(/\s+/).filter(function (x) { return x.length; }); }

  var TRACKS = {
    // เมนู/ล็อบบี้: ชิวๆ
    menu: {
      bpm: 84, key: 60, sc: 'major', swing: 0.14, vol: 1,
      chords: [0, 5, 3, 4, 0, 2, 3, 4],
      mel: ['4 _ 2 4 7 _ 4 .', '9 _ 7 5 7 _ . .', '5 _ 7 9 7 _ 5 .', '8 _ 6 4 6 _ . .', '7 _ 4 7 9 _ 7 .', '6 _ 4 2 4 _ 6 .', '5 7 9 _ 7 5 3 .', '4 _ 6 _ 8 _ . .'],
      lead: { type: 'triangle', vol: 0.15, gate: 0.85, lp: 2200 }, bass: { style: 'half', type: 'sine', vol: 0.2 }, pad: { style: 'pad', type: 'sine', vol: 0.06 },
      dr: { k: 'x.......x.x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', v: 0.5 }
    },
    // บอร์ดเกม: เด้งๆ สบายๆ
    board: {
      bpm: 112, key: 62, sc: 'major', swing: 0.1, vol: 1,
      chords: [0, 3, 4, 0, 0, 5, 3, 4],
      mel: ['4 4 7 . 9 7 4 .', '5 5 9 . 7 5 3 .', '6 6 8 . 6 4 . .', '7 . 4 . 0 2 4 .', '4 4 7 . 9 7 4 .', '9 . 7 . 5 . 7 9', '10 9 7 . 5 7 9 .', '8 . 6 . 4 6 8 .'],
      lead: { type: 'square', vol: 0.085, gate: 0.55, lp: 3200 }, bass: { style: 'off8', type: 'triangle', vol: 0.26 }, pad: { style: 'stab', type: 'triangle', vol: 0.07 },
      dr: { k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...x.', v: 0.55 }
    },
    // มินิเกมแนวไล่/หลบ/ปะทะ: เร็ว ตึงเครียด
    chase: {
      bpm: 152, key: 57, sc: 'minor', swing: 0, vol: 1,
      chords: [0, 5, 2, 6, 0, 5, 6, 6],
      mel: ['7 7 . 4 7 7 . 4 7 . 9 . 7 . 4 .', '9 9 . 7 9 9 . 7 9 . 11 . 9 . 7 .', '6 6 . 4 6 6 . 4 6 . 8 . 6 . 4 .', '8 8 . 6 8 8 . 6 10 . 8 . 6 . 8 .', '7 7 . 4 7 7 . 4 7 . 9 . 7 . 4 .', '9 9 . 7 9 9 . 7 9 . 11 . 9 . 7 .', '10 . 8 . 6 . 8 . 10 . 11 . 13 . 11 10', '8 . 6 . 4 . 6 . 8 . . . 8 . 10 .'],
      lead: { type: 'square', vol: 0.08, gate: 0.5, lp: 2800 }, bass: { style: 'pulse16', type: 'sawtooth', vol: 0.15, lp: 700 }, pad: { style: 'arp', type: 'triangle', vol: 0.04 },
      dr: { k: 'x...x...x..xx...', s: '....x.......x..x', h: 'xxxxxxxxxxxxxxxx', v: 0.6, fill: 1 }
    },
    // มินิเกมแนวคิด/จำ/คำนวณ: ขี้เล่น เบาๆ
    puzzle: {
      bpm: 104, key: 65, sc: 'major', swing: 0.1, vol: 1,
      chords: [0, 4, 5, 3, 0, 4, 3, 4],
      mel: ['0 2 4 . 2 4 7 .', '8 6 4 . 6 4 2 .', '9 7 5 . 7 9 11 .', '10 9 7 . 5 . 3 .', '0 2 4 . 7 4 2 .', '8 6 4 6 8 . 6 .', '5 7 9 . 7 5 3 .', '4 6 8 . 6 . 4 .'],
      lead: { type: 'sine', vol: 0.2, gate: 0.4, pluck: 1 }, bass: { style: 'walk', type: 'triangle', vol: 0.2 }, pad: { style: 'pluck', type: 'triangle', vol: 0.06 },
      dr: { k: 'x.......x.......', s: '....t.......t...', h: '..x...x...x...x.', v: 0.38 }
    },
    // มินิเกมแนวเก็บ/ตี/ยิง: สดใส ฮึกเหิม
    arcade: {
      bpm: 134, key: 64, sc: 'major', swing: 0, vol: 1,
      chords: [0, 4, 5, 3, 0, 4, 3, 0],
      mel: ['7 . 4 7 9 . 7 . 4 . 7 . 9 . 11 .', '8 . 6 8 11 . 8 . 6 . 8 . 11 . 13 .', '9 . 7 9 12 . 9 . 7 . 9 . 12 . 14 .', '10 . 7 10 9 . 7 . 5 . 7 . 9 . 10 .', '7 . 4 7 9 . 7 . 11 . 9 . 7 . 4 .', '8 . 6 8 11 . 8 . 13 . 11 . 8 . 6 .', '10 . 9 . 7 . 5 . 7 . 9 . 10 . 12 .', '11 . 9 . 7 . 4 . 7 . . . 7 . . .'],
      lead: { type: 'square', vol: 0.08, gate: 0.6, lp: 3500 }, bass: { style: 'root8', type: 'triangle', vol: 0.26 }, pad: { style: 'arp', type: 'square', vol: 0.025, lp: 2200 },
      dr: { k: 'x...x...x...x...', s: '....c.......c...', h: '..x...x...x...x.', v: 0.6, fill: 1 }
    },
    // มินิเกมแนวปาร์ตี้/วุ่นวาย: ฟังกี้ มีสวิง
    funk: {
      bpm: 118, key: 62, sc: 'mixo', swing: 0.2, vol: 1,
      chords: [0, 0, 6, 6, 3, 3, 0, 4],
      mel: ['4 . . 4 . 7 . 4 . . 2 . 4 . . .', '4 . 4 . 7 . . 9 . 7 . 4 . 2 . .', '8 . . 8 . 10 . 8 . . 6 . 8 . . .', '8 . 8 . 10 . . 11 . 10 . 8 . 6 . .', '5 . . 5 . 7 . 5 . . 3 . 5 . . .', '5 . 7 . 9 . . 7 . 5 . 3 . . 5 .', '4 . . 7 . 9 . 7 . . 4 . 2 . 0 .', '6 . 8 . 6 . 4 . 6 . 8 . 11 . . .'],
      lead: { type: 'square', vol: 0.08, gate: 0.4, lp: 1700 }, bass: { style: 'sync', type: 'triangle', vol: 0.27 }, pad: { style: 'stab', type: 'sawtooth', vol: 0.03, lp: 1400 },
      dr: { k: 'x..x..x...x.....', s: '....x.......x..x', h: 'x.xxx.xxx.xxx.xx', v: 0.55, fill: 1 }
    },
    // หน้านับคะแนน: ลุ้นๆ เดินแถว
    score: {
      bpm: 100, key: 57, sc: 'minor', swing: 0, vol: 0.85,
      chords: [0, 0, 5, 6, 0, 0, 3, 4],
      mel: ['0 . 2 . 4 . 2 .', '0 . 2 . 4 . 7 .', '9 . 7 . 5 . 7 .', '8 . 6 . 8 . 10 .', '7 . 4 . 2 . 4 .', '7 . 9 . 11 . 9 .', '10 . 9 . 7 . 5 .', '6 . 8 . 11 . 13 .'],
      lead: { type: 'triangle', vol: 0.17, gate: 0.7, lp: 2600 }, bass: { style: 'root8', type: 'triangle', vol: 0.24 }, pad: { style: 'pad', type: 'sawtooth', vol: 0.03, lp: 900 },
      dr: { k: 'x...x...x...x...', s: '..x...x...x...xx', h: 'x.x.x.x.x.x.x.x.', v: 0.5, fill: 1, build: 1 }
    }
  };
  // เกมไหนใช้เพลงอะไร
  var MG_TRACK = {
    tag: 'chase', dodge: 'chase', bomb: 'chase', hill: 'chase', floor: 'chase', wall: 'chase', sumo: 'chase', maze: 'chase', runner: 'chase',
    memory: 'puzzle', simon: 'puzzle', numbers: 'puzzle', order: 'puzzle', shadow: 'puzzle', count: 'puzzle', addmath: 'puzzle', sweetveg: 'puzzle', color: 'puzzle', balance: 'puzzle',
    catcher: 'arcade', coinrush: 'arcade', mole: 'arcade', shoot: 'arcade', mash: 'arcade', stack: 'arcade', reaction: 'arcade', holdbar: 'arcade',
    cream: 'funk', slice: 'funk', chairs: 'funk'
  };
  CA.trackFor = function (id) { return MG_TRACK[id] || 'arcade'; };
  CA.TRACKS = TRACKS;

  function parseMel(tr) {
    if (tr._mel) return tr._mel;
    return (tr._mel = tr.mel.map(P));
  }
  // จัดโน้ต 1 ห้อง (4/4) ลงเวลา t0 ปลายทาง bus
  function schedBar(c, bus, tr, bar, t0) {
    var sc = SCALES[tr.sc], bpb = 60 / tr.bpm, sd = bpb / 4, key = tr.key, B = bar % tr.chords.length;
    var root = tr.chords[B], sw = tr.swing || 0, dr = tr.dr;
    function T(step) { return t0 + step * sd + ((step % 4 === 2) ? sw * sd * 2 : 0) + ((step % 2 === 1) ? sw * sd : 0); }
    // ทำนองหลัก
    var tk = parseMel(tr)[B % tr.mel.length], gs = 16 / tk.length, L = tr.lead, last = null, notes = [];
    for (var i = 0; i < tk.length; i++) {
      var tok = tk[i]; if (tok === '.') { last = null; continue; }
      if (tok === '_') { if (last) last.d += gs; continue; }
      last = { step: i * gs, d: gs, deg: parseInt(tok, 10) }; notes.push(last);
    }
    notes.forEach(function (n) { var m = key + 12 + semi(sc, n.deg), t = T(n.step), d = n.d * sd * (L.gate || 0.6);
      if (L.pluck) tone(c, bus, t, hz(m), d + 0.12, L.vol, 'sine', { att: 0.003, rel: d * 0.9 }), tone(c, bus, t, hz(m + 12), 0.08, L.vol * 0.35, 'triangle', { att: 0.002, rel: 0.05 });
      else tone(c, bus, t, hz(m), d, L.vol, L.type, { lp: L.lp, att: 0.008 }); });
    // เบส
    var bs = tr.bass, r = key - 12 + semi(sc, root), rr = hz(r);
    function bn(step, mul, len) { tone(c, bus, T(step), rr * mul, sd * len, bs.vol, bs.type, { lp: bs.lp || 900, att: 0.006 }); }
    var st = bs.style, thirds = hz(key - 12 + semi(sc, root + 2)), fifth = hz(key - 12 + semi(sc, root + 4));
    if (st === 'half') { bn(0, 1, 7); bn(8, 1, 5); tone(c, bus, T(13), fifth, sd * 2.5, bs.vol * 0.8, bs.type, { lp: 900 }); }
    else if (st === 'off8') { bn(0, 1, 1.6); bn(2, 1, 1.4); bn(6, 2, 1.4); bn(8, 1, 1.6); bn(10, 1, 1.4); bn(14, 2, 1.4); }
    else if (st === 'root8') { for (var q = 0; q < 8; q++) bn(q * 2, (q % 4 === 3) ? 2 : 1, 1.5); }
    else if (st === 'walk') { tone(c, bus, T(0), rr, sd * 3.5, bs.vol, bs.type, { lp: 800 }); tone(c, bus, T(4), thirds, sd * 3.5, bs.vol, bs.type, { lp: 800 }); tone(c, bus, T(8), fifth, sd * 3.5, bs.vol, bs.type, { lp: 800 }); tone(c, bus, T(12), thirds, sd * 3.5, bs.vol, bs.type, { lp: 800 }); }
    else if (st === 'sync') { [0, 3, 6, 10, 12].forEach(function (s) { bn(s, 1, 2.2); }); tone(c, bus, T(14), fifth, sd * 1.8, bs.vol * 0.9, bs.type, { lp: 900 }); }
    else if (st === 'pulse16') { for (var z = 0; z < 16; z++) tone(c, bus, T(z), rr * ((z % 8 === 7) ? 2 : 1), sd * 0.7, bs.vol * (z % 4 === 0 ? 1.1 : 0.8), bs.type, { lp: bs.lp || 700, att: 0.004 }); }
    // คอร์ด/แพด
    var pd = tr.pad, c0 = hz(key + semi(sc, root)), c1 = hz(key + semi(sc, root + 2)), c2 = hz(key + semi(sc, root + 4)), chd = [c0, c1, c2];
    if (pd.style === 'pad') { chd.forEach(function (f) { tone(c, bus, t0, f, sd * 15, pd.vol, pd.type, { att: 0.25, rel: 0.5, lp: pd.lp || 1800 }); }); }
    else if (pd.style === 'stab') { [4, 10, 14].forEach(function (s) { chd.forEach(function (f) { tone(c, bus, T(s), f, sd * 1.2, pd.vol, pd.type, { att: 0.004, lp: pd.lp || 2200 }); }); }); }
    else if (pd.style === 'arp') { for (var a = 0; a < 16; a++) tone(c, bus, T(a), chd[[0, 1, 2, 1][a % 4]] * 2, sd * 0.8, pd.vol * (a % 4 === 0 ? 1.3 : 1), pd.type, { att: 0.003, lp: pd.lp || 2500 }); }
    else if (pd.style === 'pluck') { for (var e = 0; e < 8; e++) tone(c, bus, T(e * 2), chd[[0, 2, 1, 2][e % 4]], sd * 1.6, pd.vol, pd.type, { att: 0.003, lp: 1600 }); }
    // กลอง
    if (dr) {
      var fill = dr.fill && (bar % 4 === 3), build = dr.build && (bar % 8 >= 6);
      for (var s = 0; s < 16; s++) {
        var t = T(s), v = dr.v, skip = fill && s >= 12;
        ['k', 's', 'h', 'o'].forEach(function (nm) {
          var ch = (dr[nm] || '')[s]; if (!ch || ch === '.') return;
          if (skip && (nm === 'k' || nm === 's')) return;
          var vv = v * (nm === 'k' ? 0.9 : nm === 's' ? 0.75 : 0.5); if (nm === 'h' && s % 4 !== 0) vv *= 0.65;
          if (ch === 'c') DR.c(c, bus, t, vv); else if (ch === 't') DR.t(c, bus, t, v); else DR[nm](c, bus, t, vv);
        });
        if (build) DR.s(c, bus, t, v * (0.25 + 0.6 * ((bar % 8 - 6) * 16 + s) / 32));
        else if (skip) DR.s(c, bus, t, v * (0.55 + (s - 12) * 0.12));
      }
    }
  }
  CA._schedBar = schedBar;

  // ตัวป้อนโน้ตล่วงหน้า
  function tick() {
    if (!ctx) return;
    var now = ctx.currentTime;
    S.tracks.forEach(function (T) {
      if (T.dead) return;
      while (T.next < now + 0.35) {
        schedBar(ctx, T.gain, T.tr, T.bar, T.next); T.bar++; T.next += 4 * 60 / T.tr.bpm;
      }
    });
    S.tracks = S.tracks.filter(function (T) { if (T.dead && now > T.endAt) { try { T.gain.disconnect(); } catch (e) {} return false; } return true; });
    if (!S.tracks.length && S.timer) { clearInterval(S.timer); S.timer = 0; }
  }
  CA.music = function (name, o) {
    o = o || {};
    if (name === S.cur) return;
    S.cur = name || null;
    if (!ensure()) return;
    var t = ctx.currentTime;
    S.tracks.forEach(function (T) { if (!T.dead) { T.dead = true; T.endAt = t + 0.8; T.gain.gain.cancelScheduledValues(t); T.gain.gain.setValueAtTime(T.gain.gain.value, t); T.gain.gain.linearRampToValueAtTime(0, t + (o.fade || 0.6)); } });
    if (!name || !TRACKS[name]) { if (!S.timer && S.tracks.length) S.timer = setInterval(tick, 40); return; }
    var tr = TRACKS[name], g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(tr.vol || 1, t + 0.5); g.connect(musicBus);
    S.tracks.push({ tr: tr, gain: g, bar: 0, next: t + 0.12, dead: false });
    if (!S.timer) S.timer = setInterval(tick, 40);
  };
  CA.duck = function (v, sec) { if (!ctx) return; musicBus.gain.setTargetAtTime(S.music ? 0.5 * v : 0, ctx.currentTime, sec || 0.1); };
  CA.setMusic = function (on) { S.music = !!on; try { localStorage.setItem('cp_music', on ? '1' : '0'); } catch (e) {} applyVol(); };
  CA.getMusic = function () { return S.music; };
  CA.setMuted = function (m) { S.muted = !!m; try { localStorage.setItem('cp_mute', m ? '1' : '0'); } catch (e) {} applyVol(); };
  CA.isMuted = function () { return S.muted; };
  CA.ctx = function () { return ensure(); };
  CA.resume = function () { if (ensure() && ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} } };
  CA.current = function () { return S.cur; };

  /* ---------- เอฟเฟกต์ ---------- */
  function seq(c, b, t, notes, type, v, d, o) { notes.forEach(function (m, i) { tone(c, b, t + i * d, hz(m), d * 1.6, v, type, o); }); }
  var SFX = {
    click: function (c, b, t) { tone(c, b, t, 1500, 0.05, 0.1, 'square', { f2: 900, att: 0.001 }); },
    ready: function (c, b, t) { seq(c, b, t, [76, 83], 'square', 0.08, 0.07); },
    join: function (c, b, t) { seq(c, b, t, [72, 79, 84], 'triangle', 0.12, 0.06); },
    dice: function (c, b, t) {
      var x = 0, k = 0; while (x < 0.8) { noise(c, b, t + x, 0.05, 0.28, 'bandpass', 1200 + (k % 3) * 700, 2); tone(c, b, t + x, 180 + (k % 4) * 40, 0.04, 0.1, 'triangle', { att: 0.001 }); x += 0.06 + x * 0.14; k++; }
      tone(c, b, t + 0.9, 220, 0.12, 0.2, 'sine', { f2: 110, att: 0.002 });
    },
    step: function (c, b, t, n) { var sc = [0, 2, 4, 7, 9, 12, 14, 16], m = 67 + sc[(n || 0) % 8]; tone(c, b, t, hz(m), 0.1, 0.16, 'square', { lp: 2800, att: 0.002 }); tone(c, b, t, hz(m - 12), 0.12, 0.12, 'triangle', { att: 0.002 }); },
    land: function (c, b, t) { tone(c, b, t, 170, 0.18, 0.4, 'sine', { f2: 60, att: 0.002 }); noise(c, b, t, 0.08, 0.2, 'lowpass', 900); },
    coin: function (c, b, t, n) { n = Math.max(1, Math.min(5, n || 1)); for (var i = 0; i < n; i++) { var u = t + i * 0.085; tone(c, b, u, 1319, 0.07, 0.14, 'square', { lp: 4000, att: 0.001 }); tone(c, b, u + 0.06, 1760, 0.22, 0.14, 'square', { lp: 4500, att: 0.001, rel: 0.15 }); } },
    loss: function (c, b, t, n) { tone(c, b, t, 520, 0.28, 0.18, 'sawtooth', { f2: 190, lp: 1800 }); tone(c, b, t + 0.12, 390, 0.3, 0.14, 'sawtooth', { f2: 140, lp: 1500 }); },
    shop: function (c, b, t) { seq(c, b, t, [79, 84, 88], 'sine', 0.16, 0.09); tone(c, b, t + 0.3, hz(91), 0.6, 0.12, 'sine', { rel: 0.5 }); tone(c, b, t + 0.3, hz(103), 0.5, 0.05, 'sine', { rel: 0.4 }); },
    buy: function (c, b, t) { noise(c, b, t, 0.03, 0.3, 'highpass', 5000); tone(c, b, t + 0.06, 1568, 0.1, 0.15, 'square', { lp: 4500, att: 0.001 }); tone(c, b, t + 0.14, 2093, 0.45, 0.15, 'square', { lp: 5000, att: 0.001, rel: 0.4 }); tone(c, b, t + 0.14, 3136, 0.4, 0.05, 'sine', { rel: 0.35 }); },
    get: function (c, b, t) { seq(c, b, t, [72, 76, 79, 84], 'triangle', 0.15, 0.06); },
    deny: function (c, b, t) { tone(c, b, t, 150, 0.14, 0.2, 'sawtooth', { lp: 900 }); tone(c, b, t + 0.17, 120, 0.2, 0.2, 'sawtooth', { lp: 800 }); },
    trap: function (c, b, t) { tone(c, b, t, 1400, 0.55, 0.12, 'square', { f2: 170, lp: 2500 }); noise(c, b, t, 0.5, 0.15, 'bandpass', 2500, 1, 400); tone(c, b, t + 0.55, 90, 0.2, 0.3, 'sine', { f2: 50 }); },
    sent: function (c, b, t) { seq(c, b, t, [72, 67, 62, 55], 'square', 0.1, 0.12, { lp: 2000 }); },
    mystery: function (c, b, t) { seq(c, b, t, [72, 76, 79, 83, 84, 88, 91, 96], 'triangle', 0.11, 0.055); noise(c, b, t + 0.1, 0.6, 0.05, 'highpass', 9000); },
    cherryAsk: function (c, b, t) { seq(c, b, t, [72, 76, 79], 'sine', 0.14, 0.14); tone(c, b, t + 0.5, hz(84), 0.6, 0.1, 'sine', { rel: 0.5 }); },
    cherryBuy: function (c, b, t) { seq(c, b, t, [67, 72, 76, 79, 84], 'square', 0.1, 0.1, { lp: 3000 }); seq(c, b, t + 0.55, [79, 84, 88, 91, 96, 100], 'triangle', 0.12, 0.06); tone(c, b, t + 0.55, hz(60), 1.0, 0.1, 'triangle', { rel: 0.8 }); tone(c, b, t + 0.55, hz(67), 1.0, 0.08, 'triangle', { rel: 0.8 }); },
    use: function (c, b, t) { noise(c, b, t, 0.35, 0.22, 'bandpass', 400, 1.2, 4000); tone(c, b, t + 0.25, 1047, 0.2, 0.12, 'square', { f2: 1568, lp: 3000 }); },
    swap: function (c, b, t) { noise(c, b, t, 0.3, 0.2, 'bandpass', 500, 1.2, 3500); noise(c, b, t + 0.3, 0.3, 0.2, 'bandpass', 3500, 1.2, 500); tone(c, b, t + 0.25, 900, 0.2, 0.1, 'triangle'); },
    freeze: function (c, b, t) { for (var i = 0; i < 7; i++) tone(c, b, t + i * 0.05, hz(96 + (i * 5) % 12), 0.3, 0.07, 'sine', { rel: 0.25 }); noise(c, b, t, 0.4, 0.08, 'highpass', 8000); },
    steal: function (c, b, t) { seq(c, b, t, [72, 79, 76, 84], 'square', 0.08, 0.05, { lp: 3000 }); tone(c, b, t + 0.25, 600, 0.2, 0.1, 'triangle', { f2: 1200 }); },
    turn: function (c, b, t) { tone(c, b, t, 784, 0.1, 0.16, 'square', { lp: 3000 }); tone(c, b, t + 0.11, 1047, 0.25, 0.16, 'square', { lp: 3500, rel: 0.2 }); },
    round: function (c, b, t) { seq(c, b, t, [60, 64, 67, 72], 'square', 0.1, 0.1, { lp: 3000 }); tone(c, b, t + 0.4, hz(76), 0.7, 0.11, 'square', { lp: 3000, rel: 0.5 }); tone(c, b, t + 0.4, hz(72), 0.7, 0.08, 'triangle', { rel: 0.5 }); tone(c, b, t + 0.4, hz(64), 0.7, 0.08, 'triangle', { rel: 0.5 }); DR.k(c, b, t, 0.4); DR.s(c, b, t + 0.4, 0.4); },
    cd: function (c, b, t) { tone(c, b, t, 660, 0.18, 0.2, 'square', { lp: 3000 }); },
    go: function (c, b, t) { tone(c, b, t, 1320, 0.5, 0.2, 'square', { lp: 4000, rel: 0.4 }); tone(c, b, t, 660, 0.5, 0.12, 'triangle', { rel: 0.4 }); tone(c, b, t, 990, 0.5, 0.1, 'triangle', { rel: 0.4 }); DR.c(c, b, t, 0.4); },
    point: function (c, b, t) { tone(c, b, t, 988, 0.06, 0.1, 'square', { lp: 4000, att: 0.001 }); tone(c, b, t + 0.05, 1319, 0.12, 0.1, 'square', { lp: 4000, att: 0.001 }); },
    miss: function (c, b, t) { tone(c, b, t, 300, 0.16, 0.14, 'sawtooth', { f2: 150, lp: 1200 }); },
    mgEnd: function (c, b, t) { noise(c, b, t, 0.5, 0.18, 'highpass', 4000); seq(c, b, t + 0.1, [72, 72, 79], 'square', 0.1, 0.13, { lp: 3000 }); tone(c, b, t + 0.1 + 0.39, hz(84), 0.8, 0.12, 'square', { lp: 3500, rel: 0.6 }); },
    result: function (c, b, t) { seq(c, b, t, [67, 71, 74, 79], 'triangle', 0.14, 0.09); tone(c, b, t + 0.36, hz(83), 0.6, 0.1, 'sine', { rel: 0.5 }); },
    win: function (c, b, t) { seq(c, b, t, [72, 76, 79, 84, 79, 84, 88], 'square', 0.1, 0.09, { lp: 3500 }); tone(c, b, t + 0.63, hz(91), 1.0, 0.12, 'square', { lp: 3500, rel: 0.8 }); }
  };
  CA.sfx = function (name, arg, delay) {
    var f = SFX[name]; if (!f || !ensure()) return;
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
    var t = ctx.currentTime + (delay || 0) + 0.005;
    try { f(ctx, sfxBus, t, arg); } catch (e) {}
  };
  // เล่นเสียงหลังจากหน่วงเวลา (มิลลิวินาที)
  CA.at = function (ms, name, arg) { if (ms <= 0) CA.sfx(name, arg); else setTimeout(function () { CA.sfx(name, arg); }, ms); };
  CA.names = Object.keys(SFX);

  /* ---------- เรนเดอร์ออฟไลน์ (ใช้ทดสอบ) ---------- */
  CA.render = function (name, bars, rate) {
    var tr = TRACKS[name], sec = bars * 4 * 60 / tr.bpm + 1, oc = new (root.OfflineAudioContext || root.webkitOfflineAudioContext)(1, Math.ceil(sec * (rate || 22050)), rate || 22050), n = mk(oc);
    noiseBuf = null;
    for (var i = 0; i < bars; i++) schedBar(oc, n.music, tr, i, i * 4 * 60 / tr.bpm);
    return oc.startRendering();
  };
  CA.renderSfx = function (name, arg, rate) {
    var oc = new (root.OfflineAudioContext || root.webkitOfflineAudioContext)(1, Math.ceil(2 * (rate || 22050)), rate || 22050), n = mk(oc); noiseBuf = null;
    SFX[name](oc, n.sfx, 0.01, arg); return oc.startRendering();
  };

  root.CakeAudio = CA;
})(typeof window !== 'undefined' ? window : this);
