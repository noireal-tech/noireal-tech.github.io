(function () {
  'use strict';
  var PALETTE = [
    ['Terracotta', '#b8613f'], ['Ochre', '#c9973f'], ['Sage', '#8a9a6b'], ['Celadon', '#8fc2b0'],
    ['Slate', '#5f7484'], ['Porcelain', '#e9e2d6'], ['Umber', '#5b4033'], ['Rose', '#c98a8a'],
    ['Crystal', '#eef6fb']
  ];
  // Crystal is a finish as well as a colour: a shape painted with it turns to see-through glass, and the other
  // colours (the dyes) tint that glass. The land is always clay, so on the land Crystal falls back to Porcelain.
  var CRYSTAL = 8, DYES = 8, PORCELAIN = 5;
  var ICON = {
    build: '<path d="M4 18c0-5 3.5-9 8-9s8 4 8 9z"/><path d="M12 2v5M9.5 4.5h5"/>',
    carve: '<path d="M14.5 9.5 21 3"/><path d="M14.5 9.5a4 4 0 1 1-5.7 5.6 4 4 0 0 1 5.7-5.6z"/><path d="M3 21h8"/>',
    groove: '<path d="M3 8h18"/><path d="m7 8 5 8 5-8"/><path d="M3 20h18"/>',
    flatten: '<rect x="4" y="3" width="11" height="9" rx="2"/><path d="M9.5 12v5"/><path d="M3 21h18"/>',
    smooth: '<path d="M3 10c2-3 4-3 6 0s4 3 6 0 4-3 6 0"/><path d="M3 17h18"/>',
    glaze: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/><path d="M9.5 15a2.5 2.5 0 0 0 2.5 2.5"/>',
    brick: '<rect x="3" y="6" width="18" height="12" rx="1.5"/><path d="M3 12h18M9 6v6M15 12v6"/>',
    sphere: '<circle cx="12" cy="12" r="8"/><path d="M4 12c3 3 13 3 16 0"/>',
    cone: '<path d="M12 3 5 19h14z"/><path d="M5 19c0 1.2 3.1 2 7 2s7-.8 7-2"/>',
    cube: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
    cylinder: '<ellipse cx="12" cy="5.5" rx="7" ry="2.5"/><path d="M5 5.5v13c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-13"/>',
    select: '<path d="M5 3l14 7-6 2-2 6z"/>',
    move: '<path d="M12 3v18M3 12h18"/><path d="m9 6 3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"/>',
    pull: '<path d="M3 20c4 0 5-3 6-6s2-8 3-8 2 5 3 8 2 6 6 6"/><path d="m12 2v3"/>',
    slice: '<path d="M4 20 20 4"/><path d="M14 4h6v6"/><path d="M4 12h6v8"/>',
    coil: '<path d="M4 17c0-3 3-3 4-1s3 2 4 0 3-3 4-1 2 2 4 1"/><path d="M4 11c0-3 3-3 4-1s3 2 4 0 3-3 4-1 2 2 4 1"/>',
    torus: '<ellipse cx="12" cy="12" rx="9" ry="5.5"/><ellipse cx="12" cy="11.5" rx="3.5" ry="1.6"/>',
    gem: '<path d="M12 3 20 9 17 20H7L4 9z"/><path d="M4 9h16M12 3 9 9l3 11 3-11z"/>',
    erase: '<path d="m7 21-4-4 10-10 8 8-6 6z"/><path d="M7 21h14M9 11l7 7"/>',
    paste: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 11h6M9 15h6"/>',
    recolor: '<path d="M19 11 12 4 4 12l7 7z"/><path d="M19 11c1 2 2 3 2 4.5a2 2 0 0 1-4 0c0-1.5 1-2.5 2-4.5z"/><path d="M4 12h15"/>',
    pick: '<path d="m14 4 6 6-2 2-6-6z"/><path d="m12 8-8 8v4h4l8-8"/>',
    skin: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-8 8"/>',
    board: '<rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="m10 8 5 2.5-5 2.5z"/><path d="M12 17v4M8 21h8"/>'
  };
  // Tool palette, modelled on Open Blocks' six tools: Sculpt (modify + stroke), Shapes (insert, grab, erase), Paint.
  var TOOLS = [
    { id: 'build', name: 'Build', tab: 'sculpt', tint: '#f3e9dc' },
    { id: 'carve', name: 'Carve', tab: 'sculpt', tint: '#e48a6e' },
    { id: 'groove', name: 'Groove', tab: 'sculpt', tint: '#e48a6e' },
    { id: 'pull', name: 'Pull', tab: 'sculpt', tint: '#f3e9dc' },
    { id: 'slice', name: 'Slice', tab: 'sculpt', tint: '#e48a6e' },
    { id: 'flatten', name: 'Flatten', tab: 'sculpt', tint: '#e3c98f' },
    { id: 'smooth', name: 'Smooth', tab: 'sculpt', tint: '#bfd6e6' },
    { id: 'coil', name: 'Coil', tab: 'sculpt', tint: null },
    { id: 'mold', mold: 'sphere', name: 'Sphere', icon: 'sphere', tab: 'shapes', tint: null },
    { id: 'mold', mold: 'cone', name: 'Cone', icon: 'cone', tab: 'shapes', tint: null },
    { id: 'mold', mold: 'cube', name: 'Cube', icon: 'cube', tab: 'shapes', tint: null },
    { id: 'mold', mold: 'cylinder', name: 'Cylinder', icon: 'cylinder', tab: 'shapes', tint: null },
    { id: 'mold', mold: 'torus', name: 'Torus', icon: 'torus', tab: 'shapes', tint: null },
    { id: 'mold', mold: 'gem', name: 'Gem', icon: 'gem', tab: 'shapes', tint: null },
    { id: 'brick', name: 'Brick', tab: 'shapes', tint: null },
    { id: 'select', name: 'Select', tab: 'shapes', tint: '#8fc2b0' },
    { id: 'move', name: 'Move', tab: 'shapes', tint: '#8fc2b0' },
    { id: 'erase', name: 'Erase', tab: 'shapes', tint: '#e48a6e' },
    { id: 'paste', name: 'Paste', tab: 'shapes', tint: '#8fc2b0' },
    { id: 'glaze', name: 'Glaze', tab: 'paint', tint: null },
    { id: 'recolor', name: 'Recolor', tab: 'paint', tint: null },
    { id: 'pick', name: 'Pick color', icon: 'pick', tab: 'paint', tint: '#f3e9dc' },
    { id: 'skin', name: 'Skin', tab: 'paint', tint: '#8fc2b0' },
    { id: 'board', name: 'Billboard', tab: 'shapes', tint: '#8fc2b0' }
  ];
  var TABS_UI = ['sculpt', 'shapes', 'paint'];
  var MOLD_NAME = {}; TOOLS.forEach(function (t) { if (t.mold) MOLD_NAME[t.mold] = t.name; });
  var EYE = 1.6, OBJ_HALF = ClayStudio.Studio.OBJ_HALF, BRICK = ClayStudio.Studio.BRICK, MIN_SIZE = 0.1, MAX_SIZE = 1.5, MIN_S = Math.pow(2, -8), MAX_S = Math.pow(2, 20);
  // Size levels: 25 steps, each double the one before. Level 7 is a normal mold (0.8 m across),
  // so level 1 is about 1.25 cm and level 25 about 210 km.
  var LEVELS = 25, LEVEL_BASE = 7;
  // Ask the browser to keep this site's storage (worlds, photos, sounds) even when the device is short of space.
  if (navigator.storage && navigator.storage.persist) navigator.storage.persisted().then(function (p) { if (!p) return navigator.storage.persist(); }).catch(function () { });
  var LS_WORLD = 'kilnworks.world.v2', LS_HELP = 'kilnworks.help.v2', LS_PREFS = 'kilnworks.prefs.v1';
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function r3(v) { return Math.round(v * 1000) / 1000; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function uid(p) { return p + Math.random().toString(36).slice(2, 7) + (++uid.n).toString(36); }
  uid.n = 0;

  var prefs = {}; try { prefs = JSON.parse(lsGet(LS_PREFS) || '{}') || {}; } catch (e) { prefs = {}; }
  var state = {
    tab: 'sculpt', tool: 0, color: 0, size: 0.45, fly: true, muted: !!prefs.muted,
    name: prefs.name || ('Potter ' + (10 + Math.floor(Math.random() * 90))),
    avatar: typeof prefs.avatar === 'number' ? prefs.avatar : Math.floor(Math.random() * DYES),
    multi: false, part: false, pane: 'size', stickResize: false,
    pscale: typeof prefs.pscale === 'number' ? prefs.pscale : 1,  // player size in VR / flat: 1 = normal
    snap: !!prefs.snap, env: prefs.env || 'Day',
    skin: typeof prefs.skin === 'string' ? prefs.skin : null, landSkin: null, sound: null, soundLoop: false, hollow: !!prefs.hollow, tour: !!prefs.tour, fit: ClayStudio.Studio.FITS.indexOf(prefs.fit) >= 0 ? prefs.fit : 'wrap', lastPaint: TOOLS.findIndex(function (t) { return t.id === 'glaze'; })
  };
  function savePrefs() { lsSet(LS_PREFS, JSON.stringify({ name: state.name, avatar: state.avatar, muted: state.muted, view: prefs.view, mode: prefs.mode, pscale: state.pscale, points: prefs.points, snap: state.snap, env: state.env, skin: state.skin, fit: state.fit,
    ambient: prefs.ambient, toolSounds: prefs.toolSounds, linkCode: prefs.linkCode, linkOn: prefs.linkOn,
    hollow: state.hollow, links: prefs.links, link: prefs.link, bbMode: prefs.bbMode, bbFix: prefs.bbFix, cat: prefs.cat, nav: prefs.nav, walk: prefs.walk, tour: state.tour, visitorsBuild: prefs.visitorsBuild, motion: prefs.motion })); }
  function toolId() { return TOOLS[state.tool].id; }

  // ---------- Studio ----------
  // Extra glazes after the swatches: architectural finishes a world file can use (a build made elsewhere, say), not
  // offered on the swatches. They follow the swatches' indices, so worlds painted with the swatches don't change.
  var GLAZES = [['Granite', '#8a8478'], ['Lime plaster', '#ede8dd'], ['Gold luster', '#b8933a'], ['Roof tile', '#4a4e52'], ['Dark timber', '#2b2623'],
    ['Fired clay', '#b0603a'], ['Pale clay', '#d9b8a2'], ['Pale slate', '#a9b6c4'], ['Indigo slate', '#2f4a6b'], ['Verdigris', '#4e8c7a'], ['Raw clay', '#9c7a54'],
    ['Buff', '#cdb78e'], ['Gravel', '#bdb6a6'], ['Garden', '#6f8a55']];
  var palLinear = PALETTE.concat(GLAZES).map(function (p) { var c = new THREE.Color(p[1]); return [c.r, c.g, c.b]; });
  // Shapes' colours carry how see-through they are as crystal: clear crystal is nearly invisible glass, dyes are stained glass.
  var palShapes = palLinear.map(function (c, i) { return c.concat(i === CRYSTAL ? 0.16 : 0.55); });
  var studio = new ClayStudio.Studio({ palette: palLinear, shapePalette: palShapes });
  var terrain = studio.terrain, V = terrain.voxel, CHUNK_M = 16 * V;
  var savedVersion = studio.version;

  // ---------- Renderer & scene ----------
  var canvas = $('#scene');
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local-floor');
  var scene = new THREE.Scene();
  var HORIZON = new THREE.Color('#e6d6c1');
  scene.background = HORIZON.clone();
  scene.fog = new THREE.Fog(HORIZON, 8, 20);
  var sky = (function () { // vertex colours are filled in by setEnv
    var g = new THREE.SphereGeometry(150, 32, 16);
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3));
    var m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    m.renderOrder = -1; scene.add(m); return m;
  })();
  var fogObj = scene.fog;
  var worldRoot = new THREE.Group(), streamGroup = new THREE.Group(), plateGroup = new THREE.Group();
  scene.add(worldRoot); worldRoot.add(streamGroup, plateGroup);
  var hemi = new THREE.HemisphereLight(0xe4ecf0, 0x6b4a3a, 1.7); scene.add(hemi);
  var sun = new THREE.DirectionalLight(0xfff1df, 1.9); sun.position.set(6, 12, 4); scene.add(sun);

  var clayMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  // Crystal: glossy, see-through, both faces drawn so you see the far wall through the near one. Vertex colours tint it.
  // Drawn as two meshes, far faces first, so you see the far wall through the near one. (A single double-sided
  // see-through material makes three.js re-check its shader twice every frame.)
  function glass(side, o) { return new THREE.MeshPhongMaterial(Object.assign({ transparent: true, shininess: 120, specular: 0xffffff, side: side, depthWrite: false }, o)); }
  var crystalMat = glass(THREE.FrontSide, { vertexColors: true }), crystalBack = glass(THREE.BackSide, { vertexColors: true });
  // ---------- Skins: photos laid onto shapes and onto the land ----------
  // A shape's photo is projected in the shape's own space, so it stays put as the shape is moved, scaled or sculpted.
  // Fits: wrap (across the front, mirrored round the back), around (once all the way round, 360°), box (onto each
  // side), front (straight through, like a slide projector). The photo can be moved, turned and zoomed on the shape.
  var FIT_N = { wrap: 0, box: 1, front: 2, around: 3 }, skinImgs = new Map(), skinTexs = new Map(), GL2 = renderer.capabilities.isWebGL2;
  var SKIN_GLSL = [
    'varying vec3 vSkP; varying vec3 vSkN; uniform sampler2D skinMap; uniform int skinFit; uniform vec4 skinXf;',
    // Photo position: move (xy), turn (z) and zoom (w), about the photo's centre.
    'vec2 skRot(vec2 q) { float c = cos(skinXf.z), s = sin(skinXf.z); return vec2(c * q.x + s * q.y, -s * q.x + c * q.y) / skinXf.w; }',
    'vec2 skXf(vec2 uv) { return skRot(uv - 0.5 - skinXf.xy) + 0.5; }',
    // a and b name the same spot in the photo but jump in different places; take the smoother one's slope for
    // mipmapping, so the wrap's seam doesn't show as a line.
    'vec3 skSeam(vec2 a, vec2 b) {',
    GL2 ? '  vec2 dx = dFdx(a), dy = dFdy(a), dx2 = dFdx(b), dy2 = dFdy(b); if (abs(dx2.x) + abs(dy2.x) < abs(dx.x) + abs(dy.x)) { dx = dx2; dy = dy2; }\n  return textureGrad(skinMap, skXf(a), skRot(dx), skRot(dy)).rgb;'
      : '  return texture2D(skinMap, skXf(a)).rgb;',
    '}',
    'vec3 skinColor() {',
    '  vec3 p = vSkP / 0.8 + 0.5;', // a mold spans -0.4 … 0.4
    '  if (skinFit == 0) return skSeam(vec2(atan(vSkP.x, vSkP.z) / 3.1415927 + 0.5, p.y), vec2(atan(-vSkP.x, -vSkP.z) / 3.1415927 + 1.5, p.y));',
    '  if (skinFit == 3) { float u = atan(vSkP.x, vSkP.z) / 6.2831853 + 0.5; return skSeam(vec2(u, p.y), vec2(fract(u + 0.5) - 0.5, p.y)); }',
    '  if (skinFit == 2) return texture2D(skinMap, skXf(p.xy)).rgb;',
    '  vec3 w = pow(abs(normalize(vSkN)), vec3(4.0)); w /= w.x + w.y + w.z + 1e-5;', // box: blend the three side-on views
    '  return texture2D(skinMap, skXf(p.zy)).rgb * w.x + texture2D(skinMap, skXf(p.xz)).rgb * w.y + texture2D(skinMap, skXf(p.xy)).rgb * w.z;',
    '}'].join('\n');
  function skinImage(id) {
    var img = skinImgs.get(id); if (img) return img;
    var d = studio.skins.get(id) || photoData(id); if (!d) return null;
    img = new Image(); img.onload = function () { panel.dirty = true; }; img.src = d; skinImgs.set(id, img); return img;
  }
  // mirror: the half wrap needs a mirrored photo; everything else repeats it.
  function skinTexture(id, mirror) {
    var key = id + (mirror ? ':m' : ':r'), tex = skinTexs.get(key); if (tex) return tex;
    var img = skinImage(id); if (!img) return null;
    tex = new THREE.Texture(img); tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = mirror ? THREE.MirroredRepeatWrapping : THREE.RepeatWrapping;
    tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    if (img.complete && img.naturalWidth) tex.needsUpdate = true; else img.addEventListener('load', function () { tex.needsUpdate = true; });
    skinTexs.set(key, tex); return tex;
  }
  // Wrap a stock material so its colour comes from a photo. glsl defines vec3 skinColor(); vary names the
  // position and normal varyings it reads; uniforms are bound by reference so they can change without a rebuild.
  function photoMaterial(m, key, glsl, uniforms) {
    m.onBeforeCompile = function (sh) {
      Object.keys(uniforms).forEach(function (k) { sh.uniforms[k] = uniforms[k]; });
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSkP; varying vec3 vSkN;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSkP = position; vSkN = normal;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + glsl)
        .replace('#include <map_fragment>', 'diffuseColor.rgb *= skinColor();');
    };
    m.customProgramCacheKey = function () { return key; };
    m.userData.skin = true; m.userData.u = uniforms; return m;
  }
  function skinMaterial(tex, fit, crystal) {
    var u = { skinMap: { value: tex }, skinFit: { value: FIT_N[fit] || 0 }, skinXf: { value: new THREE.Vector4(0, 0, 0, 1) } };
    var m = photoMaterial(crystal ? glass(THREE.FrontSide, { opacity: 0.6 }) : new THREE.MeshLambertMaterial(), 'skin', SKIN_GLSL, u);
    if (crystal) m.userData.back = photoMaterial(glass(THREE.BackSide, { opacity: 0.6 }), 'skin', SKIN_GLSL, u); // same uniforms, so it moves with the photo
    return m;
  }
  function backOf(mat) { return mat === crystalMat ? crystalBack : mat && mat.userData.back || null; }
  function dropMat(m) { if (m && m.userData.skin) { m.dispose(); if (m.userData.back) m.userData.back.dispose(); } }
  // A crystal mesh carries its far faces as a child sharing its geometry; anything else carries none.
  function syncBack(mesh) {
    var want = backOf(mesh.material), have = mesh.userData.back;
    if (have && have.material !== want) { mesh.remove(have); mesh.userData.back = have = null; }
    if (want && !have) { have = new THREE.Mesh(mesh.geometry, want); have.matrixAutoUpdate = false; have.renderOrder = -1; mesh.add(have); mesh.userData.back = have; }
  }
  // The material a shape is drawn with: clay, crystal, or either wearing a photo.
  function shapeMaterial(o) {
    var tex = o.sk ? skinTexture(o.sk, o.fit === 'wrap') : null;
    return tex ? skinMaterial(tex, o.fit, o.cr) : o.cr ? crystalMat : clayMat;
  }

  // Land skins: a photo projected onto the land along its facing (down onto the ground, or onto a cliff like a
  // mural). Each one redraws the land chunks under it with a material that only shows inside the photo's frame.
  var LAND_GLSL = [
    'varying vec3 vSkP; varying vec3 vSkN; uniform sampler2D dcMap; uniform vec3 dcC; uniform vec3 dcR; uniform vec3 dcU; uniform vec3 dcN; uniform vec3 dcS;',
    'vec3 skinColor() {',
    '  vec3 d = vSkP - dcC; float x = dot(d, dcR) / dcS.x, y = dot(d, dcU) / dcS.y;',
    '  if (abs(x) > 0.5 || abs(y) > 0.5 || abs(dot(d, dcN)) > dcS.z || dot(normalize(vSkN), dcN) < 0.2) discard;',
    '  return texture2D(dcMap, vec2(x, y) + 0.5).rgb;',
    '}'].join('\n');
  var decalViews = new Map(), seenDecalVer = -1;
  function landFrame(d) { // right, up, width, height, depth of a land skin
    var n = d.n, u = d.u, r = [u[1] * n[2] - u[2] * n[1], u[2] * n[0] - u[0] * n[2], u[0] * n[1] - u[1] * n[0]], w = d.s, h = d.s * d.a;
    return { r: r, w: w, h: h, depth: Math.max(w, h, 1) }; // reaches over hills and dips as deep as the photo is wide
  }
  function decalBox(d) {
    var f = landFrame(d), b = [];
    for (var i = 0; i < 3; i++) { var e = Math.abs(f.r[i]) * f.w / 2 + Math.abs(d.u[i]) * f.h / 2 + Math.abs(d.n[i]) * f.depth; b[i] = d.c[i] - e; b[i + 3] = d.c[i] + e; }
    return b;
  }
  function chunkTouches(key, b) {
    var c = ClayEngine.unkey(key), x0 = terrain.ox + c[0] * CHUNK_M - V, y0 = terrain.oy + c[1] * CHUNK_M - V, z0 = terrain.oz + c[2] * CHUNK_M - V, e = CHUNK_M + 2 * V;
    return x0 <= b[3] && x0 + e >= b[0] && y0 <= b[4] && y0 + e >= b[1] && z0 <= b[5] && z0 + e >= b[2];
  }
  function attachDecals(mesh, key) {
    decalViews.forEach(function (dv) {
      if (!chunkTouches(key, dv.box)) return;
      var o = new THREE.Mesh(mesh.geometry, dv.mat); o.matrixAutoUpdate = false; o.matrixWorldNeedsUpdate = true; o.renderOrder = 1;
      mesh.add(o);
    });
  }
  // Rebuild the land skins' overlays whenever any land skin changes (they change only when someone edits one).
  function syncDecals() {
    if (studio.decalVer === seenDecalVer) return;
    seenDecalVer = studio.decalVer;
    decalViews.forEach(function (dv) { dv.mat.dispose(); }); decalViews.clear();
    studio.decals.forEach(function (d) {
      var tex = skinTexture(d.sk, false); if (!tex) return;
      var f = landFrame(d), m = new THREE.MeshLambertMaterial({ polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
      photoMaterial(m, 'land', LAND_GLSL, {
        dcMap: { value: tex }, dcC: { value: new THREE.Vector3().fromArray(d.c) }, dcR: { value: new THREE.Vector3().fromArray(f.r) },
        dcU: { value: new THREE.Vector3().fromArray(d.u) }, dcN: { value: new THREE.Vector3().fromArray(d.n) }, dcS: { value: new THREE.Vector3(f.w, f.h, f.depth) }
      });
      decalViews.set(d.id, { mat: m, box: decalBox(d) });
    });
    [terrainMeshes, ar.meshes].forEach(function (map) {
      map.forEach(function (mesh, key) { if (!mesh) return; while (mesh.children.length) mesh.remove(mesh.children[0]); attachDecals(mesh, key); });
    });
    if (state.landSkin && !studio.decals.has(state.landSkin)) state.landSkin = null;
    markLandSkin();
  }
  // Outline of the land skin being adjusted (shown while the Skin tool is out).
  var landMark = new THREE.LineLoop(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(12), 3)),
    new THREE.LineBasicMaterial({ color: 0x8fc2b0, depthTest: false, transparent: true }));
  landMark.renderOrder = 6; landMark.frustumCulled = false; landMark.visible = false; worldRoot.add(landMark);
  function markLandSkin() {
    var d = state.landSkin && studio.decals.get(state.landSkin);
    landMark.visible = !!d && toolId() === 'skin'; if (!d) return;
    var f = landFrame(d), p = landMark.geometry.attributes.position;
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (k, i) {
      for (var a = 0; a < 3; a++) p.array[i * 3 + a] = d.c[a] + f.r[a] * k[0] * f.w / 2 + d.u[a] * k[1] * f.h / 2 + d.n[a] * 0.03;
    });
    p.needsUpdate = true;
  }

  // Put chunk mesh data m (or null: nothing there) into group under key. map keeps key → mesh (null = built, empty).
  // land: a land chunk, which carries the land skins that reach it.
  function putMesh(group, map, key, m, mat, land) {
    var mesh = map.get(key);
    if (!m) { if (mesh) { group.remove(mesh); mesh.geometry.dispose(); } map.set(key, null); return; }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(m.positions, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(m.normals, 3));
    if (mat === crystalMat) { // colour plus per-vertex see-through amount
      var rgba = new Float32Array(m.alphas.length * 4);
      for (var i = 0; i < m.alphas.length; i++) { rgba[4 * i] = m.colors[3 * i]; rgba[4 * i + 1] = m.colors[3 * i + 1]; rgba[4 * i + 2] = m.colors[3 * i + 2]; rgba[4 * i + 3] = m.alphas[i]; }
      g.setAttribute('color', new THREE.BufferAttribute(rgba, 4));
    } else g.setAttribute('color', new THREE.BufferAttribute(m.colors, 3));
    g.setIndex(new THREE.BufferAttribute(m.indices, 1));
    g.computeBoundingSphere();
    if (mesh) { mesh.geometry.dispose(); mesh.geometry = g; mesh.material = mat || clayMat; mesh.children.forEach(function (c) { c.geometry = g; }); }
    else { mesh = new THREE.Mesh(g, mat || clayMat); mesh.matrixAutoUpdate = false; group.add(mesh); map.set(key, mesh); if (land) attachDecals(mesh, key); }
    if (!land) syncBack(mesh);
  }
  function dropMesh(group, map, key) { var m = map.get(key); if (m) { group.remove(m); m.geometry.dispose(); } map.delete(key); }
  function clearMeshes(group, map) { map.forEach(function (m) { if (m) { group.remove(m); m.geometry.dispose(); } }); map.clear(); }
  function syncWorldMeshes(w, group, map, mat) {
    if (!w.dirty.size) return;
    w.dirty.forEach(function (key) { putMesh(group, map, key, w.meshChunk(key), mat); });
    w.dirty.clear();
  }
  // Remesh edited terrain chunks that are on show, then build new ones nearest-first within the time budget.
  function pumpTerrain(group, map, s, clip, t0, budget) {
    if (terrain.dirty.size) { terrain.dirty.forEach(function (k) { if (map.has(k)) putMesh(group, map, k, terrain.meshChunk(k, clip), null, true); }); terrain.dirty.clear(); }
    while (s.idx < s.list.length && performance.now() - t0 < budget) { var k = s.list[s.idx++]; if (!map.has(k)) putMesh(group, map, k, terrain.meshChunk(k, clip), null, true); }
  }
  // Chunk keys of every column within R of (cx, cz), nearest first.
  function ringKeys(cx, cz, R, round) {
    var cols = [], keys = [];
    for (var dz = -R; dz <= R; dz++) for (var dx = -R; dx <= R; dx++) if (!round || dx * dx + dz * dz <= R * R + R) cols.push([dx * dx + dz * dz, cx + dx, cz + dz]);
    cols.sort(function (a, b) { return a[0] - b[0]; });
    cols.forEach(function (e) { for (var cy = 0; cy < terrain.ncy; cy++) keys.push(ClayEngine.ckey(e[1], cy, e[2])); });
    return keys;
  }
  // ---------- Endless terrain streaming ----------
  // Like Minecraft: chunks within the view distance are generated and meshed nearest-first,
  // a few milliseconds per frame; chunks that fall out of range are dropped.
  var VIEW = { Near: 6, Medium: 9, Far: 12 }, VIEW_ORDER = ['Near', 'Medium', 'Far'];
  var coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  // Motion: follows the system's Reduce Motion setting until you pick one in the menu. Reduced: panels switch without
  // turning, the snapshot flash is soft, and ground-arrow steps cut (under a quick fade) instead of gliding.
  var mqReduce = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function motionReduced() { return prefs.motion === 'reduced' || (prefs.motion !== 'full' && mqReduce.matches); }
  var motionShown = null;
  function syncMotion() { var r = motionReduced(); if (r === motionShown) return; motionShown = r; document.documentElement.classList.toggle('reduce-motion', r); var b = document.getElementById('motionBtn'); if (b) b.textContent = 'Motion: ' + (r ? 'reduced' : 'full'); }
  if (mqReduce.addEventListener) mqReduce.addEventListener('change', syncMotion);
  syncMotion();
  // iOS only applies :active (the press tint) once a touch listener exists
  document.addEventListener('touchstart', function () { }, { passive: true });
  // Sliders paint their filled part from --p
  function rangeFill(el) { var a = +el.min || 0, b = +el.max || 100; el.style.setProperty('--p', ((+el.value - a) / (b - a || 1) * 100) + '%'); }
  document.addEventListener('input', function (e) { if (e.target && e.target.type === 'range') rangeFill(e.target); });
  var viewName = VIEW[prefs.view] ? prefs.view : (coarse ? 'Near' : 'Medium');
  var terrainMeshes = new Map(), stream = { pcx: null, pcz: null, R: 0, list: [], idx: 0, gen: -1 };
  function viewRadius() {
    var R = VIEW[viewName]; if (renderer.xr.isPresenting) R = Math.min(R, 7);
    if (!ar.active && state.pscale > 1) R = Math.min(R + Math.round(2 * Math.log2(state.pscale)), 14); // giants see farther
    return R;
  }
  function applyFog() { var far = viewRadius() * CHUNK_M * 0.92; scene.fog.far = far; scene.fog.near = far * 0.4; }
  function streamTerrain(budget) {
    var t0 = performance.now(), R = viewRadius();
    if (terrain.resetGen !== stream.gen) { clearMeshes(streamGroup, terrainMeshes); terrain.dirty.clear(); stream.gen = terrain.resetGen; stream.pcx = null; }
    rig.updateMatrixWorld(true);
    var hd = headWorld(tmpV2), g = terrain.toGrid(hd.x, hd.y, hd.z), pcx = Math.floor(g[0] / 16), pcz = Math.floor(g[2] / 16);
    if (pcx !== stream.pcx || pcz !== stream.pcz || R !== stream.R) {
      var list = ringKeys(pcx, pcz, R, true), wanted = new Set(list);
      Array.from(terrainMeshes.keys()).forEach(function (k) { if (!wanted.has(k)) dropMesh(streamGroup, terrainMeshes, k); });
      terrain.evict(pcx, pcz, R + 2);
      stream.pcx = pcx; stream.pcz = pcz; stream.R = R; stream.list = list; stream.idx = 0;
      applyFog();
    }
    pumpTerrain(streamGroup, terrainMeshes, stream, null, t0, budget);
  }
  function cycleView() {
    viewName = VIEW_ORDER[(VIEW_ORDER.indexOf(viewName) + 1) % VIEW_ORDER.length];
    prefs.view = viewName; savePrefs(); updateHud(); toast('View distance: ' + viewName + ' (' + Math.round(VIEW[viewName] * CHUNK_M) + ' m)');
  }

  // Object views: one THREE.Group per clay shape, transformed by its position / turn / stretch.
  var objViews = new Map(), viewList = []; // viewList: the same views as an array, for the hot loops
  function listViews() { viewList = Array.from(objViews.values()); }
  function dropView(id) {
    var v = objViews.get(id); if (!v) return;
    worldRoot.remove(v.group); v.meshes.forEach(function (m) { if (m) m.geometry.dispose(); });
    dropMat(v.mat);
    stopLoop(id);
    objViews.delete(id); listViews();
  }
  function syncObjects() {
    studio.removed.forEach(dropView); studio.removed.length = 0;
    studio.objects.forEach(function (o) {
      var v = objViews.get(o.id);
      if (!v) {
        v = { o: o, group: new THREE.Group(), meshes: new Map(), xver: -1, inv: new THREE.Matrix4(), inv3: new THREE.Matrix3(), nrm: new THREE.Matrix3(), R: 1 };
        worldRoot.add(v.group); objViews.set(o.id, v); listViews(); o.w.markAllDirty();
      }
      if (v.xver !== o.xver) {
        v.group.position.fromArray(o.p); v.group.rotation.set(o.r[0], o.r[1], 0, 'YXZ'); v.group.scale.fromArray(o.s);
        v.group.updateMatrix(); // world-content space (relative to worldRoot), so AR scaling doesn't change hit tests
        v.inv.copy(v.group.matrix).invert(); v.inv3.setFromMatrix4(v.inv); v.nrm.getNormalMatrix(v.group.matrix);
        v.R = 0.64 * 1.733 * Math.max(o.s[0], o.s[1], o.s[2]); v.xver = o.xver;
        var mk = (o.cr ? 'c' : 'k') + (o.sk && (studio.skins.has(o.sk) || photoData(o.sk)) ? o.sk + ':' + o.fit : '');
        if (mk !== v.mk) { // crystal meshes carry see-through amounts, so rebuild on any change of look
          dropMat(v.mat);
          v.mk = mk; v.mat = shapeMaterial(o); o.w.markAllDirty();
        }
        if (v.mat.userData.skin) v.mat.userData.u.skinXf.value.fromArray(o.sx);
      }
      syncWorldMeshes(o.w, v.group, v.meshes, v.mat);
      v.group.visible = !ar.active || insidePlate(o.p[0], o.p[2]);
    });
  }

  // ---------- Hit testing ----------
  var _o = new THREE.Vector3(), _d = new THREE.Vector3(), _c = new THREE.Vector3();
  // A hit: where (x, y, z) and facing (n) in content space; l*: the same in the target's own space; ms: the target's scale.
  function terrainHit(x, y, z, nx, ny, nz, dist) { return { target: 'T', x: x, y: y, z: z, nx: nx, ny: ny, nz: nz, dist: dist, lx: x, ly: y, lz: z, lnx: nx, lny: ny, lnz: nz, ms: 1 }; }
  function hitTest(o, d, opts) {
    if (!ar.active) return hitTestRaw(o, d, opts);
    // AR: only the plate block exists. Clip the ray to it; its cut sides count as solid clay.
    var b = plateBox(), t0 = 0, t1 = opts && opts.max || 40, axes = [[o.x, d.x, b[0], b[3]], [o.y, d.y, b[1], b[4]], [o.z, d.z, b[2], b[5]]], enter = -1;
    for (var i = 0; i < 3; i++) {
      var a = axes[i];
      if (Math.abs(a[1]) < 1e-9) { if (a[0] < a[2] || a[0] > a[3]) return null; continue; }
      var ta = (a[2] - a[0]) / a[1], tb = (a[3] - a[0]) / a[1];
      if (ta > tb) { var tt = ta; ta = tb; tb = tt; }
      if (ta > t0) { t0 = ta; enter = i; } if (tb < t1) t1 = tb;
      if (t0 > t1) return null;
    }
    _c.copy(d).multiplyScalar(t0 + 1e-4).add(o);
    if (t0 > 0 && enter !== 1 && terrain.solidAt(_c.x, _c.y, _c.z)) {
      var n = [0, 0, 0]; n[enter] = d.getComponent(enter) > 0 ? -1 : 1;
      return terrainHit(_c.x, _c.y, _c.z, n[0], n[1], n[2], t0);
    }
    var h = hitTestRaw(_c.clone(), d, Object.assign({}, opts, { max: t1 - t0 }));
    if (h) h.dist += t0;
    return h;
  }
  var NO_OPTS = {};
  function hitTestRaw(o, d, opts) {
    opts = opts || NO_OPTS; var maxD = opts.max || Math.min(30 * (ar.active ? 1 : Math.max(1, state.pscale)), viewRadius() * CHUNK_M), best = null;
    if (!opts.objectsOnly) {
      var h = terrain.raycast(o.x, o.y, o.z, d.x, d.y, d.z, maxD);
      if (h) best = terrainHit(h.x, h.y, h.z, h.nx, h.ny, h.nz, h.dist);
    }
    for (var i = 0; i < viewList.length; i++) {
      var v = viewList[i], id = v.o.id;
      if ((opts.exclude && opts.exclude.has(id)) || !v.group.visible) continue;
      var cx = v.o.p[0] - o.x, cy = v.o.p[1] - o.y, cz = v.o.p[2] - o.z, tc = cx * d.x + cy * d.y + cz * d.z;
      if (cx * cx + cy * cy + cz * cz - tc * tc > v.R * v.R || tc + v.R < 0 || (best && tc - v.R > best.dist)) continue;
      _o.copy(o).applyMatrix4(v.inv); _d.copy(d).applyMatrix3(v.inv3);
      var len = _d.length(); if (!len) continue;
      var lh = v.o.w.raycast(_o.x, _o.y, _o.z, _d.x, _d.y, _d.z, maxD * len);
      if (!lh) continue;
      var t = lh.dist / len; if (best && t >= best.dist) continue;
      _c.set(lh.nx, lh.ny, lh.nz).applyMatrix3(v.nrm).normalize();
      best = { target: id, x: o.x + d.x * t, y: o.y + d.y * t, z: o.z + d.z * t, nx: _c.x, ny: _c.y, nz: _c.z, dist: t, lx: lh.x, ly: lh.y, lz: lh.z, lnx: lh.nx, lny: lh.ny, lnz: lh.nz, ms: Math.cbrt(v.o.s[0] * v.o.s[1] * v.o.s[2]) };
    }
    return best;
  }
  // Is there clay at content point (x, y, z)? Land first, then any shape whose bounds reach it.
  function solid(x, y, z) {
    if (terrain.solidAt(x, y, z)) return true;
    for (var i = 0; i < viewList.length; i++) {
      var v = viewList[i];
      var dx = x - v.o.p[0], dy = y - v.o.p[1], dz = z - v.o.p[2];
      if (dx * dx + dy * dy + dz * dz > v.R * v.R) continue;
      _o.set(x, y, z).applyMatrix4(v.inv);
      if (v.o.w.sampleWorld(_o.x, _o.y, _o.z) >= ClayEngine.ISO) return true;
    }
    return false;
  }

  // ---------- Player ----------
  var rig = new THREE.Group(); scene.add(rig);
  var camera = new THREE.PerspectiveCamera(70, 1, 0.03, 220);
  camera.position.set(0, EYE, 0); rig.add(camera);
  var pitch = -0.18, vy = 0, grounded = false;
  function spawn() {
    var sx = r3((Math.random() - 0.5) * 3);
    rig.position.set(sx, terrain.surfaceY(sx, 1.2) + 0.02, 1.2); rig.rotation.set(0, 0, 0); vy = 0;
    if (!renderer.xr.isPresenting) { pitch = -0.18; camera.rotation.set(pitch, 0, 0); }
  }
  spawn();
  var tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0);
  function headWorld(out) { if (walkBehind()) return out.set(rig.position.x, rig.position.y + EYE * state.pscale, rig.position.z); return out.setFromMatrixPosition(camera.matrixWorld); }
  function headYaw() { camera.getWorldDirection(tmpV); return Math.atan2(-tmpV.x, -tmpV.z); }
  // The lowest feet height between lo (feet in clay) and hi (feet clear), to under a millimetre.
  function settle(head, lo, hi) {
    for (var k = 0; k < 9; k++) { var mid = (lo + hi) / 2; if (solid(head.x, mid + 0.02, head.z)) lo = mid; else hi = mid; }
    return hi;
  }
  function bodyBlocked(x, z, feet, S) { return solid(x, feet + 0.65 * S, z) || solid(x, feet + 1.15 * S, z) || solid(x, feet + 1.55 * S, z); }
  function movePlayer(dt, mx, mz, my, jump, boost) {
    rig.updateMatrixWorld(true);
    var S = state.pscale, yaw = headYaw(), speed = (state.fly ? 4 : 3) * S * (boost || 1);
    var fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    var dx = (fx * mz + rx * mx) * speed * dt, dz = (fz * mz + rz * mx) * speed * dt;
    var head = headWorld(tmpV2), feet = rig.position.y;
    if (dx && !bodyBlocked(head.x + dx + Math.sign(dx) * 0.22 * S, head.z, feet, S)) rig.position.x += dx;
    if (dz && !bodyBlocked(head.x, head.z + dz + Math.sign(dz) * 0.22 * S, feet, S)) rig.position.z += dz;
    head = headWorld(tmpV2);
    if (state.fly) {
      vy = 0; var up = my * 3 * S * dt;
      if (up > 0 && solid(head.x, rig.position.y + 1.7 * S + up, head.z)) up = 0;
      rig.position.y = Math.min(rig.position.y + up, terrain.ny * V + 6 * S);
    } else {
      // Standing on the ground, gravity doesn't pull you into it. (It used to: you sank a few millimetres a frame and the
      // step-up below popped you back a whole step, a 4 cm shake several times a second that a headset makes very visible.)
      var stand = grounded && vy <= 0 && !jump;
      if (jump && grounded) vy = 5.2 * S;
      if (stand) {
        vy = 0;
        // Feet follow the ground: walking downhill you step down onto it each frame, rather than hovering and dropping
        // in jolts. More than a big step below, it's a ledge, and you fall.
        var lo = rig.position.y - 0.35 * S;
        if (solid(head.x, lo + 0.02, head.z)) rig.position.y = settle(head, lo, rig.position.y);
        else stand = false;
      }
      if (!stand) {
        vy -= 14 * S * dt;
        var ny = rig.position.y + vy * dt;
        if (vy > 0 && solid(head.x, ny + 1.7 * S, head.z)) { vy = 0; ny = rig.position.y; }
        rig.position.y = ny;
      }
    }
    grounded = false;
    var lifted = 0;
    var y0 = rig.position.y;
    var lift = V * 0.25 * Math.max(1, S);
    while (solid(head.x, rig.position.y + 0.02, head.z) && lifted < 0.9 * S) { rig.position.y += lift; lifted += lift; }
    // Still inside clay after a full step up: you're buried (say, a shape grown around you). Stay put rather than rocket upward.
    if (lifted > 0 && solid(head.x, rig.position.y + 0.02, head.z)) { rig.position.y = y0; lifted = 0; vy = 0; grounded = true; }
    // Out of the clay: settle onto its surface instead of floating up to a step above it.
    else if (lifted > 0) rig.position.y = settle(head, rig.position.y - lift, rig.position.y);
    if (lifted > 0 || solid(head.x, rig.position.y - 0.04 * S, head.z)) { if (vy < 0) vy = 0; grounded = true; }
    if (rig.position.y < -8) spawn();
  }

  // ---------- Networking glue ----------
  var net = null, netMode = 'solo', netCode = '', hosting = false;
  // The link server and TURN relay for rooms and the phone link come from js/config.js (see ClayMedia.peerOptions).
  function edit(op) { if (!canEdit()) return; studio.local(op); if (net) net.send(op); }
  var lastBlockMsg = 0;
  function canEdit() {
    var msg = null;
    if (net && !net.synced) msg = 'Joining the shared world…';
    else if (isTourist()) msg = touristWhy();
    if (!msg) return true;
    var now = performance.now(); if (now - lastBlockMsg > 2500) { toast(msg); lastBlockMsg = now; }
    return false;
  }
  // ---------- Tourist view: walk round and explore, no editing ----------
  // You're a tourist when you choose it, or when you visit someone's room and its owner (the host) lets visitors
  // explore only. The host enforces that too: it drops visitors' edits (see PeerTransport in net.js).
  function hostPresence() { return net && !hosting ? net.hostPresence() : null; }
  function visitorsMayBuild() { if (!net || hosting) return true; var h = hostPresence(); return !!(h && h.vb); }
  function isTourist() { return !!state.tour || !visitorsMayBuild(); }
  function touristWhy() { return !visitorsMayBuild() ? 'Tourist view: this world’s owner lets visitors explore, not build.' : 'Tourist view: look round and explore. Leave tourist view to build.'; }

  // ---------- Selection ----------
  var sel = new Set();
  var boxes = new Map();
  function setSelection(ids) { sel = new Set(ids); updateSheet(); }
  function pruneSel() { var ch = false; sel.forEach(function (id) { if (!studio.objects.has(id)) { sel.delete(id); ch = true; } }); if (ch) updateSheet(); }
  function selList() { return Array.from(sel).filter(function (id) { return studio.objects.has(id); }); }
  function selectFromHit(hit) {
    if (!hit || hit.target === 'T') { if (!state.multi) setSelection([]); return; }
    var ids = state.part ? [hit.target] : studio.membersOf(hit.target);
    if (state.multi) {
      var next = new Set(sel), allIn = ids.every(function (id) { return next.has(id); });
      ids.forEach(function (id) { if (allIn) next.delete(id); else next.add(id); });
      setSelection(Array.from(next));
    } else setSelection(ids);
    touchSound(hit.target);
  }
  function syncBoxes() {
    boxes.forEach(function (b, id) { if (!sel.has(id) || !objViews.has(id)) { scene.remove(b); b.geometry.dispose(); boxes.delete(id); } });
    sel.forEach(function (id) {
      var v = objViews.get(id); if (!v) return;
      var b = boxes.get(id);
      if (!b) { b = new THREE.BoxHelper(v.group, 0x8fc2b0); b.material.depthTest = false; b.material.transparent = true; b.material.opacity = 0.9; b.renderOrder = 5; scene.add(b); boxes.set(id, b); }
      var key = v.o.xver + ':' + v.o.w.version;
      if (ar.active || b.userData.key !== key) { b.update(); b.userData.key = key; }
    });
  }

  // ---------- Previews ----------
  function makePreview() {
    var g = new THREE.Group();
    var sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, depthWrite: false }));
    var box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }));
    var dot = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), new THREE.MeshBasicMaterial({ color: 0x13261f }));
    g.add(sphere, box, dot); g.visible = false; g.userData = { sphere: sphere, box: box, dot: dot };
    worldRoot.add(g); return g;
  }
  var _tc = new THREE.Color();
  function toolColor() { var t = TOOLS[state.tool]; return _tc.set(t.tint || PALETTE[state.color][1]); }
  function brickTarget(hit) { var o = BRICK * V * 0.5; return terrain.blockAt(hit.x + hit.nx * o, hit.y + hit.ny * o, hit.z + hit.nz * o, BRICK); }
  function handScale() { return ar.active ? 1 : state.pscale; }
  function brushR() { return state.size * handScale(); }
  function moldScale() { return clamp(brushR() * 2 / (OBJ_HALF * 2), 0.1, 40); }
  function showPreview(pv, hit) {
    if (!hit) { pv.visible = false; return; }
    var u = pv.userData, t = toolId(), col = toolColor();
    pv.visible = true; u.dot.position.set(hit.x, hit.y, hit.z); u.dot.scale.setScalar(ar.active ? Math.max(1, 0.006 / ar.scale / 0.025) : 1);
    u.box.visible = false; u.sphere.visible = false;
    if (t === 'brick') {
      var b = brickTarget(hit), c = terrain.blockCenter(b[0], b[1], b[2], BRICK), s = BRICK * V;
      u.box.visible = true; u.box.position.set(c[0], c[1], c[2]); u.box.scale.set(s, s, s); u.box.rotation.set(0, 0, 0); u.box.material.color.copy(col);
    } else if (t === 'mold') {
      var sc = moldScale() * OBJ_HALF, off = sc * 0.9;
      u.box.visible = true; u.box.position.set(hit.x + hit.nx * off, hit.y + hit.ny * off, hit.z + hit.nz * off);
      u.box.scale.set(sc * 2, sc * 2, sc * 2); u.box.rotation.set(0, headYaw(), 0); u.box.material.color.copy(col);
    } else if (t === 'paste') {
      if (clip) { var cb = clipBox(hit); u.box.visible = true; u.box.position.set(cb.c[0], cb.c[1], cb.c[2]); u.box.scale.set(cb.s[0], cb.s[1], cb.s[2]); u.box.rotation.set(0, 0, 0); u.box.material.color.set('#8fc2b0'); }
    } else if (t === 'select' || t === 'move' || t === 'erase' || t === 'pick' || t === 'skin' || t === 'board' || (t === 'recolor' && hit.target !== 'T')) {
      // dot only
    } else {
      var pr = t === 'coil' || t === 'pull' ? brushR() * 0.4 : t === 'slice' ? brushR() * 0.35 : t === 'recolor' ? brushR() * 2.5 : brushR();
      u.sphere.visible = true; u.sphere.position.set(hit.x, hit.y, hit.z); u.sphere.scale.setScalar(pr); u.sphere.material.color.copy(col);
    }
  }

  // ---------- Using tools ----------
  function args(arr) { return arr.map(r3); }
  var lastLandNote = 0;
  // The colour a tool lays on target g ('T' = the land). On a shape, Crystal also turns that piece to crystal.
  function colorOn(g) {
    if (state.color !== CRYSTAL) return state.color;
    if (g === 'T') {
      var now = performance.now(); if (now - lastLandNote > 4000) { lastLandNote = now; toast('The land stays clay, so Crystal paints it Porcelain. Use Crystal on shapes.'); }
      return PORCELAIN;
    }
    var o = studio.get(g); if (o && !o.cr) edit({ t: 'fin', ids: [g], cr: 1 });
    return CRYSTAL;
  }
  // Recolor shapes: a dye recolors (and tints crystal); Crystal makes them clear crystal.
  function recolorShapes(ids) {
    ids.forEach(function (id) { edit({ t: 'paint', id: id, c: state.color }); });
    if (state.color === CRYSTAL) { var off = ids.filter(function (id) { return !studio.get(id).cr; }); if (off.length) edit({ t: 'fin', ids: off, cr: 1 }); }
  }
  function applyTool(hit, s, now, haptic) {
    var t = toolId(), r = brushR();
    if (t === 'brick') {
      var b = brickTarget(hit), key = b.join(',');
      if (key === s.lastBrick || (s.brickLayer !== null && b[1] !== s.brickLayer) || (s.n && now - s.last < 120)) return false;
      edit({ t: 'b', g: 'T', f: 'block', a: [b[0], b[1], b[2], colorOn('T')] });
      s.brickLayer = b[1]; s.lastBrick = key; sound('brick');
    } else {
      if (s.n && now - s.last < (t === 'groove' ? 35 : 60)) return false;
      var px = hit.lx, py = hit.ly, pz = hit.lz, nx = hit.lnx, ny = hit.lny, nz = hit.lnz, rr = r / hit.ms, k = s.n ? 0.8 : 0.42, g = hit.target, op;
      if (t === 'build') op = { f: 'add', a: args([px - nx * rr * k, py - ny * rr * k, pz - nz * rr * k, rr]).concat(colorOn(g)) };
      else if (t === 'carve') op = { f: 'carve', a: args([px + nx * rr * k, py + ny * rr * k, pz + nz * rr * k, rr]) };
      else if (t === 'groove') {
        var prev = s.prev && s.target === g ? s.prev : [px, py, pz];
        op = { f: 'groove', a: args([prev[0], prev[1], prev[2], px, py, pz, rr * 0.35]) };
        s.prev = [px, py, pz]; s.target = g;
      } else if (t === 'flatten') {
        if (!s.plane || s.plane.g !== g) s.plane = { g: g, n: [nx, ny, nz], p: [px, py, pz] };
        var pl = s.plane, dd = (px - pl.p[0]) * pl.n[0] + (py - pl.p[1]) * pl.n[1] + (pz - pl.p[2]) * pl.n[2];
        op = { f: 'flat', a: args([px - pl.n[0] * dd, py - pl.n[1] * dd, pz - pl.n[2] * dd, pl.n[0], pl.n[1], pl.n[2], rr]) };
      } else if (t === 'smooth') op = { f: 'smooth', a: args([px, py, pz, rr]) };
      else if (t === 'glaze') op = { f: 'paint', a: args([px, py, pz, rr]).concat(colorOn(g)) };
      if (!op) return false;
      op.t = 'b'; op.g = g; edit(op); sound(t);
    }
    s.n++; s.last = now;
    if (haptic) haptic(t === 'brick' ? 0.6 : 0.18, t === 'brick' ? 40 : 14);
    return true;
  }
  // Snap: positions to a grid (one clay voxel, scaled with your hands) and turns to 15° steps.
  function snapGrid() { return 0.15 * handScale(); }
  function snapP(p) { if (!state.snap) return p; var G = snapGrid(); return p.map(function (v) { return Math.round(v / G) * G; }); }
  function snapA(a) { return state.snap ? Math.round(a / (Math.PI / 12)) * (Math.PI / 12) : a; }
  function placeMold(hit) {
    var sc = moldScale(), off = OBJ_HALF * sc * 0.9, id = uid('o');
    edit({ t: 'new', id: id, m: TOOLS[state.tool].mold, p: args(snapP([hit.x + hit.nx * off, hit.y + hit.ny * off, hit.z + hit.nz * off])), r: [0, r3(snapA(headYaw()))], s: [r3(sc), r3(sc), r3(sc)], c: state.color, cr: state.color === CRYSTAL ? 1 : 0, h: state.hollow ? 1 : 0 });
    setSelection([id]); sound('brick');
  }
  function localDir(id, v) { // a content-space direction in a shape's own space
    var w = objViews.get(id); if (!w) return v.slice();
    var x = new THREE.Vector3(v[0], v[1], v[2]).applyMatrix3(w.inv3).normalize(); return [x.x, x.y, x.z];
  }
  function oneShot(t, hit, d, haptic) {
    var r = brushR(), g = hit.target, onObj = g !== 'T';
    if (t === 'slice') { // cut a flat face toward you, like a wire through clay
      var n = onObj ? localDir(g, [-d.x, -d.y, -d.z]) : [-d.x, -d.y, -d.z], rr = r / hit.ms, depth = rr * 0.35;
      edit({ t: 'b', g: g, f: 'slice', a: args([hit.lx - n[0] * depth, hit.ly - n[1] * depth, hit.lz - n[2] * depth, n[0], n[1], n[2], onObj ? 10 : r * 2]) });
      sound('carve');
    } else if (t === 'erase') {
      if (onObj) { var ids = state.part ? [g] : studio.membersOf(g); edit({ t: 'del', ids: ids }); pruneSel(); sound('carve'); }
      else { edit({ t: 'b', g: 'T', f: 'carve', a: args([hit.x + hit.nx * r * 0.4, hit.y + hit.ny * r * 0.4, hit.z + hit.nz * r * 0.4, r]) }); sound('carve'); }
    } else if (t === 'recolor') {
      if (onObj) recolorShapes(state.part ? [g] : studio.membersOf(g));
      else edit({ t: 'b', g: 'T', f: 'paint', a: args([hit.x, hit.y, hit.z, r * 2.5]).concat(colorOn('T')) });
      sound('smooth');
    } else if (t === 'pick') {
      var w = onObj ? studio.get(g).w : terrain, gp = w.toGrid(hit.lx - hit.lnx * w.voxel * 0.6, hit.ly - hit.lny * w.voxel * 0.6, hit.lz - hit.lnz * w.voxel * 0.6);
      state.color = w.colorAt(Math.round(gp[0]), Math.round(gp[1]), Math.round(gp[2])) | 0;
      toast('Picked ' + PALETTE[state.color][0]); setTool(state.lastPaint); sound('tap');
    }
    if (haptic) haptic(0.4, 25);
  }
  // A "use" is one press of the trigger / mouse / finger. free: the input is a tracked controller,
  // so Coil can draw in mid-air at the controller's tip.
  // hit (optional): the pointer's hit this frame, if the caller already has it.
  function beginUse(o, d, now, haptic, free, hit) {
    var t = toolId();
    if (isTourist()) { // tourists can still play billboards
      if (hit === undefined) hit = hitTest(o, d);
      var tb = boardHit(o, d); if (tb && (!hit || tb.dist < hit.dist)) playBoard(tb.id); else canEdit();
      return null;
    }
    if (!canEdit()) return null;
    if (hit === undefined) hit = hitTest(o, d);
    var bh = boardHit(o, d); // billboards in front of everything else take the click
    if (bh && (!hit || bh.dist < hit.dist)) { boardClick(bh.id); return null; }
    if (t === 'board') { placeBillboard(hit, o, d); return null; }
    if (t === 'select') { if (state.board) pickBoard(null); selectFromHit(hit); sound('tap'); return null; }
    if (t === 'mold') { if (hit) placeMold(hit); return null; }
    if (t === 'paste') { if (hit) pasteAt(hit); return null; }
    if (t === 'skin') {
      if (hit && hit.target !== 'T') applySkin(state.part ? [hit.target] : studio.membersOf(hit.target), state.skin);
      else if (hit) landSkinAt(hit);
      return null;
    }
    if (t === 'slice' || t === 'erase' || t === 'recolor' || t === 'pick') { if (hit) { if (t !== 'pick') studio.begin(); oneShot(t, hit, d, haptic); if (t !== 'pick') studio.end(); } return null; }
    if (t === 'pull') {
      if (!hit) return null;
      studio.begin();
      return { kind: 'pull', g: hit.target, A: [hit.x, hit.y, hit.z], n: [hit.nx, hit.ny, hit.nz], la: [hit.lx, hit.ly, hit.lz], ln: [hit.lnx, hit.lny, hit.lnz], ms: hit.ms, lastT: 0, last: 0, haptic: haptic };
    }
    if (t === 'coil') { studio.begin(); var cu = { kind: 'coil', free: !!free, prev: null, last: 0, haptic: haptic }; updateUse(cu, o, d, now, hit); return cu; }
    if (t === 'move') {
      if (!hit || hit.target === 'T') return null;
      if (!sel.has(hit.target)) selectFromHit(hit);
      var u = { kind: 'move', p0: new Map(), g0: null };
      sel.forEach(function (id) { var x = studio.get(id); if (x) u.p0.set(id, x.p.slice()); });
      studio.begin(); updateUse(u, o, d, now); return u;
    }
    studio.begin();
    var s = { n: 0, last: 0, brickLayer: null, lastBrick: null, prev: null, target: null, plane: null };
    if (hit) applyTool(hit, s, now, haptic);
    return { kind: 'sculpt', s: s, haptic: haptic };
  }
  function updateUse(u, o, d, now, hit) {
    if (u.kind === 'pull') { // stretch clay out along the surface normal, following the pointer
      if (now - u.last < 50) return;
      var w0 = [u.A[0] - o.x, u.A[1] - o.y, u.A[2] - o.z], b = u.n[0] * d.x + u.n[1] * d.y + u.n[2] * d.z, den = 1 - b * b;
      if (den < 1e-3) return;
      var e = d.x * w0[0] + d.y * w0[1] + d.z * w0[2], dd = u.n[0] * w0[0] + u.n[1] * w0[1] + u.n[2] * w0[2];
      var t = clamp((b * e - dd) / den, 0, 3 * handScale()), rr = brushR() * 0.4 / u.ms;
      if (t < u.lastT + rr * 0.3 * u.ms) return;
      u.lastT = t; u.last = now; var lt = t / u.ms;
      edit({ t: 'b', g: u.g, f: 'coil', a: args([u.la[0] - u.ln[0] * rr * 0.6, u.la[1] - u.ln[1] * rr * 0.6, u.la[2] - u.ln[2] * rr * 0.6, u.la[0] + u.ln[0] * lt, u.la[1] + u.ln[1] * lt, u.la[2] + u.ln[2] * lt, rr]).concat(colorOn(u.g)) });
      sound('build'); if (u.haptic) u.haptic(0.15, 10);
      return;
    }
    if (u.kind === 'coil') { // a rope of clay: in mid-air from a controller, or laid along surfaces
      var rc = brushR() * 0.35, pt;
      if (u.free) { var reach = 0.35 * handScale(); pt = [o.x + d.x * reach, o.y + d.y * reach, o.z + d.z * reach]; }
      else { var hh = hit !== undefined ? hit : hitTest(o, d); if (!hh) return; pt = [hh.x + hh.nx * rc * 0.8, hh.y + hh.ny * rc * 0.8, hh.z + hh.nz * rc * 0.8]; }
      if (u.prev && Math.hypot(pt[0] - u.prev[0], pt[1] - u.prev[1], pt[2] - u.prev[2]) < rc * 0.5) return;
      var a0 = u.prev || pt;
      edit({ t: 'b', g: 'T', f: 'coil', a: args([a0[0], a0[1], a0[2], pt[0], pt[1], pt[2], rc]).concat(colorOn('T')) });
      u.prev = pt; if (now - u.last > 80) { sound('build'); u.last = now; if (u.haptic) u.haptic(0.12, 8); }
      return;
    }
    if (u.kind === 'move') {
      var g = hitTest(o, d, { exclude: sel });
      if (!g) return;
      if (!u.g0) { u.g0 = [g.x, g.y, g.z]; return; }
      var dl = snapP([g.x - u.g0[0], g.y - u.g0[1], g.z - u.g0[2]]), dx = dl[0], dy = dl[1], dz = dl[2], l = [];
      u.p0.forEach(function (p, id) { var x = studio.get(id); if (x) l.push([id, args([p[0] + dx, p[1] + dy, p[2] + dz]), x.r.slice(), x.s.slice()]); });
      if (l.length) edit({ t: 'xf', l: l });
      return;
    }
    if (hit === undefined) hit = hitTest(o, d);
    if (hit) applyTool(hit, u.s, now, u.haptic);
  }
  function endUse(u) { if (u) studio.end(); }

  // ---------- Clipboard: Copy, Group copy, Paste ----------
  // The clipboard holds whole shapes (sculpting, distortions and size level included), laid out around
  // their centre, and survives between sessions and worlds on this device.
  var LS_CLIP = 'kilnworks.clip.v1', clip = null;
  try { clip = JSON.parse(lsGet(LS_CLIP) || 'null'); if (clip && !Array.isArray(clip.items)) clip = null; } catch (e) { clip = null; }
  function clipLabel() { return clip ? (clip.group ? 'Group copy of ' : 'Copy of ') + clip.items.length + ' shape' + (clip.items.length > 1 ? 's' : '') : 'Clipboard empty'; }
  function copySel(group) {
    var ids = selList(); if (!ids.length) { toast('Select a shape first'); return; }
    if (group) { // the whole group(s) the selection belongs to
      var gids = new Set(), all = new Set(ids);
      ids.forEach(function (id) { var o = studio.get(id); if (o.gid) gids.add(o.gid); });
      studio.objects.forEach(function (o) { if (o.gid && gids.has(o.gid)) all.add(o.id); });
      ids = Array.from(all);
    }
    var c = center(ids), bottom = Infinity, ext = [0, 0, 0], skins = {}, sounds = {};
    var items = ids.map(function (id) {
      var o = studio.get(id), rel = [o.p[0] - c[0], o.p[1] - c[1], o.p[2] - c[2]], h = OBJ_HALF * Math.max(o.s[0], o.s[1], o.s[2]);
      bottom = Math.min(bottom, rel[1] - OBJ_HALF * o.s[1]);
      for (var i = 0; i < 3; i++) ext[i] = Math.max(ext[i], Math.abs(rel[i]) + h);
      if (o.sk && studio.skins.has(o.sk)) skins[o.sk] = studio.skins.get(o.sk);
      if (o.snd && studio.sounds.has(o.snd)) sounds[o.snd] = studio.sounds.get(o.snd);
      return { m: o.mold, rel: args(rel), r: o.r.slice(), s: o.s.slice(), g: group ? o.gid : null, cr: o.cr, sk: o.sk, fit: o.fit, sx: o.sx.slice(), snd: o.snd, sl: o.sl, w: o.w.encodeAll() };
    });
    clip = { items: items, group: !!group, bottom: r3(bottom), ext: args(ext), skins: skins, sounds: sounds };
    if (!lsSet(LS_CLIP, JSON.stringify(clip))) { /* too big to keep after closing; still works this session */ }
    sound('tap'); panel.dirty = true;
    toast((group ? 'Group copied: ' : 'Copied: ') + items.length + ' shape' + (items.length > 1 ? 's' : '') + '. Use Paste (Shapes) or Ctrl+V to place copies.');
  }
  function clipBox(hit) {
    var a = snapP([hit.x, hit.y, hit.z]), e = clip.ext, h = e[1] * 2;
    return { c: [a[0], a[1] + (-clip.bottom - e[1]) + e[1], a[2]], s: [e[0] * 2, h, e[2] * 2] };
  }
  // Paste the clipboard so it sits on the surface at the hit point. Each paste gets fresh shapes (and fresh groups).
  function pasteAt(hit) {
    if (!clip) { toast('Nothing copied yet. Select a shape and use Copy or Group copy.'); return; }
    if (!canEdit()) return;
    var a = snapP([hit.x, hit.y, hit.z]), gmap = {}, ids = [];
    var l = clip.items.map(function (it) {
      var gid = it.g ? (gmap[it.g] || (gmap[it.g] = uid('g'))) : null, id = uid('o'); ids.push(id);
      return { id: id, m: it.m, p: args([a[0] + it.rel[0], a[1] + it.rel[1] - clip.bottom, a[2] + it.rel[2]]), r: it.r.slice(), s: it.s.slice(), g: gid, cr: it.cr ? 1 : 0, sk: it.sk || null, fit: it.fit, sx: it.sx, snd: it.snd || null, sl: it.sl ? 1 : 0, w: it.w };
    });
    Object.keys(clip.skins || {}).forEach(function (id) { if (!studio.skins.has(id)) edit({ t: 'skin', id: id, d: clip.skins[id] }); });
    Object.keys(clip.sounds || {}).forEach(function (id) { if (!studio.sounds.has(id)) edit({ t: 'sound', id: id, d: clip.sounds[id] }); });
    edit({ t: 'put', l: l }); setSelection(ids); sound('brick');
    toast('Pasted ' + l.length + ' shape' + (l.length > 1 ? 's' : '') + (clip.group ? ' as a new group' : ''));
  }
  function pasteAhead() { // keyboard / button paste: where you're pointing, or in front of you
    rig.updateMatrixWorld(true);
    var ray = hover ? clientRay(hover.x, hover.y) : null, hit = ray ? hitTest(ray.origin, ray.direction) : null;
    if (!hit) { camera.getWorldDirection(tmpV); var hd = headWorld(new THREE.Vector3()); hit = hitTest(hd, tmpV.clone().normalize()); }
    if (!hit) { var h2 = headWorld(new THREE.Vector3()), yaw = headYaw(), dx = -Math.sin(yaw) * 2 * handScale(), dz = -Math.cos(yaw) * 2 * handScale(); hit = { x: h2.x + dx, y: terrain.surfaceY(h2.x + dx, h2.z + dz), z: h2.z + dz }; }
    pasteAt(hit);
  }

  // ---------- Photos for skins ----------
  // Recent photos stay on this device (any world can use them). A photo joins a world's skin library, and travels
  // to other players and into saves, the first time it is put on a shape there.
  var LS_PHOTOS = 'kilnworks.photos.v1', MAX_PHOTOS = 8, photos = [];
  try { photos = (JSON.parse(lsGet(LS_PHOTOS) || '[]') || []).filter(function (p) { return p && typeof p.id === 'string' && ClayStudio.Studio.okSkin(p.d); }).slice(0, MAX_PHOTOS); } catch (e) { photos = []; }
  function savePhotos() { while (!lsSet(LS_PHOTOS, JSON.stringify(photos)) && photos.length > 1) photos.pop(); }
  function photoData(id) { for (var i = 0; i < photos.length; i++) if (photos[i].id === id) return photos[i].d; return null; }
  // Any picture source → JPEG, longest side 512 px, small enough to share.
  function photoFrom(src, sw, sh) { return ClayMedia.fitImage(src, sw, sh, 512, 250000); }
  function addPhoto(d, what) {
    if (!ClayStudio.Studio.okSkin(d)) { toast('That picture could not be used.'); return null; }
    var id = uid('s'); photos.unshift({ id: id, d: d }); photos.length = Math.min(photos.length, MAX_PHOTOS); savePhotos();
    state.skin = id; savePrefs(); sound('brick');
    var ids = selList();
    if (ids.length) applySkin(ids, id);
    else toast(what + ' saved. Select shapes, or use the Skin tool, to put it on.');
    renderSkinUI(); panel.dirty = true;
    return id;
  }
  function inAction(fn) { if (studio.action) return fn(); studio.begin(); try { return fn(); } finally { studio.end(); } }
  function applySkin(ids, id) {
    if (!ids.length) { toast('Select a shape first'); return false; }
    var d = id && (studio.skins.get(id) || photoData(id));
    if (!d) { toast('Take or choose a photo first (Edit ▸ Skin, or the Skin page in VR).'); return false; }
    if (!canEdit()) return false;
    inAction(function () {
      if (!studio.skins.has(id)) edit({ t: 'skin', id: id, d: d });
      edit({ t: 'wear', ids: ids, sk: id, fit: state.fit });
    });
    sound('smooth'); updateSheet(); toast('Skin on ' + ids.length + ' shape' + (ids.length > 1 ? 's' : '') + ' (' + state.fit + ')');
    return true;
  }
  // ---- Land skins ----
  function landSkinUnder(hit) {
    var found = null;
    studio.decals.forEach(function (d) {
      var f = landFrame(d), dx = hit.x - d.c[0], dy = hit.y - d.c[1], dz = hit.z - d.c[2];
      if (Math.abs(dx * f.r[0] + dy * f.r[1] + dz * f.r[2]) <= f.w / 2 && Math.abs(dx * d.u[0] + dy * d.u[1] + dz * d.u[2]) <= f.h / 2
        && Math.abs(dx * d.n[0] + dy * d.n[1] + dz * d.n[2]) <= f.depth) found = d.id;
    });
    return found;
  }
  // Which way is "up" in a photo laid on a face with normal n: on the ground, away from you; on a wall, the sky.
  function photoUp(n) {
    if (Math.abs(n[1]) < 0.7) return [0, 1, 0];
    var yaw = headYaw() - (ar.active ? ar.yaw : 0); return [-Math.sin(yaw), 0, -Math.cos(yaw)];
  }
  function pickLandSkin(id) { state.landSkin = id; markLandSkin(); renderSkinUI(); panel.dirty = true; }
  function landSkinAt(hit) {
    var under = landSkinUnder(hit);
    if (under) { pickLandSkin(under); toast('Land skin picked. Move, turn or size it with the photo controls, or Remove skin.'); return; }
    var id = state.skin, data = id && (studio.skins.get(id) || photoData(id));
    if (!data) { toast('Take or choose a photo first (Edit ▸ Skin, or the Skin page in VR).'); return; }
    if (!canEdit()) return;
    var n = [hit.nx, hit.ny, hit.nz], img = skinImage(id), a = img && img.naturalWidth ? img.naturalHeight / img.naturalWidth : 0.75, did = uid('d');
    inAction(function () {
      if (!studio.skins.has(id)) edit({ t: 'skin', id: id, d: data });
      edit({ t: 'decal', d: { id: did, sk: id, c: args([hit.x, hit.y, hit.z]), n: args(n), u: args(photoUp(n)), s: r3(clamp(brushR() * 4, 0.3, 16)), a: r3(a) } });
    });
    pickLandSkin(did); sound('brick');
    toast('Photo laid on the land. Brush size sets how big new ones are.');
  }
  // ---- Photo position: move, turn and size the photo on the selected shapes, or the picked land skin ----
  var NUDGE = { left: [-1, 0, 0, 1], right: [1, 0, 0, 1], up: [0, 1, 0, 1], down: [0, -1, 0, 1], ccw: [0, 0, 1, 1], cw: [0, 0, -1, 1], bigger: [0, 0, 0, 1.25], smaller: [0, 0, 0, 0.8] };
  function skinTarget() {
    var ids = selList().filter(function (id) { return studio.get(id).sk; });
    if (ids.length) return { ids: ids };
    var d = state.landSkin && studio.decals.get(state.landSkin);
    return d ? { land: d } : null;
  }
  function skinTargetLabel() {
    var t = skinTarget();
    return !t ? 'Nothing to adjust: select a shape with a skin, or pick a land skin with the Skin tool'
      : t.land ? 'Adjusting the picked land skin' : 'Adjusting the photo on ' + t.ids.length + ' shape' + (t.ids.length > 1 ? 's' : '');
  }
  function movePhoto(how) {
    var t = skinTarget(), k = NUDGE[how], turn = Math.PI / 12;
    if (!t) { toast('Select a shape that wears a skin, or pick a land skin with the Skin tool.'); return; }
    if (!canEdit()) return;
    if (t.ids) inAction(function () {
      t.ids.forEach(function (id) {
        var x = how === 'reset' ? [0, 0, 0, 1] : studio.get(id).sx.slice();
        if (k) { x[0] += k[0] * 0.1; x[1] += k[1] * 0.1; x[2] += k[2] * turn; x[3] = clamp(x[3] * k[3], 0.05, 20); }
        edit({ t: 'skxf', ids: [id], x: x.map(sig) });
      });
    });
    else {
      var d = t.land, f = landFrame(d), c = d.c.slice(), u = d.u.slice(), sz = d.s, n = d.n;
      if (how === 'reset') u = photoUp(n);
      else if (k[2]) { var ca = Math.cos(k[2] * turn), sa = Math.sin(k[2] * turn), nu = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]]; u = u.map(function (v, i) { return v * ca + nu[i] * sa; }); }
      else if (k[3] !== 1) sz = clamp(sz * k[3], 0.1, 16);
      else c = c.map(function (v, i) { return v + (f.r[i] * k[0] * f.w + u[i] * k[1] * f.h) * 0.1; });
      edit({ t: 'decal', d: { id: d.id, sk: d.sk, c: args(c), n: n, u: args(u), s: r3(sz), a: d.a } });
    }
    sound('tap');
  }
  function removeSkin() {
    var worn = selList().filter(function (id) { return studio.get(id).sk; });
    if (!canEdit()) return;
    if (worn.length) { edit({ t: 'wear', ids: worn, sk: null }); toast('Skin removed'); }
    else if (state.landSkin && studio.decals.has(state.landSkin)) { edit({ t: 'undecal', id: state.landSkin }); state.landSkin = null; markLandSkin(); toast('Land skin removed'); }
    else toast('Nothing to remove: select a shape with a skin, or pick a land skin with the Skin tool.');
    renderSkinUI();
  }

  // Change the fit; selected shapes that wear a skin take it straight away.
  function setFit(fit) {
    if (!FIT_N.hasOwnProperty(fit)) return;
    state.fit = fit; savePrefs(); renderSkinUI(); panel.dirty = true;
    var bySkin = {};
    selList().forEach(function (id) { var o = studio.get(id); if (o.sk && o.fit !== fit) (bySkin[o.sk] = bySkin[o.sk] || []).push(id); });
    var keys = Object.keys(bySkin);
    if (keys.length && canEdit()) inAction(function () { keys.forEach(function (sk) { edit({ t: 'wear', ids: bySkin[sk], sk: sk, fit: fit }); }); });
    toast('Fit: ' + { wrap: 'across the front, mirrored round the back', around: 'once all the way round (360°)', box: 'one on each side', front: 'straight through the front' }[fit]);
  }
  // Choose a photo from the device (on phones this can also open the camera).
  $('#photoFile').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return;
    var url = URL.createObjectURL(f), img = new Image();
    img.onload = function () { addPhoto(photoFrom(img, img.naturalWidth, img.naturalHeight), 'Photo'); URL.revokeObjectURL(url); };
    img.onerror = function () { toast('That file isn’t a picture this device can read.'); URL.revokeObjectURL(url); };
    img.src = url;
  });
  // Camera: a live preview card on the flat screen.
  var cam = { stream: null, facing: 'environment' };
  function startStream() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return Promise.reject(new Error('no camera'));
    return navigator.mediaDevices.getUserMedia({ video: { facingMode: cam.facing, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
  }
  function stopStream() { if (cam.stream) cam.stream.getTracks().forEach(function (t) { t.stop(); }); cam.stream = null; }
  function openCamera() {
    ensureAudio();
    startStream().then(function (st) {
      cam.stream = st; var v = $('#camVideo'); v.srcObject = st; v.play().catch(function () { }); openCard('#camCard');
    }, function () { toast('No camera is available here. Use Choose photo, or take a Snapshot of the view.'); });
  }
  function closeCamera() { stopStream(); $('#camVideo').srcObject = null; $('#camCard').hidden = true; }
  $('#camSnap').addEventListener('click', function () {
    var v = $('#camVideo'); if (!v.videoWidth) { toast('The camera is still starting.'); return; }
    var d = photoFrom(v, v.videoWidth, v.videoHeight); closeCamera(); addPhoto(d, 'Photo');
  });
  $('#camFlip').addEventListener('click', function () { cam.facing = cam.facing === 'environment' ? 'user' : 'environment'; stopStream(); openCamera(); });
  $('#camCancel').addEventListener('click', closeCamera);
  // In the headset there is no preview card: start the camera, give it a moment to set its exposure, take the picture.
  function cameraPhotoQuick() {
    toast('Taking a camera photo…');
    startStream().then(function (st) {
      var v = document.createElement('video'); v.muted = true; v.playsInline = true; v.srcObject = st;
      v.play().then(function () { setTimeout(function () { var d = v.videoWidth ? photoFrom(v, v.videoWidth, v.videoHeight) : null; st.getTracks().forEach(function (t) { t.stop(); }); if (d) addPhoto(d, 'Camera photo'); else toast('The camera gave no picture.'); }, 800); });
    }, function () { toast('The headset camera isn’t available to the app here. Take camera photos on the flat screen (outside VR); they show up on this page.'); });
  }
  // Snapshot: a picture of what you're looking at, without pointers, previews or the wrist panel.
  var snapRT = null, SRGB = new Uint8Array(256);
  for (var si = 0; si < 256; si++) { var lv = si / 255; SRGB[si] = Math.round(255 * (lv <= 0.0031308 ? lv * 12.92 : 1.055 * Math.pow(lv, 1 / 2.4) - 0.055)); }
  function snapshotView() {
    var S = 512, shot = new THREE.PerspectiveCamera(60, 1, 0.03, 220), hidden = [], px = new Uint8Array(S * S * 4);
    snapRT = snapRT || new THREE.WebGLRenderTarget(S, S);
    camera.updateMatrixWorld(true); camera.matrixWorld.decompose(shot.position, shot.quaternion, tmpV); shot.updateMatrixWorld(true);
    [flatPreview, reticle, panel.mesh, navGroup].concat(selfAv ? [selfAv.g] : [], hands.map(function (h) { return h.model; }), hands.map(function (h) { return h.preview; }), Array.from(boxes.values()))
      .forEach(function (o) { if (o.visible) { hidden.push(o); o.visible = false; } });
    var prevRT = renderer.getRenderTarget(), xrOn = renderer.xr.enabled, bg = scene.background;
    if (!bg) scene.background = HORIZON; // AR: the room isn't in the picture, so give it a sky
    renderer.xr.enabled = false; renderer.setRenderTarget(snapRT); renderer.clear(); renderer.render(scene, shot);
    renderer.readRenderTargetPixels(snapRT, 0, 0, S, S, px);
    renderer.setRenderTarget(prevRT); renderer.xr.enabled = xrOn; scene.background = bg;
    hidden.forEach(function (o) { o.visible = true; });
    var c = document.createElement('canvas'); c.width = c.height = S;
    var g = c.getContext('2d'), im = g.createImageData(S, S);
    for (var y = 0; y < S; y++) for (var x = 0; x < S; x++) { // flip to top-down rows; the render is in linear light
      var a = ((S - 1 - y) * S + x) * 4, b = (y * S + x) * 4;
      im.data[b] = SRGB[px[a]]; im.data[b + 1] = SRGB[px[a + 1]]; im.data[b + 2] = SRGB[px[a + 2]]; im.data[b + 3] = 255;
    }
    g.putImageData(im, 0, 0); flashShot();
    return addPhoto(c.toDataURL('image/jpeg', 0.85), 'Snapshot');
  }
  function flashShot() { var f = $('#flash'); f.hidden = false; /* soft under reduced motion (CSS) */ f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); setTimeout(function () { f.hidden = true; }, 400); }
  var FITS_UI = [['wrap', 'Wrap', 'Wrap across the front, mirrored round the back'], ['around', '360°', 'Wrap once all the way round'], ['box', 'Box', 'One on each side'], ['front', 'Front', 'Straight through the front']];
  var MOVES_UI = [['left', '◀', 'Move photo left'], ['right', '▶', 'Move photo right'], ['up', '▲', 'Move photo up'], ['down', '▼', 'Move photo down'],
    ['ccw', '⟲', 'Turn photo left'], ['cw', '⟳', 'Turn photo right'], ['smaller', '−', 'Smaller photo'], ['bigger', '+', 'Bigger photo'], ['reset', 'Reset', 'Reset photo position']];
  // Flat-screen skin controls: the Skin page of the edit sheet, and the bar under the tray while the Skin tool is out.
  function renderSkinUI() {
    $$('.skin-ui').forEach(function (box) {
      if (!onShow(box)) return;
      var inSheet = box.dataset.where === 'sheet'; box.textContent = '';
      var take = elt('div', 'acts'), row = elt('div', 'thumbs');
      take.append(chip('Take photo', function () { runAct('photo:cam'); }), chip('Choose photo', function () { runAct('photo:file'); }), chip('Snapshot view', function () { runAct('photo:snap'); }), row);
      if (!photos.length) row.append(elt('small', 'muted', 'No photos yet. Take one, choose one, or snapshot what you see.'));
      photos.forEach(function (p, i) {
        var b = elt('button', 'thumb'); b.style.backgroundImage = 'url(' + p.d + ')'; b.setAttribute('aria-label', 'Photo ' + (i + 1)); b.setAttribute('aria-pressed', String(state.skin === p.id));
        b.addEventListener('click', function () { state.skin = p.id; savePrefs(); renderSkinUI(); panel.dirty = true; if (inSheet) applySkin(selList(), p.id); });
        row.append(b);
      });
      var fit = elt('div', 'acts');
      fit.append(elt('span', 'muted', 'Fit'));
      FITS_UI.forEach(function (f) { fit.append(chip(f[1], function () { runAct('fit:' + f[0]); }, { pressed: state.fit === f[0], label: f[2] })); });
      if (inSheet) fit.append(chip('Put on selection', function () { runAct('skin'); }));
      fit.append(chip('Remove skin', function () { runAct('unskin'); }));
      fit.append(elt('span', 'muted gap', 'Photo'));
      MOVES_UI.forEach(function (m) { fit.append(chip(m[1], function () { runAct('pos:' + m[0]); }, { label: m[2] })); });
      box.append(take, fit, elt('small', 'muted', skinTargetLabel()));
    });
    $('#skinBar').hidden = toolId() !== 'skin';
  }

  // ---------- Shape edits (buttons, keys, VR panel) ----------
  function center(ids) {
    var c = [0, 0, 0]; ids.forEach(function (id) { var o = studio.get(id); c[0] += o.p[0]; c[1] += o.p[1]; c[2] += o.p[2]; });
    return c.map(function (v) { return v / ids.length; });
  }
  function sig(v) { return +v.toPrecision(6); } // scales span 1/256 … 1,000,000, so keep significant digits
  function xform(ids, fn) {
    var l = ids.map(function (id) { var o = studio.get(id), p = o.p.slice(), r = o.r.slice(), s = o.s.slice(); fn(o, p, r, s); return [id, args(p), args(r), s.map(sig)]; });
    edit({ t: 'xf', l: l });
  }
  function scaleSel(ids, f, axis) {
    var c = center(ids), multi = ids.length > 1;
    xform(ids, function (o, p, r, s) {
      for (var i = 0; i < 3; i++) if (axis === undefined || axis === i) {
        s[i] = clamp(s[i] * f, MIN_S, MAX_S);
        if (multi) p[i] = c[i] + (p[i] - c[i]) * f;
      }
    });
  }
  // ---- Size levels ----
  function levelOfScale(s) { return Math.log2(Math.cbrt(s[0] * s[1] * s[2])) + LEVEL_BASE; } // fractional
  function levelOf(ids) { var o = studio.get(ids[0]); return o ? levelOfScale(o.s) : LEVEL_BASE; }
  function levelMeters(L) { return OBJ_HALF * 2 * Math.pow(2, L - LEVEL_BASE); }
  function fmtMeters(m) { return m < 1 ? (m * 100).toFixed(m < 0.1 ? 2 : 1) + ' cm' : m < 1000 ? m.toFixed(m < 10 ? 2 : 0) + ' m' : (m / 1000).toFixed(m < 10000 ? 2 : 0) + ' km'; }
  function levelLabel(ids) { var L = Math.round(levelOf(ids)); return 'Level ' + L + ' of ' + LEVELS + ' · ' + fmtMeters(levelMeters(L)); }
  // Put the selection exactly on level L (keeping its proportions; a group scales about its centre).
  function setLevel(ids, L) {
    L = clamp(Math.round(L), 1, LEVELS);
    var f = Math.pow(2, L - LEVEL_BASE) / Math.cbrt(studio.get(ids[0]).s.reduce(function (a, b) { return a * b; }, 1));
    if (Math.abs(f - 1) < 1e-6) return false;
    scaleSel(ids, f); return true;
  }
  function stepLevel(ids, d) {
    var cur = levelOf(ids), near = Math.round(cur), target = Math.abs(cur - near) < 0.05 ? near + d : (d > 0 ? Math.ceil(cur) : Math.floor(cur));
    if (target < 1 || target > LEVELS) { toast(target < 1 ? 'Already the smallest level (1)' : 'Already the largest level (25)'); return false; }
    return setLevel(ids, target);
  }
  function spinSel(ids, a) {
    var c = center(ids), ca = Math.cos(a), sa = Math.sin(a);
    xform(ids, function (o, p, r) {
      var x = p[0] - c[0], z = p[2] - c[2];
      p[0] = c[0] + x * ca + z * sa; p[2] = c[2] - x * sa + z * ca; r[1] += a;
    });
  }
  var WARP = { taper: 0.15, twist: 0.35, lean: 0.15, bulge: 0.15 };
  function runAct(name) {
    if (name === 'undo') return doUndo();
    if (name === 'done') return setSelection([]);
    if (name === 'part') { state.part = !state.part; updateSheet(); toast(state.part ? 'Tap a shape to pick one part of its group' : 'Taps pick whole groups'); return; }
    if (name === 'multi') { state.multi = !state.multi; updateSheet(); return; }
    if (name === 'clip') return copySel(false);
    if (name === 'gclip') return copySel(true);
    if (name === 'paste') return pasteAhead();
    if (name === 'photo:snap') return snapshotView();
    if (name === 'photo:cam') return renderer.xr.isPresenting ? cameraPhotoQuick() : openCamera();
    if (name === 'photo:file') return $('#photoFile').click();
    if (name.indexOf('fit:') === 0) return setFit(name.slice(4));
    if (name.indexOf('pos:') === 0) return movePhoto(name.slice(4));
    if (name === 'unskin') return removeSkin();
    if (name === 'skintool') { setTool(TOOLS.findIndex(function (t) { return t.id === 'skin'; })); return; }
    var ids = selList();
    if (!ids.length) { toast('Select a shape first'); return; }
    if (!canEdit()) return;
    var sign = name.slice(-1) === '+' ? 1 : -1, base = name.indexOf('level:') === 0 ? 'level' : name.replace(/[+-]$/, '');
    studio.begin();
    if (base === 'size') stepLevel(ids, sign);
    else if (name.indexOf('level:') === 0) setLevel(ids, +name.slice(6));
    else if (base === 'wide') scaleSel(ids, sign > 0 ? 1.1 : 1 / 1.1, 0);
    else if (base === 'tall') scaleSel(ids, sign > 0 ? 1.1 : 1 / 1.1, 1);
    else if (base === 'deep') scaleSel(ids, sign > 0 ? 1.1 : 1 / 1.1, 2);
    else if (WARP[base]) ids.forEach(function (id) { edit({ t: 'warp', id: id, k: base, a: WARP[base] * sign }); });
    else if (base === 'spin') spinSel(ids, sign * Math.PI / 12);
    else if (base === 'tilt') xform(ids, function (o, p, r) { r[0] = clamp(r[0] + sign * Math.PI / 12, -Math.PI / 2, Math.PI / 2); });
    else if (name === 'up' || name === 'down') xform(ids, function (o, p) { p[1] += name === 'up' ? 0.15 : -0.15; });
    else if (name === 'drop') {
      var gap = Infinity;
      ids.forEach(function (id) { var o = studio.get(id); gap = Math.min(gap, o.p[1] - OBJ_HALF * o.s[1] - terrain.surfaceY(o.p[0], o.p[2])); });
      if (isFinite(gap)) xform(ids, function (o, p) { p[1] -= gap; });
    } else if (name === 'recolor') recolorShapes(ids);
    else if (name === 'skin') applySkin(ids, state.skin);
    else if (name === 'crystal') { // finish toggle: keeps the colours, which become (or stop being) the tint
      var on = !allCrystal(ids); edit({ t: 'fin', ids: ids, cr: on ? 1 : 0 });
      toast(on ? 'Crystal: see-through, tinted by its colours. Glaze or Recolor with a dye to stain it.' : 'Back to clay');
    }
    else if (name === 'copy') {
      var gids = new Set(ids.map(function (id) { return studio.get(id).gid; })), gid = ids.length > 1 && gids.size === 1 && !gids.has(null) ? uid('g') : null;
      var yaw = headYaw(), off = 0.9 * Math.max.apply(null, ids.map(function (id) { return studio.get(id).s[0]; }));
      var l = ids.map(function (id) { var p = studio.get(id).p; return [id, uid('o'), args([p[0] + Math.cos(yaw) * off, p[1], p[2] - Math.sin(yaw) * off])]; });
      edit({ t: 'dup', l: l, gid: gid }); setSelection(l.map(function (e) { return e[1]; })); toast(l.length > 1 ? 'Copied ' + l.length + ' shapes' : 'Copied');
    } else if (name === 'group') {
      if (ids.length < 2) toast('Select two or more shapes to group. Turn on “Add more”, then tap them.');
      else { edit({ t: 'grp', gid: uid('g'), ids: ids }); state.multi = false; toast('Grouped ' + ids.length + ' shapes'); }
    } else if (name === 'ungroup') { edit({ t: 'grp', gid: null, ids: ids }); toast('Ungrouped'); }
    else if (name === 'delete') { edit({ t: 'del', ids: ids }); setSelection([]); }
    else if (name === 'flipx' || name === 'flipy') { // mirror left-right (across your view) or upside down
      var fc = center(ids), phi = headYaw(), rx = Math.cos(phi), rz = -Math.sin(phi);
      edit({ t: 'flip', ids: ids, ax: name === 'flipx' ? 'x' : 'y' });
      xform(ids, function (o, p, r) {
        if (name === 'flipx') { var k = 2 * ((p[0] - fc[0]) * rx + (p[2] - fc[2]) * rz); p[0] -= k * rx; p[2] -= k * rz; r[1] = 2 * phi - r[1]; }
        else { p[1] = 2 * fc[1] - p[1]; r[0] = -r[0]; }
      });
    }
    studio.end();
    sound('tap'); updateSheet();
  }
  function history(redo) {
    if (!canEdit()) return;
    var op = redo ? studio.redo() : studio.undo();
    if (op) { if (net) net.send(op); pruneSel(); updateSheet(); toast(redo ? 'Redone' : 'Undone'); } else toast(redo ? 'Nothing to redo' : 'Nothing to undo');
  }
  function doUndo() { history(false); }
  function doRedo() { history(true); }

  // Continuous resize from a joystick (touch stick or Quest sticks). Opens one undo step while held.
  var liveResize = false, levelReady = true, lastLevelStep = 0;
  function resizeLive(dt, sx, sy, ux, uy) {
    // sx/sy: width/height stretch rates; ux: spin rate; uy: push to step one size level up/down (all -1..1)
    var ids = selList();
    if (Math.abs(uy) < 0.3) levelReady = true;
    var active = ids.length && (Math.abs(sx) > 0.15 || Math.abs(sy) > 0.15 || Math.abs(ux) > 0.2 || Math.abs(uy) > 0.7);
    if (!active) { if (liveResize) { studio.end(); liveResize = false; } return; }
    if (!canEdit()) return;
    if (!liveResize) { studio.begin(); liveResize = true; }
    var now = performance.now();
    if (Math.abs(uy) > 0.7 && (levelReady || now - lastLevelStep > 380)) {
      levelReady = false; lastLevelStep = now;
      if (stepLevel(ids, uy > 0 ? 1 : -1)) { sound('tap'); toast(levelLabel(ids)); updateSheet(); }
    }
    var fw = Math.exp(sx * dt * 1.1), fh = Math.exp(sy * dt * 1.1), spin = ux * dt * 1.6;
    if (fw === 1 && fh === 1 && !spin) return;
    var c = center(ids), multi = ids.length > 1, ca = Math.cos(spin), sa = Math.sin(spin);
    xform(ids, function (o, p, r, s) {
      s[0] = clamp(s[0] * fw, MIN_S, MAX_S); s[1] = clamp(s[1] * fh, MIN_S, MAX_S);
      if (multi) { p[0] = c[0] + (p[0] - c[0]) * fw; p[1] = c[1] + (p[1] - c[1]) * fh; }
      if (spin) { var x = p[0] - c[0], z = p[2] - c[2]; p[0] = c[0] + x * ca + z * sa; p[2] = c[2] - x * sa + z * ca; r[1] += spin; }
    });
  }

  // ---------- Sound ----------
  var actx = null, noise = null, lastSound = 0;
  function ensureAudio() {
    if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      noise = actx.createBuffer(1, actx.sampleRate * 0.4, actx.sampleRate);
      var d = noise.getChannelData(0), b = 0;
      for (var i = 0; i < d.length; i++) { b = b * 0.6 + (Math.random() * 2 - 1) * 0.4; d[i] = b; }
      THREE.AudioContext.setContext(actx); listener = new THREE.AudioListener(); camera.add(listener); setVolume();
      updateAmbient();
    } catch (e) { actx = null; }
  }
  function sound(kind) {
    if (!actx || state.muted) return;
    var now = performance.now(); if (now - lastSound < 70) return; lastSound = now;
    var own = toolSound(kind); // a recording from your phone, if you've set one for this kind of tool
    if (own) { playBuffer(own, kind === 'tap' ? 0.45 : 0.75, 0.94 + Math.random() * 0.12); return; }
    var t = actx.currentTime, src = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
    src.buffer = noise; f.type = 'lowpass'; f.Q.value = 4;
    f.frequency.value = kind === 'carve' || kind === 'groove' ? 1900 : kind === 'brick' ? 420 : kind === 'tap' ? 2600 : kind === 'smooth' || kind === 'flatten' ? 1100 : 650 + Math.random() * 350;
    var peak = kind === 'brick' ? 0.55 : kind === 'tap' ? 0.12 : 0.2, len = kind === 'brick' ? 0.2 : 0.12;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(f); f.connect(g); g.connect(actx.destination);
    src.start(t, Math.random() * 0.2); src.stop(t + len + 0.02);
  }

  // ---------- Phone link, skies and sounds ----------
  // Your phone sends photos, 360° skies and sounds to the headset over the link. Skies and sounds are kept in this
  // device's media library (IndexedDB). A sound can go on shapes (played when touched, or looping softly nearby;
  // shared with the room and saved in the world), be a scene's background sound, or replace a tool's sound.
  var store = new ClayMedia.Store('endless-clay'), media = { skies: [], sounds: [] }, mediaLoaded = false;
  var SLOTS = [['build', 'Build'], ['carve', 'Carve'], ['smooth', 'Smooth'], ['brick', 'Brick'], ['tap', 'Tap']];
  var SLOT_OF = { carve: 'carve', groove: 'carve', slice: 'carve', smooth: 'smooth', flatten: 'smooth', glaze: 'smooth', brick: 'brick', tap: 'tap' };
  prefs.ambient = prefs.ambient && typeof prefs.ambient === 'object' ? prefs.ambient : {};
  prefs.toolSounds = prefs.toolSounds && typeof prefs.toolSounds === 'object' ? prefs.toolSounds : {};
  function loadMedia() {
    return store.all('media:').then(function (list) {
      list = list || [];
      media.skies = list.filter(function (m) { return m && m.kind === 'sky' && ClayMedia.okData('sky', m.data); });
      media.sounds = list.filter(function (m) { return m && m.kind === 'sound' && ClayMedia.okData('sound', m.data); });
    }, function () { });
  }
  function addMedia(rec) { (rec.kind === 'sky' ? media.skies : media.sounds).push(rec); store.set('media:' + rec.id, rec).catch(function () { toast('This device is out of room for media.'); }); renderMediaUI(); panel.dirty = true; }
  function removeMedia(rec) {
    var list = rec.kind === 'sky' ? media.skies : media.sounds, i = list.indexOf(rec); if (i < 0) return;
    list.splice(i, 1); store.del('media:' + rec.id);
    if (rec.kind === 'sky' && state.env === 'sky:' + rec.id) setEnv('Day');
    if (rec.kind === 'sound') {
      Object.keys(prefs.ambient).forEach(function (k) { if (prefs.ambient[k] === rec.id) delete prefs.ambient[k]; });
      Object.keys(prefs.toolSounds).forEach(function (k) { if (prefs.toolSounds[k] === rec.id) delete prefs.toolSounds[k]; });
      if (state.sound === rec.id) state.sound = null;
      savePrefs(); updateAmbient();
    }
    renderMediaUI(); panel.dirty = true;
  }
  function mediaSound(id) { for (var i = 0; i < media.sounds.length; i++) if (media.sounds[i].id === id) return media.sounds[i]; return null; }
  function soundName(id) { var m = mediaSound(id); return m ? m.name : id ? 'Sound from this world' : 'none'; }

  // ---- Playing sounds ----
  var listener = null, buffers = new Map(), decoder = null;
  function setVolume() { if (listener) listener.setMasterVolume(state.muted ? 0 : 1); }
  function soundData(id) { return studio.sounds.get(id) || (mediaSound(id) || {}).data || null; }
  // Decoded sound, or null while it decodes (it is ready a moment later) or if it can't be played.
  function bufferFor(id) {
    var b = buffers.get(id);
    if (b instanceof AudioBuffer) return b;
    if (!b) {
      var d = soundData(id); if (!d) return null;
      decoder = decoder || actx || new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 1, 44100);
      buffers.set(id, 'loading');
      ClayMedia.decodeSound(decoder, d).then(function (buf) { buffers.set(id, buf); }, function () { buffers.set(id, 'bad'); });
    }
    return null;
  }
  function playBuffer(buf, vol, rate) {
    if (!actx || state.muted || !buf) return;
    var src = actx.createBufferSource(), g = actx.createGain();
    src.buffer = buf; src.playbackRate.value = rate || 1; g.gain.value = vol; src.connect(g); g.connect(actx.destination); src.start();
  }
  function playSoundId(id, vol) {
    ensureAudio(); var b = bufferFor(id);
    if (b) playBuffer(b, vol); else setTimeout(function () { playBuffer(bufferFor(id), vol); }, 400);
  }
  function toolSound(kind) { var id = prefs.toolSounds[SLOT_OF[kind] || 'build']; return id ? bufferFor(id) : null; }
  // A scene's background sound: one quiet loop, faded in and out as the scene changes.
  var amb = { id: null, src: null, gain: null };
  function updateAmbient() {
    var want = actx && !state.muted ? prefs.ambient[state.env] || null : null;
    if (want === amb.id && (amb.src || !want)) return;
    if (amb.src) { var old = amb.src; amb.gain.gain.setTargetAtTime(0, actx.currentTime, 0.4); setTimeout(function () { try { old.stop(); } catch (e) { } }, 2500); }
    amb.id = want; amb.src = null;
    if (!want) return;
    var b = bufferFor(want);
    if (!b) { amb.id = null; if (buffers.get(want) === 'loading') setTimeout(updateAmbient, 400); return; }
    var src = actx.createBufferSource(), g = actx.createGain();
    src.buffer = b; src.loop = true; g.gain.value = 0; g.gain.setTargetAtTime(0.35, actx.currentTime, 0.6); src.connect(g); g.connect(actx.destination); src.start();
    amb.src = src; amb.gain = g;
  }
  // Shapes' sounds: touched ones play once; looping ones play from the shape itself, the six nearest to you.
  var lastTouch = new Map(), loops = new Map(), lastLoops = 0;
  function touchSound(id) {
    var o = studio.get(id), now = performance.now(); if (!o || !o.snd || o.sl) return;
    if (now - (lastTouch.get(id) || 0) < 700) return;
    lastTouch.set(id, now); playSoundId(o.snd, 0.9);
  }
  function soundShapeAt(p) { // a shape with a touch sound at content point p
    for (var i = 0; i < viewList.length; i++) {
      var v = viewList[i];
      if (!v.o.snd || v.o.sl || !v.group.visible) continue;
      var dx = p.x - v.o.p[0], dy = p.y - v.o.p[1], dz = p.z - v.o.p[2];
      if (dx * dx + dy * dy + dz * dz > v.R * v.R) continue;
      _o.copy(p).applyMatrix4(v.inv); if (v.o.w.sampleWorld(_o.x, _o.y, _o.z) >= ClayEngine.ISO) return v.o.id;
    }
    return null;
  }
  function stopLoop(id) { var l = loops.get(id); if (!l) return; try { l.a.stop(); } catch (e) { } if (l.a.parent) l.a.parent.remove(l.a); l.a.disconnect(); loops.delete(id); }
  function syncLoops(now) {
    if (!listener || now - lastLoops < 300) return; lastLoops = now;
    rig.updateMatrixWorld(true);
    var me = toContent(headWorld(_me.clone())), reach = 12 * Math.max(1, ar.active ? 1 : state.pscale), near = [];
    objViews.forEach(function (v, id) {
      if (!v.o.snd || !v.o.sl || !v.group.visible) return;
      var d = Math.hypot(v.o.p[0] - me.x, v.o.p[1] - me.y, v.o.p[2] - me.z); if (d < reach) near.push([d, id, v]);
    });
    near.sort(function (a, b) { return a[0] - b[0]; }); near = near.slice(0, 6);
    var keep = new Set(near.map(function (e) { return e[1]; }));
    loops.forEach(function (l, id) { var v = objViews.get(id); if (!keep.has(id) || !v || l.snd !== v.o.snd || l.group !== v.group) stopLoop(id); });
    near.forEach(function (e) {
      var v = e[2], o = v.o; if (loops.has(e[1]) || state.muted) return;
      var b = bufferFor(o.snd); if (!b) return;
      var a = new THREE.PositionalAudio(listener), size = Math.max(o.s[0], o.s[1], o.s[2]);
      a.setBuffer(b); a.setLoop(true); a.setRefDistance(1.2 * Math.max(1, size) * (ar.active ? ar.scale : 1)); a.setRolloffFactor(1.4); a.setVolume(0.7);
      v.group.add(a); a.play(); loops.set(e[1], { a: a, snd: o.snd, group: v.group });
    });
  }
  // Put a library sound on shapes (adding it to the world's sounds the first time).
  function soundOnShapes(ids, id, loop) {
    if (!ids.length) { toast('Select a shape first'); return; }
    var d = id && soundData(id);
    if (!d) { toast('Pick a sound first. Send sounds from your phone: the Phone side of the control panel.'); return; }
    if (!canEdit()) return;
    inAction(function () {
      if (!studio.sounds.has(id)) edit({ t: 'sound', id: id, d: d });
      edit({ t: 'voice', ids: ids, snd: id, loop: loop ? 1 : 0 });
    });
    if (!loop) playSoundId(id, 0.9);
    toast(soundName(id) + (loop ? ' loops softly from ' : ' plays when you touch ') + (ids.length > 1 ? ids.length + ' shapes' : 'the shape'));
    updateSheet();
  }
  function soundOffShapes(ids) {
    var w = ids.filter(function (id) { return studio.get(id).snd; });
    if (!w.length) { toast('No sound on this selection'); return; }
    if (canEdit()) { edit({ t: 'voice', ids: w, snd: null }); toast('Sound removed'); updateSheet(); }
  }
  function setSceneSound(id) {
    if (id) prefs.ambient[state.env] = id; else delete prefs.ambient[state.env];
    savePrefs(); ensureAudio(); updateAmbient(); renderMediaUI(); panel.dirty = true;
    toast(id ? soundName(id) + ' now plays in ' + envName(state.env) : 'No background sound in ' + envName(state.env));
  }
  function setToolSound(slot, id) {
    if (id) prefs.toolSounds[slot] = id; else delete prefs.toolSounds[slot];
    savePrefs(); renderMediaUI(); panel.dirty = true;
    var name = SLOTS.filter(function (x) { return x[0] === slot; })[0][1];
    toast(id ? name + ' tools now sound like ' + soundName(id) : name + ' tools use their clay sound again');
  }

  // ---- 360° skies ----
  var skyGradMat = sky.material, skyPhotoMat = new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false, depthWrite: false }), skyTexs = new Map();
  function skyRec(key) { if (!key || key.indexOf('sky:') !== 0) return null; for (var i = 0; i < media.skies.length; i++) if (media.skies[i].id === key.slice(4)) return media.skies[i]; return null; }
  function envKeys() { return ENV_ORDER.concat(media.skies.map(function (s) { return 'sky:' + s.id; })); }
  function envName(key) { var r = skyRec(key); return ENVS[key] ? key : r ? r.name : key && key.indexOf('sky:') === 0 ? 'Phone sky' : 'Day'; }
  function skyTexture(rec) {
    var t = skyTexs.get(rec.id); if (t) return t;
    var img = new Image(); t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping; t.repeat.x = -1; // seen from inside the sphere: flip so the photo isn't mirrored
    img.onload = function () { t.needsUpdate = true; }; img.src = rec.data; skyTexs.set(rec.id, t); return t;
  }

  // ---- The link ----
  var link = null;
  function linkCode() { if (!prefs.linkCode) { prefs.linkCode = ClayMedia.newCode(); savePrefs(); } return prefs.linkCode; }
  function phoneURL() { return new URL('phone.html', location.href).href.split('#')[0].split('?')[0] + '#' + linkCode(); }
  function startLink() {
    if (link) return;
    prefs.linkOn = true; savePrefs();
    var l = link = new ClayMedia.LinkHost({ code: linkCode(), server: null, onAsset: receiveAsset, library: phoneLibrary, onLibrary: phoneLibraryDo,
      onStatus: function () { renderMediaUI(); panel.dirty = true; },
      info: function () { return { name: state.name, scene: envName(state.env), slots: SLOTS.map(function (x) { return x[0]; }) }; } });
    l.state = 'starting'; renderMediaUI(); panel.dirty = true;
    ClayMedia.peerOptions().then(function (srv) { if (link === l) { l.o.server = srv; l.start(); } }); // TURN credentials first, if config.js names a source
  }
  // ---- The phone's view of this headset's library: list, rename, delete ----
  var libThumbs = new Map();
  function tinyThumb(key, src) { // a small picture for the phone's list, made once
    if (libThumbs.has(key)) return Promise.resolve(libThumbs.get(key));
    return ClayMedia.loadImage(src).then(function (img) { var t = ClayMedia.fitImage(img, img.naturalWidth, img.naturalHeight, 96, 12000); libThumbs.set(key, t); return t; }, function () { return ''; });
  }
  function phoneLibrary() {
    var jobs = [], pic = function (key, src, o) { jobs.push(tinyThumb(key, src).then(function (t) { o.thumb = t; })); return o; };
    var skies = media.skies.map(function (r) { return pic('k' + r.id, r.thumb || r.data, { id: r.id, name: r.name }); });
    var shots = photos.map(function (p) { return pic('p' + p.id, p.d, { id: p.id }); });
    return Promise.all(jobs).then(function () {
      return { owner: state.name, skies: skies, photos: shots, sounds: media.sounds.map(function (r) { return { id: r.id, name: r.name, dur: r.dur || 0 }; }),
        links: prefs.links.map(function (l) { var i = ClayMedia.parseSocial(l.url); return { id: l.id, plat: i.plat || '', label: i.ok ? i.label + (i.who ? ' · ' + i.who : '') : l.url }; }) };
    });
  }
  function phoneLibraryDo(a) {
    if (a.kind === 'sky' || a.kind === 'sound') {
      var rec = (a.kind === 'sky' ? media.skies : media.sounds).filter(function (r) { return r.id === a.id; })[0]; if (!rec) return;
      if (a.op === 'rename' && a.name) { rec.name = a.name; store.set('media:' + rec.id, rec).catch(function () { }); renderMediaUI(); updateHud(); panel.dirty = true; }
      else if (a.op === 'del') removeMedia(rec);
    } else if (a.op === 'del' && a.kind === 'link') removeLink(a.id);
    else if (a.op === 'del' && a.kind === 'photo') removePhoto(a.id);
  }
  function removePhoto(id) {
    photos = photos.filter(function (p) { return p.id !== id; }); savePhotos(); libThumbs.delete('p' + id);
    if (state.skin === id) { state.skin = photos.length ? photos[0].id : null; savePrefs(); } // skins already in the world stay
    renderSkinUI(); renderMediaUI(); panel.dirty = true;
  }
  function stopLink() { if (link) link.stop(); link = null; prefs.linkOn = false; savePrefs(); renderMediaUI(); panel.dirty = true; }
  function newLinkCode() { var on = !!link; if (link) link.stop(); link = null; prefs.linkCode = ClayMedia.newCode(); savePrefs(); if (on) startLink(); renderMediaUI(); panel.dirty = true; }
  function linkStatus() {
    if (!link) return 'Off';
    return { starting: 'Starting…', waiting: 'Waiting for your phone', linked: 'Linked: ' + (link.names().join(', ') || 'phone'), error: link.error, off: 'Off' }[link.state] || link.state;
  }
  // Something arrived from the phone. Returns a promise of { ok, msg } for the phone to show.
  function receiveAsset(a) {
    if (a.kind === 'link') return Promise.resolve(addLink(a.data, true)).then(function (r) { if (r.ok) toast('New link from your phone: ' + ClayMedia.parseSocial(a.data).label); return r; });
    if (a.kind === 'photo') return ClayMedia.loadImage(a.data).then(function (img) {
      // Phones send photos at the size kept here (512 px): take those as they are rather than compressing them again.
      var fits = img.naturalWidth <= 512 && img.naturalHeight <= 512 && a.data.length <= 250000 && ClayStudio.Studio.okSkin(a.data);
      var had = selList().length; addPhoto(fits ? a.data : photoFrom(img, img.naturalWidth, img.naturalHeight), 'Photo from your phone');
      return { ok: true, msg: had ? 'Added to your photos and put on the selected shapes' : 'Added to your photos (Skin)' };
    });
    if (a.kind === 'sky') return ClayMedia.loadImage(a.data).then(function (img) {
      var rec = { id: uid('k'), kind: 'sky', name: a.name || 'Phone sky ' + (media.skies.length + 1), data: a.data, colors: ClayMedia.skyColors(img),
        thumb: ClayMedia.fitImage(img, img.naturalWidth, img.naturalHeight, 256, 60000) };
      addMedia(rec); setEnv('sky:' + rec.id); toast('New sky from your phone: ' + rec.name);
      return { ok: true, msg: 'It’s the sky now. Pick it any time in Sounds & Images ▸ Scenes.' };
    });
    return ClayMedia.decodeSound(decoder = decoder || actx || new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 1, 44100), a.data).then(function (buf) {
      if (buf.duration > 60.5) return { ok: false, msg: 'That sound is too long. Keep it under a minute.' };
      var rec = { id: uid('a'), kind: 'sound', name: a.name || 'Phone sound ' + (media.sounds.length + 1), data: a.data, dur: Math.round(buf.duration * 10) / 10 };
      buffers.set(rec.id, buf); addMedia(rec); state.sound = rec.id;
      var use = a.use || '', msg = 'In your sounds. Put it on shapes from the Sound tab.';
      if (use === 'ambient') { setSceneSound(rec.id); msg = 'Playing as the background sound of ' + envName(state.env); }
      else if (use.indexOf('tool:') === 0 && SLOTS.some(function (x) { return x[0] === use.slice(5); })) { setToolSound(use.slice(5), rec.id); msg = 'Now the ' + use.slice(5) + ' tool sound'; }
      else if (selList().length) { soundOnShapes(selList(), rec.id, state.soundLoop); msg = 'Put on your selected shapes'; }
      else toast('New sound from your phone: ' + rec.name);
      return { ok: true, msg: msg };
    }, function () { return { ok: false, msg: 'The headset can’t play that sound file.' }; });
  }
  // Add skies and sounds from files on this device too.
  $('#skyFile').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return;
    var url = URL.createObjectURL(f);
    ClayMedia.loadImage(url).then(function (img) { var sk = ClayMedia.toSky(img, true); URL.revokeObjectURL(url); return receiveAsset({ kind: 'sky', name: f.name.replace(/\.[^.]+$/, '').slice(0, 40), data: sk.data }); })
      .catch(function () { toast('That file isn’t a picture this device can read.'); });
  });
  $('#soundFile').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return;
    ClayMedia.blobToData(f).then(function (d) {
      if (!ClayMedia.okData('sound', d)) { toast('Pick a sound file under 3 MB.'); return; }
      return receiveAsset({ kind: 'sound', name: f.name.replace(/\.[^.]+$/, '').slice(0, 40), data: d }).then(function (r) { if (!r.ok) toast(r.msg); });
    });
  });

  // ---- Screens: Phone, Sounds & Images, and the Sound page of the edit sheet ----
  function drawQR(canvas, text) {
    var g = canvas.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, canvas.width, canvas.height);
    if (!window.qrcode) return;
    var qr = window.qrcode(0, 'M'); qr.addData(text); qr.make();
    var n = qr.getModuleCount(), cell = Math.floor(canvas.width / (n + 8)), off = Math.floor((canvas.width - cell * n) / 2);
    g.fillStyle = '#231a16';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (qr.isDark(r, c)) g.fillRect(off + c * cell, off + r * cell, cell, cell);
  }
  function fmtDur(s) { return s >= 60 ? Math.floor(s / 60) + ':' + ('0' + Math.round(s % 60)).slice(-2) : (Math.round(s * 10) / 10) + ' s'; }
  function onShow(el) { return !!el && !el.closest('[hidden]'); }
  function renderMediaUI() { if (onShow($('#phoneUi'))) renderPhoneUI(); if (onShow($('#libUi'))) renderLibraryUI(); if (onShow($('#soundUi'))) renderSoundUI(); }
  // Phone: the link to the phone app (code, QR code, address, on/off).
  function renderPhoneUI() {
    var body = $('#phoneUi'); if (!body) return; body.textContent = '';
    var sec = elt('div', 'm-sec m-link'), qr = document.createElement('canvas'); qr.width = qr.height = 180; qr.className = 'qr';
    drawQR(qr, phoneURL());
    var info = elt('div', 'm-info'), url = phoneURL();
    info.append(elt('h2', '', 'Link your phone'), elt('p', 'muted', 'Scan the code with your phone (or open the address below) to open the Endless Clay Link app. It sends photos, 360° skies, sounds and social links straight into this world.'),
      elt('div', 'big-code', linkCode()), elt('p', 'status', linkStatus()), elt('small', 'url muted', url));
    var acts = elt('div', 'acts'), open = document.createElement('a');
    open.className = 'chip'; open.href = url; open.target = '_blank'; open.rel = 'noopener'; open.textContent = 'Open the phone app';
    acts.append(link ? chip('Turn link off', stopLink) : chip('Turn link on', startLink, { primary: true }), chip('New code', newLinkCode), open);
    if (navigator.clipboard && navigator.clipboard.writeText) acts.append(chip('Copy address', function () { navigator.clipboard.writeText(url).then(function () { toast('Address copied'); }); }));
    info.append(acts); sec.append(qr, info); body.append(sec);
    body.append(elt('p', 'muted', 'From your phone so far: ' + media.skies.length + ' skies · ' + media.sounds.length + ' sounds · ' + photos.length + ' photos · ' + prefs.links.length + ' links'));
  }
  // Sounds & Images: 360° skies and your sounds (photo skins are shown above these).
  function renderLibraryUI() {
    var body = $('#libUi'); if (!body) return; body.textContent = '';
    var sk = elt('div', 'm-sec'); sk.append(elt('h2', '', 'Skies'));
    var grid = elt('div', 'm-skies');
    media.skies.forEach(function (r) {
      var b = elt('button', 'm-sky'); b.style.backgroundImage = 'url(' + r.thumb + ')'; b.setAttribute('aria-pressed', String(state.env === 'sky:' + r.id));
      b.append(elt('span', '', r.name)); b.addEventListener('click', function () { setEnv('sky:' + r.id); });
      var w = elt('div', 'm-skyw'); w.append(b, chip('×', function () { removeMedia(r); }, { label: 'Delete sky ' + r.name })); grid.append(w);
    });
    if (!media.skies.length) grid.append(elt('small', 'muted', 'No skies yet. Send a 360° photo from your phone.'));
    sk.append(grid, chip('Add a 360° photo from this device', function () { $('#skyFile').click(); })); body.append(sk);
    var so = elt('div', 'm-sec'); so.append(elt('h2', '', 'Sounds'));
    so.append(elt('p', 'muted', 'Scene sound for ' + envName(state.env) + ': ' + soundName(prefs.ambient[state.env] || null) + '. Put sounds on shapes from a selection’s Sound tab.'));
    media.sounds.forEach(function (r) {
      var row = elt('div', 'm-row'), slot = document.createElement('select');
      slot.setAttribute('aria-label', 'Use ' + r.name + ' as a tool sound');
      slot.append(new Option('Tool sound…', ''));
      SLOTS.forEach(function (x) { slot.append(new Option(x[1] + (prefs.toolSounds[x[0]] === r.id ? ' ✓' : ''), x[0])); });
      slot.addEventListener('change', function () { if (slot.value) setToolSound(slot.value, prefs.toolSounds[slot.value] === r.id ? null : r.id); });
      row.append(chip('▶', function () { playSoundId(r.id, 0.9); }, { label: 'Play ' + r.name }), elt('span', 'm-name', r.name), elt('small', 'muted', fmtDur(r.dur || 0)),
        chip('On selection', function () { soundOnShapes(selList(), r.id, state.soundLoop); }),
        chip(prefs.ambient[state.env] === r.id ? 'Scene sound ✓' : 'Scene sound', function () { setSceneSound(prefs.ambient[state.env] === r.id ? null : r.id); }),
        slot, chip('×', function () { removeMedia(r); }, { label: 'Delete sound ' + r.name }));
      so.append(row);
    });
    if (!media.sounds.length) so.append(elt('small', 'muted', 'No sounds yet. Record some on your phone.'));
    var tools = SLOTS.filter(function (x) { return prefs.toolSounds[x[0]]; }).map(function (x) { return x[1] + ': ' + soundName(prefs.toolSounds[x[0]]); });
    if (tools.length) so.append(elt('p', 'muted', 'Tool sounds · ' + tools.join(' · ')));
    so.append(chip('Add a sound file from this device', function () { $('#soundFile').click(); }));
    body.append(so);
  }
  // Edit sheet ▸ Sound: put one of your sounds on the selected shapes.
  function renderSoundUI() {
    var box = $('#soundUi'); if (!box) return; box.textContent = '';
    var row = elt('div', 'acts');
    if (!media.sounds.length) row.append(elt('small', 'muted', 'No sounds yet. Send some from your phone (the Phone side of the control panel).'));
    media.sounds.forEach(function (r) { row.append(chip(r.name, function () { state.sound = r.id; playSoundId(r.id, 0.9); renderSoundUI(); }, { pressed: state.sound === r.id })); });
    var how = elt('div', 'acts');
    how.append(elt('span', 'muted', 'Plays'), chip('When touched', function () { state.soundLoop = false; renderSoundUI(); }, { pressed: !state.soundLoop }),
      chip('Loops nearby', function () { state.soundLoop = true; renderSoundUI(); }, { pressed: state.soundLoop }),
      chip('Put on selection', function () { soundOnShapes(selList(), state.sound, state.soundLoop); }), chip('Remove sound', function () { soundOffShapes(selList()); }));
    var on = selList().map(function (id) { return studio.get(id); }).filter(function (o) { return o && o.snd; });
    box.append(row, how, elt('small', 'muted', on.length ? on.length + ' selected shape' + (on.length > 1 ? 's have' : ' has') + ' a sound (' + soundName(on[0].snd) + (on[0].sl ? ', looping' : ', on touch') + ')' : 'The selection has no sound.'));
  }
  $('#mediaBtn').addEventListener('click', function () { closeMenu(); setPanelsOff(false); showFlatCat('phone'); ensureAudio(); });

  // ---------- Flat control panel: four categories, and hiding it ----------
  function showFlatCat(cat) {
    var tray = $('#tray .tray-inner'), cur = prefs.cat || 'create';
    var swap = function () {
      $$('[data-cat]').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.cat === cat)); });
      $$('[data-catbody]').forEach(function (b) { b.hidden = b.dataset.catbody !== cat; });
      prefs.cat = cat; savePrefs(); renderMediaUI(); renderLinksUI(); renderSkinUI(); queueMeasure();
    };
    if (cat === cur || !tray || motionReduced()) { swap(); return; }
    tray.classList.remove('turning'); void tray.offsetWidth; tray.classList.add('turning'); setTimeout(swap, 150);
    setTimeout(function () { tray.classList.remove('turning'); }, 320);
  }
  $$('[data-cat]').forEach(function (b) { b.addEventListener('click', function () { showFlatCat(b.dataset.cat); }); });
  function setPanelsOff(off) { document.body.classList.toggle('panels-off', off); $('#showPanels').hidden = !off; queueMeasure(); }
  $('#hidePanels').addEventListener('click', function () { setPanelsOff(true); toast('Panels hidden. Press I (or Show panels) to bring them back.'); });
  $('#showPanels').addEventListener('click', function () { setPanelsOff(false); });
  $$('[data-cast]').forEach(function (b) { b.addEventListener('click', function () { setCast(b.dataset.cast === 'hollow'); }); });

  // ---------- Billboard links: framed windows on social posts, placed in the world ----------
  // A billboard shows its post live wherever the page is flat (computer, phone, or the Quest's 2D window): the
  // platform's own player sits exactly in the frame. Inside VR the headset can't show web pages in the 3D scene, so
  // the frame shows a preview card, and clicking it steps out of VR to watch.
  var SHAPES_BB = { wide: [1.6, 0.9], tall: [0.9, 1.6], post: [1.0, 1.25], square: [1.1, 1.1] }, PX = 640;
  var PLAT_COLOR = { youtube: '#c4302b', instagram: '#b13a8c', facebook: '#1877f2', tiktok: '#161616', threads: '#1c1c1c', snapchat: '#f7e300' };
  prefs.links = Array.isArray(prefs.links) ? prefs.links.filter(function (l) { return l && typeof l.id === 'string' && ClayMedia.parseSocial(l.url).ok; }).slice(0, 40) : [];
  state.link = prefs.link && prefs.links.some(function (l) { return l.id === prefs.link; }) ? prefs.link : prefs.links.length ? prefs.links[0].id : null;
  state.board = null; state.bbMode = prefs.bbMode === 'auto' ? 'auto' : 'click'; state.bbFix = prefs.bbFix === 'space' ? 'space' : 'shape';
  function linkRec(id) { for (var i = 0; i < prefs.links.length; i++) if (prefs.links[i].id === id) return prefs.links[i]; return null; }
  function addLink(url, quiet) {
    var info = ClayMedia.parseSocial(url);
    if (!info.ok) { if (!quiet) toast(info.msg); return { ok: false, msg: info.msg }; }
    var had = prefs.links.filter(function (l) { return l.url === info.url; })[0];
    if (!had) { had = { id: uid('l'), url: info.url }; prefs.links.unshift(had); prefs.links.length = Math.min(prefs.links.length, 40); }
    state.link = had.id; prefs.link = had.id; savePrefs(); renderLinksUI(); panel.dirty = true;
    if (!quiet) toast(info.label + ' added. Choose Place, then point where it should go.');
    return { ok: true, msg: info.label + ' is in Social links. Place it from there.' };
  }
  function removeLink(id) { prefs.links = prefs.links.filter(function (l) { return l.id !== id; }); if (state.link === id) state.link = prefs.links.length ? prefs.links[0].id : null; prefs.link = state.link; savePrefs(); renderLinksUI(); panel.dirty = true; }
  function boardTool() { return TOOLS.findIndex(function (t) { return t.id === 'board'; }); }

  // ---- Views ----
  var boardViews = new Map(), seenBoardVer = -1, bbQ = new THREE.Quaternion(), bbM = new THREE.Matrix4(), bbS = new THREE.Vector3(1, 1, 1);
  var frameMat = new THREE.MeshLambertMaterial({ color: 0x4a3328 }), frameSel = new THREE.MeshLambertMaterial({ color: 0x8fc2b0 });
  function boardInfo(rec) { var i = ClayMedia.parseSocial(rec.url); return i.ok ? i : { ok: false, plat: 'youtube', name: 'Link', label: 'Link', who: '', shape: 'wide', embed: function () { return rec.url; } }; }
  function makeBoardView(rec) {
    var v = { rec: null, info: boardInfo(rec), group: new THREE.Group(), canvas: document.createElement('canvas'), live: null, thumb: null };
    v.tex = new THREE.CanvasTexture(v.canvas); v.tex.colorSpace = THREE.SRGBColorSpace;
    v.screen = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: v.tex, toneMapped: false }));
    v.frame = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), frameMat);
    v.group.add(v.frame, v.screen); worldRoot.add(v.group);
    if (v.info.thumb) { // a preview picture where the platform offers one
      var img = new Image(); img.crossOrigin = 'anonymous'; img.onload = function () { v.thumb = img; drawCard(v); }; img.src = v.info.thumb;
    }
    return v;
  }
  function sizeBoard(v) {
    var r = v.rec, b = 0.05;
    v.screen.scale.set(r.w, r.h, 1); v.screen.position.z = 0.026;
    v.frame.scale.set(r.w + 2 * b, r.h + 2 * b, 0.05);
    v.canvas.width = 512; v.canvas.height = Math.round(512 * r.h / r.w); drawCard(v);
  }
  // The preview card: platform colour, the post's preview picture if any, what it is, and how it plays.
  function drawCard(v) {
    var c = v.canvas, g = c.getContext('2d'), W = c.width, H = c.height, i = v.info, col = PLAT_COLOR[i.plat] || '#333', F = '"Bricolage Grotesque", system-ui, sans-serif';
    g.fillStyle = col; g.fillRect(0, 0, W, H);
    if (v.thumb) { var k = Math.max(W / v.thumb.naturalWidth, H / v.thumb.naturalHeight), tw = v.thumb.naturalWidth * k, th = v.thumb.naturalHeight * k; g.drawImage(v.thumb, (W - tw) / 2, (H - th) / 2, tw, th); }
    var grad = g.createLinearGradient(0, H * 0.45, 0, H); grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.75)'); g.fillStyle = grad; g.fillRect(0, 0, W, H);
    var dark = i.plat === 'snapchat' && !v.thumb, ink = dark ? '#111' : '#fff';
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.beginPath(); g.arc(W / 2, H / 2, Math.min(W, H) * 0.13, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; var t = Math.min(W, H) * 0.06; g.beginPath(); g.moveTo(W / 2 - t * 0.7, H / 2 - t); g.lineTo(W / 2 - t * 0.7, H / 2 + t); g.lineTo(W / 2 + t * 1.1, H / 2); g.closePath(); g.fill();
    g.textBaseline = 'top'; g.fillStyle = 'rgba(0,0,0,0.55)'; g.font = '700 26px ' + F; var pw = g.measureText(i.name).width + 28; g.fillRect(16, 16, pw, 40);
    g.fillStyle = '#fff'; g.fillText(i.name, 30, 23);
    g.fillStyle = dark ? '#111' : ink; g.textBaseline = 'alphabetic'; g.font = '700 28px ' + F; g.fillText(i.label, 20, H - 56, W - 40);
    g.font = '500 22px ' + F; g.globalAlpha = 0.85;
    g.fillText((i.who ? i.who + ' · ' : '') + (renderer.xr.isPresenting ? 'Click to watch (leaves VR)' : v.rec.mode === 'auto' ? 'Plays when you come near' : 'Click to play'), 20, H - 22, W - 40);
    g.globalAlpha = 1; v.tex.needsUpdate = true;
  }
  // Where a billboard is now, in content space (attached ones follow their shape). Returns false if it can't show.
  function boardPose(v, pos, quat) {
    var r = v.rec;
    if (!r.at) { pos.fromArray(r.p); quat.fromArray(r.q); return true; }
    var ov = objViews.get(r.at); if (!ov) return false;
    pos.fromArray(r.p).applyMatrix4(ov.group.matrix); quat.copy(ov.group.quaternion).multiply(bbQ.fromArray(r.q)); return true;
  }
  // ---------- Portal arch: a ring that leads to the memory palace (its own app, palace/ on this site) ----------
  // You place it yourself (Places ▸ Place portal); walking through it saves your world and opens the palace, which
  // brings you back here, standing in front of it. In someone else's room it's closed: a palace belongs to its owner.
  var PORTAL_R = 1.3, PORTAL_Y = 1.6, HANDOFF = 'palace.handoff';
  var portalViews = new Map(), seenPortalVer = -1, portalT0 = performance.now(), lastPortalNote = 0;
  var portalArchMat = new THREE.MeshLambertMaterial({ color: new THREE.Color('#4e8c7a') }), portalStoneMat = new THREE.MeshLambertMaterial({ color: new THREE.Color('#8a8478') });
  function portalSurface() {
    return new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uOpen: { value: 1 } }, transparent: true, side: THREE.DoubleSide, depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: [
        'uniform float uTime; uniform float uOpen; varying vec2 vUv;',
        'void main() {',
        '  vec2 p = vUv * 2.0 - 1.0; float r = length(p);',
        '  float w = sin(r * 22.0 - uTime * 3.0) * 0.5 + sin(r * 9.0 + uTime * 1.7 + p.x * 3.0) * 0.3 + sin((p.x + p.y) * 7.0 - uTime * 2.3) * 0.2;',
        '  vec3 c = mix(vec3(0.05, 0.25, 0.30), vec3(0.50, 0.88, 0.92), 0.5 + 0.5 * w) + smoothstep(0.7, 1.0, r) * vec3(0.55, 0.85, 0.95) + pow(max(w, 0.0), 6.0) * 0.6;',
        '  c = mix(vec3(0.38, 0.36, 0.33) + 0.04 * w, c, uOpen);',
        '  gl_FragColor = vec4(c, (1.0 - smoothstep(0.96, 1.0, r)) * mix(1.0, 0.92, uOpen));',
        '}'].join('\n')
    });
  }
  function makePortalView() {
    var g = new THREE.Group(), surf = portalSurface();
    var ring = new THREE.Mesh(new THREE.TorusGeometry(PORTAL_R + 0.12, 0.16, 12, 48), portalArchMat); ring.position.y = PORTAL_Y;
    var disc = new THREE.Mesh(new THREE.CircleGeometry(PORTAL_R, 48), surf); disc.position.y = PORTAL_Y; disc.renderOrder = 2;
    var plinth = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.3, 1.2), portalStoneMat); plinth.position.y = 0.05;
    var step = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.18, 2.2), portalStoneMat); step.position.y = -0.02;
    g.add(step, plinth, ring, disc); worldRoot.add(g);
    return { group: g, surf: surf, side: null };
  }
  function portalOpen() { return !(net && !hosting); }
  function myPortal() { var r = null; studio.portals.forEach(function (x) { if (!r) r = x; }); return r; }
  // Where you stand in front of a portal: dist m out from its face, facing it (toward) or away from it.
  function portalSpot(rec, dist) { return { x: rec.p[0] + Math.sin(rec.yaw) * dist, z: rec.p[2] + Math.cos(rec.yaw) * dist }; }
  function standAt(x, z, yaw) {
    rig.updateMatrixWorld(true);
    if (renderer.xr.isPresenting) snapTurn(yaw - headYaw()); else { rig.rotation.y = yaw; camera.rotation.set(pitch, 0, 0); }
    rig.updateMatrixWorld(true); var h = headWorld(tmpV2);
    rig.position.x += x - h.x; rig.position.z += z - h.z; rig.position.y = Math.max(terrain.surfaceY(x, z), rig.position.y - 50) + 0.05; vy = 0;
    var top = rig.position.y; while (solid(x, rig.position.y + 0.02, z) && rig.position.y < top + 40) rig.position.y += 0.25; // not inside a build
    streamTerrain(300);
  }
  function placePortal() {
    if (!canEdit()) return;
    rig.updateMatrixWorld(true);
    var h = headWorld(tmpV2), yaw = headYaw(), x = h.x - Math.sin(yaw) * 3, z = h.z - Math.cos(yaw) * 3, cur = myPortal();
    edit({ t: 'portal', d: { id: cur ? cur.id : uid('pt'), p: [r3(x), r3(Math.max(terrain.surfaceY(x, z), rig.position.y - 0.5)), r3(z)], yaw: r3(yaw), to: 'palace' } });
    sound('brick'); toast(cur ? 'Portal moved here. Walk through it to reach your memory palace.' : 'Portal placed. Walk through it to reach your memory palace.');
    refreshPlaces(); panel.dirty = true;
  }
  function goToPortal() {
    var rec = myPortal(); if (!rec) { toast('No portal yet: Place portal first.'); return; }
    var s = portalSpot(rec, 2.6); standAt(s.x, s.z, rec.yaw + Math.PI); sound('tap'); toast('At the portal');
  }
  async function goThroughPortal(rec) {
    if (portalGoing) return;
    if (!portalOpen()) { if (performance.now() - lastPortalNote > 4000) { lastPortalNote = performance.now(); toast('This portal is private: it leads to its owner’s memory palace.'); } return; }
    portalGoing = true; sound('tap');
    try { await saveLocal(false); } catch (e) { }
    try { localStorage.setItem(HANDOFF, JSON.stringify({ from: 'clay', at: Date.now(), mode: xrMode, back: location.pathname.split('/').pop() || '', debug: DEBUG })); } catch (e) { }
    location.href = palaceLink('via=clay');
  }
  var portalGoing = false;
  // The Memory Palace is its own Quest app. Installed, the trip asks Android to open it (falling back to its web
  // address); in a browser tab it's a page change, which lets the headset carry the VR session across.
  var PALACE_PKG = 'com.noirealtech.memorypalace', PALACE_PATH = '/memory-palace/index.html';
  var launchedAsApp = (function () { try { if (document.referrer.indexOf('android-app://') === 0) sessionStorage.setItem('clay.app', '1'); return sessionStorage.getItem('clay.app') === '1' || (window.matchMedia && matchMedia('(display-mode: standalone)').matches); } catch (e) { return false; } })();
  function palaceLink(query) {
    if (DEBUG) query = 'debug&' + query;
    var web = (DEBUG && new URLSearchParams(location.search).get('palace')) || (location.origin + PALACE_PATH);
    web += (web.indexOf('?') >= 0 ? '&' : '?') + query;
    if (!launchedAsApp || location.hostname !== 'noireal-tech.github.io') return web;
    return 'intent://' + location.host + PALACE_PATH + '?' + query + '#Intent;scheme=https;package=' + PALACE_PKG + ';S.browser_fallback_url=' + encodeURIComponent(web) + ';end';
  }
  function syncPortals(now) {
    if (studio.portalVer !== seenPortalVer) {
      seenPortalVer = studio.portalVer;
      portalViews.forEach(function (v, id) { if (!studio.portals.has(id)) { worldRoot.remove(v.group); v.surf.dispose(); portalViews.delete(id); } });
      studio.portals.forEach(function (rec, id) {
        var v = portalViews.get(id); if (!v) { v = makePortalView(); portalViews.set(id, v); }
        v.group.position.fromArray(rec.p); v.group.rotation.set(0, rec.yaw, 0); v.group.updateMatrixWorld(true); v.side = null; v.rec = rec;
      });
    }
    if (!portalViews.size) return;
    var t = (now - portalT0) / 1000, open = portalOpen() ? 1 : 0;
    rig.updateMatrixWorld(true); var h = headWorld(tmpV2);
    portalViews.forEach(function (v) {
      v.surf.uniforms.uTime.value = t; v.surf.uniforms.uOpen.value = open;
      if (ar.active) { v.side = null; return; }
      var rec = v.rec, dx = h.x - rec.p[0], dz = h.z - rec.p[2], c = Math.cos(rec.yaw), sn = Math.sin(rec.yaw);
      var lx = dx * c - dz * sn, lz = dx * sn + dz * c, ly = h.y - rec.p[1] - PORTAL_Y * 0.9;
      var side = lz > 0 ? 1 : -1, inside = Math.hypot(lx, ly / Math.max(state.pscale, 1)) < PORTAL_R && Math.abs(lz) < 1.2;
      if (v.side !== null && side !== v.side && inside) goThroughPortal(rec);
      v.side = Math.abs(lz) < 1.2 ? side : null;
    });
  }
  // Back from the palace: stand in front of the portal, facing away from it, and go straight back into the headset.
  function arriveFromPalace() {
    var rec = myPortal(); if (!rec) return;
    var s = portalSpot(rec, 2.2); standAt(s.x, s.z, rec.yaw);
    toast('Back from your memory palace');
  }

  function syncBoards() {
    if (studio.boardVer !== seenBoardVer) {
      seenBoardVer = studio.boardVer;
      boardViews.forEach(function (v, id) { if (!studio.boards.has(id)) dropBoard(id); });
      studio.boards.forEach(function (rec, id) {
        var v = boardViews.get(id); if (!v) { v = makeBoardView(rec); boardViews.set(id, v); }
        var resize = !v.rec || v.rec.w !== rec.w || v.rec.h !== rec.h, remode = v.rec && v.rec.mode !== rec.mode;
        if (v.rec && v.rec.url !== rec.url) { stopLive(id); v.info = boardInfo(rec); }
        v.rec = rec; if (resize) sizeBoard(v); else if (remode) drawCard(v);
        if (resize && live.has(id)) { var wasAuto = live.get(id).auto; stopLive(id); startLive(id, wasAuto); } // refit the player to the new shape
      });
      if (state.board && !studio.boards.has(state.board)) state.board = null;
      renderLinksUI(); panel.dirty = true;
    }
    boardViews.forEach(function (v, id) {
      var ok = boardPose(v, v.group.position, v.group.quaternion);
      v.group.visible = ok && (!ar.active || insidePlate(v.group.position.x, v.group.position.z));
      v.frame.material = id === state.board ? frameSel : frameMat;
    });
  }
  function dropBoard(id) { var v = boardViews.get(id); if (!v) return; stopLive(id); worldRoot.remove(v.group); v.screen.geometry.dispose(); v.frame.geometry.dispose(); v.screen.material.dispose(); v.tex.dispose(); boardViews.delete(id); }
  function redrawCards() { boardViews.forEach(drawCard); }
  // Which billboard a content-space ray hits first: { id, dist } or null.
  function boardHit(o, d) {
    var best = null;
    boardViews.forEach(function (v, id) {
      if (!v.group.visible) return;
      bbM.compose(v.group.position, v.group.quaternion, bbS).invert();
      _o.copy(o).applyMatrix4(bbM); _d.copy(d).transformDirection(bbM);
      if (Math.abs(_d.z) < 1e-6) return;
      var t = -_o.z / _d.z, x = _o.x + _d.x * t, y = _o.y + _d.y * t;
      if (t > 0 && Math.abs(x) <= v.rec.w / 2 + 0.05 && Math.abs(y) <= v.rec.h / 2 + 0.05 && (!best || t < best.dist)) best = { id: id, dist: t };
    });
    return best;
  }

  // ---- Placing ----
  // Point at a wall or a shape's side: the billboard hangs flat on it. Point at the ground or a top: it stands
  // there facing you. Point at nothing: it hangs in the air ahead. On a shape it's attached (unless set to stay put).
  function placeBillboard(hit, o, d) {
    var l = linkRec(state.link), info = l && ClayMedia.parseSocial(l.url);
    if (!info || !info.ok) { toast('Pick a link first: Social links ▸ add one, then Place.'); return; }
    if (!canEdit()) return;
    var sz = SHAPES_BB[info.shape], k = handScale(), w = sz[0] * k, h = sz[1] * k, pos = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), face = new THREE.Vector3(), at = null;
    var yaw = headYaw() - (ar.active ? ar.yaw : 0), toMe = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    if (hit) {
      var n = new THREE.Vector3(hit.nx, hit.ny, hit.nz);
      if (Math.abs(n.y) > 0.7) { face.copy(toMe); pos.set(hit.x, hit.y, hit.z).addScaledVector(up, h / 2 + 0.06 * k); }
      else { face.set(n.x, 0, n.z).normalize(); pos.set(hit.x, hit.y, hit.z).addScaledVector(face, 0.03 * k); }
      if (hit.target !== 'T' && state.bbFix === 'shape') at = hit.target;
    } else { face.copy(toMe); pos.copy(o).addScaledVector(d, 2.5 * k); }
    var q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(face, new THREE.Vector3(), up)), p = pos;
    if (at) { var ov = objViews.get(at); p = pos.clone().applyMatrix4(ov.inv); q = ov.group.quaternion.clone().invert().multiply(q); }
    var id = uid('b');
    edit({ t: 'board', d: { id: id, url: l.url, p: args(p.toArray()), q: q.toArray().map(sig), w: r3(w), h: r3(h), at: at, mode: state.bbMode } });
    state.board = id; sound('brick');
    toast(info.label + (at ? ' placed on the shape (it moves with it)' : ' placed') + '. ' + (state.bbMode === 'auto' ? 'It plays when someone comes near.' : 'Click it to play.'));
  }
  // Change the picked billboard: fn gets a copy of its record (and its frame vectors) and edits it.
  function changeBoard(fn) {
    var rec = state.board && studio.boards.get(state.board); if (!rec) { toast('Pick a billboard first: click one with the Select tool.'); return; }
    if (!canEdit()) return;
    var r = JSON.parse(JSON.stringify(rec)); fn(r);
    edit({ t: 'board', d: r }); sound('tap');
  }
  function boardAct(name) {
    var step = 0.12, turn = Math.PI / 12;
    changeBoard(function (r) {
      var q = new THREE.Quaternion().fromArray(r.q), ov = r.at && objViews.get(r.at), sc = ov ? Math.max(ov.o.s[0], ov.o.s[1], ov.o.s[2]) : 1;
      var ax = function (x, y, z) { return new THREE.Vector3(x, y, z).applyQuaternion(q); }, L = Math.max(r.w, r.h), mv = step * L / sc;
      var nudge = function (v) { r.p = args([r.p[0] + v.x * mv, r.p[1] + v.y * mv, r.p[2] + v.z * mv]); };
      if (name === 'bigger' || name === 'smaller') { var f = name === 'bigger' ? 1.25 : 0.8; r.w = r3(clamp(r.w * f, 0.1, 50)); r.h = r3(clamp(r.h * f, 0.1, 50)); }
      else if (SHAPES_BB[name]) { var s = SHAPES_BB[name], k = L / Math.max(s[0], s[1]); r.w = r3(s[0] * k); r.h = r3(s[1] * k); }
      else if (name === 'left' || name === 'right') nudge(ax(name === 'left' ? -1 : 1, 0, 0));
      else if (name === 'up' || name === 'down') nudge(ax(0, name === 'up' ? 1 : -1, 0));
      else if (name === 'nearer' || name === 'farther') nudge(ax(0, 0, name === 'nearer' ? 1 : -1));
      else if (name === 'ccw' || name === 'cw') r.q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), name === 'ccw' ? turn : -turn).multiply(q).toArray().map(sig);
      else if (name === 'mode') r.mode = r.mode === 'auto' ? 'click' : 'auto';
      else if (name === 'fix' && r.at && ov) { // keep it exactly where it is, but in space
        var pos = new THREE.Vector3().fromArray(r.p).applyMatrix4(ov.group.matrix), wq = ov.group.quaternion.clone().multiply(q);
        r.p = args(pos.toArray()); r.q = wq.toArray().map(sig); r.at = null;
      } else if (name === 'attach' && !r.at) { // onto the nearest shape
        var pos2 = new THREE.Vector3().fromArray(r.p), bestId = null, bestD = Infinity;
        objViews.forEach(function (v, id) { var dd = pos2.distanceTo(tmpV.fromArray(v.o.p)) - v.R; if (dd < bestD) { bestD = dd; bestId = id; } });
        if (!bestId || bestD > 2 * Math.max(1, handScale())) { toast('No shape close enough. Move the billboard next to one first.'); return; }
        var bv = objViews.get(bestId); r.p = args(pos2.applyMatrix4(bv.inv).toArray()); r.q = bv.group.quaternion.clone().invert().multiply(q).toArray().map(sig); r.at = bestId;
      }
    });
    if (name === 'mode') { var rr2 = studio.boards.get(state.board); toast(rr2 && rr2.mode === 'auto' ? 'Plays when someone comes near' : 'Plays when clicked'); }
  }
  function deleteBoard() { if (state.board && studio.boards.has(state.board) && canEdit()) { edit({ t: 'unboard', id: state.board }); state.board = null; toast('Billboard removed'); } }
  function pickBoard(id) { state.board = id; if (id) setSelection([]); renderLinksUI(); panel.dirty = true; if (id) { var v = boardViews.get(id); toast((v ? v.info.label : 'Billboard') + ' picked. Resize, move or set how it plays in Social links.'); } }
  // A click on a billboard: the Select tool picks it, Erase removes it, any other tool plays or stops it.
  function boardClick(id) {
    var t = toolId();
    if (t === 'select' || t === 'move') { pickBoard(id); sound('tap'); return; }
    if (t === 'erase') { state.board = id; deleteBoard(); return; }
    playBoard(id);
  }
  function playBoard(id) {
    if (renderer.xr.isPresenting) { watchOutside(id); return; }
    if (live.has(id)) stopLive(id); else startLive(id, false);
  }

  // ---- Playing (flat screens): the platform's player, placed exactly in the frame ----
  var live = new Map(), embedsEl = $('#embeds'), embedsCam = $('#embedsCam'), lastAuto = 0, lastOcc = 0;
  function startLive(id, auto) {
    var v = boardViews.get(id); if (!v || live.has(id) || renderer.xr.isPresenting) return;
    if (live.size >= 3) { var oldest = live.keys().next().value; stopLive(oldest); }
    var el = document.createElement('div'), fr = document.createElement('iframe'), H = Math.round(PX * v.rec.h / v.rec.w);
    el.className = 'embed'; el.style.width = PX + 'px'; el.style.height = H + 'px';
    fr.src = v.info.embed(true, auto); fr.title = v.info.label + (v.info.who ? ' by ' + v.info.who : '');
    fr.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write; web-share');
    fr.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin'); fr.setAttribute('allowfullscreen', '');
    var x = document.createElement('button'); x.className = 'embed-x'; x.textContent = '×'; x.setAttribute('aria-label', 'Stop ' + v.info.label);
    x.addEventListener('click', function () { stopLive(id); v.dismissed = performance.now(); });
    el.append(fr, x); embedsCam.append(el);
    live.set(id, { el: el, auto: auto, w: PX, h: H });
    v.screen.visible = false;
  }
  function stopLive(id) { var l = live.get(id); if (!l) return; l.el.remove(); live.delete(id); var v = boardViews.get(id); if (v) v.screen.visible = true; }
  function stopAllLive() { Array.from(live.keys()).forEach(stopLive); }
  function cssNum(v) { return Math.abs(v) < 1e-10 ? 0 : v; }
  var occO = new THREE.Vector3(), occD = new THREE.Vector3(), IDENT = new THREE.Matrix4();
  var liveSize = '', liveM = new THREE.Matrix4(), liveInv = new THREE.Matrix4(), livePos = new THREE.Vector3(), liveQ = new THREE.Quaternion(), liveScale = new THREE.Vector3(), camDir = new THREE.Vector3();
  function syncLive(now) {
    if (renderer.xr.isPresenting) { if (live.size) stopAllLive(); embedsEl.hidden = true; return; }
    // Billboards set to play when near: start the nearest two in reach, stop ones you've walked away from.
    if (now - lastAuto > 300) {
      lastAuto = now; rig.updateMatrixWorld(true);
      var me = toContent(headWorld(_me.clone())), reach = 6 * Math.max(1, ar.active ? 1 : state.pscale), near = [];
      boardViews.forEach(function (v, id) {
        if (!v.group.visible || v.rec.mode !== 'auto') return;
        var dd = v.group.position.distanceTo(me);
        // Closed with ×: it stays closed while you're nearby, and plays again once you've left and come back.
        if (dd > reach * 1.5) { v.dismissed = 0; if (live.has(id) && live.get(id).auto) stopLive(id); }
        else if (dd < reach && !v.dismissed) near.push([dd, id]);
      });
      near.sort(function (a, b) { return a[0] - b[0]; }).slice(0, 2).forEach(function (e) { startLive(e[1], true); });
    }
    embedsEl.hidden = !live.size; if (!live.size) return;
    // Same maths as three.js's CSS3DRenderer: the page's camera, then each frame in the world.
    var W = canvas.clientWidth, Hh = canvas.clientHeight / 2, fov = camera.projectionMatrix.elements[5] * Hh, e;
    camera.updateMatrixWorld(true); liveInv.copy(camera.matrixWorld).invert(); e = liveInv.elements;
    if (liveSize !== W + 'x' + Hh + 'x' + fov) { liveSize = W + 'x' + Hh + 'x' + fov; embedsEl.style.perspective = fov + 'px'; embedsCam.style.width = W + 'px'; embedsCam.style.height = Hh * 2 + 'px'; }
    embedsCam.style.transform = 'translateZ(' + fov + 'px) matrix3d(' + [e[0], -e[1], e[2], e[3], e[4], -e[5], e[6], e[7], e[8], -e[9], e[10], e[11], e[12], -e[13], e[14], e[15]].map(cssNum).join(',') + ') translate(' + W / 2 + 'px,' + Hh + 'px)';
    camera.getWorldDirection(camDir);
    var checkOcc = now - lastOcc > 200; if (checkOcc) lastOcc = now;
    live.forEach(function (l, id) {
      var v = boardViews.get(id); if (!v) { stopLive(id); return; }
      v.group.updateMatrixWorld(true); v.screen.matrixWorld.decompose(livePos, liveQ, liveScale);
      liveM.compose(livePos, liveQ, liveScale.set(v.rec.w * worldRoot.scale.x / l.w, v.rec.h * worldRoot.scale.x / l.h, 1)); e = liveM.elements;
      l.el.style.transform = 'translate(-50%,-50%) matrix3d(' + [e[0], e[1], e[2], e[3], -e[4], -e[5], -e[6], -e[7], e[8], e[9], e[10], e[11], e[12], e[13], e[14], e[15]].map(cssNum).join(',') + ')';
      // Hide it when you're behind the billboard, or clay stands between you and it.
      var facing = tmpV.set(0, 0, 1).applyQuaternion(liveQ).dot(camDir) < 0;
      if (checkOcc) {
        headWorld(occO); occD.copy(livePos).sub(occO); var dist = occD.length(); occD.transformDirection(ar.active ? ar.inv : IDENT); toContent(occO);
        var hh = hitTest(occO, occD, { max: dist / worldRoot.scale.x });
        l.blocked = !!(hh && hh.dist * worldRoot.scale.x < dist - 0.15);
      }
      l.el.style.visibility = v.group.visible && facing && !l.blocked ? 'visible' : 'hidden';
    });
  }
  // In VR: leave the headset view and play it on the 2D page, with a way straight back.
  var watchAfterXR = null;
  function watchOutside(id) { watchAfterXR = { id: id, mode: xrMode }; toast('Opening it on the flat screen…'); var s = renderer.xr.getSession(); if (s) s.end(); }
  function openWatch(id, mode) {
    var v = boardViews.get(id); if (!v) return;
    var fr = $('#watchFrame'); fr.src = v.info.embed(true, false); fr.title = v.info.label; fr.parentNode.style.setProperty('--ar', (v.rec.w / v.rec.h).toFixed(3));
    $('#watchTitle').textContent = v.info.label + (v.info.who ? ' · ' + v.info.who : '');
    $('#watchBack').textContent = mode === 'immersive-ar' ? 'Back to AR' : 'Back to VR'; $('#watchBack').dataset.mode = mode || 'immersive-vr';
    $('#watchCard').hidden = false;
  }
  function closeWatch() { $('#watchFrame').src = 'about:blank'; $('#watchCard').hidden = true; }
  $('#watchClose').addEventListener('click', closeWatch);
  $('#watchBack').addEventListener('click', function () { var m = $('#watchBack').dataset.mode; closeWatch(); startXR(m); });

  // ---- Social links screens ----
  function renderLinksUI() {
    var box = $('#linksUi'); if (!onShow(box)) return; box.textContent = '';
    var add = elt('div', 'acts'), inp = document.createElement('input');
    inp.type = 'url'; inp.placeholder = 'Paste a YouTube, Instagram, Facebook, TikTok, Threads or Snapchat link'; inp.className = 'link-in'; inp.setAttribute('aria-label', 'Link address');
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { if (addLink(inp.value).ok) inp.value = ''; } e.stopPropagation(); });
    add.append(inp, chip('Add', function () { if (addLink(inp.value).ok) inp.value = ''; }, { primary: true }));
    if (navigator.clipboard && navigator.clipboard.readText) add.append(chip('Paste', function () { navigator.clipboard.readText().then(function (t) { addLink(t); }, function () { toast('Paste into the box instead.'); }); }));
    var list = elt('div', 'link-list');
    if (!prefs.links.length) list.append(elt('small', 'muted', 'No links yet. Paste one above, or send links from your phone (Phone).'));
    prefs.links.forEach(function (l) {
      var info = ClayMedia.parseSocial(l.url), row = elt('div', 'link-row' + (state.link === l.id ? ' on' : '')), pill = elt('span', 'plat', info.name);
      pill.style.setProperty('--pc', PLAT_COLOR[info.plat]); pill.style.setProperty('--pci', info.plat === 'snapchat' ? '#111' : '#fff');
      row.append(pill, elt('span', 'm-name', info.label + (info.who ? ' · ' + info.who : '')),
        chip(state.link === l.id && toolId() === 'board' ? 'Placing…' : 'Place', function () { state.link = l.id; prefs.link = l.id; savePrefs(); setTool(boardTool()); renderLinksUI(); toast('Point where the billboard should go and click.'); }, { pressed: state.link === l.id && toolId() === 'board' }),
        chip('×', function () { removeLink(l.id); }, { label: 'Remove link' }));
      list.append(row);
    });
    var opts = elt('div', 'acts');
    opts.append(elt('span', 'muted', 'New billboards'), chip('Stick to shapes', function () { state.bbFix = 'shape'; prefs.bbFix = 'shape'; savePrefs(); renderLinksUI(); }, { pressed: state.bbFix === 'shape' }),
      chip('Fixed in space', function () { state.bbFix = 'space'; prefs.bbFix = 'space'; savePrefs(); renderLinksUI(); }, { pressed: state.bbFix === 'space' }),
      elt('span', 'muted gap', 'Play'), chip('On click', function () { state.bbMode = 'click'; prefs.bbMode = 'click'; savePrefs(); renderLinksUI(); }, { pressed: state.bbMode === 'click' }),
      chip('When near', function () { state.bbMode = 'auto'; prefs.bbMode = 'auto'; savePrefs(); renderLinksUI(); }, { pressed: state.bbMode === 'auto' }));
    box.append(add, list, opts);
    var rec = state.board && studio.boards.get(state.board), v = rec && boardViews.get(state.board);
    if (rec && v) {
      var ed = elt('div', 'bb-edit'), A = function (label, act, aria) { return chip(label, function () { boardAct(act); }, { label: aria }); };
      ed.append(elt('strong', '', 'Picked: ' + v.info.label + (rec.at ? ' (on a shape)' : ' (fixed in space)')));
      var r1 = elt('div', 'acts'); r1.append(elt('span', 'muted', 'Size'), A('−', 'smaller', 'Smaller'), A('+', 'bigger', 'Bigger'), A('16:9', 'wide'), A('9:16', 'tall'), A('Square', 'square'), A('Post', 'post'));
      var r2 = elt('div', 'acts'); r2.append(elt('span', 'muted', 'Move'), A('◀', 'left', 'Move left'), A('▶', 'right', 'Move right'), A('▲', 'up', 'Move up'), A('▼', 'down', 'Move down'), A('Nearer', 'nearer'), A('Back', 'farther'), A('⟲', 'ccw', 'Turn left'), A('⟳', 'cw', 'Turn right'));
      var r3_ = elt('div', 'acts'); r3_.append(chip(rec.mode === 'auto' ? 'Plays when near ✓' : 'Plays on click ✓', function () { boardAct('mode'); }),
        rec.at ? chip('Fix in space', function () { boardAct('fix'); }) : chip('Attach to nearest shape', function () { boardAct('attach'); }),
        chip(live.has(state.board) ? 'Stop' : 'Play', function () { var id = state.board; if (live.has(id)) stopLive(id); else startLive(id, false); renderLinksUI(); }),
        chip('Delete', function () { deleteBoard(); }), chip('Done', function () { pickBoard(null); }));
      ed.append(r1, r2, r3_); box.append(ed);
    }
  }

  // ---------- HUD ----------
  var toastTimer = 0;
  function toast(msg) {
    var el = $('#toast'); el.textContent = msg; el.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.hidden = true; }, 3200);
  }
  function svg(name) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + ICON[name] + '</svg>'; }
  TOOLS.forEach(function (t, i) {
    var b = document.createElement('button');
    b.className = 'tool'; b.id = 'tool-' + i; b.innerHTML = svg(t.icon || t.id) + '<span></span>';
    b.querySelector('span').textContent = t.name;
    var inTab = TOOLS.filter(function (x) { return x.tab === t.tab; }).indexOf(t);
    b.title = t.name + (inTab < 9 ? ' (' + (inTab + 1) + ')' : '');
    b.addEventListener('click', function () { setTool(i); });
    $('#tools-' + t.tab).appendChild(b);
  });
  var toolBtns = $$('.tool');
  PALETTE.forEach(function (p, i) {
    ['#swatches', '#sheetSwatches'].forEach(function (where, k) {
      var b = document.createElement('button');
      b.className = 'swatch' + (i === CRYSTAL ? ' crystal' : ''); b.id = (k ? 'sheet-swatch-' : 'swatch-') + i; b.dataset.i = i; b.style.setProperty('--sw', p[1]);
      b.setAttribute('aria-label', p[0]); b.title = p[0];
      b.addEventListener('click', function () { state.color = i; updateHud(); });
      $(where).appendChild(b);
    });
  });
  var swatchBtns = $$('.swatch');
  function setTool(i) { state.tool = i; state.tab = TOOLS[i].tab; if (TOOLS[i].tab === 'paint' && TOOLS[i].id !== 'pick') state.lastPaint = i; updateHud(); if (toolId() === 'skin') renderSkinUI(); }
  function setTab(tab) {
    state.tab = tab;
    if (TOOLS[state.tool].tab !== tab) state.tool = TOOLS.findIndex(function (t) { return t.tab === tab; });
    updateHud();
  }
  $$('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { setTab(b.dataset.tab); }); });
  function sizeLabel() {
    var t = toolId();
    if (t === 'brick') return (BRICK * V).toFixed(2) + ' m brick';
    if (t === 'mold') return (moldScale() * OBJ_HALF * 2).toFixed(2) + ' m mold';
    return brushR().toFixed(2) + ' m';
  }
  function setSize(v) { state.size = clamp(v, MIN_SIZE, MAX_SIZE); updateHud(); }
  function updateHud() {
    toolBtns.forEach(function (b, i) { b.setAttribute('aria-pressed', String(i === state.tool)); });
    swatchBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.i === state.color)); });
    $$('[data-tab]').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.tab === state.tab)); });
    TABS_UI.forEach(function (tb) { $('#tools-' + tb).hidden = state.tab !== tb; });
    $('#snapBtn').textContent = 'Snap to grid: ' + (state.snap ? 'on' : 'off');
    $('#envBtn').textContent = 'Scene: ' + envName(state.env);
    $('#sizeOut').textContent = sizeLabel();
    $('#colorName').textContent = PALETTE[state.color][0];
    $('#skinBar').hidden = toolId() !== 'skin'; markLandSkin();
    $('#castRow').hidden = state.tab !== 'shapes';
    $$('[data-cast]').forEach(function (b) { b.setAttribute('aria-pressed', String((b.dataset.cast === 'hollow') === state.hollow)); });
    $('#mode').textContent = state.fly ? 'Fly' : 'Walk';
    $('#sound').textContent = 'Sound: ' + (state.muted ? 'off' : 'on');
    $('#viewBtn').textContent = 'View distance: ' + viewName;
    refreshPlaces();
    $('#up').textContent = state.fly ? 'Up' : 'Jump';
    $('#down').hidden = !state.fly;
    panel.dirty = true;
    queueMeasure();
  }
  function allCrystal(ids) { return ids.length > 0 && ids.every(function (id) { var o = studio.get(id); return o && o.cr; }); }
  function selLabelText() {
    var ids = selList(); if (!ids.length) return '';
    if (ids.length === 1) { var o = studio.get(ids[0]); return (o.cr ? 'Crystal ' + MOLD_NAME[o.mold].toLowerCase() : MOLD_NAME[o.mold]) + (o.sk ? ' with a photo skin' : '') + (o.snd ? ' with a sound' : '') + (o.gid ? ' (part of a group)' : ''); }
    var g = studio.get(ids[0]).gid, same = g && ids.every(function (id) { return studio.get(id).gid === g; });
    return (same ? 'Group of ' : '') + ids.length + ' shapes';
  }
  function updateSheet() {
    var ids = selList(), sheet = $('#editSheet');
    sheet.hidden = !ids.length;
    document.body.classList.toggle('edit-compact', !!ids.length && sheetMode() === 'replace'); // set now, so the tray never flashes underneath
    $('#selLabel').textContent = selLabelText();
    if (ids.length) { var L = levelOf(ids); $('#levelRange').value = String(clamp(Math.round(L), 1, LEVELS)); $('#levelOut').textContent = levelLabel(ids); }
    $('#partBtn').setAttribute('aria-pressed', String(state.part));
    $('#crystalBtn').setAttribute('aria-pressed', String(allCrystal(ids)));
    $('#multiBtn').setAttribute('aria-pressed', String(state.multi));
    $('#stickBtn').setAttribute('aria-pressed', String(state.stickResize));
    $('#stick').dataset.mode = state.stickResize && ids.length ? 'resize' : 'move';
    $$('#editSheet [role="tab"]').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.pane === state.pane)); });
    $$('#editSheet .pane').forEach(function (p) { p.hidden = p.dataset.pane !== state.pane; });
    if ((ids.length && state.pane === 'look') || toolId() === 'skin') renderSkinUI();
    if (ids.length && state.pane === 'look') renderSoundUI();
    var lr = $('#levelRange'); if (lr) rangeFill(lr);
    panel.dirty = true;
    queueMeasure();
  }
  var measureQueued = false;
  function queueMeasure() { if (!measureQueued) { measureQueued = true; requestAnimationFrame(function () { measureQueued = false; measure(); }); } }
  // The tray's footprint while nothing is selected. On phones the edit sheet takes exactly that space, so the joystick,
  // the Up/Down buttons and the ground arrows don't move when you select something.
  // Scroll edge: panels that scroll fade out at the bottom while there's more below
  function edgeFade(el) { if (el) el.classList.toggle('more-below', el.scrollHeight - el.scrollTop - el.clientHeight > 2); }
  ['#editSheet .sheet', '#tray .tray-inner'].concat($$('.cat-body.scroll').map(function (e) { return e; })).forEach(function (q) { var el = typeof q === 'string' ? $(q) : q; if (el) el.addEventListener('scroll', function () { edgeFade(el); }, { passive: true }); });
  var trayIdle = { h: 0, inner: 240, top: 0 };
  function measure() {
    var root = document.documentElement, body = document.body, sh = $('#editSheet'), compact = !sh.hidden && sheetMode() === 'replace';
    var ti = $('#tray .tray-inner'), off = body.classList.contains('panels-off');
    if (compact && trayIdle.stale) body.classList.remove('edit-compact'); // the screen changed while editing: measure the tray afresh, then hide it again
    if (!compact || trayIdle.stale) {
      trayIdle.stale = false;
      trayIdle.h = $('#tray').getBoundingClientRect().height;
      if (ti.offsetParent) { var tr = ti.getBoundingClientRect(); trayIdle.inner = tr.height; trayIdle.top = tr.top; } else trayIdle.top = innerHeight;
      root.style.setProperty('--tray-h', trayIdle.h + 'px');
    }
    body.classList.toggle('edit-compact', compact);
    root.style.setProperty('--edit-max', Math.max(trayIdle.inner, 200) + 'px');
    root.style.setProperty('--top-h', $('.top .actions').getBoundingClientRect().bottom + 'px');
    root.style.setProperty('--sheet-h', '0px');
    var sr = sceneRect(), bottom = sr.y + sr.h;
    if (fold.mode === 'book') bottom -= 130;              // the joystick's corner; the panels are on the other page
    else if (!fold.mode && !off) bottom = trayIdle.top;   // just above the tray
    navLayout(bottom);
    edgeFade($('#editSheet .sheet')); edgeFade($('#tray .tray-inner')); $$('.cat-body.scroll').forEach(edgeFade);
  }
  $$('#editSheet [data-act]').forEach(function (b) { b.addEventListener('click', function () { ensureAudio(); runAct(b.dataset.act); }); });
  $$('#editSheet [role="tab"]').forEach(function (b) { b.addEventListener('click', function () { state.pane = b.dataset.pane; updateSheet(); }); });
  $('#partBtn').addEventListener('click', function () { runAct('part'); });
  $('#multiBtn').addEventListener('click', function () { runAct('multi'); });
  $('#doneBtn').addEventListener('click', function () { runAct('done'); });
  $('#levelRange').addEventListener('input', function () { var L = +$('#levelRange').value; $('#levelOut').textContent = 'Level ' + L + ' of ' + LEVELS + ' · ' + fmtMeters(levelMeters(L)); });
  $('#levelRange').addEventListener('change', function () { ensureAudio(); runAct('level:' + $('#levelRange').value); });
  $('#stickBtn').addEventListener('click', function () { state.stickResize = !state.stickResize; updateSheet(); });

  function toggleFly() { state.fly = !state.fly; vy = 0; updateHud(); toast(state.fly ? 'Flying' : 'Walking'); }
  function cycleTool(d) { setTool((state.tool + d + TOOLS.length) % TOOLS.length); }
  function cycleColor(d) { state.color = (state.color + d + PALETTE.length) % PALETTE.length; updateHud(); }
  $('#undo').addEventListener('click', doUndo);
  $('#redo').addEventListener('click', doRedo);
  // Molds cast solid, or hollow: a closed wall you can carve into.
  function setCast(h) { state.hollow = !!h; savePrefs(); updateHud(); toast(h ? 'Shapes cast hollow: a thin wall with air inside' : 'Shapes cast solid'); }
  function toggleSnap() { state.snap = !state.snap; savePrefs(); updateHud(); toast('Snap ' + (state.snap ? 'on: shapes land on a grid and turn in 15° steps' : 'off')); }
  $('#snapBtn').addEventListener('click', toggleSnap);
  $('#envBtn').addEventListener('click', function () { var keys = envKeys(), i = keys.indexOf(state.env); setEnv(keys[(i + 1) % keys.length]); });
  $('#exportBtn').addEventListener('click', function () { closeMenu(); exportOBJ(); });
  $('#saveFileBtn').addEventListener('click', function () { closeMenu(); saveWorldFile(); });
  $('#openFileBtn').addEventListener('click', function () { closeMenu(); if (net) { toast('Leave the room before opening a world file.'); return; } $('#openFile').click(); });
  $('#openFile').addEventListener('change', function (e) { var f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) openWorldFile(f); });
  $('#addFileBtn').addEventListener('click', function () { closeMenu(); $('#addFile').click(); });
  $('#addFile').addEventListener('change', function (e) { var f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) addWorldFile(f); });
  $('#mode').addEventListener('click', toggleFly);
  $('#smaller').addEventListener('click', function () { setSize(state.size - 0.05); });
  $('#bigger').addEventListener('click', function () { setSize(state.size + 0.05); });

  // Menu
  var menu = $('#menu'), menuBtn = $('#menuBtn'), resetArmed = 0;
  function closeMenu() { menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); resetArmed = 0; $('#reset').textContent = 'New world'; }
  menuBtn.addEventListener('click', function (e) { e.stopPropagation(); if (menu.hidden) { menu.hidden = false; menuBtn.setAttribute('aria-expanded', 'true'); } else closeMenu(); });
  document.addEventListener('pointerdown', function (e) { if (!menu.hidden && !menu.contains(e.target) && e.target !== menuBtn && !menuBtn.contains(e.target)) closeMenu(); });
  $('#saveNow').addEventListener('click', function () { saveLocal(true); closeMenu(); });
  $('#viewBtn').addEventListener('click', cycleView);
  $('#motionBtn').addEventListener('click', function () {
    prefs.motion = motionReduced() ? 'full' : 'reduced'; savePrefs(); syncMotion(); closeMenu(); nav = null;
    toast(motionReduced() ? 'Motion reduced: panels switch without turning, and ground arrows step with a quick fade.' : 'Motion: full');
  });
  $('#sound').addEventListener('click', function () { ensureAudio(); state.muted = !state.muted; savePrefs(); updateHud(); setVolume(); updateAmbient(); });
  $('#respawn').addEventListener('click', function () { closeMenu(); goPlace(0); });
  $('#showHelp').addEventListener('click', function () { closeMenu(); openCard('#helpCard'); });
  $('#reset').addEventListener('click', function () {
    var now = performance.now();
    if (!resetArmed || now - resetArmed > 4000) { resetArmed = now; $('#reset').textContent = net ? 'Tap again: erase for everyone' : 'Tap again to erase'; return; }
    if (!canEdit()) return;
    var op = { t: 'reset', seed: 1 + Math.floor(Math.random() * 2000000000) }; studio.apply(op); if (net) net.send(op);
    setSelection([]); streamTerrain(400); spawn(); saveLocal(false); closeMenu(); toast('New world ready');
  });

  // Cards
  function openCard(sel) { $(sel).hidden = false; var b = $(sel + ' .btn.primary'); if (b) b.focus(); }
  $('#helpClose').addEventListener('click', function () { $('#helpCard').hidden = true; ensureAudio(); lsSet(LS_HELP, '1'); });
  if (!lsGet(LS_HELP)) openCard('#helpCard');

  // ---------- Saving ----------
  async function saveLocal(manual) {
    if (netMode === 'code' && !hosting) { if (manual) toast('Guests don’t save the host’s world. Your own world is kept safe.'); return; }
    var v = studio.version;
    try {
      var s = await ClayNet.packBytes(studio.serializeBin());
      var ok = await store.set('world', s).then(function () { return true; }, function () { return false; });
      if (ok || lsSet(LS_WORLD, s)) { savedVersion = v; if (manual) toast('Saved on this device'); }
      else if (manual) toast('This browser blocked saving. Your world lasts until you close the page.');
    } catch (e) { if (manual) toast('Saving failed on this browser.'); }
  }
  async function loadLocal() {
    var s = await store.get('world').catch(function () { return null; }) || lsGet(LS_WORLD);
    try { return !!(s && studio.deserializeBin(await ClayNet.unpackBytes(s))); } catch (e) { return false; }
  }
  setInterval(function () { if (studio.version !== savedVersion) saveLocal(false); }, 20000);
  document.addEventListener('visibilitychange', function () { if (document.hidden && studio.version !== savedVersion) saveLocal(false); });

  // ---------- Multiplayer ----------
  function onRemoteOp(op) { if (op.t === 'del' || op.t === 'restore' || op.t === 'reset') pruneSel(); else if (op.t === 'grp' || op.t === 'xf' || op.t === 'fin' || op.t === 'wear' || op.t === 'voice') updateSheet(); }
  function startNet(tp, mode) {
    var n = new ClayNet.Net(studio, tp, {
      onStatus: updateNetUi, onPeers: updateNetUi, onRemoteOp: onRemoteOp, onWarn: toast,
      onSnapshot: function () { pruneSel(); toast('Joined the shared world'); },
      onSynced: updateNetUi
    });
    net = n; netMode = mode; n.visitorsBuild = hosting && !!prefs.visitorsBuild;
    return n.start().then(function () { pushPresence(true); updateNetUi(); }, function (e) { net = null; netMode = 'solo'; updateNetUi(); throw e; });
  }
  var CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function randomCode() { var s = ''; for (var i = 0; i < 5; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]; return s; }
  async function hostRoom() {
    if (net) return;
    netCode = randomCode(); hosting = true; setNetBusy(true, 'Opening room…');
    try { await startNet(new ClayNet.PeerTransport(netCode, true, await ClayMedia.peerOptions()), 'code'); toast('Room ' + netCode + ' is open'); }
    catch (e) { hosting = false; netCode = ''; toast(e.message); }
    setNetBusy(false); updateNetUi();
  }
  async function joinRoom(code) {
    if (net) return;
    code = (code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 5) { toast('Room codes have 5 letters or numbers.'); return; }
    await saveLocal(false); // keep your own world safe while you visit
    netCode = code; hosting = false; setNetBusy(true, 'Connecting to ' + code + '…');
    try { await startNet(new ClayNet.PeerTransport(code, false, await ClayMedia.peerOptions()), 'code'); }
    catch (e) { netCode = ''; toast(e.message); }
    setNetBusy(false); updateNetUi();
  }
  async function leaveRoom() {
    if (!net || netMode !== 'code') return;
    var wasGuest = !hosting;
    net.close(); net = null; netMode = 'solo'; netCode = ''; hosting = false;
    clearAvatars();
    if (wasGuest) { if (!(await loadLocal())) { studio.apply({ t: 'reset', seed: 7 }); } setSelection([]); streamTerrain(400); spawn(); toast('Back in your own world'); }
    else toast('Room closed');
    updateNetUi();
  }
  var netBusy = false;
  function setNetBusy(b, text) { netBusy = b; $('#hostBtn').disabled = b; $('#joinBtn').disabled = b; if (text) $('#netStatus').textContent = text; }
  function peerColor(p) { var ci = p.presence && typeof p.presence.ci === 'number' ? p.presence.ci : 0; return PALETTE[clamp(ci | 0, 0, DYES - 1)][1]; }
  var netUiKey = '';
  function updateNetUi() {
    var peers = net ? net.peers() : [], count = peers.length;
    var key = JSON.stringify([netMode, netCode, hosting, netBusy, !!window.Peer, net && net.synced, prefs.visitorsBuild, visitorsMayBuild(), state.tour, state.name, state.avatar,
      peers.map(function (p) { var pr = p.presence || {}; return [p.id, p.isMe, pr.nm, pr.ci]; })]);
    if (key === netUiKey) return; netUiKey = key;
    syncTourist();
    $('#visitRow').hidden = !(net ? hosting : true); $('#visitBtn').setAttribute('aria-pressed', String(!!prefs.visitorsBuild));
    $('#visitNote').hidden = !net || hosting; $('#visitNote').textContent = visitorsMayBuild() ? 'The owner lets visitors build here.' : 'You’re a tourist here: the owner lets visitors explore, not build.';
    $('#playersBtn').dataset.live = net ? '1' : '0';
    $('#playersCount').textContent = net ? String(Math.max(count, 1)) : 'Solo';
    $('#playersBtn').setAttribute('aria-label', net ? count + ' playing together' : 'Play together');
    var codeAvail = !!window.Peer;
    $('#netCode').hidden = !codeAvail;
    $('#netNone').hidden = codeAvail;
    $('#netIdle').hidden = netMode === 'code';
    $('#netLive').hidden = netMode !== 'code';
    $('#codeOut').textContent = netCode || '-----';
    $('#leaveBtn').hidden = netMode !== 'code';
    $('#leaveBtn').textContent = hosting ? 'Close room' : 'Leave room';
    $('#resyncBtn').hidden = !net || (netMode === 'code' && hosting);
    var st = '';
    if (net) {
      st = !net.synced ? 'Loading the shared world…' : (count > 1 ? count + ' people in this world.' : 'Waiting for others to join.');
      if (netMode === 'code' && hosting) st += ' Share the code. Your world is the shared one.';
    }
    if (!netBusy) $('#netStatus').textContent = st;
    var ul = $('#peerList'); ul.textContent = '';
    peers.forEach(function (p) {
      var li = document.createElement('li'), dot = document.createElement('i'), nm = document.createElement('span');
      dot.style.setProperty('--c', p.isMe ? PALETTE[state.avatar][1] : peerColor(p));
      nm.textContent = p.isMe ? state.name : String((p.presence && p.presence.nm) || 'Someone').slice(0, 20);
      li.append(dot, nm);
      if (p.isMe) { var me = document.createElement('small'); me.textContent = '(you)'; li.append(me); }
      ul.append(li);
    });
    panel.dirty = true;
  }
  $('#playersBtn').addEventListener('click', function () { $('#nameIn').value = state.name; updateNetUi(); openCard('#netCard'); });
  $('#netClose').addEventListener('click', function () { $('#netCard').hidden = true; });
  $('#nameIn').addEventListener('change', function () { var v = $('#nameIn').value.trim().slice(0, 20); if (v) { state.name = v; savePrefs(); pushPresence(true); updateNetUi(); } });
  $('#hostBtn').addEventListener('click', hostRoom);
  $('#joinBtn').addEventListener('click', function () { joinRoom($('#codeIn').value); });
  $('#codeIn').addEventListener('keydown', function (e) { if (e.key === 'Enter') joinRoom($('#codeIn').value); });
  $('#leaveBtn').addEventListener('click', leaveRoom);
  $('#resyncBtn').addEventListener('click', function () { if (net) { net.requestResync(); toast('Reloading the shared world…'); } });

  var lastPres = 0;
  function pushPresence(force) {
    if (!net) return;
    var now = performance.now(); if (!force && now - lastPres < 100) return; lastPres = now;
    rig.updateMatrixWorld(true);
    var h = toContent(headWorld(tmpV2)), yaw = headYaw() - (ar.active ? ar.yaw : 0);
    var p = { nm: state.name, ci: state.avatar, h: [r3(h.x), r3(h.y), r3(h.z), r3(yaw)], tl: isTourist() ? 'Touring' : TOOLS[state.tool].name, hs: hosting ? 1 : null, vb: hosting && prefs.visitorsBuild ? 1 : null, ar: ar.active ? 1 : null, sc: r3(ar.active ? 1 / ar.scale : state.pscale) };
    if (renderer.xr.isPresenting) hands.forEach(function (hd) { if (hd.src) { var w = toContent(new THREE.Vector3().setFromMatrixPosition(hd.ctrl.matrixWorld)); p[hd.hand === 'left' ? 'hl' : 'hr'] = [r3(w.x), r3(w.y), r3(w.z)]; } });
    else { p.hl = null; p.hr = null; }
    net.setPresence(p);
  }

  // Other players: a clay figure with a name tag.
  var avatars = new Map(), _me = new THREE.Vector3();
  function nameTag(text, color) {
    var c = document.createElement('canvas'); c.width = 256; c.height = 64;
    var g = c.getContext('2d');
    g.fillStyle = 'rgba(35,26,22,0.85)'; g.beginPath(); g.roundRect ? g.roundRect(2, 6, 252, 52, 26) : g.rect(2, 6, 252, 52); g.fill();
    g.fillStyle = color; g.beginPath(); g.arc(34, 32, 11, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f3e9dc'; g.font = '600 28px "Bricolage Grotesque", system-ui, sans-serif'; g.textBaseline = 'middle'; g.fillText(text, 56, 33, 186);
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
    sp.scale.set(0.6, 0.15, 1); sp.renderOrder = 6; return sp;
  }
  function makeAvatar(color) {
    var mat = new THREE.MeshLambertMaterial({ color: color }), g = new THREE.Group();
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 12), mat);
    var visor = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.05, 0.05), new THREE.MeshLambertMaterial({ color: 0x231a16 })); visor.position.set(0, 0.01, -0.11);
    var body = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.8, 16), mat); body.position.y = -0.6;
    g.add(head, visor, body); worldRoot.add(g);
    var hl = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), mat), hr = hl.clone(); worldRoot.add(hl, hr);
    return { g: g, mat: mat, hl: hl, hr: hr, tag: null, name: '', color: '', yaw: 0 };
  }
  function dropAvatar(a) {
    worldRoot.remove(a.g, a.hl, a.hr);
    a.g.traverse(function (m) { if (m.isMesh) { m.geometry.dispose(); m.material.dispose(); } }); a.hl.geometry.dispose();
    if (a.tag) { a.tag.material.map.dispose(); a.tag.material.dispose(); }
  }
  function clearAvatars() { avatars.forEach(dropAvatar); avatars.clear(); }
  function syncAvatars(dt) {
    if (!net) { if (avatars.size) clearAvatars(); return; }
    var seen = new Set(), k = 1 - Math.exp(-dt * 12), me = toContent(headWorld(_me));
    net.peers().forEach(function (p) {
      if (p.isMe) return;
      var pr = p.presence || {}; if (!Array.isArray(pr.h) || pr.h.length < 4) return;
      seen.add(p.id);
      var a = avatars.get(p.id), color = peerColor(p);
      if (!a) { a = makeAvatar(color); a.g.position.set(+pr.h[0] || 0, +pr.h[1] || 0, +pr.h[2] || 0); avatars.set(p.id, a); }
      var nm = String(pr.nm || 'Someone').slice(0, 20);
      if (nm !== a.name || color !== a.color) {
        a.name = nm; a.color = color; a.mat.color.set(color);
        if (a.tag) { a.g.remove(a.tag); a.tag.material.map.dispose(); a.tag.material.dispose(); }
        a.tag = nameTag(nm, color); a.tag.position.y = 0.32; a.g.add(a.tag);
      }
      a.g.position.lerp(tmpV.set(+pr.h[0] || 0, +pr.h[1] || 0, +pr.h[2] || 0), k);
      var sc = clamp(+pr.sc || 1, 0.05, 30); a.g.scale.setScalar(sc); a.hl.scale.setScalar(sc); a.hr.scale.setScalar(sc);
      a.g.visible = a.g.position.distanceTo(me) > 0.7 * Math.max(sc, ar.active ? 1 / ar.scale : state.pscale); // don't draw someone standing inside your head
      var dy = (+pr.h[3] || 0) - a.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); a.yaw += dy * k; a.g.rotation.y = a.yaw;
      moveHand(a.hl, pr.hl, k); moveHand(a.hr, pr.hr, k);
    });
    avatars.forEach(function (a, id) { if (!seen.has(id)) { dropAvatar(a); avatars.delete(id); } });
  }
  function moveHand(m, v, k) {
    m.visible = Array.isArray(v);
    if (m.visible) m.position.lerp(tmpV.set(+v[0] || 0, +v[1] || 0, +v[2] || 0), k);
  }

  // ---------- Flat-screen input ----------
  var keys = new Set();
  var keyboardNav = false; // true after Tab: someone is moving through the buttons with the keyboard
  document.addEventListener('pointerdown', function () { keyboardNav = false; }, true);
  window.addEventListener('keydown', function (e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
    var k = e.key.toLowerCase();
    if (k === 'tab') { keyboardNav = true; return; }
    var onControl = keyboardNav && e.target && e.target !== document.body && e.target !== canvas && e.target.closest && e.target.closest('button, a[href], [role="tab"], [tabindex]');
    if (onControl && (k === ' ' || k === 'enter' || k.indexOf('arrow') === 0)) return;
    if ((e.ctrlKey || e.metaKey) && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); doRedo(); return; }
    if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); doUndo(); return; }
    if ((e.ctrlKey || e.metaKey) && k === 'd') { e.preventDefault(); runAct('copy'); return; }
    if ((e.ctrlKey || e.metaKey) && k === 'c' && e.altKey) { e.preventDefault(); runAct('gclip'); return; }
    if ((e.ctrlKey || e.metaKey) && k === 'c' && !(window.getSelection && String(window.getSelection()))) { e.preventDefault(); runAct('clip'); return; }
    if ((e.ctrlKey || e.metaKey) && k === 'v') { e.preventDefault(); runAct('paste'); return; }
    keys.add(k);
    if (e.shiftKey && /^Digit[1-4]$/.test(e.code)) markPlace(+e.code.slice(5));
    else if (k >= '1' && k <= '9') { var inTab = []; TOOLS.forEach(function (t, j) { if (t.tab === state.tab) inTab.push(j); }); if (inTab[+k - 1] !== undefined) setTool(inTab[+k - 1]); }
    else if (k === 'n') toggleSnap();
    else if ((k === '=' || k === '+') && sel.size) runAct('size+');
    else if (k === '-' && sel.size) runAct('size-');
    else if (k === 'x') runAct('flipx');
    else if (k === 'v') setTab(TABS_UI[(TABS_UI.indexOf(state.tab) + 1) % TABS_UI.length]);
    else if (k === 'z') doUndo();
    else if (k === 'f') toggleFly();
    else if (k === 'h') goPlace(0);
    else if (k === 'p') cyclePlace();
    else if (k === 'g') cycleSize(1);

    else if (k === '[') setSize(state.size - 0.05);
    else if (k === ']') setSize(state.size + 0.05);
    else if (k === 'c') cycleColor(1);
    else if (k === 'delete' || k === 'backspace') { if (sel.size) { e.preventDefault(); runAct('delete'); } }
    else if (k === 'escape') setSelection([]);
    else if (k === 'i') setPanelsOff(!document.body.classList.contains('panels-off'));
    if (k === ' ' || k.indexOf('arrow') === 0) e.preventDefault();
  });
  window.addEventListener('keyup', function (e) { keys.delete(e.key.toLowerCase()); });
  window.addEventListener('blur', function () { keys.clear(); });

  var raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2(), hover = null, pointers = new Map();
  var canvasRect = { left: 0, top: 0, width: 1, height: 1 }; // updated on resize: reading it every frame forces layout
  function clientRay(x, y) {
    var r = canvasRect;
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    camera.updateMatrixWorld(true); raycaster.setFromCamera(ndc, camera);
    return raycaster.ray;
  }
  function startUse(p) { ensureAudio(); p.mode = 'use'; var ray = clientRay(p.x, p.y); p.use = beginUse(ray.origin.clone(), ray.direction.clone(), performance.now()); }
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  canvas.addEventListener('pointerdown', function (e) {
    if (!menu.hidden) closeMenu();
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { }
    var p = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, mode: 'pending', use: null, timer: 0 };
    pointers.set(e.pointerId, p);
    var arrow = (e.pointerType !== 'mouse' || e.button === 0) && navArrowAt(e.clientX, e.clientY);
    // An arrow steps when you let go, or walks while you hold it; dragging from it still looks around.
    if (arrow) { p.mode = 'nav'; p.arrow = arrow; p.timer = setTimeout(function () { if (p.mode === 'nav') { p.mode = 'navhold'; if (navTap(arrow)) nav.hold = true; } }, NAV_HOLD_MS); return; }
    if (e.pointerType === 'mouse') { if (e.button === 0 && !e.altKey) startUse(p); else p.mode = 'look'; }
    else p.timer = setTimeout(function () { if (p.mode === 'pending') startUse(p); }, 260);
  });
  canvas.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'mouse') { hover = hover || { x: 0, y: 0 }; hover.x = e.clientX; hover.y = e.clientY; }
    var p = pointers.get(e.pointerId); if (!p) return;
    var dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if ((p.mode === 'pending' || p.mode === 'nav') && Math.hypot(p.x - p.sx, p.y - p.sy) > 9) { p.mode = 'look'; clearTimeout(p.timer); }
    if (p.mode === 'look') {
      var s = e.pointerType === 'mouse' ? 0.004 : 0.006;
      rig.rotation.y -= dx * s; pitch = clamp(pitch - dy * s, -1.45, 1.45); camera.rotation.set(pitch, 0, 0);
    }
  });
  function endPointer(e) {
    var p = pointers.get(e.pointerId); if (!p) return;
    clearTimeout(p.timer);
    if (p.mode === 'nav') navTap(p.arrow);
    else if (p.mode === 'navhold') { if (nav) nav.hold = false; }
    else if (p.mode === 'pending') { startUse(p); endUse(p.use); }
    else if (p.mode === 'use') endUse(p.use);
    pointers.delete(e.pointerId);
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') hover = null; });
  canvas.addEventListener('wheel', function (e) { e.preventDefault(); setSize(state.size * (e.deltaY > 0 ? 0.92 : 1.08)); }, { passive: false });

  var stick = { x: 0, y: 0, id: null }, stickEl = $('#stick'), knob = $('#stick .knob');
  function stickMove(e) {
    var r = stickEl.getBoundingClientRect(), R = r.width / 2, x = (e.clientX - r.left - R) / R, y = (e.clientY - r.top - R) / R, l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    stick.x = x; stick.y = y; knob.style.transform = 'translate(' + (x * R * 0.55) + 'px,' + (y * R * 0.55) + 'px)';
  }
  stickEl.addEventListener('pointerdown', function (e) { stick.id = e.pointerId; try { stickEl.setPointerCapture(e.pointerId); } catch (err) { } stickMove(e); });
  stickEl.addEventListener('pointermove', function (e) { if (e.pointerId === stick.id) stickMove(e); });
  function stickEnd(e) { if (e.pointerId !== stick.id) return; stick.id = null; stick.x = stick.y = 0; knob.style.transform = ''; }
  stickEl.addEventListener('pointerup', stickEnd); stickEl.addEventListener('pointercancel', stickEnd);
  var vert = { up: false, down: false };
  [['#up', 'up'], ['#down', 'down']].forEach(function (pair) {
    var el = $(pair[0]);
    el.addEventListener('pointerdown', function (e) { vert[pair[1]] = true; try { el.setPointerCapture(e.pointerId); } catch (err) { } });
    el.addEventListener('pointerup', function () { vert[pair[1]] = false; });
    el.addEventListener('pointercancel', function () { vert[pair[1]] = false; });
  });

  var flatPreview = makePreview();
  function flatFrame(dt, now) {
    var mz = 0, mx = 0, my = 0;
    if (keys.has('w') || keys.has('arrowup')) mz += 1;
    if (keys.has('s') || keys.has('arrowdown')) mz -= 1;
    if (keys.has('d') || keys.has('arrowright')) mx += 1;
    if (keys.has('a') || keys.has('arrowleft')) mx -= 1;
    var stickResize = state.stickResize && sel.size;
    var rise = 0;
    if (stickResize) resizeLive(dt, stick.x, -stick.y, 0, 0);
    else if (prefs.nav) { // the arrows walk; the stick goes up and down (Z, the height axis) and turns
      if (liveResize) resizeLive(dt, 0, 0, 0, 0);
      rig.rotation.y -= stick.x * 1.9 * dt; rise = Math.abs(stick.y) > 0.15 ? -stick.y : 0;
      if (rise > 0 && !state.fly) { state.fly = true; vy = 0; updateHud(); }
      if (state.fly) my += rise;
    } else { mx += stick.x; mz -= stick.y; if (liveResize) resizeLive(dt, 0, 0, 0, 0); }
    var jump = keys.has(' ') || vert.up;
    if (state.fly) { if (keys.has(' ') || keys.has('e') || vert.up) my += 1; if (keys.has('shift') || keys.has('q') || vert.down) my -= 1; }
    var boost = 1, nm = motionReduced() ? null : navInput(); // reduced motion: arrow steps happen in navBlink instead
    if (nm) { mx += nm[0]; mz += nm[1]; boost = NAV_BOOST; }
    var fx0 = rig.position.x, fz0 = rig.position.z;
    movePlayer(dt, clamp(mx, -1, 1), clamp(mz, -1, 1), my, jump, boost);
    if (nm) navMoved(Math.hypot(rig.position.x - fx0, rig.position.z - fz0), dt);
    if (rise < 0 && state.fly && solid(rig.position.x, rig.position.y - 0.08 * state.pscale, rig.position.z)) { state.fly = false; vy = 0; updateHud(); } // down onto the ground: walking again
    syncWalkView(); syncNav(now);
    var aim = null;
    pointers.forEach(function (p) {
      if (p.mode !== 'use' || !p.use) return;
      var ray = clientRay(p.x, p.y), hit = hitTest(ray.origin, ray.direction);
      updateUse(p.use, ray.origin, ray.direction, now, hit);
      if (!aim) aim = hit;
    });
    if (!aim && hover) { var ray = clientRay(hover.x, hover.y); aim = hitTest(ray.origin, ray.direction); }
    showPreview(flatPreview, aim);
  }

  // ---------- Ground arrows: Street View-style steps for phones ----------
  // Four chevrons lie on the ground just ahead of you (forward, left, right, back), turning as you look round.
  // Tap one to step about three metres that way; hold it to keep walking. A dimmed arrow means clay is in the way.
  var NAV_STEP = 3, NAV_BOOST = 1.8, NAV_HOLD_MS = 380, NAV_DIRS = [[0, 'forward'], [Math.PI / 2, 'left'], [-Math.PI / 2, 'right'], [Math.PI, 'back']];
  if (typeof prefs.nav !== 'boolean') prefs.nav = !!coarse;
  var nav = null, navGroup = new THREE.Group(), navArrows = [], navLast = 0, navHover = null;
  navGroup.visible = false; scene.add(navGroup);
  (function () {
    var sh = new THREE.Shape([[0, 0.55], [0.6, -0.05], [0.42, -0.25], [0, 0.17], [-0.42, -0.25], [-0.6, -0.05]].map(function (q) { return new THREE.Vector2(q[0], q[1]); }));
    var face = new THREE.ShapeGeometry(sh).rotateX(-Math.PI / 2), edge = face.clone().scale(1.22, 1, 1.22).translate(0, -0.002, 0.01), disc = new THREE.CircleGeometry(0.85, 16).rotateX(-Math.PI / 2);
    var flat = function (color, opacity, order) { var m = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: opacity, depthTest: false, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, forceSinglePass: true }); return { m: m, order: order }; };
    NAV_DIRS.forEach(function (d, i) {
      var g = new THREE.Group(), fm = flat(0xffffff, 0.95, 9), em = flat(0x231a16, 0.68, 8);
      var f = new THREE.Mesh(face, fm.m), e = new THREE.Mesh(edge, em.m), hit = new THREE.Mesh(disc, fm.m);
      f.renderOrder = 9; e.renderOrder = 8; hit.visible = false; f.frustumCulled = e.frustumCulled = false;
      g.add(e, f, hit); navGroup.add(g);
      navArrows.push({ a: d[0], name: d[1], g: g, face: f, hit: hit, mat: fm.m, y: null, blocked: false, pulse: 0, dir: new THREE.Vector3() });
    });
  })();
  var navBottom = innerHeight * 0.8, navHead = new THREE.Vector3(), navO = new THREE.Vector3(), DOWN = new THREE.Vector3(0, -1, 0), navReach = { max: 1 };
  function navLayout(bottomY) { var sr = sceneRect(); navBottom = Math.min(bottomY - sr.y - 52, sr.h * 0.88); } // from measure(), in the 3D view's own pixels
  function navShown() {
    if (!prefs.nav || renderer.xr.isPresenting) return false;
    for (var p of pointers.values()) if (p.mode === 'use') return false; // out of the way while you sculpt
    return true;
  }
  function syncNav(now) {
    navGroup.visible = navShown(); if (!navGroup.visible) return;
    var S = state.pscale, yaw = headYaw(), feet = rig.position.y, head = headWorld(navHead);
    var probe = now - navLast > 120; if (probe) navLast = now;
    var behind = walkBehind();
    // Far enough ahead that, looking level, the nearest arrow sits just above the tray (or the bottom edge, panels hidden).
    var eye = Math.max(0.3 * S, head.y - feet), vHalf = THREE.MathUtils.degToRad(camera.fov) / 2, hHalf = Math.atan(Math.tan(vHalf) * camera.aspect);
    var vh = canvasRect.height, ang = Math.max(0.12, Math.atan((navBottom - vh / 2) / (vh / 2 / Math.tan(vHalf)))), near = clamp(eye / Math.tan(ang), 1.2 * S, 8 * S);
    // Sized and spread with their distance, so they read the same on screen however far ahead they sit.
    var r = clamp(near * Math.tan(hHalf) * 0.62, 0.6 * S, 2.4 * S), D = near + r, unit = clamp(near * 0.19, 0.8 * S, 2.6 * S), fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    for (var ai = 0; ai < navArrows.length; ai++) {
      var n = navArrows[ai], dy = yaw + n.a; n.dir.set(-Math.sin(dy), 0, -Math.cos(dy));
      // Walk view: a ring round your feet, so you walk in the middle of it. Through your eyes: just ahead, above the tray.
      var x = behind ? head.x + n.dir.x * NAV_RING * S : head.x + fx * D + n.dir.x * r, z = behind ? head.z + n.dir.z * NAV_RING * S : head.z + fz * D + n.dir.z * r;
      if (probe) {
        // Rest it on whatever is underfoot there (land or clay), and check the path a step that way.
        navReach.max = 4 * S; var h = hitTest(navO.set(x, feet + 1.5 * S, z), DOWN, navReach), gy = h ? h.y : feet;
        n.y = n.y === null || Math.abs(n.y - gy) > S ? gy : n.y + (gy - n.y) * 0.5;
        n.blocked = false; for (var t = 0.25 * S; t <= NAV_STEP * S + 0.01 && !n.blocked; t += 0.25 * S) n.blocked = bodyBlocked(head.x + n.dir.x * t, head.z + n.dir.z * t, feet, S);
      }
      var big = (n.a === 0 ? 1.1 : 0.9) * (behind ? 0.62 * S : unit) * (1 + 0.25 * Math.max(0, n.pulse - now) / 300) * (navHover === n ? 1.12 : 1);
      n.g.position.set(x, (n.y === null ? feet : n.y) + 0.05 * S, z); n.g.rotation.y = dy; n.g.scale.setScalar(big);
      n.mat.color.setHex(navHover === n && !n.blocked ? 0x8fc2b0 : n.blocked ? 0xe9a08a : 0xffffff); n.mat.opacity = n.blocked ? 0.45 : 0.93;
    }
    if (hover && pointers.size === 0) { var hh = navArrowAt(hover.x, hover.y); if (hh !== navHover) { navHover = hh; canvas.style.cursor = hh ? 'pointer' : ''; } }
  }
  var navRay = new THREE.Raycaster();
  function navArrowAt(x, y) {
    if (!navGroup.visible) return null;
    var r = clientRay(x, y); navRay.set(r.origin, r.direction); navGroup.updateMatrixWorld(true);
    var best = null, bd = Infinity;
    navArrows.forEach(function (n) { var h = navRay.intersectObject(n.hit, false)[0]; if (h && h.distance < bd) { bd = h.distance; best = n; } });
    return best;
  }
  function navTap(n) {
    ensureAudio(); n.pulse = performance.now() + 300;
    if (n.blocked) { sound('tap'); toast(state.fly ? 'Clay is in the way.' : 'Clay is in the way. Fly over it or carve a path.'); return false; }
    sound('tap');
    nav = { x: n.dir.x, z: n.dir.z, left: NAV_STEP * state.pscale, hold: false, stuck: 0, arrow: n };
    if (motionReduced()) navBlink();
    return true;
  }
  // Reduced motion: a quick fade covers the view, the step happens all at once underneath (with the same walking rules:
  // walls, steps, ground), and the fade lifts. Holding an arrow repeats it, one step at a time.
  var blinkBusy = false;
  function navBlink() {
    if (blinkBusy || !nav) return; blinkBusy = true;
    var el = $('#blink'); el.classList.add('on');
    setTimeout(function () {
      for (var guard = 0; nav && guard < 400; guard++) {
        var before = nav.left, nm = navInput(), x0 = rig.position.x, z0 = rig.position.z;
        movePlayer(1 / 60, clamp(nm[0], -1, 1), clamp(nm[1], -1, 1), 0, false, NAV_BOOST);
        navMoved(Math.hypot(rig.position.x - x0, rig.position.z - z0), 1 / 60);
        if (nav && nav.left > before) break; // a held arrow has armed the next step: one step per fade
      }
      syncWalkView(); el.classList.remove('on'); blinkBusy = false;
      if (nav) setTimeout(function () { if (nav && nav.hold) navBlink(); else nav = null; }, 380);
    }, 100);
  }
  // The arrows' share of the walk input this frame, in the same units as the joystick.
  function navInput() {
    if (!nav) return null;
    var yaw = headYaw(), fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    var ease = nav.hold ? 1 : clamp(nav.left / (0.8 * state.pscale), 0.3, 1);
    return [(nav.x * rx + nav.z * rz) * ease, (nav.x * fx + nav.z * fz) * ease];
  }
  function navMoved(d, dt) {
    if (!nav) return;
    nav.left -= d;
    nav.stuck = d < 0.15 * state.pscale * dt ? nav.stuck + 1 : 0;
    if (nav.stuck > 8) { if (nav.hold) toast('Clay is in the way.'); nav = null; return; }
    if (nav.left <= 0) { if (nav.hold && !nav.arrow.blocked) { var n = nav.arrow; nav.x = n.dir.x; nav.z = n.dir.z; nav.left += NAV_STEP * state.pscale; } else nav = null; }
  }
  function setNav(on) { prefs.nav = on; savePrefs(); nav = null; $('#navBtn').textContent = 'Ground arrows: ' + (on ? 'on' : 'off'); document.body.classList.toggle('arrow-nav', on); }
  $('#navBtn').addEventListener('click', function () { setNav(!prefs.nav); closeMenu(); toast(prefs.nav ? 'Ground arrows on: tap one to step that way, hold to keep walking.' : 'Ground arrows off'); });
  setNav(prefs.nav);

  // ---------- Walk view: the camera a little behind and above you, so you see yourself among the arrows ----------
  if (prefs.walk !== 'behind' && prefs.walk !== 'eyes') prefs.walk = coarse ? 'behind' : 'eyes';
  var NAV_RING = 1.25, selfAv = null, walkDir = new THREE.Vector3(), walkHead = new THREE.Vector3(), walkReach = { max: 1 };
  function walkBehind() { return prefs.walk === 'behind' && !renderer.xr.isPresenting; }
  function syncWalkView() {
    var on = walkBehind(), S = state.pscale;
    if (on) {
      // Pull the camera in when clay stands between you and it.
      // Back far enough that the ring of arrows fits across the screen (narrow on a phone held upright),
      // then tilted so you stand in the middle of the clear space between the top bar and the tray.
      var vh = canvasRect.height, top0 = fold.mode === 'book' ? 24 : 90, vHalf = THREE.MathUtils.degToRad(camera.fov) / 2, hHalf = Math.atan(Math.tan(vHalf) * camera.aspect), fpx = vh / 2 / Math.tan(vHalf);
      var back = clamp((NAV_RING + 0.75) / Math.tan(hHalf), 3, 9), up = 0.45 * back;
      var head = headWorld(walkHead), yaw = rig.rotation.y;
      walkDir.set(0, up, back).applyAxisAngle(UP, yaw).multiplyScalar(S);
      var len = walkDir.length(); walkReach.max = len; var h = hitTest(head, walkDir.normalize(), walkReach), k = h ? Math.max(0.12, (h.dist - 0.3 * S) / len) : 1;
      var yT = top0 + (navBottom + 52 - top0) * 0.56, down = Math.atan2(EYE + up * k, back * k) - Math.atan((yT - vh / 2) / fpx);
      camera.position.set(0, EYE + up * k, back * k); camera.rotation.set(clamp(pitch + 0.18 - down, -1.5, 1.1), 0, 0); // drag still tilts from there
      if (!selfAv) { selfAv = makeAvatar(PALETTE[state.avatar][1]); selfAv.hl.visible = selfAv.hr.visible = false; }
      selfAv.mat.color.setStyle(PALETTE[state.avatar][1]);
      selfAv.g.position.set(rig.position.x, rig.position.y + 1.02 * S, rig.position.z); selfAv.g.rotation.y = yaw; selfAv.g.scale.setScalar(S);
    } else if (camera.position.z !== 0 && !renderer.xr.isPresenting) { camera.position.set(0, EYE, 0); camera.rotation.set(pitch, 0, 0); }
    if (selfAv) selfAv.g.visible = on;
  }
  function setWalk(v) { prefs.walk = v; savePrefs(); $('#walkBtn').textContent = 'View: ' + (v === 'behind' ? 'behind you' : 'through your eyes'); } // the next frame moves the camera
  $('#walkBtn').addEventListener('click', function () { setWalk(prefs.walk === 'behind' ? 'eyes' : 'behind'); closeMenu(); toast(prefs.walk === 'behind' ? 'Walk view: you’re in the middle of the arrows' : 'Through your eyes'); });
  setWalk(prefs.walk);

  // ---------- Tourist view on the flat screen ----------
  var wasTourist = null;
  function syncTourist() {
    var t = isTourist(), forced = !visitorsMayBuild();
    document.body.classList.toggle('tourist', t);
    $('#tourBar').hidden = !t; $('#tourWhy').textContent = forced ? 'The owner lets visitors explore, not build.' : 'Look round and explore.';
    $('#tourLeave').hidden = !state.tour || forced;
    $('#tourBtn').textContent = 'Tourist view: ' + (t ? 'on' : 'off');
    if (t !== wasTourist) {
      wasTourist = t; panel.dirty = true; queueMeasure();
      if (t) { if (sel.size) setSelection([]); if (state.board) pickBoard(null); pointers.forEach(function (p) { if (p.mode === 'use') { endUse(p.use); p.mode = 'look'; } }); }
    }
  }
  function setTour(on) {
    if (!on && !visitorsMayBuild()) { toast(touristWhy()); return; }
    state.tour = on; savePrefs(); syncTourist(); pushPresence(true);
    toast(on ? 'Tourist view: look round and explore. Nothing you do changes the world.' : 'Back to building');
  }
  $('#tourBtn').addEventListener('click', function () { closeMenu(); setTour(!state.tour); });
  $('#tourLeave').addEventListener('click', function () { setTour(false); });
  $('#tourScene').addEventListener('click', function () { var keys = envKeys(), i = keys.indexOf(state.env); setEnv(keys[(i + 1) % keys.length]); $('#tourScene').textContent = 'Scene: ' + envName(state.env); });
  $('#visitBtn').addEventListener('click', function () {
    prefs.visitorsBuild = !prefs.visitorsBuild; savePrefs();
    if (net && hosting) net.visitorsBuild = prefs.visitorsBuild;
    pushPresence(true); updateNetUi();
    toast(prefs.visitorsBuild ? 'Visitors can build in your world' : 'Visitors can explore your world, not change it');
  });

  // ---------- VR: wrist panel (laser-clickable), controllers ----------
  var PW = 1024, PH = 804;
  var panel = { canvas: document.createElement('canvas'), page: 'sculpt', buttons: [], hover: -1, dirty: true, drawn: 0, last: {}, shown: true, turn: null };
  panel.canvas.width = PW; panel.canvas.height = PH;
  panel.tex = new THREE.CanvasTexture(panel.canvas);
  panel.mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3 * PH / PW), new THREE.MeshBasicMaterial({ map: panel.tex, transparent: true, side: THREE.DoubleSide, forceSinglePass: true }));
  panel.mesh.position.set(0, 0.11, 0.02); panel.mesh.rotation.x = -0.8;
  // While the panel is hidden, a small tab stays on the wrist: point at it and pull the trigger to bring the panel back.
  var TW = 512, TH = 160;
  panel.tab = { canvas: document.createElement('canvas'), hover: false, drawn: null };
  panel.tab.canvas.width = TW; panel.tab.canvas.height = TH;
  panel.tab.tex = new THREE.CanvasTexture(panel.tab.canvas);
  panel.tab.mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.1 * TH / TW), new THREE.MeshBasicMaterial({ map: panel.tab.tex, transparent: true, side: THREE.DoubleSide, forceSinglePass: true }));
  panel.tab.mesh.position.set(0, 0.06, 0.02); panel.tab.mesh.rotation.x = -0.8; panel.tab.mesh.visible = false;
  function drawPanelTab() {
    var t = panel.tab; if (t.drawn === t.hover) return; t.drawn = t.hover;
    var g = t.canvas.getContext('2d'), F = '"Bricolage Grotesque", system-ui, sans-serif';
    g.clearRect(0, 0, TW, TH);
    rr(g, 4, 4, TW - 8, TH - 8, 40); g.fillStyle = t.hover ? 'rgba(66,52,44,0.97)' : 'rgba(35,26,22,0.95)'; g.fill();
    g.lineWidth = t.hover ? 8 : 5; g.strokeStyle = '#8fc2b0'; g.stroke();
    g.fillStyle = '#f3e9dc'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '700 56px ' + F; g.fillText('Show panel', TW / 2, 64);
    g.fillStyle = '#bfae9c'; g.font = '500 32px ' + F; g.fillText('or hold Y', TW / 2, 118);
    t.tex.needsUpdate = true;
  }
  // The wrist panel turns between four categories (like faces of a prism), each with its own pages.
  var CATS = [['create', 'Create & Construct', [['sculpt', 'Sculpt'], ['shapes', 'Shapes'], ['paint', 'Paint'], ['edit', 'Edit'], ['places', 'Places'], ['room', 'Room']]],
    ['media', 'Sounds & Images', [['skin', 'Skins'], ['sounds', 'Sounds'], ['scenes', 'Scenes']]], ['social', 'Social links', [['links', 'Links']]], ['phone', 'Phone', [['phone', 'Phone']]]];
  // Tourists get one side: getting around, scenes and the room. No making or changing.
  var TOUR_CATS = [['tour', 'Tourist view', [['places', 'Places'], ['scenes', 'Scenes'], ['room', 'Room']]]];
  function cats() { return isTourist() ? TOUR_CATS : CATS; }
  function catOf(page) { var C = cats(); for (var i = 0; i < C.length; i++) if (C[i][2].some(function (p) { return p[0] === page; })) return C[i]; return C[0]; }
  var PANEL_TOP = 50; // the page row's height: page content sits this much lower than the category row
  function panelLayout() {
    if (!catOf(panel.page)[2].some(function (p) { return p[0] === panel.page; })) panel.page = catOf(panel.page)[2][0][0];
    var C = cats(), B = [], P = panel.page, ids = selList(), cat = catOf(P), cw0 = (PW - 16 - 8 * (C.length - 1)) / C.length;
    C.forEach(function (c, i) { B.push({ x: 8 + i * (cw0 + 8), y: 8, w: cw0, h: 62, label: c[1], active: c === cat, tab: true, run: function () { turnPanel(c[0]); } }); });
    if (cat[2].length > 1) {
      var pw = (PW - 16 - 8 * (cat[2].length - 1)) / cat[2].length;
      cat[2].forEach(function (pg, i) { B.push({ x: 8 + i * (pw + 8), y: 76, w: pw, h: 50, label: pg[1], active: P === pg[0], small: true, run: function () { panel.page = pg[0]; panel.last[cat[0]] = pg[0]; if (TABS_UI.indexOf(pg[0]) >= 0) setTab(pg[0]); } }); });
    }
    var first = B.length; // page content is laid out from y = 96, then moved down below the page row
    function grid(items, cols, y0, h) {
      var w = (PW - 16 - (cols - 1) * 8) / cols;
      items.forEach(function (it, i) { B.push(Object.assign({ x: 8 + (i % cols) * (w + 8), y: y0 + Math.floor(i / cols) * (h + 8), w: w, h: h }, it)); });
    }
    function note(y, text, h) { B.push({ x: 8, y: y, w: PW - 16, h: h || 34, label: text, info: true, small: true }); }
    function colorsAndSize(y) {
      grid(PALETTE.map(function (p, i) { return { swatch: p[1], glass: i === CRYSTAL, active: state.color === i, run: function () { state.color = i; updateHud(); } }; }), PALETTE.length, y, 70);
      grid([{ label: 'Smaller', run: function () { setSize(state.size / 1.15); } }, { label: sizeLabel(), info: true }, { label: 'Bigger', run: function () { setSize(state.size * 1.15); } }], 3, y + 80, 64);
    }
    if (P === 'sculpt' || P === 'shapes' || P === 'paint') {
      var list = []; TOOLS.forEach(function (t, i) { if (t.tab === P) list.push({ label: t.name, active: state.tool === i, run: function () { setTool(i); } }); });
      grid(list, P === 'shapes' ? 6 : 4, 96, 92);
      colorsAndSize(304);
      if (P === 'shapes') {
        note(456, clipLabel() + (clip ? ' · Paste stamps it where you point' : ''), 40);
        grid([{ label: 'Cast solid', active: !state.hollow, run: function () { setCast(false); } }, { label: 'Cast hollow', active: state.hollow, run: function () { setCast(true); } }], 2, 504, 60);
      }
    } else if (P === 'skin') {
      grid([{ label: 'Snapshot of your view', run: function () { runAct('photo:snap'); } }, { label: 'Camera photo', run: function () { runAct('photo:cam'); } }], 2, 96, 76);
      if (!photos.length) note(184, 'No photos yet: take a snapshot, or send photos from your phone', 116);
      else grid(photos.map(function (p) { return { img: skinImage(p.id), active: state.skin === p.id, run: function () { state.skin = p.id; savePrefs(); renderSkinUI(); if (selList().length) applySkin(selList(), p.id); } }; }), 8, 184, 116);
      grid([{ label: 'Fit', info: true }].concat(FITS_UI.map(function (f) { return { label: f[1], active: state.fit === f[0], run: function () { runAct('fit:' + f[0]); } }; })), 5, 312, 66);
      grid([{ label: 'Photo', info: true }].concat(MOVES_UI.map(function (m) { return { label: m[1], run: function () { runAct('pos:' + m[0]); } }; })), 10, 386, 66);
      grid([{ label: 'Put on selection', run: function () { runAct('skin'); } }, { label: 'Remove skin', run: function () { runAct('unskin'); } },
        { label: toolId() === 'skin' ? 'Skin tool ✓' : 'Skin tool', active: toolId() === 'skin', run: function () { runAct('skintool'); } }], 3, 460, 70);
      note(538, skinTargetLabel());
      note(576, 'Skin tool: point at a shape to dress it, at the land to lay the photo down, or at a land skin to pick it');
    } else if (P === 'sounds') {
      note(96, media.sounds.length ? 'Your sounds: point and click to hear and pick one' : 'No sounds yet: record some on your phone (Phone)');
      grid(media.sounds.slice(0, 12).map(function (r) { return { label: r.name, active: state.sound === r.id, run: function () { state.sound = r.id; playSoundId(r.id, 0.9); } }; }), 4, 136, 56);
      grid([{ label: 'On selection: touch', run: function () { soundOnShapes(selList(), state.sound, false); } }, { label: 'On selection: loop', run: function () { soundOnShapes(selList(), state.sound, true); } },
        { label: 'Remove from selection', run: function () { soundOffShapes(selList()); } }], 3, 334, 60);
      var slot = SLOTS[panel.slot || 0];
      grid([{ label: prefs.ambient[state.env] && prefs.ambient[state.env] === state.sound ? 'Scene sound ✓' : 'Scene sound', active: !!state.sound && prefs.ambient[state.env] === state.sound, run: function () { setSceneSound(prefs.ambient[state.env] === state.sound ? null : state.sound); } },
        { label: 'Tool: ' + slot[1] + ' ▸', run: function () { panel.slot = ((panel.slot || 0) + 1) % SLOTS.length; } },
        { label: prefs.toolSounds[slot[0]] && prefs.toolSounds[slot[0]] === state.sound ? 'Tool sound ✓' : 'Set tool sound', active: !!state.sound && prefs.toolSounds[slot[0]] === state.sound, run: function () { setToolSound(slot[0], prefs.toolSounds[slot[0]] === state.sound ? null : state.sound); } }], 3, 402, 60);
      note(474, 'Scene sound for ' + envName(state.env) + ': ' + soundName(prefs.ambient[state.env] || null));
      note(512, ids.length ? selLabelText() + ' selected' : 'Select shapes (Create ▸ Shapes ▸ Select) to give them a sound');
    } else if (P === 'scenes') {
      note(96, 'Scenes, including 360° skies from your phone');
      grid(envKeys().slice(0, 15).map(function (n) { return { label: envName(n), active: state.env === n, run: function () { setEnv(n); } }; }), 5, 136, 60);
      note(352, 'Scene sound: ' + soundName(prefs.ambient[state.env] || null) + ' (pick a sound on Sounds, then Scene sound)');
    } else if (P === 'links') {
      if (!prefs.links.length) note(96, 'No links yet. Send them from your phone (Phone), or paste them on the flat screen', 60);
      else grid(prefs.links.slice(0, 8).map(function (l) { var inf = ClayMedia.parseSocial(l.url); return { label: inf.name + ' · ' + (inf.who || inf.label), active: state.link === l.id, run: function () { state.link = l.id; prefs.link = l.id; savePrefs(); setTool(boardTool()); } }; }), 2, 96, 56);
      grid([{ label: toolId() === 'board' ? 'Placing ✓ (point & click)' : 'Place billboard', active: toolId() === 'board', run: function () { setTool(boardTool()); } },
        { label: state.bbFix === 'shape' ? 'Sticks to shapes' : 'Fixed in space', run: function () { state.bbFix = state.bbFix === 'shape' ? 'space' : 'shape'; prefs.bbFix = state.bbFix; savePrefs(); } },
        { label: state.bbMode === 'auto' ? 'Plays when near' : 'Plays on click', run: function () { state.bbMode = state.bbMode === 'auto' ? 'click' : 'auto'; prefs.bbMode = state.bbMode; savePrefs(); } }], 3, 352, 60);
      var brec = state.board && studio.boards.get(state.board), bv = brec && boardViews.get(state.board), BA = function (label, act) { return { label: label, run: function () { boardAct(act); } }; };
      if (!brec || !bv) note(424, 'Pick a billboard to change it: Select tool, then point at one. Any other tool plays it', 60);
      else {
        note(424, 'Picked: ' + bv.info.label + (brec.at ? ' (on a shape)' : ' (fixed in space)'));
        grid([BA('Smaller', 'smaller'), BA('Bigger', 'bigger'), BA('16:9', 'wide'), BA('9:16', 'tall'), BA('Square', 'square'), BA('Post', 'post'),
          BA('◀', 'left'), BA('▶', 'right'), BA('▲', 'up'), BA('▼', 'down'), BA('Nearer', 'nearer'), BA('Back', 'farther'),
          BA('⟲', 'ccw'), BA('⟳', 'cw'), BA(brec.mode === 'auto' ? 'When near ✓' : 'On click ✓', 'mode'), brec.at ? BA('Fix in space', 'fix') : BA('Attach', 'attach'),
          { label: 'Watch', run: function () { watchOutside(state.board); } }, { label: 'Delete', run: deleteBoard }], 6, 462, 52);
      }
    } else if (P === 'phone') {
      B.push({ x: 8, y: 96, w: PW - 16, h: 70, label: 'Link code ' + linkCode() + ' · ' + linkStatus(), info: true });
      grid([{ label: link ? 'Turn link off' : 'Turn link on', active: !!link, run: function () { if (link) stopLink(); else startLink(); } }, { label: 'New code', run: newLinkCode }], 2, 176, 64);
      note(252, 'On your phone, open ' + phoneURL().replace(/^https?:\/\//, '').replace(/#.*$/, '') + ' and enter the code', 40);
      note(300, 'Your phone sends photos (Skins), 360° skies (Scenes), sounds (Sounds) and social links (Links)', 40);
      note(348, 'Skies ' + media.skies.length + ' · Sounds ' + media.sounds.length + ' · Photos ' + photos.length + ' · Links ' + prefs.links.length, 40);
    } else if (P === 'places') {
      grid([{ label: 'Start: ' + placeDesc(startPlace()), run: function () { goPlace(0); } }, { label: 'Next place ▸ (R stick click)', run: cyclePlace }], 2, 96, 76);
      for (var pi = 1; pi <= MAX_PLACES; pi++) (function (i) {
        var pt = places[i - 1], y = 180 + (i - 1) * 70, cur = placeIdx === i;
        B.push({ x: 8, y: y, w: 520, h: 68, label: 'Place ' + i + ': ' + (pt ? placeDesc(pt) : 'empty'), info: !pt, active: cur && !!pt, run: pt ? function () { goPlace(i); } : null });
        B.push({ x: 536, y: y, w: 236, h: 68, label: pt ? 'Mark again' : 'Mark here', run: function () { markPlace(i); } });
        B.push({ x: 780, y: y, w: 236, h: 68, label: 'Clear', info: !pt, run: function () { clearPlace(i); } });
      })(pi);
      var sizes = ar.active ? AR_SCALES : SIZES, curS = ar.active ? ar.scale : state.pscale;
      grid(sizes.map(function (s) { return { label: s[0], active: Math.abs(s[1] - curS) < 1e-6, run: function () { setScaleValue(s[1]); } }; })
        .concat([{ label: 'Smaller', run: function () { setScaleValue(curS / 1.25); } }, { label: 'Bigger', run: function () { setScaleValue(curS * 1.25); } }]), ar.active ? 5 : 6, 462, 64);
      B.push({ x: 8, y: 532, w: PW - 16, h: 50, label: (ar.active ? 'Board scale ' : 'Your size ') + scaleName(curS, ar.active), info: true });
      if (!ar.active) grid([{ label: myPortal() ? 'Go to portal' : 'No portal yet', info: !myPortal(), run: myPortal() ? goToPortal : null }, { label: myPortal() ? 'Move portal here' : 'Place portal here', run: placePortal }], 2, 590, 60);
    } else if (P === 'edit') {
      if (!ids.length) { B.push({ x: 8, y: 110, w: PW - 16, h: 120, label: 'Pick the Select tool and point at a shape', info: true }); grid([{ label: 'Go to Shapes', run: function () { panel.page = 'shapes'; } }], 1, 250, 80); }
      else {
        var A = function (label, act) { return { label: label, run: function () { runAct(act); } }; };
        var curL = clamp(Math.round(levelOf(ids)), 1, LEVELS), cw = (PW - 16 - 24 * 4) / LEVELS;
        for (var li = 1; li <= LEVELS; li++) (function (L) {
          B.push({ x: 8 + (L - 1) * (cw + 4), y: 96, w: cw, h: 44, label: L % 6 === 1 || L === LEVELS ? String(L) : '', small: true, active: L === curL, run: function () { runAct('level:' + L); } });
        })(li);
        note(146, levelLabel(ids) + '  ·  each level is twice the last', 32);
        grid([A('Level −', 'size-'), A('Level +', 'size+'), A('Wide −', 'wide-'), A('Wide +', 'wide+'), A('Tall −', 'tall-'), A('Tall +', 'tall+'),
          A('Deep −', 'deep-'), A('Deep +', 'deep+'), A('Taper −', 'taper-'), A('Taper +', 'taper+'), A('Twist −', 'twist-'), A('Twist +', 'twist+'),
          A('Lean −', 'lean-'), A('Lean +', 'lean+'), A('Bulge −', 'bulge-'), A('Bulge +', 'bulge+'), A('Spin ⟲', 'spin-'), A('Spin ⟳', 'spin+'),
          A('Tilt −', 'tilt-'), A('Tilt +', 'tilt+'), A('Raise', 'up'), A('Lower', 'down'), A('Drop', 'drop'), A('Recolor', 'recolor'),
          A('Duplicate', 'copy'), A('Flip ⇆', 'flipx'), A('Flip ⇅', 'flipy'), A('Group', 'group'), A('Ungroup', 'ungroup'), A('Delete', 'delete'),
          { label: allCrystal(ids) ? 'Crystal ✓' : 'Crystal', active: allCrystal(ids), run: function () { runAct('crystal'); } },
          A('Copy', 'clip'), A('Group copy', 'gclip'), { label: 'Paste tool', run: function () { setTool(TOOLS.findIndex(function (t) { return t.id === 'paste'; })); panel.page = 'shapes'; } },
          { label: state.part ? 'One part ✓' : 'One part', active: state.part, run: function () { runAct('part'); } },
          { label: state.multi ? 'Add more ✓' : 'Add more', active: state.multi, run: function () { runAct('multi'); } }], 6, 186, 62);
        grid([{ label: selLabelText(), info: true }, { label: 'Done', run: function () { runAct('done'); } }], 2, 186 + 6 * 70, 60);
      }
    } else { // room
      var peers = net ? net.peers() : [];
      var lines = (isTourist() ? 'Tourist view · ' : '') + (net ? (netMode === 'code' ? 'Room ' + netCode + ' · ' : 'Shared page · ') + peers.length + ' here' : 'Solo. Join a room on the flat page before entering VR.');
      B.push({ x: 8, y: 96, w: PW - 16, h: 80, label: lines, info: true });
      grid(peers.slice(0, 4).map(function (p) { return { label: p.isMe ? state.name + ' (you)' : String((p.presence && p.presence.nm) || 'Someone').slice(0, 20), swatchSmall: p.isMe ? PALETTE[state.avatar][1] : peerColor(p), info: true }; }), 2, 186, 60);
      if (ar.active) {
        grid(AR_SCALES.map(function (s) { return { label: s[0], active: Math.abs(ar.scale - s[1]) < 1e-6, run: function () { setArScale(s[1]); } }; }).concat([{ label: 'Move board (tap Y)', run: function () { ar.placed = false; } }]), 4, 340, 66);
        grid([{ label: 'Center on start', run: function () { ar.fcx = 4; ar.fcz = 4; } }, { label: switchLabel(), run: switchXR }, { label: 'Leave AR', run: leaveXR }], 3, 414, 66);
      } else grid([{ label: state.fly ? 'Flying (tap Y)' : 'Walking (tap Y)', run: toggleFly }, { label: 'Start (H)', run: function () { goPlace(0); } }, { label: switchLabel(), run: switchXR }, { label: 'Leave VR', run: leaveXR }], 4, 340, 74);
      note(500, isTourist() ? (visitorsMayBuild() ? 'Look round and explore. Leave tour to build. Hold Y to hide this panel.' : 'This world’s owner lets visitors explore, not build. Hold Y to hide this panel.') : 'Scenes are under Sounds & Images ▸ Scenes. Hold Y to hide or show this panel. Leave VR for the ⋯ menu: world files, rooms and settings.');
    }
    for (var k = first; k < B.length; k++) B[k].y += PANEL_TOP;
    // Always-there bar, like Open Blocks' undo/redo: undo, redo, snap, and hiding the panel.
    (isTourist() ? [['Hide panel', function () { setPanelShown(false); }, false]].concat(state.tour ? [['Leave tour', function () { setTour(false); }, false]] : [])
      : [['Undo', doUndo, false], ['Redo', doRedo, false], ['Snap: ' + (state.snap ? 'on' : 'off'), toggleSnap, state.snap], ['Hide panel', function () { setPanelShown(false); }, false]]).forEach(function (e, i) {
      B.push({ x: 8 + i * 168, y: 730, w: 160, h: 66, label: e[0], active: e[2], run: e[1] });
    });
    panel.buttons = B;
  }
  // Turn the wrist panel to another category: in the headset it swings round like a prism.
  function turnPanel(c) {
    var C = cats(), cat = C.filter(function (x) { return x[0] === c; })[0], cur = catOf(panel.page); if (!cat || cat === cur) return;
    if (renderer.xr.isPresenting && panel.mesh.visible && !motionReduced()) panel.turn = { t0: performance.now(), to: cat, dir: C.indexOf(cat) > C.indexOf(cur) ? 1 : -1, swapped: false };
    else showCategory(cat);
    sound('tap');
  }
  function showCategory(cat) { panel.page = panel.last[cat[0]] || cat[2][0][0]; if (TABS_UI.indexOf(panel.page) >= 0) setTab(panel.page); panel.dirty = true; }
  function animatePanel(now) {
    var t = panel.turn; if (!t) return;
    var p = Math.min(1, (now - t.t0) / 320);
    if (p >= 0.5 && !t.swapped) { t.swapped = true; showCategory(t.to); drawPanel(); panel.drawn = now; }
    panel.mesh.rotation.y = (p < 0.5 ? p * 2 : p * 2 - 2) * Math.PI / 2 * t.dir;
    if (p >= 1) { panel.mesh.rotation.y = 0; panel.turn = null; }
  }
  function setPanelShown(on) {
    panel.shown = on; panel.mesh.visible = on; panel.dirty = true;
    panel.tab.hover = false; panel.tab.mesh.visible = !on; if (!on) drawPanelTab();
    toast(on ? 'Wrist panel back' : 'Wrist panel hidden. Hold Y to bring it back.');
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function drawPanel() {
    panelLayout();
    var g = panel.canvas.getContext('2d'), F = '"Bricolage Grotesque", system-ui, sans-serif';
    g.clearRect(0, 0, PW, PH);
    rr(g, 2, 2, PW - 4, PH - 4, 36); g.fillStyle = 'rgba(35,26,22,0.95)'; g.fill(); g.lineWidth = 4; g.strokeStyle = '#8fc2b0'; g.stroke();
    panel.buttons.forEach(function (b, i) {
      if (!b.info || b.swatchSmall) {
        rr(g, b.x, b.y, b.w, b.h, 16);
        g.fillStyle = b.swatch ? b.swatch : b.active ? (b.tab ? '#f3e9dc' : '#8fc2b0') : i === panel.hover ? 'rgba(243,233,220,0.18)' : b.info ? 'rgba(0,0,0,0)' : 'rgba(243,233,220,0.07)';
        g.fill();
        if (b.img) { // photo thumbnail, cropped to fill
          if (b.img.complete && b.img.naturalWidth) {
            var iw = b.img.naturalWidth, ih = b.img.naturalHeight, k = Math.max(b.w / iw, b.h / ih), cw = b.w / k, ch = b.h / k;
            g.save(); g.clip(); g.drawImage(b.img, (iw - cw) / 2, (ih - ch) / 2, cw, ch, b.x, b.y, b.w, b.h); g.restore();
          }
          if (b.active || i === panel.hover) { rr(g, b.x, b.y, b.w, b.h, 16); g.lineWidth = b.active ? 8 : 5; g.strokeStyle = b.active ? '#8fc2b0' : 'rgba(243,233,220,0.6)'; g.stroke(); }
        }
        if (b.glass) { // clear glass: a pale wash with a diagonal glint
          var gr = g.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
          gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.45, '#d4e8f2'); gr.addColorStop(0.55, '#9fc3d6'); gr.addColorStop(1, '#f4fafd');
          g.fillStyle = gr; g.fill();
        }
        if (b.swatch && b.active) { g.lineWidth = 8; g.strokeStyle = '#f3e9dc'; g.stroke(); }
        if (b.swatch && i === panel.hover) { g.lineWidth = 5; g.strokeStyle = 'rgba(243,233,220,0.6)'; g.stroke(); }
      }
      if (b.swatchSmall) { g.fillStyle = b.swatchSmall; g.beginPath(); g.arc(b.x + 30, b.y + b.h / 2, 13, 0, Math.PI * 2); g.fill(); }
      if (b.label) {
        g.fillStyle = b.active ? (b.tab ? '#231a16' : '#13261f') : b.info ? '#bfae9c' : '#f3e9dc';
        g.font = (b.tab ? '800 26px ' : b.small ? '600 22px ' : b.info ? '500 30px ' : '600 30px ') + F; g.textAlign = b.swatchSmall ? 'left' : 'center'; g.textBaseline = 'middle';
        g.fillText(b.label, b.swatchSmall ? b.x + 54 : b.x + b.w / 2, b.y + b.h / 2 + 1, b.w - 16);
      }
    });
    var fl = panel.flash; if (fl && performance.now() < fl.until) { rr(g, fl.x, fl.y, fl.w, fl.h, 16); g.fillStyle = 'rgba(143,194,176,0.45)'; g.fill(); }
    g.textAlign = 'left'; g.fillStyle = '#8fc2b0'; g.font = '500 24px ' + F;
    g.fillText(isTourist() ? 'Tourist view' : TOOLS[state.tool].name + ' · ' + PALETTE[state.color][0] + ' · ' + sizeLabel(), 686, PH - 54, PW - 696);
    g.fillText(envName(state.env) + ' · ' + (state.fly ? 'Fly' : 'Walk') + (state.snap ? ' · Snap' : '') + (state.hollow ? ' · Hollow' : ''), 686, PH - 24, PW - 696);
    panel.tex.needsUpdate = true; panel.dirty = false;
  }

  var laserMat = new THREE.LineBasicMaterial({ color: 0x8fc2b0, transparent: true, opacity: 0.85 });
  function makeHandModel() {
    var g = new THREE.Group();
    var body = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.022, 0.12, 12), new THREE.MeshLambertMaterial({ color: 0x5b4033 }));
    body.rotation.x = Math.PI / 2; body.position.z = 0.05;
    var tip = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 8), new THREE.MeshLambertMaterial({ color: 0x8fc2b0 }));
    var laser = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]), laserMat);
    g.add(body, tip, laser); g.userData.laser = laser; return g;
  }
  var hands = [0, 1].map(function (i) {
    var ctrl = renderer.xr.getController(i); rig.add(ctrl);
    var h = { ctrl: ctrl, src: null, hand: '', prev: [], use: null, onPanel: false, blockTrigger: false, model: makeHandModel(), preview: makePreview(), snapReady: true };
    ctrl.addEventListener('connected', function (e) { h.src = e.data; h.hand = e.data.handedness; ctrl.add(h.model); if (h.hand === 'left') { ctrl.add(panel.mesh); ctrl.add(panel.tab.mesh); } });
    ctrl.addEventListener('selectstart', function () {
      if (!ar.active || !h.src || h.src.gamepad) return;
      if (!ar.placed) { placeBoard(); return; }
      var r = contentRay(h); h.use = beginUse(r.o, r.d, performance.now());
    });
    ctrl.addEventListener('selectend', function () { if (h.use && !(h.src && h.src.gamepad)) { endUse(h.use); h.use = null; } });
    ctrl.addEventListener('disconnected', function () {
      if (h.use) { endUse(h.use); h.use = null; }
      h.src = null; ctrl.remove(h.model); if (panel.mesh.parent === ctrl) { ctrl.remove(panel.mesh); ctrl.remove(panel.tab.mesh); } h.preview.visible = false;
    });
    return h;
  });
  function pulse(h) { return function (s, ms) { try { var a = h.src.gamepad.hapticActuators; if (a && a[0] && a[0].pulse) a[0].pulse(s, ms); } catch (e) { } }; }
  function snapTurn(angle) {
    rig.updateMatrixWorld(true);
    var head = headWorld(tmpV);
    rig.position.sub(head); rig.position.applyAxisAngle(UP, angle); rig.position.add(head); rig.rotation.y += angle;
  }
  var rayO = new THREE.Vector3(), rayD = new THREE.Vector3(), cO = new THREE.Vector3(), cD = new THREE.Vector3(), panelRay = new THREE.Raycaster();
  function btn(b, i) { return !!(b[i] && b[i].pressed); }
  // Both controllers, in VR and in AR. Left stick: walk (VR) or slide the board (AR). Right stick: snap-turn and brush
  // size (VR) or turn and scale the board (AR). Holding right grip with a selection reshapes it with both sticks.
  // The right laser works the wrist panel. Returns the walking input for VR.
  function handsFrame(dt, now) {
    var mv = { x: 0, z: 0, y: 0, jump: false }, sh = [0, 0, 0, 0], oldHover = panel.hover, A = ar.active;
    rig.updateMatrixWorld(true);
    var shaping = sel.size > 0 && hands.some(function (h) { return h.hand === 'right' && h.src && h.src.gamepad && btn(h.src.gamepad.buttons, 1); });
    panel.hover = -1;
    hands.forEach(function (h) {
      if (!h.src) { h.preview.visible = false; return; }
      if (!h.src.gamepad) { if (h.use) { var tr = contentRay(h); updateUse(h.use, tr.o, tr.d, now); } return; } // phone AR taps
      var b = h.src.gamepad.buttons, ax = h.src.gamepad.axes, sx = ax[2] || 0, sy = ax[3] || 0;
      var pressed = function (i) { return btn(b, i); }, edge = function (i) { return btn(b, i) && !h.prev[i]; };
      if (h.hand === 'left') {
        if (shaping) { sh[0] = sx; sh[1] = -sy; }
        else if (!A) { if (Math.hypot(sx, sy) > 0.15) { mv.x += sx; mv.z -= sy; } }
        else if (Math.hypot(sx, sy) > 0.75 && ar.panReady) { // slide the board one chunk across the world
          ar.panReady = false;
          camera.getWorldDirection(tmpV); tmpV.y = 0; tmpV.normalize().transformDirection(ar.inv); tmpV.y = 0; tmpV.normalize();
          var fx = tmpV.x * -sy + -tmpV.z * sx, fz = tmpV.z * -sy + tmpV.x * sx;
          if (Math.abs(fx) > Math.abs(fz)) ar.fcx += Math.sign(fx); else ar.fcz += Math.sign(fz);
          sound('tap'); panel.dirty = true;
        } else if (Math.hypot(sx, sy) < 0.3) ar.panReady = true;
        if (edge(4)) doUndo();
        if (edge(5)) { h.yAt = now; h.yHeld = false; }
        if (pressed(5) && !h.yHeld && now - h.yAt > 600) { h.yHeld = true; setPanelShown(!panel.shown); }
        if (!pressed(5) && h.prev[5] && !h.yHeld) { if (A) { ar.placed = false; panel.dirty = true; } else toggleFly(); }
        // Flying: grip rises, stick click sinks. Walking: click the left stick to jump. (Not the grip: a hand squeezes it
        // without meaning to, pressing Y for one, and every squeeze was a hop.)
        if (!A && state.fly) { if (pressed(1)) mv.y += 1; if (pressed(3)) mv.y -= 1; }
        if (!A && !state.fly && edge(3)) mv.jump = true;
      } else {
        if (shaping) { sh[2] = sx; sh[3] = -sy; }
        else {
          if (Math.abs(sx) > 0.7 && h.snapReady) { if (A) ar.yaw += sx > 0 ? -Math.PI / 12 : Math.PI / 12; else snapTurn(sx > 0 ? -Math.PI / 6 : Math.PI / 6); h.snapReady = false; }
          if (Math.abs(sx) < 0.3) h.snapReady = true;
          if (Math.abs(sy) > 0.25 && Math.abs(sx) < 0.5) { if (A) setArScale(ar.scale * Math.exp(-sy * dt * 1.2)); else setSize(state.size * (1 - sy * dt * 1.2)); }
        }
        if (edge(4)) cycleTool(1);
        if (edge(5)) cycleColor(1);
        if (edge(3)) cyclePlace();
      }
      rayO.setFromMatrixPosition(h.ctrl.matrixWorld);
      rayD.set(0, 0, -1).applyQuaternion(h.ctrl.getWorldQuaternion(tmpQ));
      var laser = h.model.userData.laser, unit = rig.scale.x; // laser length is in the controller's (rig-scaled) units
      cO.copy(rayO); if (A) cO.applyMatrix4(ar.inv);
      var touching = soundShapeAt(cO); if (touching && touching !== h.touching) touchSound(touching); h.touching = touching;
      h.onPanel = false;
      if (h.hand === 'right' && panel.tab.mesh.parent && panel.tab.mesh.visible) {
        panelRay.set(rayO, rayD);
        var th = panelRay.intersectObject(panel.tab.mesh, false)[0];
        if (th !== undefined) { h.onPanel = true; laser.scale.z = th.distance / unit; h.preview.visible = false; if (edge(0) && !h.use) { ensureAudio(); setPanelShown(true); sound('tap'); pulse(h)(0.3, 20); } }
        if (panel.tab.hover !== (th !== undefined)) { panel.tab.hover = th !== undefined; drawPanelTab(); }
      }
      if (h.hand === 'right' && panel.mesh.parent && panel.mesh.visible) {
        panelRay.set(rayO, rayD);
        var ph = panelRay.intersectObject(panel.mesh, false)[0];
        if (ph && ph.uv) {
          var px = ph.uv.x * PW, py = (1 - ph.uv.y) * PH;
          panel.hover = panel.buttons.findIndex(function (bt) { return !bt.info && px >= bt.x && px <= bt.x + bt.w && py >= bt.y && py <= bt.y + bt.h; });
          h.onPanel = true; laser.scale.z = ph.distance / unit; h.preview.visible = false;
          if (edge(0) && !h.use && panel.hover >= 0) { ensureAudio(); var pb = panel.buttons[panel.hover]; panel.flash = { x: pb.x, y: pb.y, w: pb.w, h: pb.h, until: now + 120 }; pb.run(); panel.dirty = true; sound('tap'); pulse(h)(0.3, 20); }
        }
      }
      if (!h.onPanel) {
        if (A && !ar.placed) {
          laser.scale.z = rayO.distanceTo(reticle.position); h.preview.visible = false;
          if (edge(0)) { placeBoard(); h.blockTrigger = true; }
        } else {
          cO.copy(rayO); cD.copy(rayD); if (A) { cO.applyMatrix4(ar.inv); cD.transformDirection(ar.inv); }
          var hit = hitTest(cO, cD);
          laser.scale.z = hit ? hit.dist * (A ? ar.scale : 1) / unit : A ? 2 : 4;
          showPreview(h.preview, hit);
          if (pressed(0) && !h.blockTrigger) {
            if (!h.use) { h.use = beginUse(cO, cD, now, pulse(h), true, hit); if (!h.use) h.blockTrigger = true; }
            else updateUse(h.use, cO, cD, now, hit);
          }
        }
      }
      if (!pressed(0)) { h.blockTrigger = false; if (h.use) { endUse(h.use); h.use = null; } }
      else if (h.onPanel && !h.use) h.blockTrigger = true;
      for (var i = 0; i < b.length; i++) h.prev[i] = btn(b, i);
    });
    if (panel.hover !== oldHover) panel.dirty = true;
    if (shaping) resizeLive(dt, sh[0], sh[1], sh[2], sh[3]); else if (liveResize) resizeLive(dt, 0, 0, 0, 0);
    return mv;
  }
  function vrFrame(dt, now) {
    var mv = handsFrame(dt, now);
    movePlayer(dt, clamp(mv.x, -1, 1) * 0.85, clamp(mv.z, -1, 1) * 0.85, mv.y, mv.jump);
  }

  // ---------- Starting and ending VR / AR ----------
  var vrBtn = $('#vr'), arBtn = $('#ar'), vrReason = '', arReason = '', xrMode = null;
  function onEnterVR() { camera.position.set(0, 0, 0); camera.rotation.set(0, 0, 0); flatPreview.visible = false; state.fly = false; vy = 0; stopAllLive(); updateHud(); setTimeout(redrawCards, 0); }
  function endHands() { hands.forEach(function (h) { if (h.use) { endUse(h.use); h.use = null; } h.preview.visible = false; }); }
  function onExitXR() {
    endHands();
    if (xrMode === 'immersive-ar') exitAR();
    xrMode = null;
    camera.position.set(0, EYE, 0); camera.rotation.set(pitch, 0, 0);
    vrBtn.textContent = vrReason ? 'VR' : 'Enter VR'; arBtn.textContent = 'AR';
    saveLocal(false); updateHud(); redrawCards();
    if (watchAfterXR) { var wa = watchAfterXR; watchAfterXR = null; pendingSwitch = null; openWatch(wa.id, wa.mode); }
    if (pendingSwitch) { var m = pendingSwitch; pendingSwitch = null; startXR(m); }
  }
  // Switching between VR and passthrough AR from the wrist panel: end this session, start the other.
  var pendingSwitch = null;
  function switchXR() { pendingSwitch = xrMode === 'immersive-ar' ? 'immersive-vr' : 'immersive-ar'; var s = renderer.xr.getSession(); if (s) s.end(); }
  // Back to the flat page (its ⋯ menu has world files, rooms and settings); Enter VR brings you back in.
  function leaveXR() { if (renderer.xr.isPresenting) renderer.xr.getSession().end(); }
  function switchLabel() { return xrMode === 'immersive-ar' ? 'Switch to VR' : 'Switch to AR'; }
  function xrOff(btn, label, reason) { btn.classList.add('off'); btn.textContent = label; btn.setAttribute('aria-label', label + ' unavailable here'); return reason; }
  var NO_HEADSET = 'Play on a Meta Quest headset (or Chrome on an AR-capable Android phone for AR).';
  var BLOCKED = 'This browser blocked access to the headset.';
  if (!navigator.xr) { vrReason = xrOff(vrBtn, 'VR', 'VR needs a headset. ' + NO_HEADSET); arReason = xrOff(arBtn, 'AR', 'AR needs a headset or AR phone. ' + NO_HEADSET); }
  else {
    navigator.xr.isSessionSupported('immersive-vr').then(function (ok) { if (!ok) vrReason = xrOff(vrBtn, 'VR', 'VR needs a headset. ' + NO_HEADSET); }).catch(function () { vrReason = xrOff(vrBtn, 'VR', BLOCKED); });
    navigator.xr.isSessionSupported('immersive-ar').then(function (ok) { if (!ok) arReason = xrOff(arBtn, 'AR', 'AR needs passthrough or a camera. ' + NO_HEADSET); }).catch(function () { arReason = xrOff(arBtn, 'AR', BLOCKED); });
  }
  function startXR(mode) {
    ensureAudio();
    var reason = mode === 'immersive-ar' ? arReason : vrReason;
    if (reason) { toast(reason); return; }
    if (renderer.xr.isPresenting) { renderer.xr.getSession().end(); return; }
    var opts = mode === 'immersive-ar'
      ? { optionalFeatures: ['local-floor', 'hit-test', 'dom-overlay'], domOverlay: { root: $('#app') } }
      : { optionalFeatures: ['local-floor', 'bounded-floor'] };
    if (xrAsking) return; // one request at a time (a granted session and the installed app's own start can race)
    xrAsking = true;
    var early = mode === 'immersive-vr' && window.__xrSession; window.__xrSession = null; // asked for by the page's first script, inside a portal's offer
    (early || navigator.xr.requestSession(mode, opts)).then(function (s) {
      s.addEventListener('end', onExitXR);
      return renderer.xr.setSession(s).then(function () {
        xrMode = mode; prefs.mode = mode; savePrefs();
        if (mode === 'immersive-ar') { enterAR(s); arBtn.textContent = 'Exit AR'; } else { onEnterVR(); vrBtn.textContent = 'Exit VR'; }
      });
    }).catch(function () { toast('Tap ' + (mode === 'immersive-ar' ? 'AR' : 'Enter VR') + ' at the top to start.'); })
      .then(function () { xrAsking = false; });
  }
  var xrAsking = false;
  vrBtn.addEventListener('click', function () { startXR('immersive-vr'); });
  arBtn.addEventListener('click', function () { startXR('immersive-ar'); });
  // Taps on the on-screen tray during phone AR shouldn't also sculpt the board behind it.
  $$('.top, #tray, #editSheet, .card-wrap, #stick, .vert').forEach(function (el) { el.addEventListener('beforexrselect', function (e) { e.preventDefault(); }); });

  // ---------- AR: the world as a build plate ----------
  // Like Minecraft Earth: a square of your world (a few chunks) sits on a real table or floor.
  // Pan it across the endless world, turn it, and scale it from tabletop to life size.
  var AR_SCALES = [['Table', 0.05], ['Room', 0.2], ['Life size', 1]];
  var ar = { active: false, placed: false, pos: new THREE.Vector3(), yaw: 0, scale: 0.05, fcx: 4, fcz: 4, key: '', list: [], idx: 0, meshes: new Map(), hitSource: null, lastHit: 0, inv: new THREE.Matrix4(), savedRig: null, panReady: true, box: null, boxKey: '' };
  var reticle = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.065, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x8fc2b0, transparent: true, opacity: 0.9, depthTest: false }));
  reticle.visible = false; reticle.renderOrder = 7; scene.add(reticle);
  var plinth = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0x4a3328 }));
  plinth.visible = false; worldRoot.add(plinth);
  function arRadius() { return ar.scale < 0.1 ? 2 : ar.scale < 0.5 ? 3 : 4; }
  function arClip() { var R = arRadius(); return { x0: (ar.fcx - R) * 16, x1: (ar.fcx + R + 1) * 16, z0: (ar.fcz - R) * 16, z1: (ar.fcz + R + 1) * 16 }; }
  function plateBox() { // [x0, y0, z0, x1, y1, z1] of the board's block of world, in content meters
    var key = ar.fcx + ',' + ar.fcz + ',' + arRadius();
    if (key !== ar.boxKey) { var c = arClip(); ar.boxKey = key; ar.box = [terrain.ox + c.x0 * V, -0.4, terrain.oz + c.z0 * V, terrain.ox + c.x1 * V, terrain.ny * V + 0.4, terrain.oz + c.z1 * V]; }
    return ar.box;
  }
  function insidePlate(x, z) { var b = plateBox(); return x >= b[0] && x <= b[3] && z >= b[2] && z <= b[5]; }
  function toContent(v) { return ar.active ? v.applyMatrix4(ar.inv) : v; }
  function contentRay(h) {
    var o = new THREE.Vector3().setFromMatrixPosition(h.ctrl.matrixWorld);
    var d = new THREE.Vector3(0, 0, -1).applyQuaternion(h.ctrl.getWorldQuaternion(new THREE.Quaternion()));
    if (ar.active) { o.applyMatrix4(ar.inv); d.transformDirection(ar.inv); }
    return { o: o, d: d };
  }
  function applyPlate() {
    var b = plateBox(), cx = (b[0] + b[3]) / 2, cz = (b[2] + b[5]) / 2, life = ar.scale >= 0.5;
    var bk = ar.boxKey + ':' + terrain.version; if (life && ar.baseKey !== bk) { ar.baseKey = bk; ar.base = terrain.surfaceY(cx, cz); }
    var base = life ? ar.base : 0;
    worldRoot.scale.setScalar(ar.scale); worldRoot.rotation.set(0, ar.yaw, 0);
    worldRoot.position.copy(ar.pos).sub(tmpV.set(cx, base, cz).multiplyScalar(ar.scale).applyAxisAngle(UP, ar.yaw));
    worldRoot.updateMatrixWorld(true); ar.inv.copy(worldRoot.matrixWorld).invert();
    plinth.visible = !life; plinth.scale.set(b[3] - b[0] + 0.15, 0.3, b[5] - b[2] + 0.15); plinth.position.set(cx, -0.16, cz);
  }
  function setArScale(s) { ar.scale = clamp(s, 0.02, 1); panel.dirty = true; }
  function placeBoard() { ar.placed = true; reticle.visible = false; sound('brick'); toast('Board placed. Sculpt it with the laser. Left stick slides across the world, right stick turns and scales it.'); panel.dirty = true; }
  function enterAR(session) {
    ar.active = true; ar.placed = false; ar.key = '';
    ar.savedRig = { p: rig.position.clone(), r: rig.rotation.y };
    rig.scale.setScalar(1);
    var g = terrain.toGrid(rig.position.x, 0, rig.position.z); ar.fcx = Math.floor(g[0] / 16); ar.fcz = Math.floor(g[2] / 16);
    rig.position.set(0, 0, 0); rig.rotation.set(0, 0, 0); camera.position.set(0, 0, 0); camera.rotation.set(0, 0, 0);
    sky.visible = false; scene.background = null; scene.fog = null;
    streamGroup.visible = false; flatPreview.visible = false;
    session.requestReferenceSpace('viewer').then(function (vs) { return session.requestHitTestSource ? session.requestHitTestSource({ space: vs }) : null; })
      .then(function (src) { ar.hitSource = src; }).catch(function () { ar.hitSource = null; });
    updateHud(); panel.page = 'room'; panel.dirty = true;
    toast('Look at a table or the floor, then pull the trigger (or tap) to set down your world.');
  }
  function exitAR() {
    ar.active = false; ar.placed = false;
    if (ar.hitSource) { try { ar.hitSource.cancel(); } catch (e) { } ar.hitSource = null; }
    clearMeshes(plateGroup, ar.meshes); ar.key = '';
    worldRoot.position.set(0, 0, 0); worldRoot.rotation.set(0, 0, 0); worldRoot.scale.setScalar(1); worldRoot.updateMatrixWorld(true);
    plinth.visible = false; reticle.visible = false; sky.visible = true; scene.background = HORIZON.clone(); scene.fog = fogObj; streamGroup.visible = true;
    if (ar.savedRig) { rig.position.copy(ar.savedRig.p); rig.rotation.set(0, ar.savedRig.r, 0); }
    rig.scale.setScalar(state.pscale);
    objViews.forEach(function (v) { v.group.visible = true; });
    stream.gen = -1; // edits made on the board: rebuild the walking-scale view
  }
  function arStream(budget) {
    var t0 = performance.now(), cl = arClip(), key = cl.x0 + ',' + cl.z0 + ',' + cl.x1 + ',' + terrain.resetGen;
    if (key !== ar.key) { // the board moved or grew: rebuild its block (the cut sides change)
      ar.key = key; clearMeshes(plateGroup, ar.meshes);
      ar.list = ringKeys(ar.fcx, ar.fcz, arRadius(), false); ar.idx = 0;
      terrain.evict(ar.fcx, ar.fcz, arRadius() + 3);
    }
    pumpTerrain(plateGroup, ar.meshes, ar, cl, t0, budget);
  }
  function arFrame(dt, now) {
    var frame = renderer.xr.getFrame(), ref = renderer.xr.getReferenceSpace();
    rig.updateMatrixWorld(true);
    if (!ar.placed) {
      var got = false;
      if (ar.hitSource && frame) {
        var res = frame.getHitTestResults(ar.hitSource), pose = res.length && res[0].getPose(ref);
        if (pose) { reticle.position.set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z); got = true; ar.lastHit = now; }
      }
      if (!got && now - ar.lastHit > 1500) { // no surface found: hover it at table height in front of you
        camera.getWorldDirection(tmpV); tmpV.y = 0; tmpV.normalize(); var hh = headWorld(tmpV2);
        reticle.position.set(hh.x + tmpV.x * 0.7, Math.max(0.05, hh.y - 0.65), hh.z + tmpV.z * 0.7);
      }
      reticle.visible = true; ar.pos.copy(reticle.position); ar.yaw = headYaw();
    }
    applyPlate();
    handsFrame(dt, now);
  }

  // ---------- Places: Start plus up to four marked places, each with its own scale ----------
  // A place remembers where you were, which way you faced, and your size (VR) or board scale (AR).
  var MAX_PLACES = 4, SIZES = [['Tiny', 0.25], ['Normal', 1], ['Big', 3], ['Giant', 8]];
  var places = []; for (var i0 = 0; i0 < MAX_PLACES; i0++) places.push(prefs.points && prefs.points[i0] && typeof prefs.points[i0].x === 'number' ? prefs.points[i0] : null);
  var placeIdx = 0; // 0 = Start
  function startPlace() { return { x: 0, y: terrain.surfaceY(0, 1.2) + 0.02, z: 1.2, yaw: 0, vs: 1, as: 0.05, fly: state.fly, start: true }; }
  function nearestScale(list, s) { var i = 0; list.forEach(function (e, j) { if (Math.abs(Math.log(e[1] / s)) < Math.abs(Math.log(list[i][1] / s))) i = j; }); return i; }
  function scaleName(s, isAr) {
    var list = isAr ? AR_SCALES : SIZES, best = list[nearestScale(list, s)];
    return Math.abs(Math.log(best[1] / s)) < 0.05 ? best[0].toLowerCase() : (isAr ? '1:' + Math.round(1 / s) : '×' + (s < 1 ? s.toFixed(2) : s.toFixed(1)));
  }
  function placeDesc(p) { return (p.start ? 'home' : 'x ' + Math.round(p.x) + ' · z ' + Math.round(p.z)) + ' · ' + (ar.active ? scaleName(p.as, true) : scaleName(p.vs, false)); }
  function setPlayerScale(s) {
    state.pscale = clamp(s, 0.1, 8); rig.scale.setScalar(state.pscale); vy = 0;
    savePrefs(); applyFog(); updateHud(); panel.dirty = true;
  }
  function setScaleValue(s) { if (ar.active) setArScale(s); else setPlayerScale(s); toast((ar.active ? 'Board: ' : 'Size: ') + scaleName(ar.active ? ar.scale : state.pscale, ar.active)); refreshPlaces(); }
  function cycleSize(d) {
    var list = ar.active ? AR_SCALES : SIZES, i = nearestScale(list, ar.active ? ar.scale : state.pscale);
    setScaleValue(list[(i + d + list.length) % list.length][1]);
  }
  function currentPlace() {
    if (ar.active) { var b = plateBox(); return { x: r3((b[0] + b[3]) / 2), y: 0, z: r3((b[2] + b[5]) / 2), yaw: r3(ar.yaw), vs: state.pscale, as: r3(ar.scale), fly: state.fly }; }
    rig.updateMatrixWorld(true); var h = headWorld(tmpV2);
    return { x: r3(h.x), y: r3(rig.position.y), z: r3(h.z), yaw: r3(headYaw()), vs: state.pscale, as: r3(ar.scale), fly: state.fly };
  }
  function goPlace(i) {
    var p = i === 0 ? startPlace() : places[i - 1];
    if (!p) { toast('Place ' + i + ' is empty. Mark it first.'); return; }
    placeIdx = i;
    if (ar.active) {
      var g = terrain.toGrid(p.x, 0, p.z); ar.fcx = Math.floor(g[0] / 16); ar.fcz = Math.floor(g[2] / 16); setArScale(p.as || 0.05);
    } else {
      setPlayerScale(p.vs || 1); state.fly = typeof p.fly === 'boolean' ? p.fly : state.fly;
      rig.updateMatrixWorld(true);
      if (renderer.xr.isPresenting) snapTurn(p.yaw - headYaw()); else { rig.rotation.y = p.yaw; pitch = -0.18 - Math.min(0.6, 0.2 * Math.log2(Math.max(1, p.vs || 1))); camera.rotation.set(pitch, 0, 0); } // giants look down at the land
      rig.updateMatrixWorld(true); var h = headWorld(tmpV2);
      rig.position.x += p.x - h.x; rig.position.z += p.z - h.z; rig.position.y = p.y; vy = 0;
      streamTerrain(300);
    }
    sound('tap'); updateHud();
    toast(i === 0 ? 'Back at Start' : 'Place ' + i);
  }
  function markPlace(i) {
    if (i < 1 || i > MAX_PLACES) return;
    places[i - 1] = currentPlace(); prefs.points = places; savePrefs();
    placeIdx = i; sound('brick'); toast('Marked place ' + i); panel.dirty = true; refreshPlaces();
  }
  function clearPlace(i) { if (!places[i - 1]) return; places[i - 1] = null; prefs.points = places; savePrefs(); if (placeIdx === i) placeIdx = 0; panel.dirty = true; refreshPlaces(); }
  // Cycle: Start → each marked place → back to Start.
  function cyclePlace() {
    var order = [0]; places.forEach(function (p, j) { if (p) order.push(j + 1); });
    if (order.length === 1) { goPlace(0); toast('Back at Start. Mark places to cycle through them.'); return; }
    goPlace(order[(order.indexOf(placeIdx) + 1) % order.length]);
  }
  // Flat / phone panel
  var placesEl = $('#places'), placesBtn = $('#placesBtn');
  function refreshPlaces() { if (!$('#places').hidden) renderPlaces(); }
  function chip(text, onClick, o) {
    var b = document.createElement('button'); b.className = 'chip' + (o && o.primary ? ' primary' : ''); b.textContent = text;
    if (o && o.label) b.setAttribute('aria-label', o.label);
    if (o && o.pressed !== undefined) b.setAttribute('aria-pressed', String(o.pressed));
    if (onClick) b.addEventListener('click', onClick); else b.disabled = true;
    return b;
  }
  function elt(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }
  function renderPlaces() {
    placesEl.textContent = '';
    var head = elt('div', 'pl-head'); head.append(elt('strong', '', 'Places'), chip('Next place ▸', cyclePlace, { primary: true })); placesEl.append(head);
    for (var i = 0; i <= MAX_PLACES; i++) (function (i) {
      var p = i === 0 ? startPlace() : places[i - 1], row = elt('div', 'pl-row' + (placeIdx === i && (i === 0 || p) ? ' here' : ''));
      row.append(elt('span', 'pl-name', i === 0 ? 'Start' : 'Place ' + i), elt('small', '', p ? placeDesc(p) : 'Empty'), chip('Go', p ? function () { goPlace(i); } : null));
      if (i > 0) row.append(chip(p ? 'Re-mark' : 'Mark here', function () { markPlace(i); }), chip('×', p ? function () { clearPlace(i); } : null, { label: 'Clear place ' + i }));
      else row.append(elt('span'), elt('span'));
      placesEl.append(row);
    })(i);
    var pr = elt('div', 'pl-row'), hasPortal = !!myPortal();
    pr.append(elt('span', 'pl-name', 'Portal'), elt('small', '', hasPortal ? 'To your memory palace' : 'Not placed yet'), chip('Go', hasPortal ? goToPortal : null),
      chip(hasPortal ? 'Move here' : 'Place here', canEdit() ? placePortal : null), elt('span'));
    placesEl.append(pr);
    var sz = elt('div', 'pl-size'), cur = ar.active ? ar.scale : state.pscale;
    sz.append(elt('span', '', ar.active ? 'Board scale' : 'Your size'));
    (ar.active ? AR_SCALES : SIZES).forEach(function (s) { sz.append(chip(s[0], function () { setScaleValue(s[1]); }, { pressed: Math.abs(s[1] - cur) < 1e-6 })); });
    sz.append(chip('−', function () { setScaleValue(cur / 1.25); }, { label: 'Smaller' }), chip('+', function () { setScaleValue(cur * 1.25); }, { label: 'Bigger' }), elt('small', '', scaleName(cur, ar.active)));
    placesEl.append(sz);
  }
  function closePlaces() { placesEl.hidden = true; placesBtn.setAttribute('aria-expanded', 'false'); }
  placesBtn.addEventListener('click', function (e) { e.stopPropagation(); if (placesEl.hidden) { closeMenu(); renderPlaces(); placesEl.hidden = false; placesBtn.setAttribute('aria-expanded', 'true'); } else closePlaces(); });
  document.addEventListener('pointerdown', function (e) { if (!placesEl.hidden && !placesEl.contains(e.target) && !placesBtn.contains(e.target)) closePlaces(); });
  rig.scale.setScalar(state.pscale);

  // ---------- Scenes (like Open Blocks' environments) ----------
  var ENVS = {
    Day: { top: '#9fb6c4', hor: '#e6d6c1', sky: 0xe4ecf0, ground: 0x6b4a3a, hi: 1.7, sun: 0xfff1df, si: 1.9 },
    Dusk: { top: '#36405e', hor: '#e2a27c', sky: 0xf0c8b0, ground: 0x4a3030, hi: 1.25, sun: 0xffb27a, si: 1.6 },
    Night: { top: '#070b16', hor: '#28324a', sky: 0x8aa0c8, ground: 0x241c22, hi: 0.75, sun: 0xb8c8ff, si: 0.7 },
    Studio: { top: '#f4f1ec', hor: '#f4f1ec', sky: 0xffffff, ground: 0x9a8a80, hi: 1.6, sun: 0xffffff, si: 1.6 },
    Darkroom: { top: '#141212', hor: '#141212', sky: 0xd8d0c8, ground: 0x302826, hi: 1.1, sun: 0xffffff, si: 1.5 }
  };
  var ENV_ORDER = Object.keys(ENVS);
  // A scene is one of the built-in ones, or 'sky:<id>' for a 360° sky from your phone, lit to match its photo.
  function setEnv(name) {
    var rec = skyRec(name), e = ENVS[name];
    if (rec) {
      var col = rec.colors, lift = function (h) { return new THREE.Color(h).lerp(new THREE.Color('#ffffff'), 0.35); };
      e = { top: col.top, hor: col.hor, sky: lift(col.top), ground: new THREE.Color(col.ground), hi: 1.5, sun: lift(col.hor), si: 1.7 };
    }
    // A phone sky that hasn't loaded yet keeps its place (and the Day look) until the media library is read.
    state.env = e ? name : name && name.indexOf('sky:') === 0 && !mediaLoaded ? name : 'Day';
    e = e || ENVS.Day;
    var hor = new THREE.Color(e.hor), top = new THREE.Color(e.top), k = new THREE.Color(), p = sky.geometry.attributes.position, c = sky.geometry.attributes.color;
    if (rec) { skyPhotoMat.map = skyTexture(rec); skyPhotoMat.needsUpdate = true; sky.material = skyPhotoMat; }
    else {
      sky.material = skyGradMat;
      for (var i = 0; i < p.count; i++) { k.copy(hor).lerp(top, clamp(p.getY(i) / 150 * 1.6, 0, 1)); c.setXYZ(i, k.r, k.g, k.b); }
      c.needsUpdate = true;
    }
    HORIZON.copy(hor); fogObj.color.copy(hor); if (!ar.active) scene.background = hor.clone();
    hemi.color.set(e.sky); hemi.groundColor.set(e.ground); hemi.intensity = e.hi; sun.color.set(e.sun); sun.intensity = e.si;
    savePrefs(); updateHud(); updateAmbient(); renderMediaUI(); panel.dirty = true;
    if (link) link.tell({ k: 'info', info: { name: state.name, scene: envName(state.env), slots: SLOTS.map(function (x) { return x[0]; }) } });
  }

  // ---------- Export, save and open (like Open Blocks' save / export) ----------
  function download(name, blob) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }
  function stamp() { var d = new Date(); return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0'); }
  // OBJ with per-vertex colour: the selected shapes, or, with nothing selected, everything within 8 m of you.
  function exportOBJ() {
    var parts = [], ids = selList(), base = 1, out = ['# Endless Clay export', '# vertex colours follow each position (r g b)'];
    rig.updateMatrixWorld(true); var me = toContent(headWorld(new THREE.Vector3()));
    if (ids.length) ids.forEach(function (id) { var v = objViews.get(id); if (v) parts.push({ name: MOLD_NAME[v.o.mold] + '_' + id, meshes: v.meshes, m: v.group.matrix }); });
    else {
      var tm = []; terrainMeshes.forEach(function (m) { if (m && m.geometry.boundingSphere && m.geometry.boundingSphere.center.distanceTo(me) < 8 + m.geometry.boundingSphere.radius) tm.push(m); });
      parts.push({ name: 'clay_land', meshes: tm, m: new THREE.Matrix4() });
      objViews.forEach(function (v, id) { if (Math.hypot(v.o.p[0] - me.x, v.o.p[2] - me.z) < 8) parts.push({ name: MOLD_NAME[v.o.mold] + '_' + id, meshes: v.meshes, m: v.group.matrix }); });
    }
    var tv = new THREE.Vector3(), col = new THREE.Color(), nv = 0;
    parts.forEach(function (pt) {
      out.push('o ' + pt.name);
      pt.meshes.forEach(function (mesh) {
        if (!mesh) return;
        var g = mesh.geometry, pos = g.attributes.position, cl = g.attributes.color, ix = g.index;
        for (var i = 0; i < pos.count; i++) { tv.fromBufferAttribute(pos, i).applyMatrix4(pt.m); col.setRGB(cl.getX(i), cl.getY(i), cl.getZ(i)).convertLinearToSRGB(); out.push('v ' + tv.x.toFixed(4) + ' ' + tv.y.toFixed(4) + ' ' + tv.z.toFixed(4) + ' ' + col.r.toFixed(3) + ' ' + col.g.toFixed(3) + ' ' + col.b.toFixed(3)); }
        for (var j = 0; j < ix.count; j += 3) out.push('f ' + (base + ix.getX(j)) + ' ' + (base + ix.getX(j + 1)) + ' ' + (base + ix.getX(j + 2)));
        base += pos.count; nv += pos.count;
      });
    });
    if (!nv) { toast('Nothing to export here. Select shapes, or stand near some clay.'); return; }
    download('endless-clay-' + stamp() + '.obj', new Blob([out.join('\n') + '\n'], { type: 'text/plain' }));
    toast('Exported ' + (ids.length ? ids.length + ' shape' + (ids.length > 1 ? 's' : '') : 'the clay around you') + ' as an OBJ file');
  }
  async function saveWorldFile() {
    try {
      var data = await ClayNet.packBytes(studio.serializeBin());
      download('endless-clay-world-' + stamp() + '.clay', new Blob([JSON.stringify({ app: 'endless-clay', v: 1, data: data })], { type: 'application/json' }));
      toast('World file saved to your downloads');
    } catch (e) { toast('Could not save a world file on this device.'); }
  }
  async function openWorldFile(file) {
    try {
      var o = JSON.parse(await file.text());
      if (o.app !== 'endless-clay' || !o.data) throw new Error('not a world');
      if (!studio.deserializeBin(await ClayNet.unpackBytes(o.data))) throw new Error('bad');
      setSelection([]); streamTerrain(400); goPlace(0); saveLocal(false); toast('Opened ' + file.name);
    } catch (e) { toast('That file isn’t an Endless Clay world.'); }
  }

  // Add a world file's shapes, photos, sounds, land skins and billboards to this world, keeping everything already
  // here. It arrives where it was made, as one step (Undo takes it all away again), and everyone in the room gets it.
  // A file can name its ground level (x.ground): it's then moved up or down so that level meets the highest land
  // under it, since this world's land isn't the one it was made on.
  async function addWorldFile(file) {
    if (!canEdit()) return;
    try {
      var o = JSON.parse(await file.text());
      if (o.app !== 'endless-clay' || !o.data) throw new Error('not a world');
      var tmp = new ClayStudio.Studio({ palette: palLinear, shapePalette: palShapes }), head = tmp.deserializeBin(await ClayNet.unpackBytes(o.data));
      if (!head) throw new Error('bad');
      var dy = 0, ground = head.x && typeof head.x.ground === 'number' && isFinite(head.x.ground) ? head.x.ground : null;
      if (ground !== null && tmp.objects.size) {
        var b = [Infinity, Infinity, -Infinity, -Infinity];
        tmp.objects.forEach(function (x) { var hx = 0.64 * x.s[0], hz = 0.64 * x.s[2]; b[0] = Math.min(b[0], x.p[0] - hx); b[1] = Math.min(b[1], x.p[2] - hz); b[2] = Math.max(b[2], x.p[0] + hx); b[3] = Math.max(b[3], x.p[2] + hz); });
        var top = -Infinity, step = Math.max(1, Math.max(b[2] - b[0], b[3] - b[1]) / 60);
        for (var gx = b[0]; gx <= b[2]; gx += step) for (var gz = b[1]; gz <= b[3]; gz += step) top = Math.max(top, terrain.surfaceY(gx, gz));
        if (isFinite(top)) dy = top - ground;
      }
      var gids = new Map(), ids = new Map(), list = [];
      tmp.objects.forEach(function (x) {
        var r = tmp.record(x, true); r.id = uid('o'); ids.set(x.id, r.id); r.p[1] += dy;
        if (r.g) { if (!gids.has(r.g)) gids.set(r.g, uid('g')); r.g = gids.get(r.g); }
        list.push(r);
      });
      studio.begin();
      tmp.skins.forEach(function (d, id) { if (!studio.skins.has(id)) edit({ t: 'skin', id: id, d: d }); });
      tmp.sounds.forEach(function (d, id) { if (!studio.sounds.has(id)) edit({ t: 'sound', id: id, d: d }); });
      if (list.length) edit({ t: 'put', l: list });
      tmp.decals.forEach(function (d) { edit({ t: 'decal', d: Object.assign({}, d, { id: uid('d'), c: [d.c[0], d.c[1] + dy, d.c[2]] }) }); });
      tmp.boards.forEach(function (d) { var at = d.at && ids.get(d.at); edit({ t: 'board', d: Object.assign({}, d, { id: uid('b'), p: at ? d.p : [d.p[0], d.p[1] + dy, d.p[2]], at: at || null }) }); });
      studio.end();
      saveLocal(false);
      toast('Added ' + file.name + ': ' + list.length + ' shape' + (list.length === 1 ? '' : 's') + '. Undo takes it away again.');
    } catch (e) { if (studio.action) studio.end(); toast('That file isn’t an Endless Clay world.'); }
  }

  // ---------- Loop ----------
  // ---------- Foldables (Pixel Fold and the like) ----------
  // Closed (cover screen) or open flat, the layout simply follows the space: phone layout on the cover screen, the
  // edit sheet at the side on the open inner screen. Half-folded, the screen reports two segments and nothing sits on
  // the crease: like a book (fold upright), the world is on the left page and the panels on the right; on a table
  // (fold across), the world stands up on the top half and the controls lie on the bottom half.
  var fold = { mode: '', segs: null };
  var mqWide = window.matchMedia ? matchMedia('(min-width: 720px)') : { matches: innerWidth >= 720 };
  function readFold() {
    var sg = window.viewport && window.viewport.segments, mode = '', root = document.documentElement;
    if (sg && sg.length === 2 && !renderer.xr.isPresenting) mode = Math.abs(sg[0].top - sg[1].top) < 1 ? 'book' : 'table';
    fold.mode = mode; fold.segs = mode ? [sg[0], sg[1]] : null;
    document.body.classList.toggle('fold-book', mode === 'book'); document.body.classList.toggle('fold-table', mode === 'table');
    if (mode) [['--seg0-w', sg[0].width], ['--seg0-h', sg[0].height], ['--seg1-x', sg[1].left], ['--seg1-y', sg[1].top], ['--seg1-w', sg[1].width], ['--seg1-h', sg[1].height]].forEach(function (v) { root.style.setProperty(v[0], v[1] + 'px'); });
  }
  function sheetMode() { return fold.mode === 'book' ? 'column' : fold.mode === 'table' ? 'replace' : mqWide.matches ? 'side' : 'replace'; }
  function sceneRect() { var g = fold.segs; return g ? { x: g[0].left, y: g[0].top, w: g[0].width, h: g[0].height } : { x: 0, y: 0, w: innerWidth, h: innerHeight }; }
  function resize() {
    readFold(); trayIdle.stale = true;
    var r = sceneRect();
    [canvas.style, embedsEl.style].forEach(function (st) { st.left = r.x + 'px'; st.top = r.y + 'px'; st.width = r.w + 'px'; st.height = r.h + 'px'; });
    renderer.setSize(r.w, r.h, false); camera.aspect = r.w / r.h; camera.updateProjectionMatrix(); canvasRect = canvas.getBoundingClientRect(); measure();
    if (sel.size) updateSheet();
  }
  window.addEventListener('resize', resize);
  // Text size changes (iPhone's setting, browser zoom) resize the bars without a window resize: re-measure then too
  if (window.ResizeObserver) { var ro = new ResizeObserver(function () { queueMeasure(); }); ro.observe($('.top .actions')); ro.observe($('#tray .tray-inner')); }
  if (navigator.devicePosture && navigator.devicePosture.addEventListener) navigator.devicePosture.addEventListener('change', resize);
  if (window.matchMedia) ['(horizontal-viewport-segments: 2)', '(vertical-viewport-segments: 2)'].forEach(function (q) { var m = matchMedia(q); if (m.addEventListener) m.addEventListener('change', resize); });
  resize();
  updateHud(); updateSheet(); setEnv(state.env); renderSkinUI(); showFlatCat(prefs.cat || 'create'); syncTourist(); $('#tourScene').textContent = 'Scene: ' + envName(state.env);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { panel.dirty = true; });

  var last = performance.now(), lastCoords = 0, coordsEl = $('.brand span');
  function showCoords() {
    if (ar.active) { var b = plateBox(); coordsEl.textContent = 'board at x ' + Math.round((b[0] + b[3]) / 2) + ' · z ' + Math.round((b[2] + b[5]) / 2) + ' · ' + AR_SCALES[nearestScale(AR_SCALES, ar.scale)][0].toLowerCase() + ' scale'; return; }
    var h = headWorld(tmpV); coordsEl.textContent = 'x ' + Math.round(h.x) + ' · z ' + Math.round(h.z) + ' · ' + viewName.toLowerCase() + ' view';
  }
  // three.js asks for the next frame only after this one returns, so one error here would freeze the game for good.
  // Instead it's reported (and, when testing with ?debug, rethrown where the tests can see it) and play goes on.
  var DEBUG = /[?&]debug\b/.test(location.search), frameErrors = 0;
  function frameError(e) {
    if (frameErrors++ < 3) console.error('Endless Clay: a frame failed', e);
    if (frameErrors === 1) toast('Something went wrong for a moment. Carrying on.');
    if (DEBUG) setTimeout(function () { throw e; });
  }
  function frame() {
    try { step(); } catch (e) { frameError(e); }
    try { renderer.render(scene, camera); } catch (e) { frameError(e); }
  }
  function step() {
    var now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
    syncDecals();
    if (ar.active) { arFrame(dt, now); arStream(5); }
    else { if (renderer.xr.isPresenting) vrFrame(dt, now); else flatFrame(dt, now); streamTerrain(renderer.xr.isPresenting ? 4 : 7); }
    sky.position.copy(headWorld(tmpV));
    syncObjects(); syncBoards(); syncPortals(now); syncLive(now);
    if (now - lastCoords > 250) { lastCoords = now; showCoords(); syncMotion(); } // syncMotion also catches a Reduce Motion change the browser didn't announce
    syncBoxes();
    syncAvatars(dt);
    syncLoops(now);
    pushPresence(false);
    animatePanel(now);
    if (panel.flash && now >= panel.flash.until) { panel.flash = null; panel.dirty = true; }
    if (panel.dirty && renderer.xr.isPresenting && now - panel.drawn > 33) { drawPanel(); panel.drawn = now; }
  }

  if (DEBUG) window.kilnworksDebug = { studio: studio, screenOf: function (id) { var o = studio.get(id); if (!o) return null; var v = new THREE.Vector3().fromArray(o.p).project(camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, net: function () { return net; }, sel: function () { return selList(); }, panel: function (pg) { panel.page = pg; drawPanel(); return panel.canvas.toDataURL(); }, tp: function (x, z, yaw) { rig.position.set(x, terrain.surfaceY(x, z) + 0.02, z); if (yaw !== undefined) rig.rotation.y = yaw; }, arDemo: function (scale, pan) {
      if (!ar.active) { ar.active = true; ar.savedRig = { p: rig.position.clone(), r: rig.rotation.y }; var gg = terrain.toGrid(rig.position.x, 0, rig.position.z); ar.fcx = Math.floor(gg[0] / 16); ar.fcz = Math.floor(gg[2] / 16); sky.visible = false; scene.fog = null; scene.background = new THREE.Color('#3a3f45'); streamGroup.visible = false; flatPreview.visible = false; }
      ar.fcx += (pan || 0); ar.placed = true; ar.scale = scale; ar.pos.set(0, 0.8, -0.9); ar.yaw = 0.5; rig.position.set(0, 0, 0); rig.rotation.set(0, 0, 0); pitch = -0.6; camera.rotation.set(pitch, 0, 0);
      applyPlate(); arStream(5000); applyPlate(); renderer.render(scene, camera);
      camera.updateMatrixWorld(true); var o = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld), d = new THREE.Vector3(0, 0, -1).transformDirection(camera.matrixWorld);
      o.applyMatrix4(ar.inv); d.transformDirection(ar.inv); var h = hitTest(o, d);
      return { meshes: ar.meshes.size, hit: h && { target: h.target, y: +h.y.toFixed(2), inside: insidePlate(h.x, h.z) }, box: plateBox().map(function (v) { return +v.toFixed(1); }) };
    },
    where: function () { rig.updateMatrixWorld(true); var h = headWorld(new THREE.Vector3()); return { x: +h.x.toFixed(2), z: +h.z.toFixed(2), y: +rig.position.y.toFixed(2), size: state.pscale, place: placeIdx, eye: +(h.y - rig.position.y).toFixed(2) }; },
    stats: function () { return { chunks: terrain.chunks.size, meshes: terrainMeshes.size, pending: stream.list.length - stream.idx, tris: renderer.info.render.triangles }; },
    look: function (id) { var v = objViews.get(id); if (!v) return null; var ms = Array.from(v.meshes.values()).filter(Boolean); return { meshes: ms.length, crystal: ms.length > 0 && ms.every(function (m) { return m.material === crystalMat || (m.material.userData.skin && m.material.transparent); }), skin: ms.length > 0 && ms.every(function (m) { return !!m.material.userData.skin; }) }; },
    land: function () { var n = 0; [terrainMeshes, ar.meshes].forEach(function (m) { m.forEach(function (x) { if (x) n += x.children.length; }); }); return { decals: studio.decals.size, overlays: n, picked: state.landSkin, mark: landMark.visible }; },
    boards: function () { var out = []; boardViews.forEach(function (v, id) { out.push({ id: id, plat: v.info.plat, label: v.info.label, w: v.rec.w, h: v.rec.h, at: v.rec.at, mode: v.rec.mode, visible: v.group.visible, live: live.has(id), shown: live.has(id) && live.get(id).el.style.visibility, src: live.has(id) ? live.get(id).el.querySelector('iframe').src : null, pos: v.group.position.toArray().map(function (x) { return +x.toFixed(2); }) }); }); return { boards: out, picked: state.board, links: prefs.links.map(function (l) { return l.url; }), link: state.link }; },
    boardScreen: function (id) { var v = boardViews.get(id); if (!v) return null; var p = v.group.position.clone(); worldRoot.localToWorld(p); p.project(camera); return [(p.x + 1) / 2 * innerWidth, (1 - p.y) / 2 * innerHeight]; },
    nav: function () { syncNav(performance.now() + 1000); camera.updateMatrixWorld(true); return { shown: navGroup.visible, moving: !!nav, hold: !!(nav && nav.hold), feet: rig.position.toArray().map(function (x) { return +x.toFixed(2); }), yaw: +headYaw().toFixed(3),
      arrows: navArrows.map(function (n) { var v = n.g.position.clone().project(camera); return { name: n.name, blocked: n.blocked, p: n.g.position.toArray().map(function (x) { return +x.toFixed(2); }), dir: [+n.dir.x.toFixed(2), +n.dir.z.toFixed(2)], xy: [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight], onScreen: Math.abs(v.x) < 1 && Math.abs(v.y) < 1 && v.z < 1 }; }) }; },
    tour: function () { return { tourist: isTourist(), chosen: !!state.tour, forced: !visitorsMayBuild(), walk: prefs.walk, cam: camera.position.toArray().map(function (x) { return +x.toFixed(2); }), me: !!(selfAv && selfAv.g.visible), fly: state.fly, yaw: +rig.rotation.y.toFixed(3), y: +rig.position.y.toFixed(2) }; },
    navTap: function (name) { var n = navArrows.filter(function (x) { return x.name === name; })[0]; return n ? navTap(n) : false; },
    fold: function () { return { mode: fold.mode, scene: sceneRect(), sheet: sheetMode(), motionReduced: motionReduced() }; },
    addLink: function (u) { return addLink(u); }, boardAct: function (n) { boardAct(n); }, watch: function (id) { openWatch(id, 'immersive-vr'); }, pickBoard: function (id) { pickBoard(id); },
    media: function () { return { skies: media.skies.map(function (r) { return r.name; }), sounds: media.sounds.map(function (r) { return { id: r.id, name: r.name, dur: r.dur }; }), env: state.env, envName: envName(state.env), skyPhoto: sky.material === skyPhotoMat, ambient: prefs.ambient, toolSounds: prefs.toolSounds, link: link ? { state: link.state, code: linkCode(), names: link.names() } : null, amb: amb.id, loops: loops.size, listener: !!listener }; },
    startLink: function () { startLink(); }, receive: function (a) { return receiveAsset(a); }, linkURL: function () { return phoneURL(); },
    photos: function () { return photos.map(function (p) { return { id: p.id, size: p.d.length }; }); }, snapshot: function () { return snapshotView(); }, renderer: renderer,
    // Simulated controllers: drive the VR / AR controller code without a headset.
    xr: { hands: hands, panel: panel, rig: rig, ar: ar, vr: vrFrame, arStep: function (dt, now) { applyPlate(); handsFrame(dt, now); syncObjects(); }, draw: drawPanel, state: state, sel: function (ids) { setSelection(ids); } } };
  if (DEBUG) window.kilnworksDebug.portal = { place: placePortal, go: goToPortal, rec: function () { return myPortal(); }, where: function () { rig.updateMatrixWorld(true); var h = headWorld(new THREE.Vector3()); return [h.x, h.y, h.z, headYaw()]; } };

  // ---------- Boot ----------
  // Arriving through a portal from another VR page: the browser may grant a session we can start without a tap.
  var granted = !!window.__xrGranted, booted = false;
  addEventListener('xrgranted', function () {
    granted = true; if (booted && !renderer.xr.isPresenting) startXR(prefs.mode === 'immersive-ar' ? 'immersive-ar' : 'immersive-vr');
  });
  (async function boot() {
    await loadMedia(); mediaLoaded = true; setEnv(state.env);
    if (prefs.linkOn) startLink();
    var hadLocal = await loadLocal();
    savedVersion = studio.version;
    applyFog(); spawn(); streamTerrain(1500); spawn();
    renderer.setAnimationLoop(frame);
    if (hadLocal) toast('Welcome back. Your world is as you left it.');
    updateNetUi();
    // Installed as a Quest app: launching from the app icon counts as the tap WebXR needs,
    // so open straight into the headset, in whichever mode (VR or AR) was used last.
    var installed = typeof window.getDigitalGoodsService !== 'undefined' || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
    var fromPalace = /[?&]via=palace\b/.test(location.search);
    if (fromPalace) { arriveFromPalace(); $('#helpCard').hidden = true; try { history.replaceState(null, '', location.pathname + (DEBUG ? '?debug' : '')); } catch (e) { } }
    booted = true;
    if (granted) { $('#helpCard').hidden = true; startXR(prefs.mode === 'immersive-ar' ? 'immersive-ar' : 'immersive-vr'); }
    else if (installed && navigator.xr) { $('#helpCard').hidden = true; startXR(prefs.mode === 'immersive-ar' ? 'immersive-ar' : 'immersive-vr'); }
  })();
})();
