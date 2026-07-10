import { useEffect, useState } from "react";
import { Keyboard, X } from "lucide-react";
import {
  SHORTCUT_GROUPS,
  isMacPlatform,
  renderKey,
  type ShortcutDef,
} from "@/platform/lib/shortcuts";

// The "?" reference sheet. A quick modal listing the keyboard shortcuts the app
// actually implements, rendered from the shared registry so it never drifts.
// Opened by pressing "?" (useGlobalShortcuts dispatches "mf-open-shortcuts").

function Keys({ shortcut, mac }: { shortcut: ShortcutDef; mac: boolean }) {
  return (
    <span className="flex items-center gap-1">
      {shortcut.keys.map((token, index) => (
        <kbd
          key={index}
          className="min-w-[1.5rem] rounded-md border border-border bg-elevated px-1.5 py-0.5 text-center text-[11px] font-medium text-foreground shadow-sm"
        >
          {renderKey(token, mac)}
        </kbd>
      ))}
    </span>
  );
}

export function ShortcutSheet() {
  const [open, setOpen] = useState(false);
  const mac = isMacPlatform();

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("mf-open-shortcuts", onOpen);
    return () => window.removeEventListener("mf-open-shortcuts", onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      role="dialog"
      aria-label="Keyboard shortcuts"
    >
      <button
        type="button"
        aria-label="Close keyboard shortcuts"
        className="absolute inset-0 bg-black/50"
        onClick={() => setOpen(false)}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Keyboard shortcuts</h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-elevated hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="max-h-[70vh] space-y-5 overflow-y-auto p-5">
          {SHORTCUT_GROUPS.map((group) => (
            <section key={group.title} className="space-y-2">
              <h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                {group.title}
              </h3>
              <ul className="space-y-1.5">
                {group.shortcuts.map((shortcut) => (
                  <li key={shortcut.label} className="flex items-center justify-between gap-4">
                    <span className="text-[13px] text-foreground">{shortcut.label}</span>
                    <Keys shortcut={shortcut} mac={mac} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
