"""Faux Google Drive pour les tests : dossier, sauvegardes versionnées (fitness-backup-*.json et ancien
sauvegarde_complete.json), mise à la corbeille, compteurs de requêtes."""
import json, re
from datetime import datetime, timedelta, timezone
from urllib.parse import unquote

MODIFIED = '2026-11-03T20:00:00.000Z'
LEGACY = 'sauvegarde_complete.json'
_BASE = datetime(2026, 11, 7, 10, 0, 0, tzinfo=timezone.utc)


def _iso(dt):
    return dt.strftime('%Y-%m-%dT%H:%M:%S.000Z')


class FakeDrive:
    def __init__(self, folder=False, backup=None, fail=None, versions=None):
        """backup : état (dict) ou texte brut déjà présent sur le Drive dans l'ancien fichier unique (id BK1), ou None ;
        versions : liste de (nom, modifiedTime, état) déjà présents (ids V1, V2...) ;
        fail : {'about'|'folder'|'search'|'download'|'patch'|'post'|'trash'|'list_after_post': statut HTTP}."""
        self.folder = folder
        self.files = []     # {'id', 'name', 'modifiedTime', 'body', 'trashed'}
        self.fail = dict(fail or {})
        self.folders_created = 0
        self.posts = 0      # créations de fichiers de sauvegarde
        self.patches = 0    # anciennes mises à jour en place (ne doivent plus avoir lieu)
        self.trashes = 0    # sauvegardes mises à la corbeille
        self.trash_attempts = 0
        self.post_names = []
        self.last_body = None
        self.calls = []
        self._n = 0
        if backup is not None:
            self.files.append({'id': 'BK1', 'name': LEGACY, 'modifiedTime': MODIFIED, 'body': self._txt(backup), 'trashed': False})
        for i, (name, mod, st) in enumerate(versions or []):
            self.files.append({'id': 'V%d' % (i + 1), 'name': name, 'modifiedTime': mod, 'body': self._txt(st), 'trashed': False})

    @staticmethod
    def _txt(b):
        return b if isinstance(b, str) else json.dumps(b)

    def live(self):
        """Fichiers présents (hors corbeille), du plus récent au plus ancien."""
        return sorted([f for f in self.files if not f['trashed']], key=lambda f: (f['modifiedTime'], f['name']), reverse=True)

    # contenu de la sauvegarde la plus récente (texte) ; l'affecter remplace son contenu, None vide le dossier
    @property
    def backup(self):
        lv = self.live()
        return lv[0]['body'] if lv else None

    @backup.setter
    def backup(self, value):
        if value is None:
            for f in self.files:
                f['trashed'] = True
            return
        lv = self.live()
        if lv:
            lv[0]['body'] = self._txt(value)
        else:
            self.files.append({'id': 'BK1', 'name': LEGACY, 'modifiedTime': MODIFIED, 'body': self._txt(value), 'trashed': False})

    # contenu actuellement présent sur le Drive (dict de la plus récente sauvegarde) ou None
    def content(self):
        try:
            return json.loads(self.backup) if self.backup is not None else None
        except ValueError:
            return None

    def uploads(self):
        return self.posts + self.patches

    def _json(self, route, status, body):
        route.fulfill(status=status, content_type='application/json', body=json.dumps(body))

    def _by_id(self, fid):
        return next((f for f in self.files if f['id'] == fid and not f['trashed']), None)

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
            if st != 200:
                return self._json(route, st, err)
            self.posts += 1
            raw = r.post_data_buffer.decode('utf-8', 'ignore') if r.post_data_buffer else ''
            parts = raw.split('\r\n\r\n')
            body = parts[2].split('\r\n--')[0] if len(parts) > 2 else raw
            meta = {}
            try:
                meta = json.loads(parts[1].split('\r\n--')[0]) if len(parts) > 1 else {}
            except ValueError:
                pass
            self._n += 1
            fid = 'BK%d' % self._n if not any(f['id'] == 'BK%d' % self._n for f in self.files) else 'N%d' % self._n
            name = meta.get('name', 'n')
            self.post_names.append(name)
            self.files.append({'id': fid, 'name': name, 'modifiedTime': _iso(_BASE + timedelta(seconds=self._n)), 'body': body, 'trashed': False})
            self.last_body = body
            if 'list_after_post' in self.fail:
                self.fail['search'] = self.fail['list_after_post']
            return self._json(route, 200, {'id': fid, 'name': name})
        mt = re.search(r'/drive/v3/files/([^/?]+)', u)
        if mt and m in ('PATCH', 'DELETE') and '/upload/' not in u:
            self.trash_attempts += 1
            st = self.fail.get('trash', 200)
            f = self._by_id(mt.group(1))
            if st != 200:
                return self._json(route, st, err)
            if not f:
                return self._json(route, 404, err)
            f['trashed'] = True; self.trashes += 1
            return self._json(route, 200, {'id': f['id']})
        if m == 'POST' and u.rstrip('/').endswith('/drive/v3/files'):
            self.folders_created += 1; self.folder = True
            return self._json(route, 200, {'id': 'NEWF'})
        if 'alt=media' in u:
            st = self.fail.get('download', 200)
            if st != 200:
                return self._json(route, st, err)
            f = self._by_id(mt.group(1)) if mt else None
            if not f:
                return self._json(route, 404, err)
            return route.fulfill(status=200, content_type='application/json', body=f['body'] or '')
        if "mimeType='application/vnd.google-apps.folder'" in u:
            st = self.fail.get('folder', 200)
            if st != 200:
                return self._json(route, st, err)
            return self._json(route, 200, {'files': [{'id': 'EXIST'}] if self.folder else []})
        if ' in parents' in u:
            st = self.fail.get('search', 200)
            if st != 200:
                return self._json(route, st, err)
            return self._json(route, 200, {'files': [{'id': f['id'], 'name': f['name'], 'modifiedTime': f['modifiedTime']} for f in self.live()]})
        return self._json(route, 200, {'files': []})
