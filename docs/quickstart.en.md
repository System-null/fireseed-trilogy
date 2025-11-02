# Quickstart (10 minutes)

> Goal: enable **non-technical users** to complete a full “capsule” round: fill → validate → sign → attest → submit.

## 0. Prereqs
- This repository (latest `main`)
- Installed: `node>=18`, `git`, `gpg`
- Zero-install path: use bundled `vendor/ajv` and `vendor/js-yaml` with `tools/validator.html`

## 1. Get templates (3 options)
- Minimal trio in `templates/minimal/` (`principles.yml`, `loop.yml`, `boundary.yml`)
- Recreate from the “3-line templates” in the books
- (Optional) upcoming Web Form Generator (GUI) to export a ZIP

## 2. Compose `capsule_v0.yaml` (merge the 3 templates)
Suggested shape:
```yaml
meta:
  owner: "<your name>"
  locale: "en-US"
  created_at: "<YYYY-MM-DD>"
  philosophy_ref:
    - "System Exodus - Ch.1"
    - "Beyond the System - Ch.2"
    - "The Ultimate Proposition - Ch.3"
principles:
  - ...
loop:
  trigger: "daily_review"
  steps: ["summarize","extract decisions","schedule next step"]
boundary:
  non_negotiables: ["8h sleep", "no non-consensual extraction of time"]
ethical_flag: 0
```

## 3. Validate (JSON Schema)
**Option A (npx):**
```bash
npx ajv-cli@5.0.0 validate   -s schemas/fireseed_capsule.schema.json   -d capsule_v0.yaml --strict=false
```
**Option B (bundled vendor):**
- Open `tools/validator.html` (serve with VS Code Live Server or `python3 -m http.server`)
- Drop your `capsule_v0.yaml` to validate with `vendor/js-yaml` + `vendor/ajv`

## 4. Sign (GPG)
```bash
gpg --full-generate-key
gpg --armor --export <you@example.com> > public.asc
gpg --clearsign capsule_v0.yaml
gpg --verify capsule_v0.yaml.asc
```

## 5. (Optional) Attest / Archive
- IPFS: `ipfs add capsule_v0.yaml.asc`
- Pin: Pinata / web3.storage
- Print an A6 pocket card (fingerprint, verify URL, revocation policy)

## 6. Submit (PR)
```bash
git checkout -b submit/<your-id>
mkdir -p submissions/<your-id> && mv capsule_v0.yaml* submissions/<your-id>/
git add submissions/<your-id>
git commit -m "feat: capsule submission (<your-id>)"
git push -u origin HEAD
```
