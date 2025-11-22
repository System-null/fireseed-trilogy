"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  exportManifest,
  getManifest,
  importManifest,
} from "../../lib/manifestStore";
import type { FireseedManifest } from "../../../packages/core/manifest/types";

export default function FireseedLabPage() {
  const [manifest, setManifest] = useState<FireseedManifest | null>(null);
  const [loading, setLoading] = useState(true);
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

      {loading ? (
        <p>Loading manifest…</p>
      ) : !manifest || manifest.capsules.length === 0 ? (
        <p>No capsules found in the current manifest.</p>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 text-left text-sm">
                <th className="border px-3 py-2">Title</th>
                <th className="border px-3 py-2">Capsule ID</th>
                <th className="border px-3 py-2">Created At</th>
                <th className="border px-3 py-2">Primary Language</th>
                <th className="border px-3 py-2">Encryption</th>
                <th className="border px-3 py-2">Replicas</th>
                <th className="border px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {manifest.capsules.map((capsule) => (
                <tr key={capsule.capsuleId} className="text-sm">
                  <td className="border px-3 py-2">{capsule.title || "(untitled)"}</td>
                  <td className="border px-3 py-2 font-mono">{capsule.capsuleId}</td>
                  <td className="border px-3 py-2">{capsule.createdAt}</td>
                  <td className="border px-3 py-2">{capsule.primaryLanguage || "-"}</td>
                  <td className="border px-3 py-2">{capsule.encryption}</td>
                  <td className="border px-3 py-2 text-center">
                    {capsule.replicas?.length ?? 0}
                  </td>
                  <td className="border px-3 py-2 text-center">
                    <Link
                      href="/verify/local"
                      className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                    >
                      查看/验证
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
