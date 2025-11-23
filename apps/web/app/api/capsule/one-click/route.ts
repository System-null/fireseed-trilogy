import { NextRequest, NextResponse } from "next/server";
import { buildOneClickCapsule } from "../../../../../../lib/capsuleBuilder";
import { computeFireseedIndex } from "../../../../../../lib/fireseedIndex";
import { buildFireseedIndexText } from "@/apps/web/lib/buildIndexText";
import type { CapsuleFiles } from "../../../../../packages/core/storage/types";
import { localZipAdapter } from "../../../../lib/storage/localZipAdapter";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => null);

    if (!json || typeof json !== "object") {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body / 请求体不是合法 JSON" },
        { status: 400 }
      );
    }

    const {
      title,
      scenario,
      primaryLanguage,
      mainBody,
      keyEventsText,
      principlesText,
      messageToFuture,
    } = json as {
      title?: string;
      scenario?: string;
      primaryLanguage?: string;
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
        { ok: false, error: "缺少必要字段：title/scenario/mainBody" },
        { status: 400 }
      );
    }

    const lang = (primaryLanguage || "zh").toLowerCase();

    const fullTextForIndex = buildFireseedIndexText({
      mainBody,
      keyEventsText,
      principlesText,
      messageToFuture,
    });
    const fireseedIndex = computeFireseedIndex(fullTextForIndex);

    const capsuleResult = buildOneClickCapsule({
      title: title.trim(),
      scenario: scenario.trim(),
      primaryLanguage: lang,
      mainBody,
      keyEventsText,
      principlesText,
      messageToFuture,
    });

    const { capsule, meta, humanReadable, readmeText } = capsuleResult;

    const capsuleId = meta?.capsuleId ?? "fireseed-capsule";
    const files: CapsuleFiles = {
      capsuleJson: JSON.stringify(capsule, null, 2),
      metaJson: JSON.stringify(meta, null, 2),
      humanReadable,
      readme: readmeText,
    };

    const storageResult = await localZipAdapter.saveCapsule(capsuleId, files);
    const downloadPath =
      storageResult.downloadUrl ??
      storageResult.location ??
      (typeof storageResult.extra?.downloadPath === "string"
        ? storageResult.extra.downloadPath
        : null);

    return NextResponse.json(
      {
        ok: true,
        capsuleId,
        fireseedIndex: fireseedIndex ?? null,
        downloadPath: downloadPath ?? null,
        capsule,
        meta: { ...meta, fireseedIndex },
        humanReadable,
        readmeText,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[apps/web api one-click] internal error:", err);
    const message =
      err instanceof Error
        ? err.message
        : "Unknown error during capsule generation.";
    return NextResponse.json(
      {
        ok: false,
        error:
          message ||
          "生成火种胶囊时服务器内部错误，请稍后重试 / Internal error while generating capsule.",
      },
      { status: 500 }
    );
  }
}
