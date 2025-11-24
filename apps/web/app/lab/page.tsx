'use client';

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  ChangeEvent,
  useCallback,
} from 'react';
import type {
  FireseedManifest,
  FireseedManifestCapsuleEntry,
  FireseedManifestReplica,
} from '@/packages/core/manifest/types';
import {
  getManifest,
  exportManifest,
  importManifest,
  getIpfsGatewayConfig,
  saveIpfsGatewayConfig,
  computeCapsuleHealth,
  updateReplicaCheckResult,
} from '../../lib/manifestStore';
import { exportMDiscStructure, exportQrClueCard } from '../../lib/labExports';

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
  const [selectedCapsuleIds, setSelectedCapsuleIds] = useState<string[]>([]);
  const [runningCheckCapsuleId, setRunningCheckCapsuleId] = useState<string | null>(
    null,
  );
  const [fullCheckProgress, setFullCheckProgress] = useState<
    { current: number; total: number } | null
  >(null);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);

  const importInputRef = useRef<HTMLInputElement | null>(null);
  const ipfsFileInputRef = useRef<HTMLInputElement | null>(null);
  const selectAllCheckboxRef = useRef<HTMLInputElement | null>(null);

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

  useEffect(() => {
    setSelectedCapsuleIds([]);
  }, [manifest?.capsules]);

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

  const selectedCapsules = useMemo(() => {
    if (selectedCapsuleIds.length === 0) return capsules;
    const selectedSet = new Set(selectedCapsuleIds);
    return capsules.filter((c) => selectedSet.has(c.capsuleId));
  }, [capsules, selectedCapsuleIds]);

  useEffect(() => {
    if (!selectAllCheckboxRef.current) return;
    const allVisibleSelected =
      filteredCapsules.length > 0 &&
      filteredCapsules.every((c) =>
        selectedCapsuleIds.includes(c.capsuleId),
      );
    const anyVisibleSelected = filteredCapsules.some((c) =>
      selectedCapsuleIds.includes(c.capsuleId),
    );
    selectAllCheckboxRef.current.indeterminate =
      anyVisibleSelected && !allVisibleSelected;
    selectAllCheckboxRef.current.checked = allVisibleSelected;
  }, [filteredCapsules, selectedCapsuleIds]);

  const refreshManifest = useCallback(async () => {
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
  }, []);

  const runHealthCheckForCapsule = useCallback(
    async (entry: FireseedManifestCapsuleEntry) => {
      setRunningCheckCapsuleId(entry.capsuleId);
      setCheckMessage(null);

      try {
        const replicas: FireseedManifestReplica[] = entry.replicas ?? [];
        if (replicas.length === 0) {
          setCheckMessage('该胶囊目前没有任何副本记录。/ This capsule has no replicas recorded.');
          return;
        }

        const targetReplica =
          replicas.find((r) => r.adapterId === 'ipfs-http') ||
          replicas.find((r) => r.adapterId !== 'local-zip') ||
          replicas[0];

        if (!targetReplica) {
          setCheckMessage('未找到可检查的副本。/ No replica available for health check.');
          return;
        }

        let status: 'ok' | 'failed' | 'unknown' = 'unknown';
        let message: string | undefined;

        if (targetReplica.adapterId === 'ipfs-http' && targetReplica.location.startsWith('ipfs://')) {
          const cid = targetReplica.location.replace('ipfs://', '');
          const gatewayUrl = `https://ipfs.io/ipfs/${cid}`;

          try {
            const res = await fetch(gatewayUrl, { method: 'HEAD' });
            if (res.ok) {
              status = 'ok';
              message = 'IPFS 网关可访问。/ IPFS gateway responded with OK.';
            } else {
              status = 'failed';
              message = `IPFS 网关返回状态码 ${res.status}。/ IPFS gateway responded with status ${res.status}.`;
            }
          } catch (e) {
            console.error(e);
            status = 'failed';
            message = '无法访问 IPFS 网关（网络错误或 CORS 限制）。/ Failed to reach IPFS gateway (network error or CORS).';
          }
        } else {
          status = 'unknown';
          message = '当前适配器暂未实现自动检查，请手动确认。/ Health check is not yet implemented for this adapter; please verify manually.';
        }

        await updateReplicaCheckResult({
          capsuleId: entry.capsuleId,
          adapterId: targetReplica.adapterId,
          location: targetReplica.location,
          status,
          message,
        });

        await refreshManifest();
        setCheckMessage(message ?? null);
      } catch (err) {
        console.error(err);
        setCheckMessage('检查过程中出现错误，请查看控制台。/ Error occurred during health check, see console.');
      } finally {
        setRunningCheckCapsuleId(null);
      }
    },
    [refreshManifest],
  );

  const runFullHealthCheck = useCallback(
    async (capsulesToCheck: FireseedManifestCapsuleEntry[]) => {
      if (!capsulesToCheck.length) return;
      setFullCheckProgress({ current: 0, total: capsulesToCheck.length });
      setCheckMessage(null);

      for (let i = 0; i < capsulesToCheck.length; i += 1) {
        const entry = capsulesToCheck[i];
        setFullCheckProgress({ current: i + 1, total: capsulesToCheck.length });
        if (entry.replicas && entry.replicas.length > 0) {
          // eslint-disable-next-line no-await-in-loop
          await runHealthCheckForCapsule(entry);
        }
      }

      setFullCheckProgress(null);
    },
    [runHealthCheckForCapsule],
  );

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

  const handleExportMDiscStructure = useCallback(async () => {
    if (!manifest || (manifest.capsules?.length ?? 0) === 0) {
      alert('当前没有可导出的火种清单 / No capsules to export.');
      return;
    }

    const targetIds = new Set(selectedCapsuleIds);
    const selected = manifest.capsules.filter((c) =>
      targetIds.has(c.capsuleId),
    );
    const capsulesToExport = selected.length > 0 ? selected : manifest.capsules;

    try {
      await exportMDiscStructure(manifest, capsulesToExport);
    } catch (e) {
      console.error(e);
      alert(
        '导出 M-Disc 结构失败，请查看控制台。/ Failed to export M-Disc structure, see console.',
      );
    }
  }, [manifest, selectedCapsuleIds]);

  const handleExportQrForEntry = useCallback(
    async (entry: FireseedManifestCapsuleEntry) => {
      if (!manifest) return;
      try {
        await exportQrClueCard(entry, manifest);
      } catch (e) {
        console.error(e);
        alert(
          '生成 QR 线索卡失败，请查看控制台。/ Failed to export QR clue card, see console.',
        );
      }
    },
    [manifest],
  );

  const handleToggleSelect = useCallback((capsuleId: string) => {
    setSelectedCapsuleIds((prev) => {
      const exists = prev.includes(capsuleId);
      if (exists) {
        return prev.filter((id) => id !== capsuleId);
      }
      return [...prev, capsuleId];
    });
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    setSelectedCapsuleIds((prev) => {
      const visibleIds = filteredCapsules.map((c) => c.capsuleId);
      const hasAllVisible = visibleIds.every((id) => prev.includes(id));
      if (hasAllVisible) {
        return prev.filter((id) => !visibleIds.includes(id));
      }
      const merged = new Set([...prev, ...visibleIds]);
      return Array.from(merged);
    });
  }, [filteredCapsules]);

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
        </div>
      </section>

      {/* IPFS 配置区 */}
      <section className="mt-6 rounded-md border border-purple-300 bg-purple-50 px-3 py-3 text-xs text-purple-900 space-y-2">
        <div className="font-semibold">
          🌐 高级功能：自建 IPFS 上传 / Advanced: self-hosted IPFS upload
        </div>
        <p>
          这里的配置假设你已经有自己的 IPFS 节点或第三方 Pinning 服务。本工具只会把你选择的火种胶囊 ZIP 通过 HTTP API 上传到你填写的地址，不提供任何托管或长期可用性保证。
          / This section assumes you already operate your own IPFS node or pinning service. The tool only sends your selected capsule ZIP to the HTTP API you configure; it does not provide hosting or availability guarantees.
        </p>
        <p>
          提醒：如果你使用公共网关或第三方服务，胶囊内容可能被长期公开保存。请确保你理解并接受对应的隐私与合规风险。
          / Reminder: If you use a public gateway or third-party service, the capsule content may be stored and publicly accessible. Make sure you understand and accept the associated privacy and compliance risks.
        </p>

        <div className="rounded-lg border border-slate-300 bg-white/80 p-4 text-slate-900 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">IPFS 网关配置 / IPFS Gateway</h2>
          <p className="mt-1 text-[11px] text-slate-600">
            使用你自己的 IPFS HTTP API 网关（如 Kubo /api/v0）。系统会在后方自动拼接
            <code className="mx-1 rounded bg-slate-800 px-1 py-0.5 text-[10px] text-white">/add?pin=true</code>
            用于上传 ZIP 文件。
          </p>

          <div className="mt-3 flex flex-col gap-3 text-xs text-slate-800">
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
                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-sky-500"
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
                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-sky-500"
              />
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveIpfsConfig}
                className="rounded border border-slate-500 px-3 py-1 text-xs hover:bg-slate-200"
              >
                保存并记住 IPFS 网关配置
              </button>
              {ipfsMessage && (
                <span className="text-[11px] text-emerald-700">{ipfsMessage}</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 错误提示 */}
      {error && (
        <div className="rounded border border-rose-600 bg-rose-900/40 p-3 text-[11px] text-rose-100">
          {error}
        </div>
      )}

      <section className="mt-6 rounded-md border border-slate-300 bg-slate-50 px-3 py-3 text-xs text-slate-900 space-y-2">
        <div className="font-semibold">💿 M-Disc / 只读介质导出 / M-Disc & read-only media export</div>
        <p>
          该导出会将选中的火种胶囊打包成一个适合刻录到光盘或只读移动介质的目录结构，并附带清单 manifest.json 与说明文件。
          / This export bundles selected capsules into a directory structure suitable for burning onto optical media or other read-only storage, along with a manifest.json and a README.
        </p>
        <p>
          建议：在刻录前先在本机解压并用 /verify/local 工具抽查，把 ZIP 与清单至少保存在两个互相独立的物理位置。
          / Recommendation: Before burning, unzip and spot-check with /verify/local, and keep the ZIP + manifest in at least two independent physical locations.
        </p>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-900">
          <button
            type="button"
            onClick={handleExportMDiscStructure}
            className="rounded border border-emerald-500 px-3 py-1 text-xs hover:bg-emerald-100"
          >
            导出 M-Disc 结构 / Export M-Disc structure
          </button>
          <span className="text-[11px] text-slate-600">
            （对选中胶囊导出；如果未选，则导出全部）/ (Exports selected capsules; if none selected, exports all)
          </span>
          <span className="ml-auto text-[11px] text-amber-700">
            ⚠ 实验性视图：请确认本地 manifest 中不含你不想公开的信息，再导出或分享。
          </span>
        </div>
      </section>

      <section className="mt-6 rounded-md border border-indigo-300 bg-indigo-50 px-3 py-3 text-xs text-indigo-900 space-y-2">
        <div className="font-semibold">🧾 纸质线索卡导出 / Paper clue card export</div>
        <p>
          这里生成的二维码并不会包含完整的胶囊内容，而是一个「文明线索卡」：记录 capsuleId、哈希、以及部分副本定位信息。
          / The QR codes generated here do not contain the full capsule content. They act as a “civilization clue card”: encoding the capsuleId, hashes, and some replica locator hints.
        </p>
        <p>
          只要任意一处线上或本地副本仍然存在，未来的人或系统就有机会沿着这张纸上留下的线索追溯到你的火种。
          / As long as at least one replica (online or local) survives, future humans or systems can follow the hints printed on this paper to reconstruct your Fireseed.
        </p>
        <p className="text-[11px] text-indigo-800">
          使用下方「QR 线索卡 / QR clue card」按钮为每个胶囊生成对应的线索卡 PNG。
        </p>
      </section>

      {/* 查询 + 列表 */}
      <section className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold">本地火种清单 / Local Capsules</h2>
          <span className="text-[11px] text-slate-400">
            {loadingManifest
              ? '正在加载 manifest...'
              : `共 ${capsules.length} 个胶囊，当前筛选出 ${filteredCapsules.length} 个。`}
          </span>
          <button
            type="button"
            onClick={() => runFullHealthCheck(filteredCapsules)}
            disabled={
              !filteredCapsules.length || !!fullCheckProgress || !!runningCheckCapsuleId
            }
            className="rounded border border-amber-500 px-3 py-1 text-xs hover:bg-amber-700 disabled:cursor-not-allowed disabled:border-slate-600 disabled:text-slate-500"
          >
            一键体检 / Run health check
          </button>
          <div className="ml-auto flex items-center gap-2 text-xs">
            <span>搜索：</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="按标题 / ID / 场景关键字过滤"
              className="w-56 rounded border border-slate-600 bg-slate-950 px-2 py-1 text-xs outline-none focus:border-sky-500"
            />
              <span className="text-[11px] text-slate-400">
                已选 {selectedCapsuleIds.length} 个
              </span>
          </div>
        </div>

        {fullCheckProgress && (
          <p className="text-[11px] text-slate-300">
            正在检查 {fullCheckProgress.current} / {fullCheckProgress.total} 个胶囊… / Checking
            {` ${fullCheckProgress.current} / ${fullCheckProgress.total} `}
            capsules…
          </p>
        )}
        {checkMessage && (
          <p className="mt-1 text-[11px] text-slate-300">{checkMessage}</p>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900/80 text-[11px] uppercase tracking-wide">
                <th className="px-2 py-2 text-left">
                  <input
                    ref={selectAllCheckboxRef}
                    type="checkbox"
                    onChange={handleToggleSelectAll}
                    className="h-4 w-4 accent-emerald-500"
                  />
                </th>
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
                    colSpan={8}
                    className="px-2 py-6 text-center text-[11px] text-slate-400"
                  >
                    暂无记录，或当前筛选条件下没有匹配的胶囊。
                  </td>
                </tr>
              )}

              {filteredCapsules.map((c) => {
                const health = computeCapsuleHealth(c);
                return (
                  <tr
                    key={c.capsuleId}
                    className="border-b border-slate-800/80 hover:bg-slate-800/40"
                  >
                    <td className="px-2 py-2 align-top">
                      <input
                        type="checkbox"
                        checked={selectedCapsuleIds.includes(c.capsuleId)}
                        onChange={() => handleToggleSelect(c.capsuleId)}
                        className="h-4 w-4 accent-emerald-500"
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <div className="max-w-xs truncate font-medium">
                        {c.title || '(未命名胶囊)'}
                      </div>
                      {c.scenario && (
                        <div className="mt-0.5 max-w-xs truncate text-[10px] text-slate-400">
                          {c.scenario}
                        </div>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
                        <span>
                          状态 / Status：
                          {health.status === 'draft' && '草稿（未记录任何副本） / Draft (no replicas yet)'}
                          {health.status === 'no-replica' && '仅本地副本（尚未远端备份） / Local only (no remote backup)'}
                          {health.status === 'backed-up' && '已记录副本（未体检） / Has replicas (not checked yet)'}
                          {health.status === 'healthy' && '副本已通过检查 / Replicas passed health check'}
                          {health.status === 'error' && '副本存在问题 / Replica check reported issues'}
                        </span>
                        {health.lastCheckAt && (
                          <span className="text-[10px] text-slate-400">
                            上次检查 / Last check：{new Date(health.lastCheckAt).toLocaleString()}
                          </span>
                        )}
                      </div>
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

                        <button
                          type="button"
                          onClick={() => handleExportQrForEntry(c)}
                          className="rounded border border-emerald-500 px-2 py-0.5 text-[11px] hover:bg-emerald-700"
                        >
                          QR 线索卡 / QR clue card
                        </button>

                        <button
                          type="button"
                          onClick={() => runHealthCheckForCapsule(c)}
                          disabled={runningCheckCapsuleId === c.capsuleId}
                          className="rounded border border-amber-500 px-2 py-0.5 text-[11px] hover:bg-amber-700 disabled:cursor-not-allowed disabled:border-slate-600 disabled:text-slate-500"
                        >
                          {runningCheckCapsuleId === c.capsuleId
                            ? '检查中… / Checking…'
                            : '检查 / Check'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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
