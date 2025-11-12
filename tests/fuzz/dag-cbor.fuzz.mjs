import fc from 'fast-check';
import { test, expect } from 'vitest';
import { encodeAndCid } from '../../scripts/lib/encode.mjs';

test('deterministic encoding is idempotent for arbitrary objects', async () => {
  await fc.assert(
    fc.asyncProperty(fc.object(), async (obj) => {
      const a = await encodeAndCid(obj, { inMemory: true });
      const b = await encodeAndCid(obj, { inMemory: true });
      expect(a.cid).toEqual(b.cid);
    }),
    { numRuns: 50 }
  );
});
