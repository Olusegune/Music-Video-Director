import { Bell, CheckCheck, X } from "lucide-react";
import { useEffect, useState } from "react";

interface Notice {
  id: string;
  message: string;
  createdAt: number;
}

/** Lightweight platform-wide history for the existing mf-toast event bus. */
export function NotificationCenter() {
  const [items, setItems] = useState<Notice[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onToast = (event: Event) => {
      const message = String((event as CustomEvent).detail ?? "").trim();
      if (!message) return;
      setItems((current) =>
        [{ id: crypto.randomUUID(), message, createdAt: Date.now() }, ...current].slice(0, 30)
      );
    };
    window.addEventListener("mf-toast", onToast);
    return () => window.removeEventListener("mf-toast", onToast);
  }, []);

  useEffect(() => {
    const openCenter = () => setOpen(true);
    window.addEventListener("mf-open-notifications", openCenter);
    return () => window.removeEventListener("mf-open-notifications", openCenter);
  }, []);

  const unread = items.length;
  return (
    <div className="fixed right-5 top-4 z-[90]">
      <button
        type="button"
        aria-label={`Notifications${unread ? ` (${unread})` : ""}`}
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface/90 text-muted shadow-card backdrop-blur transition hover:border-primary/50 hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <aside className="absolute right-0 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">Notifications</h2>
              <p className="text-[10px] text-muted">Generation, storage, and workflow updates</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Clear notifications"
                title="Clear notifications"
                onClick={() => setItems([])}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-elevated hover:text-foreground"
              >
                <CheckCheck className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="Close notifications"
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-elevated hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </header>
          <div className="max-h-80 overflow-y-auto p-2">
            {items.length === 0 ? (
              <p className="px-3 py-8 text-center text-xs text-muted">You’re all caught up.</p>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg px-3 py-2.5 text-xs transition hover:bg-elevated"
                >
                  <p className="whitespace-pre-line leading-relaxed">{item.message}</p>
                  <p className="mt-1 text-[10px] text-muted">
                    {new Date(item.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))
            )}
          </div>
        </aside>
      ) : null}
    </div>
  );
}
