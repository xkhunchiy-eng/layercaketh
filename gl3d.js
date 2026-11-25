/* เอนจิน 3D ขนาดเล็กสำหรับโลว์โพลิกอน (WebGL1): สร้างโมเดลจากทรงเรขาคณิต ย้อมสีเรียบ แฟลตเชด ไม่มีเส้นขอบ
   ส่วนคณิตศาสตร์และตัวสร้างโมเดลไม่แตะ DOM จึงทดสอบด้วย Node ได้ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GL3 = factory();
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  /* ---------- เมทริกซ์ (column-major) ---------- */
  var M4 = {
    id: function () { return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); },
    mul: function (a, b) {
      var o = new Float32Array(16), c, r, k, s;
      for (c = 0; c < 4; c++) for (r = 0; r < 4; r++) { s = 0; for (k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; }
      return o;
    },
    persp: function (fovy, asp, n, f) {
      var t = 1 / Math.tan(fovy / 2), o = new Float32Array(16);
      o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f); return o;
    },
    look: function (e, c, u) {
      var z = nrm(sub(e, c)), x = nrm(crs(u, z)), y = crs(z, x);
      return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1]);
    },
    translate: function (x, y, z) { var o = M4.id(); o[12] = x; o[13] = y; o[14] = z; return o; },
    scale: function (x, y, z) { var o = M4.id(); o[0] = x; o[5] = y; o[10] = z; return o; },
    rotY: function (a) { var c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]); },
    rotX: function (a) { var c = Math.cos(a), s = Math.sin(a); return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]); },
    rotZ: function (a) { var c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); },
    // หมุนให้แกน +Y ชี้ไปทางเวกเตอร์ d
    orient: function (d) {
      d = nrm(d); var ax = crs([0, 1, 0], d), al = Math.hypot(ax[0], ax[1], ax[2]);
      if (al < 1e-6) return d[1] >= 0 ? M4.id() : M4.rotX(Math.PI);
      ax = [ax[0] / al, ax[1] / al, ax[2] / al];
      var c = d[1], s = al, t = 1 - c, x = ax[0], y = ax[1], z = ax[2];
      return new Float32Array([t * x * x + c, t * x * y + s * z, t * x * z - s * y, 0, t * x * y - s * z, t * y * y + c, t * y * z + s * x, 0, t * x * z + s * y, t * y * z - s * x, t * z * z + c, 0, 0, 0, 0, 1]);
    },
    pt: function (m, p) { return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]]; }
  };
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function crs(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function nrm(a) { var l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }

  var colCache = {};
  function rgb(c) {
    if (typeof c !== 'string') return c;
    var v = colCache[c]; if (v) return v;
    var n = parseInt(c.slice(1), 16);
    v = colCache[c] = [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    return v;
  }
  function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = (n + (n << 3)) | 0; n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return (n >>> 0) / 4294967296; }

  /* ---------- ตัวสร้างโมเดล ---------- */
  function Builder() { this.v = []; this.m = M4.id(); this.st = []; this.jit = 0.05; this.n = 0; }
  var B = Builder.prototype;
  B.push = function () { this.st.push(this.m); return this; };
  B.pop = function () { this.m = this.st.pop(); return this; };
  B.tr = function (x, y, z) { this.m = M4.mul(this.m, M4.translate(x, y, z)); return this; };
  B.sc = function (x, y, z) { this.m = M4.mul(this.m, M4.scale(x, y == null ? x : y, z == null ? x : z)); return this; };
  B.ry = function (a) { this.m = M4.mul(this.m, M4.rotY(a)); return this; };
  B.rx = function (a) { this.m = M4.mul(this.m, M4.rotX(a)); return this; };
  B.rz = function (a) { this.m = M4.mul(this.m, M4.rotZ(a)); return this; };
  B.dir = function (d) { this.m = M4.mul(this.m, M4.orient(d)); return this; };
  B.tri = function (a, b, c, col, f) {
    var m = this.m, p = M4.pt(m, a), q = M4.pt(m, b), r = M4.pt(m, c);
    var n = crs(sub(q, p), sub(r, p)), l = Math.hypot(n[0], n[1], n[2]);
    if (l < 1e-9) return; n = [n[0] / l, n[1] / l, n[2] / l];
    var k = rgb(col); if (f === undefined) f = 1 + (hash(this.n++) - 0.5) * this.jit;
    var cr = Math.min(1, k[0] * f), cg = Math.min(1, k[1] * f), cb = Math.min(1, k[2] * f);
    this.v.push(p[0], p[1], p[2], n[0], n[1], n[2], cr, cg, cb, q[0], q[1], q[2], n[0], n[1], n[2], cr, cg, cb, r[0], r[1], r[2], n[0], n[1], n[2], cr, cg, cb);
  };
  B.quad = function (a, b, c, d, col) { var f = 1 + (hash(this.n++) - 0.5) * this.jit; this.tri(a, b, c, col, f); this.tri(a, c, d, col, f); };
  // สี่เหลี่ยมที่หันหน้าออกจากจุด ref เสมอ (ไม่ต้องกังวลเรื่องทิศการเรียงจุด)
  B.qo = function (a, b, c, d, col, ref) {
    var n = crs(sub(b, a), sub(c, a));
    if (dot(n, sub(a, ref)) < 0) this.quad(d, c, b, a, col); else this.quad(a, b, c, d, col);
  };
  B.box = function (w, h, d, col) {
    var c = typeof col === 'string' ? { t: col, b: col, s: col } : col, x0 = -w / 2, x1 = w / 2, z0 = -d / 2, z1 = d / 2;
    this.quad([x0, h, z1], [x1, h, z1], [x1, h, z0], [x0, h, z0], c.t);
    this.quad([x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1], c.b || c.s);
    this.quad([x0, 0, z1], [x1, 0, z1], [x1, h, z1], [x0, h, z1], c.f || c.s);
    this.quad([x1, 0, z0], [x0, 0, z0], [x0, h, z0], [x1, h, z0], c.s);
    this.quad([x1, 0, z1], [x1, 0, z0], [x1, h, z0], [x1, h, z1], c.s);
    this.quad([x0, 0, z0], [x0, 0, z1], [x0, h, z1], [x0, h, z0], c.s);
  };
  // ทรงกระบอก/กรวยตัดปลาย ตั้งแต่ y=0 ถึง h  col = สีเดียว หรือ {t,s,b,sf(i)}  opt = {rj(i) คูณรัศมี, noTop, noBot}
  B.cyl = function (rt, rb, h, n, col, opt) {
    opt = opt || {}; var c = typeof col === 'string' ? { t: col, s: col, b: col } : col, i, pt = [], pb = [], j;
    for (i = 0; i < n; i++) { var a = i / n * Math.PI * 2, k = opt.rj ? opt.rj(i) : 1; pt.push([Math.cos(a) * rt * k, h, Math.sin(a) * rt * k]); pb.push([Math.cos(a) * rb * k, 0, Math.sin(a) * rb * k]); }
    for (i = 0; i < n; i++) {
      j = (i + 1) % n; var sc = c.sf ? c.sf(i) : c.s;
      if (rt < 1e-6) this.tri(pb[j], pb[i], pt[i], sc);
      else if (rb < 1e-6) this.tri(pb[j], pt[i], pt[j], sc);
      else this.quad(pb[j], pb[i], pt[i], pt[j], sc);
    }
    if (!opt.noTop && rt > 1e-6) for (i = 0; i < n; i++) this.tri([0, h, 0], pt[(i + 1) % n], pt[i], c.t);
    if (!opt.noBot && rb > 1e-6) for (i = 0; i < n; i++) this.tri([0, 0, 0], pb[i], pb[(i + 1) % n], c.b || c.s);
  };
  B.sphere = function (r, lon, lat, col) {
    lon = lon || 8; lat = lat || 5; var a, b;
    function P(p, t) { return [r * Math.cos(p) * Math.cos(t), r * Math.sin(p), r * Math.cos(p) * Math.sin(t)]; }
    for (b = 0; b < lat; b++) for (a = 0; a < lon; a++) {
      var p0 = -Math.PI / 2 + b / lat * Math.PI, p1 = -Math.PI / 2 + (b + 1) / lat * Math.PI, t0 = a / lon * Math.PI * 2, t1 = (a + 1) / lon * Math.PI * 2;
      this.quad(P(p0, t1), P(p0, t0), P(p1, t0), P(p1, t1), typeof col === 'function' ? col(a, b) : col);
    }
  };
  B.build = function (gl) {
    var data = new Float32Array(this.v), mesh = { count: data.length / 9, data: data, buf: null };
    if (gl) { mesh.buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buf); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); }
    return mesh;
  };

  /* ---------- ตัวเรนเดอร์ (เงา + เกรน + บลูม + โทนสี) ---------- */
  var VS = 'attribute vec3 aP;attribute vec3 aN;attribute vec3 aC;uniform mat4 uVP;uniform mat4 uM;uniform mat4 uLVP;uniform vec3 uEye;varying vec3 vC;varying vec3 vN;varying vec3 vW;varying vec4 vL;varying float vD;' +
    'void main(){vec4 w=uM*vec4(aP,1.0);vN=normalize((uM*vec4(aN,0.0)).xyz);vW=w.xyz;vL=uLVP*w;vC=aC;vD=length(w.xyz-uEye);gl_Position=uVP*w;}';
  var PREC = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';
  var FS = PREC + 'varying vec3 vC;varying vec3 vN;varying vec3 vW;varying vec4 vL;varying float vD;uniform sampler2D uSh;uniform vec2 uShTex;uniform vec3 uL;uniform vec3 uSun;uniform vec3 uAmb;uniform vec3 uTint;uniform vec3 uEmis;uniform vec3 uFogC;uniform vec2 uFog;uniform float uAlpha;uniform float uLit;uniform float uGrain;' +
    'float unpack(vec4 c){return dot(c,vec4(1.0,1.0/255.0,1.0/65025.0,1.0/16581375.0));}' +
    'float shadow(){vec3 p=vL.xyz/vL.w*0.5+0.5;if(p.x<0.0||p.x>1.0||p.y<0.0||p.y>1.0||p.z>1.0)return 1.0;float s=0.0;for(int i=-1;i<=1;i++){for(int j=-1;j<=1;j++){float d=unpack(texture2D(uSh,p.xy+vec2(float(i),float(j))*uShTex));s+=(p.z-0.004>d)?0.0:1.0;}}return s/9.0;}' +
    'float hash(vec3 p){p=fract(p*0.3183099+0.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}' +
    'void main(){vec3 n=normalize(vN);float d=max(dot(n,uL),0.0);float sh=uLit>0.5?shadow():1.0;float hemi=0.5+0.5*n.y;vec3 lit=uAmb*(0.72+0.28*hemi)+uSun*d*sh;' +
    'vec3 base=vC*uTint;float gr=hash(floor(vW*5.0+0.013));base*=1.0+(gr-0.5)*uGrain;vec3 col=(uLit>0.5?base*lit:base)+uEmis;' +
    'float f=clamp((vD-uFog.x)/(uFog.y-uFog.x),0.0,1.0);gl_FragColor=vec4(mix(col,uFogC,f),uAlpha);}';
  var DVS = 'attribute vec3 aP;uniform mat4 uVP;uniform mat4 uM;varying float vZ;void main(){gl_Position=uVP*uM*vec4(aP,1.0);vZ=gl_Position.z/gl_Position.w*0.5+0.5;}';
  var DFS = PREC + 'varying float vZ;void main(){vec4 e=fract(vZ*vec4(1.0,255.0,65025.0,16581375.0));e-=e.yzww*vec4(1.0/255.0,1.0/255.0,1.0/255.0,0.0);gl_FragColor=e;}';
  var QVS = 'attribute vec2 aQ;varying vec2 vU;void main(){vU=aQ*0.5+0.5;gl_Position=vec4(aQ,0.0,1.0);}';
  var BFS = PREC + 'varying vec2 vU;uniform sampler2D uTex;uniform vec2 uDir;uniform float uThr;' +
    'void main(){vec3 s=vec3(0.0);float w[5];w[0]=0.227;w[1]=0.194;w[2]=0.121;w[3]=0.054;w[4]=0.016;for(int i=-4;i<=4;i++){float k=w[i<0?-i:i];vec3 c=texture2D(uTex,vU+uDir*float(i)).rgb;c=max(c-vec3(uThr),0.0);s+=c*k;}gl_FragColor=vec4(s,1.0);}';
  var CFS = PREC + 'varying vec2 vU;uniform sampler2D uTex;uniform sampler2D uBloom;uniform float uBl;uniform float uT;' +
    'void main(){float a0=texture2D(uTex,vU).a;vec3 c=texture2D(uTex,vU).rgb+texture2D(uBloom,vU).rgb*uBl;c*=vec3(1.05,1.0,0.93);float l=dot(c,vec3(0.3,0.59,0.11));c=mix(vec3(l),c,1.12);c=(c-0.5)*1.07+0.5;vec2 q=vU-0.5;c*=1.0-dot(q,q)*0.55;if(uT>0.5){gl_FragColor=vec4(clamp(c,0.0,1.0)*a0,a0);}else gl_FragColor=vec4(c,1.0);}';

  function prog(gl, vs, fs, attrs) {
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
    var p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    attrs.forEach(function (a, i) { gl.bindAttribLocation(p, i, a); }); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    p.u = {}; var n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS), i;
    for (i = 0; i < n; i++) { var nm = gl.getActiveUniform(p, i).name; p.u[nm] = gl.getUniformLocation(p, nm); }
    return p;
  }
  function target(gl, w, h, depth, filter) {
    var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    var f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    var rb = null;
    if (depth) { rb = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rb); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { tex: t, fbo: f, rb: rb, w: w, h: h };
  }
  M4.ortho = function (l, r, b, t, n, f) {
    var o = new Float32Array(16); o[0] = 2 / (r - l); o[5] = 2 / (t - b); o[10] = -2 / (f - n); o[12] = -(r + l) / (r - l); o[13] = -(t + b) / (t - b); o[14] = -(f + n) / (f - n); o[15] = 1; return o;
  };

  function Renderer(canvas, opts) {
    opts = opts || {};
    var gl = canvas.getContext('webgl', { antialias: false, alpha: !!opts.transparent, premultipliedAlpha: true }) || canvas.getContext('experimental-webgl');
    if (!gl) throw new Error('no webgl');
    this.gl = gl; this.cv = canvas; this.transparent = !!opts.transparent; this.pass = 'main'; this.shadowSize = opts.shadow || 1024;
    this.pm = prog(gl, VS, FS, ['aP', 'aN', 'aC']); this.pd = prog(gl, DVS, DFS, ['aP']); this.pb = prog(gl, QVS, BFS, ['aQ']); this.pc = prog(gl, QVS, CFS, ['aQ']);
    this.quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    this.sh = target(gl, this.shadowSize, this.shadowSize, true, gl.NEAREST);
    this.sc = null; this.bA = null; this.bB = null;
    this.light = nrm([-0.55, 0.78, -0.32]);
    this.sun = [0.6, 0.48, 0.32]; this.amb = [0.8, 0.82, 0.96]; this.bloom = opts.bloom === undefined ? 0.55 : opts.bloom;
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
  }
  Renderer.prototype.mesh = function (b) { return b.build(this.gl); };
  Renderer.prototype.resize = function (w, h) {
    var gl = this.gl; if (this.cv.width !== w || this.cv.height !== h) { this.cv.width = w; this.cv.height = h; }
    if (!this.sc || this.sc.w !== w || this.sc.h !== h) {
      this.sc = target(gl, w, h, true, gl.LINEAR);
      var bw = Math.max(8, w >> 2), bh = Math.max(8, h >> 2); this.bA = target(gl, bw, bh, false, gl.LINEAR); this.bB = target(gl, bw, bh, false, gl.LINEAR);
    }
  };
  // ผ่านที่ 1: วาดความลึกจากมุมแสง
  Renderer.prototype.shadowBegin = function (lvp) {
    var gl = this.gl; this.pass = 'shadow'; this.lvp = lvp;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.sh.fbo); gl.viewport(0, 0, this.sh.w, this.sh.h);
    gl.clearColor(1, 1, 1, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.pd); gl.uniformMatrix4fv(this.pd.u.uVP, false, lvp);
    gl.disableVertexAttribArray(1); gl.disableVertexAttribArray(2); gl.enableVertexAttribArray(0);
  };
  // ผ่านที่ 2: วาดฉากลงเท็กซ์เจอร์ความละเอียดต่ำ
  Renderer.prototype.sceneBegin = function (vp, eye, fogColor, fogNear, fogFar) {
    var gl = this.gl, p = this.pm, u = p.u, f = rgb(fogColor); this.pass = 'main'; this.fog = [f, fogNear, fogFar];
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.sc.fbo); gl.viewport(0, 0, this.sc.w, this.sc.h);
    if (this.transparent) gl.clearColor(0, 0, 0, 0); else gl.clearColor(f[0], f[1], f[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(p);
    gl.uniformMatrix4fv(u.uVP, false, vp); gl.uniformMatrix4fv(u.uLVP, false, this.lvp); gl.uniform3fv(u.uEye, eye);
    gl.uniform3fv(u.uL, this.light); gl.uniform3fv(u.uSun, this.sun); gl.uniform3fv(u.uAmb, this.amb);
    gl.uniform3fv(u.uFogC, f); gl.uniform2f(u.uFog, fogNear, fogFar); gl.uniform2f(u.uShTex, 1 / this.sh.w, 1 / this.sh.h);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.sh.tex); gl.uniform1i(u.uSh, 0);
    gl.enableVertexAttribArray(0); gl.enableVertexAttribArray(1); gl.enableVertexAttribArray(2);
  };
  // o = {tint, emis, alpha, add, unlit, noFog, double, noCast, grain}
  Renderer.prototype.draw = function (mesh, model, o) {
    if (!mesh || !mesh.count) return; o = o || {};
    var gl = this.gl, alpha = o.alpha === undefined ? 1 : o.alpha, m = model || M4.id();
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buf);
    if (this.pass === 'shadow') {
      if (o.noCast || alpha < 1 || o.add) return;
      gl.uniformMatrix4fv(this.pd.u.uM, false, m); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 36, 0); gl.drawArrays(gl.TRIANGLES, 0, mesh.count); return;
    }
    var u = this.pm.u;
    gl.uniformMatrix4fv(u.uM, false, m); gl.uniform3fv(u.uTint, o.tint || [1, 1, 1]); gl.uniform3fv(u.uEmis, o.emis || [0, 0, 0]);
    gl.uniform1f(u.uLit, o.unlit ? 0 : 1); gl.uniform1f(u.uAlpha, alpha); gl.uniform1f(u.uGrain, o.grain === undefined ? 0.09 : o.grain);
    if (o.noFog) gl.uniform2f(u.uFog, 1e8, 2e8);
    if (alpha < 1 || o.add) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, o.add ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); }
    if (o.double) gl.disable(gl.CULL_FACE);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 36, 0); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 36, 12); gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 36, 24);
    gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
    if (alpha < 1 || o.add) { gl.disable(gl.BLEND); gl.depthMask(true); }
    if (o.double) gl.enable(gl.CULL_FACE);
    if (o.noFog) gl.uniform2f(u.uFog, this.fog[1], this.fog[2]);
  };
  // ผ่านที่ 3: บลูม + โทนสี แล้วออกจอ
  Renderer.prototype.post = function () {
    var gl = this.gl, self = this;
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad); gl.disableVertexAttribArray(1); gl.disableVertexAttribArray(2); gl.enableVertexAttribArray(0);
    function pass(p, dst, w, h, bind) {
      gl.useProgram(p); gl.bindFramebuffer(gl.FRAMEBUFFER, dst ? dst.fbo : null); gl.viewport(0, 0, w, h);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      bind(); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    function tex(unit, t, loc) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t.tex); gl.uniform1i(loc, unit); }
    var A = this.bA, B2 = this.bB;
    pass(this.pb, A, A.w, A.h, function () { tex(0, self.sc, self.pb.u.uTex); gl.uniform2f(self.pb.u.uDir, 1.6 / A.w, 0); gl.uniform1f(self.pb.u.uThr, 0.62); });
    pass(this.pb, B2, A.w, A.h, function () { tex(0, A, self.pb.u.uTex); gl.uniform2f(self.pb.u.uDir, 0, 1.6 / A.h); gl.uniform1f(self.pb.u.uThr, 0.0); });
    pass(this.pc, null, this.cv.width, this.cv.height, function () { tex(0, self.sc, self.pc.u.uTex); tex(1, B2, self.pc.u.uBloom); gl.uniform1f(self.pc.u.uBl, self.bloom); gl.uniform1f(self.pc.u.uT, self.transparent ? 1 : 0); });
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.enableVertexAttribArray(1); gl.enableVertexAttribArray(2);
  };

  return { M4: M4, Builder: Builder, Renderer: Renderer, rgb: rgb, hash: hash, nrm: nrm, crs: crs, dot: dot, sub: sub };
});
