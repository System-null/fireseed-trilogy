export interface FireseedManifest {
  schema: "FireseedManifest_v0.1";
  toolVersion: string;
  capsules: FireseedManifestCapsuleEntry[];
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
}

export interface FireseedManifestReplica {
  adapterId: string;
  location: string;
  lastUpdatedAt: string;
  notes?: string;
}
