from html.parser import HTMLParser
from pathlib import Path
import hashlib
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
CROSSWALK_SHA256 = '90e5ca737280965d34a66468e4bb9d0079cb1abb6a3217171f332c5eb8db1727'

class Document(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.tags = []
        self.text = []
        self.ids = []
        self.links = []
        self.feed(html)
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.tags.append((tag, attrs))
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if tag in ('a', 'link') and 'href' in attrs:
            self.links.append(attrs['href'])
    def handle_data(self, data):
        self.text.append(data)

class PersonalHomepageTests(unittest.TestCase):
    def test_homepage_is_personal_and_credential_claim_is_limited_to_exam_pass(self):
        html = (ROOT / 'public/index.html').read_text()
        doc = Document(html)
        text = ' '.join(doc.text)
        for expected in ('Thomas Bartels', 'Passed the IAPP AIGP exam', '7 October 2026', 'Cleversoft', 'Prosegur', 'Neoris', 'AI Regulation Crosswalk', 'not legal advice', 'not affiliated with or endorsed by IAPP'):
            self.assertIn(expected, text)
        for forbidden in ('Coming soon', 'AIGP-certified', 'Certified AI Governance', 'Thomas Bartels, AIGP', '475', 'ExamTopics', '€78', 'OneTrust'):
            self.assertNotIn(forbidden, text)
        self.assertEqual(sum(tag == 'h1' for tag, _ in doc.tags), 1)
        self.assertFalse(any(tag == 'script' for tag, _ in doc.tags))
        self.assertIn('mailto:thomas.bartels@welcomeadvice.nl', doc.links)
        self.assertIn('/ai-regulation-crosswalk.html', doc.links)
        self.assertEqual(len(doc.ids), len(set(doc.ids)))
        for url in doc.links:
            if url.startswith('#'):
                self.assertIn(url[1:], doc.ids)
            if url.startswith('/'):
                path = ROOT / 'public' / url.lstrip('/').split('?')[0]
                if url.endswith('/'):
                    path = path / 'index.html'
                self.assertTrue(path.is_file(), url)
        self.assertEqual(hashlib.sha256((ROOT / 'public/ai-regulation-crosswalk.html').read_bytes()).hexdigest(), CROSSWALK_SHA256)
        self.assertTrue(any(tag == 'link' and attrs.get('rel') == 'canonical' and attrs.get('href') == 'https://welcomeadvice.nl/' for tag, attrs in doc.tags))
        self.assertFalse(re.search(r'(IAPP|AIGP).{0,15}(badge|seal|logo)', html, re.I))

if __name__ == '__main__':
    unittest.main(verbosity=2)
