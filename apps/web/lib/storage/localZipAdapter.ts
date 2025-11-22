import { createCapsuleZip, parseCapsuleZip } from "../capsuleZip";
import type { StorageAdapter } from "../../../../packages/core/storage/storageAdapter";
import type { CapsuleFiles, StorageResult } from "../../../../packages/core/storage/types";

const ADAPTER_ID = "local-zip";

export const localZipAdapter: StorageAdapter = {
  id: ADAPTER_ID,
  label: "Local ZIP",
  kind: "node",
  async saveCapsule(
    capsuleId: string,
    files: CapsuleFiles
  ): Promise<StorageResult> {
    const zipData = await createCapsuleZip(files, { capsuleId });
    const createdAt = new Date().toISOString();
    const downloadUrl = `download://capsule-${capsuleId}.zip`;

    return {
      adapterId: ADAPTER_ID,
      capsuleId,
      location: downloadUrl,
      downloadUrl,
      createdAt,
      extra: { zipData },
    } satisfies StorageResult;
  },
  async loadCapsule(
    capsuleId: string,
    context?: { file?: File | Blob | Uint8Array; password?: string }
  ) {
    const file = context?.file;
    if (!file) {
      throw new Error("A file must be provided to load a capsule from a ZIP");
    }

    const parsed = await parseCapsuleZip(file, context?.password);

    return {
      ...parsed,
      capsuleId: parsed.capsuleId ?? capsuleId,
    } satisfies CapsuleFiles;
  },
};
