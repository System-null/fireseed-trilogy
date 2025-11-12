import { generateMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { sha256 } from '@noble/hashes/sha256';

const toHex = (u8) => Array.from(u8).map(b => b.toString(16).padStart(2,'0')).join('');

const mnemonic = generateMnemonic(wordlist, 256); // 24 words
const seed = mnemonicToSeedSync(mnemonic);
const seedHex = toHex(seed);
const seedId = toHex(sha256(seed));

console.log(JSON.stringify({ mnemonic, seedHex, seedId }, null, 2));
