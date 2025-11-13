import { describe, expect, it } from 'vitest';
import { CarReader } from '@ipld/car';
import * as dagCbor from '@ipld/dag-cbor';

import {
  canonicalize,
  encodeDagCbor,
  sha256,
  sign,
  toCAR,
  toCID,
  verify
} from './index';

const PRIV_KEY_HEX =
  '9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60';
const PUB_KEY_HEX =
  'd75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a';
const SECOND_PRIV_KEY_HEX =
  '4ccd089b28ff96da9db6c346ec114e0f5b8a319f35aba624da8cf6ed4fb8a6fb';
const SECOND_PUB_KEY_HEX =
  '3d4017c3e843895a92b70aa74d1b7ebc9c982ccf2ec4968cc0cd55f12af4660c';

describe('CID determinism', () => {
  it('computes same CID for flat objects with different key order', () => {
    const a = { a: 1, b: 2, c: 3 };
    const b = { c: 3, b: 2, a: 1 };
    const cidA = toCID(encodeDagCbor(a));
    const cidB = toCID(encodeDagCbor(b));
    expect(cidA).toEqual(cidB);
  });

  it('computes same CID for nested objects with different key order', () => {
    const a = { alpha: 1, nested: { beta: 2, gamma: 3 } };
    const b = { nested: { gamma: 3, beta: 2 }, alpha: 1 };
    const cidA = toCID(encodeDagCbor(a));
    const cidB = toCID(encodeDagCbor(b));
    expect(cidA).toEqual(cidB);
  });

  it('computes same CID when arrays contain objects with different key order', () => {
    const a = {
      list: [
        { name: 'alice', age: 30 },
        { name: 'bob', age: 28 }
      ]
    };
    const b = {
      list: [
        { age: 30, name: 'alice' },
        { age: 28, name: 'bob' }
      ]
    };
    const cidA = toCID(encodeDagCbor(a));
    const cidB = toCID(encodeDagCbor(b));
    expect(cidA).toEqual(cidB);
  });
});

describe('canonicalization rules', () => {
  it('ignores undefined properties when computing CID', () => {
    const original = { a: 1, b: undefined, nested: { c: 3, d: undefined } };
    const cleaned = { a: 1, nested: { c: 3 } };
    const cidOriginal = toCID(encodeDagCbor(original));
    const cidCleaned = toCID(encodeDagCbor(cleaned));
    expect(cidOriginal).toEqual(cidCleaned);
  });
});

describe('signatures', () => {
  it('signs and verifies canonical payload', () => {
    const payload = { hello: 'world' };
    const bytes = encodeDagCbor(payload);
    const signature = sign(bytes, PRIV_KEY_HEX);
    const verified = verify(bytes, signature, PUB_KEY_HEX);
    expect(verified).toBe(true);
  });

  it('signs and verifies a second payload', () => {
    const payload = { hello: 'again', count: 2 };
    const bytes = encodeDagCbor(payload);
    const signature = sign(bytes, SECOND_PRIV_KEY_HEX);
    const verified = verify(bytes, signature, SECOND_PUB_KEY_HEX);
    expect(verified).toBe(true);
  });

  it('fails verification when payload is tampered', () => {
    const payload = { hello: 'world' };
    const bytes = encodeDagCbor(payload);
    const signature = sign(bytes, PRIV_KEY_HEX);
    const tamperedBytes = encodeDagCbor({ hello: 'mars' });
    expect(verify(tamperedBytes, signature, PUB_KEY_HEX)).toBe(false);
  });

  it('fails verification with incorrect public key', () => {
    const payload = { hello: 'world' };
    const bytes = encodeDagCbor(payload);
    const signature = sign(bytes, PRIV_KEY_HEX);
    expect(verify(bytes, signature, SECOND_PUB_KEY_HEX)).toBe(false);
  });
});

describe('CAR helpers', () => {
  it('CAR output contains only the specified root', async () => {
    const payload = { hello: 'car' };
    const blockBytes = encodeDagCbor(payload);
    const cid = toCID(blockBytes);
    const carBytes = await toCAR(cid, blockBytes);
    const reader = await CarReader.fromBytes(carBytes);
    const roots = await reader.getRoots();
    expect(roots).toHaveLength(1);
    expect(roots[0].toString()).toEqual(cid);
    const block = await reader.get(roots[0]);
    expect(block).not.toBeNull();
    const decoded = dagCbor.decode(block.bytes);
    expect(decoded).toEqual(canonicalize(payload));
  });
});

describe('sha256', () => {
  it('matches known digest vector', () => {
    const input = new TextEncoder().encode('abc');
    const digest = sha256(input);
    expect(Buffer.from(digest).toString('hex')).toEqual(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
  });
});
