from html.parser import HTMLParser
from pathlib import Path
import hashlib
import json
import re
import tomllib
import unittest
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'content/demos/ai-review-triggers'
OUTPUT = ROOT / 'public/demos/ai-review-triggers'
PREVIEW_SHA256 = '41719d8797171ece361a0ca88f30e6140ff1b2dd673ee7a89dd9a74a2d366eb8'


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
                         [(s['id'], s['change']) for s in self.scenarios] * 2)
        views = {a['data-view'] for _, a in tags if 'data-view' in a}
        for view in ('dashboard', 'tasks', 'ai-systems', 'vendors', 'policies',
                     'assessments', 'risks', 'measures', 'regulations', 'triggers'):
            self.assertIn(view, views)
        for scenario in self.scenarios:
            self.assertIn('triggers/' + scenario['change'], views)
            self.assertTrue(any(scenario['id'] in a.get('data-flags', '').split() for _, a in tags))
            self.assertTrue(any(scenario['id'] in a.get('data-only', '').split() for _, a in tags))
        self.assertTrue(any(tag == 'svg' for tag, _ in tags))

    def test_simulation_first_layout_and_preview(self):
        built = (OUTPUT / 'index.html').read_text()
        preview = (ROOT / 'static/ai-review-triggers-preview.html').read_text()
        for html in (built, preview):
            with self.subTest(document='preview' if html == preview else 'built'):
                self.assertIn('aria-label="Main navigation"', html)
                self.assertFalse(any('ar-side' in a.get('class', '').split() for _, a in DemoDocument(html).tags))
                self.assertIn('>Policy sections<', html)
                self.assertIn('>Change log<', html)
                self.assertIn('change-log', {a.get('data-view') for _, a in DemoDocument(html).tags})
                home = re.split(r'data-view=["\']?dashboard["\']?', html, maxsplit=1)[1]
                home = re.split(r'data-tour=["\']?kpis["\']?', home, maxsplit=1)[0]
                self.assertIn('Simulate a change', home)
                self.assertEqual(len([a for tag, a in DemoDocument(home).tags if tag == 'button' and 'data-scenario' in a]), 5)
                self.assertIn('pre-authored', home)
                self.assertIn('AI Review Demo', html)
        self.assertNotRegex(preview, r'<(?:script|link)\b[^>]*(?:src|href)="(?:https?:|/)', re.I)

    def test_assets_and_standalone_preview(self):
        for name, tag, attr in (('demo.css', 'link', 'href'), ('demo.js', 'script', 'src')):
            self.assertEqual((OUTPUT / name).read_bytes(), (SOURCE / name).read_bytes())
            urls = [a[attr] for t, a in self.doc.tags if t == tag and attr in a]
            self.assertTrue(any(urlparse(url).path == '/demos/ai-review-triggers/' + name for url in urls))
        original = (ROOT / 'static/ai-review-triggers-preview.html').read_bytes()
        self.assertEqual(hashlib.sha256(original).hexdigest(), PREVIEW_SHA256)
        self.assertEqual((ROOT / 'public/ai-review-triggers-preview.html').read_bytes(), original)

    def test_asset_versions_match_source_sha256(self):
        for name, tag, attr in (('demo.css', 'link', 'href'), ('demo.js', 'script', 'src')):
            with self.subTest(asset=name):
                urls = [urlparse(a[attr]) for t, a in self.doc.tags if t == tag and attr in a
                        and urlparse(a[attr]).path == '/demos/ai-review-triggers/' + name]
                self.assertEqual(len(urls), 1)
                self.assertEqual(parse_qs(urls[0].query).get('v'),
                                 [hashlib.sha256((SOURCE / name).read_bytes()).hexdigest()])


if __name__ == '__main__':
    unittest.main(verbosity=2)
