#!/usr/bin/env node
// Build a single-block CAR from a JSON or YAML file using DAG-CBOR and print the CID
import fs from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';
import { CarWriter } from '@ipld/car';
import { encodeAndCid } from './lib/encode.mjs';
import { assertCarMatchesCid } from './lib/car-utils.mjs';

const inPath = process.argv[2] || 'examples/capsule.sample.json';
const outDir = 'artifacts';
await fs.mkdir(outDir, { recursive: true });

const { encodedBytes, cid, cidObj } = await encodeAndCid(inPath);

const carPath = path.join(outDir, 'capsule.car');
const { writer, out } = CarWriter.create([cidObj]);
const chunks = [];
const consumer = (async () => {
  for await (const chunk of out) chunks.push(Buffer.from(chunk));
})();
await writer.put({ cid: cidObj, bytes: encodedBytes });
await writer.close();
await consumer;
const carBytes = Buffer.concat(chunks);
await fs.writeFile(carPath, carBytes);
await assertCarMatchesCid(carBytes, cid);

await fs.writeFile(path.join(outDir, 'cid.txt'), cid + '\n');
console.log(cid);
