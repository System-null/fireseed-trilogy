import JSZip from "jszip";
import { decryptJsonWithPassword } from "../../../lib/encryption";
import type { CapsuleFiles } from "../../../packages/core/storage/types";

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

function decodeMeta(metaJson: CapsuleFiles["metaJson"]): string | undefined {
  if (typeof metaJson === "string") return metaJson;
  if (metaJson instanceof Uint8Array) return new TextDecoder().decode(metaJson);
  return undefined;
}

export async function createCapsuleZip(
  files: CapsuleFiles,
  options?: { capsuleId?: string }
): Promise<Uint8Array | Blob> {
  const zip = new JSZip();

  const metaText = decodeMeta(files.metaJson);
  let folderId = options?.capsuleId;

  if (!folderId && metaText) {
    try {
      const parsed = JSON.parse(metaText) as { capsuleId?: string; capsuleID?: string };
      folderId = parsed.capsuleId ?? parsed.capsuleID;
    } catch (error) {
      // ignore parse errors, fallback to default folder name
    }
  }

  const folderName = folderId ? `fireseed-capsule-${folderId}` : "fireseed-capsule";
  const folder = zip.folder(folderName) ?? zip;

  const addFile = (name: string, content?: CapsuleFiles[keyof CapsuleFiles]) => {
    if (content === undefined) return;
    folder.file(name, content as string | Uint8Array);
  };

  addFile("capsule.json", files.capsuleJson);
  addFile("meta.json", files.metaJson);
  addFile("HUMAN_READABLE.md", files.humanReadable);
  addFile("README.txt", files.readme);

  if (files.encryptedBlob) {
    addFile("capsule.enc", files.encryptedBlob);
  }

  if (files.files) {
    for (const [path, content] of Object.entries(files.files)) {
      addFile(path, content);
    }
  }

  const isBrowser = typeof window !== "undefined";
  const zipType = isBrowser && typeof Blob !== "undefined" ? "blob" : "uint8array";

  return zip.generateAsync({ type: zipType as "blob" | "uint8array" });
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
