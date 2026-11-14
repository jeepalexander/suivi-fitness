// Service Worker - Suivi Fitness
// APP_VERSION doit être incrémenté à chaque release (en même temps que
// manifest.json) : le navigateur ne réinstalle le service worker que si
// le contenu de ce fichier change.
const APP_VERSION = '1.7.73';
// 1.7.64 (co-auteur : Claude) : production (…/suivi-fitness/) et test (…/suivi-fitness/dev/) sont sur le même
// domaine et partagent le stockage des caches : chaque version nomme ses caches d'après son dossier et ne
// supprime que les siens (plus les anciens caches sans dossier, d'avant la 1.7.64).
const SCOPE_PATH = new URL(self.registration ? self.registration.scope : self.location.href).pathname;
const CACHE_PREFIX = 'suivi-fitness:' + SCOPE_PATH + ':';
const CACHE_NAME = CACHE_PREFIX + APP_VERSION;
const isLegacyCache = (k) => /^suivi-fitness-\d/.test(k);
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './style.css',
  './manifest.json',
  './data.json',
  './js/chart.umd.min.js',
  './js/qrcode.js',
  './js/security.js',
  './js/catalogue.js',
  './js/programmes.js',
  './js/bilan.js',
  './js/partage.js',
  './css/fonts.css',
  './fonts/saira-semi-condensed-latin-600-normal.woff2',
  './fonts/saira-semi-condensed-latin-700-normal.woff2',
  './fonts/figtree-latin-400-normal.woff2',
  './fonts/figtree-latin-500-normal.woff2',
  './fonts/figtree-latin-600-normal.woff2',
  './fonts/caveat-latin-600-normal.woff2',
  './wallpapers/course.jpg',
  './wallpapers/course-mini.jpg',
  './wallpapers/barre.jpg',
  './wallpapers/barre-mini.jpg',
  './wallpapers/halteres.jpg',
  './wallpapers/halteres-mini.jpg',
  './wallpapers/kettlebell.jpg',
  './wallpapers/kettlebell-mini.jpg',
  './wallpapers/ratelier.jpg',
  './wallpapers/ratelier-mini.jpg',
  './wallpapers/squat.jpg',
  './wallpapers/squat-mini.jpg',
  './wallpapers/poigne.jpg',
  './wallpapers/poigne-mini.jpg',
  './wallpapers/disques.jpg',
  './wallpapers/disques-mini.jpg',
  './wallpapers/cuivre.jpg',
  './wallpapers/cuivre-mini.jpg',
  './wallpapers/geometrie.jpg',
  './wallpapers/geometrie-mini.jpg',
  './wallpapers/salle.jpg',
  './wallpapers/salle-mini.jpg',
  './wallpapers/cordes.jpg',
  './wallpapers/cordes-mini.jpg',
  './wallpapers/fente.jpg',
  './wallpapers/fente-mini.jpg',
  './wallpapers/rack.jpg',
  './wallpapers/rack-mini.jpg',
  './wallpapers/silhouette.jpg',
  './wallpapers/silhouette-mini.jpg',
  './wallpapers/escaliers.jpg',
  './wallpapers/escaliers-mini.jpg',
  './wallpapers/traction.jpg',
  './wallpapers/traction-mini.jpg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
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
  './icons/rower.png',
  './icons/seated_row.png',
  './icons/triceps_extension.png',
  './icons/walking_lunge.png',
  './icons/barbell_row.png',
  './icons/barbell_squat.png',
  './icons/bulgarian_split_squat.png',
  './icons/cable_pullover.png',
  './icons/concentration_curl.png',
  './icons/crunch.png',
  './icons/dumbbell_bench_press.png',
  './icons/dumbbell_hip_thrust.png',
  './icons/dumbbell_squat.png',
  './icons/front_raises.png',
  './icons/goblet_squat.png',
  './icons/hack_squat.png',
  './icons/hammer_curl.png',
  './icons/hip_abduction.png',
  './icons/hip_adduction.png',
  './icons/hip_thrust.png',
  './icons/jump_rope.png',
  './icons/lunges.png',
  './icons/lying_leg_raises.png',
  './icons/mountain_climbers.png',
  './icons/plank.png',
  './icons/push_ups.png',
  './icons/romanian_deadlift.png',
  './icons/russian_twist.png',
  './icons/seated_calf_raise.png',
  './icons/seated_dumbbell_press.png',
  './icons/seated_leg_curl.png',
  './icons/single_leg_extension.png',
  './icons/stationary_bike.png',
  './icons/step_up.png',
  './icons/stiff_leg_deadlift.png',
  './icons/triceps_kickback.png',
  './icons/triceps_pushdown.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME && (k.startsWith(CACHE_PREFIX) || isLegacyCache(k))).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => clients.forEach((c) => c.postMessage({ type: 'SW_ACTIVATED', version: APP_VERSION })))
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  try {
    const u = new URL(event.request.url);
    if (u.origin !== self.location.origin) return;
    // la version de test (dossier dev/) a son propre service worker : la production ne s'en mêle pas
    if (u.pathname.startsWith(SCOPE_PATH + 'dev/')) return;
  } catch (e) { return; }
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            cache.put(event.request, response.clone());
          }
          return response;
        }).catch(() => cached);
      })
    )
  );
});
