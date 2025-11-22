import JSZip from "jszip";
import type { CapsuleFiles } from "../packages/core/storage/types";
import { decryptJsonWithPassword } from "./encryption";

export type ParsedCapsuleZip = {
  meta: Record<string, unknown>;
  capsule?: Record<string, unknown>;
  encryptionMode: "none" | "aes-256-gcm";
  hasHumanReadable: boolean;
  encryptedBlob?: CapsuleFiles["encryptedBlob"];
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

export async function parseCapsuleZip(file: File, password?: string): Promise<ParsedCapsuleZip> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());

  const metaEntry = findFirstFileBySuffix(zip, "meta.json");
  if (!metaEntry) {
    throw new Error("meta.json not found");
  }

  let meta: Record<string, unknown>;
  try {
    const metaText = await metaEntry.async("string");
    meta = JSON.parse(metaText) as Record<string, unknown>;
  } catch (error) {
    throw new Error("meta.json is not valid JSON");
  }

  const hrEntry = findFirstFileBySuffix(zip, "HUMAN_READABLE.md");
  const hasHumanReadable = Boolean(hrEntry);
  const encryptionMode = meta?.encryption ?? "none";

  if (encryptionMode === "none") {
    const capsuleEntry = findFirstFileBySuffix(zip, "capsule.json");
    if (!capsuleEntry) {
      throw new Error("capsule.json missing for plaintext capsule");
    }

    try {
      const capsuleText = await capsuleEntry.async("string");
      const capsule = JSON.parse(capsuleText) as Record<string, unknown>;
      return { meta, capsule, encryptionMode: "none", hasHumanReadable };
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

    if (password) {
      try {
        capsule = (await decryptJsonWithPassword(
          cipherBytes,
          password,
          encryptionParams
        )) as Record<string, unknown>;
      } catch (error) {
        throw new Error("decryption failed");
      }
    }

    return {
      meta,
      capsule,
      encryptionMode: "aes-256-gcm",
      hasHumanReadable,
    };
  }

  throw new Error(`Unsupported encryption mode: ${encryptionMode}`);
}
