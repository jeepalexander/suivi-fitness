// Bootstrap v1.6.3 — charge la logique app (Drive) depuis un commit sain.
// Co-auteur : Grok
(function () {
  var SRC = 'https://cdn.jsdelivr.net/gh/jeepalexander/suivi-fitness@334b36e672c3912497d57b9327696f06a0b155a3/app.js';
  var s = document.createElement('script');
  s.src = SRC;
  s.async = false;
  s.onerror = function () {
    fetch('https://raw.githubusercontent.com/jeepalexander/suivi-fitness/334b36e672c3912497d57b9327696f06a0b155a3/app.js', { cache: 'no-store', mode: 'cors' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (code) {
        if (!code || code.indexOf('GOOGLE_CLIENT_ID') === -1) throw new Error('invalid');
        var t = document.createElement('script');
        t.textContent = code;
        document.head.appendChild(t);
      })
      .catch(function (e) {
        console.error('Bootstrap app.js failed', e);
        try {
          document.body.insertAdjacentHTML('afterbegin',
            '<p style="padding:12px;font-family:system-ui;color:#b00020">Impossible de charger l\'application. Vide le cache du site ou réessaie.</p>');
        } catch (e2) {}
      });
  };
  document.head.appendChild(s);
})();
