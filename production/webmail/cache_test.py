"""Check only the isolated webmail fixture on loopback19443, never a mailbox."""
import json
import subprocess


def check(path, asset=False, status=200):
    result = subprocess.run([
        'curl', '--noproxy', '*', '--resolve', 'mail.playoragames.com:19443:127.0.0.1',
        '--connect-timeout', '5', '--max-time', '15', '--silent', '--show-error',
        '--header', 'Accept-Encoding: gzip', '--dump-header', '-', '--output', '/dev/null',
        '--write-out', 'bytes=%{size_download} seconds=%{time_total}\n',
        'https://mail.playoragames.com:19443' + path,
    ], capture_output=True, text=True, check=True)
    lines = result.stdout.lower().splitlines()
    assert any(line.startswith('http/') and line.split()[1] == str(status) for line in lines)
    assert ('cache-control: private, max-age=86400' if asset else 'cache-control: no-store') in lines
    assert ('content-encoding: gzip' in lines) == asset
    return {'path': path, 'asset': asset, 'status': status, 'transfer': lines[-1]}


if __name__ == '__main__':
    results = [check('/'), check('/?_task=mail'),
               check('/?_task=mail&_action=get&_uid=1&_mbox=INBOX'),
               check('/static.php/program/js/jquery.min.js', True),
               check('/static.php/skins/elastic/deps/bootstrap.min.css', True),
               check('/static.php/plugins/playora_support/template.js', True),
               check('/static.php/config/config.inc.php', status=404),
               check('/static.php/skins/elastic/templates/compose.html', status=404)]
    print(json.dumps(results, indent=2))
