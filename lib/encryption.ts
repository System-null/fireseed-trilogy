export const FIRESEED_KDF = "PBKDF2-SHA256" as const;
export const FIRESEED_KDF_ITERATIONS = 210_000;
export const FIRESEED_SALT_BYTES = 16; // 128-bit salt
export const FIRESEED_IV_BYTES = 12; // 96-bit IV for AES-GCM

const AES_KEY_LENGTH = 256;

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
  kdf: typeof FIRESEED_KDF;
}> {
  const cryptoObject = getCrypto();
  const saltBytes = new Uint8Array(FIRESEED_SALT_BYTES);
  const ivBytes = new Uint8Array(FIRESEED_IV_BYTES);
  cryptoObject.getRandomValues(saltBytes);
  cryptoObject.getRandomValues(ivBytes);

  const iterations = FIRESEED_KDF_ITERATIONS;
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
    kdf: FIRESEED_KDF,
  };
}

/**
 * Decrypts a capsule payload with Fireseed's expected encryption schema.
 * params is expected to include: salt (base64), iv (base64), iterations (number), kdf (string).
 */
export async function decryptJsonWithPassword<T = unknown>(
  cipher: Uint8Array,
  password: string,
  params: { salt: string; iv: string; iterations: number; kdf: string },
): Promise<T> {
  if (params.kdf !== FIRESEED_KDF) {
    throw new Error("不支持的 KDF 算法 / Unsupported KDF algorithm");
  }

  if (!Number.isFinite(params.iterations) || params.iterations <= 0) {
    throw new Error("无效的 KDF 迭代次数 / Invalid KDF iterations");
  }

  const iterationsToUse = Math.floor(params.iterations);
  const weakerThanOfficial = iterationsToUse < FIRESEED_KDF_ITERATIONS;

  try {
    if (weakerThanOfficial) {
      console.warn("PBKDF2 iterations weaker than Fireseed official defaults; proceeding with provided params.");
    }
    const saltBytes = base64ToBytes(params.salt);
    const ivBytes = base64ToBytes(params.iv);
    const key = await deriveKeyFromPassword(password, saltBytes, iterationsToUse);
    const subtle = getWebCrypto();

    const plaintextBuffer = await subtle.decrypt({ name: "AES-GCM", iv: ivBytes }, key, cipher);
    const decoder = new TextDecoder();
    const plaintext = decoder.decode(plaintextBuffer);
    return JSON.parse(plaintext) as T;
  } catch (error) {
    throw new Error("decryption failed");
  }
}
