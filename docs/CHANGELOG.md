# Fireseed Lab Changelog

## v0.3.0 — Local Lab Milestone

- Added AES-256-GCM password-based encryption for local capsules (optional).
- Added `/verify/local` page for local ZIP verification, decryption, and plaintext re-export.
- Introduced FireseedManifest v0.1 (IndexedDB) and the `/lab` view to list known capsules and export/import manifest.json.
- Internal refactors: StorageAdapter interface, LocalZipAdapter, and ZIP parsing utilities.
