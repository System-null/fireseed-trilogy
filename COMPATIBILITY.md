# Fireseed Capsule 兼容声明（COMPATIBILITY.md）

当前工具版本：v3.7（兼容 Fireseed Capsule v0.3.x）

- 字段演进策略：新增字段不得破坏既有键名与层级；弃用字段需保留一次版本过渡期。
- 哈希与签名：默认 SHA-256；签名算法建议 ed25519（detached signature）。
- 回退策略：旧胶囊应可在新版本校验工具中读取与验证。
