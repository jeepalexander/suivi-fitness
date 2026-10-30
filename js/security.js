// Durcissement sécurité - Suivi Fitness
// Assainit toute sauvegarde JSON importée avant traitement par app.js :
// les caractères < et > sont retirés de toutes les chaînes afin d'empêcher
// l'injection de balises ou de gestionnaires d'événements (XSS stocké).
(function () {
  'use strict';

  const originalImportData = window.importData;
  if (typeof originalImportData !== 'function') return;

  function sanitizeValue(value) {
    if (typeof value === 'string') {
      return value.replace(/[<>]/g, '');
    }
    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }
    if (value && typeof value === 'object') {
      const clean = {};
      for (const key of Object.keys(value)) {
        clean[key] = sanitizeValue(value[key]);
      }
      return clean;
    }
    return value;
  }

  window.importData = async function (event) {
    try {
      const file = event && event.target && event.target.files && event.target.files[0];
      if (!file) {
        return originalImportData(event);
      }

      const text = await file.text();
      const parsed = JSON.parse(text);
      const cleanData = sanitizeValue(parsed);
      const cleanText = JSON.stringify(cleanData);
      const cleanFile = new File([cleanText], file.name || 'sauvegarde.json', {
        type: 'application/json'
      });

      return originalImportData({ target: { files: [cleanFile] } });
    } catch (error) {
      console.error('Import sécurisé : fichier JSON invalide.', error);
      alert('Fichier de sauvegarde invalide.');
    }
  };
})();
