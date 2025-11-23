export interface FireseedManifest {
  schema: "FireseedManifest_v0.1";
  toolVersion: string;
  capsules: FireseedManifestCapsuleEntry[];
  lastUpdated?: string;
}

export interface FireseedManifestCapsuleEntry {
  capsuleId: string;
  title?: string;
  createdAt: string;
  scenario?: string;
  primaryLanguage?: string;
  encryption: "none" | "aes-256-gcm";
  fireseedIndex?: number;
  replicas: FireseedManifestReplica[];
  status?: "draft" | "final" | "archived";
  backedUp?: boolean;
}

export interface FireseedManifestReplica {
  adapterId: string;
  location: string;
  lastUpdatedAt: string;
  notes?: string;
}

export type FireseedManifestReplicaInput =
  | FireseedManifestReplica
  | (Omit<FireseedManifestReplica, "lastUpdatedAt"> & {
      lastUpdatedAt?: string;
    });
