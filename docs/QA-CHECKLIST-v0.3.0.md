# Fireseed Lab v0.3.0 QA Checklist

本文档用于每次大改代码后手动回归验证，确保 1.5 / 2.0 核心闭环没有被破坏。

## 1. 明文胶囊（Plain capsule）

- [ ] 在 `/capsule/create` 填写内容，不勾选加密，点击一键生成。
- [ ] 成功下载 ZIP（无需输入密码）。
- [ ] 解压后包含：
      - capsule.json
      - meta.json
      - HUMAN_READABLE.md
      - README.txt
- [ ] 打开 `/verify/local`，上传 ZIP：
      - [ ] 能看到 schema/version、capsuleId、Fireseed Index 等基本信息；
      - [ ] 标记为 encryption: none；
      - [ ] 不需要密码即可解析 capsule 内容的概要信息。

## 2. 加密胶囊（Encrypted capsule）

- [ ] 在 `/capsule/create` 勾选“启用密码加密”，设置密码（例如 `test-1234`）。
- [ ] 点击一键生成，成功下载 ZIP。
- [ ] 解压后包含：
      - capsule.enc（无 capsule.json）
      - meta.json（含 encryption = "aes-256-gcm" 与 encryptionParams）
      - HUMAN_READABLE.md
      - README.txt
- [ ] 在 `/verify/local` 上传该 ZIP：
      - [ ] 未输入密码时，显示“已识别为加密胶囊，但尚未解密”；
      - [ ] 输入正确密码，点击解密后，可以看到 capsule.content.title 等非敏感字段；
      - [ ] 输入错误密码时，提示“解密失败”。

## 3. 火种实验室（/lab）

- [ ] 生成新的胶囊后，刷新 `/lab`：
      - [ ] 列表中出现新条目（title / capsuleId / createdAt 等）。
- [ ] 在 `/lab` 中点击“导出 manifest”，成功下载 JSON 文件。
- [ ] 清空浏览器站点数据（或在隐身窗口中）：
      - [ ] `/lab` 列表为空；
      - [ ] 使用“导入 manifest”功能导入之前导出的 JSON；
      - [ ] 列表恢复，出现之前的条目。
