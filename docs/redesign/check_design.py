"""Dependency-free integrity checks for the review artifact, not application tests."""
import json
import re
import hashlib
from pathlib import Path
from html.parser import HTMLParser

base = Path(__file__).resolve().parent
root = base.parent.parent
screens = json.loads((base / 'design/screens.json').read_text())
flows = json.loads((base / 'design/flows.json').read_text())
ids = {s['id'] for s in screens}
assert len(ids) == len(screens), 'Duplicate screen ID'
for s in screens:
    for key in ['id', 'group', 'title', 'route', 'kind', 'summary', 'sections', 'actions', 'states', 'mobile']:
        assert s[key], f'{s["id"]}: missing {key}'
    assert all(a['to'] in ids for a in s['actions']), s['id']
    names = [st['name'] for st in s['states']]
    assert len(names) == len(set(names)), f'{s["id"]}: duplicate state'
    assert all(f['label'] and f['type'] for f in s['fields']), s['id']
    assert f"## {s['id']} —" in (base / 'SCREENS.md').read_text(), s['id']
for f in flows:
    assert all(s in ids for s in f['path']), f['id']
    assert f['branches'] and f['done'], f['id']
js = (base / 'design/data.js').read_text()
assert json.loads(js.removeprefix('window.PLAYORA_DESIGN = ').rstrip(';\n')) == {'screens': screens, 'flows': flows}, 'Run sync_design.py'
routes = {'/'}
for manifest in ['frontend/app/routes.ts', 'frontend/admin-app/routes.ts']:
    routes.update('/' + r for r in re.findall(r'route\("([^"]+)"', (root / manifest).read_text()))
missing = routes - {s['route'] for s in screens}
assert not missing, f'Unmapped current routes: {missing}'
code = '\n'.join(path.read_text() for path in (base / 'design').glob('*.js'))
assert not re.search(r'\b(fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage)\b', code), 'Review network or persistence addition'
class Assets(HTMLParser):
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        for key in ['src', 'href']:
            value = attrs.get(key, '')
            if value and not value.startswith(('#', 'http:', 'https:', 'data:')):
                assert (base / 'design' / value).exists(), f'Missing {value}'
Assets().feed((base / 'design/index.html').read_text())
for name in re.findall(r'url\(assets/([^)]+)\)', (base / 'design/atlas.css').read_text()):
    assert (base / 'design/assets' / name).is_file(), name
for asset in json.loads((base / 'design/assets/game-art-manifest.json').read_text()):
    path = base / 'design/assets' / asset['file']
    assert path.is_file(), f'Missing game art: {path.name}'
    data = path.read_bytes()
    assert len(data) == asset['bytes'], f'Game art size changed: {path.name}'
    assert hashlib.sha256(data).hexdigest() == asset['sha256'], f'Game art hash changed: {path.name}'
coverage = ['# Current route → design coverage', '', 'Generated from both current React Router manifests and the design screen inventory. A design subview does not imply a newly implemented route. New navigation proposals require later implementation approval.', '', '| Existing route | Designed views |', '| --- | --- |']
for route in sorted(routes):
    matches = [s for s in screens if s['route'] == route]
    coverage.append('| `'+route+'` | '+', '.join(f"[{s['id']}](design/index.html#{s['id']})" for s in matches)+' |')
coverage += ['', f'**Coverage:** {len(routes)} existing routes mapped; {len(screens)} design views; {len(flows)} journey specifications; {sum(len(s["states"]) for s in screens)} named state treatments.', '', '## Deliberate subviews and proposed information architecture', '', '- Checkout, cases, proof, sessions and secure handoff are existing order/submission subflows. Their design IDs allow review without inventing public route URLs.', '- How it works is a proposed separate informational destination; P16 currently maps to the existing terms surface. Policy types are current content variants, not assumed new APIs.', '- Future-game templates use `/games/:slug` and the existing configurable service path. WoW, League, VALORANT, Dota 2 and Wild Rift are not activated for launch by their designs.', '- Admin form/rule/package/intake/preview/history designs map to current catalog subviews; finance views map to the existing finance workspace.', '- Staff directory/recovery/audit and customer identity substeps remain scoped to the existing authentication/access model.', '- X01 covers route-not-found and shared access/outage recovery outside the ordinary route list.', '', '## Unimplemented and intentionally excluded', '', 'No wallet/top-up, escrow smart contract, wager/tournament/scrim platform, auto-matchmaking, public booster hiring marketplace, affiliate/cashback system, invented anti-cheat telemetry or automatic booster compensation. These suggestions in raw exports do not expand the product scope. The owner separately requested game shop and news designs on 23 September; their discovery concepts are now included, with implementation and detailed downstream flows pending.', '', 'The structured inventory is comprehensive against current routes, not a guarantee that every data combination has a distinct visual screenshot. Shared templates, named states and interaction contracts define those combinations. Owner review and future implementation qualification remain separate.']
(base / 'COVERAGE.md').write_text('\n'.join(coverage)+'\n')
print(f'Design integrity passed: {len(screens)} screens, {len(flows)} flows, {len(routes)} routes, {sum(len(s["states"]) for s in screens)} named states.')
