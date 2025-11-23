'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { computeFireseedIndex } from '@/lib/fireseedIndex';
import type { FireseedIndexResult } from '@/lib/fireseedIndex';
import type { Scenario } from '@/lib/capsule/oneClick';
import type { FireseedManifestCapsuleEntry } from '@/packages/core/manifest/types';
import { upsertCapsule } from '../../../lib/manifestStore';
import type { OneClickApiResponse } from '../../../types/capsule';
import { buildFireseedIndexText } from '@/apps/web/lib/buildIndexText';

const translations = {
  zh: {
    title: '火种胶囊一键向导',
    subtitle:
      '填写你的故事与思路，点击一键生成，即可获得结构化火种胶囊。Fireseed Index 评分以及可下载的 ZIP。',
    step1: '步骤 1：填写基本信息',
    step2: '步骤 2：仪式感进度',
    step3: '步骤 3：结果与保存',
    fieldTitle: '标题',
    fieldTitlePlaceholder: '写给 60 岁的自己 / 如果我突然离开这个世界...',
    fieldAudience: '书写对象',
    fieldAudiencePlaceholder: '未来的自己、孩子、伴侣或受托人',
    fieldScenario: '场景',
    fieldScenarioSelf: '未来的自己 / 家人',
    fieldScenarioLifeLog: '人生总账 / 自我总结',
    fieldScenarioFamilyLetter: '给家人的信',
    fieldScenarioTechArchive: '技术档案 / 生涯记录',
    fieldScenarioValueManifesto: '价值观宣言 / 原则清单',
    fieldLanguage: '主要语言',
    langZh: '中文',
    langEn: 'English',
    fieldBodyLabel: '你的故事主体',
    fieldBodyPlaceholder:
      '可以从几个时间节点开始写：小时候 / 转折 / 崩溃 / 重新站起来 / 现在 / 未来你希望自己成为什么样的人……',
    fieldKeywordsLabel: '关键词/事件小结',
    fieldKeywordsPlaceholder: '用几个关键节点概括：某次选择 / 分手 / 决策 / 离开一个地方……',
    fieldRulesLabel: '不可违背的信条 / 原则',
    fieldRulesPlaceholder: '那些你在任何情况下都不想放弃的底线，比如：不要伤害家人、不要违背某个承诺……',
    fieldLastWordsLabel: '想留给未来某人的一句话',
    fieldLastWordsPlaceholder: '如果你在这段路终点，希望被谁记住？想说什么？',
    optAiAssist: '让 AI 帮我润色（不改原意，仅做结构整理）',
    optTechCapsule: '同时生成技术胶囊（附工程化表示）',
    scoreLabel: '预计 Fireseed Index 评分',
    scoreHint: '文字越具体、情绪越真实，分数通常越高。再多写几句试试。',
    buttonGenerate: '一键生成火种胶囊',
    buttonGenerating: '生成中...',
    ritualSectionTitle: '步骤 2：仪式感进度',
    ritualCheckInput: '整理输入',
    ritualCheckInputDesc: '校验输入、正文与场景，生成胶囊 ID。',
    ritualScore: '计算 Fireseed Index',
    ritualScoreDesc: '基于文本结构与情绪密度生成仪式感评分。',
    ritualZip: '封装 ZIP',
    ritualZipDesc: '把 JSON 与说明文档打包，准备下载链接。',
    resultSectionTitle: '步骤 3：结果与保存',
    resultDesc: '完成上述步骤后，这里会展示生成的火种胶囊结果。',
    resultScoreTitle: 'Fireseed 指数',
    resultInfoTitle: '胶囊信息',
    resultExplainTitle: '说明与下一步',
    resultJsonTitle: '机器可读版本（JSON）',
    downloadZip: '一键下载胶囊 ZIP',
    errorBodyRequired: '正文不能为空，请至少写一点内容再尝试生成。',
    errorFormHint: '请先写一点内容，我们才能计算 Fireseed Index。',
    errorDownload: '下载 ZIP 时发生错误，请稍后再试。',
    errorGeneric: '生成失败，请稍后重试。',
    langToggleLabel: '界面语言',
    resultWordCount: '字数：约',
    resultLanguage: '语言：',
    resultScenario: '场景：',
    resultAiAssist: 'AI 协助（启用后在说明文档中注明）',
    resultTechCapsule: '包含技术胶囊（附加工程化提示）',
    advancedToolsTitle: '高级工具（可选）',
    advancedToolsDesc: '如果你熟悉 JSON / CID，可以在生成火种胶囊之后，使用下面的实验工具做更深入的检查。',
    advancedWorkspace: 'Capsule Workspace · 直接编辑 / 校验 capsule JSON',
    advancedWorkspaceNote: '(面向高级用户)',
    advancedVerify: 'Verify CID · 体验用 CID 检查 CAR / 胶囊结构',
    advancedVerifyNote: '(当前使用 demo CID，未来可替换为真实 CID)',
    advancedLocalVerify: '本地验证工具：上传你刚才生成的 ZIP，检查结构与加密状态',
    advancedLocalVerifyNote: '(浏览器本地解析，不上传 ZIP)',
    encryptionToggle: '启用密码加密（实验功能）',
    encryptionPasswordPlaceholder: '请输入本地保存用的密码',
    encryptionWarning:
      '注意：密码只保存在你自己脑子里，我们无法帮你找回。忘记密码意味着这份火种胶囊永远无法解密。',
    encryptionPasswordTooShort: '请使用至少 8 个字符的密码再启用加密。',
    encryptionLabel: '加密模式：',
    encryptionNone: '未加密（明文本地保存）',
    encryptionAes: 'AES-256-GCM（需要密码解密）',
  },
  en: {
    title: 'Fireseed Capsule – One-Click Wizard',
    subtitle:
      'Write your story once, then click the button to generate a structured Fireseed capsule, a Fireseed Index score, and a downloadable ZIP.',
    step1: 'Step 1: Basic info',
    step2: 'Step 2: Ritual progress',
    step3: 'Step 3: Result & storage',
    fieldTitle: 'Title',
    fieldTitlePlaceholder: 'Letter to my 60-year-old self / If I suddenly left this world…',
    fieldAudience: 'Audience',
    fieldAudiencePlaceholder: 'Future self, children, partner, or trustee',
    fieldScenario: 'Scenario',
    fieldScenarioSelf: 'Future self / family',
    fieldScenarioLifeLog: 'Life log / self-summary',
    fieldScenarioFamilyLetter: 'Letter to family',
    fieldScenarioTechArchive: 'Technical archive / career record',
    fieldScenarioValueManifesto: 'Values manifesto / principles list',
    fieldLanguage: 'Primary language',
    langZh: 'Chinese',
    langEn: 'English',
    fieldBodyLabel: 'Main story',
    fieldBodyPlaceholder:
      'You can start from a few key moments: childhood / turning points / breakdowns / rebuilding / where you are now / who you hope to become in the future…',
    fieldKeywordsLabel: 'Key events & themes',
    fieldKeywordsPlaceholder:
      'Summarise a few core nodes: a decision, a breakup, leaving a city, changing careers…',
    fieldRulesLabel: 'Non-negotiable principles',
    fieldRulesPlaceholder:
      'Things you do not want to give up under any circumstance, e.g. “never hurt my family”, “never break this specific promise”…',
    fieldLastWordsLabel: 'One sentence for someone in the future',
    fieldLastWordsPlaceholder:
      'If you reach the end of this road, who do you hope will remember you, and what would you like to say?',
    optAiAssist: 'Let AI help structure and polish (without changing the meaning)',
    optTechCapsule: 'Also generate a technical capsule (for AGI / tools)',
    scoreLabel: 'Estimated Fireseed Index',
    scoreHint: 'The more concrete and emotionally honest the text, the higher the score tends to be.',
    buttonGenerate: 'Generate Fireseed capsule',
    buttonGenerating: 'Generating…',
    ritualSectionTitle: 'Step 2: Ritual progress',
    ritualCheckInput: 'Normalising input',
    ritualCheckInputDesc: 'Validate fields and scenario, then derive a capsule ID.',
    ritualScore: 'Calculating Fireseed Index',
    ritualScoreDesc: 'Compute a ritual score from text structure and emotional density.',
    ritualZip: 'Packing ZIP',
    ritualZipDesc: 'Bundle JSON and human-readable notes into a downloadable archive.',
    resultSectionTitle: 'Step 3: Result & storage',
    resultDesc:
      'Once all steps are finished, the generated Fireseed capsule and download link will appear here.',
    resultScoreTitle: 'Fireseed score',
    resultInfoTitle: 'Capsule details',
    resultExplainTitle: 'Notes & next steps',
    resultJsonTitle: 'Machine-readable version (JSON)',
    downloadZip: 'Download capsule ZIP',
    errorBodyRequired: 'Body text is required. Please add some content before generating.',
    errorFormHint: 'Add a little content so we can estimate the Fireseed Index.',
    errorDownload: 'An error occurred while downloading the ZIP. Please try again later.',
    errorGeneric: 'Generation failed. Please try again later.',
    langToggleLabel: 'UI language',
    resultWordCount: 'Approximate word count:',
    resultLanguage: 'Language:',
    resultScenario: 'Scenario:',
    resultAiAssist: 'Let AI help structure and polish (without changing the meaning)',
    resultTechCapsule: 'Also generate a technical capsule (for AGI / tools)',
    advancedToolsTitle: 'Advanced tools (optional)',
    advancedToolsDesc:
      'If you are comfortable with JSON / CIDs, explore these experimental tools after generating your capsule.',
    advancedWorkspace: 'Capsule Workspace · Edit / validate capsule JSON directly',
    advancedWorkspaceNote: '(for advanced users)',
    advancedVerify: 'Verify CID · Inspect capsule structure from a CID',
    advancedVerifyNote: '(uses a demo CID for now; replace with a real one later)',
    advancedLocalVerify: 'Local verification: upload your ZIP to check structure and encryption status',
    advancedLocalVerifyNote: '(runs entirely in your browser)',
    encryptionToggle: 'Enable password encryption (experimental)',
    encryptionPasswordPlaceholder: 'Enter a password for local encryption',
    encryptionWarning:
      'Warning: The password is never sent to the server. If you forget it, this capsule cannot be recovered.',
    encryptionPasswordTooShort: 'Password must be at least 8 characters to enable encryption.',
    encryptionLabel: 'Encryption:',
    encryptionNone: 'none (plaintext on local disk)',
    encryptionAes: 'AES-256-GCM (password required to decrypt)',
  },
} as const;

interface CapsuleFormState {
  title: string;
  audience: string;
  scenario: Scenario;
  language: 'zh' | 'en';
  body: string;
  keyMoments: string;
  nonNegotiables: string;
  messageToFuture: string;
  aiAssist: boolean;
  includeTechCapsule: boolean;
}

interface ProgressStep {
  key: 'prepare' | 'score' | 'package';
  label: string;
  description: string;
  status: 'pending' | 'active' | 'done';
}

const stepConfig = [
  {
    key: 'prepare' as const,
    labelKey: 'ritualCheckInput' as const,
    descriptionKey: 'ritualCheckInputDesc' as const,
  },
  {
    key: 'score' as const,
    labelKey: 'ritualScore' as const,
    descriptionKey: 'ritualScoreDesc' as const,
  },
  {
    key: 'package' as const,
    labelKey: 'ritualZip' as const,
    descriptionKey: 'ritualZipDesc' as const,
  },
];

const defaultState: CapsuleFormState = {
  title: '',
  audience: '',
  scenario: 'life-summary',
  language: 'zh',
  body: '',
  keyMoments: '',
  nonNegotiables: '',
  messageToFuture: '',
  aiAssist: false,
  includeTechCapsule: false,
};

export default function CapsuleCreatePage() {
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const t = translations[lang];

  const baseSteps = useMemo<ProgressStep[]>(
    () =>
      stepConfig.map(step => ({
        key: step.key,
        label: t[step.labelKey],
        description: t[step.descriptionKey],
        status: 'pending',
      })),
    [t],
  );

  const [form, setForm] = useState<CapsuleFormState>(defaultState);
  const [touched, setTouched] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<ProgressStep[]>(baseSteps);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [capsuleResult, setCapsuleResult] = useState<OneClickApiResponse | null>(null);
  const [serverIndex, setServerIndex] = useState<FireseedIndexResult | null>(null);
  const [capsuleId, setCapsuleId] = useState<string | null>(null);
  const [downloadPath, setDownloadPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);
  const [encryptionPassword, setEncryptionPassword] = useState('');
  const [encryptionError, setEncryptionError] = useState<string | null>(null);

  useEffect(() => {
    setProgress(prev =>
      prev.map(step => {
        const template = baseSteps.find(item => item.key === step.key);
        if (!template) return step;
        return {
          ...step,
          label: template.label,
          description: template.description,
        };
      }),
    );
  }, [baseSteps]);

  const localIndex = useMemo(() => {
    const fullText = buildFireseedIndexText({
      mainBody: form.body,
      keyEventsText: form.keyMoments,
      principlesText: form.nonNegotiables,
      messageToFuture: form.messageToFuture,
    });
    const { score } = computeFireseedIndex(fullText);
    return score;
  }, [form]);

  const capsuleJson = useMemo(() => {
    if (!capsuleResult) return '';
    return JSON.stringify(capsuleResult.capsule, null, 2);
  }, [capsuleResult]);

  const isEncryptionPasswordValid = encryptionPassword.trim().length >= 8;

  function buildManifestEntry(
    result: OneClickApiResponse,
    encryptionMode: FireseedManifestCapsuleEntry['encryption'],
  ): FireseedManifestCapsuleEntry | null {
    const capsuleId =
      result.meta?.capsuleId ??
      result.capsule?.meta?.capsuleId ??
      result.capsule?.id;

    if (!capsuleId) {
      console.warn('[manifest] Skip manifest write: capsuleId missing');
      return null;
    }

    const createdAt =
      result.meta?.generatedAt ??
      result.meta?.createdAt ??
      result.capsule?.meta?.createdAt ??
      result.capsule?.createdAt ??
      new Date().toISOString();

    const fireseedIndex =
      result.meta?.fireseedIndex?.score ??
      result.meta?.fireseedIndexScore ??
      result.capsule?.meta?.fireseedIndexScore ??
      result.indexResult?.index ??
      undefined;

    const scenarioFromResult =
      (result.meta?.scenario as Scenario | undefined) ?? result.capsule?.meta?.scenario;

    const primaryLanguage =
      (result.meta?.primaryLanguage as 'zh' | 'en' | undefined) ??
      result.capsule?.content?.primaryLanguage ??
      result.capsule?.meta?.primaryLanguage ??
      form.language;

    return {
      capsuleId,
      title: form.title,
      createdAt,
      scenario: scenarioFromResult ?? form.scenario,
      primaryLanguage,
      encryption: encryptionMode,
      fireseedIndex,
      replicas: [
        {
          adapterId: 'local-zip',
          location: `download://fireseed-capsule-${capsuleId}.zip`,
          lastUpdatedAt: createdAt,
        },
      ],
    };
  }

  function update<K extends keyof CapsuleFormState>(key: K, value: CapsuleFormState[K]) {
    setTouched(true);
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function resetProgress() {
    setProgress(baseSteps.map(step => ({ ...step, status: 'pending' })));
  }

  function setStepStatus(target: ProgressStep['key'], status: ProgressStep['status']) {
    setProgress(prev => prev.map(step => (step.key === target ? { ...step, status } : step)));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTouched(true);
    setGenerateError(null);
    setError(null);
    setCapsuleResult(null);
    setServerIndex(null);
    setCapsuleId(null);
    setDownloadPath(null);
    setEncryptionError(null);

    if (!form.body.trim()) {
      setGenerateError(t.errorBodyRequired);
      return;
    }

    const payload = {
      title: form.title,
      audience: form.audience,
      scenario: form.scenario,
      language: form.language,
      mainBody: form.body,
      keyEventsText: form.keyMoments,
      principlesText: form.nonNegotiables,
      messageToFuture: form.messageToFuture,
      aiAssist: form.aiAssist,
      includeTechCapsule: form.includeTechCapsule,
    };

    try {
      setIsGenerating(true);
      resetProgress();
      setStepStatus('prepare', 'active');

      const response = await fetch('/api/capsule/one-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await response
        .json()
        .catch(err => {
          console.error('[one-click] failed to parse JSON:', err);
          throw new Error('服务器返回了无法解析的响应。');
        });

      if (!response.ok || !json?.ok) {
        const msg = json?.error || t.errorGeneric;
        setGenerateError(msg);
        console.error('[one-click] server error payload:', json);
        resetProgress();
        return;
      }

      setStepStatus('prepare', 'done');
      setStepStatus('score', 'active');
      setCapsuleResult(json);
      setServerIndex(json.fireseedIndex ?? json.meta?.fireseedIndex ?? null);
      setCapsuleId(json.capsuleId ?? json.meta?.capsuleId ?? json.capsule?.meta?.capsuleId ?? json.capsule?.id ?? null);
      setDownloadPath(json.downloadPath ?? json.meta?.downloadPath ?? null);
      const manifestEntry = buildManifestEntry(
        json,
        encryptionEnabled && isEncryptionPasswordValid ? 'aes-256-gcm' : 'none',
      );
      if (manifestEntry) {
        void upsertCapsule(manifestEntry).catch(err =>
          console.warn('[manifest] Failed to upsert capsule entry', err),
        );
      }
      setStepStatus('score', 'done');
      setStepStatus('package', 'active');
      setStepStatus('package', 'done');
    } catch (err) {
      const message = err instanceof Error ? err.message : t.errorGeneric;
      console.error('[one-click] client error:', err);
      setGenerateError(message);
      resetProgress();
    } finally {
      setIsGenerating(false);
    }
  }

  const handleDownloadZip = useCallback(() => {
    setError(null);

    if (!capsuleId) {
      setError(
        lang === 'zh'
          ? '请先在上方完成“生成火种胶囊”，再下载 ZIP。'
          : 'Please generate a capsule first before downloading the ZIP.',
      );
      return;
    }

    const url =
      downloadPath && typeof downloadPath === 'string'
        ? downloadPath
        : `/api/capsule/download?id=${encodeURIComponent(capsuleId)}`;

    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = '';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('[capsule/create] download zip failed:', err);
      setError(
        lang === 'zh'
          ? '下载火种胶囊 ZIP 失败，请稍后重试。'
          : 'Failed to download capsule ZIP. Please try again.',
      );
    }
  }, [capsuleId, downloadPath, lang]);
  const titlePlaceholder =
    lang === 'zh' ? '写给 30 年后的自己' : 'A letter to myself 30 years from now';

  const audiencePlaceholder =
    lang === 'zh' ? '未来的自己 / 家人' : 'Future self / family';

  const meta = capsuleResult?.meta;
  const capsule = capsuleResult?.capsule as any | undefined;
  const capsuleIdDisplay =
    capsuleId ?? meta?.capsuleId ?? capsule?.meta?.capsuleId ?? capsule?.id ?? '-';

  const primaryLang =
    meta?.primaryLanguage ?? capsule?.content?.primaryLanguage ?? form.language ?? 'zh';

  const primaryLangLabel =
    primaryLang === 'zh'
      ? lang === 'zh'
        ? '中文'
        : 'Chinese'
      : lang === 'zh'
        ? '英文'
        : 'English';

  const rawStats = serverIndex?.detail?.raw ?? meta?.fireseedIndex?.detail?.raw ?? {};
  const charCount = rawStats.charCount ?? 0;
  const wordCount = rawStats.wordCount ?? 0;

  const lengthLabel =
    lang === 'zh'
      ? `字数：约 ${charCount} 字（约 ${wordCount} 个词）`
      : `Length: ~${charCount} chars (~${wordCount} tokens)`;

  const scenarioLabel = lang === 'zh' ? '人生总账 / 自我总结' : 'Life log / self-summary';

  const encryptionStatus = meta?.encryption ?? (encryptionEnabled ? 'aes-256-gcm' : 'none');
  const encryptionLabel =
    encryptionStatus === 'aes-256-gcm'
      ? `${t.encryptionLabel}${lang === 'zh' ? '' : ' '}${t.encryptionAes}`
      : `${t.encryptionLabel}${lang === 'zh' ? '' : ' '}${t.encryptionNone}`;

  const nextStepsText =
    lang === 'zh'
      ? [
          '1. 请把下载的 ZIP 备份到至少两个不同的地方（例如：本机 + 移动硬盘 / 网盘）。',
          '2. 如果你有纸质遗嘱或重要文件，可以写上「Fireseed 胶囊所在位置」和生成日期。',
          '3. 将来如果你想更新这份火种，不需要覆盖旧版本，可以新建一个版本，并把所有版本一起保留。',
        ].join('\n')
      : [
          '1. Keep this ZIP in at least two different locations (e.g. local disk + external drive or cloud).',
          '2. If you have a will or important document, note down where this capsule is stored and when it was generated.',
          '3. In the future, you can create new capsules instead of overwriting this one, and keep all versions together.',
        ].join('\n');

  return (
    <main className="wizard-container">
      <header className="wizard-header">
        <h1>{t.title}</h1>
        <p>{t.subtitle}</p>
      </header>

      <section className="wizard-card">
        <h2>{t.step1}</h2>
        <form className="wizard-form" onSubmit={handleSubmit}>
          <div className="wizard-grid">
            <label>
              {t.langToggleLabel}
              <select value={lang} onChange={e => setLang(e.target.value as 'zh' | 'en')}>
                <option value="zh">{t.langZh}</option>
                <option value="en">{t.langEn}</option>
              </select>
            </label>
            <label>
              <span>{t.fieldTitle}</span>
              <input
                value={form.title}
                onChange={e => update('title', e.target.value)}
                placeholder={titlePlaceholder}
              />
            </label>
            <label>
              <span>{t.fieldAudience}</span>
              <input
                value={form.audience}
                onChange={e => update('audience', e.target.value)}
                placeholder={audiencePlaceholder}
              />
            </label>
            <label>
              <span>{t.fieldScenario}</span>
              <select value={form.scenario} onChange={e => update('scenario', e.target.value as Scenario)}>
                <option value="life-summary">{t.fieldScenarioLifeLog}</option>
                <option value="family-letter">{t.fieldScenarioFamilyLetter}</option>
                <option value="tech-archive">{t.fieldScenarioTechArchive}</option>
                <option value="value-manifesto">{t.fieldScenarioValueManifesto}</option>
              </select>
            </label>
            <label>
              <span>{t.fieldLanguage}</span>
              <select value={form.language} onChange={e => update('language', e.target.value as 'zh' | 'en')}>
                <option value="zh">{t.langZh}</option>
                <option value="en">{t.langEn}</option>
              </select>
              <p className="mt-1 text-xs text-zinc-500">
                {lang === 'zh'
                  ? '主要语言：用来标记这份火种的主要书写语言，方便未来做 AI 扩写、多语言版本或检索。'
                  : 'Primary language: marks the main language of this capsule so future tools can expand, translate or search it correctly.'}
              </p>
            </label>
            <div className="wizard-switch">
              <label>
                <input
                  type="checkbox"
                  checked={form.aiAssist}
                  onChange={e => update('aiAssist', e.target.checked)}
                />
                <span>{t.optAiAssist}</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={form.includeTechCapsule}
                  onChange={e => update('includeTechCapsule', e.target.checked)}
                />
                <span>{t.optTechCapsule}</span>
              </label>
            </div>
          <div className="wizard-index">
            <span>{t.scoreLabel}</span>
            <strong>{localIndex}</strong>
            <small>{t.scoreHint}</small>
          </div>
        </div>

          <label className="wizard-textarea">
            <span>{t.fieldBodyLabel}</span>
            <textarea
              rows={8}
              value={form.body}
              onChange={e => update('body', e.target.value)}
              placeholder={t.fieldBodyPlaceholder}
            />
          </label>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="wizard-textarea">
              <span>{t.fieldKeywordsLabel}</span>
              <textarea
                rows={4}
                value={form.keyMoments}
                onChange={e => update('keyMoments', e.target.value)}
                placeholder={t.fieldKeywordsPlaceholder}
                className="w-full h-28 resize-none rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400/60 box-border"
              />
            </label>
            <label className="wizard-textarea">
              <span>{t.fieldRulesLabel}</span>
              <textarea
                rows={4}
                value={form.nonNegotiables}
                onChange={e => update('nonNegotiables', e.target.value)}
                placeholder={t.fieldRulesPlaceholder}
                className="w-full h-28 resize-none rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400/60 box-border"
              />
            </label>
            <label className="wizard-textarea">
              <span>{t.fieldLastWordsLabel}</span>
              <textarea
                rows={4}
                value={form.messageToFuture}
                onChange={e => update('messageToFuture', e.target.value)}
                placeholder={t.fieldLastWordsPlaceholder}
                className="w-full h-28 resize-none rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400/60 box-border"
              />
            </label>
          </div>

          <button type="submit" className="wizard-submit" disabled={isGenerating || !form.body.trim()}>
            {isGenerating ? t.buttonGenerating : t.buttonGenerate}
          </button>
          {touched && !form.body.trim() && <p className="wizard-error">{t.errorFormHint}</p>}
          {generateError && <p className="wizard-error">{generateError}</p>}
        </form>
      </section>

      <section className="wizard-card">
        <h2>{t.step2}</h2>
        <ol className="wizard-steps">
          {progress.map(step => (
            <li key={step.key} data-status={step.status}>
              <div>
                <strong>{step.label}</strong>
                <p>{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

        <section className="wizard-card">
          <h2>{t.step3}</h2>
        {!capsuleResult && <p className="wizard-placeholder">{t.resultDesc}</p>}
        {capsuleResult && (
          <div className="wizard-result">
            <div className="h-full">
              <div className="wizard-result-card h-full flex flex-col">
                <h3>{t.resultScoreTitle}</h3>
                <div className="wizard-score">
                  {serverIndex != null ? `${serverIndex.score} / 100` : '- / 100'}
                </div>
                <p>{capsuleResult.indexResult?.discoveryProbability || '-'}</p>
                <ul>
                  {Object.entries(capsuleResult.indexResult?.diagnostics ?? {}).map(([key, value]) => (
                    <li key={key}>
                      <strong>{key}</strong>
                      <span>{typeof value === 'number' ? value.toString() : value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="h-full">
              <div className="wizard-result-card h-full flex flex-col">
                <h3>{t.resultInfoTitle}</h3>
                <p>
                  {lang === 'zh' ? 'ID：' : 'ID:'} <code>{capsuleIdDisplay}</code>
                </p>
                <p>
                  {lang === 'zh'
                    ? `场景：${scenarioLabel}｜语言：${primaryLangLabel}`
                    : `Scenario: ${scenarioLabel} | Language: ${primaryLangLabel}`}
                </p>
                <p>
                  {lengthLabel}
                </p>
                <div className="mt-2 space-y-2 rounded-lg border border-zinc-800/70 bg-zinc-900/40 p-3">
                  <label className="flex items-center gap-2 text-sm text-zinc-100">
                    <input
                      type="checkbox"
                      checked={encryptionEnabled}
                      onChange={e => {
                        setEncryptionEnabled(e.target.checked);
                        setEncryptionError(null);
                      }}
                    />
                    <span>{t.encryptionToggle}</span>
                  </label>
                  <div className="space-y-1">
                    <input
                      type="password"
                      value={encryptionPassword}
                      onChange={e => setEncryptionPassword(e.target.value)}
                      placeholder={t.encryptionPasswordPlaceholder}
                      disabled={!encryptionEnabled}
                      className="w-full rounded-md border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <p className="text-xs text-zinc-500">
                      {t.encryptionWarning}
                    </p>
                    {encryptionEnabled && !isEncryptionPasswordValid && (
                      <p className="text-xs text-amber-400">{t.encryptionPasswordTooShort}</p>
                    )}
                    {encryptionError && <p className="text-xs text-red-400">{encryptionError}</p>}
                  </div>
                  <p className="text-sm text-zinc-200">{encryptionLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadZip}
                  className="wizard-download"
                  disabled={!capsuleId || isGenerating}
                >
                  {lang === 'zh' ? '一键下载胶囊 ZIP' : 'Download capsule ZIP'}
                </button>
                {error && <p className="wizard-error mt-2">{error}</p>}
              </div>
            </div>
            <div className="h-full">
              <div className="wizard-result-card h-full flex flex-col">
                <h3>{t.resultExplainTitle}</h3>
                <div className="flex-1 whitespace-pre-line text-sm leading-relaxed">{nextStepsText}</div>
              </div>
            </div>
            <div className="wizard-json">
              <h3>{t.resultJsonTitle}</h3>
              <textarea readOnly value={capsuleJson} rows={14} />
            </div>
          </div>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5">
        <h3 className="text-sm font-semibold text-zinc-200">{t.advancedToolsTitle}</h3>
        <p className="mt-1 text-xs text-zinc-400">{t.advancedToolsDesc}</p>

        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <a href="/capsule" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300">
              <span>{t.advancedWorkspace}</span>
              <span className="text-xs text-zinc-500">{t.advancedWorkspaceNote}</span>
            </a>
          </li>
          <li>
            <a href="/verify/cid/demo" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300">
              <span>{t.advancedVerify}</span>
              <span className="text-xs text-zinc-500">{t.advancedVerifyNote}</span>
            </a>
          </li>
          <li>
            <a href="/verify/local" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300">
              <span>{t.advancedLocalVerify}</span>
              <span className="text-xs text-zinc-500">{t.advancedLocalVerifyNote}</span>
            </a>
          </li>
        </ul>
      </section>
    </main>
  );
}
