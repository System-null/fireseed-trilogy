import JSZip from "jszip";
import type { FireseedIndexResult } from "../fireseedIndex";

export interface CapsuleArtifact {
  capsule: any;
  meta: {
    schemaVersion: string;
    generatedAt: string;
    fireseedIndex: FireseedIndexResult;
    encryption: "none" | "aes-passphrase";
  };
  humanReadable: string;
  readmeText: string;
}

export interface StorageResult {
  kind: "local-zip";
  locator: string;
}

export interface StorageAdapter {
  id: StorageResult["kind"];
  persist(artifact: CapsuleArtifact): Promise<StorageResult & { zipData: Uint8Array }>;
}

export const localZipAdapter: StorageAdapter = {
  id: "local-zip",
  async persist(artifact) {
    const zip = new JSZip();
    const folderName = `fireseed-capsule-${Date.now()}`;
    const folder = zip.folder(folderName)!;

    folder.file("capsule.json", JSON.stringify(artifact.capsule, null, 2));
    folder.file("meta.json", JSON.stringify(artifact.meta, null, 2));
    folder.file("HUMAN_READABLE.md", artifact.humanReadable);
    folder.file("README.txt", artifact.readmeText);

    const zipData = await zip.generateAsync({ type: "uint8array" });
    return {
      kind: "local-zip",
      locator: `${folderName}.zip`,
      zipData,
    };
  },
};
