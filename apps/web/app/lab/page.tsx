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
import type { FireseedManifest } from "../../../packages/core/manifest/types";

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

  const handleReplicaSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!replicaModal.capsuleId) return;

    setReplicaModal((prev) => ({ ...prev, saving: true, error: "" }));
    try {
      const updated = await addReplicaToCapsule(replicaModal.capsuleId, {
        adapterId: replicaModal.adapterId.trim(),
        location: replicaModal.location.trim(),
        notes: replicaModal.notes.trim() || undefined,
      });

      if (!updated) {
        setReplicaModal((prev) => ({
          ...prev,
          saving: false,
          error: "Capsule not found. 请先确认胶囊是否存在。",
        }));
        return;
      }

      setManifest({ ...updated });
      setReplicaModal((prev) => ({ ...prev, open: false, saving: false }));
    } catch (error) {
      setReplicaModal((prev) => ({
        ...prev,
        saving: false,
        error: (error as Error).message ?? "Failed to save replica.",
      }));
    }
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
                        onClick={() => openReplicaModal(capsule.capsuleId)}
                        className="block w-full rounded border px-2 py-1 text-xs hover:bg-gray-50"
                      >
                        手动添加副本
                      </button>
                    </td>
                  </tr>
                  {expandedCapsules.has(capsule.capsuleId) ? (
                    <tr>
                      <td colSpan={9} className="border-t bg-gray-50 px-4 py-3">
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
