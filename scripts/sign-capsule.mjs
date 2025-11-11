#!/usr/bin/env node
// Deterministic CID (dag-cbor) + Ed25519 signing of cid.bytes
import fs from "node:fs";
import process from "node:process";
import * as dagCbor from "@ipld/dag-cbor";            // v8.x
import { sha256 } from "multiformats/hashes/sha2";
import { CID } from "multiformats/cid";
import * as ed from "@noble/ed25519";
import { hexToBytes, bytesToHex } from "@noble/hashes/utils";
import { sha512 } from "@noble/hashes/sha512";

if (!ed.etc.sha512Sync) {
  ed.etc.sha512Sync = (...m) => sha512(...m);
}
if (!ed.etc.sha512Async) {
  ed.etc.sha512Async = async (...m) => sha512(...m);
}

/** Compute CIDv1(dag-cbor) from an object deterministically */
export async function computeCid(obj) {
  const bytes = dagCbor.encode(obj);                  // canonical binary
  const hash = await sha256.digest(bytes);
  return CID.createV1(dagCbor.code, hash);
}

/** Sign cid.bytes with Ed25519 private key (hex) */
export async function signCid(cid, privHex) {
  const sk = hexToBytes(privHex.replace(/^0x/, ""));
  const sig = await ed.sign(cid.bytes, sk);
  const pk = await ed.getPublicKey(sk);
  return {
    signatureHex: bytesToHex(sig),
    pubkeyHex: bytesToHex(pk),
  };
}

/** CLI: node scripts/sign-capsule.mjs <json-file> --privkey <hex> */
async function main() {
  const file = process.argv[2];
  const i = process.argv.indexOf("--privkey");
  const priv = i > -1 ? process.argv[i + 1] : null;
  if (!file || !priv) {
    console.error("Usage: node scripts/sign-capsule.mjs <json-file> --privkey <hex>");
    process.exit(2);
  }
  const obj = JSON.parse(fs.readFileSync(file, "utf8"));
  const cid = await computeCid(obj);
  const { signatureHex, pubkeyHex } = await signCid(cid, priv);
  const out = { cid: cid.toString(), signatureHex, pubkeyHex, algorithm: "ed25519" };
  console.log(JSON.stringify(out, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
