import * as React from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/platform/components/ui/button";
import { cn } from "@/platform/lib/utils";

// In-app replacement for window.confirm().
//
// Destructive actions across the app were gated on `if (!confirm(msg)) return;`.
// A browser confirm() is an OS-drawn dialog: it can't be themed, it doesn't
// match the app's visual language (ProjectActionsMenu already says as much and
// confirms in place instead), and inside the desktop webview a click on such a
// control was observed to do nothing at all — the action silently never ran.
//
// The API is shaped to keep call sites a one-line change:
//
//   if (!(await confirm({ title: "Delete this?", destructive: true }))) return;
//
// The promise resolves true on confirm, false on cancel/escape/outside-click,
// so the early-return guard reads the same as it did with the global.

export interface ConfirmOptions {
  title: string;
  /** Optional second line — the consequence, not a restatement of the title. */
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive. */
  destructive?: boolean;
}

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

const ConfirmContext = React.createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(
  null
);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = React.useState<Pending | null>(null);

  const confirm = React.useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
    []
  );

  const settle = React.useCallback(
    (ok: boolean) => {
      setPending((current) => {
        current?.resolve(ok);
        return null;
      });
    },
    []
  );

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && <ConfirmDialog pending={pending} onSettle={settle} />}
    </ConfirmContext.Provider>
  );
}

/**
 * Returns a promise-based confirm. Outside a ConfirmProvider it resolves true
 * rather than throwing: a missing provider must not turn every destructive
 * button into a silent no-op, which is the exact failure this replaces.
 */
export function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
  const ctx = React.useContext(ConfirmContext);
  return React.useMemo(
    () => ctx ?? (() => Promise.resolve(true)),
    [ctx]
  );
}

function ConfirmDialog({
  pending,
  onSettle,
}: {
  pending: Pending;
  onSettle: (ok: boolean) => void;
}) {
  const confirmRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onSettle(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onSettle]);

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-background/80 p-6 backdrop-blur"
      onClick={() => onSettle(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={pending.title}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex gap-3 p-5">
          {pending.destructive && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-danger/10">
              <AlertTriangle className="h-4.5 w-4.5 text-danger" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold">{pending.title}</p>
            {pending.body && <p className="mt-1 text-xs leading-5 text-muted">{pending.body}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="secondary" size="sm" onClick={() => onSettle(false)}>
            {pending.cancelLabel ?? "Cancel"}
          </Button>
          <Button
            ref={confirmRef}
            size="sm"
            className={cn(pending.destructive && "bg-danger text-white hover:bg-danger/90")}
            onClick={() => onSettle(true)}
          >
            {pending.confirmLabel ?? "Confirm"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
