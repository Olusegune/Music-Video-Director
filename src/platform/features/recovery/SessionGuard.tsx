// Autosave heartbeat + crash recovery.
//
// Mounted once at the app root. It (1) takes a snapshot on a timer and when the
// window is hidden, updating the global "saved" indicator, (2) marks the session
// open/closed so an unclean exit can be detected, and (3) on launch, if the last
// session crashed, offers to restore the most recent snapshot.

import { useEffect, useRef, useState } from "react";
import { RotateCcw, X, ShieldCheck } from "lucide-react";
import { useAppStore } from "@/platform/store/useAppStore";
import { Button } from "@/platform/components/ui/button";
import {
  snapshot,
  latestSnapshot,
  restoreSnapshot,
  wasUncleanShutdown,
  markSessionOpen,
  markSessionClosed,
  type Snapshot,
} from "@/platform/lib/snapshots";

const AUTOSAVE_MS = 20_000;

export function SessionGuard() {
  const setLastSavedAt = useAppStore((s) => s.setLastSavedAt);
  const [recover, setRecover] = useState<Snapshot | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // 1. Crash detection — check BEFORE marking this session open.
    if (wasUncleanShutdown()) {
      const last = latestSnapshot();
      if (last) setRecover(last);
    }
    markSessionOpen();

    const save = (reason: string) => {
      const snap = snapshot(reason, Date.now());
      if (snap) setLastSavedAt(snap.ts);
    };
    // Seed the indicator from any existing snapshot.
    const existing = latestSnapshot();
    if (existing) setLastSavedAt(existing.ts);

    const timer = window.setInterval(() => save("autosave"), AUTOSAVE_MS);
    const onHidden = () => {
      if (document.visibilityState === "hidden") save("autosave");
    };
    const onUnload = () => {
      save("session end");
      markSessionClosed();
    };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("beforeunload", onUnload);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [setLastSavedAt]);

  if (!recover) return null;

  const when = new Date(recover.ts).toLocaleString();
  const doRestore = () => {
    if (restoreSnapshot(recover.id)) {
      // Mark clean so the reload that applies the restore doesn't re-trigger
      // the recovery prompt (SessionGuard re-opens the session on mount).
      markSessionClosed();
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background/85 p-6 backdrop-blur">
      <div className="w-full max-w-md overflow-hidden rounded-[var(--radius-modal)] border border-border bg-surface shadow-card">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/15 text-warning">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold leading-tight">
              Recover your last session?
            </h2>
            <p className="text-xs text-muted">
              The app didn't close normally last time.
            </p>
          </div>
        </div>
        <div className="space-y-3 p-6">
          <p className="text-sm text-muted">
            Your work is already saved — but we kept a snapshot from{" "}
            <span className="text-foreground">{when}</span> just in case. Restore it,
            or keep the current state.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRecover(null)}>
              <X className="h-4 w-4" /> Keep current
            </Button>
            <Button onClick={doRestore}>
              <RotateCcw className="h-4 w-4" /> Restore snapshot
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
