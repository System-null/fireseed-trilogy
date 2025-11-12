function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function randomKey() {
  const len = 1 + randomInt(6);
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[randomInt(chars.length)];
  return out;
}

function randomValue(depth = 0) {
  const kinds = ['number', 'string', 'boolean', 'null', 'array', 'object', 'undefined'];
  const kind = kinds[randomInt(kinds.length)];
  switch (kind) {
    case 'number':
      return Math.random() * 1000 * (randomInt(2) ? 1 : -1);
    case 'string':
      return randomKey();
    case 'boolean':
      return Boolean(randomInt(2));
    case 'null':
      return null;
    case 'undefined':
      return undefined;
    case 'array': {
      if (depth > 2) return [];
      const len = randomInt(4);
      return Array.from({ length: len }, () => randomValue(depth + 1));
    }
    case 'object':
    default: {
      if (depth > 2) return {};
      return randomObject(depth + 1);
    }
  }
}

function randomObject(depth = 0) {
  const entries = randomInt(4);
  const obj = {};
  for (let i = 0; i < entries; i++) {
    obj[randomKey()] = randomValue(depth);
  }
  return obj;
}

function object() {
  return {
    generate: () => randomObject(),
  };
}

function resolveArbitrary(arbitrary) {
  if (arbitrary && typeof arbitrary.generate === 'function') return arbitrary;
  if (typeof arbitrary === 'function') return { generate: arbitrary };
  return { generate: () => arbitrary };
}

function asyncProperty(arbitrary, predicate) {
  const generator = resolveArbitrary(arbitrary);
  return async () => {
    const value = generator.generate();
    await predicate(value);
  };
}

async function assert(property, opts = {}) {
  const runs = typeof opts.numRuns === 'number' ? opts.numRuns : 1;
  for (let i = 0; i < runs; i++) {
    await property();
  }
}

export { assert, asyncProperty, object };
export default { assert, asyncProperty, object };
