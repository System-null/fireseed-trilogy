#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { CarWriter, CarReader } from '@ipld/car';
import { CID } from 'multiformats/cid';

async function main() {
  const dagPath = process.argv[2] || 'artifacts/capsule.dag-cbor';
  const cidText = process.argv[3] || 'artifacts/capsule.cid';
  const outDir = process.argv[4] || 'artifacts';

  await fs.mkdir(outDir, { recursive: true });
  const bytes = await fs.readFile(dagPath);
  const cid = CID.parse((await fs.readFile(cidText, 'utf8')).trim());

  const carPath = path.join(outDir, 'capsule.car');
  {
    const { writer, out } = CarWriter.create([cid]);
    const stream = (await fs.open(carPath, 'w')).createWriteStream();
    out.pipe(stream);
    await writer.put({ cid, bytes });
    await writer.close();
    await new Promise(res => stream.on('close', res));
  }

  // 验证
  const reader = await CarReader.fromBytes(await fs.readFile(carPath));
  const roots = await reader.getRoots();
  if (roots.length !== 1 || roots[0].toString() !== cid.toString()) {
    throw new Error(`CAR root mismatch: ${roots.map(r=>r.toString())} != ${cid}`);
  }
  console.log(`CAR OK: ${carPath} (root ${cid})`);
}
main().catch(e => { console.error(e); process.exit(1); });
