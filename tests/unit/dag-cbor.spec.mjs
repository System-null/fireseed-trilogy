import { describe, it, expect } from 'vitest';
import { encodeAndCid } from '../../scripts/lib/encode.mjs';

describe('DAG-CBOR determinism (nested)', () => {
  it('same input => same CID with nested arrays/objects', async () => {
    const sample = {
      metadata: { nested: { deep: [1, 2, { k: 'v', n: null }] } },
      array: [undefined, null, 42, { a: 1, b: [undefined, 3] }],
      title: 'fireseed',
    };
    const a = await encodeAndCid(sample, { inMemory: true });
    const b = await encodeAndCid(sample, { inMemory: true });
    expect(a.cid).toEqual(b.cid);
  });
});
