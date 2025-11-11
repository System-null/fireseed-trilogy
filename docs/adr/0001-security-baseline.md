# ADR-0001: Browser Security Baseline

- **Status**: Accepted
- **Context**: 需要在零后端假设下提供可签名、可验证、可归档的最小安全基线。
- **Decision**:
  1. WebAuthn 为首选签名方案；落地 `/keystore` 演示与工具。
  2. 兜底使用 SubtleCrypto(ECDSA P-256)；私钥通过 **导出 JWK → IDB 持久化 → 使用时以 `extractable:false` 导入**，避免 `DataCloneError` 与键可导出风险并存。
  3. 前端强制 CSP（`script-src 'nonce-...' 'strict-dynamic'`）与 Trusted Types（`require-trusted-types-for 'script'`）。
  4. 内容编码与签名采用 DAG-CBOR + CID 签名，保证确定性。
  5. 持久化责任外置：CI 仅生成 CAR 与合规构件；**Pin 作为可选步骤**，通过 secrets 启用。
- **Consequences**:
  - 默认部署不需要 secrets，不会让 CI 变红。
  - 有 secrets 时可获得端到端“生成→上传→Pin→探活”的可验证路径。
  - 将来可以在不破坏现有接口的前提下，引入 Merkle-based revocation、DID、更多算法。
