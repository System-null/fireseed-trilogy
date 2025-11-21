export const CURRENT_SCHEMA_VERSION = '0.2.9';

export function isCurrentVersion(version?: string | null): boolean {
  return Boolean(version && version === CURRENT_SCHEMA_VERSION);
}
