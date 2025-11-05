
# Fireseed Capsule · Quick Start (Wizard v3.2)

最小闭环：**loop + proofs + permissions + storage + narrative（可选）**。

## 使用步骤
1. 打开 `public/generator.html`（或 GitHub Pages: `/generator.html`）。
2. 依次填写：基本信息 → 理念与循环 →（可选）叙事 → 权限与存储。
3. 点击「🔥 生成火种」下载 `capsule_v0.yaml`；或点「🖨️ 导出 PDF」得到 A4 版。
4. 可选：
   - 计算 SHA-256：`sh scripts/compute-sha256.sh capsule_v0.yaml`，把结果填入 `proofs.hash`；
   - 使用 GPG/Ed25519 对 **YAML 文件** 做 detached 签名：`sh scripts/make-signed.sh capsule_v0.yaml`；
   - 上传 IPFS/Zenodo，把链接写回 `storage.chain`。

> 验证器：`/tools/validator.html`。隐私：数据仅在浏览器处理。

