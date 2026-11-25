/* ตัวอ่านโมเดล GLB (glTF 2.0 แบบไบนารี) และ OBJ -> Builder ของ gl3d (แบน-เฉดสี ไม่มีเส้นขอบ)
   ใช้: ModelLoad.fromGLB(arrayBuffer, {height:2}) / ModelLoad.fromOBJ(text, mtlText, {height:2})  คืน {builder, size} */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(require('./gl3d.js')); else root.ModelLoad = factory(root.GL3); })(typeof self !== 'undefined' ? self : this, function (G) {
  'use strict';
  function finish(tris, opt) {
    opt = opt || {};
    var mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9], i, j;
    tris.forEach(function (t) { t.p.forEach(function (p) { for (j = 0; j < 3; j++) { mn[j] = Math.min(mn[j], p[j]); mx[j] = Math.max(mx[j], p[j]); } }); });
    var h = mx[1] - mn[1] || 1, s = (opt.height || 2) / h, cx = (mn[0] + mx[0]) / 2, cz = (mn[2] + mx[2]) / 2;
    var b = new G.Builder(); b.jit = opt.jit == null ? 0.02 : opt.jit;
    tris.forEach(function (t) {
      var q = t.p.map(function (p) { return [(p[0] - cx) * s, (p[1] - mn[1]) * s, (p[2] - cz) * s]; });
      var col = t.c || [0.8, 0.8, 0.8];
      b.tri(q[0], q[1], q[2], col);
    });
    return { builder: b, size: [(mx[0] - mn[0]) * s, (mx[1] - mn[1]) * s, (mx[2] - mn[2]) * s], tris: tris.length };
  }
  function fromGLB(ab, opt) {
    var dv = new DataView(ab);
    if (dv.getUint32(0, true) !== 0x46546C67) throw new Error('ไม่ใช่ไฟล์ GLB');
    var off = 12, json = null, bin = null;
    while (off < dv.byteLength) {
      var len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true), body = ab.slice(off + 8, off + 8 + len);
      if (type === 0x4E4F534A) json = JSON.parse(new TextDecoder().decode(body)); else if (type === 0x004E4942 && !bin) bin = body;
      off += 8 + len;
    }
    var comps = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
    function acc(i) {
      var a = json.accessors[i], bv = json.bufferViews[a.bufferView], n = comps[a.type], ct = a.componentType, sz = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }[ct];
      var base = (bv.byteOffset || 0) + (a.byteOffset || 0), stride = bv.byteStride || n * sz, out = [], k, c;
      for (k = 0; k < a.count; k++) { var row = []; for (c = 0; c < n; c++) { var o = base + k * stride + c * sz, v;
        if (ct === 5126) v = new DataView(bin).getFloat32(o, true); else if (ct === 5125) v = new DataView(bin).getUint32(o, true); else if (ct === 5123) { v = new DataView(bin).getUint16(o, true); if (a.normalized) v /= 65535; } else if (ct === 5121) { v = new DataView(bin).getUint8(o); if (a.normalized) v /= 255; } else v = 0;
        row.push(v); } out.push(n === 1 ? row[0] : row); }
      return out;
    }
    var tris = [], nodes = json.nodes || [];
    function walk(ni, M) {
      var nd = nodes[ni], m = M;
      if (nd.matrix) m = mul(M, nd.matrix); else { var T = nd.translation || [0, 0, 0], Q = nd.rotation || [0, 0, 0, 1], Sc = nd.scale || [1, 1, 1]; m = mul(M, trs(T, Q, Sc)); }
      if (nd.mesh != null) json.meshes[nd.mesh].primitives.forEach(function (pr) {
        var pos = acc(pr.attributes.POSITION), idx = pr.indices != null ? acc(pr.indices) : pos.map(function (_, i) { return i; }), cols = pr.attributes.COLOR_0 ? acc(pr.attributes.COLOR_0) : null;
        var mat = pr.material != null ? json.materials[pr.material] : null, bc = mat && mat.pbrMetallicRoughness && mat.pbrMetallicRoughness.baseColorFactor || [1, 1, 1, 1];
        var lin = function (v) { return Math.pow(Math.max(0, v), 1 / 2.2); };
        for (var i = 0; i + 2 < idx.length; i += 3) {
          var p = [idx[i], idx[i + 1], idx[i + 2]], c = [0, 0, 0];
          for (var k = 0; k < 3; k++) { var vc = cols ? cols[p[k]] : [1, 1, 1]; for (var j = 0; j < 3; j++) c[j] += lin(bc[j] * vc[j]) / 3; }
          tris.push({ p: p.map(function (q) { return xf(m, pos[q]); }), c: c });
        }
      });
      (nd.children || []).forEach(function (ch) { walk(ch, m); });
    }
    var sc = json.scenes[json.scene || 0], I = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    sc.nodes.forEach(function (n) { walk(n, I); });
    return finish(tris, opt);
  }
  function mul(a, b) { var o = new Array(16), i, j, k; for (i = 0; i < 4; i++) for (j = 0; j < 4; j++) { var s = 0; for (k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; }
  function trs(T, Q, S) {
    var x = Q[0], y = Q[1], z = Q[2], w = Q[3];
    return [(1 - 2 * (y * y + z * z)) * S[0], 2 * (x * y + z * w) * S[0], 2 * (x * z - y * w) * S[0], 0, 2 * (x * y - z * w) * S[1], (1 - 2 * (x * x + z * z)) * S[1], 2 * (y * z + x * w) * S[1], 0, 2 * (x * z + y * w) * S[2], 2 * (y * z - x * w) * S[2], (1 - 2 * (x * x + y * y)) * S[2], 0, T[0], T[1], T[2], 1];
  }
  function xf(m, p) { return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]]; }
  function fromOBJ(text, mtl, opt) {
    var mats = {}, cur = null;
    (mtl || '').split(/\r?\n/).forEach(function (l) { var t = l.trim().split(/\s+/); if (t[0] === 'newmtl') cur = t[1]; else if (t[0] === 'Kd' && cur) mats[cur] = [+t[1], +t[2], +t[3]]; });
    var v = [], tris = [], col = null;
    text.split(/\r?\n/).forEach(function (l) {
      var t = l.trim().split(/\s+/);
      if (t[0] === 'v') v.push([+t[1], +t[2], +t[3]]);
      else if (t[0] === 'usemtl') col = mats[t[1]] || null;
      else if (t[0] === 'f') {
        var ids = t.slice(1).map(function (s) { var i = parseInt(s.split('/')[0], 10); return i < 0 ? v.length + i : i - 1; });
        for (var i = 1; i + 1 < ids.length; i++) tris.push({ p: [v[ids[0]], v[ids[i]], v[ids[i + 1]]], c: col ? col.map(function (x) { return Math.pow(x, 1 / 2.2); }) : null });
      }
    });
    return finish(tris, opt);
  }
  return { fromGLB: fromGLB, fromOBJ: fromOBJ };
});
