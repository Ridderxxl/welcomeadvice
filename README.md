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

## Publication boundary

This repository contains public website source only. Hosting configuration,
SSH keys, deployment credentials, operational backups and private Git history
are deliberately excluded. Building produces `public/`, which is not committed.
A pull request does not deploy the website. Publishing requires a separate,
authorized upload using private hosting configuration.

## Reuse

No open-source licence has been selected. Public visibility is not a licence
to redistribute the project. Ask the owner before reusing its content or code.
