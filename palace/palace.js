/* Memory Palace: its own app, reached through the portal ring in Endless Clay (step 1: the exterior and the way home).
   Realistic outside: physically based materials with textures made here in code, a physical sky that also lights
   the scene, filmic tone mapping and sun shadows drawn once. The palace's layout (your rooms) is never part of this
   code: it's imported once from your own plan file and kept only in this device's storage. */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var DEBUG = /[?&]debug\b/.test(location.search), VIA_CLAY = /[?&]via=clay\b/.test(location.search);
  var HANDOFF = 'palace.handoff', PLAN_KEY = 'palace.plan.v1';
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }

  // Arriving through the portal from VR: the browser may grant a session we can start without a tap.
  // (The page's first script listens for the offer, before the big scripts load, and sets window.__xrGranted.)
  var granted = !!window.__xrGranted, ready = false;
  addEventListener('xrgranted', function () { granted = true; enterVR(); }); // straight in: the palace finishes building around you

  // ---------- Renderer, sky and light ----------
  var renderer = new THREE.WebGLRenderer({ canvas: $('#scene'), antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.72;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
  renderer.xr.enabled = true; renderer.xr.setReferenceSpaceType('local-floor');
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(70, 1, 0.05, 6000);
  var rig = new THREE.Group(); rig.add(camera); scene.add(rig);
  var EYE = 1.6; camera.position.set(0, EYE, 0);

  // Late afternoon sun from the south-southwest: the gate front is lit, shadows reach north-east across the palace.
  var SUN_ELEV = 23, SUN_AZ = 243;
  var sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - SUN_ELEV), THREE.MathUtils.degToRad(SUN_AZ));
  function makeSky(scale) {
    var s = new PalaceSky(); s.scale.setScalar(scale);
    var u = s.material.uniforms; u.turbidity.value = 4.5; u.rayleigh.value = 2.2; u.mieCoefficient.value = 0.004; u.mieDirectionalG.value = 0.86; u.sunPosition.value.copy(sunDir);
    return s;
  }
  scene.add(makeSky(4500));
  var sun = new THREE.DirectionalLight(0xffd7a8, 3.4);
  sun.position.copy(sunDir).multiplyScalar(140); sun.target.position.set(0, 0, 0);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  var sc = sun.shadow.camera; sc.left = -78; sc.right = 78; sc.top = 78; sc.bottom = -78; sc.near = 20; sc.far = 320;
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.05;
  scene.add(sun, sun.target, new THREE.HemisphereLight(0xb9ccf0, 0x4a3c2c, 0.12));
  (function () { // image-based light: the same sky, filtered, lights everything from all sides
    var pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene(); es.add(makeSky(900));
    scene.environment = pm.fromScene(es, 0.02).texture; pm.dispose();
  })();
  scene.fog = new THREE.FogExp2(0xc6cfd4, 0.00085);

  // ---------- Textures, made here (tileable value noise) ----------
  function hash(i, j, s) { var h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(s, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
  function vnoise(x, y, p, s) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var x0 = ((xi % p) + p) % p, y0 = ((yi % p) + p) % p, x1 = (x0 + 1) % p, y1 = (y0 + 1) % p;
    var a = hash(x0, y0, s), b = hash(x1, y0, s), c = hash(x0, y1, s), d = hash(x1, y1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(u, v, base, oct, s) { var t = 0, amp = 0.5, f = base, n = 0; for (var o = 0; o < oct; o++) { t += amp * vnoise(u * f, v * f, f, s + o * 17); n += amp; amp *= 0.5; f *= 2; } return t / n; }
  // Paint a size×size texture: fn(u, v) → [height, r, g, b, roughness] (0..1, colours 0..255). Returns map, normal and roughness textures.
  var MAXANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  // Painting runs in short slices (a few milliseconds each) so the headset keeps drawing frames while it works.
  function gap() { return new Promise(function (r) { setTimeout(r, 0); }); }
  async function paint(size, strength, fn) {
    var n = size * size, H = new Float32Array(n), C = new Uint8Array(n * 4), R = new Uint8Array(n * 4), N = new Uint8Array(n * 4), t = performance.now();
    for (var y = 0; y < size; y++) {
      if (performance.now() - t > 6) { await gap(); t = performance.now(); }
      for (var x = 0; x < size; x++) {
      var o = fn(x / size, y / size), i = y * size + x;
      H[i] = o[0]; C[i * 4] = o[1]; C[i * 4 + 1] = o[2]; C[i * 4 + 2] = o[3]; C[i * 4 + 3] = 255;
      R[i * 4] = R[i * 4 + 1] = R[i * 4 + 2] = Math.round(o[4] * 255); R[i * 4 + 3] = 255;
      }
    }
    for (y = 0; y < size; y++) for (x = 0; x < size; x++) {
      var l = H[y * size + (x + size - 1) % size], r = H[y * size + (x + 1) % size], dn = H[((y + size - 1) % size) * size + x], up = H[((y + 1) % size) * size + x];
      var nx = (l - r) * strength, ny = (dn - up) * strength, len = Math.hypot(nx, ny, 1); i = y * size + x;
      N[i * 4] = Math.round((nx / len * 0.5 + 0.5) * 255); N[i * 4 + 1] = Math.round((ny / len * 0.5 + 0.5) * 255); N[i * 4 + 2] = Math.round((1 / len * 0.5 + 0.5) * 255); N[i * 4 + 3] = 255;
    }
    function tex(data, srgb) {
      var t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = MAXANISO;
      if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t;
    }
    return { map: tex(C, true), normalMap: tex(N, false), roughnessMap: tex(R, false) };
  }
  function clamp255(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }
  // Stone blocks in courses (ashlar), or larger paving slabs: rows, blocks per row, joint width, bevel, colour.
  function blocks(size, rows, minW, maxW, joint, bevel, base, vary, seed, strength) {
    var courses = [];
    for (var r = 0; r < rows; r++) { var xs = [], x = hash(r, 7, seed) * maxW; while (x < 1 + maxW) { xs.push(x); x += minW + hash(r, xs.length, seed + 1) * (maxW - minW); } courses.push(xs); }
    return paint(size, strength || 5, function (u, v) {
      var r = Math.floor(v * rows), fv = v * rows - r, xs = courses[r], k = 0;
      while (k < xs.length - 1 && xs[k + 1] <= u + (u < xs[0] ? 1 : 0)) k++;
      var uu = u < xs[0] ? u + 1 : u, left = xs[k], right = xs[k + 1] !== undefined ? xs[k + 1] : left + maxW;
      var dj = Math.min((uu - left) * rows * 0.7, (right - uu) * rows * 0.7, fv, 1 - fv);
      var face = dj < joint ? 0 : Math.min(1, (dj - joint) / bevel), id = hash(r, k, seed + 3);
      var g = fbm(u, v, 8, 4, seed), fine = fbm(u, v, 64, 2, seed + 9), speck = hash(Math.floor(u * size), Math.floor(v * size), seed + 5);
      var h = face * (0.7 + 0.18 * g + 0.12 * id) + 0.05 * fine;
      var t = (1 - vary + 2 * vary * id) * (0.9 + 0.2 * g) * (speck > 0.985 ? 0.72 : speck < 0.01 ? 1.15 : 1) * (0.94 + 0.12 * fine);
      if (face === 0) t *= 0.62;
      return [h, clamp255(base[0] * t), clamp255(base[1] * t), clamp255(base[2] * t), face === 0 ? 0.95 : 0.78 + 0.12 * g];
    });
  }
  var T = {};
  var TEX_STEPS = [
    async function () { T.stone = await blocks(512, 6, 0.16, 0.42, 0.02, 0.06, [128, 121, 108], 0.24, 11); },
    async function () { T.paving = await blocks(512, 5, 0.25, 0.5, 0.012, 0.03, [168, 156, 136], 0.12, 23, 2.2); },
    async function () {
      T.plaster = await paint(512, 1.5, function (u, v) { var g = fbm(u, v, 6, 5, 31), f = fbm(u, v, 48, 2, 33), t = 0.95 + 0.05 * g - 0.03 * f; return [0.4 * g + 0.2 * f, 241 * t, 237 * t, 228 * t, 0.9]; });
    },
    async function () {
      T.timber = await paint(512, 3, function (u, v) {
        var g = fbm(u, v, 4, 3, 41), grain = 0.5 + 0.5 * Math.sin((u * 16 + g * 2.2) * Math.PI * 2), fine = fbm(u, v, 64, 2, 45), board = hash(Math.floor(u * 6), 3, 43);
        var t = (0.86 + 0.14 * grain) * (0.88 + 0.24 * board) * (0.92 + 0.16 * fine); return [0.3 * grain + 0.3 * g + 0.2 * fine, 64 * t, 49 * t, 40 * t, 0.6 + 0.12 * grain];
      });
    },
    async function () { // glazed roof tiles: round cover tiles down the slope over concave pan tiles, in overlapping courses
      T.roof = await paint(512, 7, function (u, v) {
        var p = (u * 8) % 1, q = (v * 8) % 1, h, id = hash(Math.floor(u * 8), Math.floor(v * 8), 51);
        if (p < 0.32) { var a = (p - 0.16) / 0.16; h = 0.55 + 0.45 * Math.sqrt(Math.max(0, 1 - a * a)); } else { var b = (p - 0.66) / 0.34; h = 0.2 + 0.18 * b * b; }
        h += 0.22 * (1 - q); var g = fbm(u, v, 16, 3, 53), t = (0.9 + 0.2 * id) * (0.9 + 0.15 * g) * (q < 0.06 ? 0.7 : 1);
        return [h, 66 * t, 71 * t, 78 * t, 0.42 + 0.2 * g];
      });
    },
    async function () { // raked gravel: fine stones in parallel grooves
      T.gravel = await paint(512, 4, function (u, v) {
        var s = hash(Math.floor(u * 256), Math.floor(v * 256), 61), g = fbm(u, v, 128, 2, 63), rake = 0.5 + 0.5 * Math.sin(v * Math.PI * 2 * 14);
        var t = (0.84 + 0.2 * s) * (0.97 + 0.03 * rake) * (0.9 + 0.2 * fbm(u, v, 4, 3, 65)); return [0.25 * rake + 0.5 * g + 0.25 * s, 172 * t, 163 * t, 146 * t, 0.95];
      });
    },
    async function () {
      T.grass = await paint(512, 2.5, function (u, v) {
        var g = fbm(u, v, 4, 4, 71), b = fbm(u, v, 64, 2, 73), dry = fbm(u, v, 8, 3, 75), t = (0.7 + 0.5 * g) * (0.85 + 0.3 * b);
        return [0.6 * b + 0.3 * g, (62 + 40 * dry) * t, (92 + 14 * dry) * t, (40 + 16 * dry) * t, 0.96];
      });
    },
    async function () { // shoji: rice paper in a timber lattice; the paper glows from within
      T.shoji = await paint(256, 2, function (u, v) {
        var lu = Math.min(Math.abs((u * 3) % 1), 1 - (u * 3) % 1), lv = Math.min(Math.abs((v * 4) % 1), 1 - (v * 4) % 1), edge = Math.min(u, v, 1 - u, 1 - v);
        var frame = lu < 0.04 || lv < 0.04 || edge < 0.035, g = fbm(u, v, 16, 3, 81);
        return frame ? [1, 52, 40, 33, 0.6] : [0.2 + 0.1 * g, 238, 229 - 6 * g, 206 - 10 * g, 0.9];
      });
      T.shoji.map.userData = { glow: true };
    },
    async function () { // water: soft wind ripples
      T.water = await paint(256, 6, function (u, v) { var h = fbm(u, v, 8, 4, 111) * 0.7 + fbm(u, v, 32, 2, 113) * 0.3; return [h, 30, 58, 64, 0.06]; });
    },
    async function () { // gate timber with iron studs
      T.gate = await paint(256, 4, function (u, v) {
        var g = fbm(u, v, 4, 3, 91), grain = 0.5 + 0.5 * Math.sin((u * 12 + g * 1.2) * Math.PI * 2), su = (u * 6) % 1 - 0.5, sv = (v * 8) % 1 - 0.5, st = Math.hypot(su, sv) < 0.12;
        return st ? [1, 168, 130, 70, 0.3] : [0.35 * grain, 44 * (0.8 + 0.3 * grain), 33 * (0.8 + 0.3 * grain), 28, 0.6];
      });
    }
  ];

  // ---------- Materials ----------
  var M = {};
  function std(o) { return new THREE.MeshStandardMaterial(o); }
  function texMat(t, tile, o) { var m = std(Object.assign({ map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, roughness: 1, envMapIntensity: 0.7 }, o || {})); m.userData.tile = tile; return m; }
  var plasterCache = new Map();
  function plaster(hex) { if (!plasterCache.has(hex)) plasterCache.set(hex, texMat(T.plaster, [2.4, 2.4], { color: new THREE.Color(hex) })); return plasterCache.get(hex); }
  function makeMaterials() {
    M.stone = texMat(T.stone, [3, 3]); M.paving = texMat(T.paving, [4.5, 4.5]); M.timber = texMat(T.timber, [1.2, 1.2]);
    M.roof = texMat(T.roof, [2.24, 2.4], { envMapIntensity: 1.3 }); M.gravel = texMat(T.gravel, [2.2, 2.2]); M.grass = texMat(T.grass, [7, 7]);
    M.shoji = texMat(T.shoji, [1, 1], { emissive: new THREE.Color(1.0, 0.78, 0.5), emissiveMap: T.shoji.map, emissiveIntensity: 0.18 }); M.shoji.userData.panel = true;
    M.gate = texMat(T.gate, [1, 1]); M.gate.userData.panel = true;
    M.white = plaster('#f3efe6'); M.goldWall = texMat(T.plaster, [2.4, 2.4], { color: new THREE.Color('#c9a54e'), metalness: 0.35, roughness: 0.7 });
    M.gold = std({ color: new THREE.Color('#d4ad55'), metalness: 1, roughness: 0.32 });
    M.bronze = std({ color: new THREE.Color('#7d5c35'), metalness: 1, roughness: 0.36 });
    M.hills = std({ vertexColors: true, roughness: 1 });
    M.eave = texMat(T.timber, [1.6, 1.6], { color: new THREE.Color('#8a5a3c') });
    M.leaf = std({ vertexColors: true, roughness: 0.85, envMapIntensity: 0.5 }); M.leaf.userData.foliage = true;
    M.bark = texMat(T.timber, [0.6, 0.6], { color: new THREE.Color('#6b5a4c') });
    T.water.normalMap.repeat.set(1, 1);
    M.water = std({ color: new THREE.Color('#163238'), roughness: 0.05, metalness: 0.1, normalMap: T.water.normalMap, normalScale: new THREE.Vector2(0.35, 0.35), envMapIntensity: 1.25 });
    M.water.userData.tile = [9, 9]; M.water.userData.panel = true;
  }

  // ---------- Geometry batches: everything with the same material becomes one mesh ----------
  var batches = new Map(), colliders = [];
  function worldUV(g, tile) {
    var p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
    for (var i = 0; i < p.count; i++) {
      var ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i)), x = p.getX(i), y = p.getY(i), z = p.getZ(i), a, b;
      if (ay >= ax && ay >= az) { a = x; b = z; } else if (ax >= az) { a = z; b = y; } else { a = x; b = y; }
      uv[i * 2] = a / tile[0]; uv[i * 2 + 1] = b / tile[1];
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  }
  function put(mat, g, keepUV) {
    if (g.index) g = g.toNonIndexed();
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!keepUV && mat.userData.tile) worldUV(g, mat.userData.tile);
    if (!batches.has(mat)) batches.set(mat, []);
    batches.get(mat).push(g);
  }
  function box(mat, x0, y0, z0, x1, y1, z1, solid) {
    var g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); put(mat, g);
    if (solid) colliders.push([x0, z0, x1, z1, y1]);
  }
  // A flat panel facing along an axis (dir: 'x+', 'x-', 'z+', 'z-'), its texture fitted once across it.
  function panel(mat, cx, cy, cz, w, h, dir) {
    var g = new THREE.PlaneGeometry(w, h);
    if (dir === 'x+') g.rotateY(Math.PI / 2); else if (dir === 'x-') g.rotateY(-Math.PI / 2); else if (dir === 'z-') g.rotateY(Math.PI);
    g.translate(cx, cy, cz); put(mat, g, true);
  }
  function merge(list) {
    var count = 0; list.forEach(function (g) { count += g.attributes.position.count; });
    var pos = new Float32Array(count * 3), nrm = new Float32Array(count * 3), uv = new Float32Array(count * 2), col = list[0].attributes.color ? new Float32Array(count * 3) : null, o = 0;
    list.forEach(function (g) {
      pos.set(g.attributes.position.array, o * 3); nrm.set(g.attributes.normal.array, o * 3);
      if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2); if (col && g.attributes.color) col.set(g.attributes.color.array, o * 3);
      o += g.attributes.position.count; g.dispose();
    });
    var m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); m.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    if (col) m.setAttribute('color', new THREE.BufferAttribute(col, 3));
    m.computeBoundingSphere(); return m;
  }
  var built = [];
  function flush(group) {
    batches.forEach(function (list, mat) {
      var mesh = new THREE.Mesh(merge(list), mat); mesh.castShadow = !mat.userData.panel && mat !== M.grass && mat !== M.hills; mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false; group.add(mesh); built.push(mesh);
    });
    batches.clear();
  }

  // A sloped roof between an eave rectangle (low, outside) and an inner rectangle (high): a concave sweep, corners
  // that lift, glazed tiles above and white plaster beneath, Japanese castle style. An inner rectangle with no
  // width is a ridge, which makes a hipped roof.
  function roof(o, i, yEave, yTop, lift, opts) {
    opts = opts || {};
    var oc = [[o[0], o[1]], [o[2], o[1]], [o[2], o[3]], [o[0], o[3]]], ic = [[i[0], i[1]], [i[2], i[1]], [i[2], i[3]], [i[0], i[3]]], NA = 10, NT = 7, th = 0.16;
    for (var s = 0; s < 4; s++) {
      var a0 = oc[s], a1 = oc[(s + 1) % 4], b0 = ic[s], b1 = ic[(s + 1) % 4], eaveLen = Math.hypot(a1[0] - a0[0], a1[1] - a0[1]);
      var top = [], under = [], uv = [];
      for (var t = 0; t <= NT; t++) for (var a = 0; a <= NA; a++) {
        var fa = a / NA, ft = t / NT, ex = a0[0] + (a1[0] - a0[0]) * fa, ez = a0[1] + (a1[1] - a0[1]) * fa, nx = b0[0] + (b1[0] - b0[0]) * fa, nz = b0[1] + (b1[1] - b0[1]) * fa;
        var x = ex + (nx - ex) * ft, z = ez + (nz - ez) * ft, y = yEave + (yTop - yEave) * Math.pow(ft, 1.45) + lift * Math.pow(1 - ft, 2.2) * Math.pow(Math.abs(2 * fa - 1), 5);
        top.push(x, y, z); under.push(x, y - th, z);
        uv.push(fa * eaveLen / 2.24, ft * Math.hypot(nx - ex, nz - ez, yTop - yEave) / 2.4);
      }
      var idx = [], idxU = [];
      for (t = 0; t < NT; t++) for (a = 0; a < NA; a++) {
        var p = t * (NA + 1) + a, q = p + NA + 1;
        idx.push(p, q, p + 1, p + 1, q, q + 1); idxU.push(p, p + 1, q, p + 1, q + 1, q);
      }
      var gt = new THREE.BufferGeometry(); gt.setAttribute('position', new THREE.Float32BufferAttribute(top, 3)); gt.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); gt.setIndex(idx); gt.computeVertexNormals();
      var gu = new THREE.BufferGeometry(); gu.setAttribute('position', new THREE.Float32BufferAttribute(under, 3)); gu.setIndex(idxU); gu.computeVertexNormals();
      // the tiles' winding must face up; flip if this side came out facing down
      if (gt.attributes.normal.getY(0) < 0) { gt.setIndex(idxU); gt.computeVertexNormals(); gu.setIndex(idx); gu.computeVertexNormals(); }
      put(M.roof, gt, true); put(opts.under || M.eave, gu);
      // the eave's edge: a thin white strip joining tiles and soffit
      var fx = [], ex0 = a0[0], ez0 = a0[1];
      for (a = 0; a < NA; a++) {
        var j = a, k = a + 1, P = top.slice(j * 3, j * 3 + 3), Q = top.slice(k * 3, k * 3 + 3);
        fx.push(P[0], P[1], P[2], Q[0], Q[1], Q[2], P[0], P[1] - th, P[2], Q[0], Q[1], Q[2], Q[0], Q[1] - th, Q[2], P[0], P[1] - th, P[2]);
      }
      var gf = new THREE.BufferGeometry(); gf.setAttribute('position', new THREE.Float32BufferAttribute(fx, 3)); gf.computeVertexNormals();
      var mid = gf.attributes.normal, cx = (o[0] + o[2]) / 2, cz = (o[1] + o[3]) / 2;
      if ((mid.getX(0) * (ex0 - cx) + mid.getZ(0) * (ez0 - cz)) < 0) { var arr = gf.attributes.position.array; for (var w = 0; w < arr.length; w += 9) { for (var c = 0; c < 3; c++) { var tmp = arr[w + 3 + c]; arr[w + 3 + c] = arr[w + 6 + c]; arr[w + 6 + c] = tmp; } } gf.computeVertexNormals(); }
      put(M.white, gf);
    }
    var rw = i[2] - i[0], rd = i[3] - i[1];
    if (opts.ridge && (rw < 0.01 || rd < 0.01)) { // ridge cap and gold finials
      var along = rw < 0.01 ? 'z' : 'x', len = Math.max(rw, rd), cxr = (i[0] + i[2]) / 2, czr = (i[1] + i[3]) / 2;
      var g = new THREE.CylinderGeometry(0.2, 0.2, len + 0.6, 10); if (along === 'z') g.rotateX(Math.PI / 2); else g.rotateZ(Math.PI / 2); g.translate(cxr, yTop + 0.12, czr); put(M.roof, g);
      [-1, 1].forEach(function (sg) {
        var fxp = along === 'x' ? cxr + sg * (len / 2 + 0.3) : cxr, fzp = along === 'z' ? czr + sg * (len / 2 + 0.3) : czr;
        var fs = opts.fin || 1, fin = new THREE.ConeGeometry(0.28 * fs, 1.1 * fs, 10); fin.translate(fxp, yTop + 0.2 + 0.55 * fs, fzp); put(M.gold, fin);
        var orb = new THREE.SphereGeometry(0.2 * fs, 12, 8); orb.translate(fxp, yTop + 0.1 + 0.15 * fs, fzp); put(M.gold, orb);
      });
    }
  }
  // Plastered walls round a rectangle with dark timber posts and beams, shoji windows between the posts.
  function walls(r, y0, y1, wallMat, opts) {
    opts = opts || {};
    box(wallMat, r[0], y0, r[1], r[2], y1, r[3], true);
    var bay = opts.bay || 2.4, wy = (y0 + y1) / 2 + (opts.winUp || 0.15), wh = Math.min(1.1, (y1 - y0) * 0.38), sides = [['z-', r[1], r[0], r[2]], ['z+', r[3], r[0], r[2]], ['x-', r[0], r[1], r[3]], ['x+', r[2], r[1], r[3]]];
    sides.forEach(function (sd) {
      var dir = sd[0], at = sd[1], a0 = sd[2], a1 = sd[3], len = a1 - a0, n = Math.max(1, Math.round(len / bay)), step = len / n, out = dir[1] === '+' ? 1 : -1;
      for (var k = 0; k <= n; k++) { // posts
        var c = a0 + k * step, pw = 0.24, po = 0.07;
        if (dir[0] === 'z') box(M.timber, c - pw / 2, y0, out > 0 ? at : at - po, c + pw / 2, y1, out > 0 ? at + po : at); else box(M.timber, out > 0 ? at : at - po, y0, c - pw / 2, out > 0 ? at + po : at, y1, c + pw / 2);
      }
      // beams top and bottom
      if (dir[0] === 'z') { box(M.timber, a0, y1 - 0.26, out > 0 ? at : at - 0.08, a1, y1, out > 0 ? at + 0.08 : at); box(M.timber, a0, y0, out > 0 ? at : at - 0.08, a1, y0 + 0.2, out > 0 ? at + 0.08 : at); }
      else { box(M.timber, out > 0 ? at : at - 0.08, y1 - 0.26, a0, out > 0 ? at + 0.08 : at, y1, a1); box(M.timber, out > 0 ? at : at - 0.08, y0, a0, out > 0 ? at + 0.08 : at, y0 + 0.2, a1); }
      for (k = 0; k < n; k++) { // windows in alternate bays, skipping doors
        if ((k % 2) !== (opts.odd ? 1 : 0)) continue;
        var cc = a0 + (k + 0.5) * step, ww = Math.min(1.2, step * 0.6);
        if (opts.skip && opts.skip(dir, cc, ww)) continue;
        if (dir[0] === 'z') panel(M.shoji, cc, wy, at + out * 0.03, ww, wh, dir); else panel(M.shoji, at + out * 0.03, wy, cc, ww, wh, dir);
      }
    });
  }

  // ---------- The site: land, platform, stair, forecourt, gardens ----------
  var PLAT = [-60, -33, 60, 33], GARDENS = [[-38, -34], [-14, -10], [10, 14], [34, 38]], BANDS = { W2: -48, W1: -24, C: 0, E1: 24, E2: 48 };
  var siteGroup = new THREE.Group(), keepGroup = new THREE.Group(), roomsGroup = new THREE.Group();
  scene.add(siteGroup, keepGroup, roomsGroup);
  // The palace stands on a tall stone base inside a moat; an earth causeway and a stair lead up to the forecourt.
  var BASE = 3.2, MOAT = 11, WATER = -BASE - 0.55, STEPS = 16, RISE = BASE / STEPS, RUN = 0.4;
  var STAIR0 = PLAT[1] - STEPS * RUN, MO = [PLAT[0] - MOAT, PLAT[1] - MOAT, PLAT[2] + MOAT, PLAT[3] + MOAT];
  var rnd = (function () { var k = 1; return function () { k = (k * 16807) % 2147483647; return (k - 1) / 2147483646; }; })();
  function flatTop(mat, ax, az, bx, bz, y) { var g = new THREE.PlaneGeometry(bx - ax, bz - az); g.rotateX(-Math.PI / 2); g.translate((ax + bx) / 2, y, (az + bz) / 2); put(mat, g); }
  function buildLand() {
    var F = 1700, y = -BASE;
    // grass all round the moat (the moat itself is left open), and the water inside it
    flatTop(M.grass, -F, MO[3], F, F, y); flatTop(M.grass, -F, -F, F, MO[1], y); flatTop(M.grass, -F, MO[1], MO[0], MO[3], y); flatTop(M.grass, MO[2], MO[1], F, MO[3], y);
    flatTop(M.water, MO[0], MO[1], MO[2], MO[3], WATER);
    // the moat's outer bank: a low stone wall down to the water
    box(M.stone, MO[0] - 0.8, WATER - 0.6, MO[1] - 0.8, MO[2] + 0.8, y + 0.22, MO[1]); box(M.stone, MO[0] - 0.8, WATER - 0.6, MO[3], MO[2] + 0.8, y + 0.22, MO[3] + 0.8);
    box(M.stone, MO[0] - 0.8, WATER - 0.6, MO[1], MO[0], y + 0.22, MO[3]); box(M.stone, MO[2], WATER - 0.6, MO[1], MO[2] + 0.8, y + 0.22, MO[3]);
    // land rolling up into hills in the distance, darker where trees cover it
    var seg = 160, rings = 14, pos = [], col = [], idx = [];
    for (var ri = 0; ri <= rings; ri++) for (var a = 0; a <= seg; a++) {
      var ang = a / seg * Math.PI * 2, f = ri / rings, rad = 230 + Math.pow(f, 1.3) * 1350;
      var n = fbm(a / seg, f * 0.5, 7, 5, 101), hgt = y - 0.05 + Math.pow(Math.min(1, ri / 3), 2) * (6 + 40 * f + 150 * f * Math.pow(n, 1.6));
      pos.push(Math.cos(ang) * rad, hgt, Math.sin(ang) * rad);
      var forest = fbm(a / seg, f, 24, 3, 107), tone = 0.55 + 0.45 * fbm(a / seg, f, 40, 2, 103);
      var r = forest > 0.5 ? 0.06 : 0.16, g = forest > 0.5 ? 0.12 : 0.24, b = forest > 0.5 ? 0.06 : 0.1;
      col.push(r * tone, g * tone, b * tone);
    }
    for (ri = 0; ri < rings; ri++) for (a = 0; a < seg; a++) { var p = ri * (seg + 1) + a, q = p + seg + 1; idx.push(p, q, p + 1, p + 1, q, q + 1); }
    var hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); hg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); hg.setIndex(idx); hg.computeVertexNormals();
    var hm = new THREE.Mesh(hg, M.hills); hm.receiveShadow = false; hm.matrixAutoUpdate = false; siteGroup.add(hm);
    // trees: cherries in blossom by the causeway and in the forecourt gardens, cloud-pruned pines round the moat
    [[-9, -50], [9, -51], [-17, -47], [17, -48], [-26, -49], [27, -50]].forEach(function (t) { cherry(t[0], y, t[1], 1 + rnd() * 0.25); });
    [[-12, -27], [12, -27], [-12, -17], [12, -17]].forEach(function (t) { cherry(t[0], 0, t[1], 0.7 + rnd() * 0.15); });
    for (var i = 0; i < 26; i++) {
      var ang2 = rnd() * Math.PI * 2, rr = 85 + rnd() * 70, tx = Math.cos(ang2) * rr, tz = Math.sin(ang2) * rr;
      if (tz < -40 && Math.abs(tx) < 40) continue; // keep the view from the approach open
      pine(tx, y, tz, 1.1 + rnd() * 0.7);
    }
  }
  // A tree's crown: a lumpy blob built from a subdivided sphere, coloured per vertex.
  function blob(cx, cy, cz, rx, ry, rz, c0, c1, seed) {
    var g = new THREE.SphereGeometry(1, 14, 9);
    var p = g.attributes.position, col = new Float32Array(p.count * 3), v = new THREE.Vector3();
    for (var i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i); var n = 0.8 + 0.4 * vnoise(v.x * 2.6 + 5 + v.z * 0.7, v.y * 2.6 + v.z * 1.9 + 5, 64, seed);
      p.setXYZ(i, cx + v.x * rx * n, cy + v.y * ry * n, cz + v.z * rz * n);
      var t = Math.min(1, Math.max(0, 0.5 + v.y * 0.5 + (n - 1) * 0.8));
      col[i * 3] = c0[0] + (c1[0] - c0[0]) * t; col[i * 3 + 1] = c0[1] + (c1[1] - c0[1]) * t; col[i * 3 + 2] = c0[2] + (c1[2] - c0[2]) * t;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.deleteAttribute('uv'); g.computeVertexNormals();
    put(M.leaf, g);
  }
  function limb(x0, y0, z0, x1, y1, z1, r0, r1) {
    var a = new THREE.Vector3(x0, y0, z0), b = new THREE.Vector3(x1, y1, z1), len = a.distanceTo(b);
    var g = new THREE.CylinderGeometry(r1, r0, len, 7); g.translate(0, len / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize())); g.translate(x0, y0, z0); put(M.bark, g);
  }
  function cherry(x, y, z, s) {
    var pink0 = [0.55, 0.26, 0.34], pink1 = [1.0, 0.80, 0.86];
    limb(x, y - 0.2, z, x + 0.3 * s, y + 2.2 * s, z, 0.28 * s, 0.18 * s);
    for (var k = 0; k < 4; k++) {
      var a = k / 4 * Math.PI * 2 + rnd(), ex = x + 0.3 * s + Math.cos(a) * 2.2 * s, ez = z + Math.sin(a) * 2.2 * s, ey = y + (3.2 + rnd()) * s;
      limb(x + 0.3 * s, y + 2.1 * s, z, ex, ey, ez, 0.16 * s, 0.07 * s);
      for (var j = 0; j < 3; j++) blob(ex + (rnd() - 0.5) * 1.6 * s, ey + (0.2 + rnd() * 0.6) * s, ez + (rnd() - 0.5) * 1.6 * s, (1.0 + rnd() * 0.5) * s, (0.75 + rnd() * 0.3) * s, (1.0 + rnd() * 0.5) * s, pink0, pink1, 120 + k * 3 + j);
    }
    blob(x + 0.3 * s, y + 4.3 * s, z, 2.3 * s, 1.4 * s, 2.3 * s, pink0, pink1, 130);
    colliders.push([x - 0.5, z - 0.5, x + 0.5, z + 0.5, y + 3]);
  }
  function pine(x, y, z, s) {
    var g0 = [0.03, 0.07, 0.04], g1 = [0.12, 0.24, 0.11], lean = (rnd() - 0.5) * 1.6 * s;
    limb(x, y - 0.2, z, x + lean, y + 7 * s, z, 0.42 * s, 0.16 * s);
    for (var k = 0; k < 4; k++) {
      var h = y + (2.8 + k * 1.5) * s, a = rnd() * Math.PI * 2, d = (2.4 - k * 0.45) * s, px = x + lean * (h - y) / (7 * s), bx = px + Math.cos(a) * d, bz = z + Math.sin(a) * d;
      limb(px, h - 0.4 * s, z, bx, h, bz, 0.12 * s, 0.06 * s);
      blob(bx, h + 0.25 * s, bz, (1.9 - k * 0.25) * s, 0.65 * s, (1.6 - k * 0.2) * s, g0, g1, 140 + k);
    }
    blob(x + lean, y + 7.3 * s, z, 1.4 * s, 0.75 * s, 1.3 * s, g0, g1, 150);
  }
  function buildPlatform() {
    // the stone base: battered and slightly curved, like a castle's ishigaki, from below the water up to the platform top
    var x0 = PLAT[0], z0 = PLAT[1], x1 = PLAT[2], z1 = PLAT[3], depth = BASE + 1.4, NS = 8;
    function off(d) { return 0.12 * d + 0.03 * d * d; }
    [[x0, z0, x1, z0, 0, -1], [x1, z0, x1, z1, 1, 0], [x1, z1, x0, z1, 0, 1], [x0, z1, x0, z0, -1, 0]].forEach(function (s) {
      var pos = [];
      for (var k = 0; k < NS; k++) {
        var d0 = k / NS * depth, d1 = (k + 1) / NS * depth, o0 = off(d0), o1 = off(d1), nx = s[4], nz = s[5];
        // corners spread outward with depth along both axes
        var q = function (x, z, o, y) { return [x + (x === x0 ? -o : x === x1 ? o : 0), y, z + (z === z0 ? -o : z === z1 ? o : 0)]; };
        var A = q(s[0], s[1], o0, -d0), B = q(s[2], s[3], o0, -d0), C = q(s[0], s[1], o1, -d1), D = q(s[2], s[3], o1, -d1);
        pos.push.apply(pos, A.concat(C, B, B, C, D));
      }
      var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
      var nrm = g.attributes.normal; if (nrm.getX(0) * s[4] + nrm.getZ(0) * s[5] < 0) { var arr = g.attributes.position.array; for (var w = 0; w < arr.length; w += 9) for (var c = 0; c < 3; c++) { var tmp = arr[w + 3 + c]; arr[w + 3 + c] = arr[w + 6 + c]; arr[w + 6 + c] = tmp; } g.computeVertexNormals(); }
      put(M.stone, g);
    });
    // the top: raked gravel, granite coping round the edge, paved forecourt, spine and band streets, gardens
    flatTop(M.gravel, x0, z0, x1, z1, 0);
    box(M.stone, x0 - 0.1, -0.3, z0 - 0.1, x1 + 0.1, 0.14, z0 + 1.2); box(M.stone, x0 - 0.1, -0.3, z1 - 1.2, x1 + 0.1, 0.14, z1 + 0.1); box(M.stone, x0 - 0.1, -0.3, z0 + 1.2, x0 + 1.2, 0.14, z1 - 1.2); box(M.stone, x1 - 1.2, -0.3, z0 + 1.2, x1 + 0.1, 0.14, z1 - 1.2);
    // a low parapet along the platform's edge, broken where the stair arrives
    [[x0, z0, -3.9, z0 + 0.5], [3.9, z0, x1, z0 + 0.5], [x0, z1 - 0.5, x1, z1], [x0, z0 + 0.5, x0 + 0.5, z1 - 0.5], [x1 - 0.5, z0 + 0.5, x1, z1 - 0.5]].forEach(function (r) { box(M.stone, r[0], 0.14, r[1], r[2], 0.75, r[3], true); });
    flatTop(M.paving, -10, z0 + 1.2, 10, -11, 0.02); flatTop(M.paving, x0 + 1.2, -2, x1 - 1.2, 2, 0.025);
    Object.keys(BANDS).forEach(function (b) { flatTop(M.paving, BANDS[b] - 2, 2, BANDS[b] + 2, z1 - 1.2, 0.02); });
    GARDENS.forEach(function (gd) { flatTop(M.grass, gd[0], z0 + 1.2, gd[1], -2, 0.015); flatTop(M.grass, gd[0], 2, gd[1], z1 - 1.2, 0.015); });
    // the stair, built out over the moat, and the causeway (an earth bridge faced in stone) to the far bank
    for (var k = 0; k < STEPS; k++) box(M.stone, -3, WATER - 0.4, STAIR0 + k * RUN, 3, -BASE + (k + 1) * RISE, z0);
    box(M.stone, -3.9, WATER - 0.4, STAIR0 - 0.4, -3, 0.95, z0 + 0.2, true); box(M.stone, 3, WATER - 0.4, STAIR0 - 0.4, 3.9, 0.95, z0 + 0.2, true);
    box(M.paving, -3.9, WATER - 0.4, MO[1] - 0.8, 3.9, -BASE + 0.02, STAIR0);
    box(M.stone, -4.4, -BASE, MO[1] - 0.8, -3.9, -BASE + 0.8, STAIR0, true); box(M.stone, 3.9, -BASE, MO[1] - 0.8, 4.4, -BASE + 0.8, STAIR0, true);
    lantern(-5.4, MO[1] - 2.2, -BASE); lantern(5.4, MO[1] - 2.2, -BASE);
  }
  // Stone lanterns (toro): base, shaft, a fire box that glows, a wide cap and a finial.
  function lantern(x, z, y) {
    y = y || 0;
    var parts = [[0.62, 0.62, 0.25, 0.12], [0.22, 0.26, 1.1, 0.8], [0.5, 0.5, 0.18, 1.44]];
    parts.forEach(function (p) { var g = new THREE.CylinderGeometry(p[0], p[1], p[2], 8); g.translate(x, y + p[3], z); put(M.stone, g); });
    box(M.stone, x - 0.36, y + 1.53, z - 0.36, x + 0.36, y + 2.05, z + 0.36);
    panel(M.shoji, x, y + 1.79, z + 0.37, 0.38, 0.34, 'z+'); panel(M.shoji, x, y + 1.79, z - 0.37, 0.38, 0.34, 'z-'); panel(M.shoji, x + 0.37, y + 1.79, z, 0.38, 0.34, 'x+'); panel(M.shoji, x - 0.37, y + 1.79, z, 0.38, 0.34, 'x-');
    var cap = new THREE.ConeGeometry(0.75, 0.42, 4); cap.rotateY(Math.PI / 4); cap.translate(x, y + 2.26, z); put(M.stone, cap);
    var fin = new THREE.SphereGeometry(0.13, 10, 8); fin.translate(x, y + 2.55, z); put(M.stone, fin);
    colliders.push([x - 0.6, z - 0.6, x + 0.6, z + 0.6, y + 2.6]);
  }

  // ---------- The keep: three tiers and an open lookout, the tallest thing on the platform ----------
  function buildKeep() {
    box(M.stone, -10.15, 0, -11.15, 10.15, 1.5, 11.15, true);
    walls([-10, -11, 10, 11], 1.5, 4.6, M.white, { bay: 2.5, skip: function (dir, c) { return dir === 'z-' && Math.abs(c) < 3.2; } });
    // the gate: dark studded doors in a heavy timber frame, under its own small roof
    box(M.timber, -2.45, 0, -11.35, -1.95, 4.0, -10.9); box(M.timber, 1.95, 0, -11.35, 2.45, 4.0, -10.9); box(M.timber, -2.6, 3.6, -11.4, 2.6, 4.05, -10.9);
    panel(M.gate, -0.98, 1.8, -11.18, 1.94, 3.6, 'z-'); panel(M.gate, 0.98, 1.8, -11.18, 1.94, 3.6, 'z-');
    roof([-3.3, -13.1, 3.3, -11.1], [-1.5, -12.1, 1.5, -12.1], 4.15, 5.0, 0.14, { ridge: true, fin: 0.35 });
    roof([-11.7, -12.7, 11.7, 12.7], [-8, -9, 8, 9], 4.55, 5.75, 0.55);
    walls([-8, -9, 8, 9], 5, 8.6, M.white, { bay: 2.3, odd: true });
    roof([-9.5, -10.5, 9.5, 10.5], [-6, -7, 6, 7], 8.55, 9.6, 0.5);
    walls([-6, -7, 6, 7], 9.1, 12, M.goldWall, { bay: 2.2 });
    roof([-7.4, -8.4, 7.4, 8.4], [-4, -5, 4, 5], 11.95, 12.85, 0.45);
    // lookout: open-sided, posts and a low rail, crowned by the main roof (peak about 19 m)
    [[-4, -5], [4, -5], [-4, 5], [4, 5], [0, -5], [0, 5], [-4, 0], [4, 0]].forEach(function (p) { box(M.timber, p[0] - 0.16, 12.6, p[1] - 0.16, p[0] + 0.16, 15.6, p[1] + 0.16); });
    box(M.timber, -4, 13.4, -5.05, 4, 13.55, -4.95); box(M.timber, -4, 13.4, 4.95, 4, 13.55, 5.05); box(M.timber, -4.05, 13.4, -5, -3.95, 13.55, 5); box(M.timber, 3.95, 13.4, -5, 4.05, 13.55, 5);
    roof([-5.5, -6.5, 5.5, 6.5], [0, -1, 0, 1], 15.55, 19, 0.6, { ridge: true });
    lantern(-5, -15); lantern(5, -15);
  }

  // ---------- Your rooms: facade modules from your plan (never part of this code) ----------
  var WALL = { W2: '#b0603a', W1: '#d9b8a2', C: '#ede8dd', E1: '#a9b6c4', E2: '#2f4a6b' };
  function readPlan() { try { var p = JSON.parse(lsGet(PLAN_KEY) || 'null'); return p && Array.isArray(p.rooms) ? p : null; } catch (e) { return null; } }
  function buildRooms(plan) {
    (plan ? plan.rooms : []).forEach(function (rm) {
      var m = /^(W2|W1|C|E1|E2)\.(W|E)\.(N|S)(\d+)$/.exec(String(rm.address || '').split('.F')[0]); if (!m) return;
      var bc = BANDS[m[1]], d = m[2] === 'E' ? 1 : -1, k = +m[4], zc = (m[3] === 'N' ? 1 : -1) * (7 + 10 * (k - 1)), xs = bc + 2 * d;
      var X = function (a, b) { var p = xs + a * d, q = xs + b * d; return [Math.min(p, q), Math.max(p, q)]; };
      var wall = plaster(rm.wall || WALL[m[1]]), f1 = X(0, 8), f2 = X(0, 6), streetDir = d > 0 ? 'x-' : 'x+';
      box(M.stone, f1[0] - 0.08, 0, zc - 4.08, f1[1] + 0.08, 1.4, zc + 4.08, true);
      walls([f1[0], zc - 4, f1[1], zc + 4], 1.4, 4.5, wall, { bay: 2.66, skip: function (dir, c) { return dir === streetDir && Math.abs(c - zc) < 1.4; } });
      roof([f1[0] - 0.85, zc - 4.85, f1[1] + 0.85, zc + 4.85], [f2[0], zc - 3, f2[1], zc + 3], 4.45, 5.45, 0.4);
      walls([f2[0], zc - 3, f2[1], zc + 3], 5.0, 8.5, wall, { bay: 2, odd: true });
      roof([f2[0] - 0.8, zc - 3.8, f2[1] + 0.8, zc + 3.8], [(f2[0] + f2[1]) / 2, zc - 0.8, (f2[0] + f2[1]) / 2, zc + 0.8], 8.45, 10.8, 0.45, { ridge: true });
      // the street door: tall double doors in a dark frame, a brass plate above
      var fx = xs - 0.1 * d;
      panel(M.gate, fx, 1.35, zc - 0.47, 0.92, 2.7, streetDir); panel(M.gate, fx, 1.35, zc + 0.47, 0.92, 2.7, streetDir);
      box(M.timber, Math.min(xs, xs - 0.18 * d), 0, zc - 1.12, Math.max(xs, xs - 0.18 * d), 2.95, zc - 0.94); box(M.timber, Math.min(xs, xs - 0.18 * d), 0, zc + 0.94, Math.max(xs, xs - 0.18 * d), 2.95, zc + 1.12);
      box(M.timber, Math.min(xs, xs - 0.18 * d), 2.75, zc - 1.12, Math.max(xs, xs - 0.18 * d), 2.97, zc + 1.12);
      box(M.gold, Math.min(xs, xs - 0.2 * d), 3.12, zc - 0.5, Math.max(xs, xs - 0.2 * d), 3.42, zc + 0.5);
    });
    flush(roomsGroup);
  }

  // ---------- The way home: a bronze ring in the forecourt, its surface rippling like water ----------
  var RING = { x: 0, y: 1.95, z: -29.5, r: 1.42 }, ringSurf;
  function buildRing() {
    var g = new THREE.TorusGeometry(RING.r + 0.1, 0.15, 16, 72); g.translate(RING.x, RING.y, RING.z); put(M.bronze, g, true);
    box(M.stone, -2.2, 0, RING.z - 0.9, 2.2, 0.32, RING.z + 0.9); box(M.stone, -1.6, 0.3, RING.z - 0.45, 1.6, 0.5, RING.z + 0.45);
    [-1, 1].forEach(function (s) { box(M.bronze, s * (RING.r + 0.05) - 0.12, 0.5, RING.z - 0.12, s * (RING.r + 0.05) + 0.12, RING.y, RING.z + 0.12); });
    ringSurf = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } }, transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false, fog: false,
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: [
        'uniform float uTime; varying vec2 vUv;',
        'void main() {',
        '  vec2 p = vUv * 2.0 - 1.0; float r = length(p);',
        '  float w = sin(r * 24.0 - uTime * 2.6) * 0.5 + sin(r * 10.0 + uTime * 1.5 + p.x * 3.0) * 0.3 + sin((p.x - p.y) * 7.0 - uTime * 2.0) * 0.2;',
        '  vec3 c = mix(vec3(0.03, 0.18, 0.24), vec3(0.42, 0.80, 0.86), 0.5 + 0.5 * w) + smoothstep(0.72, 1.0, r) * vec3(0.5, 0.82, 0.92) + pow(max(w, 0.0), 6.0) * 0.55;',
        '  gl_FragColor = vec4(c, (1.0 - smoothstep(0.96, 1.0, r)) * 0.94);',
        '}'].join('\n')
    });
    var disc = new THREE.Mesh(new THREE.CircleGeometry(RING.r, 64), ringSurf); disc.position.set(RING.x, RING.y, RING.z); disc.renderOrder = 2; siteGroup.add(disc);
    colliders.push([-2.2, RING.z - 0.9, -RING.r + 0.15, RING.z + 0.9, 0.32]); colliders.push([RING.r - 0.15, RING.z - 0.9, 2.2, RING.z + 0.9, 0.32]);
    // a small bronze plate: where this ring leads
    var c = document.createElement('canvas'); c.width = 512; c.height = 128; var g2 = c.getContext('2d');
    g2.fillStyle = '#6e5230'; g2.fillRect(0, 0, 512, 128); g2.strokeStyle = '#a8864f'; g2.lineWidth = 8; g2.strokeRect(6, 6, 500, 116);
    g2.fillStyle = '#f2dfb6'; g2.font = '600 58px "Bricolage Grotesque", system-ui, sans-serif'; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.fillText('Endless Clay', 256, 66);
    var tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    var plate = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), std({ map: tex, metalness: 0.6, roughness: 0.4 })); plate.position.set(0, 0.42, RING.z + 0.46); siteGroup.add(plate);
  }

  // ---------- Building it all, a step at a time (so a granted VR session can start straight away) ----------
  var status = $('#status');
  function say(t) { if (status) status.textContent = t; drawLabel(t); }
  // In the headset the card can't be seen, so while the palace is being raised a small label floats in front of you.
  var labelCanvas = document.createElement('canvas'); labelCanvas.width = 1024; labelCanvas.height = 192;
  var labelTex = new THREE.CanvasTexture(labelCanvas); labelTex.colorSpace = THREE.SRGBColorSpace;
  var label = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.225), new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, depthTest: false, fog: false, toneMapped: false }));
  label.position.set(0, -0.15, -1.6); label.renderOrder = 10; label.visible = false; camera.add(label);
  function drawLabel(t) {
    var g = labelCanvas.getContext('2d'); g.clearRect(0, 0, 1024, 192);
    g.fillStyle = 'rgba(27, 23, 18, 0.78)'; g.beginPath(); g.roundRect ? g.roundRect(8, 8, 1008, 176, 40) : g.rect(8, 8, 1008, 176); g.fill();
    g.fillStyle = '#d4ad55'; g.font = '600 34px "Bricolage Grotesque", system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('MEMORY PALACE', 512, 72);
    g.fillStyle = '#f4ead8'; g.font = '500 44px "Bricolage Grotesque", system-ui, sans-serif'; g.fillText(t, 512, 136, 960);
    labelTex.needsUpdate = true;
  }
  function frameGap() { return new Promise(function (r) { setTimeout(r, 0); }); }
  async function build() {
    for (var i = 0; i < TEX_STEPS.length; i++) { say('Making materials… ' + Math.round(i / TEX_STEPS.length * 100) + '%'); await TEX_STEPS[i](); await frameGap(); }
    makeMaterials();
    say('Raising the palace…'); buildLand(); await frameGap(); buildPlatform(); flush(siteGroup); await frameGap();
    buildKeep(); buildRing(); flush(keepGroup); await frameGap();
    buildRooms(readPlan()); await frameGap();
    // Prepare every material's shaders before showing them, in the background where the browser allows it,
    // so the first full frame doesn't stall the headset.
    say('Lighting the palace…');
    try { if (renderer.compileAsync) await renderer.compileAsync(scene, camera); else renderer.compile(scene, camera); } catch (e) { }
    renderer.shadowMap.needsUpdate = true; // the sun doesn't move: shadows are drawn once
    say(readPlan() ? 'Your palace is ready.' : 'The palace is ready. Open your palace plan to raise your rooms.');
    built.ready = true;
  }
  function rebuildRooms() {
    roomsGroup.children.slice().forEach(function (m) { roomsGroup.remove(m); m.geometry.dispose(); var j = built.indexOf(m); if (j >= 0) built.splice(j, 1); });
    colliders = colliders.filter(function (c) { return !c.room; });
    var before = colliders.length; buildRooms(readPlan()); for (var i = before; i < colliders.length; i++) colliders[i].room = true;
    renderer.shadowMap.needsUpdate = true;
  }

  // ---------- Getting around ----------
  // Ground: the platform top, the stair, or the land 2 m below. Buildings and lanterns block the way.
  function groundAt(x, z) {
    if (Math.abs(x) <= 3 && z >= STAIR0 && z < PLAT[1]) return -BASE + Math.min(STEPS, Math.floor((z - STAIR0) / RUN) + 1) * RISE;
    if (x >= PLAT[0] && x <= PLAT[2] && z >= PLAT[1] && z <= PLAT[3]) return 0;
    if (Math.abs(x) <= 3.9 && z >= MO[1] - 0.8 && z < STAIR0) return -BASE;
    if (x > MO[0] && x < MO[2] && z > MO[1] && z < MO[3]) return NaN; // the moat
    return -BASE;
  }
  function blocked(x, z, feet) {
    for (var i = 0; i < colliders.length; i++) { var c = colliders[i]; if (x > c[0] - 0.25 && x < c[2] + 0.25 && z > c[1] - 0.25 && z < c[3] + 0.25 && feet < c[4] - 0.45) return true; }
    return false;
  }
  var tmpV = new THREE.Vector3(), headPrev = null;
  function head(out) { return out.setFromMatrixPosition(camera.matrixWorld); }
  function headYaw() { camera.getWorldDirection(tmpV); return Math.atan2(-tmpV.x, -tmpV.z); }
  function move(dt, fwd, side) {
    if (!fwd && !side) { settle(); return; }
    rig.updateMatrixWorld(true);
    var yaw = headYaw(), sp = 2.4 * dt, dx = (-Math.sin(yaw) * fwd + Math.cos(yaw) * side) * sp, dz = (-Math.cos(yaw) * fwd - Math.sin(yaw) * side) * sp;
    var h = head(tmpV), feet = rig.position.y;
    var nx = h.x + dx, nz = h.z + dz, g = groundAt(nx, nz);
    if (g - feet <= 0.5 && !blocked(nx, nz, feet)) { rig.position.x += dx; rig.position.z += dz; }
    else if (groundAt(h.x + dx, h.z) - feet <= 0.5 && !blocked(h.x + dx, h.z, feet)) rig.position.x += dx;
    else if (groundAt(h.x, h.z + dz) - feet <= 0.5 && !blocked(h.x, h.z + dz, feet)) rig.position.z += dz;
    settle();
  }
  var hold = false;
  function settle() { if (hold) return; rig.updateMatrixWorld(true); var h = head(tmpV), g = groundAt(h.x, h.z); if (g !== g) return; rig.position.y += (g - rig.position.y) * 0.35; if (Math.abs(g - rig.position.y) < 0.01) rig.position.y = g; }
  function snapTurn(a) { rig.updateMatrixWorld(true); var h = head(new THREE.Vector3()); rig.position.sub(h); rig.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), a); rig.position.add(h); rig.rotation.y += a; }
  // Arrival: in the forecourt, just out of the ring, facing the gate.
  function arrive() { rig.position.set(0, 0, -27.6); rig.rotation.set(0, Math.PI, 0); flatPitch = 0.04; }

  // Walking back through the ring: home to Endless Clay, in front of its portal.
  var leaving = false;
  function checkRing() {
    rig.updateMatrixWorld(true); var h = head(tmpV), side = h.z > RING.z ? 1 : -1;
    var inside = Math.hypot(h.x - RING.x, (h.y - RING.y) * 0.8) < RING.r && Math.abs(h.z - RING.z) < 1.2;
    if (headPrev !== null && side !== headPrev && inside) goHome();
    headPrev = Math.abs(h.z - RING.z) < 1.2 ? side : null;
  }
  function goHome() {
    if (leaving) return; leaving = true;
    var h = null; try { h = JSON.parse(lsGet(HANDOFF) || 'null'); } catch (e) { }
    lsSet(HANDOFF, JSON.stringify({ from: 'palace', at: Date.now(), mode: renderer.xr.isPresenting ? 'immersive-vr' : null, back: h && h.back || '', debug: DEBUG }));
    var back = (h && h.back) || '', q = (DEBUG || (h && h.debug) ? 'debug&' : '') + 'via=palace';
    location.href = '../' + back + (back.indexOf('?') >= 0 ? '&' : '?') + q;
  }

  // Controllers: left stick walks (where you look), right stick snap-turns.
  var pads = [];
  for (var ci = 0; ci < 2; ci++) (function (i) {
    var c = renderer.xr.getController(i), rec = { src: null, snapReady: true };
    c.addEventListener('connected', function (e) { rec.src = e.data; }); c.addEventListener('disconnected', function () { rec.src = null; });
    rig.add(c); pads.push(rec);
  })(ci);
  function vrInput(dt) {
    var f = 0, s = 0;
    pads.forEach(function (p) {
      var gp = p.src && p.src.gamepad; if (!gp) return; var ax = gp.axes, sx = ax[2] || 0, sy = ax[3] || 0;
      if (p.src.handedness === 'left') { if (Math.hypot(sx, sy) > 0.15) { f = -sy; s = sx; } }
      else { if (Math.abs(sx) > 0.7 && p.snapReady) { snapTurn(sx > 0 ? -Math.PI / 6 : Math.PI / 6); p.snapReady = false; } if (Math.abs(sx) < 0.3) p.snapReady = true; }
    });
    move(dt, f, s);
  }
  // Flat screen: drag to look, WASD or arrows to walk.
  var keys = new Set(), flatYaw = Math.PI, flatPitch = 0, drag = null;
  addEventListener('keydown', function (e) { if (e.target && /input|textarea/i.test(e.target.tagName)) return; keys.add(e.key.toLowerCase()); });
  addEventListener('keyup', function (e) { keys.delete(e.key.toLowerCase()); });
  $('#scene').addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY }; });
  addEventListener('pointerup', function () { drag = null; });
  addEventListener('pointermove', function (e) { if (!drag) return; flatYaw -= (e.clientX - drag.x) * 0.004; flatPitch = Math.max(-1.2, Math.min(1.2, flatPitch - (e.clientY - drag.y) * 0.004)); drag = { x: e.clientX, y: e.clientY }; });
  function flatInput(dt) {
    rig.rotation.y = flatYaw; camera.rotation.set(flatPitch, 0, 0);
    var f = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0), s = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
    move(dt, f, s);
  }

  // ---------- VR ----------
  var asking = false;
  function enterVR() {
    if (!navigator.xr || renderer.xr.isPresenting || asking) return;
    asking = true;
    var early = window.__xrSession; window.__xrSession = null; // asked for by the page's first script, inside the portal's offer
    (early || navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] })).then(function (s) {
      s.addEventListener('end', function () { camera.position.set(0, EYE, 0); $('#card').hidden = false; });
      return renderer.xr.setSession(s).then(function () { camera.position.set(0, 0, 0); $('#card').hidden = true; rig.rotation.y = flatYaw; });
    }).catch(function () { say('Press Enter the palace to go in.'); }).then(function () { asking = false; });
  }
  $('#enter').addEventListener('click', enterVR);
  $('#home').addEventListener('click', goHome);
  if (!navigator.xr) $('#enter').disabled = true;
  // Your plan: picked from a file you keep, stored only on this device.
  $('#planBtn').addEventListener('click', function () { $('#planFile').click(); });
  $('#planFile').addEventListener('change', async function (e) {
    var f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      var o = JSON.parse(await f.text()), rooms = o && (o.rooms || (o.palace && o.rooms));
      if (!Array.isArray(rooms)) throw new Error('no rooms');
      lsSet(PLAN_KEY, JSON.stringify({ v: 1, rooms: rooms.map(function (r) { return { address: String(r.address || ''), wall: r.wall || null }; }), at: Date.now() }));
      if (built.ready) rebuildRooms(); say('Plan opened: ' + rooms.length + ' rooms, kept on this device only.');
    } catch (err) { say('That file isn’t a palace plan.'); }
  });

  // ---------- Loop ----------
  function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();
  var last = performance.now(), t0 = last, frameLog = [];
  renderer.setAnimationLoop(function () {
    var now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (DEBUG) { frameLog.push([now, renderer.xr.isPresenting ? 1 : 0]); if (frameLog.length > 2000) frameLog.shift(); }
    if (ringSurf) ringSurf.uniforms.uTime.value = (now - t0) / 1000;
    if (M.water) M.water.normalMap.offset.set((now - t0) * 0.000006, (now - t0) * 0.000011);
    label.visible = renderer.xr.isPresenting && !built.ready;
    try { if (built.ready) { if (renderer.xr.isPresenting) vrInput(dt); else flatInput(dt); checkRing(); } }
    catch (e) { if (DEBUG) console.error(e); }
    renderer.render(scene, camera);
  });

  arrive();
  if (VIA_CLAY) $('#card').classList.add('arriving');
  if (granted) enterVR();
  build().then(function () {
    ready = true;
    if (granted) enterVR();
  }, function (e) { built.ready = true; say('Something went wrong raising the palace. Walk back through the ring, or reload.'); if (DEBUG) console.error(e); });
  if (DEBUG) window.palaceDebug = {
    renderer: renderer, scene: scene, rig: rig, camera: camera, ring: RING, groundAt: groundAt,
    ready: function () { return !!built.ready; }, stats: function () { return { tris: renderer.info.render.triangles, calls: renderer.info.render.calls, meshes: built.length }; },
    look: function (yaw, pitch) { flatYaw = yaw; flatPitch = pitch; rig.rotation.y = yaw; camera.rotation.set(pitch, 0, 0); }, place: function (x, y, z, h) { rig.position.set(x, y, z); headPrev = null; hold = !!h; },
    walk: function (n, f, s) { for (var i = 0; i < n; i++) { move(1 / 60, f, s === undefined ? 0 : s); checkRing(); } return rig.position.toArray(); },
    rebuild: rebuildRooms, frames: function () { return frameLog; }, presenting: function () { return renderer.xr.isPresenting; }
  };
})();
