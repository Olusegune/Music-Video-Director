// Lightweight app preferences (non-secret) persisted in localStorage.

const LS_SHOW_WELCOME = "mf.showWelcome";
const LS_GUIDED_FLOW_V2 = "mf.guidedFlowV2";

/**
 * Whether the welcome screen shows at startup. Defaults to true (show) — best
 * practice for a first-run/welcome surface, with an explicit opt-out the user
 * controls in Settings (and on the welcome screen itself).
 */
export function getShowWelcome(): boolean {
  try {
    return localStorage.getItem(LS_SHOW_WELCOME) !== "0";
  } catch {
    return true;
  }
}

export function setShowWelcome(show: boolean): void {
  try {
    localStorage.setItem(LS_SHOW_WELCOME, show ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/**
 * Platform Guided Flow migration flag. Defaults on after packaged verification;
 * users can still opt back to the legacy Music Video Director wizard.
 */
export function getGuidedFlowV2(): boolean {
  try {
    const value = localStorage.getItem(LS_GUIDED_FLOW_V2);
    if (value === "1") return true;
    if (value === "0") return false;
    return true;
  } catch {
    return true;
  }
}

export function setGuidedFlowV2(on: boolean): void {
  try {
    localStorage.setItem(LS_GUIDED_FLOW_V2, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// StudioMode — the one platform-wide progressive-disclosure tier.
// (Decision D1, docs/DECISIONS.md.) Replaces the old per-surface flags
// (mf.mvViewMode, mf.choreoViewMode), which are migrated on first read.
// Mode is presentation-only: switching can never lose work.
// ---------------------------------------------------------------------------

export type StudioMode = "director" | "studio" | "creator";
const LS_STUDIO_MODE = "mf.studioMode";
const LS_LEGACY_MV_MODE = "mf.mvViewMode";
const LS_LEGACY_CHOREO_MODE = "mf.choreoViewMode";

export const STUDIO_MODES: { id: StudioMode; label: string; hint: string }[] = [
  { id: "director", label: "Director", hint: "Guided and visual — direct the production, no AI jargon" },
  { id: "studio", label: "Studio", hint: "Full professional creative controls on every surface" },
  { id: "creator", label: "Creator", hint: "The complete engine — prompts, models, providers, debugging" },
];

/** One-time migration from the pre-Director-Studio per-surface flags. */
function migrateLegacyModes(): StudioMode {
  try {
    const mv = localStorage.getItem(LS_LEGACY_MV_MODE);
    const choreo = localStorage.getItem(LS_LEGACY_CHOREO_MODE);
    if (mv === "expert") return "creator";
    if (mv === "director" || choreo === "professional") return "studio";
  } catch {
    /* ignore */
  }
  return "director";
}

/**
 * The app-wide display tier. Defaults to "director" — guided, visual, no AI
 * terminology — for new users. "studio" opens the full professional controls;
 * "creator" additionally defaults prompt/model/provider panels open. Surfaces
 * map this to their own disclosure; nothing is ever removed, only tucked away.
 */
export function getStudioMode(): StudioMode {
  try {
    const v = localStorage.getItem(LS_STUDIO_MODE);
    if (v === "director" || v === "studio" || v === "creator") return v;
    const migrated = migrateLegacyModes();
    localStorage.setItem(LS_STUDIO_MODE, migrated);
    return migrated;
  } catch {
    return "director";
  }
}

export function setStudioMode(mode: StudioMode): void {
  try {
    localStorage.setItem(LS_STUDIO_MODE, mode);
  } catch {
    /* ignore */
  }
}

const LS_AUTO_REFS = "mf.autoProductionRefs";

/**
 * Production memory: when on, the song's Cast (linked Character portraits) is
 * auto-applied as references on every performance shot, so the director never
 * re-selects them. Default true; toggle lives in the MV Director.
 */
export function getAutoProductionRefs(): boolean {
  try {
    return localStorage.getItem(LS_AUTO_REFS) !== "0";
  } catch {
    return true;
  }
}

export function setAutoProductionRefs(on: boolean): void {
  try {
    localStorage.setItem(LS_AUTO_REFS, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

const LS_ACTIVE_SONG = "mf.activeSongId";

/**
 * The active production (song id), persisted so reopening the app restores the
 * full context — treatment, choreography, cast, and timeline all key off it.
 */
export function getActiveSongId(): string | null {
  try {
    return localStorage.getItem(LS_ACTIVE_SONG);
  } catch {
    return null;
  }
}

export function setActiveSongId(id: string | null): void {
  try {
    if (id) localStorage.setItem(LS_ACTIVE_SONG, id);
    else localStorage.removeItem(LS_ACTIVE_SONG);
  } catch {
    /* ignore */
  }
}
