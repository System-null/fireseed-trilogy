export interface CapsuleFiles {
  // Plaintext capsule content (use when encryption is disabled)
  capsuleJson?: string | Uint8Array;

  // Required metadata
  metaJson: string | Uint8Array;

  // HUMAN_READABLE.md
  humanReadable?: string | Uint8Array;

  // README.txt
  readme?: string | Uint8Array;

  // AES-GCM encrypted capsule content (preferred name)
  encryptedCapsule?: Uint8Array;

  /**
   * @deprecated Use `encryptedCapsule` instead
   */
  encryptedBlob?: Uint8Array;

  /**
   * @deprecated Use `encryptedCapsule` instead
   */
  encrypted?: Uint8Array;

  // Extra files for adapter-specific usage
  extraFiles?: Record<string, Uint8Array | string>;

  /**
   * @deprecated Use `extraFiles` instead
   */
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
