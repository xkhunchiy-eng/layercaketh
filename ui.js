/* เชื่อมหน้าจอ ปุ่ม คีย์บอร์ด เครือข่าย และลูปเกมเข้าด้วยกัน */
(function () {
  'use strict';
  var C = CakeCore, $ = function (id) { return document.getElementById(id); };
  var S = {
    mode: null, room: null, net: null, slot: -1, lobby: null,
    targets: {}, shown: {}, view: null, cakeView: null,
    lastIn: '', lastSend: 0, lastTick: 0, bAccum: 0,
    game: null, gameInit: false, seenSeq: 0, idx: {}, override: {}, diceUntil: 0, diceT0: 0, diceVal: 0, msgSeen: -1, popMsg: null, parts: [], gameAt: 0, pickItem: -1, mg: null, mgSeed: 0, simSnap: null, camMode: 'auto', camSnap: true, introRound: 0, introAt: 0, skipSent: false, lastA: -Math.PI / 2, bgView: null, spr: {}, lastIn2: '', lastSend2: 0
  };
  try { if (/^#[a-z]+$/.test(location.hash)) window.__cakeS = S; window.__cakeSV = drawSVItem; } catch (e) {}
  var keys = {};
  var SCREENS = ['menu', 'lobby', 'arena', 'game', 'mg'];

  function show(name) {
    SCREENS.forEach(function (n) { $('screen-' + n).classList.toggle('on', n === name); });
    if (name === 'arena' && !S.view) S.view = new CakeRender.ArenaView($('stage'), C.CFG.ARENA_R);
    if (name === 'game' && !S.cakeView) S.cakeView = makeView($('cake'), $('cakeov'));
    document.body.classList.toggle('ingame', name !== 'menu' && name !== 'lobby');
    document.body.classList.toggle('inlobby', name === 'lobby');
    audScreen(name);
  }
  function audScreen(name) {
    if (!window.CakeAudio) return;
    var t = name === 'game' ? 'board' : name === 'arena' ? 'chase' : name === 'mg' ? (S.mg && S.mg.def && S.mg.def.v3 !== 'redlight' && S.mg.id !== 'redlight' ? CakeAudio.trackFor(S.mg.id) : null) : 'menu';
    CakeAudio.music(t);
  }
  // เสียงปุ่ม + ปลดล็อกเสียงเมื่อมีการกดครั้งแรก (เบราว์เซอร์บังคับ)
  document.addEventListener('pointerdown', function (e) {
    if (!window.CakeAudio) return; CakeAudio.resume();
    var b = e.target && e.target.closest ? e.target.closest('button') : null;
    if (b && !b.disabled && b.id !== 'btn-music') CakeAudio.sfx('click');
  }, true);

  /* ---------- ห้องทดสอบไอเทม: ดูโมเดล/แอนิเมชัน/ทอยเต๋า/ร้านค้า ได้ทีละชิ้น ---------- */
  var IT_IDS = ['double', 'giant', 'slow', 'lock', 'gamble', 'triple', 'reverse', 'swap', 'steal', 'slip', 'freeze', 'magnet', 'ticket'];
  function itSelect(id) {
    var v = S.itv, it = CakeGame.ITEMS[id]; S.itId = id; v.list = [id]; v.sel = 0; v.pos = 0; v.use = null; v.roll = null; S.itRoll = 0;
    $('itname').textContent = it.name + '  (' + it.price + ' เหรียญ)'; $('itdesc').textContent = it.desc;
    $('itroll').style.display = it.kind === 'd' ? '' : 'none'; $('itside').style.display = it.target ? '' : 'none';
    Array.prototype.forEach.call($('itlist').children, function (b) { b.classList.toggle('on', b.getAttribute('data-id') === id); });
    if (v.shop) { v.shop.stock[0] = id; }
  }
  function itOpen() {
    if (!S.itv) {
      S.itv = new InvView($('itcv'), $('itfx')); S.itSide = 1;
      IT_IDS.forEach(function (id) { var b = document.createElement('button'), it = CakeGame.ITEMS[id]; b.setAttribute('data-id', id); b.textContent = it.name; var sm = document.createElement('small'); sm.textContent = it.price + ' เหรียญ'; b.appendChild(sm); b.onclick = function () { itSelect(id); }; $('itlist').appendChild(b); });
      $('itplay').onclick = function () { S.itv.roll = null; S.itRoll = 0; S.itv.shop = null; S.itv.startUse(S.itId, null, S.itSide); };
      $('itroll').onclick = function () { S.itv.use = null; S.itv.shop = null; S.itRoll = performance.now(); var d6 = function () { return 1 + Math.floor(Math.random() * 6); }, ii = S.itId;
        S.itDice = ii === 'double' ? [d6(), d6()] : ii === 'triple' ? [d6(), d6(), d6()] : [d6()]; S.itRollV = ii === 'giant' ? 1 + Math.floor(Math.random() * 10) : ii === 'gamble' ? (Math.random() < 0.5 ? 0 : 10) : ii === 'double' ? S.itDice[0] + S.itDice[1] : ii === 'triple' ? Math.max.apply(null, S.itDice) : S.itDice[0]; S.itSeed = Math.floor(Math.random() * 9999); };
      $('itside').onclick = function () { S.itSide = -S.itSide; $('itside').textContent = 'เป้าหมาย: ' + (S.itSide > 0 ? 'ขวา' : 'ซ้าย'); };
      $('itshop').onclick = function () {
        var v = S.itv; if (v.shop) { v.shop = null; $('itshop').textContent = 'ดูในร้านค้า'; return; }
        var others = IT_IDS.filter(function (x) { return x !== S.itId; }).sort(function () { return Math.random() - 0.5; }).slice(0, 3);
        v.use = null; v.roll = null; S.itRoll = 0; v.shop = { stock: [S.itId].concat(others), hover: -1, can: [true, true, false, true], mine: true, full: false }; $('itshop').textContent = '← กลับไปดูโมเดล';
      };
      $('itcv').addEventListener('mousemove', function (e) { var v = S.itv; if (!v.shop) return; var r = $('itcv').getBoundingClientRect(); v.shop.hover = v.shopHit((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); var id = v.shop.hover >= 0 && v.shop.stock[v.shop.hover], it = id && CakeGame.ITEMS[id]; if (it) { $('itname').textContent = it.name + '  (' + it.price + ' เหรียญ)'; $('itdesc').textContent = it.desc + (v.shop.can[v.shop.hover] ? '  — คลิกเพื่อซื้อ (จำลอง)' : '  — เหรียญไม่พอ (จำลอง)'); } });
      $('itboard').onclick = function () { itClose(); $('btn-itemtest').click(); };
      $('itclose').onclick = itClose;
    }
    S.itOn = true; $('ittest').style.display = 'block'; itSelect(S.itId || IT_IDS[0]);
  }
  function itClose() { S.itOn = false; $('ittest').style.display = 'none'; }
  function itFrame(now) {
    var v = S.itv; if (!v) return;
    if (S.itRoll) { var t = (now - S.itRoll) / 1000; if (t > 2.6) { S.itRoll = 0; v.roll = null; } else v.roll = { id: S.itId, t: t, v: S.itRollV, dice: S.itDice, seed: S.itSeed }; }
    v.draw(now);
  }

  /* ---------- ห้องทดสอบมินิเกม: เลือกเล่นทีละเกมได้ทันที ---------- */
  var MG_DONE = { order: 1, shadow: 1, count: 1, sweetveg: 1, simon: 1, memory: 1, color: 1, addmath: 1, numbers: 1, maze: 1, slice: 1, mash: 1, redlight: 1, catcher: 1, bomb: 1, hill: 1, chairs: 1, sumo: 1, wall: 1, balance: 1, cream: 1, dodge: 1, runner: 1, holdbar: 1, reaction: 1, tag: 1, stack: 1, mole: 1, shoot: 1, coinrush: 1, floor: 1 };
  function mgTestList() {
    var box = $('mgtestlist'); if (box.firstChild) return;
    CakeShared.IDS.concat(CakeMini.IDS).forEach(function (id) {
      var d = CakeShared.GAMES[id] || CakeMini.GAMES[id], b = document.createElement('button');
      b.className = MG_DONE[id] ? 'ok' : d.v3 ? 'd3' : ''; b.textContent = (MG_DONE[id] ? '✔ ' : d.v3 ? '★ ' : '') + d.name;
      var sm = document.createElement('small'); sm.textContent = id + (d.v3 ? ' · 3D' : ' · 2D เดิม'); b.appendChild(sm);
      b.onclick = function () { openMgTest(id); }; box.appendChild(b);
    });
  }
  function openMgTest(id) {
    var shared = !!CakeShared.GAMES[id], def = (shared ? CakeShared.GAMES : CakeMini.GAMES)[id]; if (!def) return;
    S.game = null; S.mgSeed = null; S.simSnap = null;
    S.mg = { shared: shared, id: id, def: def, dur: def.dur || 0, finished: false, prep: true, test: true };
    S.mg.use3d = !!(def.v3 && window.Cake3D && Cake3D.supported());
    if (S.mg.use3d) { try { if (!S.mgView) S.mgView = new Cake3D.MgView($('mgc3')); S.mgView.reset(); } catch (e) { S.mg.use3d = false; } }
    newPractice(S.mg);
    $('mgtitle').textContent = def.name; $('mghow').textContent = def.how;
    $('mgtest').style.display = 'none'; $('mgprepbar').style.display = 'none'; $('mgtestbar').style.display = 'block';
    document.body.classList.toggle('mg3d', S.mg.use3d); show('mg');
    try { location.hash = id; } catch (e) {}
  }
  function closeMgTest(toList) {
    if (!S.mg || !S.mg.test) return;
    S.mg = null; document.body.classList.remove('mg3d'); $('mgtestbar').style.display = 'none'; show('menu');
    if (toList) { mgTestList(); $('mgtest').style.display = 'block'; }
    try { history.replaceState(null, '', location.pathname); } catch (e) {}
  }
  function curScreen() { for (var i = 0; i < SCREENS.length; i++) if ($('screen-' + SCREENS[i]).classList.contains('on')) return SCREENS[i]; return ''; }
  function myName() {
    var n = C.sanitizeName($('name-in').value, 'ผู้เล่น');
    try { localStorage.setItem('cakeparty-name', n); } catch (e) {}
    return n;
  }
  function setMsg(id, t) { $(id).textContent = t || ''; }
  function isHost() { return S.mode === 'solo'; }   // ลอจิกเกมรันในเครื่องนี้ (เฉพาะโหมดคนเดียว)
  function isOwner() { return S.mode === 'solo' || !!S.owner; }   // เจ้าของห้อง: มีปุ่มเริ่ม/กลับ

  /* ---------- ล็อบบี้ ---------- */
  function renderLobby(info) {
    S.lobby = info; syncCols();
    $('lobby-code').textContent = S.mode === 'solo' ? 'ออฟไลน์' : (info.code || '----');
    var ul = $('plist'); ul.textContent = '';
    for (var sl = 0; sl < C.CFG.MAX_PLAYERS; sl++) {
      var pl = null; info.players.forEach(function (q) { if (q.slot === sl) pl = q; });
      if (!pl) continue;
      var card = document.createElement('div');
      card.className = 'pl-row' + (pl.ready || pl.host ? ' rdy' : '') + (pl.slot === S.slot ? ' me' : '');
      var face = document.createElement('div'); face.className = 'pl-face';
      try { if (window.Cake3D && Cake3D.supported()) { var im = document.createElement('img'); im.src = Cake3D.portrait(pl.skin || 0, C.PALETTE[pl.col != null ? pl.col : (pl.skin || 0)]); face.appendChild(im); } } catch (e) {}
      if (!face.firstChild) face.style.background = C.SLOT_COLORS[pl.slot];
      var nm = document.createElement('span'); nm.className = 'pl-name'; nm.textContent = pl.name;
      card.appendChild(face); card.appendChild(nm);
      if (isOwner() && S.mode !== 'solo' && pl.slot !== S.slot) { var kb = document.createElement('button'); kb.className = 'pl-kick'; kb.textContent = '×'; kb.title = 'เชิญออกจากห้อง'; kb.onclick = (function (q) { return function (e) { e.stopPropagation(); if (confirm('เชิญ ' + q.name + ' ออกจากห้อง?')) if (S.net) S.net.send({ t: 'kick', slot: q.slot }); }; })(pl); card.appendChild(kb); }
      ul.appendChild(card);
    }
    var me = null; info.players.forEach(function (q) { if (q.slot === S.slot) me = q; });
    var others = info.players.filter(function (q) { return !q.host; }), allReady = others.every(function (q) { return q.ready; });
    $('btn-start').style.display = isOwner() ? '' : 'none';
    $('btn-ready').style.display = isOwner() ? 'none' : '';
    $('btn-start').disabled = !allReady;
    if (S.audPl !== undefined && info.players.length > S.audPl) sfx('join'); S.audPl = info.players.length;
    $('btn-start').textContent = allReady ? '▶ เริ่มเกม' : 'รอทุกคนกดพร้อม...';
    $('btn-ready').classList.toggle('on', !!(me && me.ready));
    $('btn-ready').textContent = me && me.ready ? '✓ พร้อมแล้ว (กดยกเลิก)' : 'พร้อม!';
    setMsg('lobby-msg', isOwner() ? (info.players.length < 2 && S.mode !== 'solo' ? 'รอเพื่อนเข้าห้อง หรือกดเริ่มเล่นคนเดียวได้เลย' : '') : (me && me.ready ? 'รอเจ้าของห้องกดเริ่มค่ะ' : 'กดพร้อมเมื่อเตรียมตัวเสร็จ'));
    $('hud-info').textContent = 'ห้อง ' + (info.code || '') + ' · ผู้เล่น ' + info.players.length + ' คน';
    $('btn-back').style.display = isOwner() ? '' : 'none';
    $('btn-gback').style.display = isOwner() ? '' : 'none';
    if (S.mode === 'guest') {
      if (info.phase === 'game') show('game');
      else if (info.phase === 'arena') show('arena');
      else { show('lobby'); S.game = null; S.gameInit = false; }
    }
  }

  function drawLobby(dt, now) {
    if (!S.lobbyView) {
      try { S.lobbyView = window.Cake3D && Cake3D.supported() ? new Cake3D.LobbyView($('lobbycv')) : null; } catch (e) { S.lobbyView = null; }
      if (!S.lobbyView) { S.lobbyView = false; }
    }
    if (!S.lobbyView) return;
    var list = [], names = {}, rdy = {};
    var skn = {};
    if (S.lobby) S.lobby.players.forEach(function (p) { names[p.slot] = p.name; rdy[p.slot] = p.ready || p.host; skn[p.slot] = p.skin || 0; });
    if (S.mode === 'guest') {
      var k = 1 - Math.exp(-dt * 14);
      Object.keys(S.targets).forEach(function (s) {
        var t = S.targets[s], c = S.shown[s];
        if (!c) c = S.shown[s] = { x: t.x, z: t.z, h: t.h, mv: t.mv, walk: t.walk };
        c.x += (t.x - c.x) * k; c.z += (t.z - c.z) * k; c.h = t.h; c.mv = t.mv; c.walk = t.walk;
        if (names[s] !== undefined) list.push({ slot: +s, x: c.x, z: c.z, h: c.h, mv: c.mv, walk: c.walk, skin: skn[s], col: C.SLOT_COLORS[s % 4] });
      });
    } else if (S.room) {
      S.room.players.forEach(function (p) { list.push({ slot: p.slot, x: p.x, z: p.z, h: p.h, mv: p.mv, walk: p.walk, skin: p.skin || 0, col: C.SLOT_COLORS[p.slot % 4] }); });
    }
    var pos = S.lobbyView.draw(list, now), box = $('lobbylabels'), seen = {};
    pos.forEach(function (q) {
      var el = S.lbEls[q.slot]; if (!el) { el = S.lbEls[q.slot] = document.createElement('div'); box.appendChild(el); }
      var cls = 'lb-name' + (q.slot === S.slot ? ' me' : '') + (rdy[q.slot] ? ' rdy' : '');
      if (el.className !== cls) el.className = cls;
      var txt = (names[q.slot] || '') + (rdy[q.slot] && !(S.lobby.players.some(function (p) { return p.slot === q.slot && p.host; })) ? ' ✓' : '');
      if (el.textContent !== txt) el.textContent = txt;
      el.style.left = q.x + 'px'; el.style.top = q.y + 'px'; seen[q.slot] = 1;
    });
    Object.keys(S.lbEls).forEach(function (s) { if (!seen[s]) { S.lbEls[s].remove(); delete S.lbEls[s]; } });
  }

  function cleanup() {
    if (S.net) { try { S.net.close(); } catch (e) {} }
    S.mode = null; S.owner = false; S.room = null; S.net = null; S.slot = -1; S.targets = {}; S.shown = {}; S.lbEls = {}; S.itemCount = undefined; if ($('lobbylabels')) $('lobbylabels').textContent = '';
    S.shopOn = false; S.rolling = false; S.diceMod = ''; S.testItems = false; S.fxSeq = undefined; S.prevCoins = null; S.game = null; S.gameInit = false; S.useSeen = -1; S.aud = null; S.audPl = undefined; S.spec = false; S.seenSeq = 0; S.idx = {}; S.override = {}; S.cut = null; S.hold = {}; S.iceHold = {}; S.invTg = null;
  }
  function toMenu(msg) { cleanup(); show('menu'); setMsg('menu-msg', msg); }

  function newRoom(code, send) {
    S.room = new C.HostRoom({ code: code, send: send, onLobby: renderLobby, onGame: onGame });
    S.room.addPlayer('host', myName(), true, S.skin || 0);
    S.slot = S.room.players.get('host').slot;
    S.room.pushLobby();
    show('lobby');
  }

  function connectOnline(owner, code) {
    var name = myName();
    cleanup(); S.mode = 'guest'; S.owner = !!owner;
    var btn = owner ? $('btn-create') : $('btn-join'); btn.disabled = true;
    setMsg('menu-msg', owner ? 'กำลังสร้างห้อง... (ต่อเซิร์ฟเวอร์เกม)' : 'กำลังเข้าห้อง...');
    var closedMsg = '';
    S.net = CakeNet.connect({
      onOpen: function (api) { S.net = api; api.send(owner ? { t: 'create', name: name, skin: S.skin || 0 } : { t: 'join', code: code, name: name, skin: S.skin || 0 }); },
      onMessage: function (m) {
        if (!m || typeof m !== 'object') return;
        if (m.t === 'joined') { S.slot = m.slot; S.owner = !!m.owner; btn.disabled = false; setMsg('menu-msg', ''); }
        else if (m.t === 'rejected') { btn.disabled = false; toMenu(m.reason === 'full' ? 'ห้องเต็มแล้วค่ะ' : m.reason === 'noroom' ? 'ไม่พบห้องรหัสนี้ค่ะ ตรวจรหัสอีกครั้ง' : m.reason === 'busy' ? 'เซิร์ฟเวอร์เต็มชั่วคราวค่ะ ลองใหม่อีกครั้ง' : 'ห้องนี้เริ่มเล่นไปแล้วค่ะ'); }
        else if (m.t === 'closed') closedMsg = m.why === 'kicked' ? 'เจ้าของห้องให้ออกจากห้องค่ะ' : m.why === 'host-left' ? 'เจ้าของห้องออกไปแล้วค่ะ ห้องถูกปิด' : 'ห้องถูกปิดแล้วค่ะ';
        else if (m.t === 'lobby') renderLobby(m);
        else if (m.t === 'game' && m.s) { if (curScreen() !== 'game' && curScreen() !== 'mg') show('game'); onGame(m.s); }
        else if (m.t === 'sim' && m.s) { S.simSnap = m.s; simPush(m.s); }
        else if (m.t === 'state' && Array.isArray(m.p)) {
          m.p.forEach(function (r) { S.targets[r[0]] = { x: r[1], z: r[2], h: r[3], mv: !!r[4], walk: r[5] }; });
        }
      },
      onClose: function () { btn.disabled = false; toMenu(closedMsg || 'หลุดจากเซิร์ฟเวอร์ค่ะ'); },
      onError: function (t) { btn.disabled = false; toMenu(t); }
    });
  }
  function createRoom() {
    setMsg('menu-msg', '');
    if (!CakeNet.available()) { setMsg('menu-msg', 'ระบบออนไลน์ใช้ไม่ได้ค่ะ ลองโหมดทดลองคนเดียว'); return; }
    connectOnline(true);
  }
  function joinRoom() {
    setMsg('menu-msg', '');
    var code = C.normalizeCode($('code-in').value);
    if (!CakeNet.available()) { setMsg('menu-msg', 'ระบบออนไลน์ใช้ไม่ได้ค่ะ'); return; }
    if (!C.isValidCode(code)) { setMsg('menu-msg', 'รหัสห้องต้องมี 4 ตัวอักษรค่ะ'); return; }
    connectOnline(false, code);
  }

  function solo() {
    cleanup(); S.mode = 'solo';
    newRoom('SOLO', function () {});
  }

  /* ---------- เกมหลัก: รับสถานะ ---------- */
  var C_STEP_MS = 500, C_DICE_MS = 2500;   // ต้องตรงกับ DICE_TIME ใน game.js
  function onGame(st) {
    S.game = st; S.gameAt = performance.now(); invSpectate(st);
    var uf = st.useFx;
    if (uf && uf.seq !== S.fxSeq) {
      var first = S.fxSeq === undefined, nowT = performance.now(); S.fxSeq = uf.seq;
      if (!first && uf.id && S.prevCoins) {
        var d = function (sl) { return (S.prevCoins[sl] || 0) - (st.coins[sl] || 0); };
        startCut(uf, st, nowT + (uf.slot === S.slot ? 0 : 1300), d);
      }
    }
    S.prevCoins = st.coins.slice();
    if (S.testItems && S.mode === 'solo' && S.room && S.room.game && (st.phase === 'intro' || st.phase === 'mgprep')) {
      var gm = S.room.game, bs = st.order.filter(function (o) { return o !== S.slot; });
      for (var bi = 0; bi < bs.length; bi++) { if (st.phase === 'intro' && !gm.skips[bs[bi]]) { gm.skipIntro(bs[bi]); return; } if (st.phase === 'mgprep' && !(gm.mg && gm.mg.ready[bs[bi]])) { gm.mgReady(bs[bi]); return; } }
    }
    if (S.testItems && S.mode === 'solo' && S.room && S.room.game && st.phase === 'roll' && st.order[st.turn] !== S.slot) {
      var cur = st.order[st.turn], gm2 = S.room.game; setTimeout(function () { if (gm2.phase === 'roll' && gm2.order[gm2.turn] === cur) gm2.roll(cur); }, 900);
    }
    if (S.testItems && S.mode === 'solo' && S.room && S.room.game && st.phase === 'roll' && st.order[st.turn] === S.slot && st.items[S.slot].length < 13) {
      S.room.game.items[S.slot] = ['double', 'giant', 'slow', 'lock', 'gamble', 'triple', 'reverse', 'swap', 'steal', 'slip', 'freeze', 'magnet', 'ticket']; S.room.game.onChange(); return;
    }
    var slots = Object.keys(st.names || {});
    if (!S.gameInit) {
      S.gameInit = true; S.seenSeq = st.last.seq; S.idx = {}; S.override = {}; S.cut = null; S.hold = {}; S.iceHold = {}; S.invTg = null;
      for (var i = 0; i < 4; i++) S.idx[i] = st.pos[i];
    } else if (st.last.seq !== S.seenSeq) {
      S.seenSeq = st.last.seq;
      if (!st.last.teleport) { S.diceUntil = performance.now() + 700; S.diceT0 = performance.now(); S.diceVal = st.last.v; S.diceMod = st.last.mod || ''; S.diceArr = st.last.dice || null; S.diceSeed = (st.last.seq * 7919 + (st.last.v | 0) * 31) | 0; S.holdSlot = st.last.slot; S.holdUntil = performance.now() + C_DICE_MS; }
      scheduleFx(st, performance.now()); audRoll(st);
      if (st.last.via >= 0 && st.last.slot >= 0) S.override[st.last.slot] = st.last.via;
    }
    if (st.phase === 'intro' && S.introRound !== st.round) { S.introRound = st.round; S.introAt = performance.now(); S.skipSent = false; S.camSnap = true; }
    if (st.phase !== 'intro') S.introRound = 0;
    if (S.msgSeen < 0) S.msgSeen = st.msgSeq;
    else if (st.msgSeq !== S.msgSeen) {
      S.msgSeen = st.msgSeq;
      if (false && st.phase !== 'intro' && st.phase !== 'mini' && st.phase !== 'end' && st.msg) {
        var rolled = st.last && st.last.seq === S.seenSeq && !st.last.teleport && performance.now() - S.diceT0 < 300;
        S.popMsg = { text: st.msg, t0: performance.now() + (rolled ? C_DICE_MS + Math.min(24, st.last.steps || 0) * 280 : 150), fired: false };
      }
    }
    syncMini(st);
    audGame(st);
    renderGameHud();
  }

  /* ---------- มินิเกม ---------- */
  function syncMini(st) {
    if ((st.phase === 'mg' || st.phase === 'mgprep') && st.mg) {
      var prep = st.phase === 'mgprep';
      if (!S.mg || S.mgSeed !== st.mg.seed) {
        var shared = st.mg.kind === 'shared', def = (shared ? CakeShared.GAMES : CakeMini.GAMES)[st.mg.id]; if (!def) return;
        S.mgSeed = st.mg.seed; S.simSnap = null; S.simA = S.simB = null;
        S.mg = shared ? { shared: true, id: st.mg.id, def: def, dur: st.mg.dur, finished: false } : { id: st.mg.id, def: def, dur: st.mg.dur, sent: -1, lastSend: 0, finished: false };
        S.mg.prep = true; S.mg.readySent = false; newPractice(S.mg);
        $('mgtitle').textContent = def.name; $('mghow').textContent = def.how;
        S.mg.use3d = !!(def.v3 && window.Cake3D && Cake3D.supported());
        if (S.mg.use3d) { try { if (!S.mgView) S.mgView = new Cake3D.MgView($('mgc3')); S.mgView.reset(); } catch (e) { S.mg.use3d = false; } }
        document.body.classList.toggle('mg3d', S.mg.use3d);
        show('mg');
      }
      var m = S.mg;
      if (m.prep && !prep) {   // เริ่มแข่งจริง
        m.prep = false; m.startAt = performance.now() + 3000; sfx('cd', 0, 1); sfx('cd', 0, 1000); sfx('cd', 0, 2000); sfx('go', 0, 3000);
        if (!m.shared) m.game = m.def.make(st.mg.seed);
      }
      $('mgprepbar').style.display = m.prep ? 'block' : 'none';
      if (m.prep) {
        var ready = st.mg.ready || [], nr = st.order.filter(function (o) { return ready[o]; }).length, me = !!ready[S.slot];
        $('btn-mgready').disabled = me; $('btn-mgready').textContent = me ? '✓ พร้อมแล้ว รอเพื่อน...' : 'พร้อมแข่งจริง!';
        $('mgprepinfo').textContent = 'ห้องซ้อม — ลองเล่นได้เลย ไม่นับคะแนน · พร้อมแล้ว ' + nr + '/' + st.order.length + ' คน · เริ่มเองใน ' + Math.ceil(st.tl) + ' วิ';
        $('mgboard').textContent = '';
      } else if (m.shared) $('mgboard').textContent = ''; else $('mgboard').textContent = '';
    } else if (curScreen() === 'mg') { if (S.mg && !S.mg.test) sfx('mgEnd'); S.mg = null; document.body.classList.remove('mg3d'); show('game'); }
  }

  // ห้องซ้อม: เล่นคนเดียวในเครื่องตัวเอง ไม่ส่งคะแนน จบแล้วเริ่มใหม่เอง
  function newPractice(m) {
    var seed = 1 + Math.floor(Math.random() * 1e9);
    m.pt0 = performance.now(); m.pEnd = 0;
    if (m.shared) { try { m.psim = m.def.make(m.test ? [0, 1, 2] : [S.slot < 0 ? 0 : S.slot], seed); } catch (e) { m.psim = null; } m.pLast = performance.now(); }
    else m.pgame = m.def.make(seed);
  }
  // บอทสำหรับห้องทดสอบ (ช่อง 1,2) เพื่อให้ลองเกมหลายคนได้คนเดียว
  function botsThink(m, now) {
    var sn = m.psim.snapshot(), P = sn.P, id = m.def.v3;
    function me0(sl) { var q = P.filter(function (p) { return p[0] === sl; })[0]; return q ? q[1] : 240; }
    [1, 2].forEach(function (sl) {
      if (id === 'catcher') {
        var cb = null, cbY = -99; (sn.C || []).forEach(function (c) { if (c[1] < 240 && Math.abs(c[0] - me0(sl)) < 150 && c[1] > cbY) { cbY = c[1]; cb = c; } });
        var mx0 = me0(sl), dd0 = cb ? cb[0] - mx0 : 0, mp = P.filter(function (p) { return p[0] === sl; })[0], nb = P.filter(function (p) { return p[0] !== sl && Math.abs(p[1] - mx0) < 36; })[0]; m.psim.input(sl, { x: Math.abs(dd0) < 8 ? 0 : dd0 > 0 ? 1 : -1, y: 0, a: !!(mp && mp[4] && nb && Math.random() < 0.08) }); return;
      }
      if (id === 'cream') {
        var mc = P.filter(function (p) { return p[0] === sl; })[0]; if (!mc) return;
        if (sn.ph === 'swap') { m.psim.input(sl, { x: 0, y: 0, a: false }); return; }
        if (mc[7] === 1) {
          var tgs = P.filter(function (p) { return p[7] === 0; }), tg = tgs[Math.floor(now / 1800) % Math.max(1, tgs.length)];
          m.psim.input(sl, { x: 0, y: 0, ax: tg ? tg[1] + Math.sin(now / 400 + sl) * 25 : 240, ay: tg ? tg[2] + Math.cos(now / 500) * 20 : 290, a: !!(tg && mc[4] && Math.random() < 0.05) }); return;
        }
        var ax = 0, ay = 0; (sn.Sh || []).forEach(function (q) { var dx = mc[1] - q[0], dy = mc[2] - q[1], dd = Math.hypot(dx, dy) || 1; if (dd < sn.SR + 36) { ax += dx / dd; ay += dy / dd; } });
        if (!ax && !ay) { ax = Math.sin(now / 900 + sl * 2) * 0.5; ay = Math.cos(now / 1100 + sl) * 0.4; }
        m.psim.input(sl, { x: ax, y: ay, a: false }); return;
      }
      if (id === 'dodge') {
        var md = P.filter(function (p) { return p[0] === sl; })[0]; if (!md) return;
        var bx2 = 0, by2 = 0; (sn.D || []).forEach(function (d) { if (d[3]) return; var dx = md[1] - d[0], dy = md[2] - d[1], dd = Math.hypot(dx, dy) || 1; if (dd < sn.R + 40) { bx2 += dx / dd * (1 + d[2]); by2 += dy / dd * (1 + d[2]); } });
        if (!bx2 && !by2) { bx2 = Math.sin(now / 1300 + sl) * 0.3; by2 = Math.cos(now / 1700 + sl * 2) * 0.3; }
        m.psim.input(sl, { x: bx2, y: by2, a: false }); return;
      }
      if (id === 'bomb') { m.psim.input(sl, { x: 0, y: 0, a: !sn.done && sn.cur === sl && Math.random() < 0.07 && sn.tt < 2.9 }); return; }
      var me = P.filter(function (p) { return p[0] === sl; })[0]; if (!me || (!me[3] && id !== 'redlight')) { m.psim.input(sl, { x: 0, y: 0, a: false }); return; }
      var tx = 240, ty = 140, flee = false, best = 1e9;
      if (id === 'coinrush' && sn.C && sn.C.length) { sn.C.forEach(function (c) { var d = Math.hypot(c[0] - me[1], c[1] - me[2]); if (d < best) { best = d; tx = c[0]; ty = c[1]; } }); }
      else P.forEach(function (p) { if (p[0] !== sl && p[3] && !(id === 'tag' && sn.imm && sn.lt === p[0] && sn.it === sl)) { var d = Math.hypot(p[1] - me[1], p[2] - me[2]); if (d < best) { best = d; tx = p[1]; ty = p[2]; } } });
      if (id === 'tag' && sn.it !== sl) flee = true;
      if (id === 'hill') { var occ = P.filter(function (p) { return p[0] !== sl && Math.hypot(p[1] - sn.zx, p[2] - sn.zy) < 40; })[0]; if (occ) { tx = occ[1]; ty = occ[2]; } else { tx = sn.zx; ty = sn.zy; best = 99; } }
      var dx = tx - me[1], dy = ty - me[2], l = Math.hypot(dx, dy) || 1, k = flee ? -1 : 1;
      if (id === 'sumo' && Math.hypot(me[1] - 240, me[2] - 140) > 80) { dx = 240 - me[1]; dy = 140 - me[2]; l = Math.hypot(dx, dy) || 1; k = 1; }
      if (id === 'chairs') {
        var cs = (sn.Ch || []).filter(function (c) { return c[2] < 0; }), bd = 1e9, tc = null;
        cs.forEach(function (c) { var d = Math.hypot(c[0] - me[1], c[1] - me[2]) + sl * 12; if (d < bd) { bd = d; tc = c; } });
        if (sn.ph === 'scramble' && tc) { dx = tc[0] - me[1]; dy = tc[1] - me[2]; }
        else { var ang = Math.atan2(me[2] - 140, me[1] - 240) + 1.4; dx = Math.cos(ang) * 200 + 240 - me[1]; dy = Math.sin(ang) * 110 + 140 - me[2]; }
        l = Math.hypot(dx, dy) || 1; m.psim.input(sl, { x: dx / l, y: dy / l, a: sn.ph === 'scramble' && me[5] === 1 && !me[4] && tc && Math.hypot(tc[0] - me[1], tc[1] - me[2]) > 50 }); return;
      }
      if (id === 'redlight') {
        var go = sn.green || (me[0] === 1 ? 0 : Math.sin(now / 700 + sl * 3) > 0.92);
        m.psim.input(sl, { x: me[3] ? 0 : go ? 0.95 : 0, y: 0, a: false }); return;
      }
      if (id === 'wall') {
        var nw = null; (sn.Wl || []).forEach(function (w) { if (w[0] > me[1] - 14 && (!nw || w[0] < nw[0])) nw = w; });
        var gy = nw ? nw[1] : 140 + Math.sin(now / 900 + sl) * 60, ex = nw && nw[0] - me[1] < 70 ? 0 : 1;
        dy = gy - me[2] + (sl === 1 ? 10 : -10) * Math.sin(now / 400); dx = (nw && nw[0] - me[1] < 40 ? 0 : 120 - me[1]);
        var ty2 = Math.abs(dy) < 6 ? 0 : dy > 0 ? 1 : -1, tx2 = Math.abs(dx) < 8 ? 0 : dx > 0 ? 1 : -1;
        if (Math.abs(me[2] - gy) > 26 && nw && nw[0] - me[1] < 50) tx2 = -0.3;
        var near = P.filter(function (p) { return p[0] !== sl && p[3] && Math.hypot(p[1] - me[1], p[2] - me[2]) < 34; }).length > 0;
        m.psim.input(sl, { x: tx2 * ex * 0.9, y: ty2, a: near && me[4] === 1 && Math.sin(now / 250 + sl) > 0 }); return;
      }
      if (id === 'floor' && sn.T) {
        var bestT = 1e9, cx0 = 0, cy0 = 0;
        var G = sn.G; sn.T.forEach(function (st, k) { if (st !== 0) return; var cx = G[2] + ((k % G[0]) + 0.5) * G[4], cy = G[3] + (Math.floor(k / G[0]) + 0.5) * G[5], d = Math.hypot(cx - me[1], cy - me[2]) + P.reduce(function (a, p) { return a + (p[0] !== sl && p[3] && Math.hypot(cx - p[1], cy - p[2]) < 40 ? 30 : 0); }, 0); if (d < bestT) { bestT = d; cx0 = cx; cy0 = cy; } });
        var mk = Math.floor((me[1] - G[2]) / G[4]) + Math.floor((me[2] - G[3]) / G[5]) * G[0], onBad = !(me[1] > G[2] && me[1] < G[2] + G[0] * G[4] && me[2] > G[3] && me[2] < G[3] + G[1] * G[5]) || sn.T[mk] !== 0;
        if (bestT < 1e9 && (onBad || bestT > 70)) { dx = cx0 - me[1]; dy = cy0 - me[2]; } else { dx = 0; dy = 0; }
        l = Math.hypot(dx, dy) || 1;
        var nearF = P.filter(function (p) { return p[0] !== sl && p[3] && Math.hypot(p[1] - me[1], p[2] - me[2]) < 32; }).length > 0;
        m.psim.input(sl, { x: dx / l * (dx || dy ? 1 : 0), y: dy / l * (dx || dy ? 1 : 0), a: nearF && me[4] === 1 && Math.sin(now / 300 + sl) > 0 }); return;
      }
      P.forEach(function (p) { if (p[0] !== sl && p[3]) { var ddx = me[1] - p[1], ddy = me[2] - p[2], dd = Math.hypot(ddx, ddy) || 1; if (dd < 36 && !(id === 'tag' || id === 'sumo' || id === 'hill' || id === 'coinrush')) { dx += ddx / dd * 60; dy += ddy / dd * 60; } } });
      var bb = sn.B || [10, 470, 25, 250]; if (me[1] < bb[0] + 40) dx += 80; if (me[1] > bb[1] - 40) dx -= 80; if (me[2] < bb[2] + 30) dy += 80; if (me[2] > bb[3] - 30) dy -= 80;
      l = Math.hypot(dx, dy) || 1;
      var wob = Math.sin(now / 500 + sl * 2) * 0.4;
      var ox = k * dx / l * 0.85 + wob * 0.3, oy = k * dy / l * 0.85 - wob * 0.3, bs = (m.bs = m.bs || {})[sl] = (m.bs || {})[sl] || { x: 0, y: 0, t: now, until: 0, dir: 1 };
      if (now - bs.t > 350) { if (Math.hypot(me[1] - bs.x, me[2] - bs.y) < 4 && sn.Ob) { bs.until = now + 700; bs.dir = Math.random() < 0.5 ? 1 : -1; } bs.x = me[1]; bs.y = me[2]; bs.t = now; }
      if (now < bs.until) { var tx3 = -oy * bs.dir, ty3 = ox * bs.dir; ox = tx3; oy = ty3; }
      var pd = 1e9; P.forEach(function (p) { if (p[0] !== sl && p[3]) pd = Math.min(pd, Math.hypot(p[1] - me[1], p[2] - me[2])); });
      m.psim.input(sl, { x: ox, y: oy, a: me[4] === 1 && Math.sin(now / 300 + sl) > 0.2 && (id === 'hill' ? pd < 34 : id === 'sumo' ? pd < 60 : id === 'tag' ? best < 80 : id === 'coinrush' ? (best > 70 && best < 140) : false) });
    });
  }
  function mgReadyClick() {
    var m = S.mg; if (!m || !m.prep) return;
    if (isHost()) { if (S.room && S.room.game) S.room.game.mgReady(S.slot); }
    else if (S.net) S.net.send({ t: 'mready' });
  }

  function renderBoard(st) {
    var box = $('mgboard'); box.textContent = '';
    var max = Math.max(10, Math.max.apply(null, st.mg.scores));
    st.order.forEach(function (sl) {
      var r = document.createElement('div'); r.className = 'mrow';
      var n = document.createElement('span'); n.className = 'nm'; n.textContent = st.names[sl] + (sl === S.slot ? ' (คุณ)' : '');
      var bar = document.createElement('span'); bar.className = 'bar'; var i = document.createElement('i');
      i.style.width = Math.round(100 * st.mg.scores[sl] / max) + '%'; i.style.background = C.SLOT_COLORS[sl]; bar.appendChild(i);
      var sc = document.createElement('span'); sc.className = 'sc'; sc.textContent = st.mg.scores[sl] + (st.mg.fin[sl] ? ' ✓' : '');
      r.appendChild(n); r.appendChild(bar); r.appendChild(sc); box.appendChild(r);
    });
  }

  function sendScore(final) {
    var m = S.mg; if (!m) return;
    var sc = m.game.score;
    if (isHost()) { if (S.room && S.room.game) S.room.game.mgScore(S.slot, sc, final, m.game.pk); }
    else if (S.net) S.net.send({ t: 'mg', s: sc, f: final, p: m.game.pk });
    m.sent = sc; m.sentP = m.game.pk; m.lastSend = performance.now();
  }

  function spriteFor(slot, dir) {
    var k = slot + dir + C.SLOT_COLORS[slot % 4];
    if (!S.spr[k]) S.spr[k] = CakeRender.buildSprite(document, C.SLOT_COLORS[slot % 4], dir);
    return S.spr[k];
  }

  function hudText(g, txt, x, y, size, col) {
    x = Math.round(x); y = Math.round(y); g.font = 'bold ' + size + 'px TAGBA, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#4a1f45';
    [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1], [0, 2]].forEach(function (d) { g.fillText(txt, x + d[0], y + d[1]); });
    g.fillStyle = col; g.fillText(txt, x, y);
  }
  // ดนตรี 8 บิตเบาๆ ระหว่างมินิเกม (กด M เพื่อปิด/เปิดเสียง)
  var AU = { timer: 0, step: 0, mode: '', last: 0 }, CAu = window.CakeAudio;
  Object.defineProperty(AU, 'ctx', { get: function () { return CAu ? CAu.ctx() : null; }, set: function () {} });
  Object.defineProperty(AU, 'mute', { get: function () { return CAu ? CAu.isMuted() : false; }, set: function (v) { if (CAu) CAu.setMuted(v); } });
  function sfx(n, a, ms) { if (CAu) { if (ms > 0) CAu.at(ms, n, a); else CAu.sfx(n, a); } }
  function auNote(f, d, v, type) {
    try { var c = AU.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type || 'square'; o.frequency.value = f; g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + d); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + d + 0.02); } catch (e) {}
  }
  function auTick() {
    if (performance.now() - AU.last > 500) { clearInterval(AU.timer); AU.timer = 0; return; }
    if (AU.mute || !AU.ctx) return; AU.step++; var m = AU.mode, k = AU.step, sc = [392, 494, 587, 784, 659, 587, 494, 440], bs = [196, 196, 262, 220];
    if (m === 'green') { auNote(sc[k % 8] * 1.0, 0.1, 0.035); if (k % 2 === 0) auNote(bs[(k >> 2) % 4], 0.14, 0.05, 'triangle'); }
    else if (m === 'warn') { auNote(988, 0.07, 0.05); }
    else if (m === 'red') { if (k % 4 === 0) auNote(65, 0.25, 0.07, 'triangle'); }
    else if (m === 'play') { auNote(sc[(k * 3) % 8] * 0.75, 0.1, 0.03); if (k % 4 === 0) auNote(bs[(k >> 2) % 4] * 0.5, 0.2, 0.05, 'triangle'); }
  }
  function auPlay(mode) {
    AU.last = performance.now(); AU.mode = mode;
    try { if (!AU.ctx) AU.ctx = new (window.AudioContext || window.webkitAudioContext)(); if (AU.ctx.state === 'suspended') AU.ctx.resume(); } catch (e) { return; }
    if (!AU.timer) AU.timer = setInterval(auTick, mode === 'green' || mode === 'warn' ? 120 : 140);
  }
  window.addEventListener('keydown', function (e) { if (e.code === 'KeyM' && !/INPUT|TEXTAREA/.test((e.target || {}).tagName || '')) AU.mute = !AU.mute; });
  function ptextO(g, txt, x, y, size, col, al) {
    x = Math.round(x); y = Math.round(y); g.font = 'bold ' + size + 'px TAGBA, sans-serif'; g.textAlign = al || 'center'; g.textBaseline = 'middle'; g.fillStyle = '#000';
    g.lineJoin = 'round'; g.miterLimit = 2; g.strokeStyle = '#000'; g.lineWidth = size >= 32 ? 6 : 4; g.strokeText(txt, x, y);
    g.fillStyle = col; g.fillText(txt, x, y);
  }
  var MG_CD = { wall: 2.4, sumo: 1.6, floor: 2.0, hill: 1.6, coinrush: 1.6, catcher: 2.2, cream: 1.1 }, MG_PUSH = { wall: 1, floor: 1, hill: 1 }, MG_DASH = { tag: 1, chairs: 1, sumo: 1, coinrush: 1, catcher: 1 };
  function mgScoreText(id, v) {
    if (id === 'wall') return Math.floor(v / 10) + ' วิ';
    if (id === 'sumo' || id === 'floor' || id === 'chairs') return String(Math.round(v / 10));
    if (id === 'redlight') return Math.min(100, v) + '%';
    return String(v);
  }
  // แผงคะแนนมุมซ้าย: ขนม + ดาว อัปเดตเรียลไทม์
  function drawBoard(g, m, snap, env, mode) {
    if (!snap || !snap.S) return;
    var mine0 = snap.S.filter(function (r) { return r[0] === env.me; })[0]; if (mine0 && mode !== 'prep') mgScoreSfx(m, mine0[1]);
    var id = m.def.v3, rows = snap.S.slice().sort(function (a, b) { return b[1] - a[1] || a[0] - b[0]; }), RW = 140, RH = 20, x0 = 6, y0 = mode === 'prep' ? 66 : 6, h = rows.length * RH + 8;
    g.fillStyle = '#c2578a'; g.fillRect(x0, y0 + 3, RW + 4, h);
    g.fillStyle = '#fff0f6'; g.fillRect(x0, y0, RW + 4, h); g.fillStyle = '#ff8fb8'; g.fillRect(x0, y0, RW + 4, 3); g.fillRect(x0, y0 + h - 3, RW + 4, 3); g.fillRect(x0, y0, 3, h); g.fillRect(x0 + RW + 1, y0, 3, h);
    rows.forEach(function (r, k) {
      var y = y0 + 4 + k * RH, me = r[0] === env.me, pr = snap.P.filter(function (p) { return p[0] === r[0]; })[0], dead = pr && !pr[3] && id !== 'redlight' && id !== 'chairs' && id !== 'coinrush';
      if (me) { g.fillStyle = '#ffe9a8'; g.fillRect(x0 + 5, y, RW - 6, RH - 1); }
      g.fillStyle = '#4a1f45'; g.fillRect(x0 + 8, y + 3, 14, 14); g.fillStyle = dead ? '#b9a6b4' : env.cols[r[0] % 4] || C.SLOT_COLORS[r[0] % 4]; g.fillRect(x0 + 9, y + 4, 12, 12); g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(x0 + 10, y + 5, 4, 3);
      var nm = (env.names[r[0]] || ''); if (nm.length > 7) nm = nm.slice(0, 7);
      g.font = 'bold 16px TAGBA, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = dead ? '#b9a6b4' : '#4a1f45'; g.fillText(nm, x0 + 28, y + 11);
      g.textAlign = 'right'; g.fillStyle = dead ? '#b9a6b4' : '#e0589a'; g.fillText(mgScoreText(id, r[1]), x0 + RW - 20, y + 11);
      g.fillStyle = dead ? '#cfc3cc' : '#ffcf1a'; g.fillRect(x0 + RW - 14, y + 5, 8, 4); g.fillRect(x0 + RW - 12, y + 3, 4, 12); g.fillRect(x0 + RW - 16, y + 7, 12, 4); g.fillRect(x0 + RW - 14, y + 11, 3, 4); g.fillRect(x0 + RW - 9, y + 11, 3, 4);
    });
  }
  // ไอคอนผลัก/พุ่ง + คูลดาวน์ มุมขวาล่าง
  var ICONS = {"fist": ["................", "................", "...KKKKKKKKK....", "..KSSKSSKSSSK...", "..KSHKSHKSHSKK..", ".KSSSKSSKSSSSSK.", ".KSSSSSSSSSSSDK.", ".KSSSSSSSSSSDDK.", "..KSSSSSSSSDDK..", "..KKSSSSSSDDKK..", "...KKKKKKKKKK...", "...KPPPPPPPPK...", "...KPQQQQQQPK...", "...KPPPPPPPPK...", "...KKKKKKKKKK...", "................"], "dash": ["................", "................", ".KK....KK.......", ".KPK...KPK......", "..KPK...KPK.....", "...KPK...KPK....", "....KPK...KPK...", ".....KPK...KPK..", "......KPK...KPK.", ".....KPK...KPK..", "....KPK...KPK...", "...KPK...KPK....", "..KPK...KPK.....", ".KPK...KPK......", ".KK....KK.......", "................"], "fire": [".......KK.......", "......KWWK......", ".....KWWWWK.....", "....KWWHWWWK....", "...KKWWWWWKK....", "..KWWWWWWWWWK...", "..KWWHWWWWWWK...", "...KKKKKKKKK....", "...KPPPPPPPK....", "....KPQPQPK.....", "....KPPPPPK.....", ".....KPQPK......", ".....KPPPK......", "......KPK.......", ".......K........", "................"]}, ICON_PAL = { K: '#2a1230', S: '#ffcf9e', D: '#e8a874', H: '#fff0d6', P: '#ff6fa8', Q: '#d4608f', W: '#ffffff' };
  function drawAction(g, m, snap, env, ww, hh) {
    var id = m.def.v3, me = snap && snap.P ? snap.P.filter(function (p) { return p[0] === env.me; })[0] : null;
    if (!me) return;
    var kind = MG_PUSH[id] ? 'fist' : MG_DASH[id] ? 'dash' : id === 'cream' && me[7] === 1 ? 'fire' : null; if (!kind) return;
    var ready = id === 'chairs' ? me[5] : me[4], S = 44, x = ww - S - 12, y = hh - S - 12, cdv = me[6] > 0 && MG_CD[id] ? Math.min(1, me[6] / 10 / MG_CD[id]) : 0, now = performance.now();
    var pulse = ready && Math.sin(now / 160) > 0.3 ? 1 : 0;
    // กรอบปุ่ม: เงาชมพู + ขอบม่วงเข้ม + พื้นครีม
    g.fillStyle = '#c2578a'; g.fillRect(x - 3, y - 1, S + 6, S + 8);
    g.fillStyle = '#2a1230'; g.fillRect(x - 3, y - 3, S + 6, S + 6); g.fillRect(x - 1, y - 5, S + 2, S + 10);
    g.fillStyle = ready ? (pulse ? '#fff7b8' : '#fff0f6') : '#cdbcc8'; g.fillRect(x, y - 2, S, S + 4); g.fillRect(x - 2, y, S + 4, S);
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(x + 2, y - 1, S - 4, 2);
    var ic = ICONS[kind], u = 2, ox = x + (S - 16 * u) / 2, oy = y + (S - 16 * u) / 2;
    for (var r = 0; r < 16; r++) for (var c = 0; c < 16; c++) { var ch = ic[r].charAt(c); if (ch !== '.') { g.fillStyle = ready ? ICON_PAL[ch] : (ch === 'K' ? '#2a1230' : '#8d7a89'); g.fillRect(ox + c * u, oy + r * u, u, u); } }
    if (!ready) {
      if (cdv > 0) { g.fillStyle = 'rgba(40,10,50,0.55)'; g.fillRect(x, y - 2, S, Math.round((S + 4) * cdv)); }
      if (me[6] > 0) ptextO(g, (me[6] / 10).toFixed(1), x + S / 2, y + S / 2, 16, '#ffffff');
    }
    ptextO(g, MG_PUSH[id] || id === 'cream' ? 'คลิกซ้าย' : 'Space', x + S / 2, y - 14, 16, '#ffffff');
  }
  // วาดมินิเกม 3D + HUD แบบพิกเซล
  function drawMg3(m, snap, now, mode, cd) {
    var cv = $('mgc'), asp = innerWidth / innerHeight, hh = 270, ww = Math.round(270 * asp);
    if (cv.width !== ww || cv.height !== hh) { cv.width = ww; cv.height = hh; }
    var g = cv.getContext('2d'); g.clearRect(0, 0, ww, hh); g.imageSmoothingEnabled = false;
    var st = S.game, env = { me: S.slot < 0 ? 0 : S.slot, names: st ? st.names : { 0: 'คุณ', 1: 'บอท 1', 2: 'บอท 2' }, skins: st ? st.skins : [S.skin || 0, 0, 0], cols: C.SLOT_COLORS }, id = m.def.v3;
    if (m.test && mode === 'prep') { m._t0 = m._t0 || now; if (now - m._t0 > 4000) mode = 'play'; }
    if (m.test) env.cols = [C.PALETTE[S.skin || 0], C.PALETTE[S.skin === 1 ? 0 : 1], C.PALETTE[S.skin === 2 ? 3 : 2]];
    var tags = S.mgView.drawArena(id, snap, env, now, asp) || [];
    if (snap && !snap.done && !(cd > 0) && id === 'redlight') auPlay(snap.warn ? 'warn' : snap.green ? 'green' : 'red');
    tags.forEach(function (t) {
      var px = Math.max(10, Math.min(ww - 10, t.x * ww)), py = Math.max(70, Math.min(hh - 30, t.y * hh));
      ptextO(g, t.slot === env.me ? '★' : '▼', px, py, 16, t.slot === env.me ? '#ffe066' : env.cols[t.slot % 4] || C.SLOT_COLORS[t.slot % 4]);
    });
    drawBoard(g, m, snap, env, mode);
    if (!(cd > 0)) drawAction(g, m, snap, env, ww, hh);
    if (snap && !snap.done && id === 'redlight' && !(cd > 0)) {
      var lc = snap.warn ? '#ffd23a' : snap.green ? '#3ddc5a' : '#ff3b3b', lcx = ww / 2, lcy = mode === 'prep' ? 120 : 44, rr = 30;
      g.fillStyle = '#000'; g.beginPath(); g.arc(lcx, lcy, rr + 4, 0, 6.2832); g.fill(); g.fillStyle = lc; g.beginPath(); g.arc(lcx, lcy, rr, 0, 6.2832); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(lcx - 14, lcy - 14, 6, 0, 6.2832); g.fill();
      ptextO(g, String(snap.tl), lcx, lcy + 2, 32, '#ffffff');
          }
    if (snap && id === 'cream' && !(cd > 0) && mode !== 'prep') {
      var mp = snap.P.filter(function (p) { return p[0] === env.me; })[0];
      if (snap.ph === 'swap') { ptextO(g, 'ผู้ยิงคนต่อไป: ' + (env.names[snap.sh + 0] || '') + '  (เปลี่ยนใน ' + Math.ceil(snap.sw) + ')', ww / 2, hh / 2 - 10, 28, '#ffe066'); }
      else if (mp) {
        ptextO(g, 'รอบ ' + snap.rd + '/' + snap.nr + ' · ' + (mp[7] === 1 ? 'คุณยิง! เล็งแล้วคลิก' : 'หลบครีม! (' + (env.names[snap.sh] || '') + ' กำลังยิง)'), ww / 2, 96, 16, mp[7] === 1 ? '#ffd6e4' : '#bfe6ff');
        if (mp[7] !== 1 && mp[5] > 0) { g.fillStyle = 'rgba(255,244,248,' + Math.min(0.5, mp[5] / 10 * 0.5) + ')'; g.fillRect(0, 0, ww, hh); ptextO(g, 'โดนครีม!', ww / 2, hh / 2, 48, '#ff5d73'); }
      }
    }
    if (snap && id === 'dodge' && !(cd > 0) && mode !== 'prep') {
      var mq = snap.P.filter(function (p) { return p[0] === env.me; })[0];
      if (mq && mq[5] > 0) ptextO(g, 'โดนครีม!', ww / 2, hh / 2, 40, '#ff5d73');
      ptextO(g, 'ระลอก ' + snap.wv, ww / 2, 54, 16, '#ffe066');
    }
    if (snap && !snap.done && id === 'bomb' && snap.boom === -1 && snap.cur >= 0 && !(cd > 0) && mode !== 'prep') {
      ptextO(g, String(Math.ceil(snap.tt)), ww / 2, 62, 40, snap.tt <= 1 ? '#ff6b6b' : '#ffe066');
      ptextO(g, snap.cur === env.me ? 'ตาคุณ!' : 'ตา ' + (env.names[snap.cur] || ''), ww / 2, 88, 16, '#ffffff');
    }
    if (snap && !snap.done && id === 'bomb' && snap.boom !== -1 && !(cd > 0)) {
      ptextO(g, 'ตู้ม!', ww / 2, 80, 48, '#ffa94d');
      ptextO(g, snap.boom >= 0 ? (env.names[snap.boom] || '') + ' ทำระเบิดแตก!' : 'ไส้ติดไฟระเบิดเอง ไม่มีใครแพ้', ww / 2, 116, 16, '#ffffff');
    }
    if (snap && !snap.done && snap.pz && !(cd > 0)) ptextO(g, 'จบรอบที่ ' + snap.rd, ww / 2, hh / 2 - 10, 32, '#ffe066');
    if (snap && !snap.done && id === 'chairs' && !(cd > 0)) {
        var pp = Math.sin(now / 150) > 0 ? '#ffe066' : '#ffffff';
        if (snap.ph === 'music') ptextO(g, '♪ ดนตรีเล่นอยู่ เดินวนไป... ♪', ww / 2, 64, 16, '#ffd6e4');
        else if (snap.ph === 'scramble') ptextO(g, 'ดนตรีหยุด! วิ่งไปนั่งเก้าอี้!', ww / 2, 70, 32, pp);
        else ptextO(g, 'รอบที่ ' + snap.rd + ' จบ', ww / 2, 64, 16, '#ffe066');
    }
    if (mode === 'prep') { ptextO(g, m.def.name, ww / 2, 20, 32, '#ffe066'); ptextO(g, m.def.how, ww / 2, 46, 16, '#ffffff'); }
    else {
      if (snap && snap.RM) ptextO(g, 'รอบ ' + snap.rd + '/' + snap.RM, ww / 2, 20, 32, '#ffffff');
      else if (snap && snap.tl >= 0 && id !== 'redlight') ptextO(g, String(snap.tl), ww / 2, 20, 32, snap.tl <= 5 ? '#ff6b6b' : '#ffffff');
    if (cd > 0) ptextO(g, String(Math.ceil(cd)), ww / 2, hh / 2, 64, '#ffe066');
      if (snap && snap.done) { ptextO(g, id === 'tag' && snap.it >= 0 ? 'ตู้ม!' : 'จบแล้ว!', ww / 2, hh / 2, 64, id === 'tag' ? '#ffa94d' : '#ffffff'); if (id === 'tag' && snap.it >= 0) ptextO(g, (env.names[snap.it] || '') + ' ถือครีมระเบิดอยู่!', ww / 2, hh / 2 + 44, 16, '#ffffff'); }
    }
  }
  function syncCols() {
    var cols = S.game && S.game.cols;
    if (cols) cols.forEach(function (c, i) { C.SLOT_COLORS[i] = C.PALETTE[c]; });
    else if (S.lobby) S.lobby.players.forEach(function (p) { C.SLOT_COLORS[p.slot] = C.PALETTE[p.col || 0]; });
  }
  // ทำให้ตำแหน่งผู้เล่นออนไลน์เคลื่อนที่นุ่มนวล: เก็บข้อมูล 2 ชุดล่าสุด แล้วไล่ค่าตำแหน่งระหว่างกัน (เห็นช้ากว่าจริงประมาณ 1 ช่วงข้อมูล)
  function simPush(sn) {
    var now = performance.now();
    if (S.simB) { var gap = now - S.simB.t; S.simGap = Math.max(25, Math.min(140, (S.simGap || 40) * 0.8 + gap * 0.2)); }
    S.simA = S.simB; S.simB = { s: sn, t: now };
  }
  function simView() {
    var B = S.simB, A = S.simA; if (!B) return S.simSnap; if (!A || !A.s.P || !B.s.P || A.s.ph !== B.s.ph) return B.s;
    var u = Math.max(0, Math.min(1, (performance.now() - B.t) / (S.simGap || 40))), out = {}, k;
    for (k in B.s) out[k] = B.s[k];
    out.P = B.s.P.map(function (p) {
      var q = null; for (var i = 0; i < A.s.P.length; i++) if (A.s.P[i][0] === p[0]) { q = A.s.P[i]; break; }
      if (!q || typeof p[1] !== 'number' || typeof p[2] !== 'number' || typeof q[1] !== 'number' || typeof q[2] !== 'number') return p;
      if (Math.abs(p[1] - q[1]) > 60 || Math.abs(p[2] - q[2]) > 60) return p;
      var r = p.slice(); r[1] = q[1] + (p[1] - q[1]) * u; r[2] = q[2] + (p[2] - q[2]) * u; return r;
    });
    return out;
  }
  function drawShared(now) {
    var m = S.mg, g = $('mgc').getContext('2d'), t = now - m.startAt;
    if (m.use3d) {
      var sn0 = isHost() ? (S.room && S.room.game && S.room.game.sim ? S.room.game.sim.snapshot() : S.simSnap) : simView(); if (sn0) S.simSnap = sn0;
      drawMg3(m, sn0, now, 'play', t < 0 ? -t / 1000 : 0); return;
    }
    if (t < 0) {
      g.fillStyle = '#1a0f2b'; g.fillRect(0, 0, 480, 270); g.font = 'bold 80px TAGBA, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#ffe066'; g.fillText(String(Math.ceil(-t / 1000)), 240, 135); $('mgtime').textContent = 'เตรียมตัว...'; return;
    }
    var snap = isHost() ? (S.room && S.room.game && S.room.game.sim ? S.room.game.sim.snapshot() : S.simSnap) : simView();
    if (!snap) return;
    S.simSnap = snap;
    var st = S.game, env = { me: S.slot, names: st ? st.names : {}, sprite: spriteFor };
    m.def.draw(g, snap, env);
    if (snap.done) { g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, 105, 480, 60); g.font = 'bold 30px TAGBA, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText('จบแล้ว!', 240, 135); }
    $('mgtime').textContent = snap.done ? 'จบแล้ว' : 'เหลือ ' + snap.tl + ' วินาที';
  }

  // มินิเกมแยกจอแบบ 3D + HUD
  function drawSolo3(m, game, t, now, mode, cd, fin) {
    var cv = $('mgc'), asp = innerWidth / innerHeight, hh = 270, ww = Math.round(270 * asp);
    if (cv.width !== ww || cv.height !== hh) { cv.width = ww; cv.height = hh; }
    var g = cv.getContext('2d'); g.clearRect(0, 0, ww, hh); g.imageSmoothingEnabled = false;
    var st = S.game, me = S.slot < 0 ? 0 : S.slot, id = m.def.v3, env = { me: me, names: st ? st.names : { 0: 'คุณ' }, skins: st ? st.skins : [S.skin || 0], cols: C.SLOT_COLORS.slice() };
    if (m.test || !st) env.cols[me] = C.PALETTE[S.skin || 0];
    var vw = game.view(Math.max(0, t)); if (id === 'balance') env.cnts = (st && st.mg && st.mg.scores && !m.test) ? Object.keys(st.names || {}).map(function (k) { return +k; }).filter(function (sl) { return st.mg.scores[sl] !== undefined; }).map(function (sl) { return [sl, sl === me ? game.score : st.mg.scores[sl]]; }) : [[me, game.score]]; if (id === 'maze' && vw) { env.others = []; if (st && st.mg && st.mg.pk && !m.test) Object.keys(st.names || {}).forEach(function (k) { var sl = +k, pk = st.mg.pk[sl]; if (sl !== me && pk >= 0 && st.mg.scores[sl] !== undefined) env.others.push({ slot: sl, x: pk % vw.N, y: Math.floor(pk / vw.N) }); }); }
    S.mgView.drawSolo(id, vw, env, now);
    
    mgScoreSfx(m, game.score);
    var rowsS = [[me, game.score]], rowsP = [[me, 0, 0, 1]];
    if (st && st.mg && st.mg.scores && !m.test) { rowsS = []; rowsP = []; Object.keys(st.names || {}).forEach(function (k) { var sl = +k; if (st.mg.scores[sl] === undefined) return; rowsS.push([sl, sl === me ? game.score : st.mg.scores[sl]]); rowsP.push([sl, 0, 0, 1]); }); if (!rowsS.length) { rowsS = [[me, game.score]]; rowsP = [[me, 0, 0, 1]]; } }
    if (!(vw && vw.end && id === 'balance')) drawBoard(g, m, { S: rowsS, P: rowsP }, env, mode);
    if (mode === 'prep') { ptextO(g, m.def.name, ww / 2, 20, 32, '#ffe066'); ptextO(g, m.def.how, ww / 2, 46, 16, '#ffffff'); }
    else if (!(cd > 0) && !fin && !(vw && vw.nt)) ptextO(g, String(Math.max(0, Math.ceil((m.dur - t) / 1000))), ww / 2, 20, 32, (m.dur - t) <= 5000 ? '#ff6b6b' : '#ffffff');
    if ((id === 'maze' || id === 'simon') && !fin && cd <= 0) { var GL = id === 'simon' ? ['↑', '→', '↓', '←'] : ['←', '↑', '↓', '→'], bw = 74 / 480 * ww, gp = 12 / 480 * ww, tot = 4 * bw + 3 * gp, x0 = (ww - tot) / 2; for (var bk = 0; bk < 4; bk++) { var bxx = x0 + bk * (bw + gp); g.fillStyle = id === 'simon' ? ['#ff6b6b', '#4dabf7', '#ffd43b', '#69db7c'][bk] : 'rgba(108,74,153,0.8)'; g.fillRect(bxx, 214, bw, 42); g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(bxx, 214, bw, 42); if (id !== 'simon') ptextO(g, GL[bk], bxx + bw / 2, 235, 26, '#ffffff'); } }
    if (id === 'maze' && vw && !(cd > 0)) {
      var N = vw.N, mp = 72, cs = mp / N, mx0 = ww - mp - 14, my0 = 14, sx = function (c) { return mx0 + c * cs; }, sy = function (c) { return my0 + c * cs; };
      g.fillStyle = 'rgba(30,16,48,0.72)'; g.fillRect(mx0 - 5, my0 - 5, mp + 10, mp + 10); g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.strokeRect(mx0 - 5, my0 - 5, mp + 10, mp + 10);
      for (var cy = 0; cy < N; cy++) for (var cx = 0; cx < N; cx++) {
        var inPl = cx >= vw.p0 && cx <= vw.p1 && cy >= vw.p0 && cy <= vw.p1, seenC = vw.vs[cy * N + cx];
        if (!seenC && !inPl) continue;
        g.fillStyle = inPl ? '#ff8fb8' : '#f2c98b'; g.fillRect(sx(cx), sy(cy), cs + 0.5, cs + 0.5);
        if (!inPl) { var q = vw.op[cy * N + cx]; g.fillStyle = '#5a3a2a'; if (q.charAt(0) === '0') g.fillRect(sx(cx), sy(cy), cs + 0.5, 1.2); if (q.charAt(3) === '0') g.fillRect(sx(cx), sy(cy), 1.2, cs + 0.5); if (q.charAt(2) === '0') g.fillRect(sx(cx), sy(cy + 1) - 1, cs + 0.5, 1.2); if (q.charAt(1) === '0') g.fillRect(sx(cx + 1) - 1, sy(cy), 1.2, cs + 0.5); }
      }
      var pcx = sx((vw.p0 + vw.p1 + 1) / 2), pcy = sy((vw.p0 + vw.p1 + 1) / 2); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(pcx, pcy, cs * 0.9, 0, 6.283); g.fill(); g.fillStyle = '#ff2a44'; g.beginPath(); g.arc(pcx, pcy, cs * 0.45, 0, 6.283); g.fill();
      (env.others || []).forEach(function (o) { g.fillStyle = '#000'; g.beginPath(); g.arc(sx(o.x + 0.5), sy(o.y + 0.5), cs * 0.42, 0, 6.283); g.fill(); g.fillStyle = env.cols[o.slot] || '#fff'; g.beginPath(); g.arc(sx(o.x + 0.5), sy(o.y + 0.5), cs * 0.32, 0, 6.283); g.fill(); });
      var ax = sx(vw.x + 0.5), ay = sy(vw.y + 0.5), an = vw.d * Math.PI / 2, rr = cs * 0.62;
      g.save(); g.translate(ax, ay); g.rotate(an); g.fillStyle = '#000'; g.beginPath(); g.moveTo(0, -rr - 1.5); g.lineTo(rr + 1.5, rr + 1.5); g.lineTo(-rr - 1.5, rr + 1.5); g.closePath(); g.fill();
      g.fillStyle = env.cols[me] || '#ffd43b'; g.beginPath(); g.moveTo(0, -rr); g.lineTo(rr, rr); g.lineTo(-rr, rr); g.closePath(); g.fill(); g.restore();
    }
    if (id === 'color' && vw && !fin && cd <= 0) { var cbw = 74 / 480 * ww, cgp = 12 / 480 * ww, ctot = 4 * cbw + 3 * cgp, cx0 = (ww - ctot) / 2; for (var ck = 0; ck < 4; ck++) { var cbx = cx0 + ck * (cbw + cgp); g.fillStyle = vw.btn[ck][0]; g.fillRect(cbx, 196, cbw, 42); g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(cbx, 196, cbw, 42); ptextO(g, vw.btn[ck][1], cbx + cbw / 2, 217, 16, '#ffffff'); } }
    if (id === 'addmath' && vw && !fin && cd <= 0) { var abw = 74 / 480 * ww, agp = 12 / 480 * ww, atot = 4 * abw + 3 * agp, ax0 = (ww - atot) / 2; for (var ak = 0; ak < 4; ak++) { var abx = ax0 + ak * (abw + agp); g.fillStyle = 'rgba(108,74,153,0.9)'; g.fillRect(abx, 190, abw, 42); g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(abx, 190, abw, 42); ptextO(g, String(vw.opts[ak]), abx + abw / 2, 211, 22, '#ffffff'); }
      if (S.mgView && S.mgView.camP) { var pj2 = S.mgView.project(0, 3.4, -0.5); if (pj2) ptextO(g, vw.a + ' + ' + vw.b + ' = ?', pj2[0] * ww, pj2[1] * hh, 40, vw.st ? '#ff8787' : '#ffffff'); } }
    if (id === 'sweetveg' && vw && !fin && cd <= 0 && S.mgView && S.mgView.camP) { var pj3 = S.mgView.project(0, 2.7, -3.0); if (pj3) { g.save(); g.translate(pj3[0] * ww, pj3[1] * hh); var shv = vw.st ? Math.sin(performance.now() / 20) * 3 : 0; g.translate(shv, 0); drawSVItem(g, vw.v, vw.k, 0.7); g.restore(); ptextO(g, vw.w, pj3[0] * ww, pj3[1] * hh + 44, 18, vw.st ? '#ff8787' : '#ffe066'); } }
    if (id === 'count' && vw && !fin && cd <= 0) { var nbw = 74 / 480 * ww, ngp = 12 / 480 * ww, ntot = 4 * nbw + 3 * ngp, nx0 = (ww - ntot) / 2; for (var nk = 0; nk < 4; nk++) { var nbx = nx0 + nk * (nbw + ngp), isAns = vw.ph === 2 && vw.opts[nk] === vw.n, isBad = vw.ph === 2 && vw.sel === nk && !vw.ok; g.fillStyle = vw.ph === 1 ? 'rgba(108,74,153,0.92)' : isAns ? '#2f9e44' : isBad ? '#e03131' : 'rgba(108,74,153,0.45)'; g.fillRect(nbx, 196, nbw, 42); g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(nbx, 196, nbw, 42); ptextO(g, String(vw.opts[nk]), nbx + nbw / 2, 217, 22, '#ffffff'); } }
    if (id === 'order' && vw && !fin && cd <= 0 && S.mgView && S.mgView.camP) {
      var pa = S.mgView.project(-7.4, 0.2, 7.8), pb2 = S.mgView.project(7.4, 0.2, 7.8), pc = S.mgView.project(0, 0.2, 5.6);
      if (pa) ptextO(g, 'ต้นแบบ', pa[0] * ww, pa[1] * hh, 20, '#ffe066'); if (pb2) ptextO(g, 'ของคุณ  รอบ ' + (vw.rd + 1) + '/3', pb2[0] * ww, pb2[1] * hh, 20, '#ffffff'); if (pc && vw.next >= 0) ptextO(g, 'วางชิ้นนี้', pc[0] * ww, pc[1] * hh, 16, '#ffffff');
      if (vw.rev) { vw.pl.forEach(function (q, k) { var pj5 = S.mgView.project(7.4 + q[1] * 1.3, 4.4, q[2] * 1.3), pc2 = vw.pcs[k]; if (pj5) ptextO(g, pc2 + '%', pj5[0] * ww, pj5[1] * hh, 18, pc2 >= 90 ? '#8ce99a' : pc2 >= 60 ? '#ffe066' : '#ff8787'); }); ptextO(g, 'ความแม่นรอบนี้ ' + vw.rp + '%', ww / 2, 236, 28, vw.rp >= 90 ? '#8ce99a' : vw.rp >= 60 ? '#ffe066' : '#ff8787'); } }
    if (id === 'shadow' && vw && !fin && cd <= 0) {
      var SX = function (x) { return x * ww / 480; };
      g.fillStyle = vw.ph === 0 ? '#2f9e44' : '#6b5b7b'; g.fillRect(SX(362), 66, SX(88), 44); g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(SX(362), 66, SX(88), 44); ptextO(g, 'ส่งคำตอบ', SX(406), 88, 16, '#ffffff');
      for (var ck2 = 0; ck2 < 12; ck2++) { var cc = vw.cands[ck2], cx3 = SX(54 + (ck2 % 6) * 62), cy3 = 144 + Math.floor(ck2 / 6) * 52, cw3 = SX(60), on = vw.tick[ck2], tr = vw.truth ? vw.truth[ck2] : -1;
        g.fillStyle = tr === 1 ? 'rgba(47,158,68,0.55)' : tr === 0 && on ? 'rgba(224,49,49,0.55)' : on ? 'rgba(255,224,102,0.5)' : 'rgba(90,60,140,0.38)'; g.fillRect(cx3, cy3, cw3, 50); g.strokeStyle = on ? '#fff' : '#000'; g.lineWidth = on ? 3 : 2; g.strokeRect(cx3, cy3, cw3, 50);
        ptextO(g, cc[1], cx3 + cw3 / 2, cy3 + 45, cc[1].length > 8 ? 8 : 10, '#ffffff');
        g.fillStyle = '#fff'; g.fillRect(cx3 + 3, cy3 + 3, 12, 12); g.strokeStyle = '#000'; g.lineWidth = 1.5; g.strokeRect(cx3 + 3, cy3 + 3, 12, 12); if (on) { g.beginPath(); g.moveTo(cx3 + 5, cy3 + 9); g.lineTo(cx3 + 8, cy3 + 13); g.lineTo(cx3 + 14, cy3 + 4); g.lineWidth = 3; g.strokeStyle = '#2f9e44'; g.stroke(); } } }
    if (id === 'numbers' && vw && !fin && cd <= 0 && S.mgView && S.mgView.camP) vw.b.forEach(function (b) { var pj = S.mgView.project((b[1] - 240) * 0.05, 1.0, (b[2] - 140) * 0.05); if (pj && b[0] >= vw.next) ptextO(g, String(b[0]), pj[0] * ww, pj[1] * hh, 20, '#ffffff'); });
    if (vw && vw.msg && !fin) ptextO(g, vw.msg, ww / 2, vw.my || hh - 70, vw.msz || 20, '#ffe066');
    if (vw && vw.msg2 && !fin) ptextO(g, vw.msg2, ww / 2, vw.my2 || hh - 28, 18, '#ffffff');
    if (vw && vw.sum) ptextO(g, vw.sum, ww / 2, fin ? hh / 2 + 70 : hh - 60, 18, '#ffe066');
    if (vw && vw.end && id === 'balance') {
      if (game.ext === undefined && vw.et > 0.3) game.ext = Math.max.apply(null, rowsS.map(function (r) { return r[1]; }).concat([0]));
      var cn = rowsS.slice().sort(function (a, b) { return a[0] - b[0]; }), nn = cn.length, kk = vw.k || 0, win = vw.ext !== undefined && kk >= vw.ext && vw.et > 1.5;
      cn.forEach(function (r, qi) {
        var sx = ww / 2 * (1 + ((qi - (nn - 1) / 2) * 6.2) / ((S.mgView.balCz || 20) * 0.554 * asp)), out = kk > r[1] && !win ? true : (win && r[1] < vw.ext), top = win && r[1] === vw.ext;
        ptextO(g, (env.names[r[0]] || 'P' + r[0]), sx, hh - 58, 15, top ? '#ffe066' : out ? '#9a8aa8' : (env.cols[r[0]] || '#fff'));
        ptextO(g, top ? 'ชนะ! ' + r[1] + ' ก้อน' : out ? '✕ ' + r[1] + ' ก้อน' : (win ? r[1] : Math.min(kk, r[1])) + ' ก้อน', sx, hh - 36, 15, top ? '#ffe066' : out ? '#9a8aa8' : '#ffffff');
      });
      if (!win && vw.et >= 1.2) ptextO(g, 'นับ ' + kk, ww / 2, 34, 36, '#ffe066');
      else if (!win) ptextO(g, 'หมดเวลา!', ww / 2, 34, 30, '#ffffff');
      else ptextO(g, 'จบการนับ', ww / 2, 34, 28, '#ffffff');
    }
    if (cd > 0) ptextO(g, String(Math.ceil(cd)), ww / 2, hh / 2, 64, '#ffe066');
    if (fin) { ptextO(g, 'จบแล้ว!', ww / 2, hh / 2 - 8, 64, '#ffffff'); ptextO(g, 'คะแนน ' + game.score + ' — รอผู้เล่นอื่น', ww / 2, hh / 2 + 38, 16, '#ffe066'); }
  }
  function drawPractice(now) {
    var m = S.mg, g = $('mgc').getContext('2d'), tag = function () { g.save(); g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(150, 4, 180, 20); g.font = 'bold 13px TAGBA, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#b3265e'; g.fillText('ซ้อมมือ (ไม่นับคะแนน)', 240, 14); g.restore(); };
    if (m.shared) {
      if (!m.psim) { g.fillStyle = '#1a0f2b'; g.fillRect(0, 0, 480, 270); return; }
      var dt = Math.min(0.1, (now - m.pLast) / 1000); m.pLast = now;
      m.psim.input(S.slot < 0 ? 0 : S.slot, mgInput()); if (m.test) botsThink(m, now);
      if (!m.psim.done) m.psim.tick(dt); else { m.pEnd = (m.pEnd || 0) + dt; if (m.pEnd > 1.5) newPractice(m); }
      if (m.use3d) { drawMg3(m, m.psim.snapshot(), now, 'prep', 0); return; }
      var st = S.game, env = { me: S.slot < 0 ? 0 : S.slot, names: st ? st.names : {}, sprite: spriteFor };
      m.def.draw(g, m.psim.snapshot(), env); tag(); return;
    }
    var t = now - m.pt0;
    if (m.use3d) drawSolo3(m, m.pgame, Math.min(t, m.dur), now, 'prep', 0, false); else { m.pgame.draw(g, Math.min(t, m.dur)); tag(); }
    if (t >= m.dur || m.pgame.done(t)) { if (!m.pEnd) m.pEnd = now; if (now - m.pEnd > 1500) newPractice(m); }
  }

  function drawMini(now) {
    var m = S.mg; if (!m) return;
    if (m.prep) { drawPractice(now); $('mgtime').textContent = m.shared ? 'ซ้อมได้เลย (ใช้ W A S D / Space)' : 'ซ้อมได้เลย ไม่นับคะแนน'; return; }
    if (m.shared) return drawShared(now);
    var cv = $('mgc'), g = cv.getContext('2d'), t = now - m.startAt;
    if (t < 0) {
      if (m.use3d) { drawSolo3(m, m.game, 0, now, 'play', -t / 1000, false); $('mgtime').textContent = 'เตรียมตัว...'; return; }
      g.fillStyle = '#1a0f2b'; g.fillRect(0, 0, 480, 270); g.font = 'bold 80px TAGBA, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#ffe066'; g.fillText(String(Math.ceil(-t / 1000)), 240, 135); $('mgtime').textContent = 'เตรียมตัว...';
      return;
    }
    if (!m.finished) {
      if (m.use3d) drawSolo3(m, m.game, t, now, 'play', 0, false); else m.game.draw(g, t);
      if (t >= m.dur || m.game.done(t)) { m.finished = true; sendScore(true); }
      else if ((m.game.score !== m.sent || m.game.pk !== m.sentP) && now - m.lastSend > 120) sendScore(false);
      $('mgtime').textContent = 'เหลือ ' + Math.max(0, Math.ceil((m.dur - t) / 1000)) + ' วินาที';
    } else if (m.use3d) { drawSolo3(m, m.game, Math.min(t, m.dur), now, 'play', 0, true); $('mgtime').textContent = 'รอผู้เล่นอื่น...'; }
    else {
      m.game.draw(g, Math.min(t, m.dur));
      g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, 100, 480, 70); g.font = 'bold 26px TAGBA, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#fff'; g.fillText('จบแล้ว! คะแนน ' + m.game.score + ' — รอผู้เล่นอื่น', 240, 135);
      $('mgtime').textContent = 'รอผู้เล่นอื่น...';
    }
  }

  function miniRelease(code) {
    var m = S.mg; if (!m || m.shared) return;
    if (m.prep) { if (m.pgame && m.pgame.release) m.pgame.release(code, performance.now() - m.pt0); return; }
    if (!m.game.release) return;
    m.game.release(code, performance.now() - m.startAt);
  }

  // รูปขนม/ผักแบบพิกเซลละเอียด (วาดด้วยโค้ด) ใช้ในเกมขนมหรือผัก — พิกัด ±50
  var SVOL = '#3a2358';
  function drawSVItem(g, isVeg, k, sc) {
    g.save(); g.scale(sc, sc * 1); g.lineWidth = 3.2; g.lineJoin = 'round'; g.lineCap = 'round';
    function grad(x, y, r, c1, c2) { var q = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.1); q.addColorStop(0, c1); q.addColorStop(1, c2); return q; }
    function ell(x, y, rx, ry, c1, c2, nos) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 6.2832); g.fillStyle = grad(x, y, Math.max(rx, ry), c1, c2); g.fill(); if (!nos) { g.strokeStyle = SVOL; g.stroke(); } }
    function rr(x, y, w, h, r, c1, c2) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); var q = g.createLinearGradient(x, y, x, y + h); q.addColorStop(0, c1); q.addColorStop(1, c2); g.fillStyle = q; g.fill(); g.strokeStyle = SVOL; g.stroke(); }
    function poly(pts, c1, c2) { g.beginPath(); pts.forEach(function (p, i) { i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.closePath(); var ys = pts.map(function (p) { return p[1]; }), q = g.createLinearGradient(0, Math.min.apply(0, ys), 0, Math.max.apply(0, ys)); q.addColorStop(0, c1); q.addColorStop(1, c2); g.fillStyle = q; g.fill(); g.strokeStyle = SVOL; g.stroke(); }
    function hi(x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, rx, ry, -0.5, 0, 6.2832); g.fillStyle = 'rgba(255,255,255,0.55)'; g.fill(); }
    function line(x1, y1, x2, y2, c, w) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokeStyle = c; g.lineWidth = w || 2; g.stroke(); g.lineWidth = 3.2; }
    function dots(arr, c, r) { arr.forEach(function (d) { g.beginPath(); g.arc(d[0], d[1], r, 0, 6.2832); g.fillStyle = c; g.fill(); }); }
    if (!isVeg) {
      if (k === 0) { rr(-40, 4, 80, 28, 5, '#f8d594', '#e0a458'); rr(-40, -6, 80, 11, 4, '#ffffff', '#f1e6d8'); rr(-40, -24, 80, 19, 4, '#ff9ec0', '#ff6f9f'); rr(-43, -34, 86, 11, 5, '#ffffff', '#f1e6d8'); ell(0, -44, 9, 9, '#ff6b81', '#c92a2a'); hi(-3, -47, 3, 2); }
      else if (k === 1) { ell(0, 0, 40, 38, '#f2c47e', '#c98b46'); dots([[-14, -14], [12, -18], [-4, 6], [20, 8], [-22, 16], [8, 24], [26, -4]], '#5b3418', 5); ell(26, -22, 12, 12, '#2b1a45', '#2b1a45', true); }
      else if (k === 2) { rr(-30, -42, 60, 84, 6, '#8a5232', '#5e341c'); for (var cy = -30; cy < 30; cy += 22) for (var cx = -18; cx < 20; cx += 20) rr(cx - 8, cy - 8, 17, 17, 3, '#a8683f', '#7a4527'); rr(-31, 24, 62, 20, 4, '#e9ecef', '#adb5bd'); }
      else if (k === 3) { poly([[-24, 0], [24, 0], [0, 48]], '#f0c27a', '#cf9444'); line(-14, 8, 8, 30, '#a8692b'); line(2, 6, -10, 26, '#a8692b'); line(14, 8, -2, 38, '#a8692b'); ell(0, -8, 27, 24, '#ffc9de', '#ff8fb8'); ell(0, -28, 21, 18, '#fff4d6', '#f0d6a0'); ell(0, -44, 6, 6, '#ff6b81', '#c92a2a'); hi(-10, -12, 6, 4); }
      else if (k === 4) { ell(0, 0, 42, 36, '#ff9ec0', '#ff5d8f'); ell(0, 0, 14, 11, '#2b1a45', '#2b1a45', true); g.strokeStyle = SVOL; g.beginPath(); g.ellipse(0, 0, 14, 11, 0, 0, 6.2832); g.stroke(); [[-26, -14, '#ffd43b'], [20, -18, '#4dd4ff'], [30, 4, '#fff'], [-10, 22, '#4dd4ff'], [14, 24, '#ffd43b'], [-30, 10, '#fff'], [-2, -26, '#fff']].forEach(function (d) { rr(d[0] - 5, d[1] - 2, 11, 4, 1, d[2], d[2]); }); hi(-24, -20, 8, 4); }
      else if (k === 5) { ell(0, -16, 34, 18, '#ffc2dd', '#ff8fb8'); rr(-33, -8, 66, 14, 6, '#ffffff', '#f1e6d8'); ell(0, 14, 34, 18, '#ffc2dd', '#ff8fb8'); rr(-33, -8, 66, 14, 6, '#ffffff', '#f1e6d8'); hi(-14, -22, 9, 4); line(-28, 22, 28, 22, '#ff8fb8', 2); }
      else if (k === 6) { ell(0, 38, 46, 9, '#ffffff', '#ced4da'); poly([[-32, 32], [32, 32], [25, -12], [-25, -12]], '#ffe08a', '#efb236'); poly([[-27, -12], [27, -12], [23, -26], [-23, -26]], '#b8691f', '#7a3f10'); ell(-20, -8, 7, 11, '#a85a18', '#7a3f10'); ell(8, -6, 6, 13, '#a85a18', '#7a3f10'); ell(22, -9, 5, 9, '#a85a18', '#7a3f10'); ell(0, -32, 14, 8, '#ffffff', '#e9e0d0'); ell(0, -44, 6, 6, '#ff6b81', '#c92a2a'); hi(-14, 10, 4, 12); }
      else if (k === 7) { ell(0, 40, 36, 7, '#ffffff', '#ced4da'); poly([[-32, 38], [32, 38], [26, -14], [-26, -14]], '#ff6b87', '#d6224a'); ell(0, -14, 26, 10, '#ff9db0', '#ff4d6d'); ell(0, -22, 18, 14, '#ff9db0', '#ff4d6d'); line(-28, 8, 28, 8, 'rgba(120,0,30,0.45)', 3); line(-30, 24, 30, 24, 'rgba(120,0,30,0.45)', 3); hi(-14, 0, 5, 20); dots([[16, -16], [22, 18]], 'rgba(255,255,255,0.8)', 3); }
      else if (k === 8) { poly([[-24, 0], [-48, -16], [-48, 16]], '#ffe27a', '#f2b61b'); poly([[24, 0], [48, -16], [48, 16]], '#ffe27a', '#f2b61b'); ell(0, 0, 28, 28, '#ff8fb8', '#ff3d7f'); g.save(); g.beginPath(); g.arc(0, 0, 27, 0, 6.2832); g.clip(); for (var q = -40; q < 40; q += 18) line(q - 20, 30, q + 20, -30, '#ffffff', 7); g.restore(); g.beginPath(); g.arc(0, 0, 28, 0, 6.2832); g.strokeStyle = SVOL; g.stroke(); hi(-10, -12, 7, 4); }
      else { g.save(); g.rotate(-0.1); ell(0, 2, 44, 40, '#f6cb74', '#d9953a'); g.save(); g.beginPath(); g.ellipse(0, 2, 43, 39, 0, 0, 6.2832); g.clip(); for (var wq = -36; wq < 40; wq += 15) { line(wq, -40, wq, 44, '#b8742a', 3); line(-44, wq + 4, 44, wq + 4, '#b8742a', 3); } g.restore(); ell(-6, -4, 22, 16, '#a0521a', '#6e3410'); ell(0, 0, 8, 6, '#fff3b0', '#ffd75e'); ell(24, -22, 8, 8, '#ff5d7a', '#c92a4a'); ell(-28, 16, 8, 8, '#ff5d7a', '#c92a4a'); g.restore(); }
    } else {
      if (k === 0) { rr(-9, 4, 18, 40, 5, '#b8e986', '#7fc24a'); [[-20, -8, 20], [20, -8, 20], [0, -22, 24], [-10, 4, 18], [12, 4, 18]].forEach(function (c) { ell(c[0], c[1], c[2], c[2] * 0.9, '#6fd36b', '#2d8f3c'); }); hi(-10, -28, 8, 4); }
      else if (k === 1) { g.save(); g.rotate(0.5); poly([[-16, -30], [16, -30], [0, 48]], '#ffb25c', '#f0731c'); line(-8, -14, 6, -8, '#c55a0e', 2); line(-6, 4, 7, 10, '#c55a0e', 2); line(-3, 22, 4, 26, '#c55a0e', 2); [-12, 0, 12].forEach(function (lx, i) { poly([[lx - 6, -30], [lx + 6, -30], [lx + (i - 1) * 6, -52]], '#6fd36b', '#2d8f3c'); }); g.restore(); }
      else if (k === 2) { ell(0, 6, 44, 38, '#b6f0a0', '#5cbf45'); ell(-18, 0, 26, 30, '#c9f7b4', '#6fd36b'); ell(18, 2, 26, 30, '#a8e68f', '#4fb03b'); ell(0, -6, 22, 28, '#d3f9bf', '#7fd35f'); line(0, 24, 0, -24, '#4fb03b', 2); line(0, 4, -14, -10, '#4fb03b', 2); line(0, 4, 14, -10, '#4fb03b', 2); }
      else if (k === 3) { g.save(); g.rotate(-0.35); ell(0, 0, 21, 48, '#9edb62', '#3f8f22'); for (var by = -36; by < 38; by += 10) { ell(-11, by, 7, 4.5, '#c8f08a', '#5aa83a'); ell(0, by + 5, 7, 4.5, '#c8f08a', '#5aa83a'); ell(11, by, 7, 4.5, '#c8f08a', '#5aa83a'); } rr(-4, -56, 8, 12, 3, '#8a6a2a', '#5e4418'); g.restore(); }
      else if (k === 4) { poly([[-6, -34], [6, -34], [4, -22], [-4, -22]], '#d9b36a', '#a8803a'); ell(0, 8, 36, 34, '#f3d9ff', '#c58fe8'); g.save(); g.beginPath(); g.ellipse(0, 8, 35, 33, 0, 0, 6.2832); g.clip(); line(-14, -26, -22, 38, '#a45fd0', 2); line(0, -26, 0, 42, '#a45fd0', 2); line(14, -26, 22, 38, '#a45fd0', 2); g.restore(); line(-6, 42, -10, 50, '#d9b36a', 2); line(0, 42, 0, 50, '#d9b36a', 2); line(6, 42, 10, 50, '#d9b36a', 2); hi(-16, -8, 6, 10); }
      else if (k === 5) { g.save(); g.rotate(-0.6); g.beginPath(); g.moveTo(-26, -34); g.bezierCurveTo(22, -40, 36, 10, 6, 48); g.bezierCurveTo(10, 14, -6, -4, -26, -20); g.closePath(); var cq = g.createLinearGradient(-20, -30, 20, 40); cq.addColorStop(0, '#ff6b6b'); cq.addColorStop(1, '#c92a2a'); g.fillStyle = cq; g.fill(); g.strokeStyle = SVOL; g.stroke(); rr(-36, -42, 14, 14, 4, '#6fd36b', '#2d8f3c'); line(-4, -26, 14, -10, 'rgba(255,255,255,0.55)', 3); g.restore(); }
      else if (k === 6) { [-22, 0, 22].forEach(function (b, i) { line(b * 0.3, 46, b, -6 - (i === 1 ? 10 : 0), '#4fb03b', 4); }); [[-22, -6], [0, -16], [22, -6]].forEach(function (b) { for (var lf = 0; lf < 5; lf++) { var la = -1.9 + lf * 0.95; ell(b[0] + Math.cos(la) * 15, b[1] + Math.sin(la) * 15, 11, 8, '#9be57a', '#3f9e33'); } ell(b[0], b[1], 9, 9, '#7fd35f', '#3f9e33'); }); rr(-12, 28, 24, 8, 3, '#ff6b6b', '#c92a2a'); }
      else if (k === 7) { g.save(); g.rotate(0.45); rr(-15, -46, 30, 92, 15, '#bfe88a', '#6fae35'); line(-8, -38, -8, 38, '#4f8a22', 2.5); line(0, -42, 0, 42, '#4f8a22', 2.5); line(8, -38, 8, 38, '#4f8a22', 2.5); ell(0, 46, 14, 6, '#f4fbe0', '#d7e8b0'); dots([[-4, 46], [4, 45], [0, 47]], '#6b5a2a', 1.5); rr(-6, -54, 12, 10, 3, '#8a6a2a', '#5e4418'); g.restore(); }
      else if (k === 8) { ell(0, 4, 44, 42, '#d7f5b8', '#7fcf55'); g.beginPath(); g.arc(0, 4, 30, 0.6, 3.5); g.strokeStyle = '#4fb03b'; g.lineWidth = 2.5; g.stroke(); g.beginPath(); g.arc(0, 4, 18, 3.6, 6.4); g.stroke(); g.lineWidth = 3.2; line(0, -36, 0, 44, '#4fb03b', 2); hi(-18, -14, 8, 14); }
      else { g.fillStyle = 'rgba(0,0,0,0)'; [-22, 0, 22].forEach(function (bx, i) { g.beginPath(); g.moveTo(bx * 0.4, -40); g.bezierCurveTo(bx * 1.2 + 12, -14, bx - 16, 16, bx + 8 + i * 3, 46); g.strokeStyle = SVOL; g.lineWidth = 13; g.stroke(); g.strokeStyle = i === 1 ? '#82d86a' : '#58b83e'; g.lineWidth = 8; g.stroke(); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2; g.stroke(); }); g.lineWidth = 3.2; rr(-18, -46, 36, 9, 3, '#c9923d', '#8a5a1a'); dots([[-8, -42], [0, -42], [8, -42]], '#5e3a10', 1.5); }
    }
    g.restore();
  }

  function miniPtr(ev) {
    var m = S.mg; if (!m || m.shared) return null; var g, t;
    if (m.prep) { g = m.pgame; t = performance.now() - m.pt0; if (t > m.dur) return null; } else { if (m.finished) return null; g = m.game; t = performance.now() - m.startAt; if (t < 0) return null; }
    var r = (m.use3d ? $('mgc3') : $('mgc')).getBoundingClientRect(), nx = (ev.clientX - r.left) / r.width, ny = (ev.clientY - r.top) / r.height, x = nx * 480, y = ny * 270;
    if (m.use3d && S.mgView && S.mgView.camP) { var ps = S.mgView.pickSim(m.def.v3, nx, ny); if (!ps) return { g: g, t: t, x: null, y: null, nx: nx, ny: ny, id: m.def.v3 }; x = ps[0]; y = ps[1]; }
    return { g: g, t: t, x: x, y: y, nx: nx, ny: ny, id: m.def.v3 };
  }
  function miniMove(ev) {
    var d = S.mgDrag; if (!d) return;
    if (d.kind === 'order') { var p = miniPtr(ev); if (p && p.g.move) p.g.move(p.x, p.y, p.t); }
    else if (d.kind === 'rot') { var dx = ev.clientX - d.px; d.px = ev.clientX; d.moved += Math.abs(dx); if (S.mgView) S.mgView.rotAdd(dx * 0.012); }
  }
  function miniUp(ev) {
    var d = S.mgDrag; if (!d) return; S.mgDrag = null;
    if (d.kind === 'order') { var p = miniPtr(ev); if (p && p.g.up) p.g.up(p.x, p.y, p.t); }
  }
  function miniClick(ev) {
    var m = S.mg; if (!m || m.shared) return;
    var pp0 = miniPtr(ev); if (pp0 && pp0.id === 'order') { if (pp0.g.down) { pp0.g.down(pp0.x, pp0.y, pp0.t); S.mgDrag = { kind: 'order' }; } return; }
    if (pp0 && pp0.id === 'shadow' && pp0.ny * 270 < 140 && !(pp0.nx * 480 >= 362 && pp0.ny * 270 >= 66 && pp0.ny * 270 <= 110)) { S.mgDrag = { kind: 'rot', px: ev.clientX, moved: 0 }; return; }
    var g, t;
    if (m.prep) { g = m.pgame; t = performance.now() - m.pt0; if (t > m.dur) return; }
    else { if (m.finished) return; g = m.game; t = performance.now() - m.startAt; if (t < 0) return; }
    var r = (S.mg.use3d ? $('mgc3') : $('mgc')).getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * 480, y = (ev.clientY - r.top) / r.height * 270;
    if (m.use3d && S.mgView && S.mgView.camP) { var ps = S.mgView.pickSim(m.def.v3, (ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height); if (!ps) return; x = ps[0]; y = ps[1]; }
    if (g.click) g.click(x, y, t); else g.press('Click', t);
  }

  function miniKey(code) {
    var m = S.mg; if (!m || m.shared) return;
    if (m.prep) { var tp = performance.now() - m.pt0; if (tp <= m.dur && m.pgame) m.pgame.press(code, tp); return; }
    if (m.finished) return;
    var t = performance.now() - m.startAt; if (t < 0) return;
    m.game.press(code, t);
  }

  function renderResults(st) {
    var box = $('mgres'), rows = null, title = '';
    if (st.phase === 'mini' && st.res && st.res.length) { rows = st.res.map(function (r) { return { slot: r.slot, rank: r.rank, main: r.score + ' คะแนน', extra: '+' + r.reward }; }); title = 'ผลมินิเกม'; }
    else if (st.phase === 'end' && st.final) { renderFinal(st); return; }
    else if (st.phase === 'end' && st.winners && st.winners.length) { rows = st.winners.map(function (s, i) { return { slot: s, rank: i + 1, main: st.points[s] + ' ★', extra: st.coins[s] + ' เหรียญ' }; }); title = 'จบเกม! ผู้ชนะคือ ' + st.names[st.winners[0]]; }
    if (S.fin) { clearInterval(S.fin.iv); S.fin = null; box.className = ''; }
    if (F3 && st.phase !== 'end') stopF3();
    if (!rows) { box.style.display = 'none'; box.textContent = ''; S.resKey = ''; return; }
    var key = st.phase + JSON.stringify(rows); if (key === S.resKey) return; S.resKey = key;
    box.style.display = ''; box.textContent = '';
    var h = document.createElement('h2'); h.textContent = title; box.appendChild(h);
    rows.forEach(function (r) {
      var d = document.createElement('div'); d.className = 'rr r' + r.rank; d.style.setProperty('--pb', C.SLOT_COLORS[r.slot]);
      d.style.animationDelay = (r.rank - 1) * 0.12 + 's';
      var n = document.createElement('b'); n.className = 'rk'; n.textContent = r.rank;
      var nm = document.createElement('span'); nm.className = 'rn'; nm.textContent = st.names[r.slot] + (r.slot === S.slot ? ' (คุณ)' : '');
      var sc = document.createElement('span'); sc.className = 'rs'; sc.textContent = r.main;
      var ex = document.createElement('span'); ex.className = 'rx'; ex.textContent = r.extra;
      d.appendChild(n); d.appendChild(nm); d.appendChild(sc); d.appendChild(ex); box.appendChild(d);
    });
  }

  /* ---------- ฉากสรุปคะแนนตอนจบเกม: เชอร์รี่ → รางวัลโบนัสทีละอัน → อันดับสุดท้าย ---------- */
  /* ===================== หน้าสรุปคะแนนท้ายเกม (หน้าแยก): โหลแก้ว + ดาวร่วง + กลองลุ้น ===================== */
  var F3 = null;
  function f3Audio() {
    try { if (!AU.ctx) AU.ctx = new (window.AudioContext || window.webkitAudioContext)(); if (AU.ctx.state === 'suspended') AU.ctx.resume(); } catch (e) { return null; }
    if (!F3.bus) { F3.bus = AU.ctx.createGain(); F3.bus.gain.value = AU.mute ? 0 : 1; F3.bus.connect(AU.ctx.destination); }
    return AU.ctx;
  }
  function f3Tone(at, f, d, v, type, f2) {
    var c = f3Audio(); if (!c || !F3) return; var o = c.createOscillator(), g = c.createGain(), t = c.currentTime + Math.max(0, at);
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(F3.bus); o.start(t); o.stop(t + d + 0.02);
  }
  function f3Noise(at, d, v, hp) {
    var c = f3Audio(); if (!c || !F3) return; var n = Math.floor(c.sampleRate * d), b = c.createBuffer(1, n, c.sampleRate), a = b.getChannelData(0); for (var i = 0; i < n; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + Math.max(0, at); s.buffer = b; f.type = 'highpass'; f.frequency.value = hp || 4000; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f); f.connect(g); g.connect(F3.bus); s.start(t);
  }
  function f3Drum(at, v, low) { f3Tone(at, low ? 120 : 190, 0.14, v, 'sine', low ? 55 : 80); f3Noise(at, 0.05, v * 0.35, 1500); }
  function f3Roll(dur, v0, v1) {   // กลองรัว ถี่ขึ้นและดังขึ้นเรื่อยๆ
    var t = 0, k = 0; while (t < dur) { var u = t / dur; f3Drum(t, v0 + (v1 - v0) * u, k % 2 === 0); t += 0.16 - 0.1 * u * u; k++; }
  }
  function f3Cymbal(at) { f3Noise(at, 1.1, 0.22, 5500); f3Drum(at, 0.5, true); }
  function f3Clink() { if (!F3 || performance.now() - F3.lastClink < 45) return; F3.lastClink = performance.now(); var p = [1047, 1175, 1319, 1568, 1760]; f3Tone(0, p[Math.floor(Math.random() * p.length)], 0.22, 0.05, 'triangle'); }
  function f3Fanfare() { var n = [523, 659, 784, 1047, 784, 1047, 1319]; n.forEach(function (f, i) { f3Tone(i * 0.13, f, 0.28, 0.09, 'square'); f3Tone(i * 0.13, f / 2, 0.28, 0.06, 'triangle'); }); [523, 659, 784, 1047].forEach(function (f) { f3Tone(0.95, f, 1.2, 0.07, 'triangle'); }); }

  function startF3(st) {
    var F = st.final; if (!F || F3) return;
    var W = window.innerWidth, H = window.innerHeight, N = F.slots.length, A = CakeGame.AWARDS, i;
    var tot = F.cherry.slice(), grand = {}; F.slots.forEach(function (sl) { tot[sl] = F.cherry[sl]; });
    F.awards.forEach(function (a) { a.slots.forEach(function (sl) { tot[sl] += a.pts; }); });
    var maxTot = Math.max.apply(null, F.slots.map(function (sl) { return tot[sl]; })), cap = 30;
    var ranks = F.slots.slice().sort(function (a, b) { return tot[b] - tot[a] || F.coins[b] - F.coins[a]; });
    var ph = [{ k: 'intro', d: 1.7 }, { k: 'cherry', d: 4.2 }];
    F.awards.forEach(function (a, i) { ph.push({ k: 'awq', i: i, d: 2.7 }); ph.push({ k: 'awr', i: i, d: a.slots.length ? 3.0 : 1.5 }); });
    ph.push({ k: 'roll', d: 3.4 }); for (i = N - 1; i >= 1; i--) ph.push({ k: 'rk', n: i, d: 1.15 }); ph.push({ k: 'drum2', d: 2.2 }); ph.push({ k: 'win', d: 1e9 });
    F3 = { st: st, F: F, W: W, H: H, N: N, tot: tot, ranks: ranks, ph: ph, pi: -1, pt: 0, t0: performance.now(), last: performance.now(), stars: [], q: [], shown: {}, glow: {}, rk: {}, parts: [], conf: [], bus: null, lastClink: 0, shake: 0, win: 0, cap: cap, skip: false, imgs: {}, done: false };
    F.slots.forEach(function (sl) { F3.shown[sl] = 0; F3.glow[sl] = 0; });
    if (window.CakeAudio) CakeAudio.music('score');
    var cv = $('fin3cv'); $('fin3').style.display = 'block'; f3Layout(); $('f3back').style.display = 'none'; $('f3skip').style.display = '';
    F.slots.forEach(function (sl) { try { if (window.Cake3D && Cake3D.supported()) { var im = new Image(); im.src = Cake3D.portrait((st.skins || [])[sl] || 0, C.SLOT_COLORS[sl]); F3.imgs[sl] = im; } } catch (e) {} });
    f3Next(); F3.raf = requestAnimationFrame(f3Frame);
  }
  function f3Layout() {
    var cv = $('fin3cv'), W = window.innerWidth, H = window.innerHeight, dpr = Math.min(2, window.devicePixelRatio || 1); F3.W = W; F3.H = H; F3.dpr = dpr; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    var N = F3.N, sp = 3.0; F3.Rj = 1.0; F3.jh = 2.3; F3.span = Math.max(3, N) * sp;
    F3.jars = F3.F.slots.map(function (sl, j) { return { sl: sl, cx: (j - (N - 1) / 2) * sp, lift: 0, glow: false, crown: false }; });
    F3.rc = Math.max(0.17, Math.min(0.42, Math.pow(0.5 * F3.Rj * F3.Rj * F3.jh * 3 / (4 * F3.cap), 1 / 3))); F3.rs = F3.rc * 1.22;
  }
  function f3Spawn(sl, delay) { F3.q.push({ t: performance.now() + delay * 1000, sl: sl }); }
  function f3Next() {
    var P = F3.ph; if (F3.pi >= P.length - 1) return; F3.pi++; var p = P[F3.pi]; if (window.CakeAudio && (p.k === 'drum2' || p.k === 'win')) CakeAudio.music(null); F3.pt = performance.now(); var F = F3.F, k = p.k, now;
    if (k === 'intro') { f3Drum(0.1, 0.3, true); f3Drum(0.5, 0.3); f3Cymbal(1.1); }
    else if (k === 'cherry') { var items = []; F.slots.forEach(function (sl) { for (var n = 0; n < F.cherry[sl]; n++) items.push({ sl: sl, u: n / Math.max(1, F.cherry[sl]) }); }); items.sort(function (a, b) { return a.u - b.u; }); items.forEach(function (it, j) { f3Spawn(it.sl, 0.6 + j / Math.max(1, items.length) * 2.8); }); }
    else if (k === 'awq') { f3Roll(p.d - 0.05, 0.12, 0.5); f3Cymbal(p.d - 0.02); }
    else if (k === 'awr') { var aw = F.awards[p.i]; if (aw.slots.length) { f3Tone(0.05, 1318, 0.18, 0.1, 'triangle'); f3Tone(0.16, 1760, 0.3, 0.1, 'triangle'); f3Tone(0.3, 2349, 0.5, 0.08, 'sine'); } aw.slots.forEach(function (sl) { F3.glow[sl] = 2.4; for (var n = 0; n < aw.pts; n++) f3Spawn(sl, 0.35 + n * 0.11); }); if (!aw.slots.length) f3Drum(0, 0.3, true); }
    else if (k === 'roll') { F3.stand = performance.now(); f3Roll(p.d, 0.1, 0.65); F3.shakeUntil = performance.now() + p.d * 1000; }
    else if (k === 'rk') { var sl = F3.ranks[p.n]; F3.rk[sl] = p.n + 1; f3Drum(0, 0.55, true); f3Drum(0.12, 0.45); f3Tone(0.05, 660 - p.n * 50, 0.25, 0.07, 'square'); }
    else if (k === 'drum2') { f3Roll(p.d, 0.15, 0.7); F3.shakeUntil = performance.now() + p.d * 1000; }
    else if (k === 'win') { F3.tl = 0; var w = F3.ranks[0]; F3.rk[w] = 1; F3.win = performance.now(); f3Cymbal(0); f3Fanfare(); F3.glow[w] = 1e3; for (var c = 0; c < 140; c++) F3.conf.push({ x: Math.random() * F3.W, y: -20 - Math.random() * F3.H * 0.5, vx: (Math.random() - 0.5) * 80, vy: 80 + Math.random() * 180, a: Math.random() * 6, col: ['#ff6b8b', '#ffd24a', '#6bd0ff', '#9be58a', '#c4b0ff'][c % 5], w: 6 + Math.random() * 6 }); $('f3skip').style.display = 'none'; $('f3back').style.display = isOwner() ? '' : 'none'; F3.done = true; }
  }
  function f3Add(sl) {
    var J = F3.jars.filter(function (j) { return j.sl === sl; })[0]; if (!J) return; var rr = Math.random() * F3.Rj * 0.45, an = Math.random() * 6.283; F3.shown[sl]++;
    if (F3.stars.length > 420) return;
    F3.stars.push({ x: J.cx + Math.cos(an) * rr, y: F3.jh + 0.9 + Math.random() * 0.6, z: Math.sin(an) * rr, vx: (Math.random() - 0.5) * 0.8, vy: -1, vz: (Math.random() - 0.5) * 0.8, ax: Math.random() * 6, ay: Math.random() * 6, az: Math.random() * 6, wx: (Math.random() - 0.5) * 6, wy: (Math.random() - 0.5) * 6, wz: (Math.random() - 0.5) * 6, j: sl, tint: [0.94 + Math.random() * 0.1, 0.92 + Math.random() * 0.1, 0.85 + Math.random() * 0.2] });
  }
  function f3Physics(dt) {
    var S2 = F3.stars, r = F3.rc, g = 15, n = S2.length, sub = 2, s, i, j, Rj = F3.Rj, jh = F3.jh, ex = F3.span / 2 + 2.6;
    for (s = 0; s < sub; s++) {
      var h = dt / sub;
      for (i = 0; i < n; i++) { var a = S2[i]; a.vy -= g * h; a.x += a.vx * h; a.y += a.vy * h; a.z += a.vz * h; a.ax += a.wx * h; a.ay += a.wy * h; a.az += a.wz * h; a.wx *= 0.995; a.wy *= 0.995; a.wz *= 0.995;
        if (a.y < r) { a.y = r; if (a.vy < -5) f3Clink(); a.vy *= -0.2; a.vx *= 0.85; a.vz *= 0.85; a.wx *= 0.8; a.wy *= 0.8; a.wz *= 0.8; if (Math.abs(a.vy) < 0.5) a.vy = 0; }
        if (a.x < -ex) { a.x = -ex; a.vx = Math.abs(a.vx) * 0.3; } if (a.x > ex) { a.x = ex; a.vx = -Math.abs(a.vx) * 0.3; } if (a.z < -2.4) { a.z = -2.4; a.vz = Math.abs(a.vz) * 0.3; } if (a.z > 2.4) { a.z = 2.4; a.vz = -Math.abs(a.vz) * 0.3; }
        for (j = 0; j < F3.jars.length; j++) { var J = F3.jars[j], dx = a.x - J.cx; if (dx > Rj + 2 * r || dx < -Rj - 2 * r) continue; var dz = a.z, d = Math.sqrt(dx * dx + dz * dz), yy = Math.max(0, Math.min(jh, a.y)), er = d - Rj, ey = a.y - yy, dist = Math.sqrt(er * er + ey * ey);
          if (dist < r) { var nr, ny; if (dist < 1e-4) { nr = d < Rj ? -1 : 1; ny = 0; dist = 0; } else { nr = er / dist; ny = ey / dist; } var push = r - dist, ux = d > 1e-4 ? dx / d : 1, uz = d > 1e-4 ? dz / d : 0;
            var nd = d + nr * push; a.x = J.cx + ux * nd; a.z = uz * nd; a.y += ny * push; var vr = a.vx * ux + a.vz * uz, vn = vr * nr + a.vy * ny; if (vn < 0) { var dv = -1.25 * vn; var vt1 = a.vx - vr * ux, vt2 = a.vz - vr * uz; vr += dv * nr; a.vy += dv * ny; a.vx = vt1 + vr * ux; a.vz = vt2 + vr * uz; } } }
      }
      for (var it = 0; it < 2; it++) for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) {
        var p = S2[i], q = S2[j], dx2 = q.x - p.x; if (dx2 > 2 * r || dx2 < -2 * r) continue; var dy2 = q.y - p.y; if (dy2 > 2 * r || dy2 < -2 * r) continue; var dz2 = q.z - p.z; if (dz2 > 2 * r || dz2 < -2 * r) continue; var dd = dx2 * dx2 + dy2 * dy2 + dz2 * dz2; if (dd >= 4 * r * r) continue;
        if (dd < 1e-8) { dx2 = 0.001; dd = 1e-6; } var d3 = Math.sqrt(dd), nx = dx2 / d3, ny2 = dy2 / d3, nz = dz2 / d3, ov = (2 * r - d3) * 0.5; p.x -= nx * ov; p.y -= ny2 * ov; p.z -= nz * ov; q.x += nx * ov; q.y += ny2 * ov; q.z += nz * ov;
        var rvn = (q.vx - p.vx) * nx + (q.vy - p.vy) * ny2 + (q.vz - p.vz) * nz; if (rvn < 0) { var imp = -rvn * 0.6; p.vx -= nx * imp; p.vy -= ny2 * imp; p.vz -= nz * imp; q.vx += nx * imp; q.vy += ny2 * imp; q.vz += nz * imp; if (-rvn > 5) f3Clink(); }
      }
    }
  }
  function f3Proj(x, y, z) { var m = F3.vp; if (!m) return [F3.W / 2, F3.H / 2]; var cx = m[0] * x + m[4] * y + m[8] * z + m[12], cy = m[1] * x + m[5] * y + m[9] * z + m[13], cw = m[3] * x + m[7] * y + m[11] * z + m[15]; return [(cx / cw * 0.5 + 0.5) * F3.W, (1 - (cy / cw * 0.5 + 0.5)) * F3.H]; }
  function f3Frame() {
    if (!F3) return; F3.raf = requestAnimationFrame(f3Frame);
    var st = S.game; if (!st || st.phase !== 'end' || !st.final) { stopF3(); return; }
    var now = performance.now(), dt = Math.min(0.05, (now - F3.last) / 1000); F3.last = now;
    var p = F3.ph[F3.pi]; if (p && now - F3.pt > p.d * 1000) f3Next(); p = F3.ph[F3.pi];
    for (var qi = F3.q.length - 1; qi >= 0; qi--) if (F3.q[qi].t <= now) { f3Add(F3.q[qi].sl); F3.q.splice(qi, 1); }
    f3Physics(dt); for (var gk in F3.glow) if (F3.glow[gk] < 100) F3.glow[gk] = Math.max(0, F3.glow[gk] - dt);
    F3.parts = F3.parts.filter(function (q) { q.t -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 160 * dt; return q.t > 0; });
    F3.conf.forEach(function (q) { q.x += q.vx * dt + Math.sin(q.a) * 20 * dt; q.y += q.vy * dt; q.a += 4 * dt; if (q.y > F3.H + 20) { q.y = -20; q.x = Math.random() * F3.W; } });
    if (F3.win && F3.vp) { var wj = F3.jars.filter(function (j) { return j.sl === F3.ranks[0]; })[0]; if (wj && Math.random() < 0.6) { var c = f3Proj(wj.cx + (Math.random() - 0.5) * 2, F3.jh * Math.random() + wj.lift, 0); F3.parts.push({ x: c[0], y: c[1], vx: (Math.random() - 0.5) * 60, vy: -60 - Math.random() * 90, t: 0.8 + Math.random() * 0.6, c: Math.random() < 0.5 ? '#fff6b0' : '#ffd24a' }); } }
    f3Draw(now, p);
  }
  function f3Draw(now, p) {
    var cv = $('fin3cv'), g = cv.getContext('2d'), W = F3.W, H = F3.H, st = F3.st, F = F3.F, r = F3.rc; g.setTransform(F3.dpr, 0, 0, F3.dpr, 0, 0); g.clearRect(0, 0, W, H);
    var wj = null;
    F3.jars.forEach(function (J) {
      var isWin = F3.win && F3.ranks[0] === J.sl, lift = 0; if (isWin) { var wt = (now - F3.win) / 1000; lift = wt < 0.7 ? Math.sin(wt / 0.7 * Math.PI) * 1.1 + Math.min(wt, 0.7) * 0.3 : 0.2 + Math.sin(wt * 3) * 0.08; wj = J; }
      J.lift = lift; J.glow = F3.glow[J.sl] > 0; J.crown = !!isWin;
    });
    if (!F3.view && !F3.noGL) { try { F3.view = new Cake3D.FinalView($('fin3gl')); } catch (e) { F3.view = null; F3.noGL = 1; } }
    F3.stars.forEach(function (s) { s.ly = 0; if (wj) { var dx = s.x - wj.cx; if (Math.sqrt(dx * dx + s.z * s.z) < F3.Rj + r) s.ly = wj.lift; } });
    var chars = [], trophy = null, nj = F3.jars.length, pk0 = p ? p.k : '', elp = p ? Math.max(0, (now - F3.pt) / 1000) : 0;
    function fall(t, h0) { var tl = Math.sqrt(2 * h0 / 30); if (t < 0) return null; if (t < tl) return { y: h0 - 15 * t * t, sq: 1 }; var b = t - tl; return { y: 2.0 * Math.exp(-b * 4.2) * Math.abs(Math.sin(b * 9)), sq: b < 0.12 ? 1 - (0.12 - b) * 1.2 : 1 }; }
    var skins = st.skins || [];
    if (pk0 === 'awr') {
      var aw0 = F.awards[p.i], nw = aw0.slots.length, leave = Math.max(0, elp - (p.d - 0.35)) / 0.35;
      aw0.slots.forEach(function (sl, k) { var f = fall(elp - k * 0.12, 7); if (!f) return; var hop = elp > 1.2 ? Math.abs(Math.sin((elp - 1.2) * 7)) * 0.45 : 0; chars.push({ sl: sl, skin: skins[sl] || 0, hex: C.SLOT_COLORS[sl], x: (k - (nw - 1) / 2) * 1.7, y: f.y + hop, z: 2.5, s: 0.8 * (1 - leave), sq: f.sq, ry: Math.sin(elp * 3 + k) * 0.25, ph: k * 0.7 }); });
    }
    if (F3.stand) {
      F3.jars.forEach(function (J, ji) {
        var top = 0; F3.stars.forEach(function (s2) { if (s2.j === J.sl) { var dx = s2.x - J.cx; if (dx * dx + s2.z * s2.z < 0.36 && s2.y + F3.rc > top && s2.y < F3.jh + 0.3) top = s2.y + F3.rc * 0.4; } });
        var rest = Math.max(0.15, top - 0.15), f = fall((now - F3.stand) / 1000 - ji * 0.22, Math.max(1, 8 - rest)); if (!f) return; var isW = F3.win && F3.ranks[0] === J.sl, hop = isW ? Math.abs(Math.sin((now - F3.win) / 190)) * 0.22 : 0;
        chars.push({ sl: J.sl, skin: skins[J.sl] || 0, hex: C.SLOT_COLORS[J.sl], x: J.cx, y: rest + f.y * 0.8 + hop + J.lift, z: 0, s: 0.62, sq: f.sq, ry: Math.sin(now / 900 + ji) * 0.3, ph: ji * 0.9 });
      });
    }
    var flat = 1;
    if (F3.win) {
      var wjar = F3.jars.filter(function (j) { return j.sl === F3.ranks[0]; })[0], tt = (now - F3.win) / 1000 - 1.0, TL = Math.sqrt(2 * 12 / 30), bigS = F3.span * 0.26;
      if (wjar && tt >= 0) {
        var tf = fall(tt, 12), b = tt - TL, ty = tf.y, tx = 0, tz = 0.8, ts = bigS;
        if (tt >= TL) { ty = tf.y * 0.25;
          if (!F3.tl) { F3.tl = 1; f3Cymbal(0); f3Clink(); f3Drum(0, 0.7, true); F3.shakeUntil = now + 500; if (F3.vp) { for (var bi = 0; bi < 90; bi++) { var ba = Math.random() * 6.283, bv = 120 + Math.random() * 380, tp = f3Proj((Math.random() - 0.5) * F3.span * 0.9, 0.2, 1.4); F3.parts.push({ x: tp[0], y: tp[1], vx: Math.cos(ba) * bv, vy: Math.sin(ba) * bv * 0.5 - 140, t: 0.7 + Math.random() * 0.8, c: bi % 3 ? '#ffd24a' : '#fff6b0' }); } } }
          flat = b < 0.12 ? 1 - 0.86 * (b / 0.12) : b < 1.3 ? 0.14 : Math.min(1, 0.14 + 0.86 * (1 - Math.exp(-7 * (b - 1.3))));
          if (b > 1.3) { var u2 = Math.min(1, (b - 1.3) / 0.9), e2 = u2 * u2 * (3 - 2 * u2); ty = Math.sin(u2 * Math.PI) * 1.4; tx = (wjar.cx + 1.25) * e2; tz = 0.8 + 1.5 * e2; ts = bigS + (0.7 - bigS) * e2; }
        }
        trophy = { x: tx, y: ty, z: tz, s: ts, sq: tf.sq, ry: tt >= TL + 2.2 ? Math.sin(now / 700) * 0.35 : 0 };
      }
    }
    var pk = p ? p.k : '', md = null; if (pk === 'awq' || pk === 'awr') { var ela = Math.max(0, (now - F3.pt) / 1000), sp = Math.min(1, ela / 0.45); md = { x: 0, y: pk === 'awr' ? 2.55 : F3.jh + 0.55, z: pk === 'awr' ? 2.5 : 0, s: (pk === 'awr' ? 0.7 : 1.05) * popS(sp) + (pk === 'awr' ? Math.max(0, 0.3 - ela) * 0.8 : 0) }; }
    var vp = F3.view ? F3.view.draw({ flat: flat, medal: md, chars: chars, trophy: trophy, jars: F3.jars, stars: F3.stars, Rj: F3.Rj, jh: F3.jh, rs: F3.rs, span: F3.span }, now) : null; if (vp) F3.vp = vp;
    var spotOn = false, tg = [], dark = 0;
    if (pk0 === 'drum2') { var step = Math.floor(elp * 7), hs = function (n) { var x = Math.sin(n * 91.7) * 43758.5; return x - Math.floor(x); }; dark = 0.78; spotOn = true; if (step % 5 !== 4) { var c1 = Math.floor(hs(step) * nj), c2 = Math.floor(hs(step + 50) * nj); tg.push(c1); if (hs(step + 9) > 0.45) tg.push(c2); } }
    else if (pk0 === 'win' && F3.win) { dark = Math.min(0.62, (now - F3.win) / 700 * 0.62); spotOn = true; var wi = F3.jars.indexOf(F3.jars.filter(function (j) { return j.sl === F3.ranks[0]; })[0]); tg.push(wi); }
    if (spotOn) { g.fillStyle = 'rgba(10,6,40,' + dark + ')'; g.fillRect(0, 0, W, H); var pts = tg.map(function (ji) { var J = F3.jars[ji]; return f3Proj(J.cx, 1.3 + J.lift, 0.8); }), rad = Math.min(H * 0.42, W / (nj + 0.5) * 0.7);
      g.globalCompositeOperation = 'destination-out'; pts.forEach(function (c) { var gg = g.createRadialGradient(c[0], c[1], rad * 0.1, c[0], c[1], rad); gg.addColorStop(0, 'rgba(0,0,0,1)'); gg.addColorStop(0.7, 'rgba(0,0,0,0.85)'); gg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gg; g.fillRect(c[0] - rad, c[1] - rad, rad * 2, rad * 2); });
      g.globalCompositeOperation = 'lighter'; pts.forEach(function (c) { var gg = g.createLinearGradient(0, 0, 0, c[1] + rad * 0.5); gg.addColorStop(0, 'rgba(255,245,190,0.5)'); gg.addColorStop(1, 'rgba(255,245,190,0.04)'); g.fillStyle = gg; g.beginPath(); g.moveTo(c[0] - 14, -10); g.lineTo(c[0] + 14, -10); g.lineTo(c[0] + rad * 0.62, c[1] + rad * 0.5); g.lineTo(c[0] - rad * 0.62, c[1] + rad * 0.5); g.closePath(); g.fill(); }); g.globalCompositeOperation = 'source-over'; }
    for (var b = 0; b < 26; b++) { var bx = (b * 197 % W), by = (b * 83 % (H * 0.5)), tw = 0.5 + 0.5 * Math.sin(now / 600 + b); g.fillStyle = 'rgba(255,255,255,' + (0.1 + tw * 0.25) + ')'; g.fillRect(bx, by, 3, 3); }
    g.globalCompositeOperation = 'lighter'; F3.jars.forEach(function (J) { if (F3.glow[J.sl] > 0) { var c = f3Proj(J.cx, F3.jh * 0.5 + J.lift, 0), rad = H * 0.32, gg = g.createRadialGradient(c[0], c[1], 5, c[0], c[1], rad); gg.addColorStop(0, 'rgba(255,230,120,0.4)'); gg.addColorStop(1, 'rgba(255,230,120,0)'); g.fillStyle = gg; g.fillRect(c[0] - rad, c[1] - rad, rad * 2, rad * 2); } }); g.globalCompositeOperation = 'source-over';
    F3.jars.forEach(function (J) {
      var sl = J.sl, isWin = F3.win && F3.ranks[0] === sl, im = F3.imgs[sl], bp = f3Proj(J.cx, 0, 2.7), top = f3Proj(J.cx, F3.jh + 0.2 + J.lift, 0), cw = W / (F3.N + 1), pr = Math.min(34, cw * 0.16), py = Math.min(bp[1] + 14, H - 70);
      ptextO(g, st.names[sl] + (sl === S.slot ? ' (คุณ)' : ''), bp[0], py + 6, Math.min(22, cw * 0.1), '#fff');
      ptextO(g, String(F3.shown[sl]), bp[0], py + 38, Math.min(34, cw * 0.15), '#ffd24a');
      if (F3.rk[sl] && !isWin) ptextO(g, 'อันดับ ' + F3.rk[sl], top[0], top[1] - 6, 24, '#fff');
    });
    F3.parts.forEach(function (q) { g.globalAlpha = Math.max(0, Math.min(1, q.t * 1.6)); g.fillStyle = q.c; g.fillRect(Math.round(q.x), Math.round(q.y), 5, 5); g.fillRect(Math.round(q.x) - 3, Math.round(q.y) + 1, 11, 3); }); g.globalAlpha = 1;
    F3.conf.forEach(function (q) { g.save(); g.translate(q.x, q.y); g.rotate(q.a); g.fillStyle = q.col; g.fillRect(-q.w / 2, -2, q.w, 4); g.restore(); });
    var k = p ? p.k : '', el = p ? Math.max(0, (now - F3.pt) / 1000) : 0, A = CakeGame.AWARDS;
    function title(t, sz, y, col) { ptextO(g, t, W / 2, y, sz, col || '#fff'); }
    if (k === 'intro') { title('สรุปคะแนน', Math.min(64, W / 14), H * 0.14, '#ffd24a'); title('ใครจะได้ดาวมากที่สุด?', 22, H * 0.22); }
    else if (k === 'cherry') { var ci = hudImg('cherry'); title('เชอร์รี่ที่ซื้อได้', 36, H * 0.1, '#ff8fa8'); if (ci.complete) g.drawImage(ci, W / 2 - 190, H * 0.1 - 24, 48, 48); title('1 เชอร์รี่ = ' + CakeGame.G.CHERRY_POINTS + ' ดาว', 20, H * 0.17); }
    else if (k === 'awq' || k === 'awr') {
      var aw = F.awards[p.i], def = A.filter(function (x) { return x.id === aw.id; })[0], ch2 = Math.min(H * 0.17, 104), cw2 = Math.min(560, W * 0.8), cx = W / 2 - cw2 / 2, cy = H * 0.03, slide = Math.min(1, el / 0.35); cy -= (1 - slide) * 160;
      g.fillStyle = '#4a1f45'; g.fillRect(cx - 4, cy - 4, cw2 + 8, ch2 + 8); g.fillStyle = '#fff0f6'; g.fillRect(cx, cy, cw2, ch2); g.fillStyle = '#ff8fb8'; g.fillRect(cx, cy, cw2, 6);
            ptextO(g, 'รางวัล ' + def.name, cx + cw2 / 2, cy + ch2 * 0.26, 28, '#ffd24a', 'center'); g.font = 'bold 17px TAGBA'; g.fillStyle = '#6a3a58'; g.textAlign = 'center'; g.fillText(def.desc, cx + cw2 / 2, cy + ch2 * 0.5);
      var msg = k === 'awq' ? 'ใครจะได้รับรางวัลนี้…?' + '.'.repeat(Math.floor(el * 3) % 4) : aw.slots.length ? aw.slots.map(function (sl) { return st.names[sl]; }).join(' & ') + '  (' + aw.val + ' ' + def.unit + ')  +' + aw.pts + ' ดาว' : 'ไม่มีใครได้รางวัลนี้';
      var pop = k === 'awr' ? 1 + Math.max(0, 0.25 - el) * 2 : 1; g.save(); g.translate(cx + cw2 / 2, cy + ch2 * 0.8); g.scale(pop, pop); ptextO(g, msg, 0, 0, k === 'awr' ? 22 : 20, k === 'awr' && aw.slots.length ? '#ffe066' : '#b3367a'); g.restore();
    }
    else if (k === 'roll' || k === 'drum2') { title(k === 'roll' ? 'นับคะแนนรวม…' : 'ใครคือผู้ชนะ?', 40, H * 0.1, '#ffd24a'); }
    else if (k === 'rk') { title('อันดับ ' + (p.n + 1) + ' คือ ' + st.names[F3.ranks[p.n]] + '!', 34, H * 0.1, '#fff'); }
    else if (k === 'win') { var wp = Math.min(1, (now - F3.win) / 500), sc2 = 0.5 + 0.5 * popS(wp); g.save(); g.translate(W / 2, H * 0.08); g.scale(sc2, sc2); ptextO(g, 'ผู้ชนะคือ ' + st.names[F3.ranks[0]] + '!', 0, 0, Math.min(56, W / 16), '#ffd24a'); g.restore(); }
  }
  var F3IMG = {};
  function f3Img(u) { if (!F3IMG[u]) { var i = new Image(); i.src = u; F3IMG[u] = i; } return F3IMG[u]; }
  function hudImg(kind) { return f3Img(hudIcon(kind)); }
  function f3Skip() {
    if (!F3 || F3.done) return; var F = F3.F, stl = F3.stars.length;
    F3.q = []; F.slots.forEach(function (sl) { var need = F3.tot[sl] - F3.shown[sl]; for (var n = 0; n < need; n++) f3Add(sl); });
    F.slots.forEach(function (sl) { F3.glow[sl] = 0; }); for (var i = 0; i < 360; i++) f3Physics(1 / 60);
    if (F3.bus) { try { F3.bus.gain.setTargetAtTime(0, AU.ctx.currentTime, 0.02); } catch (e) {} F3.bus = null; }
    F3.shakeUntil = 0; F3.pi = F3.ph.length - 2; F.slots.forEach(function (sl, i) { }); F3.ranks.forEach(function (sl, i) { if (i > 0) F3.rk[sl] = i + 1; }); f3Next();
  }
  function stopF3() { if (!F3) return; cancelAnimationFrame(F3.raf); if (F3.bus) { try { F3.bus.disconnect(); } catch (e) {} } F3 = null; $('fin3').style.display = 'none'; }
  window.addEventListener('resize', function () { if (F3) f3Layout(); });
  function renderFinal(st) {
    $('mgres').style.display = 'none'; if (!F3) startF3(st); return;
    var box = $('mgres'), F = st.final; if (!F) return;
    if (!S.fin) {
      S.fin = { t0: performance.now(), key: '', skip: false };
      S.fin.iv = setInterval(function () { var g = S.game; if (g && g.phase === 'end' && g.final) finalTick(g); else { clearInterval(S.fin && S.fin.iv); } }, 120);
    }
    finalTick(st);
  }
  function finalSteps(F) {   // [{t:'intro'|'cherry'|'award'|'rank', i, d}]
    var ls = [{ t: 'intro', d: 1800 }, { t: 'cherry', d: 3200 }]; F.awards.forEach(function (a, i) { ls.push({ t: 'award', i: i, d: a.slots.length ? 4600 : 2200 }); }); ls.push({ t: 'rank', d: 1e12 }); return ls;
  }
  function finalTick(st) {
    var F = st.final, fin = S.fin, box = $('mgres'); if (!fin) return;
    var steps = finalSteps(F), el = performance.now() - fin.t0, k = 0, acc = 0, i;
    if (fin.skip) { k = steps.length - 1; el = 1e9; } else { for (i = 0; i < steps.length; i++) { if (el < acc + steps[i].d || i === steps.length - 1) { k = i; break; } acc += steps[i].d; } }
    var sub = Math.min(1, Math.max(0, (el - acc) / 1000)), phase2 = steps[k].t === 'award' ? (el - acc > 1900 ? 1 : 0) : 0;
    var key = k + ':' + phase2; if (key === fin.key) return; fin.key = key;
    var A = CakeGame.AWARDS, tot = F.cherry.slice(), shown = {};
    for (i = 0; i < F.awards.length; i++) { var done = i < k - 2 || (i === k - 2 && steps[k].t === 'award' && phase2) || steps[k].t === 'rank'; if (done) F.awards[i].slots.forEach(function (sl) { tot[sl] += F.awards[i].pts; }); }
    var showCherry = steps[k].t !== 'intro';
    box.style.display = ''; box.textContent = ''; box.className = 'final';
    var h = document.createElement('h2'); h.textContent = steps[k].t === 'rank' ? 'ผลสุดท้าย' : 'สรุปคะแนน'; box.appendChild(h);
    if (steps[k].t === 'award') {
      var aw = F.awards[steps[k].i], def = A.filter(function (x) { return x.id === aw.id; })[0], card = document.createElement('div'); card.className = 'awcard' + (phase2 ? ' rev' : '');
      var ic = document.createElement('div'); ic.className = 'awic'; var mi = document.createElement('img'); mi.src = medalIcon(['#ffd24a', '#ff8fb8', '#8fd0ff', '#9be58a', '#c4b0ff'][AWARD_IDX(def.id) % 5]); ic.appendChild(mi); var tt = document.createElement('div'); tt.className = 'awt'; tt.textContent = 'รางวัล ' + def.name;
      var ds = document.createElement('div'); ds.className = 'awd'; ds.textContent = def.desc;
      var wn = document.createElement('div'); wn.className = 'awn';
      wn.textContent = !phase2 ? 'ใครจะได้รับรางวัลนี้…?' : aw.slots.length ? aw.slots.map(function (sl) { return st.names[sl]; }).join(' & ') + '  (' + aw.val + ' ' + def.unit + ')  +' + aw.pts + ' ★' : 'ไม่มีใครเด่นพอ — ไม่มีผู้ได้รางวัล';
      card.appendChild(ic); card.appendChild(tt); card.appendChild(ds); card.appendChild(wn); box.appendChild(card);
    }
    var order = F.slots.slice(); if (steps[k].t === 'rank') order.sort(function (a, b) { return tot[b] - tot[a] || F.coins[b] - F.coins[a]; });
    var rank = 0;
    order.forEach(function (sl, j) {
      var d = document.createElement('div'); d.className = 'rr' + (steps[k].t === 'rank' ? ' r' + (j + 1) : ''); d.style.setProperty('--pb', C.SLOT_COLORS[sl]);
      var n = document.createElement('b'); n.className = 'rk'; n.textContent = steps[k].t === 'rank' ? j + 1 : '•';
      var nm = document.createElement('span'); nm.className = 'rn'; nm.textContent = st.names[sl] + (sl === S.slot ? ' (คุณ)' : '');
      var sc = document.createElement('span'); sc.className = 'rs'; sc.textContent = showCherry ? tot[sl] + ' ★' : '? ★';
      var ex = document.createElement('span'); ex.className = 'rx'; ex.textContent = F.coins[sl] + ' เหรียญ';
      var hl = steps[k].t === 'award' && phase2 && F.awards[steps[k].i].slots.indexOf(sl) >= 0; if (hl) d.className += ' hl';
      d.appendChild(n); d.appendChild(nm); d.appendChild(sc); d.appendChild(ex); box.appendChild(d);
    });
    if (steps[k].t === 'rank') { var w = document.createElement('div'); w.className = 'awn win'; w.textContent = 'ผู้ชนะคือ ' + st.names[order[0]]; box.appendChild(w); }
    else { var sk = document.createElement('button'); sk.className = 'ghost'; sk.textContent = 'ข้ามไปดูผลสุดท้าย ▶'; sk.onclick = function () { fin.skip = true; fin.key = ''; finalTick(S.game); }; box.appendChild(sk); }
  }


  /* ไอคอนพิกเซล HUD (วาดด้วยโค้ด + ขอบเข้มอัตโนมัติ) */
  function AWARD_IDX(id) { for (var i = 0; i < CakeGame.AWARDS.length; i++) if (CakeGame.AWARDS[i].id === id) return i; return 0; }
  var MEDALS = {};
  function medalIcon(col) {
    if (MEDALS[col]) return MEDALS[col];
    var c = document.createElement('canvas'); c.width = c.height = 20; var g = c.getContext('2d');
    function R(x, y, w, h, k) { g.fillStyle = k; g.fillRect(x, y, w, h); }
    R(5, 0, 3, 7, '#e0314f'); R(12, 0, 3, 7, '#3a7bd5'); R(8, 0, 4, 5, '#ff8fa8');
    R(4, 7, 12, 12, '#4a1f45'); R(3, 9, 14, 8, '#4a1f45'); R(5, 8, 10, 10, col); R(4, 10, 12, 6, col); R(6, 9, 8, 2, 'rgba(255,255,255,.55)');
    R(9, 11, 2, 5, '#4a1f45'); R(8, 12, 4, 2, '#4a1f45');
    return (MEDALS[col] = c.toDataURL());
  }
  var HUDIC = {};
  function hudIcon(kind) {
    if (HUDIC[kind]) return HUDIC[kind];
    try { if (window.Cake3D && Cake3D.supported()) { var u3 = Cake3D.icon3d(kind, 96); if (u3) return (HUDIC[kind] = u3); } } catch (e3) {}
    var c = document.createElement('canvas'); c.width = c.height = 18; var g = c.getContext('2d'); g.translate(1, 1);
    function R(x, y, w, h, col) { g.fillStyle = col; g.fillRect(x, y, w, h); }
    if (kind === 'cherry') {
      R(8, 1, 1, 3, '#3a9b3a'); R(9, 0, 3, 1, '#3a9b3a'); R(12, 1, 1, 1, '#3a9b3a'); R(6, 4, 2, 2, '#3a9b3a'); R(11, 2, 1, 4, '#3a9b3a'); R(10, 5, 1, 2, '#3a9b3a');
      R(2, 8, 6, 6, '#e0314f'); R(3, 7, 4, 8, '#e0314f'); R(9, 7, 6, 6, '#e0314f'); R(10, 6, 4, 8, '#e0314f');
      R(3, 9, 2, 2, '#ff9aa8'); R(10, 8, 2, 2, '#ff9aa8');
    } else if (kind === 'coin') {
      R(4, 0, 8, 16, '#ffc928'); R(2, 2, 12, 12, '#ffc928'); R(0, 4, 16, 8, '#ffc928'); R(4, 2, 8, 12, '#ffe27a'); R(2, 4, 12, 8, '#ffe27a');
      R(5, 3, 6, 10, '#ffd24a'); R(3, 5, 10, 6, '#ffd24a');
      R(7, 3, 2, 10, '#a86a00'); R(5, 5, 6, 1, '#a86a00'); R(5, 7, 6, 1, '#a86a00'); R(5, 9, 6, 1, '#a86a00'); R(5, 5, 1, 3, '#a86a00'); R(10, 8, 1, 2, '#a86a00');
    } else {
      R(5, 0, 6, 1, '#7a4a2a'); R(4, 1, 1, 4, '#7a4a2a'); R(11, 1, 1, 4, '#7a4a2a'); R(5, 1, 1, 1, '#7a4a2a'); R(10, 1, 1, 1, '#7a4a2a');
      R(1, 5, 14, 11, '#ff7d98'); R(1, 5, 14, 3, '#ffb0c4'); R(1, 14, 14, 2, '#e0577a'); R(6, 8, 4, 3, '#ffd24a'); R(7, 9, 2, 1, '#b3841f');
    }
    var id = g.getImageData(-1, -1, 18, 18), d = id.data, o = new Uint8ClampedArray(d), W = 18;
    for (var y = 0; y < W; y++) for (var x = 0; x < W; x++) if (!d[(y * W + x) * 4 + 3]) {
      var nb = (x > 0 && d[(y * W + x - 1) * 4 + 3]) || (x < W - 1 && d[(y * W + x + 1) * 4 + 3]) || (y > 0 && d[((y - 1) * W + x) * 4 + 3]) || (y < W - 1 && d[((y + 1) * W + x) * 4 + 3]);
      if (nb) { var k = (y * W + x) * 4; o[k] = 74; o[k + 1] = 31; o[k + 2] = 69; o[k + 3] = 255; }
    }
    g.setTransform(1, 0, 0, 1, 0, 0); g.putImageData(new ImageData(o, W, W), 0, 0);
    return (HUDIC[kind] = c.toDataURL());
  }
  function renderHudSide(st) {
    var me = S.slot < 0 ? 0 : S.slot, ord = st.order.slice();
    Object.keys(st.names).forEach(function (k) { if (ord.indexOf(+k) < 0) ord.push(+k); });
    var rk = ord.map(function (sl, i) { return { sl: sl, i: i }; }).sort(function (a, b) { return (st.pos[b.sl] || 0) - (st.pos[a.sl] || 0) || a.i - b.i; }).map(function (e) { return e.sl; });
    $('hm-rk').textContent = rk.indexOf(me) + 1;
    $('hs-ch').textContent = (st.cn || [])[me] || 0; $('hs-co').textContent = st.coins[me] || 0;
    $('hs-price').textContent = 'เชอร์รี่ราคา ' + st.price;
    $('ic-cherry').src = hudIcon('cherry'); $('ic-coin').src = hudIcon('coin');
    $('hr-n').textContent = Math.min(st.round, st.rounds) + '/' + st.rounds;
    var box = $('hud-rank'), cur = st.phase === 'roll' ? st.order[st.turn] : -1; box.textContent = '';
    rk.forEach(function (sl, i) {
      var r = document.createElement('div'); r.className = 'hr-row' + (sl === cur ? ' turn' : '') + (sl === me ? ' me' : ''); r.title = st.names[sl] || '';
      var n = document.createElement('span'); n.textContent = (i + 1) + '.';
      var f = document.createElement('div'); f.className = 'hr-face'; f.style.borderColor = C.SLOT_COLORS[sl];
      try { if (window.Cake3D && Cake3D.supported()) { var im = document.createElement('img'); im.src = Cake3D.portrait((st.skins || [])[sl] || 0, C.SLOT_COLORS[sl]); f.appendChild(im); } } catch (e) {}
      r.appendChild(n); r.appendChild(f); box.appendChild(r);
    });
  }
  function renderGameHud() {
    var st = S.game; if (!st) return;
    $('ginfo').textContent = 'รอบที่ ' + Math.min(st.round, st.rounds) + '/' + st.rounds + ' · เชอร์รี่ราคา ' + st.price + ' เหรียญ' + (S.mode === 'solo' ? ' · ออฟไลน์' : '');
    renderHudSide(st);
    $('gmsg').textContent = st.msg;
    var mine = st.phase === 'roll' && st.order[st.turn] === S.slot;
    var intro = st.phase === 'intro';
    $('btn-skip').style.display = intro ? '' : 'none';
    $('btn-skip').disabled = S.skipSent;
    $('btn-skip').textContent = S.skipSent ? 'รอเพื่อนกดข้าม (' + st.skips.length + '/' + st.order.length + ')' : 'ข้ามฉากเปิด ▶' + (st.skips.length ? ' (' + st.skips.length + '/' + st.order.length + ')' : '');
    renderItems(st); renderShop(st); renderResults(st); renderCherry(st);

  }

  function send(m) {
    var st = S.game; if (!st) return;
    if (isHost()) {
      var g = S.room && S.room.game; if (!g) return;
      if (m.t === 'use') g.useItem(S.slot, m.i, m.target);
      else if (m.t === 'buy') g.buy(S.slot, m.i);
      else if (m.t === 'leave') g.leaveShop(S.slot);
      else if (m.t === 'skip') g.skipIntro(S.slot);
      else if (m.t === 'cherry') g.cherryChoice(S.slot, !!m.yes);
    } else if (S.net) S.net.send(m);
  }

  function showItemPop(id) {
    var it = CakeGame.ITEMS[id]; if (!it) return;
    var el = document.createElement('div'); el.className = 'itempop';
    el.appendChild(Icons.make(id, 96)); var h = document.createElement('b'); h.textContent = 'ได้รับ ' + it.name + '!'; var s = document.createElement('small'); s.textContent = it.desc;
    el.appendChild(h); el.appendChild(s); document.body.appendChild(el); setTimeout(function () { el.remove(); }, 1900);
  }
  function showTip(el, title, desc) {
    var tp = $('tip');
    el.onmouseenter = el.onmousemove = function (e) { tp.innerHTML = ''; var b = document.createElement('b'); b.textContent = title; tp.appendChild(b); tp.appendChild(document.createTextNode(desc)); tp.style.display = 'block'; var x = Math.min(innerWidth - 240, e.clientX + 14), y = e.clientY - tp.offsetHeight - 14; tp.style.left = x + 'px'; tp.style.top = Math.max(6, y) + 'px'; };
    el.onmouseleave = function () { tp.style.display = 'none'; };
  }
  function renderItems(st) {
    var box = $('gitems');
    if (st.phase === 'intro' || st.phase === 'end' || st.phase === 'mgprep' || st.phase === 'mg' || st.phase === 'mini') { box.style.display = 'none'; box.dataset.k = ''; $('tip').style.display = 'none'; return; }
    box.style.display = 'flex';
    var mine = st.items[S.slot] || [], myTurn = st.phase === 'roll' && st.order[st.turn] === S.slot, fresh = mine.length > (S.itemCount === undefined ? 1e9 : S.itemCount);
    S.itemCount = mine.length;
    var key = mine.length + '|' + myTurn + '|' + fresh;   // ไม่สร้างปุ่มกระเป๋าใหม่ทุกครั้งที่สถานะอัปเดต (ไม่งั้นกดค้างแล้วปุ่มถูกแทนที่ คลิกไม่ติด)
    if (box.dataset.k === key && box.firstChild) { $('tip').style.display = 'none'; if (S.invOpen) invSync(); return; }
    box.dataset.k = key; box.textContent = ''; $('tip').style.display = 'none';
    var ip = document.createElement('div'); ip.className = 'invpill' + (myTurn || fresh ? ' fresh' : '');
    var bi = document.createElement('img'); bi.src = hudIcon('bag'); ip.appendChild(bi); var ek = document.createElement('b'); ek.className = 'ek'; ek.textContent = 'E'; ip.appendChild(ek);
    if (mine.length) { var cn = document.createElement('i'); cn.className = 'cnt'; cn.textContent = mine.length; ip.appendChild(cn); }
    ip.title = myTurn ? 'กด E เปิดเมนู · ทอยลูกเต๋า' : 'กด E เปิดเมนู'; S.dieLbl = ip;
    ip.onclick = function () { openInv(); }; box.appendChild(ip);
    if (!myTurn) S.pickItem = -1;
    if (S.invOpen) invSync();
  }
  function i0(box, d) { return Array.prototype.indexOf.call(box.children, d); }

  function renderCherry(st) {
    var box = $('cherrybox');
    if (st.phase !== 'cherry') { box.style.display = 'none'; box.dataset.k = ''; return; }
    var mine = st.cs === S.slot, k = 'c' + st.cs + (mine ? 'm' : 'o');
    box.style.display = 'flex';
    if (box.dataset.k === k) return; box.dataset.k = k; box.textContent = '';
    var h = document.createElement('h2'); box.appendChild(h);
    if (!mine) { h.textContent = (st.names[st.cs] || '') + ' กำลังตัดสินใจซื้อเชอร์รี่…'; return; }
    h.textContent = 'ซื้อเชอร์รี่ ' + st.price + ' เหรียญ ไหม?';
    var row = document.createElement('div'); row.className = 'row';
    var y = document.createElement('button'); y.className = 'startbtn2'; y.textContent = 'ซื้อเลย! (' + st.price + ')'; y.disabled = st.coins[S.slot] < st.price;
    var n = document.createElement('button'); n.className = 'ghost'; n.textContent = 'ไม่ซื้อ';
    y.onclick = function () { send({ t: 'cherry', yes: true }); }; n.onclick = function () { send({ t: 'cherry', yes: false }); };
    row.appendChild(y); row.appendChild(n); box.appendChild(row);
  }
  function renderShop(st) {
    var box = $('gshop'); box.style.display = 'none'; box.textContent = '';
    if (st.phase !== 'shop' || !st.shop) { if (S.shopOn) { S.shopOn = false; if (S.inv) S.inv.shop = null; if (!S.spec && !S.invOpen && !S.rolling) $('inv').style.display = 'none'; $('inv').className = ''; } return; }
    if (S.invOpen) closeInv(); ensureInv();
    var mine = st.shop.slot === S.slot, v = S.inv;
    S.shopOn = true; S.rolling = false; v.roll = null; v.use = null;
    var full = (st.items[S.slot] || []).length >= CakeGame.MAX_ITEMS;
    var hv = v.shop ? v.shop.hover : -1;
    v.shop = { stock: st.shop.stock.slice(), hover: hv, mine: mine, can: st.shop.stock.map(function (id) { var it = id && CakeGame.ITEMS[id]; return !!(mine && it && st.coins[S.slot] >= it.price && !full); }), full: full };
    $('inv').className = 'shopm'; $('inv').style.display = 'block'; $('invclose').textContent = 'ออกจากร้าน'; $('invclose').style.display = mine ? 'block' : 'none'; $('invclose').onclick = function () { send({ t: 'leave' }); };
    shopText(st);
  }
  function shopText(st) {
    var v = S.inv, sh = v.shop, mine = st.shop.slot === S.slot, left = Math.max(0, Math.ceil(st.tl - (performance.now() - S.gameAt) / 1000));
    var id = sh.hover >= 0 && sh.stock[sh.hover], it = id && CakeGame.ITEMS[id];
    $('invname').textContent = it ? it.name : 'ร้านค้า — ' + st.names[st.shop.slot] + (mine ? ' (คุณ)' : ' กำลังเลือกซื้อ') + (left > 900 ? '' : ' (' + left + ' วิ)');
    $('invdesc').textContent = it ? it.desc : '';
    $('invhint').textContent = !mine ? '' : it ? (sh.can[sh.hover] ? 'คลิกเพื่อซื้อ' : sh.full ? 'กระเป๋าไอเทมเต็ม' : 'เหรียญไม่พอ') : 'เลื่อนเมาส์ไปที่ไอเทมเพื่อดูรายละเอียด · คลิกเพื่อซื้อ';
  }

  /* ---------- คลังไอเทม 3D ---------- */
  var BAD_PH = /^(intro|end|mgprep|mg|mini)$/;
  var NORMAL_IT = { name: 'ลูกเต๋าธรรมดา', desc: 'ทอยได้ 1-6 ใช้ได้ไม่จำกัด', kind: 'n' };
  function itOf(id) { return id === 'normal' ? NORMAL_IT : CakeGame.ITEMS[id]; }
  function invUniq(st) { var m = (st && st.items[S.slot]) || [], r = ['normal']; m.forEach(function (id) { if (r.indexOf(id) < 0) r.push(id); }); return r; }
  function invCount(st, id) { if (id === 'normal') return '∞'; return ((st && st.items[S.slot]) || []).filter(function (x) { return x === id; }).length; }
  function ensureInv() {
    if (S.inv) return;
    S.inv = new InvView($('invcv'), $('invfx'));
    S.inv.tgMark = function () { if (!S.invTg || !S.tgView || !S.tgView.pr) return null; var cv = S.tgView, tp = cv.tokPos && cv.tokPos[S.invTg.list[S.invTg.i]]; if (!tp) return null; var p = cv.pr(tp[0], tp[1] + 1.5, tp[2]); return p ? [p[0] / cv.W, p[1] / cv.H] : null; };
    $('invcv').addEventListener('wheel', function (e) {
      e.preventDefault(); if (S.inv.use || S.spec || S.shopOn) return;
      S.inv.move(e.deltaY > 0 ? 1 : -1); invSync();
    }, { passive: false });
    $('invcv').addEventListener('mousemove', function (e) { if (!S.shopOn || !S.inv.shop) return; var r = $('invcv').getBoundingClientRect(), h = S.inv.shopHit((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); if (h !== S.inv.shop.hover) { S.inv.shop.hover = h; shopText(S.game); } });
    $('invcv').addEventListener('click', function (e) {
      if (S.shopOn && S.inv.shop) { var r0 = $('invcv').getBoundingClientRect(), h0 = S.inv.shopHit((e.clientX - r0.left) / r0.width, (e.clientY - r0.top) / r0.height); if (h0 >= 0 && S.inv.shop.can[h0]) send({ t: 'buy', i: h0 }); return; }
      if (S.inv.use || S.spec) return; var r = $('invcv').getBoundingClientRect(), d = S.inv.hit((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
      if (d === null) { closeInv(); return; }
      if (d !== 0) { S.inv.sel = Math.max(0, Math.min(S.inv.list.length - 1, S.inv.sel + d)); S.inv.info = false; invSync(); return; }
      if (!S.inv.info) { S.inv.info = true; invSync(); return; }
      invTryUse();
    });
  }
  function openInv() {
    var st = S.game; if (!st || BAD_PH.test(st.phase) || S.spec || S.shopOn || st.phase === 'shop') return; ensureInv();
    S.invOpen = true; S.invMsg = ''; S.inv.info = false; invTgClear(); $('inv').className = ''; $('inv').style.display = 'block'; S.inv.setItems(invUniq(st)); invSync();
  }
  function closeInv() { S.invOpen = false; invTgClear(); if ($('inv') && !S.spec) $('inv').style.display = 'none'; if (S.inv && !S.spec) S.inv.use = null; }
  function invTgClear() { S.invTg = null; if ($('pickui')) $('pickui').style.display = 'none'; }
  function invTgDraw() {
    var st = S.game; if (!S.invTg || !st) return;
    var o = S.invTg.list[S.invTg.i], n = S.invTg.list.length;
    $('pkname').textContent = st.names[o] || ''; $('pktitle').textContent = 'เลือกเป้าหมาย ' + (S.invTg.i + 1) + '/' + n + ' · ' + (CakeGame.ITEMS[S.invTg.id] || {}).name;
  }
  function pickMove(d) { if (!S.invTg) return; var n = S.invTg.list.length; S.invTg.i = (S.invTg.i + d + n) % n; invTgDraw(); }
  function pickStart(id, others) {
    S.invTg = { list: others, i: 0, id: id }; $('inv').style.display = 'none'; $('pickui').style.display = 'block'; invTgDraw();
  }
  function pickBack() { invTgClear(); if (S.invOpen) { $('inv').className = ''; $('inv').style.display = 'block'; invSync(); } }
  function pickOk() {
    var tg = S.invTg; if (!tg) return; invTgClear(); $('inv').className = ''; $('inv').style.display = 'block';
    var id = tg.id; S.inv.sel = Math.max(0, S.inv.list.indexOf(id)); invGo(id, tg.list[tg.i], tg.i);
  }
  (function () {
    var w = function (id, f) { var el = $(id); if (el) el.onclick = f; };
    w('pkframe', pickOk); var pu0 = $('pickui'); if (pu0) pu0.addEventListener('contextmenu', function (e) { e.preventDefault(); pickBack(); });
    w('pkprev', function () { pickMove(-1); }); w('pknext', function () { pickMove(1); }); w('pkok', pickOk); w('pkcancel', pickBack);
    var pu = $('pickui'); if (pu) pu.addEventListener('wheel', function (e) { e.preventDefault(); pickMove(e.deltaY > 0 ? 1 : -1); }, { passive: false });
  })();
  function invSync() {
    var st = S.game; if (S.spec) return; if (!st || BAD_PH.test(st.phase)) { closeInv(); return; }
    var v = S.inv; v.setItems(invUniq(st)); v.counts = {}; v.list.forEach(function (k) { v.counts[k] = invCount(st, k); });
    var id = v.list[v.sel], it = id && itOf(id), myTurn = st.phase === 'roll' && st.order[st.turn] === S.slot;
    $('invname').textContent = it ? it.name + (id !== 'normal' && invCount(st, id) > 1 ? '  x' + invCount(st, id) : '') : 'ยังไม่มีไอเทม';
    $('invdesc').textContent = it && v.info ? it.desc : '';
    var tx = !it ? 'ไปเก็บไอเทมจากช่องปริศนาหรือร้านค้าได้เลย' : v.use ? '' : S.invTg ? 'เลื่อนล้อเมาส์เลือกเป้าหมาย · คลิกตัวละครเพื่อใช้ · คลิกขวาเพื่อยกเลิก' : !v.info ? 'เลื่อนล้อเมาส์เพื่อเลือก · คลิกไอเทมเพื่อดูรายละเอียด · คลิกที่ว่าง/กด E เพื่อปิด' : myTurn ? 'คลิกอีกครั้งเพื่อใช้ไอเทมนี้' : 'ใช้ได้ตอนถึงตาของเราก่อนทอยเท่านั้น';
    if (S.invMsg) tx = S.invMsg; $('invhint').textContent = tx;
  }
  function invTryUse() {
    var st = S.game, v = S.inv, id = v.list[v.sel], it = id && itOf(id); if (!it) return;
    S.invMsg = '';
    if (!(st.phase === 'roll' && st.order[st.turn] === S.slot)) { S.invMsg = 'ใช้ได้ตอนถึงตาของเราก่อนทอยเท่านั้น'; invSync(); return; }
    if ((it.kind === 'd' || it.kind === 'n') && st.mod && st.mod[S.slot]) { S.invMsg = 'เลือกเต๋าพิเศษได้เพียง 1 ลูกต่อตา'; invSync(); return; }
    var others = st.order.filter(function (o) { return o !== S.slot; });
    if (it.target && !others.length) { S.invMsg = 'ไม่มีเพื่อนให้ใช้'; invSync(); return; }
    if (it.target && others.length > 1) { pickStart(id, others); return; }
    invGo(id, it.target ? others[0] : undefined, 0);
  }
  function invGo(id, target, side) {
    var st = S.game, idx = st.items[S.slot].indexOf(id); if (id !== 'normal' && idx < 0) return; S.invMsg = ''; invSync();
    var kd = id === 'normal' || CakeGame.ITEMS[id].kind === 'd';
    if (id !== 'normal') sfx(useSnd(id));
    S.inv.startUse(id, function () { if (id !== 'normal') send({ t: 'use', i: idx, target: target }); closeInv(); if (kd) doRoll(); }, side % 2 ? -1 : 1); invSync();
  }
  // ให้ผู้เล่นคนอื่นเห็นตอนมีคนใช้ไอเทม
  function invSpectate(st) {
    var f = st.useFx; if (!f) return;
    if (S.useSeen === undefined || S.useSeen < 0) { S.useSeen = f.seq; return; }
    if (f.seq <= S.useSeen) return; S.useSeen = f.seq;
    if (f.slot === S.slot || S.invOpen || S.spec || !f.id) return;
    ensureInv(); var v = S.inv, it = CakeGame.ITEMS[f.id];
    sfx(useSnd(f.id)); S.spec = true; $('inv').className = 'spec'; $('inv').style.display = 'block'; v.list = [f.id]; v.sel = 0; v.pos = 0; v.info = false;
    $('invname').textContent = st.names[f.slot] + ' ใช้ ' + it.name + (f.target >= 0 ? ' กับ ' + st.names[f.target] : ''); $('invdesc').textContent = ''; $('invhint').textContent = '';
    v.startUse(f.id, function () { S.spec = false; $('inv').style.display = 'none'; $('inv').className = ''; }, f.target >= 0 && f.target % 2 ? -1 : 1);
  }
  window.addEventListener('keydown', function (e) {
    if (curScreen() !== 'game' || (e.target && e.target.tagName === 'INPUT') || e.repeat) return;
    if (S.invTg) {
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') pickMove(-1); else if (e.code === 'KeyD' || e.code === 'ArrowRight') pickMove(1);
      else if (e.code === 'Enter' || e.code === 'Space') { e.stopPropagation(); pickOk(); } else if (e.code === 'Escape' || e.code === 'KeyE') pickBack();
    }
    else if (e.code === 'KeyE') { if (S.spec) return; S.invOpen ? closeInv() : openInv(); }
    else if (e.code === 'Escape' && S.invOpen) closeInv();
    else if (S.invOpen && (e.code === 'Space')) e.stopPropagation();
  }, true);

  function doRoll() {
    var st = S.game;
    if (!st || st.phase !== 'roll' || st.order[st.turn] !== S.slot) return;
    if (S.cut && performance.now() < S.cut.t0 + S.cut.D * 1000) return;
    if (isHost()) { if (S.room && S.room.game) S.room.game.roll(S.slot); }
    else if (S.net) S.net.send({ t: 'roll' });
  }

  /* ---------- อินพุตและลูป ---------- */
  // อินพุตมินิเกม: คลิกซ้าย/Space = ปุ่มกระทำ, เกมกล้องไล่หลังหมุนทิศตามกล้อง
  function mgInput() {
    var inp = readInput(), x = inp[0], f = inp[1], a = !!(keys.Space || keys.MouseL), v = S.mgView, F = v && S.mg && S.mg.use3d ? v.camF : null, o;
    if (F) o = { x: f * F[0] - x * F[1], y: f * F[1] + x * F[0], a: a }; else o = { x: x, y: -f, a: a };
    if (v && S.mg && S.mg.use3d && S.mg.def && S.mg.def.v3 === 'cream' && v.camP) {
      var r = $('mgc3').getBoundingClientRect(), ps = v.pickSim('cream', (S.mx - r.left) / r.width, (S.my - r.top) / r.height);
      if (ps) { o.ax = Math.round(ps[0]); o.ay = Math.round(ps[1]); }
    }
    return o;
  }
  function readInput() {
    var x = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    var z = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
    return [x, z];
  }

  // ลอจิก: ใช้ setInterval เพื่อให้เจ้าของห้องที่สลับแท็บยังเดินเกมต่อ (rAF จะหยุดเมื่อแท็บซ่อน)
  function logic() {
    var now = performance.now(), dt = Math.min((now - (S.lastTick || now)) / 1000, 5); S.lastTick = now;
    if (S.rolling && (now - S.diceT0 > 2600 || curScreen() !== 'game')) { S.rolling = false; if (S.inv) S.inv.roll = null; if (!S.spec && !S.invOpen && $('inv')) $('inv').style.display = 'none'; }   // กันตัวเลขทอยเต๋าค้างจอ
    var inp = readInput(); if (curScreen() === 'lobby') inp = [inp[0], -inp[1]];   // กล้องห้องรอมองจากด้านหน้า W = เดินขึ้นจอ
    if (isHost() && S.room) {
      S.room.setInput('host', inp[0], inp[1]);
      while (dt > 0) { var step = Math.min(dt, 0.1); S.room.tick(step); dt -= step; }
      S.bAccum += (now - (S.lastB || now)) / 1000; S.lastB = now;
      if (S.bAccum >= 0.066) { S.bAccum = 0; if (S.mode === 'host' && (S.room.phase === 'arena' || S.room.phase === 'lobby')) S.room.broadcastState(); }
    }
    if (curScreen() === 'mg' && S.mg && S.mg.shared && now - S.mg.startAt > -500) {
      var ii = mgInput(); ii.x = Math.round(ii.x * 20) / 20; ii.y = Math.round(ii.y * 20) / 20;
      if (isHost()) { if (S.room && S.room.game) S.room.game.simInput(S.slot, ii); }
      else if (S.net) {
        var k2 = ii.x + ',' + ii.y + ',' + ii.a + ',' + ii.ax + ',' + ii.ay;
        if ((k2 !== S.lastIn2 && now - S.lastSend2 > 45) || now - S.lastSend2 > 250) { S.net.send({ t: 'in', x: ii.x, y: ii.y, a: ii.a, ax: ii.ax, ay: ii.ay }); S.lastIn2 = k2; S.lastSend2 = now; }
      }
    }
    if (!isHost() && S.mode === 'guest' && S.net && S.room === null) {
      var key = inp.join(',');
      if ((curScreen() === 'arena' || curScreen() === 'lobby') && (key !== S.lastIn || now - S.lastSend > 250)) { S.net.send({ t: 'input', x: inp[0], z: inp[1] }); S.lastIn = key; S.lastSend = now; }
    }
  }

  function drawArena(dt, now) {
    var list = [], names = {};
    if (S.lobby) S.lobby.players.forEach(function (p) { names[p.slot] = p.name; });
    if (S.mode === 'guest') {
      var k = 1 - Math.exp(-dt * 14);
      Object.keys(S.targets).forEach(function (s) {
        var t = S.targets[s], c = S.shown[s];
        if (!c) c = S.shown[s] = { x: t.x, z: t.z, h: t.h, mv: t.mv, walk: t.walk };
        c.x += (t.x - c.x) * k; c.z += (t.z - c.z) * k; c.h = t.h; c.mv = t.mv; c.walk = t.walk;
        list.push({ slot: +s, name: names[s] || '', x: c.x, z: c.z, h: c.h, mv: c.mv, walk: c.walk, me: +s === S.slot });
      });
    } else if (S.room) {
      S.room.players.forEach(function (p) { list.push({ slot: p.slot, name: p.name, x: p.x, z: p.z, h: p.h, mv: p.mv, walk: p.walk, me: p.id === 'host' }); });
    }
    S.view.draw(list, C.SLOT_COLORS);
  }

  function followTarget(slot, st) {
    var idx = S.idx[slot] !== undefined ? S.idx[slot] : st.pos[slot] || 0, w = CakeRender.worldAt(idx), x = w.x, z = w.z;
    if (idx < 24 - 0.01) { var off = (slot - 1.5) * 0.3; x += -Math.sin(w.a) * off; z += Math.cos(w.a) * off; }
    var r = Math.hypot(x, z), a = r > 0.9 ? Math.atan2(z, x) : S.lastA; S.lastA = a;
    return { a: a, rc: r + 5.6, yc: w.y + 2.6, rl: r, yl: w.y + 0.55, rate: 9 };   // ตัวละครอยู่กลางจอ
  }
  function orbitTarget(now) { return { a: -Math.PI / 2 + now / 1000 * 0.35, rc: 40, yc: 22, rl: 0, yl: 6.2 }; }

  // เลือกมุมกล้องตามสถานการณ์: ฉากเปิดรอบ → ติดตามผู้เล่นที่กำลังเล่น → ภาพรวมตอนมินิเกม
  function camPlan(st, now) {
    if (S.camMode === 'orbit' && st.phase !== 'intro') return { t: orbitTarget(now), extra: { pins: true } };
    if (st.phase === 'intro') {
      var first = st.order[0], firstName = st.names[first] || '';
      if (S.skipSent) return { t: followTarget(first, st), extra: {}, banner: 'ตาแรก: ' + firstName };
      var t = (now - S.introAt) / 1000, fast = st.round > 1, sp = [], i;
      st.layout.forEach(function (ty, k) { if (k > 0 && k < 24 && INTRO_LABEL[ty]) sp.push(k); });
      var rs = st.round * 104729;
      sp.sort(function (x, y) { return ((x * 7919 + rs) % 1009) - ((y * 7919 + rs) % 1009); });
      var nP = st.order.length, dly = fast ? 0.08 : 0.17, fallT = fast ? 0.5 : 0.95, tFall = fallT + dly * (nP - 1), tClose = tFall + (fast ? 0.6 : 1.5), tWide = fast ? 2.0 : 4.0, cutD = fast ? 0.6 : 1.0, tCherry = fast ? 2.2 : 3.0;
      var t1 = tClose, t2 = t1 + tWide, t3 = t2 + sp.length * cutD, t4 = t3 + tCherry;
      var hide = {}, plan;
      if (t < t3) { sp.forEach(function (k) { hide[k] = true; }); }
      if (t < t1) {
        var p0 = CakeRender.tilePos(0);
        var fl = t < tFall ? 1 : Math.max(0, 1 - (t - tFall) / 0.6);
        return { t: { a: p0.a, rc: p0.r + 5.6, yc: p0.y + 1.8 + 2.4 * fl, rl: p0.r, yl: p0.y + 0.6 + 2.6 * fl }, extra: { hide: hide, cherry: 0 }, cut: 'close', drop: { t: t, dly: dly, fallT: fallT },
          banner: 'รอบที่ ' + st.round + ' — ผู้เล่นพร้อมที่จุดเริ่มต้น', bc: '#ffe066' };
      }
      if (t < t2) return { t: orbitTarget(now), extra: { hide: hide, cherry: 0 }, banner: 'เค้กก้อนยักษ์! เชอร์รี่รออยู่บนยอด…', bc: '#ffe066' };
      if (t < t3) {
        var seg = Math.min(sp.length - 1, Math.floor((t - t2) / cutD)), local = (t - t2) - seg * cutD;
        for (i = 0; i <= seg; i++) delete hide[sp[i]];
        var idx = sp[seg], tp = CakeRender.tilePos(idx), ty = st.layout[idx], lb = INTRO_LABEL[ty];
        return { t: { a: tp.a, rc: tp.r + 5.4, yc: tp.y + 2.4, rl: tp.r, yl: tp.y + 0.6 }, extra: { hide: hide, cherry: 0, pop: { i: idx, p: Math.max(0, local - 0.12) / (cutD * 0.8) } }, cut: 'c' + seg,
          banner: lb[0] + '  (' + (seg + 1) + '/' + sp.length + ')', bc: lb[1] };
      }
      if (t < t4) {
        var tc = t - t3, cf = Math.max(0, (tc - 1.2) / 1.6);
        return { t: { a: -Math.PI / 2 + 0.6, rc: 8.5, yc: 15.2, rl: 0, yl: 12.6 }, extra: { cherry: cf >= 1 ? undefined : cf }, banner: tc < 1.2 ? 'ขึ้นไปบนยอดเค้ก…' : 'เชอร์รี่! ราคา ' + st.price + ' เหรียญ ใครซื้อได้ชนะรอบนี้', bc: '#ff8787' };
      }
      return { t: followTarget(first, st), extra: {}, banner: 'ตาแรก: ' + firstName, bc: '#ffe066' };
    }
    var slot = st.phase === 'roll' ? st.order[st.turn] : st.phase === 'busy' ? (st.last.slot >= 0 ? st.last.slot : st.order[st.turn]) : st.phase === 'shop' && st.shop ? st.shop.slot : st.phase === 'cherry' ? st.cs : -1;
    if (slot === undefined || slot < 0) return { t: orbitTarget(now), extra: {} };
    return { t: followTarget(slot, st), extra: {} };
  }

  var INTRO_LABEL = { shop: ['ร้านค้า — ซื้อไอเทมได้ที่นี่', '#74c0fc'], coin: ['ช่องเหรียญ  ได้ +' + CakeGame.G.COIN_GAIN, '#ffd43b'], minus: ['ช่องโดนหัก  เสีย -' + CakeGame.G.COIN_LOSS, '#ff8787'], mystery: ['ช่องปริศนา — สุ่มเหตุการณ์', '#b197fc'] };
  function makeView(cv, ov) {
    if (window.Cake3D && Cake3D.supported()) { try { return new Cake3D.View(cv, ov); } catch (e) { if (window.console) console.warn('3D ใช้ไม่ได้ ใช้ภาพแบบเดิมแทน', e); } }
    return new CakeRender.CakeView(cv);
  }
  function drawBanner(g, text, st, color, view) {
    g.font = 'bold 16px TAGBA, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    var w = g.measureText(text).width + 24, cx = (view && view.W ? view.W : 480) / 2;
    g.fillStyle = 'rgba(18,10,28,0.82)'; g.fillRect(cx - w / 2, 12, w, 26); g.strokeStyle = color || '#ffe066'; g.lineWidth = 2; g.strokeRect(cx - w / 2, 12, w, 26);
    g.fillStyle = '#fff'; g.fillText(text, cx, 26);
  }


  /* ---------- ลูกเต๋า 3D กลางจอ + ข้อความกลางจอ ---------- */
  var DICE_FACE = { 1: [0, 0], 6: [0, Math.PI], 2: [0, -Math.PI / 2], 5: [0, Math.PI / 2], 3: [Math.PI / 2, 0], 4: [-Math.PI / 2, 0] };
  var DICE_N = { 1: [0, 0, 1], 6: [0, 0, -1], 2: [1, 0, 0], 5: [-1, 0, 0], 3: [0, 1, 0], 4: [0, -1, 0] };
  var DICE_U = { 1: [1, 0, 0], 6: [-1, 0, 0], 2: [0, 0, -1], 5: [0, 0, 1], 3: [1, 0, 0], 4: [1, 0, 0] };
  var PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
  function rotXY(v, ax, ay) {
    var cy = Math.cos(ay), sy = Math.sin(ay), x = v[0] * cy + v[2] * sy, z = -v[0] * sy + v[2] * cy, y = v[1], cx = Math.cos(ax), sx = Math.sin(ax);
    return [x, y * cx - z * sx, y * sx + z * cx];
  }
  function drawDice3D(view, now) {
    var g0 = view.g; if (!g0 || !S.diceVal && !S.diceMod) return;
    var t = (now - S.diceT0) / 1000;
    var rid = S.diceMod && S.diceMod !== 'none' ? S.diceMod : 'normal';
    if (!S.dice3dBad) {
      try {
        if (t >= 0 && t <= 2.5 && !S.spec && !S.invOpen) { ensureInv(); if (!S.rolling) { S.rolling = true; $('inv').className = 'spec roll'; $('inv').style.display = 'block'; } S.inv.roll = { id: rid, t: t, v: S.diceVal, dice: S.diceArr, seed: S.diceSeed }; }
        else if (S.rolling) { S.rolling = false; S.inv.roll = null; if (!S.spec && !S.invOpen) $('inv').style.display = 'none'; }
        return;
      } catch (err) { S.dice3dBad = true; S.rolling = false; }
    }
    if (t < 0 || t > 2.0) return;
    if (!S.dcv) { S.dcv = document.createElement('canvas'); S.dcv.width = 56; S.dcv.height = 64; }
    var g = S.dcv.getContext('2d'); g.clearRect(0, 0, 56, 64); g.imageSmoothingEnabled = false;
    var spin = 1.05, e = Math.min(1, t / spin), k = 1 - Math.pow(1 - e, 3), tg = DICE_FACE[S.diceVal] || [0, 0];
    var ax = tg[0] + (1 - k) * 11.5 + 0.35 * (1 - k), ay = tg[1] + (1 - k) * 15.7;
    var hop = t < spin ? Math.abs(Math.sin(t * 7)) * 16 * (1 - e * 0.7) : 0;
    var out = t > 1.6 ? Math.min(1, (t - 1.6) / 0.4) : 0, sc = (1 - out * out) * (t < 0.12 ? t / 0.12 : 1);
    if (sc <= 0.02) return;
    var S0 = 14, cx = 28, cy = 28;
    g.fillStyle = 'rgba(60,20,40,0.32)'; g.beginPath(); g.ellipse(cx, 28 + S0 * 1.15 + 3, S0 * 0.9, S0 * 0.22, 0, 0, 7); g.fill();
    var fs = [];
    for (var f = 1; f <= 6; f++) { var n = rotXY(DICE_N[f], ax, ay); if (n[2] > 0.001) fs.push({ f: f, n: n }); }
    fs.sort(function (a, b) { return a.n[2] - b.n[2]; });
    fs.forEach(function (o) {
      var n = o.n, u = rotXY(DICE_U[o.f], ax, ay), vv = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
      var sh = Math.round((0.78 + 0.22 * Math.max(0, n[0] * -0.35 + n[1] * 0.7 + n[2] * 0.62)) * 4) / 4;
      g.save(); g.translate(cx + n[0] * S0, cy - n[1] * S0);
      g.transform(u[0] * S0, -u[1] * S0, -vv[0] * S0, vv[1] * S0, 0, 0);
      var c = Math.round(255 * Math.min(1, sh));
      g.fillStyle = 'rgb(' + c + ',' + c + ',' + Math.round(c * 0.96) + ')';
      g.beginPath(); g.moveTo(-1, -1); g.lineTo(1, -1); g.lineTo(1, 1); g.lineTo(-1, 1); g.closePath(); g.fill();
      g.fillStyle = o.f === 1 ? '#ff4d6d' : '#3a2a3a';
      PIPS[o.f].forEach(function (p) { g.beginPath(); g.arc(p[0] * 0.5, -p[1] * 0.5, o.f === 1 ? 0.28 : 0.17, 0, 7); g.fill(); });
      g.restore();
    });
    var ps = 2.7 * sc, W = 56 * ps, H = 64 * ps;
    g0.save(); g0.imageSmoothingEnabled = false; g0.globalAlpha = 1 - out * 0.6;
    g0.drawImage(S.dcv, view.W / 2 - W / 2, view.H * 0.44 - hop - out * 20 - 28 * ps, W, H); g0.restore();
  }
  function popBurst(view, good, text) {
    var cx = view.W / 2, cy = view.H * 0.4, cols = good ? ['#ffe066', '#ff8fb8', '#8fe3ff', '#b6f56a'] : ['#ff6b6b', '#ffa94d', '#c9a0ff'];
    for (var i = 0; i < 34; i++) { var a = Math.random() * 6.283, sp = 40 + Math.random() * 120; S.parts.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: 0, max: 0.9 + Math.random() * 0.6, c: cols[i % cols.length], s: 2 + Math.random() * 3, g: good ? 160 : 60 }); }
  }
  function drawCenterMsg(view, now, dt) {
    var g = view.g; if (!g) return;
    var pm = S.popMsg;
    if (pm && now >= pm.t0) {
      var t = (now - pm.t0) / 1000, txt = pm.text, bad = /เสีย|โดนหัก|ลด|-\d/.test(txt) && !/ได้/.test(txt), good = !bad;
      if (!pm.fired) { pm.fired = true; popBurst(view, good, txt); }
      if (t > 2.6) S.popMsg = null;
      else {
        var sc = t < 0.25 ? 0.3 + 0.9 * (t / 0.25) : t < 0.4 ? 1.2 - 0.2 * ((t - 0.25) / 0.15) : 1, al = t > 2.2 ? 1 - (t - 2.2) / 0.4 : 1;
        g.save(); g.globalAlpha = al; g.translate(view.W / 2, view.H * 0.3); g.scale(sc, sc);
        g.font = 'bold 20px "TAGBA",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        var w = Math.min(view.W - 30, g.measureText(txt).width + 36);
        g.fillStyle = good ? '#fff6d8' : '#ffe0e0'; g.strokeStyle = good ? '#ff9ec0' : '#ff6b6b'; g.lineWidth = 3;
        g.beginPath(); g.rect(-w / 2, -17, w, 34); g.fill(); g.stroke();
        g.fillStyle = good ? '#b3265e' : '#b02020'; g.fillText(txt, 0, 1, w - 20);
        g.restore();
      }
    }
    for (var i = S.parts.length - 1; i >= 0; i--) {
      var p = S.parts[i]; p.life += dt; if (p.life > p.max) { S.parts.splice(i, 1); continue; }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      g.globalAlpha = Math.min(1, (p.max - p.life) * 2); g.fillStyle = p.c; g.fillRect(p.x, p.y, p.s, p.s);
    }
    g.globalAlpha = 1;
  }

  /* ---------- เอฟเฟกต์ลงช่อง (แอนิเมชันพิกเซลแทนกล่องข้อความ) ---------- */
  var FXS = [];
  function useSnd(id) { return id === 'freeze' ? 'freeze' : id === 'swap' ? 'swap' : id === 'steal' ? 'steal' : 'use'; }
  function audRoll(st) {
    var ev = st.last, ms = 0; if (!ev || ev.slot === undefined) return;
    if (ev.teleport) { sfx(ev.cherry === 'buy' ? 'cherryBuy' : 'swap', 0, 150); return; }
    sfx('dice');
    var steps = ev.steps || 0; for (var i = 0; i < steps; i++) sfx('step', i, C_DICE_MS + i * C_STEP_MS);
    var land = C_DICE_MS + steps * C_STEP_MS; if (steps > 0) sfx('land', 0, land);
    if (ev.cherry === 'ask') sfx('cherryAsk', 0, land + 150);
    else if (ev.back) sfx('sent', 0, land + 200);
    else if (ev.via >= 0) sfx('trap', 0, land + 100);
    else if (ev.tile === 'mystery') sfx('mystery', 0, land + 250);
  }
  var MG_SFX = { catcher: 1, coinrush: 1, cream: 1, mole: 1, shoot: 1, mash: 1, stack: 1, slice: 1, numbers: 1, color: 1, order: 1, shadow: 1, count: 1, simon: 1, addmath: 1, memory: 1, sweetveg: 1, reaction: 1, holdbar: 1 };
  function mgScoreSfx(m, v) {
    if (!m || !m.def || !MG_SFX[m.def.v3] || typeof v !== 'number') return; var now = performance.now();
    if (m._ps === undefined) { m._ps = v; return; }
    if (v > m._ps) { if (now - (m._pt || 0) > 60) { sfx('point'); m._pt = now; } } else if (v < m._ps && v > 0) sfx('miss');
    m._ps = v;
  }
  function audGame(st) {
    var a = S.aud || (S.aud = { ph: '', key: '', items: null, round: 0 });
    if (a.ph !== st.phase) { if (st.phase === 'shop') sfx('shop'); else if (st.phase === 'mini') sfx('result'); a.ph = st.phase; }
    if (st.phase === 'intro' && a.round !== st.round) { a.round = st.round; sfx('round'); }
    if (st.phase === 'roll' && st.order[st.turn] === S.slot) { var k = st.round + '/' + st.turn + '/' + st.last.seq; if (a.key !== k) { a.key = k; sfx('turn'); } }
    var cnt = {}; Object.keys(st.names || {}).forEach(function (sl) { cnt[sl] = (st.items && st.items[sl] || []).length; });
    if (a.items) { var up = Object.keys(cnt).some(function (sl) { return cnt[sl] > (a.items[sl] || 0); }); if (up) sfx(st.phase === 'shop' ? 'buy' : 'get'); }
    a.items = cnt;
  }
  function scheduleFx(st, now) {
    var ev = st.last, mover = ev.slot; if (mover === undefined) return;
    if (ev.teleport) { if (ev.cherry === 'buy') startCut({ id: 'cherry', slot: mover, seq: ev.seq }, st, now + 150, function () { return 0; }); return; }
    var land = now + C_DICE_MS + (ev.steps || 0) * C_STEP_MS, delay = 0;
    if (ev.tile === 'mystery') {
      var evn = ev.evt && CakeGame.EVENTS.filter(function (x) { return x.id === ev.evt; })[0];
      startCut({ id: 'gift', slot: mover, gift: ev.gift, seq: ev.seq }, st, land + 250, function () { return 0; });
      FXS.push({ k: 'gift', slot: mover, t0: land + 250, gift: ev.gift, text: evn ? evn.name : '', sub: evn && ev.evt !== 'gift' ? evn.desc : '' }); delay = 1600;
    }
    var victim = -1; (ev.cd || []).forEach(function (c, sl) { if (c < 0 && ev.evt === 'thief') victim = sl; });
    (ev.cd || []).forEach(function (c, sl) {
      if (!c || !st.names || st.names[sl] === undefined) return;
      if (c > 0) sfx('coin', c, land + delay + 200 - now);
      else sfx('loss', -c, land + delay + 200 - now);
      if (c > 0) FXS.push({ k: 'gain', slot: sl, n: c, t0: land + delay + 200, src: ev.evt === 'thief' && sl === mover && victim >= 0 ? victim : (sl === mover && (ev.tile === 'coin') ? -1 : -2) });
      else FXS.push({ k: 'hit', slot: sl, n: -c, t0: land + delay + 200 });
    });
    if (FXS.length > 40) FXS.splice(0, FXS.length - 40);
  }
  window.__fxpush = function (f) { FXS.push(f); };
  window.__psnap = function () { return S.mg && S.mg.psim ? S.mg.psim.snapshot() : null; };
  function tokFx(slot, now) {
    var o = { lift: 0, flash: 0, shake: 0 };
    FXS.forEach(function (f) {
      if (f.slot !== slot) return; var t = (now - f.t0) / 1000; if (t < 0) return;
      if (f.k === 'hit' && t < 0.7) { o.flash = Math.max(o.flash, 1 - t / 0.7); o.shake = 0.12 * (1 - t / 0.7); }
      else if (f.k === 'gain') { var p = t - (0.75 + Math.min(f.n, 10) * 0.07); if (p > 0 && p < 0.25) o.lift = Math.max(o.lift, Math.sin(p / 0.25 * Math.PI) * 0.3); }
      else if (f.k === 'swap' && (f.slot === slot || f.other === slot) && t < 0.8) { o.flash = Math.max(o.flash, 0.7 * (1 - t / 0.8)); o.lift = Math.max(o.lift, Math.sin(t / 0.8 * Math.PI) * 0.4); }
      else if (f.k === 'cherry' && t < 2.6) o.lift = Math.max(o.lift, Math.abs(Math.sin(t / 2.6 * Math.PI * 3)) * 0.5);
    });
    return o;
  }
  function qd(v, q) { return Math.round(v / q) * q; }
  function pxDisc(g, cx, cy, r, col, q) { g.fillStyle = col; for (var y = -r; y <= r; y++) { var w = Math.floor(Math.sqrt(r * r + r * 0.6 - y * y)); g.fillRect(qd(cx, q) - w * q, qd(cy, q) + y * q, (w * 2 + 1) * q, q); } }
  function pxCoin(g, x, y, q, sp) {
    var w = Math.abs(Math.cos(sp)); if (w < 0.35) { g.fillStyle = '#b36b00'; g.fillRect(qd(x, q) - q, qd(y, q) - 4 * q, 2 * q, 8 * q); return; }
    pxDisc(g, x, y, 4, '#b36b00', q); pxDisc(g, x, y, 3, '#ffc928', q); g.fillStyle = '#fff3a0'; g.fillRect(qd(x, q) - 2 * q, qd(y, q) - 2 * q, q, q);
  }
  function ptext(g, txt, x, y, size, col) {
    g.font = 'bold ' + size + 'px "TAGBA",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(40,10,40,0.55)'; g.fillText(txt, x + 1.5, y + 1.5); g.fillStyle = col; g.fillText(txt, x, y);
  }
  function scr(view, slot, dy) { var tp = view.tokPos && view.tokPos[slot]; if (!tp) return null; return view.pr(tp[0], tp[1] + dy, tp[2]); }
  function eo(u) { return 1 - Math.pow(1 - u, 3); }
  function drawFx(view, now, dt) {
    var g = view.g; if (!g || !view.pr) return;
    var q = 2; g.save(); g.imageSmoothingEnabled = false;
    for (var i = FXS.length - 1; i >= 0; i--) {
      var f = FXS[i], t = (now - f.t0) / 1000; if (t < 0) continue;
      if (t > 6) { FXS.splice(i, 1); continue; }
      var tgt = scr(view, f.slot, 0.75); if (!tgt) continue;
      var sc = Math.max(0.5, Math.min(2.2, tgt[2] / 60));
      if (f.k === 'swap') {
        var tb = scr(view, f.other, 0.75); if (!tb || t > 1.4) continue;
        var u3 = Math.min(1, t / 0.5), fa = t > 0.9 ? 1 - (t - 0.9) / 0.5 : 1; g.globalAlpha = fa;
        for (var si = 0; si < 14; si++) { var pr = Math.min(1, Math.max(0, u3 * 1.2 - si * 0.04)); if (pr <= 0) continue; var wob = Math.sin(si * 1.7 + t * 18) * 6 * sc; g.fillStyle = si % 2 ? '#ff7ac8' : '#7ae6ff'; g.fillRect(qd(tgt[0] + (tb[0] - tgt[0]) * pr, 2) - 3, qd(tgt[1] + (tb[1] - tgt[1]) * pr + wob, 2) - 3, 6, 6); g.fillStyle = si % 2 ? '#7ae6ff' : '#ff7ac8'; g.fillRect(qd(tb[0] + (tgt[0] - tb[0]) * pr, 2) - 3, qd(tb[1] + (tgt[1] - tb[1]) * pr - wob, 2) - 3, 6, 6); }
        if (t < 0.35) { g.fillStyle = 'rgba(255,255,255,' + (0.9 - t * 2.4) + ')'; var bs2 = 8 + t * 140; g.fillRect(tgt[0] - 1, tgt[1] - bs2, 2, bs2 * 2); g.fillRect(tgt[0] - bs2, tgt[1] - 1, bs2 * 2, 2); g.fillRect(tb[0] - 1, tb[1] - bs2, 2, bs2 * 2); g.fillRect(tb[0] - bs2, tb[1] - 1, bs2 * 2, 2); }
        if (t > 0.4) ptext(g, 'สลับ!', (tgt[0] + tb[0]) / 2, (tgt[1] + tb[1]) / 2 - 20 * sc - (t - 0.4) * 20, 20, '#ff9bd8');
        g.globalAlpha = 1;
      } else if (f.k === 'spark') {
        if (t > 1.0) continue; g.globalAlpha = 1 - t; g.fillStyle = f.col || '#fff';
        for (var spk = 0; spk < 16; spk++) { var sa2 = spk * 0.3927 + (spk % 2) * 0.2, sr2 = (14 + t * 70 + (spk % 3) * 10) * sc; g.fillRect(qd(tgt[0] + Math.cos(sa2) * sr2, 2) - 2, qd(tgt[1] - 6 * sc + Math.sin(sa2) * sr2 * 0.8, 2) - 2, spk % 3 ? 4 : 6, spk % 3 ? 4 : 6); }
        g.globalAlpha = 1;
      } else if (f.k === 'pop') {
        if (t > 1.8) continue; var up2 = t / 1.8; g.globalAlpha = up2 > 0.7 ? 1 - (up2 - 0.7) / 0.3 : 1;
        if (f.snow) for (var sn = 0; sn < 14; sn++) { var an = sn * 2.399, rr = (20 + (sn % 4) * 12) * sc * Math.min(1, t * 2); g.fillStyle = sn % 2 ? '#ffffff' : '#9fe0ff'; g.fillRect(qd(tgt[0] + Math.cos(an) * rr, 2), qd(tgt[1] + Math.sin(an) * rr * 0.8 + t * 12, 2), 4, 4); }
        ptext(g, f.text, tgt[0], tgt[1] - 30 * sc - up2 * 26, 20, f.col); g.globalAlpha = 1;
      } else if (f.k === 'gain') {
        var m = Math.min(f.n, 10), A = 0.5, B = 0.45, srcP;
        if (f.src >= 0) srcP = scr(view, f.src, 0.75); else if (f.src === -1) srcP = scr(view, f.slot, 0.1); else srcP = scr(view, f.slot, 4.2);
        if (!srcP) continue;
        for (var c = 0; c < m; c++) {
          var tc = t - c * 0.07; if (tc < 0) continue;
          var ex = srcP[0] + (c - (m - 1) / 2) * 7 * sc, ey = srcP[1] - 26 * sc, x, y;
          if (tc < A) { var u = eo(tc / A); x = srcP[0] + (ex - srcP[0]) * u; y = srcP[1] + (ey - srcP[1]) * u; }
          else if (tc < A + 0.15) { x = ex; y = ey - Math.sin((tc - A) / 0.15 * Math.PI) * 3; }
          else if (tc < A + 0.15 + B) { var u2 = (tc - A - 0.15) / B; u2 *= u2; x = ex + (tgt[0] - ex) * u2; y = ey + (tgt[1] - ey) * u2; }
          else continue;
          pxCoin(g, x, y, q, tc * 12 + c);
        }
        var te = 0.7 + m * 0.07 + 0.15;
        if (t > te && t < te + 1.1) { var up = (t - te) / 1.1; g.globalAlpha = up > 0.7 ? 1 - (up - 0.7) / 0.3 : 1; ptext(g, '+' + f.n, tgt[0], tgt[1] - 22 * sc - up * 22, 20, '#ffe066'); g.globalAlpha = 1; }
      } else if (f.k === 'hit') {
        var mh = Math.min(f.n, 10);
        for (var h = 0; h < mh; h++) {
          var th = t - 0.05, a = h * 2.399 + 0.5, vx = Math.cos(a) * (40 + (h % 3) * 14) * sc, vy = -(70 + (h * 37) % 40) * sc;
          if (th < 0 || th > 1.3) continue;
          g.globalAlpha = th > 0.9 ? 1 - (th - 0.9) / 0.4 : 1; pxCoin(g, tgt[0] + vx * th, tgt[1] + vy * th + 150 * sc * th * th, q, h + th * 9); g.globalAlpha = 1;
        }
        if (t < 1.5) { var uh = t / 1.5; g.globalAlpha = uh > 0.7 ? 1 - (uh - 0.7) / 0.3 : 1; ptext(g, '-' + f.n, tgt[0], tgt[1] - 24 * sc - uh * 20, 20, '#ff6b6b'); g.globalAlpha = 1; }
        if (t < 0.25) { g.fillStyle = 'rgba(255,255,255,' + (0.9 - t * 3.6) + ')'; var bs = 6 + t * 80; g.fillRect(tgt[0] - 1, tgt[1] - bs, 2, bs * 2); g.fillRect(tgt[0] - bs, tgt[1] - 1, bs * 2, 2); }
      } else if (f.k === 'gift') {
        var gp = scr(view, f.slot, 1.6); if (!gp) continue; gp[1] = Math.max(gp[1], 75); var qq = Math.max(2, Math.round(2.2 * sc)), bx = gp[0], by = gp[1];
        if (t > 3.4) continue;
        var fade = t > 2.9 ? 1 - (t - 2.9) / 0.5 : 1; g.globalAlpha = fade; var X = qd(bx, qq), Y = qd(by, qq);
        if (t > 1.3) { var to = t - 1.3, rv = Math.min(1, to / 0.5), ry = Y - 8 * qq - eo(rv) * 34 * sc;
          if (f.gift) ptext(g, CakeGame.ITEMS[f.gift].name, X, ry + 24, 18, '#ffffff');
          else if (f.text) { ptext(g, f.text, X, ry - 6, 18, '#ffffff'); if (f.sub) ptext(g, f.sub, X, ry + 14, 13, '#ffe9a8'); } }
        g.globalAlpha = 1;
      } else if (f.k === 'cherry') {
        if (t > 4.4) continue;
        var cp = scr(view, f.slot, 1.35); if (!cp) continue; var cq = Math.max(2, Math.round(2 * sc)), cu = Math.min(1, t / 0.6), cyy = Math.max(26, cp[1] - 3 * cq - eo(cu) * 5 * cq - Math.sin(t * 6) * cq), cx = qd(cp[0], cq);
        g.fillStyle = '#3a9a3a'; g.fillRect(cx - 0 * cq, qd(cyy, cq) - 10 * cq, cq, 8 * cq); g.fillRect(cx, qd(cyy, cq) - 11 * cq, 4 * cq, cq); g.fillRect(cx + 4 * cq, qd(cyy, cq) - 10 * cq, 2 * cq, cq);
        pxDisc(g, cx - 3 * cq, cyy, 4, '#e8203a', cq); pxDisc(g, cx + 4 * cq, cyy + cq, 4, '#e8203a', cq);
        g.fillStyle = '#ff8a9a'; g.fillRect(cx - 5 * cq, qd(cyy, cq) - 2 * cq, cq, cq); g.fillRect(cx + 2 * cq, qd(cyy, cq) - cq, cq, cq);
        g.fillStyle = '#fff6b0'; for (var sp = 0; sp < 8; sp++) { var sa = sp / 8 * 6.283 + t * 2, sr = (10 + (sp % 3) * 4) * cq + Math.sin(t * 5 + sp) * 2 * cq; g.fillRect(qd(cx + Math.cos(sa) * sr, cq), qd(cyy + Math.sin(sa) * sr, cq), cq, cq); }
      }
    }
    g.restore();
  }


  /* ---------- คัตซีนไอเทมบนกระดาน ---------- */
  var CUT_D = { gift: 2.7, cherry: 4.4, ticket: 2.3, magnet: 3.0, slip: 2.9, freeze: 3.0, steal: 4.9, swap: 3.8 };
  function cl01(u) { return u < 0 ? 0 : u > 1 ? 1 : u; }
  function popS(u) { u = cl01(u); var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); }
  function endCut(st) {
    var c = S.cut; S.cut = null; S.hold = {}; S.iceHold = {};
    if (c && c.id === 'swap' && st) { S.idx[c.slot] = st.pos[c.slot]; S.idx[c.target] = st.pos[c.target]; }
  }
  function startCut(uf, st, t0, d) {
    if (!CUT_D[uf.id]) return;
    if (S.cut) endCut(st);
    var c = { id: uf.id, slot: uf.slot, target: uf.target, t0: t0, seq: uf.seq, D: CUT_D[uf.id], fl: {}, n: 0 };
    if (uf.id === 'steal') c.n = Math.max(0, d(uf.target));
    if (uf.id === 'magnet') c.list = st.order.filter(function (o) { return o !== uf.slot && d(o) > 0; }).map(function (o) { return { o: o, n: d(o) }; });
    if (uf.id === 'swap') {
      c.moverOld = st.pos[uf.target]; c.targetOld = st.pos[uf.slot]; S.hold = {};
      S.hold[uf.slot] = c.moverOld; S.hold[uf.target] = c.targetOld; S.idx[uf.slot] = c.moverOld; S.idx[uf.target] = c.targetOld;
    }
    if (uf.id === 'freeze' && uf.target >= 0) { S.iceHold = {}; S.iceHold[uf.target] = true; }
    S.cut = c;
  }
  function cutFrame(st, now, tokens, view) {
    var c = S.cut; if (!c) return null;
    var t = (now - c.t0) / 1000, out = { extra: { props: [], rings: [] }, cam: null }, P = out.extra.props, RG = out.extra.rings;
    if (t > c.D) { endCut(st); return null; }
    if (t < 0) return out;
    var tpos = function (sl) { return view.tokPos && view.tokPos[sl]; }, tfx = function (sl) { for (var i = 0; i < tokens.length; i++) if (tokens[i].slot === sl) return tokens[i].fx; return {}; };
    var once = function (k) { if (c.fl[k]) return false; c.fl[k] = 1; return true; };
    var p, p2, u, sc, s, y;
    c.cf = {};
    if (c.id === 'cherry') {   // ซื้อเชอร์รี่: ลูกเชอร์รี่ตัวจริงบนยอดเค้กลอยขึ้น หมุน บินมาหาผู้ซื้อ
      p = tpos(c.slot); if (!p) return out;
      var TY = CakeRender.TOP_Y, ca = Math.hypot(p[0], p[2]) > 0.9 ? Math.atan2(p[2], p[0]) : (S.lastA || 0), hx = p[0], hy = p[1] + 2.0, hz = p[2];
      out.cam = { slot: c.slot, key: 'cherry', t: { a: ca, rc: Math.hypot(p[0], p[2]) + 8.5, yc: TY + 4.6, rl: Math.hypot(p[0], p[2]) * 0.5, yl: TY + 1.7, rate: 6 } };
      var cx0 = 0, cy0 = TY + 0.9, cz0 = 0, X, Y, Z, rs, ry = 0.6 * t;
      if (t < 0.5) { X = cx0; Y = cy0 + Math.sin(t * 50) * 0.04; Z = cz0; rs = 1 + 0.08 * Math.sin(t * 40); }
      else if (t < 1.5) { u = eo(cl01((t - 0.5) / 1.0)); X = cx0; Y = cy0 + u * 2.2; Z = cz0; rs = 1 + 0.25 * Math.sin(u * Math.PI) + 0.1 * u; ry += 12 * u * u; }
      else if (t < 2.6) { u = eo(cl01((t - 1.5) / 1.1)); X = cx0 + (hx - cx0) * u; Z = cz0 + (hz - cz0) * u; Y = cy0 + 2.2 + (hy - cy0 - 2.2) * u + Math.sin(u * Math.PI) * 0.9; rs = 1.1 - 0.6 * u; ry += 12 + 9 * u; }
      else if (t < 3.7) { u = t - 2.6; X = hx; Z = hz; Y = hy + Math.sin(u * 5) * 0.12; rs = 0.5; ry += 21 + u * 4; }
      else { u = eo(cl01((t - 3.7) / 0.6)); X = hx; Z = hz; Y = hy - u * 1.1; rs = 0.5 * (1 - u); ry += 25; }
      out.extra.cherry = 0; if (rs > 0.02) out.extra.cherryX = { x: X, y: Y, z: Z, s: rs, ry: ry };
      if (t > 0.5 && t < 1.5) { u = (t - 0.5) / 1.0; RG.push({ x: 0, y: TY + 0.15, z: 0, r: 0.6 + u * 3.0, col: '#ffd43b', a: 0.8 * (1 - u), noadd: true }); }
      if (t > 0.5 && once('l')) FXS.push({ k: 'spark', slot: c.slot, col: '#ff6b81', t0: now });
      if (t > 2.6 && t < 3.6) { u = (t - 2.6) / 1.0; RG.push({ x: hx, y: p[1] + 0.1, z: hz, r: 0.5 + u * 2.2, col: '#ff8fa8', a: 0.8 * (1 - u), noadd: true }); RG.push({ x: hx, y: hy, z: hz, r: 0.3 + u * 1.4, col: '#fff1a8', a: 0.6 * (1 - u), noadd: true }); }
      if (t > 2.65 && once('b')) { FXS.push({ k: 'pop', slot: c.slot, text: 'ได้เชอร์รี่!', col: '#ff5c7a', t0: now }); FXS.push({ k: 'spark', slot: c.slot, col: '#fff1a8', t0: now }); }
      if (t > 3.8 && once('e')) FXS.push({ k: 'spark', slot: c.slot, col: '#ff8fa8', t0: now });
    } else if (c.id === 'gift') {   // ช่องปริศนา: กล่องของขวัญ 3D ตกลงมา สั่น ฝาเด้ง ของโผล่
      p = tpos(c.slot); if (!p) return out;
      var gr = Math.hypot(p[0], p[2]), ga = gr > 0.9 ? Math.atan2(p[2], p[0]) : (S.lastA || 0); out.cam = { slot: c.slot, key: 'gift', t: { a: ga, rc: gr + 7.0, yc: p[1] + 3.2, rl: gr, yl: p[1] + 1.4, rate: 6 } };
      var gx = p[0], gz = p[2], gy = p[1] + 1.9, gd = t < 0.45 ? (1 - eo(t / 0.45)) * 3 : 0, gk = t > 0.45 && t < 1.15 ? Math.sin(t * 50) * 0.06 : 0, gsc = 0.95 * (t > 2.2 ? 1 - eo(cl01((t - 2.2) / 0.5)) : 1), lu = t > 1.15 ? cl01((t - 1.15) / 0.8) : 0;
      out.extra.gift = { x: gx + gk, y: gy + gd + (t > 0.45 ? Math.abs(Math.sin(t * 5)) * 0.04 : 0), z: gz, s: gsc, ry: t * 0.8, lid: gsc > 0.01 ? Math.max(0, 1 - lu * 0.6) * (t > 1.15 ? 1 : 1) : 0, ly: lu * 1.6, lx: lu * 0.9, lrz: -lu * 2.2, lry: 0 };
      if (lu >= 1) out.extra.gift.lid = 0;
      if (t > 1.15 && once('o')) { FXS.push({ k: 'spark', slot: c.slot, col: '#ffe066', t0: now }); }
      if (t > 1.15 && t < 1.9) { u = (t - 1.15) / 0.75; RG.push({ x: gx, y: gy + 0.5, z: gz, r: 0.5 + u * 2.2, col: '#fff1a8', a: 0.8 * (1 - u), rot: 1 }); RG.push({ x: gx, y: p[1] + 0.1, z: gz, r: 0.7 + u * 2.6, col: '#c4b0ff', a: 0.7 * (1 - u) }); }
      if (c.gift && t > 1.3) { var iu = cl01((t - 1.3) / 0.55), isc = (t > 2.2 ? 1 - eo(cl01((t - 2.2) / 0.5)) : 1) * popS(iu); P.push({ id: c.gift, x: gx, y: gy + 0.5 + eo(iu) * 1.1 + Math.sin(t * 3) * 0.05, z: gz, ry: t * 2.2, s: 0.5 * isc }); }
    } else if (c.id === 'ticket') {
      p = tpos(c.slot); if (!p) return out;
      sc = t < 1.6 ? popS(t / 0.5) : 1 - eo(cl01((t - 1.6) / 0.6)); s = 0.6 * sc;
      y = p[1] + 1.95 + eo(cl01(t / 0.5)) * 0.3 + Math.sin(t * 3) * 0.05 - (t > 1.6 ? eo(cl01((t - 1.6) / 0.6)) * 0.9 : 0) - 1.3 * s;
      P.push({ id: 'ticketp', x: p[0], y: y, z: p[2], ry: t * 2.4, s: s });
      if (t > 0.9 && once('b')) { FXS.push({ k: 'pop', slot: c.slot, text: 'ตั๋ว x2', col: '#ffe066', t0: now }); FXS.push({ k: 'spark', slot: c.slot, col: '#ffe066', t0: now }); }
      if (t > 0.9 && t < 1.7) { u = (t - 0.9) / 0.8; RG.push({ x: p[0], y: p[1] + 0.1, z: p[2], r: 0.6 + u * 2.4, col: '#ffd43b', a: 0.8 * (1 - u) }); RG.push({ x: p[0], y: p[1] + 1.5, z: p[2], r: 0.4 + u * 1.6, col: '#fff1a8', a: 0.6 * (1 - u), rot: 1 }); }
    } else if (c.id === 'magnet') {
      p = tpos(c.slot); if (!p) return out;
      sc = t < 2.4 ? popS(t / 0.5) : 1 - eo(cl01((t - 2.4) / 0.6)); s = 0.38 * sc;
      var sh = t > 0.55 && t < 2.2 ? Math.sin(t * 30) * 0.08 : 0;
      P.push({ id: 'magnetp', x: p[0], y: p[1] + 1.9 * s + 1.4 + eo(cl01(t / 0.5)) * 0.2, z: p[2], rx: Math.PI, rz: sh, ry: t * 1.5, s: s });
      if (t > 0.55 && once('g')) (c.list || []).forEach(function (q) { FXS.push({ k: 'gain', slot: c.slot, n: q.n, t0: now, src: q.o }); FXS.push({ k: 'hit', slot: q.o, n: q.n, t0: now }); });
      if (t > 0.5 && t < 2.3) for (var ri = 0; ri < 3; ri++) { u = ((t * 0.9 + ri / 3) % 1); RG.push({ x: p[0], y: p[1] + 0.5, z: p[2], r: 2.6 - u * 2.0, col: '#ff6b6b', a: 0.55 * Math.sin(u * Math.PI) }); }
    } else if (c.id === 'slip') {
      var ti = st.pos[c.slot], tq = view.tilePos(ti), pk = Math.min(1, Math.max(0, 1));
      sc = t < 2.1 ? popS(t / 0.5) : 1 - eo(cl01((t - 2.1) / 0.8)); s = 0.42 * sc;
      var k = t > 0.6 && t < 2.0 ? 0.5 - 0.5 * Math.cos((t - 0.6) / 1.4 * 3 * Math.PI * 2) : 0;
      var ny = tq.y + 0.95 + (1 - eo(cl01(t / 0.5))) * 1.6 + (t > 2.1 ? eo(cl01((t - 2.1) / 0.8)) * 1.6 : 0);
      P.push({ id: 'slipp', x: tq.x, y: ny, z: tq.z, rx: 0.3, ry: 0.5, s: s, sx: 1 + 0.1 * k, sy: 1 - 0.22 * k });
      out.extra.trapS = { i: ti, s: eo(cl01((t - 0.9) / 1.1)) };
      c.cf.cream = { n: [tq.x, ny, tq.z], g: [tq.x, tq.y + 0.15, tq.z] };
    } else if (c.id === 'freeze') {
      if (c.target < 0) return out; p = tpos(c.target); if (!p) return out;
      out.cam = { slot: c.target, key: 'fz' + c.seq };
      var IMP = 0.95, ft = tfx(c.target);
      if (t < IMP) { u = t / IMP; y = p[1] + 6 * (1 - u * u); } else y = p[1];
      sc = (t < 0.2 ? t / 0.2 : 1) * (t > 1.7 ? 1 - eo(cl01((t - 1.7) / 0.6)) : 1);
      P.push({ id: 'freeze', x: p[0], y: y - 0.1, z: p[2], ry: t < IMP ? t * 6 : 0.8, s: 0.4 * sc, emis: [0.1, 0.16, 0.22] });
      if (t >= IMP) {
        if (once('i')) { S.iceHold = {}; FXS.push({ k: 'pop', slot: c.target, text: 'แช่แข็ง!', col: '#9fe0ff', t0: now, snow: 1 }); FXS.push({ k: 'spark', slot: c.target, col: '#9fe0ff', t0: now }); }
        u = (t - IMP) / 0.8; ft.flash = Math.max(ft.flash || 0, 0.9 * (1 - cl01(u))); ft.shake = Math.max(ft.shake || 0, 0.1 * (1 - cl01(u)));
        if (u < 1) { RG.push({ x: p[0], y: p[1] + 0.05, z: p[2], r: 0.5 + u * 3.2, col: '#3aa8e8', a: 0.8 * (1 - u), noadd: 1 }); RG.push({ x: p[0], y: p[1] + 0.05, z: p[2], r: 0.3 + u * 2.2, col: '#bfe9ff', a: 0.6 * (1 - u), rot: 1, noadd: 1 }); }
      }
    } else if (c.id === 'steal') {
      var vv = c.target, mm = c.slot, pV = tpos(vv), pM = tpos(mm); if (!pV || !pM) return out;
      var eyeV = view.eye || [0, 10, 20], dx = eyeV[0] - pV[0], dz = eyeV[2] - pV[2], dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
      var rx = dz, rz = -dx, bs = 0.55, hx = pV[0] + rx * 1.25, hz = pV[2] + rz * 1.25, hy = pV[1] + 0.05;
      out.cam = t < 3.1 ? { slot: vv, key: 'stA' + c.seq } : { slot: mm, key: 'stB' + c.seq };
      var n = Math.min(c.n, 10), pulse = 0, kk;
      for (kk = 0; kk < n; kk++) { var ta = t - (0.9 + kk * 0.13 + 0.5); if (ta > 0 && ta < 0.3) pulse = Math.max(pulse, Math.sin(ta / 0.3 * Math.PI)); }
      var bx, by, bz, bsc, rzz = 0;
      if (t < 0.9) { u = eo(cl01(t / 0.8)); bx = hx + dx * 2 * (1 - u); bz = hz + dz * 2 * (1 - u); by = hy + 5 * (1 - u) + (t > 0.7 ? Math.sin((t - 0.7) / 0.2 * Math.PI) * 0.2 : 0); bsc = popS(t / 0.6); }
      else if (t < 2.6) { bx = hx; by = hy; bz = hz; bsc = 1; }
      else if (t < 3.2) { u = eo((t - 2.6) / 0.6); bx = hx - rx * 1.5 * u; bz = hz - rz * 1.5 * u; by = hy + 7 * u; bsc = 1 - 0.5 * u; }
      else if (t < 4.7) { u = eo(cl01((t - 3.3) / 0.6)); bx = pM[0]; bz = pM[2]; by = pM[1] + 1.2 + (1 - u) * 1.3; bsc = (t > 4.5 ? 1 - cl01((t - 4.5) / 0.4) : popS((t - 3.3) / 0.5)); rzz = t > 3.9 ? Math.sin(cl01((t - 3.9) / 0.3) * Math.PI / 2) * 2.0 : 0; }
      else bsc = 0;
      if (bsc > 0.001) P.push({ id: 'stealp', x: bx, y: by, z: bz, ry: t < 0.9 ? t * 3 : 0.4, rz: rzz, s: bs * bsc, sx: 1 + 0.12 * pulse, sy: 1 - 0.1 * pulse });
      if (t > 0.9 && t < 2.6) { var vf = tfx(vv); vf.flash = Math.max(vf.flash || 0, 0.45 * Math.abs(Math.sin(t * 9))); vf.shake = Math.max(vf.shake || 0, 0.05); }
      if (t > 1.0 && once('m')) FXS.push({ k: 'pop', slot: vv, text: c.n > 0 ? '-' + c.n : 'ไม่มีเหรียญ!', col: '#ff6b6b', t0: now });
      if (t > 3.9 && c.n > 0 && once('g')) FXS.push({ k: 'gain', slot: mm, n: c.n, t0: now, src: -2 });
      if (t < 2.6) c.cf.suck = { v: vv, n: n, mouth: [hx, hy + 1.7 * bs, hz] };
    } else if (c.id === 'swap') {
      var A = c.moverOld, B = c.targetOld, mf = tfx(c.slot), tf = tfx(c.target), qA = view.tilePos(A), qB = view.tilePos(B);
      var portal = function (q, ph) { var w = 0.9 + Math.sin(ph * 3) * 0.08; RG.push({ x: q.x, y: q.y + 0.05, z: q.z, r: w, col: '#c2188f', a: 0.85, rot: ph * 2, noadd: 1 }); RG.push({ x: q.x, y: q.y + 0.06, z: q.z, r: w * 0.65, col: '#2f6fe0', a: 0.85, rot: -ph * 3, noadd: 1 }); RG.push({ x: q.x, y: q.y, z: q.z, r: 0.5, beam: 1, h: 0.5, col: '#7a4dd8', a: 0.2, noadd: 1 }); };
      if (t < 1.3) {
        out.cam = { slot: c.slot, key: 'swA' + c.seq }; portal(qA, t);
        u = eo(cl01((t - 0.25) / 0.9)); mf.scale = 1 - u; mf.spin = u * u * 12;
      } else {
        if (once('mv')) { S.hold[c.slot] = B; S.idx[c.slot] = B; FXS.push({ k: 'pop', slot: c.slot, text: 'สลับ!', col: '#ff9bd8', t0: now + 600 }); }
        out.cam = { slot: c.slot, key: 'swB' + c.seq }; portal(qB, t);
        u = eo(cl01((t - 1.5) / 0.7)); mf.scale = u; mf.spin = (1 - u) * 10;
        if (t < 2.2) { tf.scale = 1 - u; tf.spin = u * u * 12; }
        else { if (once('tv')) { S.hold[c.target] = A; S.idx[c.target] = A; } tf.scale = eo(cl01((t - 2.4) / 0.5)); tf.spin = 0; }
        if (t > 2.2 && t < 3.2) portal(qA, t);
      }
    }
    return out;
  }
  function drawCutFx(view, now) {
    var c = S.cut; if (!c || !c.cf) return; var t = (now - c.t0) / 1000, g = view.g; if (!g || t < 0) return;
    g.save(); g.imageSmoothingEnabled = false;
    if (c.cf.suck) {
      var sk = c.cf.suck, from = scr(view, sk.v, 0.75), to = view.pr(sk.mouth[0], sk.mouth[1], sk.mouth[2]);
      if (from && to) for (var k = 0; k < sk.n; k++) {
        var tc = t - (0.9 + k * 0.13); if (tc < 0 || tc > 0.5) continue; var u = tc / 0.5, uu = u * u;
        pxCoin(g, from[0] + (to[0] - from[0]) * uu, from[1] + (to[1] - from[1]) * uu - Math.sin(u * Math.PI) * 34, 3, tc * 14 + k);
      }
    }
    if (c.cf.cream) {
      var cr = c.cf.cream, a = view.pr(cr.n[0], cr.n[1], cr.n[2]), b = view.pr(cr.g[0], cr.g[1], cr.g[2]);
      if (a && b) for (var j = 0; j < 8; j++) {
        var tj = t - (0.85 + j * 0.14); if (tj < 0 || tj > 0.4) continue; var uj = tj / 0.4;
        g.fillStyle = j % 2 ? '#fff4f8' : '#ff9fc4'; g.fillRect(Math.round((a[0] + (b[0] - a[0]) * uj + Math.sin(j * 2.1) * 5) / 2) * 2 - 3, Math.round((a[1] + (b[1] - a[1]) * uj * uj) / 2) * 2 - 3, 6, 8);
      }
    }
    g.restore();
  }

  function drawGame(dt, now) {
    var st = S.game; if (!st || !S.cakeView) return;
    var tokens = [];
    Object.keys(st.names).forEach(function (k) {
      var sl = +k, tgt = S.override[sl] != null ? S.override[sl] : st.pos[sl], cur = S.idx[sl] || 0;
      if (S.hold && S.hold[sl] != null) { S.idx[sl] = S.hold[sl]; tokens.push({ slot: sl, name: st.names[sl], idx: S.hold[sl], me: sl === S.slot, turn: false, skin: (st.skins || [])[sl] || 0, ice: !!(st.skip && st.skip[sl] > 0) && !(S.iceHold && S.iceHold[sl]), fx: tokFx(sl, now) }); return; }
      if (st.phase === 'intro') { S.idx[sl] = cur = st.pos[sl]; delete S.override[sl]; tgt = cur; }
      if (S.holdSlot === sl && now < S.holdUntil) { tokens.push({ slot: sl, name: st.names[sl], idx: cur, me: sl === S.slot, turn: false, skin: (st.skins || [])[sl] || 0, ice: !!(st.skip && st.skip[sl] > 0) && !(S.iceHold && S.iceHold[sl]), fx: tokFx(sl, now) }); return; }   // รอเต๋าหมุนเสร็จก่อนค่อยเดิน
      var up = tgt > cur, speed = up ? 1000 / C_STEP_MS : 20, d = speed * dt;
      if (Math.abs(tgt - cur) <= d) { cur = tgt; if (S.override[sl] != null && cur === S.override[sl]) delete S.override[sl]; }
      else cur += up ? d : -d;
      S.idx[sl] = cur;
      tokens.push({ slot: sl, name: st.names[sl], idx: cur, me: sl === S.slot, turn: st.phase === 'roll' && st.order[st.turn] === sl, skin: (st.skins || [])[sl] || 0, ice: !!(st.skip && st.skip[sl] > 0) && !(S.iceHold && S.iceHold[sl]), fx: tokFx(sl, now) });
    });
    var plan = camPlan(st, now), cv = S.cakeView, cfm = cutFrame(st, now, tokens, cv);
    if (S.invTg && S.invTg.list && st.phase !== 'intro') plan = { t: followTarget(S.invTg.list[S.invTg.i], st), extra: {} };
    if (cfm) { if (cfm.cam) { plan.t = cfm.cam.t || followTarget(cfm.cam.slot, st); plan.cut = cfm.cam.key; } plan.extra = plan.extra || {}; for (var ek in cfm.extra) plan.extra[ek] = cfm.extra[ek]; }
    var cut = plan.cut && plan.cut !== S.lastCut; S.lastCut = plan.cut || '';
    if (plan.drop) tokens.forEach(function (tk) { var di = Math.max(0, st.order.indexOf(tk.slot)), u = Math.max(0, Math.min(1, (plan.drop.t - di * plan.drop.dly) / plan.drop.fallT)); tk.fx.lift = (tk.fx.lift || 0) + 9 * (1 - u * u); if (u <= 0) tk.hidden = true; });
    cv.updateCam(plan.t, dt, S.camSnap || cut); S.camSnap = false;
    cv.draw(st, tokens, C.SLOT_COLORS, now, plan.extra);
    if (plan.banner) drawBanner(cv.g, plan.banner, st, plan.bc, cv);
    drawDice3D(cv, now); drawCenterMsg(cv, now, dt);
    if (st.phase === 'roll' && S.dieLbl) {
      var left = Math.max(0, Math.ceil(st.tl - (now - S.gameAt) / 1000)), mine = st.order[st.turn] === S.slot;
      var tx = mine ? 'กด E เปิดเมนู · ทอยลูกเต๋า' + (left > 900 ? '' : ' (' + left + ')') : 'กด E เปิดเมนู · รอ ' + (st.names[st.order[st.turn]] || ''); if (S.dieLbl.title !== tx) S.dieLbl.title = tx;
    }
    if (S.shopOn && st.phase === 'shop' && S.inv && S.inv.shop) shopText(st);
    S.tgView = cv; drawFx(cv, now, dt); drawCutFx(cv, now);
  }

  function drawHead(ts) {
    if (S.game) {
      try {
        if (!S.headView && window.Cake3D && Cake3D.supported()) S.headView = new Cake3D.HeadView($('hud-face'));
        if (S.headView) { var hr = $('hud-face').getBoundingClientRect(), me0 = S.slot < 0 ? 0 : S.slot; S.headView.draw((S.mx - (hr.left + hr.width / 2)) / 300, (S.my - (hr.top + hr.height * 0.45)) / 300, ts, (S.game.skins || [])[me0] || 0, C.SLOT_COLORS[me0]); }
      } catch (e) { window.__he = String(e && e.stack || e); S.headView = null; }
    }
  }
  var lastDraw = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    syncCols();
    var dt = Math.min((ts - (lastDraw || ts)) / 1000, 0.1); lastDraw = ts;
    var sc = curScreen();
    if (S.itOn) itFrame(performance.now());
    if (sc === 'arena' && S.view) drawArena(dt, Date.now());
    else if (sc === 'game') { drawGame(dt, performance.now()); drawHead(ts); if ((S.invOpen || S.spec || S.rolling || S.shopOn) && S.inv) S.inv.draw(performance.now()); }
    else if (sc === 'mg') drawMini(performance.now());
    else if (sc === 'lobby') drawLobby(dt, ts);
    else if (sc === 'menu') drawBg(ts);
  }

  function drawBg(ts) {
    if (!S.bgView) {
      S.bgView = makeView($('bgcake'), null);
      var types = ['plain', 'coin', 'plain', 'mystery', 'plain', 'shop', 'minus', 'plain'], lay = ['start'];
      for (var i = 1; i < 24; i++) lay.push(types[(i * 3) % types.length]);
      lay.push('cherry'); S.bgLay = { layout: lay, traps: [] };
      S.bgSnap = true;
    }
    var t = ts / 1000, toks = [[0, 3 + Math.sin(t * 0.5) * 0.4], [1, 9], [2, 14], [3, 20]].map(function (q) { return { slot: q[0], name: '', idx: q[1], me: false, turn: false }; });
    S.bgView.ox = 0; S.bgView.updateCam({ a: -Math.PI / 2 + t * 0.25, rc: 40, yc: 17, rl: 0, yl: 7.5 }, 0.016, S.bgSnap); S.bgSnap = false;
    S.bgView.draw(S.bgLay, toks, C.SLOT_COLORS, ts);
    if ($('m-char').classList.contains('on') && curScreen() === 'menu' && S.stageView) {
      try { var rc = $('chstage').getBoundingClientRect(); S.stageView.draw((S.mx - (rc.left + rc.width * 0.25)) / 400, (S.my - (rc.top + rc.height * 0.4)) / 400, ts, S.skin || 0, C.PALETTE[S.skin || 0]); } catch (e) { S.stageView = null; }
    }
    if ($('m-main').classList.contains('on') && curScreen() === 'menu') {
      try {
        if (!S.prevView && window.Cake3D && Cake3D.supported()) S.prevView = new Cake3D.CharPreview($('prevcv'));
        if (S.prevView) { var r = $('prevcv').getBoundingClientRect(); S.prevView.draw((S.mx - (r.left + r.width / 2)) / 300, (S.my - (r.top + r.height * 0.4)) / 300, ts, S.skin || 0, C.PALETTE[S.skin || 0]); }
      } catch (e) { S.prevView = null; }
    }
  }
  S.mx = 0; S.my = 0; window.addEventListener('mousemove', function (e) { S.mx = e.clientX; S.my = e.clientY; });

  window.addEventListener('keydown', function (e) {
    if (e.target && e.target.tagName === 'INPUT') return;
    keys[e.code] = true;
    if (/^Arrow/.test(e.code) || e.code === 'Space') e.preventDefault();
    if (e.code === 'Space' && !e.repeat && curScreen() === 'game') { if (S.game && S.game.phase === 'intro') doSkip(); else doRoll(); }
    if (e.code === 'KeyC' && !e.repeat && curScreen() === 'game') toggleCam();
    if (curScreen() === 'mg' && !e.repeat) miniKey(e.code);
  });
  window.addEventListener('keyup', function (e) { keys[e.code] = false; if (curScreen() === 'mg') miniRelease(e.code); });
  window.addEventListener('blur', function () { for (var k in keys) if (keys[k]) miniRelease(k); keys = {}; });

  $('btn-start-menu').onclick = function () { $('m-start').classList.remove('on'); $('m-main').classList.add('on'); $('name-in').focus(); };
  $('btn-menu-back').onclick = function () { $('m-main').classList.remove('on'); $('m-start').classList.add('on'); };
  $('btn-music').onclick = function () { if (!CAu) return; CAu.setMusic(!CAu.getMusic()); $('btn-music').classList.toggle('off', !CAu.getMusic()); if (CAu.getMusic()) CAu.sfx('click'); };
  $('btn-music').classList.toggle('off', !(CAu && CAu.getMusic()));
  audScreen('menu');
  (function () {
    try { S.skin = Math.max(0, Math.min(3, +localStorage.getItem('cakeparty-skin') | 0)); } catch (e) { S.skin = 0; }
    function setSkin(v) { S.skin = (v + 4) % 4; try { localStorage.setItem('cakeparty-skin', S.skin); } catch (e) {} $('skin-name').textContent = Cake3D.CHAR_NAMES[S.skin]; var cs = document.querySelectorAll('#chgrid .chcard'); for (var i = 0; i < cs.length; i++) cs[i].classList.toggle('on', i === S.skin); }
    function openChar() {
      if (!window.Cake3D || !Cake3D.supported()) return;
      try {
        var g = $('chgrid');
        if (!g.children.length) { var ps = Cake3D.portraits(C.PALETTE); ps.forEach(function (u, i) { var b = document.createElement('button'); b.className = 'chcard'; b.innerHTML = '<img src="' + u + '"><span>' + Cake3D.CHAR_NAMES[i] + '</span>'; b.onclick = function () { setSkin(i); }; g.appendChild(b); }); }
        if (!S.stageView) S.stageView = new Cake3D.CharStage($('chstage'));
      } catch (e) { return; }
      setSkin(S.skin); $('m-main').classList.remove('on'); $('m-char').classList.add('on');
    }
    $('prevcv').onclick = openChar; $('ch-ok').onclick = function () { $('m-char').classList.remove('on'); $('m-main').classList.add('on'); };
    setSkin(S.skin);
  })();
  $('btn-create').onclick = createRoom;
  $('btn-join').onclick = joinRoom;
  $('btn-solo').onclick = solo;
  $('btn-itemtest').onclick = function () {
    solo(); S.testItems = true;
    S.room.addPlayer('bot1', 'บอท A', false, 1); S.room.addPlayer('bot2', 'บอท B', false, 2);
    S.room.players.get('bot1').ready = true; S.room.players.get('bot2').ready = true; S.room.pushLobby();
  };
  $('btn-solo2').onclick = function () { if (!$('name-in').value) $('name-in').value = ''; solo(); };
  $('code-in').addEventListener('keydown', function (e) { if (e.key === 'Enter') joinRoom(); });
  $('btn-ready').onclick = function () {
    var me = S.lobby && S.lobby.players.filter(function (q) { return q.slot === S.slot; })[0];
    if (S.net) S.net.send({ t: 'ready', v: !(me && me.ready) });
  };
  $('btn-start').onclick = function () {
    S.gameInit = false; S.seenSeq = 0; S.diceVal = 0; S.msgSeen = -1; S.popMsg = null; S.parts = []; S.idx = {}; S.override = {}; S.cut = null; S.hold = {}; S.iceHold = {}; S.invTg = null;
    if (S.room) { if (S.room.hostStartGame()) show('game'); }
    else if (S.owner && S.net) S.net.send({ t: 'start' });
  };
  $('btn-arena').onclick = function () { if (S.room) { if (S.room.hostStart()) show('arena'); } else if (S.owner && S.net) S.net.send({ t: 'arena' }); };
  $('btn-back').onclick = function () { if (S.room) { if (S.room.hostBack()) show('lobby'); } else if (S.owner && S.net) S.net.send({ t: 'back' }); };
  $('f3skip').onclick = f3Skip; $('f3back').onclick = function () { stopF3(); $('btn-gback').click(); };
  $('btn-gback').onclick = function () { if (S.room) { if (S.room.hostBack()) { S.game = null; S.gameInit = false; show('lobby'); } } else if (S.owner && S.net) S.net.send({ t: 'back' }); };
  $('btn-roll').onclick = doRoll;
  $('btn-mgready').onclick = mgReadyClick;
  $('btn-ittest').onclick = itOpen;
  $('btn-mgtest').onclick = function () { mgTestList(); $('mgtest').style.display = 'block'; };
  $('btn-mgtest-close').onclick = function () { $('mgtest').style.display = 'none'; };
  $('btn-mgt-back').onclick = function () { closeMgTest(true); };
  $('btn-mgt-redo').onclick = function () { if (S.mg && S.mg.test) { newPractice(S.mg); if (S.mgView) S.mgView.reset(); } };
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && S.mg && S.mg.test) closeMgTest(true); });
  setTimeout(function () { var h = (location.hash || '').replace('#', ''); if (h && (CakeShared.GAMES[h] || CakeMini.GAMES[h]) && curScreen() === 'menu') openMgTest(h); }, 300);
  function doSkip() { if (S.game && S.game.phase === 'intro' && !S.skipSent) { S.skipSent = true; send({ t: 'skip' }); renderGameHud(); } }
  function toggleCam() { S.camMode = S.camMode === 'auto' ? 'orbit' : 'auto'; $('btn-cam').textContent = 'กล้อง: ' + (S.camMode === 'auto' ? 'ติดตาม' : 'ภาพรวม') + ' (C)'; }
  $('btn-skip').onclick = doSkip; $('btn-cam').onclick = toggleCam;
  $('btn-join-open').onclick = function () { var b = $('joinbox'); b.style.display = b.style.display === 'none' ? 'flex' : 'none'; if (b.style.display !== 'none') $('code-in').focus(); };
  $('mgc').addEventListener('mousedown', miniClick); $('mgc3').addEventListener('mousedown', miniClick);
  window.addEventListener('mousedown', function (e) { if (e.button === 0) keys.MouseL = true; });
  window.addEventListener('blur', function () { keys.MouseL = false; });
  window.addEventListener('mouseup', function (e) { if (e.button === 0) keys.MouseL = false; });
  window.addEventListener('mouseup', function () { if (curScreen() === 'mg') miniRelease('Click'); });
  window.addEventListener('mousemove', miniMove); window.addEventListener('mouseup', miniUp);
  $('btn-leave').onclick = function () { toMenu(''); };
  $('btn-copy').onclick = function () {
    var c = S.lobby && S.lobby.code; if (!c) return;
    try { navigator.clipboard.writeText(c); setMsg('lobby-msg', 'คัดลอกแล้วค่ะ'); } catch (e) { setMsg('lobby-msg', 'คัดลอกไม่ได้ ให้พิมพ์รหัสเองนะคะ'); }
  };

  try { var saved = localStorage.getItem('cakeparty-name'); if (saved) $('name-in').value = saved; } catch (e) {}
  /* เอฟเฟกต์กดปุ่ม: ปุ่มหุบลงนิดนึงแล้วเด้งกลับ */
  (function btnSquish() {
    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('button, .invpill, .sitem, .slot-card, #prevcv') : null; if (!t || t.disabled) return;
      try { t.animate([{ scale: '1' }, { scale: '0.9', offset: 0.4 }, { scale: '1.03', offset: 0.75 }, { scale: '1' }], { duration: 230, easing: 'ease-out' }); } catch (er) {}
    }, true);
  })();
  /* พื้นหลังลายขนม: ขนมแต่ละชิ้นขยับเอง (ลอย เอียง ยืดหด กระโดด) แล้วทั้งชุดเลื่อนไปทางขวาเป็นลูป */
  (function patBg() {
    var P = window.PATSPR; if (!P) return; var cv = $('patcv'), box = $('patbg'), g = cv.getContext('2d'), img = new Image(), ok = false; img.onload = function () { ok = true; }; img.src = P.img;
    var items = P.s.map(function (s, i) { var h = Math.sin(i * 12.9898) * 43758.5453; h -= Math.floor(h); return { s: s, ph: h * 6.283, per: 3.6 + ((h * 97) % 1) * 3.4, hop0: ((h * 31) % 1) * 6 }; });
    function loop(ts) {
      requestAnimationFrame(loop); if (!ok || !box.getClientRects().length) return;
      var W = window.innerWidth, H = window.innerHeight, d = Math.min(1.5, window.devicePixelRatio || 1); if (cv.width !== Math.round(W * d) || cv.height !== Math.round(H * d)) { cv.width = Math.round(W * d); cv.height = Math.round(H * d); }
      g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, W, H); g.imageSmoothingEnabled = true; g.globalAlpha = 0.42;
      var t = ts / 1000, k = H / 1080, TW = 1920 * k, TH = 1080 * k, off = (t * 46 * k) % TW, nx = Math.ceil(W / TW) + 2, ny = Math.ceil(H / TH), cx, cy;
      for (cy = 0; cy < ny; cy++) for (cx = -1; cx < nx; cx++) items.forEach(function (it) {
        var s = it.s, w = s[2] * k, h = s[3] * k, x = cx * TW + s[4] * k + off, y = cy * TH + s[5] * k; if (x > W + 40 || x + w < -40 || y > H + 40 || y + h < -40) return;
        var hp = ((t + it.hop0) % it.per) / it.per, hop = hp < 0.16 ? Math.sin(hp / 0.16 * Math.PI) : 0, sx = 1 + Math.sin(t * 2 + it.ph) * 0.04 + (hop > 0 ? -0.1 * hop : 0), sy = 1 + Math.cos(t * 2 + it.ph) * 0.04 + hop * 0.14;
        g.save(); g.translate(x + w / 2, y + h / 2 + Math.sin(t * 1.5 + it.ph) * 9 * k - hop * 26 * k); g.rotate(Math.sin(t * 1.15 + it.ph * 1.7) * 0.13 + hop * Math.sin(t * 14) * 0.08); g.scale(sx, sy);
        g.drawImage(img, s[0], s[1], s[2], s[3], -w / 2, -h / 2, w, h); g.restore();
      });
      g.globalAlpha = 1;
    }
    requestAnimationFrame(loop);
  })();
  /* หน้าวิธีเล่น (ตัวเลขดึงจากค่าจริงของเกม) */
  (function rules() {
    var G2 = CakeGame.G, el = $('rules'), bt = $('btn-rules'); if (!el || !bt) return;
    var L = [
      ['เป้าหมาย', 'ไต่เค้กขึ้นไปซื้อเชอร์รี่บนยอดให้ได้ เล่นทั้งหมด ' + G2.ROUNDS + ' รอบ ใครซื้อเชอร์รี่ รอบนั้นจบ ทุกคนกลับจุดเริ่ม แต่เหรียญและไอเทมยังอยู่'],
      ['ทอยเต๋า', 'ผลัดกันทอยตามลำดับ ใช้ไอเทมได้ก่อนทอยในตาตัวเองเท่านั้น กระเป๋าถือไอเทมได้ ' + CakeGame.MAX_ITEMS + ' ชิ้น (กด E เปิดกระเป๋า)'],
      ['เหรียญ', 'เริ่มด้วย ' + G2.START_COINS + ' เหรียญ ช่องเหรียญ +' + G2.COIN_GAIN + ' ช่องโดนหัก -' + G2.COIN_LOSS + ' ชนะมินิเกมได้ ' + G2.MINI_REWARDS.join('/') + ' เหรียญตามอันดับ'],
      ['เชอร์รี่', 'ราคา ' + G2.CHERRY_PRICE + ' เหรียญ ถ้าไปถึงยอดแล้วเหรียญไม่พอ จะถูกส่งกลับจุดเริ่ม คิดให้ดีก่อนขึ้นไป! เชอร์รี่หนึ่งลูก = ' + G2.CHERRY_POINTS + ' ดาว'],
      ['ช่องพิเศษ', 'ร้านค้า: ซื้อไอเทม · ช่องปริศนา: สุ่มเหตุการณ์ · ช่องเหรียญ / ช่องโดนหัก (ตำแหน่งสุ่มใหม่ทุกรอบ)'],
      ['มินิเกม', 'เมื่อทุกคนทอยครบ จะแข่งมินิเกม มีห้องซ้อมให้ลองก่อน ' + G2.PREP_TIME + ' วินาที'],
      ['จบเกม', 'ดาวถูกซ่อนไว้ตลอดเกม! พอจบรอบสุดท้ายจะนับดาวพร้อมกัน: เชอร์รี่ + รางวัลพิเศษ ใครดาวมากที่สุดชนะ']
    ];
    $('rtext').textContent = ''; L.forEach(function (r) { var d = document.createElement('div'); d.className = 'ritem'; var b = document.createElement('b'); b.textContent = r[0]; var s = document.createElement('span'); s.textContent = r[1]; d.appendChild(b); d.appendChild(s); $('rtext').appendChild(d); });
    bt.onclick = function () { el.style.display = 'flex'; }; $('rclose').onclick = function () { el.style.display = 'none'; };
  })();
  if (!CakeNet.available()) $('nopeer').style.display = 'block';
  window.__cake = S;   // สำหรับทดสอบ
  setInterval(logic, 50);
  requestAnimationFrame(frame);
})();
