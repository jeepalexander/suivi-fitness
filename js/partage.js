// ============================================================
// PARTAGER ET RECEVOIR UN PROGRAMME (1.7.52)
// Le programme (nom, type, séances, exercices et nombre de séries) tient dans un lien :
//   <adresse de l'app>#prog=<code>   (JSON compressé « deflate-raw », puis base64url)
// Rien d'autre ne part : ni historique, ni charges, ni Google Drive. Aucun serveur.
// Envoi : bas de l'éditeur → « Envoyer le lien » (menu de partage du téléphone) ou « Afficher le QR code ».
// Réception : ouverture du lien, ou menu + → « Recevoir un programme » (coller le lien, ou scanner le QR
// avec la caméra dans l'app quand Chrome sait lire les QR codes : BarcodeDetector).
// ============================================================
const SHARE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>';
const LINK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>';
const QR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2M20 14v6h-4"/></svg>';
const SHARE_CHEVRON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
const SHARE_MAX_CODE = 4000; // garde-fou : un vrai programme fait environ 250 caractères

// ---------- Encodage ----------
function shareB64u(bytes) {
  let s = ''; bytes.forEach(b => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function shareUnB64u(str) {
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}
async function shareStream(bytes, Stream) {
  const s = new Stream('deflate-raw');
  const w = s.writable.getWriter();
  w.write(bytes).catch(() => {});
  w.close().catch(() => {});
  return new Uint8Array(await new Response(s.readable).arrayBuffer());
}

async function encodeProgram(p) {
  const data = {
    v: 1, n: p.name, k: isLibre(p) ? 'l' : 'p',
    s: (p.sessions || []).map(s => [s.key || '', s.name || '', (s.exercises || []).map(e => [e.exId, e.sets || 3])])
  };
  return shareB64u(await shareStream(new TextEncoder().encode(JSON.stringify(data)), CompressionStream));
}

// Lit et vérifie un code reçu ; renvoie null s'il n'est pas valide (lien abîmé, trafiqué ou exercice inconnu)
async function decodeProgram(code) {
  try {
    if (!code || code.length > SHARE_MAX_CODE || !/^[\w-]+$/.test(code)) return null;
    const o = JSON.parse(new TextDecoder().decode(await shareStream(shareUnB64u(code), DecompressionStream)));
    if (!o || o.v !== 1 || !Array.isArray(o.s) || !o.s.length || o.s.length > SESSION_KEYS.length) return null;
    const clean = (v, n) => String(v == null ? '' : v).replace(/[<>]/g, '').trim().slice(0, n);
    const libre = o.k === 'l';
    const sessions = o.s.map((s, i) => ({
      key: libre ? '' : SESSION_KEYS[i],
      name: clean(s && s[1], 60),
      exercises: (Array.isArray(s && s[2]) ? s[2] : []).slice(0, 40)
        .filter(e => Array.isArray(e) && typeof e[0] === 'number' && CATALOGUE_BY_ID[e[0]])
        .map(e => ({ exId: e[0], sets: Math.min(10, Math.max(1, Math.round(Number(e[1]) || 3))) }))
    }));
    if (libre && sessions.length !== 1) return null;
    if (!sessions.every(s => s.exercises.length)) return null;
    const name = clean(o.n, 60) || (libre ? 'Séance libre' : 'Programme reçu');
    if (libre) sessions[0].name = name;
    return { name, kind: libre ? 'libre' : 'program', sessions };
  } catch (e) {
    return null;
  }
}

async function programShareUrl(p) { return appShareUrl() + '#prog=' + await encodeProgram(p); }
function shareCodeFrom(text) { const m = /[#&]prog=([\w-]+)/.exec(String(text || '')); return m ? m[1] : null; }

// ---------- Envoi ----------
function shareProgramButtonHtml() {
  return `<button type="button" class="ed-share" onclick="openShareProgram()">${SHARE_SVG}Partager le programme</button>`;
}
function shareItemHtml(ico, title, sub, fn) {
  return `<button type="button" class="restore-item share-item" onclick="${fn}"><span class="share-ico">${ico}</span>
    <span class="restore-text"><span class="restore-name"><b>${title}</b></span><span class="restore-when">${sub}</span></span>
    <span class="share-chev">${SHARE_CHEVRON}</span></button>`;
}
// Le programme enregistré (celui de l'éditeur ouvert)
function sharedProgram() { return programDraft && programDraft.id ? getProgram(programDraft.id) : null; }

function openShareProgram() {
  const p = sharedProgram();
  if (!p) return;
  openSheet(`<h3 class="sheet-title">Partager le programme</h3>
    <p class="sheet-text">${escapeHtml(p.name)} : ses séances et ses exercices, sans ton historique ni tes charges.</p>
    <div class="restore-list">${shareItemHtml(LINK_SVG, 'Envoyer le lien', 'WhatsApp, SMS, mail…', 'shareProgramLink()')}${shareItemHtml(QR_SVG, 'Afficher le QR code', 'À scanner face à face', 'showProgramQr()')}</div>
    <button type="button" class="btn btn-secondary" onclick="closeSheet()">Fermer</button>`);
}

async function shareProgramLink() {
  const p = sharedProgram();
  if (!p) return;
  const url = await programShareUrl(p);
  if (navigator.share) {
    try { await navigator.share({ title: p.name, text: `Mon programme « ${p.name} » pour Mon Carnet de Salle`, url }); } catch (e) { /* partage abandonné */ }
    return;
  }
  try { await navigator.clipboard.writeText(url); showToast('Lien copié', 3000); } catch (e) { showProgramQr(); }
}

async function showProgramQr() {
  const p = sharedProgram();
  if (!p) return;
  const url = await programShareUrl(p);
  openSheet(`<h3 class="sheet-title small">${escapeHtml(p.name)}</h3>
    <p class="sheet-text center">Scanne ce QR code avec l'autre téléphone pour ajouter le programme.</p>
    <div class="invite-qr" data-url="${escapeHtml(url)}">${inviteQrSvg(url)}</div>
    <button type="button" class="btn btn-secondary" onclick="closeSheet()">Fermer</button>`, { update: true });
}

// ---------- Réception ----------
let receivedProgram = null;

async function receiveProgramCode(code) {
  const p = await decodeProgram(code);
  if (!p) { appAlert('Lien illisible', 'Ce lien ne contient pas de programme valide.', 'warn'); return false; }
  receivedProgram = p;
  const libre = p.kind === 'libre';
  const rows = p.sessions.map(s => {
    const ne = s.exercises.length, ns = s.exercises.reduce((a, e) => a + e.sets, 0);
    const pill = libre ? '<span class="type-pill type-pill-libre">1×</span>' : `<span class="type-pill type-pill-${s.key}">${s.key}</span>`;
    return `<li class="miss-row">${pill}<span class="miss-text"><span class="miss-name">${escapeHtml(s.name || p.name)}</span><span class="miss-sub">${ne} exercice${ne > 1 ? 's' : ''} · ${ns} série${ns > 1 ? 's' : ''}</span></span></li>`;
  }).join('');
  const where = getActiveProgram() ? 'rejoindra tes programmes en mémoire, sans changer ton programme actif.' : 'deviendra ton programme actif.';
  openSheet(`<h3 class="sheet-title center">${libre ? 'Séance libre reçue' : 'Programme reçu'}</h3>
    <p class="sheet-text center">« ${escapeHtml(p.name)} » ${where}</p>
    <ul class="miss-list">${rows}</ul>
    <button type="button" class="btn" id="recv-add" onclick="addReceivedProgram()">Ajouter à mes programmes</button>
    <button type="button" class="btn btn-secondary" onclick="closeSheet()">Annuler</button>`);
  return true;
}

function addReceivedProgram() {
  const p = receivedProgram;
  if (!p) return;
  receivedProgram = null;
  if (!Array.isArray(state.programs)) state.programs = [];
  let name = p.name, n = 2;
  while (getPrograms().some(x => x.name === name)) name = `${p.name} (${n++})`;
  if (p.kind === 'libre') p.sessions[0].name = name;
  const now = new Date().toISOString();
  const active = getActiveProgram();
  state.programs.push({
    id: newProgramId(), name, kind: p.kind, status: active ? 'new' : 'active',
    createdAt: now, activatedAt: active ? null : now, pausedAt: null, savedAt: now, receivedAt: now,
    nextKey: p.kind === 'libre' ? '' : 'A', sessions: p.sessions
  });
  normalizePrograms();
  saveState();
  if (typeof backupToDrive === 'function') backupToDrive({ autoReconnect: false });
  closeSheet();
  switchTab('programme');
  setProgramView('home');
  showToast(`« ${name} » ajouté`, 3000);
}

// Ouverture de l'app par un lien de programme : on le propose, puis on retire le code de l'adresse
function receiveProgramFromLocation() {
  const code = shareCodeFrom(location.hash);
  if (!code) return;
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignoré */ }
  setTimeout(() => receiveProgramCode(code), 300);
}
window.addEventListener('hashchange', () => { if (state) receiveProgramFromLocation(); });

// Menu + : « Recevoir un programme »
function receiveProgramButtonHtml() {
  return `<button type="button" class="choose-recv" onclick="openReceiveProgram()">${QR_SVG}Recevoir un programme</button>`;
}
function canScanQr() { return 'BarcodeDetector' in window && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia); }

function openReceiveProgram() {
  const scan = canScanQr();
  openSheet(`<h3 class="sheet-title">Recevoir un programme</h3>
    <p class="sheet-text">${scan ? "Colle le lien qu'on t'a envoyé, ou scanne son QR code." : "Colle le lien qu'on t'a envoyé."}</p>
    <input class="recv-field" id="recv-url" type="url" inputmode="url" placeholder="Colle le lien ici" autocomplete="off" aria-label="Lien du programme">
    <button type="button" class="btn" onclick="receiveFromField()">Voir le programme</button>
    ${scan ? '<button type="button" class="btn btn-secondary" onclick="openQrScanner()">Scanner un QR code</button>' : '<button type="button" class="btn btn-secondary" onclick="closeSheet()">Annuler</button>'}`);
}
function receiveFromField() {
  const v = (document.getElementById('recv-url') || {}).value || '';
  const code = shareCodeFrom(v);
  if (!code) { appAlert('Lien illisible', 'Ce lien ne contient pas de programme valide.', 'warn'); return; }
  receiveProgramCode(code);
}

// ---------- Scanner de QR code (caméra arrière, lecteur intégré à Chrome) ----------
let qrStream = null, qrTimer = null;

function stopQrScanner() {
  if (qrTimer) { clearTimeout(qrTimer); qrTimer = null; }
  if (qrStream) { qrStream.getTracks().forEach(t => t.stop()); qrStream = null; }
}

async function openQrScanner() {
  openSheet(`<h3 class="sheet-title center">Scanner un QR code</h3>
    <div class="qr-cam"><video id="qr-video" playsinline muted></video><span class="qr-frame" aria-hidden="true"></span></div>
    <p class="sheet-text center" id="qr-msg">Vise le QR code du programme.</p>
    <button type="button" class="btn btn-secondary" onclick="closeSheet()">Annuler</button>`, { onClose: stopQrScanner });
  let detector;
  try {
    detector = new BarcodeDetector({ formats: ['qr_code'] });
    qrStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
  } catch (e) {
    stopQrScanner();
    const msg = document.getElementById('qr-msg');
    if (msg) msg.textContent = "La caméra n'est pas disponible. Autorise-la dans les réglages de Chrome, ou colle le lien.";
    return;
  }
  const video = document.getElementById('qr-video');
  if (!video) { stopQrScanner(); return; }
  video.srcObject = qrStream;
  try { await video.play(); } catch (e) { /* lecture automatique refusée : l'image reste fixe */ }
  const tick = async () => {
    if (!qrStream) return;
    try {
      const found = await detector.detect(video);
      const code = found.map(b => shareCodeFrom(b.rawValue)).find(Boolean);
      if (code) { stopQrScanner(); receiveProgramCode(code); return; }
      if (found.length) { const msg = document.getElementById('qr-msg'); if (msg) msg.textContent = "Ce QR code n'est pas un programme."; }
    } catch (e) { /* image pas encore prête */ }
    qrTimer = setTimeout(tick, 250);
  };
  tick();
}
