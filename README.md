# Fireseed Trilogy – Machine-Readable Capsule Format

> 🌏 This is the **English** README.  
> 如果你更习惯阅读中文，请查看 [中文版说明 (README.zh-CN.md)](README.zh-CN.md)。

Fireseed Trilogy is an experiment in building a **machine-readable “capsule” format** for preserving human life stories, values, and decisions in a way that future AI systems can parse without guessing.

This repository contains:

- A **Capsule schema** (YAML/JSON) with strong typing and validation.
- A **deterministic signer** that turns a capsule into a DAG-CBOR CID and Ed25519 signature.
- A **web workspace** (Next.js) for interactive capsule creation and inspection.
- Security and ethics docs that describe the intended threat model and usage boundaries.

> Status: early-stage, experimental, not production-grade for high-value secrets.

---

## 1. Project Structure

High-level layout of this repository:

- `schemas/` – JSON Schemas for `capsule_v0`, key timelines, and revocation lists.
- `scripts/` – Node.js tools for deterministic encoding, signing, and CAR building.
- `app/` – Next.js application (capsule workspace, keystore demo, validator).
- `public/` – Static HTML tools (legacy generator / validator) and assets.
- `docs/` – Architecture notes, threat model and ADRs (Architecture Decision Records).
- `.github/workflows/` – CI pipelines (tests, lint, SBOM, basic security checks).

For a deeper view of how these parts connect, see  
**[Architecture Overview](docs/ARCHITECTURE.md)**.

---

## 2. Quick Start

### 2.1 Install

```bash
git clone https://github.com/System-null/fireseed-trilogy.git
cd fireseed-trilogy
npm install
```

### 2.2 Run the web workspace

```bash
npm run dev
# open http://localhost:3000
```

In the browser you can:

- Explore the capsule workspace.
- Use the keystore demo to test WebAuthn + IndexedDB fallback.
- Inspect how a capsule is structured before signing.

---

## 3. Capsule Format

A capsule is a structured document that describes:

- **Who**: identity, roles, relationships.
- **What**: life events, decisions, commitments.
- **Why**: value system, constraints, and “non-negotiables”.
- **Evidence**: links, hashes, references to external artifacts.

Key goals:

- **Deterministic**: same content ⇒ same CID.
- **Machine-readable**: strong schema, no hidden assumptions.
- **Human-auditable**: writable and reviewable by non-programmers.

See the schema docs for details:  
`schemas/` and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## 4. Signing & Verification

The repository currently includes:

- A Node.js signer (`scripts/sign-capsule.mjs`) that:
  - Encodes a capsule via DAG-CBOR.
  - Computes a CID.
  - Signs the CID with Ed25519.
- A Next.js keystore demo that:
  - Prefers WebAuthn / Passkeys where possible.
  - Falls back to SubtleCrypto + IndexedDB in the browser.

⚠️ **Important**: Do not put high-value secrets in this system. Treat it as a research prototype for structured “life capsules”, not as a secure vault.

---

## 5. Security & Threat Model

This repo includes:

- `SECURITY.md` – how to report vulnerabilities and what we consider in scope.
- `docs/threat-model.md` – what we assume and what we explicitly do not protect against.
- `docs/adr/` – selected design decisions (deterministic encoding, CID choices, etc.).

Security is a moving target. If in doubt, assume this is not safe for irreversible, high-stakes archives.

---

## 6. Contributing

Contributions are welcome, especially in the following areas:

- Better schemas and validation for capsule content.
- Stronger, more auditable signing and key management.
- Independent implementations in other languages.
- Better UIs for non-technical users.

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening issues or PRs.

---

## 7. License

- **Code**: MIT License
- **Textual content**: CC BY 4.0

