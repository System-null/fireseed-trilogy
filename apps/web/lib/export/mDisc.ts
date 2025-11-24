import JSZip from "jszip";

import type { FireseedManifest } from "packages/core/manifest/types";

const README_CONTENT = `Fireseed M-Disc Bundle (structure only)

这不是完整备份，只是为光盘/移动硬盘准备的目录结构和索引。
请手动将对应的 fireseed-capsule-*.zip 放到 capsules/ 子目录中，
再使用你自己的刻录软件烧录到光盘或复制到只读介质。

This is NOT a full backup. It only contains directory structure and an index.
Please manually copy each fireseed-capsule-*.zip into the "capsules/" folder,
then burn this folder to M-Disc / external drive using your own tools.
`;

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

export async function buildMDiscBundleZip(
  manifest: FireseedManifest,
  capsuleIds: string[]
): Promise<Blob> {
  const zip = new JSZip();
  const rootFolderName = `fireseed-disc-${getTodayString()}`;
  const root = zip.folder(rootFolderName);

  const idSet = new Set(capsuleIds);
  const filteredCapsules = manifest.capsules.filter((capsule) =>
    idSet.has(capsule.capsuleId)
  );

  const discManifest = {
    schema: "FireseedDiscManifest_v0.1",
    generatedAt: new Date().toISOString(),
    sourceManifestSchema: manifest.schema,
    capsules: filteredCapsules.map((capsule) => ({
      capsuleId: capsule.capsuleId,
      title: capsule.title,
      createdAt: capsule.createdAt,
      primaryLanguage: capsule.primaryLanguage,
      encryption: capsule.encryption,
      fireseedIndex: capsule.fireseedIndex,
      replicas: capsule.replicas,
    })),
  };

  root?.file("manifest.json", JSON.stringify(discManifest, null, 2));
  root?.folder("capsules");
  root?.file("README-MDISC.txt", README_CONTENT);

  return zip.generateAsync({ type: "blob" });
}
