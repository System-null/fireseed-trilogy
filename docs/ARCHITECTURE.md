# Fireseed Capsule Architecture

> This document describes the technical architecture of the Fireseed Trilogy repository.  
> For a Chinese summary, see [ARCHITECTURE.zh-CN.md](ARCHITECTURE.zh-CN.md).

## 1. Goals and Non-goals

**Goals**

- Provide a **deterministic capsule format** that can be encoded, hashed, and signed in a reproducible way.
- Make capsules **machine-readable** for future AI systems while still reviewable by humans.
- Offer both **CLI tools** and a **web workspace** for creating, inspecting, and validating capsules.
- Document security assumptions and threat boundaries explicitly.

**Non-goals**

- This is *not* a key management system or secure vault.
- This is *not* a generalized distributed storage system (we rely on IPFS and external pinning).
- This is *not* a turnkey product; it is a **research prototype** and reference implementation.

---

## 2. High-level Components

### 2.1 Schemas (`schemas/`)

Defines the structure and constraints for:

- `capsule_v0` – main capsule document.
- `key-timeline` – how signing keys evolve over time.
- `revocation` – how to mark capsules or keys as revoked.

These schemas are used by both:

- CLI tools (for validation before signing).
- The web workspace (for client-side validation and UI rendering).

---

### 2.2 CLI Tools (`scripts/`)

Key scripts:

- `scripts/encode-capsule.mjs`
  - Validates a capsule against the schema.
  - Encodes it using DAG-CBOR.
  - Produces a CID (Content ID) via SHA-256.

- `scripts/sign-capsule.mjs`
  - Takes a capsule (or CID).
  - Signs the CID with an Ed25519 private key.
  - Writes back the signature and CID into a new artifact.

- `scripts/build-car.mjs`
  - Builds a CAR (Content Addressed aRchive) file for a capsule and its linked data.

The CLI layer is responsible for **deterministic behavior** and reproducible artifacts.  
It does *not* manage keys beyond a single signing operation.

---

### 2.3 Web Workspace (`app/` – Next.js)

The `app/` directory hosts a Next.js application that provides:

- A **capsule editor** (planned / WIP).
- A **keystore demo** (`/keystore`) that:
  - Prefers WebAuthn / Passkeys when available.
  - Falls back to SubtleCrypto + IndexedDB for local key storage.
- A **basic validator UI** for inspecting capsule structure and signatures.

The web app consumes the same schemas as the CLI to ensure **consistent validation rules** and to keep capsule representations interoperable across tools.

Security features:

- CSP (Content Security Policy) with nonce and Trusted Types.
- WebAuthn for hardware-backed keys where possible.
- No private keys are sent to any backend; signing happens in the browser or locally via CLI.

---

### 2.4 Static Tools (`public/`)

- `public/generator.html` – legacy static capsule generator.
- `public/validator.html` – legacy static validator for capsules.

These are kept as **offline tools** and for backward compatibility.  
Newer workflows are intended to go through the Next.js app (`app/`) and CLI (`scripts/`).

---

### 2.5 Documentation (`docs/`)

- `docs/ARCHITECTURE.md` – this document.
- `docs/ARCHITECTURE.zh-CN.md` – Chinese summary.
- `docs/threat-model.md` – high-level threat analysis.
- `docs/adr/` – Architecture Decision Records.

The documentation explains **why** the system is built this way, not just how.

---

### 2.6 CI / Workflows (`.github/workflows/`)

Typical workflows include:

- **unit.yml** – linting, unit tests, and basic integration tests.
- **compliance.yml** – SBOM generation and vulnerability scanning.
- **release.yml** – tagged releases, CAR file building, and artifact publishing.

All workflows are designed to be **non-interactive and reproducible**, avoiding manual steps during builds.

---

## 3. Capsule Data Flow

1. **Drafting & validation** – Capsules are drafted either in the Next.js workspace or via raw JSON editing. Both environments validate content against the shared schemas.
2. **Encoding** – `scripts/encode-capsule.mjs` (or equivalent logic in the web app) serializes the validated capsule as DAG-CBOR and calculates a deterministic CID using SHA-256.
3. **Signing** – `scripts/sign-capsule.mjs`, or the browser signer for WebAuthn-capable keys, signs the capsule CID with an Ed25519 private key and produces a signature artifact that references the CID.
4. **Packaging & distribution** – `scripts/build-car.mjs` assembles the capsule and supporting blocks into a CAR file for transport and publication to IPFS or other content-addressed stores. The resulting CAR and CID allow verifiers to fetch and validate the capsule independently.

This flow keeps the CLI and web workspace aligned: schemas enforce structure, shared encoding logic guarantees consistent hashes, and signatures can be verified across both interfaces.
