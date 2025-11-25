# Fireseed Trilogy – 火种三部曲说明（中文）

> 🇨🇳 这是中文 README。  
> For the English version, see [README.md](README.md).

Fireseed Trilogy 是一个实验性项目，尝试为“人生经历 + 价值观 + 决策逻辑”设计一套**可被机器直接读取的封装格式（capsule）**，让未来的强人工智能不用靠猜，就能理解一个人的“结构化人生档案”。

当前状态：高门槛、面向动手能力用户的免费实验版，提供本地胶囊生成、可选 AES-256-GCM 加密、Fireseed Lab 清单、手动 IPFS 适配器、M-Disc 导出、QR 线索卡，以及 Arweave 自助（文档级）适配器路径。

## Fireseed Lab v0.3.0 — 本地火种实验室

- `/capsule/create` 一键生成火种胶囊（支持可选密码 AES-256-GCM 加密）；
- `/verify/local` 本地验证与解密（浏览器内解析 ZIP，不上传内容）；
- `/lab` 火种实验室：本地清单查看、M-Disc 结构导出、纸质 QR 线索卡、可自带 IPFS 适配器。

CID 级结构检查留待后续版本实现。

所有验证和解密逻辑均在浏览器内完成，ZIP 内容不会上传到服务器；清单数据存储在浏览器 IndexedDB 中，删除浏览器数据会清空清单，但不会删除你硬盘已有的 ZIP。

这个代码仓库包含：

- 一套 **Capsule 结构定义（schema）**：用 YAML/JSON 描述一个人的身份、事件、选择和理由。
- 一个 **确定性签名工具**：把 capsule 编码成 DAG-CBOR，算出 CID，然后用 Ed25519 进行签名。
- 一个 **基于 Next.js 的 Web 工作空间**：在浏览器里创建、查看、检查 capsule。
- 一些 **安全与伦理文档**：说明这个东西是什么、不是啥、能用来干嘛、不能用来干嘛。

> 当前状态：实验阶段，不适合作为高价值机密数据的唯一存储方案。

---

## 1. 仓库结构概览

- `schemas/` – Capsule、本地密钥时间线、撤销列表等的 JSON Schema。
- `scripts/` – 编码、签名、构建 CAR 文件的 Node.js 工具脚本。
- `app/` – Next.js 前端应用（Workspace、Keystore Demo、简易校验 UI）。
- `public/` – 早期的静态 HTML 工具（老版生成器 / 校验器）和静态资源。
- `docs/` – 架构说明、威胁模型、架构决策记录（ADR）。
- `.github/workflows/` – CI 工作流（测试、lint、SBOM、安全检查等）。

想看整体架构和数据流，请参考：  
**[架构总览 docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**（英文）。

---

## 2. 快速开始

### 2.1 安装依赖

```bash
git clone https://github.com/System-null/fireseed-trilogy.git
cd fireseed-trilogy
npm install
```

### 2.2 启动 Web 工作空间

```bash
npm run dev
# 在浏览器打开 http://localhost:3000
```

在本地你可以：

- 浏览和编辑 capsule 的结构；
- 在 `/keystore` 体验 WebAuthn + IndexedDB 的密钥管理 Demo；
- 理解“签名前的数据长什么样，签名后得到什么 CID / 证明”。

### 2.3 旧版静态生成器的 i18n 覆盖层

`public/generator.html` 是旧版的纯静态生成器。如果你需要在 GitHub Pages 或其他静态托管环境保持语言切换功能，请按以下步骤处理：

1. 确保 `public/lang/*.json` 和 `public/scripts/fireseed-i18n-overlay.v3.0.js` 位于仓库的 `public/` 目录下。
2. 在页面 `</body>` 之前加入覆盖层脚本：

   ```html
   <script src="./scripts/fireseed-i18n-overlay.v3.0.js"></script>
   ```

3. 运行初始化补丁，插入非侵入式的 i18n 启动片段：

   ```bash
   bash patch_i18n_init.sh
   ```

4. 提交更新后的 `public/generator.html`（以及相关资源），推送后访问静态站点的 `/public/generator.html`，若遇到缓存请强制刷新。

---

## 火种实验室（Phase 2.0 预览）

仓库现已提供 Phase 2.0 的核心能力：

- `/capsule/create` 一键生成本地火种胶囊；
- `/verify/local` 本地验证与解密；
- 「火种实验室」视图（`/lab`）可查看本机 **FireseedManifest** 中的胶囊列表，并支持导出 / 导入 manifest.json。

其中 **FireseedManifest** 作为本地索引，为未来的多副本存储、健康检查和远端适配器打基础。

---

## 火种实验室 – Phase 2.1

在 Phase 2.1 阶段，这个仓库不再只是一个「一次性生成火种胶囊」的小工具，而是变成一个**本地火种工作站**：

- **火种实验室（/lab）：**
  - 基于 Fireseed Manifest 展示本机已知的所有火种胶囊。
  - 支持按加密模式（明文 / 加密）、状态（草稿 / 最终版 / 归档）、主要语言进行筛选和搜索。
  - 可以为每颗火种修改状态（例如标记为“最终版”或“已归档”），并手动勾选「已完成多介质备份」。
  - 提供一条 **Arweave 自助路径（文档级）**：仅面向高阶用户的自托管方案，仓库不会替你管理私钥或代为上传。

- **一键火种向导（/capsule/create）：**
  - 仍然提供本地一键生成火种胶囊，并可选启用基于密码的 AES-256-GCM 加密（所有加密操作仅在浏览器本地执行）。
  - Fireseed Index 不再只是一个分数，而是拆解为多个维度（信息量、结构度、时间线、决策痕迹），并给出简单的写作补全建议。
  - 根据用户选择的主要语言（中文 / 英文），动态调整占位文案和提示语，让中英双语写作都更顺手。

- **本地验证页（/verify/local）：**
  - 将 fireseed-capsule ZIP 拖入后，在浏览器本地完成解包与验证，不会上传任何内容。
  - 提供一张「火种体检报告」，展示 Schema 版本、加密模式、Fireseed Index、生成时间、工具版本等信息。
  - 如果该胶囊尚未记录在清单中，可一键「加入实验室清单」，方便后续在 /lab 中统一管理。

适配器与文档补充：

- **Arweave 自助适配器（DIY）：** 使用你自己的 Arweave / Bundlr 工具，将本地生成的 Fireseed 胶囊 ZIP 上传到 Arweave，并在本地 Manifest 中登记 `ar://<txId>` 副本。详细步骤参见 [`docs/ADAPTER-ARWEAVE.md`](./docs/ADAPTER-ARWEAVE.md)。仓库不会托管私钥或代你完成上链。

 这些 Phase 2.1 的改动依旧遵循本地优先、无账号、无服务器存储的原则。

---

## 高级工具

1. Capsule Workspace：直接编辑 / 校验 `capsule.json`。
2. 本地验证工具：上传 ZIP 检查结构与加密状态，并支持密码解密。

CID 级检查暂未在公开仓库实现，未来版本再补充。

---

## 当前里程碑：v0.3.0（Phase 1.5）

当前仓库对应的工具版本为 **Fireseed Lab v0.3.0**，内部称为 **Phase 1.5**，主要实现了：

- 本地优先的一键火种胶囊生成（`/capsule/create`）：
  - 生成结构化的 `capsule.json`
  - 附带 `meta.json`（包含 schema 版本、Fireseed 指数、toolVersion 等）
  - 生成面向人的 `HUMAN_READABLE.md`（“罗塞塔石碑”层）
  - 生成使用说明 `README.txt`（如何备份 / 风险提示）
- 可选的密码加密：
  - 使用 PBKDF2-SHA256 推导密钥
  - 使用 AES-256-GCM 加密正文，密文保存为 `capsule.enc`
  - 加密参数（盐值、IV、迭代次数、KDF 类型）写入 `meta.json`
- 本地验证与解密工具（`/verify/local`）：
  - 在浏览器本地检查 ZIP 结构、schema 版本、胶囊 ID、加密模式
  - 在本地完成密码解密，不上传任何内容
  - 支持导出“解密版”胶囊 ZIP（包含明文 `capsule.json`）

当前 **FireseedCapsule 的 schema 仍处于 0.2.x 系列**，本次改动只是在兼容前提下新增字段和能力，尚未进行破坏性结构调整。Phase 2+（远程存储、多副本同步等）尚未实现。

---

## 3. Capsule 是什么？

简单理解：

Capsule = 一份结构化的人生说明书 + 价值观白皮书 + 给未来 AI 的使用手册。

它主要包含：

- **Who（我是谁）**：身份、角色、重要关系；
- **What（我经历了什么）**：关键事件、选择、长期项目；
- **Why（我为何这么选）**：价值排序、不可触碰的底线、权衡逻辑；
- **Evidence（证据）**：外部链接、文件哈希、引用等。

设计目标：

- **可复现**：同一份内容，无论何时何地再次生成，都得到相同 CID；
- **可被机器直接解析**：严格 Schema，尽量不依赖“猜人类语境”；
- **人类可审计**：非程序员也能看懂、修改、审核。

具体字段和规则请看：  
`schemas/` 目录，以及 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

---

## 4. 签名与验证

目前仓库里有两套主要工具：

- 命令行签名器：`scripts/sign-capsule.mjs`
  - 用 DAG-CBOR 对 capsule 做确定性编码；
  - 计算 CID；
  - 使用 Ed25519 签名 CID，而不是随意的字符串。
- 浏览器 Keystore Demo（Next.js）
  - 优先使用 WebAuthn / Passkey（密钥存在安全硬件或系统安全区，JS 拿不到私钥）；
  - 如果 WebAuthn 不可用，使用 SubtleCrypto + IndexedDB 做退路方案。

⚠️ 再提醒一次：目前这一套是“试验田”，不要用来存放不能丢、不能泄露的终极密钥或遗嘱原件。

### 安全说明

Fireseed Lab 是一个偏向本地优先的实验性工具集。  
关于当前版本的安全边界与威胁模型，请参考 [docs/SECURITY-NOTES.md](docs/SECURITY-NOTES.md)。

---

## 5. 安全与边界

仓库内包含：

- `SECURITY.md` – 如何报告安全问题，我们认为哪些场景在考虑范围内，哪些不在。
- `docs/threat-model.md` – 威胁模型：假定对手是谁、我们保护什么、不保护什么。
- `docs/adr/` – 一些关键设计决策的记录，比如为什么要做确定性编码，为什么选 DAG-CBOR + Ed25519 等。

简单理解：

它更像是一个“结构化表达”和“原型验证”项目，而不是一个已经完备的安全产品。

---

## 6. 如何参与贡献？

欢迎在以下几个方向参与：

- 设计更合理的 capsule 字段和校验规则；
- 提出更安全、更可审计的签名和密钥轮换方案；
- 用其它语言（例如 Go / Rust / Python）实现兼容的编码和验证工具；
- 帮忙改进 UI，让非技术用户也能顺畅使用。

在提 Issue 或 PR 前，建议先阅读：  
[CONTRIBUTING.md](CONTRIBUTING.md)（英文）。

---

## 7. 协议

- 代码部分：MIT License
- 文本内容：CC BY 4.0

