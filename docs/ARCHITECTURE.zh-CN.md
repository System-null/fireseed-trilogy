# Fireseed Capsule 架构速览

> **重要说明：** 英文版 [ARCHITECTURE.md](ARCHITECTURE.md) 才是权威且最新的技术说明，中文内容仅用于辅助理解。

## 项目目标

- 打造可重复编码、哈希并签名的 **确定性胶囊格式**。
- 让胶囊既能被未来的 AI 系统读取，也方便人类审核。
- 同时提供 **命令行工具** 与 **网页工作台** 来创建、检查、验证胶囊。
- 明确记录安全假设与威胁边界。

## 模块组成

- `schemas/`：胶囊、密钥时间线、吊销等 JSON Schema 定义，供 CLI 与网页端共享校验逻辑。
- `scripts/`：`encode-capsule.mjs`、`sign-capsule.mjs`、`build-car.mjs` 等命令行脚本，负责编码、签名、打包 CAR。
- `app/`：Next.js 网页应用，提供胶囊编辑器（规划中）、密钥演示页、基础验证界面。
- `public/`：历史遗留的静态生成与验证工具，可离线使用。
- `docs/`：架构文档、威胁模型、ADR 等资料，解释系统的设计原因。
- `.github/workflows/`：CI 流程，覆盖单测、合规扫描与发布打包。

## 数据流概览

1. 在网页或 CLI 中根据 schema 填写/验证胶囊。
2. 使用 `encode-capsule` 编码为 DAG-CBOR，并生成对应 CID。
3. 用 `sign-capsule` 结合 Ed25519 私钥对 CID 进行签名，形成签名产物。
4. 如需分发，通过 `build-car` 打包为 CAR，连同 CID 在 IPFS 等网络中流转。

## 前后端协同

- 网页端与 CLI 共用同一套 schema，以确保验证规则一致。
- 网页端偏重用户交互与浏览器内签名（WebAuthn/Passkey 或 SubtleCrypto）。
- CLI 更适合离线、自动化场景，产出确定性的编码和签名。
- 二者生成的胶囊与签名可以互相验证，满足跨工具协同需求。
