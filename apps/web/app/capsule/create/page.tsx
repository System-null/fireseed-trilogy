'use client';

import { useMemo, useState } from 'react';
import { calculateFireseedIndex } from '@/lib/fireseedIndex';
import type { Scenario, OneClickPayload } from '@/lib/capsule/oneClick';

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

const baseSteps: ProgressStep[] = [
  {
    key: 'prepare',
    label: '整理输入',
    description: '校验标题、正文与场景，生成胶囊 ID。',
    status: 'pending',
  },
  {
    key: 'score',
    label: '计算 Fireseed Index',
    description: '基于文本结构与情绪密度生成仪式感分数。',
    status: 'pending',
  },
  {
    key: 'package',
    label: '封装 ZIP',
    description: '把 JSON 与说明文档打包，准备下载链接。',
    status: 'pending',
  },
];

export default function CapsuleCreatePage() {
  const [form, setForm] = useState<CapsuleFormState>(defaultState);
  const [touched, setTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState<ProgressStep[]>(baseSteps);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiSuccess | null>(null);

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
      setError('正文不能为空，请至少写一点内容再尝试生成。');
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
        throw new Error('生成失败，请检查网络或稍后重试。');
      }

      setStepStatus('score', 'done');
      setStepStatus('package', 'active');

      if (!response.ok || !json?.ok || !json.data) {
        const msg = json?.message || '生成失败，请稍后重试。';
        throw new Error(msg);
      }

      setResult(json.data);
      setStepStatus('package', 'done');
    } catch (err) {
      const message = err instanceof Error ? err.message : '生成失败，请检查网络或稍后重试。';
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
      setError('下载 ZIP 时发生错误，请稍后再试。');
    }
  }

  function scenarioLabel(value: Scenario) {
    switch (value) {
      case 'life-summary':
        return '人生总账 / 自我总结';
      case 'family-letter':
        return '给家人的信';
      case 'tech-archive':
        return '技术档案 / 生涯记录';
      case 'value-manifesto':
        return '价值观宣言 / 原则清单';
      default:
        return value;
    }
  }

  return (
    <main className="wizard-container">
      <header className="wizard-header">
        <h1>火种胶囊一键向导</h1>
        <p>
          填写你的故事与底线，点击“一键生成”即可获得结构化的火种胶囊、Fireseed Index
          诊断以及可下载的 ZIP。
        </p>
      </header>

      <section className="wizard-card">
        <h2>步骤 1：填写基本信息</h2>
        <form className="wizard-form" onSubmit={handleSubmit}>
          <div className="wizard-grid">
            <label>
              <span>标题</span>
              <input
                value={form.title}
                onChange={e => update('title', e.target.value)}
                placeholder="写给 60 岁的自己 / 如果我突然离开这个世界..."
              />
            </label>
            <label>
              <span>写给谁</span>
              <input
                value={form.audience}
                onChange={e => update('audience', e.target.value)}
                placeholder="未来的自己、孩子、伴侣或受托人"
              />
            </label>
            <label>
              <span>场景</span>
              <select
                value={form.scenario}
                onChange={e => update('scenario', e.target.value as Scenario)}
              >
                <option value="life-summary">人生总账 / 自我总结</option>
                <option value="family-letter">给家人的信</option>
                <option value="tech-archive">技术档案 / 生涯记录</option>
                <option value="value-manifesto">价值观宣言 / 原则清单</option>
              </select>
            </label>
            <label>
              <span>主要语言</span>
              <select
                value={form.language}
                onChange={e => update('language', e.target.value as 'zh' | 'en')}
              >
                <option value="zh">中文</option>
                <option value="en">English</option>
              </select>
            </label>
            <div className="wizard-switch">
              <label>
                <input
                  type="checkbox"
                  checked={form.aiAssist}
                  onChange={e => update('aiAssist', e.target.checked)}
                />
                <span>AI 协助（启用后在说明文档中注明）</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={form.includeTechCapsule}
                  onChange={e => update('includeTechCapsule', e.target.checked)}
                />
                <span>包含技术胶囊（附加工程化提示）</span>
              </label>
            </div>
            <div className="wizard-index">
              <span>实时 Fireseed Index 预估</span>
              <strong>{localIndex.index}</strong>
              <small>{localIndex.discoveryProbability}</small>
            </div>
          </div>

          <label className="wizard-textarea">
            <span>你的故事主体</span>
            <textarea
              rows={8}
              value={form.body}
              onChange={e => update('body', e.target.value)}
              placeholder="可以从几个时间节点写起：小时候 / 转折 / 后悔 / 骄傲 / 现在 / 未来的自己希望成为什么样的人..."
            />
          </label>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="wizard-textarea">
              <span>关键节点 / 重大选择</span>
              <textarea
                rows={4}
                value={form.keyMoments}
                onChange={e => update('keyMoments', e.target.value)}
                placeholder="当 XX 发生时，我选择了 A 而不是 B... 如果重来一次，我会怎么做？"
                className="w-full h-28 resize-none rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400/60 box-border"
              />
            </label>
            <label className="wizard-textarea">
              <span>不可退让的底线 / 原则</span>
              <textarea
                rows={4}
                value={form.nonNegotiables}
                onChange={e => update('nonNegotiables', e.target.value)}
                placeholder="绝不做哪些事 / 在任何世界线都必须坚持的原则？"
                className="w-full h-28 resize-none rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400/60 box-border"
              />
            </label>
            <label className="wizard-textarea">
              <span>想留给未来的那句话</span>
              <textarea
                rows={4}
                value={form.messageToFuture}
                onChange={e => update('messageToFuture', e.target.value)}
                placeholder="如果你在读这段话，说明..."
                className="w-full h-28 resize-none rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400/60 box-border"
              />
            </label>
          </div>

          <button type="submit" className="wizard-submit" disabled={isSubmitting}>
            {isSubmitting ? '生成中...' : '一键生成火种胶囊'}
          </button>
          {touched && !form.body.trim() && (
            <p className="wizard-error">请先写一点内容，我们才能计算 Fireseed Index。</p>
          )}
          {error && <p className="wizard-error">{error}</p>}
        </form>
      </section>

      <section className="wizard-card">
        <h2>步骤 2：仪式感进度</h2>
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
        <h2>步骤 3：结果与保存</h2>
        {!result && <p className="wizard-placeholder">完成上方步骤后，这里会展示生成的火种胶囊结果。</p>}
        {result && (
          <div className="wizard-result">
            <div className="wizard-result-card">
              <h3>Fireseed 指数</h3>
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
              <h3>胶囊信息</h3>
              <p>
                ID：<code>{result.capsule.id}</code>
              </p>
              <p>
                场景：{scenarioLabel(result.capsule.meta.scenario)} ｜ 语言：
                {result.capsule.meta.language === 'zh' ? '中文' : 'English'}
              </p>
              <p>字数：约 {result.capsule.meta.wordCount} 字</p>
              <button type="button" onClick={handleDownloadZip} className="wizard-download">
                下载一键胶囊 ZIP
              </button>
            </div>
            <div className="wizard-result-card">
              <h3>说明与下一步</h3>
              <p>{result.explain.summary}</p>
              <ul>
                {result.explain.recommendedActions.map(action => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
            </div>
            <div className="wizard-json">
              <h3>机器可读版本（JSON）</h3>
              <textarea readOnly value={capsuleJson} rows={14} />
            </div>
          </div>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5">
        <h3 className="text-sm font-semibold text-zinc-200">高级工具（可选）</h3>
        <p className="mt-1 text-xs text-zinc-400">
          如果你熟悉 JSON / CID，可以在生成火种胶囊之后，使用下面的实验工具做更深入的检查。
        </p>

        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <a
              href="/capsule"
              className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300"
            >
              <span>Capsule Workspace · 直接编辑 / 校验 capsule JSON</span>
              <span className="text-xs text-zinc-500">(面向高级用户)</span>
            </a>
          </li>
          <li>
            <a
              href="/verify/cid/demo"
              className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300"
            >
              <span>Verify CID · 体验用 CID 检查 CAR / 胶囊结构</span>
              <span className="text-xs text-zinc-500">(当前使用 demo CID，未来可替换为真实 CID)</span>
            </a>
          </li>
        </ul>
      </section>
    </main>
  );
}
