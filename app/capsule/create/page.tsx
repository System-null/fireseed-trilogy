'use client';

import { useMemo, useState } from 'react';
import { calculateFireseedIndex } from '@/lib/fireseedIndex';

type Scenario =
  | 'life-summary'
  | 'family-letter'
  | 'tech-archive'
  | 'value-manifesto';

interface CapsuleFormState {
  title: string;
  audience: string;
  scenario: Scenario;
  language: 'zh' | 'en';
  body: string;
  keyMoments: string;
  nonNegotiables: string;
  messageToFuture: string;
}

interface GeneratedCapsule {
  id: string;
  schema: string;
  version: string;
  createdAt: string;
  meta: {
    title: string;
    audience: string;
    scenario: Scenario;
    language: 'zh' | 'en';
    fireseedIndex: number;
  };
  content: {
    raw: string;
    keyMoments: string;
    nonNegotiables: string;
    messageToFuture: string;
  };
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
};

export default function CapsuleCreatePage() {
  const [form, setForm] = useState<CapsuleFormState>(defaultState);
  const [touched, setTouched] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const indexResult = useMemo(() => {
    return calculateFireseedIndex(form.body || '');
  }, [form.body]);

  const capsule: GeneratedCapsule | null = useMemo(() => {
    if (!form.body.trim()) return null;
    const now = new Date();
    const id = `fireseed-${now.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;
    return {
      id,
      schema: 'fireseed.capsule.v0',
      version: '0.2.9',
      createdAt: now.toISOString(),
      meta: {
        title: form.title.trim() || '未命名火种胶囊',
        audience: form.audience.trim() || '未指定',
        scenario: form.scenario,
        language: form.language,
        fireseedIndex: indexResult.index,
      },
      content: {
        raw: form.body.trim(),
        keyMoments: form.keyMoments.trim(),
        nonNegotiables: form.nonNegotiables.trim(),
        messageToFuture: form.messageToFuture.trim(),
      },
    };
  }, [form, indexResult.index]);

  const capsuleJson = useMemo(() => {
    if (!capsule) return '';
    return JSON.stringify(capsule, null, 2);
  }, [capsule]);

  function update<K extends keyof CapsuleFormState>(key: K, value: CapsuleFormState[K]) {
    setTouched(true);
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!form.body.trim()) return;
    setHasGenerated(true);
  }

  function handleDownload() {
    if (!capsule || !capsuleJson) return;
    const blob = new Blob([capsuleJson], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${capsule.id || 'fireseed-capsule'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const scenarioLabel = (s: Scenario) => {
    switch (s) {
      case 'life-summary':
        return '人生总账 / 自我总结';
      case 'family-letter':
        return '给家人的信';
      case 'tech-archive':
        return '技术档案 / 生涯记录';
      case 'value-manifesto':
        return '价值观宣言 / 原则清单';
      default:
        return s;
    }
  };

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">火种胶囊生成器（阶段一）</h1>
      <p className="text-sm text-gray-600 mb-4">
        这是一个给普通人用的一次性仪式：写下你真正想留下的内容，我们帮你封装成一个结构化的“火种胶囊”。
        所有计算都在本地浏览器完成，数据不会上传到服务器。
      </p>

      <section className="border rounded-lg p-4 mb-6 bg-white/80">
        <h2 className="font-medium mb-3">步骤 1：填写你的火种信息</h2>
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                标题（给这份火种起个名字）
              </label>
              <input
                className="w-full border rounded px-2 py-1 text-sm"
                value={form.title}
                onChange={e => update('title', e.target.value)}
                placeholder="例如：写给 60 岁的自己 / 如果我突然离开这个世界..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                写给谁？
              </label>
              <input
                className="w-full border rounded px-2 py-1 text-sm"
                value={form.audience}
                onChange={e => update('audience', e.target.value)}
                placeholder="例如：未来的自己、孩子、伴侣、还没见过的后代..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                场景（我们会用它稍微调整结构）
              </label>
              <select
                className="w-full border rounded px-2 py-1 text-sm"
                value={form.scenario}
                onChange={e => update('scenario', e.target.value as Scenario)}
              >
                <option value="life-summary">人生总账 / 自我总结</option>
                <option value="family-letter">给家人的信</option>
                <option value="tech-archive">技术档案 / 生涯记录</option>
                <option value="value-manifesto">价值观宣言 / 原则清单</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                主要语言
              </label>
              <select
                className="w-full border rounded px-2 py-1 text-sm"
                value={form.language}
                onChange={e => update('language', e.target.value as 'zh' | 'en')}
              >
                <option value="zh">中文为主</option>
                <option value="en">English (primary)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                当前火种指数（实时预估）
              </label>
              <div className="text-lg font-semibold">
                {indexResult.index}
                <span className="text-xs text-gray-500 ml-2">/ 100</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                字数、结构、情绪深度、时间跨度、关键决策都会影响这个分数。
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              你的故事主体（越真实、越具体越好）
            </label>
            <textarea
              className="w-full border rounded px-2 py-1 text-sm font-mono"
              rows={8}
              value={form.body}
              onChange={e => update('body', e.target.value)}
              placeholder="可以从几个时间节点写起：小时候 / 转折 / 后悔 / 骄傲 / 现在 / 未来的自己希望成为什么样的人..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                关键节点 / 重大选择
              </label>
              <textarea
                className="w-full border rounded px-2 py-1 text-xs font-mono"
                rows={4}
                value={form.keyMoments}
                onChange={e => update('keyMoments', e.target.value)}
                placeholder="例如：当 XX 发生时，我选择了 A 而不是 B... 如果重来一次，我会怎么做？"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                不可退让的底线 / 原则
              </label>
              <textarea
                className="w-full border rounded px-2 py-1 text-xs font-mono"
                rows={4}
                value={form.nonNegotiables}
                onChange={e => update('nonNegotiables', e.target.value)}
                placeholder="例如：绝不做哪些事 / 在任何世界线都必须坚持的原则。"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                想直接留给未来的那句话
              </label>
              <textarea
                className="w-full border rounded px-2 py-1 text-xs font-mono"
                rows={4}
                value={form.messageToFuture}
                onChange={e => update('messageToFuture', e.target.value)}
                placeholder="例如：如果你在读这段话，说明..."
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-2 inline-flex items-center px-4 py-1.5 rounded bg-black text-white text-sm hover:bg-gray-800 disabled:opacity-50"
            disabled={!form.body.trim()}
          >
            一键生成火种胶囊
          </button>
          {touched && !form.body.trim() && (
            <p className="text-xs text-red-500 mt-1">
              请至少在“你的故事主体”里写点内容，再点击生成。
            </p>
          )}
        </form>
      </section>

      <section className="border rounded-lg p-4 mb-6 bg-white/90">
        <h2 className="font-medium mb-2">步骤 2：封装与解释</h2>
        {!capsule && (
          <p className="text-sm text-gray-500">
            填写上面的内容并点击“生成”，这里会展示你的火种胶囊结构与说明。
          </p>
        )}
        {capsule && (
          <>
            <div className="mb-4 text-sm">
              <p className="mb-1">
                ✅ <span className="font-medium">火种胶囊已准备好（未签名，本地结构化版本）</span>
              </p>
              <p className="text-gray-700">
                ID：<code className="px-1 bg-gray-100 rounded text-xs">{capsule.id}</code> ｜ 场景：
                {scenarioLabel(capsule.meta.scenario)} ｜ 语言：
                {capsule.meta.language === 'zh' ? '中文' : 'English'}
              </p>
              <p className="text-gray-700 mt-1">
                当前 Fireseed 指数：
                <span className="font-semibold ml-1">{indexResult.index}</span>
                <span className="text-xs text-gray-500 ml-1">/ 100</span>
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                {indexResult.discoveryProbability}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="text-sm">
                <h3 className="font-medium mb-1">这是什么？</h3>
                <p className="text-gray-700 mb-2">
                  这是一个面向未来人类 / 高维智能的“结构化自述文件”。它不是法律遗嘱，也不是心理咨询记录，
                  而是一份可以被机器解析、也能被人类阅读的“存在说明书”。
                </p>
                <h3 className="font-medium mb-1">为什么重要？</h3>
                <ul className="list-disc list-inside text-gray-700 text-sm mb-2">
                  <li>它把你的故事从“散落的记忆”变成“可以被结构化保存的火种”；</li>
                  <li>它能与后续的签名、CAR 文件、分布式存储等能力对接；</li>
                  <li>它给未来的你、你的家人、甚至未来的 AGI 一个可以读取的起点。</li>
                </ul>
                <h3 className="font-medium mb-1">你现在可以做什么？</h3>
                <ol className="list-decimal list-inside text-gray-700 text-sm">
                  <li>点击右侧的“下载 JSON 文件”，把这份胶囊保存到本地；</li>
                  <li>建议至少备份在 2 个不同的物理位置（例如：本机 + 外接硬盘）；</li>
                  <li>把胶囊 ID 写在纸质文件中（遗嘱 / 信封），告诉一个你信任的人它代表什么。</li>
                </ol>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-sm">机器可读版本（JSON）</h3>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="inline-flex items-center px-3 py-1 rounded bg-gray-900 text-white text-xs hover:bg-gray-700"
                  >
                    下载 JSON 文件
                  </button>
                </div>
                <textarea
                  className="w-full border rounded px-2 py-1 text-xs font-mono"
                  rows={16}
                  value={capsuleJson}
                  readOnly
                />
              </div>
            </div>
          </>
        )}
      </section>

      <section className="border rounded-lg p-4 bg-white/80 text-xs text-gray-600">
        <h2 className="font-medium mb-1">安全与后续能力说明</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>本页不做任何网络请求，所有计算都在你的浏览器本地完成。</li>
          <li>当前阶段生成的是“未签名胶囊”，后续可以接入 keystore / sign-lab 做本地签名。</li>
          <li>后续版本会增加：一键签名、本地打包 CAR、可选上传到分布式存储等能力。</li>
          <li>你可以把这份 JSON 看作是“火种的 v0.2 草稿版”，比旧版 generator.html 更结构化、可扩展。</li>
        </ul>
      </section>
    </main>
  );
}
