# Director Studio 1.2.0 Release Notes

Director Studio 1.2.0 completes the post-1.0 Platform Consistency program (Phases 1–5 of
`docs/PLATFORM-CONSISTENCY-AUDIT-2026-07.md`): every studio now inherits the same generation,
project-management, reference, prompt, and creation-flow capabilities instead of reimplementing
them independently.

## What's new since 1.0.0

**Generation, everywhere**
- `GenerationSpec` is now the single contract for image/video generation across all five studios:
  seeds, negative prompts, batch, resolution, and image-edit operations (edit/inpaint/outpaint/
  variation) where the routed model supports them.
- Provider fallback chains: a failed generation automatically retries on the next configured
  provider, with a visible notification naming the fallback.
- `ReferenceTray`: reference images now carry a category and strength, resolved honestly against
  what the routed model actually supports — an unsupported reference is shown as "Ignored," never
  silently dropped.
- Prompt Studio: every generation surface can show the full prompt as named, mutable layers
  (system/DNA/style/template/user/negative) instead of one opaque string, with per-project prompt
  history, one-click replay, and an A/B compare tab.

**Projects, professionalized**
- Save As, Rename, and Delete now work identically across every studio via a shared Project Hub.
- Per-project version history and restore, for every module.
- `DirectorProject` umbrellas make cross-module containment real: a Campaign's hero imagery and
  landing page are recorded as members of the campaign, not just implied.
- `.dsproj` portable project bundles: export a project (and its whole umbrella) as one file,
  including embedded media, and import it into another workspace. Re-importing never overwrites
  local work.
- `ProjectHome`: Glam, Web, and Campaign now show a real "pick up where you left off" screen
  (Resume + Recent) reachable via a Home button — fixing a bug where returning users were
  permanently pinned inside whichever project loaded first, with no way back to an overview.

**Visual-first creation, all three Bibles**
- Character, World, and Prop Bibles now follow the same staged flow: Spark → Card (pick a
  generated face/hero from candidates) → Profile (AI-drafted fields as editable review cards,
  not a form) → Details → Creator. "Enhance with AI" drafts personality/description fields when
  a Gemini key is configured, with an honest disabled state otherwise.
- A Notification Center (`Ctrl/Cmd+Shift+N`) and a keyboard-shortcut reference sheet.

**Motion Studio**
- Export is now real: a production-script package (Markdown shot list + creative direction,
  zipped with the raw project) replaces the placeholder button, and registers a proper deliverable.

**Platform hardening**
- A recoverable error boundary wraps every studio view — a render error now shows a "try again /
  dashboard" panel instead of blanking the entire application.
- GenerateBar audit: every primary generate action is now either always visible with a
  disabled-with-reason state, or was confirmed to already behave correctly.
- Terminology pass: "Magic Mode" (pre-1.0 naming) fully retired in favor of "Magic Flow" in
  every user-facing string; a deliverable/asset label mismatch fixed in Campaign Studio.

## System requirements

- Windows 10/11 x64
- Microsoft WebView2 Runtime
- Optional: FFmpeg on PATH for final video render workflows
- Optional: provider API keys for image, video, text, or voice generation

## Signing status

This build is unsigned unless a signing certificate is supplied at package time. Windows
SmartScreen may show an "unrecognized app" warning. If you trust this build, choose "More info"
and then "Run anyway".

## Identity

The user-visible product name is Director Studio. The Windows bundle identifier is
`ai.wheelbarrow.directorstudio`, unchanged since 1.0.0 — this release upgrades in place over any
prior 1.x install without losing local projects.

## Known issues

- Provider-backed media generation requires user-supplied API keys and may vary by provider
  availability.
- Fully automated update delivery is not configured for this unsigned release.
- The legacy generic Project workspace (`platform/features/projects/`) predates the studio spine
  and overlaps Glam/Web/Motion/Campaign's own workbenches; it still works and is not a regression,
  but is a candidate for consolidation or archival in a future release.
- Packaged end-to-end visual QA should be re-run on the target Windows machine before wide
  customer distribution.
