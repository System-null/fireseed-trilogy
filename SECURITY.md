# Security Policy

## 1. Reporting a Vulnerability

If you believe you have found a security issue in this project, please:

1. **Do not** open a public GitHub issue with sensitive details.
2. Instead, send a private report to:

   - Email: `security@system-null.com`
   - Include:
     - A clear description of the issue.
     - Steps to reproduce.
     - Any potential impact you have identified.

We will acknowledge receipt as soon as reasonably possible and will work with you on triage and remediation.

---

## 2. Scope and Non-goals

**In scope:**

- Integrity of capsule encoding and signing (no easy way to forge a valid capsule).
- Basic protection against accidental key leakage in our own tooling.
- Supply-chain integrity for this repository (dependencies, CI, release artifacts).

**Out of scope:**

- We do **not** guarantee confidentiality for any capsule content.
- We do **not** provide secure key storage; private key management is the user’s responsibility.
- We do **not** provide guarantees about external systems (IPFS pinning services, browsers, OS, hardware).

Treat this project as a **research prototype**, not as a hardened security product.

---

## 3. Key Compromise Response (Guidance)

If you suspect that a signing key used with Fireseed capsules has been compromised:

1. **Rotate the key:**
   - Generate a new key pair.
   - Update any local configuration or secrets store to use the new key.

2. **Stop using the old key immediately.**

3. **Re-sign important capsules:**
   - Where practical, re-encode and re-sign critical capsules with the new key.
   - Keep a mapping of “old key → new key” for audit purposes.

4. **Document the incident:**
   - Record when and how the compromise was detected.
   - Update any relevant `key-timeline` or `revocation` documents if your workflows use them.

5. **Notify downstream users:**
   - If others rely on your signed capsules, inform them that the old key should no longer be trusted.

This project may later include more automated support for key rotation and revocation; for now, these steps are manual guidance.
