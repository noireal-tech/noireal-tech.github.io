/* Endless Clay clay engine: density-field voxels, surface-nets meshing in 16³ chunks, brushes and molds.
   ClayWorld is one fixed grid (each shape has one); ClayTerrain is the endless, seeded world. */
(function (root) {
  'use strict';
  var CS = 16;      // chunk size in voxels
  var ISO = 128;    // surface threshold
  var RAMP = 64;    // density change per voxel across the surface

  function hash3(x, y, z) {
    var h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }
  function noise2(x, z, seed) {
    var xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
    var u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
    var a = hash3(xi, seed, zi), b = hash3(xi + 1, seed, zi), c = hash3(xi, seed, zi + 1), d = hash3(xi + 1, seed, zi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function clampI(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function smoothstep(e0, e1, x) { var t = clampI((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }

  // Face normals of an icosahedron (the directions of a dodecahedron's vertices).
  var GEM_N = (function () {
    var f = (1 + Math.sqrt(5)) / 2, g = 1 / f, out = [], raw = [];
    [-1, 1].forEach(function (a) { [-1, 1].forEach(function (b) { [-1, 1].forEach(function (c) { raw.push([a, b, c]); }); raw.push([0, a * g, b * f], [a * g, b * f, 0], [a * f, 0, b * g]); }); });
    raw.forEach(function (v) { var l = Math.hypot(v[0], v[1], v[2]); out.push(v[0] / l, v[1] / l, v[2] / l); });
    return out;
  })();
  var EDGES = [0, 1, 2, 3, 4, 5, 6, 7, 0, 2, 1, 3, 4, 6, 5, 7, 0, 4, 1, 5, 2, 6, 3, 7];

  function ClayWorld(opts) {
    opts = opts || {};
    this.nx = opts.nx || 128; this.ny = opts.ny || 48; this.nz = opts.nz || 128;
    this.voxel = opts.voxel || 0.15;
    var o = opts.origin || [-this.nx * this.voxel / 2, 0, -this.nz * this.voxel / 2];
    this.ox = o[0]; this.oy = o[1]; this.oz = o[2];
    var n = this.nx * this.ny * this.nz;
    this.d = new Uint8Array(n);
    this.c = new Uint8Array(n);
    this.ncx = Math.ceil(this.nx / CS); this.ncy = Math.ceil(this.ny / CS); this.ncz = Math.ceil(this.nz / CS);
    this.palette = opts.palette || [[0.6, 0.4, 0.3]];
    this.bedrock = opts.bedrock === undefined ? 2 : opts.bedrock;
    this.dirty = new Set();
    this.version = 0;
  }
  var P = ClayWorld.prototype;
  P.chunkCount = function () { return this.ncx * this.ncy * this.ncz; };
  P.idx = function (x, y, z) { return x + this.nx * (z + this.nz * y); };
  P.get = function (x, y, z) {
    if (x < 0 || y < 0 || z < 0 || x >= this.nx || y >= this.ny || z >= this.nz) return 0;
    return this.d[x + this.nx * (z + this.nz * y)];
  };
  P.colorAt = function (x, y, z) {
    if (x < 0 || y < 0 || z < 0 || x >= this.nx || y >= this.ny || z >= this.nz) return 0;
    return this.c[x + this.nx * (z + this.nz * y)];
  };
  P.chunkKey = function (i, j, k) { return i + this.ncx * (k + this.ncz * j); };
  P.keyToChunk = function (key) {
    var i = key % this.ncx, r = (key - i) / this.ncx, k = r % this.ncz, j = (r - k) / this.ncz;
    return [i, j, k];
  };
  P.markAllDirty = function () { for (var k = 0; k < this.chunkCount(); k++) this.dirty.add(k); };
  P._markDirty = function (x0, y0, z0, x1, y1, z1) {
    var i0 = clampI(Math.floor((x0 - 1) / CS), 0, this.ncx - 1), i1 = clampI(Math.floor((x1 + 1) / CS), 0, this.ncx - 1);
    var j0 = clampI(Math.floor((y0 - 1) / CS), 0, this.ncy - 1), j1 = clampI(Math.floor((y1 + 1) / CS), 0, this.ncy - 1);
    var k0 = clampI(Math.floor((z0 - 1) / CS), 0, this.ncz - 1), k1 = clampI(Math.floor((z1 + 1) / CS), 0, this.ncz - 1);
    for (var j = j0; j <= j1; j++) for (var k = k0; k <= k1; k++) for (var i = i0; i <= i1; i++) this.dirty.add(this.chunkKey(i, j, k));
  };
  // Clamp an edit box to the grid and mark the meshes it reaches dirty. Returns the box, or null if nothing is inside.
  P._touch = function (x0, y0, z0, x1, y1, z1) {
    x0 = Math.max(0, x0); y0 = Math.max(0, y0); z0 = Math.max(0, z0);
    x1 = Math.min(this.nx - 1, x1); y1 = Math.min(this.ny - 1, y1); z1 = Math.min(this.nz - 1, z1);
    if (x0 > x1 || y0 > y1 || z0 > z1) return null;
    this._markDirty(x0, y0, z0, x1, y1, z1);
    this.version++;
    return [x0, y0, z0, x1, y1, z1];
  };

  P.toGrid = function (wx, wy, wz) { var V = this.voxel; return [(wx - this.ox) / V, (wy - this.oy) / V, (wz - this.oz) / V]; };
  P.toWorld = function (gx, gy, gz) { var V = this.voxel; return [this.ox + gx * V, this.oy + gy * V, this.oz + gz * V]; };

  // Trilinear density at grid coordinates.
  P.sampleGrid = function (x, y, z) {
    var xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), fx = x - xi, fy = y - yi, fz = z - zi;
    var c000 = this.get(xi, yi, zi), c100 = this.get(xi + 1, yi, zi), c010 = this.get(xi, yi + 1, zi), c110 = this.get(xi + 1, yi + 1, zi);
    var c001 = this.get(xi, yi, zi + 1), c101 = this.get(xi + 1, yi, zi + 1), c011 = this.get(xi, yi + 1, zi + 1), c111 = this.get(xi + 1, yi + 1, zi + 1);
    var a = c000 + (c100 - c000) * fx, b = c010 + (c110 - c010) * fx, c = c001 + (c101 - c001) * fx, d = c011 + (c111 - c011) * fx;
    var e = a + (b - a) * fy, f = c + (d - c) * fy;
    return e + (f - e) * fz;
  };
  P.sampleWorld = function (wx, wy, wz) { var V = this.voxel; return this.sampleGrid((wx - this.ox) / V, (wy - this.oy) / V, (wz - this.oz) / V); };
  P.solidAt = function (wx, wy, wz) { return this.sampleWorld(wx, wy, wz) >= ISO; };
  // How far (in voxels) a ray can travel from grid point (x, y, z) through known-empty space. 0 = unknown.
  P._airRun = function () { return 0; };

  // Ray against the clay surface. Origin/direction in world meters.
  P.raycast = function (ox, oy, oz, dx, dy, dz, maxDist) {
    var len = Math.hypot(dx, dy, dz); if (!len) return null;
    dx /= len; dy /= len; dz /= len;
    var V = this.voxel, step = 0.35, g0 = (ox - this.ox) / V, g1 = (oy - this.oy) / V, g2 = (oz - this.oz) / V;
    var maxT = (maxDist || 20) / V;
    if (this.sampleGrid(g0, g1, g2) >= ISO) return null;
    var prev = 0;
    for (var t = step; t <= maxT; t += step) {
      var px = g0 + dx * t, py = g1 + dy * t, pz = g2 + dz * t;
      if (this.sampleGrid(px, py, pz) >= ISO) {
        var lo = prev, hi = t;
        for (var it = 0; it < 8; it++) {
          var mid = (lo + hi) / 2;
          if (this.sampleGrid(g0 + dx * mid, g1 + dy * mid, g2 + dz * mid) >= ISO) hi = mid; else lo = mid;
        }
        var gx = g0 + dx * hi, gy = g1 + dy * hi, gz = g2 + dz * hi, h = 0.6;
        var nx = this.sampleGrid(gx - h, gy, gz) - this.sampleGrid(gx + h, gy, gz);
        var ny = this.sampleGrid(gx, gy - h, gz) - this.sampleGrid(gx, gy + h, gz);
        var nz = this.sampleGrid(gx, gy, gz - h) - this.sampleGrid(gx, gy, gz + h);
        var nl = Math.hypot(nx, ny, nz) || 1;
        return { x: this.ox + gx * V, y: this.oy + gy * V, z: this.oz + gz * V, nx: nx / nl, ny: ny / nl, nz: nz / nl, dist: hi * V };
      }
      var run = this._airRun(px, py, pz, dx, dy, dz);
      if (run > step) t += run - step; // jump across empty chunks; the next sample lands one step past them
      prev = t;
    }
    return null;
  };

  // ---- Brushes (world units) ----
  // Point accessors: brushes go through these so the endless terrain can reuse them. Callers stay inside _touch's box.
  P.rd = function (x, y, z) { return this.d[x + this.nx * (z + this.nz * y)]; };
  P.wr = function (x, y, z, v) { this.d[x + this.nx * (z + this.nz * y)] = v; };
  P.wc = function (x, y, z, c) { this.c[x + this.nx * (z + this.nz * y)] = c; };
  // Add density v (keep the larger); newly solid points take the brush color.
  P._lay = function (x, y, z, v, color) {
    if (v <= 0) return; if (v > 255) v = 255;
    var od = this.rd(x, y, z);
    if (v > od) { if (od < ISO) this.wc(x, y, z, color); this.wr(x, y, z, v | 0); }
  };
  // Cut density down to v (keep the smaller).
  P._cut = function (x, y, z, v) {
    if (v >= 255) return; if (v < 0) v = 0;
    if (v < this.rd(x, y, z)) this.wr(x, y, z, v | 0);
  };
  P._box = function (cx, cy, cz, R) {
    return this._touch(Math.floor(cx - R), Math.floor(cy - R), Math.floor(cz - R), Math.ceil(cx + R), Math.ceil(cy + R), Math.ceil(cz + R));
  };
  P._capBox = function (a, b, R) {
    return this._touch(Math.floor(Math.min(a[0], b[0]) - R), Math.floor(Math.min(a[1], b[1]) - R), Math.floor(Math.min(a[2], b[2]) - R),
      Math.ceil(Math.max(a[0], b[0]) + R), Math.ceil(Math.max(a[1], b[1]) + R), Math.ceil(Math.max(a[2], b[2]) + R));
  };
  // Distance from grid point (x, y, z) to the segment a→b (e = b - a, L2 = |e|²).
  function segDist(x, y, z, a, ex, ey, ez, L2) {
    var t = L2 ? ((x - a[0]) * ex + (y - a[1]) * ey + (z - a[2]) * ez) / L2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
    return Math.hypot(x - a[0] - ex * t, y - a[1] - ey * t, z - a[2] - ez * t);
  }

  P.addSphere = function (wx, wy, wz, wr, color) {
    var g = this.toGrid(wx, wy, wz), r = wr / this.voxel;
    var b = this._box(g[0], g[1], g[2], r + 2.1); if (!b) return;
    for (var y = b[1]; y <= b[4]; y++) for (var z = b[2]; z <= b[5]; z++) for (var x = b[0]; x <= b[3]; x++)
      this._lay(x, y, z, ISO + (r - Math.hypot(x - g[0], y - g[1], z - g[2])) * RAMP, color);
  };
  P.carveSphere = function (wx, wy, wz, wr) {
    var g = this.toGrid(wx, wy, wz), r = wr / this.voxel;
    var b = this._box(g[0], g[1], g[2], r + 2.1); if (!b) return;
    for (var y = Math.max(b[1], this.bedrock); y <= b[4]; y++) for (var z = b[2]; z <= b[5]; z++) for (var x = b[0]; x <= b[3]; x++)
      this._cut(x, y, z, ISO + (Math.hypot(x - g[0], y - g[1], z - g[2]) - r) * RAMP);
  };
  P.smoothSphere = function (wx, wy, wz, wr) {
    var g = this.toGrid(wx, wy, wz), r = wr / this.voxel + 0.5;
    var b = this._box(g[0], g[1], g[2], r + 1); if (!b) return;
    var sx = b[3] - b[0] + 3, sy = b[4] - b[1] + 3, sz = b[5] - b[2] + 3, tmp = new Float32Array(sx * sy * sz);
    for (var y = 0; y < sy; y++) for (var z = 0; z < sz; z++) for (var x = 0; x < sx; x++)
      tmp[x + sx * (z + sz * y)] = this.get(b[0] + x - 1, b[1] + y - 1, b[2] + z - 1);
    for (y = Math.max(b[1], this.bedrock); y <= b[4]; y++) for (z = b[2]; z <= b[5]; z++) for (x = b[0]; x <= b[3]; x++) {
      var dist = Math.hypot(x - g[0], y - g[1], z - g[2]); if (dist > r) continue;
      var lx = x - b[0] + 1, ly = y - b[1] + 1, lz = z - b[2] + 1, sum = 0;
      for (var oy = -1; oy <= 1; oy++) for (var oz = -1; oz <= 1; oz++) for (var ox = -1; ox <= 1; ox++)
        sum += tmp[(lx + ox) + sx * ((lz + oz) + sz * (ly + oy))];
      var w = 0.65 * (1 - dist / r), od = this.rd(x, y, z);
      this.wr(x, y, z, Math.round(od + (sum / 27 - od) * w));
    }
  };
  P.paintSphere = function (wx, wy, wz, wr, color) {
    var g = this.toGrid(wx, wy, wz), r = wr / this.voxel + 1;
    var b = this._box(g[0], g[1], g[2], r); if (!b) return;
    for (var y = b[1]; y <= b[4]; y++) for (var z = b[2]; z <= b[5]; z++) for (var x = b[0]; x <= b[3]; x++) {
      if (Math.hypot(x - g[0], y - g[1], z - g[2]) > r) continue;
      if (this.rd(x, y, z) > 30) this.wc(x, y, z, color);
    }
  };
  // Block grid: a brick covers B voxels per side.
  P.blockAt = function (wx, wy, wz, B) {
    var g = this.toGrid(wx, wy, wz);
    return [Math.floor((g[0] + 0.5) / B), Math.floor((g[1] + 0.5) / B), Math.floor((g[2] + 0.5) / B)];
  };
  P.blockCenter = function (bx, by, bz, B) { var o = (B - 1) / 2; return this.toWorld(bx * B + o, by * B + o, bz * B + o); };
  P.placeBlock = function (bx, by, bz, B, color) {
    var o = (B - 1) / 2, cx = bx * B + o, cy = by * B + o, cz = bz * B + o, rnd = 0.7, inner = B / 2 - rnd;
    var b = this._touch(bx * B - 2, by * B - 2, bz * B - 2, bx * B + B + 1, by * B + B + 1, bz * B + B + 1); if (!b) return false;
    for (var y = b[1]; y <= b[4]; y++) for (var z = b[2]; z <= b[5]; z++) for (var x = b[0]; x <= b[3]; x++) {
      var qx = Math.abs(x - cx) - inner, qy = Math.abs(y - cy) - inner, qz = Math.abs(z - cz) - inner;
      var sd = Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - rnd;
      this._lay(x, y, z, ISO - sd * RAMP, color);
    }
    return true;
  };
  // Groove: gouge a capsule between two points, like dragging a loop tool.
  P.grooveLine = function (ax, ay, az, bx, by, bz, wr) {
    var a = this.toGrid(ax, ay, az), b = this.toGrid(bx, by, bz), r = wr / this.voxel;
    var box = this._capBox(a, b, r + 2.1); if (!box) return;
    var ex = b[0] - a[0], ey = b[1] - a[1], ez = b[2] - a[2], L2 = ex * ex + ey * ey + ez * ez;
    for (var y = Math.max(box[1], this.bedrock); y <= box[4]; y++) for (var z = box[2]; z <= box[5]; z++) for (var x = box[0]; x <= box[3]; x++)
      this._cut(x, y, z, ISO + (segDist(x, y, z, a, ex, ey, ez, L2) - r) * RAMP);
  };
  // Coil and Pull: lay a rope of clay between two points.
  P.addCapsule = function (ax, ay, az, bx, by, bz, wr, color) {
    var a = this.toGrid(ax, ay, az), b = this.toGrid(bx, by, bz), r = wr / this.voxel;
    var box = this._capBox(a, b, r + 2.1); if (!box) return;
    var ex = b[0] - a[0], ey = b[1] - a[1], ez = b[2] - a[2], L2 = ex * ex + ey * ey + ez * ez;
    for (var y = box[1]; y <= box[4]; y++) for (var z = box[2]; z <= box[5]; z++) for (var x = box[0]; x <= box[3]; x++)
      this._lay(x, y, z, ISO + (r - segDist(x, y, z, a, ex, ey, ez, L2)) * RAMP, color);
  };
  // Slice: cut away the clay on the +n side of a plane through (x, y, z), within radius wR of that point.
  P.sliceAt = function (wx, wy, wz, nx, ny, nz, wR) {
    var g = this.toGrid(wx, wy, wz), R = wR / this.voxel, nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl; ny /= nl; nz /= nl;
    var b = this._box(g[0], g[1], g[2], R); if (!b) return;
    for (var y = Math.max(b[1], this.bedrock); y <= b[4]; y++) for (var z = b[2]; z <= b[5]; z++) for (var x = b[0]; x <= b[3]; x++) {
      if (Math.hypot(x - g[0], y - g[1], z - g[2]) > R) continue;
      this._cut(x, y, z, ISO - ((x - g[0]) * nx + (y - g[1]) * ny + (z - g[2]) * nz) * RAMP);
    }
  };
  // Paddle: pull nearby clay toward the plane through the hit point, cutting high spots and filling dips.
  P.flattenAt = function (wx, wy, wz, nx, ny, nz, wr) {
    var g = this.toGrid(wx, wy, wz), r = wr / this.voxel, nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl; ny /= nl; nz /= nl;
    var fill = this.colorAt(Math.round(g[0] - nx * 1.5), Math.round(g[1] - ny * 1.5), Math.round(g[2] - nz * 1.5));
    var b = this._box(g[0], g[1], g[2], r + 1); if (!b) return;
    for (var y = Math.max(b[1], this.bedrock); y <= b[4]; y++) for (var z = b[2]; z <= b[5]; z++) for (var x = b[0]; x <= b[3]; x++) {
      var dist = Math.hypot(x - g[0], y - g[1], z - g[2]); if (dist > r) continue;
      var s = (x - g[0]) * nx + (y - g[1]) * ny + (z - g[2]) * nz;
      var target = ISO - s * RAMP; target = target < 0 ? 0 : target > 255 ? 255 : target;
      var old = this.rd(x, y, z), nv = Math.round(old + (target - old) * 0.55 * (1 - dist / r));
      if (old < ISO && nv >= ISO) this.wc(x, y, z, fill);
      this.wr(x, y, z, nv);
    }
  };

  // ---- Whole-grid operations (shapes) ----
  P._changed = function () { this.markAllDirty(); this.version++; };
  P.recolorAll = function (color) {
    for (var i = 0; i < this.d.length; i++) if (this.d[i] > 30) this.c[i] = color;
    this._changed();
  };
  P.copyFrom = function (o) { this.d.set(o.d); this.c.set(o.c); this._changed(); };
  // Mirror a shape's grid across its own centre: axis 'x' (left-right) or 'y' (upside down).
  P.flip = function (axis) {
    var nx = this.nx, ny = this.ny, nz = this.nz, od = new Uint8Array(this.d), oc = new Uint8Array(this.c);
    var cx = Math.round(-2 * this.ox / this.voxel), cy = Math.round(-2 * this.oy / this.voxel);
    for (var y = 0; y < ny; y++) for (var z = 0; z < nz; z++) for (var x = 0; x < nx; x++) {
      var sx = axis === 'x' ? cx - x : x, sy = axis === 'y' ? cy - y : y, i = this.idx(x, y, z);
      if (sx < 0 || sx >= nx || sy < 0 || sy >= ny) { this.d[i] = 0; continue; }
      var j = sx + nx * (z + nz * sy); this.d[i] = od[j]; this.c[i] = oc[j];
    }
    this._changed();
  };

  // Molds: fill the grid with a shape centred on the local origin. half = half-size in meters.
  // shell (optional): wall thickness in meters for a hollow cast; 0 or missing = solid.
  P.fillMold = function (kind, half, color, shell) {
    var V = this.voxel, rnd = half * 0.12, t = shell > 0 ? Math.max(shell, 1.6 * V) : 0;
    for (var y = 0; y < this.ny; y++) for (var z = 0; z < this.nz; z++) for (var x = 0; x < this.nx; x++) {
      var px = this.ox + x * V, py = this.oy + y * V, pz = this.oz + z * V, sd;
      if (kind === 'sphere') sd = Math.hypot(px, py, pz) - half;
      else if (kind === 'cube') {
        var inner = half - rnd, qx = Math.abs(px) - inner, qy = Math.abs(py) - inner, qz = Math.abs(pz) - inner;
        sd = Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - rnd;
      } else if (kind === 'cylinder') {
        var dx = Math.hypot(px, pz) - (half - rnd), dy = Math.abs(py) - (half - rnd);
        sd = Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - rnd;
      } else if (kind === 'torus') {
        sd = Math.hypot(Math.hypot(px, pz) - half * 0.62, py) - half * 0.32;
      } else if (kind === 'gem') { // icosahedron: furthest of its 20 face planes
        sd = -1e9;
        for (var q = 0; q < GEM_N.length; q += 3) { var dn = px * GEM_N[q] + py * GEM_N[q + 1] + pz * GEM_N[q + 2]; if (dn > sd) sd = dn; }
        sd -= half * 0.8;
      } else { // cone: base radius = half at the bottom, apex at the top
        var side = (Math.hypot(px, pz) - (half - py) / 2) * 0.894;
        sd = Math.max(side, Math.abs(py) - half);
      }
      if (t) sd = Math.abs(sd + t / 2) - t / 2; // keep only a wall of thickness t inside the surface
      var v = ISO - sd / V * RAMP; v = v < 0 ? 0 : v > 255 ? 255 : v;
      var i = this.idx(x, y, z); this.d[i] = v | 0; this.c[i] = color;
    }
    this._changed();
  };

  // Distort: resample the grid through a warp around the local origin. Hm = reference half-height in meters.
  P.warp = function (kind, amt, Hm) {
    var V = this.voxel, nx = this.nx, ny = this.ny, nz = this.nz, H = Hm / V;
    var gx0 = -this.ox / V, gy0 = -this.oy / V, gz0 = -this.oz / V;
    var od = new Uint8Array(this.d), oc = new Uint8Array(this.c);
    function at(x, y, z) { return (x < 0 || y < 0 || z < 0 || x >= nx || y >= ny || z >= nz) ? 0 : od[x + nx * (z + nz * y)]; }
    function tri(x, y, z) {
      var xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), fx = x - xi, fy = y - yi, fz = z - zi;
      var a = at(xi, yi, zi) + (at(xi + 1, yi, zi) - at(xi, yi, zi)) * fx, b = at(xi, yi + 1, zi) + (at(xi + 1, yi + 1, zi) - at(xi, yi + 1, zi)) * fx;
      var c = at(xi, yi, zi + 1) + (at(xi + 1, yi, zi + 1) - at(xi, yi, zi + 1)) * fx, d = at(xi, yi + 1, zi + 1) + (at(xi + 1, yi + 1, zi + 1) - at(xi, yi + 1, zi + 1)) * fx;
      var e = a + (b - a) * fy, f = c + (d - c) * fy; return e + (f - e) * fz;
    }
    for (var y = 0; y < ny; y++) for (var z = 0; z < nz; z++) for (var x = 0; x < nx; x++) {
      var rx = x - gx0, ry = y - gy0, rz = z - gz0, t = ry / H, sx = rx, sz = rz, f;
      if (kind === 'taper') { f = Math.max(0.15, 1 + amt * t); sx = rx / f; sz = rz / f; }
      else if (kind === 'twist') { var a = -amt * t, ca = Math.cos(a), sa = Math.sin(a); sx = rx * ca - rz * sa; sz = rx * sa + rz * ca; }
      else if (kind === 'lean') { sx = rx - amt * ry; }
      else if (kind === 'bulge') { f = Math.max(0.15, 1 + amt * (1 - Math.min(1, t * t))); sx = rx / f; sz = rz / f; }
      var X = sx + gx0, Y = ry + gy0, Z = sz + gz0, i = this.idx(x, y, z);
      this.d[i] = Math.round(tri(X, Y, Z));
      var cx = Math.round(X), cy = Math.round(Y), cz = Math.round(Z);
      this.c[i] = (cx < 0 || cy < 0 || cz < 0 || cx >= nx || cy >= ny || cz >= nz) ? oc[i] : oc[cx + nx * (cz + nz * cy)];
    }
    this._changed();
  };

  // Whole grid as text (multiplayer, clipboard, undo records).
  P.encodeAll = function () { var out = []; rle(this.d, out); rle(this.c, out); return toB64(new Uint8Array(out)); };
  P.decodeAll = function (b64) {
    var arrs = unrle(fromB64(b64), this.d.length, 2); if (!arrs) return false;
    this.d.set(arrs[0]); this.c.set(arrs[1]); this._changed(); return true;
  };
  P.surfaceY = function (wx, wz) {
    var g = this.toGrid(wx, 0, wz);
    for (var y = this.ny + 1; y >= 0; y -= 0.25) if (this.sampleGrid(g[0], y, g[2]) >= ISO) return this.oy + (y + 0.25) * this.voxel;
    return 0;
  };

  // ---- Meshing: surface nets ----
  // D/C: a flat window of densities/colors starting at grid point (wx, wy, wz), sx × sy × sz points, that covers
  // [l - 2, h + 2) on every axis. Edges starting at points [l, h) on each axis belong to this mesh.
  // Scratch buffers shared by every mesh build, grown as needed.
  // Palette entries are [r, g, b] or [r, g, b, alpha]; with alphas the mesh also carries one per vertex.
  var POS = new Float32Array(3 * 4096), NOR = new Float32Array(3 * 4096), COL = new Float32Array(3 * 4096), ALP = new Float32Array(4096), IND = new Uint32Array(6 * 4096);
  // One mesh build at a time, so its inputs live here rather than in closures (no garbage per chunk).
  var VMAP = new Int32Array(9261), CORNER = new Float64Array(8), CO = new Int32Array(8), OO = new Int32Array(8);
  var mD, mC, mwx, mwy, mwz, mSY, mSZ, mox, moy, moz, mV, mpal, mA, mnv, mni;
  function vert(cx, cy, cz) {
    var i0 = (cx - mwx) + mSZ * (cz - mwz) + mSY * (cy - mwy), v = VMAP[i0];
    if (v >= 0) return v;
    // Color comes from the solid corner nearest the surface, so skins read cleanly.
    var c = CORNER, D = mD, best = 0, bestD = 256, n, val;
    for (n = 0; n < 8; n++) { val = c[n] = D[i0 + CO[n]]; if (val >= ISO && val < bestD) { bestD = val; best = n; } }
    var px = 0, py = 0, pz = 0, cnt = 0;
    for (var e = 0; e < 24; e += 2) {
      var a = EDGES[e], b = EDGES[e + 1], da = c[a], db = c[b];
      if ((da >= ISO) !== (db >= ISO)) {
        var t = (ISO - da) / (db - da);
        px += (a & 1) + ((b & 1) - (a & 1)) * t;
        py += ((a >> 1) & 1) + (((b >> 1) & 1) - ((a >> 1) & 1)) * t;
        pz += ((a >> 2) & 1) + (((b >> 2) & 1) - ((a >> 2) & 1)) * t;
        cnt++;
      }
    }
    if (cnt) { px /= cnt; py /= cnt; pz /= cnt; } else { px = py = pz = 0.5; }
    var gx = (c[1] + c[3] + c[5] + c[7]) - (c[0] + c[2] + c[4] + c[6]);
    var gy = (c[2] + c[3] + c[6] + c[7]) - (c[0] + c[1] + c[4] + c[5]);
    var gz = (c[4] + c[5] + c[6] + c[7]) - (c[0] + c[1] + c[2] + c[3]);
    var gl = Math.hypot(gx, gy, gz);
    if (gl < 1e-6) { gx = 0; gy = -1; gz = 0; gl = 1; }
    if (3 * mnv + 3 > POS.length) { POS = grow(POS); NOR = grow(NOR); COL = grow(COL); ALP = grow(ALP); }
    var rgb = mpal[mC[i0 + CO[best]]] || mpal[0], occ = 0, o3 = 3 * mnv;
    for (n = 0; n < 8; n++) occ += D[i0 + OO[n]];
    var m = (0.93 + 0.1 * hash3(cx, cy, cz)) * clampI(1.25 - 0.6 * occ / (8 * 255), 0.5, 1);
    POS[o3] = mox + (cx + px) * mV; POS[o3 + 1] = moy + (cy + py) * mV; POS[o3 + 2] = moz + (cz + pz) * mV;
    NOR[o3] = -gx / gl; NOR[o3 + 1] = -gy / gl; NOR[o3 + 2] = -gz / gl;
    COL[o3] = rgb[0] * m; COL[o3 + 1] = rgb[1] * m; COL[o3 + 2] = rgb[2] * m;
    if (mA) ALP[mnv] = rgb[3];
    VMAP[i0] = mnv; return mnv++;
  }
  function quad(s0, v0, v1, v2, v3) {
    if (mni + 6 > IND.length) IND = grow(IND);
    IND[mni] = v0; IND[mni + 3] = v0;
    if (s0) { IND[mni + 1] = v1; IND[mni + 2] = v2; IND[mni + 4] = v2; IND[mni + 5] = v3; }
    else { IND[mni + 1] = v2; IND[mni + 2] = v1; IND[mni + 4] = v3; IND[mni + 5] = v2; }
    mni += 6;
  }
  // D/C hold n points (sx × sy × sz).
  function nets(D, C, n, wx, wy, wz, sx, sz, lx, hx, ly, hy, lz, hz, ox, oy, oz, V, pal) {
    var SY = sx * sz, SZ = sx;
    if (VMAP.length < n) VMAP = new Int32Array(n);
    VMAP.fill(-1, 0, n);
    mD = D; mC = C; mwx = wx; mwy = wy; mwz = wz; mSY = SY; mSZ = SZ; mox = ox; moy = oy; moz = oz; mV = V; mpal = pal; mA = pal[0].length > 3; mnv = 0; mni = 0;
    for (var k = 0; k < 8; k++) {
      CO[k] = (k & 1) + ((k >> 1) & 1) * SY + ((k >> 2) & 1) * SZ;
      OO[k] = ((k & 1) ? 2 : -1) + ((k & 2) ? 2 : -1) * SY + ((k & 4) ? 2 : -1) * SZ;
    }
    for (var y = ly; y < hy; y++) for (var z = lz; z < hz; z++) {
      var i = (lx - wx) + SZ * (z - wz) + SY * (y - wy);
      for (var x = lx; x < hx; x++, i++) {
        var s0 = D[i] >= ISO;
        if ((D[i + 1] >= ISO) !== s0) quad(s0, vert(x, y - 1, z - 1), vert(x, y, z - 1), vert(x, y, z), vert(x, y - 1, z));
        if ((D[i + SY] >= ISO) !== s0) quad(s0, vert(x - 1, y, z - 1), vert(x - 1, y, z), vert(x, y, z), vert(x, y, z - 1));
        if ((D[i + SZ] >= ISO) !== s0) quad(s0, vert(x - 1, y - 1, z), vert(x, y - 1, z), vert(x, y, z), vert(x - 1, y, z));
      }
    }
    mD = mC = mpal = null;
    if (!mni) return null;
    var nv = mnv, ni = mni;
    return {
      positions: POS.slice(0, 3 * nv), normals: NOR.slice(0, 3 * nv), colors: COL.slice(0, 3 * nv), alphas: mA ? ALP.slice(0, nv) : null,
      indices: nv < 65536 ? Uint16Array.from(IND.subarray(0, ni)) : IND.slice(0, ni)
    };
  }
  function grow(a) { var b = new a.constructor(a.length * 2); b.set(a); return b; }
  // Mesh the points [lx, hx) × [ly, hy) × [lz, hz): copy them plus a 2-point margin into a window, then run nets.
  // The window is scratch space reused by every mesh build; points the fill doesn't reach stay air.
  var WD = new Uint8Array(9261), WC = new Uint8Array(9261);
  P._mesh = function (lx, hx, ly, hy, lz, hz, clip) {
    var wx = lx - 2, wy = ly - 2, wz = lz - 2, sx = hx + 3 - wx, sy = hy + 3 - wy, sz = hz + 3 - wz, n = sx * sy * sz;
    if (WD.length < n) { WD = new Uint8Array(n); WC = new Uint8Array(n); }
    WD.fill(0, 0, n); WC.fill(0, 0, n);
    if (!this._fill(WD, WC, wx, wy, wz, sx, sy, sz, clip)) return null;
    return nets(WD, WC, n, wx, wy, wz, sx, sz, lx, hx, ly, hy, lz, hz, this.ox, this.oy, this.oz, this.voxel, this.palette);
  };
  // Fill a window from the grid (points outside count as air). Returns false when it holds no surface.
  P._fill = function (D, C, wx, wy, wz, sx, sy, sz) {
    var nx = this.nx, ny = this.ny, nz = this.nz, d = this.d, c = this.c, any = 0, all = 1;
    var xa = Math.max(0, wx), xb = Math.min(nx, wx + sx);
    for (var y = 0; y < sy; y++) {
      var Y = wy + y; if (Y < 0 || Y >= ny) { all = 0; continue; }
      for (var z = 0; z < sz; z++) {
        var Z = wz + z; if (Z < 0 || Z >= nz) { all = 0; continue; }
        var src = nx * (Z + nz * Y), dst = (xa - wx) + sx * (z + sz * y);
        for (var X = xa; X < xb; X++) { var v = d[src + X]; D[dst] = v; C[dst++] = c[src + X]; if (v >= ISO) any = 1; else all = 0; }
      }
    }
    if (xa > wx || xb < wx + sx) all = 0;
    return any && !all;
  };
  P.meshChunk = function (key) {
    var ch = this.keyToChunk(key);
    return this._mesh(ch[0] === 0 ? -1 : ch[0] * CS, Math.min(ch[0] * CS + CS, this.nx),
      ch[1] === 0 ? -1 : ch[1] * CS, Math.min(ch[1] * CS + CS, this.ny),
      ch[2] === 0 ? -1 : ch[2] * CS, Math.min(ch[2] * CS + CS, this.nz));
  };

  // ---- Encoding (run-length, base64) ----
  function rle(arr, out) {
    var i = 0, n = arr.length;
    while (i < n) { var v = arr[i], run = 1; while (i + run < n && arr[i + run] === v && run < 255) run++; out.push(run, v); i += run; }
  }
  function toB64(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'binary').toString('base64');
  }
  function fromB64(b64) {
    var bin = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function unrle(bytes, n, count) {
    var p = 0, res = [];
    for (var t = 0; t < count; t++) {
      var arr = new Uint8Array(n), i = 0;
      while (i < n) { if (p + 1 >= bytes.length) return null; var run = bytes[p++], v = bytes[p++]; arr.fill(v, i, i + run); i += run; }
      res.push(arr);
    }
    return res;
  }

  // ===================================================================================
  // Endless terrain: like Minecraft, the world is cut into 16³ chunks that are generated
  // from a seed only when something needs them. Unchanged chunks can be thrown away and
  // regenerated identically; only chunks someone edited are kept and saved.
  // ===================================================================================
  var NY = 64, NCY = NY / CS, OFF = 1048576, HOME = 64;
  function ckey(cx, cy, cz) { return ((cx + OFF) * 8 + cy) * 2097152 + (cz + OFF); }
  function unkey(k) { var cz = k % 2097152, r = (k - cz) / 2097152, cy = r % 8, cx = (r - cy) / 8; return [cx - OFF, cy, cz - OFF]; }
  function colKey(cx, cz) { return (cx + OFF) * 2097152 + (cz + OFF); }
  var AIR = { mn: 0, mx: 0 }; // stands in for chunks above and below the world

  function ClayTerrain(opts) {
    opts = opts || {};
    this.voxel = opts.voxel || 0.15;
    this.ox = -HOME * this.voxel; this.oy = 0; this.oz = -HOME * this.voxel;
    this.ny = NY; this.ncy = NCY;
    this.palette = opts.palette || [[0.6, 0.4, 0.3]];
    this.bedrock = 2;
    this.chunks = new Map(); this.cols = new Map(); this.feats = new Map();
    this.dirty = new Set(); this.stroke = null; this.version = 0; this.resetGen = 0;
    this._lk = -1; this._lc = null;
    this.seed = opts.seed || 7;
  }
  var T = ClayTerrain.prototype = Object.create(P);
  T.constructor = ClayTerrain;
  T.ckey = ckey; T.unkey = unkey;

  T.chunk = function (cx, cy, cz) {
    var k = ckey(cx, cy, cz);
    if (k === this._lk) return this._lc;
    var ch = this.chunks.get(k);
    if (!ch) { ch = this._gen(cx, cy, cz); this.chunks.set(k, ch); }
    this._lk = k; this._lc = ch; return ch;
  };
  T.get = function (x, y, z) {
    if (y < 0 || y >= NY) return 0;
    return this.chunk(x >> 4, y >> 4, z >> 4).d[(x & 15) + 16 * ((z & 15) + 16 * (y & 15))];
  };
  T.colorAt = function (x, y, z) {
    if (y < 0 || y >= NY) return 0;
    return this.chunk(x >> 4, y >> 4, z >> 4).c[(x & 15) + 16 * ((z & 15) + 16 * (y & 15))];
  };
  T.rd = T.get;
  T.wr = function (x, y, z, v) { this.chunk(x >> 4, y >> 4, z >> 4).d[(x & 15) + 16 * ((z & 15) + 16 * (y & 15))] = v; };
  T.wc = function (x, y, z, c) { this.chunk(x >> 4, y >> 4, z >> 4).c[(x & 15) + 16 * ((z & 15) + 16 * (y & 15))] = c; };
  // Lowest and highest density in a chunk (worked out when first asked, forgotten when it changes).
  T._range = function (cx, cy, cz) {
    if (cy < 0 || cy >= NCY) return AIR;
    var ch = this.chunk(cx, cy, cz);
    if (ch.mx < 0) { var d = ch.d, mn = 255, mx = 0; for (var i = 0; i < 4096; i++) { var v = d[i]; if (v < mn) mn = v; if (v > mx) mx = v; } ch.mn = mn; ch.mx = mx; }
    return ch;
  };
  T._edited = function (ch) { ch.mod = true; ch.mx = -1; };
  // Inside a chunk with no solid point, a ray can run to the chunk's far side untouched.
  T._airRun = function (x, y, z, dx, dy, dz) {
    var cx = Math.floor(x) >> 4, cy = Math.floor(y) >> 4, cz = Math.floor(z) >> 4;
    if (this._range(cx, cy, cz).mx >= ISO) return 0;
    var run = 1e9;
    if (dx > 0) run = Math.min(run, (cx * 16 + 15 - x) / dx); else if (dx < 0) run = Math.min(run, (x - cx * 16) / -dx);
    if (dy > 0) run = Math.min(run, (cy * 16 + 15 - y) / dy); else if (dy < 0) run = Math.min(run, (y - cy * 16) / -dy);
    if (dz > 0) run = Math.min(run, (cz * 16 + 15 - z) / dz); else if (dz < 0) run = Math.min(run, (z - cz * 16) / -dz);
    return run;
  };

  T._markDirty = function (x0, y0, z0, x1, y1, z1) {
    var i0 = Math.floor((x0 - 1) / CS), i1 = Math.floor((x1 + 1) / CS);
    var j0 = clampI(Math.floor((y0 - 1) / CS), 0, NCY - 1), j1 = clampI(Math.floor((y1 + 1) / CS), 0, NCY - 1);
    var k0 = Math.floor((z0 - 1) / CS), k1 = Math.floor((z1 + 1) / CS);
    for (var j = j0; j <= j1; j++) for (var k = k0; k <= k1; k++) for (var i = i0; i <= i1; i++) this.dirty.add(ckey(i, j, k));
  };
  T._snapshot = function (key) { var c = unkey(key), ch = this.chunk(c[0], c[1], c[2]); return { d: new Uint8Array(ch.d), c: new Uint8Array(ch.c) }; };
  T._restore = function (key, snap) {
    var c = unkey(key), ch = this.chunk(c[0], c[1], c[2]);
    ch.d.set(snap.d); ch.c.set(snap.c); this._edited(ch);
    this._markDirty(c[0] * CS, c[1] * CS, c[2] * CS, c[0] * CS + CS - 1, c[1] * CS + CS - 1, c[2] * CS + CS - 1);
  };
  // Terrain edits are unbounded sideways; within a stroke, each chunk's state before the stroke is kept for undo.
  T._touch = function (x0, y0, z0, x1, y1, z1) {
    y0 = Math.max(0, y0); y1 = Math.min(NY - 1, y1);
    if (y0 > y1) return null;
    for (var j = y0 >> 4; j <= y1 >> 4; j++) for (var k = z0 >> 4; k <= z1 >> 4; k++) for (var i = x0 >> 4; i <= x1 >> 4; i++) {
      var key = ckey(i, j, k);
      if (this.stroke && !this.stroke.has(key)) this.stroke.set(key, this._snapshot(key));
      this._edited(this.chunk(i, j, k));
    }
    this._markDirty(x0, y0, z0, x1, y1, z1);
    this.version++;
    return [x0, y0, z0, x1, y1, z1];
  };
  T.beginStroke = function () { this.stroke = new Map(); };
  T.takeStroke = function () { var s = this.stroke; this.stroke = null; return s; };
  T.encodeChunk = function (key) { var s = this._snapshot(key), out = []; rle(s.d, out); rle(s.c, out); return toB64(new Uint8Array(out)); };
  T.decodeChunk = function (key, b64) {
    var arrs = unrle(fromB64(b64), 4096, 2); if (!arrs) return false;
    this._restore(key, { d: arrs[0], c: arrs[1] }); this.version++; return true;
  };
  T.modifiedKeys = function () { var out = []; this.chunks.forEach(function (ch, k) { if (ch.mod) out.push(k); }); return out.sort(function (a, b) { return a - b; }); };
  T.setChunk = function (key, d, c) {
    var k = unkey(key), ch = this.chunk(k[0], k[1], k[2]);
    ch.d.set(d); ch.c.set(c); this._edited(ch); this.dirty.add(key);
  };
  // Forget unedited chunks far from (pcx, pcz); they regenerate identically when needed.
  T.evict = function (pcx, pcz, R) {
    var self = this, far = function (cx, cz, r) { return Math.abs(cx - pcx) > r || Math.abs(cz - pcz) > r; };
    this.chunks.forEach(function (ch, k) { if (ch.mod) return; var c = unkey(k); if (far(c[0], c[2], R)) self.chunks.delete(k); });
    this.cols.forEach(function (col, k) { if (far(col.cx, col.cz, R + 1)) self.cols.delete(k); });
    this.feats.forEach(function (f, k) { var cz = k % 2097152 - OFF, cx = (k - k % 2097152) / 2097152 - OFF; if (far(cx, cz, R + 2)) self.feats.delete(k); });
    this._lk = -1; this._lc = null;
  };
  T.reset = function (seed, starter) {
    this.seed = seed | 0 || 7;
    this.chunks.clear(); this.cols.clear(); this.feats.clear(); this.dirty.clear(); this.stroke = null;
    this._lk = -1; this._lc = null; this.version++; this.resetGen++;
    if (starter) this._starter();
  };
  // The home build in front of the spawn point: brick steps and two lumps.
  T._starter = function () {
    var B = 4, bx = 16, bz = 10, by = 3;
    var steps = [[-2, 0], [-1, 0], [-1, 1], [0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [1, 3]];
    for (var s = 0; s < steps.length; s++) this.placeBlock(bx + steps[s][0], by + steps[s][1], bz, B, s % 3 === 2 ? 5 : 0);
    this.addSphere(2.0, 2.2, -3.0, 0.62, 3);
    this.addSphere(2.0, 2.85, -3.0, 0.36, 5);
  };

  // ---- World generation ----
  // A calm home meadow around spawn; beyond it, biomes take over:
  // 1 meadow (sage over ochre, clay trees), 2 mesa (terraced terracotta bands, spires),
  // 3 highlands (slate and umber, boulders). Tall ground gets porcelain caps.
  // Also leaves how wild the spot is in this._wild and its biome in this._biome.
  T.heightAt = function (x, z) {
    var s = this.seed;
    var n = noise2(x / 30, z / 30, s) * 0.7 + noise2(x / 11, z / 11, s + 7) * 0.3;
    var h = 9 + n * 16;
    var f = smoothstep(14, 30, Math.hypot(x - HOME, z - HOME));
    h = 13 * (1 - f) + h * f;
    var wild = smoothstep(66, 150, Math.max(Math.abs(x - HOME), Math.abs(z - HOME))), biome = 0;
    if (wild > 0) {
      var cont = noise2(x / 240, z / 240, s + 33), r = 1 - Math.abs(2 * noise2(x / 70, z / 70, s + 21) - 1);
      var bsel = noise2(x / 180, z / 180, s + 50);
      var hw = 10 + cont * 14 + r * r * 26 * smoothstep(0.3, 0.8, cont) + (noise2(x / 9, z / 9, s + 3) - 0.5) * 3;
      if (bsel > 0.6) { biome = 2; var t = (hw + 4) / 6, fl = Math.floor(t); hw = (fl + smoothstep(0.65, 1, t - fl)) * 6 - 2; }
      else if (bsel < 0.32) biome = 3; else biome = 1;
      h = h * (1 - wild) + hw * wild;
    }
    this._wild = wild; this._biome = biome;
    return clampI(h, 4, NY - 8);
  };
  T._column = function (cx, cz) {
    var k = colKey(cx, cz), col = this.cols.get(k);
    if (col) return col;
    col = { cx: cx, cz: cz, h: new Float64Array(256), b: new Uint8Array(256) };
    for (var lz = 0; lz < 16; lz++) for (var lx = 0; lx < 16; lx++) {
      var x = cx * 16 + lx, z = cz * 16 + lz, i = lx + 16 * lz;
      col.h[i] = this.heightAt(x, z);
      // Dither biome edges so colors blend like kneaded clay instead of a hard line.
      col.b[i] = this._wild > hash3(x, this.seed + 77, z) ? this._biome : 0;
    }
    this.cols.set(k, col); return col;
  };
  function groundColor(biome, y, depth, h) {
    if (y < 3) return 6;
    if (biome === 2) { if (depth < 1) return 1; var band = Math.floor(y / 3) % 4; return band === 1 ? 1 : band === 3 ? 7 : 0; }
    if (biome === 3) { if (depth < 2) return h > 34 ? 5 : 4; return depth < 5 ? 6 : 4; }
    if (biome === 1) { if (depth < 2.5) return h > 34 ? 5 : 2; return depth < 5 ? 1 : 0; }
    return depth < 3 ? 2 : depth < 6 ? 1 : 0;
  }
  // One possible feature per column, picked from the seed (remembered, since every chunk around it asks).
  T._feature = function (fx, fz) {
    var k = colKey(fx, fz);
    if (this.feats.has(k)) return this.feats.get(k);
    var f = this._makeFeature(fx, fz); this.feats.set(k, f); return f;
  };
  T._makeFeature = function (fx, fz) {
    var s = this.seed;
    if (hash3(fx, s + 99, fz) > 0.3) return null;
    var px = fx * 16 + 2 + Math.floor(hash3(fx, s + 101, fz) * 12), pz = fz * 16 + 2 + Math.floor(hash3(fx, s + 103, fz) * 12);
    var h = this.heightAt(px, pz);
    if (this._wild < 0.6) return null;
    var biome = this._biome, a = hash3(fx, s + 107, fz), b = hash3(fx, s + 109, fz), f;
    if (biome === 1) { f = { kind: 'tree', x: px, z: pz, y: h - 1, th: 7 + a * 5, cr: 3.2 + b * 1.8, top: a > 0.5 ? 3 : 2 }; f.R = f.cr + 1.5; f.ymax = f.y + f.th + f.cr * 2; }
    else if (biome === 2) { f = { kind: 'spire', x: px, z: pz, y: h - 1, H: 9 + a * 8, rb: 2.4 + b * 1.6 }; f.R = f.rb + 1.5; f.ymax = f.y + f.H; }
    else { f = { kind: 'boulder', x: px, z: pz, y: h, r: 2 + a * 1.6 }; f.R = f.r + 1.5; f.ymax = f.y + f.r * 2; }
    return f.ymax < NY - 2 ? f : null;
  };
  var FV = 0, FC = 0; // featureAt's result: density and colour
  function featureAt(f, x, y, z) { // true if the feature reaches (x, y, z); its density and colour are left in FV, FC
    var dx = x - f.x, dz = z - f.z, sd, col;
    if (f.kind === 'tree') {
      var trunk = Math.max(Math.hypot(dx, dz) - 1.2, Math.max(f.y - y, y - (f.y + f.th)));
      var canopy = Math.hypot(dx, y - (f.y + f.th + f.cr * 0.6), dz) - f.cr;
      if (canopy < trunk) { sd = canopy; col = f.top; } else { sd = trunk; col = 6; }
    } else if (f.kind === 'spire') {
      var side = (Math.hypot(dx, dz) - f.rb * (1 - (y - f.y) / f.H)) * 0.85;
      sd = Math.max(side, Math.max(f.y - y, y - (f.y + f.H)));
      col = Math.floor(y / 3) % 2 ? 1 : 0;
    } else { sd = Math.hypot(dx, (y - (f.y + f.r * 0.4)) * 1.2, dz) - f.r; col = 4; }
    var v = ISO - sd * RAMP;
    if (v <= 0) return false;
    FV = v > 255 ? 255 : v | 0; FC = col; return true;
  }
  T._gen = function (cx, cy, cz) {
    var d = new Uint8Array(4096), c = new Uint8Array(4096), col = this._column(cx, cz), y0 = cy * 16, bed = this.bedrock;
    for (var ly = 0; ly < 16; ly++) {
      var y = y0 + ly;
      for (var lz = 0; lz < 16; lz++) for (var lx = 0; lx < 16; lx++) {
        var ci = lx + 16 * lz, h = col.h[ci], v = ISO + (h - y) * RAMP;
        if (y < bed) v = 255;
        v = v < 0 ? 0 : v > 255 ? 255 : v;
        var i = lx + 16 * (lz + 16 * ly);
        d[i] = v | 0; c[i] = groundColor(col.b[ci], y, h - y, h);
      }
    }
    // Stamp features whose anchor is in this or a neighbouring column.
    for (var fz = cz - 1; fz <= cz + 1; fz++) for (var fx = cx - 1; fx <= cx + 1; fx++) {
      var f = this._feature(fx, fz); if (!f) continue;
      var ya = Math.max(y0, Math.floor(f.y - 2)), yb = Math.min(y0 + 15, Math.ceil(f.ymax + 2)); if (ya > yb) continue;
      var xa = Math.max(cx * 16, Math.floor(f.x - f.R)), xb = Math.min(cx * 16 + 15, Math.ceil(f.x + f.R));
      var za = Math.max(cz * 16, Math.floor(f.z - f.R)), zb = Math.min(cz * 16 + 15, Math.ceil(f.z + f.R));
      for (var yy = ya; yy <= yb; yy++) for (var zz = za; zz <= zb; zz++) for (var xx = xa; xx <= xb; xx++) {
        if (!featureAt(f, xx, yy, zz)) continue;
        var j = (xx - cx * 16) + 16 * ((zz - cz * 16) + 16 * (yy - y0));
        if (FV > d[j]) { if (d[j] < ISO) c[j] = FC; d[j] = FV; }
      }
    }
    return { d: d, c: c, mod: false, mn: -1, mx: -1 };
  };

  // Copy a window of the world, chunk by chunk. clip (optional) = {x0, x1, z0, z1}: points outside count as air.
  T._fill = function (D, C, wx, wy, wz, sx, sy, sz, clip) {
    var any = 0, all = 1, xa = wx, xb = wx + sx;
    if (clip) { xa = Math.max(xa, clip.x0); xb = Math.min(xb, clip.x1); if (xa > wx || xb < wx + sx) all = 0; }
    for (var y = 0; y < sy; y++) {
      var Y = wy + y; if (Y < 0 || Y >= NY) { all = 0; continue; }
      var cy = Y >> 4, oy = 256 * (Y & 15);
      for (var z = 0; z < sz; z++) {
        var Z = wz + z; if (clip && (Z < clip.z0 || Z >= clip.z1)) { all = 0; continue; }
        var cz = Z >> 4, oyz = oy + 16 * (Z & 15), dst = (xa - wx) + sx * (z + sz * y);
        for (var X = xa; X < xb;) {
          var ch = this.chunk(X >> 4, cy, cz), dd = ch.d, cc = ch.c, end = Math.min(xb, (X & ~15) + 16);
          for (; X < end; X++) { var s = oyz + (X & 15), v = dd[s]; D[dst] = v; C[dst++] = cc[s]; if (v >= ISO) any = 1; else all = 0; }
        }
      }
    }
    return any && !all;
  };
  // A mesh for one chunk, or null when it has no surface. clip (optional) = {x0, x1, z0, z1}: a build-plate
  // rectangle in grid points. Everything outside counts as air and the plate's outer chunks own the closing
  // faces, so the cut-out block is solid.
  T.meshChunk = function (key, clip) {
    var k = unkey(key), x0 = k[0] * CS, y0 = k[1] * CS, z0 = k[2] * CS;
    // Quick out: the mesh only reads this chunk and the edges of its neighbours; if all of them are
    // all air (or, without a clip, all solid), there is no surface here.
    var air = true, solid = !clip;
    for (var j = -1; j <= 1 && (air || solid); j++) for (var kk = -1; kk <= 1; kk++) for (var i = -1; i <= 1; i++) {
      var r = this._range(k[0] + i, k[1] + j, k[2] + kk);
      if (r.mx >= ISO) air = false; if (r.mn < ISO) solid = false;
    }
    if (air || solid) return null;
    var lx = x0, lz = z0;
    if (clip) { if (x0 === clip.x0) lx = x0 - 1; if (z0 === clip.z0) lz = z0 - 1; }
    return this._mesh(lx, x0 + CS, k[1] === 0 ? -1 : y0, Math.min(y0 + CS, NY), lz, z0 + CS, clip);
  };

  var api = { ClayWorld: ClayWorld, ClayTerrain: ClayTerrain, ISO: ISO, ckey: ckey, unkey: unkey, toB64: toB64, fromB64: fromB64 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ClayEngine = api;
})(this);
