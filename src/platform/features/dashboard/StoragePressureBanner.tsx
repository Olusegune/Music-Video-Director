import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Archive } from "lucide-react";
import {
  storageBytesUsed,
  isStorageUnderPressure,
  STORAGE_SOFT_LIMIT_BYTES,
} from "@/platform/lib/storage";
import { reclaimableBytes, reclaimMigratedCopies } from "@/platform/lib/durableStore";
import { useAppStore } from "@/platform/store/useAppStore";

function mb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Browser storage has a hard ceiling (~5–10MB per origin), and past it saves
 * simply fail. This warns while there's still room to act.
 *
 * It also has to be honest about *what* is full. Since productions moved to
 * SQLite, most of what fills localStorage is the copies migration left behind
 * on purpose. Telling the user to "delete a production to free space" in that
 * state is worse than unhelpful — it asks them to destroy real work to
 * reclaim space nothing needs. So reclaimable duplication is offered as a
 * one-click release, and deleting productions is only suggested when the
 * remaining pressure is genuinely theirs.
 */
export function StoragePressureBanner() {
  const [used, setUsed] = useState(0);
  const [pressured, setPressured] = useState(false);
  const [reclaimable, setReclaimable] = useState(0);
  const [justReclaimed, setJustReclaimed] = useState(0);
  const openProjects = useAppStore((s) => s.openProjects);

  const check = useCallback(() => {
    setUsed(storageBytesUsed());
    setPressured(isStorageUnderPressure());
    setReclaimable(reclaimableBytes());
  }, []);

  useEffect(() => {
    check();
    // Re-check periodically rather than on every render — reading every key
    // is O(everything stored), too expensive to do in a render path.
    const timer = window.setInterval(check, 30_000);
    return () => window.clearInterval(timer);
  }, [check]);

  const reclaim = () => {
    const freed = reclaimable;
    const released = reclaimMigratedCopies();
    if (released > 0) setJustReclaimed(freed);
    check();
  };

  if (!pressured) {
    // Confirm the release rather than having the banner vanish silently —
    // an alarm that disappears without a word reads like a glitch.
    if (justReclaimed > 0) {
      return (
        <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-success/40 bg-success/10 px-5 py-3">
          <Archive className="h-4 w-4 shrink-0 text-success" />
          <p className="text-sm text-success">
            Released {mb(justReclaimed)} of migrated copies. Your productions are safe in the
            local database.
          </p>
        </div>
      );
    }
    return null;
  }

  const pct = Math.min(100, Math.round((used / STORAGE_SOFT_LIMIT_BYTES) * 100));
  const mostlyReclaimable = reclaimable > used * 0.5;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border border-warning/40 bg-warning/10 px-5 py-3">
      <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-warning">
          Local storage is {pct}% full ({mb(used)})
        </p>
        <p className="mt-0.5 text-xs text-warning/80">
          {mostlyReclaimable ? (
            <>
              Most of this is {mb(reclaimable)} of copies left behind when your productions moved
              into the local database. Your work itself is safe there — these duplicates can be
              released without losing anything.
            </>
          ) : (
            <>
              Productions are saved in browser storage, which has a hard limit. Once it fills, new
              saves will fail. Export or delete a production you&rsquo;ve finished to free space.
            </>
          )}
        </p>
      </div>
      {reclaimable > 0 && (
        <button
          onClick={reclaim}
          className="shrink-0 rounded-md border border-warning/40 px-3 py-1.5 text-xs font-semibold text-warning transition hover:bg-warning/15"
        >
          Release {mb(reclaimable)}
        </button>
      )}
      <button
        onClick={openProjects}
        className="shrink-0 rounded-md border border-warning/40 px-3 py-1.5 text-xs font-semibold text-warning transition hover:bg-warning/15"
      >
        Manage productions
      </button>
    </div>
  );
}
