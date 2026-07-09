# Director Studio — Platform Consistency Audit & Capability Inheritance Plan

Audited 2026-07-08 against the working tree (post-IA-restructure). Planning only — no code.
Reference implementation: Music Video Director. Companion docs: `V1-RELEASE-AUDIT-2026-07.md` (release prep), `PRODUCT-CODE-UX-REVIEW-2026-07.md`.

**Sequencing ruling (CPO hat, stated up front):** this is the **post-1.0 platform program (v1.1–v1.5)**. Almost nothing here should preempt the release plan already in motion — shipping 1.0 on the current architecture is correct, because the platform bones this audit builds on (router, model registry, guided flow, deliverables, storage) are already sound. The exception: two items below are flagged **[pre-1.0]** because they're cheap and prevent shipping inconsistencies that will be visible to paying customers on day one.

---

## 1. Platform Consistency Report (executive)

**The honest headline: Director Studio is further along as a platform than the mission brief assumes.** Verified in code: the AI Provider Router already models 16+ providers as data (gemini, openai, gpt_image, fal, kie, wavespeed, nano_banana/pro, stability, recraft, midjourney, runway, kling, luma, pika, google imagen/veo, grok) with aggregator routing (Kie/WaveSpeed/fal expose underlying models), capability tags, router modes incl. local, runtime provider registration, and keychain-held keys. Guided Flow, StudioMode, Brand DNA, deliverables, SeedContext, storage-with-migrations, undo, search, help, theme — all platform, all consumed by every module. That is Creative-Cloud-shaped plumbing.

**Where the platform illusion actually breaks — the five real gaps, in priority order:**

1. **Generation capability is not a contract.** MV and the Bibles generate through the rich `GenerationPanel` (740 lines: model pick, aspect, size…); Glam generates through its own loop path; Motion/Web/Campaign generate through bespoke calls. There is **no shared `GenerationSpec`** — and **seeds, negative prompts, batch size, and resolution controls exist nowhere** (verified: no `seed`/`negativePrompt`/batch in `imageGen.ts`/`videoGen.ts`). Creator Mode promises technical control the platform can't express.
2. **Projects are five silos.** Platform projects live behind the Rust `api.listProjects`; Motion, Glam, Web, and Campaign each keep their own localStorage project stores with their own save/list/delete. Consequences: Recent/Open/Save As/snapshots/recovery behave differently (or don't exist) per module; the Campaign "contains everything" model is faked through deliverable links instead of containment; global search and Dashboard must know five schemas.
3. **References are per-entity images, not a system.** `refs.ts` is a 45-line src-resolver; Bible entities hold reference image lists; Glam captures product photos. There are no reference categories (style/pose/lighting/product/scene), no strength, no cross-module reference picker, no Omni-Reference concept.
4. **Prompt tooling is doctors, not a studio.** `promptTools.ts` (231 lines) has fix/cinematic/surgeon utilities; MV exposes some prompt editing; but there's no prompt history, versioning, comparison, templates/variables, or a Creator-Mode prompt inspector that works identically in every module.
5. **Character creation is form-first.** `CharacterBible.tsx` (708 lines) opens with field stacks; the visual pipeline (generate → refine → detail) exists in pieces (Image Studio, sheets, DNA) but isn't the front door.

Everything else the mission lists (Save/autosave/snapshots/recovery/undo/search/help/theme/notifications/shortcuts/export) exists at platform level today; the gaps are **evenness of adoption**, catalogued in §10.

## 2. Director Studio Core — improvements

Additions/changes to `src/platform/`, each designed once and inherited:

- **`generationSpec.ts` [cornerstone]** — one typed request for all media generation: `{ capability: image|video|audio|text, prompt, negativePrompt?, seed?, batch?, aspect?, resolution?, references: Ref[], modelHint?, providerPref?, moduleId, projectRef }`. `imageGen`/`videoGen` accept only this. Router resolves spec→(provider, model) with **fallback chains** (see §5). Every module's generate call goes through it — this single type is what makes "identical capabilities everywhere" true instead of aspirational.
- **`projectHub.ts`** — unified project index (see §6).
- **`referenceSystem.ts`** — see §9.
- **`promptStudio.ts` + drawer component** — see §8.
- **Notifications**: promote toast to a small notification center (generation finished while you were in another studio → clickable entry). Cheap, high platform-feel.
- **Keyboard shortcuts**: central registry (currently one hook) with a per-module contribution API + the "?" overlay.
- **Export Center**: already exists as a view; make it read the deliverables registry for *all* modules (today modules export locally from their own screens — keep those, but Export Center becomes the union).

## 3. Capability Inheritance architecture

Reject the tempting version: a heavyweight plugin framework with dynamic capability discovery. Five first-party modules don't need it; it would be architecture theater. Instead, **inheritance = contracts + composition**, three pieces:

1. **`ModuleManifest`** (`platform/lib/moduleManifest.ts`): each module registers `{ id, label, icon, color, flowDefinition, projectAdapter, capabilities: { image?, video?, audio?, text? }, exportKinds, searchProvider?, helpArticles }` at init (extends today's `appBindings`/flow registry/navModel trio into one declaration). The shell (nav, dashboard, search, export center, help) renders *entirely* from manifests. A new module = one manifest + its screens; everything platform lights up automatically.
2. **Capability contracts**: a module that declares `capabilities.image` must route through `GenerationSpec` — and in return automatically gets: model selector UI, reference picker, prompt studio drawer, loop engine, seeds/negative/batch in Creator Mode, reveal treatment, deliverable registration, export wiring. The contract is enforced socially + by lint (no direct `imageGen` imports outside platform).
3. **StudioMode as the disclosure law** (already ratified): Director = zero jargon; Studio = creative controls; Creator = GenerationSpec fully exposed. Platform components implement the gating once; modules never write their own mode conditionals for generation UI.

**Challenge to the brief:** "every module exposes identical capabilities" is wrong at the edges — negative prompts are meaningless for Web Studio copy; music models are meaningless in Glam. The correct invariant: **identical capability *surfaces* wherever a capability is declared** — same picker, same drawer, same controls, same vocabulary. Uniform grammar, not uniform feature list.

## 4. Shared component roadmap

Build in this order (each unblocks module adoption): `ModelSelector` (reads modelRegistry; per-capability; shows aggregator choices + "also available via…") → `ReferenceTray` (see §9) → `PromptStudioDrawer` (§8) → `GenerateBar` (the one primary-action pattern: big, fixed position in workbench + flow steps, disabled-with-reason states — answers the "hidden generate buttons" audit finding) → `NotificationCenter` → `ProjectHome` template (per-module home: resume card, recent grid, Start Magic Flow hero — kills the remaining per-module home divergence). Existing visual layer (ProjectCard/RevealStage/ModuleHeader…) already covers the rest.

## 5. AI Provider Router improvements

The registry is already data-driven; improvements are routing behavior, not catalog rewrites:

- **Fallback chains [priority]**: per capability, an ordered candidate list derived from router mode + configured keys; on provider failure (quota/auth/5xx) auto-advance with a notification ("Kie failed → fell back to WaveSpeed"). Today failure = error toast, retry is manual.
- **Same-model-many-providers**: the registry already models aggregators exposing underlying models (GPT Image via WaveSpeed/Kie/fal). Add: user preference per model ("GPT Image → prefer WaveSpeed"), price/speed hints in the picker, and fallback across aggregators for the *same* model before falling back to a different model.
- **Catalog additions as data**: Seedance, Ideogram, Kling Omni, Replicate (as aggregator), Anthropic (text/reasoning). Verify Ideogram/Seedance entries exist; add missing ones. No code paths — registry entries + Rust adapter where a new HTTP shape is required.
- **[pre-1.0]** Audit that every module's generate path respects `manual` and `local` modes (spot-checks suggest yes; make it a test).
- Model health/latency memory (rolling success rate per provider) feeding `auto` mode — v1.2+.

## 6. Save/Open architecture (professional desktop software)

**Unify the index, not the payloads.** Don't force five module schemas into one blob — that's a rewrite with no user benefit. Instead:

- **`projectHub.ts`**: every module's `projectAdapter` (manifest) exposes `{ list(), open(id), create(), duplicate(id), delete(id), thumb(id), snapshot(id)?, restore(id, snap)? }` over its existing store. The Hub provides the platform surface: **Recent (cross-module), Open dialog, Save As (= duplicate + rename), autosave status line, snapshots timeline, recovery**. Modules keep owning their data shapes; the Hub owns the UX. This turns "professional Save/Open everywhere" into five thin adapters instead of five migrations.
- **Cross-module containment**: a `DirectorProject` (umbrella) record: `{ id, name, brandDnaId?, members: ProjectRef[] }` where `ProjectRef = { moduleId, moduleProjectId }`. Campaign Studio's campaign *is* a DirectorProject with extras — retrofit it as the first consumer rather than inventing a parallel concept. Dashboard groups by umbrella when present.
- **Snapshots/versions**: platform `snapshots.ts` exists — route it through the adapter so Motion/Glam/Web/Campaign projects get snapshot/restore like MV productions do.
- File-on-disk project bundles (export/import a whole project as `.dsproj` zip) — v1.2; enables real backup/share and is mostly the existing pack machinery.

## 7. Character Bible redesign (visual-first, progressive)

Flow becomes: **(1) Spark** — one field (name or one-liner) + optional reference drop + archetype chips → **(2) Card** — generate 4 portrait candidates (GenerationSpec + character refs), pick one → the Character Card exists (portrait, name, one-line essence) and is immediately usable everywhere → **(3) Profile** — AI drafts personality/backstory/relationships as editable cards (ReviewGate pattern, not fields) → **(4) Details** — today's full form as Studio-mode disclosure sections → **(5) Creator** — DNA/prompt/seed inspection. Key moves: the current 708-line form becomes stage 4, not the entrance; sheets/Image Studio become stage 2's engine; `characterDna` unchanged underneath. Same pattern then applies to World/Prop Bibles (cheaper: they reuse the stages). This is the flagship demo of the platform pattern: Bible entities created the way creatives think — face first, paperwork later.

## 8. Prompt Studio redesign

One platform drawer, mounted by contract wherever `capabilities.*` is declared (Creator Mode; read-only summary in Studio Mode): shows the **resolved prompt pipeline** for the current generation (system/DNA-injected context → module template → user positive → negative), each layer inspectable; edits override per-generation or save back to the module template. Plus: **prompt history** (per project, with the GenerationSpec + result thumb — replays as "regenerate with this"), **A/B compare** (two prompts → side-by-side loop round), **templates & variables** (`{product}`, `{look}`, `{character}` resolved from project context — this is Prompt DNA), versioning via the existing storage layer. Explicitly *not* a separate app/screen: it's a drawer over every generation surface, or it will become a sixth silo.

## 9. Reference Image architecture

`referenceSystem.ts` + `ReferenceTray` component: a `Reference = { id, url/path, category: character|style|product|scene|pose|lighting|color, strength: 0–1, sourceEntity? (bible link), projectScope }`. Tray appears in every generation surface (contract); pulls from Asset Library + Bibles + upload; category chips; per-reference strength where the provider supports it. **Provider mapping layer**: registry entries declare reference support (`none | single | multi | omni`) and the adapter maps categories/strength to each provider's actual API (image-prompt, IP-adapter, omni-reference…); unsupported → honest downgrade badge ("this model uses references as style hints only"). Glam's product-fidelity mode and MV's character consistency both become consumers of the same tray instead of bespoke code. **[pre-1.0]**: none of this — but keep Glam's current reference handling unrenamed so it maps cleanly later.

## 10. Module-by-module gap analysis (vs MV reference)

| Capability | MV | Motion | Glam | Web | Campaign | Verdict |
|---|---|---|---|---|---|---|
| Magic Flow (guided) | ✅ V2 | ✅ | ✅ | ✅ | ✅ | Platform ✅ done |
| StudioMode gating | ✅ | ✅ | ✅ | ✅ | ✅ | Platform ✅ done |
| Rich generation UI (model/aspect/size) | ✅ GenerationPanel | ⚠️ partial | ⚠️ own loop path | ⚠️ media slots | ⚠️ via Glam libs | → **GenerationSpec + ModelSelector (platform)** |
| Seeds/negative/batch | ❌ | ❌ | ❌ | ❌ | ❌ | → platform (nobody has it — build once) |
| References | ✅ bible refs | ❌ | ⚠️ product photos | ⚠️ imagery slots | ❌ | → **ReferenceTray (platform)** |
| Prompt inspection/history | ⚠️ partial | ❌ | ⚠️ prompt packs | ⚠️ local-mode prompts | ⚠️ | → **PromptStudio (platform)** |
| Project save/list/delete | ✅ Rust-backed | ✅ own store | ✅ own store | ✅ own store | ✅ own store | → **ProjectHub adapters (platform index)** |
| Save As / duplicate | ⚠️ | ❌ | ❌ | ⚠️ | ❌ | → ProjectHub |
| Snapshots/recovery | ✅ (+SessionGuard) | ❌ | ❌ | ❌ | ❌ | → ProjectHub adapter |
| Loop engine | ⚠️ (own iteration) | ❌ | ✅ | ⚠️ copy variants | ⚠️ | → contract adoption |
| Deliverables registry | ⚠️ partial | ⚠️ | ✅ | ✅ | ✅ (owner) | MV should register its renders [pre-1.0-ish, small] |
| Export from module | ✅ | ⚠️ placeholder-ish | ✅ ZIP/PNG | ✅ site ZIP | ✅ launch kit | Motion export needs completion (module-specific) |
| Timeline/storyboard | ✅ deep | ⚠️ storyboard only | n/a | n/a | ⚠️ calendar-list | Correctly module-specific — do NOT platformize timeline |
| Undo/search/help/theme/shortcuts | ✅ | ✅ | ✅ | ✅ | ✅ | Platform ✅ done |

**Remain module-specific (deliberately):** MV timeline/choreography/song brain; Web pattern compiler; Glam format compositor; Campaign plan generator; Motion storyboard brain. These are the modules' souls — platformizing them would be the Adobe mistake of making everything a beige panel.

## 11. Codex Implementation Roadmap

- **Phase P (pre-1.0, small, slots into release-prep Phase 2):** MV registers its key outputs in the deliverables registry; router manual/local-mode conformance test; naming freeze on reference/generation call sites (no renames that fight this plan).
- **Phase 1 (v1.1) — GenerationSpec core:** `generationSpec.ts`, route `imageGen`/`videoGen` through it, add seed/negative/batch/resolution support in the Rust adapters where providers accept them, fallback chains + failure notifications, `ModelSelector` + `GenerateBar` components; adopt in Glam + Bibles (GenerationPanel refactors onto it), then Motion/Web/Campaign. Manifest v1 (`moduleManifest.ts`) folding appBindings + flow registry + navModel entries.
- **Phase 2 (v1.2) — ProjectHub:** adapters over five stores; Recent/Open/Save-As/autosave surface; snapshots via adapters; DirectorProject umbrella with Campaign retrofit; `.dsproj` export/import.
- **Phase 3 (v1.3) — References + Prompt Studio:** referenceSystem + ReferenceTray with provider mapping layer; PromptStudioDrawer with history/compare/templates; migrate Glam product-fidelity + MV character refs onto the tray.
- **Phase 4 (v1.4) — Character Bible visual-first** (§7), then World/Prop Bibles on the same stages; NotificationCenter; shortcuts registry + "?" sheet.
- **Phase 5 (v1.5) — Evenness sweep:** Motion export completion; per-module ProjectHome template; Generate-button audit fixes; terminology pass (one glossary: production/project/deliverable/look/flow).

Each phase independently shippable; order chosen so the highest-frequency user action (generate) unifies first and the riskiest migration (projects) comes only after the contract pattern is proven.

## 12. Codex prompts per phase

**Phase P (append to the current release-prep engagement):**
> Small platform-parity items inside release prep: (1) Music Video Director registers its primary outputs (directed treatment, rendered videos, exported packs) in `platform/lib/deliverables.ts` with thumbnails, like the other studios. (2) Add a vitest that asserts every module's generation path honors router modes `manual` and `local` (no network calls in local; provider choice respected in manual) — table-driven over the five modules' generate entry points. (3) Do not rename reference-image or generation call sites during release prep; `docs/PLATFORM-CONSISTENCY-AUDIT-2026-07.md` maps them to a post-1.0 architecture.

**Phase 1:**
> Implement GenerationSpec per `docs/PLATFORM-CONSISTENCY-AUDIT-2026-07.md` §2/§5/§11-P1. Create `platform/lib/generationSpec.ts` (typed spec incl. negativePrompt/seed/batch/resolution/references/modelHint/providerPref) and make `imageGen.ts`/`videoGen.ts` accept only specs; extend Rust provider adapters to pass seed/negative/batch where the provider API supports them (capability-flag in modelRegistry; ignore-with-badge otherwise). Add router fallback chains: ordered candidates per capability from mode+configured keys, auto-advance on failure with a user notification. Build `ModelSelector` and `GenerateBar` in `platform/components/generation/` (StudioMode-gated: Creator sees seed/negative/batch). Create `platform/lib/moduleManifest.ts` consolidating appBindings + flow registration + navModel metadata; register all five modules. Migrate GenerationPanel, Glam hero generation, then Motion/Web/Campaign generate paths onto the spec. No behavior change in Director mode. Tests: spec resolution, fallback advance, mode conformance. `npm run check` green per commit; MV smoke after.

**Phase 2:**
> Implement ProjectHub per §6: `platform/lib/projectHub.ts` with a `ProjectAdapter` interface; write adapters over the five existing stores (no payload schema changes); platform Recent/Open/Save-As(duplicate)/autosave-status/snapshot-restore UI consuming adapters; route `snapshots.ts` through adapters so all modules gain snapshot/restore; add `DirectorProject` umbrella records and retrofit Campaign Studio as the first consumer (campaign = umbrella + its plan); Dashboard groups by umbrella. Storage version bumps + migrations for any new records. `.dsproj` bundle export/import via existing pack machinery.

**Phase 3:**
> Implement the Reference System and Prompt Studio per §8/§9: `platform/lib/referenceSystem.ts` + `ReferenceTray` (categories, strength, bible/asset-library sources, provider support mapping `none|single|multi|omni` declared in modelRegistry, honest downgrade badges); mount by capability contract in every generation surface; migrate Glam product photos and MV/Bible character refs onto it. `PromptStudioDrawer`: resolved prompt pipeline view (system/DNA/template/user/negative layers), per-generation override or save-to-template, prompt history with result thumbs + replay, A/B compare via loop engine, `{variable}` templates resolved from project context. Creator-mode full, Studio-mode read summary, Director-mode absent.

**Phase 4:**
> Redesign Character Bible per §7 as visual-first progressive stages (Spark → generated Card → AI-drafted Profile as review cards → full details as Studio disclosure → Creator DNA/seed inspection), reusing GenerationSpec/ReferenceTray/ReviewGate/RevealStage; characterDna and existing records unchanged (migration only if a new field is required). Then apply the same staging to World and Prop Bibles. Add NotificationCenter (generation-complete entries, cross-studio clickable) and the shortcuts registry + "?" overlay.

**Phase 5:**
> Evenness sweep per §10/§11-P5: complete Motion Studio export (real deliverable + file output, not placeholder); apply the ProjectHome template to all five module homes; audit every screen for the GenerateBar pattern (primary action always visible, disabled-with-reason); terminology pass from the glossary; close any remaining gap-matrix ⚠️ cells or record them as explicit post-launch items in STATUS.md.

---

**Final challenge to the brief, so it's on record:** the mission says "think Adobe Creative Cloud." Adopt its *capability inheritance*, but reject two of its traits: (1) uniformity that flattens module character — the timeline, choreography, and site compiler must stay proudly module-specific; (2) platform work as its own product — every phase above ends with a user-visible win (fallback that saves a failed generation, Save As that finally exists, a character created from a face instead of a form). If a platform phase can't name its user-visible win, cut it.
