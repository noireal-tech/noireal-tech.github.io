/* Endless Clay multiplayer. Transport-agnostic: ops, ordered blobs (compressed, split into pieces),
   join snapshots and presence. The game's transport is PeerJS room codes (the tests bring their own). */
(function (root) {
  'use strict';
  var E = root.ClayEngine || (typeof require === 'function' ? require('./engine.js') : null);

  // Text and binary payloads travel as base64; gzip first when the browser can.
  // Prefix: 'z' gzip text, 'r' raw text, 'y' gzip bytes, 'b' raw bytes.
  var GZ = typeof CompressionStream !== 'undefined';
  function gzip(data) { return new Response(new Blob([data]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer().then(function (b) { return E.toB64(new Uint8Array(b)); }); }
  function gunzip(b64) { return new Response(new Blob([E.fromB64(b64)]).stream().pipeThrough(new DecompressionStream('gzip'))); }
  async function pack(str) { return GZ ? 'z' + await gzip(str) : 'r' + str; }
  async function unpack(s) { return s[0] === 'r' ? s.slice(1) : await gunzip(s.slice(1)).text(); }
  async function packBytes(bytes) { return GZ ? 'y' + await gzip(bytes) : 'b' + E.toB64(bytes); }
  async function unpackBytes(s) { return s[0] === 'b' ? E.fromB64(s.slice(1)) : new Uint8Array(await gunzip(s.slice(1)).arrayBuffer()); }

  function Net(studio, transport, hooks) {
    this.s = studio; this.tp = transport; this.h = hooks || {};
    this.synced = false; this.closed = false; this.visitorsBuild = false; // host only: may visitors change the world?
    this.batch = []; this.lastFlush = 0;
    this.outQ = []; this.lastSend = 0;
    this.inbound = new Map();
    this.buffer = []; this.snapMark = -1; this.seen = {};
    this.helloTries = 0; this.helloAt = 0; this.startAt = 0;
    this.myPresence = {}; this.presDirty = false; this.lastPres = 0; this.lastKeep = 0;
    this.seq = 0;
  }
  var N = Net.prototype;

  N.start = async function () {
    await this.tp.start(this);
    this.startAt = Date.now();
    if (this.tp.hosting) this._becomeSynced();
    this.setPresence({ sy: this.synced ? 1 : 0 });
    var self = this;
    this.timer = setInterval(function () { self.tick(Date.now()); }, 40);
    this._status();
  };
  N.close = function () { this.closed = true; clearInterval(this.timer); try { this.tp.close(); } catch (e) { } };
  N.peers = function () { return this.tp.peers(); };
  // The host's own presence (guests only), told apart by its connection, so a visitor can't pass for the host.
  N.hostPresence = function () { return this.tp.hostPresence ? this.tp.hostPresence() : null; };
  N._status = function () { if (this.h.onStatus) this.h.onStatus(this); };

  // Host: the transport's fixed host (room codes) or the lowest id among synced players.
  N.isHost = function () {
    if (this.tp.fixedHost) return !!this.tp.hosting;
    if (!this.synced) return false;
    var ids = this.tp.peers().filter(function (p) { return p.isMe || (p.presence && p.presence.sy); }).map(function (p) { return p.id; }).sort();
    return ids[0] === this.tp.id;
  };

  N.setPresence = function (patch) {
    for (var k in patch) this.myPresence[k] = patch[k];
    this.presDirty = true;
  };

  // ---- outbound ----
  N.send = function (op) {
    if (this.closed) return;
    var last = this.batch[this.batch.length - 1];
    if (op.t === 'xf' && last && last.t === 'xf') {
      var ids = {}; op.l.forEach(function (e) { ids[e[0]] = 1; });
      last.l = last.l.filter(function (e) { return !ids[e[0]]; }).concat(op.l);
      return;
    }
    this.batch.push(op);
  };
  N._flushBatch = function () {
    if (!this.batch.length) return;
    var l = this.batch; this.batch = [];
    var json = JSON.stringify(l);
    if (json.length <= this.tp.max) this.outQ.push({ ready: true, msgs: [{ k: 'ops', q: ++this.seq, l: l }] });
    else this._enqueueBlob('ops', json, null);
  };
  // Every ops message and blob carries this sender's running number, so a joiner can tell which
  // messages its snapshot already contains.
  N._enqueueBlob = function (kind, str, to) {
    var q = ++this.seq, item = { ready: false, msgs: [] }, self = this, id = (this.tp.id || 'x') + ':' + q;
    this.outQ.push(item);
    (typeof str === 'string' ? pack(str) : packBytes(str)).then(function (p) {
      var size = self.tp.max - 200, n = Math.max(1, Math.ceil(p.length / size));
      for (var i = 0; i < n; i++) item.msgs.push({ k: 'pc', id: id, q: q, i: i, n: n, kind: kind, to: to || undefined, s: p.slice(i * size, (i + 1) * size) });
      item.ready = true;
    }).catch(function () { item.ready = true; });
  };
  N.tick = function (now) {
    if (this.closed) return;
    if (now - this.lastFlush >= 100) { this._flushBatch(); this.lastFlush = now; }
    var gap = this.tp.interval || 0;
    while (this.outQ.length && this.outQ[0].ready && now - this.lastSend >= gap) {
      var item = this.outQ[0], m = item.msgs.shift();
      if (m) { this.tp.emit(m); this.lastSend = now; if (gap) break; }
      if (!item.msgs.length) this.outQ.shift();
    }
    var presGap = this.tp.presenceInterval || 120;
    if (this.presDirty && now - this.lastPres >= presGap) {
      this.tp.setPresence(this.myPresence); this.presDirty = false; this.lastPres = now; this.lastKeep = now;
    } else if (this.tp.keepalive && now - this.lastKeep > 2000) { this.tp.setPresence(this.myPresence); this.lastKeep = now; }
    this._joinTick(now);
  };

  // ---- joining ----
  N._joinTick = function (now) {
    if (this.synced) return;
    var others = this.tp.peers().filter(function (p) { return !p.isMe && p.presence && p.presence.sy; });
    var since = now - this.startAt;
    if (this.snapMark >= 0) return; // a snapshot is on its way
    if (!this.tp.fixedHost && !others.length && since > 2500) { this._becomeSynced(); return; }
    if ((others.length || this.tp.fixedHost) && now - this.helloAt > 4000) {
      if (this.helloTries >= 3) { this._becomeSynced(); if (this.h.onWarn) this.h.onWarn('Could not fetch the shared world; kept yours.'); return; }
      this.helloTries++; this.helloAt = now;
      this.tp.emit({ k: 'hello' });
    }
  };
  N._becomeSynced = function () {
    var self = this, buf = this.buffer || [], seen = this.snapSeen || {};
    this.synced = true; this.buffer = null; this.snapMark = -1; this.snapSeen = null;
    buf.forEach(function (b) { if (b.q > (seen[b.from] || 0)) self._applyOps(b.from, b.q, b.ops); });
    this.setPresence({ sy: 1 });
    this._status();
    if (this.h.onSynced) this.h.onSynced();
  };

  // ---- inbound: per-sender ordered pipeline ----
  var MAX_PIECES = 2500; // ~120 MB at most for one blob; more than any world needs
  N._recv = function (msg, from) {
    if (this.closed || !msg || typeof msg !== 'object') return;
    var q = this.inbound.get(from);
    if (!q) { q = { list: [], busy: false, blob: null }; this.inbound.set(from, q); }
    q.list.push(msg);
    this._pump(from, q);
  };
  N._pump = async function (from, q) {
    if (q.busy) return;
    q.busy = true;
    try {
      while (q.list.length) {
        var m = q.list.shift();
        if (m.k !== 'pc' && q.blob) q.blob = null; // a piece went missing; drop the partial blob
        if (m.k === 'ops' && Array.isArray(m.l)) this._takeOps(from, m.q, m.l);
        else if (m.k === 'hello') { if (this.isHost()) this._sendSnapshot(from); }
        else if (m.k === 'pc') {
          if (m.to && m.to !== this.tp.id) continue;
          if (typeof m.s !== 'string' || !(m.n >= 1 && m.n <= MAX_PIECES)) { q.blob = null; continue; }
          if (m.kind === 'snap' && !this.synced && this.snapMark < 0) this.snapMark = 1;
          if (!q.blob || q.blob.id !== m.id) { if (m.i !== 0) continue; q.blob = { id: m.id, parts: [] }; }
          if (m.i !== q.blob.parts.length) { q.blob = null; continue; } // a piece went missing
          q.blob.parts.push(m.s);
          if (m.i === m.n - 1) {
            var str = q.blob.parts.join(''); q.blob = null;
            if (m.kind === 'snap') { var bytes = await unpackBytes(str); if (!this.synced) this._applySnap(bytes); }
            else if (m.kind === 'ops') this._takeOps(from, m.q, JSON.parse(await unpack(str)));
          }
        }
      }
    } catch (e) { if (this.h.onWarn) this.h.onWarn('A network update could not be read.'); }
    q.busy = false;
    if (q.list.length) this._pump(from, q);
  };
  N._takeOps = function (from, q, ops) {
    if (!this.synced) { this.buffer.push({ from: from, q: q || 0, ops: ops }); return; }
    this._applyOps(from, q, ops);
  };
  N._applyOps = function (from, q, ops) {
    var self = this;
    if (q) this.seen[from] = q;
    ops.forEach(function (op) {
      if (!op || typeof op.t !== 'string') return;
      self.s.apply(op);
      if (self.h.onRemoteOp) self.h.onRemoteOp(op);
    });
  };
  N._sendSnapshot = function (to) {
    this._flushBatch(); // ops already applied here must be counted in the snapshot
    var seen = Object.assign({}, this.seen); seen[this.tp.id] = this.seq + 1; // +1: the snapshot blob itself
    this._enqueueBlob('snap', this.s.serializeBin({ seen: seen }), to);
  };
  N._applySnap = function (bytes) {
    var head = this.s.deserializeBin(bytes);
    if (!head) { this.snapMark = -1; return; }
    var seen = (head.x && head.x.seen) || {};
    this.seen = Object.assign({}, seen);
    this.snapSeen = seen;
    this._becomeSynced();
    if (this.h.onSnapshot) this.h.onSnapshot();
  };
  N.requestResync = function () { this.synced = false; this.buffer = []; this.snapMark = -1; this.helloTries = 0; this.helloAt = 0; this.startAt = Date.now() - 3000; this.setPresence({ sy: 0 }); this._status(); };

  // ---------- Transports ----------

  // Room codes over WebRTC. The host relays between players and owns the world.
  var PREFIX = 'kilnworks-v2-';
  function PeerTransport(code, hosting, server) {
    this.code = code; this.hosting = hosting; this.server = server || {}; this.fixedHost = true; this.keepalive = true;
    this.max = 48000; this.interval = 0; this.presenceInterval = 90;
    this.id = null; this.conns = new Map(); this.hostConn = null; this.map = new Map(); this.mine = {};
    this.closed = false; this.rejoining = false; this.rejoins = 0; this.rejoinTimer = 0;
  }
  PeerTransport.prototype.start = function (net) {
    var self = this; this.net = net;
    return new Promise(function (resolve, reject) {
      var PeerLib = root.Peer;
      if (!PeerLib) { reject(new Error('Multiplayer library did not load. Check your connection.')); return; }
      var settled = false;
      function ok() { if (!settled) { settled = true; resolve(); } }
      function fail(e) { if (!settled) { settled = true; reject(e); try { self.peer.destroy(); } catch (x) { } } }
      var popts = Object.assign({ debug: 0 }, self.server);
      var peer = self.peer = self.hosting ? new PeerLib(PREFIX + self.code, popts) : new PeerLib(popts);
      peer.on('open', function (id) {
        self.id = id;
        if (self.hosting) { ok(); return; }
        self._toHost(ok);
      });
      peer.on('connection', function (c) {
        if (!self.hosting) { c.close(); return; }
        self._wire(c);
        c.on('open', function () { self.conns.set(c.peer, c); c.send({ k: 'pr', from: self.id, p: self.mine }); });
      });
      peer.on('error', function (e) {
        var t = e && e.type;
        if (self.rejoining) { self._rejoinLater(); return; } // the host may be back in a moment
        var msg = t === 'unavailable-id' ? 'That room code is taken. Try hosting again.' : t === 'peer-unavailable' ? 'No room with that code. Check the code and try again.'
          : t === 'network' || t === 'server-error' || t === 'socket-error' ? 'Could not reach the room server.' : 'Connection problem (' + (t || 'unknown') + ').';
        if (!settled) fail(new Error(msg)); else if (net.h.onWarn) net.h.onWarn(msg);
      });
      peer.on('disconnected', function () { try { peer.reconnect(); } catch (e) { } });
      setTimeout(function () { fail(new Error('Timed out connecting to the room.')); }, 15000);
    });
  };
  // Guests: connect to the host (opened() runs once the connection is up).
  PeerTransport.prototype._toHost = function (opened) {
    var self = this, c = this.peer.connect(PREFIX + this.code, { reliable: true });
    this._wire(c);
    c.on('open', function () { self.hostConn = c; opened(); });
  };
  // A guest whose connection to the host dropped (a phone changing networks, a blip) tries to rejoin a few times,
  // then reloads the shared world, since it may have missed changes meanwhile.
  PeerTransport.prototype._rejoinLater = function () {
    var self = this; if (this.closed) return;
    if (++this.rejoins > 5) { this.rejoining = false; if (this.net.h.onWarn) this.net.h.onWarn('Lost the room. Leave it and join again when the host is back.'); return; }
    clearTimeout(this.rejoinTimer);
    this.rejoinTimer = setTimeout(function () {
      if (self.closed || self.hostConn) return;
      try { self._toHost(function () { self.rejoining = false; self.rejoins = 0; self.net.requestResync(); }); } catch (e) { self._rejoinLater(); } // the fresh snapshot announces it
    }, 1500 * this.rejoins);
  };
  PeerTransport.prototype.hostPresence = function () { if (this.hosting || !this.hostConn) return null; var e = this.map.get(this.hostConn.peer); return e ? e.presence : null; };
  PeerTransport.prototype._wire = function (c) {
    var self = this;
    c.on('data', function (d) { self._onData(d, c); });
    c.on('close', function () {
      if (self.hosting) { self.conns.delete(c.peer); self.map.delete(c.peer); self._broadcast({ k: 'bye', id: c.peer }, null); }
      else if (c === self.hostConn) {
        self.hostConn = null; self.map.clear(); if (self.net.h.onPeers) self.net.h.onPeers();
        if (self.closed) return;
        if (self.net.h.onWarn) self.net.h.onWarn('Lost the host. Trying to rejoin…');
        self.rejoining = true; self.rejoins = 0; self._rejoinLater();
      }
    });
  };
  PeerTransport.prototype._broadcast = function (m, except) {
    if (m.to) { var c = this.conns.get(m.to); if (c) c.send(m); return; }
    this.conns.forEach(function (c, id) { if (id !== except) c.send(m); });
  };
  PeerTransport.prototype._onData = function (d, c) {
    if (!d || typeof d !== 'object') return;
    if (this.hosting) {
      d.from = c.peer;
      // The host owns the world. Visitors' edits only get in when the owner lets visitors build, and only
      // the host ever sends a whole world (snapshots). Anything else from a visitor is dropped, not relayed.
      if (d.k === 'pc' && d.kind === 'snap') return;
      if (!this.net.visitorsBuild && (d.k === 'ops' || d.k === 'pc')) return;
      if (d.to !== this.id) this._broadcast(d, c.peer); if (d.to && d.to !== this.id) return;
    }
    var from = d.from;
    if (d.k === 'pr') { if (from && from !== this.id) { this.map.set(from, { presence: d.p || {}, seen: Date.now() }); if (this.net.h.onPeers) this.net.h.onPeers(); } return; }
    if (d.k === 'bye') { this.map.delete(d.id); if (this.net.h.onPeers) this.net.h.onPeers(); return; }
    if (from === this.id) return;
    this.net._recv(d, from);
  };
  PeerTransport.prototype.emit = function (m) {
    m.from = this.id;
    if (this.hosting) this._broadcast(m, null);
    else if (this.hostConn) this.hostConn.send(m);
  };
  PeerTransport.prototype.setPresence = function (p) { this.mine = p; this.emit({ k: 'pr', p: p }); };
  PeerTransport.prototype.peers = function () {
    var out = [{ id: this.id, isMe: true, presence: this.mine }], now = Date.now(), self = this;
    this.map.forEach(function (v, id) { if (now - v.seen < 10000) out.push({ id: id, isMe: false, presence: v.presence }); else self.map.delete(id); });
    return out;
  };
  PeerTransport.prototype.close = function () { this.closed = true; clearTimeout(this.rejoinTimer); try { this.peer.destroy(); } catch (e) { } };

  var api = { Net: Net, PeerTransport: PeerTransport, pack: pack, unpack: unpack, packBytes: packBytes, unpackBytes: unpackBytes };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ClayNet = api;
})(this);
