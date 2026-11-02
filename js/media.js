/* Endless Clay media: the device's own media library (IndexedDB), the phone link (PeerJS, headset side and
   phone side), and helpers for pictures, 360° skies and sounds. Used by the game and by the phone app. */
(function (root) {
  'use strict';
  var LINK_PREFIX = 'kilnworks-link-', CHUNK = 48000, CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  // What can travel over the link, and how big it may be (data URL characters).
  var KINDS = {
    photo: { max: 2000000, re: /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/ },
    sky: { max: 9000000, re: /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/ }, // room for high-quality 4096 × 2048 skies
    sound: { max: 4000000, re: /^data:audio\/[a-z0-9.+-]+(;[a-z0-9=.+-]+)*;base64,[A-Za-z0-9+/=]+$/ },
    link: { max: 2100, re: /^https:\/\/[^\s"'<>]+$/ }
  };
  function okData(kind, d) { var k = KINDS[kind]; return !!k && typeof d === 'string' && d.length < k.max && k.re.test(d); }
  function newCode() { var s = ''; for (var i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]; return s; }
  function cleanCode(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6); }

  // ---------- Link server settings ----------
  // window.ENDLESS_CLAY_PEER_SERVER (config.js): PeerJS options, including fixed TURN servers. window.ENDLESS_CLAY_ICE_URL
  // (optional): an address that returns TURN servers with fresh credentials (a managed TURN service, or your own
  // endpoint for expiring credentials). They're fetched before linking, kept for half an hour, and added to the
  // fixed ones. If the fetch fails the link still tries without them.
  var iceCache = null;
  function withIce(base, list) {
    base = base || {}; var cfg = base.config || {};
    return Object.assign({}, base, { config: Object.assign({}, cfg, { iceServers: (cfg.iceServers || []).concat(list) }) });
  }
  function peerOptions() {
    var base = root.ENDLESS_CLAY_PEER_SERVER || null, url = root.ENDLESS_CLAY_ICE_URL;
    if (!url || typeof fetch !== 'function') return Promise.resolve(base);
    if (iceCache && Date.now() - iceCache.at < 1800000) return Promise.resolve(withIce(base, iceCache.list));
    var ctl = typeof AbortController === 'function' ? new AbortController() : null, timer = setTimeout(function () { if (ctl) ctl.abort(); }, 6000);
    return fetch(url, { credentials: 'omit', signal: ctl ? ctl.signal : undefined }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function (j) {
      var list = Array.isArray(j) ? j : j && j.iceServers; // a list (Metered), or { iceServers: … } (Cloudflare, coturn REST)
      // Port 53 addresses (Cloudflare lists some) are blocked by browsers and only time out, so they're left out.
      list = (Array.isArray(list) ? list : list ? [list] : []).map(function (x) {
        if (!x || !x.urls) return null; var u = (Array.isArray(x.urls) ? x.urls : [x.urls]).filter(function (v) { return typeof v === 'string' && !/:53(\?|$)/.test(v); });
        return u.length ? Object.assign({}, x, { urls: u }) : null;
      }).filter(Boolean);
      clearTimeout(timer); if (!list.length) throw new Error('no TURN servers in the answer');
      iceCache = { at: Date.now(), list: list }; return withIce(base, list);
    }).catch(function (e) { clearTimeout(timer); if (root.console) console.warn('Endless Clay: TURN credentials unavailable (' + e.message + '); linking without them.'); return base; });
  }

  // ---------- Social links ----------
  // A post or video link from YouTube, Instagram, Facebook, TikTok, Threads or Snapchat → what a billboard needs:
  // { ok, url (cleaned), plat, label, who (a short name for it), shape ('wide' 16:9, 'tall' 9:16, 'post' 4:5),
  //   embed(autoplay, muted) → the platform's embeddable player or post, thumb (a preview picture, if there is one) }.
  // Otherwise { ok: false, msg }.
  var PLATS = { youtube: 'YouTube', instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', threads: 'Threads', snapchat: 'Snapchat' };
  function parseSocial(raw) {
    var s = String(raw || '').trim(), u;
    if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
    try { u = new URL(s); } catch (e) { return { ok: false, msg: 'That isn’t a web address.' }; }
    u.protocol = 'https:';
    var host = u.hostname.toLowerCase().replace(/^(www|m|mobile|vm|vt)\./, ''), parts = u.pathname.split('/').filter(Boolean), r = { ok: true };
    function done(plat, label, who, shape, embed, thumb) {
      r.plat = plat; r.label = label; r.who = who; r.shape = shape; r.embed = embed; r.thumb = thumb || null; r.url = u.href; r.name = PLATS[plat]; return r;
    }
    if (host === 'youtube.com' || host === 'youtu.be' || host === 'youtube-nocookie.com' || host === 'music.youtube.com') {
      var id = host === 'youtu.be' ? parts[0] : u.searchParams.get('v') || (['shorts', 'live', 'embed', 'v'].indexOf(parts[0]) >= 0 ? parts[1] : null);
      if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return { ok: false, msg: 'That YouTube link has no video in it. Copy the link of a video or Short.' };
      var short = parts[0] === 'shorts', start = parseInt(u.searchParams.get('t') || u.searchParams.get('start') || '0', 10) || 0;
      return done('youtube', short ? 'YouTube Short' : 'YouTube video', id, short ? 'tall' : 'wide', function (auto, muted) {
        return 'https://www.youtube.com/embed/' + id + '?autoplay=' + (auto ? 1 : 0) + '&mute=' + (muted ? 1 : 0) + '&playsinline=1&rel=0' + (start ? '&start=' + start : '');
      }, 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg');
    }
    if (host === 'instagram.com') {
      var kind = parts[0] === 'reels' ? 'reel' : parts[0];
      if (['p', 'reel', 'tv'].indexOf(kind) < 0 || !/^[A-Za-z0-9_-]+$/.test(parts[1] || '')) return { ok: false, msg: 'Copy the link of an Instagram post or reel (it has /p/ or /reel/ in it).' };
      return done('instagram', kind === 'reel' ? 'Instagram reel' : 'Instagram post', parts[1], kind === 'reel' ? 'tall' : 'post', function () { return 'https://www.instagram.com/' + kind + '/' + parts[1] + '/embed'; });
    }
    if (host === 'facebook.com' || host === 'fb.watch' || host === 'fb.com') {
      var video = host === 'fb.watch' || /\/(videos|reel|watch)\b/.test(u.pathname) || u.searchParams.has('v'), reel = /\/reel\//.test(u.pathname), href = encodeURIComponent(u.href);
      return done('facebook', video ? (reel ? 'Facebook reel' : 'Facebook video') : 'Facebook post', parts[0] || 'post', reel ? 'tall' : video ? 'wide' : 'post', function (auto, muted) {
        return video ? 'https://www.facebook.com/plugins/video.php?href=' + href + '&show_text=false&autoplay=' + !!auto + '&mute=' + !!muted : 'https://www.facebook.com/plugins/post.php?href=' + href + '&show_text=true';
      });
    }
    if (host === 'tiktok.com') {
      var vi = parts.indexOf('video'), tid = vi >= 0 ? parts[vi + 1] : null;
      if (!tid || !/^\d+$/.test(tid)) return { ok: false, msg: 'Open the TikTok in the app or browser and copy its full link (with /video/ in it). Short vm.tiktok.com links can’t be read here.' };
      return done('tiktok', 'TikTok video', (parts[0] || '').charAt(0) === '@' ? parts[0] : tid, 'tall', function (auto, muted) {
        return 'https://www.tiktok.com/player/v1/' + tid + '?autoplay=' + (auto ? 1 : 0) + '&muted=' + (muted ? 1 : 0) + '&loop=1&rel=0';
      });
    }
    if (host === 'threads.net' || host === 'threads.com') {
      if ((parts[0] || '').charAt(0) !== '@' || parts[1] !== 'post' || !/^[A-Za-z0-9_-]+$/.test(parts[2] || '')) return { ok: false, msg: 'Copy the link of a Threads post (it looks like threads.net/@name/post/…).' };
      return done('threads', 'Threads post', parts[0], 'post', function () { return 'https://www.threads.net/' + parts[0] + '/post/' + parts[2] + '/embed'; });
    }
    if (host === 'snapchat.com' || host === 'story.snapchat.com') {
      var sk = parts[0], sid = parts[1];
      if (['spotlight', 'lens', 'add', 'p'].indexOf(sk) < 0 || !sid || !/^[A-Za-z0-9_.-]+$/.test(sid)) return { ok: false, msg: 'Copy the link of a Snapchat Spotlight, Lens, Story or public profile.' };
      return done('snapchat', { spotlight: 'Snapchat Spotlight', lens: 'Snapchat Lens', add: 'Snapchat profile', p: 'Snapchat Story' }[sk], sk === 'add' ? '@' + sid : sid, 'tall', function () {
        return 'https://www.snapchat.com/' + parts.slice(0, sk === 'p' ? parts.length : 2).join('/') + '/embed';
      });
    }
    return { ok: false, msg: 'Billboards take links from YouTube, Instagram, Facebook, TikTok, Threads and Snapchat.' };
  }

  // ---------- Storage: IndexedDB for big things (worlds, skies, sounds), memory if it isn't available ----------
  function Store(name) {
    var mem = new Map(), self = this;
    this.ready = new Promise(function (resolve) {
      try {
        var req = indexedDB.open(name, 1);
        req.onupgradeneeded = function () { req.result.createObjectStore('kv'); };
        req.onsuccess = function () { self.db = req.result; resolve(true); };
        req.onerror = req.onblocked = function () { resolve(false); };
      } catch (e) { resolve(false); }
    });
    this.mem = mem;
  }
  Store.prototype._tx = function (mode, fn) {
    var self = this;
    return this.ready.then(function () {
      if (!self.db) return fn(null);
      return new Promise(function (resolve, reject) {
        var tx = self.db.transaction('kv', mode), st = tx.objectStore('kv'), out = fn(st);
        tx.oncomplete = function () { resolve(out && out.result !== undefined ? out.result : out); };
        tx.onerror = tx.onabort = function () { reject(tx.error); };
      });
    });
  };
  Store.prototype.get = function (k) { var m = this.mem; return this._tx('readonly', function (st) { return st ? st.get(k) : m.get(k); }); };
  Store.prototype.set = function (k, v) { var m = this.mem; return this._tx('readwrite', function (st) { if (st) st.put(v, k); else m.set(k, v); }); };
  Store.prototype.del = function (k) { var m = this.mem; return this._tx('readwrite', function (st) { if (st) st.delete(k); else m.delete(k); }); };
  // Every value whose key starts with prefix, in key order.
  Store.prototype.all = function (prefix) {
    var m = this.mem;
    return this._tx('readonly', function (st) {
      if (!st) return Array.from(m.keys()).filter(function (k) { return k.indexOf(prefix) === 0; }).sort().map(function (k) { return m.get(k); });
      return st.getAll(IDBKeyRange.bound(prefix, prefix + '￿'));
    });
  };

  // ---------- Pictures ----------
  // Any picture source → JPEG data URL, longest side maxSide, kept under maxChars by lowering quality.
  function fitImage(src, sw, sh, maxSide, maxChars) {
    var k = Math.min(1, maxSide / Math.max(sw, sh)), c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(sw * k)); c.height = Math.max(1, Math.round(sh * k));
    c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
    var q = 0.85, d = c.toDataURL('image/jpeg', q);
    while (d.length > maxChars && q > 0.4) { q -= 0.15; d = c.toDataURL('image/jpeg', q); }
    c.width = c.height = 0; // hand the pixels back now (the headset is short of memory)
    return d;
  }
  function loadImage(src) {
    return new Promise(function (resolve, reject) { var img = new Image(); img.onload = function () { resolve(img); }; img.onerror = reject; img.src = src; });
  }
  function rowColor(g, w, y0, y1) {
    var px = g.getImageData(0, y0, w, y1 - y0).data, r = 0, gg = 0, b = 0, n = px.length / 4;
    for (var i = 0; i < px.length; i += 4) { r += px[i]; gg += px[i + 1]; b += px[i + 2]; }
    var h = function (v) { return ('0' + Math.round(v / n).toString(16)).slice(-2); };
    return '#' + h(r) + h(gg) + h(b);
  }
  // A 360° sky (equirectangular, 2:1) from any photo. A true 360° photo is used as it is. A wide panorama keeps its
  // band round the horizon and gets sky and ground filled in from its own top and bottom colours. An ordinary
  // photo is mirrored side by side to go all the way round.
  function toSky(img, hq) {
    var W = hq ? 4096 : 2048, H = W / 2, iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height, a = iw / ih;
    var c = document.createElement('canvas'), g = c.getContext('2d'), kind, band = null;
    c.width = W; c.height = H;
    if (a > 1.9 && a < 2.1) { g.drawImage(img, 0, 0, W, H); kind = '360'; }
    else {
      // The photo's band round the horizon: a panorama spans the full width; an ordinary photo is repeated, every
      // other copy mirrored so the joins match, covering about 108° from top to bottom.
      band = document.createElement('canvas'); var bg = band.getContext('2d'), wide = a >= 2.1;
      var bh = wide ? Math.min(Math.round(W / a), H) : Math.round(H * 0.6), copies = wide ? 1 : Math.max(2, 2 * Math.round(W / (bh * a) / 2)), cw = W / copies;
      band.width = W; band.height = bh;
      for (var i = 0; i < copies; i++) { bg.save(); bg.translate(i * cw + (i % 2 ? cw : 0), 0); bg.scale(i % 2 ? -1 : 1, 1); bg.drawImage(img, 0, 0, cw, bh); bg.restore(); }
      var top = rowColor(bg, W, 0, 3), bottom = rowColor(bg, W, band.height - 3, band.height), y = Math.round((H - band.height) / 2);
      var gt = g.createLinearGradient(0, 0, 0, y), gb = g.createLinearGradient(0, y + band.height, 0, H);
      gt.addColorStop(0, top); gt.addColorStop(1, top); gb.addColorStop(0, bottom); gb.addColorStop(1, bottom);
      g.fillStyle = gt; g.fillRect(0, 0, W, y + 1); g.fillStyle = gb; g.fillRect(0, y + band.height - 1, W, H - y - band.height + 1);
      g.drawImage(band, 0, y);
      kind = wide ? 'panorama' : 'photo';
    }
    var q = 0.85, d = c.toDataURL('image/jpeg', q);
    while (d.length > KINDS.sky.max * 0.95 && q > 0.45) { q -= 0.1; d = c.toDataURL('image/jpeg', q); }
    c.width = c.height = 0; if (band) band.width = band.height = 0;
    return { data: d, kind: kind };
  }
  // Colours that light a scene to match its sky: the zenith, the horizon and the ground.
  function skyColors(img) {
    var c = document.createElement('canvas'), g = c.getContext('2d'); c.width = 64; c.height = 32;
    g.drawImage(img, 0, 0, 64, 32);
    var out = { top: rowColor(g, 64, 0, 5), hor: rowColor(g, 64, 14, 18), ground: rowColor(g, 64, 26, 32) };
    c.width = c.height = 0; return out;
  }

  // ---------- Sounds ----------
  function dataToArrayBuffer(d) {
    var b64 = d.slice(d.indexOf(',') + 1), bin = atob(b64), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out.buffer;
  }
  function decodeSound(actx, d) {
    return new Promise(function (resolve, reject) {
      var p = actx.decodeAudioData(dataToArrayBuffer(d), resolve, reject);
      if (p && p.then) p.then(resolve, reject);
    });
  }
  // A sound, edited: the stretch from `from` to `to` seconds, mixed to mono, its ends faded (no clicks), evened out
  // (loudest point at about -1 dB) and, for a loop, its end crossfaded into its start so it repeats without a join.
  // Returns { samples, rate } at o.rate Hz (22050 by default, plenty for sounds in the world).
  function editSound(buf, o) {
    o = o || {};
    var sr = buf.sampleRate, a = Math.max(0, Math.floor((o.from || 0) * sr)), b = Math.min(buf.length, Math.ceil((o.to || buf.duration) * sr)), n = Math.max(2, b - a), ch = buf.numberOfChannels, i;
    var x = new Float32Array(n);
    for (var c = 0; c < ch; c++) { var d = buf.getChannelData(c); for (i = 0; i < n && a + i < d.length; i++) x[i] += d[a + i] / ch; }
    if (o.loop) {
      var L = Math.min(Math.floor(0.25 * sr), Math.floor(n / 4));
      for (i = 0; i < L; i++) { var k = i / L; x[i] = x[i] * k + x[n - L + i] * (1 - k); }
      n -= L;
    } else {
      var F = Math.min(Math.floor(0.012 * sr), Math.floor(n / 2));
      for (i = 0; i < F; i++) { var f = i / F; x[i] *= f; x[n - 1 - i] *= f; }
    }
    if (o.level) {
      var peak = 0; for (i = 0; i < n; i++) { var v = x[i] < 0 ? -x[i] : x[i]; if (v > peak) peak = v; }
      if (peak > 1e-4) { var g = Math.min(8, 0.89 / peak); for (i = 0; i < n; i++) x[i] *= g; }
    }
    var rate = o.rate || 22050, r = sr / rate, outN = Math.max(1, Math.floor(n / r)), out = new Float32Array(outN);
    for (i = 0; i < outN; i++) { // average over each output step (a simple low-pass, so going down in rate doesn't alias)
      var s0 = i * r, s1 = Math.min(n, s0 + Math.max(1, r)), sum = 0, cnt = 0;
      for (var j = Math.floor(s0); j < s1; j++) { sum += x[j]; cnt++; }
      out[i] = cnt ? sum / cnt : 0;
    }
    return { samples: out, rate: rate };
  }
  // Mono 16-bit WAV from samples, as a data URL.
  function wavData(samples, rate) {
    var n = samples.length, bytes = new Uint8Array(44 + n * 2), v = new DataView(bytes.buffer);
    function str(o, t) { for (var i = 0; i < t.length; i++) bytes[o + i] = t.charCodeAt(i); }
    str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * 2, true);
    for (var i = 0; i < n; i++) { var x = samples[i] > 1 ? 1 : samples[i] < -1 ? -1 : samples[i]; v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true); }
    var bin = ''; for (var j = 0; j < bytes.length; j += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(j, j + 0x8000));
    return 'data:audio/wav;base64,' + btoa(bin);
  }
  function blobToData(blob) {
    return new Promise(function (resolve, reject) { var r = new FileReader(); r.onload = function () { resolve(r.result); }; r.onerror = reject; r.readAsDataURL(blob); });
  }

  // ---------- The link: a phone sends media to a headset ----------
  // Headset: listens on a code. Each item arrives in pieces ('put'), is checked, handed to onAsset (which returns
  // a promise of { ok, msg }), and acknowledged ('got'). opts: { code, server, info(), onAsset(asset), onStatus(host) }.
  // Items that are half in when a link drops are kept (for 10 minutes), so the phone carries on where it stopped;
  // finished ones are remembered, so an item whose reply was lost isn't taken in twice.
  // opts.library() → promise of what's on the headset; opts.onLibrary({ op: 'rename' | 'del', kind, id, name }) changes it.
  function LinkHost(opts) { this.o = opts; this.conns = new Map(); this.parts = new Map(); this.done = new Map(); this.state = 'off'; this.error = ''; }
  LinkHost.prototype._status = function (st, err) { if (st) this.state = st; this.error = err || ''; if (this.o.onStatus) this.o.onStatus(this); };
  LinkHost.prototype.start = function () {
    var self = this, Peer = root.Peer;
    if (this.peer) return;
    if (!Peer) { this._status('error', 'The link library did not load. Check your connection.'); return; }
    this._status('starting');
    var peer = this.peer = new Peer(LINK_PREFIX + this.o.code, Object.assign({ debug: 0 }, this.o.server || {}));
    peer.on('open', function () { self._status(self.conns.size ? 'linked' : 'waiting'); });
    peer.on('connection', function (c) {
      c.on('open', function () { self.conns.set(c.peer, { c: c, name: 'Phone' }); c.send({ k: 'hi', app: 'endless-clay', info: self.o.info ? self.o.info() : {} }); self._status('linked'); });
      c.on('data', function (d) { self._data(c, d); });
      c.on('close', function () { self.conns.delete(c.peer); self._status(self.conns.size ? 'linked' : 'waiting'); });
    });
    peer.on('error', function (e) {
      var t = e && e.type;
      self._status('error', t === 'unavailable-id' ? 'This link code is in use somewhere else. Make a new code.' : t === 'network' || t === 'server-error' || t === 'socket-error' ? 'Could not reach the link server.' : 'Link problem (' + (t || 'unknown') + ').');
    });
    peer.on('disconnected', function () { try { peer.reconnect(); } catch (e) { } });
  };
  LinkHost.prototype.stop = function () { try { this.peer && this.peer.destroy(); } catch (e) { } this.peer = null; this.conns.clear(); this.parts.clear(); this.done.clear(); this._status('off'); };
  LinkHost.prototype.names = function () { return Array.from(this.conns.values()).map(function (x) { return x.name; }); };
  LinkHost.prototype.tell = function (msg) { this.conns.forEach(function (x) { try { x.c.send(msg); } catch (e) { } }); };
  // Forget half-sent items over 10 minutes old, and keep at most six (the oldest go first).
  LinkHost.prototype._prune = function () {
    var self = this, now = Date.now(), keys = Array.from(this.parts.keys());
    keys.forEach(function (k) { if (now - self.parts.get(k).at > 600000) self.parts.delete(k); });
    keys = Array.from(this.parts.keys()); while (keys.length > 5) this.parts.delete(keys.shift());
  };
  LinkHost.prototype._data = function (c, d) {
    if (!d || typeof d !== 'object') return;
    var self = this, x = this.conns.get(c.peer), send = function (m) { try { c.send(m); } catch (e) { } };
    if (d.k === 'hi') { if (x) x.name = String(d.name || 'Phone').slice(0, 30); this._status('linked'); return; }
    if (d.k === 'lib?' || d.k === 'lib-do') { // what's on the headset; rename or delete something there
      var act = d.k === 'lib-do' && this.o.onLibrary ? Promise.resolve().then(function () { return self.o.onLibrary({ op: String(d.op || ''), kind: String(d.kind || ''), id: String(d.id || ''), name: String(d.name || '').trim().slice(0, 40) }); }) : Promise.resolve();
      act.catch(function () { }).then(function () { return self.o.library ? self.o.library() : null; }).then(function (lib) { send({ k: 'lib', lib: lib }); }, function () { send({ k: 'lib', lib: null }); });
      return;
    }
    if (typeof d.id !== 'string') return;
    if (d.k === 'have?') { // how much of this item is here already
      var fin = this.done.get(d.id), part = this.parts.get(d.id);
      send(fin ? { k: 'have', id: d.id, done: true, ok: fin.ok, msg: fin.msg } : { k: 'have', id: d.id, got: part ? part.got.length : 0 });
      return;
    }
    if (d.k !== 'put' || !KINDS[d.kind] || typeof d.s !== 'string') return;
    var key = d.id, n = d.n | 0, p = this.parts.get(key), refuse = function (msg) { send({ k: 'got', id: d.id, ok: false, msg: msg }); };
    if (this.done.has(key)) { var f0 = this.done.get(key); send({ k: 'got', id: key, ok: f0.ok, msg: f0.msg }); return; }
    if (n < 1 || n > Math.ceil(KINDS[d.kind].max / CHUNK) + 1) return;
    if (!p) {
      if (d.i !== 0) { refuse('That didn’t arrive whole. Try sending it again.'); return; }
      this._prune(); p = { got: [], n: n, at: 0 }; this.parts.set(key, p);
    }
    if (d.i !== p.got.length || n !== p.n) { this.parts.delete(key); refuse('That didn’t arrive whole. Try sending it again.'); return; }
    p.got.push(d.s); p.at = Date.now();
    if (d.i !== n - 1) return;
    this.parts.delete(key);
    var data = p.got.join(''), reply = function (r) {
      r = { ok: !!(r && r.ok), msg: (r && r.msg) || '' };
      self.done.set(key, r); if (self.done.size > 60) self.done.delete(self.done.keys().next().value);
      send({ k: 'got', id: key, ok: r.ok, msg: r.msg });
    };
    if (!okData(d.kind, data)) { reply({ ok: false, msg: 'That didn’t arrive whole. Try sending it again.' }); return; }
    Promise.resolve().then(function () { return self.o.onAsset({ id: key, kind: d.kind, name: String(d.name || '').slice(0, 40), use: String(d.use || ''), data: data }); })
      .then(reply, function (e) { reply({ ok: false, msg: (e && e.message) || 'The headset couldn’t use that.' }); });
  };

  // Phone: connects to a headset's code and sends items one at a time. opts: { code, server, name, onStatus(client) }.
  function LinkClient(opts) { this.o = opts; this.state = 'off'; this.error = ''; this.info = null; this.wait = new Map(); this.haves = new Map(); this.libWait = []; this.retry = 0; }
  LinkClient.prototype._status = function (st, err) { this.state = st; this.error = err || ''; if (this.o.onStatus) this.o.onStatus(this); };
  LinkClient.prototype.connect = function () {
    var self = this, Peer = root.Peer;
    this.close(true);
    if (!Peer) { this._status('error', 'The link library did not load. Check your connection.'); return; }
    this._status('connecting');
    var peer = this.peer = new Peer(Object.assign({ debug: 0 }, this.o.server || {}));
    peer.on('open', function () {
      var c = self.c = peer.connect(LINK_PREFIX + self.o.code, { reliable: true });
      c.on('open', function () { self.retry = 0; c.send({ k: 'hi', name: self.o.name || 'Phone' }); self._status('linked'); });
      c.on('data', function (d) {
        if (!d || typeof d !== 'object') return;
        if (d.k === 'hi') { self.info = d.info || {}; self._status('linked'); }
        else if (d.k === 'got' && self.wait.has(d.id)) { var w = self.wait.get(d.id); self.wait.delete(d.id); w(d); }
        else if (d.k === 'have' && self.haves.has(d.id)) { var hv = self.haves.get(d.id); self.haves.delete(d.id); hv(d); }
        else if (d.k === 'lib') { var ws = self.libWait; self.libWait = []; ws.forEach(function (f) { f(d.lib || null); }); }
        else if (d.k === 'info') { self.info = d.info || self.info; self._status(self.state); }
      });
      c.on('close', function () { self._lost(); });
    });
    peer.on('error', function (e) {
      var t = e && e.type;
      if (t === 'peer-unavailable') self._status('error', 'No headset is waiting on that code. Open Phone link in Endless Clay and check the code.');
      else self._lost(t === 'network' || t === 'server-error' || t === 'socket-error' ? 'Could not reach the link server.' : 'Link problem (' + (t || 'unknown') + ').');
    });
  };
  LinkClient.prototype._lost = function (msg) {
    var self = this; if (this.closed) return;
    this.wait.forEach(function (w) { w({ ok: false, retry: true, msg: 'The link dropped.' }); }); this.wait.clear(); this.haves.clear();
    this.libWait.forEach(function (f) { f(null); }); this.libWait = [];
    this._status('lost', msg || 'Lost the headset. Reconnecting…');
    clearTimeout(this.timer); this.timer = setTimeout(function () { if (!self.closed) self.connect(); }, Math.min(15000, 2000 * (++this.retry)));
  };
  LinkClient.prototype.close = function (quiet) { this.closed = !quiet; clearTimeout(this.timer); try { this.peer && this.peer.destroy(); } catch (e) { } this.peer = this.c = null; if (quiet) this.closed = false; };
  // Send one item; resolves with the headset's reply { ok, msg } (retry: true if the link wasn't there, so it can go
  // again later with the same id and carry on from where it stopped). onProgress(fraction) as pieces go out.
  LinkClient.prototype.send = function (item, onProgress) {
    var self = this, c = this.c;
    if (!c || this.state !== 'linked') return Promise.resolve({ ok: false, retry: true, msg: 'Not linked to a headset.' });
    if (!okData(item.kind, item.data)) return Promise.resolve({ ok: false, msg: 'That can’t be sent (wrong type, or too big).' });
    var id = item.id || ('m' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)), n = Math.ceil(item.data.length / CHUNK), started = false;
    return new Promise(function (resolve) {
      var t = setTimeout(function () { if (self.wait.has(id)) { self.wait.delete(id); resolve({ ok: false, msg: 'The headset didn’t answer.' }); } }, 120000);
      self.wait.set(id, function (r) { clearTimeout(t); resolve(r); });
      function go(i) {
        if (started) return; started = true; self.haves.delete(id);
        (function next() {
          if (self.c !== c) return;
          var ch = c.dataChannel; // don't flood the connection: wait while a lot is still queued
          if (ch && ch.bufferedAmount > 1000000) { setTimeout(next, 50); return; }
          c.send({ k: 'put', id: id, kind: item.kind, name: item.name || '', use: item.use || '', n: n, i: i, s: item.data.slice(i * CHUNK, (i + 1) * CHUNK) });
          i++; if (onProgress) onProgress(i / n);
          if (i < n) setTimeout(next, 0);
        })();
      }
      // First ask what the headset already has of it: after a dropped link it carries on from there.
      self.haves.set(id, function (h) {
        if (h.done) { started = true; var w = self.wait.get(id); if (w) { self.wait.delete(id); w({ ok: h.ok, msg: h.msg }); } return; } // already in: nothing to send
        var from = Math.max(0, Math.min(n - 1, h.got | 0)); if (from && onProgress) onProgress(from / n); go(from);
      });
      try { c.send({ k: 'have?', id: id }); } catch (e) { }
      setTimeout(function () { go(0); }, 4000); // a headset that doesn't answer (an older version): start from the top
    });
  };
  // What's on the headset (skies, sounds, links, photos); null if it can't say. op: { op: 'rename' | 'del', kind, id, name }.
  LinkClient.prototype.library = function (op) {
    var self = this, c = this.c;
    if (!c || this.state !== 'linked') return Promise.resolve(null);
    return new Promise(function (resolve) {
      var done = false, fin = function (lib) { if (!done) { done = true; resolve(lib); } };
      self.libWait.push(fin); setTimeout(function () { fin(null); }, 10000);
      try { c.send(op ? Object.assign({ k: 'lib-do' }, op) : { k: 'lib?' }); } catch (e) { fin(null); }
    });
  };

  var api = { KINDS: KINDS, okData: okData, parseSocial: parseSocial, PLATS: PLATS, newCode: newCode, cleanCode: cleanCode, Store: Store, fitImage: fitImage, loadImage: loadImage, toSky: toSky, skyColors: skyColors,
    decodeSound: decodeSound, editSound: editSound, wavData: wavData, blobToData: blobToData, peerOptions: peerOptions, LinkHost: LinkHost, LinkClient: LinkClient, LINK_PREFIX: LINK_PREFIX };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ClayMedia = api;
})(this);
