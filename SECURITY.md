# Security Policy

## Supported
This is an open-source project without SLAs. Security fixes are released on a best-effort basis.

## Where Keys Live
- Client-side only. Prefer WebAuthn/TPM when available; otherwise use non-exportable SubtleCrypto keys plus IndexedDB.
- **Never** store private keys in `localStorage`.

## Reporting a Vulnerability
- **Do not** open a public issue.
- Use GitHub **Private Security Advisories**: Security → Advisories → “Report a vulnerability”.
- Please provide a minimal PoC and affected versions. We follow a **90-day** disclosure policy by default.

## Threat Model (high level)
- Private-key theft (browser extensions/XSS): mitigated via WebAuthn/Trusted Types/CSP.
- IPFS data loss: users must pin via at least two independent services; this repo provides optional automation only.

## Key Compromise Response (KCR)

If you suspect Ed25519 private key compromise:

1. **Rotate**: update secret storage (CI/runner) with the new key.
2. **Re-sign**: re-generate capsule signatures with the new key.
3. **Revoke**: publish a `revocation_v0` document signed by the revocation key.
4. **Audit**: scan Git history for accidental key commits:
   ```bash
   git log -p --all --grep="privateKey\\|privkey\\|d:"

5. Advisory: open a private security advisory on GitHub.

---

### 使用顺序（本地或 CI 均可手动执行，不影响现有工作流）

```bash
# 1) 生成确定性编码与 CID
npm run encode:capsule -- capsule.json artifacts

# 2) 使用文件或环境变量签名（优先文件）
npm run sign:capsule -- --input artifacts/capsule.dag-cbor --privkey-file ~/.fireseed/id_ed25519

# 3) 构建并验证 CAR
npm run car:build -- artifacts/capsule.dag-cbor artifacts/capsule.cid artifacts
```

私钥输入通道优先级：--privkey-file > FIRESEED_PRIVKEY > --privkey；脚本会在签名后内存擦除密钥与敏感缓冲。
