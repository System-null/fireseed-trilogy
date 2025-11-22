import { idbGet, idbSet } from "../../../lib/idb";
import type {
  FireseedManifest,
  FireseedManifestCapsuleEntry,
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

export async function upsertCapsule(
  entry: FireseedManifestCapsuleEntry
): Promise<void> {
  const manifest = await getManifest();
  const index = manifest.capsules.findIndex(
    (capsule) => capsule.capsuleId === entry.capsuleId
  );

  if (index >= 0) {
    manifest.capsules[index] = entry;
  } else {
    manifest.capsules.push(entry);
  }

  await saveManifest(manifest);
}
