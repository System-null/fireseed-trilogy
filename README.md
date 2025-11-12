# Fireseed Trilogy — Minimal, Auditable Capsule Tooling

[![CI: build](https://github.com/System-null/fireseed-trilogy/actions/workflows/build.yml/badge.svg)](…)
[![CI: unit](https://github.com/System-null/fireseed-trilogy/actions/workflows/unit.yml/badge.svg)](…)
[![CI: compliance](https://github.com/System-null/fireseed-trilogy/actions/workflows/compliance.yml/badge.svg)](…)

**3分钟跑通（本地）**
```bash
# 1) 安装依赖
npm i
# 2) 启动演示（Next 14）
npm run dev
# 3) 打开 http://localhost:3000/keystore
#   - 注册 Passkey（WebAuthn）
#   - 进行签名；或使用 IndexedDB+SubtleCrypto 兜底签名
```

**你将得到**

* 确定性编码（DAG-CBOR） → 稳定 CID
* WebAuthn 优先的密钥 → 私钥不出硬件
* 最小演示页 `/keystore` + CSP/TrustedTypes 安全基线

**架构一览**

```
[Browser/Next] --(DAG-CBOR encode)--> [CID]
         |-- WebAuthn (TPM/Secure Enclave)
         |-- Fallback (SubtleCrypto + IndexedDB)
```

**术语对照**

* Capsule: 一份经确定性编码的文明片段（JSON → DAG-CBOR → CID）
* CID: Content ID（内容寻址哈希）
* CAR: Content Addressable aRchive（打包若干块）
* WebAuthn: 平台/安全密钥生成签名，私钥不离端

**许可**

* Code: MIT；Docs & Schemas: CC BY-4.0（详见 NOTICE 与 LICENSES/）

> 下面是原 README 的详细说明…

# Fireseed Trilogy

![Build](https://img.shields.io/badge/build-passing-brightgreen)
![Static](https://img.shields.io/badge/static-ok-brightgreen)
![Compliance](https://img.shields.io/badge/compliance-enabled-blue)
![License](https://img.shields.io/badge/license-MIT-blue)

**Project stance**: experimental toolset accompanying the Fireseed Trilogy.  
Focus: secure client-side key experience + verifiable artifacts & governance.  
Not a distributed storage network; integrations are demo-level by design.

## Licensing
- Code: MIT (LICENSE)
- Non-code content (docs/, media): CC BY 4.0 (CONTENT-LICENSE)

## Overview
Fireseed Trilogy delivers a machine-readable civilization interface that balances AGI-ready structure with approachable human contribution workflows.

## Quick Start
1. Install dependencies: `npm install`.
2. Launch the development server: `npm run dev` (Next.js on http://localhost:3000).
3. Generate and validate capsules with the web tools under `public/`.

## Link Index
- UX patch guidance: [docs/ux.md](docs/ux.md)
- Patch history & add-ons: [docs/patch-notes.md](docs/patch-notes.md)
- Security policy: [SECURITY.md](SECURITY.md)
- Roadmap: [ROADMAP.md](ROADMAP.md)
