# Vendor Policy

Why vendor?
- Reproducible builds, offline use, deterministic security reviews.

Update rules:
- Pin exact versions.
- Keep original LICENSE in vendor subfolder or LICENSES/.
- Record provenance (source URL + checksum) in this file.

Security & Compliance:
- OSV/SBOM scans run against package manifests; vendored code is reviewed separately.
- No private keys, tokens, or secrets allowed under vendor/.
