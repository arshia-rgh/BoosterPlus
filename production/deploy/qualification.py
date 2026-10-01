"""Private evidence packet; never turns preparation or missing input into PASS."""
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import sys

from artifacts import bounded
from provision import private_write

REQUIREMENTS = {
    'host': 'Chosen host, capacity, firewall, private ports and synchronized clock',
    'full_gate': 'Complete repository gate on the exact release, including real TiKV',
    'signed_ci': 'Authenticated successful CI, signed digests, SBOMs and registry retrieval',
    'release': 'Clean-host release, explicit migration/history and interrupted release recovery',
    'rollback': 'Compatible app rollback; rejection of incompatible schema',
    'recovery': 'Off-host SQL/media/runtime/key restore; measured RPO <=900s and RTO <=14400s',
    'privacy': 'Independent erasure/hold replay and file purge, or deletion disabled with no prior unjournaled erasures',
    'monitoring': 'Independent-host failure, delivered alert/recovery and private HTTP/queue signals',
    'incidents': 'Database/storage/API/worker/scanner/mail/provider outage and recovery matrix',
    'rotation': 'Credential/certificate rotation, partial failure recovery and named custodians',
    'email': 'SPF/DKIM/DMARC/PTR, authenticated TLS, relay rejection, inbox delivery/bounces',
    'google': 'Real customer/admin/booster callbacks, session isolation and mandatory staff MFA',
    'payments': 'Authorized live invoice/funding/IPN/reconciliation/pause/receipt evidence',
    'outgoing': 'Authorized refund and both enabled seller payout arrangement receipts',
    'journeys': 'Owner walkthrough: custom/fixed boosting, shop, resale, news and all role panels',
    'load': '100 fixture sessions,20requests/s, API/estimate targets, persisted chat<=2s and job drain',
    'frontend': 'Mobile/desktop/keyboard/reduced-motion/AT and final artifact/asset budgets',
    'content': 'Approved games, options, prices, delivery/WR/remedies and stock/capacity',
    'policies': 'Approved business/contact/support/retention/backup expiry and legal content',
    'domain': 'HTTPS/renewal, public SEO/canonical/share URLs and private noindex/cache policy',
    'owner_activation': 'Owner review and explicit activation decision; checkout/outgoing separately recorded',
}


def initialize(commit, destination):
    if not re.fullmatch(r'[a-f0-9]{40}', commit):
        raise ValueError('Use the exact intended release commit')
    root = Path(destination)
    if not root.is_absolute():
        raise ValueError('Choose a new absolute private evidence directory')
    root.mkdir(mode=0o700)
    packet = {'format': 1, 'commit': commit, 'created_at': datetime.now(timezone.utc).isoformat(),
              'measurements': {'rpo_seconds': None, 'rto_seconds': None},
              'checks': {key: {'status': 'pending', 'requirement': text, 'operator': '', 'observed_at': '', 'evidence': []} for key, text in REQUIREMENTS.items()}}
    private_write(root / 'qualification.json', json.dumps(packet, indent=2) + '\n')
    print('Private qualification packet created; every requirement starts pending')


def inspect(root, commit, at=None):
    root = Path(root)
    packet = json.loads(bounded(root / 'qualification.json'))
    if packet.get('format') != 1 or packet.get('commit') != commit or not re.fullmatch(r'[a-f0-9]{40}', commit) or set(packet.get('checks', {})) != set(REQUIREMENTS):
        raise ValueError('Qualification must cover every requirement on the exact release')
    at = at or datetime.now(timezone.utc)
    failures = []
    for key, check in packet['checks'].items():
        if check.get('status') != 'passed' or not isinstance(check.get('operator'), str) or not check['operator'].strip() or not check.get('evidence'):
            failures.append(key)
            continue
        try:
            stamp = datetime.fromisoformat(check['observed_at'].replace('Z', '+00:00'))
            if stamp.tzinfo is None or not 0 <= (at - stamp).total_seconds() <= 7 * 86400:
                raise ValueError('Evidence is stale or future dated')
            for item in check['evidence']:
                path = Path(item['file'])
                if path.is_absolute() or '..' in path.parts or not path.parts or path.is_symlink():
                    raise ValueError('Evidence must stay inside its private packet')
                target = root / path
                if not target.resolve().is_relative_to(root.resolve()):
                    raise ValueError('Evidence cannot escape its packet')
                if hashlib.sha256(bounded(target, 64 << 20)).hexdigest() != item['sha256']:
                    raise ValueError('Evidence integrity mismatch')
        except (ValueError, KeyError, TypeError, OSError):
            failures.append(key)
    for key, limit in (('rpo_seconds', 900), ('rto_seconds', 14400)):
        value = packet.get('measurements', {}).get(key)
        if type(value) not in (int, float) or not 0 <= value <= limit:
            failures.append(key)
    return sorted(set(failures))


def main():
    commit = os.environ['QUALIFICATION_COMMIT']
    directory = os.environ['QUALIFICATION_DIRECTORY']
    if sys.argv[1] == 'init':
        initialize(commit, directory)
    elif sys.argv[1] == 'check':
        failures = inspect(directory, commit)
        if failures:
            print('Launch evidence incomplete: ' + ', '.join(failures))
            raise SystemExit(1)
        print('Evidence packet complete and integrity-checked; this does not independently attest manual claims or enable sales')
    else:
        raise ValueError('Choose init or check')


if __name__ == '__main__':
    try: main()
    except (ValueError, OSError, KeyError, IndexError): raise SystemExit('Qualification configuration or evidence invalid') from None
