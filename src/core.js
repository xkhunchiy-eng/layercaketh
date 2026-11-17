/* แกนเกม: ห้อง ผู้เล่น และลอจิกที่ "คนสร้างห้อง" เป็นผู้ตัดสิน
   ไม่แตะ DOM และไม่รู้จักเครือข่าย จึงทดสอบด้วย Node ได้ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CakeCore = factory();
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  var CFG = Object.freeze({
    ARENA_R: 7,       // รัศมีสนามทดสอบ (หน่วยโลก)
    SPEED: 4.5,       // ความเร็วเดิน หน่วยต่อวินาที
    PLAYER_R: 0.55,   // รัศมีตัวผู้เล่นสำหรับการชน
    MAX_PLAYERS: 4,
    NAME_MAX: 12,
    CODE_LEN: 4
  });

  // ตัดตัวที่สับสนง่ายออก (0 O 1 I L)
  var ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

  // สีชั่วคราวประจำช่อง (จะถูกแทนด้วยภาพตัวละครของผู้ใช้ทีหลัง)
  var PALETTE = ['#ff5d73', '#4dabf7', '#ffd43b', '#69db7c', '#b57cff', '#ff9a3d'];
  var SLOT_COLORS = PALETTE.slice(0, 4);   // สีของแต่ละช่อง (ถูกปรับตามสีที่ระบบกำหนดให้ผู้เล่น)
  function okSkin(v) { v = +v; return v >= 0 && v <= 3 ? v | 0 : 0; }

  function makeCode(rand) {
    rand = rand || Math.random;
    var s = '';
    for (var i = 0; i < CFG.CODE_LEN; i++) s += ALPHABET[Math.floor(rand() * ALPHABET.length)];
    return s;
  }

  function normalizeCode(s) {
    return String(s == null ? '' : s).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CFG.CODE_LEN);
  }

  function isValidCode(s) {
    if (typeof s !== 'string' || s.length !== CFG.CODE_LEN) return false;
    for (var i = 0; i < s.length; i++) if (ALPHABET.indexOf(s[i]) < 0) return false;
    return true;
  }

  function sanitizeName(name, fallback) {
    var s = typeof name === 'string' ? name : '';
    s = s.replace(/[\u0000-\u001f\u007f<>&"']/g, '').replace(/\s+/g, ' ').trim();
    s = Array.from(s).slice(0, CFG.NAME_MAX).join('');
    return s || fallback;
  }

  function num(v) { return typeof v === 'number' && isFinite(v) ? v : 0; }
  function r2(v) { return Math.round(v * 100) / 100; }

  function spawnPoint(slot) {
    var a = slot * Math.PI / 2 + Math.PI / 4;
    return { x: Math.cos(a) * 3.5, z: Math.sin(a) * 3.5 };
  }

  function HostRoom(opts) {
    opts = opts || {};
    this.code = opts.code || '';
    this.send = opts.send || function () {};
    this.onLobby = opts.onLobby || function () {};
    this.onGame = opts.onGame || function () {};
    this.phase = 'lobby'; // 'lobby' | 'arena' | 'game'
    this.players = new Map();
    this.game = null;
    this.GameClass = opts.Game || null;
    this.sendAll = !!opts.sendAll;   // เซิร์ฟเวอร์ส่งให้ทุกคน (รวมเจ้าของห้อง)
  }

  HostRoom.prototype._freeSlot = function () {
    var used = {};
    this.players.forEach(function (p) { used[p.slot] = true; });
    for (var i = 0; i < CFG.MAX_PLAYERS; i++) if (!used[i]) return i;
    return -1;
  };

  // กำหนดสีอัตโนมัติ: ไม่ให้ซ้ำกับใครในห้อง ลองสีประจำตัวละครก่อน (ลูกอมแดง เม็ดยาฟ้า เยลลี่เหลือง คัพเค้กเขียว)
  HostRoom.prototype._pickCol = function (skin, exceptId) {
    var used = {}; this.players.forEach(function (q) { if (q.id !== exceptId) used[q.col] = 1; });
    if (!used[skin]) return skin;
    for (var i = 0; i < PALETTE.length; i++) if (!used[i]) return i;
    return 0;
  };
  HostRoom.prototype.addPlayer = function (id, name, isHost, skin) {
    var ex = this.players.get(id);
    if (ex) return { ok: true, slot: ex.slot, existing: true };
    if (this.phase !== 'lobby') return { ok: false, reason: 'started' };
    var slot = this._freeSlot();
    if (slot < 0) return { ok: false, reason: 'full' };
    var sp = spawnPoint(slot);
    this.players.set(id, {
      id: id, slot: slot, host: !!isHost,
      name: sanitizeName(name, 'ผู้เล่น ' + (slot + 1)),
      x: sp.x, z: sp.z, h: Math.PI, ix: 0, iz: 0, mv: false, walk: 0, ready: false, skin: okSkin(skin), col: this._pickCol(okSkin(skin))
    });
    return { ok: true, slot: slot };
  };

  HostRoom.prototype.removePlayer = function (id) {
    var p = this.players.get(id);
    var had = this.players.delete(id);
    if (had && this.game && p) this.game.removePlayer(p.slot);
    if (had) this.pushLobby();
    return had;
  };

  // ข้อความจากผู้เล่นอื่น (ไม่เชื่อข้อมูลจากเครือข่าย ตรวจทุกอย่างก่อนใช้)
  HostRoom.prototype.handle = function (id, msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.t === 'join') {
      var r = this.addPlayer(id, msg.name, false, msg.skin);
      if (!r.ok) { this.send(id, { t: 'rejected', reason: r.reason }); return; }
      this.send(id, { t: 'joined', slot: r.slot, code: this.code });
      this.pushLobby();
    } else if (msg.t === 'input') {
      if (this.players.has(id)) this.setInput(id, msg.x, msg.z);
    } else if (msg.t === 'skin') {
      var ps0 = this.players.get(id); if (ps0 && this.phase === 'lobby') { ps0.skin = okSkin(msg.v); ps0.col = this._pickCol(ps0.skin, id); this.pushLobby(); }
    } else if (msg.t === 'mready') {
      var pr = this.players.get(id); if (pr && this.game) this.game.mgReady(pr.slot);
    } else if (msg.t === 'ready') {
      if (this.players.has(id)) this.setReady(id, !!msg.v);
    } else if (msg.t === 'roll') {
      var pl = this.players.get(id);
      if (pl && this.game) this.game.roll(pl.slot);
    } else if (msg.t === 'skip') {
      var ps = this.players.get(id);
      if (ps && this.game) this.game.skipIntro(ps.slot);
    } else if (msg.t === 'in') {
      var pi = this.players.get(id);
      if (pi && this.game) this.game.simInput(pi.slot, { x: msg.x, y: msg.y, a: msg.a, ax: msg.ax, ay: msg.ay });
    } else if (msg.t === 'mg') {
      var pm = this.players.get(id);
      if (pm && this.game) this.game.mgScore(pm.slot, msg.s, !!msg.f);
    } else if (msg.t === 'use' || msg.t === 'buy' || msg.t === 'leave' || msg.t === 'cherry') {
      var pq = this.players.get(id);
      if (pq && this.game) {
        if (msg.t === 'use') this.game.useItem(pq.slot, msg.i, msg.target);
        else if (msg.t === 'buy') this.game.buy(pq.slot, msg.i);
        else if (msg.t === 'cherry') this.game.cherryChoice(pq.slot, !!msg.yes);
        else this.game.leaveShop(pq.slot);
      }
    }
    // ข้อความอื่น (รวมถึงสั่งเริ่มเกม) จากผู้เล่นอื่นถูกเมินโดยตั้งใจ
  };

  HostRoom.prototype.setReady = function (id, v) {
    var p = this.players.get(id);
    if (!p || this.phase !== 'lobby') return false;
    p.ready = !!v; this.pushLobby(); return true;
  };
  // ทุกคนที่ไม่ใช่เจ้าของห้องกดพร้อมแล้ว (เล่นคนเดียวถือว่าพร้อม)
  HostRoom.prototype.allReady = function () {
    var ok = true;
    this.players.forEach(function (p) { if (!p.host && !p.ready) ok = false; });
    return ok;
  };

  HostRoom.prototype.setInput = function (id, x, z) {
    var p = this.players.get(id);
    if (!p) return;
    x = Math.max(-1, Math.min(1, num(x)));
    z = Math.max(-1, Math.min(1, num(z)));
    var len = Math.hypot(x, z);
    if (len > 1) { x /= len; z /= len; }
    p.ix = x; p.iz = z;
  };

  // เฉพาะคนสร้างห้องเรียกได้ (ผ่านเมธอด ไม่ผ่านข้อความเครือข่าย)
  HostRoom.prototype.hostStart = function () {
    if (this.phase !== 'lobby' || this.players.size < 1) return false;
    this.phase = 'arena';
    this.players.forEach(function (p) {
      var sp = spawnPoint(p.slot);
      p.x = sp.x; p.z = sp.z; p.h = Math.PI; p.ix = 0; p.iz = 0; p.mv = false;
    });
    this.pushLobby();
    return true;
  };

  // เริ่มเกมหลัก (เฉพาะเจ้าของห้อง)
  HostRoom.prototype.hostStartGame = function () {
    var GC = this.GameClass || (typeof CakeGame !== 'undefined' ? CakeGame.Game : null);
    if (this.phase !== 'lobby' || this.players.size < 1 || !GC) return false;
    var self = this, slots = [];
    this.players.forEach(function (p) { slots.push({ slot: p.slot, name: p.name }); });
    slots.sort(function (a, b) { return a.slot - b.slot; });
    this.game = new GC(slots, { onChange: function () { self.pushGame(); }, intro: true });
    this.phase = 'game';
    this.pushLobby();
    this.pushGame();
    return true;
  };

  HostRoom.prototype.pushGame = function () {
    if (!this.game) return null;
    var sk = [0, 0, 0, 0], ck = [0, 1, 2, 3]; this.players.forEach(function (q) { sk[q.slot] = q.skin || 0; ck[q.slot] = q.col || 0; });
    var m = { t: 'game', s: this.game.snapshot() }, self = this; m.s.skins = sk; m.s.cols = ck;
    this.players.forEach(function (p) { if (!p.host || self.sendAll) self.send(p.id, m); });
    this.onGame(m.s);
    return m;
  };

  HostRoom.prototype.hostBack = function () {
    if (this.phase !== 'arena' && this.phase !== 'game') return false;
    this.game = null;
    this.phase = 'lobby';
    this.players.forEach(function (p) { p.ix = 0; p.iz = 0; p.mv = false; p.ready = false; });
    this.pushLobby();
    return true;
  };

  HostRoom.prototype.tick = function (dt) {
    if (this.phase === 'game' && this.game) {
      this.game.tick(dt);
      this.simAcc = (this.simAcc || 0) + (dt > 0 ? Math.min(dt, 0.1) : 0);
      if (this.simAcc >= 0.033 && this.game && this.game.sim) {
        this.simAcc = 0;
        var m = { t: 'sim', s: this.game.sim.snapshot() }, self = this;
        this.players.forEach(function (p) { if (!p.host || self.sendAll) self.send(p.id, m); });
      }
      return;
    }
    if (this.phase !== 'arena' && this.phase !== 'lobby') return;
    dt = Math.min(Math.max(num(dt), 0), 0.1);
    var list = Array.from(this.players.values());
    var i, j;
    for (i = 0; i < list.length; i++) {
      var p = list[i];
      p.mv = Math.hypot(p.ix, p.iz) > 0.05;
      if (p.mv) {
        p.x += p.ix * CFG.SPEED * dt;
        p.z += p.iz * CFG.SPEED * dt;
        p.h = Math.atan2(p.ix, p.iz);
        p.walk += dt * CFG.SPEED * 1.6;
      }
    }
    var min = CFG.PLAYER_R * 2;
    for (i = 0; i < list.length; i++) {
      for (j = i + 1; j < list.length; j++) {
        var a = list[i], b = list[j];
        var dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
        if (d < min) {
          var nx, nz;
          if (d < 1e-6) { nx = 1; nz = 0; d = 0; } else { nx = dx / d; nz = dz / d; }
          var push = (min - d) / 2;
          a.x -= nx * push; a.z -= nz * push;
          b.x += nx * push; b.z += nz * push;
        }
      }
    }
    var lim = CFG.ARENA_R - CFG.PLAYER_R;
    for (i = 0; i < list.length; i++) {
      var q = list[i], r = Math.hypot(q.x, q.z);
      if (r > lim) { q.x *= lim / r; q.z *= lim / r; }
    }
  };

  HostRoom.prototype.snapshot = function () {
    var p = [];
    this.players.forEach(function (q) {
      p.push([q.slot, r2(q.x), r2(q.z), r2(q.h), q.mv ? 1 : 0, r2(q.walk)]);
    });
    return { t: 'state', p: p };
  };

  HostRoom.prototype.lobbyInfo = function () {
    var players = [];
    this.players.forEach(function (q) { players.push({ slot: q.slot, name: q.name, host: q.host, ready: !!q.ready, skin: q.skin || 0, col: q.col || 0 }); });
    players.sort(function (a, b) { return a.slot - b.slot; });
    return { t: 'lobby', phase: this.phase, code: this.code, players: players };
  };

  HostRoom.prototype.pushLobby = function () {
    var info = this.lobbyInfo(), self = this;
    this.players.forEach(function (p) { if (!p.host || self.sendAll) self.send(p.id, info); });
    this.onLobby(info);
  };

  HostRoom.prototype.broadcastState = function () {
    var snap = this.snapshot(), self = this;
    this.players.forEach(function (p) { if (!p.host || self.sendAll) self.send(p.id, snap); });
    return snap;
  };

  return {
    CFG: CFG, SLOT_COLORS: SLOT_COLORS, PALETTE: PALETTE, makeCode: makeCode, normalizeCode: normalizeCode,
    isValidCode: isValidCode, sanitizeName: sanitizeName, spawnPoint: spawnPoint, HostRoom: HostRoom
  };
});
