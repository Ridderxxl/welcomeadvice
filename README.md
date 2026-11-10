# Welcome Advice

Source for Thomas Bartels's personal website at https://welcomeadvice.nl.
Built with Zola; content, templates and styles are versioned together.

## Build and verify

Requirements: Zola 0.23.6 and Python 3.11 or newer. No Python packages are required.

    zola build
    python3 -m unittest discover -s tests -v
    zola check

For a local browser preview:

    zola serve

## Editing

- Introduction and contact: `content/_index.md`.
- Homepage layout: `templates/index.html`.
- Homepage styling: `static/style.css`.
- Existing standalone crosswalk: `static/ai-regulation-crosswalk.html`.

The homepage states an AIGP exam pass, not a verified active certification.
Learning materials are not legal advice or endorsed by IAPP.

## AI review triggers — Brussels demo

After building, open `/demos/ai-review-triggers/`. The companion HTML is at
`/ai-review-triggers-preview.html`. Both use the neutral label **AI Review Demo**.

- Demo introduction and banner: `content/demos/ai-review-triggers/index.md`.
- AI systems and vendors: `inventory.toml` in the same directory.
- Policies, assessments, risks and measures: `governance.toml`.
- Tasks, simulated changes and guided tour: `tasks.toml`, `scenarios.toml`, `tour.toml`.
- Interaction and styling: `demo.js`, `demo.css`.
- Page structure: `templates/ai-review-triggers.html` and its template directory.

Make edits in these source files, rebuild, run the tests, and submit a PR.
The templates are adapted to Zola 0.23.6. The standalone HTML is a supplied
snapshot with its product label renamed, not the editable source of the generated demo; it does not
automatically update when the source changes.

The demo uses pre-authored scenario flags, not an automatic dependency-analysis
engine. Banco Salamanca and its records are fictional. Regulation-change announcements
are simulated, not current legal updates. Case classifications illustrate the
supplied scenario and are not legal advice or validated compliance assessments.
The live demo banner repeats the fictional/not-legal-advice notice; the
standalone HTML otherwise retains the supplied snapshot content.

The homepage links to the demo through navigation and a live-demo card. The
existing crosswalk is preserved. Zola may report the demo as an orphan page. This is not a
build error. No hosting or automated deployment is configured in this repo.

## Publication boundary

This repository contains public website source only. Hosting configuration,
SSH keys, deployment credentials, operational backups and private Git history
are deliberately excluded. Building produces `public/`, which is not committed.
A pull request does not deploy the website. Publishing requires a separate,
authorized upload using private hosting configuration.

## Reuse

No open-source licence has been selected. Public visibility is not a licence
to redistribute the project. Ask the owner before reusing its content or code.
