# Fireseed Capsule Forward‑Compatibility Policy

**Version:** v3.6 · **Updated:** 2025-11-05T20:16:51Z

本仓库的胶囊格式（`version: capsule_v0`）遵循「**向前兼容**」策略：未来的字段增改不会导致旧版本失效。

## 1) 字段演进规则
- **新增字段**：仅可新增 *可选* 字段（默认可缺省）。
- **删除字段**：不得直接删除；应标注为 **Deprecated** 并至少保留 24 个月。
- **类型变更**：禁止破坏性变更（如 `string`→`object`）。需通过新增字段承载。
- **语义变更**：通过 `meta.compat_note` 记录，并保持旧语义仍可解析。

## 2) 兼容层
- 解析器必须忽略未知字段（tolerant reader）。
- `proofs.checksum_algo` 允许新增算法（例如 `BLAKE3`），不得移除 `SHA-256` 支持。
- 允许通过 `narrative.ext.*` 扩展人类语义，不影响机器解析。

## 3) 签名与校验
- 建议使用 `ed25519` 对整份 YAML 的 `SHA-256` 做 detached signature。
- 允许多个签名：可在 `proofs.chain` 按顺序追加公共哈希或外部签名引用。

## 4) 失效与回退
- 当核心字段无法解析时（如 `version` 缺失），解析器应降级为 **只读快照** 模式。
- 失效时需提示用户去 `failover/` 或 `ipfs://` 镜像检索最小包。

—— 本文档为格式层声明，不构成法律意见。
