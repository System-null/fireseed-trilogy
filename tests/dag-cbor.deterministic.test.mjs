import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import * as dagCbor from '@ipld/dag-cbor';
import { sha256 } from '@noble/hashes/sha256';
import * as Digest from 'multiformats/hashes/digest';
import { CID } from 'multiformats/cid';

function clean(v) {
  if (v === undefined) return undefined;
  if (Array.isArray(v)) return v.map(clean).filter(x => x !== undefined);
  if (v && typeof v === 'object' && v.constructor === Object) {
    const o = {};
    for (const k of Object.keys(v).sort()) {
      const c = clean(v[k]);
      if (c !== undefined) o[k] = c;
    }
    return o;
  }
  return v;
}
function cidOf(o) {
  const enc = dagCbor.encode(clean(o));
  const h = sha256(enc);
  const mh = Digest.create(0x12, h);
  return CID.createV1(dagCbor.code, mh).toString();
}

describe('deterministic dag-cbor', () => {
  it('nested objects produce stable CID', () => {
    const a = { x: 1, y: { z: [1, 2, { k: 'v' }] }, u: undefined };
    const c1 = cidOf(a), c2 = cidOf(a);
    expect(c1).toBe(c2);
  });

  it('light fuzz idempotence', () => {
    fc.assert(
      fc.property(fc.object(), (obj) => {
        const c1 = cidOf(obj), c2 = cidOf(obj);
        return c1 === c2;
      }),
      { numRuns: 25 }
    );
  });
});
