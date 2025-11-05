# Fireseed Repo Patch — v3.7 (index + did:web)

This patch adds three files to make the repo machine-discoverable and DID-compatible:

- `/fireseed.json` — machine-readable index
- `/.well-known/fireseed.json` — discovery endpoint (points to `/fireseed.json`)
- `/did.json` — `did:web` document for the repo

## Apply (from your repo root)

```bash
unzip ~/Downloads/fireseed-repo-patch-v3.7-index-did.zip -d .
git add fireseed.json .well-known/fireseed.json did.json
git commit -m "infra(index): add machine-readable index and did:web document"
git push origin main
```

## Verify

```bash
curl -s https://system-null.github.io/fireseed-trilogy/fireseed.json | jq .format
curl -s https://system-null.github.io/fireseed-trilogy/.well-known/fireseed.json
curl -s https://system-null.github.io/fireseed-trilogy/did.json | jq .id
```

## Fill in later

- Replace `ipfs://<REPLACE_WITH_IPFS_HASH>` inside `fireseed.json` with a real IPFS CID
- Replace `publicKeyMultibase` inside `did.json` with your Ed25519 public key (multibase)
- When you update, bump `"updated"` timestamp in `fireseed.json`

Generated at: 2025-11-05T22:53:05Z (UTC)
