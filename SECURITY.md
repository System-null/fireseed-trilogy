# Security Policy

## Supported Versions
- `main` branch CI must pass unit + compliance.

## Reporting a Vulnerability
Please open a private advisory: https://github.com/System-null/fireseed-trilogy/security/advisories

## Key Compromise Response (KCR)
If you suspect your Ed25519 private key has been compromised:

1. **Rotate Immediately**
   - Update the signing key in GitHub Environments/Secrets (use reviewers).
2. **Re-sign Capsules**
   ```bash
   npm run resign:capsules -- --key-id=<new-key-id>
   ```
3. **Publish Revocation**
   - Add entry to your CRL and push (TBD schema schemas/revocation.schema.json).
4. **Audit History**
   ```bash
   git log -p --grep="privkey\|privateKey\|d:" --all
   ```
5. **Document**
   - Open a security advisory and describe impact and mitigation.

> 你的 `resign:capsules` 可先作为占位命令，后续实现。

---

## Additional Guidance
- Client-side keys should prefer WebAuthn/TPM; avoid storing private keys in `localStorage`.
- For vulnerability disclosure, provide a minimal PoC and affected versions. Default disclosure window is 90 days.
- Threat focus: private-key theft (mitigated by WebAuthn/Trusted Types/CSP) and IPFS data-loss (mitigated via redundant pinning).
