import { idbGet, idbSet } from "../../../lib/idb";
import type {
  FireseedManifest,
  FireseedManifestCapsuleEntry,
  FireseedManifestReplica,
} from "../../../packages/core/manifest/types";
import { version as currentToolVersion } from "../package.json";

const MANIFEST_IDB_KEY = "fireseed:manifest";

function createEmptyManifest(): FireseedManifest {
  return {
    schema: "FireseedManifest_v0.1",
    toolVersion: currentToolVersion,
    capsules: [],
  };
}

export async function getManifest(): Promise<FireseedManifest> {
  const manifest = await idbGet<FireseedManifest>(MANIFEST_IDB_KEY);
  if (!manifest) {
    return createEmptyManifest();
  }
  return manifest;
}

export async function saveManifest(manifest: FireseedManifest): Promise<void> {
  await idbSet(MANIFEST_IDB_KEY, manifest);
}

export async function exportManifest(): Promise<string> {
  const manifest = await getManifest();
  return JSON.stringify(manifest, null, 2);
}

export async function importManifest(
  json: string
): Promise<{ merged: FireseedManifest; added: number; updated: number }> {
  let importedManifest: FireseedManifest;
  try {
    importedManifest = JSON.parse(json);
  } catch (error) {
    throw new Error("Invalid FireseedManifest JSON");
  }

  const currentManifest = await getManifest();
  const capsulesById = new Map(
    currentManifest.capsules.map((capsule) => [capsule.capsuleId, capsule])
  );

  let added = 0;
  let updated = 0;

  for (const capsule of importedManifest.capsules) {
    if (capsulesById.has(capsule.capsuleId)) {
      // Use a "last-write-wins" strategy where imported data overwrites local entries.
      capsulesById.set(capsule.capsuleId, capsule);
      updated += 1;
    } else {
      capsulesById.set(capsule.capsuleId, capsule);
      added += 1;
    }
  }

  const merged: FireseedManifest = {
    ...currentManifest,
    ...importedManifest,
    capsules: Array.from(capsulesById.values()),
  };

  await saveManifest(merged);

  return { merged, added, updated };
}

export async function upsertCapsule(
  entry: FireseedManifestCapsuleEntry
): Promise<void> {
  const manifest = await getManifest();
  const index = manifest.capsules.findIndex(
    (capsule) => capsule.capsuleId === entry.capsuleId
  );

  if (index >= 0) {
    const existing = manifest.capsules[index];
    manifest.capsules[index] = {
      ...existing,
      ...entry,
      status: entry.status ?? existing.status,
      backedUp: entry.backedUp ?? existing.backedUp,
    };
  } else {
    manifest.capsules.push({
      ...entry,
      status: entry.status ?? "draft",
      backedUp: entry.backedUp ?? false,
    });
  }

  await saveManifest(manifest);
}

export async function addReplicaToCapsule(
  capsuleId: string,
  replica: FireseedManifestReplica
): Promise<void> {
  const manifest = await getManifest();
  const entryIndex = manifest.capsules.findIndex(
    (capsule) => capsule.capsuleId === capsuleId
  );

  if (entryIndex < 0) {
    const newEntry: FireseedManifestCapsuleEntry = {
      capsuleId,
      title: "(unknown from Lab)",
      createdAt: new Date().toISOString(),
      encryption: "none",
      replicas: [replica],
      status: "draft",
      backedUp: false,
    };

    manifest.capsules.push(newEntry);
  } else {
    const existing = manifest.capsules[entryIndex];
    manifest.capsules[entryIndex] = {
      ...existing,
      replicas: [...(existing.replicas ?? []), replica],
    };
  }

  await saveManifest(manifest);
}

export async function findCapsuleById(
  capsuleId: string
): Promise<FireseedManifestCapsuleEntry | undefined> {
  const manifest = await getManifest();
  return manifest.capsules.find((capsule) => capsule.capsuleId === capsuleId);
}
