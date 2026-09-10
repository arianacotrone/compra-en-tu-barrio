/* =========================================================
   Calzada Digital — service worker (PWA)
   ---------------------------------------------------------
   Qué hace: deja el sitio instalable como app en el celular y
   lo cachea para que abra al toque (y hasta funcione un poco
   offline). No inventa nada raro — dos reglas simples:

   1) Los DATOS (catálogo de comercios, farmacias) se piden
      siempre a la red primero, para no mostrar información
      vieja — si no hay conexión, ahí sí se usa lo último que
      había quedado guardado.
   2) Todo lo demás (las páginas, el CSS, el JS, los íconos) se
      sirve de la caché al toque, y se actualiza en segundo
      plano contra la red para la próxima visita.

   Si algún día cambiás mucho el sitio y querés forzar que todos
   los celulares bajen la versión nueva de una, solo hay que
   subir el número de CACHE_NAME (por ejemplo a 'calzada-compra-v2') —
   eso hace que se descarte toda la caché vieja sola.
   ========================================================= */

const CACHE_NAME = 'calzada-digital-v3';

// El "app shell": lo mínimo para que el sitio abra ya instalado, aunque
// no haya conexión en ese momento. Las imágenes de logos de cada comercio
// (que vienen de Drive) y los mapas no se precachean acá — son de otros
// orígenes y siguen pidiéndose normalmente a la red cuando hay conexión.
const APP_SHELL = [
  'index.html',
  'vidriera.html',
  'farmacias.html',
  'manifest.json',
  'assets/style.css',
  'assets/site.js',
  'assets/map.js',
  'assets/img/logo.png',
  'assets/img/icons/icon-192.png',
  'assets/img/icons/icon-512.png',
  'assets/img/icons/icon-maskable-192.png',
  'assets/img/icons/icon-maskable-512.png',
  'assets/img/icons/apple-touch-icon.png',
  'favicon.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch((err) => console.warn('Service worker: no se pudo precachear todo el app shell', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo controlamos pedidos GET de nuestro propio origen — todo lo que va
  // a Google Sheets, Google Drive, OpenStreetMap, etc. sigue su camino
  // normal, sin pasar por esta caché.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  const isData = url.pathname.includes('/assets/data/');

  if (isData) {
    // Regla 1: red primero, caché como respaldo offline.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Regla 2: caché primero (instantáneo), actualizando en segundo plano.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
