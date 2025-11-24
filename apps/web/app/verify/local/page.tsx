'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import JSZip from 'jszip';

import { localZipAdapter } from '../../../lib/storage/localZipAdapter';
import { type ParsedCapsuleZip } from '../../../lib/capsuleZip';
import {
  findCapsuleById,
  upsertCapsule,
} from '../../../lib/manifestStore';
import { type FireseedManifestCapsuleEntry } from '../../../../packages/core/manifest/types';
import { FIRESEED_KDF, FIRESEED_KDF_ITERATIONS } from '@/lib/encryption';

type CryptoStatus = 'none' | 'official' | 'weaker' | 'unknown';

export default function VerifyLocalPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<ParsedCapsuleZip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [decryptedCapsule, setDecryptedCapsule] = useState<any | null>(null);
  const [decryptedMeta, setDecryptedMeta] = useState<any | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isCheckingManifest, setIsCheckingManifest] = useState(false);
  const [isInManifest, setIsInManifest] = useState<boolean | null>(null);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [isSavingToManifest, setIsSavingToManifest] = useState(false);
  const [cryptoStatus, setCryptoStatus] = useState<CryptoStatus>('none');
  const [cryptoWarning, setCryptoWarning] = useState<string | null>(null);

  const extractFireseedIndex = useCallback((raw: unknown): number | undefined => {
    if (typeof raw === 'number') return raw;
    if (raw && typeof raw === 'object') {
      const maybeObject = raw as { score?: unknown; value?: unknown };
      if (typeof maybeObject.score === 'number') return maybeObject.score;
      if (typeof maybeObject.value === 'number') return maybeObject.value;
    }
    return undefined;
  }, []);

  const formatDate = useCallback((value: unknown) => {
    if (!value) return '未知 / Unknown';
    const date = new Date(value as string);
    if (Number.isNaN(date.getTime())) return '未知 / Unknown';
    return date.toLocaleString();
  }, []);

  const evaluateCryptoStatus = useCallback((meta: Record<string, unknown> | undefined) => {
    if (!meta) {
      setCryptoStatus('unknown');
      setCryptoWarning('无法读取加密信息 / Unable to read encryption info.');
      return;
    }

    const encryptionMode = (meta.encryption as string | undefined) ?? 'none';
    const params = meta.encryptionParams as
      | { salt?: string; iv?: string; iterations?: number; kdf?: string }
      | undefined;

    if (!encryptionMode || encryptionMode === 'none') {
      setCryptoStatus('none');
      setCryptoWarning(null);
      return;
    }

    if (encryptionMode !== 'aes-256-gcm') {
      setCryptoStatus('unknown');
      setCryptoWarning('检测到非官方加密算法或参数，请谨慎对待。/ Detected non-official crypto parameters. Handle this capsule with extra care.');
      return;
    }

    if (!params?.kdf || !params.iterations || !params.salt || !params.iv) {
      setCryptoStatus('unknown');
      setCryptoWarning('加密参数缺失，无法确认安全性。/ Encryption parameters are incomplete; security cannot be confirmed.');
      return;
    }

    if (params.kdf === FIRESEED_KDF && params.iterations >= FIRESEED_KDF_ITERATIONS) {
      setCryptoStatus('official');
      setCryptoWarning(null);
      return;
    }

    if (params.kdf === FIRESEED_KDF && params.iterations < FIRESEED_KDF_ITERATIONS) {
      setCryptoStatus('weaker');
      setCryptoWarning(
        '加密参数弱于当前 Fireseed 官方推荐配置，可能来自早期版本或非官方工具。/ Encryption parameters are weaker than the current Fireseed recommended defaults. This capsule may come from an older or non-official tool.',
      );
      return;
    }

    setCryptoStatus('unknown');
    setCryptoWarning('检测到非官方加密算法或参数，请谨慎对待。/ Detected non-official crypto parameters. Handle this capsule with extra care.');
  }, []);

  const loadCapsuleFromFile = useCallback(
    async (file: File, password?: string): Promise<ParsedCapsuleZip> => {
      if (!localZipAdapter.loadCapsule) {
        throw new Error('Local ZIP adapter does not support loading capsules');
      }

      const loaded = await localZipAdapter.loadCapsule('local', { file, password });
      if (!loaded) {
        throw new Error('解析失败 / Failed to parse ZIP');
      }
      return loaded as ParsedCapsuleZip;
    },
    []
  );

  const handleFileSelected = useCallback(async (file: File) => {
    setSelectedFile(file);
    setIsParsing(true);
    setError(null);
    setDecryptedCapsule(null);
    setDecryptedMeta(null);
    setCryptoStatus('none');
    setCryptoWarning(null);

    try {
      const parsed = await loadCapsuleFromFile(file);
      setResult(parsed);
      evaluateCryptoStatus(parsed.meta as Record<string, unknown> | undefined);
    } catch (e) {
      console.error(e);
      let message = e instanceof Error ? e.message : '';
      if (message === 'meta.json not found') {
        message = '未找到 meta.json / meta.json not found';
      }
      if (!message) {
        message = '解析失败 / Failed to parse ZIP';
      } else if (!message.includes('/')) {
        message = `${message} / ${message}`;
      }
      setError(message);
      setResult(null);
      setDecryptedCapsule(null);
      setDecryptedMeta(null);
      setCryptoStatus('none');
      setCryptoWarning(null);
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
      const parsed = await loadCapsuleFromFile(selectedFile, password.trim());
      setResult(parsed);
      setDecryptedCapsule(parsed.capsule ?? null);
      setDecryptedMeta(parsed.meta ?? null);
      evaluateCryptoStatus(parsed.meta as Record<string, unknown> | undefined);
    } catch (e) {
      setError('解密失败：密码不正确或胶囊数据已损坏。 / Decryption failed: wrong password or corrupted capsule data.');
      setDecryptedCapsule(null);
      setDecryptedMeta(null);
    } finally {
      setIsParsing(false);
    }
  }, [evaluateCryptoStatus, password, result, selectedFile]);

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

  const resolvedCapsuleId = useMemo(() => {
    const meta = (result?.meta ?? decryptedMeta) as Record<string, unknown> | undefined;
    if (!meta) return undefined;

    return (
      (meta.capsuleId as string | undefined) ??
      (meta.capsuleID as string | undefined) ??
      (meta.id as string | undefined) ??
      result?.capsuleId
    );
  }, [decryptedMeta, result]);

  useEffect(() => {
    setManifestError(null);
    const meta = (decryptedMeta ?? result?.meta) as Record<string, unknown> | undefined;
    if (!resolvedCapsuleId || !meta) {
      setIsInManifest(null);
      return;
    }

    let cancelled = false;
    setIsCheckingManifest(true);

    findCapsuleById(resolvedCapsuleId)
      .then((existing) => {
        if (cancelled) return;
        setIsInManifest(Boolean(existing));
      })
      .catch(() => {
        if (cancelled) return;
        setManifestError('读取实验室清单失败 / Failed to read manifest');
        setIsInManifest(null);
      })
      .finally(() => {
        if (cancelled) return;
        setIsCheckingManifest(false);
      });

    return () => {
      cancelled = true;
    };
  }, [decryptedMeta, resolvedCapsuleId, result]);

  const handleAddToManifest = useCallback(async () => {
    const meta = (result?.meta ?? decryptedMeta ?? {}) as Record<string, unknown>;
    const capsule = (result?.capsule ?? decryptedCapsule ?? {}) as Record<string, unknown>;

    const capsuleId =
      resolvedCapsuleId ??
      (meta.capsuleId as string | undefined) ??
      (meta.capsuleID as string | undefined) ??
      (meta.id as string | undefined);

    if (!capsuleId) {
      setManifestError('缺少 capsuleId，无法加入清单 / Missing capsuleId, cannot add to manifest');
      return;
    }

    const capsuleContent = (capsule?.content ?? {}) as Record<string, unknown>;
    const capsuleMeta = (capsule?.meta ?? {}) as Record<string, unknown>;

    const metaMetrics = (meta as Record<string, unknown>).metrics as
      | Record<string, unknown>
      | undefined;
    const rawFireseedIndex =
      (meta as Record<string, unknown>).fireseedIndex ??
      metaMetrics?.fireseedIndex ??
      metaMetrics?.fireseed_index;
    const fireseedIndex = extractFireseedIndex(rawFireseedIndex);

    const entry: FireseedManifestCapsuleEntry = {
      capsuleId,
      title:
        (meta.title as string | undefined) ??
        (meta.humanReadableTitle as string | undefined) ??
        (capsuleContent.title as string | undefined) ??
        '未命名胶囊 / Untitled capsule',
      createdAt:
        (meta.createdAt as string | undefined) ??
        (capsuleMeta.createdAt as string | undefined) ??
        new Date().toISOString(),
      scenario: (meta.scenario as string | undefined) ?? (capsuleMeta.scenario as string | undefined),
      primaryLanguage:
        (meta.primaryLanguage as string | undefined) ??
        (capsule.primaryLanguage as string | undefined) ??
        (capsuleContent.primaryLanguage as string | undefined),
      encryption: result?.encryptionMode ?? 'none',
      fireseedIndex,
      status: (meta as Record<string, unknown>).status as string | undefined,
      backedUp: (meta as Record<string, unknown>).backedUp as boolean | undefined,
      replicas: [
        {
          adapterId: 'local-zip',
          location: 'unknown://user-upload',
          lastUpdatedAt: new Date().toISOString(),
          notes: 'Added from /verify/local',
        },
      ],
    };

    setManifestError(null);
    setIsSavingToManifest(true);
    try {
      await upsertCapsule(entry);
      setIsInManifest(true);
    } catch (err) {
      console.error(err);
      setManifestError('加入实验室清单失败 / Failed to add to manifest');
    } finally {
      setIsSavingToManifest(false);
    }
  }, [decryptedCapsule, decryptedMeta, extractFireseedIndex, resolvedCapsuleId, result]);

  const renderBasicInfo = () => {
    if (!result) return null;

    const meta = (decryptedMeta ?? result.meta ?? {}) as Record<string, unknown>;
    const capsule = (decryptedCapsule ?? result.capsule ?? {}) as Record<string, unknown>;
    const metrics = meta.metrics as Record<string, unknown> | undefined;
    const fireseedIndex = extractFireseedIndex(
      meta.fireseedIndex ?? metrics?.fireseedIndex ?? metrics?.fireseed_index
    );
    const encryptionStatusLabel = (() => {
      switch (cryptoStatus) {
        case 'none':
          return '加密模式：未加密（capsule.json 为明文，仅适合本地离线保存） / Encryption: none (capsule.json is plaintext; suitable for local offline storage only)';
        case 'official':
          return '加密模式：AES-256-GCM（Fireseed 官方参数） / Encryption: AES-256-GCM (Fireseed official parameters)';
        case 'weaker':
          return '加密模式：AES-256-GCM（参数弱于当前官方推荐） / Encryption: AES-256-GCM (weaker than current official defaults)';
        case 'unknown':
        default:
          return '加密模式：未知或非官方加密参数 / Encryption: unknown or non-official parameters';
      }
    })();

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
          <span className="text-emerald-300">{fireseedIndex ?? 'N/A'}</span>
        </p>
        <p>
          <span className="font-medium text-zinc-100">encryption：</span>
          <span className="text-emerald-300">{result.encryptionMode}</span>
        </p>
        <p className="text-xs text-amber-200">{encryptionStatusLabel}</p>
        {cryptoWarning && <p className="text-xs text-amber-300">{cryptoWarning}</p>}
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
        <h3 className="text-base font-semibold text-emerald-200">加密胶囊 / Encrypted capsule</h3>
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
            已识别为加密胶囊，但尚未解密。输入密码后可尝试解锁内容。 / Detected an encrypted capsule but it has not been
            decrypted. Enter the password to unlock the content.
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
                  className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isExporting
                    ? '正在导出明文版本… / Exporting decrypted ZIP…'
                    : '导出明文版本 / Export decrypted ZIP'}
                </button>
                <p className="mt-2 text-xs text-emerald-200/70">
                  导出明文版本会在本地生成一份未加密的 ZIP，请只在你信任的环境中保存和打开。 / Exporting a decrypted ZIP will
                  create an unencrypted copy locally. Only save it in environments you fully trust.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderHealthReport = () => {
    const meta = (decryptedMeta ?? result?.meta) as Record<string, unknown> | undefined;
    if (!result || !meta) return null;

    const metrics = meta.metrics as Record<string, unknown> | undefined;
    const schemaVersion =
      (meta.schemaVersion as string | undefined) ??
      (meta.schema as string | undefined) ??
      (meta.version as string | undefined) ??
      '未知 / Unknown';
    const encryption =
      (meta.encryption as string | undefined) ?? result.encryptionMode ?? '未知 / Unknown';
    const fireseedIndex =
      extractFireseedIndex(
        (meta.fireseedIndex as unknown) ?? metrics?.fireseedIndex ?? metrics?.fireseed_index
      ) ?? '未知 / Unknown';
    const createdAt = (meta.createdAt as string | undefined) ?? (meta.generatedAt as string | undefined);
    const toolVersion = (meta.toolVersion as string | undefined) ?? (meta.generatorVersion as string | undefined);

    return (
      <div className="mt-6 rounded-xl border border-emerald-800/60 bg-emerald-950/30 p-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold text-emerald-200">火种体检报告 / Capsule Health Report</h3>
          <p className="text-xs text-emerald-200/80">快速查看 meta 关键字段 / Quick glance of meta fields</p>
        </div>

        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-emerald-900/30 p-3">
            <dt className="text-xs uppercase tracking-wide text-emerald-300/80">Schema 版本 / Schema Version</dt>
            <dd className="text-sm font-semibold text-emerald-100">{schemaVersion}</dd>
          </div>
          <div className="rounded-lg bg-emerald-900/30 p-3">
            <dt className="text-xs uppercase tracking-wide text-emerald-300/80">加密模式 / Encryption</dt>
            <dd className="text-sm font-semibold text-emerald-100">{encryption}</dd>
          </div>
          <div className="rounded-lg bg-emerald-900/30 p-3">
            <dt className="text-xs uppercase tracking-wide text-emerald-300/80">Fireseed Index</dt>
            <dd className="text-sm font-semibold text-emerald-100">{fireseedIndex}</dd>
          </div>
          <div className="rounded-lg bg-emerald-900/30 p-3">
            <dt className="text-xs uppercase tracking-wide text-emerald-300/80">生成时间 / Created at</dt>
            <dd className="text-sm font-semibold text-emerald-100">{formatDate(createdAt)}</dd>
          </div>
          <div className="rounded-lg bg-emerald-900/30 p-3 sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-emerald-300/80">工具版本 / Tool Version</dt>
            <dd className="text-sm font-semibold text-emerald-100">{toolVersion ?? '未知 / Unknown'}</dd>
          </div>
        </dl>

        <div className="mt-3 space-y-1 rounded-lg bg-emerald-900/20 p-3 text-xs text-emerald-100/90">
          <p>所有解析与验证步骤均在浏览器本地完成，ZIP 内容不会上传到服务器。</p>
          <p>All parsing and verification steps run locally in your browser. The ZIP contents are not uploaded to any server.</p>
        </div>
      </div>
    );
  };

  const renderManifestActions = () => {
    if (!result) return null;

    if (!resolvedCapsuleId) {
      return (
        <div className="mt-6 rounded-xl border border-amber-700/60 bg-amber-950/20 p-4 text-sm text-amber-100">
          无法识别 capsuleId，暂时无法加入实验室清单。 / CapsuleId missing, cannot add to manifest for now.
        </div>
      );
    }

    return (
      <div className="mt-6 space-y-3 rounded-xl border border-emerald-800/60 bg-emerald-950/20 p-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold text-emerald-200">实验室清单 / Lab manifest</h3>
          <p className="text-xs text-emerald-200/80">capsuleId: {resolvedCapsuleId}</p>
        </div>

        {manifestError && <p className="text-xs text-red-400">{manifestError}</p>}

        {isInManifest ? (
          <p className="text-sm text-emerald-100">已在实验室清单中 / Already present in Lab manifest</p>
        ) : (
          <button
            type="button"
            onClick={handleAddToManifest}
            disabled={isSavingToManifest || isCheckingManifest}
            className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSavingToManifest
              ? '加入中… / Adding to manifest…'
              : '加入实验室清单 / Add to Lab manifest'}
          </button>
        )}

        {isCheckingManifest && (
          <p className="text-xs text-emerald-200/70">检查清单中… / Checking manifest…</p>
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
            <p className="text-xs text-emerald-300">已选择 / Selected: {selectedFile.name}</p>
          )}
          {isParsing && <p className="text-xs text-amber-300">解析中… / Parsing…</p>}
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        {result && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-5">
            <h2 className="text-lg font-semibold text-zinc-100">解析结果 / Parsed result</h2>
            {renderBasicInfo()}
            {renderHealthReport()}
            {renderDecryptionSection()}
            {renderManifestActions()}
          </div>
        )}
      </div>
    </main>
  );
}
