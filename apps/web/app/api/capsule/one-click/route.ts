import { NextRequest, NextResponse } from "next/server";
import { buildOneClickCapsule } from "../../../../../../lib/capsuleBuilder";
import { computeFireseedIndex } from "../../../../../../lib/fireseedIndex";
import { encryptJsonWithPassword } from "../../../../../../lib/encryption";
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
      password,
    } = json as {
      title?: string;
      scenario?: string;
      primaryLanguage?: string;
      mainBody?: string;
      keyEventsText?: string;
      principlesText?: string;
      messageToFuture?: string;
      password?: string;
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
    const trimmedPassword = typeof password === "string" ? password.trim() : "";
    const encryption = trimmedPassword ? "aes-256-gcm" : "none";

    const updatedMeta = { ...meta, encryption } as Record<string, any>;
    const updatedCapsule = {
      ...capsule,
      meta: {
        ...(capsule?.meta ?? {}),
        encryption,
      },
    } as Record<string, any>;

    const capsuleJsonString = JSON.stringify(updatedCapsule, null, 2);

    const files: CapsuleFiles = {
      metaJson: JSON.stringify(updatedMeta, null, 2),
      humanReadable,
      readme: readmeText,
    };

    if (encryption === "aes-256-gcm") {
      const encrypted = await encryptJsonWithPassword(updatedCapsule, trimmedPassword);
      const encryptionParams = {
        salt: encrypted.salt,
        iv: encrypted.iv,
        iterations: encrypted.iterations,
        kdf: encrypted.kdf,
      };

      updatedMeta.encryptionParams = encryptionParams;
      updatedCapsule.meta.encryptionParams = encryptionParams;
      files.metaJson = JSON.stringify(updatedMeta, null, 2);
      files.encryptedBlob = encrypted.cipher;
    } else {
      files.capsuleJson = capsuleJsonString;
    }

    const capsuleId = updatedMeta?.capsuleId ?? meta?.capsuleId ?? "fireseed-capsule";

    const storageResult = await localZipAdapter.saveCapsule(capsuleId, files);
    const zipBytes = (storageResult.extra as any)?.zipData as
      | Uint8Array
      | Buffer
      | undefined;

    let zipBase64: string | null = null;
    if (zipBytes) {
      const buf = Buffer.isBuffer(zipBytes) ? zipBytes : Buffer.from(zipBytes);
      zipBase64 = buf.toString("base64");
    }

    return NextResponse.json(
      {
        ok: true,
        capsuleId,
        capsuleMeta: updatedMeta,
        fireseedIndex: fireseedIndex ?? null,
        fireseedIndexDetail: fireseedIndex?.detail ?? null,
        zipBase64,
        capsule: updatedCapsule,
        meta: { ...updatedMeta, fireseedIndex },
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
