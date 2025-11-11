#!/usr/bin/env node
// Build a single-block CAR from a JSON file using DAG-CBOR and print the CID
import fs from "node:fs/promises";
import path from "node:path";
import * as dagCbor from "@ipld/dag-cbor";      // v8.x
import { sha256 } from "multiformats/hashes/sha2";
import { CID } from "multiformats/cid";
import { CarWriter } from "@ipld/car";

const inPath = process.argv[2] || "examples/capsule.sample.json";
const outDir = "artifacts";
await fs.mkdir(outDir, { recursive: true });

const content = JSON.parse(await fs.readFile(inPath, "utf8"));
const bytes = dagCbor.encode(content);
const hash = await sha256.digest(bytes);
const cid = CID.createV1(dagCbor.code, hash);

// write single-block CAR
const carPath = path.join(outDir, "capsule.car");
const { writer, out } = CarWriter.create([cid]);
const chunks = [];
const consumer = (async () => {
  for await (const chunk of out) chunks.push(chunk);
  await fs.writeFile(carPath, Buffer.concat(chunks));
})();
await writer.put({ cid, bytes });
await writer.close();
await consumer;

await fs.writeFile(path.join(outDir, "cid.txt"), cid.toString() + "\n");
console.log(cid.toString());
