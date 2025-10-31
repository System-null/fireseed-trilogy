# SUBMISSIONS / 提交流程

**Goal 目标**：让不懂代码的普通人通过表单，生成**可被 AGI 与高维智慧读取**的 Fireseed Capsule（JSON/YAML）。

## 操作步骤
1. （联网）首次运行 `npm run vendors`，拉取官方 ajv/js-yaml，并写入哈希锁。
2. （离线亦可）双击 `public/index.html` 打开表单页面。
3. 填写信息 → 点击 **Validate** 校验 → 点击 **Save JSON / Save YAML** 导出。
4. 将导出的文件提交到你的仓库（例如 `data/capsules/`），或以其他方式保存。

## 隐私与合规（简要）
- **最小化原则**：仅填写必要信息。避免敏感个人数据（身份证号、精确住址等）。
- **未成年人**：如提交者 <18 岁，需监护人同意。
- **许可证**：本仓库 MIT；第三方依原授权（见 `vendor/LICENSES`）。
- **可追溯性**：`vendor/lock-manifest.json` 记录来源 URL、版本、SHA256。

