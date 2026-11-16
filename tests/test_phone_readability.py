from pathlib import Path
import re
import tomllib
import unittest

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'content/demos/ai-review-triggers'


class PhoneReadabilityTests(unittest.TestCase):
    def test_concise_impact_copy(self):
        template = (ROOT / 'templates/ai-review-triggers/triggers.html').read_text()
        self.assertIn('<span class="ar-card__hint">Illustrative impact mapping</span>', template)
        tour = tomllib.loads((SOURCE / 'tour.toml').read_text())
        text = ' '.join(step['text'] for step in tour['steps'])
        self.assertIn('These are examples.', text)
        self.assertNotIn('nothing is inferred automatically', text)

    def test_phone_readable_type_and_borderless_tour(self):
        css = (SOURCE / 'demo.css').read_text()
        phone = css.rsplit('@media (max-width: 599.98px)', 1)[1]
        for selector in ('.ar', '.ar-tour', '.ar-demo__active', '.ar-tour__text', '.ar-choice__teaser'):
            self.assertRegex(phone, re.escape(selector) + r'\s*\{[^}]*font-size:\s*(?:1[6-9]|2[0-9])px')
        self.assertRegex(phone, r'\.ar-tour__ring\s*\{[^}]*box-shadow:\s*none')
        self.assertRegex(phone, r'\.ar-tour__beacon\s*\{[^}]*display:\s*none')


if __name__ == '__main__':
    unittest.main()
