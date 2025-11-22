import { NextRequest, NextResponse } from "next/server";
import { buildOneClickCapsule } from "../../../../../../lib/capsuleBuilder";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => null);

    if (!json || typeof json !== "object") {
      return NextResponse.json(
        { error: "Invalid JSON body / 请求体不是合法 JSON" },
        { status: 400 }
      );
    }

    const {
      title,
      scenario,
      mainBody,
      keyEventsText,
      principlesText,
      messageToFuture,
    } = json as {
      title?: string;
      scenario?: string;
      mainBody?: string;
      keyEventsText?: string;
      principlesText?: string;
      messageToFuture?: string;
    };

    if (
      !title ||
      !scenario ||
      !mainBody ||
      !title.trim() ||
      !scenario.trim() ||
      !mainBody.trim()
    ) {
      return NextResponse.json(
        { error: "缺少必要字段：title/scenario/mainBody" },
        { status: 400 }
      );
    }

    const capsuleResult = buildOneClickCapsule({
      title: title.trim(),
      scenario: scenario.trim(),
      mainBody: mainBody,
      keyEventsText,
      principlesText,
      messageToFuture,
    });

    const { capsule, meta, humanReadable, readmeText } = capsuleResult;

    return NextResponse.json(
      {
        capsule,
        meta,
        humanReadable,
        readmeText,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[apps/web api one-click] internal error:", err);
    return NextResponse.json(
      {
        error:
          "生成火种胶囊时服务器内部错误，请稍后重试 / Internal error while generating capsule.",
      },
      { status: 500 }
    );
  }
}
