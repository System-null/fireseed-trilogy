import { CarReader } from '@ipld/car';

export async function assertCarMatchesCid(carBytes, expectedCid) {
  const reader = await CarReader.fromBytes(carBytes);
  const roots = await reader.getRoots();
  if (roots.length !== 1) throw new Error('CAR must have exactly one root');
  const got = roots[0].toString();
  if (got !== expectedCid) throw new Error(`CID mismatch: CAR root ${got} != expected ${expectedCid}`);
}
