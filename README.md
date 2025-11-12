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

## 开发指南
本地签名胶囊时可运行 `npm run sign:file`，脚本会从 `.secrets/dev-capsule.key` 读取十六进制私钥。
请将密钥文件存储在 `.secrets/` 目录并根据需要调整文件名，目录内容已默认忽略提交。
如果更偏好环境变量，可先执行 `export FIRESEED_PRIVKEY=$(cat .secrets/dev-capsule.key)` 后运行 `npm run sign`。
也可以直接使用 `npm run sign:env` 示例脚本，该脚本会把文件内容注入环境变量后触发签名。
签名脚本会在完成后擦除内存中的私钥与编码消息，降低敏感数据残留风险。

## Link Index
- UX patch guidance: [docs/ux.md](docs/ux.md)
- Patch history & add-ons: [docs/patch-notes.md](docs/patch-notes.md)
- Security policy: [SECURITY.md](SECURITY.md)
- Roadmap: [ROADMAP.md](ROADMAP.md)
