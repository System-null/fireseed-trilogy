# Fireseed Lab – Security & Threat Model Notes
# Fireseed 实验室安全说明与威胁模型

> 版本：draft / 实验性工具说明

## 1. 范围 / Scope

本文档说明当前开源 Fireseed Lab（此仓库）的安全假设与边界。
This document describes the security assumptions and boundaries of the open-source Fireseed Lab in this repository.

- 我们提供的是「协议 + 工具」，不是托管服务。
- We provide “protocol + tools”, not a hosted custody service.
- 代码会随时间演化，请总是以当前分支代码为准进行审计。
- The code evolves over time; always audit the current branch if in doubt.

## 2. 数据流概览 / Data flow overview

- `/capsule/create`:
  - 表单内容通过 HTTPS 发送到本仓库的后台（Next.js API）以生成 ZIP；
  - 当前实现中没有持久化存储逻辑（不写数据库、不写云存储），但应视为敏感数据已经过服务器；
  - 密码加密模式下，密码在浏览器端用于 PBKDF2 + AES-GCM，不会以明文写入 ZIP。
  - The form content is sent via HTTPS to the backend (Next.js API) to build the ZIP bundle.
  - The current implementation does not persist data to a database or cloud storage, but you should still assume sensitive data has traversed the server.
  - Under password encryption mode, the password is used client-side with PBKDF2 + AES-GCM and is not stored in cleartext inside the ZIP.

- `/verify/local`:
  - 所有解析与验证逻辑在浏览器本地执行；
  - ZIP 文件不会被上传到远端。
  - All parsing and verification runs locally in the browser.
  - The ZIP file is never uploaded to any remote server.

- `/lab`:
  - Manifest 清单存储在本机 IndexedDB 中；
  - IPFS 上传使用用户配置的 HTTP API 地址，不包含托管服务；
  - M-Disc 与 QR 导出仅生成本地下载的文件和图像。
  - The manifest is stored locally in IndexedDB.
  - IPFS uploads go to the user-provided HTTP API endpoint; the project does not include any hosting service.
  - M-Disc and QR exports only generate client-side downloads (files/images).

## 3. 加密威胁模型 / Encryption threat model

- 使用 AES-256-GCM 对 `capsule.json` 加密；
- 密钥通过 PBKDF2-SHA256 从用户密码派生；
- 盐、IV 与迭代次数记录在 `meta.encryptionParams` 中；
- HUMAN_READABLE.md 与 README.txt 目前为明文，以兼顾灾后可读性。
- AES-256-GCM is used to encrypt `capsule.json`.
- The key is derived from the user’s password with PBKDF2-SHA256.
- Salt, IV, and iteration counts are stored in `meta.encryptionParams`.
- HUMAN_READABLE.md and README.txt remain plaintext to preserve minimal readability in low-tech scenarios.

**重要：忘记密码意味着无法解密该胶囊内容。我们无法为你恢复。**
**Important: If you forget the password, the capsule content cannot be decrypted. There is no recovery.**

## 4. 高级通道风险 / Advanced channels and risks

- IPFS:
  - 你配置的 HTTP API endpoint 决定了数据上传到哪里；
  - 使用公共网关或第三方 Pinning 服务时，应视为数据可能长期公开；
  - 私钥管理与访问控制完全由你自己负责。
- IPFS:
  - Your configured HTTP API endpoint determines where the data is uploaded.
  - Using public gateways or third-party pinning services means the data may be stored and publicly accessible.
  - Key management and access control are entirely your responsibility.

- 光盘 / M-Disc:
  - 一旦刻录，内容即为只读，无法销毁或修改；
  - 建议只刻录你明确希望“长期存在”的 Fireseed。
- Optical / M-Disc:
  - Once burned, the data is read-only and difficult to dispose of.
  - Prefer burning only the Fireseeds you truly want to persist long-term.

- 纸质 QR 线索卡:
  - 任何拿到纸的人都可以看到基本定位信息与哈希；
  - 建议在物理世界中合理保管或组合使用多个碎片。
- Paper QR clue cards:
  - Anyone with physical access to the paper can see basic locator info and hashes.
  - Consider physical security and possibly using multiple split cards.

## 5. 你应该怎么做 / What you should do

- 在使用前阅读代码，确认你理解数据流。
- 在受信任的设备 + 网络环境中使用。
- 对真正敏感的内容，考虑多层加密和物理隔离。
- Read the code and understand the data flow.
- Use trusted devices and networks.
- For truly sensitive content, consider additional layers of encryption and physical isolation.
