// Guarda la app en el teléfono para que abra sin señal.
const VERSION = 'freat-v2';
const MAPAS = 'freat-mapas'; // librería del mapa y fotos satelitales ya vistas (se conserva entre versiones)
const ARCHIVOS = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-180.png', './icons/logo-header.jpg'];
const EXTERNOS = ['cdnjs.cloudflare.com', 'server.arcgisonline.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== MAPAS).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (EXTERNOS.includes(url.hostname)) {
    // Mapa: primero lo guardado; si no está, se baja y se guarda para usarlo sin señal.
    e.respondWith(caches.open(MAPAS).then(c => c.match(e.request).then(g => g || fetch(e.request).then(r => { if (r.ok || r.type === 'opaque') c.put(e.request, r.clone()); return r; }))));
    return;
  }
  if (url.origin !== location.origin) return; // los datos van directo al servidor
  // Abre al instante con lo guardado (señal mala no la frena) y se actualiza por detrás para la próxima vez.
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(guardado => {
    const red = fetch(e.request).then(r => { if (r.ok) { const copia = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copia)); } return r; })
      .catch(() => guardado || caches.match('./index.html'));
    return guardado || red;
  }));
});
