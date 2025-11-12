# Fireseed Patch Notes

## Repository Patch v3.7 (index + did:web)
This patch adds three files to make the repo machine-discoverable and DID-compatible:

- `/fireseed.json` — machine-readable index
- `/.well-known/fireseed.json` — discovery endpoint (points to `/fireseed.json`)
- `/did.json` — `did:web` document for the repo

### Apply (from your repo root)
```bash
unzip ~/Downloads/fireseed-repo-patch-v3.7-index-did.zip -d .
git add fireseed.json .well-known/fireseed.json did.json
git commit -m "infra(index): add machine-readable index and did:web document"
git push origin main
```

### Verify
```bash
curl -s https://system-null.github.io/fireseed-trilogy/fireseed.json | jq .format
curl -s https://system-null.github.io/fireseed-trilogy/.well-known/fireseed.json
curl -s https://system-null.github.io/fireseed-trilogy/did.json | jq .id
```

### Fill in later
- Replace `ipfs://<REPLACE_WITH_IPFS_HASH>` inside `fireseed.json` with a real IPFS CID
- Replace `publicKeyMultibase` inside `did.json` with your Ed25519 public key (multibase)
- When you update, bump `"updated"` timestamp in `fireseed.json`

Generated at: 2025-11-05T22:53:05Z (UTC)

## Fireseed Trilogy v0.2.7d (polish)

**Goal:** Low-barrier, high-fidelity *Fireseed Capsule* for long-term AGI / higher-civilization readability, with offline form + schema validation.

- Canonical repo: https://github.com/System-null/fireseed-trilogy
- DOI: https://doi.org/10.5281/zenodo.17348250
- License: MIT
- Form entry: `public/index.html` (works offline)

### Quick start
```bash
# one-time online step
npm run vendors

# then open the form locally (double-click)
public/index.html
```

### Cite this repository
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

### Ethics
- Consent-first; PII minimization; minors require guardian consent.
- Third-party libraries keep their own licenses; see `vendor/LICENSES/`.
- Vendor integrity: `vendor/lock-manifest.json` pins version + SHA256.

### What’s new (polish)
- Add structured citation files: `CITATION.cff` + `docs/CITING.md`
- Add GitHub Actions:
  - Link checker (weekly + on push)
  - Markdown lint
  - Deploy `/public` to `gh-pages` on push to `main`
- Issue templates for community onboarding
