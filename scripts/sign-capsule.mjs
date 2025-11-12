#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { ed25519 } from '@noble/curves/ed25519';
import { hexToBytes, bytesToHex, wipe } from '@noble/hashes/utils';

function getArg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  if (i > -1 && process.argv[i + 1]) return process.argv[i + 1];
  return def;
}

async function readPrivKey() {
  const fromFile = getArg('privkey-file');
  if (fromFile) return (await fs.readFile(fromFile, 'utf8')).trim();
  if (process.env.FIRESEED_PRIVKEY) return process.env.FIRESEED_PRIVKEY.trim();
  const fromHex = getArg('privkey');
  if (fromHex) return fromHex.trim();
  throw new Error('No private key provided. Use --privkey-file, FIRESEED_PRIVKEY, or --privkey');
}

async function main() {
  const dagPath = getArg('input', 'artifacts/capsule.dag-cbor');
  const outDir = getArg('out', 'artifacts');
  await fs.mkdir(outDir, { recursive: true });

  const dag = await fs.readFile(dagPath);
  const hex = await readPrivKey();

  const priv = hexToBytes(hex);
  try {
    const sig = ed25519.sign(dag, priv);
    const sigHex = bytesToHex(sig);
    await fs.writeFile(path.join(outDir, 'capsule.sig'), sigHex, 'utf8');
    console.log('Signature written to artifacts/capsule.sig');
  } finally {
    wipe(priv); wipe(dag);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
