# Fireseed Threat Model (MVP)

| 资产 | 主要威胁 | 攻击面 | 缓解措施 | 验证/测试 |
|---|---|---|---|---|
| 私钥/签名权 | XSS/扩展窃取 | 浏览器 | **WebAuthn 优先**；兜底用 JWK 持久化 + 非导出导入；CSP + Trusted Types + Nonce | e2e: `/keystore` WebAuthn 签名成功；兜底签名无 DataCloneError |
| Capsule 完整性 | 非确定性/重排 | 序列化 | **DAG-CBOR 编码 + CID 签名**；确定性测试 | `tests/determinism.test.js` 通过 |
| 可用性/持久化 | 未 Pin/GC | IPFS 网络 | 责任外置；**可选 web3.storage/Pinata pin**；CAR 产物归档 | `publish.yml` 产出 CAR 构件；有 token 时完成上传/Pin |
| 密钥泄露后影响 | 不可吊销 | 时间线 | **Key Timeline + Revocation 列表**；将来引入 Merkle 证明 | `verify-keychain.mjs` 校验通过 |
| 供应链风险 | 恶意依赖/许可证 | npm | CycloneDX SBOM + OSV 扫描 + 许可证清单（不阻断 CI） | 合规构件包含 `sbom.json`、`osv.report.json`、`licenses.json` |

> 设计原则：最少信任（浏览器密钥不出机）、可验证（确定性 CID）、可转移（CAR 归档）、责任边界清晰（Pin 为可选外部责任）。
