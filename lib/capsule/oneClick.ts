import { calculateFireseedIndex, type FireseedIndexResult } from '@/lib/fireseedIndex';

export type Scenario = 'life-summary' | 'family-letter' | 'tech-archive' | 'value-manifesto';

export interface OneClickPayload {
  title: string;
  audience: string;
  scenario: Scenario;
  language: 'zh' | 'en';
  body: string;
  keyMoments: string;
  nonNegotiables: string;
  messageToFuture: string;
  aiAssist: boolean;
  includeTechCapsule?: boolean;
}

export interface CapsuleContent {
  raw: string;
  keyMoments: string;
  nonNegotiables: string;
  messageToFuture: string;
  outline: string[];
}

export interface CapsuleMeta {
  title: string;
  audience: string;
  scenario: Scenario;
  language: 'zh' | 'en';
  fireseedIndex: number;
  aiAssist: boolean;
  includeTechCapsule: boolean;
  wordCount: number;
}

export interface GeneratedCapsule {
  id: string;
  schema: string;
  version: string;
  createdAt: string;
  meta: CapsuleMeta;
  content: CapsuleContent;
}

export interface OneClickExplainStep {
  key: 'ingest' | 'score' | 'package';
  label: string;
  detail: string;
}

export interface OneClickExplain {
  summary: string;
  steps: OneClickExplainStep[];
  recommendedActions: string[];
  aiAssist: boolean;
}

export interface OneClickResult {
  capsule: GeneratedCapsule;
  indexResult: FireseedIndexResult;
  explain: OneClickExplain;
}

function createCapsuleId(date: Date): string {
  return `fireseed-${date.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;
}

function buildOutline(body: string): string[] {
  const segments = body
    .split(/\n+/)
    .map(segment => segment.trim())
    .filter(Boolean);
  if (segments.length <= 4) {
    return segments;
  }
  const head = segments.slice(0, 2);
  const tail = segments.slice(-2);
  return [...head, '...', ...tail];
}

export function generateOneClickCapsule(payload: OneClickPayload): OneClickResult {
  const now = new Date();
  const normalizedBody = (payload.body ?? '').trim();
  if (!normalizedBody) {
    throw new Error('正文不能为空，请至少写几段故事或说明。');
  }

  const title = (payload.title ?? '').trim() || '未命名火种胶囊';
  const audience = (payload.audience ?? '').trim() || '未指定';
  const keyMoments = (payload.keyMoments ?? '').trim();
  const nonNegotiables = (payload.nonNegotiables ?? '').trim();
  const messageToFuture = (payload.messageToFuture ?? '').trim();
  const aiAssist = Boolean(payload.aiAssist);
  const includeTechCapsule = Boolean(payload.includeTechCapsule);
  const scenario: Scenario = payload.scenario;
  const language: 'zh' | 'en' = payload.language === 'en' ? 'en' : 'zh';

  const indexResult = calculateFireseedIndex(normalizedBody);
  const outline = buildOutline(normalizedBody).slice(0, 6);

  const capsule: GeneratedCapsule = {
    id: createCapsuleId(now),
    schema: 'fireseed.capsule.v0',
    version: '0.2.9',
    createdAt: now.toISOString(),
    meta: {
      title,
      audience,
      scenario,
      language,
      fireseedIndex: indexResult.index,
      aiAssist,
      includeTechCapsule,
      wordCount: indexResult.diagnostics.wordCount,
    },
    content: {
      raw: normalizedBody,
      keyMoments,
      nonNegotiables,
      messageToFuture,
      outline,
    },
  };

  const explain: OneClickExplain = {
    summary: `Fireseed Index ${indexResult.index} / 100 · ${indexResult.discoveryProbability}`,
    steps: [
      {
        key: 'ingest',
        label: '整理输入并检查完整性',
        detail:
          '根据你填写的标题、场景与正文，生成结构化字段，并生成全局唯一的胶囊 ID。',
      },
      {
        key: 'score',
        label: '计算 Fireseed Index',
        detail:
          '基于文本长度、结构、情绪密度、时间跨度等指标，输出仪式感指数与诊断。',
      },
      {
        key: 'package',
        label: '封装一键胶囊包',
        detail:
          '把 JSON、诊断说明与 README 封装成 ZIP，方便你下载与多地备份。',
      },
    ],
    recommendedActions: [
      '下载 ZIP 并保存在至少两个物理位置（本机 + 外接硬盘 / 云端存储）。',
      includeTechCapsule
        ? '技术胶囊已包含在包内，可与工程团队或受托人分享以对接后续系统。'
        : '如果你还想要工程化的技术胶囊，可以勾选“包含技术胶囊”后重新生成。',
      '在可信的纸质文件中记录胶囊 ID，并告知家人或受托人它代表什么。',
    ],
    aiAssist,
  };

  return { capsule, indexResult, explain };
}
