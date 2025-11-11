import fs from 'node:fs/promises';
import process from 'node:process';
import { Buffer } from 'node:buffer';
import { fileURLToPath } from 'node:url';

import { encode, code as dagCborCode } from '@ipld/dag-cbor';
import { CID } from 'multiformats/cid';
import { sha256 } from 'multiformats/hashes/sha2';
import { base58btc } from 'multiformats/bases/base58';
import * as ed25519 from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';
import { canonicalize } from 'json-canonicalize';

const ED25519_PUB_CODE = 0xed;

if (!ed25519.etc.sha512Sync) {
  ed25519.etc.sha512Sync = (msg) => sha512(msg);
}

function encodeVarint(value) {
  const bytes = [];
  let current = value >>> 0;
  while (current >= 0x80) {
    bytes.push((current & 0x7f) | 0x80);
    current >>>= 7;
  }
  bytes.push(current);
  return Uint8Array.from(bytes);
}

function concatUint8Arrays(chunks) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function hexToBytes(hex) {
  if (typeof hex !== 'string' || hex.length === 0) {
    throw new TypeError('Expected non-empty hex string for private key');
  }
  const normalized = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (normalized.length !== 64 && normalized.length !== 128) {
    throw new RangeError('Ed25519 private key must be 32 or 64 bytes expressed as hex');
  }
  if (!/^[0-9a-fA-F]+$/.test(normalized)) {
    throw new TypeError('Private key must be valid hex characters');
  }
  return Uint8Array.from(Buffer.from(normalized, 'hex'));
}

export async function createDagCborCid(payload) {
  const encoded = encode(payload);
  const digest = await sha256.digest(encoded);
  const cid = CID.createV1(dagCborCode, digest);
  return { cid, encoded };
}

export function canonicalizeCapsule(payload) {
  return canonicalize(payload);
}

export async function signCapsule(payload, privateKeyHex) {
  const privateKey = hexToBytes(privateKeyHex);
  const { cid } = await createDagCborCid(payload);
  const signatureBytes = await ed25519.sign(cid.bytes, privateKey);
  const publicKeyBytes = await ed25519.getPublicKey(privateKey);
  const prefixedPublicKey = concatUint8Arrays([
    encodeVarint(ED25519_PUB_CODE),
    publicKeyBytes
  ]);

  return {
    cid: cid.toString(),
    cidBytes: Buffer.from(cid.bytes).toString('base64'),
    signature: Buffer.from(signatureBytes).toString('base64'),
    publicKey: base58btc.encode(prefixedPublicKey)
  };
}

async function runCli(argv) {
  const [, , inputPath] = argv;
  if (!inputPath) {
    console.error('Usage: node scripts/sign-capsule.js <input.json> [--key <hex>]');
    process.exitCode = 1;
    return;
  }

  let keyHex = process.env.ED25519_PRIVATE_KEY || process.env.PRIVATE_KEY;
  const keyFlagIndex = argv.indexOf('--key');
  if (keyFlagIndex !== -1) {
    keyHex = argv[keyFlagIndex + 1];
  }

  if (!keyHex) {
    console.error('Missing Ed25519 private key. Provide via --key <hex> or ED25519_PRIVATE_KEY env var.');
    process.exitCode = 1;
    return;
  }

  const fileContents = await fs.readFile(inputPath, 'utf8');
  const payload = JSON.parse(fileContents);
  const signature = await signCapsule(payload, keyHex);

  const output = {
    ...signature,
    canonical: canonicalizeCapsule(payload)
  };

  console.log(JSON.stringify(output, null, 2));
}

const thisFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] === thisFilePath) {
  runCli(process.argv).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
