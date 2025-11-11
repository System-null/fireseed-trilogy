import { idbGet, idbSet } from '@/lib/idb';

const USER_ID_KEY = 'fs-user-id';
const CRED_ID_KEY = 'fs-cred-id';
const PRIV_JWK_KEY = 'ecdsa-priv-jwk';
const PUB_JWK_KEY  = 'ecdsa-pub-jwk';

function randomBuf(len = 32) {
  const a = new Uint8Array(len);
  crypto.getRandomValues(a);
  return a;
}

function b64uToBytes(b64u: string) {
  const b64 = b64u.replace(/-/g, '+').replace(/_/g, '/');
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(b64 + pad);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

function bytesToB64u(u8: Uint8Array) {
  let bin = '';
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
}

function getOrMakeUserId(): Uint8Array {
  let hex = localStorage.getItem(USER_ID_KEY);
  if (!hex) {
    hex = Array.from(randomBuf(16)).map(b => b.toString(16).padStart(2,'0')).join('');
    localStorage.setItem(USER_ID_KEY, hex);
  }
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.slice(i*2, i*2+2), 16);
  return arr;
}

/** WebAuthn 注册：返回 credentialId（Base64URL） */
export async function registerPasskey(): Promise<string> {
  if (!('credentials' in navigator)) throw new Error('WebAuthn not supported');
  const challenge = randomBuf(32);
  const userId = getOrMakeUserId();

  const cred = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { id: location.hostname, name: 'Fireseed' },
      user: { id: userId, name: 'fireseed-user', displayName: 'Fireseed User' },
      pubKeyCredParams: [{ alg: -7, type: 'public-key' }], // ES256
      authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
      timeout: 60000
    }
  }) as PublicKeyCredential;

  const id = bytesToB64u(new Uint8Array(cred.rawId));
  await idbSet(CRED_ID_KEY, id);
  return id;
}

/** WebAuthn 签名（Base64URL） */
export async function signWithPasskey(data: Uint8Array): Promise<string> {
  const id = await idbGet<string>(CRED_ID_KEY);
  if (!id) throw new Error('No credential. Please register first.');
  const allowId = b64uToBytes(id);

  const assertion = await navigator.credentials.get({
    publicKey: { challenge: data, allowCredentials: [{ id: allowId, type: 'public-key' }], timeout: 60000 }
  }) as PublicKeyCredential;

  const resp = assertion.response as AuthenticatorAssertionResponse;
  return bytesToB64u(new Uint8Array(resp.signature));
}

/** 兜底：首次生成“可导出”→ 导出 JWK 存 IDB；使用时以“不可导出”导入 */
export async function fallbackEnsureKey(): Promise<CryptoKeyPair> {
  const [privJwk, pubJwk] = await Promise.all([
    idbGet<JsonWebKey>(PRIV_JWK_KEY),
    idbGet<JsonWebKey>(PUB_JWK_KEY)
  ]);

  if (privJwk && pubJwk) {
    const [priv, pub] = await Promise.all([
      crypto.subtle.importKey('jwk', privJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']),
      crypto.subtle.importKey('jwk', pubJwk,  { name: 'ECDSA', namedCurve: 'P-256' }, true,  ['verify'])
    ]);
    return { privateKey: priv, publicKey: pub } as CryptoKeyPair;
  }

  // 首次：允许导出以便持久化
  const gen = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign','verify']);
  const [pJwk, uJwk] = await Promise.all([
    crypto.subtle.exportKey('jwk', gen.privateKey),
    crypto.subtle.exportKey('jwk', gen.publicKey)
  ]);

  await Promise.all([idbSet(PRIV_JWK_KEY, pJwk), idbSet(PUB_JWK_KEY, uJwk)]);

  // 使用时再以不可导出导入
  const [priv, pub] = await Promise.all([
    crypto.subtle.importKey('jwk', pJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']),
    crypto.subtle.importKey('jwk', uJwk, { name: 'ECDSA', namedCurve: 'P-256' }, true,  ['verify'])
  ]);
  return { privateKey: priv, publicKey: pub } as CryptoKeyPair;
}

export async function fallbackSign(data: Uint8Array): Promise<ArrayBuffer> {
  const { privateKey } = await fallbackEnsureKey();
  return crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, data);
}
