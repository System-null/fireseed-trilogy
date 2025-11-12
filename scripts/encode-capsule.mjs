#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as dagCbor from '@ipld/dag-cbor';
import { sha256 } from '@noble/hashes/sha256';
import * as Digest from 'multiformats/hashes/digest';
import { CID } from 'multiformats/cid';
import { wipe } from '@noble/hashes/utils';

const require = createRequire(import.meta.url);

function deepClean(v) {
  if (v === undefined) return undefined;
  if (Array.isArray(v)) return v.map(deepClean).filter(x => x !== undefined);
  if (v && typeof v === 'object' && v.constructor === Object) {
    const o = {};
    for (const k of Object.keys(v).sort()) {
      const c = deepClean(v[k]);
      if (c !== undefined) o[k] = c;
    }
    return o;
  }
  return v;
}

async function main() {
  const input = process.argv[2] || 'capsule.json';
  const outDir = process.argv[3] || 'artifacts';
  await fs.mkdir(outDir, { recursive: true });
  const raw = await fs.readFile(input, 'utf8');
  const capsule = JSON.parse(raw);

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const schema = JSON.parse(await fs.readFile('schemas/capsule_v0.schema.json', 'utf8'));
  const validate = ajv.compile(schema);
  if (!validate(capsule)) {
    console.error('Schema validation failed:', validate.errors);
    process.exit(1);
  }

  const cleaned = deepClean(capsule);
  const encoded = dagCbor.encode(cleaned);
  const hash = sha256(encoded);
  const mh = Digest.create(0x12, hash); // 0x12 = sha2-256
  const cid = CID.createV1(dagCbor.code, mh);

  await fs.writeFile(path.join(outDir, 'capsule.dag-cbor'), encoded);
  await fs.writeFile(path.join(outDir, 'capsule.cid'), cid.toString(), 'utf8');

  // 清理内存
  wipe(hash); wipe(encoded);

  console.log(`CID: ${cid}`);
}
main().catch(e => { console.error(e); process.exit(1); });
