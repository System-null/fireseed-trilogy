import { idbGet, idbSet } from './idb';

const USER_ID_KEY = 'fs-user-id';
const CRED_ID_KEY = 'fs-cred-id';           // WebAuthn 证书 id（base64url）
const ECDSA_JWK_KEY = 'ecdsa-p256-jwk';     // 兜底持久化项：{ privateJwk, publicJwk }

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

function b64urlFromBytes(b: Uint8Array) {
  return btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function bytesFromB64url(s: string) {
  const bin = atob(s.replace(/-/g,'+').replace(/_/g,'/'));
  const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
}

/** WebAuthn 注册：返回 credentialId（Base64URL） */
export async function registerPasskey(): Promise<string> {
  if (!('credentials' in navigator)) throw new Error('WebAuthn not supported');
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  const userId = getOrMakeUserId();

  const cred = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { id: location.hostname, name: 'Fireseed' },
      user: { id: userId, name: 'fireseed-user', displayName: 'Fireseed User' },
      pubKeyCredParams: [{ alg: -7, type: 'public-key' }], // ES256
      authenticatorSelection: { residentKey: 'preferred', userVerification: 'required' },
      timeout: 60000
    }
  }) as PublicKeyCredential;

  const id = b64urlFromBytes(new Uint8Array(cred.rawId));
  await idbSet(CRED_ID_KEY, id);
  return id;
}

/** WebAuthn 签名：返回 Base64URL 签名 */
export async function signWithPasskey(data: Uint8Array): Promise<string> {
  const id = await idbGet<string>(CRED_ID_KEY);
  if (!id) throw new Error('No credential. Please register first.');
  const allowId = bytesFromB64url(id);

  const assertion = await navigator.credentials.get({
    publicKey: { challenge: data, allowCredentials: [{ id: allowId, type: 'public-key' }], timeout: 60000 }
  }) as PublicKeyCredential;

  const resp = assertion.response as AuthenticatorAssertionResponse;
  return b64urlFromBytes(new Uint8Array(resp.signature));
}

/** 兜底：使用 ECDSA(P-256)；持久化 JWK（可结构化克隆），签名时导入 CryptoKey */
export async function fallbackEnsureKey(): Promise<{ privateJwk: JsonWebKey, publicJwk: JsonWebKey }> {
  let jwkPair = await idbGet<{ privateJwk: JsonWebKey, publicJwk: JsonWebKey }>(ECDSA_JWK_KEY);
  if (!jwkPair) {
    const pair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      /* extractable */ true,
      ['sign', 'verify']
    );
    const [privateJwk, publicJwk] = await Promise.all([
      crypto.subtle.exportKey('jwk', pair.privateKey),
      crypto.subtle.exportKey('jwk', pair.publicKey)
    ]);
    jwkPair = { privateJwk, publicJwk };
    await idbSet(ECDSA_JWK_KEY, jwkPair);
  }
  return jwkPair;
}

export async function fallbackSign(data: Uint8Array): Promise<ArrayBuffer> {
  const { privateJwk } = await fallbackEnsureKey();
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    privateJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    /* extractable */ false,
    ['sign']
  );
  return crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, data);
}
