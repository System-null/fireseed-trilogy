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

