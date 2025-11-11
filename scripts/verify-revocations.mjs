// 校验 CAR 里只有一个 dag-cbor Map，包含 revocations.list 的所有键
import { readFileSync } from 'fs';
import { CarReader } from '@ipld/car';
import { decode } from '@ipld/dag-cbor';

function loadList(p) {
  return new Set(readFileSync(p, 'utf8').split(/\r?\n/).map(s=>s.trim()).filter(Boolean));
}
const carPath = process.argv[2];
const listPath = process.argv[3];
if (!carPath || !listPath) { console.error('Usage: verify-revocations.mjs <car> <list>'); process.exit(1); }

const buf = readFileSync(carPath);
const reader = await CarReader.fromBytes(buf);
const roots = await reader.getRoots();
if (roots.length !== 1) { console.error('Invalid roots'); process.exit(2); }

const block = await reader.get(roots[0]);
const obj = decode(block.bytes);
const expect = loadList(listPath);

for (const k of expect) {
  if (!obj[k]) { console.error(`Missing revoked key: ${k}`); process.exit(3); }
}
console.log('OK: revocations match and root CID =', roots[0].toString());
