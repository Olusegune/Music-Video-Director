import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  storageBytesUsed,
  isStorageUnderPressure,
  STORAGE_SOFT_LIMIT_BYTES,
} from "@/platform/lib/storage";
import { useAppStore } from "@/platform/store/useAppStore";

function mb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Browser storage has a hard ceiling (~5–10MB per origin) and this app keeps
 * songs, treatments, choreography, and version snapshots in it. Past the
 * ceiling, saves simply fail — safeSetItem now says so, but by then the user
 * is already stuck. This warns while there's still room to act, and only
 * appears when it's genuinely close, so it never becomes background noise.
 */
export function StoragePressureBanner() {
  const [used, setUsed] = useState(0);
  const [pressured, setPressured] = useState(false);
  const openProjects = useAppStore((s) => s.openProjects);

  useEffect(() => {
    const check = () => {
      setUsed(storageBytesUsed());
      setPressured(isStorageUnderPressure());
    };
    check();
    // Re-check periodically rather than on every render — reading every key
    // is O(everything stored), too expensive to do in a render path.
    const timer = window.setInterval(check, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!pressured) return null;

  const pct = Math.min(100, Math.round((used / STORAGE_SOFT_LIMIT_BYTES) * 100));

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border border-warning/40 bg-warning/10 px-5 py-3">
      <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-warning">
          Local storage is {pct}% full ({mb(used)})
        </p>
        <p className="mt-0.5 text-xs text-warning/80">
          Productions are saved in browser storage, which has a hard limit. Once it fills, new
          saves will fail. Export or delete a production you've finished to free space.
        </p>
      </div>
      <button
        onClick={openProjects}
        className="shrink-0 rounded-md border border-warning/40 px-3 py-1.5 text-xs font-semibold text-warning transition hover:bg-warning/15"
      >
        Manage productions
      </button>
    </div>
  );
}
