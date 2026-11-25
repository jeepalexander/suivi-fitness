// Copyright (c) 2026 Jean-Philippe Alexander. Mon Carnet de Salle.
// SPDX-License-Identifier: PolyForm-Strict-1.0.0 (voir LICENSE et NOTICE)
// Sauvegarde, import et réinitialisation (ancienne section 15 de app.js) — sorti de app.js tel quel en 1.8.90 (co-auteur : Claude), aucun changement de fonctionnement.
// Chargé juste après app.js (index.html) ; fonctions et variables globales, comme dans app.js.

// ============================================================
// 15. SAUVEGARDE, IMPORT ET RÉINITIALISATION
// ============================================================
// 1.7.60 (co-auteur : Claude) : sur Chrome Android, le partage de fichiers n'accepte pas les .json
// (canShare répond non) : la sauvegarde part en téléchargement, sans aucun signe à l'écran. On le dit
// maintenant par un message ; un partage refusé ou impossible retombe aussi sur le téléchargement.
// 1.7.61 : même nom que les sauvegardes du Drive (fitness-backup-AAAA-MM-JJ-HH-MM-SS.json)
function backupFileName() { return driveBackupFileName(); }

// 1.7.61 (co-auteur : Claude) : « Sauvegarder » demande où enregistrer. Sur Google Drive : une nouvelle version
// tout de suite, même sans changement ; sur ce téléphone : le fichier, au même nom que sur le Drive.
let backupSave = null; // { sel: 'drive' | 'file' }
function backupSaveRow(key, title, sub, drive) {
  const on = backupSave.sel === key;
  const ico = drive ? CLOUD_SVG : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';
  return `
    <button type="button" role="radio" aria-checked="${on}" class="restore-item backup-item${on ? ' on' : ''}${drive ? ' drive' : ' file'}" data-k="${key}" onclick="pickBackupSave('${key}')">
      <span class="mem-ico${drive ? '' : ' grid'}">${ico}</span>
      <span class="restore-text"><span class="restore-name"><b>${escapeHtml(title)}</b></span><span class="restore-when">${escapeHtml(sub)}</span></span>
      <span class="restore-box round">${on ? CHECK_SVG : ''}</span>
    </button>`;
}
function renderBackupSaveSheet() {
  if (!backupSave) return;
  const wanted = isDriveWanted(), token = !!getDriveToken();
  const rows = [];
  if (token || wanted) rows.push(backupSaveRow('drive', 'Sur Google Drive', `Nouvelle version maintenant, dans « ${DRIVE_FOLDER_NAME} »`, true));
  rows.push(backupSaveRow('file', 'Sur ce téléphone', 'Fichier dans le dossier Téléchargements', false));
  const connect = (token || wanted) ? '' : `<p class="sheet-text small">Pour sauvegarder aussi sur ton Drive : <button type="button" class="link-btn" onclick="closeSheet(); backupSave = null; connectGoogleDrive()">Se connecter à Google Drive</button></p>`;
  const go = backupSave.sel === 'drive' ? 'Sauvegarder sur le Drive' : 'Télécharger le fichier';
  openSheet(`
    <h3 class="sheet-title">Sauvegarder</h3>
    <p class="sheet-text">Choisis où enregistrer toutes tes données : séances, programmes et pesées.</p>
    <div class="backup-scroll"><div class="restore-list" role="radiogroup" aria-label="Où sauvegarder">${rows.join('')}</div>${connect}</div>
    <div class="sheet-actions"><button type="button" class="btn" id="backup-save-go" onclick="confirmBackupSave()">${go}</button><button type="button" class="btn btn-secondary" onclick="closeSheet()">Annuler</button></div>`,
    { update: true, onClose: () => { backupSave = null; } });
}
function openBackupSave() {
  loadGoogleIdentity(); // 1.7.65 : préchargé pour une éventuelle reconnexion
  backupSave = { sel: (getDriveToken() || isDriveWanted()) ? 'drive' : 'file' };
  renderBackupSaveSheet();
}
function pickBackupSave(k) { if (!backupSave) return; backupSave.sel = k; renderBackupSaveSheet(); }
function confirmBackupSave() {
  if (!backupSave) return;
  const sel = backupSave.sel;
  backupSave = null;
  closeSheet();
  if (sel === 'drive') saveBackupToDriveNow(); else exportData();
}
// 1.7.62 : accès expiré dans l'application installée → reconnexion forcée, comme à l'enregistrement d'une séance ;
// la nouvelle version part au retour de Google (demande gardée 10 min dans DRIVE_FORCE_PENDING_KEY).
const DRIVE_FORCE_PENDING_KEY = 'h49_drive_force_pending';
function consumeDriveForcePending() {
  let t = 0;
  try { t = Number(localStorage.getItem(DRIVE_FORCE_PENDING_KEY) || 0); localStorage.removeItem(DRIVE_FORCE_PENDING_KEY); } catch (e) { return false; }
  return t > 0 && Date.now() - t < 600000;
}
// 1.8.23 : onglet où l'on revient après la connexion Google (lu sans consommer les demandes en attente)
function driveReturnTab(driveReturn) {
  try {
    if (getDriveToken()) {
      const t = Number(localStorage.getItem(DRIVE_FORCE_PENDING_KEY) || 0);
      if (t > 0 && Date.now() - t < 600000) return 'historique';
      if (peekHistorySaveMark()) return 'historique'; // 1.8.50 : reconnexion partie de la fin d'une séance
      if (driveReturn === 'ok' && typeof PROGRAM_RESTORE_PENDING_KEY !== 'undefined' && localStorage.getItem(PROGRAM_RESTORE_PENDING_KEY) === '1') return 'programme';
    }
  } catch (e) { /* ignoré */ }
  return 'reglages';
}
// Au démarrage ou au retour dans l'application : la sauvegarde demandée avant la reconnexion, sinon l'envoi habituel
function peekHistorySaveMark() {
  try {
    const m = JSON.parse(localStorage.getItem(HIST_SAVE_MARK_KEY) || 'null');
    return m && Date.now() - m.t < 600000 ? m : null;
  } catch (e) { return null; }
}
function driveSyncOnReturn() {
  if (getDriveToken() && consumeDriveForcePending()) { saveBackupToDriveNow(); return true; }
  const mark = getDriveToken() && peekHistorySaveMark(); // 1.8.50 : la séance finie avant la reconnexion part maintenant
  if (mark) {
    try { localStorage.removeItem(HIST_SAVE_MARK_KEY); } catch (e) { /* ignoré */ }
    trackHistorySave(mark.id, () => backupToDrive({ autoReconnect: false }));
    return true;
  }
  syncDriveBackup();
  return false;
}
async function saveBackupToDriveNow() {
  if (!getDriveToken()) {
    // Accès expiré : renouvellement silencieux quand Google le permet (navigateur)
    let renewed = false;
    try { renewed = await renewDriveToken(); } catch (e) { renewed = false; }
    if ((!renewed || !getDriveToken()) && isInstalledApp() && isDriveWanted()) {
      // Application installée : on se reconnecte tout de suite ; la sauvegarde part au retour
      try { localStorage.setItem(DRIVE_FORCE_PENDING_KEY, String(Date.now())); } catch (e) { /* ignoré */ }
      showToast('Connexion Google expirée : reconnexion en cours. La sauvegarde partira sur le Drive au retour dans l’application.', 6000);
      setTimeout(connectDriveByRedirect, DRIVE_CONNECT_DELAY_MS);
      return;
    }
    if (!renewed || !getDriveToken()) {
      showToast('Connexion Google expirée : rien n’a été envoyé. Touche «\u00a0Reconnecter maintenant\u00a0» dans Réglages, puis recommence.', 8000);
      updateDriveUI();
      return;
    }
  }
  showToast('Envoi de la sauvegarde sur Google Drive…', 4000);
  const r = await syncDriveBackup({ force: true });
  updateDriveUI();
  if (r && r.ok) showToast(`Sauvegarde envoyée sur Google Drive : «\u00a0${driveLastWrittenName || driveBackupFileName()}\u00a0», dans le dossier «\u00a0${DRIVE_FOLDER_NAME}\u00a0».`, 8000);
  else if (r && r.reason === 'conflict') showToast('Rien n’a été envoyé : la sauvegarde du Drive contient des séances absentes de ce téléphone. Voir Réglages › Google Drive.', 9000);
  else if (r && r.reason === 'busy') showToast('Une sauvegarde est déjà en cours d’envoi : elle part dans un instant.', 6000);
  else if (r && (r.reason === 'token' || r.reason === 'no-token')) showToast('Connexion Google expirée : rien n’a été envoyé. Touche «\u00a0Reconnecter maintenant\u00a0» dans Réglages, puis recommence.', 8000);
  else showToast('Envoi sur Google Drive impossible pour le moment. Vérifie la connexion et recommence.', 8000);
}

function downloadBackupFile(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  showToast(`Sauvegarde téléchargée : «\u00a0${name}\u00a0», dans le dossier Téléchargements du téléphone.\nPour la remettre : Historique › Restaurer › Choisir un fichier…`, 8000);
}

async function exportData() {
  const dataStr = JSON.stringify(state, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const name = backupFileName();
  const file = new File([blob], name, { type: 'application/json' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: 'Sauvegarde Mon Carnet de Salle',
        text: 'Sauvegarde du ' + new Date().toLocaleDateString('fr-FR') + '.',
        files: [file],
      });
      return;
    } catch (error) {
      if (error && error.name === 'AbortError') return; // partage fermé par l'usager
      console.log('Partage impossible, téléchargement à la place', error);
    }
  }
  downloadBackupFile(blob, name);
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const importedState = JSON.parse(e.target.result);
      if (importedState && Array.isArray(importedState.history)) {
        // Ancienne sauvegarde (sans programmes) : migration « Hypertrophie » comme au premier lancement
        const mig = migrateState(importedState);
        if (mig.error) { appAlert('Import impossible', "La sauvegarde importée ne peut pas être convertie au format des programmes : rien n'a été modifié.", 'warn'); return; }
        state = mig.state;
        normalizePrograms();
        programDraft = null; programView = 'home';
        clearEditState();
        clearDraft();
        discardWeightInput();
        saveState();
        populateExerciseSelect();
        initWorkoutForm();
        renderHistory();
        renderCharts();
        renderProgramOverview();
        appAlert('Sauvegarde importée', 'Tes données ont été restaurées.');
      } else {
        appAlert('Fichier invalide', 'Ce fichier de sauvegarde a une structure incorrecte.', 'warn');
      }
    } catch (err) {
      appAlert('Fichier illisible', 'Erreur lors de la lecture du fichier de sauvegarde.', 'warn');
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}

async function resetData() {
  const confirm1 = await askSheet({ tone: 'danger', danger: true, title: 'Réinitialiser les données ?',
    text: "Tes séances, pesées et programmes seront remplacés par les données d'origine.", ok: 'Réinitialiser', cancel: 'Annuler' });
  if (confirm1) {
    fetch('data.json').then(res => res.json()).then(defaultData => {
      state = migrateState(defaultData).state;
      normalizePrograms();
      programDraft = null; programView = 'home';
      forceWelcomeWallpaper();   // 1.8.73
      clearEditState();
      clearDraft();
      discardWeightInput();
      saveState();
      populateExerciseSelect();
      initWorkoutForm();
      renderHistory();
      renderCharts();
      renderProgramOverview();
      appAlert('Données réinitialisées', "Les données d'origine ont été rechargées.");
    }).catch(() => {
      appAlert('Réinitialisation impossible', 'Erreur lors de la réinitialisation.', 'warn');
    });
  }
}
