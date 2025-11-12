import fs from 'node:fs/promises';
import { wipe, hexToBytes } from '@noble/hashes/utils';

/** 优先读取文件，其次 env:FIRESEED_PRIVKEY，最后从 stdin */
export async function loadPrivKeyHex(opts = {}) {
  const { privkeyFile } = opts;

  if (privkeyFile) {
    const s = (await fs.readFile(privkeyFile, 'utf8')).trim();
    if (!s) throw new Error('Empty private key file');
    return s;
  }

  if (process.env.FIRESEED_PRIVKEY) {
    const s = process.env.FIRESEED_PRIVKEY.trim();
    if (!s) throw new Error('Empty FIRESEED_PRIVKEY');
    return s;
  }

  if (!process.stdin.isTTY) {
    const s = await new Promise((resolve) => {
      let buf = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (d) => (buf += d));
      process.stdin.on('end', () => resolve(buf.trim()));
    });
    if (!s) throw new Error('Empty private key from stdin');
    return s;
  }

  throw new Error('No private key provided. Use --privkey-file or FIRESEED_PRIVKEY or stdin.');
}

export function toPrivBytes(hex) {
  const normalized = hex.startsWith('0x') ? hex.slice(2) : hex;
  const u8 = hexToBytes(normalized);
  if (u8.length !== 32) throw new Error('Ed25519 private key must be 32 bytes');
  return u8;
}

export function zeroize(u8) {
  try { wipe(u8); } catch {}
}
