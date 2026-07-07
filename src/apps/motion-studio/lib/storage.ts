const NS = "motionStudio.";
const SCHEMA_KEY = `${NS}schemaVersion`;
const SCHEMA_VERSION = 1;

export function migrateMotionStorage(): void {
  try {
    const version = Number(localStorage.getItem(SCHEMA_KEY) ?? "0");
    if (version < SCHEMA_VERSION) {
      localStorage.setItem(SCHEMA_KEY, String(SCHEMA_VERSION));
    }
  } catch {
    // The studio still renders when browser storage is unavailable.
  }
}

export function readMotionStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(NS + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeMotionStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
  } catch (error) {
    console.warn("Motion Studio storage write failed", key, error);
  }
}

export function motionUid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `motion-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }
}

export const nowIso = () => new Date().toISOString();
