import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/wordlists/english';
import * as ed from '@noble/ed25519';
import { createHash } from 'crypto';

const readStdin = async () => new TextDecoder().decode(await new Response(process.stdin).arrayBuffer());

async function main() {
  const cmd = process.argv[2];
  if (cmd === 'gen') {
    const mnemonic = generateMnemonic(wordlist, 128); // 12 words
    console.log(mnemonic);
  } else if (cmd === 'to-ed25519') {
    const input = (process.argv[3] && process.argv[3] !== '-')
      ? process.argv.slice(3).join(' ')
      : (await readStdin()).trim();
    if (!validateMnemonic(input, wordlist)) {
      console.error('Invalid mnemonic'); process.exit(2);
    }
    const seed = mnemonicToSeedSync(input); // PBKDF2-HMAC-SHA512
    // SLIP-0010 style：用 seed 的 SHA-512 前 32 字节作为私钥原料（简单可复现）
    const I = createHash('sha512').update(seed).digest();
    const sk = I.subarray(0, 32);
    const pk = await ed.getPublicKey(sk);
    console.log(JSON.stringify({
      algo: 'ed25519',
      secretKeyHex: Buffer.from(sk).toString('hex'),
      publicKeyHex: Buffer.from(pk).toString('hex')
    }, null, 2));
  } else {
    console.error('Usage: npm run seed:gen | npm run seed:to-ed25519 [mnemonic|-]');
    process.exit(1);
  }
}
main();
