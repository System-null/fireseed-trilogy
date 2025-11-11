import { idbGet, idbSet } from './idb';

const USER_ID_KEY = 'fs-user-id';
const CRED_ID_KEY = 'fs-cred-id';

function randomBuf(len = 32) {
  const a = new Uint8Array(len);
  crypto.getRandomValues(a);
  return a;
}

function getOrMakeUserId(): Uint8Array {
  let hex = localStorage.getItem(USER_ID_KEY);
  if (!hex) {
    hex = Array.from(randomBuf(16)).map(b => b.toString(16).padStart(2,'0')).join('');
    localStorage.setItem(USER_ID_KEY, hex);
  }
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex!.slice(i*2, i*2+2), 16);
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
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
  await idbSet(CRED_ID_KEY, id);
  return id;
}

/** WebAuthn 签名：返回 Base64URL 签名 */
export async function signWithPasskey(data: Uint8Array): Promise<string> {
  const id = await idbGet<string>(CRED_ID_KEY);
  if (!id) throw new Error('No credential. Please register first.');

  const allowId = Uint8Array.from(atob(id.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0));
  const assertion = await navigator.credentials.get({
    publicKey: { challenge: data, allowCredentials: [{ id: allowId, type: 'public-key' }] , timeout: 60000 }
  }) as PublicKeyCredential;

  const resp = assertion.response as AuthenticatorAssertionResponse;
  const sig = new Uint8Array(resp.signature);
  return btoa(String.fromCharCode(...sig)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

/** 兜底：不可导出 ECDSA(P-256) 私钥 + IndexedDB 存储 CryptoKey 对象 */
export async function fallbackEnsureKey(): Promise<CryptoKeyPair> {
  const existing = await idbGet<CryptoKeyPair>('ecdsa-keypair');
  if (existing?.privateKey && existing?.publicKey) return existing;
  const pair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, // 私钥不可导出
    ['sign', 'verify']
  );
  await idbSet('ecdsa-keypair', pair);
  return pair;
}

export async function fallbackSign(data: Uint8Array): Promise<ArrayBuffer> {
  const { privateKey } = await fallbackEnsureKey();
  return crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, data);
}
