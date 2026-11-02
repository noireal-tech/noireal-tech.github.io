/* Endless Clay Link: the phone companion. Links to a headset by code and sends it photos, 360° skies, sounds and
   social links; shows what's on the headset; takes things shared from other apps (once installed). */
(function () {
  'use strict';
  var M = window.ClayMedia, $ = function (s) { return document.querySelector(s); }, $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var LS = 'endless-clay-link.v1';
  var saved = {}; try { saved = JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (e) { saved = {}; }
  if (!Array.isArray(saved.recent)) saved.recent = [];
  function save() { try { localStorage.setItem(LS, JSON.stringify(saved)); } catch (e) { } }
  // Ask the browser to keep this site's storage (worlds, photos, sounds) even when the device is short of space.
  if (navigator.storage && navigator.storage.persist) navigator.storage.persisted().then(function (p) { if (!p) return navigator.storage.persist(); }).catch(function () { });
  var client = null, queue = [], sending = false, use = 'shape';
  // iOS only shows :active (the press tint) once a touch listener exists
  document.addEventListener('touchstart', function () { }, { passive: true });
  // Sliders paint their filled part from --p
  function rangeFill(r) { var a = +r.min || 0, b = +r.max || 100; r.style.setProperty('--p', ((+r.value - a) / (b - a || 1) * 100) + '%'); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }
  function chip(text, fn, pressed) { var b = el('button', 'chip', text); if (pressed !== undefined) b.setAttribute('aria-pressed', String(pressed)); b.addEventListener('click', fn); return b; }
  function showTab(name) { var b = $('#tab-' + name); if (b) b.click(); }

  // ---------- Linking ----------
  var STATUS = { off: 'Not linked', connecting: 'Linking…', linked: 'Linked', lost: 'Reconnecting…', error: 'Not linked' };
  function showStatus() {
    var st = client ? client.state : 'off', s = $('#status');
    s.dataset.state = st; s.textContent = STATUS[st] || st;
    $('#connectForm').hidden = st === 'linked' || st === 'connecting' || st === 'lost';
    $('#linkedRow').hidden = st !== 'linked';
    $('#libCard').hidden = st !== 'linked';
    $('#connectMsg').textContent = client && client.error ? client.error : st === 'connecting' ? 'Looking for your headset…' : '';
    var info = client && client.info || {};
    $('#linkedTo').textContent = info.name ? info.name + '’s headset' : 'your headset';
    $('#linkedScene').textContent = info.scene ? 'Scene there: ' + info.scene : '';
    if (st === 'linked') { remember(client.o.code, info.name); pump(); }
    renderRecent(); syncWake();
  }
  function connect(code) {
    code = M.cleanCode(code || $('#codeIn').value); var name = $('#nameIn').value.trim().slice(0, 30) || 'Phone';
    if (code.length !== 6) { $('#connectMsg').textContent = 'Link codes have 6 letters or numbers.'; return; }
    $('#codeIn').value = code; saved.code = code; saved.name = name; save();
    if (client) client.close();
    var c = client = new M.LinkClient({ code: code, name: name, server: null, onStatus: showStatus });
    c.state = 'connecting'; showStatus();
    M.peerOptions().then(function (srv) { if (client === c) { c.o.server = srv; c.connect(); } }); // TURN credentials first, if config.js names a source
  }
  $('#connectBtn').addEventListener('click', function () { connect(); });
  $('#codeIn').addEventListener('keydown', function (e) { if (e.key === 'Enter') connect(); });
  $('#codeIn').addEventListener('input', function () { var v = M.cleanCode(this.value); if (v !== this.value) this.value = v; });
  $('#unlinkBtn').addEventListener('click', function () { if (client) client.close(); client = null; libOpen = false; lib = null; $('#libBody').textContent = ''; $('#libShow').textContent = 'Show what’s there'; showStatus(); });
  // Recent headsets: the last few codes linked to, with whose headset each was.
  function remember(code, name) {
    var r = saved.recent.filter(function (x) { return x.code !== code; }); r.unshift({ code: code, name: name || '' });
    saved.recent = r.slice(0, 5); save();
  }
  function renderRecent() {
    var row = $('#recentRow'), st = client ? client.state : 'off'; row.textContent = '';
    row.hidden = !saved.recent.length || st === 'linked' || st === 'connecting' || st === 'lost';
    if (row.hidden) return;
    row.append(el('span', 'muted', 'Recent'));
    saved.recent.forEach(function (x) { row.append(chip((x.name ? x.name + '’s headset · ' : '') + x.code, function () { connect(x.code); })); });
  }

  // ---------- Sending (one at a time, in order; an interrupted item carries on where it stopped) ----------
  function addItem(item) {
    item.status = 'Waiting for the link'; item.progress = 0; queue.push(item); renderList(); pump();
  }
  function pump() {
    if (sending || !client || client.state !== 'linked') return;
    var item = queue.filter(function (x) { return !x.done && !x.busy; })[0]; if (!item) return;
    sending = true; item.busy = true; item.status = 'Sending'; renderList();
    client.send(item, function (f) { item.progress = f; renderBar(item); }).then(function (r) {
      sending = false; item.busy = false;
      if (r.retry) item.status = 'Waiting for the link'; // it goes again (from where it stopped) when the link is back
      else {
        item.done = true; item.ok = r.ok; item.status = r.ok ? 'Sent · ' + (r.msg || 'arrived') : r.msg || 'The headset couldn’t use it.'; item.data = null; // keep the list, not the megabytes
        if (r.ok && navigator.vibrate) navigator.vibrate(30);
        if (r.ok && libOpen) loadLibrary();
      }
      renderList(); pump();
    });
  }
  function renderBar(item) { var b = document.querySelector('[data-item="' + item.id + '"] .bar i'); if (b) b.style.width = Math.round(item.progress * 100) + '%'; }
  function renderList() {
    var list = $('#sentList'); list.textContent = '';
    if (!queue.length) list.append(el('p', 'muted', 'Nothing sent yet.'));
    queue.slice().reverse().forEach(function (x) {
      var row = el('div', 'item'), th = el('div', 'thumb'), txt = el('div'), s = el('small', x.done ? (x.ok ? 'ok' : 'bad') : '', x.status);
      row.dataset.item = x.id;
      if (x.thumb) th.style.backgroundImage = 'url(' + x.thumb + ')'; else th.textContent = x.kind === 'link' ? '▶' : '♪';
      txt.append(el('b', '', ({ photo: 'Photo', sky: 'Sky', sound: 'Sound', link: 'Link' })[x.kind] + (x.name ? ': ' + x.name : '')), s);
      if (x.busy) { var bar = el('div', 'bar'); bar.append(el('i')); txt.append(bar); }
      row.append(th, txt); list.append(row);
    });
    queue.forEach(function (x) { if (x.busy) renderBar(x); });
    syncWake();
  }
  var n = 0; function itemId() { return 'p' + Date.now().toString(36) + (++n); }
  // Keep the screen on while things are sending: if the phone sleeps, the browser drops the link mid-item.
  var wake = null, waking = false;
  function syncWake() {
    var st = client ? client.state : 'off', want = !document.hidden && queue.some(function (x) { return !x.done; }) && (st === 'linked' || st === 'connecting' || st === 'lost');
    $('#wakeNote').hidden = !(want && navigator.wakeLock);
    if (want && !wake && !waking && navigator.wakeLock) {
      waking = true;
      navigator.wakeLock.request('screen').then(function (l) {
        waking = false; wake = l; l.addEventListener('release', function () { if (wake === l) wake = null; });
        syncWake(); // in case it's no longer wanted
      }, function () { waking = false; });
    } else if (!want && wake) { var w = wake; wake = null; w.release().catch(function () { }); }
  }
  document.addEventListener('visibilitychange', syncWake); // the lock lapses when the app is in the background; take it back on return

  // ---------- Tabs ----------
  $$('[data-tab]').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('[data-tab]').forEach(function (x) { x.setAttribute('aria-selected', String(x === b)); });
      $$('[data-panel]').forEach(function (p) { p.hidden = p.dataset.panel !== b.dataset.tab; });
    });
  });

  // ---------- Photos ----------
  function fileImage(f) { var url = URL.createObjectURL(f); return M.loadImage(url).then(function (img) { URL.revokeObjectURL(url); return img; }, function (e) { URL.revokeObjectURL(url); throw e; }); }
  function baseName(name) { return String(name || '').replace(/\.[^.]+$/, '').slice(0, 40); }
  // At the size the headset keeps (512 px), so the headset takes it as it is: quick to send, and compressed once.
  function queuePhoto(img, name) {
    var w = img.naturalWidth, h = img.naturalHeight;
    addItem({ id: itemId(), kind: 'photo', name: baseName(name), data: M.fitImage(img, w, h, 512, 250000), thumb: M.fitImage(img, w, h, 96, 20000) });
  }
  function sendPhotos(files) {
    Array.prototype.forEach.call(files, function (f) {
      fileImage(f).then(function (img) { queuePhoto(img, f.name); }, function () {
        queue.push({ id: itemId(), kind: 'photo', name: f.name, done: true, ok: false, status: 'This phone can’t read that picture.' }); renderList();
      });
    });
  }
  $('#takePhoto').addEventListener('click', function () { $('#photoCam').click(); });
  $('#choosePhotos').addEventListener('click', function () { $('#photoPick').click(); });
  $('#photoCam').addEventListener('change', function (e) { sendPhotos(e.target.files); e.target.value = ''; });
  $('#photoPick').addEventListener('change', function (e) { sendPhotos(e.target.files); e.target.value = ''; });

  // ---------- Skies ----------
  var skyDraft = null;
  function showHq() { $('#hqSky').setAttribute('aria-pressed', String(!!saved.hqSky)); }
  function makeSky() { // (re)build the draft from its photo at the chosen quality
    var sk = M.toSky(skyDraft.img, !!saved.hqSky);
    skyDraft.data = sk.data;
    $('#skyPreview').style.backgroundImage = 'url(' + sk.data + ')';
    $('#skyKind').textContent = { '360': 'A full 360° photo.', panorama: 'A panorama: sky and ground are filled in above and below it.', photo: 'An ordinary photo: it’s mirrored round so it goes all the way round.' }[sk.kind]
      + ' ' + (saved.hqSky ? 'High quality, ' : '') + Math.round(sk.data.length * 0.75 / 1024) + ' KB to send.';
  }
  function openSkyDraft(img, name) {
    skyDraft = { img: img, thumb: M.fitImage(img, img.naturalWidth, img.naturalHeight, 96, 20000) };
    makeSky(); $('#skyName').value = baseName(name); $('#skyDraft').hidden = false; showTab('skies');
  }
  $('#chooseSky').addEventListener('click', function () { $('#skyPick').click(); });
  $('#skyPick').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return;
    fileImage(f).then(function (img) { openSkyDraft(img, f.name); }, function () { alert('This phone can’t read that picture.'); });
  });
  $('#hqSky').addEventListener('click', function () { saved.hqSky = !saved.hqSky; save(); showHq(); if (skyDraft) makeSky(); });
  $('#sendSky').addEventListener('click', function () {
    if (!skyDraft) return;
    addItem({ id: itemId(), kind: 'sky', name: $('#skyName').value.trim().slice(0, 40) || 'Sky', data: skyDraft.data, thumb: skyDraft.thumb });
    skyDraft = null; $('#skyDraft').hidden = true;
  });

  // ---------- Sounds: record or choose, then trim, even out and loop before sending ----------
  var AC = null; function actx() { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); return AC; } // one for the page (browsers allow few)
  var rec = { mr: null, chunks: [], t0: 0, timer: 0, mime: '' }, snd = null, MAX_REC = 30, MAX_SEND = 60;
  function pickMime() {
    var opts = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm'];
    for (var i = 0; i < opts.length; i++) if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(opts[i])) return opts[i];
    return '';
  }
  function fmt(s) { return Math.floor(s / 60) + ':' + ('0' + Math.floor(s % 60)).slice(-2); }
  function stopRec() { if (rec.mr && rec.mr.state !== 'inactive') rec.mr.stop(); }
  $('#recBtn').addEventListener('click', function () {
    if (rec.mr && rec.mr.state === 'recording') { stopRec(); return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) { $('#recHelp').textContent = 'This browser can’t record. Choose a sound file instead.'; return; }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (st) {
      rec.chunks = []; rec.mime = pickMime();
      try { rec.mr = rec.mime ? new MediaRecorder(st, { mimeType: rec.mime }) : new MediaRecorder(st); }
      catch (e) { st.getTracks().forEach(function (t) { t.stop(); }); $('#recHelp').textContent = 'This phone can’t record here. Choose a sound file instead.'; return; } // don't leave the microphone on
      rec.mr.ondataavailable = function (e) { if (e.data && e.data.size) rec.chunks.push(e.data); };
      rec.mr.onstop = function () {
        clearInterval(rec.timer); st.getTracks().forEach(function (t) { t.stop(); });
        $('#recBtn').setAttribute('aria-pressed', 'false'); $('#recBtn').setAttribute('aria-label', 'Record'); $('#recHelp').textContent = 'Tap to record again';
        var full = rec.mr.mimeType || rec.mime || 'audio/webm', type = full.split(';')[0];
        M.blobToData(new Blob(rec.chunks, { type: full })).then(function (d) {
          if (d.indexOf('data:audio/') !== 0) d = 'data:' + type + ';base64,' + d.slice(d.indexOf(',') + 1);
          draftSound(d, 'Recording ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        });
      };
      rec.mr.start(250); rec.t0 = Date.now();
      $('#recBtn').setAttribute('aria-pressed', 'true'); $('#recBtn').setAttribute('aria-label', 'Stop recording'); $('#recHelp').textContent = 'Recording… tap to stop';
      rec.timer = setInterval(function () { var s = (Date.now() - rec.t0) / 1000; $('#recTime').textContent = fmt(s); if (s >= MAX_REC) stopRec(); }, 200);
    }, function () { $('#recHelp').textContent = 'The microphone isn’t available. Allow it in your browser settings, or choose a file.'; });
  });
  // A sound to send: decoded here so it can be heard, trimmed, evened out and looped. Sent as it came unless it's
  // edited (or too long or big to send as it is): then as the edited stretch, a WAV.
  function draftSound(d, name, mime) {
    stopPreview();
    var data = d.indexOf('data:audio/') === 0 ? d : 'data:' + (mime || 'audio/mpeg') + ';base64,' + d.slice(d.indexOf(',') + 1);
    snd = { data: data, buf: null, from: 0, to: 0, level: false, loop: use === 'ambient' };
    $('#soundName').value = name; $('#soundDraft').hidden = false; $('#editor').hidden = false; $('#editInfo').textContent = 'Reading the sound…';
    var mine = snd;
    M.decodeSound(actx(), data).then(function (buf) {
      if (snd !== mine) return;
      snd.buf = buf; snd.to = Math.min(buf.duration, MAX_SEND);
      $('#trimStart').value = 0; $('#trimEnd').value = Math.round(snd.to / buf.duration * 1000); showEdit();
    }, function () {
      if (snd !== mine) return;
      if (!M.okData('sound', data)) { $('#soundDraft').hidden = true; snd = null; alert('This phone can’t read that sound file.'); return; }
      $('#editor').hidden = true; // can't be heard here: it goes as it is
    });
    showEdit();
  }
  function edited() { return !!snd && !!snd.buf && (snd.from > 0.01 || snd.to < snd.buf.duration - 0.01 || snd.level || snd.loop); }
  function mustEncode() { return !!snd && (!M.okData('sound', snd.data) || (!!snd.buf && snd.buf.duration > MAX_SEND + 0.4)); }
  function showEdit() {
    if (!snd) return;
    $('#levelBtn').setAttribute('aria-pressed', String(snd.level)); $('#loopBtn').setAttribute('aria-pressed', String(snd.loop));
    if (!snd.buf) return;
    var len = snd.to - snd.from;
    $('#trimStartOut').textContent = snd.from.toFixed(1) + ' s'; $('#trimEndOut').textContent = snd.to.toFixed(1) + ' s';
    rangeFill($('#trimStart')); rangeFill($('#trimEnd'));
    $('#editInfo').textContent = len.toFixed(1) + ' s to send' + (edited() || mustEncode() ? ' (as an edited WAV)' : ' (as it was recorded)') + (snd.buf.duration > MAX_SEND ? '. Up to a minute can go.' : '.');
    drawWave();
  }
  function drawWave() {
    var c = $('#soundWave'), dpr = window.devicePixelRatio || 1, W = Math.max(1, Math.round(c.clientWidth * dpr)), H = Math.max(1, Math.round(c.clientHeight * dpr)), g = c.getContext('2d');
    c.width = W; c.height = H; g.clearRect(0, 0, W, H);
    var d = snd.buf.getChannelData(0), per = Math.max(1, Math.floor(d.length / W)), x0 = snd.from / snd.buf.duration * W, x1 = snd.to / snd.buf.duration * W;
    for (var x = 0; x < W; x++) {
      var lo = 1, hi = -1; for (var i = x * per, e = Math.min(d.length, i + per); i < e; i += 4) { var v = d[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
      if (hi < lo) continue;
      g.fillStyle = x >= x0 && x <= x1 ? '#8fc2b0' : 'rgba(243, 233, 220, 0.25)';
      g.fillRect(x, (1 - hi) * H / 2, 1, Math.max(1, (hi - lo) * H / 2));
    }
  }
  function trimFrom(which) {
    if (!snd || !snd.buf) return;
    var D = snd.buf.duration, a = $('#trimStart').value / 1000 * D, b = $('#trimEnd').value / 1000 * D;
    if (which === 'start') { a = Math.min(a, b - 0.2); if (b - a > MAX_SEND) b = a + MAX_SEND; }
    else { b = Math.max(b, a + 0.2); if (b - a > MAX_SEND) a = b - MAX_SEND; }
    snd.from = Math.max(0, a); snd.to = Math.min(D, b);
    $('#trimStart').value = Math.round(snd.from / D * 1000); $('#trimEnd').value = Math.round(snd.to / D * 1000);
    stopPreview(); showEdit();
  }
  $('#trimStart').addEventListener('input', function () { trimFrom('start'); });
  $('#trimEnd').addEventListener('input', function () { trimFrom('end'); });
  $('#levelBtn').addEventListener('click', function () { if (snd) { snd.level = !snd.level; stopPreview(); showEdit(); } });
  $('#loopBtn').addEventListener('click', function () { if (snd) { snd.loop = !snd.loop; stopPreview(); showEdit(); } });
  function editedSamples() { return M.editSound(snd.buf, { from: snd.from, to: snd.to, level: snd.level, loop: snd.loop, rate: 22050 }); }
  // Preview: what will be sent, looping if it's a loop.
  var playing = null;
  function stopPreview() { if (playing) { var p = playing; playing = null; try { p.stop(); } catch (e) { } } $('#previewBtn').setAttribute('aria-pressed', 'false'); $('#previewBtn').textContent = '▶ Preview'; }
  $('#previewBtn').addEventListener('click', function () {
    if (playing) { stopPreview(); return; }
    if (!snd || !snd.buf) return;
    var ctx = actx(); if (ctx.state === 'suspended') ctx.resume();
    var e = editedSamples(), b = ctx.createBuffer(1, e.samples.length, e.rate), src = ctx.createBufferSource();
    b.copyToChannel(e.samples, 0); src.buffer = b; src.loop = snd.loop; src.connect(ctx.destination);
    src.onended = function () { if (playing === src) stopPreview(); }; src.start(); playing = src;
    $('#previewBtn').setAttribute('aria-pressed', 'true'); $('#previewBtn').textContent = '■ Stop';
  });
  function soundFromFile(f, name) {
    M.blobToData(f).then(function (d) { draftSound(d, baseName(name || f.name), f.type || 'audio/mpeg'); }).catch(function () { alert('This phone can’t read that sound file.'); });
  }
  $('#chooseSound').addEventListener('click', function () { $('#soundPick').click(); });
  $('#soundPick').addEventListener('change', function (e) { var f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) soundFromFile(f); });
  var USE_HELP = {
    shape: 'Shapes: put it on shapes from the Look tab of the headset’s edit panel (or it goes straight on selected shapes).',
    ambient: 'Scene sound: it loops quietly in the background of the scene that’s on in the headset. Smooth loop hides the join.',
    tool: 'Tool sound: it plays instead of the clay sound when you use those tools.'
  };
  $$('#useChips .chip').forEach(function (c) {
    c.addEventListener('click', function () {
      use = c.dataset.use; $$('#useChips .chip').forEach(function (x) { x.setAttribute('aria-pressed', String(x === c)); });
      $('#useHelp').textContent = USE_HELP[use.indexOf('tool:') === 0 ? 'tool' : use];
      if (snd && use === 'ambient' && !snd.loop) { snd.loop = true; stopPreview(); showEdit(); } // scene sounds loop
    });
  });
  $('#sendSound').addEventListener('click', function () {
    if (!snd) return;
    var data = snd.data;
    if (snd.buf && (edited() || mustEncode())) { var e = editedSamples(); data = M.wavData(e.samples, e.rate); }
    if (!M.okData('sound', data)) { alert('That sound is too big to send. Trim it to under a minute.'); return; }
    stopPreview();
    addItem({ id: itemId(), kind: 'sound', name: $('#soundName').value.trim().slice(0, 40) || 'Sound', use: use, data: data });
    snd = null; $('#soundDraft').hidden = true; $('#recTime').textContent = '0:00';
  });

  // ---------- Social links ----------
  function checkLink() {
    var v = $('#linkIn').value.trim(), r = v ? M.parseSocial(v) : null;
    $('#linkInfo').textContent = !r ? '' : r.ok ? r.label + (r.who ? ' · ' + r.who : '') : r.msg;
    $('#sendLink').disabled = !(r && r.ok);
    return r;
  }
  function queueLink(r) { addItem({ id: itemId(), kind: 'link', name: r.label + (r.who ? ' · ' + r.who : ''), data: r.url }); }
  $('#linkIn').addEventListener('input', checkLink);
  $('#pasteLink').addEventListener('click', function () {
    if (!navigator.clipboard || !navigator.clipboard.readText) { $('#linkInfo').textContent = 'Long-press the box and choose Paste.'; return; }
    navigator.clipboard.readText().then(function (t) { $('#linkIn').value = t.trim(); checkLink(); }, function () { $('#linkInfo').textContent = 'Long-press the box and choose Paste.'; });
  });
  $('#sendLink').addEventListener('click', function () {
    var r = checkLink(); if (!r || !r.ok) return;
    queueLink(r); $('#linkIn').value = ''; checkLink();
  });

  // ---------- On your headset: what's there, rename, delete ----------
  var libOpen = false, lib = null, renaming = null, arming = null;
  function loadLibrary(op) {
    if (!client) return;
    $('#libShow').disabled = true;
    client.library(op).then(function (l) {
      $('#libShow').disabled = false;
      if (l) { lib = l; libOpen = true; } else if (!lib) { $('#libBody').textContent = 'The headset didn’t answer. Make sure Endless Clay is up to date there.'; return; }
      renderLibrary();
    });
  }
  $('#libShow').addEventListener('click', function () { renaming = arming = null; loadLibrary(); });
  function libDo(op, kind, id, name) { renaming = arming = null; loadLibrary({ op: op, kind: kind, id: id, name: name }); }
  function delChip(kind, id) { // two taps, so nothing goes by accident
    var key = kind + ':' + id, b = chip(arming === key ? 'Tap again to delete' : 'Delete', function () { if (arming === key) libDo('del', kind, id); else { arming = key; renderLibrary(); } }, arming === key);
    b.classList.add('danger'); return b;
  }
  function libRow(kind, item, label, thumb) {
    var row = el('div', 'lib-row'), th = el('div', 'thumb'), key = kind + ':' + item.id;
    if (thumb) th.style.backgroundImage = 'url(' + thumb + ')'; else th.textContent = kind === 'link' ? '▶' : '♪';
    if (renaming === key) {
      var inp = el('input'); inp.type = 'text'; inp.value = item.name || ''; inp.maxLength = 40; inp.setAttribute('aria-label', 'New name');
      var ok = function () { if (inp.value.trim()) libDo('rename', kind, item.id, inp.value.trim()); };
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') ok(); });
      row.append(th, inp, chip('Save', ok), chip('Cancel', function () { renaming = null; renderLibrary(); }));
      setTimeout(function () { inp.focus(); inp.select(); }, 0);
    } else {
      row.append(th, el('b', '', label), kind === 'sky' || kind === 'sound' ? chip('Rename', function () { renaming = key; arming = null; renderLibrary(); }) : el('span'), delChip(kind, item.id));
    }
    return row;
  }
  function renderLibrary() {
    var body = $('#libBody'); body.textContent = ''; if (!lib) return;
    function sec(title, items, fill) { var s = el('div', 'lib-sec'); s.append(el('h3', '', title + ' (' + items.length + ')')); if (!items.length) s.append(el('small', 'muted', 'None yet.')); else fill(s, items); body.append(s); }
    sec('Skies', lib.skies || [], function (s, l) { l.forEach(function (x) { s.append(libRow('sky', x, x.name, x.thumb)); }); });
    sec('Sounds', lib.sounds || [], function (s, l) { l.forEach(function (x) { s.append(libRow('sound', x, x.name + (x.dur ? ' · ' + x.dur + ' s' : ''))); }); });
    sec('Social links', lib.links || [], function (s, l) { l.forEach(function (x) { s.append(libRow('link', x, x.label)); }); });
    sec('Photos', lib.photos || [], function (s, l) {
      var grid = el('div', 'lib-photos');
      l.forEach(function (x) { var t = el('div', 'lib-photo'); if (x.thumb) t.style.backgroundImage = 'url(' + x.thumb + ')'; t.append(delChip('photo', x.id)); grid.append(t); });
      s.append(grid);
    });
    $('#libShow').textContent = 'Refresh';
  }

  // ---------- Shared from other apps (the installed app is a share target; see sw.js) ----------
  // The service worker keeps what was shared in a small cache, then opens this page with ?shared. Photos and
  // social links go straight into the queue; a 360° photo opens as a sky and a sound opens in the editor.
  function takeShared() {
    var qs = new URLSearchParams(location.search); // tidy the address (a reload shouldn't look like a new share), keeping anything else in it
    if (qs.has('shared')) { qs.delete('shared'); history.replaceState(null, '', location.pathname + (String(qs) ? '?' + qs : '') + location.hash); }
    if (!window.caches) return Promise.resolve();
    return caches.open('clay-share-inbox').then(function (box) {
      return box.match('./share/meta').then(function (m) {
        if (!m) return;
        return m.json().then(function (meta) {
          var jobs = []; for (var i = 0; i < (meta.files | 0) && i < 20; i++) jobs.push(box.match('./share/file' + i));
          return Promise.all(jobs).then(function (rs) {
            return Promise.all(rs.map(function (r) { return r ? r.blob().then(function (b) { return { blob: b, name: decodeURIComponent(r.headers.get('x-name') || 'Shared') }; }) : null; }));
          }).then(function (files) { // emptied before use, so a reload can't add the same things twice
            return box.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return box.delete(k); })); }).then(function () { handleShared(meta, files.filter(Boolean)); });
          });
        });
      });
    }).catch(function () { });
  }
  function handleShared(meta, files) {
    var got = { picture: 0, sound: 0, link: 0 };
    files.forEach(function (f) {
      var type = f.blob.type || '';
      if (type.indexOf('image/') === 0) {
        got.picture++;
        fileImage(f.blob).then(function (img) { var a = img.naturalWidth / img.naturalHeight; if (a > 1.9 && a < 2.1) openSkyDraft(img, f.name); else queuePhoto(img, f.name); }, function () { });
      } else if (type.indexOf('audio/') === 0 || /\.(mp3|m4a|aac|wav|ogg|oga|opus|webm|flac)$/i.test(f.name)) { got.sound++; showTab('sounds'); soundFromFile(f.blob, f.name); }
    });
    var url = (String(meta.url || '') + ' ' + String(meta.text || '') + ' ' + String(meta.title || '')).match(/https?:\/\/[^\s"'<>]+/);
    if (url) {
      var r = M.parseSocial(url[0]);
      if (r.ok) { got.link++; queueLink(r); } else { showTab('links'); $('#linkIn').value = url[0]; checkLink(); }
    }
    var parts = Object.keys(got).filter(function (k) { return got[k]; }).map(function (k) { return got[k] === 1 ? 'a ' + k : got[k] + ' ' + k + 's'; });
    var said = parts.length > 1 ? parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1] : parts[0];
    var note = $('#shareNote'); note.hidden = false;
    note.textContent = parts.length ? 'From your share: ' + said + (client && client.state === 'linked' ? '.' : '. It goes to your headset as soon as you’re linked.')
      : 'Nothing in that share can go to the headset. Photos, sounds and links to posts can.';
  }

  // ---------- Start: code from the QR link (#CODE), or the last one used ----------
  var hash = M.cleanCode(location.hash.slice(1));
  $('#codeIn').value = hash || saved.code || ''; $('#nameIn').value = saved.name || '';
  showHq(); checkLink(); showStatus(); renderList(); takeShared();
  if (hash.length === 6 || (saved.code && saved.autolink !== false && saved.code.length === 6)) connect();
  if ('serviceWorker' in navigator && location.protocol === 'https:') window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { }); });
  if (/[?&]debug\b/.test(location.search)) window.phoneDebug = {
    queue: function () { return queue.map(function (x) { return { kind: x.kind, name: x.name, done: !!x.done, ok: !!x.ok, status: x.status, size: x.data ? x.data.length : 0, kept: x.data !== null && x.data !== undefined }; }); },
    state: function () { return client && client.state; }, info: function () { return client && client.info; }, client: function () { return client; },
    draft: function () { return snd && { dur: snd.buf ? snd.buf.duration : 0, from: snd.from, to: snd.to, level: snd.level, loop: snd.loop, edited: edited() }; },
    sky: function () { return skyDraft && { size: skyDraft.data.length }; }, wake: function () { return !!wake; }, takeShared: takeShared, lib: function () { return lib; }
  };
})();
