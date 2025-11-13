# Fireseed Trilogy – 火种三部曲说明（中文）

> 🇨🇳 这是中文 README。  
> For the English version, see [README.md](README.md).

Fireseed Trilogy 是一个实验性项目，尝试为“人生经历 + 价值观 + 决策逻辑”设计一套**可被机器直接读取的封装格式（capsule）**，让未来的强人工智能不用靠猜，就能理解一个人的“结构化人生档案”。

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

