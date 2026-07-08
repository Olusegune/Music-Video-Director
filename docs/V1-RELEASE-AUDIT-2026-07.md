# Director Studio — Version 1.0 Release Audit & Codex Implementation Plan

Audited 2026-07-08. Basis: `main` @ `d1f4926` **plus 24 uncommitted working-tree files** (in-flight UX-cohesion work order). Verified during audit: `npm run check` (typecheck + vitest) passes **including** the uncommitted changes. Report only — no changes made.

---

## 1. Executive Summary

Director Studio is closer to shippable than most projects that ask this question. The last two weeks of work landed nearly everything from the prior audits: studio-nested navigation with `navModel`, dashboard visual cards, compact readiness-driven splash, lazy-loaded studios, Prettier, a versioned storage layer with migrations, a test foundation (8 test files + campaign/web export regression fixtures), rewritten Help content with Magic Mode correctly scoped to Music Video Director, and Templates mapped into the MV group. The platform systems (guided flow, deliverables, SeedContext, Brand DNA, provider router with local mode) are coherent and genuinely connected — Campaign → Glam/Web handoffs verifiably work through fixtures.

What stands between this codebase and a **commercial** 1.0 is not features. It is four things:

1. **Identity schizophrenia in the release artifacts.** The product is "Director Studio" but the bundle identifier is `ai.wheelbarrow.motionforge`, the package is `wheelbarrow-motionforge`, installers are named `Wheelbarrow MotionForge_0.1.0_x64-setup.exe`, README documents the old name, and stale `dist-portable/` folders with three different old-brand namings sit in the project root. A paying customer's first touchpoint (the installer filename) currently contradicts the product.
2. **Version 0.1.0 everywhere** with no version display in-app, no release notes, no tag, no signing plan, and no update story — the release *process* doesn't exist yet.
3. **Unfinished consolidation:** 24 uncommitted files mid-work-order; the legacy `DirectorWizard` still ships beside Guided Flow V2 behind a flag; `GlamStudio.tsx` is still 1,361 lines despite its `features/` split being started; docs folder contains superseded specs presented as current.
4. **No end-to-end release verification pass has ever been run as a checklist** — packaged-build smoke of all five studios, fresh-profile first run, data migration from a previous install, 800×600 layout, light theme.

**Verdict: Conditional GO.** No architectural rework is needed. The Directions for Codex (§7) is a finishing plan, not a fixing plan: roughly 6 phases, most of it mechanical, with the MV manual smoke and a formal packaged-build checklist as the gates. Realistic effort: 1–2 weeks of Codex work + your art/copy sign-offs.

## 2. Critical Issues (release blockers)

**C1 — Brand/identity mismatch across release artifacts.** `tauri.conf.json`: productName "Director Studio" but `identifier: ai.wheelbarrow.motionforge`, version 0.1.0; `package.json` name `wheelbarrow-motionforge`; installer/MSI filenames derive from old naming (README §70–71 documents "Wheelbarrow MotionForge" paths); window title, EXE name, install directory, and Add/Remove Programs entry must all be verified as "Director Studio". Note: the *identifier* change has a consequence — a new identifier means Windows treats it as a different app (fresh appdata dir); since user data lives in localStorage under the WebView2 profile keyed by identifier, **changing the identifier orphans existing users' data**. Decision required: keep the identifier as-is (invisible to users, safest) and fix only the visible names — recommended — or change it and ship a one-time data-migration import. Decide explicitly; do not let Codex change it casually.
**C2 — Uncommitted work-in-progress.** 24 modified/untracked files (help content extraction, Brand Kit editor, MagicOutput, nav tweaks). Nothing ships until the working tree is clean, committed in reviewed slices, and `check` + MV smoke pass on the committed state.
**C3 — Dual wizard still shipping.** `guidedFlowV2` flag keeps legacy `DirectorWizard` (820 lines) + old paths in the bundle with a Settings opt-out. For 1.0: V2 is the product; delete the flag, the setting, and the legacy wizard. Shipping two onboarding flows is a support nightmare.
**C4 — No release process artifacts.** No version bump ritual, no in-app version/about surface verified, no release notes, no git tag, no signing decision (unsigned EXEs trigger SmartScreen "unrecognized app" warnings — for paying customers you need at minimum an OV/EV code-signing certificate decision documented, even if v1.0 ships unsigned with a known-issue note), no backup snapshot.
**C5 — No formal packaged-build acceptance run.** The msi/nsis targets are configured and icons exist, but there is no evidence of a full checklist pass on the installed app (vs dev). Must include: fresh-profile first run (welcome → dashboard), all five studios open and complete one flow each in local mode, upgrade-in-place over a previous install preserving data (storage migrations!), 800×600 + maximized, light + dark themes, offline behavior.

## 3. Medium-Priority Issues

**M1 — Glam decomposition half-done:** `features/{intake,looks,hero,pack,export}` folders exist but `GlamStudio.tsx` is still 1,361 lines. Finish the extraction (mechanical, behavior-preserving) or explicitly defer post-1.0 — don't ship it half-migrated where the next fix touches both layouts.
**M2 — Docs folder misleads future agents:** `DIRECTOR-STUDIO-MODULES-SPEC.md` and the addendum contain superseded decisions (platform-wide Magic branding, Templates-in-Tools, old StudioMode semantics) alongside current ones; STATUS.md last-updated 2026-07-07. Add a `docs/README.md` index declaring which docs are living vs historical, move superseded specs to `docs/archive/`, refresh STATUS.md at release.
**M3 — Repo hygiene for a "production-ready repository":** stale `dist/` and `dist-portable/` trees (three old-brand variants) in the project root; confirm `.gitignore` covers build outputs; `src-tauri/target/` obviously untracked; remove committed build artifacts if any.
**M4 — Test coverage is a foundation, not a net:** 8 test files cover the right pure cores, but zero coverage on: storage migrations (the riskiest code for upgrades), deliverables/SeedContext round-trip (there are fixtures for campaign export — extend), loop engine, MV libs (songBrain/mvDirector — the flagship has no tests at all). Minimum bar for 1.0: migration tests + one MV pure-logic test file.
**M5 — Monoliths in the flagship:** ShotRow (1,098), MvDirector (1,014), TimelineView (925). Accept for 1.0 (they work; refactor risk > reward this close to release) but record as known technical debt in STATUS.md — do not let Codex "clean these up" during release prep.
**M6 — Error surfacing audit incomplete:** storage layer now surfaces failures, but the repo-wide bare `catch {}` sweep from the earlier review was never done; at minimum audit IPC (`ipc.ts`, 710 lines) and provider-call paths so a failed generation never dies silently in a paid product.
**M8 — Script Studio is shared-but-unwired (added 2026-07-08).** Code verdict: its analysis engine (`platform/lib/scriptAnalysis.ts`) writes characters/locations/props into the shared Bibles (platform-correct), but its only consumers are MV (`songBrain.ts`, MV guided flows); Motion Studio keeps its own separate script field; the standalone view reads as an orphaned admin screen (empty editor, mis-placed empty state, no indication where results go). Fix for 1.0: (a) move the nav entry from Tools → Production Library (`scripts` stays ModuleId `null`), scope line "Feeds your Bibles — used by all studios"; (b) wire MV explicitly: cross-link from the MV lyrics step / Song Studio ("Deep-analyze in Script Studio"), and "Send to Cast" action on extracted characters when an MV production is active; (c) apply the standard ModuleHeader + centered art-directed empty state, and make the analyze→Bibles→studios pipeline visible in the UI. The audio/lyrics split stays as-is: music file → Song Studio; text → Script Studio; both feed Direct.

**M7 — First-run experience on a truly fresh machine:** welcome → dashboard → "no API keys" state must read as a feature (local mode as the honest default: "works offline, add keys to unlock cloud providers"), not as an error state. Verify copy and the API-keys empty state specifically.

## 4. Low-Priority Polish Items

**L1** Consistent hover/focus states pass on the new visual cards (keyboard focus rings on ProjectCard/PickCard).
**L2** Light-theme QA — the app is designed dark-first; every new visual-layer component needs one light-mode look.
**L3** Window state memory (size/position/maximized restore) — small Tauri nicety users notice.
**L4** In-app About: version, license line, credits, link to help — verify it exists and reads the real version from Tauri config.
**L5** Icon set: confirm the generated ICO renders crisply at 16px (taskbar) — regenerated sets often ship a blurry 16px.
**L6** Export locations: all ZIP/file exports should default to a user-visible folder (Downloads or a chosen dir), never the app dir; verify each of the 6+ export paths.
**L7** Global search results include module prefixes everywhere (was specced; verify after the in-flight commit).
**L8** Keyboard shortcut help surface (Ctrl+K exists; a "?" shortcut sheet is cheap and expected in pro tools).

## 5. Recommended Improvements (explicitly post-1.0 — record, don't do)

MV monolith decomposition (M5) · deeper Glam/Web/Campaign V1 features from the module spec (product film, multi-page sites, calendar) · auto-update mechanism (Tauri updater) · crash/error telemetry (opt-in) · project-level backup/restore UI · cross-studio template browser on Dashboard · performance profiling pass (no user-reported issues; lazy-loading landed; don't optimize blind).

## 6. Release Readiness Assessment

| Area | State |
|---|---|
| Architecture | ✅ Sound; platform/apps boundary held; no rework needed |
| Functional connectivity | ✅ Verified via fixtures + code paths (Campaign→Glam/Web seeds, deliverables registry, provider router incl. local mode); needs one human end-to-end pass |
| Navigation/IA | ✅ Landed (navModel, nested MV group, Templates scoped) — pending in-flight commit |
| Help/docs | ✅ Rewritten & scoped correctly; docs-folder hygiene pending (M2) |
| Visual cohesion | 🟡 Much improved (visual cards, splash, empty states); light theme + focus states unverified (L1/L2) |
| Tests/quality gates | 🟡 Foundation in place; migrations + MV untested (M4) |
| Windows packaging | 🔴 Configured but never formally verified; branding mismatch (C1); no signing/version/release-notes process (C4) |
| Release deliverables | 🔴 Do not exist yet (backup, release folder, manifest) |

**Overall: Conditional GO — ship after the §7 plan completes and both gates (MV smoke + packaged checklist) pass.**

---

## 7. Directions for Codex — V1.0 Release Preparation

Execute phases in order. Rules for the whole engagement: no new features; no refactors beyond those named; `npm run check` green at every commit; MV manual smoke (song → direct → cast → choreography → timeline → export) after phases 1, 2, and 5; never change data shapes without a storage-version migration; ask before anything destructive.

**Phase 0 — Safety net.**
Create the full project backup BEFORE anything else: copy the entire working tree (including uncommitted changes, excluding `node_modules/`, `src-tauri/target/`, `dist*/`) to `Backup/DirectorStudio-pre-1.0-src-<date>.zip` in the release directory structure below, plus a git bundle (`git bundle create Backup/repo-<date>.bundle --all`). Verify the zip opens and the bundle clones.

**Phase 1 — Land the in-flight work.**
Review the 24 modified/untracked files; commit them in coherent slices (help content extraction; Brand Kit visual editor; MagicOutput premiere; nav/label sweeps). Where a file is half-done, finish it to its work-order spec (docs/UX-COHESION-REVIEW-2026-07.md §6) or cleanly revert it — nothing half-in. Gate: check + MV smoke.

**Phase 2 — Consolidation.**
(a) Delete the `guidedFlowV2` flag: V2 becomes the only path; remove the Settings toggle, `DirectorWizard.tsx`, and dead `MagicDirect` branches it exclusively served; migrate/discard any persisted legacy flow drafts. (b) Finish the Glam extraction: move remaining logic from `GlamStudio.tsx` into its existing `features/*` folders until the root file is a thin composition (<200 lines); behavior-preserving, no UI changes. (c) Repo-wide silent-failure audit on `ipc.ts` and provider call paths: every catch either surfaces a toast/log or has a comment justifying silence. (d) Script Studio re-home + wiring per M8: nav entry Tools → Production Library with scope line; MV lyrics step / Song Studio cross-link into Script Studio; "Send to Cast" on extracted characters when an MV production is active; ModuleHeader + centered empty state on the Script Studio screen; update Help article and navModel test accordingly.

**Phase 3 — Identity & branding (get explicit sign-off on 3a before executing).**
(a) DECISION POINT — present to the owner, do not choose unilaterally: keep `identifier: ai.wheelbarrow.motionforge` (recommended: invisible to users, preserves existing users' WebView2 data) or change to `ai.wheelbarrow.directorstudio` + write a data-migration/import path. (b) Rename everything visible: `package.json` name → `director-studio`, productName/window title/EXE/installer display name/Add-Remove-Programs entry → "Director Studio"; keep "by Wheelbarrow Studios" as the publisher string. (c) Rewrite `README.md` for the new name and current architecture (build commands, artifact paths). (d) Delete stale `dist/` and `dist-portable/` old-brand trees from the project root (they're in the backup); ensure `.gitignore` covers `dist*`, `src-tauri/target`. (e) Verify icon set incl. 16px crispness; regenerate if blurry.

**Phase 4 — Version & release process.**
(a) Bump version to `1.0.0` in `package.json`, `tauri.conf.json`, `Cargo.toml`. (b) Ensure an About surface (Settings → About) shows app name, version (read from Tauri, not hardcoded), publisher, and a Help link. (c) Write `RELEASE-NOTES-1.0.md` (features by studio, known issues from this audit's M5/M6 leftovers, system requirements: Windows 10/11 x64 + WebView2). (d) Add the two missing test areas: storage-migration tests (fresh install, v-1 upgrade, corrupted payload) and one MV pure-logic test file (songBrain section parsing or mvDirector shot planning). (e) Document the signing decision in RELEASE-NOTES and docs/STATUS.md: if unsigned, note the SmartScreen behavior and the "More info → Run anyway" instruction in a `Release Notes/INSTALL.md`.

**Phase 5 — Docs & repo hygiene.**
(a) Create `docs/README.md` index: living docs (STATUS, ARCHITECTURE, DECISIONS, this audit) vs historical specs; move superseded planning docs (`DIRECTOR-STUDIO-MODULES-SPEC.md`, `GUIDED-FLOW-AND-SPLASH-ADDENDUM.md`, earlier reviews) into `docs/archive/2026-07-planning/` with a superseded-by header line each. (b) Refresh `STATUS.md`: shipped list current, known-issues section = M5 + M6 residue + anything found in Phase 6. (c) Verify Help Center articles one final time against the shipped UI (labels, nested nav phrasing, no Magic outside MV) — fix drift.

**Phase 6 — Build, verify, package.**
(a) Produce release builds: `npm run tauri build` → NSIS setup EXE + MSI; assemble the portable variant (existing script/pattern in `scripts/` and prior dist-portable layout — recreate under the new name: EXE + `data/` + `portable.txt` + README.txt). (b) Run the FULL packaged acceptance checklist and record results in the manifest: fresh-profile first run (splash → welcome → dashboard); each of the five studios completes one production in local router mode end-to-end incl. export to a user-visible folder; upgrade-in-place over a previous build preserving projects/assets (storage migrations fire correctly); 800×600 and maximized; light and dark themes; offline (no network) session; Help deep links; Ctrl+K search; undo/redo; window close/reopen state. (c) Fix only what the checklist fails; re-run until clean.

**Phase 7 — Release assembly & manifest.**
Create the release directory (outside the repo, e.g. sibling folder):
```
DirectorStudio-Release-1.0.0/
├── Release/
│   ├── DirectorStudio_1.0.0_x64-setup.exe      (NSIS installer)
│   ├── DirectorStudio_1.0.0_x64_en-US.msi
│   ├── Portable/DirectorStudio-1.0.0-Portable/  (exe + data/ + portable.txt + README)
│   └── Release Notes/  (RELEASE-NOTES-1.0.md, INSTALL.md)
├── Source/DirectorStudio-1.0.0-src.zip          (clean tree @ release tag, no node_modules/target)
├── Backup/                                       (Phase 0 pre-release backup + git bundle)
├── Documentation/                                (docs/ snapshot: STATUS, ARCHITECTURE, audit, Help export)
└── Assets/                                       (icon source, splash art, store/marketing images)
```
Tag the release commit `v1.0.0`. Then write `RELEASE-MANIFEST.md` at the release-folder root containing: build/version number and date; git commit hash + tag; absolute path of every deliverable above; SHA-256 of the installer, MSI, and portable ZIP; the Phase 6 checklist with pass/fail per item; environment used to build (OS, Node, Rust, Tauri CLI versions); signing status; and the outstanding known-issues list. **The manifest is the final deliverable — if a path in it doesn't exist or a checklist row isn't recorded, the release is not done.**

**Acceptance criteria for the whole engagement:**
1. Working tree clean at tag `v1.0.0`; `npm run check` green; version 1.0.0 consistent across package.json/tauri.conf/Cargo.toml/About screen.
2. Zero user-visible "MotionForge"/"Wheelbarrow MotionForge" strings in the app, installer UI, filenames, or README (publisher credit excepted); identifier decision documented and signed off.
3. One guided flow implementation; DirectorWizard and its flag gone; Glam root component <200 lines with behavior unchanged.
4. Storage-migration and MV logic tests exist and pass; upgrade-in-place verified on a real previous build.
5. Full packaged acceptance checklist recorded with all rows passing, on the actual installer artifacts.
6. Release folder populated exactly as specced; backup verified restorable; RELEASE-MANIFEST.md complete with hashes, paths, checklist results, and known issues.

**Compact Codex prompt:**
> Prepare Director Studio for its commercial 1.0 Windows release by executing `docs/V1-RELEASE-AUDIT-2026-07.md` §7 phases 0–7 in order. Phase 0 first: full source backup + git bundle before touching anything. Then: land the 24 in-flight working-tree files in reviewed commits; delete the guidedFlowV2 flag and legacy DirectorWizard; finish the Glam features/ extraction (root <200 lines, behavior-preserving); audit silent catches in ipc.ts/provider paths; re-home and wire Script Studio per M8 (nav → Production Library, MV lyrics/Song Studio cross-links, Send-to-Cast, proper header + empty state); execute the branding rename to Director Studio everywhere user-visible (STOP and ask before changing the bundle identifier — present the data-loss tradeoff); bump to 1.0.0 with About screen, release notes, storage-migration + MV logic tests, and a documented signing decision; archive superseded docs and refresh STATUS.md and Help; build NSIS/MSI/portable artifacts and run the full packaged acceptance checklist (fresh install, all five studios end-to-end in local mode, upgrade-in-place data preservation, 800×600/maximized, light/dark, offline); assemble the DirectorStudio-Release-1.0.0 folder and finish with RELEASE-MANIFEST.md (version, commit+tag v1.0.0, every artifact path, SHA-256 hashes, checklist results, build environment, signing status, known issues). Rules: no new features, no refactors beyond those named, `npm run check` green every commit, MV manual smoke after phases 1/2/5, no data-shape changes without storage migrations, ask before destructive actions. The engagement is complete only when every §7 acceptance criterion is met and every path in the manifest exists.
