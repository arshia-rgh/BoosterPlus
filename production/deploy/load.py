"""Bounded fixture-only HTTP workload. Never accepts public provider/production URLs."""
from concurrent.futures import ThreadPoolExecutor
import json
import math
import os
from pathlib import Path
import re
import ssl
import time
import urllib.error
import urllib.request
from urllib.parse import urlsplit
import uuid

from artifacts import bounded
from provision import private_write
from smoke import NoRedirect


def validate(plan):
    origin = urlsplit(plan.get('origin', ''))
    if origin.scheme != 'https' or origin.hostname not in ('localhost', '127.0.0.1') or not origin.port or origin.username or origin.password or origin.path or origin.query or origin.fragment:
        raise ValueError('Load tests require an isolated loopback HTTPS gateway')
    if plan.get('acknowledgement') != 'isolated-fixtures-no-live-provider' or not re.fullmatch(r'boosterplus-load-[a-f0-9]{12}', plan.get('project', '')):
        raise ValueError('Load requires a separately provisioned, explicitly acknowledged fixture project')
    sessions = plan.get('sessions', [])
    if len(sessions) != 100 or len({s.get('fixture_id') for s in sessions}) != 100:
        raise ValueError('Qualify exactly 100 distinct active fixture sessions')
    for session in sessions:
        if not re.fullmatch(r'[a-z0-9-]{1,64}', session.get('fixture_id', '')) or not session.get('steps') or len(session['steps']) > 10:
            raise ValueError('Each fixture session needs a bounded workflow')
        for step in session['steps']:
            if step.get('method') not in ('GET', 'POST') or step.get('class') not in ('ordinary', 'estimate', 'chat') or not re.fullmatch(r'/api/v1/[a-zA-Z0-9/_-]+', step.get('path', '')) or step.get('expected_status') not in (200, 201, 202, 204):
                raise ValueError('Invalid fixture API step')
            if len(json.dumps(step.get('body', {}))) > 16384 or set(step.get('headers', {})) - {'Cookie', 'X-CSRF-Token', 'Content-Type', 'Origin'}:
                raise ValueError('Invalid bounded fixture request')
            if step.get('headers', {}).get('Origin', plan['origin']) != plan['origin']:
                raise ValueError('Fixture CSRF origin must match the isolated gateway')
    return plan


def request(plan, session, index, opener):
    step = session['steps'][index % len(session['steps'])]
    body = json.dumps(step.get('body', {})).replace('__REQUEST_ID__', str(uuid.uuid4())).encode() if step['method'] == 'POST' else None
    request = urllib.request.Request(plan['origin'] + step['path'], data=body, method=step['method'], headers=step.get('headers', {}))
    started = time.monotonic()
    passed = False
    try:
        with opener.open(request, timeout=5) as response:
            payload = response.read((1 << 20) + 1)
            passed = response.status == step['expected_status'] and len(payload) <= 1 << 20
    except (OSError, urllib.error.URLError):
        pass
    return {'class': step['class'], 'elapsed_ms': (time.monotonic() - started) * 1000, 'passed': passed}


def summarize(samples, elapsed, scheduled):
    result = {'scheduled': scheduled, 'completed': len(samples), 'elapsed_seconds': elapsed, 'errors': sum(not s['passed'] for s in samples), 'classes': {}}
    for kind, target in (('ordinary', 500), ('estimate', 750), ('chat', 2000)):
        values = sorted(s['elapsed_ms'] for s in samples if s['class'] == kind)
        p95 = values[math.ceil(len(values) * .95) - 1] if values else None
        result['classes'][kind] = {'samples': len(values), 'p95_ms': p95, 'target_ms': target}
    result['passed'] = len(samples) == scheduled and result['errors'] == 0 and elapsed <= scheduled / 20 + 10 and all(v['samples'] >= 100 and v['p95_ms'] < v['target_ms'] for v in result['classes'].values())
    result['limits'] = ['Fixture HTTP response latency only; separately measure persisted chat visibility and job drain', 'No live provider/funds qualification', 'Record hardware, dataset and fixture construction with this result']
    return result


def main():
    source = Path(os.environ['LOAD_PLAN'])
    if source.stat().st_mode & 0o077:
        raise ValueError('Load plan contains session credentials and must be private')
    plan = validate(json.loads(bounded(source, 4 << 20)))
    context = ssl.create_default_context(cafile=os.environ['LOAD_CA_FILE'])
    target = Path(os.environ['LOAD_REPORT'])
    if not target.is_absolute() or target.exists():
        raise ValueError('Choose a new absolute private load report')
    # Every session owns its opener; at most one in-flight request per session.
    openers = [urllib.request.build_opener(NoRedirect(), urllib.request.HTTPSHandler(context=context)) for _ in range(100)]
    started = time.monotonic()
    results = []
    active = {}
    with ThreadPoolExecutor(max_workers=100) as pool:
        for i in range(6000):
            delay = started + i / 20 - time.monotonic()
            if delay > 0: time.sleep(delay)
            session = i % 100
            if session in active:
                previous = active.pop(session)
                if not previous.done():
                    # No coordinated omission: an overloaded session is a failure.
                    results.append({'class': 'ordinary', 'elapsed_ms': 5000, 'passed': False})
                    active[session] = previous
                    continue
                results.append(previous.result())
            active[session] = pool.submit(request, plan, plan['sessions'][session], i // 100, openers[session])
        results.extend(future.result() for future in active.values())
    result = summarize(results, time.monotonic() - started, 6000)
    result.update(project=plan['project'], fixture_sessions=100, target_requests_per_second=20)
    private_write(target, json.dumps(result, indent=2))
    if not result['passed']:
        raise RuntimeError('Isolated load targets failed; inspect the private numeric report')
    print('Fixture HTTP workload met recorded targets; separate job/chat visibility and server acceptance remain required')


if __name__ == '__main__':
    try: main()
    except (ValueError, RuntimeError, OSError, KeyError): raise SystemExit('Load qualification failed; inspect private configuration/results') from None
