# Fireseed Trilogy – Machine-Readable Capsule Format

> 🌏 This is the **English** README.  
> 如果你更习惯阅读中文，请查看 [中文版说明 (README.zh-CN.md)](README.zh-CN.md)。

Fireseed Trilogy is an experiment in building a **machine-readable “capsule” format** for preserving human life stories, values, and decisions in a way that future AI systems can parse without guessing.

Current status: Public experimental release with local-only capsules, optional AES-256-GCM encryption, Fireseed Lab manifest, BYO IPFS adapter hooks, M-Disc export, QR clue cards, and an Arweave DIY (self-hosted) adapter guide.

## Fireseed Lab v0.3.0 – Local Capsule Lab

- `/capsule/create` — One-click capsule generator with optional AES-256-GCM encryption.
- `/verify/local` — Local ZIP verification & decryption (browser-only, no upload).
- `/lab` — Fireseed Lab: local manifest viewer, M-Disc export, QR clue cards, BYO IPFS adapter.

CID-level inspection is planned for a future version.

v0.3.0 is the first stable milestone for the “local-only” Fireseed Lab (no remote storage, no accounts).

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

### 2.3 Legacy static generator i18n overlay

The legacy static generator lives at `public/generator.html`. To keep its language switch working when served from GitHub Pages or another static host:

1. Make sure `public/lang/*.json` and `public/scripts/fireseed-i18n-overlay.v3.0.js` are present in your `public/` directory.
2. Before `</body>`, include the overlay script tag:

   ```html
   <script src="./scripts/fireseed-i18n-overlay.v3.0.js"></script>
   ```

3. Run the init patch to insert the non-intrusive i18n bootstrap snippet:

   ```bash
   bash patch_i18n_init.sh
   ```

4. Commit the resulting `public/generator.html` (and any updated assets), push, and open `/public/generator.html` on your static host. If the page was cached, force refresh.

---

## Fireseed Lab (Phase 2.0 preview)

The repository now exposes Phase 2.0 building blocks:

- One-click local capsule generation via `/capsule/create`.
- Local verification and decryption via `/verify/local`.
- A Fireseed Lab view at `/lab` that lists capsules known to your local **FireseedManifest**, with export/import for the manifest itself.

The **FireseedManifest** acts as a local index for capsules and the basis for managing multiple replicas in future adapters.

---

## Fireseed Lab – Phase 2.1

Phase 2.1 turns the project from a "one-off capsule generator" into a minimal **personal Fireseed workstation**:

- **Capsule Lab (/lab):**
  - Lists all locally known capsules from the Fireseed Manifest.
  - Supports filtering by encryption mode (plain/encrypted), status (draft/final/archived), and primary language.
  - Allows updating per-capsule status (e.g. mark as "final" or "archived") and marking whether it has been backed up on multiple media.
  - Provides a **doc-only Arweave DIY path** for advanced, self-hosted uploads (no keys or uploads handled by this project).

- **Creation wizard (/capsule/create):**
  - Still provides one-click capsule generation with optional AES-256-GCM encryption (password-based, local-only).
  - Fireseed Index is now explained as a breakdown (information density, structure, timeline, decision traces) with lightweight suggestions to improve the narrative.
  - Placeholders and helper texts adapt to the selected primary language (Chinese / English) to reduce friction.

- **Local verification (/verify/local):**
  - Verifies Fireseed capsule ZIPs entirely in the browser (no upload).
  - Shows a "Capsule Health Report" (schema version, encryption mode, Fireseed Index, timestamps, tool version).
  - For unknown capsules, offers a one-click "Add to Lab manifest" action to register it in the local Fireseed Manifest.

Additional adapters & docs:

- **Arweave (DIY adapter):** Self-hosted path; use your own Arweave/Bundlr tools to upload a Fireseed capsule ZIP and manually register an `ar://<txId>` replica in your manifest. See [`docs/ADAPTER-ARWEAVE.md`](./docs/ADAPTER-ARWEAVE.md). The project does **not** handle keys or on-chain uploads for you.

The Phase 2.1 additions stay aligned with the local-first, no-accounts, no-server-storage philosophy.

---

## Advanced tools

- Capsule Workspace: edit and validate `capsule.json` in a dedicated view.
- Local ZIP verification: `/verify/local`, parses structure, checks encryption, and supports password-based decryption.

CID-level inspection is planned for a future version.

---

## Current milestone — v0.3.0 (Phase 1.5)

The current tagged state of this repo corresponds to **Fireseed Lab v0.3.0**, also referred to as **Phase 1.5**:

- Local-first, one-click Fireseed capsule generation
- Optional password-based encryption (PBKDF2 + AES-256-GCM)
- Local verification and decryption via `/verify/local`
- Ability to export a decrypted capsule ZIP (plaintext `capsule.json`)

The underlying **FireseedCapsule schema** remains in the `0.2.x` line: evolution in this release is additive and backwards-compatible. Phase 2+ (remote storage, multi-replica syncing, etc.) is planned but not yet implemented.

---

## Fireseed Capsule（Phase 1：本地实验版）
## Fireseed Capsule (Phase 1: Local Experimental MVP)

- 当前支持 / Currently supports:
  - 在 `/capsule/create` 页面填写标题、场景和正文。  
    Fill in title, scenario, and body on the `/capsule/create` page.
  - 一键生成本地 Fireseed Capsule 压缩包（ZIP），包含：  
    One-click generation of a local Fireseed Capsule ZIP, including:
    - `capsule.json`：结构化胶囊。  
      `capsule.json`: Structured capsule.
    - `meta.json`：版本、时间戳、Fireseed Index 指标。  
      `meta.json`: Schema version, timestamp, and Fireseed Index metrics.
    - `HUMAN_READABLE.md`：人类可读视图。  
      `HUMAN_READABLE.md`: Human-readable view.
    - `README.txt`：使用说明。  
      `README.txt`: Usage notes.

- Fireseed Index 是什么？  
  What is the Fireseed Index?

  - 它是一个 0–100 的启发式评分，用来度量文本在以下维度上的“结构化描述质量”：  
    It is a heuristic 0–100 score measuring the “structured description quality” of the text across:
    - 篇幅与信息量 / Length & information
    - 词汇丰富度 / Lexical richness
    - 结构组织 / Structural organization
    - 时间跨度 / Time span coverage
    - 决策与逻辑 / Decisions & reasoning
    - 情绪与价值词 / Emotion & value words

  - 它不是对人生本身的评分，也不是任何形式的价值审判；  
    It is not a score on your life itself, nor any kind of moral judgment.
  - 它只是方便未来系统快速理解文本结构和信息密度的技术指标。  
    It is only a technical indicator to help future systems quickly grasp structure and information density.

- 当前阶段 / Current stage:

  - Schema 仍处于 `v0.2.x`，未来可能演进到 `v1.0`。  
    The schema is currently at `v0.2.x` and may evolve to `v1.0` in the future.
  - 生成的胶囊主要用于实验与自测，不推荐视作最终归档格式。  
    Generated capsules are mainly for experimentation and self-testing, not yet a final archival format.

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

### Security notes

Fireseed Lab is an experimental, local-first toolset.  
See [docs/SECURITY-NOTES.md](docs/SECURITY-NOTES.md) for the current threat model and security assumptions.

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

