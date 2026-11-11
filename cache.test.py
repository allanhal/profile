import unittest
import tempfile
from pathlib import Path
from unittest.mock import patch
import cache


class CacheRulesTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.root = patch.object(cache, 'ROOT', Path(self.directory.name))
        self.root.start()

    def tearDown(self):
        self.root.stop()
        self.directory.cleanup()

    def test_preserves_other_sites_and_limits_changes_to_portfolio(self):
        original = {'id': 'ruleset', 'rules': [{
            'id': 'other', 'ref': 'cs2', 'description': 'Existing CS2 rule',
            'expression': 'http.host eq "cs2.allanpinheiro.com"',
            'action': 'set_cache_settings', 'action_parameters': {'cache': True},
            'enabled': True,
        }]}
        with patch.object(cache, 'api', side_effect=[original, {}]) as api:
            cache.configure()
        args = api.call_args.args
        self.assertEqual(args[0], '/rulesets/ruleset')
        self.assertEqual(args[1], 'PUT')
        rules = args[2]['rules']
        self.assertEqual(rules[0]['ref'], 'cs2')
        self.assertEqual(rules[0]['action_parameters'], {'cache': True})
        self.assertEqual(len(rules), 3)
        self.assertIn('www.allanpinheiro.com', rules[1]['expression'])
        self.assertIn('not starts_with(http.request.uri.path, "/api/")', rules[1]['expression'])
        self.assertFalse(rules[2]['action_parameters']['cache'])
        self.assertEqual(rules[1]['action_parameters']['browser_ttl']['mode'], 'respect_origin')

    def test_reapplying_replaces_own_rules_without_duplicates(self):
        original = {'id': 'ruleset', 'rules': [
            {'ref': 'portfolio_static_cache'}, {'ref': 'portfolio_status_bypass'}
        ]}
        with patch.object(cache, 'api', side_effect=[original, {}]) as api:
            cache.configure()
        self.assertEqual(len(api.call_args.args[2]['rules']), 2)


if __name__ == '__main__':
    unittest.main()
