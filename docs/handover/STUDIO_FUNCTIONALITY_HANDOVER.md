# Studio Functionality Handover (for Codex)

Date: 2026-07-14
Author: Claude (diagnosis + two verified fixes), handing off remaining scope to Codex.

## 1. Executive Summary

A product review raised a broad claim: "every studio (Motion/Glam/Web/Campaign) is a
non-functional prototype — creation only works inside Project, storyboard images are
broken, and there's no prompt/model control." A code-level investigation (not just UI
testing) found this claim was **mostly not true** — three of four studios have real,
working generation calls. Two concrete bugs were confirmed and fixed. The rest of the
broad rewrite proposal is not backed by what's actually in the code and should not be
undertaken as originally scoped without re-verifying each claim against current source.

**Business impact of what was actually broken:** users generating storyboard frames in
the Project workspace (`StoryboardEditor.tsx`) saw a broken image icon instead of their
generated shot — a real, user-visible defect, now fixed. Separately, Motion Studio's
top-level "Generate storyboard" action could fail silently with no error shown for some
input combinations — now fixed with a toast on error.

**Product expectation going forward:** treat the original 20-section spec as a set of
hypotheses, not a verified backlog. Section 4 below lists what should actually be
re-checked before more work is scheduled against it.

## 2. Architecture Map

- **Routing**: `src/app/App.tsx` — single-page view switch (`view === "motionstudio" && <MotionStudio />`, etc.) for `motionstudio`, `glamstudio`, `webstudio`, `campaignstudio`.
- **Motion Studio**: `src/apps/motion-studio/MotionStudio.tsx` — one file, two render states (no active project → "New Motion Project" form; active project → scene grid + `UniversalGenerationPanel`). Local project logic in `src/apps/motion-studio/lib/projects.ts`, `lib/templates.ts`, `lib/brain.ts`, `lib/direction.ts`.
- **Glam Studio**: `src/apps/glam-studio/GlamStudio.tsx` → `GlamStudioWorkspace.tsx` (real `api.generateImageFromSpec` call via `GlamGenerationControls`).
- **Web Studio**: `src/apps/webstudio/WebStudio.tsx` (real `api.generateImageFromSpec` + `api.generateStructuredTextFromSpec` calls). Note: there is also a `src/apps/web-studio/` directory that is **not** routed — dead/legacy, worth confirming with whoever added it before deleting.
- **Campaign Studio**: `src/apps/campaign-studio/CampaignStudio.tsx` — uses `api.generateStructuredTextFromSpec` for strategy/plan text. **No image/video generation call was found in this file** — unconfirmed whether that's intentional (text-only strategy tool) or a real gap.
- **Project workspace / Storyboard**: `src/platform/features/projects/StoryboardEditor.tsx`, used from `ProjectWorkspace.tsx`. This is the "Shot 1 / Shot 2" grid with Upload / Generate frame / Generate video buttons per shot.
- **Shared generation architecture**:
  - Provider routing: `src/platform/lib/providers.ts` (`routeProvider`, `routeProviderChain`), `providerMeta.ts`, `providerReady.ts`.
  - Model registry: `src/platform/lib/modelRegistry.ts`.
  - Generation spec/fallback: `src/platform/lib/generationSpec.ts`.
  - IPC/Tauri bridge (all `api.generate*` calls + dev-mode mocks + asset conversion): `src/platform/lib/ipc.ts`.
  - Prompt composition: `src/platform/lib/pack.ts` (`buildImagePrompt`, `buildVideoPrompt`), per-studio builders (e.g. `buildScenePrompt` in `MotionStudio.tsx`).
  - Shared generation UI: `src/platform/components/generation/UniversalGenerationPanel.tsx` — used by Motion Studio, Web Studio, Glam Studio.
  - Asset persistence/rendering: generated media is stored as a **raw local file path** (not a URL) to keep localStorage small (see comment `ipc.ts:63-72`). Rendering requires resolving that path to a `data:` URL via `api.assetDataUrl` → Tauri command `read_asset_data_url`. The correct client-side pattern for this is `src/platform/components/ui/asset-image.tsx` (`resolveAssetSrc`, `useAssetSrc`, `AssetImage` — also renders a `BrokenAssetPlaceholder` with regenerate/replace/remove actions on failure).

## 3. Root Causes (confirmed, from source inspection + live browser test)

### 3.1 Storyboard frame image renders broken — CONFIRMED, FIXED
`StoryboardEditor.tsx` had a bare `<img src={shot.imageUrl}>` for the shot frame
thumbnail (and `poster={shot.imageUrl}` on the video element), while the exact same
file already used the correct `AssetImage` wrapper one component away, for reference-
image thumbnails. Since `shot.imageUrl` is a raw filesystem path in the Tauri build, a
plain `<img>`/`poster` cannot load it. This is a reuse bug, not a provider/persistence
problem — `generateFrame()` populates `shot.imageUrl` correctly.

**Fix applied**: swapped the shot-frame `<img>` for `<AssetImage>`, removed the
`poster={shot.imageUrl}` (same defect, no direct fix available for `<video poster>` —
dropped rather than left broken). File: `src/platform/features/projects/StoryboardEditor.tsx`.

**Verified live**: generated a storyboard in a test project, clicked "Generate frame"
on Shot 1, confirmed via `document.querySelectorAll('img')` that the image loaded
(`complete: true`, `naturalWidth: 640`) instead of erroring.

### 3.2 "Generate storyboard does nothing" — PARTIALLY CONFIRMED, FIXED
There is no separate broken "top-level" component distinct from "Project" — it's one
component (`MotionStudio.tsx`) with two render states. The "Generate storyboard" button
(`handleCreateProject`, formerly no try/catch) calls a **synchronous, local-only**
generator (`createMotionProject` → `establishDirection()` + `directStoryboard()`,
template logic, writes to localStorage) — it does not call any AI provider at that
stage. The AI/provider call only happens later, per-scene, via
`generateMotionPrompt` → `routeProvider("video", …)` → `api.generateVideoFromSpec`.

If a user expects an AI-style delay/spinner from "Generate storyboard" and instead sees
an instant local result, that can read as "nothing happened" even though scenes were
created — this was the root cause of a previously-fixed off-screen-scroll issue (see
git history: "Motion Studio: fix 'Generate storyboard' appearing to do nothing").

**New gap found and fixed**: `handleCreateProject` had no try/catch, so if
`directStoryboard()`/`establishDirection()` threw for some template/style/brief
combination, the failure was completely silent (no toast, no console-visible user
feedback). **Fix applied**: wrapped the body in try/catch with a toast on error. File:
`src/apps/motion-studio/MotionStudio.tsx`.

**Not reproduced**: no template/style combination was found during this session that
actually throws. If the user can reproduce a specific "truly nothing happens" case
after this fix, the toast will now surface the real exception message — use that to
find the actual throwing code path.

### 3.3 Glam / Web / Campaign Studio — NOT CONFIRMED AS BROKEN
Contrary to the original report, `GlamStudioWorkspace.tsx`, `WebStudio.tsx` both call
real `api.generate*FromSpec` functions from real `onClick`/`onGenerate` handlers — no
dead buttons or stub calls were found. `CampaignStudio.tsx` only calls
`api.generateStructuredTextFromSpec` (text) — no image/video call was found, which
**may** be intentional (it's a strategy/planning tool) or may be a real gap; this needs
a product decision, not a code fix, and was out of scope for this session.

### 3.4 Prompt/model visibility — NOT ADDRESSED
The original report asked for full prompt editing and model-selection UI on every
generation surface. `UniversalGenerationPanel.tsx` already exposes a "Prompt breakdown"
and Auto/Manual model toggle for the Motion Studio per-scene generation (visible in
live testing). Whether this needs to be extended to `StoryboardEditor.tsx`'s per-shot
"Generate frame" (which currently shows a prompt but should be checked for edit
capability) is a scoped follow-up, not touched in this session.

## 4. Work Completed This Session

**Files modified:**
- `src/platform/features/projects/StoryboardEditor.tsx` — shot-frame `<img>` → `<AssetImage>`; removed broken `poster` prop.
- `src/apps/motion-studio/MotionStudio.tsx` — `handleCreateProject` wrapped in try/catch with error toast.

**Files created:**
- `docs/handover/STUDIO_FUNCTIONALITY_HANDOVER.md` (this file).

**No new services, no new shared architecture, no schema changes.** Deliberately
scoped down from the original 20-section rewrite proposal, per user decision, to just
the two bugs actually confirmed by source inspection + live testing.

## 5. Remaining Work (prioritized, NOT yet started)

1. **Confirm whether Campaign Studio needs image/video generation** (`src/apps/campaign-studio/CampaignStudio.tsx`) — currently text-only. Needs a product decision before any code change.
2. **Resolve the `src/apps/webstudio/` vs `src/apps/web-studio/` duplicate directory** — only `webstudio/WebStudio.tsx` is routed in `App.tsx`; confirm `web-studio/` is genuinely dead before deleting (there's an untracked `src/apps/web-studio/` per git status at session start — check with the user before removing, since untracked files may be in-progress work).
3. **Audit prompt-edit/model-select coverage** across all generation surfaces (per-shot frame gen in `StoryboardEditor.tsx`, per-scene in Motion Studio, Glam/Web hero image gen) against the "view/edit/copy/reset prompt, select model, Auto optional" bar from the original report — this was not verified surface-by-surface in this session.
4. **`<video poster>` on generated shots** — currently has no fallback (removed rather than fixed, since `poster` doesn't support the async data-URL resolution `AssetImage` provides). Low priority; only affects the still shown before a generated video is played.
5. Re-verify the original report's claims for Motion Studio's `UniversalGenerationPanel` state persistence — the report asked that "broken generated assets must never be marked completed"; the current implementation of `api.generateVideoFromSpec`/`generateImageFromSpec` success/failure handling was not audited end-to-end for this guarantee.

## 6. Verification Performed

- `npm run typecheck` — passes (no errors) after both fixes.
- `npm run build` — passes (Vite build succeeds, only pre-existing chunk-size warnings, unrelated).
- Live manual test via dev server (`npm run dev`, Tauri webview substituted with browser preview):
  - Created a Product Launch storyboard (8 shots) in the Project workspace via a real brief.
  - Clicked "Generate frame" on Shot 1 — confirmed the resulting `<img>` element loaded successfully (`complete: true`, `naturalWidth: 640`) via `AssetImage`, where it would previously have 404'd against a raw path.
  - No console errors during the flow.
- Did not run `npm run test` (vitest) or `npm run test:release` in this session — recommend running both before shipping.
- Windows installer (NSIS + MSI) rebuilt with both fixes via `npm run tauri build` — output at `src-tauri/target/release/bundle/nsis/MotionForge AI_1.4.0_x64-setup.exe` and `.../bundle/msi/MotionForge AI_1.4.0_x64_en-US.msi`.

## 7. Exact Next Steps for Codex

1. Run `npm run test` and `npm run test:release` to confirm no regressions from the two fixes (not run this session).
2. Open `src/apps/campaign-studio/CampaignStudio.tsx` and confirm with the product owner whether it should call an image/video generation endpoint, or if text-only is correct by design. If a gap: follow the existing pattern in `GlamStudioWorkspace.tsx`'s `generateHeroImage` (calls `api.generateImageFromSpec`, guarded by `routeProvider`) rather than inventing a new pattern.
3. Investigate the untracked `src/apps/web-studio/` directory (git status shows `?? src/apps/web-studio/` as of session start) — determine if it's superseded by the routed `src/apps/webstudio/` or is in-progress work, before any deletion. Ask the repo owner if unclear.
4. Grep for any other bare `<img src={...imageUrl}>` or `poster={...imageUrl}` patterns outside `StoryboardEditor.tsx` that should also use `AssetImage` — this was fixed in one file only; the same defect class may exist elsewhere (e.g. Glam Studio's own frame/gallery views were not checked in this session).
5. If prompt-editing coverage is the next priority, audit `StoryboardEditor.tsx`'s per-shot "Generate frame" flow against `UniversalGenerationPanel.tsx`'s existing prompt-breakdown UI and decide whether to reuse `UniversalGenerationPanel` there instead of the shot editor's own generation call, to avoid duplicating prompt-composition logic.
