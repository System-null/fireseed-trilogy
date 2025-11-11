import { describe, it, expect } from 'vitest';

import { signCapsule } from '../scripts/sign-capsule.js';

const PRIVATE_KEY_HEX = '9f1c2d3e4b5a69788796a5b4e3d2c1f0ffeeddccbbaa99887766554433221100';

const baseCapsule = {
  id: 'capsule:determinism',
  subject: {
    did: 'did:fireseed:example:12345',
    claims: {
      name: 'Fireseed Trilogy',
      description: 'Deterministic signing fixture',
      tags: ['ipld', 'deterministic', 'signature']
    },
    revision: 7
  },
  meta: {
    createdAt: '2024-01-12T08:15:30Z',
    expiresAt: '2030-01-01T00:00:00Z',
    schema: 'https://schemas.fireseedtrilogy.org/capsule'
  }
};

function reorderObject(value, comparator) {
  if (Array.isArray(value)) {
    return value.map((item) => reorderObject(item, comparator));
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const entries = Object.entries(value)
      .map(([key, val]) => [key, reorderObject(val, comparator)])
      .sort((a, b) => comparator(a[0], b[0]));
    const reordered = {};
    for (const [key, val] of entries) {
      reordered[key] = val;
    }
    return reordered;
  }
  return value;
}

const capsuleAscending = reorderObject(baseCapsule, (a, b) => a.localeCompare(b));
const capsuleDescending = reorderObject(baseCapsule, (a, b) => b.localeCompare(a));

describe('capsule signing determinism', () => {
  it('produces stable signatures regardless of key order', async () => {
    const signedAscending = await signCapsule(capsuleAscending, PRIVATE_KEY_HEX);
    const signedDescending = await signCapsule(capsuleDescending, PRIVATE_KEY_HEX);

    expect(signedAscending.cid).toEqual(signedDescending.cid);
    expect(signedAscending.cidBytes).toEqual(signedDescending.cidBytes);
    expect(signedAscending.signature).toEqual(signedDescending.signature);
    expect(signedAscending.publicKey).toEqual(signedDescending.publicKey);
  });
});
