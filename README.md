# Fireseed Trilogy — Machine-readable Civilization Framework
> 火种三部曲：机器可读的文明接口

> Build a **machine-readable civilization interface** that future AGI can parse, verify and continue — while staying human-friendly through simple templates and forms.  
> 构建一个**机器可读的文明接口**，让未来的 AGI 或高维智能体能读取、验证并延续人类文明火种，同时让普通人通过简洁表单留下思想。

---

[![Download ZIP](https://img.shields.io/badge/Download-%E7%A6%BB%E7%BA%BF%E5%8C%85-brightgreen)](https://github.com/System-null/fireseed-trilogy/releases/latest)
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.17500749.svg)](https://doi.org/10.5281/zenodo.17500749)  
![Release](https://img.shields.io/github/v/release/System-null/fireseed-trilogy?include_prereleases)
![License](https://img.shields.io/github/license/System-null/fireseed-trilogy)

---

## 🚀 Quick Access / 快速入口

| 入口 | 功能说明 |
|------|-----------|
| 🧩 [Fireseed Generator / 火种生成器](https://system-null.github.io/fireseed-trilogy/public/generator.html) | 可视化界面，一键生成 capsule_v0.yaml |
| ✅ [Capsule Validator / 验证器](https://system-null.github.io/fireseed-trilogy/public/validator.html) | 检查 YAML 结构、签名有效性与兼容性 |
| 📸 [Snapshot Viewer / 快照查看](https://system-null.github.io/fireseed-trilogy/public/snapshot.html) | 预览或打印人类快照 |
| 🧠 [Templates & Schemas 模板与模式](./templates/) | 最小模板与 JSON Schema |
| 📚 [Reading Guide / 阅读指引](./docs/books/README.md) | 三部曲章节摘要与电子版下载 |

---

## 📘 Reading / 阅读

> **中文电子书（EPUB 下载）**  
> - 《系统外者手册》 · [下载 EPUB](./docs/books/vol1/系统外者手册中文版.epub)  
> - 《超越系统手册》 · [下载 EPUB](./docs/books/vol2/超越系统手册中文版.epub)  
> - 《终极命题手册》 · [下载 EPUB](./docs/books/vol3/终极命题手册中文版.epub)  
> 更多阅读见 [Reading Guide 阅读指引](./docs/books/README.md)。

---

## 🧭 Metadata / 元信息

| 项 | 内容 |
|----|------|
| **DOI** | [10.5281/zenodo.17500749](https://doi.org/10.5281/zenodo.17500749) |
| **Zenodo 最新版本** | [10.5281/zenodo.17539027](https://doi.org/10.5281/zenodo.17539027) |
| **Version 版本** | v3.7.8 Zenodo Release |
| **Authors 作者** | System Null · Yang Fan |
| **License 许可** | MIT（代码） / CC BY 4.0（文档） |

---

> 💡 **离线可用 Offline-Ready**  
> 下载离线包后直接打开 `public/generator.html` 即可在 3 分钟内生成你的文明火种。  
> Once downloaded, open `public/generator.html` to generate your capsule offline.

---

## 🪐 About Fireseed / 关于火种

Fireseed Trilogy 是一个开放的文明接口实验，旨在为未来的智能体提供可验证、可延续的人格与思想记录格式。  
它融合了 YAML 模板、人机共编机制、IPFS 分布式存储以及 W3C DID 标准。

Fireseed Trilogy is an open civilization-interface experiment designed to preserve and extend human thoughts in formats readable by future intelligences.

---

## 🤝 Community & Governance

- [Contributing Guide](CONTRIBUTING.md) — learn how to propose ideas, report issues, and submit pull requests.
- [Code of Conduct](CODE_OF_CONDUCT.md) — the expectations that keep our spaces welcoming and collaborative.
- [Security Policy](SECURITY.md) — report vulnerabilities and review secure development practices.

Help us keep the fireseed alive by sharing feedback, opening discussions, or mentoring new contributors.

---

## 🔐 Canonicalization & Signing

Fireseed capsules **must be signed over their DAG-CBOR content identifier (CID) bytes**, not over the raw JSON/YAML text. This ensures that the same semantic object always receives the same fingerprint, regardless of whitespace or key ordering.

1. Normalize the object via DAG-CBOR encoding and compute a CIDv1 with the `dag-cbor` multicodec.
2. Sign `cid.bytes` using Ed25519. _Do not sign `JSON.stringify()` output; textual representations are not stable across runtimes._
3. Publish the Ed25519 public key with its multicodec prefix (e.g., `ed25519-pub`) so verifiers can reconstruct the verification key material.

Use the helper script to automate these steps:

```bash
npm run sign -- ./path/to/capsule.json --key <hex-encoded-private-key>
```

The script emits the CID, a Base64 signature over `cid.bytes`, the multibase/multicodec public key, and the canonicalized JSON for auditing.

---

## 🛠️ Operations & Observability

Run the full stack with Docker Compose:

```bash
docker compose up --build -d
```

This boots Redis (6379), the FastAPI capsule service (8000), Prometheus (9090), and Grafana (3000). Grafana ships with a local volume at `ops/grafana`; point a Prometheus data source at `http://prometheus:9090` and you will see the exported `score_latency_seconds`, `verification_failures_total`, and `sharecard_errors_total` metrics from `/metrics`.

---

© 2025 Fireseed Trilogy Lab · Code: MIT · Docs: CC BY 4.0
Test update at Tue Nov 11 00:29:21 CST 2025
