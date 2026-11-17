/* เกมหลัก: ไต่เค้ก 24 ช่อง ผลัดกันทอยเต๋า ซื้อเชอร์รี่ 4 รอบ
   ลอจิกล้วน (ไม่แตะ DOM/เครือข่าย) ให้เครื่องเจ้าของห้องเป็นผู้ตัดสิน */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CakeGame = factory();
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  var G = Object.freeze({
    TOP: 24, ROUNDS: 4, CHERRY_PRICE: 40, CHERRY_POINTS: 10, START_COINS: 10,
    COIN_GAIN: 3, COIN_LOSS: 3, MINI_REWARDS: [10, 7, 4, 2], RICH_BONUS: 3,
    DICE_TIME: 1.9, RESULT_TIME: 3.6, CHERRY_TIME: 20, CHERRY_ANIM: 4.5, PREP_TIME: 40, TURN_TIME: 25, SHOP_TIME: 30, INTRO_TIME: 27, INTRO_FAST: 17, STEP_TIME: 0.5,
    COUNTS: { coin: 5, minus: 3, mystery: 3, shop: 2 }   // ที่เหลือเป็นช่องธรรมดา
  });

  // รายการไอเทม: kind d=เต๋าพิเศษ(ใช้กับตัวเอง) p=แกล้งเพื่อน c=เหรียญ  target=ต้องเลือกเป้าหมาย
  var ITEMS = {
    double:  { name: 'เต๋าคู่', kind: 'd', price: 10, desc: 'ทอย 2 ลูกบวกกัน (2-12)' },
    giant:   { name: 'เต๋ายักษ์', kind: 'd', price: 13, desc: 'ได้แต้ม 1-10' },
    slow:    { name: 'เต๋าช้า', kind: 'd', price: 5, desc: 'ได้แต้ม 1-3 คุมระยะแม่นๆ' },
    lock:    { name: 'เต๋าล็อกเลข', kind: 'd', price: 8, desc: 'ได้แต้ม 4 แน่นอน' },
    gamble:  { name: 'เต๋าเสี่ยงดวง', kind: 'd', price: 6, desc: 'ออก 0 หรือ 10 เท่านั้น' },
    triple:  { name: 'เต๋าสามลูก', kind: 'd', price: 16, desc: 'ทอย 3 ลูก เก็บลูกที่สูงสุด' },
    reverse: { name: 'เต๋ากลับด้าน', kind: 'd', price: 4, desc: 'ทอยแล้วถอยหลังแทนเดินหน้า' },
    swap:    { name: 'ปืนสลับที่', kind: 'p', price: 24, target: true, desc: 'สลับตำแหน่งกับคนที่เลือก' },
    steal:   { name: 'ขโมยเหรียญ', kind: 'p', price: 13, target: true, desc: 'ขโมย 5 เหรียญจากคนที่เลือก' },
    slip:    { name: 'ครีมลื่น', kind: 'p', price: 8, desc: 'วางกับดักบนช่องที่ยืน คนอื่นที่เหยียบถอยหลัง 3 ช่อง' },
    freeze:  { name: 'แช่แข็ง', kind: 'p', price: 16, target: true, desc: 'เป้าหมายข้ามการทอยครั้งถัดไป' },
    magnet:  { name: 'แม่เหล็กดูดเหรียญ', kind: 'c', price: 18, desc: 'ดูดเหรียญจากทุกคนที่เหลือคนละ 2' },
    ticket:  { name: 'ตั๋วทอง', kind: 'c', price: 10, desc: 'เหรียญรางวัลมินิเกมครั้งถัดไปคูณ 2' }
  };
  var ITEM_IDS = Object.keys(ITEMS);
  var MAX_ITEMS = 8;

  // เหตุการณ์ช่องปริศนา (น้ำหนักเท่ากันทุกอย่าง)
  var EVENTS = [
    { id: 'coins', name: 'เหรียญตกจากฟ้า', desc: 'ได้เหรียญ +6' },
    { id: 'spill', name: 'ครีมหกใส่กระเป๋า', desc: 'เสียเหรียญ -5' },
    { id: 'wind', name: 'ลมพัดหลัง', desc: 'ก้าวหน้า 3 ช่อง' },
    { id: 'slide', name: 'ลื่นล้ม', desc: 'ถอยหลัง 3 ช่อง' },
    { id: 'treat', name: 'แจกขนม', desc: 'ทุกคนได้เหรียญ +2' },
    { id: 'gift', name: 'ของขวัญลึกลับ', desc: 'ได้ไอเทมสุ่ม 1 ชิ้น (ถ้าช่องเต็มก็ไม่ได้อะไร)' },
    { id: 'thief', name: 'โจรขนม', desc: 'ขโมย 4 เหรียญจากคนสุ่ม' },
    { id: 'swaprand', name: 'เค้กสั่น', desc: 'สลับที่กับคนสุ่ม' },
    { id: 'tax', name: 'ภาษีหวาน', desc: 'ทุกคนเสียเหรียญ -2' }
  ];

  function Game(slots, opts) {
    opts = opts || {};
    this.rng = opts.rng || Math.random;
    this.onChange = opts.onChange || function () {};
    this.slots = slots.slice();              // [{slot,name}]
    this.names = {};
    var self = this;
    this.slots.forEach(function (s) { self.names[s.slot] = s.name; });
    this.coins = [0, 0, 0, 0]; this.points = [0, 0, 0, 0]; this.pos = [0, 0, 0, 0];
    this.items = [[], [], [], []]; this.mod = [null, null, null, null];
    this.skip = [0, 0, 0, 0]; this.ticket = [false, false, false, false];
    this.slots.forEach(function (s) { self.coins[s.slot] = G.START_COINS; });
    this.round = 1; this.cherries = 0; this.buyer = -1;
    this.order = this._shuffle(this.slots.map(function (s) { return s.slot; }));
    this.turn = 0; this.layout = this._makeLayout(); this.traps = {};
    this.shop = null; this.mg = null; this.lastMg = null; this.minis = opts.minis || (typeof CakeMini !== 'undefined' ? CakeMini.GAMES : null);
    this.sharedDefs = opts.shared || (typeof CakeShared !== 'undefined' ? CakeShared.GAMES : null);
    this.sim = null; this.mgT = 0; this.simEnd = 0;
    this.useIntro = !!opts.intro; this.skips = {};
    this.phase = 'roll'; this.timer = G.TURN_TIME; this.next = null;
    this.last = { seq: 0, slot: -1, v: 0, from: 0, to: 0, back: false, via: -1 };
    this.msg = 'เริ่มเกม! รอบที่ 1'; this.msgSeq = 1;
    this.results = null; this.winners = [];
    if (this.useIntro) { this.phase = 'intro'; this.timer = G.INTRO_TIME; this.msg = 'เริ่มเกม! ดูว่ารอบนี้เค้กสุ่มอะไรไว้ตรงไหน'; }
  }

  Game.prototype._shuffle = function (a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(this.rng() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  };
  Game.prototype._pick = function (a) { return a[Math.floor(this.rng() * a.length) % a.length]; };
  Game.prototype._d6 = function () { return 1 + Math.floor(this.rng() * 6); };

  Game.prototype._makeLayout = function () {
    var pool = [], k;
    for (k in G.COUNTS) for (var i = 0; i < G.COUNTS[k]; i++) pool.push(k);
    while (pool.length < G.TOP - 1) pool.push('plain');
    pool = this._shuffle(pool);
    return ['start'].concat(pool, ['cherry']);
  };

  Game.prototype._say = function (m) { this.msg = m; this.msgSeq++; };
  Game.prototype.current = function () { return this.phase === 'roll' ? this.order[this.turn] : -1; };
  Game.prototype._others = function (slot) { return this.order.filter(function (s) { return s !== slot; }); };
  Game.prototype._addCoins = function (slot, n) { this.coins[slot] = Math.max(0, this.coins[slot] + n); };
  Game.prototype._take = function (from, to, n) { var t = Math.min(n, this.coins[from]); this.coins[from] -= t; this.coins[to] += t; return t; };
  Game.prototype._giveItem = function (slot, id) {
    if (this.items[slot].length >= MAX_ITEMS) return false;
    this.items[slot].push(id); return true;
  };

  /* ---------- ใช้ไอเทม (ก่อนทอย ในตาตัวเองเท่านั้น) ---------- */
  Game.prototype.useItem = function (slot, idx, target) {
    if (this.phase !== 'roll' || this.order[this.turn] !== slot) return false;
    var list = this.items[slot];
    if (typeof idx !== 'number' || idx < 0 || idx >= list.length || idx !== Math.floor(idx)) return false;
    var id = list[idx], it = ITEMS[id], name = this.names[slot], t = -1;
    if (it.kind === 'd' && this.mod[slot]) { this._say('เลือกเต๋าพิเศษได้เพียง 1 ลูกต่อตา'); this.onChange(); return false; }
    if (it.target) {
      var cands = this._others(slot);
      if (!cands.length) { this._say('ไม่มีเพื่อนให้ใช้ ' + it.name); this.onChange(); return false; }
      t = cands.indexOf(target) >= 0 ? target : (cands.length === 1 ? cands[0] : -1);
      if (t < 0) return false;
    }
    list.splice(idx, 1);
    var tn = t >= 0 ? this.names[t] : '', text = name + ' ใช้' + it.name;
    if (it.kind === 'd') { this.mod[slot] = id; text += ' (ใช้กับการทอยครั้งนี้)'; }
    else if (id === 'swap') { var tp = this.pos[t]; this.pos[t] = this.pos[slot]; this.pos[slot] = tp; text += ' สลับที่กับ ' + tn; this.last = { seq: this.last.seq + 1, slot: -1, v: 0, from: 0, to: 0, back: false, via: -1, teleport: true }; }
    else if (id === 'steal') { var n = this._take(t, slot, 5); text += ' ขโมย ' + n + ' เหรียญจาก ' + tn; }
    else if (id === 'slip') { this.traps[this.pos[slot]] = slot; text += ' วางกับดักครีมไว้ที่ช่องนี้'; }
    else if (id === 'freeze') { this.skip[t]++; text += ' ใส่ ' + tn + ' ข้ามตาถัดไป'; }
    else if (id === 'magnet') {
      var tot = 0, self = this; this._others(slot).forEach(function (o) { tot += self._take(o, slot, 2); });
      text += ' ดูดเหรียญได้รวม ' + tot;
    } else if (id === 'ticket') { this.ticket[slot] = true; text += ' มินิเกมถัดไปได้เหรียญ x2'; }
    this._say(text); this.onChange();
    return true;
  };

  /* ---------- ทอยเต๋า ---------- */
  Game.prototype.roll = function (slot, forced) {
    if (this.phase !== 'roll' || this.order[this.turn] !== slot) return false;
    var mod = this.mod[slot]; this.mod[slot] = null;
    var v, dir = 1, name = this.names[slot];
    if (mod === 'double') v = this._d6() + this._d6();
    else if (mod === 'giant') v = 1 + Math.floor(this.rng() * 10);
    else if (mod === 'slow') v = 1 + Math.floor(this.rng() * 3);
    else if (mod === 'lock') v = 4;
    else if (mod === 'gamble') v = this.rng() < 0.5 ? 0 : 10;
    else if (mod === 'triple') v = Math.max(this._d6(), this._d6(), this._d6());
    else if (mod === 'reverse') { v = this._d6(); dir = -1; }
    else v = this._d6();
    var c0 = this.coins.slice(); this._evt = null; this._gift = null;
    var from = this.pos[slot], to = dir > 0 ? Math.min(G.TOP, from + v) : Math.max(0, from - v);
    var steps = Math.abs(to - from), extra = 0;
    this.pos[slot] = to;
    var ev = { seq: this.last.seq + 1, slot: slot, v: v, from: from, to: to, back: false, via: -1 };
    this.next = 'turn';
    var text = name + (mod ? ' (' + ITEMS[mod].name + ')' : '') + ' ทอยได้ ' + v + (dir < 0 ? ' ถอยหลัง' : '') + (forced ? ' (หมดเวลา ทอยให้อัตโนมัติ)' : '');
    if (to === G.TOP && dir > 0) {
      if (this.coins[slot] >= G.CHERRY_PRICE) {
        ev.cherry = 'ask'; this.next = 'cherryask'; this.cherrySlot = slot;
        text += ' ถึงยอดเค้ก! เลือกว่าจะซื้อเชอร์รี่ ' + G.CHERRY_PRICE + ' เหรียญหรือไม่';
      } else {
        this.pos[slot] = 0; ev.back = true; ev.via = G.TOP; extra = G.TOP * 0.35;
        text += ' ถึงยอดเค้กแต่เหรียญไม่พอ (ต้องมี ' + G.CHERRY_PRICE + ') ถูกส่งกลับจุดเริ่ม';
      }
    } else if (to !== from) {
      var trapOwner = this.traps[to];
      if (trapOwner !== undefined && trapOwner !== slot) {
        delete this.traps[to]; this.pos[slot] = Math.max(0, to - 3); ev.via = to; extra = 1.2;
        text += ' เหยียบครีมลื่นของ ' + (this.names[trapOwner] || 'ใครสักคน') + ' ไถลถอยหลัง 3 ช่อง';
      } else text += this._landing(slot, to, ev);
      if (this.next === 'turn' && this.layout[to] === 'shop' && ev.via < 0) this.next = 'shop';
    }
    this.last = ev; this._say(text);
    ev.cd = this.coins.map(function (c, i) { return c - c0[i]; }); ev.tile = to !== from ? this.layout[to] : null; ev.evt = this._evt; ev.gift = this._gift;
    var effect = to !== from && (this.layout[to] !== 'plain' || ev.via >= 0 || ev.back || to === G.TOP) && ev.cherry !== 'ask';
    ev.steps = steps;
    // ทอยเต๋าก่อน -> เดิน -> หยุดโชว์ผลช่องที่ลง -> ค่อยไปต่อ
    this.phase = 'busy'; this.timer = G.DICE_TIME + steps * G.STEP_TIME + (effect ? G.RESULT_TIME : 1.0) + extra;
    this.onChange();
    return true;
  };

  Game.prototype._landing = function (slot, to, ev) {
    var t = this.layout[to];
    if (t === 'coin') { this._addCoins(slot, G.COIN_GAIN); return ' ช่องเหรียญ +' + G.COIN_GAIN; }
    if (t === 'minus') { var l = Math.min(G.COIN_LOSS, this.coins[slot]); this.coins[slot] -= l; return ' ช่องโดนหัก -' + l; }
    if (t === 'shop') return ' ถึงร้านค้า!';
    if (t === 'mystery') return this._mystery(slot, ev);
    return '';
  };

  Game.prototype._mystery = function (slot, ev) {
    var e = this._pick(EVENTS), self = this; this._evt = e.id;
    var ee = e, r = ' ช่องปริศนา: ' + ee.name + ' — ' + e.desc;
    var others = this._others(slot);
    if (e.id === 'coins') this._addCoins(slot, 6);
    else if (e.id === 'spill') this._addCoins(slot, -5);
    else if (e.id === 'wind') { this.pos[slot] = Math.min(G.TOP - 1, this.pos[slot] + 3); ev.via = ev.to; }
    else if (e.id === 'slide') { this.pos[slot] = Math.max(0, this.pos[slot] - 3); ev.via = ev.to; }
    else if (e.id === 'treat') this.order.forEach(function (o) { self._addCoins(o, 2); });
    else if (e.id === 'tax') this.order.forEach(function (o) { self._addCoins(o, -2); });
    else if (e.id === 'gift') { var id = this._pick(ITEM_IDS); r += this._giveItem(slot, id) ? ' → ' + ITEMS[id].name : ' → ช่องเต็ม ไม่ได้อะไร'; this._gift = id; }
    else if (e.id === 'thief') { if (others.length) { var o = this._pick(others); r += ' (จาก ' + this.names[o] + ' ' + this._take(o, slot, 4) + ')'; } }
    else if (e.id === 'swaprand') {
      if (others.length) { var o2 = this._pick(others), tp = this.pos[o2]; this.pos[o2] = this.pos[slot]; this.pos[slot] = tp; r += ' (กับ ' + this.names[o2] + ')'; ev.via = ev.to; }
    }
    return r;
  };

  /* ---------- ร้านค้า ---------- */
  Game.prototype._openShop = function () {
    if (this.order[this.turn] === undefined) return this._advance();
    var n = 3 + Math.floor(this.rng() * 2);
    this.shop = { slot: this.order[this.turn], stock: this._shuffle(ITEM_IDS).slice(0, n) };
    this.phase = 'shop'; this.timer = G.SHOP_TIME;
    this._say(this.names[this.shop.slot] + ' เข้าร้านค้า');
    this.onChange();
  };
  Game.prototype.buy = function (slot, i) {
    if (this.phase !== 'shop' || !this.shop || this.shop.slot !== slot) return false;
    var id = this.shop.stock[i]; if (!id) return false;
    var it = ITEMS[id];
    if (this.coins[slot] < it.price) { this._say('เหรียญไม่พอซื้อ ' + it.name); this.onChange(); return false; }
    if (this.items[slot].length >= MAX_ITEMS) { this._say('ช่องไอเทมเต็ม (สูงสุด ' + MAX_ITEMS + ')'); this.onChange(); return false; }
    this.coins[slot] -= it.price; this.items[slot].push(id); this.shop.stock[i] = null;
    this._say(this.names[slot] + ' ซื้อ ' + it.name + ' (' + it.price + ' เหรียญ)'); this.onChange();
    return true;
  };
  Game.prototype.leaveShop = function (slot) {
    if (this.phase !== 'shop' || !this.shop || this.shop.slot !== slot) return false;
    this._closeShop(); return true;
  };
  Game.prototype._closeShop = function () { this.shop = null; this._advance(); };

  /* ---------- การไหลของตา ---------- */
  Game.prototype.cherryChoice = function (slot, yes) {
    if (this.phase !== 'cherry' || this.cherrySlot !== slot) return false;
    var c0 = this.coins.slice(), ev = { seq: this.last.seq + 1, slot: slot, v: 0, from: G.TOP, to: G.TOP, back: false, via: -1, teleport: true, steps: 0 };
    if (yes && this.coins[slot] >= G.CHERRY_PRICE) {
      this.coins[slot] -= G.CHERRY_PRICE; this.points[slot] += G.CHERRY_POINTS; this.cherries++; this.buyer = slot; this.next = 'round'; ev.cherry = 'buy';
      this._say(this.names[slot] + ' ซื้อเชอร์รี่ ' + G.CHERRY_PRICE + ' เหรียญ ได้ ' + G.CHERRY_POINTS + ' แต้ม');
      this.timer = G.CHERRY_ANIM;
    } else {
      this.pos[slot] = 0; this.next = 'turn'; ev.cherry = 'no'; ev.back = true;
      this._say(this.names[slot] + ' ไม่ซื้อเชอร์รี่ กลับไปจุดเริ่ม'); this.timer = 1.8;
    }
    ev.cd = this.coins.map(function (c, i) { return c - c0[i]; });
    this.last = ev; this.phase = 'busy'; this.onChange(); return true;
  };

  Game.prototype._afterBusy = function () {
    if (this.next === 'cherryask') { this.next = 'turn'; this.phase = 'cherry'; this.timer = G.CHERRY_TIME; this._say(this.names[this.cherrySlot] + ' เลือกว่าจะซื้อเชอร์รี่หรือไม่'); this.onChange(); return; }
    if (this.next === 'round') return this._newRound();
    if (this.next === 'shop') { this.next = 'turn'; return this._openShop(); }
    this._advance();
  };

  Game.prototype._advance = function () {
    this.turn++;
    if (this.turn >= this.order.length) return this._miniStub();
    this._startTurn();
  };

  Game.prototype._intro = function () { this.phase = 'intro'; this.timer = this.round > 1 ? G.INTRO_FAST : G.INTRO_TIME; this.skips = {}; this.onChange(); };
  Game.prototype.skipIntro = function (slot) {
    if (this.phase !== 'intro' || this.order.indexOf(slot) < 0) return false;
    this.skips[slot] = true; var self = this;
    if (this.order.every(function (o) { return self.skips[o]; })) this._startTurn(); else this.onChange();
    return true;
  };

  Game.prototype._startTurn = function () {
    var cur = this.order[this.turn];
    if (cur !== undefined && this.skip[cur] > 0) {
      this.skip[cur]--; this.next = 'turn'; this.phase = 'busy'; this.timer = 1.6;
      this._say(this.names[cur] + ' ถูกแช่แข็ง ข้ามตานี้'); this.onChange(); return;
    }
    this._toRoll();
  };

  Game.prototype._toRoll = function () { this.phase = 'roll'; this.timer = G.TURN_TIME; this.onChange(); };

  // ครบรอบทอยแล้วเริ่มมินิเกม (ถ้าไม่มีชุดมินิเกมให้ ใช้การสุ่มอันดับแทน เพื่อการทดสอบ)
  Game.prototype._miniStub = function () {
    var games = this.minis || {}, sh = this.sharedDefs || {}, pool = [], k;
    for (k in games) pool.push({ id: k, kind: 'solo' });
    for (k in sh) pool.push({ id: k, kind: 'shared' });
    if (!pool.length) {
      var rank = this._shuffle(this.order);
      return this._giveRewards(rank.map(function (s, i) { return { slot: s, score: 100 - i }; }), '(มินิเกมจำลอง) ');
    }
    var self = this, cand = pool.filter(function (e) { return e.id !== self.lastMg; });
    var pick = this._pick(cand.length ? cand : pool); this.lastMg = pick.id;
    var seed = 1 + Math.floor(this.rng() * 1e9), def, dur;
    if (pick.kind === 'shared') {
      def = sh[pick.id]; this.sim = def.make(this.order.slice(), seed); this.mgT = -3; this.simEnd = 0; dur = this.sim.dur * 1000;
    } else { def = games[pick.id]; dur = def.dur; this.sim = null; }
    this.mg = { id: pick.id, kind: pick.kind, seed: seed, dur: dur, scores: [0, 0, 0, 0], fin: [false, false, false, false] };
    this.mg.ready = [false, false, false, false];
    this.phase = 'mgprep'; this.timer = G.PREP_TIME;     // ห้องฝึกซ้อม: ทุกคนซ้อมและกดพร้อมก่อนแข่งจริง
    this._say('มินิเกม: ' + def.name + ' — ซ้อมแล้วกดพร้อม');
    this.onChange();
  };

  Game.prototype.mgReady = function (slot) {
    if (this.phase !== 'mgprep' || !this.mg || this.order.indexOf(slot) < 0) return false;
    this.mg.ready[slot] = true;
    var self = this;
    if (this.order.every(function (o) { return self.mg.ready[o]; })) this._beginMg(); else this.onChange();
    return true;
  };

  Game.prototype._beginMg = function () {
    if (this.phase !== 'mgprep' || !this.mg) return;
    this.phase = 'mg'; this.timer = 3 + this.mg.dur / 1000 + 3 + (this.sim ? 2 : 0);
    this.onChange();
  };

  Game.prototype.simInput = function (slot, i) { if (this.sim && this.phase === 'mg') this.sim.input(slot, i); };
  Game.prototype.simSnapshot = function () { return this.sim ? this.sim.snapshot() : null; };

  Game.prototype.mgScore = function (slot, score, final) {
    if (this.phase !== 'mg' || !this.mg || this.sim || this.order.indexOf(slot) < 0) return false;
    if (typeof score !== 'number' || !isFinite(score)) return false;
    this.mg.scores[slot] = Math.max(0, Math.min(9999, Math.floor(score)));
    if (final) this.mg.fin[slot] = true;
    var self = this;
    if (this.order.every(function (o) { return self.mg.fin[o]; })) this._endMini(); else this.onChange();
    return true;
  };

  Game.prototype._endMini = function () {
    var self = this, mg = this.mg;
    if (this.sim) { this.sim.scores().forEach(function (r) { mg.scores[r[0]] = r[1]; }); this.sim = null; }
    var list = this.order.map(function (o) { return { slot: o, score: mg.scores[o] }; });
    this.mg = null; this.resShowScore = true;
    this._giveRewards(list, 'ผลมินิเกม: ');
  };

  // list: [{slot,score}] คะแนนเท่ากันได้รางวัลของอันดับที่สูงกว่าร่วมกัน
  Game.prototype._giveRewards = function (list, prefix) {
    var self = this, parts = [];
    list = list.slice().sort(function (a, b) { return b.score - a.score; });
    list.forEach(function (e, i) {
      var j = i; while (j > 0 && list[j - 1].score === e.score) j--;
      var r = G.MINI_REWARDS[j] || 0;
      if (self.ticket[e.slot]) { r *= 2; self.ticket[e.slot] = false; }
      self.coins[e.slot] += r; e.reward = r;
      parts.push((j + 1) + '. ' + self.names[e.slot] + (e.score !== undefined && prefix.indexOf('จำลอง') < 0 ? ' (' + e.score + ')' : '') + ' +' + r);
    });
    this.results = parts;
    this.resList = list.map(function (e) { var j = list.indexOf(e); while (j > 0 && list[j - 1].score === e.score) j--; return { slot: e.slot, score: e.score, reward: e.reward, rank: j + 1 }; });
    this.phase = 'mini'; this.timer = 5;
    this._say(prefix + parts.join('  '));
    this.onChange();
  };

  Game.prototype._orderForRound = function () {
    var self = this, rest = this.order.filter(function (s) { return s !== self.buyer; });
    var keyed = this._shuffle(rest);
    keyed.sort(function (a, b) { return self.coins[a] - self.coins[b]; });   // sort เสถียร: เสมอกันคงลำดับสุ่ม
    if (this.slots.some(function (s) { return s.slot === self.buyer; })) keyed.push(this.buyer);
    return keyed;
  };

  Game.prototype._newRound = function () {
    if (this.cherries >= G.ROUNDS) return this._finish();
    var self = this;
    this.order = this._orderForRound(); this.turn = 0; this.buyer = -1;
    this.round++; this.layout = this._makeLayout(); this.traps = {}; this.shop = null;
    this.slots.forEach(function (s) { self.pos[s.slot] = 0; self.mod[s.slot] = null; });
    this._say('รอบที่ ' + this.round + ' เริ่มแล้ว ทุกคนกลับจุดเริ่ม สลับช่องบนเค้กใหม่ (ไอเทมยังอยู่)');
    if (this.useIntro) this._intro(); else this._startTurn();
  };

  Game.prototype._finish = function () {
    var self = this, rich = -1, best = -1, tie = false;
    this.slots.forEach(function (s) {
      var c = self.coins[s.slot];
      if (c > best) { best = c; rich = s.slot; tie = false; } else if (c === best) tie = true;
    });
    var bonus = '';
    if (rich >= 0 && !tie && best > 0) { this.points[rich] += G.RICH_BONUS; bonus = ' โบนัสคนเหรียญเหลือมากสุด: ' + this.names[rich] + ' +' + G.RICH_BONUS; }
    var list = this.slots.map(function (s) { return s.slot; });
    list.sort(function (a, b) { return self.points[b] - self.points[a] || self.coins[b] - self.coins[a]; });
    this.winners = list; this.phase = 'end'; this.timer = 0;
    this._say('จบเกม! ผู้ชนะคือ ' + this.names[list[0]] + bonus);
    this.onChange();
  };

  Game.prototype.tick = function (dt) {
    if (!(dt > 0) || this.phase === 'end') return;
    dt = Math.min(dt, 0.1);
    if (this.phase === 'mg' && this.sim) {
      this.mgT += dt;
      if (this.mgT > 0 && !this.sim.done) this.sim.tick(dt);
      if (this.sim.done) { this.simEnd = this.simEnd || 1.8; this.simEnd -= dt; if (this.simEnd <= 0) { this._endMini(); return; } }
    }
    this.timer -= dt;
    if (this.timer > 0) return;
    if (this.phase === 'roll') this.roll(this.order[this.turn], true);
    else if (this.phase === 'busy') this._afterBusy();
    else if (this.phase === 'shop') this._closeShop();
    else if (this.phase === 'cherry') this.cherryChoice(this.cherrySlot, true);
    else if (this.phase === 'mgprep') this._beginMg();
    else if (this.phase === 'mg') this._endMini();
    else if (this.phase === 'intro') this._startTurn();
    else if (this.phase === 'mini') { this.turn = 0; this._startTurn(); }
  };

  Game.prototype.removePlayer = function (slot) {
    var i = this.order.indexOf(slot);
    if (i < 0) return;
    if (this.phase === 'cherry' && this.cherrySlot === slot) this.cherryChoice(slot, false);
    this.order.splice(i, 1);
    this.slots = this.slots.filter(function (s) { return s.slot !== slot; });
    if (i < this.turn) this.turn--;
    else if (i === this.turn && this.phase !== 'roll' && this.phase !== 'mini') { this.turn--; if (this.next === 'shop') this.next = 'turn'; }
    if (this.shop && this.shop.slot === slot) { this.shop = null; this.phase = 'busy'; this.timer = 0.1; this.next = 'turn'; }
    if (this.buyer === slot) this.buyer = -1;
    delete this.skips[slot];
    if (this.phase === 'intro') { var s3 = this; if (this.order.length && this.order.every(function (o) { return s3.skips[o]; })) { this._startTurn(); return; } }
    if (this.sim) this.sim.remove(slot);
    if (this.phase === 'mgprep' && this.mg) {
      var self3 = this;
      if (!this.order.length) { this.mg = null; this.sim = null; this.phase = 'mini'; this.timer = 1; }
      else if (this.order.every(function (o) { return self3.mg.ready[o]; })) { this._beginMg(); return; }
    }
    if (this.phase === 'mg' && this.mg) {
      var self2 = this;
      if (!this.order.length) { this.mg = null; this.sim = null; this.phase = 'mini'; this.timer = 1; }
      else if (this.order.every(function (o) { return self2.mg.fin[o]; })) { this._endMini(); return; }
    }
    if (this.phase === 'roll') {
      if (this.turn >= this.order.length) { if (this.order.length) this._miniStub(); }
      else this.timer = G.TURN_TIME;
    }
    this._say(this.names[slot] + ' ออกจากเกม');
    this.onChange();
  };

  Game.prototype.snapshot = function () {
    return {
      cs: this.phase === 'cherry' ? this.cherrySlot : -1, round: this.round, rounds: G.ROUNDS, price: G.CHERRY_PRICE, order: this.order.slice(), turn: this.turn,
      phase: this.phase, pos: this.pos.slice(), coins: this.coins.slice(), points: this.points.slice(),
      layout: this.layout.slice(), last: this.last,
      items: this.items.map(function (a) { return a.slice(); }), shop: this.shop ? { slot: this.shop.slot, stock: this.shop.stock.slice() } : null,
      skips: this.order.filter(function (o) { return this.skips[o]; }, this),
      mg: this.mg ? { id: this.mg.id, kind: this.mg.kind, seed: this.mg.seed, dur: this.mg.dur, scores: this.mg.scores.slice(), fin: this.mg.fin.slice(), ready: (this.mg.ready || []).slice() } : null,
      res: this.phase === 'mini' && this.resList ? this.resList.map(function (e) { return { slot: e.slot, score: e.score, reward: e.reward, rank: e.rank }; }) : [],
      mod: this.mod.slice(), skip: this.skip.slice(), ticket: this.ticket.slice(),
      traps: (function (t) { var r = []; for (var k in t) r.push([+k, t[k]]); return r; })(this.traps), msg: this.msg, msgSeq: this.msgSeq,
      buyer: this.buyer, winners: this.winners.slice(), tl: Math.max(0, Math.round(this.timer * 10) / 10),
      names: this.names
    };
  };

  return { G: G, Game: Game, ITEMS: ITEMS, ITEM_IDS: ITEM_IDS, EVENTS: EVENTS, MAX_ITEMS: MAX_ITEMS };
});
