import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
HOSTS = ['allanpinheiro.com', 'www.allanpinheiro.com']
PHASE = '/rulesets/phases/http_request_cache_settings/entrypoint'


def read_env(path):
    values = {}
    if path.exists():
        for line in path.read_text().splitlines():
            if not line.strip() or line.lstrip().startswith('#'):
                continue
            key, sep, value = line.partition('=')
            if sep:
                values[key.strip()] = value.strip().strip('\"\'')
    return values


def settings():
    local = read_env(ROOT / '.env')
    external = os.environ.get('CLOUDFLARE_ENV_FILE', local.get('CLOUDFLARE_ENV_FILE'))
    values = {} if not external else read_env(Path(external))
    return {**values, **local, **os.environ}


def api(path, method='GET', data=None, purge=False):
    values = settings()
    token = values.get('CLOUDFLARE_PURGE_TOKEN') if purge else values.get('CLOUDFLARE_API_TOKEN')
    token = token or values.get('CLOUDFLARE_API_TOKEN')
    zone = values.get('CLOUDFLARE_ZONE_ID')
    if not token or not zone:
        raise RuntimeError('Set CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN (or CLOUDFLARE_PURGE_TOKEN) in .env')
    request = urllib.request.Request('https://api.cloudflare.com/client/v4/zones/' + zone + path,
        method=method, data=None if data is None else json.dumps(data).encode(),
        headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            result = json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError(f'Cloudflare {method} {path} returned HTTP {error.code}') from None
    if not result['success']:
        raise RuntimeError('Cloudflare rejected request: ' + json.dumps(result.get('errors', [])))
    return result['result']


def configure():
    try:
        current = api(PHASE)
    except RuntimeError as error:
        if 'HTTP 404' not in str(error):
            raise
        current = None
    own_refs = {'portfolio_static_cache', 'portfolio_status_bypass'}
    rules = [] if current is None else [
        {key: rule[key] for key in ['action', 'action_parameters', 'expression', 'description', 'enabled', 'ref'] if key in rule}
        for rule in current['rules'] if rule.get('ref') not in own_refs
    ]
    host_expression = '(http.host in {"allanpinheiro.com" "www.allanpinheiro.com"})'
    rules.extend([
        {
            'ref': 'portfolio_static_cache', 'description': 'Portfolio static content: cache until deploy',
            'expression': host_expression + ' and not starts_with(http.request.uri.path, "/api/") and http.request.uri.path ne "/version.txt"',
            'action': 'set_cache_settings', 'enabled': True,
            'action_parameters': {
                'cache': True,
                'edge_ttl': {'mode': 'respect_origin'},
                'browser_ttl': {'mode': 'respect_origin'},
            },
        },
        {
            'ref': 'portfolio_status_bypass', 'description': 'Portfolio live checks and deployment version: bypass cache',
            'expression': host_expression + ' and (starts_with(http.request.uri.path, "/api/") or http.request.uri.path eq "/version.txt")',
            'action': 'set_cache_settings', 'enabled': True,
            'action_parameters': {'cache': False, 'browser_ttl': {'mode': 'respect_origin'}},
        },
    ])
    if current:
        backup = ROOT / 'docs' / 'cache-rules-before.json'
        backup.parent.mkdir(exist_ok=True)
        if not backup.exists():
            backup.write_text(json.dumps(current, indent=2) + '\n')
        api('/rulesets/' + current['id'], 'PUT', {'rules': rules})
    else:
        api('/rulesets', 'POST', {
            'name': 'Zone cache rules', 'kind': 'zone',
            'phase': 'http_request_cache_settings', 'rules': rules,
        })
    print('Configured portfolio cache rules; unrelated rules preserved.')


if __name__ == '__main__':
    try:
        action = sys.argv[1]
        if action == 'configure':
            configure()
        elif action == 'purge':
            api('/purge_cache', 'POST', {'hosts': HOSTS}, purge=True)
            print('Purged portfolio hostnames from Cloudflare.')
        elif action == 'check':
            api('/purge_cache', 'POST', {'files': ['https://' + host + '/version.txt' for host in HOSTS]}, purge=True)
            print('Verified cache-purge credentials before deploying.')
        else:
            raise RuntimeError('Usage: python3 cache.py configure|purge|check')
    except (RuntimeError, urllib.error.URLError) as error:
        sys.exit(str(error))
