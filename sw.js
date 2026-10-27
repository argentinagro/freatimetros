// Guarda la app en el teléfono para que abra sin señal.
const VERSION = 'freat-v4';
const MAPAS = 'freat-mapas'; // librería del mapa y fotos satelitales ya vistas (se conserva entre versiones)
const ARCHIVOS = ['./manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-180.png', './icons/logo-header.jpg'];
const EXTERNOS = ['cdnjs.cloudflare.com', 'server.arcgisonline.com'];
// La app se baja por "./index" (sin .html): esa dirección siempre trae la última versión publicada.
const FRESCA = ['./index', './index.html'];

async function bajarApp() {
  for (const u of FRESCA) {
    try { const r = await fetch(u, { cache: 'no-store' }); if (r.ok) { const c = await caches.open(VERSION); await c.put('./index.html', r.clone()); await c.put('./', r.clone()); return r; } } catch (e) {}
  }
  return null;
}
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)).then(bajarApp).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== MAPAS).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.pathname.includes('prueba')) return; // la página de prueba va siempre directo a internet
  if (EXTERNOS.includes(url.hostname)) {
    // Mapa: primero lo guardado; si no está, se baja y se guarda para usarlo sin señal.
    e.respondWith(caches.open(MAPAS).then(c => c.match(e.request).then(g => g || fetch(e.request).then(r => { if (r.ok || r.type === 'opaque') c.put(e.request, r.clone()); return r; }))));
    return;
  }
  if (url.origin !== location.origin) return; // los datos van directo al servidor
  const scope = new URL(self.registration.scope).pathname;
  const esApp = e.request.mode === 'navigate' || url.pathname === scope || url.pathname === scope + 'index.html' || url.pathname === scope + 'index';
  if (esApp && !url.pathname.endsWith('prueba.html') && !url.pathname.endsWith('/prueba')) {
    // Abre al instante con lo guardado y baja la última versión por detrás para la próxima vez.
    e.respondWith(caches.match('./index.html').then(g => {
      const red = bajarApp().then(r => r || g || fetch(e.request));
      if (g) { e.waitUntil(red.catch(() => {})); return g; }
      return red;
    }));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(guardado => {
    const red = fetch(e.request).then(r => { if (r.ok) { const copia = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copia)); } return r; })
      .catch(() => guardado || caches.match('./index.html'));
    return guardado || red;
  }));
});
