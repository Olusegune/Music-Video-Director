// Lightweight global toast — listens for `mf-toast` CustomEvents and shows a
// brief message (used by undo/redo and other quick confirmations).

import { useEffect, useState } from "react";

export function Toast() {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const on = (e: Event) => {
      setMsg((e as CustomEvent<string>).detail);
      clearTimeout(timer);
      timer = setTimeout(() => setMsg(null), 1800);
    };
    window.addEventListener("mf-toast", on);
    return () => {
      window.removeEventListener("mf-toast", on);
      clearTimeout(timer);
    };
  }, []);

  if (!msg) return null;
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[95] -translate-x-1/2">
      <div className="rounded-full border border-border bg-surface/95 px-4 py-2 text-sm font-medium shadow-card backdrop-blur">
        {msg}
      </div>
    </div>
  );
}
