import importlib.util
import json
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('root_transport', Path(__file__).parent.parent / '.github/actions/root-delivery/deliver.py')
transport = importlib.util.module_from_spec(spec)
spec.loader.exec_module(transport)


class TargetTests(unittest.TestCase):
    def targets(self):
        return [{'zone': zone, 'host': host, 'user': 'inimatic-ci',
                 'key': '-----BEGIN OPENSSH PRIVATE KEY-----\nfixture\n-----END OPENSSH PRIVATE KEY-----'}
                for zone, host in transport.HOSTS.items()]

    def test_only_two_declared_destinations_and_restricted_identity_are_admitted(self):
        result = transport.targets_document(json.dumps(self.targets()))
        self.assertEqual([target['zone'] for target in result], ['ru', 'global'])

    def test_rejects_arbitrary_host_root_identity_duplicate_and_injected_transport(self):
        for changes in [{'host': '127.0.0.1'}, {'host': '-oProxyCommand=id'}, {'user': 'root'},
                        {'port': 22}, {'zone': 'ru'}, {'key': 'PRIVATE_MARKER'}]:
            with self.subTest(changes=changes):
                targets = self.targets()
                targets[0].update(changes)
                with self.assertRaises(ValueError) as caught:
                    transport.targets_document(json.dumps(targets))
                self.assertNotIn('PRIVATE_MARKER', str(caught.exception))

    def test_rejects_missing_targets(self):
        for targets in [[], self.targets()[:1], self.targets() * 2, {}]:
            with self.assertRaises(ValueError):
                transport.targets_document(json.dumps(targets))


if __name__ == '__main__':
    unittest.main()
