// Text Lock system — the spec's "critical" feature.
//
// Every project carries a list of text elements (brand names, CTAs, UI labels,
// numbers, captions). Each element is assigned a *lock state* that controls how
// AI generators are allowed to treat it. The composed instruction is injected
// into every image and video prompt so models keep on-screen words sharp,
// correctly spelled, and behaving exactly as the director intends.

export type TextLockState =
  | "locked"
  | "animated"
  | "optional"
  | "final-frame"
  | "hidden-motion"
  | "visible-final";

export interface TextLockItem {
  id: string;
  /** The exact words on screen. */
  text: string;
  state: TextLockState;
  /** Optional context, e.g. "headline", "logo wordmark", "CTA button". */
  role?: string;
}

export const LOCK_STATE_LABEL: Record<TextLockState, string> = {
  locked: "Locked",
  animated: "Animated",
  optional: "Optional",
  "final-frame": "Final-frame only",
  "hidden-motion": "Hidden during animation",
  "visible-final": "Visible only on final still",
};

export const LOCK_STATE_HELP: Record<TextLockState, string> = {
  locked: "Sharp, correctly spelled, unchanged. Letters may not morph.",
  animated: "May animate on/off; letters must still read correctly.",
  optional: "May be included or omitted at the model's discretion.",
  "final-frame": "Appears only on the final frame/splash.",
  "hidden-motion": "Hidden while motion plays; never visible mid-shot.",
  "visible-final": "Visible only on the final still frame of the sequence.",
};

export const LOCK_STATES: TextLockState[] = [
  "locked",
  "animated",
  "optional",
  "final-frame",
  "hidden-motion",
  "visible-final",
];

let counter = 0;
function newId() {
  // crypto.randomUUID isn't always available in older webviews; fall back.
  try {
    return crypto.randomUUID();
  } catch {
    counter += 1;
    return `tl-${counter}-${counter * 2654435761}`;
  }
}

export function newLockItem(
  text: string,
  state: TextLockState = "locked",
  role?: string
): TextLockItem {
  return { id: newId(), text: text.trim(), state, role };
}

/**
 * The canonical AI text-safety paragraph. This is the wording the spec asks for,
 * specialized per the project's actual locked strings.
 */
export function lockInstructionFor(items: TextLockItem[]): string {
  const clean = items.filter((i) => i.text.trim().length > 0);
  if (clean.length === 0) return "";

  const lines: string[] = [];
  lines.push(
    "TEXT SAFETY — Any on-screen words must remain sharp, readable, correctly spelled, and unchanged. " +
      "Do not morph letters, do not invent alternate words, and do not animate individual letters unless explicitly requested."
  );

  const locked = clean.filter((i) => i.state === "locked");
  if (locked.length) {
    lines.push(
      `Render these EXACT strings verbatim, perfectly legible: ${locked
        .map((i) => `"${i.text}"`)
        .join(", ")}.`
    );
  }

  const finalOnly = clean.filter(
    (i) => i.state === "final-frame" || i.state === "visible-final"
  );
  if (finalOnly.length) {
    lines.push(
      `Show only on the final still frame (absent during motion): ${finalOnly
        .map((i) => `"${i.text}"`)
        .join(", ")}.`
    );
  }

  const hidden = clean.filter((i) => i.state === "hidden-motion");
  if (hidden.length) {
    lines.push(
      `Keep hidden while motion plays: ${hidden
        .map((i) => `"${i.text}"`)
        .join(", ")}.`
    );
  }

  const animated = clean.filter((i) => i.state === "animated");
  if (animated.length) {
    lines.push(
      `May animate on/off but must stay correctly spelled: ${animated
        .map((i) => `"${i.text}"`)
        .join(", ")}.`
    );
  }

  return lines.join(" ");
}

/** One-line summary for compact UI (Inspector chip, QC row). */
export function lockSummary(items: TextLockItem[]): string {
  const n = items.filter((i) => i.text.trim()).length;
  if (n === 0) return "No locked text";
  const locked = items.filter((i) => i.state === "locked").length;
  return `${n} text element${n === 1 ? "" : "s"} · ${locked} locked`;
}
