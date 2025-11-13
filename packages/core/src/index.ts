import { CarWriter } from '@ipld/car';
import * as dagCbor from '@ipld/dag-cbor';
import { ed25519 } from '@noble/curves/ed25519';
import { sha256 as nobleSha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { CID } from 'multiformats/cid';
import { create as createDigest } from 'multiformats/hashes/digest';

export const coreVersion = '0.1.0';

export const coreDependencies = [
  '@ipld/car',
  '@ipld/dag-cbor',
  '@noble/curves',
  '@noble/hashes',
  'ajv',
  'multiformats'
] as const;

const MULTIHASH_SHA_256_CODE = 0x12;

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type Canonicalizable = JsonValue | undefined;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function canonicalizeValue(value: Canonicalizable): Canonicalizable {
  if (value === undefined || value === null) {
    return value === undefined ? undefined : null;
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    const canonicalArray: JsonValue[] = [];
    for (const element of value) {
      const canonicalElement = canonicalizeValue(element as Canonicalizable);
      if (canonicalElement !== undefined) {
        canonicalArray.push(canonicalElement as JsonValue);
      }
    }
    return canonicalArray;
  }

  if (isPlainObject(value)) {
    const entries = Object.keys(value).sort();
    const result: Record<string, JsonValue> = {};
    for (const key of entries) {
      const canonicalEntry = canonicalizeValue(value[key] as Canonicalizable);
      if (canonicalEntry !== undefined) {
        result[key] = canonicalEntry as JsonValue;
      }
    }
    return result;
  }

  return value as JsonValue;
}

export function canonicalize<T extends Canonicalizable>(input: T): Exclude<Canonicalizable, undefined> {
  const canonical = canonicalizeValue(input);
  if (canonical === undefined) {
    throw new TypeError('Cannot canonicalize undefined value');
  }
  return canonical;
}

export function encodeDagCbor(value: Canonicalizable): Uint8Array {
  const canonical = canonicalize(value);
  return dagCbor.encode(canonical as JsonValue);
}

export function sha256(bytes: Uint8Array): Uint8Array {
  return Uint8Array.from(nobleSha256.create().update(bytes).digest());
}

export function toCID(bytes: Uint8Array): string {
  const digest = createDigest(MULTIHASH_SHA_256_CODE, sha256(bytes));
  const cid = CID.create(1, dagCbor.code, digest);
  return cid.toString();
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

export async function toCAR(cid: string | CID, blockBytes: Uint8Array): Promise<Uint8Array> {
  const rootCid = typeof cid === 'string' ? CID.parse(cid) : cid;
  const { writer, out } = CarWriter.create([rootCid]);
  const chunks: Uint8Array[] = [];
  const collectPromise = (async () => {
    for await (const chunk of out) {
      chunks.push(chunk);
    }
  })();

  await writer.put({ cid: rootCid, bytes: blockBytes });
  await writer.close();
  await collectPromise;

  return concatBytes(chunks);
}

export function sign(bytes: Uint8Array, secretKeyHex: string): string {
  const secretKey = hexToBytes(secretKeyHex);
  try {
    const signature = ed25519.sign(bytes, secretKey);
    return bytesToHex(signature);
  } finally {
    secretKey.fill(0);
  }
}

export function verify(bytes: Uint8Array, signatureHex: string, publicKeyHex: string): boolean {
  const signature = hexToBytes(signatureHex);
  const publicKey = hexToBytes(publicKeyHex);
  return ed25519.verify(signature, bytes, publicKey);
}
