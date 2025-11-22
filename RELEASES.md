# Fireseed Lab Releases

## v0.3.0 — Phase 1.5: Local Fireseed Lab

**Summary**

This release marks "Phase 1.5" of the Fireseed Lab: a local-first Fireseed capsule workflow with optional encryption and a self-verifiable toolchain.

**Highlights**

- One-click local capsule generation via `/capsule/create`:
  - Structured `capsule.json`
  - `meta.json` with schema version, Fireseed Index, and `toolVersion: "0.3.0"`
  - `HUMAN_READABLE.md` as a "Rosetta layer" for humans
  - `README.txt` with backup and risk instructions
- Optional password-based encryption:
  - PBKDF2-SHA256 key derivation
  - AES-256-GCM ciphertext stored as `capsule.enc`
  - Encryption parameters (`salt`, `iv`, `iterations`, `kdf`) stored in `meta.json`
- Local verification & decryption via `/verify/local`:
  - ZIP structure inspection (schema version, capsuleId, Fireseed Index, language, encryption mode)
  - Password-based decryption performed entirely in the browser
  - Ability to export a decrypted ZIP (plaintext `capsule.json` + updated `meta.json`)
- Backward-compatible schema:
  - Existing 0.2.x FireseedCapsule structures remain valid
  - Schema evolution is additive (no breaking changes in this release)

**Intended use**

- Local "fireseed capsule" experiments
- Serious personal archives that stay under the user's control
- A reference implementation for future multi-device / multi-backend designs
