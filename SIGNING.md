# Fireseed Signing Specification

## Canonical Form & Verification

All signing and verification MUST operate on the canonical JSON form of the
capsule payload **without any pre-processing or normalization steps**. The
process is:

1. Parse the incoming JSON capsule as-is.
2. Remove the top-level `signature` field.
3. Encode the remaining object with RFC8785 canonical JSON via
   [`canonicaljson`](https://pypi.org/project/canonicaljson/).
4. Verify the resulting bytes with Ed25519 using the author public key.

Signatures and public keys are encoded with standard unpadded base64.

## Test Vectors

Four verification vectors are maintained under `examples/vectors/`:

1. **pass.json** – a valid capsule and signature that MUST verify.
2. **missing_field.json** – the `signature` field is absent and MUST fail.
3. **tampered_byte.json** – payload content is mutated and MUST fail.
4. **revoked_key.json** – the payload is signed by key A but advertises key B,
   simulating a revoked or rotated key. Verification MUST fail. Revocation list
   handling is out-of-scope for this PR.

## Public Key Fingerprints

Fingerprints are derived identically across implementations as:

```
hex_lower( sha256( base64_decode(pubkey) ) )[0:16]
```

The `.well-known/fireseed-trilogy/v0/keys` registry publishes Ed25519 public
keys with their fingerprints and the last update timestamp.
