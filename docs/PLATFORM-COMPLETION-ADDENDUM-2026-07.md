# Director Studio — Platform Completion Addendum (Mode Cards + Parity Push)

Prepared 2026-07-09. Amends `docs/PLATFORM-CONSISTENCY-AUDIT-2026-07.md`. Planning + handover — Codex executes.

## What this brief adds vs. what's already planned

The "make every module a first-class citizen" brief is ~90% the existing five-phase platform program (GenerationSpec → ProjectHub → References/PromptStudio → visual-first Bibles/amenities → evenness sweep). Do **not** re-plan those; they stand. This addendum records the **three genuinely new/sharpened requirements** and folds them into the existing phases so nothing is planned twice.

### NEW-1 — Premium Mode Cards (net-new; highest-visibility, lowest-risk)
Replaces the text-only Director/Studio/Creator selector with visual cards using supplied artwork.
- **Assets staged**: `src/assets/modes/{director,studio,creator}.png` (⚠ ~2MB each — Codex must downscale to ~800px-wide WebP/optimized PNG before bundling; raw 2MB×3 in the bundle is unacceptable for a desktop app splash-path).
- **One shared component** `platform/components/layout/ModeCard.tsx` + `ModeSwitcher.tsx`, consumed **everywhere** the mode is chosen — Sidebar, and the four modules that currently re-declare `STUDIO_MODES` inline (Campaign, Glam workspace, Motion, Web). This kills a real duplication (5 call sites) while delivering the visual upgrade.
- Card content (copy locked by the brief): **Director** — "One visionary directing a cinematic production." **Studio** — "A professional creative team bringing the vision to life." **Creator** — "A master creator orchestrating an entire creative universe."
- Behavior: clickable, subtle hover lift/scale (150–250ms, matches the restraint rule — no bounce), selected state ring, keyboard-focusable, artwork with a dark gradient scrim so white label text stays legible. Full-size cards in a mode picker (e.g. a popover or a dedicated strip); the compact pill stays as the always-visible sidebar affordance that opens the card picker. Cascades identically across all five modules — same component, same art, same copy.

### NEW-2 — Image generation depth: editing/inpaint/outpaint/variations (extends Phase 3)
The brief asks for inpainting, outpainting, variations, and edit workflows on top of the reference system. These are **capability flags on the model registry + spec fields**, surfaced in the shared generation UI where the provider supports them — not per-module code. Add to Phase 3 scope: `GenerationSpec.operation: "generate" | "edit" | "inpaint" | "outpaint" | "variation"`, mask input for inpaint, and honest capability-gating (badge/hide when the routed model can't do it). Character/Product Sheet and Look-Dev/Moodboard flows already exist in pieces (Image Studio, Glam) — they become presets over this, not new engines.

### NEW-3 — Parity is the acceptance bar, not a nice-to-have (sharpens Phase 5)
The success metric ("no module feels less complete than MV") becomes an explicit gate: every module must expose the **same generation surface** (ModelSelector, ReferenceTray, Creator-mode seed/negative/batch/CFG, PromptStudio drawer) wherever it generates. Phase 5 adds a written parity checklist (§ below) that must pass before 1.5.0 ships.

## Corrected status going in (from the last audit)

Phase 1 is ~80%. **Close these before anything new** (unchanged from prior report): (a) adopt `moduleManifest.ts` (built, used by nobody), (b) fallback auto-advance **with notification** on provider failure, (c) MV registers outputs in the deliverables registry, (d) Rust adapters actually pass seed/negative/batch to providers (today they stop at TS), (e) tag `v1.1.0`. Also standing: confirm the bundle-identifier change (`ai.wheelbarrow.directorstudio`) is safe — if any 1.0.0 users exist, their data is orphaned without an import path.

## Revised phase map (only deltas shown)

- **Phase 1-finish** (do first): items a–e above.
- **Phase 1.5 — Mode Cards** (NEW-1): small, ship it right after Phase 1-finish as its own visible win (v1.1.x). Independent of the heavier phases.
- **Phase 2 — ProjectHub**: unchanged (Save/Save As/Open/Recent/Autosave/Snapshots/Recovery via adapters; DirectorProject umbrella; Campaign retrofit). This is the brief's "SAVE/PROJECT SYSTEM — currently missing" section in full.
- **Phase 3 — References + PromptStudio + image-edit ops** (NEW-2 folded in).
- **Phase 4 — Visual-first Character/World/Prop Bibles + NotificationCenter + shortcuts**: unchanged; directly answers the brief's Character Bible redesign.
- **Phase 5 — Evenness sweep + parity gate** (NEW-3): Motion export completion, shared ProjectHome, GenerateBar-everywhere audit, terminology glossary, and the parity checklist below.

## Parity checklist (Phase 5 gate — every module must pass)
For Glam, Motion, Web, Campaign, measured against MV as reference:
1. Mode cards present and identical (Phase 1.5). 2. ModelSelector on every generation surface. 3. ReferenceTray where the capability is declared. 4. Creator mode exposes seed/negative/batch/CFG/provider. 5. PromptStudio drawer (history/templates/variables) available. 6. Save/Save As/Open/Recent/Snapshots via ProjectHub. 7. Deliverables registered + shown as visual cards. 8. Art-directed empty state + consistent ModuleHeader + always-visible GenerateBar. 9. Export through Export Center. 10. No inline `STUDIO_MODES` or bespoke generation UI remaining. Any ⚠ is a release blocker or an explicitly recorded STATUS.md deferral.

---

## Consolidated Codex prompt

> You are Codex in the Director Studio repo. Continue the platform program in `docs/PLATFORM-CONSISTENCY-AUDIT-2026-07.md` as amended by `docs/PLATFORM-COMPLETION-ADDENDUM-2026-07.md`. Work in order; each phase is independently shippable, versioned, with STATUS.md + release-notes updated at its boundary. Branch from `v1.0.0` lineage; never rewrite tagged commits.
>
> **Phase 1-finish (do first):** (a) make all five modules register through `platform/lib/moduleManifest.ts` (nav/flow/appBindings driven by the manifest); (b) implement router fallback auto-advance on provider failure (auth/quota/5xx) with a user notification naming the fallback — same-model-different-aggregator before different-model; (c) Music Video Director registers its primary outputs (treatment, renders, packs) in `platform/lib/deliverables.ts` with thumbnails; (d) extend the Rust provider adapters to actually pass seed/negativePrompt/batch/resolution where the provider API supports them, capability-flagged in `modelRegistry.ts`, badge-and-ignore otherwise; (e) after `npm run check` + MV manual smoke pass, tag `v1.1.0`. Before touching the bundle identifier further, confirm with the owner whether any 1.0.0 installs exist.
>
> **Phase 1.5 — Mode Cards:** Build `platform/components/layout/ModeCard.tsx` + `ModeSwitcher.tsx` using the staged art in `src/assets/modes/` (FIRST downscale each to ~800px optimized WebP/PNG — the 2MB originals must not ship). Cards: Director/Studio/Creator with the locked copy from the addendum, dark gradient scrim for legibility, clickable, 150–250ms hover lift, selected ring, keyboard-focusable. Replace the text-only selector in the Sidebar AND the four inline `STUDIO_MODES` selectors in Campaign, Glam workspace, Motion, and Web with this one component — identical art and copy across all five modules. The compact sidebar pill opens the card picker. Ship as v1.1.x.
>
> **Phases 2–5:** Execute exactly as specified in the platform audit §11–12, with these amendments: Phase 3 also adds `GenerationSpec.operation` (generate/edit/inpaint/outpaint/variation + mask input) surfaced only where the routed model supports it, with Character/Product Sheet and Look-Dev/Moodboard as presets over it; Phase 5 must pass the Parity Checklist in the addendum (all 10 items, every module) before v1.5.0 — any gap is a blocker or a recorded STATUS.md deferral.
>
> **Standing rules:** MV timeline/choreography/song-brain, Web compiler, Glam compositor, Campaign plan-generator stay module-specific. Director Mode shows zero prompt/model/provider/seed jargon. Local router mode fully works after every phase. No data-shape change without a storage migration + upgrade test from the prior shipped version; re-run packaged upgrade-in-place at each phase end. No new heavy deps. `npm run check` green per commit; MV manual smoke each phase end. Each phase must end with its user-visible win working: 1-finish = a failed generation is auto-rescued; 1.5 = premium mode cards everywhere; 2 = Save As/Recent/snapshots in every studio; 3 = reference tray + prompt history + image editing on every surface; 4 = a character created from a face, not a form; 5 = no module feels less finished than Music Video Director.
