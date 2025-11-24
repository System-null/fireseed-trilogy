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
  medium?: "local-zip" | "ipfs" | "arweave" | "mdisc" | "qr-card" | string;
  label?: string;
  /**
   * 最近一次健康检查的时间（ISO 字符串，UTC）
   */
  lastCheckAt?: string;
  /**
   * 最近一次健康检查的结果：
   * - "ok": 检查通过
   * - "failed": 检查失败（网络错误 / 内容缺失 / 校验失败等）
   * - "unknown": 从未检查或无法判断
   */
  lastCheckStatus?: FireseedReplicaCheckStatus;
  /**
   * 检查失败时的人类可读信息，比如错误原因、网关不可达等。
   */
  lastCheckMessage?: string;
}

export type FireseedManifestReplicaInput =
  | FireseedManifestReplica
  | (Omit<FireseedManifestReplica, "lastUpdatedAt"> & {
      lastUpdatedAt?: string;
    });

export type FireseedReplicaCheckStatus = "ok" | "failed" | "unknown";
