# Security Policy

The Fireseed Trilogy project safeguards long-lived, high-integrity data capsules. We take responsible disclosure seriously and ask all contributors to review the security considerations below before shipping changes.

## Reporting a Vulnerability
- Email **security@fireseedtrilogy.org** with the subject line "SECURITY" and include a detailed description of the issue, reproduction steps, and potential impact.
- If encrypted communication is required, request our PGP key in your first message and we will respond with the current fingerprint.
- We aim to acknowledge reports within 72 hours and provide a remediation plan within 10 business days.
- Please avoid opening public issues for sensitive findings until a fix has been released.

## Scope
The policy covers:
- Capsule schemas, generators, validators, and associated scripts stored in this repository.
- Offline distribution bundles and vendor packages distributed via the official release channels.
- Infrastructure instructions that, if compromised, could expose or tamper with Fireseed capsules.

## Handling Secrets
- Private keys used for signing capsules or releases must never be committed to the repository.
- Use offline signing or hardware-backed key storage whenever possible.
- Rotate long-lived keys annually; document rotations in team-internal records.

## Dependency Management
- Pin third-party dependencies where feasible and review upstream changelogs before upgrading.
- Run `npm audit` (or equivalent tooling for added languages) when updating dependencies.
- Remove unused vendors to reduce the attack surface of offline bundles.

## Secure Development Checklist
Before merging significant changes, confirm that:
- [ ] Input data is validated against the latest schemas.
- [ ] Error handling avoids leaking sensitive capsule metadata.
- [ ] Cryptographic primitives remain current and are used with recommended parameters.
- [ ] Backwards compatibility and migration plans are documented when making breaking changes.

## Coordinated Disclosure & Credits
We credit researchers who responsibly disclose vulnerabilities, unless anonymity is requested. If an issue affects downstream adopters, we will coordinate publication timelines to ensure patches are available simultaneously.

Thank you for helping keep Fireseed capsules trustworthy across generations.
