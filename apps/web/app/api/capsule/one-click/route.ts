import { NextRequest, NextResponse } from "next/server";
import { buildOneClickCapsule } from "@/lib/capsuleBuilder";
import { localZipAdapter } from "@/lib/storage";

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

    const storageResult = await localZipAdapter.persist({
      capsule,
      meta,
      humanReadable,
      readmeText,
    });

    return new NextResponse(storageResult.zipData, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${storageResult.locator}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "生成火种胶囊失败 / Failed to generate capsule" },
      { status: 500 }
    );
  }
}
