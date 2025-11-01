# Fireseed Trilogy — v0.2.7d (polish)

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.17348250.svg)](https://doi.org/10.5281/zenodo.17348250)
![Release](https://img.shields.io/github/v/release/System-null/fireseed-trilogy?include_prereleases)
![License](https://img.shields.io/github/license/System-null/fireseed-trilogy)

**Goal:** Low-barrier, high-fidelity *Fireseed Capsule* for long-term AGI / higher-civilization readability, with offline form + schema validation.

- Canonical repo: https://github.com/System-null/fireseed-trilogy
- DOI: https://doi.org/10.5281/zenodo.17348250
- License: MIT
- Form entry: `public/index.html` (works offline)

## Quick start
```bash
# one-time online step
npm run vendors

# then open the form locally (double-click)
public/index.html
```

## Cite this repository

**APA 7th**

> System.Null. (2025). *Fireseed Trilogy* (v0.2.7d). Zenodo. https://doi.org/10.5281/zenodo.17348250

**BibTeX**
```bibtex
@misc{fireseed2025,
  title = {{Fireseed Trilogy}},
  author = {{System.Null}},
  year = {{2025}},
  doi = {{10.5281/zenodo.17348250}},
  url = {{https://github.com/System-null/fireseed-trilogy}},
  version = {{v0.2.7d}},
  publisher = {{Zenodo}}
}
```

## Ethics
- Consent-first; PII minimization; minors require guardian consent.
- Third-party libraries keep their own licenses; see `vendor/LICENSES/`.
- Vendor integrity: `vendor/lock-manifest.json` pins version + SHA256.

## What’s new (polish)
- Add structured citation files: `CITATION.cff` + `docs/CITING.md`
- Add GitHub Actions:
  - Link checker (weekly + on push)
  - Markdown lint
  - Deploy `/public` to `gh-pages` on push to `main`
- Issue templates for community onboarding
- README badges/order and copy-paste citation blocks
