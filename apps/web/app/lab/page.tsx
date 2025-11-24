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
      <span className={`inline-block rounded-full border px-2 py-0.5 text-xs ${color}`}>
        {getStatusLabel(status)}
      </span>
    );
  };

  const handleStatusChange = async (
    capsuleId: string,
    status: "draft" | "final" | "archived"
  ) => {
    if (!manifest) return;
    const current = manifest.capsules.find((capsule) => capsule.capsuleId === capsuleId);
    if (!current) return;

    await upsertCapsule({ ...current, status });
    await refreshManifest();
  };

  const handleBackedUpToggle = async (capsuleId: string) => {
    if (!manifest) return;
    const current = manifest.capsules.find((capsule) => capsule.capsuleId === capsuleId);
    if (!current) return;

    await upsertCapsule({ ...current, backedUp: !(current.backedUp ?? false) });
    await refreshManifest();
  };

  const filteredCapsules = (() => {
    if (!manifest) return [];

    let capsules = [...manifest.capsules];

    if (filterEncryption !== "all") {
      capsules = capsules.filter((capsule) => capsule.encryption === filterEncryption);
    }

    if (filterStatus !== "all") {
      capsules = capsules.filter(
        (capsule) => (capsule.status ?? "draft") === filterStatus
      );
    }

    if (filterLanguage !== "all") {
      capsules = capsules.filter((capsule) => capsule.primaryLanguage === filterLanguage);
    }

    if (searchTerm.trim()) {
      const keyword = searchTerm.trim().toLowerCase();
      capsules = capsules.filter(
        (capsule) =>
          capsule.capsuleId.toLowerCase().includes(keyword) ||
          (capsule.title ?? "").toLowerCase().includes(keyword)
      );
    }

    switch (sortOption) {
      case "title":
        capsules.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        break;
      case "createdAtAsc":
        capsules.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        break;
      case "createdAtDesc":
      default:
        capsules.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
    }

    return capsules;
  })();

  const toggleExpanded = (capsuleId: string) => {
    setExpandedCapsules((prev) => {
      const next = new Set(prev);
      if (next.has(capsuleId)) {
        next.delete(capsuleId);
      } else {
        next.add(capsuleId);
      }
      return next;
    });
  };

  const openReplicaModal = (capsuleId: string) => {
    setReplicaModal({
      open: true,
      capsuleId,
      adapterId: "",
      location: "",
      notes: "",
      saving: false,
      error: "",
    });
  };

  const closeReplicaModal = () => {
    setReplicaModal((prev) => ({ ...prev, open: false, error: "", saving: false }));
  };

  const toggleCapsuleSelection = (capsuleId: string) => {
    setSelectedCapsuleIds((prev) => {
      if (prev.includes(capsuleId)) {
        return prev.filter((id) => id !== capsuleId);
      }
      return [...prev, capsuleId];
    });
  };

  const handleReplicaSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!replicaModal.capsuleId) return;

    setReplicaModal((prev) => ({ ...prev, saving: true, error: "" }));
    try {
      await addReplicaToCapsule(replicaModal.capsuleId, {
        adapterId: replicaModal.adapterId.trim(),
        location: replicaModal.location.trim(),
        lastUpdatedAt: new Date().toISOString(),
        notes: replicaModal.notes.trim() || undefined,
      });

      await refreshManifest();
      setReplicaModal((prev) => ({ ...prev, open: false, saving: false }));
    } catch (error) {
      setReplicaModal((prev) => ({
        ...prev,
        saving: false,
        error: (error as Error).message ?? "Failed to save replica.",
      }));
    }
  };

  const handleSaveIpfsConfig = () => {
    try {
      const trimmedBaseUrl = ipfsConfig.baseUrl.trim();
      const trimmedToken = ipfsConfig.authToken.trim();
      if (!trimmedBaseUrl) {
        setIpfsConfigSaved({ message: "请填写 baseUrl / Base URL required", isError: true });
        return;
      }
      saveIpfsGatewayConfig({ baseUrl: trimmedBaseUrl, authToken: trimmedToken || undefined });
      setIpfsConfig((prev) => ({ ...prev, baseUrl: trimmedBaseUrl, authToken: trimmedToken }));
      setIpfsConfigSaved({
        message: "已保存 IPFS 网关配置 / IPFS gateway saved",
        isError: false,
      });
    } catch (error) {
      setIpfsConfigSaved({ message: (error as Error).message, isError: true });
    }
  };

  const handleUploadToIpfs = (capsuleId: string) => {
    const config = loadIpfsGatewayConfig() ?? {
      baseUrl: ipfsConfig.baseUrl.trim(),
      authToken: ipfsConfig.authToken.trim() || undefined,
    };

    if (!config.baseUrl) {
      setIpfsUploadState((prev) => ({
        ...prev,
        [capsuleId]: {
          uploading: false,
          message: "",
          error: "请先配置 IPFS 网关 / Please configure IPFS gateway first.",
        },
      }));
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".zip";
    input.onchange = async (event: Event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      setIpfsUploadState((prev) => ({
        ...prev,
        [capsuleId]: { uploading: true, message: "", error: "" },
      }));

      try {
        const { cid } = await uploadCapsuleZipToIpfs(file, config);
        await addReplicaToCapsule(capsuleId, {
          adapterId: "ipfs-http",
          medium: "ipfs",
          location: `ipfs://${cid}`,
          lastUpdatedAt: new Date().toISOString(),
          label: "IPFS (BYO gateway)",
        });
        await refreshManifest();
        setIpfsUploadState((prev) => ({
          ...prev,
          [capsuleId]: {
            uploading: false,
            message: `上传成功 / Uploaded: ipfs://${cid}`,
            error: "",
          },
        }));
      } catch (error) {
        setIpfsUploadState((prev) => ({
          ...prev,
          [capsuleId]: {
            uploading: false,
            message: "",
            error:
              (error as Error).message ||
              "IPFS 上传失败 / IPFS upload failed. 请检查配置或网络。",
          },
        }));
      }
    };

    input.click();
  };

  const handleOpenQrPreview = async (entry: FireseedManifestCapsuleEntry) => {
    setQrPreviewError("");
    try {
      const payload = buildQrPayloadFromManifestEntry(entry);
      const dataUrl = await generateQrDataUrl(payload);
      setQrPreviewPayload(payload);
      setQrPreviewDataUrl(dataUrl);
    } catch (error) {
      setQrPreviewPayload(null);
      setQrPreviewDataUrl("");
      setQrPreviewError(
        (error as Error).message ||
          "生成 QR 线索卡失败 / Failed to generate QR clue card."
      );
    }
  };

  const closeQrPreview = () => {
    setQrPreviewPayload(null);
    setQrPreviewDataUrl("");
  };

  const handleExportMDiscStructure = async () => {
    if (selectedCapsuleIds.length === 0) {
      alert("请至少选择一个火种胶囊 / Please select at least one capsule.");
      return;
    }

    const currentManifest = await getManifest();
    const zipBlob = await buildMDiscBundleZip(currentManifest, selectedCapsuleIds);
    const url = URL.createObjectURL(zipBlob);

    const anchor = document.createElement("a");
    const dateString = formatTodayString();
    anchor.href = url;
    anchor.download = `fireseed-disc-${dateString}.zip`;
    anchor.click();

    URL.revokeObjectURL(url);
  };

  return (
    <main className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">火种实验室 / Fireseed Lab</h1>
          <p className="text-sm text-gray-600">
            Inspect local Fireseed manifests, export snapshots, or import updates.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
          >
            Export Manifest
          </button>
          <button
            type="button"
            onClick={handleExportMDiscStructure}
            className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
          >
            导出 M-Disc 结构 / Export M-Disc structure
          </button>
          <button
            type="button"
            onClick={handleImport}
            className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
          >
            Import Manifest
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </header>

      <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <p className="font-medium">
          ⚠️ 实验性视图：请确保本地 manifest 内容安全，不要在公共环境泄露敏感胶囊信息。
        </p>
        <p>
          ⚠️ Experimental view: verify your local manifest entries before sharing; avoid
          exposing capsule locations or keys in untrusted environments.
        </p>
      </div>

      <div className="space-y-3 rounded border bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">IPFS 网关配置 / IPFS Gateway</h2>
          <p className="text-sm text-gray-600">
            使用你自己的 IPFS HTTP API 网关（如 Kubo /api/v0），配置后可在下方直接上传 ZIP
            胶囊文件。
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-sm font-medium">Gateway Base URL</label>
            <input
              value={ipfsConfig.baseUrl}
              onChange={(event) => {
                setIpfsConfigSaved({ message: "", isError: false });
                setIpfsConfig((prev) => ({ ...prev, baseUrl: event.target.value }));
              }}
              placeholder="http://127.0.0.1:5001/api/v0"
              className="w-full rounded border px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-500">
              需包含 /api/v0，系统会在后方拼接 /add?pin=true
            </p>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium">Auth Token (可选)</label>
            <input
              type="password"
              value={ipfsConfig.authToken}
              onChange={(event) => {
                setIpfsConfigSaved({ message: "", isError: false });
                setIpfsConfig((prev) => ({ ...prev, authToken: event.target.value }));
              }}
              placeholder="Bearer token (optional)"
              className="w-full rounded border px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-500">如果网关需要鉴权，可填写 Bearer token。</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveIpfsConfig}
            className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
          >
            保存配置
          </button>
          {ipfsConfigSaved.message ? (
            <span
              className={`text-sm ${ipfsConfigSaved.isError ? "text-red-700" : "text-green-700"}`}
            >
              {ipfsConfigSaved.message}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded border bg-gray-50 p-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-600">加密过滤 Encryption</span>
          <select
            className="rounded border px-2 py-1"
            value={filterEncryption}
            onChange={(event) =>
              setFilterEncryption(event.target.value as typeof filterEncryption)
            }
          >
            <option value="all">全部 / All</option>
            <option value="none">未加密 / None</option>
            <option value="aes-256-gcm">AES-256-GCM</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600">状态 Status</span>
          <select
            className="rounded border px-2 py-1"
            value={filterStatus}
            onChange={(event) =>
              setFilterStatus(event.target.value as typeof filterStatus)
            }
          >
            <option value="all">全部 / All</option>
            <option value="draft">Draft / 草稿</option>
            <option value="final">Final / 定稿</option>
            <option value="archived">Archived / 归档</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600">语言 Language</span>
          <select
            className="rounded border px-2 py-1"
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
        <div className="flex items-center gap-2">
          <span className="text-gray-600">排序 Sort</span>
          <select
            className="rounded border px-2 py-1"
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
        <div className="flex flex-1 items-center gap-2">
          <span className="text-gray-600">搜索 Search</span>
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full min-w-[200px] rounded border px-2 py-1"
            placeholder="标题或胶囊 ID / Title or Capsule ID"
          />
        </div>
      </div>

      {loading ? (
        <p>Loading manifest…</p>
      ) : !manifest || manifest.capsules.length === 0 ? (
        <p>No capsules found in the current manifest.</p>
      ) : (
        <div className="overflow-auto rounded border">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 text-left text-sm">
                <th className="border px-3 py-2">选择</th>
                <th className="border px-3 py-2">Title</th>
                <th className="border px-3 py-2">Capsule ID</th>
                <th className="border px-3 py-2">Created At</th>
                <th className="border px-3 py-2">Primary Language</th>
                <th className="border px-3 py-2">Encryption</th>
                <th className="border px-3 py-2">Status</th>
                <th className="border px-3 py-2">Backup</th>
                <th className="border px-3 py-2">Replicas</th>
                <th className="border px-3 py-2">Actions</th>
              </tr>
            </thead>
            {filteredCapsules.map((capsule) => {
              const statusValue = capsule.status ?? "draft";
              const backedUp = capsule.backedUp ?? false;
              return (
                <tbody key={capsule.capsuleId} className="text-sm">
                  <tr className="align-top">
                    <td className="border px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedCapsuleIds.includes(capsule.capsuleId)}
                        onChange={() => toggleCapsuleSelection(capsule.capsuleId)}
                        aria-label={`Select capsule ${capsule.capsuleId}`}
                      />
                    </td>
                    <td className="border px-3 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleExpanded(capsule.capsuleId)}
                          className="rounded border px-2 py-1 text-xs hover:bg-gray-100"
                        >
                          {expandedCapsules.has(capsule.capsuleId) ? "折叠" : "展开"}
                        </button>
                        <div>
                          <div className="font-medium">
                            {capsule.title || "未命名胶囊 / Untitled"}
                          </div>
                          {capsule.scenario ? (
                            <div className="text-xs text-gray-600">{capsule.scenario}</div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="border px-3 py-2 font-mono">{capsule.capsuleId}</td>
                    <td className="border px-3 py-2">{formatDate(capsule.createdAt)}</td>
                    <td className="border px-3 py-2">{capsule.primaryLanguage || "-"}</td>
                    <td className="border px-3 py-2">{capsule.encryption}</td>
                    <td className="border px-3 py-2">
                      <div className="space-y-2">
                        {renderStatusTag(statusValue)}
                        <select
                          className="w-full rounded border px-2 py-1 text-xs"
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
                      </div>
                    </td>
                    <td className="border px-3 py-2 text-center">
                      <div className="space-y-1">
                        <div className="text-xs font-medium">
                          {backedUp ? "✅ 已备份 / Confirmed" : "⚠️ 未确认 / Not confirmed"}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleBackedUpToggle(capsule.capsuleId)}
                          className="rounded border px-2 py-1 text-xs hover:bg-gray-100"
                        >
                          {backedUp ? "标记为未确认" : "标记已备份"}
                        </button>
                      </div>
                    </td>
                    <td className="border px-3 py-2 text-center">
                      {capsule.replicas?.length ?? 0}
                    </td>
                  <td className="border px-3 py-2 space-y-2 text-center">
                    <Link
                      href="/verify/local"
                      className="inline-block rounded border px-2 py-1 text-xs hover:bg-gray-50"
                    >
                      查看/验证
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleOpenQrPreview(capsule)}
                      className="block w-full rounded border px-2 py-1 text-xs hover:bg-gray-50"
                    >
                      QR 线索卡 / QR clue card
                    </button>
                    <button
                      type="button"
                      onClick={() => openReplicaModal(capsule.capsuleId)}
                      className="block w-full rounded border px-2 py-1 text-xs hover:bg-gray-50"
                    >
                      手动添加副本
                    </button>
                    <div className="space-y-1 rounded border px-2 py-2 text-left text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">IPFS</span>
                        <button
                          type="button"
                          onClick={() => handleUploadToIpfs(capsule.capsuleId)}
                          className="rounded border px-2 py-1 hover:bg-gray-50 disabled:opacity-60"
                          disabled={ipfsUploadState[capsule.capsuleId]?.uploading}
                        >
                          {ipfsUploadState[capsule.capsuleId]?.uploading
                            ? "上传中…"
                            : "上传到 IPFS / Upload to IPFS"}
                        </button>
                      </div>
                      {ipfsUploadState[capsule.capsuleId]?.message ? (
                        <p className="text-green-700">
                          {ipfsUploadState[capsule.capsuleId]?.message}
                        </p>
                      ) : null}
                      {ipfsUploadState[capsule.capsuleId]?.error ? (
                        <p className="text-red-600">
                          {ipfsUploadState[capsule.capsuleId]?.error}
                        </p>
                      ) : null}
                    </div>
                  </td>
                  </tr>
                  {expandedCapsules.has(capsule.capsuleId) ? (
                    <tr>
                      <td colSpan={10} className="border-t bg-gray-50 px-4 py-3">
                        <div className="space-y-2 text-sm">
                          <div className="flex flex-wrap gap-4 text-gray-700">
                            <span>
                              <span className="font-medium">Scenario: </span>
                              {capsule.scenario || "-"}
                            </span>
                            <span>
                              <span className="font-medium">Fireseed Index: </span>
                              {capsule.fireseedIndex ?? "-"}
                            </span>
                          </div>
                          <div>
                            <div className="mb-1 font-medium">Replicas 副本列表</div>
                            {capsule.replicas && capsule.replicas.length > 0 ? (
                              <div className="space-y-2">
                                {capsule.replicas.map((replica, idx) => (
                                  <div
                                    key={`${replica.adapterId}-${idx}`}
                                    className="rounded border bg-white p-2"
                                  >
                                    <div className="flex flex-wrap justify-between gap-2 text-xs text-gray-700">
                                      <span className="font-mono">{replica.adapterId}</span>
                                      <span>Updated: {replica.lastUpdatedAt}</span>
                                    </div>
                                    <div className="text-xs text-gray-700">{replica.location}</div>
                                    {replica.notes ? (
                                      <div className="text-xs text-gray-500">{replica.notes}</div>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500">暂无副本 / No replicas recorded.</p>
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
