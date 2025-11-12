export function base64urlToBytes(s: string): Uint8Array {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 ? 4 - (s.length % 4) : 0;
  s = s + '='.repeat(pad);
  const atobFn = typeof atob === 'function'
    ? atob
    : (b64: string) => {
        const buf = (globalThis as any).Buffer;
        if (!buf) {
          throw new Error('Base64 decoder not available');
        }
        return buf.from(b64, 'base64').toString('binary');
      };
  const bin = atobFn(s);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

export async function importEd25519JWK(jwk: JsonWebKey): Promise<CryptoKey> {
  if (jwk.kty !== 'OKP' || jwk.crv !== 'Ed25519') {
    throw new Error('Invalid JWK: must be OKP/Ed25519');
  }
  if (jwk.d) {
    const pv = base64urlToBytes(jwk.d);
    if (pv.length !== 32) throw new Error('Ed25519 private key must be 32 bytes');
    const first4 = pv.slice(0, 4);
    if (first4.every(b => b === 0)) throw new Error('Private key appears low-entropy');
  }
  if (jwk.x) {
    const pub = base64urlToBytes(jwk.x);
    if (pub.length !== 32) throw new Error('Ed25519 public key must be 32 bytes');
  }
  return crypto.subtle.importKey('jwk', jwk, { name: 'Ed25519' }, true, ['sign', 'verify']);
}
