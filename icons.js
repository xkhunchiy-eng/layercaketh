/* ไอคอนไอเทมแบบขนม/พิกเซลสดใส วาดด้วยโค้ด (ไม่มีเส้นขอบดำ) บนตาราง 32x32 */
var Icons = (function () {
  'use strict';
  function die(g, x, y, s, col, pips) {
    g.fillStyle = '#c9b8c0'; g.fillRect(x + 1, y + 2, s, s);
    g.fillStyle = col || '#ffffff'; g.fillRect(x, y, s, s);
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(x, y, s, 2);
    g.fillStyle = '#d6407a';
    var P = { 1: [[.5, .5]], 2: [[.28, .28], [.72, .72]], 3: [[.25, .25], [.5, .5], [.75, .75]], 4: [[.28, .28], [.72, .28], [.28, .72], [.72, .72]], 5: [[.25, .25], [.75, .25], [.5, .5], [.25, .75], [.75, .75]], 6: [[.28, .25], [.72, .25], [.28, .5], [.72, .5], [.28, .75], [.72, .75]] };
    (P[pips] || []).forEach(function (p) { g.beginPath(); g.arc(x + p[0] * s, y + p[1] * s, Math.max(1, s * 0.09), 0, 7); g.fill(); });
  }
  function circ(g, x, y, r, c) { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  function poly(g, pts, c) { g.fillStyle = c; g.beginPath(); pts.forEach(function (p, i) { i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.closePath(); g.fill(); }
  var D = {
    die: function (g) { die(g, 4, 4, 24, '#ffffff', 5); },
    double: function (g) { die(g, 4, 10, 15, '#fff', 3); die(g, 14, 6, 15, '#ffe9a8', 4); },
    giant: function (g) { die(g, 3, 3, 26, '#fff', 5); },
    slow: function (g) { die(g, 9, 9, 14, '#bff5d8', 2); circ(g, 25, 8, 2, '#8fe3b0'); circ(g, 28, 12, 1.5, '#8fe3b0'); },
    lock: function (g) { die(g, 5, 8, 20, '#fff', 4); poly(g, [[18, 18], [29, 18], [29, 29], [18, 29]], '#ffc928'); g.strokeStyle = '#d89a00'; g.lineWidth = 2.2; g.beginPath(); g.arc(23.5, 18, 3.6, Math.PI, 0); g.stroke(); circ(g, 23.5, 24, 1.4, '#9a6400'); },
    gamble: function (g) { die(g, 4, 4, 24, '#ffd0e0', 0); g.fillStyle = '#d6407a'; g.font = 'bold 20px TAGBA, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 16, 17); },
    triple: function (g) { die(g, 2, 14, 13, '#fff', 6); die(g, 17, 14, 13, '#fff', 6); die(g, 9.5, 3, 13, '#ffe9a8', 6); },
    reverse: function (g) { die(g, 12, 10, 18, '#fff', 3); poly(g, [[2, 16], [10, 8], [10, 13], [14, 13], [14, 19], [10, 19], [10, 24]], '#ff6f91'); },
    swap: function (g) { poly(g, [[3, 10], [20, 10], [20, 18], [3, 18]], '#ff8fb8'); poly(g, [[20, 12], [29, 14], [29, 16], [20, 16]], '#ffd24a'); poly(g, [[6, 18], [12, 18], [10, 28], [5, 28]], '#c64a86'); circ(g, 12, 7, 3, '#fff'); },
    steal: function (g) { poly(g, [[10, 12], [22, 12], [27, 28], [5, 28]], '#c98a4a'); poly(g, [[10, 12], [22, 12], [20, 8], [12, 8]], '#e3a85f'); circ(g, 16, 21, 5, '#ffd24a'); g.fillStyle = '#b36b00'; g.fillRect(15, 18, 2, 6); },
    slip: function (g) { circ(g, 16, 22, 9, '#fff'); circ(g, 11, 17, 6, '#fff'); circ(g, 21, 17, 6, '#ffd6e6'); poly(g, [[12, 6], [20, 6], [16, 14]], '#fff'); circ(g, 16, 6, 3, '#fff'); circ(g, 16, 4, 2, '#ff4d6d'); },
    freeze: function (g) { poly(g, [[6, 8], [20, 4], [28, 12], [22, 28], [8, 24]], '#bdeaff'); poly(g, [[6, 8], [20, 4], [16, 14]], '#e9f9ff'); poly(g, [[16, 14], [28, 12], [22, 28]], '#8ccaf0'); g.fillStyle = '#fff'; g.fillRect(10, 11, 2, 2); g.fillRect(19, 18, 2, 2); },
    magnet: function (g) { g.strokeStyle = '#ff5a6e'; g.lineWidth = 7; g.beginPath(); g.arc(16, 16, 8, Math.PI, 0); g.stroke(); g.fillStyle = '#ff5a6e'; g.fillRect(5, 16, 7, 9); g.fillRect(20, 16, 7, 9); g.fillStyle = '#e8eef5'; g.fillRect(5, 21, 7, 6); g.fillRect(20, 21, 7, 6); circ(g, 4, 6, 1.5, '#ffd24a'); circ(g, 28, 5, 1.5, '#ffd24a'); },
    ticket: function (g) { poly(g, [[3, 9], [29, 9], [29, 14], [27, 16], [29, 18], [29, 23], [3, 23], [3, 18], [5, 16], [3, 14]], '#ffcf2e'); g.fillStyle = '#c98a00'; g.font = 'bold 12px TAGBA, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('x2', 16, 16.5); circ(g, 25, 12, 1.2, '#fff6b0'); }
  };
  var cache = {};
  function make(id, px) {
    px = px || 48; var key = id + ':' + px; if (cache[key]) { var c2 = document.createElement('canvas'); c2.width = c2.height = px; c2.getContext('2d').drawImage(cache[key], 0, 0); c2.className = 'ico'; return c2; }
    var c = document.createElement('canvas'); c.width = c.height = px; c.className = 'ico';
    var g = c.getContext('2d'); g.scale(px / 32, px / 32); if (D[id]) D[id](g); else circ(g, 16, 16, 10, '#ffb3cf');
    cache[key] = c; return make(id, px);
  }
  return { make: make, ids: Object.keys(D) };
})();
