// Lightweight app preferences (non-secret) persisted in localStorage.

const LS_SHOW_WELCOME = "mf.showWelcome";

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
