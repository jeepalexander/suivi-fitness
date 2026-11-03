// Bootstrap v1.6.2 — restaure l'app depuis le dernier commit sain (Drive OK).
// Co-auteur : Grok
(async function () {
  var SRC = 'https://raw.githubusercontent.com/jeepalexander/suivi-fitness/334b36e672c3912497d57b9327696f06a0b155a3/app.js';
  try {
    var res = await fetch(SRC, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var code = await res.text();
    if (!code || code.indexOf('GOOGLE_CLIENT_ID') === -1) throw new Error('Contenu invalide');
    var s = document.createElement('script');
    s.textContent = code;
    document.head.appendChild(s);
  } catch (e) {
    console.error('Bootstrap app.js', e);
    try {
      document.body.insertAdjacentHTML('afterbegin',
        '<p style="padding:12px;font-family:system-ui;color:#b00020">Impossible de charger l\'application. Recharge la page ou vérifie la connexion.</p>');
    } catch (e2) {}
  }
})();
