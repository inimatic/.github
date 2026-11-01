"""No shell composition or general-purpose administrative SSH credentials."""
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile

HOSTS = {'global': '91.98.90.254', 'ru': '37.143.14.10'}


def targets_document(raw):
    targets = json.loads(raw)
    if not isinstance(targets, list) or len(targets) != 2:
        raise ValueError('two declared Root destinations are required')
    zones = set()
    for target in targets:
        if not isinstance(target, dict) or set(target) != {'zone', 'host', 'user', 'key'}:
            raise ValueError('unexpected target fields')
        if target['zone'] in zones or HOSTS.get(target['zone']) != target['host'] or target['user'] != 'inimatic-ci':
            raise ValueError('target is not a declared forced-command Root identity')
        if not isinstance(target['key'], str) or not target['key'].startswith('-----BEGIN OPENSSH PRIVATE KEY-----'):
            raise ValueError('dedicated SSH identity is missing')
        zones.add(target['zone'])
    return sorted(targets, key=lambda value: value['zone'] != 'ru')


def main():
    targets = targets_document(os.environ['DELIVERY_TARGETS'])
    revision = os.environ['DELIVERY_REVISION']
    if not re.fullmatch('[0-9a-f]{40}', revision):
        raise ValueError('full source revision is required')
    request = {'schema': 'inimatic.root_ci_request.v1', 'kind': os.environ['DELIVERY_KIND'],
               'revision': revision, 'run_id': int(os.environ['DELIVERY_RUN_ID']),
               'run_attempt': int(os.environ['DELIVERY_RUN_ATTEMPT']),
               'token': os.environ['DELIVERY_TOKEN'], 'dry_run': os.environ['DELIVERY_DRY_RUN'] == 'true'}
    if request['kind'] == 'backend':
        request['image'] = os.environ['DELIVERY_IMAGE']
    with tempfile.TemporaryDirectory(prefix='root-ci-', dir=os.environ['RUNNER_TEMP']) as directory:
        key = Path(directory) / 'id_ed25519'
        for target in targets:
            key.write_text(target['key'].replace('\r\n', '\n'))
            key.chmod(0o600)
            command = ['ssh', '-i', str(key), '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes',
                       '-o', 'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=15',
                       '-o', 'ServerAliveInterval=15', '-o', 'ServerAliveCountMax=4',
                       '-o', 'UserKnownHostsFile=' + str(Path(__file__).with_name('known_hosts')),
                       'inimatic-ci@' + target['host'], 'deliver']
            result = subprocess.run(command, input=json.dumps(request).encode(), capture_output=True, timeout=2400)
            if result.returncode:
                # Child diagnostics and credentials never enter Actions logs.
                reason = ''
                try:
                    candidate = json.loads(result.stdout).get('reason', '')
                    if re.fullmatch('[a-z_]{1,80}', candidate):
                        reason = '; ' + candidate
                except (ValueError, AttributeError, TypeError):
                    pass
                raise RuntimeError('Root admission failed for ' + target['zone'] + '; exit ' + str(result.returncode) + reason)
            receipt = json.loads(result.stdout)
            if receipt.get('ok') is not True:
                raise RuntimeError('Root did not accept the release for ' + target['zone'])
            print(json.dumps({'zone': target['zone'], **receipt}), flush=True)


if __name__ == '__main__':
    main()
