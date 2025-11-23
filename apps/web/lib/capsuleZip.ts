import JSZip from "jszip";
import { decryptJsonWithPassword } from "../../../lib/encryption";
import type { CapsuleFiles } from "../../../packages/core/storage/types";

export type ParsedCapsuleZip = CapsuleFiles & {
  meta?: Record<string, unknown>;
  capsule?: Record<string, unknown>;
  capsuleId?: string;
  encryptionMode: "none" | "aes-256-gcm";
  hasHumanReadable: boolean;
};

function findFirstFileBySuffix(zip: JSZip, suffix: string): JSZip.JSZipObject | null {
  const normalizedSuffix = suffix.replace(/^\/+/, "");
  const files = Object.values(zip.files);

  for (const f of files) {
    if (f.dir) continue;
    const name = f.name;
    if (name === normalizedSuffix || name.endsWith("/" + normalizedSuffix)) {
      return f;
    }
  }

  return null;
}

const textDecoder = new TextDecoder();

function toString(v: string | Uint8Array | undefined): string | undefined {
  if (v === undefined) return undefined;
  if (typeof v === "string") return v;
  return textDecoder.decode(
    v.byteOffset === 0 && v.byteLength === v.buffer.byteLength ? v : v.slice()
  );
}

async function toArrayBuffer(input: File | Blob | Uint8Array): Promise<ArrayBuffer> {
  if (input instanceof Uint8Array) {
    return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
  }

  // File and Blob in browsers expose arrayBuffer
  if (typeof (input as File | Blob).arrayBuffer === "function") {
    return (input as File | Blob).arrayBuffer();
  }

  throw new Error("Unsupported input type for ZIP parsing");
}

export async function createCapsuleZip(files: CapsuleFiles): Promise<Uint8Array | Blob> {
  const zip = new JSZip();

  const meta = toString(files.metaJson);
  if (!meta) throw new Error("metaJson is required for capsule zip");
  zip.file("meta.json", meta);

  const hr = toString(files.humanReadable);
  if (hr) zip.file("HUMAN_READABLE.md", hr);

  const readme = toString(files.readme);
  if (readme) zip.file("README.txt", readme);

  const encrypted =
    files.encryptedCapsule ?? files.encryptedBlob ?? files.encrypted ?? undefined;

  if (encrypted && encrypted.byteLength > 0) {
    zip.file("capsule.enc", encrypted);
  } else {
    const capsuleJson = toString(files.capsuleJson);
    if (capsuleJson) {
      zip.file("capsule.json", capsuleJson);
    }
  }

  const extraFiles = files.extraFiles ?? files.files;
  if (extraFiles) {
    for (const [name, content] of Object.entries(extraFiles)) {
      const v = typeof content === "string" ? content : toString(content) ?? "";
      zip.file(name, v);
    }
  }

  return zip.generateAsync({ type: "uint8array" });
}

export async function parseCapsuleZip(
  file: File | Blob | Uint8Array,
  password?: string
): Promise<ParsedCapsuleZip> {
  const zip = await JSZip.loadAsync(await toArrayBuffer(file));

  const metaEntry = findFirstFileBySuffix(zip, "meta.json");
  if (!metaEntry) {
    throw new Error("meta.json not found");
  }

  let metaText: string;
  let meta: Record<string, unknown>;
  try {
    metaText = await metaEntry.async("string");
    meta = JSON.parse(metaText) as Record<string, unknown>;
  } catch (error) {
    throw new Error("meta.json is not valid JSON");
  }

  const capsuleId =
    (meta?.capsuleId as string | undefined) ??
    (meta?.capsuleID as string | undefined) ??
    (meta?.id as string | undefined);

  const hrEntry = findFirstFileBySuffix(zip, "HUMAN_READABLE.md");
  const readmeEntry = findFirstFileBySuffix(zip, "README.txt");
  const hasHumanReadable = Boolean(hrEntry);
  const encryptionMode = (meta?.encryption as string | undefined) ?? "none";

  if (encryptionMode === "none") {
    const capsuleEntry = findFirstFileBySuffix(zip, "capsule.json");
    if (!capsuleEntry) {
      throw new Error("capsule.json missing for plaintext capsule");
    }

    try {
      const capsuleText = await capsuleEntry.async("string");
      const capsule = JSON.parse(capsuleText) as Record<string, unknown>;

      return {
        meta,
        metaJson: metaText,
        capsule,
        capsuleJson: capsuleText,
        humanReadable: hrEntry ? await hrEntry.async("string") : undefined,
        readme: readmeEntry ? await readmeEntry.async("string") : undefined,
        encryptionMode: "none",
        hasHumanReadable,
        capsuleId,
      } satisfies ParsedCapsuleZip;
    } catch (error) {
      throw new Error("capsule.json is not valid JSON");
    }
  }

  if (encryptionMode === "aes-256-gcm") {
    const capsuleEntry = findFirstFileBySuffix(zip, "capsule.enc");
    if (!capsuleEntry) {
      throw new Error("capsule.enc missing for encrypted capsule");
    }

    const encryptionParams = meta?.encryptionParams;
    if (
      !encryptionParams ||
      !encryptionParams.salt ||
      !encryptionParams.iv ||
      !encryptionParams.iterations ||
      !encryptionParams.kdf
    ) {
      throw new Error("encryptionParams missing or incomplete");
    }

    const cipherBytes = new Uint8Array(await capsuleEntry.async("uint8array"));
    let capsule: Record<string, unknown> | undefined;
    let capsuleJson: string | undefined;

    if (password) {
      try {
        capsule = (await decryptJsonWithPassword(
          cipherBytes,
          password,
          encryptionParams
        )) as Record<string, unknown>;
        capsuleJson = JSON.stringify(capsule);
      } catch (error) {
        throw new Error("decryption failed");
      }
    }

    return {
      meta,
      metaJson: metaText,
      capsule,
      capsuleJson,
      humanReadable: hrEntry ? await hrEntry.async("string") : undefined,
      readme: readmeEntry ? await readmeEntry.async("string") : undefined,
      encryptionMode: "aes-256-gcm",
      hasHumanReadable,
      encryptedCapsule: cipherBytes,
      encryptedBlob: cipherBytes,
      encrypted: cipherBytes,
      capsuleId,
    } satisfies ParsedCapsuleZip;
  }

  throw new Error(`Unsupported encryption mode: ${encryptionMode}`);
}
