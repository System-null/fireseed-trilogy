'use client';

import { useCallback, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import JSZip from 'jszip';

import { parseCapsuleZip, type ParsedCapsuleZip } from '@/lib/capsuleZip';

export default function VerifyLocalPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<ParsedCapsuleZip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [decryptedCapsule, setDecryptedCapsule] = useState<any | null>(null);
  const [decryptedMeta, setDecryptedMeta] = useState<any | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleFileSelected = useCallback(async (file: File) => {
    setSelectedFile(file);
    setIsParsing(true);
    setError(null);
    setDecryptedCapsule(null);
    setDecryptedMeta(null);

    try {
      const parsed = await parseCapsuleZip(file);
      setResult(parsed);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : '解析失败 / Failed to parse ZIP');
      setResult(null);
      setDecryptedCapsule(null);
      setDecryptedMeta(null);
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleDecrypt = useCallback(async () => {
    if (!result || result.encryptionMode !== 'aes-256-gcm') return;
    if (!selectedFile) return;

    if (!password.trim()) {
      setError('请先输入密码 / Please enter a password first.');
      return;
    }

    setIsParsing(true);
    setError(null);

    try {
      const parsed = await parseCapsuleZip(selectedFile, password.trim());
      setResult(parsed);
      setDecryptedCapsule(parsed.capsule ?? null);
      setDecryptedMeta(parsed.meta ?? null);
    } catch (e) {
      setError('解密失败：密码不正确或数据已损坏 / Decryption failed: wrong password or corrupted data.');
      setDecryptedCapsule(null);
      setDecryptedMeta(null);
    } finally {
      setIsParsing(false);
    }
  }, [password, result, selectedFile]);

  const handleExportDecrypted = useCallback(async () => {
    if (!decryptedCapsule || !decryptedMeta) return;
    try {
      setIsExporting(true);

      const zip = new JSZip();

      const capsuleId =
        decryptedMeta.capsuleId ||
        decryptedMeta.capsuleID ||
        decryptedMeta.id ||
        'fireseed-capsule';

      const folderName = `fireseed-capsule-decrypted-${capsuleId}`;
      const folder = zip.folder(folderName) ?? zip;

      const metaToWrite = {
        ...decryptedMeta,
        exportedFromEncrypted: true,
        exportedAsPlaintextAt: new Date().toISOString(),
      };

      folder.file('capsule.json', JSON.stringify(decryptedCapsule, null, 2));
      folder.file('meta.json', JSON.stringify(metaToWrite, null, 2));

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${folderName}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }, [decryptedCapsule, decryptedMeta]);

  const onDrop = useCallback(
    async (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (event.dataTransfer.files && event.dataTransfer.files[0]) {
        const file = event.dataTransfer.files[0];
        await handleFileSelected(file);
      }
    },
    [handleFileSelected]
  );

  const onInputChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        await handleFileSelected(file);
      }
    },
    [handleFileSelected]
  );

  const renderBasicInfo = () => {
    if (!result) return null;

    const meta = result.meta ?? {};
    const capsule = result.capsule ?? {};
    const fireseedIndex = meta.fireseedIndex ?? {};

    return (
      <div className="mt-4 space-y-2 text-sm text-zinc-200">
        <p>
          <span className="font-medium text-zinc-100">capsuleId：</span>
          <span className="text-emerald-300">{meta.capsuleId || 'N/A'}</span>
        </p>
        <p>
          <span className="font-medium text-zinc-100">schemaVersion：</span>
          <span className="text-emerald-300">{meta.schemaVersion || meta.version || 'N/A'}</span>
        </p>
        <p>
          <span className="font-medium text-zinc-100">primaryLanguage：</span>
          <span className="text-emerald-300">{meta.primaryLanguage || capsule.primaryLanguage || 'N/A'}</span>
        </p>
        <p>
          <span className="font-medium text-zinc-100">Fireseed Index：</span>
          <span className="text-emerald-300">{fireseedIndex.score ?? 'N/A'}</span>
        </p>
        <p>
          <span className="font-medium text-zinc-100">encryption：</span>
          <span className="text-emerald-300">{result.encryptionMode}</span>
        </p>
        <p className="text-xs text-zinc-400">
          {result.hasHumanReadable
            ? '包含 HUMAN_READABLE.md / HUMAN_READABLE.md included'
            : '未包含 HUMAN_READABLE.md / HUMAN_READABLE.md missing'}
        </p>
      </div>
    );
  };

  const renderDecryptionSection = () => {
    if (!result || result.encryptionMode !== 'aes-256-gcm') return null;

    const capsule = result.capsule;

    return (
      <div className="mt-6 space-y-3 rounded-xl border border-emerald-700/50 bg-emerald-950/20 p-4">
        <h3 className="text-base font-semibold text-emerald-200">加密胶囊 · Encrypted capsule</h3>
        <div className="space-y-2">
          <label className="block text-sm text-zinc-200" htmlFor="password">
            密码（可选）/ Password (optional)
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400"
              placeholder="输入密码以尝试解密 / Enter password to decrypt"
            />
            <button
              type="button"
              onClick={handleDecrypt}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isParsing}
            >
              尝试解密 / Decrypt
            </button>
          </div>
        </div>

        {!capsule && (
          <p className="text-sm text-amber-300">
            已识别为加密胶囊，但尚未解密。输入密码后可尝试解锁内容。
          </p>
        )}

        {capsule && (
          <div className="space-y-1 text-sm text-emerald-100">
            <p className="font-semibold text-emerald-300">解密成功 / Decryption OK</p>
            {capsule.content?.title && <p>title: {capsule.content.title}</p>}
            {capsule.content?.primaryLanguage && <p>primaryLanguage: {capsule.content.primaryLanguage}</p>}
            {capsule.meta?.scenario && <p>scenario: {capsule.meta.scenario}</p>}
            {result?.encryptionMode === 'aes-256-gcm' && decryptedCapsule && decryptedMeta && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleExportDecrypted}
                  disabled={isExporting}
                  className="inline-flex items-center rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-emerald-50 transition hover:border-emerald-200/70 hover:text-emerald-50 disabled:cursor-not-allowed disabled:opacity-70"
                  style={{
                    background: 'transparent',
                  }}
                >
                  {isExporting
                    ? '正在导出明文版本… / Exporting decrypted ZIP…'
                    : '导出明文版本 / Export decrypted ZIP'}
                </button>
                <p className="mt-2 text-xs text-emerald-200/70">
                  导出明文版本会在本地生成一份未加密的 ZIP，请只在你信任的环境中保存和打开。
                  Exporting a decrypted ZIP will create an unencrypted copy locally. Only save it in environments you fully trust.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-white">本地 Fireseed 胶囊验证 / Local Fireseed Capsule Verification</h1>
      <p className="mt-2 text-sm text-zinc-400">
        所有验证步骤均在浏览器本地完成，ZIP 内容不会上传到服务器。 All verification steps run locally in your browser. The ZIP contents are not uploaded to any server.
      </p>

      <div className="mt-6 space-y-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 shadow-lg">
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-950/40 p-8 text-center transition hover:border-emerald-400"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
        >
          <p className="text-lg font-semibold text-zinc-100">拖拽 ZIP 至此 / Drag & drop ZIP here</p>
          <p className="text-sm text-zinc-400">或点击选择文件 / or click to pick a file</p>
          <label
            htmlFor="zip-upload"
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
          >
            选择 ZIP / Choose ZIP
          </label>
          <input
            id="zip-upload"
            type="file"
            accept=".zip"
            className="hidden"
            onChange={onInputChange}
          />
          {selectedFile && (
            <p className="text-xs text-emerald-300">已选择：{selectedFile.name}</p>
          )}
          {isParsing && <p className="text-xs text-amber-300">解析中… / Parsing…</p>}
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        {result && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-5">
            <h2 className="text-lg font-semibold text-zinc-100">解析结果 / Parsed result</h2>
            {renderBasicInfo()}
            {renderDecryptionSection()}
          </div>
        )}
      </div>
    </main>
  );
}
