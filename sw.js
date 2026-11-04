// Endless Clay offline cache. CACHE changes whenever an app file changes, so updates arrive on the next launch.
const CACHE = 'endless-clay-3488757ac5';
const FILES = ['./', './palace/', './index.html', './manifest.webmanifest', './phone.html', './phone.webmanifest', './js/config.js', './js/engine.js', './js/model.js', './js/net.js', './js/media.js', './js/game.js', './js/phone.js', './lib/three.min.js', './lib/peerjs.min.js', './lib/qrcode.js', './fonts/bricolage-grotesque.woff2', './fonts/ibm-plex-mono-500.woff2', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './privacy.html', './palace/index.html', './palace/palace.js', './palace/sky.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('endless-clay-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Shared from another app (the phone app is a share target): keep what came in a small inbox the page empties,
// then open the page. The inbox's name doesn't start with "endless-clay-", so updates don't clear it.
async function takeShare(req) {
  try {
    const form = await req.formData(), box = await caches.open('clay-share-inbox');
    await Promise.all((await box.keys()).map(k => box.delete(k)));
    const files = form.getAll('media').filter(f => f && typeof f === 'object' && f.size).slice(0, 20);
    await Promise.all(files.map((f, i) => box.put('./share/file' + i, new Response(f, { headers: { 'content-type': f.type || 'application/octet-stream', 'x-name': encodeURIComponent(f.name || 'Shared') } }))));
    await box.put('./share/meta', new Response(JSON.stringify({ at: Date.now(), title: String(form.get('title') || ''), text: String(form.get('text') || ''), url: String(form.get('url') || ''), files: files.length }), { headers: { 'content-type': 'application/json' } }));
  } catch (err) { }
  return Response.redirect(new URL('./phone.html?shared=1', self.location).href, 303);
}
// Serve from the cache straight away (works with no connection); fetch a fresh copy in the background.
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method === 'POST' && url.origin === location.origin && url.pathname.endsWith('/phone.html') && url.searchParams.has('share')) { e.respondWith(takeShare(req)); return; }
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(cache => cache.match(req, { ignoreSearch: true }).then(hit => {
    const fresh = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || fresh;
  })));
});
