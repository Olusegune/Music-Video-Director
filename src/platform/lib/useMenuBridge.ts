// Bridges the native OS menu bar (src-tauri/src/appmenu.rs) to the app's React
// state. The Rust side handles a few window-level actions itself (reload,
// fullscreen, zoom) and forwards everything else as a `menu:<action>` event —
// this hook is the single place that turns those into real store actions.
//
// Menu items intentionally have NO accelerator when useGlobalShortcuts.ts
// already owns that key combo (Ctrl+Z/Shift+Z/K) — see appmenu.rs — so this
// hook and the keydown handler never fight over the same keypress.

import { useEffect } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useAppStore } from "@/platform/store/useAppStore";
import { undo, redo } from "@/platform/lib/undo";
import { api, isTauri } from "@/platform/lib/ipc";

function toast(message: string) {
  window.dispatchEvent(new CustomEvent("mf-toast", { detail: message }));
}

function fileNameOf(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

async function saveActiveProject(): Promise<string | null> {
  const { activeProjectId } = useAppStore.getState();
  if (!activeProjectId) return null;
  return api.exportProject(activeProjectId, "json");
}

export function useMenuBridge(): void {
  useEffect(() => {
    // The native menu only exists inside the desktop shell — no-op in the browser.
    if (!isTauri) return;

    const unlistenPromises = (
      [
        ["menu:new-project", () => useAppStore.getState().setWizardOpen(true)],
        ["menu:open-project", () => useAppStore.getState().openProjects()],
        [
          "menu:close-project",
          () => {
            const { activeProjectId, openDashboard } = useAppStore.getState();
            if (activeProjectId) openDashboard();
          },
        ],
        [
          "menu:save-project",
          async () => {
            const { view } = useAppStore.getState();
            if (view !== "project") {
              toast("Your work saves automatically — nothing to do.");
              return;
            }
            try {
              const path = await saveActiveProject();
              if (!path) return;
              toast(`Saved a copy → ${fileNameOf(path)}`);
            } catch (e) {
              toast(`Save failed: ${(e as Error).message ?? "unknown error"}`);
            }
          },
        ],
        [
          "menu:save-project-as",
          async () => {
            const { view } = useAppStore.getState();
            if (view !== "project") {
              toast("Open a project first, then use Save Project As.");
              return;
            }
            try {
              const exported = await saveActiveProject();
              if (!exported) return;
              const dest = await save({
                defaultPath: fileNameOf(exported),
                filters: [{ name: "MotionForge Project", extensions: ["json"] }],
              });
              if (!dest) return;
              const text = await invoke<string>("read_project_from_disk", { path: exported });
              await invoke("write_project_to_disk", { path: dest, data: text });
              toast(`Saved → ${fileNameOf(dest)}`);
            } catch (e) {
              toast(`Save failed: ${(e as Error).message ?? "unknown error"}`);
            }
          },
        ],
        ["menu:undo", () => toast(undo() ? "Undid last change" : "Nothing to undo")],
        ["menu:redo", () => toast(redo() ? "Redid change" : "Nothing to redo")],
        ["menu:find", () => useAppStore.getState().setSearchOpen(true)],
        ["menu:toggle-sidebar", () => useAppStore.getState().toggleSidebar()],
        ["menu:settings", () => useAppStore.getState().openSettings()],
        ["menu:api-keys", () => useAppStore.getState().openApiKeys()],
        ["menu:ai-models", () => useAppStore.getState().openModels()],
        ["menu:brand-kits", () => useAppStore.getState().openBrandKits()],
        ["menu:help", () => useAppStore.getState().openHelp()],
        ["menu:shortcuts", () => window.dispatchEvent(new Event("mf-open-shortcuts"))],
      ] as const
    ).map(([event, handler]) => listen(event, handler));

    let cancelled = false;
    const unlistens: Array<() => void> = [];
    Promise.all(unlistenPromises).then((fns) => {
      if (cancelled) {
        fns.forEach((fn) => fn());
      } else {
        unlistens.push(...fns);
      }
    });

    return () => {
      cancelled = true;
      unlistens.forEach((fn) => fn());
    };
  }, []);
}
