import JSZip from "jszip";
import QRCode from "qrcode";
import type {
  FireseedManifest,
  FireseedManifestCapsuleEntry,
} from "../../../packages/core/manifest/types";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function exportMDiscStructure(
  manifest: FireseedManifest,
  capsules: FireseedManifestCapsuleEntry[],
): Promise<void> {
  const zip = new JSZip();

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const root = zip.folder(`fireseed-disc-${dateStr}`)!;

  const selectedIds = new Set(capsules.map((c) => c.capsuleId));
  const trimmedManifest: FireseedManifest = {
    ...manifest,
    capsules: manifest.capsules.filter((c) => selectedIds.has(c.capsuleId)),
  };

  root.file("manifest.json", JSON.stringify(trimmedManifest, null, 2));

  const readmeLines = [
    "Fireseed M-Disc structure",
    "=========================",
    "",
    "ZH: 这是为 M-Disc / 光盘 / 只读移动硬盘 准备的 fireseed 目录结构。",
    "    1. 打开 capsules/ 目录，把对应的火种胶囊 ZIP 文件复制进来，",
    "       文件名建议使用 <capsuleId>.zip。",
    "    2. 未来只要有一台可以读取本盘的电脑，就可以通过 manifest.json",
    "       配合 Fireseed 工具重新验证与恢复。",
    "",
    "EN: This directory structure is prepared for M-Disc / optical disc /",
    "    read-only external drives.",
    "    1. Open the capsules/ folder and copy your Fireseed capsule ZIPs here,",
    "       preferably named as <capsuleId>.zip.",
    "    2. As long as any future computer can read this disc,",
    "       the manifest.json + Fireseed tools can be used to verify and restore.",
    "",
  ].join("\n");
  root.file("README-MDISC.txt", readmeLines);

  const capsulesFolder = root.folder("capsules")!;
  for (const entry of capsules) {
    const placeholder = [
      `Capsule ID: ${entry.capsuleId}`,
      `Title / 标题: ${entry.title ?? ""}`,
      "",
      "ZH: 请将对应的 fireseed 胶囊 ZIP 文件命名为：",
      `    ${entry.capsuleId}.zip，并放在本目录下。`,
      "",
      "EN: Please place the corresponding Fireseed capsule ZIP here,",
      `    named as: ${entry.capsuleId}.zip.`,
      "",
    ].join("\n");
    capsulesFolder.file(`${entry.capsuleId}.txt`, placeholder);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, `fireseed-disc-${dateStr}.zip`);
}

export async function exportQrClueCard(
  entry: FireseedManifestCapsuleEntry,
  manifest: FireseedManifest,
): Promise<void> {
  const replicas = entry.replicas ?? [];
  const cluePayload = {
    kind: "fireseed-clue-card",
    version: "0.1",
    capsuleId: entry.capsuleId,
    title: entry.title ?? "",
    schemaVersion: manifest.schema,
    primaryLanguage: entry.primaryLanguage ?? "",
    encryption: entry.encryption,
    fireseedIndex: entry.fireseedIndex ?? null,
    replicas: replicas.map((r) => r.location),
    note: "This is a clue card for locating Fireseed capsule replicas. / 这是用于定位火种副本的线索卡。",
  };

  const text = JSON.stringify(cluePayload);

  const dataUrl = await QRCode.toDataURL(text, {
    width: 1024,
    margin: 2,
  });

  const res = await fetch(dataUrl);
  const blob = await res.blob();

  const safeId = entry.capsuleId.replace(/[^a-zA-Z0-9_-]/g, "_");
  downloadBlob(blob, `fireseed-qr-${safeId}.png`);
}
