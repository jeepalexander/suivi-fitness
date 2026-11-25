// Copyright (c) 2026 Jean-Philippe Alexander. Mon Carnet de Salle.
// SPDX-License-Identifier: PolyForm-Strict-1.0.0 (voir LICENSE et NOTICE)
// Sauvegarde Google Drive (ancienne section 15b de app.js, co-auteur : Grok) — sorti de app.js tel quel en 1.8.90 (co-auteur : Claude), aucun changement de fonctionnement.
// Chargé juste après app.js (index.html) ; fonctions et variables globales, comme dans app.js.

// ============================================================
// 15b. SAUVEGARDE GOOGLE DRIVE (co-auteur : Grok)
// ============================================================
let driveTokenClient = null;

function getDriveToken() {
  try {
    const raw = localStorage.getItem(DRIVE_TOKEN_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw);
    if (!t || !t.access_token) return null;
    // token still usable if expires in > 60 s
    if (t.expires_at && Date.now() > t.expires_at - 60000) return null;
    return t;
  } catch (e) { return null; }
}

function setDriveToken(tokenResponse) {
  const t = {
    access_token: tokenResponse.access_token,
    expires_at: Date.now() + (Number(tokenResponse.expires_in || 3600) * 1000)
  };
  localStorage.setItem(DRIVE_TOKEN_KEY, JSON.stringify(t));
  return t;
}

// Déconnexion voulue par l'utilisateur : tout est oublié (jeton, dossier, compte, souhait de sauvegarde).
function clearDriveToken() {
  localStorage.removeItem(DRIVE_TOKEN_KEY);
  localStorage.removeItem(DRIVE_FOLDER_ID_KEY);
  localStorage.removeItem(DRIVE_ACCOUNT_KEY);
  localStorage.removeItem(DRIVE_WANTED_KEY);
  localStorage.removeItem(DRIVE_ERROR_KEY);
  localStorage.removeItem(DRIVE_BACKUP_ID_KEY);
  localStorage.removeItem(DRIVE_LAST_HASH_KEY);
  localStorage.removeItem(DRIVE_LAST_BACKUP_KEY);
  localStorage.removeItem(DRIVE_CONFLICT_KEY);
}

// Raison courte d'une réponse d'erreur Google (« 403 accessNotConfigured »), pour l'afficher dans Réglages.
async function driveErrorText(res) {
  let reason = '';
  try {
    const e = (await res.json()).error;
    reason = (e && ((e.errors && e.errors[0] && e.errors[0].reason) || (e.details && e.details[0] && e.details[0].reason) || e.status)) || '';
  } catch (err) { /* corps illisible : on garde le code seul */ }
  return res.status + (reason ? ' ' + String(reason).slice(0, 60) : '');
}

// Empreinte légère (FNV-1a) des données : sert à savoir si elles ont changé depuis le dernier envoi.
function driveHash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16) + '.' + str.length;
}
function getDriveBackupId() {
  try { return localStorage.getItem(DRIVE_BACKUP_ID_KEY) || null; } catch (e) { return null; }
}
function setDriveBackupId(id) {
  try { if (id) localStorage.setItem(DRIVE_BACKUP_ID_KEY, id); else localStorage.removeItem(DRIVE_BACKUP_ID_KEY); } catch (e) { /* ignoré */ }
}
function getDriveConflict() {
  try {
    const c = JSON.parse(localStorage.getItem(DRIVE_CONFLICT_KEY) || 'null');
    return c && typeof c.id === 'string' ? c : null;
  } catch (e) { return null; }
}
function setDriveConflict(c) {
  try { if (c) localStorage.setItem(DRIVE_CONFLICT_KEY, JSON.stringify(c)); else localStorage.removeItem(DRIVE_CONFLICT_KEY); } catch (e) { /* ignoré */ }
}
function formatDriveDate(iso) {
  try {
    const d = new Date(iso);
    if (!iso || isNaN(d.getTime())) return '';
    return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch (e) { return ''; }
}
// Anciennes versions (1.6.0 à 1.6.11) : fichiers par séance, file d'attente, historique à envoyer.
// Tout est contenu dans les données de l'application : ces repères ne servent plus.
function cleanupLegacyDriveKeys() {
  ['h49_drive_queue', 'h49_drive_uploaded', 'h49_drive_files', 'h49_drive_history_todo'].forEach(k => {
    try { localStorage.removeItem(k); } catch (e) { /* ignoré */ }
  });
}

function getDriveError() {
  try { return localStorage.getItem(DRIVE_ERROR_KEY) || ''; } catch (e) { return ''; }
}
function setDriveError(text) {
  try { localStorage.setItem(DRIVE_ERROR_KEY, text); } catch (e) { /* ignoré */ }
}
function clearDriveError() {
  try { localStorage.removeItem(DRIVE_ERROR_KEY); } catch (e) { /* ignoré */ }
}

// Jeton expiré ou refusé par Google (il ne dure qu'environ 1 h) : on n'oublie que le jeton ;
// le compte, le dossier et le souhait de sauvegarde restent, pour renouveler le jeton tout seul.
function expireDriveToken() {
  localStorage.removeItem(DRIVE_TOKEN_KEY);
}

function isDriveWanted() {
  return localStorage.getItem(DRIVE_WANTED_KEY) === '1';
}

function isDriveConnected() {
  return !!getDriveToken();
}

// Compte Google connecté (adresse affichée dans Réglages). Stocké sur l'appareil seulement,
// jamais injecté en HTML (textContent) ; hors sauvegarde exportée.
function getDriveAccount() {
  try {
    const a = JSON.parse(localStorage.getItem(DRIVE_ACCOUNT_KEY) || 'null');
    if (a && typeof a.email === 'string' && a.email) return a;
  } catch (e) { /* ignoré */ }
  return null;
}

// Lecture de l'adresse du compte connecté, sans permission supplémentaire :
//  1) API Drive « about » ; 2) à défaut, propriétaire du dossier de sauvegarde créé par l'application.
// Si aucune des deux ne répond, la raison est affichée dans Réglages (driveAccountError).
let driveAccountError = '';
let driveAccountFetching = false;

async function fetchDriveAccount() {
  const t = getDriveToken();
  if (!t || driveAccountFetching) return;
  driveAccountFetching = true;
  const headers = { Authorization: 'Bearer ' + t.access_token };
  const reasons = [];
  let found = null;
  try {
    try {
      const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress)', { headers });
      if (res.ok) {
        const u = (await res.json()).user;
        if (u && typeof u.emailAddress === 'string' && u.emailAddress) found = { email: u.emailAddress, name: u.displayName };
        else reasons.push('about : sans adresse');
      } else reasons.push('about : ' + await driveErrorText(res));
    } catch (e) { reasons.push('about : réseau'); }

    if (!found) {
      try {
        const folderId = await ensureDriveFolder(t.access_token);
        const res = await fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(folderId) + '?fields=owners(displayName,emailAddress)', { headers });
        if (res.ok) {
          const o = ((await res.json()).owners || [])[0];
          if (o && typeof o.emailAddress === 'string' && o.emailAddress) found = { email: o.emailAddress, name: o.displayName };
          else reasons.push('dossier : sans adresse');
        } else reasons.push('dossier : ' + await driveErrorText(res));
      } catch (e) { reasons.push('dossier : ' + (e && e.driveReason ? e.driveReason : 'indisponible')); }
    }

    if (found) {
      localStorage.setItem(DRIVE_ACCOUNT_KEY, JSON.stringify({
        email: found.email,
        name: typeof found.name === 'string' ? found.name : ''
      }));
      driveAccountError = '';
    } else {
      driveAccountError = reasons.join(' ; ');
    }
  } finally {
    driveAccountFetching = false;
    updateDriveUI();
  }
}

// Test léger de l'accès à Drive (liste d'un seul fichier) : met à jour la raison d'erreur affichée,
// pour que le message disparaisse dès que le problème est réglé (nouvelle connexion, API activée...).
let driveProbing = false;
async function probeDriveAccess() {
  const t = getDriveToken();
  if (!t || driveProbing) return;
  driveProbing = true;
  try {
    const res = await fetch('https://www.googleapis.com/drive/v3/files?pageSize=1&fields=files(id)', {
      headers: { Authorization: 'Bearer ' + t.access_token }
    });
    if (res.ok) clearDriveError(); else setDriveError(await driveErrorText(res));
  } catch (e) { /* hors-ligne : on garde l'état précédent */ }
  finally { driveProbing = false; updateDriveUI(); }
}

// Statut Drive sur plusieurs lignes (texte seul, séparé par des retours à la ligne <br>).
function setDriveStatusLines(el, lines, live = false) {
  el.textContent = '';
  lines.forEach((t, i) => {
    if (i) el.appendChild(document.createElement('br'));
    if (i === 0 && live) {
      const head = document.createElement('span');
      head.className = 'drive-live';
      const dot = document.createElement('span');
      dot.className = 'prog-dot on';
      dot.setAttribute('aria-hidden', 'true');
      head.appendChild(dot);
      head.appendChild(document.createTextNode(t));
      el.appendChild(head);
    } else el.appendChild(document.createTextNode(t));
  });
}

function updateDriveUI() {
  const statusEl = document.getElementById('drive-status');
  const connectBtn = document.getElementById('drive-connect-btn');
  const disconnectBtn = document.getElementById('drive-disconnect-btn');
  const restoreBtn = document.getElementById('drive-restore-btn');
  const replaceBtn = document.getElementById('drive-replace-btn');
  if (!statusEl) return;
  const account = getDriveAccount();
  const conflict = getDriveConflict();
  const last = localStorage.getItem(DRIVE_LAST_BACKUP_KEY);
  let pendingText = '';
  if (driveSyncing) pendingText = ' · envoi en cours…';
  else if ((isDriveConnected() || isDriveWanted()) && !conflict && driveNeedsBackup()) pendingText = ' · modifications en attente d\'envoi';
  else if (last) pendingText = ' · dernière sauvegarde : ' + formatDriveDate(last);
  const driveError = getDriveError();
  // « Restaurer » n'apparaît dans les Réglages qu'en cas de conflit ; sinon on restaure depuis l'Historique
  // (bouton « Restaurer » : fenêtre « Restaurer une sauvegarde », Drive ou fichier).
  if (restoreBtn) restoreBtn.style.display = isDriveConnected() && conflict ? '' : 'none';
  if (!(isDriveConnected() || isDriveWanted())) hideDriveBackupList();
  if (replaceBtn) replaceBtn.style.display = 'none';
  if (isDriveConnected() && conflict) {
    // Une sauvegarde existe déjà sur le Drive et contient des séances que cet appareil n'a pas : on ne l'écrase pas.
    const empty = isDeviceEmpty();
    const detail = '(' + (conflict.sessions != null ? conflict.sessions + ' séances, ' : '') + 'modifiée le ' + (formatDriveDate(conflict.modified) || 'date inconnue') + ')';
    statusEl.textContent = (account ? 'Compte ' + account.email + ' : ' : '')
      + (empty ? 'cet appareil ne contient aucune séance, alors que ta sauvegarde Drive en contient ' + detail + ' : l\'envoi est suspendu pour ne rien effacer. '
               + 'Touche « Restaurer » pour les récupérer, ou « Effacer la sauvegarde Drive » pour la vider définitivement.'
               : 'une sauvegarde plus complète existe déjà sur ton Drive ' + detail + ' : l\'envoi est suspendu pour ne rien écraser. '
               + 'Touche « Restaurer » pour la récupérer, ou « Remplacer par cet appareil » pour la remplacer.');
    if (replaceBtn) { replaceBtn.textContent = empty ? 'Effacer définitivement la sauvegarde Drive' : 'Remplacer par cet appareil'; replaceBtn.classList.toggle('btn-danger-text', empty); }
    refreshDriveConflictDate();
    if (connectBtn) connectBtn.style.display = 'none';
    if (disconnectBtn) disconnectBtn.style.display = '';
    if (replaceBtn) replaceBtn.style.display = '';
  } else if (isDriveConnected() && driveError) {
    // Google refuse l'accès au dossier / à l'envoi : on ne prétend pas que la sauvegarde fonctionne.
    let hint = ' Touche « Déconnecter », puis reconnecte-toi ; si cela persiste, envoie ce message à Claude.';
    if (/accessNotConfigured|SERVICE_DISABLED/i.test(driveError)) {
      hint = ' L\'API Google Drive n\'est pas activée pour le projet Google de l\'application (Google Cloud, « API et services »).';
    } else if (/insufficient|SCOPE/i.test(driveError)) {
      hint = ' Autorisation Drive non accordée : touche « Déconnecter », puis reconnecte-toi en acceptant l\'accès à Drive.';
    }
    statusEl.textContent = (account ? 'Compte ' + account.email + ' : ' : '')
      + 'Google refuse l\'accès à Drive (' + driveError + ') — les séances ne sont pas sauvegardées.' + hint + pendingText;
    if (connectBtn) connectBtn.style.display = 'none';
    if (disconnectBtn) disconnectBtn.style.display = '';
  } else if (isDriveConnected()) {
    // Une information par ligne : état (avec la date de la dernière sauvegarde), compte.
    // 1.7.7 : « Sauvegarde automatique : date et heure » sur la première ligne, le compte dessous.
    let head = 'Sauvegarde automatique';
    if (driveSyncing) head += ' : envoi en cours…';
    else if (driveNeedsBackup()) head += ' : modifications en attente d\'envoi';
    else if (last && formatDriveDate(last)) head += ' : ' + formatDriveDate(last);
    const lines = [head];
    if (account) lines.push(account.email);
    else if (driveAccountError) lines.push('Adresse du compte indisponible (' + driveAccountError + ')');
    setDriveStatusLines(statusEl, lines, true);
    if (connectBtn) connectBtn.style.display = 'none';
    if (disconnectBtn) disconnectBtn.style.display = '';
  } else if (isDriveWanted()) {
    // Accès expiré (≈ 1 h) : renouvelé tout seul au prochain « Enregistrer la séance » (navigateur : fenêtre
    // silencieuse ; application installée : reconnexion automatique par redirection).
    statusEl.textContent = (driveRedirectError ? 'Connexion Google refusée (' + driveRedirectError + ') · ' : '')
      + (account ? 'Compte ' + account.email + ' : ' : '')
      + (isInstalledApp()
        ? 'accès Google expiré : reconnexion automatique à la prochaine séance enregistrée (ou touche « Reconnecter maintenant »)'
        : 'sauvegarde renouvelée automatiquement à la prochaine séance enregistrée') + pendingText;
    if (connectBtn) { connectBtn.style.display = ''; connectBtn.textContent = 'Reconnecter maintenant'; }
    if (disconnectBtn) disconnectBtn.style.display = '';
  } else {
    statusEl.textContent = (driveRedirectError ? 'Connexion Google refusée (' + driveRedirectError + ') · ' : '') + 'Non connecté';
    if (connectBtn) { connectBtn.style.display = ''; connectBtn.textContent = 'Connecter Google Drive'; }
    if (disconnectBtn) disconnectBtn.style.display = 'none';
  }
}

// Renouvelle le jeton Google (≈ 1 h de validité) sans que l'utilisateur ait à se reconnecter :
// « prompt: '' » + l'adresse déjà connue (« hint ») évitent l'écran de choix de compte. À appeler
// depuis un geste de l'utilisateur (ex. « Enregistrer la séance »), sinon le navigateur peut bloquer
// la petite fenêtre Google. Répond true si un jeton valide a été obtenu, false sinon (jamais d'alerte).
let driveRenewPending = null;
function renewDriveToken() {
  if (driveRenewPending) return driveRenewPending.promise;
  // Application installée (écran d'accueil) : la petite fenêtre Google ne peut pas rendre la main à
  // l'application. Pas de renouvellement silencieux possible : la séance reste en file d'attente et
  // Réglages propose « Reconnecter maintenant » (connexion par redirection, voir connectDriveByRedirect).
  if (isInstalledApp()) return Promise.resolve(false);
  if (!gisReady()) return loadGoogleIdentity().then((ok) => (ok ? renewDriveToken() : false)); // 1.7.65
  initDriveTokenClient();
  if (!driveTokenClient) return Promise.resolve(false);
  let resolveFn;
  const promise = new Promise((resolve) => { resolveFn = resolve; });
  const pending = {
    promise,
    finish(ok) {
      clearTimeout(pending.timer);
      if (driveRenewPending === pending) driveRenewPending = null;
      resolveFn(ok);
    }
  };
  pending.timer = setTimeout(() => pending.finish(false), 30000);
  driveRenewPending = pending;
  const account = getDriveAccount();
  const options = { prompt: '' };
  if (account) options.hint = account.email;
  try { driveTokenClient.requestAccessToken(options); } catch (e) { pending.finish(false); }
  return promise;
}

// 1.7.65 (co-auteur : Claude) : le script de connexion Google (Google Identity Services) n'est plus chargé à
// l'ouverture de chaque page, seulement quand le Google Drive sert : au lancement si l'usager l'a déjà connecté
// (navigateur), à l'ouverture de Réglages, de Sauvegarder / Restaurer, et à l'appui sur « Se connecter ».
// Un visiteur qui n'utilise pas le Drive (ou un robot d'exploration) ne charge rien de Google.
const GIS_SRC = 'https://accounts.google.com/gsi/client';
let gisPromise = null;
function gisReady() { return typeof google !== 'undefined' && !!(google.accounts && google.accounts.oauth2); }
function loadGoogleIdentity() {
  if (gisReady()) { initDriveTokenClient(); return Promise.resolve(true); }
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = GIS_SRC; s.async = true;
    s.onload = () => { initDriveTokenClient(); resolve(gisReady()); };
    s.onerror = () => { gisPromise = null; resolve(false); };
    document.head.appendChild(s);
  });
  return gisPromise;
}

function initDriveTokenClient() {
  if (!gisReady()) return;
  if (driveTokenClient) return;
  driveTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: DRIVE_SCOPE,
    callback: (resp) => {
      if (resp.error) {
        console.warn('Drive auth error', resp);
        if (driveRenewPending) { driveRenewPending.finish(false); updateDriveUI(); return; } // renouvellement silencieux : pas d'alerte
        appAlert('Connexion annulée', 'La connexion à Google Drive a été annulée ou a échoué.', 'cloud');
        return;
      }
      setDriveToken(resp);
      driveFullConnectNext = false;
      localStorage.setItem(DRIVE_WANTED_KEY, '1');
      updateDriveUI();
      if (!getDriveAccount()) fetchDriveAccount();
      probeDriveAccess();
      if (driveRenewPending) { driveRenewPending.finish(true); return; } // l'appelant envoie lui-même la file d'attente
      // accès obtenu : crée le dossier et envoie la sauvegarde complète si besoin
      syncDriveBackup();
      resumeProgramRestoreIfPending();
    },
    // Fenêtre Google bloquée ou fermée
    error_callback: (err) => {
      console.warn('Drive auth popup', err);
      if (driveRenewPending) { driveRenewPending.finish(false); updateDriveUI(); }
    }
  });
}

// --- Application installée sur l'écran d'accueil : connexion par redirection ---------------------
// Dans une application installée (affichage « plein écran »), la fenêtre de connexion de la
// bibliothèque Google s'ouvre dans un onglet séparé et reste sur une page blanche : elle ne peut pas
// renvoyer le résultat à l'application. On passe donc par une redirection : la page va chez Google
// puis revient avec le jeton dans l'adresse (« #access_token=... »), lu au démarrage.
// L'adresse de retour (driveRedirectUri) doit être déclarée dans Google Cloud (identifiant client OAuth,
// « URI de redirection autorisés »).
let driveRedirectError = '';

function isInstalledApp() {
  try {
    if (window.navigator.standalone === true) return true;
    return ['fullscreen', 'standalone', 'minimal-ui'].some(m => window.matchMedia('(display-mode: ' + m + ')').matches);
  } catch (e) { return false; }
}

function driveRedirectUri() {
  return location.origin + location.pathname.replace(/index\.html$/, '');
}

function connectDriveByRedirect() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const state = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  try { localStorage.setItem(DRIVE_OAUTH_STATE_KEY, state); }
  catch (e) { appAlert('Connexion impossible', "Le stockage de l'appareil est indisponible.", 'warn'); return; }
  const p = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: driveRedirectUri(),
    response_type: 'token',
    scope: DRIVE_SCOPE,
    include_granted_scopes: 'true',
    state: state
  });
  const account = getDriveAccount();
  if (account) p.set('login_hint', account.email);
  openGoogleAuth('https://accounts.google.com/o/oauth2/v2/auth?' + p.toString());
}

// Application installée sur Android : la page de connexion Google ouverte depuis l'application plein écran
// (onglet intégré) reste blanche. On l'ouvre donc dans le vrai Chrome (intent), qui renvoie vers l'application ;
// le jeton est mémorisé dans le stockage partagé et repris au retour dans l'application (voir storage / visibilitychange).
function isAndroid() { return /Android/i.test(navigator.userAgent || ''); }
function chromeIntentUrl(url) {
  return 'intent://' + url.replace(/^https:\/\//, '').split('#')[0]
    + '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' + encodeURIComponent(url) + ';end';
}
// L'application installée partage son stockage avec le navigateur qui l'a installée, et SEULEMENT avec lui :
// le jeton doit donc être obtenu dans ce même navigateur (1.6.34, co-auteur : Claude). Chrome : intent vers le vrai
// Chrome (inchangé). Firefox et les autres navigateurs : nouvel onglet de ce navigateur (un jeton obtenu dans Chrome
// resterait invisible pour une application installée avec Firefox).
function isChromeAndroid() {
  const ua = navigator.userAgent || '';
  return isAndroid() && /Chrome\//.test(ua) && !/SamsungBrowser|EdgA|OPR\/|YaBrowser|Firefox|; wv\)/.test(ua);
}
function openGoogleAuth(url) {
  if (!isInstalledApp() || !isAndroid()) { navigateTo(url); return; }
  if (isChromeAndroid()) { navigateTo(chromeIntentUrl(url)); return; }
  if (!openBrowserTab(url)) {
    // ouverture refusée (fenêtres bloquées, ex. reconnexion automatique sans appui) : rien n'est perdu
    showToast('Connexion Google non ouverte : touche « Reconnecter maintenant » dans Réglages.', 6000);
    updateDriveUI();
  }
}
function navigateTo(url) { location.assign(url); }
function openBrowserTab(url) {
  try {
    const w = window.open(url, '_blank');
    if (!w) return false;
    try { w.opener = null; } catch (e) { /* ignoré */ }
    return true;
  } catch (e) { return false; }
}

// Au démarrage : récupère le jeton renvoyé par Google dans l'adresse. Renvoie 'ok', 'error' ou null
// (rien à faire). L'adresse est nettoyée ; un retour dont le « state » ne correspond pas est ignoré.
function handleDriveRedirectReturn() {
  try {
    const h = location.hash;
    if (!h || h.length < 2) return null;
    const params = new URLSearchParams(h.slice(1));
    if (!params.has('access_token') && !params.has('error')) return null;
    history.replaceState(null, '', location.pathname + location.search);
    const expected = localStorage.getItem(DRIVE_OAUTH_STATE_KEY);
    if (!expected || params.get('state') !== expected) return null;
    localStorage.removeItem(DRIVE_OAUTH_STATE_KEY);
    if (params.get('error') || !params.get('access_token')) {
      driveRedirectError = params.get('error') || 'réponse vide';
      return 'error';
    }
    setDriveToken({ access_token: params.get('access_token'), expires_in: params.get('expires_in') });
    localStorage.setItem(DRIVE_WANTED_KEY, '1');
    clearDriveError();
    driveRedirectError = '';
    // Retour dans un onglet Chrome (et non dans l'application plein écran) : on l'indique, l'application reprendra le jeton.
    if (!isInstalledApp()) setTimeout(() => showToast('Connexion à Google Drive réussie ✅\nTu peux fermer cet onglet et revenir à l\'application plein écran.', 15000), 1200);
    return 'ok';
  } catch (e) { return null; }
}

// Application installée : même enchaînement que la reconnexion automatique après l'enregistrement d'une séance
// (connexion par redirection lancée ~0,4 s après l'appui), le seul qui reste dans l'application avec Firefox (1.7.4) :
// lancée directement depuis l'appui, la page Google s'ouvrait dans un onglet Firefox séparé et l'application ne
// récupérait pas l'accès.
const DRIVE_CONNECT_DELAY_MS = 400;
let driveFullConnectNext = false; // 1.7.39 : renouvellement silencieux déjà tenté sans succès
function connectGoogleDrive() {
  if (isInstalledApp()) { setTimeout(connectDriveByRedirect, DRIVE_CONNECT_DELAY_MS); return; }
  // 1.7.65 : script Google chargé à la demande (en général déjà préchargé à l'ouverture de Réglages)
  if (!gisReady()) { loadGoogleIdentity().then((ok) => { if (ok) connectGoogleDrive(); else appAlert('Google indisponible', 'La bibliothèque Google ne s\'est pas chargée. Vérifie ta connexion et réessaie.', 'cloud'); }); return; }
  initDriveTokenClient();
  if (!driveTokenClient) {
    appAlert('Google indisponible', 'La bibliothèque Google ne s\'est pas chargée. Vérifie ta connexion et réessaie.', 'cloud');
    return;
  }
  // 1.7.39 (co-auteur : Claude) : RECONNEXION (Drive déjà autorisé, accès expiré) = même mécanisme que
  // « Enregistrer la séance » : renouvellement silencieux (prompt '' + adresse connue). Avant, le bouton forçait
  // « prompt: 'consent' » : Google redemandait les autorisations dans un onglet Firefox qui finissait sur une
  // page blanche (Firefox ne se déclare pas toujours comme application installée). Si le renouvellement
  // silencieux échoue, l'appui suivant ouvre la connexion complète.
  const t = getDriveToken();
  if (!t && isDriveWanted() && !driveFullConnectNext) {
    renewDriveToken().then((ok) => {
      if (ok) {
        syncDriveBackup().then(updateDriveUI, updateDriveUI);
        resumeProgramRestoreIfPending();
        return;
      }
      driveFullConnectNext = true;
      updateDriveUI();
      showToast('Reconnexion automatique impossible : touche à nouveau « Reconnecter maintenant ».', 6000);
    });
    return;
  }
  driveFullConnectNext = false;
  // première connexion (ou échec du renouvellement silencieux) : écran d'autorisation Google
  driveTokenClient.requestAccessToken({ prompt: t ? '' : 'consent' });
}

function disconnectGoogleDrive() {
  const t = getDriveToken();
  if (t && t.access_token) {
    // 1.7.65 : le script Google peut ne pas être chargé ; on le charge pour révoquer l'accès
    loadGoogleIdentity().then((ok) => { if (ok) { try { google.accounts.oauth2.revoke(t.access_token, () => {}); } catch (e) { /* ignoré */ } } });
  }
  clearDriveToken();
  updateDriveUI();
}

// Erreur de dossier Drive : la raison de Google est mémorisée (affichée dans Réglages) et jointe à l'erreur.
async function driveFolderError(message, res) {
  const reason = await driveErrorText(res);
  setDriveError(reason);
  const err = new Error(message + ' (' + reason + ')');
  err.driveReason = reason;
  return err;
}

// Une seule recherche / création de dossier à la fois (évite deux dossiers créés en parallèle).
let driveFolderLock = null;
function ensureDriveFolder(accessToken) {
  if (!driveFolderLock) {
    driveFolderLock = ensureDriveFolderOnce(accessToken).finally(() => { driveFolderLock = null; });
  }
  return driveFolderLock;
}

// Renomme le dossier de l'application en « MON CARNET DE SALLE » (une fois par dossier et par appareil).
// Jamais bloquant : en cas d'échec, les sauvegardes continuent dans le dossier tel qu'il est.
async function renameDriveFolderIfNeeded(accessToken, folderId, currentName) {
  try {
    if (!folderId || currentName === DRIVE_FOLDER_NAME || localStorage.getItem(DRIVE_FOLDER_RENAMED_KEY) === folderId) return;
    const res = await fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(folderId) + '?fields=id,name', {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: DRIVE_FOLDER_NAME })
    });
    if (res.ok) localStorage.setItem(DRIVE_FOLDER_RENAMED_KEY, folderId);
    else console.warn('Drive : renommage du dossier impossible', res.status);
  } catch (e) { console.warn('Drive : renommage du dossier impossible', e); }
}

async function ensureDriveFolderOnce(accessToken) {
  let folderId = localStorage.getItem(DRIVE_FOLDER_ID_KEY);
  if (folderId) { await renameDriveFolderIfNeeded(accessToken, folderId); return folderId; }

  // Search existing folder (nouveau nom ou ancien nom)
  const names = [DRIVE_FOLDER_NAME].concat(DRIVE_FOLDER_LEGACY_NAMES).map(n => `name='${n}'`).join(' or ');
  const q = encodeURIComponent(`(${names}) and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const search = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
    headers: { Authorization: 'Bearer ' + accessToken }
  });
  if (!search.ok) throw await driveFolderError('Recherche dossier Drive échouée', search);
  const data = await search.json();
  clearDriveError(); // Google a répondu : l'accès au dossier fonctionne
  if (data.files && data.files.length > 0) {
    const found = data.files.find(f => f.name === DRIVE_FOLDER_NAME) || data.files[0];
    folderId = found.id;
    localStorage.setItem(DRIVE_FOLDER_ID_KEY, folderId);
    await renameDriveFolderIfNeeded(accessToken, folderId, found.name);
    return folderId;
  }

  // Create folder
  const create = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: DRIVE_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder'
    })
  });
  if (!create.ok) throw await driveFolderError('Création dossier Drive échouée', create);
  const created = await create.json();
  folderId = created.id;
  localStorage.setItem(DRIVE_FOLDER_ID_KEY, folderId);
  localStorage.setItem(DRIVE_FOLDER_RENAMED_KEY, folderId);
  // Le dossier n'existait pas : il vient d'être créé vide, la sauvegarde complète doit y être (re)créée.
  localStorage.removeItem(DRIVE_BACKUP_ID_KEY);
  localStorage.removeItem(DRIVE_LAST_HASH_KEY);
  return folderId;
}

// --- Sauvegarde complète unique ------------------------------------------------------------------
// UN seul fichier, « sauvegarde_complete.json », contient tout l'état de l'application (historique,
// poids corporel, dernières charges) : c'est exactement le format du bouton « Restaurer » de l'Historique.
// Il est créé à la première connexion (avec tout l'historique déjà présent) puis mis à jour, jamais dupliqué,
// dès que les données changent. L'application retient l'empreinte des données envoyées : rien n'est renvoyé
// si rien n'a changé, et les modifications faites sans accès valide partent dès que l'accès revient.

// Versions (1.6.33) : le contenu et le format JSON ne changent pas ; seul le stockage change. Chaque envoi crée un
// nouveau fichier horodaté, puis seuls les DRIVE_BACKUP_KEEP plus récents sont gardés (l'ancien fichier unique
// « sauvegarde_complete.json » compte comme une version tant qu'il fait partie des plus récentes).

// Nom d'une nouvelle sauvegarde : fitness-backup-AAAA-MM-JJ-HH-MM-SS.json (heure de l'appareil).
function driveBackupFileName(date) {
  const d = date || new Date();
  const p = (n) => String(n).padStart(2, '0');
  return DRIVE_BACKUP_PREFIX + d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
    + '-' + p(d.getHours()) + '-' + p(d.getMinutes()) + '-' + p(d.getSeconds()) + '.json';
}

function isDriveBackupName(name) {
  return typeof name === 'string' && (name === DRIVE_BACKUP_NAME || DRIVE_BACKUP_NAME_RE.test(name));
}

// Toutes les sauvegardes du dossier, de la plus récente à la plus ancienne : [{ id, name, modifiedTime }].
// quiet : en cas d'échec, ne pas afficher d'erreur dans Réglages (nettoyage des anciennes versions).
async function listDriveBackups(accessToken, folderId, quiet) {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false and (name contains '${DRIVE_BACKUP_PREFIX}' or name='${DRIVE_BACKUP_NAME}')`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime,appProperties)&orderBy=modifiedTime%20desc&pageSize=100`, {
    headers: { Authorization: 'Bearer ' + accessToken }
  });
  if (!res.ok) {
    if (quiet) throw new Error('Recherche des sauvegardes Drive échouée (' + res.status + ')');
    throw await driveFolderError('Recherche de la sauvegarde Drive échouée', res);
  }
  const files = ((await res.json()).files || []).filter(f => f && typeof f.id === 'string' && isDriveBackupName(f.name));
  // 1.8.85 : nombre de séances noté dans les propriétés du fichier (sans toucher au JSON) ; absent des anciennes sauvegardes
  files.forEach(f => {
    const n = f.appProperties && /^\d+$/.test(String(f.appProperties.seances)) ? parseInt(f.appProperties.seances, 10) : null;
    f.sessions = n != null ? n : (driveSessionCounts.has(f.id) ? driveSessionCounts.get(f.id) : null);
  });
  const time = (f) => { const t = new Date(f.modifiedTime || 0).getTime(); return isNaN(t) ? 0 : t; };
  return files.sort((a, b) => time(b) - time(a) || String(b.name).localeCompare(String(a.name)));
}

// Nombres de séances déjà lus dans les anciennes sauvegardes (sans propriété « seances ») : id -> nombre.
const driveSessionCounts = new Map();

// Sauvegarde la plus récente du dossier ; null s'il n'y en a aucune.
async function findDriveBackup(accessToken, folderId) {
  return (await listDriveBackups(accessToken, folderId))[0] || null;
}

// Après un envoi réussi : met à la corbeille les sauvegardes au-delà des DRIVE_BACKUP_KEEP plus récentes.
// Un échec (liste ou suppression) est seulement noté dans la console : la sauvegarde principale reste réussie.
async function pruneDriveBackups(accessToken, folderId) {
  let files;
  try { files = await listDriveBackups(accessToken, folderId, true); }
  catch (e) { console.warn('Drive : liste des anciennes sauvegardes impossible', e); return; }
  for (const f of files.slice(DRIVE_BACKUP_KEEP)) {
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(f.id)}?fields=id`, {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ trashed: true })
      });
      if (!res.ok) console.warn('Drive : suppression de l\'ancienne sauvegarde ' + f.name + ' échouée (' + res.status + ')');
    } catch (e) {
      console.warn('Drive : suppression de l\'ancienne sauvegarde ' + f.name + ' échouée', e);
    }
  }
}

// Télécharge la sauvegarde : { ok, text, data } (data = null si le contenu n'est pas du JSON).
async function downloadDriveBackup(accessToken, fileId) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, {
    headers: { Authorization: 'Bearer ' + accessToken }
  });
  if (!res.ok) return { ok: false, status: res.status, text: '', data: null };
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch (e) { /* contenu illisible */ }
  return { ok: true, text, data };
}

// Vrai si la sauvegarde du Drive ne contient aucune séance absente de cet appareil (on peut alors l'écraser sans rien perdre).
// Séances supprimées volontairement dans l'historique et pas encore retirées de la sauvegarde Drive.
const DRIVE_DELETED_KEY = 'h49_drive_deleted_ids';
function getDeletedSessionIds() {
  try { const a = JSON.parse(localStorage.getItem(DRIVE_DELETED_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
}
function rememberDeletedSessionId(id) {
  try { const a = getDeletedSessionIds(); if (!a.includes(id)) a.push(id); localStorage.setItem(DRIVE_DELETED_KEY, JSON.stringify(a)); } catch (e) { /* ignoré */ }
}

function driveRemoteIsContainedInLocal(remote) {
  if (!remote || !Array.isArray(remote.history) || !state || !Array.isArray(state.history)) return false;
  const local = new Set(state.history.map(h => h && h.id));
  const deleted = new Set(getDeletedSessionIds()); // supprimées exprès : ce n'est pas un conflit, la sauvegarde doit les purger
  return remote.history.every(h => h && (local.has(h.id) || deleted.has(h.id)));
}

// Écrit la sauvegarde dans un NOUVEAU fichier horodaté (jamais d'écrasement) ; renvoie la réponse de Google.
let driveLastWrittenName = ''; // nom du dernier fichier écrit sur le Drive (message de « Sauvegarder »)
async function writeDriveBackup(accessToken, folderId, payload) {
  const metadata = { name: driveBackupFileName(), parents: [folderId], mimeType: 'application/json' };
  // 1.8.85 : nombre de séances en propriété du fichier, pour la liste « Restaurer une sauvegarde » (JSON inchangé)
  let n = null;
  try { const h = JSON.parse(payload).history; if (Array.isArray(h)) n = h.length; } catch (e) { /* ignoré */ }
  if (n != null) metadata.appProperties = { seances: String(n) };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([payload], { type: 'application/json' }));
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + accessToken },
    body: form
  });
  if (res.ok) {
    try { const f = await res.clone().json(); if (f && typeof f.id === 'string') setDriveBackupId(f.id); if (f && typeof f.name === 'string') driveLastWrittenName = f.name; } catch (e) { /* ignoré */ }
  }
  return res;
}

// Vrai si les données ont changé depuis le dernier envoi réussi (ou si aucun envoi n'a encore eu lieu).
function driveNeedsBackup() {
  if (!state) return false;
  return !getDriveBackupId() || driveHash(JSON.stringify(state)) !== localStorage.getItem(DRIVE_LAST_HASH_KEY);
}

let driveSyncing = false;
let driveForceOverwrite = false; // « Remplacer la sauvegarde Drive » : contourne la protection contre l'écrasement par des données vides
let driveSyncAgain = false;

// Envoie la sauvegarde complète si elle est à envoyer. Renvoie { ok } ou { reason } :
// 'no-token' (accès expiré), 'token' (refusé par Google), 'conflict', 'error', 'busy'.
async function syncDriveBackup(opts) {
  const force = !!(opts && opts.force); // 1.7.61 : « Sauvegarder › Sur Google Drive » envoie une nouvelle version même sans changement
  if (!state || !getDriveToken()) return { reason: 'no-token' };
  if (getDriveConflict()) return { reason: 'conflict' };
  if (!force && !driveNeedsBackup()) return { ok: true, unchanged: true };
  if (driveSyncing) { driveSyncAgain = true; return { reason: 'busy' }; }
  driveSyncing = true;
  updateDriveUI();
  try {
    const token = getDriveToken();
    const folderId = await ensureDriveFolder(token.access_token);
    const snapshot = JSON.stringify(state);
    const payload = JSON.stringify(state, null, 2);
    let fileId = getDriveBackupId();
    if (!fileId) {
      const found = await findDriveBackup(token.access_token, folderId);
      if (found) {
        // Une sauvegarde existe déjà sur le Drive sans que cet appareil l'ait écrite (réinstallation, autre
        // appareil...) : on ne l'écrase que si elle ne contient aucune séance de plus que cet appareil.
        const remote = await downloadDriveBackup(token.access_token, found.id);
        if (!remote.ok) {
          if (remote.status === 401) { expireDriveToken(); return { reason: 'token' }; }
          setDriveError(String(remote.status));
          return { reason: 'error' };
        }
        if (!driveRemoteIsContainedInLocal(remote.data)) {
          const n = remote.data && Array.isArray(remote.data.history) ? remote.data.history.length : null;
          setDriveConflict({ id: found.id, modified: found.modifiedTime || '', sessions: n });
          return { reason: 'conflict' };
        }
        fileId = found.id;
      }
    } else if (!driveForceOverwrite && state && Array.isArray(state.history) && state.history.length === 0) {
      // Protection : cet appareil n'a plus aucune séance (réinitialisation, données effacées). On n'envoie pas une
      // sauvegarde vide par-dessus la plus récente du Drive si elle en contient : l'utilisateur choisit de la
      // restaurer ou de la remplacer (sinon quelques envois vides chasseraient les bonnes versions).
      let latest = null;
      try { latest = await findDriveBackup(token.access_token, folderId); } catch (e) { latest = null; }
      const remote = latest ? await downloadDriveBackup(token.access_token, latest.id) : { ok: false };
      if (remote.ok && !driveRemoteIsContainedInLocal(remote.data)) {
        const n = remote.data && Array.isArray(remote.data.history) ? remote.data.history.length : null;
        setDriveConflict({ id: latest.id, modified: latest.modifiedTime || '', sessions: n });
        return { reason: 'conflict' };
      }
    }
    driveForceOverwrite = false;
    const res = await writeDriveBackup(token.access_token, folderId, payload);
    if (res.status === 401) { expireDriveToken(); return { reason: 'token' }; }
    if (!res.ok) { setDriveError(await driveErrorText(res)); return { reason: 'error' }; }
    clearDriveError();
    localStorage.setItem(DRIVE_LAST_HASH_KEY, driveHash(snapshot));
    localStorage.setItem(DRIVE_LAST_BACKUP_KEY, new Date().toISOString());
    try { localStorage.removeItem(DRIVE_DELETED_KEY); } catch (e) { /* ignoré */ }
    // Versions : ne garder que les plus récentes. Jamais bloquant : un échec est seulement noté dans la console.
    try { await pruneDriveBackups(token.access_token, folderId); } catch (e) { console.warn('Drive : nettoyage des anciennes sauvegardes impossible', e); }
    return { ok: true };
  } catch (e) {
    console.warn('Drive : envoi de la sauvegarde interrompu', e);
    return { reason: 'error', error: e };
  } finally {
    driveSyncing = false;
    updateDriveUI();
    if (driveSyncAgain) { driveSyncAgain = false; setTimeout(syncDriveBackup, 0); }
  }
}

// Envoi différé après toute modification des données (saveState) : sans effet si l'accès a expiré.
let driveSyncTimer = null;
function scheduleDriveSync() {
  if (!getDriveToken()) return;
  clearTimeout(driveSyncTimer);
  driveSyncTimer = setTimeout(syncDriveBackup, 1500);
}

// Conflit : la sauvegarde du Drive contient des séances absentes de cet appareil. L'utilisateur choisit de
// la remplacer par les données de cet appareil (ce bouton) ou de la restaurer (restoreFromDrive).
function isDeviceEmpty() { return !!state && Array.isArray(state.history) && state.history.length === 0; }

// Conflit enregistré sans date (versions antérieures) : on la lit une fois sur le Drive.
let driveConflictDateAsked = false;
async function refreshDriveConflictDate() {
  const c = getDriveConflict(), token = getDriveToken();
  if (!c || c.modified || !token || driveConflictDateAsked) return;
  driveConflictDateAsked = true;
  try {
    const folderId = await ensureDriveFolder(token.access_token);
    const f = await findDriveBackup(token.access_token, folderId);
    if (f && f.modifiedTime && getDriveConflict()) { setDriveConflict({ ...getDriveConflict(), modified: f.modifiedTime }); updateDriveUI(); }
  } catch (e) { /* date facultative */ }
}

async function replaceDriveBackupWithThisDevice() {
  const c = getDriveConflict();
  if (!c) return;
  const when = formatDriveDate(c.modified) || 'date inconnue';
  const what = '(' + (c.sessions != null ? c.sessions + ' séances, ' : '') + 'modifiée le ' + when + ')';
  const ok = isDeviceEmpty()
    ? await askSheet({ tone: 'danger', danger: true, title: 'Effacer la sauvegarde Drive ?',
        text: 'La sauvegarde ' + what + ' sera vidée : cet appareil ne contient aucune séance. Ses séances seront perdues (irréversible depuis l\'application).', ok: 'Effacer', cancel: 'Annuler' })
    : await askSheet({ tone: 'danger', danger: true, title: 'Remplacer la sauvegarde Drive ?',
        text: 'La sauvegarde ' + what + ' sera remplacée par les données de cet appareil. Les séances qu\'elle seule contient seront perdues.', ok: 'Remplacer', cancel: 'Annuler' });
  if (!ok) return;
  setDriveBackupId(c.id);
  setDriveConflict(null);
  localStorage.removeItem(DRIVE_LAST_HASH_KEY);
  driveForceOverwrite = true;
  syncDriveBackup();
}

// Date et heure complètes d'une sauvegarde (liste de restauration) : « 07/11/2026 à 15:47:12 ».
function formatDriveBackupDate(iso) {
  try {
    const d = new Date(iso);
    if (!iso || isNaN(d.getTime())) return 'date inconnue';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch (e) { return 'date inconnue'; }
}

// Fenêtre de restauration : « Aujourd'hui à 18:42:00 », « Hier à 19:15:00 », sinon « 05/11/2026 à 19:15:00 »
function formatBackupDayLabel(iso, now = new Date()) {
  const d = new Date(iso);
  if (!iso || isNaN(d.getTime())) return 'date inconnue';
  const dayKey = x => x.getFullYear() * 10000 + (x.getMonth() + 1) * 100 + x.getDate();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  if (dayKey(d) === dayKey(now)) return "Aujourd'hui à " + time;
  if (dayKey(d) === dayKey(yesterday)) return 'Hier à ' + time;
  return formatDriveBackupDate(iso);
}

// --- Fenêtre « Restaurer une sauvegarde » (Historique, et Réglages en cas de conflit) ---------------------
// Les 5 dernières sauvegardes Google Drive (si connecté) et un fichier de cet appareil ; un seul choix.
// Rien n'est remplacé avant la confirmation de restoreDriveBackup / le choix du fichier.
let backupRestore = null; // { files: [...] | null (chargement), error, sel: index (0..n-1 Drive, -2 fichier, -1 rien) }

function hideDriveBackupList() {
  if (backupRestore) { backupRestore = null; closeSheet(); }
}

function backupRestoreRow(i, title, sub, drive) {
  const on = backupRestore.sel === i;
  const ico = drive ? CLOUD_SVG : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';
  return `
    <button type="button" role="radio" aria-checked="${on}" class="restore-item backup-item${on ? ' on' : ''}${drive ? ' drive' : ' file'}" data-i="${i}" onclick="pickBackupRestore(${i})">
      <span class="mem-ico${drive ? '' : ' grid'}">${ico}</span>
      <span class="restore-text"><span class="restore-name"><b>${escapeHtml(title)}</b></span><span class="restore-when">${escapeHtml(sub)}</span></span>
      <span class="restore-box round">${on ? CHECK_SVG : ''}</span>
    </button>`;
}

// Sous-titre d'une sauvegarde Drive : son nombre de séances (1.8.85).
function backupSessionsLabel(f) {
  if (f.sessions === undefined || f.sessions === null) return f.sessionsError ? 'Nombre de séances inconnu' : 'Comptage des séances…';
  if (f.sessions === 0) return 'Aucune séance';
  return f.sessions + ' séance' + (f.sessions > 1 ? 's' : '');
}

// Anciennes sauvegardes sans propriété « seances » : on les lit (en parallèle) pour compter leurs séances.
async function countMissingBackupSessions(token, files) {
  await Promise.all(files.filter(f => f.sessions == null).map(async f => {
    try {
      const dl = await downloadDriveBackup(token, f.id);
      if (dl.ok && dl.data && Array.isArray(dl.data.history)) { f.sessions = dl.data.history.length; driveSessionCounts.set(f.id, f.sessions); }
      else f.sessionsError = true;
    } catch (e) { f.sessionsError = true; }
  }));
}

function renderBackupRestoreSheet() {
  if (!backupRestore) return;
  const st = backupRestore;
  let drive = '';
  if (getDriveToken()) {
    drive = `<div class="sheet-section">Google Drive · ${DRIVE_BACKUP_KEEP} dernières</div>`;
    if (st.files === null) drive += `<p class="sheet-text">Recherche de tes sauvegardes…</p>`;
    else if (st.error) drive += `<p class="sheet-text">${escapeHtml(st.error)}</p>`;
    else if (!st.files.length) drive += `<p class="sheet-text">Aucune sauvegarde dans le dossier « ${escapeHtml(DRIVE_FOLDER_NAME)} » de ton Drive.</p>`;
    else drive += `<div class="restore-list" role="radiogroup" aria-label="Sauvegardes Google Drive">` + st.files.map((f, i) =>
      backupRestoreRow(i, formatBackupDayLabel(f.modifiedTime), backupSessionsLabel(f), true)).join('') + `</div>`;
  }
  const file = `<div class="sheet-section">Sur cet appareil</div><div class="restore-list">${backupRestoreRow(-2, 'Choisir un fichier…', 'Fichier créé avec « Sauvegarder »', false)}</div>`;
  const connect = getDriveToken() ? '' : `<p class="sheet-text small">Tes sauvegardes Google Drive apparaîtront ici. <button type="button" class="link-btn" onclick="closeSheet(); backupRestore = null; connectGoogleDrive()">${isDriveWanted() ? 'Reconnecter Google Drive' : 'Se connecter à Google Drive'}</button></p>`;
  const action = st.sel === -1 ? '' : `<button type="button" class="btn" id="backup-restore-go" onclick="confirmBackupRestore()">${st.sel === -2 ? 'Choisir le fichier' : 'Restaurer cette sauvegarde'}</button>`;
  openSheet(`
    <h3 class="sheet-title">Restaurer une sauvegarde</h3>
    <p class="sheet-text">Choisis la sauvegarde à reprendre. Elle remplacera toutes les données de cet appareil : <b>séances, programmes et pesées</b>.</p>
    <div class="backup-scroll">${drive}${file}${connect}</div>
    <div class="sheet-actions">${action}<button type="button" class="btn btn-secondary" onclick="hideDriveBackupList()">Annuler</button></div>`,
    { update: true, onClose: () => { backupRestore = null; } });
}

function pickBackupRestore(i) {
  if (!backupRestore) return;
  backupRestore.sel = backupRestore.sel === i ? -1 : i;
  renderBackupRestoreSheet();
}

function confirmBackupRestore() {
  if (!backupRestore) return;
  const st = backupRestore;
  if (st.sel === -2) {
    hideDriveBackupList();
    const input = document.getElementById('import-file');
    if (input) input.click();
    return;
  }
  const f = st.files && st.files[st.sel];
  hideDriveBackupList();
  if (f) restoreDriveBackup(f);
}

// Ouvre la fenêtre ; avec Google Drive connecté, la liste des sauvegardes se charge dedans
async function restoreFromDrive() {
  backupRestore = { files: getDriveToken() ? null : [], error: '', sel: -1 };
  renderBackupRestoreSheet();
  const token = getDriveToken();
  if (!token) return;
  try {
    const folderId = await ensureDriveFolder(token.access_token);
    const files = (await listDriveBackups(token.access_token, folderId)).slice(0, DRIVE_BACKUP_KEEP);
    if (!backupRestore) return;
    backupRestore.files = files;
    if (files.length) backupRestore.sel = 0; // la plus récente proposée par défaut
  } catch (e) {
    if (!backupRestore) return;
    backupRestore.files = [];
    backupRestore.error = 'Sauvegardes Drive indisponibles : ' + (e && e.message ? e.message : 'erreur réseau') + '.';
  }
  renderBackupRestoreSheet();
  const st = backupRestore;
  if (st && st.files && st.files.some(f => f.sessions == null)) {
    await countMissingBackupSessions(token.access_token, st.files);
    if (backupRestore === st) renderBackupRestoreSheet();
  }
}
function openBackupRestore() { loadGoogleIdentity(); restoreFromDrive(); }

// Restaure les données depuis une sauvegarde du Drive (n'importe laquelle de la liste), par le même chemin que
// le bouton « Restaurer » de l'Historique (importData, avec l'assainissement de security.js).
async function restoreDriveBackup(file) {
  const token = getDriveToken();
  if (!token) {
    appAlert('Google Drive', isInstalledApp() ? 'Accès Google expiré : touche d\'abord « Reconnecter maintenant ».' : 'Connecte-toi d\'abord à Google Drive.', 'cloud');
    return;
  }
  if (!file || typeof file.id !== 'string') return;
  try {
    const dl = await downloadDriveBackup(token.access_token, file.id);
    if (!dl.ok && dl.status === 404) {
      appAlert('Sauvegarde introuvable', 'Cette sauvegarde n\'existe plus sur le Drive : la liste a été mise à jour, rien n\'a été modifié.', 'warn');
      restoreFromDrive();
      return;
    }
    if (!dl.ok || !dl.data || !Array.isArray(dl.data.history)) {
      appAlert('Restauration impossible', 'La sauvegarde Drive est illisible ou invalide : rien n\'a été modifié.', 'warn');
      return;
    }
    const when = formatDriveBackupDate(file.modifiedTime);
    const n = dl.data.history.length;
    if (n === 0) {
      appAlert('Sauvegarde vide', 'La sauvegarde Drive du ' + when + ' ne contient aucune séance : rien à restaurer, tes données n\'ont pas été modifiées.\n\nSi tu as un fichier de sauvegarde manuel, utilise « Restaurer » dans l\'Historique.', 'cloud');
      return;
    }
    const local = state && Array.isArray(state.history) ? state.history.length : 0;
    if (!await askSheet({ tone: 'cloud', title: 'Restaurer la sauvegarde du ' + when + ' ?',
      text: 'Elle contient ' + n + ' séance' + (n > 1 ? 's' : '') + ' et remplace les données de cet appareil (' + local + ' séance' + (local > 1 ? 's' : '') + ').',
      ok: 'Restaurer', cancel: 'Annuler' })) return;
    setDriveBackupId(file.id);
    setDriveConflict(null);
    const f = new File([dl.text], file.name || DRIVE_BACKUP_NAME, { type: 'application/json' });
    await window.importData({ target: { files: [f], value: '' } });
    hideDriveBackupList();
    updateDriveUI();
  } catch (e) {
    appAlert('Restauration impossible', 'Restauration impossible : ' + (e && e.message ? e.message : 'erreur réseau') + '.', 'warn');
  }
}

// Ligne ajoutée au message « Séance enregistrée » quand l'accès Google a expiré dans l'application
// installée : la reconnexion se lance toute seule juste après (voir backupToDrive).
function driveSaveNotice(afterOk) {
  if (isDriveWanted() && !getDriveToken() && isInstalledApp()) {
    return afterOk ? '\n• Google Drive : accès expiré, reconnexion automatique après « OK »'
      : '\n• Google Drive : accès expiré, reconnexion automatique…';
  }
  return '';
}

// Dernière reconnexion automatique (redirection) : au plus une toutes les 2 minutes, pour ne jamais
// enchaîner les allers-retours chez Google si quelque chose échoue.
const DRIVE_AUTO_RECONNECT_KEY = 'h49_drive_auto_reconnect';
function autoReconnectDriveIfNeeded(force) {
  if (!isInstalledApp() || !isDriveWanted() || getDriveToken()) return false;
  try {
    const last = Number(localStorage.getItem(DRIVE_AUTO_RECONNECT_KEY) || 0);
    if (!force && Date.now() - last < 120000) return false;
    localStorage.setItem(DRIVE_AUTO_RECONNECT_KEY, String(Date.now()));
  } catch (e) { return false; }
  // petit délai : la page a fini d'afficher la confirmation de la séance avant de partir chez Google
  setTimeout(connectDriveByRedirect, DRIVE_CONNECT_DELAY_MS);
  return true;
}

// Appelée par « Enregistrer la séance » / « Enregistrer les modifications » (geste de l'utilisateur) :
// envoie tout de suite la sauvegarde complète. Accès expiré : dans le navigateur il est renouvelé en
// silence par la fenêtre Google ; dans l'application installée (pas de renouvellement silencieux possible)
// l'application se reconnecte toute seule par redirection et la sauvegarde part au retour.
// 1.7.11 : la reconnexion automatique (qui quitte l'application, et ouvre le navigateur avec Firefox) est
// réservée à l'enregistrement d'une séance. Programmes (création, modification, activation, suppression) :
// { autoReconnect: false } — la sauvegarde reste en attente et part avec la prochaine séance enregistrée
// (ou « Reconnecter maintenant » dans Réglages).
// 1.8.50 : renvoie 'none' (pas de Drive), 'ok', 'redirect' (reconnexion partie chez Google) ou 'fail' ;
// { forceReconnect } (fin de séance) passe outre le délai de 2 min entre deux reconnexions automatiques,
// { historyId } garde la séance à marquer dans l'Historique au retour de Google.
async function backupToDrive(opts) {
  const autoReconnect = !(opts && opts.autoReconnect === false);
  const force = !!(opts && opts.forceReconnect);
  const reconnect = () => {
    if (!autoReconnect) return 'fail';
    if (!autoReconnectDriveIfNeeded(force)) return 'fail';
    if (opts && opts.historyId != null) { try { localStorage.setItem(HIST_SAVE_MARK_KEY, JSON.stringify({ id: opts.historyId, t: Date.now() })); } catch (e) { /* ignoré */ } }
    return 'redirect';
  };
  try {
    if (!isDriveWanted() && !getDriveToken()) return 'none'; // Drive n'a jamais été connecté : rien à faire
    let token = getDriveToken();
    // 1.7.26 : pas de fenêtre Google non plus pour les programmes — le renouvellement passe par une fenêtre
    // qui, avec Firefox (même installé, Firefox ne se déclare pas toujours comme application), ouvre le navigateur.
    if (!token && autoReconnect && await renewDriveToken()) token = getDriveToken();
    if (!token) { updateDriveUI(); return reconnect(); }
    let r = await syncDriveBackup();
    if (r && r.reason === 'busy') { // un envoi est déjà en cours : on attend sa fin
      for (let i = 0; i < 60 && driveSyncing; i++) await new Promise(res => setTimeout(res, 250));
      r = driveNeedsBackup() ? await syncDriveBackup() : { ok: true };
    }
    updateDriveUI();
    if (r && r.reason === 'token') return reconnect();
    return r && r.ok ? 'ok' : 'fail';
  } catch (e) { return 'fail'; /* ne jamais gêner l'enregistrement */ }
}
