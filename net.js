/* ระบบเชื่อมต่อ: WebSocket ไปยังเซิร์ฟเวอร์เกม (server.js) */
var CakeNet = (function () {
  'use strict';

  function available() { return typeof WebSocket === 'function'; }

  // ที่อยู่เซิร์ฟเวอร์: ?server=wss://... > ค่าที่ฝังตอน build > เซิร์ฟเวอร์เดียวกับหน้าเว็บ
  function serverUrl() {
    var q = ''; try { q = (new URLSearchParams(location.search)).get('server') || ''; if (q) localStorage.setItem('cakeparty-server', q); else q = localStorage.getItem('cakeparty-server') || ''; } catch (e) {}
    var u = q || (typeof window !== 'undefined' && window.CAKE_WS) || '';
    if (!u) {
      if (location.protocol === 'http:' || location.protocol === 'https:') u = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
      else u = 'ws://localhost:8080/ws';
    }
    if (/^https?:\/\//.test(u)) u = u.replace(/^http/, 'ws');
    if (!/\/ws$/.test(u) && !/\/ws\?/.test(u)) u = u.replace(/\/+$/, '') + '/ws';
    return u;
  }

  // cb = {onOpen(api), onMessage(msg), onClose(), onError(text)}
  function connect(cb) {
    var ws, done = false, opened = false, timer, ping;
    function fail(text) { if (done) return; done = true; clearTimeout(timer); clearInterval(ping); try { ws.close(); } catch (e) {} cb.onError(text); }
    var api = {
      send: function (msg) { if (ws && ws.readyState === 1) { try { ws.send(JSON.stringify(msg)); } catch (e) {} } },
      close: function () { done = true; clearTimeout(timer); clearInterval(ping); try { ws.close(); } catch (e) {} }
    };
    try { ws = new WebSocket(serverUrl()); } catch (e) { setTimeout(function () { fail('ที่อยู่เซิร์ฟเวอร์ไม่ถูกต้องค่ะ'); }, 0); return api; }
    timer = setTimeout(function () { fail('ต่อเซิร์ฟเวอร์เกมไม่ได้ค่ะ (หมดเวลา) ตรวจว่าเซิร์ฟเวอร์เปิดอยู่และใส่ที่อยู่ถูกต้อง'); }, 15000);
    ws.onopen = function () { opened = true; clearTimeout(timer); ping = setInterval(function () { api.send({ t: 'ping' }); }, 20000); cb.onOpen(api); };
    ws.onmessage = function (e) { var m; try { m = JSON.parse(e.data); } catch (x) { return; } if (m && m.t === 'pong') return; cb.onMessage(m); };
    ws.onclose = function () { clearTimeout(timer); clearInterval(ping); if (done) return; done = true; if (opened) cb.onClose(); else cb.onError('ต่อเซิร์ฟเวอร์เกมไม่ได้ค่ะ ลองใหม่อีกครั้ง'); };
    ws.onerror = function () { /* onclose จะแจ้งเอง */ };
    return api;
  }

  return { available: available, connect: connect, serverUrl: serverUrl };
})();
if (typeof module === 'object' && module.exports) module.exports = CakeNet;
