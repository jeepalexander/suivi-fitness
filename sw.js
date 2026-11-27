// Copyright (c) 2026 Jean-Philippe Alexander. Mon Carnet de Salle.
// SPDX-License-Identifier: PolyForm-Strict-1.0.0 (voir LICENSE et NOTICE)
// Service Worker - Suivi Fitness
// APP_VERSION doit être incrémenté à chaque release (en même temps que
// manifest.json) : le navigateur ne réinstalle le service worker que si
// le contenu de ce fichier change.
const APP_VERSION = '1.8.109';
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
  './js/theme.js',
  './js/chronos.js',
  './js/seance.js',
  './js/quick_logic.js',
  './js/quick_input.js',
  './js/historique.js',
  './js/graphiques.js',
  './js/analyse.js',
  './js/drive.js',
  './js/sauvegarde.js',
  './js/mises-a-jour.js',
  './style.css',
  './manifest.json',
  './data.json',
  './js/chart.umd.min.js',
  './js/qrcode.js',
  './js/security.js',
  './js/catalogue.js',
  './js/programmes.js',
  './js/bonhomme.js',
  './js/bilan.js',
  './js/partage.js',
  './js/aide.js',
  './js/jsqr.min.js',
  './js/fiches.js',
  './css/fonts.css',
  './fonts/saira-semi-condensed-latin-600-normal.woff2',
  './fonts/saira-semi-condensed-latin-700-normal.woff2',
  './fonts/figtree-latin-400-normal.woff2',
  './fonts/figtree-latin-500-normal.woff2',
  './fonts/figtree-latin-600-normal.woff2',
  './fonts/caveat-latin-600-normal.woff2',
  './wallpapers/barre.jpg',
  './wallpapers/barre-mini.jpg',
  './wallpapers/halteres.jpg',
  './wallpapers/halteres-mini.jpg',
  './wallpapers/kettlebell.jpg',
  './wallpapers/kettlebell-mini.jpg',
  './wallpapers/bienvenue.jpg',
  './wallpapers/bienvenue-mini.jpg',
  './wallpapers/intro-debut.jpg',
  './wallpapers/ratelier.jpg',
  './wallpapers/ratelier-mini.jpg',
  './wallpapers/squat.jpg',
  './wallpapers/squat-mini.jpg',
  './wallpapers/poigne.jpg',
  './wallpapers/poigne-mini.jpg',
  './wallpapers/disques.jpg',
  './wallpapers/disques-mini.jpg',
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
  './wallpapers/slamball.jpg',
  './wallpapers/slamball-mini.jpg',
  './wallpapers/frontsquat.jpg',
  './wallpapers/frontsquat-mini.jpg',
  './wallpapers/suspension.jpg',
  './wallpapers/suspension-mini.jpg',
  './wallpapers/wod.jpg',
  './wallpapers/wod-mini.jpg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/bmc-tasse.png',
  './icons/bench_press.webp',
  './icons/biceps_curl.webp',
  './icons/calf_raise.webp',
  './icons/deadlift.webp',
  './icons/dips.webp',
  './icons/dumbbell_row.webp',
  './icons/incline_dumbbell_press.webp',
  './icons/lat_pulldown.webp',
  './icons/lateral_raise.webp',
  './icons/leg_curl.webp',
  './icons/leg_extension.webp',
  './icons/leg_press.webp',
  './icons/overhead_press.webp',
  './icons/pull_up.webp',
  './icons/reverse_fly.webp',
  './icons/rower.webp',
  './icons/seated_row.webp',
  './icons/triceps_extension.webp',
  './icons/walking_lunge.webp',
  './icons/cable_curl.webp',
  './icons/dumbbell_triceps_extension.webp',
  './icons/cable_crunch.webp',
  './icons/decline_bench.webp',
  './icons/cable_fly.webp',
  './icons/incline_curl.webp',
  './icons/russian_twist.webp',
  './icons/treadmill.webp',
  './icons/side_plank.webp',
  './icons/dumbbell_fly.webp',
  './icons/incline_dumbbell_fly.webp',
  './icons/weighted_push_ups.webp',
  './icons/bench_dips.webp',
  './icons/skull_crusher.webp',
  './icons/arnold_press.webp',
  './icons/machine_shoulder_press.webp',
  './icons/upright_row.webp',
  './icons/ez_bar_curl.webp',
  './icons/ab_wheel.webp',
  './icons/barbell_shrugs.webp',
  './icons/pullover.webp',
  './icons/dumbbell_calf_raise.webp',
  './icons/incline_bench.webp',
  './icons/cable_row.webp',
  './icons/face_pull.webp',
  './icons/dumbbell_shrugs.webp',
  './icons/assisted_pull_up.webp',
  './icons/neutral_grip_pull_up.webp',
  './icons/bent_over_dumbbell_row.webp',
  './icons/straight_arm_pulldown.webp',
  './icons/hanging_leg_raises.webp',
  './icons/burpees.webp',
  './icons/ski_erg.webp',
  './icons/elliptical.webp',
  './icons/stair_climber.webp',
  './icons/barbell_row.webp',
  './icons/barbell_squat.webp',
  './icons/bulgarian_split_squat.webp',
  './icons/cable_pullover.webp',
  './icons/concentration_curl.webp',
  './icons/crunch.webp',
  './icons/dumbbell_bench_press.webp',
  './icons/dumbbell_hip_thrust.webp',
  './icons/dumbbell_squat.webp',
  './icons/front_raises.webp',
  './icons/goblet_squat.webp',
  './icons/hack_squat.webp',
  './icons/hammer_curl.webp',
  './icons/hip_abduction.webp',
  './icons/hip_adduction.webp',
  './icons/hip_thrust.webp',
  './icons/jump_rope.webp',
  './icons/lunges.webp',
  './icons/lying_leg_raises.webp',
  './icons/mountain_climbers.webp',
  './icons/plank.webp',
  './icons/push_ups.webp',
  './icons/romanian_deadlift.webp',
  './icons/seated_calf_raise.webp',
  './icons/seated_dumbbell_press.webp',
  './icons/seated_leg_curl.webp',
  './icons/single_leg_extension.webp',
  './icons/stationary_bike.webp',
  './icons/step_up.webp',
  './icons/stiff_leg_deadlift.webp',
  './icons/triceps_kickback.webp'
];

// EMPREINTES (écrites par tools/empreintes.py à chaque release : ne pas modifier à la main)
const EMPREINTES = {"./":"0a03183055a0","./index.html":"0a03183055a0","./app.js":"ee1a8aac38ff","./js/theme.js":"95fd98894602","./js/chronos.js":"1143898f810b","./js/seance.js":"651c6faa1575","./js/quick_logic.js":"d40331505bbf","./js/quick_input.js":"b2562043ea3c","./js/historique.js":"accdc871e1dd","./js/graphiques.js":"11b9b4ac18dc","./js/analyse.js":"efca1811eea6","./js/drive.js":"d1d893b66caf","./js/sauvegarde.js":"a5dc0861d987","./js/mises-a-jour.js":"dbd1fbbd9c13","./style.css":"564c5990406c","./manifest.json":"ebf4831bb7fe","./data.json":"0d69ce4d5064","./js/chart.umd.min.js":"74401d738dd3","./js/qrcode.js":"79ec86f82856","./js/security.js":"0131934e36b2","./js/catalogue.js":"d3a8ea258630","./js/programmes.js":"7c31ccc56fb8","./js/bonhomme.js":"228f46693471","./js/bilan.js":"d52713b56c91","./js/partage.js":"a674bb7a14bc","./js/aide.js":"a726407b3632","./js/jsqr.min.js":"68a525385a7a","./js/fiches.js":"238ddf67dbfd","./css/fonts.css":"1ed3c3946ed0","./fonts/saira-semi-condensed-latin-600-normal.woff2":"2c55a397b6bf","./fonts/saira-semi-condensed-latin-700-normal.woff2":"0a9365135efb","./fonts/figtree-latin-400-normal.woff2":"8f98dd642986","./fonts/figtree-latin-500-normal.woff2":"953a6a4294b1","./fonts/figtree-latin-600-normal.woff2":"367d71328791","./fonts/caveat-latin-600-normal.woff2":"d51e2283010e","./wallpapers/barre.jpg":"60f96f7529e9","./wallpapers/barre-mini.jpg":"b0adee86028e","./wallpapers/halteres.jpg":"501b7dae48e9","./wallpapers/halteres-mini.jpg":"ccb005d6dc05","./wallpapers/kettlebell.jpg":"d9ea8641f89d","./wallpapers/kettlebell-mini.jpg":"0939a3fcbe7e","./wallpapers/bienvenue.jpg":"bd2bfc49b5d5","./wallpapers/bienvenue-mini.jpg":"729ffa37703d","./wallpapers/intro-debut.jpg":"db058243839c","./wallpapers/ratelier.jpg":"53d25e3a6df9","./wallpapers/ratelier-mini.jpg":"9471284822e0","./wallpapers/squat.jpg":"1cc09bdbe2e7","./wallpapers/squat-mini.jpg":"ec9189e4d832","./wallpapers/poigne.jpg":"b2dd15d116b7","./wallpapers/poigne-mini.jpg":"42542eda819d","./wallpapers/disques.jpg":"3d02f2c49804","./wallpapers/disques-mini.jpg":"1a6be18367f1","./wallpapers/geometrie.jpg":"736d7ae41fbe","./wallpapers/geometrie-mini.jpg":"4457c609bd15","./wallpapers/salle.jpg":"e2c721ed99df","./wallpapers/salle-mini.jpg":"20914a614ebf","./wallpapers/cordes.jpg":"16c6c1928003","./wallpapers/cordes-mini.jpg":"27768931c6f6","./wallpapers/fente.jpg":"abd2b4912c6a","./wallpapers/fente-mini.jpg":"81e3308ae1e0","./wallpapers/rack.jpg":"81d6692ff240","./wallpapers/rack-mini.jpg":"5f3ab222d151","./wallpapers/slamball.jpg":"7fd38f1741a6","./wallpapers/slamball-mini.jpg":"05a3d28e4296","./wallpapers/frontsquat.jpg":"4a2e448d6846","./wallpapers/frontsquat-mini.jpg":"bbff2dac36f0","./wallpapers/suspension.jpg":"d2d5c3c43835","./wallpapers/suspension-mini.jpg":"94fb9efad782","./wallpapers/wod.jpg":"fd054bb929bc","./wallpapers/wod-mini.jpg":"6d8ad78e1fca","./icons/icon-192.png":"7eab0ee978b8","./icons/icon-512.png":"26301c889d82","./icons/apple-touch-icon.png":"c0d90c075ea1","./icons/bmc-tasse.png":"bdcfd745fc24","./icons/bench_press.webp":"b65b7047e089","./icons/biceps_curl.webp":"e24ce29437d8","./icons/calf_raise.webp":"067fc6aa2ac9","./icons/deadlift.webp":"1d40b63cfe50","./icons/dips.webp":"ab990a75c22f","./icons/dumbbell_row.webp":"03bde1d0b4a2","./icons/incline_dumbbell_press.webp":"238b13a8548f","./icons/lat_pulldown.webp":"aaa4667040c7","./icons/lateral_raise.webp":"2782668d8d8d","./icons/leg_curl.webp":"de976ff2d257","./icons/leg_extension.webp":"0640063e4735","./icons/leg_press.webp":"8064e5d1f056","./icons/overhead_press.webp":"b81c770f33ce","./icons/pull_up.webp":"5c71de56aa24","./icons/reverse_fly.webp":"f51a98ef88f0","./icons/rower.webp":"34c1ced20c9b","./icons/seated_row.webp":"697db9e05812","./icons/triceps_extension.webp":"3847d3dbcb32","./icons/walking_lunge.webp":"3e5c40bde6ff","./icons/cable_curl.webp":"3e40f7ab5c1b","./icons/dumbbell_triceps_extension.webp":"5e4e767bd721","./icons/cable_crunch.webp":"e08f45ef8518","./icons/decline_bench.webp":"94229325819f","./icons/cable_fly.webp":"3c915abe1029","./icons/incline_curl.webp":"0e63bb6bcadd","./icons/russian_twist.webp":"31d286a5c8e0","./icons/treadmill.webp":"950277a364e8","./icons/side_plank.webp":"2470cc3c18ee","./icons/dumbbell_fly.webp":"6af6adcd00a5","./icons/incline_dumbbell_fly.webp":"5901705fdb63","./icons/weighted_push_ups.webp":"a352c935d099","./icons/bench_dips.webp":"f3db39313d6f","./icons/skull_crusher.webp":"e115bc2e2239","./icons/arnold_press.webp":"89760b7541f5","./icons/machine_shoulder_press.webp":"a277c75d6f01","./icons/upright_row.webp":"50af34737564","./icons/ez_bar_curl.webp":"06dcc2bb65f7","./icons/ab_wheel.webp":"dece74c99020","./icons/barbell_shrugs.webp":"463f4e3eac8e","./icons/pullover.webp":"aaadf81fcd9e","./icons/dumbbell_calf_raise.webp":"e63d46ac7d07","./icons/incline_bench.webp":"ffbbc65ea525","./icons/cable_row.webp":"748c02a823c5","./icons/face_pull.webp":"1d3c933b0ba1","./icons/dumbbell_shrugs.webp":"4072680db639","./icons/assisted_pull_up.webp":"eff6cb6a0fd7","./icons/neutral_grip_pull_up.webp":"7b509c846332","./icons/bent_over_dumbbell_row.webp":"aef97243d93b","./icons/straight_arm_pulldown.webp":"9b94a24c45d7","./icons/hanging_leg_raises.webp":"033635da9abc","./icons/burpees.webp":"6986a5cb0b22","./icons/ski_erg.webp":"478b5b27e0f7","./icons/elliptical.webp":"a54a8f382d15","./icons/stair_climber.webp":"2263f7d40c1b","./icons/barbell_row.webp":"2aa2ab7c747c","./icons/barbell_squat.webp":"352bfc3eabdd","./icons/bulgarian_split_squat.webp":"e49c3f24151d","./icons/cable_pullover.webp":"6eb37af864c5","./icons/concentration_curl.webp":"3cdad0e6edda","./icons/crunch.webp":"5f0f7449feb9","./icons/dumbbell_bench_press.webp":"cac187b52900","./icons/dumbbell_hip_thrust.webp":"e657d9754fbc","./icons/dumbbell_squat.webp":"5598bdbb0005","./icons/front_raises.webp":"fd55b1c11626","./icons/goblet_squat.webp":"13e4718d0507","./icons/hack_squat.webp":"f0d9241918be","./icons/hammer_curl.webp":"bbe5f05f6d76","./icons/hip_abduction.webp":"431b049442d4","./icons/hip_adduction.webp":"04a345b84074","./icons/hip_thrust.webp":"f87e7e5b94cf","./icons/jump_rope.webp":"698cbcb00acc","./icons/lunges.webp":"3dd74f3993d1","./icons/lying_leg_raises.webp":"94859ed27b48","./icons/mountain_climbers.webp":"d577a78524d4","./icons/plank.webp":"4c9d09fb48d6","./icons/push_ups.webp":"28e713d06bca","./icons/romanian_deadlift.webp":"15090873a126","./icons/seated_calf_raise.webp":"2b0b4e2eff01","./icons/seated_dumbbell_press.webp":"118c353fa4c7","./icons/seated_leg_curl.webp":"7136e5b4f799","./icons/single_leg_extension.webp":"1af7d089c1f1","./icons/stationary_bike.webp":"0227d27fdea8","./icons/step_up.webp":"591a75de670e","./icons/stiff_leg_deadlift.webp":"ef60a2dbde4a","./icons/triceps_kickback.webp":"864ff13a19eb"};
// FIN DES EMPREINTES

// 1.8.102 (co-auteur : Claude) : téléchargements plus courts.
// - Mise à jour : un fichier dont l'empreinte n'a pas changé est repris de l'ancien cache, sans réseau ;
//   seuls les fichiers nouveaux ou modifiés sont téléchargés.
// - Première installation : seul l'essentiel (code, styles, polices, fond « Bienvenue ») est attendu ;
//   icônes d'exercices et autres fonds se téléchargent ensuite en arrière-plan (pendant le film d'accueil),
//   à la demande de la page (message COMPLETER_CACHE, renvoyé à chaque lancement jusqu'à ce que tout y soit).
const LISTE = './__empreintes__.json';
const estEssentiel = (url) => !/^\.\/(icons\/(?!icon-192|apple-touch|bmc-tasse)|wallpapers\/(?!bienvenue|intro-debut))/.test(url);
const EN_PARALLELE = 4; // pour ne pas gêner le film d'accueil, lu en même temps

async function telecharger(cache, urls, tolerant) {
  const file = urls.slice();
  const travail = async () => {
    while (file.length) {
      const url = file.shift();
      try {
        const r = await fetch(new Request(url, { cache: 'no-cache' }));
        if (!r.ok) throw new Error(url + ' : ' + r.status);
        await cache.put(url, r);
      } catch (e) { if (!tolerant) throw e; }
    }
  };
  await Promise.all(Array.from({ length: EN_PARALLELE }, travail));
}

// Caches des versions précédentes de ce dossier, avec leurs empreintes (avant la 1.8.102 : aucune)
async function anciensCaches() {
  const noms = (await caches.keys()).filter((k) => k !== CACHE_NAME && k.startsWith(CACHE_PREFIX));
  const res = [];
  for (const nom of noms) {
    try {
      const c = await caches.open(nom);
      const l = await c.match(LISTE);
      if (l) res.push({ c, emp: await l.json() });
    } catch (e) {}
  }
  return res;
}

async function reprendre(cache, url, anciens) {
  for (const { c, emp } of anciens) {
    if (!emp[url] || emp[url] !== EMPREINTES[url]) continue;
    const r = await c.match(url);
    if (r) { await cache.put(url, r); return true; }
  }
  return false;
}

async function installer() {
  const cache = await caches.open(CACHE_NAME);
  const anciens = await anciensCaches();
  const manquants = [];
  for (const url of ASSETS) {
    if (await cache.match(url)) continue;
    if (EMPREINTES[url] && await reprendre(cache, url, anciens)) continue;
    if (estEssentiel(url)) manquants.push(url);
  }
  await telecharger(cache, manquants, false); // un essentiel qui manque fait échouer l'installation, comme avant
  await cache.put(LISTE, new Response(JSON.stringify(EMPREINTES), { headers: { 'Content-Type': 'application/json' } }));
}

let completion = null;
function completerCache() {
  if (!completion) {
    completion = (async () => {
      const cache = await caches.open(CACHE_NAME);
      const manquants = [];
      for (const url of ASSETS) if (!(await cache.match(url))) manquants.push(url);
      await telecharger(cache, manquants, true);
    })().catch(() => {}).finally(() => { completion = null; });
  }
  return completion;
}

self.addEventListener('install', (event) => {
  event.waitUntil(installer().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME && (k.startsWith(CACHE_PREFIX) || isLegacyCache(k))).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => clients.forEach((c) => c.postMessage({ type: 'SW_ACTIVATED', version: APP_VERSION })))
      .then(() => { completerCache(); }) // sans attendre : la page relance la demande au prochain lancement si besoin
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'COMPLETER_CACHE') event.waitUntil(completerCache());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  try {
    const u = new URL(event.request.url);
    if (u.origin !== self.location.origin) return;
    // la version de test (dossier dev/) a son propre service worker : la production ne s'en mêle pas
    if (u.pathname.startsWith(SCOPE_PATH + 'dev/')) return;
    // 1.8.72 : le film d'accueil (lu une seule fois, par plages d'octets) passe par le réseau, hors cache : Safari refuse une vidéo servie en entier depuis le cache
    if (u.pathname.endsWith('.mp4')) return;
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
