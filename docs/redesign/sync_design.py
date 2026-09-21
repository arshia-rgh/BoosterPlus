"""Regenerate readable screen/flow documents and local data.js from editable JSON."""
import json
from pathlib import Path
out=Path(__file__).resolve().parent
S=json.loads((out/'design/screens.json').read_text())
F=json.loads((out/'design/flows.json').read_text())
ids={s['id'] for s in S}
assert len(ids)==len(S)
assert all(a['to'] in ids for s in S for a in s['actions'])
assert all(x in ids for f in F for x in f['path'])
(out/'design/screens.json').write_text(json.dumps(S,ensure_ascii=False,indent=2)+'\n')
(out/'design/flows.json').write_text(json.dumps(F,ensure_ascii=False,indent=2)+'\n')
(out/'design/data.js').write_text('window.PLAYORA_DESIGN = '+json.dumps(dict(screens=S,flows=F),ensure_ascii=False)+';\n')
md=['# PLAYORA screen specifications','', 'Design review edition · 21 September 2026. All monetary values and identities are fictional examples. Screen IDs identify design views, not new implemented routes. Business rules and implementation boundaries remain in README.md.','',f'{len(S)} designed views, including subviews of existing routes. Shared behavior in DESIGN_SYSTEM.md and INTERACTIONS.md applies to every view.','']
for s in S:
 md += [f"## {s['id']} — {s['title']}",'',f"**Area:** {s['group']} · **Current route:** `{s['route']}` · **Layout:** {s['kind']}",'',s['summary'],'','### Page anatomy & content','']
 md += [f"{i+1}. **{x['title']}** — {x['body']}" for i,x in enumerate(s['sections'])]
 if s['fields']:
  md+=['','### Fields','', '| Label | Control | Example/default | Help / conditions |','| --- | --- | --- | --- |']
  for x in s['fields']: md.append('| '+' | '.join(str(x[k]).replace('|','/').replace('\n','; ') for k in ['label','type','value','help'])+' |')
  md+=['','Allowed options: '+ '; '.join(x['label']+': '+', '.join(x['options']) for x in s['fields'] if x['options'])+'.']
 if s['table']:
  md+=['','### Table/card fields','', ' → '.join(s['table']['columns'])+'. Rows become labeled cards below 760px; preserve priority and full values.']
 md+=['','### Actions & destinations','']+[f"- **{a['label']}** → [{a['to']}](design/index.html#{a['to']}). Prototype actions are simulations only; guards must pass in the eventual application." for a in s['actions']]
 md+=['','### States & recovery','']+[f"- **{x['name']}:** {x['copy']}" for x in s['states']]
 md+=['','### Responsive / accessibility','',s['mobile'],'Every field has a persistent label, linked help/error and visible focus. Read order follows the visual order. Permission/error variants use the shared recovery rules.','',s['notes'] or 'Use the common interaction contract; do not invent additional commercial promises.','', '**Journeys:** '+', '.join(s['flowIds'])+'.','']
(out/'SCREENS.md').write_text('\n'.join(md))
md=['# PLAYORA end-to-end journeys','', 'Each path links to designed views. Staff/customer handoffs represent different authorized people; prototype navigation is not an authorization model. Branches must be checked before implementation acceptance.','']
for f in F:
 md += [f"## {f['id']} — {f['title']}",'',' → '.join(f"[{x}](design/index.html#{x})" for x in f['path']),'','```mermaid','flowchart LR']
 for i,x in enumerate(f['path']):md.append(f'  n{i}["{x} · {next(s["title"] for s in S if s["id"]==x).replace(chr(34), chr(39))}"]')
 for i in range(len(f['path'])-1):md.append(f'  n{i} --> n{i+1}')
 md+=['```','','**Branches and guards**','']+['- '+x for x in f['branches']]+['','**Completion evidence:** '+f['done'],'']
(out/'FLOWS.md').write_text('\n'.join(md))
print(len(S),'screens',len(F),'flows')
