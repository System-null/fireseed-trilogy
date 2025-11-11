import assert from 'node:assert/strict';

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

const signedAscending = await signCapsule(capsuleAscending, PRIVATE_KEY_HEX);
const signedDescending = await signCapsule(capsuleDescending, PRIVATE_KEY_HEX);

assert.equal(signedAscending.cid, signedDescending.cid, 'CID should be stable regardless of key order');
assert.equal(signedAscending.cidBytes, signedDescending.cidBytes, 'CID bytes must remain stable');
assert.equal(signedAscending.signature, signedDescending.signature, 'Signature must be stable');
assert.equal(signedAscending.publicKey, signedDescending.publicKey, 'Public key encoding must match');

console.log('Deterministic signing test passed.');
