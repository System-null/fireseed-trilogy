import JSZip from 'jszip';
import { NextRequest, NextResponse } from 'next/server';
import {
  generateOneClickCapsule,
  type OneClickPayload,
  type Scenario,
} from '@/lib/capsule/oneClick';

interface OneClickSuccessBody {
  ok: true;
  data: {
    capsule: ReturnType<typeof generateOneClickCapsule>['capsule'];
    indexResult: ReturnType<typeof generateOneClickCapsule>['indexResult'];
    explain: ReturnType<typeof generateOneClickCapsule>['explain'];
    zipBase64: string;
    zipFilename: string;
  };
}

interface OneClickErrorBody {
  ok: false;
  message: string;
}

type OneClickResponseBody = OneClickSuccessBody | OneClickErrorBody;

const SUPPORTED_SCENARIOS: Scenario[] = [
  'life-summary',
  'family-letter',
  'tech-archive',
  'value-manifesto',
];

function parsePayload(raw: unknown): OneClickPayload {
  if (!raw || typeof raw !== 'object') {
    throw new Error('请求体格式错误，请提交 JSON。');
  }
  const data = raw as Partial<Record<keyof OneClickPayload, unknown>>;
  const title = typeof data.title === 'string' ? data.title : '';
  const audience = typeof data.audience === 'string' ? data.audience : '';
  const body = typeof data.body === 'string' ? data.body : '';
  const keyMoments = typeof data.keyMoments === 'string' ? data.keyMoments : '';
  const nonNegotiables =
    typeof data.nonNegotiables === 'string' ? data.nonNegotiables : '';
  const messageToFuture =
    typeof data.messageToFuture === 'string' ? data.messageToFuture : '';
  const scenario = SUPPORTED_SCENARIOS.includes(data.scenario as Scenario)
    ? (data.scenario as Scenario)
    : 'life-summary';
  const language = data.language === 'en' ? 'en' : 'zh';
  const aiAssist = Boolean(data.aiAssist);
  const includeTechCapsule = Boolean(data.includeTechCapsule);

  return {
    title,
    audience,
    scenario,
    language,
    body,
    keyMoments,
    nonNegotiables,
    messageToFuture,
    aiAssist,
    includeTechCapsule,
  };
}

function buildReadme(
  capsule: ReturnType<typeof generateOneClickCapsule>['capsule'],
  explain: ReturnType<typeof generateOneClickCapsule>['explain'],
): string {
  const lines: string[] = [
    'Fireseed One-click Capsule Package',
    '==================================',
    '',
    `Capsule ID: ${capsule.id}`,
    `Created At: ${capsule.createdAt}`,
    `Scenario: ${capsule.meta.scenario}`,
    `Language: ${capsule.meta.language}`,
    `Fireseed Index: ${capsule.meta.fireseedIndex} / 100`,
    '',
    explain.summary,
    '',
    'Steps:',
    ...explain.steps.map((step, idx) => `${idx + 1}. ${step.label} — ${step.detail}`),
    '',
    'Recommended next actions:',
    ...explain.recommendedActions.map(action => `- ${action}`),
    '',
    'Keep this ZIP package in at least two safe places. Fireseed Lab will never automatically upload your capsule.',
  ];
  if (explain.aiAssist) {
    lines.push('', 'AI Assist: enabled（你选择了 AI 协助，该结果仍需你亲自确认。）');
  }
  return lines.join('\n');
}

async function buildZip(
  capsule: ReturnType<typeof generateOneClickCapsule>['capsule'],
  indexResult: ReturnType<typeof generateOneClickCapsule>['indexResult'],
  explain: ReturnType<typeof generateOneClickCapsule>['explain'],
): Promise<{ base64: string; filename: string }> {
  const zip = new JSZip();
  zip.file('capsule.json', JSON.stringify(capsule, null, 2));
  zip.file('fireseed-index.json', JSON.stringify(indexResult, null, 2));
  zip.file('explain.json', JSON.stringify(explain, null, 2));
  zip.file('README.txt', buildReadme(capsule, explain));
  const base64 = await zip.generateAsync({ type: 'base64' });
  const filename = `${capsule.id || 'fireseed-capsule'}.zip`;
  return { base64, filename };
}

export async function POST(req: NextRequest): Promise<NextResponse<OneClickResponseBody>> {
  try {
    const payload = parsePayload(await req.json());
    const result = generateOneClickCapsule(payload);
    const zip = await buildZip(result.capsule, result.indexResult, result.explain);
    const response: OneClickSuccessBody = {
      ok: true,
      data: {
        capsule: result.capsule,
        indexResult: result.indexResult,
        explain: result.explain,
        zipBase64: zip.base64,
        zipFilename: zip.filename,
      },
    };
    return NextResponse.json(response);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message || '生成失败，请稍后再试。'
        : '生成失败，请稍后再试。';
    const response: OneClickErrorBody = {
      ok: false,
      message,
    };
    return NextResponse.json(response, { status: 400 });
  }
}
