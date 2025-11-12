#!/usr/bin/env node
import { toPrivBytes, loadPrivKeyHex, zeroize } from './lib/keys.mjs';
import * as ed from '@noble/ed25519';
import { bytesToHex } from '@noble/hashes/utils';
import { encodeAndCid } from './lib/encode.mjs';
import fs from 'node:fs/promises';

export async function computeCid(obj) {
  const { cidObj } = await encodeAndCid(obj, { inMemory: true });
  return cidObj;
}

export async function signCid(cid, privHex) {
  let privBytes;
  try {
    privBytes = toPrivBytes(privHex);
    const sig = await ed.signAsync(cid.bytes, privBytes);
    const pubkey = await ed.getPublicKey(privBytes);
    return { signatureHex: bytesToHex(sig), pubkeyHex: bytesToHex(pubkey) };
  } finally {
    if (privBytes) zeroize(privBytes);
  }
}

const args = process.argv.slice(2);
const idxKeyFile = args.indexOf('--privkey-file');
const privkeyFile = idxKeyFile >= 0 ? args[idxKeyFile + 1] : undefined;

const inputPath = args.find(a => a.endsWith('.json') || a.endsWith('.yaml') || a.endsWith('.yml'));
if (!inputPath) throw new Error('Usage: node scripts/sign-capsule.mjs <capsule.json> [--privkey-file <path>]');

const outPath = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'artifacts/sign-out.json';

const { encodedBytes, cid } = await encodeAndCid(inputPath);

let privBytes;
try {
  const privHex = await loadPrivKeyHex({ privkeyFile });
  privBytes = toPrivBytes(privHex);
  const sig = await ed.signAsync(encodedBytes, privBytes);
  const out = { cid, signature: bytesToHex(sig) };
  await fs.mkdir('artifacts', { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(out, null, 2));
  console.log(`OK: ${cid}`);
} finally {
  if (privBytes) zeroize(privBytes);
  if (encodedBytes) zeroize(encodedBytes);
}
