# Fireseed Trilogy — v0.2.7c

> Offline-first capsule format (JSON/YAML) for AGI/High-Dimension readability + low-barrier human submission.

## What's new in v0.2.7c
- Pre-wired **official** vendor fetch with **Ajv 8.17.1** (2020-12) and **js-yaml 4.1.0** from **cdnjs**.
- Hash-locked vendor cache (`vendor/lock-manifest.json`) with computed **SHA256** on first fetch.
- Local-only form (`public/index.html`) continues to work offline after one-time vendor fetch.
- Dual-language comments (中文/English), `philosophy_ref` field in schema.

## Quick start (one-time online step)
```bash
npm run vendors   # fetch official minified builds + LICENSE texts, lock SHA256
```

Then open `public/index.html` in your browser and use the form to **validate & export** JSON / YAML.

## Legal & Ethics
- This repo is MIT-licensed; third-party libraries keep their original licenses. See `/vendor/LICENSES`.
- Submission guidance and PII minimization: `docs/SUBMISSIONS.md`.

