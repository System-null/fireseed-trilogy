'use client';

import { useEffect, useMemo, useState } from 'react';
import { calculateFireseedIndex } from '@/lib/fireseedIndex';
import type { Scenario, OneClickPayload } from '@/lib/capsule/oneClick';

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
    downloadZip: '下载一键胶囊 ZIP',
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

interface ApiSuccess {
  capsule: {
    id: string;
    meta: {
      title: string;
      audience: string;
      scenario: Scenario;
      language: 'zh' | 'en';
      fireseedIndex: number;
      aiAssist: boolean;
      includeTechCapsule: boolean;
      wordCount: number;
    };
    createdAt: string;
    content: {
      raw: string;
      keyMoments: string;
      nonNegotiables: string;
      messageToFuture: string;
      outline: string[];
    };
  };
  indexResult: ReturnType<typeof calculateFireseedIndex>;
  explain: {
    summary: string;
    steps: { key: string; label: string; detail: string }[];
    recommendedActions: string[];
    aiAssist: boolean;
  };
  zipBase64: string;
  zipFilename: string;
}

const defaultState: CapsuleFormState = {
  title: '写给 30 年后的自己',
  audience: '未来的自己 / 家人',
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState<ProgressStep[]>(baseSteps);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiSuccess | null>(null);

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
    return calculateFireseedIndex(form.body || '');
  }, [form.body]);

  const capsuleJson = useMemo(() => {
    if (!result) return '';
    return JSON.stringify(result.capsule, null, 2);
  }, [result]);

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
    setError(null);
    setResult(null);

    if (!form.body.trim()) {
      setError(t.errorBodyRequired);
      return;
    }

    const payload: OneClickPayload = {
      title: form.title,
      audience: form.audience,
      scenario: form.scenario,
      language: form.language,
      body: form.body,
      keyMoments: form.keyMoments,
      nonNegotiables: form.nonNegotiables,
      messageToFuture: form.messageToFuture,
      aiAssist: form.aiAssist,
      includeTechCapsule: form.includeTechCapsule,
    };

    try {
      setIsSubmitting(true);
      resetProgress();
      setStepStatus('prepare', 'active');

      const response = await fetch('/api/capsule/one-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setStepStatus('prepare', 'done');
      setStepStatus('score', 'active');

      let json: { ok: boolean; data?: ApiSuccess; message?: string } | null = null;
      try {
        json = await response.json();
      } catch (parseError) {
        throw new Error(t.errorGeneric);
      }

      setStepStatus('score', 'done');
      setStepStatus('package', 'active');

      if (!response.ok || !json?.ok || !json.data) {
        const msg = json?.message || t.errorGeneric;
        throw new Error(msg);
      }

      setResult(json.data);
      setStepStatus('package', 'done');
    } catch (err) {
      const message = err instanceof Error ? err.message : t.errorGeneric;
      setError(message);
      resetProgress();
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDownloadZip() {
    if (!result?.zipBase64) return;
    try {
      const binary = atob(result.zipBase64);
      const length = binary.length;
      const bytes = new Uint8Array(length);
      for (let i = 0; i < length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.zipFilename || 'fireseed-capsule.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(t.errorDownload);
    }
  }
  const scenarioLabels = useMemo(
    () => ({
      'life-summary': t.fieldScenarioLifeLog,
      'family-letter': t.fieldScenarioFamilyLetter,
      'tech-archive': t.fieldScenarioTechArchive,
      'value-manifesto': t.fieldScenarioValueManifesto,
    }),
    [t],
  );

  function scenarioLabel(value: Scenario) {
    return scenarioLabels[value] || value;
  }

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
                placeholder={t.fieldTitlePlaceholder}
              />
            </label>
            <label>
              <span>{t.fieldAudience}</span>
              <input
                value={form.audience}
                onChange={e => update('audience', e.target.value)}
                placeholder={t.fieldAudiencePlaceholder}
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
              <strong>{localIndex.index}</strong>
              <small>{localIndex.discoveryProbability}</small>
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

          <button type="submit" className="wizard-submit" disabled={isSubmitting}>
            {isSubmitting ? t.buttonGenerating : t.buttonGenerate}
          </button>
          {touched && !form.body.trim() && <p className="wizard-error">{t.errorFormHint}</p>}
          {error && <p className="wizard-error">{error}</p>}
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
        {!result && <p className="wizard-placeholder">{t.resultDesc}</p>}
        {result && (
          <div className="wizard-result">
            <div className="wizard-result-card">
              <h3>{t.resultScoreTitle}</h3>
              <div className="wizard-score">{result.indexResult.index} / 100</div>
              <p>{result.indexResult.discoveryProbability}</p>
              <ul>
                {Object.entries(result.indexResult.diagnostics).map(([key, value]) => (
                  <li key={key}>
                    <strong>{key}</strong>
                    <span>{typeof value === 'number' ? value.toString() : value}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="wizard-result-card">
              <h3>{t.resultInfoTitle}</h3>
              <p>
                ID：<code>{result.capsule.id}</code>
              </p>
              <p>
                {t.resultScenario}
                {scenarioLabel(result.capsule.meta.scenario)} ｜ {t.resultLanguage}
                {result.capsule.meta.language === 'zh' ? t.langZh : t.langEn}
              </p>
              <p>
                {t.resultWordCount} {result.capsule.meta.wordCount}{' '}
                {lang === 'zh' ? '字' : 'words'}
              </p>
              <button type="button" onClick={handleDownloadZip} className="wizard-download">
                {t.downloadZip}
              </button>
            </div>
            <div className="wizard-result-card">
              <h3>{t.resultExplainTitle}</h3>
              <p>{result.explain.summary}</p>
              <ul>
                {result.explain.recommendedActions.map(action => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
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
        </ul>
      </section>
    </main>
  );
}
