# 快速上手（10 分钟）

> 目标：**非技术用户**也能完成一次“火种格式”提交：填写 → 校验 → 签名 → 存证 → 提交。

## 0. 准备
- 本仓库：最新 main 分支
- 本地已安装：`node>=18`、`git`、`gpg`（macOS：`brew install gnupg`）
- 若不想装 Node，也可使用仓库 `vendor/ajv` 与 `vendor/js-yaml`（配合 `tools/validator.html`）

## 1. 拿模板（3 选 1）
- **最小三件套**：`templates/minimal/` 目录（`principles.yml`、`loop.yml`、`boundary.yml`）
- 按书中的“三行模板”自己新建文件
- （可选）即将发布的 Web 表单生成器（GUI），一键导出 ZIP

## 2. 合成 capsule（把 3 份模板合并为一个 `capsule_v0.yaml`）
推荐结构：
```yaml
meta:
  owner: "<你的名字>"
  locale: "zh-CN"
  created_at: "<YYYY-MM-DD>"
  philosophy_ref:
    - "System Exodus - Ch.1"
    - "Beyond the System - Ch.2"
    - "The Ultimate Proposition - Ch.3"
principles:    # 来自 principles.yml
  - ...
loop:          # 来自 loop.yml
  trigger: "daily_review"
  steps: ["summarize","extract decisions","schedule next step"]
boundary:      # 来自 boundary.yml
  non_negotiables: ["8h sleep", "no non-consensual extraction of time"]
ethical_flag: 0   # 1=含极端内容；校验器会提示
```

## 3. 校验（JSON Schema）
**方式 A（npx）**：
```bash
npx ajv-cli@5.0.0 validate   -s schemas/fireseed_capsule.schema.json   -d capsule_v0.yaml --strict=false
```

**方式 B（内置 vendor）**：
- 打开 `tools/validator.html`（本地用 VS Code Live Server 或 `python3 -m http.server` 开启）
- 把 `capsule_v0.yaml` 拖进去，页面会自动用 `vendor/js-yaml` + `vendor/ajv` 校验

## 4. 签名（GPG）
```bash
# 首次生成密钥
gpg --full-generate-key
# 导出公钥（备份/验证）
gpg --armor --export <你的邮箱> > public.asc
# 清签
gpg --clearsign capsule_v0.yaml       # 生成 capsule_v0.yaml.asc
# 验签
gpg --verify capsule_v0.yaml.asc
```

## 5. （可选）存证（IPFS/Arweave/多地备份）
- IPFS：`ipfs add capsule_v0.yaml.asc`
- Pin 服务：Pinata / web3.storage
- 建议打印 A6 口袋卡：包含公钥指纹、验证 URL、撤销条件

## 6. 提交回仓库（或你的 fork）
```bash
git checkout -b submit/<your-id>
mkdir -p submissions/<your-id> && mv capsule_v0.yaml* submissions/<your-id>/
git add submissions/<your-id>
git commit -m "feat: capsule submission (<your-id>)"
git push -u origin HEAD
# 在 GitHub 打开 Pull Request
```

## 故障排查
- ajv 报错：检查 YAML 缩进、字段拼写（按 `schemas/fireseed_capsule.schema.json`）
- GPG 验签失败：确认 `.asc` 文件和公钥是否匹配
