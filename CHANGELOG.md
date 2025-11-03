# Changelog
All notable changes to this repository will be documented here.

## [v0.3.1] - 2025-11-03
### Added
- `index.jsonld` (machine-readable repository index) with SHA-256 for schemas.
- `fireseed.manifest.json` (AGI bootstrap manifest).
- `.well-known/did.json` (decentralized identity anchor; placeholder public key).
- `ontology.ttl` (RDF/OWL mapping for core fields).
- `START_HERE.md` (human entry with decision map).
- `scripts/verify.sh` + `Makefile` (`make verify` outputs `reports/verification-report.json`).
- `schema-diff/README.md` placeholder for future diffs.
- `failover/` minimal seed (offline survival kit: capsule stub, mirrors).

### Notes
- This is a **structure enhancement** release. It does not alter book texts or schemas’ logic.
