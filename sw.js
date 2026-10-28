// Service Worker - Suivi Fitness
// Cache-first pour le mode hors-ligne complet de la PWA.
// APP_VERSION doit être incrémenté à chaque release (en même temps que
// manifest.json) : le navigateur ne réinstalle le service worker que si
// le contenu de ce fichier change.
const APP_VERSION = '1.3.0';
const CACHE_NAME = 'suivi-fitness-' + APP_VERSION;
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './style.css',
  './manifest.json',
  './data.json',
  './js/chart.umd.min.js',
  './css/fonts.css',
  './fonts/chakra-petch-latin-600-normal.woff2',
  './fonts/chakra-petch-latin-700-normal.woff2',
  './fonts/figtree-latin-400-normal.woff2',
  './fonts/figtree-latin-500-normal.woff2',
  './fonts/figtree-latin-600-normal.woff2',
  './icons/bench_press.png',
  './icons/biceps_curl.png',
  './icons/calf_raise.png',
  './icons/deadlift.png',
  './icons/dips.png',
  './icons/dumbbell_row.png',
  './icons/incline_bench.png',
  './icons/lat_pulldown.png',
  './icons/lateral_raise.png',
  './icons/leg_curl.png',
  './icons/leg_extension.png',
  './icons/leg_press.png',
  './icons/overhead_press.png',
  './icons/pull_up.png',
  './icons/reverse_fly.png',
  './icons/seated_row.png',
  './icons/triceps_extension.png',
  './icons/walking_lunge.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
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
