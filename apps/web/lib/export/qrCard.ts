/**
 * Fireseed "clue card" QR payload. This format is meant for paper-based indexing
 * and integrity hints, not for carrying the full capsule content.
 */
import QRCode from "qrcode";
import type { FireseedManifestCapsuleEntry } from "../../../packages/core/manifest/types";

interface FireseedQrPayload {
  capsuleId: string;
  schemaVersion: string;
  hash?: string | null;
  replicas?: string[];
  ownerHint?: string;
  generatedAt: string;
}

const DEFAULT_CAPSULE_SCHEMA_VERSION = "FireseedCapsule_v0.3.x"; // placeholder until capsule schema version is explicit

export function buildQrPayloadFromManifestEntry(
  entry: FireseedManifestCapsuleEntry
): FireseedQrPayload {
  const schemaVersion = (entry as { schemaVersion?: string }).schemaVersion ??
    DEFAULT_CAPSULE_SCHEMA_VERSION;
  const hash = (entry as { hash?: string | null }).hash ?? null;
  const replicas = entry.replicas?.map((replica) => replica.location);

  return {
    capsuleId: entry.capsuleId,
    schemaVersion,
    hash,
    replicas,
    ownerHint: "Fireseed user",
    generatedAt: new Date().toISOString(),
  };
}

export async function generateQrDataUrl(payload: FireseedQrPayload): Promise<string> {
  const text = JSON.stringify(payload);
  const dataUrl = await QRCode.toDataURL(text, { errorCorrectionLevel: "M" });
  return dataUrl;
}
