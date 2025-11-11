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
