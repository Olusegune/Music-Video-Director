// The keyboard-shortcut registry — one source of truth for the "?" reference
// sheet. useGlobalShortcuts implements these; this describes them. Keeping the
// list here (not hardcoded in the sheet) means the reference can't quietly
// drift from what the app actually documents.

export interface ShortcutDef {
  /** Key tokens in press order. "Mod" renders as ⌘ on macOS, Ctrl elsewhere. */
  keys: string[];
  label: string;
}

export interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutDef[];
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Everywhere",
    shortcuts: [
      { keys: ["Mod", "K"], label: "Search across everything" },
      { keys: ["Mod", "Shift", "N"], label: "Open notifications" },
      { keys: ["?"], label: "This shortcut sheet" },
      { keys: ["F1"], label: "Help & learning" },
    ],
  },
  {
    title: "Editing",
    shortcuts: [
      { keys: ["Mod", "Z"], label: "Undo" },
      { keys: ["Mod", "Shift", "Z"], label: "Redo" },
    ],
  },
  {
    title: "Music Video stages",
    shortcuts: [
      { keys: ["Ctrl", "1"], label: "Song Studio" },
      { keys: ["Ctrl", "2"], label: "Direct" },
      { keys: ["Ctrl", "3"], label: "Cast" },
      { keys: ["Ctrl", "4"], label: "Choreography" },
      { keys: ["Ctrl", "5"], label: "Timeline" },
    ],
  },
];

/** True on macOS, where the primary modifier is ⌘ rather than Ctrl. */
export function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  return /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);
}

/** Render one key token for display, resolving the platform modifier. */
export function renderKey(token: string, mac = isMacPlatform()): string {
  if (token === "Mod") return mac ? "⌘" : "Ctrl";
  if (token === "Shift") return mac ? "⇧" : "Shift";
  if (token === "Ctrl") return mac ? "⌃" : "Ctrl";
  return token;
}
