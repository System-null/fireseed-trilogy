import JSZip from "jszip";
import { decryptJsonWithPassword } from "./encryption";

export type ParsedCapsuleZip = {
  meta: any;
  capsule?: any;
  encryptionMode: "none" | "aes-256-gcm";
  hasHumanReadable: boolean;
};

export async function parseCapsuleZip(file: File, password?: string): Promise<ParsedCapsuleZip> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());

  const metaEntry = zip.file("meta.json");
  if (!metaEntry) {
    throw new Error("meta.json not found");
  }

  let meta: any;
  try {
    const metaText = await metaEntry.async("string");
    meta = JSON.parse(metaText);
  } catch (error) {
    throw new Error("meta.json is not valid JSON");
  }

  const hasHumanReadable = Boolean(zip.file("HUMAN_READABLE.md"));
  const encryptionMode = meta?.encryption ?? "none";

  if (encryptionMode === "none") {
    const capsuleEntry = zip.file("capsule.json");
    if (!capsuleEntry) {
      throw new Error("capsule.json missing for plaintext capsule");
    }

    try {
      const capsuleText = await capsuleEntry.async("string");
      const capsule = JSON.parse(capsuleText);
      return { meta, capsule, encryptionMode: "none", hasHumanReadable };
    } catch (error) {
      throw new Error("capsule.json is not valid JSON");
    }
  }

  if (encryptionMode === "aes-256-gcm") {
    const capsuleEntry = zip.file("capsule.enc");
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
    let capsule: any | undefined;

    if (password) {
      try {
        capsule = await decryptJsonWithPassword(cipherBytes, password, encryptionParams);
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
