'use client';

import { useCallback, useRef, useState } from 'react';
import JSZip from 'jszip';
import { computeFireseedIndex, FireseedIndexDetail, FireseedIndexResult } from '@/lib/fireseedIndex';
import { CURRENT_SCHEMA_VERSION, isCurrentVersion } from '@/lib/capsuleVersion';

interface MetaInfo {
  schemaVersion?: string;
  generatedAt?: string;
  encryption?: string;
  fireseedIndex?: FireseedIndexResult | null;
}

function normalizeFireseedIndex(value: unknown): FireseedIndexResult | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as { score?: unknown; detail?: unknown };
  if (typeof candidate.score !== 'number' || typeof candidate.detail !== 'object') {
    return null;
  }
  return {
    score: candidate.score,
    detail: candidate.detail as FireseedIndexDetail,
  };
}

export default function CapsuleVerifyPage() {
  const [status, setStatus] = useState<string>('尚未选择文件 / No file selected.');
  const [meta, setMeta] = useState<MetaInfo | null>(null);
  const [recomputedIndex, setRecomputedIndex] = useState<FireseedIndexResult | null>(
    null,
  );
  const [integrityMessage, setIntegrityMessage] = useState<string>('等待文件 / Waiting for file.');
  const [schemaMessage, setSchemaMessage] = useState<string>('');
  const [rawPreview, setRawPreview] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetState = useCallback(() => {
    setStatus('尚未选择文件 / No file selected.');
    setMeta(null);
    setRecomputedIndex(null);
    setIntegrityMessage('等待文件 / Waiting for file.');
    setSchemaMessage('');
    setRawPreview('');
    setError(null);
  }, []);

  const processFile = useCallback(async (file: File) => {
    resetState();
    setStatus(`读取文件：${file.name} / Reading file: ${file.name}`);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const entries = Object.keys(zip.files);
      if (entries.length === 0) {
        throw new Error('ZIP 为空 / ZIP archive is empty.');
      }

      const firstWithSlash = entries.find(name => name.includes('/'));
      const rootDir = firstWithSlash ? firstWithSlash.split('/')[0] : '';
      const resolvePath = (name: string) => (rootDir ? `${rootDir}/${name}` : name);

      const metaFile = zip.file(resolvePath('meta.json'));
      if (!metaFile) {
        throw new Error('未找到 meta.json / meta.json is missing.');
      }

      const capsuleFile = zip.file(resolvePath('capsule.json'));
      const encryptedCapsule = zip.file(resolvePath('capsule.enc'));
      if (!capsuleFile && encryptedCapsule) {
        throw new Error(
          '检测到加密胶囊（capsule.enc），当前仅支持明文 capsule.json。/ Encrypted capsule detected (capsule.enc); only plaintext capsule.json is supported now.',
        );
      }
      if (!capsuleFile) {
        throw new Error('未找到 capsule.json / capsule.json is missing.');
      }

      const metaText = await metaFile.async('string');
      const capsuleText = await capsuleFile.async('string');

      let parsedMeta: MetaInfo = {};
      let parsedCapsule: any = {};
      try {
        parsedMeta = JSON.parse(metaText) as MetaInfo;
      } catch (err) {
        throw new Error('meta.json 解析失败 / Failed to parse meta.json.');
      }

      try {
        parsedCapsule = JSON.parse(capsuleText);
      } catch (err) {
        throw new Error('capsule.json 解析失败 / Failed to parse capsule.json.');
      }

      const schemaVersion = parsedMeta.schemaVersion ?? parsedCapsule?.version;
      const schemaIsCurrent = isCurrentVersion(schemaVersion);
      const schemaLabel = schemaVersion
        ? schemaIsCurrent
          ? `Schema 版本：${schemaVersion}（当前版本 / current）`
          : `Schema 版本：${schemaVersion}（旧版本 / legacy, parsed in compatibility mode）`
        : '未提供 Schema 版本 / Schema version not provided.';
      setSchemaMessage(schemaLabel);

      const fireseedIndex = normalizeFireseedIndex((parsedMeta as any).fireseedIndex);
      const rawText = parsedCapsule?.content?.raw ?? '';
      setRawPreview(rawText);
      const recomputed = computeFireseedIndex(rawText || '');

      setMeta({
        schemaVersion,
        generatedAt: parsedMeta.generatedAt ?? parsedCapsule?.meta?.createdAt,
        encryption: parsedMeta.encryption ?? (parsedCapsule?.meta?.encryption as string),
        fireseedIndex,
      });
      setRecomputedIndex(recomputed);

      if (fireseedIndex) {
        const diff = Math.abs(fireseedIndex.score - recomputed.score);
        const verdict =
          diff <= 3
            ? `完整性：通过（差值 ${diff} 分）/ Integrity: OK (difference ${diff} points).`
            : `完整性：存疑（记录值与本地计算差异 ${diff} 分）/ Integrity: Suspicious (difference ${diff} points).`;
        setIntegrityMessage(verdict);
      } else {
        setIntegrityMessage(
          '这是旧版本胶囊，不包含 Fireseed Index 信息。/ This is an older capsule without Fireseed Index information.',
        );
      }

      setStatus('解析完成 / Parsing completed.');
    } catch (err) {
      const message = err instanceof Error ? err.message : '未知错误 / Unknown error.';
      setError(message);
      setStatus('解析失败 / Parsing failed.');
    }
  }, [resetState]);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files?.[0];
      if (file) {
        void processFile(file);
      }
    },
    [processFile],
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        void processFile(file);
      }
    },
    [processFile],
  );

  const renderIndexBlock = (label: string, index: FireseedIndexResult | null) => {
    if (!index) return <p className="text-sm text-gray-500">暂无数据 / No data.</p>;
    return (
      <div className="text-sm text-gray-800 space-y-1">
        <div>
          <span className="font-medium">{label}</span>
          <span className="ml-2 text-gray-600">{index.score} / 100</span>
        </div>
        <pre className="bg-gray-50 border rounded p-2 overflow-x-auto text-xs text-gray-700">
          {JSON.stringify(index.detail, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Fireseed Capsule 本地验证 / Local Capsule Verification</h1>
      <p className="text-sm text-gray-700 bg-green-50 border border-green-200 rounded p-3">
        所有验证操作在浏览器本地执行，文件内容不会被上传。/ All verification is performed locally in your browser; the file contents are never uploaded.
      </p>

      <section className="border rounded-lg p-4 bg-white shadow-sm space-y-3">
        <div
          className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/zip"
            className="hidden"
            onChange={handleFileChange}
          />
          <p className="text-base font-medium text-gray-800">
            拖入 Fireseed Capsule ZIP 文件，或点击选择 / Drag your Fireseed Capsule ZIP here, or click to select.
          </p>
          <p className="text-xs text-gray-500 mt-2">当前支持的 Schema 版本：{CURRENT_SCHEMA_VERSION}</p>
          <p className="text-sm text-gray-600 mt-2">{status}</p>
        </div>
        {error ? (
          <div className="text-red-600 text-sm">{error}</div>
        ) : (
          <div className="text-green-700 text-sm">准备就绪 / Ready.</div>
        )}
      </section>

      <section className="border rounded-lg p-4 bg-white shadow-sm space-y-3">
        <h2 className="text-xl font-semibold">验证结果 / Verification Result</h2>
        <div className="space-y-2 text-sm text-gray-800">
          <div>{schemaMessage || '尚未检测 Schema 版本 / Schema version not detected yet.'}</div>
          <div>
            Schema 版本 / Schema Version: <span className="font-mono">{meta?.schemaVersion || '—'}</span>
          </div>
          <div>
            生成时间 / Generated At: <span className="font-mono">{meta?.generatedAt || '—'}</span>
          </div>
          <div>
            加密模式 / Encryption Mode: <span className="font-mono">{meta?.encryption || '—'}</span>
          </div>
          <div className="pt-2">
            记录中的 Fireseed Index / Stored Fireseed Index:
            <div className="mt-1">{renderIndexBlock('记录分 / Stored Score', meta?.fireseedIndex ?? null)}</div>
          </div>
          <div className="pt-2">
            本地重新计算 / Recomputed Index:
            <div className="mt-1">{renderIndexBlock('重新计算 / Recomputed', recomputedIndex)}</div>
          </div>
          <div className="pt-2 font-medium text-gray-900">{integrityMessage}</div>
        </div>
      </section>

      {rawPreview ? (
        <section className="border rounded-lg p-4 bg-gray-50 shadow-inner space-y-2">
          <h3 className="text-lg font-semibold">原文片段 / Original Text Preview</h3>
          <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words max-h-64 overflow-y-auto border rounded p-2 bg-white">
            {rawPreview.slice(0, 2000) || '（原文为空） / (Empty content)'}
          </pre>
        </section>
      ) : null}
    </main>
  );
}
