// 从 newline 列表构建 dag-cbor Map -> 写成 CAR，打印根 CID
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { encode } from '@ipld/dag-cbor';
import { CarWriter } from '@ipld/car';
import { CID } from 'multiformats/cid';
import * as sha256 from 'multiformats/hashes/sha2';

function loadList(p) {
  return readFileSync(p, 'utf8').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
}
const listPath = process.argv[2] || 'revocations.list';
const outFlag = process.argv.indexOf('--out');
const outPath = outFlag > -1 ? process.argv[outFlag+1] : 'artifacts/revocations.car';

const revoked = {};
for (const k of loadList(listPath)) revoked[k] = true;

const bytes = encode(revoked);
const hash = await sha256.sha256.digest(bytes);
const root = CID.create(1, 0x71, hash);  // 0x71 dag-cbor

if (!existsSync('artifacts')) mkdirSync('artifacts', { recursive: true });
const { writer, out } = CarWriter.create([root]);
const collect = (async () => {
  const chunks = [];
  for await (const chunk of out) {
    chunks.push(chunk);
  }
  writeFileSync(outPath, Buffer.concat(chunks));
  console.log(root.toString()); // 打印根CID
})();
await writer.put({ cid: root, bytes });
await writer.close();
await collect;
