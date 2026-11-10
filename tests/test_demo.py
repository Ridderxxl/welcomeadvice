from html.parser import HTMLParser
from pathlib import Path
import hashlib
import json
import tomllib
import unittest
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'content/demos/ai-review-triggers'
OUTPUT = ROOT / 'public/demos/ai-review-triggers'
PREVIEW_SHA256 = '69a55a48c5d2fa6621cba66aee1186bc7d9399250ad77c5613bc539f7ad78b46'


class DemoDocument(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.tags = []
        self.config_text = ''
        self.in_config = False
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.tags.append((tag, attrs))
        if tag == 'script' and attrs.get('id') == 'ar-config':
            self.in_config = True

    def handle_endtag(self, tag):
        if tag == 'script':
            self.in_config = False

    def handle_data(self, data):
        if self.in_config:
            self.config_text += data


class DemoTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.doc = DemoDocument((OUTPUT / 'index.html').read_text())
        cls.config = json.loads(cls.doc.config_text)
        with (SOURCE / 'scenarios.toml').open('rb') as f:
            cls.scenarios = tomllib.load(f)['scenarios']

    def test_config_matches_source(self):
        with (SOURCE / 'tour.toml').open('rb') as f:
            tour = tomllib.load(f)['steps']
        self.assertEqual(self.config['product'], 'AI Review Demo')
        self.assertEqual(self.config['tour'], tour)
        self.assertEqual(self.config['scenarios'], [
            {k: scenario[k] for k in ('id', 'name', 'change')}
            for scenario in self.scenarios
        ])
        self.assertEqual(len(self.scenarios), 5)

    def test_scenario_controls_and_routes(self):
        tags = self.doc.tags
        choices = [attrs for tag, attrs in tags if tag == 'button' and 'data-scenario' in attrs]
        self.assertEqual([(a['data-scenario'], a['data-change']) for a in choices],
                         [(s['id'], s['change']) for s in self.scenarios])
        views = {a['data-view'] for _, a in tags if 'data-view' in a}
        for view in ('dashboard', 'tasks', 'ai-systems', 'vendors', 'policies',
                     'assessments', 'risks', 'measures', 'regulations', 'triggers'):
            self.assertIn(view, views)
        for scenario in self.scenarios:
            self.assertIn('triggers/' + scenario['change'], views)
            self.assertTrue(any(scenario['id'] in a.get('data-flags', '').split() for _, a in tags))
            self.assertTrue(any(scenario['id'] in a.get('data-only', '').split() for _, a in tags))
        self.assertTrue(any(tag == 'svg' for tag, _ in tags))

    def test_assets_and_standalone_preview(self):
        for name, tag, attr in (('demo.css', 'link', 'href'), ('demo.js', 'script', 'src')):
            self.assertEqual((OUTPUT / name).read_bytes(), (SOURCE / name).read_bytes())
            urls = [a[attr] for t, a in self.doc.tags if t == tag and attr in a]
            self.assertTrue(any(urlparse(url).path == '/demos/ai-review-triggers/' + name for url in urls))
        original = (ROOT / 'static/ai-review-triggers-preview.html').read_bytes()
        self.assertEqual(hashlib.sha256(original).hexdigest(), PREVIEW_SHA256)
        self.assertEqual((ROOT / 'public/ai-review-triggers-preview.html').read_bytes(), original)


if __name__ == '__main__':
    unittest.main(verbosity=2)
