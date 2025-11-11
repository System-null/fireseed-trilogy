# Maintenance Guide

## Branch protection (建议)
- 保护 `main`：需要 1 个 review、必须通过 `CI | unit` 与 `CI | compliance`
- 禁止直接推送；只允许 squash merge

## Labels 建议
- `bug`、`enhancement`、`schema`、`signing`、`ci`、`docs`、`security`、`stale`

## Release 流程
- 使用 Conventional Commits；合入 `main` 将触发 `CI | release`
- 发布后自动触发 `CI | publish` 生成 CAR 并尝试 Pin


⸻

验收（DoD）
• 新开任意 PR：自动根据改动文件打标签；PR 面板显示模板；CI 每周跑一次 stale。
• 需要时在仓库 Settings → Branches 按 docs/MAINTENANCE.md 配置保护规则即可。
