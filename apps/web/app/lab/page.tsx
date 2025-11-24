"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  addReplicaToCapsule,
  exportManifest,
  getManifest,
  importManifest,
  upsertCapsule,
} from "../../lib/manifestStore";
import {
  loadIpfsGatewayConfig,
  saveIpfsGatewayConfig,
  uploadCapsuleZipToIpfs,
} from "../../lib/adapters/ipfsHttp";
import { buildMDiscBundleZip } from "../../lib/export/mDisc";
import { buildQrPayloadFromManifestEntry, generateQrDataUrl } from "../../lib/export/qrCard";
import type { FireseedManifest } from "../../../packages/core/manifest/types";
import type { FireseedManifestCapsuleEntry } from "../../../packages/core/manifest/types";

export default function FireseedLabPage() {
  const [manifest, setManifest] = useState<FireseedManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterEncryption, setFilterEncryption] = useState<
    "all" | "none" | "aes-256-gcm"
  >("all");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "draft" | "final" | "archived"
  >("all");
  const [filterLanguage, setFilterLanguage] = useState<
    "all" | "zh" | "en" | "mixed"
  >("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState<
    "createdAtDesc" | "createdAtAsc" | "title"
  >("createdAtDesc");
  const [expandedCapsules, setExpandedCapsules] = useState<Set<string>>(new Set());
  const [replicaModal, setReplicaModal] = useState({
    open: false,
    capsuleId: "",
    adapterId: "",
    location: "",
    notes: "",
    saving: false,
    error: "",
  });
  const [ipfsConfig, setIpfsConfig] = useState({ baseUrl: "", authToken: "" });
  const [ipfsConfigSaved, setIpfsConfigSaved] = useState({
    message: "",
    isError: false,
  });
  const [ipfsUploadState, setIpfsUploadState] = useState<
    Record<string, { uploading?: boolean; message?: string; error?: string }>
  >({});
  const [selectedCapsuleIds, setSelectedCapsuleIds] = useState<string[]>([]);
  const [qrPreviewDataUrl, setQrPreviewDataUrl] = useState<string>("");
  const [qrPreviewPayload, setQrPreviewPayload] = useState<
    ReturnType<typeof buildQrPayloadFromManifestEntry> | null
  >(null);
  const [qrPreviewError, setQrPreviewError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const loadManifest = async () => {
      try {
        const data = await getManifest();
        setManifest(data);
      } finally {
        setLoading(false);
      }
    };

    loadManifest();
  }, []);

  useEffect(() => {
    const savedConfig = loadIpfsGatewayConfig();
    if (savedConfig) {
      setIpfsConfig({
        baseUrl: savedConfig.baseUrl,
        authToken: savedConfig.authToken ?? "",
      });
    }
  }, []);

  const handleExport = async () => {
    const json = await exportManifest();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "manifest.json";
    anchor.click();

    URL.revokeObjectURL(url);
  };

  const refreshManifest = async () => {
    const data = await getManifest();
    setManifest(data);
  };

  const handleImport = async () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    await importManifest(text);
    await refreshManifest();

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };

  const formatTodayString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}${month}${day}`;
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "final":
        return "Final / 定稿";
      case "archived":
        return "Archived / 归档";
      case "draft":
      default:
        return "Draft / 草稿";
    }
  };

  const renderStatusTag = (status: string) => {
    const color =
      status === "final"
        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
        : status === "archived"
          ? "bg-gray-100 text-gray-700 border-gray-200"
          : "bg-blue-100 text-blue-700 border-blue-200";
    return (
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold leading-tight">火种实验室 / Fireseed Lab</h1>
            <p className="text-sm text-slate-600">
              Inspect local Fireseed manifests, export snapshots, or import updates.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="rounded-md border border-slate-200 bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
            >
              Export Manifest
            </button>
            <button
              type="button"
              onClick={handleExportMDiscStructure}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              导出 M-Disc 模板 / Export M-Disc structure
            </button>
            <button
              type="button"
              onClick={handleImport}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Import Manifest
            </button>
            <Link
              href="/verify/local"
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              选择本地 ZIP / Import capsules from ZIP
            </Link>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">
            ⚠️ 实验性视图：请确保本地 manifest 内容安全，不要在公共环境泄露敏感胶囊信息。
          </p>
          <p>
            ⚠️ Experimental view: verify your local manifest entries before sharing; avoid
            exposing capsule locations or keys in untrusted environments.
          </p>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">IPFS 网关配置 / IPFS Gateway</h2>
          <p className="text-xs text-yellow-600">
            使用你自己的 IPFS HTTP API 网关（如 Kubo /api/v0），配置后可在下方直接上传 ZIP 胶囊文件。
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">Gateway Base URL</label>
            <input
              value={ipfsConfig.baseUrl}
              onChange={(event) => {
                setIpfsConfigSaved({ message: "", isError: false });
                setIpfsConfig((prev) => ({ ...prev, baseUrl: event.target.value }));
              }}
              placeholder="http://127.0.0.1:5001/api/v0"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
            />
            <p className="text-xs text-slate-500">需包含 /api/v0，系统会在后方拼接 /add?pin=true</p>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">Auth Token (可选)</label>
            <input
              type="password"
              value={ipfsConfig.authToken}
              onChange={(event) => {
                setIpfsConfigSaved({ message: "", isError: false });
                setIpfsConfig((prev) => ({ ...prev, authToken: event.target.value }));
              }}
              placeholder="Bearer token (optional)"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
            />
            <p className="text-xs text-slate-500">如果网关需要鉴权，可填写 Bearer token。</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSaveIpfsConfig}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            保存配置
          </button>
          {ipfsConfigSaved.message ? (
            <span
              className={`text-sm ${ipfsConfigSaved.isError ? "text-red-700" : "text-emerald-700"}`}
            >
              {ipfsConfigSaved.message}
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">筛选 / Filters</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex min-w-[140px] flex-col gap-1 text-xs text-slate-600">
            <span className="font-semibold">加密 / Encryption</span>
            <select
              className="rounded-md border border-slate-200 px-2 py-1 text-sm shadow-sm"
              value={filterEncryption}
              onChange={(event) => setFilterEncryption(event.target.value as typeof filterEncryption)}
            >
              <option value="all">全部 / All</option>
              <option value="none">未加密 / none</option>
              <option value="aes-256-gcm">AES-256-GCM</option>
            </select>
          </div>
          <div className="flex min-w-[140px] flex-col gap-1 text-xs text-slate-600">
            <span className="font-semibold">状态 / Status</span>
            <select
              className="rounded-md border border-slate-200 px-2 py-1 text-sm shadow-sm"
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value as typeof filterStatus)}
            >
              <option value="all">全部 / All</option>
              <option value="draft">草稿 / Draft</option>
              <option value="final">已定稿 / Final</option>
              <option value="archived">归档 / Archived</option>
            </select>
          </div>
          <div className="flex min-w-[140px] flex-col gap-1 text-xs text-slate-600">
            <span className="font-semibold">语言 / Language</span>
            <select
              className="rounded-md border border-slate-200 px-2 py-1 text-sm shadow-sm"
              value={filterLanguage}
              onChange={(event) =>
                setFilterLanguage(event.target.value as typeof filterLanguage)
              }
            >
              <option value="all">全部 / All</option>
              <option value="zh">中文 / zh</option>
              <option value="en">English / en</option>
              <option value="mixed">Mixed / 双语</option>
            </select>
          </div>
          <div className="flex min-w-[160px] flex-col gap-1 text-xs text-slate-600">
            <span className="font-semibold">排序 / Sort</span>
            <select
              className="rounded-md border border-slate-200 px-2 py-1 text-sm shadow-sm"
              value={sortOption}
              onChange={(event) =>
                setSortOption(event.target.value as typeof sortOption)
              }
            >
              <option value="createdAtDesc">最新创建 / Newest</option>
              <option value="createdAtAsc">最早创建 / Oldest</option>
              <option value="title">标题 / Title</option>
            </select>
          </div>
          <div className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs text-slate-600">
            <span className="font-semibold">搜索 / Search</span>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
              placeholder="标题或胶囊 ID / Title or Capsule ID"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">本地 Fireseed 胶囊 / Local Fireseed capsules</h2>
            <p className="text-sm text-slate-600">查看、筛选并导出本地保存的胶囊。</p>
          </div>
          <span className="text-sm text-slate-500">({filteredCapsules.length})</span>
        </div>
        <div className="px-6 py-4">
          {loading ? (
            <p className="text-sm text-slate-600">Loading manifest…</p>
          ) : !manifest || manifest.capsules.length === 0 ? (
            <p className="text-sm text-slate-600">No capsules found in the current manifest.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-t border-slate-200">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-600">
                    <th className="px-3 py-2">选择</th>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Capsule ID</th>
                    <th className="px-3 py-2">Created At</th>
                    <th className="px-3 py-2">Primary Language</th>
                    <th className="px-3 py-2">Encryption</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Replicas</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                {filteredCapsules.map((capsule) => {
                  const statusValue = capsule.status ?? "draft";
                  const backedUp = capsule.backedUp ?? false;
                  return (
                    <tbody key={capsule.capsuleId} className="align-top">
                      <tr className="hover:bg-slate-50">
                        <td className="px-3 py-2 align-middle">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300"
                            checked={selectedCapsuleIds.includes(capsule.capsuleId)}
                            onChange={() => toggleCapsuleSelection(capsule.capsuleId)}
                            aria-label={`Select capsule ${capsule.capsuleId}`}
                          />
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <div className="flex items-start gap-2">
                            <button
                              type="button"
                              onClick={() => toggleExpanded(capsule.capsuleId)}
                              className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              {expandedCapsules.has(capsule.capsuleId) ? "折叠" : "展开"}
                            </button>
                            <div className="space-y-1">
                              <div className="text-sm font-semibold text-slate-900">
                                {capsule.title || "未命名胶囊 / Untitled"}
                              </div>
                              {capsule.scenario ? (
                                <div className="text-xs text-slate-500">{capsule.scenario}</div>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 align-middle font-mono text-xs text-slate-600">
                          {capsule.capsuleId}
                        </td>
                        <td className="px-3 py-2 align-middle text-slate-700">{formatDate(capsule.createdAt)}</td>
                        <td className="px-3 py-2 align-middle text-slate-700">
                          {capsule.primaryLanguage || "-"}
                        </td>
                        <td className="px-3 py-2 align-middle text-slate-700">{capsule.encryption}</td>
                        <td className="px-3 py-2 align-middle">
                          <div className="space-y-2">
                            {renderStatusTag(statusValue)}
                            <select
                              className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs shadow-sm"
                              value={statusValue}
                              onChange={(event) =>
                                handleStatusChange(
                                  capsule.capsuleId,
                                  event.target.value as typeof statusValue
                                )
                              }
                            >
                              <option value="draft">Draft / 草稿</option>
                              <option value="final">Final / 定稿</option>
                              <option value="archived">Archived / 归档</option>
                            </select>
                            <div className="space-y-1 text-xs">
                              <span className="text-yellow-500">
                                {backedUp ? "已确认 / Confirmed" : "未确认 / Not confirmed"}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleBackedUpToggle(capsule.capsuleId)}
                                className="w-full rounded-md border border-dashed border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                              >
                                {backedUp ? "标记为未确认" : "标记已备份"}
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <div className="space-y-1 text-sm text-slate-800">
                            <span className="font-semibold">{capsule.replicas?.length ?? 0}</span>
                            <span className="text-xs text-slate-500">副本 / copies</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <div className="flex flex-col gap-2 text-xs font-medium text-slate-700">
                            <Link
                              href="/verify/local"
                              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-center shadow-sm hover:bg-slate-50"
                            >
                              查看验证 / Verify
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleOpenQrPreview(capsule)}
                              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-center shadow-sm hover:bg-slate-50"
                            >
                              QR 火种卡 / QR clue card
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUploadToIpfs(capsule.capsuleId)}
                              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-center shadow-sm hover:bg-slate-50 disabled:opacity-60"
                              disabled={ipfsUploadState[capsule.capsuleId]?.uploading}
                            >
                              {ipfsUploadState[capsule.capsuleId]?.uploading
                                ? "上传中…"
                                : "上传 IPFS / Upload to IPFS"}
                            </button>
                            <button
                              type="button"
                              onClick={() => openReplicaModal(capsule.capsuleId)}
                              className="w-full rounded-md border border-dashed border-slate-300 px-3 py-2 text-center shadow-sm hover:bg-slate-50"
                            >
                              手动添加副本
                            </button>
                            {ipfsUploadState[capsule.capsuleId]?.message ? (
                              <p className="text-xs text-emerald-600">
                                {ipfsUploadState[capsule.capsuleId]?.message}
                              </p>
                            ) : null}
                            {ipfsUploadState[capsule.capsuleId]?.error ? (
                              <p className="text-xs text-red-500">
                                {ipfsUploadState[capsule.capsuleId]?.error}
                              </p>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                      {expandedCapsules.has(capsule.capsuleId) ? (
                        <tr>
                          <td colSpan={9} className="bg-slate-50 px-4 py-3">
                            <div className="space-y-3 text-sm text-slate-700">
                              <div className="flex flex-wrap gap-4">
                                <span>
                                  <span className="font-medium">Scenario: </span>
                                  {capsule.scenario || "-"}
                                </span>
                                <span>
                                  <span className="font-medium">Fireseed Index: </span>
                                  {capsule.fireseedIndex ?? "-"}
                                </span>
                              </div>
                              <div className="space-y-2">
                                <div className="font-medium">Replicas 副本列表</div>
                                {capsule.replicas && capsule.replicas.length > 0 ? (
                                  <div className="grid gap-2 md:grid-cols-2">
                                    {capsule.replicas.map((replica, idx) => (
                                      <div
                                        key={`${replica.adapterId}-${idx}`}
                                        className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                                      >
                                        <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-600">
                                          <span className="font-mono text-slate-700">{replica.adapterId}</span>
                                          <span>Updated: {replica.lastUpdatedAt}</span>
                                        </div>
                                        <div className="text-xs text-slate-700">{replica.location}</div>
                                        {replica.notes ? (
                                          <div className="text-xs text-slate-500">{replica.notes}</div>
                                        ) : null}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-500">暂无副本 / No replicas recorded.</p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  );
                })}
              </table>
            </div>
          )}
        </div>
      </div>

      {qrPreviewError ? (
        <p className="text-sm text-red-600">{qrPreviewError}</p>
      ) : null}

      {qrPreviewPayload && qrPreviewDataUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded bg-white p-4 shadow-lg">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">QR 线索卡 / QR clue card</h2>
                <p className="text-sm text-gray-600">
                  本地生成的胶囊索引提示。This QR is generated locally as a clue, not full content.
                </p>
              </div>
              <button
                type="button"
                onClick={closeQrPreview}
                className="rounded px-2 py-1 text-sm hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-center rounded border bg-gray-50 p-3">
                <img
                  src={qrPreviewDataUrl}
                  alt={`QR clue card for capsule ${qrPreviewPayload.capsuleId}`}
                  className="max-h-80 object-contain"
                />
              </div>
              <div className="space-y-2 text-sm">
                <div className="rounded border bg-gray-50 p-3 font-mono text-xs">
                  <div>capsuleId: {qrPreviewPayload.capsuleId}</div>
                  <div>schemaVersion: {qrPreviewPayload.schemaVersion}</div>
                  <div>replicas: {qrPreviewPayload.replicas?.length ?? 0}</div>
                  <div>generatedAt: {qrPreviewPayload.generatedAt}</div>
                </div>
                <p className="rounded border bg-white p-3 text-gray-700">
                  这是“火种线索卡”而不是完整内容。<br />
                  只要任意一个副本（ipfs:// 或 ar:// 等）仍然可用，未来系统就可以根据这个 QR 提供的线索去追溯原始胶囊。
                </p>
                <p className="rounded border bg-white p-3 text-gray-700">
                  This is a “clue card”, not the full capsule. <br />
                  As long as any replica (ipfs:// or ar:// etc.) is still reachable, a future system can use this QR payload as a hint to rediscover the original capsule.
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={qrPreviewDataUrl}
                    download={`fireseed-qr-${qrPreviewPayload.capsuleId}.png`}
                    className="rounded bg-blue-600 px-3 py-2 text-xs text-white hover:bg-blue-700"
                  >
                    下载 PNG / Download PNG
                  </a>
                  <button
                    type="button"
                    onClick={closeQrPreview}
                    className="rounded border px-3 py-2 text-xs hover:bg-gray-50"
                  >
                    关闭 / Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {replicaModal.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded bg-white p-4 shadow-lg">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">手动添加副本 / Add Replica</h2>
                <p className="text-sm text-gray-600">
                  为胶囊 {replicaModal.capsuleId} 添加新的存储记录。
                </p>
              </div>
              <button
                type="button"
                onClick={closeReplicaModal}
                className="rounded px-2 py-1 text-sm hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReplicaSubmit} className="space-y-3 text-sm">
              <div className="space-y-1">
                <label className="block font-medium">Adapter ID</label>
                <input
                  required
                  value={replicaModal.adapterId}
                  onChange={(event) =>
                    setReplicaModal((prev) => ({ ...prev, adapterId: event.target.value }))
                  }
                  className="w-full rounded border px-2 py-1"
                  placeholder="e.g. ipfs, s3, gdrive"
                />
              </div>
              <div className="space-y-1">
                <label className="block font-medium">Location</label>
                <input
                  required
                  value={replicaModal.location}
                  onChange={(event) =>
                    setReplicaModal((prev) => ({ ...prev, location: event.target.value }))
                  }
                  className="w-full rounded border px-2 py-1"
                  placeholder="存储路径 / URL"
                />
              </div>
              <div className="space-y-1">
                <label className="block font-medium">Notes (可选)</label>
                <textarea
                  value={replicaModal.notes}
                  onChange={(event) =>
                    setReplicaModal((prev) => ({ ...prev, notes: event.target.value }))
                  }
                  className="w-full rounded border px-2 py-1"
                  rows={3}
                  placeholder="附加说明 / Additional context"
                />
              </div>

              {replicaModal.error ? (
                <div className="rounded border border-red-200 bg-red-50 px-2 py-1 text-sm text-red-700">
                  {replicaModal.error}
                </div>
              ) : null}

              <div className="flex justify-end gap-2 text-sm">
                <button
                  type="button"
                  onClick={closeReplicaModal}
                  className="rounded border px-3 py-2 hover:bg-gray-50"
                  disabled={replicaModal.saving}
                >
                  取消 / Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
                  disabled={replicaModal.saving}
                >
                  {replicaModal.saving ? "保存中…" : "保存副本"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
