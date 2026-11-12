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
PREVIEW_SHA256 = '5a76a038b1f87b604162cd681dc542f6841f49b721ae43145163872963bb7435'


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

    def test_tour_has_a_phone_and_a_desktop_path(self):
        with (SOURCE / 'tour.toml').open('rb') as f:
            steps = tomllib.load(f)['steps']
        tags = self.doc.tags
        views = {a['data-view'] for _, a in tags if 'data-view' in a}
        ids = {a['id'] for _, a in tags if 'id' in a}
        tour_hooks = {a['data-tour'] for _, a in tags if 'data-tour' in a}
        scenario_ids = {s['id'] for s in self.scenarios}
        for step in steps:
            with self.subTest(step=step['title'], device=step.get('device')):
                self.assertIn(step.get('device'), (None, 'phone', 'desktop'))
                # every step moves on with Next; no "click here" steps
                self.assertIn(step['mode'], ('modal', 'tooltip'))
                self.assertNotIn('hint', step)
                # a record route such as policies/POL-001/tasks: the view is the first two parts
                parts = step['route'].split('/')
                self.assertTrue('/'.join(parts[:2]) in views or parts[0] in views)
                self.assertIn(step['scenario'], scenario_ids | {''})
                if 'at' in step:
                    self.assertIn(step['at'], ids)
                target = step.get('target', '')
                if step['mode'] == 'tooltip':
                    self.assertTrue(target)
                for hook in re.findall(r"data-tour='([^']+)'", target):
                    self.assertIn(hook, tour_hooks)
                if target.startswith('#') and ' ' not in target:
                    self.assertIn(target[1:], ids)
        for device, low, high in (('phone', 5, 9), ('desktop', 10, 18)):
            with self.subTest(device=device):
                path = [s for s in steps if s.get('device') in (None, device)]
                self.assertEqual(path[0]['mode'], 'modal')
                self.assertEqual(path[-1]['mode'], 'modal')
                numbered = [s for s in path if s['mode'] != 'modal']
                self.assertTrue(low <= len(numbered) <= high, len(numbered))

    def test_phone_layout_and_limits(self):
        css = (SOURCE / 'demo.css').read_text()
        js = (SOURCE / 'demo.js').read_text()
        # the bottom bar, sheets and fold buttons are built by demo.js and styled for phones only
        self.assertIn('@media (max-width: 599.98px)', css)
        for hook in ('ar-tabbar', 'ar-sheet', 'ar-fold'):
            with self.subTest(hook=hook):
                self.assertIn(hook, js)
                self.assertIn('.' + hook, css)
        self.assertNotIn('min-width: 880px', css)   # tables are cards on phones, not sideways scrollers
        built = (OUTPUT / 'index.html').read_text()
        home = re.split(r'data-view=["\']?dashboard["\']?', built, maxsplit=1)[1]
        home = re.split(r'data-tour=["\']?kpis["\']?', home, maxsplit=1)[0]
        self.assertIn('Take the short tour', home)
        self.assertIn('Limits of this demo.', home)
        self.assertIn('ar-about-title', {a['id'] for _, a in self.doc.tags if 'id' in a})   # More > About links here
        # wording: the demo must not claim to monitor anything
        self.assertNotIn('watch for change', built)

    def test_assets_and_standalone_preview(self):
        for name, tag, attr in (('demo.css', 'link', 'href'), ('demo.js', 'script', 'src')):
            self.assertEqual((OUTPUT / name).read_bytes(), (SOURCE / name).read_bytes())
            urls = [a[attr] for t, a in self.doc.tags if t == tag and attr in a]
            self.assertTrue(any(urlparse(url).path == '/demos/ai-review-triggers/' + name for url in urls))
        original = (ROOT / 'static/ai-review-triggers-preview.html').read_bytes()
        self.assertEqual(hashlib.sha256(original).hexdigest(), PREVIEW_SHA256)
        self.assertEqual((ROOT / 'public/ai-review-triggers-preview.html').read_bytes(), original)

    def test_standalone_preview_matches_current_source(self):
        preview = (ROOT / 'static/ai-review-triggers-preview.html').read_text()
        self.assertEqual(json.loads(DemoDocument(preview).config_text), self.config)
        for asset in ('demo.css', 'demo.js'):
            with self.subTest(asset=asset):
                self.assertIn((SOURCE / asset).read_text(), preview)
        for text in ('Take the short tour', 'Limits of this demo.'):
            self.assertIn(text, preview)

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
