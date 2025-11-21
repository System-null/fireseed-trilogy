import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { buildOneClickCapsule } from "@/lib/capsuleBuilder";

export async function POST(req: NextRequest) {
  try {
    const { title, scenario, body } = (await req.json()) ?? {};

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof scenario !== "string" ||
      !scenario.trim() ||
      typeof body !== "string" ||
      !body.trim()
    ) {
      return NextResponse.json(
        { error: "无效输入 / Invalid input" },
        { status: 400 }
      );
    }

    const { capsule, meta, humanReadable, readmeText } = buildOneClickCapsule({
      title: title.trim(),
      scenario: scenario.trim(),
      body: body.trim(),
    });

    const zip = new JSZip();
    const folderName = `fireseed-capsule-${Date.now()}`;
    const folder = zip.folder(folderName)!;
    folder.file("capsule.json", JSON.stringify(capsule, null, 2));
    folder.file("meta.json", JSON.stringify(meta, null, 2));
    folder.file("HUMAN_READABLE.md", humanReadable);
    folder.file("README.txt", readmeText);
    const zipData = await zip.generateAsync({ type: "uint8array" });
    const fileName = `${folderName}.zip`;

    return new NextResponse(zipData, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "生成火种胶囊失败 / Failed to generate capsule" },
      { status: 500 }
    );
  }
}
