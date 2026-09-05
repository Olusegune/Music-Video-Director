export interface StorageEnvelope<T> {
  schemaVersion: number;
  data: T;
}

export interface StorageMigrationContext {
  fromVersion: number;
  toVersion: number;
}

export interface VersionedStorageOptions<T> {
  namespace: string;
  key: string;
  version: number;
  fallback: () => T;
  migrate?: (data: unknown, context: StorageMigrationContext) => T;
  legacyKeys?: string[];
}

export interface VersionedStorage<T> {
  storageKey: string;
  version: number;
  read: () => T;
  write: (data: T) => boolean;
  remove: () => void;
}

export function notifyStorage(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("mf-toast", { detail: message }));
}

/** A browser quota failure, which is the one storage error that means "your
 *  work was not saved" rather than "something odd happened". Chromium throws
 *  QuotaExceededError (code 22); Firefox/Safari use different names, so match
 *  on all of them rather than one engine's spelling. */
export function isQuotaError(error: unknown): boolean {
  if (!(error instanceof DOMException)) return false;
  return (
    error.name === "QuotaExceededError" ||
    error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    error.code === 22 ||
    error.code === 1014
  );
}

/**
 * The single safe way to write to localStorage.
 *
 * A raw `localStorage.setItem` throws when the origin hits its ~5–10MB quota,
 * and this app persists whole songs, treatments, choreography plans, and
 * version snapshots there. Every one of those writes used to be either
 * unguarded (crash mid-save) or wrapped in a silent `catch {}` — so once the
 * quota filled, the app kept looking like it was saving while the user's work
 * quietly went nowhere. This makes that case loud and specific instead.
 *
 * Returns false when the write did not land, so callers can avoid reporting
 * success they didn't get.
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (isQuotaError(error)) {
      notifyStorage(
        `Out of local storage space — "${key}" was NOT saved. ` +
          `Export or delete an old production to free space, then retry.`
      );
    } else {
      notifyStorage(describeStorageError("save", key, error));
    }
    return false;
  }
}

/** Rough bytes currently held in localStorage for this origin. Cheap enough
 *  to call on a settings/dashboard render, not in a hot loop. */
export function storageBytesUsed(): number {
  if (typeof localStorage === "undefined") return 0;
  let total = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      // Both key and value occupy quota, and browsers count UTF-16 code
      // units — 2 bytes per character.
      total += (key.length + (localStorage.getItem(key)?.length ?? 0)) * 2;
    }
  } catch {
    return total;
  }
  return total;
}

/** Conservative browser localStorage ceiling. Chromium is ~10MB/origin; we
 *  warn against a lower bar so there's room to act before writes start
 *  failing. */
export const STORAGE_SOFT_LIMIT_BYTES = 8 * 1024 * 1024;

/** True once usage is close enough to the ceiling that the next few saves
 *  are at genuine risk. Surfaced in the UI so the wall is visible early. */
export function isStorageUnderPressure(): boolean {
  return storageBytesUsed() > STORAGE_SOFT_LIMIT_BYTES * 0.75;
}

function describeStorageError(action: string, key: string, error: unknown) {
  const detail = error instanceof Error ? ` ${error.message}` : "";
  return `Could not ${action} local project data (${key}).${detail}`;
}

function isEnvelope(value: unknown): value is StorageEnvelope<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "schemaVersion" in value &&
    typeof (value as StorageEnvelope<unknown>).schemaVersion === "number" &&
    "data" in value
  );
}

export function createVersionedStorage<T>(
  options: VersionedStorageOptions<T>
): VersionedStorage<T> {
  const storageKey = `mf.${options.namespace}.${options.key}`;

  function migrate(data: unknown, fromVersion: number): T {
    if (fromVersion === options.version) return data as T;
    if (options.migrate) {
      return options.migrate(data, {
        fromVersion,
        toVersion: options.version,
      });
    }
    return data as T;
  }

  function write(data: T): boolean {
    try {
      const envelope: StorageEnvelope<T> = {
        schemaVersion: options.version,
        data,
      };
      // safeSetItem handles the quota case with a specific, actionable
      // message; this catch is only for serialization failures.
      return safeSetItem(storageKey, JSON.stringify(envelope));
    } catch (error) {
      notifyStorage(describeStorageError("save", storageKey, error));
      return false;
    }
  }

  function read(): T {
    try {
      let sourceKey = storageKey;
      let raw = localStorage.getItem(storageKey);

      if (raw == null) {
        for (const legacyKey of options.legacyKeys ?? []) {
          const legacyRaw = localStorage.getItem(legacyKey);
          if (legacyRaw != null) {
            sourceKey = legacyKey;
            raw = legacyRaw;
            break;
          }
        }
      }

      if (raw == null) return options.fallback();

      const parsed = JSON.parse(raw) as unknown;
      const fromVersion = isEnvelope(parsed) ? parsed.schemaVersion : 0;
      const data = isEnvelope(parsed) ? parsed.data : parsed;
      const migrated = migrate(data, fromVersion);

      if (sourceKey !== storageKey || fromVersion !== options.version) {
        if (write(migrated) && sourceKey !== storageKey) {
          localStorage.removeItem(sourceKey);
        }
      }

      return migrated;
    } catch (error) {
      notifyStorage(describeStorageError("read", storageKey, error));
      return options.fallback();
    }
  }

  function remove() {
    try {
      localStorage.removeItem(storageKey);
      for (const legacyKey of options.legacyKeys ?? []) {
        localStorage.removeItem(legacyKey);
      }
    } catch (error) {
      notifyStorage(describeStorageError("remove", storageKey, error));
    }
  }

  return {
    storageKey,
    version: options.version,
    read,
    write,
    remove,
  };
}
