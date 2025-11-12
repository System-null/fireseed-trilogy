# Fireseed UX Patch (v0.3.1-ux)

## 包含内容
- `public/generator.html`：网页表单生成 `capsule_v0.yaml`（AJV 校验，支持 CDN 回退）
- `tools/validator.html`：拖拽 YAML 即可本地校验
- `.github/ISSUE_TEMPLATE/submit_capsule.yml`：Issue 表单提交（无需本地 Git）
- `scripts/verify.sh`：一键生成校验报告（`reports/verification-report.json`）
- `scripts/build_index_jsonld.py`：自动生成 `index.jsonld`（遍历 `schemas/` 并写入 sha256）
- `START_HERE.md`：人类入口页
- `fireseed.manifest.json` / `index.jsonld`：机器索引入口
- `.well-known/did.json`：DID 占位（请替换为你的公钥）
- `failover/`：最小离线种子包骨架

## 合并方式
1. 解压本补丁包到临时目录。
2. 在仓库根目录执行：
   ```bash
   rsync -av <补丁目录>/ ./
   git add .
   git commit -m "ux: add generator, issue form, verify script, manifest/index, failover (v0.3.1-ux)"
   git push origin main
   ```
3. （可选）生成最新的 `index.jsonld`：
   ```bash
   python3 scripts/build_index_jsonld.py
   git commit -am "chore: rebuild index.jsonld" && git push
   ```

## 启用 GitHub Pages（让生成器对外可访问）
- Settings → Pages → Source 选择 `Deploy from a branch`
- Branch 选 `main`，文件夹选 `/ (root)`，保存
- 访问：`https://<你的用户名>.github.io/<仓库名>/public/generator.html`
