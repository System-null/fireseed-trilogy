# Fireseed Threat Model · 威胁模型

> Canonical: English. 中文版本紧随其后；两者内容等价。  
> 规范：STRIDE, zero-trust assumptions, testable mitigations.

## 1) Scope / 范围
- App: Next.js web app (CSP + Trusted Types + nonce), WebAuthn-first keystore, IndexedDB+SubtleCrypto fallback.
- Artifacts: Capsules (JSON/DAG-CBOR), CAR files, SBOM/OSV outputs.
- CI: GitHub Actions (no secrets in publish workflow).

## 2) Assets / 资产
- A1: User private keys / 用户私钥  
- A2: Capsule integrity & provenance / 胶囊完整性与来源  
- A3: CAR & SBOM artifacts availability / CAR 与 SBOM 制品可用性  
- A4: CI tokens, repo integrity / CI 令牌与仓库完整性

## 3) Entry points & Trust boundaries / 入口与信任边界
- Browser runtime (DOM, extensions, XSS) / 浏览器运行时  
- Network (gateways, pinning services) / 网络与网关  
- CI runners / CI 运行器  
- IPFS cluster / IPFS 集群

## 4) Assumptions / 前置假设
- No server-side session or DB; keys remain client-side.  
- HTTPS or localhost for WebAuthn.  
- Users pin content explicitly (no “permanent by default”).

## 5) STRIDE Table / 威胁-缓解-验证

| Threat | 资产 | Mitigation | Test |
|---|---|---|---|
| **S**poofing (credential theft) | A1 | WebAuthn resident credential (platform authenticator); fallback key is non-extractable | Manual passkey flow; unit tests simulate missing credential path |
| **T**ampering (XSS/DOM) | A1/A2 | CSP `script-src 'self' 'nonce-…'`; Trusted Types `fireseed-policy`; no inline scripts without nonce | Response headers asserted; E2E checks deny script w/o nonce |
| **R**epudiation | A2 | Deterministic DAG-CBOR + signing over CID; audit trails via commit history | Unit tests: stable CID; signature verify against CID bytes |
| **I**nformation disclosure | A1/A4 | No secrets in localStorage; IndexedDB stores `CryptoKey` non-exportable; CI uses minimal scopes | Lint rules; grep to assert no localStorage secrets; CI workflow review |
| **D**enial of service | A3 | Triple pin (own node / web3.storage / Pinata) is recommended; CAR build reproducible | CI artifact exists; optional reachability checks by maintainers |
| **E**levation of privilege | A4 | No PR-triggered secret usage; least-privilege tokens; branch protection | Workflow config review; protection rules enabled |

## 6) Residual Risks / 剩余风险
- Browser extensions with broad privileges can bypass CSP.
- Users may fail to pin content → availability not guaranteed.
- WebAuthn relies on platform support and user consent.

## 7) Action Items / 后续动作
- Optional: add automated multi-pin job with environment secrets.  
- Add negative E2E test: script without nonce must be blocked.  
- Document user pinning checklist in README.

---
（中文简述）  
**核心威胁**：凭证冒用、XSS 破坏、胶囊篡改、信息泄露、可用性下降与权限提升。  
**已落实缓解**：CSP+TT+nonce、WebAuthn 优先、DAG-CBOR 确定性签名、CI 最少权限、无本地明文/可导出密钥。  
**剩余风险**：浏览器扩展、用户未 Pin、平台对 WebAuthn 的限制。  
