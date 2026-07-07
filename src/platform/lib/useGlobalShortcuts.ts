// Global keyboard shortcuts (documented in Help → Keyboard shortcuts).
// Ignored while typing in an input/textarea/select or contentEditable.

import { useEffect } from "react";
import { useAppStore } from "@/platform/store/useAppStore";
import { undo, redo } from "@/platform/lib/undo";

function toast(msg: string) {
  window.dispatchEvent(new CustomEvent("mf-toast", { detail: msg }));
}

function isTyping(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    node.isContentEditable
  );
}

export function useGlobalShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useAppStore.getState();

      // Global search — Ctrl/Cmd+K (works even while typing in a field).
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        s.setSearchOpen(true);
        return;
      }

      if (isTyping(e.target)) return;

      // Help: F1 or "?"
      if (e.key === "F1" || (e.key === "?" && !e.ctrlKey && !e.metaKey)) {
        e.preventDefault();
        s.openHelp();
        return;
      }

      // Undo / Redo (time-machine across the whole production).
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k === "z" && !e.shiftKey) {
          e.preventDefault();
          toast(undo() ? "Undid last change" : "Nothing to undo");
          return;
        }
        if ((k === "z" && e.shiftKey) || k === "y") {
          e.preventDefault();
          toast(redo() ? "Redid change" : "Nothing to redo");
          return;
        }
      }

      // Ctrl+1..5 — jump between the music-video stages.
      if (e.ctrlKey && !e.altKey && !e.metaKey) {
        const map: Record<string, () => void> = {
          "1": s.openSong,
          "2": s.openMvDirector,
          "3": s.openCast,
          "4": s.openChoreography,
          "5": s.openTimeline,
        };
        const fn = map[e.key];
        if (fn) {
          e.preventDefault();
          fn();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
