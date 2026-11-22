// Service worker: cachea la app para que funcione offline durante el turno.
// Al cambiar cualquier archivo, subí V para que el celular baje la versión nueva.
const V = 15;
const CACHE = 'nc_v' + V;
const FILES = [
  './', './index.html', './style.css', './manifest.json', './brand.js',
  './vendor/xlsx.full.min.js', './js/marca.js', './js/reglas.js', './js/db.js', './js/backup.js', './js/app.js',
  './qualityos.svg',
  './icon-192.png', './icon-512.png'
];

self.addEventListener('install', e => {
  // cache:'reload' fuerza a bajar los archivos del servidor y no desde la caché HTTP:
  // así una versión nueva no queda armada con archivos viejos.
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(FILES.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', e => {
  // Las apps de la suite comparten dominio (roca-byte.github.io) y por eso comparten las cachés:
  // se borran SOLO las versiones viejas de esta app. Antes se borraba todo lo que no fuera la
  // versión actual, y al instalar o actualizar otra app de la suite esta dejaba de abrir sin señal.
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(k => k.startsWith('nc_v') && k !== CACHE)
        .map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
