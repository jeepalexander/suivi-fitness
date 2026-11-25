// Copyright (c) 2026 Jean-Philippe Alexander. Mon Carnet de Salle.
// SPDX-License-Identifier: PolyForm-Strict-1.0.0 (voir LICENSE et NOTICE)
// Thème clair / sombre / auto et fonds d'écran (ancienne section 3 de app.js) — sorti de app.js tel quel en 1.8.90 (co-auteur : Claude), aucun changement de fonctionnement.
// Chargé juste après app.js (index.html) ; fonctions et variables globales, comme dans app.js.

// ============================================================
// 3. THÈME CLAIR / SOMBRE / AUTO
// ============================================================
function getThemePreference() {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === 'light' || v === 'dark' || v === 'auto') return v;
  } catch (e) {}
  return 'light';
}

function resolveTheme(pref) {
  if (pref === 'auto') {
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }
  return pref === 'dark' ? 'dark' : 'light';
}

function readChartColors() {
  const cs = getComputedStyle(document.documentElement);
  const read = (name, fallback) => cs.getPropertyValue(name).trim() || fallback;
  CHART_COLORS.primary = read('--chart-primary', CHART_COLORS.primary);
  CHART_COLORS.success = read('--chart-success', CHART_COLORS.success);
  CHART_COLORS.volume = read('--chart-volume', CHART_COLORS.volume);
  CHART_COLORS.tick = read('--chart-tick', CHART_COLORS.tick);
  CHART_COLORS.grid = read('--chart-grid', CHART_COLORS.grid);
  CHART_COLORS.band = read('--chart-band', CHART_COLORS.band);
  CHART_COLORS.warn = read('--warn', CHART_COLORS.warn);
  CHART_COLORS.trophy = read('--trophy', CHART_COLORS.trophy);
  if (typeof Chart !== 'undefined') Chart.defaults.color = CHART_COLORS.tick;
}

function applyTheme() {
  const pref = getThemePreference();
  const theme = resolveTheme(pref);
  document.documentElement.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_BAR_COLORS[theme]);
  document.querySelectorAll('#theme-choice [data-theme-choice]').forEach(btn => {
    const on = btn.dataset.themeChoice === pref;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-checked', on ? 'true' : 'false');
  });
  readChartColors();
  // Les graphiques sont déjà construits avec les anciennes couleurs : on les redessine.
  if (typeof state !== 'undefined' && state && document.body.dataset.tab === 'progression') renderCharts();
}

function setThemePreference(pref) {
  try { localStorage.setItem(THEME_KEY, pref); } catch (e) {}
  applyTheme();
}

function initTheme() {
  applyTheme();
  if (window.matchMedia) {
    themeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => { if (getThemePreference() === 'auto') applyTheme(); };
    if (themeMediaQuery.addEventListener) themeMediaQuery.addEventListener('change', onChange);
    else if (themeMediaQuery.addListener) themeMediaQuery.addListener(onChange);
  }
}

// Fond d'écran (1.7.7, 10 fonds ajoutés en 1.7.55, Studio et Poulie retirés en 1.7.56) : préférence de l'appareil (h49_wallpaper), hors des données exportées, comme le thème.
// Aucun par défaut. Le script de index.html pose data-wallpaper avant le premier affichage.
const WALLPAPER_KEY = 'h49_wallpaper';
// 1.7.94 : rangés par style ; Traction retiré (un fond retiré ramène à « Aucun ») ; Squat avant, Suspension, Carnet WOD ajoutés
const WALLPAPERS = [
  // Illustrations
  { id: 'frontsquat', name: 'Squat avant', pos: '75% center' },
  // Clairs
  { id: 'salle', name: 'Salle blanche', pos: 'right center' },
  { id: 'halteres', name: 'Haltères', pos: 'center 45%' },
  { id: 'barre', name: 'Barre', pos: 'center 55%' },
  { id: 'kettlebell', name: 'Kettlebell', pos: 'center 45%' },
  // Ambiance de salle
  { id: 'bienvenue', name: 'Bienvenue', pos: 'center center' }, // 1.8.72 : dernière image du film d'accueil
  { id: 'ratelier', name: 'Râtelier', pos: 'center 60%' },
  { id: 'suspension', name: 'Suspension', pos: 'right center' },
  { id: 'wod', name: 'Carnet WOD', pos: 'center 62%' },
  { id: 'cordes', name: 'Cordes', pos: 'center 50%' },
  { id: 'fente', name: 'Fente', pos: '45% center' },
  // Gros plans sombres
  { id: 'squat', name: 'Squat', pos: 'center 40%' },
  { id: 'poigne', name: 'Poigne', pos: 'center 40%' },
  { id: 'disques', name: 'Disques', pos: 'center 50%' },
  { id: 'rack', name: 'Rack', pos: 'center 50%' },
  { id: 'slamball', name: 'Slam ball', pos: 'center 45%' }, // 1.8.38 : Eduardo Cano (Unsplash)
  // Graphiques et couleurs vives
  { id: 'geometrie', name: 'Géométrie', pos: 'center 50%' },
  { id: 'none', name: 'Aucun' }
];

function getWallpaper() {
  let v = null;
  try { v = localStorage.getItem(WALLPAPER_KEY); } catch (e) {}
  return WALLPAPERS.some(w => w.id === v && w.id !== 'none') ? v : 'none';
}

// 1.8.29 (co-auteur : Claude) : fond « Râtelier » par défaut pour un NOUVEL usager (premier lancement : ni données
// ni fond enregistrés). Les usagers existants gardent leur fond, blanc compris.
// 1.8.72 : « Bienvenue » (dernière image du film d'accueil) remplace « Râtelier » pour un nouvel usager
const DEFAULT_WALLPAPER = 'bienvenue';
function initDefaultWallpaper() {
  try {
    if (localStorage.getItem('h49_state') === null && localStorage.getItem(WALLPAPER_KEY) === null) {
      localStorage.setItem(WALLPAPER_KEY, DEFAULT_WALLPAPER);
    }
  } catch (e) { /* stockage indisponible : fond blanc */ }
}

function wallpaperThumb(id) { return 'wallpapers/' + id + '-mini.jpg'; }

function applyWallpaper() {
  const id = getWallpaper();
  if (id === 'none') document.documentElement.removeAttribute('data-wallpaper');
  else document.documentElement.setAttribute('data-wallpaper', id);
  const cur = WALLPAPERS.find(w => w.id === id);
  const name = document.getElementById('wallpaper-row-name');
  if (name) name.textContent = cur.name;
  const row = document.getElementById('wallpaper-row');
  if (row) row.setAttribute('aria-label', 'Fond d\'écran : ' + cur.name + '. Changer');
  const img = document.getElementById('wallpaper-row-img');
  if (img) {
    if (id === 'none') { img.hidden = true; img.removeAttribute('src'); }
    else { img.src = wallpaperThumb(id); img.style.objectPosition = cur.pos; img.hidden = false; }
  }
  document.querySelectorAll('#wallpaper-grid .wallpaper-opt').forEach(btn => {
    btn.setAttribute('aria-checked', btn.dataset.wallpaper === id ? 'true' : 'false');
  });
}

function setWallpaper(id) {
  if (!WALLPAPERS.some(w => w.id === id)) return;
  try {
    // 1.8.29 : « Aucun » est retenu (avant, la clé était effacée et « Aucun » ne se distinguait pas de « jamais choisi »)
    localStorage.setItem(WALLPAPER_KEY, id);
  } catch (e) {}
  applyWallpaper();
}

function renderWallpaperGrid() {
  const grid = document.getElementById('wallpaper-grid');
  if (!grid) return;
  const cur = getWallpaper();
  grid.innerHTML = WALLPAPERS.map(w => `
    <li><button type="button" class="wallpaper-opt" role="radio" data-wallpaper="${w.id}" aria-checked="${w.id === cur}" onclick="setWallpaper('${w.id}')">
      <span class="wallpaper-thumb">${w.id === 'none' ? '' : `<img src="${wallpaperThumb(w.id)}" alt="" loading="lazy" style="object-position:${w.pos}">`}<span class="wallpaper-check">${CHECK_SVG}</span></span>
      <span class="wallpaper-name">${w.name}</span>
    </button></li>`).join('');
  // Bande sur une ligne (1.7.18) : on la fait défiler jusqu'au fond choisi
  const sel = grid.querySelector('.wallpaper-opt[aria-checked="true"]');
  if (sel) { const li = sel.parentElement; grid.scrollLeft = Math.max(0, li.offsetLeft - grid.offsetLeft - parseFloat(getComputedStyle(grid).paddingLeft || 0)); }
}

// Inviter quelqu'un (1.7.21) : QR code vers l'adresse de l'application.
// La personne installe l'app sur son téléphone et la connecte à son propre Google Drive.
// 1.7.64 : depuis la version de test (…/suivi-fitness/dev/), les invitations et les programmes partagés
// mènent toujours à la production (…/suivi-fitness/).
function isTestVersion() { return /\/dev\/(index\.html)?$/.test(location.pathname); }
// 1.7.66 : pastille « TEST » à côté de « MON CARNET DE SALLE », dans la version de test seulement
function markTestVersion() {
  const t = document.getElementById('app-title');
  if (!t || !isTestVersion() || t.querySelector('.test-pill')) return;
  const pill = document.createElement('span');
  pill.className = 'test-pill';
  pill.textContent = 'TEST';
  t.appendChild(pill);
}
function appShareUrl() {
  const u = new URL('./', location.href);
  if (/\/dev\/$/.test(u.pathname)) u.pathname = u.pathname.replace(/dev\/$/, '');
  u.hash = ''; u.search = '';
  return u.href;
}

function inviteQrSvg(url) {
  if (typeof qrcode !== 'function') return '';
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  return qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true, alt: 'QR code vers ' + url });
}

function openInviteSheet() {
  // 1.7.37 : QR code et adresse seulement. Le bouton « Partager le lien » est retiré : sous Firefox pour Android,
  // un partage abandonné restait en attente et bloquait ensuite les menus de choix et le choix de fichier.
  const url = appShareUrl();
  openSheet(`
    <h3 class="sheet-title small">Inviter quelqu'un</h3>
    <p class="sheet-text center">Scanne ce QR code avec l'appareil photo de son téléphone pour ouvrir l'application.</p>
    <div class="invite-qr">${inviteQrSvg(url)}</div>
    <p class="invite-link">${escapeHtml(url)}</p>
    <button type="button" class="btn btn-secondary" onclick="closeSheet()">Fermer</button>`);
}
