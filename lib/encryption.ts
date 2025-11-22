const PBKDF2_ITERATIONS = 210000;
const AES_KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;

function getCrypto(): Crypto {
  const cryptoObject = (globalThis as any).crypto;
  if (!cryptoObject) {
    throw new Error("WebCrypto is not available in this environment");
  }
  return cryptoObject as Crypto;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function getWebCrypto(): SubtleCrypto {
  const cryptoObject = getCrypto();
  if (!cryptoObject.subtle) {
    throw new Error("WebCrypto subtle API is not available in this environment");
  }
  return cryptoObject.subtle;
}

export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const subtle = getWebCrypto();
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);

  const baseKey = await subtle.importKey(
    "raw",
    passwordBytes,
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );

  return subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    baseKey,
    {
      name: "AES-GCM",
      length: AES_KEY_LENGTH,
    },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptJsonWithPassword(
  data: unknown,
  password: string,
): Promise<{
  cipher: Uint8Array;
  salt: string;
  iv: string;
  iterations: number;
  kdf: "PBKDF2-SHA256";
}> {
  const cryptoObject = getCrypto();
  const saltBytes = new Uint8Array(SALT_LENGTH);
  const ivBytes = new Uint8Array(IV_LENGTH);
  cryptoObject.getRandomValues(saltBytes);
  cryptoObject.getRandomValues(ivBytes);

  const iterations = PBKDF2_ITERATIONS;
  const key = await deriveKeyFromPassword(password, saltBytes, iterations);
  const subtle = getWebCrypto();

  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(JSON.stringify(data));

  const cipherBuffer = await subtle.encrypt({ name: "AES-GCM", iv: ivBytes }, key, plaintextBytes);

  return {
    cipher: new Uint8Array(cipherBuffer),
    salt: bytesToBase64(saltBytes),
    iv: bytesToBase64(ivBytes),
    iterations,
    kdf: "PBKDF2-SHA256",
  };
}

export async function decryptJsonWithPassword<T = unknown>(
  cipher: Uint8Array,
  password: string,
  params: { salt: string; iv: string; iterations: number; kdf: string },
): Promise<T> {
  if (params.kdf !== "PBKDF2-SHA256") {
    throw new Error(`Unsupported kdf: ${params.kdf}`);
  }

  try {
    const saltBytes = base64ToBytes(params.salt);
    const ivBytes = base64ToBytes(params.iv);
    const key = await deriveKeyFromPassword(password, saltBytes, params.iterations);
    const subtle = getWebCrypto();

    const plaintextBuffer = await subtle.decrypt({ name: "AES-GCM", iv: ivBytes }, key, cipher);
    const decoder = new TextDecoder();
    const plaintext = decoder.decode(plaintextBuffer);
    return JSON.parse(plaintext) as T;
  } catch (error) {
    throw new Error("decryption failed");
  }
}
