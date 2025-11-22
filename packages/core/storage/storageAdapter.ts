import type { CapsuleFiles, StorageResult } from "./types";

export interface StorageAdapter {
  id: string;
  label: string;
  kind: "browser" | "node" | "hybrid";
  saveCapsule(capsuleId: string, files: CapsuleFiles): Promise<StorageResult>;
  loadCapsule?(capsuleId: string): Promise<CapsuleFiles | null>;
}
