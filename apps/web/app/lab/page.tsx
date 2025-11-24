'use client';

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  ChangeEvent,
} from 'react';
import {
  getManifest,
  exportManifest,
  importManifest,
  getIpfsGatewayConfig,
  saveIpfsGatewayConfig,
} from '../../lib/manifestStore';

type FireseedManifestCapsuleEntry = {
  capsuleId: string;
  title?: string;
  createdAt: string;
  scenario?: string;
  primaryLanguage?: string;
  encryption?: string;
  fireseedIndex?: number;
  replicas?: { adapterId: string; location: string; lastUpdatedAt?: string }[];
};

type FireseedManifest = {
  schema: string;
  toolVersion: string;
  capsules: FireseedManifestCapsuleEntry[];
};

type IpfsGatewayConfig = {
  baseUrl?: string;
  authToken?: string | null;
};

const emptyIpfsConfig: IpfsGatewayConfig = {
  baseUrl: '',
  authToken: '',
};

export default function FireseedLabPage() {
  const [manifest, setManifest] = useState<FireseedManifest | null>(null);
  const [loadingManifest, setLoadingManifest] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [ipfsConfig, setIpfsConfig] =
    useState<IpfsGatewayConfig>(emptyIpfsConfig);
  const [ipfsMessage, setIpfsMessage] = useState<string | null>(null);

  const [search, setSearch] = useState<string>('');
  const [ipfsUploadingId, setIpfsUploadingId] = useState<string | null>(null);
  const [ipfsUploading, setIpfsUploading] = useState<boolean>(false);

  const importInputRef = useRef<HTMLInputElement | null>(null);
  const ipfsFileInputRef = useRef<HTMLInputElement | null>(null);

  // 加载 manifest + IPFS 配置
  useEffect(() => {
    const run = async () => {
      try {
        setLoadingManifest(true);
        const m = (await getManifest()) as FireseedManifest;
        setManifest(m);
      } catch (e) {
        console.error(e);
        setError('无法加载本地 Fireseed manifest。');
      } finally {
        setLoadingManifest(false);
      }

      try {
        const cfg = (await getIpfsGatewayConfig()) as IpfsGatewayConfig | null;
        if (cfg) {
          setIpfsConfig({
            baseUrl: cfg.baseUrl ?? '',
            authToken: cfg.authToken ?? '',
          });
        }
      } catch (e) {
        console.warn('Failed to load IPFS gateway config', e);
      }
    };
    run();
  }, []);

  const capsules: FireseedManifestCapsuleEntry[] = useMemo(
    () => manifest?.capsules ?? [],
    [manifest],
  );

  const filteredCapsules = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return capsules;
    return capsules.filter((c) => {
      const title = c.title ?? '';
      const id = c.capsuleId ?? '';
      const scenario = c.scenario ?? '';
      return (
        title.toLowerCase().includes(q) ||
        id.toLowerCase().includes(q) ||
        scenario.toLowerCase().includes(q)
      );
    });
  }, [capsules, search]);

  const refreshManifest = async () => {
    try {
      setLoadingManifest(true);
      const m = (await getManifest()) as FireseedManifest;
      setManifest(m);
    } catch (e) {
      console.error(e);
      setError('刷新 manifest 失败。');
    } finally {
      setLoadingManifest(false);
    }
  };

  // 导出 manifest.json
  const handleExportManifest = async () => {
    try {
      const json = await exportManifest();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'fireseed-manifest.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      setError('导出 manifest 失败。');
    }
  };

  // 导入 manifest.json
  const handleImportManifestFile = async (
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const result = await importManifest(text);
      console.log('importManifest result', result);
      setIpfsMessage(
        `导入完成：新增 ${result?.added ?? 0} 条，更新 ${
          result?.updated ?? 0
        } 条。`,
      );
      await refreshManifest();
    } catch (err) {
      console.error(err);
      setError('导入 manifest 失败：JSON 格式或 schema 不正确。');
    } finally {
      e.target.value = '';
    }
  };

  // 保存 IPFS 网关配置
  const handleSaveIpfsConfig = async () => {
    try {
      setIpfsMessage(null);
      await saveIpfsGatewayConfig(ipfsConfig);
      setIpfsMessage('IPFS 网关配置已保存到本地（浏览器存储）。');
    } catch (e) {
      console.error(e);
      setError('保存 IPFS 网关配置失败。');
    }
  };

  // 选择 ZIP 文件用于上传到 IPFS
  const handleClickUploadIpfs = (capsuleId: string) => {
    setIpfsUploadingId(capsuleId);
    setIpfsMessage(null);
    setError(null);
    if (ipfsFileInputRef.current) {
      ipfsFileInputRef.current.value = '';
      ipfsFileInputRef.current.click();
    }
  };

  // 真正执行 IPFS 上传
  const handleIpfsFileSelected = async (
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !ipfsUploadingId) return;

    if (!ipfsConfig.baseUrl) {
      setError('请先在上方配置 IPFS HTTP API 地址。');
      return;
    }

    const base = (ipfsConfig.baseUrl ?? '').replace(/\/+$/, '');
    const uploadUrl = `${base}/add?pin=true`;

    setIpfsUploading(true);
    setError(null);
    setIpfsMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file, file.name);

      const headers: Record<string, string> = {};
      if (ipfsConfig.authToken) {
        headers['Authorization'] = `Bearer ${ipfsConfig.authToken}`;
      }

      const res = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        headers,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const text = await res.text();
      let cid = text.trim();
      try {
        const parsed = JSON.parse(text);
        cid =
          (parsed && (parsed.Hash || parsed.cid || parsed.Cid))?.toString() ??
          cid;
      } catch {
        // 非 JSON 输出，直接使用原始文本
      }

      setIpfsMessage(
        `IPFS 上传成功。Capsule ${ipfsUploadingId} → CID: ${cid}`,
      );
      console.log('IPFS upload result', { capsuleId: ipfsUploadingId, cid });
      // 这里暂时不修改 manifest，仅作为“自托管 IPFS”助手。
    } catch (err: any) {
      console.error(err);
      setError(
        `IPFS 上传失败：${err?.message ?? '网络错误或网关未响应'}。`,
      );
    } finally {
      setIpfsUploading(false);
      setIpfsUploadingId(null);
      e.target.value = '';
    }
  };

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 text-sm text-slate-100">
      <header className="border-b border-slate-700 pb-4">
        <h1 className="text-2xl font-semibold">火种实验室 / Fireseed Lab</h1>
        <p className="mt-2 text-xs text-slate-300">
          Inspect local Fireseed manifests, export snapshots, or push capsules
          to your own storage backends.
        </p>
      </header>

      {/* 顶部工具区：Manifest 导入导出 */}
      <section className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportManifest}
            className="rounded border border-slate-500 px-3 py-1 text-xs hover:bg-slate-700"
          >
            导出 Manifest / Export Manifest
          </button>

          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className="rounded border border-slate-500 px-3 py-1 text-xs hover:bg-slate-700"
          >
            导入 Manifest / Import Manifest
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImportManifestFile}
          />

          <span className="ml-auto text-[11px] text-amber-300">
            ⚠ 实验性视图：请确认本地 manifest 中不含你不想公开的信息，再导出或分享。
          </span>
        </div>
      </section>

      {/* IPFS 配置区 */}
      <section className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
        <h2 className="text-base font-semibold">IPFS 网关配置 / IPFS Gateway</h2>
        <p className="mt-1 text-[11px] text-slate-300">
          使用你自己的 IPFS HTTP API 网关（如 Kubo /api/v0）。系统会在后方自动拼接
          <code className="mx-1 rounded bg-slate-800 px-1 py-0.5 text-[10px]">
            /add?pin=true
          </code>
          用于上传 ZIP 文件。
        </p>

        <div className="mt-3 flex flex-col gap-3 text-xs">
          <label className="flex flex-col gap-1">
            <span>Gateway Base URL（必须包含 /api/v0）</span>
            <input
              type="text"
              value={ipfsConfig.baseUrl ?? ''}
              onChange={(e) =>
                setIpfsConfig((cfg) => ({
                  ...cfg,
                  baseUrl: e.target.value,
                }))
              }
              placeholder="例如：http://127.0.0.1:5001/api/v0"
              className="rounded border border-slate-600 bg-slate-950 px-2 py-1 text-xs outline-none focus:border-sky-500"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span>Auth Token（可选）</span>
            <input
              type="text"
              value={ipfsConfig.authToken ?? ''}
              onChange={(e) =>
                setIpfsConfig((cfg) => ({
                  ...cfg,
                  authToken: e.target.value,
                }))
              }
              placeholder="如果网关需要授权，可以填 Bearer token"
              className="rounded border border-slate-600 bg-slate-950 px-2 py-1 text-xs outline-none focus:border-sky-500"
            />
          </label>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveIpfsConfig}
              className="rounded border border-slate-500 px-3 py-1 text-xs hover:bg-slate-700"
            >
              保存并记住 IPFS 网关配置
            </button>
            {ipfsMessage && (
              <span className="text-[11px] text-emerald-300">
                {ipfsMessage}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* 错误提示 */}
      {error && (
        <div className="rounded border border-rose-600 bg-rose-900/40 p-3 text-[11px] text-rose-100">
          {error}
        </div>
      )}

      {/* 查询 + 列表 */}
      <section className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold">本地火种清单 / Local Capsules</h2>
          <span className="text-[11px] text-slate-400">
            {loadingManifest
              ? '正在加载 manifest...'
              : `共 ${capsules.length} 个胶囊，当前筛选出 ${filteredCapsules.length} 个。`}
          </span>
          <div className="ml-auto flex items-center gap-2 text-xs">
            <span>搜索：</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="按标题 / ID / 场景关键字过滤"
              className="w-56 rounded border border-slate-600 bg-slate-950 px-2 py-1 text-xs outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900/80 text-[11px] uppercase tracking-wide">
                <th className="px-2 py-2 text-left">Title</th>
                <th className="px-2 py-2 text-left">Capsule ID</th>
                <th className="px-2 py-2 text-left">Created At</th>
                <th className="px-2 py-2 text-left">Language</th>
                <th className="px-2 py-2 text-left">Encryption</th>
                <th className="px-2 py-2 text-left">Index</th>
                <th className="px-2 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCapsules.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-2 py-6 text-center text-[11px] text-slate-400"
                  >
                    暂无记录，或当前筛选条件下没有匹配的胶囊。
                  </td>
                </tr>
              )}

              {filteredCapsules.map((c) => (
                <tr
                  key={c.capsuleId}
                  className="border-b border-slate-800/80 hover:bg-slate-800/40"
                >
                  <td className="px-2 py-2 align-top">
                    <div className="max-w-xs truncate font-medium">
                      {c.title || '(未命名胶囊)'}
                    </div>
                    {c.scenario && (
                      <div className="mt-0.5 max-w-xs truncate text-[10px] text-slate-400">
                        {c.scenario}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2 align-top font-mono text-[11px]">
                    {c.capsuleId}
                  </td>
                  <td className="px-2 py-2 align-top text-[11px]">
                    {c.createdAt}
                  </td>
                  <td className="px-2 py-2 align-top text-[11px]">
                    {c.primaryLanguage || '-'}
                  </td>
                  <td className="px-2 py-2 align-top text-[11px]">
                    {c.encryption === 'aes-256-gcm'
                      ? 'AES-256-GCM'
                      : c.encryption || 'none'}
                  </td>
                  <td className="px-2 py-2 align-top text-[11px]">
                    {c.fireseedIndex ?? '-'}
                  </td>
                  <td className="px-2 py-2 align-top text-[11px]">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          // 简单跳转到验证页，由用户手动上传 ZIP
                          window.location.href = '/verify/local';
                        }}
                        className="rounded border border-slate-500 px-2 py-0.5 text-[11px] hover:bg-slate-700"
                      >
                        查看/验证
                      </button>

                      <button
                        type="button"
                        onClick={() => handleClickUploadIpfs(c.capsuleId)}
                        disabled={ipfsUploading}
                        className="rounded border border-sky-500 px-2 py-0.5 text-[11px] hover:bg-sky-700 disabled:cursor-not-allowed disabled:border-slate-600 disabled:text-slate-500"
                      >
                        {ipfsUploading && ipfsUploadingId === c.capsuleId
                          ? '上传中…'
                          : '上传到 IPFS'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 隐藏的文件输入：IPFS 上传 ZIP 用 */}
      <input
        ref={ipfsFileInputRef}
        type="file"
        accept=".zip,application/zip"
        className="hidden"
        onChange={handleIpfsFileSelected}
      />
    </main>
  );
}
