"""Faux Google Drive pour les tests : dossier, UN fichier de sauvegarde complète, compteurs de requêtes."""
import json, re
from urllib.parse import unquote

MODIFIED = '2026-11-03T20:00:00.000Z'


class FakeDrive:
    def __init__(self, folder=False, backup=None, fail=None):
        """backup : état (dict) déjà présent sur le Drive, ou texte brut, ou None ; fail : {'about'|'folder'|'search'|'download'|'patch'|'post': statut HTTP}."""
        self.folder = folder
        self.backup = None if backup is None else (backup if isinstance(backup, str) else json.dumps(backup))
        self.fail = dict(fail or {})
        self.folders_created = 0
        self.posts = 0      # créations du fichier de sauvegarde
        self.patches = 0    # mises à jour du fichier
        self.last_body = None
        self.calls = []

    # contenu actuellement présent sur le Drive (dict) ou None
    def content(self):
        try:
            return json.loads(self.backup) if self.backup is not None else None
        except ValueError:
            return None

    def uploads(self):
        return self.posts + self.patches

    def _json(self, route, status, body):
        route.fulfill(status=status, content_type='application/json', body=json.dumps(body))

    def handle(self, route):
        r = route.request; u = unquote(r.url); m = r.method
        self.calls.append((m, u))
        err = {'error': {'code': 0, 'errors': [{'reason': 'x'}]}}
        if '/drive/v3/about' in u:
            st = self.fail.get('about', 200)
            return self._json(route, st, {'user': {'emailAddress': 'jean@example.com'}} if st == 200 else err)
        if '/upload/drive/v3/files/' in u and m == 'PATCH':
            st = self.fail.get('patch', 200)
            if st == 200:
                self.patches += 1
                self.backup = r.post_data
                self.last_body = r.post_data
            return self._json(route, st, {'id': 'BK1', 'name': 'n'} if st == 200 else err)
        if '/upload/drive/v3/files' in u and m == 'POST':
            st = self.fail.get('post', 200)
            if st == 200:
                self.posts += 1
                raw = r.post_data_buffer.decode('utf-8', 'ignore') if r.post_data_buffer else ''
                parts = raw.split('\r\n\r\n')
                self.backup = parts[2].split('\r\n--')[0] if len(parts) > 2 else raw
                self.last_body = self.backup
            return self._json(route, st, {'id': 'BK1', 'name': 'n'} if st == 200 else err)
        if m == 'POST' and u.rstrip('/').endswith('/drive/v3/files'):
            self.folders_created += 1; self.folder = True
            return self._json(route, 200, {'id': 'NEWF'})
        if 'alt=media' in u:
            st = self.fail.get('download', 200)
            if st != 200:
                return self._json(route, st, err)
            return route.fulfill(status=200, content_type='application/json', body=self.backup or '')
        if "name='sauvegarde_complete.json'" in u:
            st = self.fail.get('search', 200)
            if st != 200:
                return self._json(route, st, err)
            files = [{'id': 'BK1', 'modifiedTime': MODIFIED}] if self.backup is not None else []
            return self._json(route, 200, {'files': files})
        if "mimeType='application/vnd.google-apps.folder'" in u:
            st = self.fail.get('folder', 200)
            if st != 200:
                return self._json(route, st, err)
            return self._json(route, 200, {'files': [{'id': 'EXIST'}] if self.folder else []})
        return self._json(route, 200, {'files': []})
