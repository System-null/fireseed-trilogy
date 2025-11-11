# ADR-0001: Browser Security Baseline (CSP, Trusted Types, WebAuthn-first)
Status: Accepted · Date: YYYY-MM-DD · Owners: Maintainers

## Context / 背景
We ship a client-only Next.js app that handles signing and capsule building. Protecting keys and preventing XSS are table stakes. We also need deterministic artifacts for verifiable provenance.

## Decision / 决策
1. **CSP with nonces** via `middleware.ts`; response includes:
   - `script-src 'self' 'nonce-<random>'`, `require-trusted-types-for 'script'`, `trusted-types fireseed-policy`.
2. **Trusted Types** policy `fireseed-policy` injected in `app/layout.tsx` before interactive scripts.
3. **WebAuthn-first keystore**:
   - Register & sign via platform authenticators when available.
   - **Fallback**: generate non-extractable `CryptoKey` (ECDSA P-256) and keep in IndexedDB (no localStorage secrets).
4. **No server secrets / minimal CI scope**; artifacts (CAR/SBOM) are reproducible.

## Consequences / 影响
- XSS risk is materially reduced; inline scripts must carry nonce.  
- Key material never exported; extension-based theft is harder but not impossible.  
- WebAuthn requires HTTPS/localhost; fallback ensures functionality without passkeys.

## Alternatives Considered / 备选方案
- Hash-based CSP: rejected (fragile with bundlers).  
- Storing exportable keys in localStorage: rejected (high risk).  
- Service Worker-only isolation: deferred (adds complexity).

## Implementation Notes / 实施要点
- Headers & nonce: `middleware.ts`  
- Trusted Types policy: `app/layout.tsx`  
- Keystore utilities: `lib/keystore.ts`, `lib/idb.ts`  
- Demo & docs: `app/keystore/page.tsx`, `docs/threat-model.md`

## Testing / 测试
- Unit: keystore flows; deterministic signing over CID (DAG-CBOR).  
- Integration: assert CSP headers present; script without nonce is blocked.  
- Manual: WebAuthn register/sign on HTTPS; fallback sign verifies.

## Rollback Plan / 回滚
Revert middleware & keystore commits; remove TT policy. Risk: reduces security posture.

---
（中文摘要）  
**决策**：采用 **CSP+Nonce**、**Trusted Types**、**WebAuthn 优先**，失败时以 **不可导出 CryptoKey + IndexedDB** 兜底；CI 最小权限、制品可复现。  
**影响**：显著降低 XSS 风险；密钥不导出；需 HTTPS/localhost 支持 WebAuthn。  
