export const CURRENT_SCHEMA_VERSION = "0.2.9";

export function isCurrentVersion(version: string | undefined | null): boolean {
  return version === CURRENT_SCHEMA_VERSION;
}

export function migrateCapsuleToCurrentVersion(
  capsule: any,
  fromVersion: string,
): any {
  // 占位：当前不做实际迁移，未来 v1.0 时再实现具体逻辑
  return capsule;
}
