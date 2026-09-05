// Lives in scripts/ rather than src/ on purpose. It needs node:child_process,
// and the app's tsconfig deliberately ships no @types/node so that browser
// code cannot import Node builtins without a type error. Installing those
// types to satisfy one test would erode that guarantee everywhere; keeping
// this file outside `include: ["src"]` keeps it. vitest still collects it.

import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// A standing guard against the bug class that produced most of this session's
// hand-found bugs: a control that renders and does nothing.
//
// Two shapes of it:
//   1. An optional callback prop declared on a component that no call site
//      ever passes — the control is wired to nothing.
//   2. A wrapper that always passes a handler whose body calls an optional
//      prop with `?.()`. The leaf's `{onX ? <button/> : null}` guard sees a
//      truthy handler and renders, but the click does nothing. This is what
//      made the reference-image X buttons inert in three Bibles.
//
// This is static analysis rather than rendering, deliberately: it covers every
// component at once, including ones too entangled to render in a test.
//
// KNOWN LIMIT — do not over-trust this. It asks "is this prop passed by *any*
// call site", not "does every component that needs it receive it". Verified:
// deleting the `onRemoveReference={onRemoveReference}` forward inside
// MediaPanel does NOT trip this guard, because the three Bibles still mention
// the prop, even though Prop and World Bible's remove buttons would be dead
// again. Catching a partial break like that needs a render test for the
// component in question — see ReferenceTray.test.tsx. This guard's job is the
// whole-codebase sweep for never-wired props; component tests cover the rest.

/**
 * grep exits 1 for "no matches" and 2 for a real error (bad pattern, missing
 * path). Collapsing both to an empty array is how a guard like this silently
 * becomes vacuous — a broken pattern reads as "nothing to report" and the
 * test passes forever while checking nothing. Exit 2 throws instead.
 */
function grep(args: string[]): string[] {
  try {
    return execFileSync("grep", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
      .split("\n")
      .filter(Boolean);
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 1) return []; // genuinely no matches
    const stderr = (error as { stderr?: Buffer }).stderr?.toString().trim();
    throw new Error(`grep failed (exit ${status}): ${stderr || (error as Error).message}`);
  }
}

/**
 * Optional callbacks that are intentionally never passed today. Each needs a
 * reason, and the component must not render a dead control because of it —
 * either it's unmounted, or it gates its control on the prop being present.
 */
const ALLOWED_UNWIRED: Record<string, string> = {
  onUserPromptChange:
    "PromptComposition renders read-only unless BOTH `editable` and this are passed — no dead control.",
};

describe("no dead controls", () => {
  it("every optional callback prop is passed by at least one call site", () => {
    const declarations = grep([
      "-rn",
      "--include=*.tsx",
      "-E",
      // Bracket expressions, not backslash escapes: this environment's grep
      // rejects `\(` even under -E ("Unmatched ( or \("), and a pattern that
      // errors would make the whole guard silently pass.
      "^[[:space:]]*on[A-Z][a-zA-Z]*[?]: [(]",
      "src",
    ]);

    const props = new Map<string, string>();
    for (const line of declarations) {
      const match = line.match(/^([^:]+):\d+:\s*(on[A-Z][a-zA-Z]*)\?:/);
      if (match) props.set(match[2], match[1]);
    }
    expect(props.size).toBeGreaterThan(0); // the scan itself must be working

    const unwired: string[] = [];
    for (const [prop, declaredIn] of props) {
      if (prop in ALLOWED_UNWIRED) continue;
      const passed = grep(["-rn", "-F", "--include=*.tsx", `${prop}={`, "src"]);
      if (passed.length === 0) unwired.push(`${prop} (declared in ${declaredIn})`);
    }

    expect(
      unwired,
      "These optional callbacks are declared but never passed. If the component renders a " +
        "control for one, that control is dead — wire it at the call site. If it is " +
        "intentionally optional and renders nothing without it, add it to ALLOWED_UNWIRED " +
        "with the reason."
    ).toEqual([]);
  });

  it("no control is driven by an optional prop that nothing ever passes", () => {
    // The shape that made the reference X buttons inert: a handler is always
    // supplied (so any `{onX ? ... : null}` guard downstream sees something
    // truthy and renders the control) but its body only calls `prop?.()` —
    // and that prop is never wired by any call site, so the click is a no-op.
    //
    // Deliberately narrow: `prop?.()` is a perfectly good pattern when the
    // prop IS wired somewhere. Flagging those too would fail on working code,
    // and a guard that cries wolf gets ignored. Only never-wired props count.
    const optionalCalls = grep([
      "-rn",
      "--include=*.tsx",
      "-oE",
      "[a-zA-Z]+[?][.][(]",
      "src",
    ]);

    const offenders: string[] = [];
    const checked = new Set<string>();
    for (const line of optionalCalls) {
      const match = line.match(/^([^:]+):(\d+):([a-zA-Z]+)\?\.\($/);
      if (!match) continue;
      const [, file, lineNo, prop] = match;
      if (!/^on[A-Z]/.test(prop)) continue; // callbacks only, not optional chaining generally
      if (prop in ALLOWED_UNWIRED) continue;
      if (checked.has(prop)) continue;
      checked.add(prop);

      const passedAnywhere = grep(["-rn", "-F", "--include=*.tsx", `${prop}={`, "src"]);
      if (passedAnywhere.length === 0) {
        offenders.push(`${prop} called at ${file}:${lineNo} but never passed by any call site`);
      }
    }

    expect(
      offenders,
      "A control is driven by a callback that nothing ever provides, so clicking it does " +
        "nothing. Either wire the prop at the call sites, or pass the handler conditionally " +
        "(`onX={maybeUnset ? handler : undefined}`) so the control isn't rendered at all."
    ).toEqual([]);
  });
});

// Browser dialog globals are banned in app code. `confirm()` is drawn by the
// OS, so it can't be themed and doesn't match the app's own language — and in
// the desktop webview a click on a confirm-gated control was seen to do
// nothing at all, making every guarded delete a silent no-op. useConfirm()
// from confirm-dialog.tsx renders in-app and returns a real answer.
describe("no browser dialog globals", () => {
  it("uses useConfirm() instead of window.confirm/alert/prompt", () => {
    const calls = grep([
      "-rn",
      "--include=*.tsx",
      "--include=*.ts",
      "-E",
      // A call, not a property or an identifier that merely ends in these
      // (setConfirmOpen, onConfirm, confirmLabel are all fine).
      "(^|[^.a-zA-Z])(confirm|alert|prompt)[(]",
      "src",
    ]).filter(
      (line) =>
        // Tests carry these strings as fixtures (escaping cases, for one).
        !/\.test\.tsx?:/.test(line) &&
        !line.includes("confirm-dialog.tsx") &&
        !/^\S+:\d+:\s*(\/\/|\*)/.test(line)
    );

    // `await confirm({...})` is the hook's value, not the global. What makes it
    // the hook is that the file obtained one, so that is what gets asserted --
    // matching on "await" alone would pass an awaited global just as happily.
    const offenders = calls.filter((line) => {
      const file = line.split(":")[0];
      const source = readFileSync(file, "utf8");
      return !source.includes("useConfirm()");
    });
    expect(offenders).toEqual([]);
  });
});
