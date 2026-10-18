// Service Worker - Suivi Fitness
// Cache-first pour le mode hors-ligne complet de la PWA.
// Le nom du cache est dérivé de la version du manifest.json : incrémenter
// "version" dans manifest.json suffit à invalider le cache chez tous les
// utilisateurs — aucune modification manuelle de ce fichier n'est requise.
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './style.css',
  './manifest.json',
  './data.json',
  './js/chart.umd.min.js',
  './css/inter.css',
  './icons/calf_raise.png'
];

let CACHE_NAME = 'suivi-fitness-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    // cache:'reload' contourne le cache HTTP pour lire la version à jour
    fetch('./manifest.json', { cache: 'reload' })
      .then((res) => res.json())
      .then((manifest) => {
        CACHE_NAME = 'suivi-fitness-' + (manifest.version || 'v1');
        return caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS));
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok && new URL(event.request.url).origin === self.location.origin) {
            cache.put(event.request, response.clone());
          }
          return response;
        }).catch(() => cached);
      })
    )
  );
});
