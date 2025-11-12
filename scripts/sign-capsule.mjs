#!/usr/bin/env node
// Deterministic CID (dag-cbor) + Ed25519 signing of cid.bytes
import fs from "node:fs";
import process from "node:process";
import * as dagCbor from "@ipld/dag-cbor";            // v8.x
import { sha256 } from "multiformats/hashes/sha2";
import { CID } from "multiformats/cid";
import * as ed from "@noble/ed25519";
import { hexToBytes, bytesToHex, wipe } from "@noble/hashes/utils";
import { sha512 } from "@noble/hashes/sha512";

if (!ed.etc.sha512Sync) {
  ed.etc.sha512Sync = (...m) => sha512(...m);
}
if (!ed.etc.sha512Async) {
  ed.etc.sha512Async = async (...m) => sha512(...m);
}

/** Compute CIDv1(dag-cbor) from an object deterministically */
export async function computeCid(obj) {
  let bytes;
  try {
    bytes = dagCbor.encode(obj);                      // canonical binary
    const hash = await sha256.digest(bytes);
    return CID.createV1(dagCbor.code, hash);
  } finally {
    if (bytes) {
      wipe(bytes);
    }
  }
}

/** Sign cid.bytes with Ed25519 private key (hex) */
export async function signCid(cid, privHex) {
  let sk;
  try {
    sk = hexToBytes(privHex.replace(/^0x/, ""));
    const sig = await ed.sign(cid.bytes, sk);
    const pk = await ed.getPublicKey(sk);
    return {
      signatureHex: bytesToHex(sig),
      pubkeyHex: bytesToHex(pk),
    };
  } finally {
    if (sk) {
      wipe(sk);
    }
  }
}

/** CLI: node scripts/sign-capsule.mjs <json-file> [--privkey-file <path>] */
async function main() {
  const file = process.argv[2];
  const privkeyFileIndex = process.argv.indexOf("--privkey-file");
  const privkeyFile = privkeyFileIndex > -1 ? process.argv[privkeyFileIndex + 1] : null;

  if (!file) {
    console.error("Usage: node scripts/sign-capsule.mjs <json-file> [--privkey-file <path>]");
    console.error("Provide FIRESEED_PRIVKEY env or --privkey-file.");
    process.exit(2);
  }

  let priv = null;

  if (privkeyFileIndex > -1) {
    if (!privkeyFile) {
      console.error("Missing value for --privkey-file");
      process.exit(2);
    }
    try {
      priv = fs.readFileSync(privkeyFile, "utf8").trim();
    } catch (err) {
      console.error(`Unable to read private key file: ${privkeyFile}`);
      console.error(err.message);
      process.exit(1);
    }
  } else if (process.env.FIRESEED_PRIVKEY) {
    priv = process.env.FIRESEED_PRIVKEY.trim();
  }

  if (!priv) {
    console.error("No private key provided. Use FIRESEED_PRIVKEY or --privkey-file.");
    process.exit(2);
  }

  const obj = JSON.parse(fs.readFileSync(file, "utf8"));
  const cid = await computeCid(obj);
  const { signatureHex, pubkeyHex } = await signCid(cid, priv);
  priv = null;
  const out = { cid: cid.toString(), signatureHex, pubkeyHex, algorithm: "ed25519" };
  console.log(JSON.stringify(out, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
