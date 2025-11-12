import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import * as dagCbor from '@ipld/dag-cbor';
import { sha256 } from 'multiformats/hashes/sha2';
import { CID } from 'multiformats/cid';

let yamlParse;

async function ensureYamlParse() {
  if (yamlParse) return yamlParse;
  try {
    const mod = await import('yaml');
    const candidate = mod.parse ?? mod.default?.parse ?? mod.default ?? mod;
    if (typeof candidate !== 'function') throw new Error('Invalid yaml parser export');
    yamlParse = candidate;
    return yamlParse;
  } catch (err) {
    if (err && err.code !== 'ERR_MODULE_NOT_FOUND') throw err;
  }

  const jsYamlPath = new URL('../../vendor/js-yaml/js-yaml.min.js', import.meta.url);
  const source = await fs.readFile(jsYamlPath, 'utf8');
  const sandbox = { module: { exports: {} }, exports: {}, global: {}, window: {} };
  sandbox.global = sandbox;
  sandbox.window = sandbox;
  vm.runInNewContext(source, sandbox, { filename: jsYamlPath.pathname });
  const exported = sandbox.module.exports || sandbox.exports || sandbox.jsyaml;
  const loadFn = exported?.load || exported?.default?.load || exported?.default;
  if (typeof loadFn !== 'function') throw new Error('Unable to load YAML parser');
  yamlParse = (str) => loadFn(str);
  return yamlParse;
}

async function loadInput(input, opts) {
  if (opts?.inMemory) {
    return input;
  }

  if (typeof input !== 'string') {
    throw new Error('encodeAndCid expects a file path string when not in-memory');
  }

  const ext = path.extname(input).toLowerCase();
  const text = await fs.readFile(input, 'utf8');
  if (ext === '.yaml' || ext === '.yml') {
    const parse = await ensureYamlParse();
    return parse(text);
  }
  return JSON.parse(text);
}

export async function encodeAndCid(input, opts = {}) {
  const content = await loadInput(input, opts);
  const encodedBytes = dagCbor.encode(content);
  const hash = await sha256.digest(encodedBytes);
  const cidObj = CID.createV1(dagCbor.code, hash);
  return { encodedBytes, cid: cidObj.toString(), cidObj };
}
