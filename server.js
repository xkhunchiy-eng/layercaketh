/* เซิร์ฟเวอร์เกม CakeParty — Node.js ล้วน ไม่ต้อง npm install
   รัน:  node server.js        (ตั้งพอร์ตด้วย PORT=8080)
   - เสิร์ฟหน้าเกม (dist/index.html) ที่ "/"
   - เปิดห้อง/เข้าห้องผ่าน WebSocket ที่ "/ws"
   - ลอจิกเกมทั้งหมด (HostRoom/Game) รันที่เซิร์ฟเวอร์ ทุกคนเป็นผู้เล่นเท่ากัน */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
globalThis.CakeMini = require('./src/minigames.js');
globalThis.CakeShared = require('./src/shared.js');
const Core = require('./src/core.js');
const GameMod = require('./src/game.js');

const PORT = +process.env.PORT || 8080;
const TICK_MS = 33;
const MAX_ROOMS = 200;

/* ---------- WebSocket (RFC 6455 แบบย่อ) ---------- */
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
function frame(op, payload) {
  const len = payload.length; let h;
  if (len < 126) h = Buffer.from([0x80 | op, len]);
  else if (len < 65536) { h = Buffer.alloc(4); h[0] = 0x80 | op; h[1] = 126; h.writeUInt16BE(len, 2); }
  else { h = Buffer.alloc(10); h[0] = 0x80 | op; h[1] = 127; h.writeBigUInt64BE(BigInt(len), 2); }
  return Buffer.concat([h, payload]);
}
class WS {
  constructor(sock, onMsg, onClose) {
    this.sock = sock; this.buf = Buffer.alloc(0); this.frag = []; this.alive = true; this.open = true;
    sock.setNoDelay(true); sock.setKeepAlive(true, 20000);
    sock.on('data', d => { this.buf = Buffer.concat([this.buf, d]); try { this.parse(onMsg); } catch (e) { this.close(); } });
    const end = () => { if (this.open) { this.open = false; onClose(); } };
    sock.on('close', end); sock.on('error', end); sock.on('end', end);
  }
  parse(onMsg) {
    for (;;) {
      const b = this.buf; if (b.length < 2) return;
      const fin = !!(b[0] & 0x80), op = b[0] & 0x0f, masked = !!(b[1] & 0x80); let len = b[1] & 0x7f, off = 2;
      if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (b.length < 10) return; len = Number(b.readBigUInt64BE(2)); off = 10; }
      if (len > 1 << 20) throw new Error('too big');
      if (b.length < off + (masked ? 4 : 0) + len) return;
      let payload;
      if (masked) { const m = b.subarray(off, off + 4); payload = Buffer.from(b.subarray(off + 4, off + 4 + len)); for (let i = 0; i < len; i++) payload[i] ^= m[i & 3]; off += 4 + len; }
      else { payload = Buffer.from(b.subarray(off, off + len)); off += len; }
      this.buf = b.subarray(off);
      if (op === 8) { this.close(); return; }
      if (op === 9) { this.sock.write(frame(10, payload)); continue; }
      if (op === 10) { this.alive = true; continue; }
      if (op === 0 || op === 1 || op === 2) {
        this.frag.push(payload);
        if (fin) { const full = Buffer.concat(this.frag); this.frag = []; onMsg(full.toString('utf8')); }
      }
    }
  }
  send(text) { if (this.open) { try { this.sock.write(frame(1, Buffer.from(text, 'utf8'))); } catch (e) {} } }
  ping() { if (this.open) { try { this.sock.write(frame(9, Buffer.alloc(0))); } catch (e) {} } }
  close() { if (this.open) { try { this.sock.write(frame(8, Buffer.alloc(0))); } catch (e) {} } try { this.sock.end(); } catch (e) {} setTimeout(() => { try { this.sock.destroy(); } catch (e) {} }, 500); }
}

/* ---------- ห้อง ---------- */
const rooms = new Map();   // code -> { room, conns: Map(id->ws), hostId, last }
let nextId = 1;

function makeRoomCode() {
  for (let i = 0; i < 50; i++) { const c = Core.makeCode(); if (!rooms.has(c)) return c; }
  return null;
}
function closeRoom(code, why) {
  const r = rooms.get(code); if (!r) return; rooms.delete(code);
  r.conns.forEach(ws => { ws.send(JSON.stringify({ t: 'closed', why })); ws.close(); });
}
function createRoom(ws, id, name, skin) {
  if (rooms.size >= MAX_ROOMS) { ws.send(JSON.stringify({ t: 'rejected', reason: 'busy' })); return null; }
  const code = makeRoomCode(); if (!code) { ws.send(JSON.stringify({ t: 'rejected', reason: 'busy' })); return null; }
  const rec = { conns: new Map(), hostId: id, code, last: Date.now(), room: null, acc: 0 };
  rec.room = new Core.HostRoom({
    code, sendAll: true, Game: GameMod.Game,
    send: (to, m) => { const w = rec.conns.get(to); if (w) w.send(JSON.stringify(m)); }
  });
  rec.conns.set(id, ws); rooms.set(code, rec);
  rec.room.addPlayer(id, name, true, skin);
  const slot = rec.room.players.get(id).slot;
  ws.send(JSON.stringify({ t: 'joined', slot, code, owner: true }));
  rec.room.pushLobby();
  return rec;
}

function onMessage(ws, st, text) {
  let m; try { m = JSON.parse(text); } catch (e) { return; }
  if (!m || typeof m !== 'object') return;
  const id = st.id;
  if (!st.rec) {
    if (m.t === 'create') st.rec = createRoom(ws, id, m.name, m.skin);
    else if (m.t === 'join') {
      const code = Core.normalizeCode(m.code), rec = rooms.get(code);
      if (!rec) { ws.send(JSON.stringify({ t: 'rejected', reason: 'noroom' })); return; }
      rec.conns.set(id, ws);
      const before = rec.room.players.has(id);
      rec.room.handle(id, { t: 'join', name: m.name, skin: m.skin });
      if (!rec.room.players.has(id)) { rec.conns.delete(id); return; }
      st.rec = rec; if (!before) rec.last = Date.now();
    }
    return;
  }
  const rec = st.rec, room = rec.room; rec.last = Date.now();
  const isOwner = id === rec.hostId;
  if (m.t === 'start' && isOwner) { if (room.allReady()) room.hostStartGame(); }
  else if (m.t === 'arena' && isOwner) room.hostStart();
  else if (m.t === 'back' && isOwner) room.hostBack();
  else if (m.t === 'ping') ws.send('{"t":"pong"}');
  else room.handle(id, m);
}
function onClose(st) {
  const rec = st.rec; if (!rec) return;
  rec.conns.delete(st.id);
  if (st.id === rec.hostId) closeRoom(rec.code, 'host-left');
  else { rec.room.removePlayer(st.id); }
}

/* ---------- วนเวลาเกม ---------- */
let lastT = Date.now(), bAcc = 0;
setInterval(() => {
  const now = Date.now(), dt = Math.min((now - lastT) / 1000, 0.25); lastT = now; bAcc += dt;
  const bcast = bAcc >= 0.05; if (bcast) bAcc = 0;
  rooms.forEach(rec => {
    const room = rec.room;
    try {
      room.tick(dt);
      if (bcast && (room.phase === 'arena' || room.phase === 'lobby')) room.broadcastState();
    } catch (e) { console.error('room error', rec.code, e && e.stack); closeRoom(rec.code, 'error'); }
  });
}, TICK_MS);
setInterval(() => { const now = Date.now(); rooms.forEach((rec, c) => { if (now - rec.last > 30 * 60 * 1000) closeRoom(c, 'idle'); }); }, 60000);

/* ---------- HTTP + upgrade ---------- */
const server = http.createServer((req, res) => {
  const u = (req.url || '/').split('?')[0];
  if (u === '/health') { res.writeHead(200, { 'content-type': 'text/plain', 'access-control-allow-origin': '*' }); res.end('ok rooms=' + rooms.size); return; }
  if (u === '/' || u === '/index.html') {
    const f = path.join(__dirname, 'dist', 'index.html');
    fs.readFile(f, (e, d) => {
      if (e) { res.writeHead(404); res.end('dist/index.html not found (run python3 build.py)'); return; }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' }); res.end(d);
    });
    return;
  }
  res.writeHead(404); res.end('not found');
});
server.on('upgrade', (req, sock) => {
  if (!/^\/ws/.test(req.url || '') || String(req.headers.upgrade).toLowerCase() !== 'websocket' || !req.headers['sec-websocket-key']) { sock.destroy(); return; }
  const key = crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + GUID).digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + key + '\r\n\r\n');
  const st = { id: 'c' + (nextId++), rec: null };
  const ws = new WS(sock, t => onMessage(ws, st, t), () => onClose(st));
  st.ws = ws;
});
setInterval(() => { /* ping กันเน็ตตัดการเชื่อมต่อที่เงียบ */
  rooms.forEach(rec => rec.conns.forEach(w => { if (!w.alive) { w.close(); return; } w.alive = false; w.ping(); }));
}, 25000);

server.listen(PORT, () => console.log('CakeParty server on :' + PORT));
module.exports = { server, rooms };
