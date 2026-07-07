// Safe-delete dialog — shows where an asset is used and offers Cancel / Remove
// references only / Delete everywhere.

import { useMemo, useState } from "react";
import { AlertTriangle, X, Loader2 } from "lucide-react";
import { Button } from "@/platform/components/ui/button";
import { findAssetUsage, removeAssetReferences, deleteAssetEntity, type AssetUsage } from "@/platform/lib/assetUsage";
import type { AssetKind } from "@/platform/lib/assets";

export function SafeDeleteDialog({
  kind,
  entityId,
  name,
  srcs,
  onDone,
  onClose,
}: {
  kind: AssetKind;
  entityId: string;
  name: string;
  srcs: string[];
  /** Called after a successful remove/delete so the host can refresh. */
  onDone: () => void;
  onClose: () => void;
}) {
  const usage = useMemo(() => findAssetUsage(kind, entityId, srcs), [kind, entityId, srcs]);
  const [busy, setBusy] = useState(false);

  const removeRefs = () => {
    removeAssetReferences(kind, entityId, srcs);
    onDone();
  };
  const deleteAll = async () => {
    setBusy(true);
    try {
      removeAssetReferences(kind, entityId, srcs);
      await deleteAssetEntity(kind, entityId);
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/80 p-6 backdrop-blur" onClick={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded-[var(--radius-modal)] border border-border bg-surface shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 text-warning" /> Delete “{name}”?
          </h2>
          <button onClick={onClose} aria-label="Close"><X className="h-4 w-4 text-muted hover:text-foreground" /></button>
        </div>

        <div className="space-y-3 p-5">
          {usage.length === 0 ? (
            <p className="text-sm text-muted">
              This asset isn't referenced anywhere. Deleting it is safe.
            </p>
          ) : (
            <>
              <p className="text-sm">
                This asset is used in <span className="font-semibold">{usage.length}</span> place
                {usage.length === 1 ? "" : "s"}:
              </p>
              <ul className="max-h-48 space-y-1 overflow-y-auto rounded-[var(--radius-input)] border border-border bg-elevated/40 p-2.5 text-xs">
                {usage.map((u: AssetUsage, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="rounded bg-elevated px-1.5 py-0.5 text-[10px] text-muted">{u.area}</span>
                    <span className="truncate">{u.label}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          {usage.length > 0 && (
            <Button variant="secondary" onClick={removeRefs} disabled={busy}>
              Remove references only
            </Button>
          )}
          <Button variant="danger" onClick={deleteAll} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Delete everywhere
          </Button>
        </div>
      </div>
    </div>
  );
}
