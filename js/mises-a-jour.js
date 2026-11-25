// Copyright (c) 2026 Jean-Philippe Alexander. Mon Carnet de Salle.
// SPDX-License-Identifier: PolyForm-Strict-1.0.0 (voir LICENSE et NOTICE)
// Mises à jour de l'application (ancienne section 16 de app.js) — sorti de app.js tel quel en 1.8.90 (co-auteur : Claude), aucun changement de fonctionnement.
// Chargé juste après app.js (index.html) ; fonctions et variables globales, comme dans app.js.

// ============================================================
// 16. MISES À JOUR DE L'APPLICATION
// ============================================================
// Le service worker (sw.js) installe et active tout seul une nouvelle version, mais la page déjà
// ouverte continue d'exécuter l'ancien code jusqu'au prochain lancement : on ne la recharge JAMAIS
// automatiquement (la saisie en cours serait perdue). À la place, sw.js prévient la page
// (message SW_ACTIVATED) ; si sa version diffère de celle exécutée, la page Réglages affiche
// « nouvelle version prête » (+ un point sur son icône) et un bouton pour relancer quand on veut.
function isUpdateReady() {
  return !!(runningVersion && activeVersion && activeVersion !== runningVersion);
}

function renderUpdateStatus() {
  const ready = isUpdateReady();
  const versionEl = document.getElementById('update-version');
  if (versionEl) versionEl.textContent = runningVersion ? `Version ${runningVersion}` : 'Version …';
  const banner = document.getElementById('update-banner');
  if (banner) banner.hidden = true; // 1.8.19 : plus de bandeau « La version … est prête » ; le statut porte la version
  // 1.8.17 : quand une version est prête, « Vérifier » devient « Installer » (jaune) et relance l'app
  const checkBtn = document.querySelector('.update-check');
  if (checkBtn) {
    checkBtn.classList.toggle('install', ready);
    checkBtn.textContent = ready ? 'Installer' : 'Vérifier';
    checkBtn.onclick = ready ? applyUpdate : checkForUpdate;
  }
  const bannerText = document.getElementById('update-banner-text');
  if (bannerText && ready) bannerText.textContent = `La version ${activeVersion} est prête. Touche « Installer » pour l'utiliser.`;
  const statusEl = document.getElementById('update-status');
  if (statusEl && ready) statusEl.textContent = `Mise à jour téléchargée : version ${activeVersion}`; // 1.8.19
  const nav = document.getElementById('nav-historique');
  if (nav) {
    nav.classList.toggle('has-update', ready);
    nav.setAttribute('aria-label', ready ? 'Historique, mise à jour disponible' : 'Historique');
  }
  // La pastille suit aussi le bouton Réglages (là où se trouve l'avis)
  const gear = document.getElementById('settings-btn');
  if (gear) {
    gear.classList.toggle('has-update', ready);
    gear.setAttribute('aria-label', ready ? 'Réglages, mise à jour disponible' : 'Réglages');
  }
}

function setUpdateStatusText(text) {
  const statusEl = document.getElementById('update-status');
  if (statusEl && !isUpdateReady()) statusEl.textContent = text;
}

function onServiceWorkerMessage(event) {
  const d = event.data;
  if (!d || d.type !== 'SW_ACTIVATED' || typeof d.version !== 'string') return;
  activeVersion = d.version;
  renderUpdateStatus();
}

// Bouton « Vérifier » : cherche une nouvelle version maintenant
async function checkForUpdate() {
  if (!('serviceWorker' in navigator)) {
    setUpdateStatusText('Mises à jour automatiques indisponibles sur ce navigateur.');
    return;
  }
  setUpdateStatusText('Vérification…');
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) { setUpdateStatusText('Mode hors-ligne pas encore installé : relancez l\'application.'); return; }
    lastUpdateCheck = Date.now();
    await reg.update();
    if (reg.installing || reg.waiting) {
      setUpdateStatusText('Téléchargement de la mise à jour…'); // SW_ACTIVATED suivra
    } else {
      const t = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      setUpdateStatusText(`À jour · vérifié à ${t}`);
    }
  } catch (e) {
    const errorMsg = e.message ? e.message : (e.name ? e.name : 'erreur inconnue');
    console.error('checkForUpdate error:', e);
    setUpdateStatusText('Vérification impossible : ' + errorMsg);
  }
}

// Bouton « Relancer maintenant » : la saisie en cours est d'abord enregistrée dans le brouillon
function applyUpdate() {
  try { saveDraft(); saveWeightDraft(); } catch (e) {}
  location.reload();
}

// Vérification silencieuse quand l'application revient au premier plan (au plus toutes les 30 min)
function initUpdateIndicator() {
  renderUpdateStatus();
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.addEventListener('message', onServiceWorkerMessage);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || Date.now() - lastUpdateCheck < UPDATE_CHECK_MIN_INTERVAL_MS) return;
    lastUpdateCheck = Date.now();
    navigator.serviceWorker.getRegistration().then(reg => reg && reg.update()).catch(() => {});
  });
}
