# Fireseed Trilogy – Architecture Overview  
# Fireseed 三部曲 · 架构总览

本仓库是《Fireseed Trilogy》（火种三部曲）的**配套工程仓库**。  
This repository is the **engineering companion** to the Fireseed Trilogy books.

核心目标 / Core goals：

- 提供一套 **机器可读的 “capsule” 结构**（YAML/JSON + JSON Schema）；  
  Provide a **machine-readable “capsule” structure** (YAML/JSON + JSON Schema).
- 提供一套 **本地签名与校验工具链**（Node.js CLI + 浏览器 keystore demo）；  
  Provide a **local signing & verification toolchain** (Node.js CLI + browser keystore demos).
- 提供若干 **实验性前端界面**，方便人类与未来的 AGI 通过统一格式读写个人“火种”。  
  Provide several **experimental frontends** so humans and future AGI can read/write personal “fireseeds” using a unified format.

> ⚠ 边界说明 / Boundaries  
> - 这里 **不是分布式存储网络**，不会自动帮你长期保管数据；  
>   This is **not** a distributed storage network; it will not store your data for you.  
> - 这里 **不负责密钥托管**，所有签名密钥均由用户自己生成与保存；  
>   This does **not** manage your keys; all signing keys must be generated and stored by users.  
> - 更像是“结构化遗嘱 + 实验室工具箱”，而不是完整产品。  
>   Think of it as a **structured testament + lab toolbox**, not a finished product.

---

## 1. 顶层目录结构 / Top-level layout

### `schemas/`

- 存放 capsule 等核心结构的 JSON Schema（例如：`capsule_v0.2.9.json`）。  
  Stores JSON Schemas for core structures such as capsules (e.g. `capsule_v0.2.9.json`).
- 这是 **主干（core）**：任何生成 / 校验 capsule 的工具都要依赖它。  
  This is part of the **core**: any tool that creates or validates capsules depends on it.

### `scripts/`

- Node.js 工具脚本，例如：  
  Node.js utility scripts, e.g.:
  - `sign-capsule.mjs`：对 capsule 的 DAG-CBOR 编码结果进行 Ed25519 签名；  
    signs the DAG-CBOR encoded capsule with Ed25519.
  - `verify-capsule.mjs`（如已实现）：验证签名与 CID 是否匹配。  
    `verify-capsule.mjs` (if implemented): verify that signature and CID match.
- 用于把“结构化数据”变成 **可验证制品**，属于 **主干 CLI 工具**。  
  Converts structured data into **verifiable artifacts** and forms the **core CLI layer**.

### `apps/web/`

- Next.js Web 应用，面向最终用户：  
  Next.js web app intended for end users:
  - capsule 在线编辑与校验（“Capsule Workspace”）；  
    online capsule editing and validation (“Capsule Workspace”).
  - 未来可以扩展更多针对 Fireseed 的图形界面。  
    can be extended with more Fireseed-related UIs.
- 是面向人类用户的 **主干 Web 界面**。  
  This is the **core web interface** for human users.

### `app/`

- 基于 Next.js App Router 的“安全实验室”：  
  A Next.js App Router based **security lab**:
  - `app/page.tsx`：入口页，链接到 `/keystore`、`/diagnostics`、`/sign-lab` 等。  
    entry page linking to `/keystore`, `/diagnostics`, `/sign-lab`, etc.
  - `app/keystore/page.tsx`：WebAuthn + IndexedDB keystore demo。  
    WebAuthn + IndexedDB keystore demo.
  - `app/sign-lab/page.tsx`：针对任意消息做 Passkey / 兜底签名的实验界面。  
    Experiment page for signing arbitrary messages with passkeys or fallback keys.
- 这是 **安全 & 密钥管理相关的实验区**，不承诺长期稳定 API。  
  This is an **experimental area for security & key management**, with no long-term API stability guaranteed.

### `public/`

- `generator.html`：旧版离线 capsule 生成器（纯前端）。  
  Legacy offline capsule generator (static frontend).
- `validator.html`：旧版静态校验器。  
  Legacy static capsule validator.
- 现在主要作为 **Legacy / 兼容保留**，推荐优先使用 `apps/web` 与 `app` 下的新界面。  
  Kept mostly for **legacy / compatibility**; new work should prefer `apps/web` and `app/*` UIs.

### `docs/`

- `ARCHITECTURE.md`（本文件）：架构说明。  
  `ARCHITECTURE.md` (this file): architecture overview.
- `threat-model.md`：威胁模型与安全假设。  
  `threat-model.md`: threat model and security assumptions.
- `adr/0001-security-baseline.md`：关于 CSP / Trusted Types / WebAuthn 的架构决策记录。  
  `adr/0001-security-baseline.md`: architectural decision record for CSP / Trusted Types / WebAuthn.

### 元信息 / Meta files

- `CHANGELOG.md`：记录主要变更（如安全基线、CI、许可证澄清等）。  
  Records major changes (e.g. security baseline, CI, license clarifications).
- `ROADMAP.md`：未来计划（keystore 加固、SLSA、CRL 等）。  
  Future plans (keystore hardening, SLSA, CRL, etc.).
- `SECURITY.md` / `ETHICS.md`：安全与伦理相关补充说明。  
  Additional notes on security and ethics.

---

## 2. 当前“主干能力” / Current core capabilities

被视为 **主干 & 尽量保持向后兼容** 的部分：  
Considered **core and as backward-compatible as possible**:

- **Schema 层 / Schema layer**  
  - `schemas/capsule_v0.2.9.json`：当前推荐的 capsule schema。  
    `schemas/capsule_v0.2.9.json`: the currently recommended capsule schema.

- **CLI 工具层 / CLI layer**  
  - `scripts/sign-capsule.mjs`：对 DAG-CBOR 编码结果做 Ed25519 签名，可离线使用。  
    `scripts/sign-capsule.mjs`: Ed25519 signing of DAG-CBOR encoded payload, usable offline.

- **Web 工作区 / Web workspace**  
  - `apps/web/app/capsule/page.tsx`：基于 schema 的 capsule 编辑 / 校验界面。  
    `apps/web/app/capsule/page.tsx`: schema-driven capsule editor & validator UI.

- **安全实验室 / Security lab**  
  - `app/keystore/page.tsx` & `app/sign-lab/page.tsx`：WebAuthn + IndexedDB keystore 与签名实验。  
    WebAuthn + IndexedDB keystore and signing experiments.

它们共同构成一个最小闭环：  
Together they form a minimal loop:

1. 用 schema 定义结构；  
   Define structures via schemas.  
2. 用 CLI 或 Web 界面生成 / 校验 capsule；  
   Create/validate capsules via CLI or web UI.  
3. 用 keystore 工具为结构签名；  
   Sign structured content with keystore tools.  
4. 将 capsule + 签名打包为可验证制品（如 CAR / IPLD）。  
   Package capsules + signatures into verifiable artifacts (e.g. CAR/IPLD).

---

## 3. Legacy / 实验性模块  
## Legacy / Experimental modules

**以下模块被视为 Legacy 或实验性，不承诺长期兼容：**  
The following modules are **legacy or experimental** and not guaranteed stable:

- `public/generator.html` / `public/validator.html`：早期纯前端工具，保留用于离线演示与兼容。  
  Early static tools kept for offline demos and backwards compatibility.
- 某些 Python / Shell 脚本：多用于一次性任务或早期探索。  
  Some Python / Shell scripts used for one-off tasks or early exploration.
- 文档中显式标记为 “experimental” 的部分。  
  Parts explicitly marked as “experimental” in documentation.

---

## 4. 使用方式 / How to use this repo

### 面向开发者 / For developers & researchers

1. 从 `schemas/` 理解 capsule 结构；  
   Start from `schemas/` to understand capsule structures.  
2. 使用 `scripts/` 下的 CLI 在本地构建 / 签名；  
   Use `scripts/` CLIs to build & sign capsules locally.  
3. 使用 `apps/web` 中的界面进行交互式编辑与校验；  
   Use UIs under `apps/web` for interactive editing and validation.  
4. 使用 `app/` 中的安全实验室理解 WebAuthn / keystore 的安全边界。  
   Use the security lab in `app/` to understand WebAuthn/keystore security boundaries.

### 面向普通用户 / For general users

- 将这里视为实验室，而不是“永久存储服务”；  
  Treat this as a lab, not as a “permanent storage service”.  
- 谨慎管理你的 capsule 文件与签名密钥，不要在公开环境暴露私钥。  
  Carefully manage your capsule files and signing keys, never expose private keys in public environments.
