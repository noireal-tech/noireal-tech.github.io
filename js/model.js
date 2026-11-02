/* Endless Clay studio model: terrain + clay objects + groups. Every change is a small op that
   applies the same way on every player's machine. Undo is local and broadcasts a restore op. */
(function (root) {
  'use strict';
  var E = root.ClayEngine || (typeof require === 'function' ? require('./engine.js') : null);
  var OBJ_N = 32, OBJ_V = 0.04, OBJ_HALF = 0.4, BRICK = 4;
  var MOLDS = ['sphere', 'cone', 'cube', 'cylinder', 'torus', 'gem'];
  // Shapes have a finish: clay (0) or crystal (1), see-through glass whose colours act as its tint.
  // A shape can also wear a skin: a photo from the world's skin library, laid on with a fit: 'wrap' (across the front,
  // mirrored round the back), 'around' (once all the way round, 360°), 'box' (on each side) or 'front' (straight through).
  // Its photo position sx = [move right, move up, turn (radians), zoom] adjusts where the photo sits.
  // Land skins (decals) project a photo onto the land: centre c, facing n, photo-up u, width s, height/width a.
  // A shape can carry a sound from the world's sound library (snd), played when touched, or looping nearby (sl = 1).
  // Billboards are framed windows on a social post (url) placed in the world: centre p and turn q (a quaternion),
  // width w and height h in meters, fixed in space or attached to a shape (at: its id, with p and q in its own space),
  // and played automatically when someone comes near (mode 'auto') or when clicked ('click').
  // Molds can be cast hollow: a closed wall SHELL meters thick.
  var FITS = ['wrap', 'around', 'box', 'front'], MAX_SKIN = 700000, SX0 = [0, 0, 0, 1];
  function num(v, lo, hi, dflt) { v = +v; return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : dflt; }
  function fin(x) { return typeof x === 'number' && isFinite(x); }
  // A point or direction: three finite numbers (kept inside ±10,000 km); anything else is refused, not patched up.
  function vec(v) { return Array.isArray(v) && v.length === 3 && v.every(fin) ? v.map(function (x) { return Math.min(1e7, Math.max(-1e7, x)); }) : null; }
  function unit(v) { v = vec(v); var l = v && Math.hypot(v[0], v[1], v[2]); return l > 1e-6 ? v.map(function (x) { return x / l; }) : null; }
  function skinXf(x) { return Array.isArray(x) ? [num(x[0], -100, 100, 0), num(x[1], -100, 100, 0), num(x[2], -100, 100, 0), num(x[3], 0.05, 20, 1)] : SX0.slice(); }
  // A land skin from an op or a save, cleaned up; null if it isn't usable.
  function landSkin(d) {
    if (!d || typeof d.id !== 'string' || typeof d.sk !== 'string') return null;
    var c = vec(d.c), n = unit(d.n), u = unit(d.u); if (!c || !n || !u) return null;
    var k = u[0] * n[0] + u[1] * n[1] + u[2] * n[2]; u = unit([u[0] - n[0] * k, u[1] - n[1] * k, u[2] - n[2] * k]); if (!u) return null; // keep up flat to the face
    return { id: d.id, sk: d.sk, c: c, n: n, u: u, s: num(d.s, 0.1, 16, 2), a: num(d.a, 0.1, 10, 0.75) };
  }
  var MAX_SOUND = 4000000, SHELL = 0.06;
  function billboard(d) {
    if (!d || typeof d.id !== 'string' || typeof d.url !== 'string' || d.url.length > 2000 || !/^https:\/\/[^\s"'<>]+$/.test(d.url)) return null;
    var p = vec(d.p), q = Array.isArray(d.q) && d.q.length === 4 ? d.q.map(function (x) { return num(x, -1, 1, 0); }) : null; if (!p || !q) return null;
    var l = Math.hypot(q[0], q[1], q[2], q[3]); if (l < 1e-6) return null;
    return { id: d.id, url: d.url, p: p, q: q.map(function (x) { return x / l; }), w: num(d.w, 0.1, 50, 1.6), h: num(d.h, 0.1, 50, 0.9),
      at: typeof d.at === 'string' ? d.at : null, mode: d.mode === 'auto' ? 'auto' : 'click' };
  }
  // Things placed in the world that are not shapes: land skins and billboards. Each kind has its map, a check,
  // a version the renderer watches, and its key in restore ops and saves.
  var PLACED = { decal: { map: 'decals', clean: function (d) { return landSkin(d); }, ver: 'decalVer', key: 'dc' }, board: { map: 'boards', clean: billboard, ver: 'boardVer', key: 'bb' } };
  // Ops and records come from the network and from files, so they are checked before anything uses them: a bad one
  // is skipped (the same way on every machine) rather than throwing halfway or locking up the terrain.
  var WARPS = ['taper', 'twist', 'lean', 'bulge'], BRUSHES = { add: 5, carve: 4, smooth: 4, paint: 5, groove: 7, flat: 7, block: 4, coil: 8, slice: 7 };
  function ids(a) { return Array.isArray(a) ? a.filter(function (x) { return typeof x === 'string'; }) : []; }
  function rot(r) { return Array.isArray(r) && r.length >= 1 && r.length <= 4 && r.every(fin) ? r.map(function (x) { return Math.min(1e3, Math.max(-1e3, x)); }) : null; }
  function scl(v) { return Array.isArray(v) && v.length === 3 && v.every(function (x) { return fin(x) && x > 0; }) ? v.map(function (x) { return Math.min(4e6, Math.max(1e-4, x)); }) : null; }
  // A shape record (from a paste, a restore or a save) with a usable id, mold, place, turn and size; otherwise null.
  function cleanRec(rec) {
    if (!rec || typeof rec.id !== 'string' || MOLDS.indexOf(rec.m) < 0) return null;
    var p = vec(rec.p), r = rot(rec.r), s = scl(rec.s);
    return p && r && s ? Object.assign({}, rec, { p: p, r: r, s: s }) : null;
  }
  // Brush arguments: the right count of finite numbers. On the endless land (which has no edge to stop at) the
  // brush also has to be a sensible size: up to 30 m across a stroke, 60 m along one.
  function okBrush(land, f, a) {
    var n = BRUSHES[f]; if (!n || !Array.isArray(a) || a.length < n) return false;
    for (var i = 0; i < n; i++) if (!fin(a[i]) || Math.abs(a[i]) > 1e7) return false;
    if (!land || f === 'block') return true;
    var seg = f === 'groove' || f === 'coil';
    return a[seg ? 6 : 3] <= 30 && (!seg || Math.hypot(a[3] - a[0], a[4] - a[1], a[5] - a[2]) <= 60) && (f !== 'flat' && f !== 'slice' || a[6] <= 30);
  }
  function okSound(d) { return typeof d === 'string' && d.length < MAX_SOUND && /^data:audio\/[a-z0-9.+-]+(;[a-z0-9=.+-]+)*;base64,[A-Za-z0-9+/=]+$/.test(d); }
  function okSkin(d) { return typeof d === 'string' && d.length < MAX_SKIN && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(d); }

  // opts.palette colours the land; opts.shapePalette (optional) colours shapes and may carry per-colour alpha.
  function Studio(opts) {
    this.palette = opts.palette; this.shapePalette = opts.shapePalette || opts.palette;
    this.terrain = new E.ClayTerrain({ voxel: 0.15, palette: opts.palette });
    this.terrain.reset(opts.seed || 7, true);
    this.objects = new Map();
    this.removed = [];      // ids deleted since the renderer last looked
    this.skins = new Map(); // skin id → photo (data URL)
    this.decals = new Map(); this.decalVer = 0; // land skins
    this.boards = new Map(); this.boardVer = 0; // billboards
    this.sounds = new Map(); // sound id → recording (data URL)
    this.undoStack = []; this.redoStack = [];
    this.action = null;
    this.version = 0;
  }
  var S = Studio.prototype;
  Studio.OBJ_HALF = OBJ_HALF; Studio.BRICK = BRICK; Studio.MOLDS = MOLDS; Studio.FITS = FITS; Studio.okSkin = okSkin; Studio.landSkin = landSkin; Studio.okSound = okSound; Studio.billboard = billboard;

  S.newGrid = function () {
    var h = OBJ_N * OBJ_V / 2;
    return new E.ClayWorld({ nx: OBJ_N, ny: OBJ_N, nz: OBJ_N, voxel: OBJ_V, origin: [-h, -h, -h], bedrock: 0, palette: this.shapePalette });
  };
  S._make = function (id, mold, p, r, s, gid) {
    var o = { id: id, mold: mold, p: p.slice(), r: r.slice(), s: s.slice(), gid: gid || null, cr: 0, sk: null, fit: 'wrap', sx: SX0.slice(), snd: null, sl: 0, w: this.newGrid(), xver: 1 };
    this.objects.set(id, o); return o;
  };
  S.get = function (id) { return this.objects.get(id); };
  // Full copy of a shape's state, for undo.
  function snap(o) { return { id: o.id, m: o.mold, p: o.p.slice(), r: o.r.slice(), s: o.s.slice(), g: o.gid, cr: o.cr, sk: o.sk, fit: o.fit, sx: o.sx.slice(), snd: o.snd, sl: o.sl, d: new Uint8Array(o.w.d), c: new Uint8Array(o.w.c) }; }
  // Make the shape with this id match a record (creating it if needed); placement and group only.
  S._place = function (rec) {
    var o = this.objects.get(rec.id) || this._make(rec.id, rec.m, rec.p, rec.r, rec.s, rec.g);
    o.mold = rec.m; o.p = rec.p.slice(); o.r = rec.r.slice(); o.s = rec.s.slice(); o.gid = rec.g || null; o.cr = rec.cr ? 1 : 0;
    o.sk = typeof rec.sk === 'string' ? rec.sk : null; o.fit = FITS.indexOf(rec.fit) >= 0 ? rec.fit : 'wrap'; o.sx = skinXf(rec.sx);
    o.snd = typeof rec.snd === 'string' ? rec.snd : null; o.sl = rec.sl ? 1 : 0; o.xver++;
    return o;
  };
  S._drop = function (id) { if (this.objects.delete(id)) this.removed.push(id); };
  S._clear = function () { var self = this; this.objects.forEach(function (x) { self.removed.push(x.id); }); this.objects.clear(); };
  S.membersOf = function (id) {
    var o = this.objects.get(id); if (!o) return [];
    if (!o.gid) return [id];
    var out = []; this.objects.forEach(function (x) { if (x.gid === o.gid) out.push(x.id); }); return out;
  };

  function brush(w, f, a) {
    if (f === 'add') w.addSphere(a[0], a[1], a[2], a[3], a[4]);
    else if (f === 'carve') w.carveSphere(a[0], a[1], a[2], a[3]);
    else if (f === 'smooth') w.smoothSphere(a[0], a[1], a[2], a[3]);
    else if (f === 'paint') w.paintSphere(a[0], a[1], a[2], a[3], a[4]);
    else if (f === 'groove') w.grooveLine(a[0], a[1], a[2], a[3], a[4], a[5], a[6]);
    else if (f === 'flat') w.flattenAt(a[0], a[1], a[2], a[3], a[4], a[5], a[6]);
    else if (f === 'block') w.placeBlock(a[0], a[1], a[2], BRICK, a[3]);
    else if (f === 'coil') w.addCapsule(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7]);
    else if (f === 'slice') w.sliceAt(a[0], a[1], a[2], a[3], a[4], a[5], a[6]);
  }

  // Apply one op. Deterministic: the same op gives the same result everywhere.
  S.apply = function (op) {
    if (!op || typeof op.t !== 'string') return false;
    try { return this._apply(op); } catch (e) { return false; }
  };
  S._apply = function (op) {
    var self = this, o, r;
    switch (op.t) {
      case 'b':
        var w = op.g === 'T' ? this.terrain : (this.objects.get(op.g) || {}).w;
        if (w && okBrush(w === this.terrain, op.f, op.a)) brush(w, op.f, op.a);
        break;
      case 'new':
        r = cleanRec({ id: op.id, m: op.m, p: op.p, r: op.r, s: op.s });
        if (!r || this.objects.has(r.id)) break;
        o = this._make(r.id, r.m, r.p, r.r, r.s, null);
        o.w.fillMold(r.m, OBJ_HALF, op.c | 0, op.h ? SHELL : 0); o.cr = op.cr ? 1 : 0;
        break;
      case 'xf':
        (Array.isArray(op.l) ? op.l : []).forEach(function (e) {
          var x = Array.isArray(e) && self.objects.get(e[0]), p = x && vec(e[1]), rr = x && rot(e[2]), sc = x && scl(e[3]);
          if (p && rr && sc) { x.p = p; x.r = rr; x.s = sc; x.xver++; }
        });
        break;
      case 'warp':
        o = this.objects.get(op.id); if (o && WARPS.indexOf(op.k) >= 0) o.w.warp(op.k, num(op.a, -5, 5, 0), OBJ_HALF);
        break;
      case 'paint':
        o = this.objects.get(op.id); if (o) o.w.recolorAll(op.c | 0);
        break;
      case 'fin': // finish: crystal on (1) or back to clay (0), colours kept
        ids(op.ids).forEach(function (id) { var x = self.objects.get(id); if (x) { x.cr = op.cr ? 1 : 0; x.xver++; } });
        break;
      case 'skin': // add a photo to the world's skin library (never removed during a session, so undo can bring it back)
        if (typeof op.id !== 'string' || this.skins.has(op.id) || !okSkin(op.d)) break;
        this.skins.set(op.id, op.d);
        this.objects.forEach(function (x) { if (x.sk === op.id) x.xver++; }); // shapes waiting for this photo
        this.decalVer++;
        break;
      case 'sound': // add a recording to the world's sound library
        if (typeof op.id !== 'string' || this.sounds.has(op.id) || !okSound(op.d)) break;
        this.sounds.set(op.id, op.d);
        break;
      case 'voice': // give shapes a sound (snd null takes it off); loop = 1 plays it softly nearby, 0 when touched
        ids(op.ids).forEach(function (id) { var x = self.objects.get(id); if (x) { x.snd = typeof op.snd === 'string' ? op.snd : null; x.sl = op.loop ? 1 : 0; x.xver++; } });
        break;
      case 'skxf': // move, turn or zoom the photo on shapes
        ids(op.ids).forEach(function (id) { var x = self.objects.get(id); if (x) { x.sx = skinXf(op.x); x.xver++; } });
        break;
      case 'decal': case 'board': // put down (or change) a land skin or a billboard
        this._putPlaced(op.t, op.d);
        break;
      case 'undecal': case 'unboard':
        this._dropPlaced(op.t.slice(2), op.id);
        break;
      case 'wear': // put a skin on shapes (sk null takes it off)
        ids(op.ids).forEach(function (id) {
          var x = self.objects.get(id); if (!x) return;
          x.sk = typeof op.sk === 'string' ? op.sk : null; if (FITS.indexOf(op.fit) >= 0) x.fit = op.fit; x.xver++;
        });
        break;
      case 'flip':
        ids(op.ids).forEach(function (id) { var x = self.objects.get(id); if (x && (op.ax === 'x' || op.ax === 'y')) x.w.flip(op.ax); });
        break;
      case 'del':
        ids(op.ids).forEach(function (id) { self._drop(id); });
        break;
      case 'put': // paste: whole shapes, grids included, under fresh ids
        (Array.isArray(op.l) ? op.l : []).forEach(function (rec) { if (rec && typeof rec.w === 'string' && !self.objects.has(rec.id)) self.setRecord(rec); });
        break;
      case 'dup':
        (Array.isArray(op.l) ? op.l : []).forEach(function (e) {
          var src = Array.isArray(e) && self.objects.get(e[0]), p = src && vec(e[2]); if (!p || typeof e[1] !== 'string' || self.objects.has(e[1])) return;
          var n = self._make(e[1], src.mold, p, src.r, src.s, typeof op.gid === 'string' ? op.gid : null); n.w.copyFrom(src.w); n.cr = src.cr; n.sk = src.sk; n.fit = src.fit; n.sx = src.sx.slice(); n.snd = src.snd; n.sl = src.sl;
        });
        break;
      case 'grp':
        ids(op.ids).forEach(function (id) { var x = self.objects.get(id); if (x) { x.gid = typeof op.gid === 'string' ? op.gid : null; x.xver++; } });
        break;
      case 'restore':
        (Array.isArray(op.ch) ? op.ch : []).forEach(function (c) { if (Array.isArray(c) && Number.isSafeInteger(c[0]) && typeof c[1] === 'string') self.terrain.decodeChunk(c[0], c[1]); });
        (Array.isArray(op.ob) ? op.ob : []).forEach(function (rec) {
          if (rec && rec.gone) { if (typeof rec.id === 'string') self._drop(rec.id); } else self.setRecord(rec);
        });
        Object.keys(PLACED).forEach(function (kind) {
          (Array.isArray(op[PLACED[kind].key]) ? op[PLACED[kind].key] : []).forEach(function (rec) { if (rec && rec.gone) self._dropPlaced(kind, rec.id); else self._putPlaced(kind, rec); });
        });
        break;
      case 'reset':
        this._clear(); this.skins.clear(); this.sounds.clear(); this._clearPlaced();
        this.terrain.reset(op.seed || 7, true);
        this.undoStack.length = 0; this.redoStack.length = 0;
        break;
      default: return false;
    }
    this.version++;
    return true;
  };

  S.record = function (o, withGrid) {
    var r = { id: o.id, m: o.mold, p: o.p.slice(), r: o.r.slice(), s: o.s.slice(), g: o.gid };
    if (o.cr) r.cr = 1;
    if (o.sk) { r.sk = o.sk; r.fit = o.fit; if (!same(o.sx, SX0)) r.sx = o.sx.slice(); }
    if (o.snd) { r.snd = o.snd; if (o.sl) r.sl = 1; }
    if (withGrid) r.w = o.w.encodeAll();
    return r;
  };
  S.setRecord = function (rec) { rec = cleanRec(rec); if (!rec) return null; var o = this._place(rec); if (typeof rec.w === 'string') o.w.decodeAll(rec.w); return o; };

  // ---- Local actions and undo ----
  S._putPlaced = function (kind, d) { var k = PLACED[kind], r = k.clean(d); if (r) { this[k.map].set(r.id, r); this[k.ver]++; } return r; };
  S._dropPlaced = function (kind, id) { var k = PLACED[kind]; if (this[k.map].delete(id)) this[k.ver]++; };
  S._clearPlaced = function () { var self = this; Object.keys(PLACED).forEach(function (kind) { self[PLACED[kind].map].clear(); self[PLACED[kind].ver]++; }); };
  S.begin = function () { if (this.action) this.end(); this.action = { objs: new Map(), placed: new Map() }; this.terrain.beginStroke(); };
  // Remember a placed thing's state before an action changes it (null: it didn't exist).
  S.capturePlaced = function (kind, id) { var a = this.action, key = kind + ':' + id; if (a && !a.placed.has(key)) a.placed.set(key, { kind: kind, id: id, rec: this[PLACED[kind].map].get(id) || null }); };
  S.capture = function (id) {
    var a = this.action; if (!a || a.objs.has(id)) return;
    var o = this.objects.get(id);
    a.objs.set(id, o ? snap(o) : null);
  };
  // Apply an op made on this machine, remembering what it changes so it can be undone.
  S.local = function (op) {
    var self = this, own = !this.action;
    if (own) this.begin();
    var who = TOUCHES[op.t];
    (who ? who(op) : []).forEach(function (id) { if (typeof id === 'string') self.capture(id); });
    if ((op.t === 'decal' || op.t === 'board') && PLACED[op.t].clean(op.d)) this.capturePlaced(op.t, op.d.id);
    else if ((op.t === 'undecal' || op.t === 'unboard') && this[PLACED[op.t.slice(2)].map].has(op.id)) this.capturePlaced(op.t.slice(2), op.id);
    this.apply(op);
    if (own) this.end();
  };
  // The shapes each kind of op changes (captured first, for undo).
  function first(l, i) { return (Array.isArray(l) ? l : []).map(function (e) { return e && e[i]; }); }
  var TOUCHES = {
    b: function (op) { return op.g === 'T' ? [] : [op.g]; }, new: function (op) { return [op.id]; }, warp: function (op) { return [op.id]; }, paint: function (op) { return [op.id]; },
    xf: function (op) { return first(op.l, 0); }, dup: function (op) { return first(op.l, 1); }, put: function (op) { return first(op.l, 'id'); }
  };
  ['del', 'grp', 'flip', 'fin', 'wear', 'skxf', 'voice'].forEach(function (t) { TOUCHES[t] = function (op) { return ids(op.ids); }; });
  S.end = function () {
    var a = this.action; if (!a) return; this.action = null;
    var st = this.terrain.takeStroke();
    a.chunks = st && st.size ? st : null;
    if (a.chunks || a.objs.size || a.placed.size) { this.undoStack.push(a); if (this.undoStack.length > 30) this.undoStack.shift(); this.redoStack.length = 0; }
  };
  function same(a, b) { if (a.length !== b.length) return false; for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }
  // The current state of everything an entry touches, so it can be put back later (for redo / re-undo).
  S._captureLike = function (e) {
    var self = this, out = { objs: new Map(), chunks: null, placed: new Map() };
    e.placed.forEach(function (x, key) { out.placed.set(key, { kind: x.kind, id: x.id, rec: self[PLACED[x.kind].map].get(x.id) || null }); });
    if (e.chunks) { out.chunks = new Map(); e.chunks.forEach(function (snap, key) { out.chunks.set(key, self.terrain._snapshot(key)); }); }
    e.objs.forEach(function (rec, id) { var o = self.objects.get(id); out.objs.set(id, o ? snap(o) : null); });
    return out;
  };
  // Put an entry's saved state back. Returns the restore op to broadcast.
  S._applyEntry = function (a) {
    var self = this, op = { t: 'restore', ch: [], ob: [] };
    a.placed.forEach(function (x) {
      var k = PLACED[x.kind], list = op[k.key] = op[k.key] || [];
      if (x.rec) { self._putPlaced(x.kind, x.rec); list.push(x.rec); } else { self._dropPlaced(x.kind, x.id); list.push({ id: x.id, gone: 1 }); }
    });
    if (a.chunks) { a.chunks.forEach(function (snap, key) { self.terrain._restore(key, snap); op.ch.push([key, self.terrain.encodeChunk(key)]); }); this.terrain.version++; }
    a.objs.forEach(function (rec, id) {
      if (!rec) { self._drop(id); op.ob.push({ id: id, gone: 1 }); return; }
      var o = self.objects.get(id), gridSame = o && same(o.w.d, rec.d) && same(o.w.c, rec.c);
      o = self._place(rec);
      if (!gridSame) { o.w.d.set(rec.d); o.w.c.set(rec.c); o.w._changed(); }
      op.ob.push(self.record(o, !gridSame));
    });
    this.version++;
    return op;
  };
  // Undo the last local action. Returns the restore op to broadcast, or null.
  S.undo = function () {
    if (this.action) this.end();
    var a = this.undoStack.pop(); if (!a) return null;
    this.redoStack.push(this._captureLike(a));
    return this._applyEntry(a);
  };
  S.redo = function () {
    if (this.action) this.end();
    var r = this.redoStack.pop(); if (!r) return null;
    this.undoStack.push(this._captureLike(r));
    return this._applyEntry(r);
  };

  // Binary snapshot: [4-byte header length][header JSON][edited terrain chunks][object grids].
  // Only chunks someone changed are stored; everything else regenerates from the seed.
  S.serializeBin = function (extra) {
    var t = this.terrain, keys = t.modifiedKeys(), objs = [], self = this;
    this.objects.forEach(function (o) { objs.push(self.record(o, false)); });
    var sk = {}; this.skins.forEach(function (d, id) { sk[id] = d; });
    var au = {}; this.sounds.forEach(function (d, id) { au[id] = d; });
    var head = new TextEncoder().encode(JSON.stringify({ v: 4, seed: t.seed, keys: keys, objs: objs, sk: sk, dc: Array.from(this.decals.values()), bb: Array.from(this.boards.values()), au: au, x: extra || null }));
    var on = OBJ_N * OBJ_N * OBJ_N, out = new Uint8Array(4 + head.length + keys.length * 8192 + objs.length * on * 2), p;
    out[0] = head.length >>> 24; out[1] = (head.length >>> 16) & 255; out[2] = (head.length >>> 8) & 255; out[3] = head.length & 255;
    out.set(head, 4); p = 4 + head.length;
    keys.forEach(function (k) { var c = E.unkey(k), ch = t.chunk(c[0], c[1], c[2]); out.set(ch.d, p); out.set(ch.c, p + 4096); p += 8192; });
    this.objects.forEach(function (o) { out.set(o.w.d, p); out.set(o.w.c, p + on); p += on * 2; });
    return out;
  };
  S.deserializeBin = function (bytes) {
    try {
      var hl = (bytes[0] << 24 | bytes[1] << 16 | bytes[2] << 8 | bytes[3]) >>> 0;
      var head = JSON.parse(new TextDecoder().decode(bytes.subarray(4, 4 + hl)));
      var t = this.terrain, on = OBJ_N * OBJ_N * OBJ_N, p = 4 + hl, self = this;
      if (!head || head.v !== 4 || !Array.isArray(head.keys) || !Array.isArray(head.objs) || bytes.length !== p + head.keys.length * 8192 + head.objs.length * on * 2) return null;
      if (!head.keys.every(Number.isSafeInteger)) return null;
      var recs = head.objs.map(cleanRec); if (recs.some(function (r) { return !r; })) return null;
      t.reset(head.seed, false);
      this.skins.clear(); Object.keys(head.sk || {}).forEach(function (id) { if (okSkin(head.sk[id])) self.skins.set(id, head.sk[id]); });
      this.sounds.clear(); Object.keys(head.au || {}).forEach(function (id) { if (okSound(head.au[id])) self.sounds.set(id, head.au[id]); });
      this._clearPlaced();
      Object.keys(PLACED).forEach(function (kind) { (head[PLACED[kind].key] || []).forEach(function (d) { self._putPlaced(kind, d); }); });
      head.keys.forEach(function (k) { t.setChunk(k, bytes.subarray(p, p + 4096), bytes.subarray(p + 4096, p + 8192)); p += 8192; });
      this._clear();
      recs.forEach(function (rec) {
        var o = self._place(rec);
        o.w.d.set(bytes.subarray(p, p + on)); o.w.c.set(bytes.subarray(p + on, p + on * 2)); o.w._changed(); p += on * 2;
      });
      this.undoStack.length = 0; this.redoStack.length = 0; this.action = null; this.version++;
      return head;
    } catch (e) { return null; }
  };

  var api = { Studio: Studio };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ClayStudio = api;
})(this);
