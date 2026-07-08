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
      localStorage.setItem(storageKey, JSON.stringify(envelope));
      return true;
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
