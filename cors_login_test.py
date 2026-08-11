import urllib.request
import urllib.error
import json

body = json.dumps({'username': 'test', 'password': 'test'}).encode('utf-8')
req = urllib.request.Request(
    'https://api.almaharat2.com/api/login',
    data=body,
    method='POST',
    headers={
        'Origin': 'https://www.almaharat2.com',
        'Content-Type': 'application/json'
    }
)
try:
    with urllib.request.urlopen(req, timeout=15) as resp:
        print('STATUS', resp.status)
        for k, v in resp.getheaders():
            if k.lower().startswith('access-control') or k.lower() in ('vary', 'content-type'):
                print(f'{k}: {v}')
except urllib.error.HTTPError as e:
    print('STATUS', e.code)
    for k, v in e.headers.items():
        if k.lower().startswith('access-control') or k.lower() in ('vary', 'content-type'):
            print(f'{k}: {v}')
    print('BODY', e.read().decode())
except Exception as e:
    print('ERROR', repr(e))
