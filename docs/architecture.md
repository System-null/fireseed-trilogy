```mermaid
flowchart LR
  UI[Next.js UI] --> CSP[Middleware: CSP/TT/Nonces]
  UI --> Keystore[WebAuthn + Fallback JWK (WebCrypto)]
  Scripts[CLI Scripts (node)] -->|encode/sign| Capsule[Capsule JSON/CAR]
  CI[GitHub Actions] -->|build/unit/static| Artifacts[SBOM/OSV/License]
  CI --> Release[Release (draft)]
```
