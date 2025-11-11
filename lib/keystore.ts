import { idbGet, idbSet } from './idb';

const USER_ID_KEY = 'fs-user-id';
const CRED_ID_KEY = 'fs-cred-id';

// JWK 存储键
const PRIV_JWK_KEY = 'ecdsa-jwk-priv';
const PUB_JWK_KEY  = 'ecdsa-jwk-pub';

function randomBuf(len = 32) {
  const a = new Uint8Array(len);
  crypto.getRandomValues(a);
  return a;
}

function getOrMakeUserId(): Uint8Array {
  let hex = localStorage.getItem(USER_ID_KEY);
  if (!hex) {
    hex = Array.from(randomBuf(16)).map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(USER_ID_KEY, hex);
  }
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
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

  const id = btoa(String.fromCharCode(...new Uint8Array(cred.rawId)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  await idbSet(CRED_ID_KEY, id);
  return id;
}

/** WebAuthn 签名：返回 Base64URL 签名 */
export async function signWithPasskey(data: Uint8Array): Promise<string> {
  const id = await idbGet<string>(CRED_ID_KEY);
  if (!id) throw new Error('No credential. Please register first.');

  const allowId = Uint8Array.from(atob(id.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: data,
      allowCredentials: [{ id: allowId, type: 'public-key' }],
      timeout: 60000
    }
  }) as PublicKeyCredential;

  const resp = assertion.response as AuthenticatorAssertionResponse;
  const sig = new Uint8Array(resp.signature);
  return btoa(String.fromCharCode(...sig)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** 兜底：使用 JWK 持久化到 IndexedDB，运行时以不可导出方式导入 */
export async function fallbackEnsureKey(): Promise<CryptoKeyPair> {
  // 1) 读取已存的 JWK
  const [privJwk, pubJwk] = await Promise.all([
    idbGet<JsonWebKey>(PRIV_JWK_KEY),
    idbGet<JsonWebKey>(PUB_JWK_KEY)
  ]);

  if (privJwk && pubJwk) {
    const [privateKey, publicKey] = await Promise.all([
      crypto.subtle.importKey('jwk', privJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']),
      crypto.subtle.importKey('jwk', pubJwk,  { name: 'ECDSA', namedCurve: 'P-256' }, true,  ['verify'])
    ]);
    return { privateKey, publicKey } as CryptoKeyPair;
  }

  // 2) 首次生成：允许导出 → 导出 JWK → 存 IDB
  const gen = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true, // 允许导出以便持久化
    ['sign', 'verify']
  );
  const [pJwk, uJwk] = await Promise.all([
    crypto.subtle.exportKey('jwk', gen.privateKey),
    crypto.subtle.exportKey('jwk', gen.publicKey)
  ]);
  await Promise.all([idbSet(PRIV_JWK_KEY, pJwk), idbSet(PUB_JWK_KEY, uJwk)]);

  // 3) 使用时以不可导出方式导入
  const [privateKey, publicKey] = await Promise.all([
    crypto.subtle.importKey('jwk', pJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']),
    crypto.subtle.importKey('jwk', uJwk, { name: 'ECDSA', namedCurve: 'P-256' }, true,  ['verify'])
  ]);
  return { privateKey, publicKey } as CryptoKeyPair;
}

export async function fallbackSign(data: Uint8Array): Promise<ArrayBuffer> {
  const { privateKey } = await fallbackEnsureKey();
  return crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, data);
}
