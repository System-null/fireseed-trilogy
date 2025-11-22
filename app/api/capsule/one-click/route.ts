import { NextRequest, NextResponse } from "next/server";
import { buildOneClickCapsule } from "../../lib/capsuleBuilder";
import { localZipAdapter } from "@/lib/storage";

// 明确使用 Node 运行时（方便 JSZip 等依赖）
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => null);

    if (!json || typeof json !== "object") {
      return NextResponse.json(
        { error: "Invalid request body / 请求体不是合法 JSON" },
        { status: 400 }
      );
    }

    const { title, scenario, body } = json as {
      title?: string;
      scenario?: string;
      body?: string;
    };

    if (!title || !scenario || !body || !title.trim() || !scenario.trim() || !body.trim()) {
      return NextResponse.json(
        { error: "缺少必要字段：title/scenario/body / Missing required fields: title/scenario/body." },
        { status: 400 }
      );
    }

    // 构建胶囊结构
    const { capsule, meta, humanReadable, readmeText } = buildOneClickCapsule({
      title: title.trim(),
      scenario: scenario.trim(),
      body: body,
    });

    // 通过本地 ZIP 适配器打包
    const { zipData, locator } = await localZipAdapter.persist({
      capsule,
      meta,
      humanReadable,
      readmeText,
    });

    // 返回 ZIP 二进制流
    return new NextResponse(zipData, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${locator}"`,
      },
    });
  } catch (err) {
    console.error("[/api/capsule/one-click] internal error:", err);
    return NextResponse.json(
      {
        error:
          "生成火种胶囊时服务器内部错误，请稍后重试 / Internal error while generating capsule.",
      },
      { status: 500 }
    );
  }
}
