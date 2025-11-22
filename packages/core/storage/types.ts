export interface CapsuleFiles {
  capsuleJson?: Uint8Array | string;
  metaJson: Uint8Array | string;
  humanReadable?: Uint8Array | string;
  readme?: Uint8Array | string;
  encryptedBlob?: Uint8Array;
  files?: Record<string, Uint8Array | string>;
}

export interface StorageResult {
  adapterId: string;
  capsuleId: string;
  location?: string;
  downloadUrl?: string;
  createdAt: string;
  extra?: Record<string, unknown>;
}
