# Director Studio — Remaining Modules Spec Package

**Glam Studio · Web Studio · Campaign Studio**
Product Briefs + PRDs + Codex Implementation Briefs
Prepared 2026-07-07 · For Codex implementation inside this repo. No code in this document.

> **Amended by `docs/GUIDED-FLOW-AND-SPLASH-ADDENDUM.md`** — it redefines StudioMode semantics (Creator = power tier), adds the platform Guided Flow ("Magic Flow") engine to Phase 0, replaces the per-module Director-wizard/Creator-path phases with Magic Flow assembly, and specifies the splashscreen fix. Where the two documents conflict, the addendum wins.

---

## 0. Ground Truth (what Codex must assume about the repo)

Verified against the codebase as of commit `241490c`:

- **Stack:** React 19 + Vite 6 + Tailwind 4 + Zustand 5, Tauri 2 (Rust core in `src-tauri/`), TypeScript strict. Build gate: `npm run build` = `tsc --noEmit && vite build`.
- **Layout:** modules live in `src/apps/<module>/` (see `music-video/`, `motion-studio/`). Shared platform in `src/platform/` (`components/`, `features/`, `lib/`, `store/`). Shell routing is a `view === "..."` switch in `src/app/App.tsx`. Modules register into the shell via `registerAppBindings` (`src/platform/lib/appBindings.ts`).
- **AI Provider Router:** `src/platform/lib/providers.ts` — capabilities `text | image | video | audio`, modes `auto/quality/speed/cost/manual/local`. `local` = prompt-only offline pack. Generation helpers: `imageGen.ts`, `videoGen.ts`. Provider readiness: `providerReady.ts`. Keys in OS keychain via Rust.
- **Creative DNA:** `styleDna.ts`, `characterDna.ts`, `environmentDna.ts`, `propDna.ts`, plus `features/dna/dnaKit.tsx`. Brand kits: `features/brandkits/BrandKitManager.tsx`.
- **Export:** `pack.ts` (prompt packs), `features/export/BibleExport.tsx`, `bibleExport.ts`, asset sheets (`assetSheet.ts`), moodboard, snapshots, undo.
- **⚠ Loop Engine does not exist yet as a named system.** Iteration today is ad-hoc per feature. This package specs a tiny shared `loopEngine.ts` primitive (Phase 0) rather than pretending it exists.
- **⚠ StudioMode (Director/Studio/Creator) is a UX pattern, not a platform enum yet.** Music Video has `DirectorWizard` / `MagicDirect` as its Director-mode analog. Phase 0 adds a shared `studioMode.ts` so all three new modules share one switch.

**House rules for all three modules:** local-first (everything works in `local` router mode by producing prompt packs + specs), no cloud accounts required, Windows packaging via existing Tauri build, no new heavy dependencies without justification.

---

## Phase 0 — Platform Prep (shared, do once, before any module)

Small, sharp additions to `src/platform/` that all three modules need. ~2–3 days of Codex work.

1. **`src/platform/lib/loopEngine.ts`** — generic iterate-refine primitive:
   `runLoop<T>(config: { generate: (ctx, feedback?) => Promise<T[]>; batchSize; maxRounds; score?: (item: T) => number })` plus a Zustand-friendly loop-session record (`LoopSession { id, moduleId, rounds: LoopRound[], picks: string[], status }`). UI companion: `src/platform/components/generation/LoopBoard.tsx` — grid of variants, pick/reject/"more like this", feedback chips. Music Video/Motion Studio can migrate later; don't refactor them now.
2. **`src/platform/lib/studioMode.ts`** — `type StudioMode = "director" | "studio" | "creator"`, persisted per project, plus a `ModeSwitch` UI component in `platform/components/layout/`. Semantics (uniform across modules):
   - **Director** — you approve, AI does the work: wizard → generated plan → one-click produce → review gates.
   - **Studio** — full workbench: every panel, manual overrides, per-step regeneration.
   - **Creator** — fast casual path: pick template, minimal inputs, instant output, simplified exports.
3. **`src/platform/lib/brandDna.ts`** — promote brand kit to first-class DNA (sibling of styleDna): `BrandDna { logoRefs, palette, fonts, voice: { tone, bannedWords, taglines }, productLines }`. BrandKitManager becomes its editor. Glam/Web/Campaign all consume this; without it each module reinvents brand context.
4. **Deliverable registry** — `src/platform/lib/deliverables.ts`: a `Deliverable { id, moduleId, projectId, kind, format, status: "planned"|"generating"|"draft"|"approved", assetRefs }` record. This is the spine Campaign Studio orchestrates over, and Glam/Web write into it from day one. Cheap now, priceless later.
5. **App shell:** extend `App.tsx` view switch + nav for `glam`, `webstudio`, `campaign` (feature-flag hidden until each ships).

---

# MODULE 1 — GLAM STUDIO

## Product Brief / PRD

**1. Product Vision.** A luxury advertising studio in a box. You hand it a product (photo or description) and a brand, and it returns campaign-grade imagery, ad layouts, and product films that look like they came from a top-tier agency shoot — art-directed, consistent, on-brand.

**2. Target Users.** Solo founders and e-commerce sellers who can't afford a $30k shoot; small brand/marketing teams; freelance designers serving product clients; the existing Director Studio user extending into commercial work.

**3. Core Problem.** Premium product advertising requires photography, art direction, retouching, typography, and format adaptation — five skills and five tools. AI image tools produce one-off pretty pictures, not coherent, on-brand campaign systems, and users must prompt-engineer to get anything luxury-grade.

**4. Emotional Outcome.** "I have a luxury advertising studio." The user feels like a creative director reviewing agency work — choosing between polished concepts, not coaxing a model.

**5. Unique Value Proposition.** The only tool that goes product-photo → art-directed campaign concept → consistent multi-format asset pack, with brand DNA enforced across every asset, running local-first with pluggable providers.

**6. Primary Workflow** (the spine — everything else hangs off this):

1. **Product Intake** — upload product photos / describe product; auto-extract product DNA (shape, materials, colors, category).
2. **Brand** — pick/create Brand DNA (Phase 0 brand kit).
3. **Look Selection** — choose a Luxury Look (curated looks: Noir Editorial, Golden Hour Atelier, Clinical Minimal, Baroque Opulence, Neon Tech, Automotive Cinematic…) or derive one from reference images via Style DNA.
4. **Concept** — AI proposes 3 campaign concepts (headline territory, visual direction, shot list). User picks one.
5. **Hero Generation** — Loop Engine generates hero image variants; pick/refine.
6. **Asset Pack Expansion** — approved hero look expands to the format matrix (social sizes, banner, hero crop) with typography/layout applied.
7. **(V1) Product Film** — 6–15s product video from approved stills direction.
8. **Export** — professional pack.

**7. Director Mode.** Wizard: product + brand + occasion ("holiday launch," "always-on social") → AI runs steps 3–6 automatically, presenting two review gates: concept pick and hero pick. Output: finished pack.

**8. Studio Mode.** Full workbench: concept board, shot list editor, per-shot prompt inspection/override, look tuning (lighting/lens/set dressing sliders that edit the Look DNA), layout editor for type placement, per-format regeneration.

**9. Creator Mode.** "Instant Ad": pick product + one Look template → single hero + 3 social crops in one loop round. No concepts, no shot lists.

**10. Core Screens.** (a) Glam Home/project list, (b) Product Intake, (c) Look Gallery, (d) Concept Board, (e) Hero Loop Board, (f) Pack Grid (format matrix), (g) Export. Studio mode adds Shot List and Layout panels as drawers, not separate screens.

**11. Platform Dependencies.** Provider Router (image, text; video in V1), Loop Engine, Brand DNA, Style DNA, asset library (`assets.ts`, `generatedAssets.ts`), deliverable registry, pack export, snapshots/undo, ModeSwitch.

**12. Data Models.** `GlamProject`, `ProductProfile` (a Prop-DNA-like record for the hero product), `LuxuryLook` (Style DNA subclass + lighting/set/lens fields), `CampaignConcept { territory, headline, visualDirection, shotList }`, `AdFormat` (preset registry: IG post/story/reel cover, FB, banner sizes, hero 16:9/4:5…), `GlamAsset` (deliverable kind).
**13. Loop Engine.** Hero generation (core), look exploration (batch of 4 looks applied to product), format expansion retries.
**14. Provider Router.** `text` for concepts/copy/shot lists; `image` for all generation; `video` (V1) for product films; `local` mode outputs a prompt pack + layout specs instead of pixels — must be first-class, not degraded.
**15. Creative DNA.** Consumes Brand DNA + Style DNA; produces Product DNA and Look DNA that persist to the project's DNA kit and are reusable by Campaign Studio and Music Video (e.g., product placement in a video).
**16. Exports.** PNG/JPEG at exact format dimensions; ZIP campaign pack organized by format; prompt-pack (local mode); concept PDF (one-pager: concept, headline, assets contact sheet) — reuse bibleExport/assetSheet machinery.
**17. MVP.** Product intake (images + description), Brand DNA pick, 8 curated Looks, single concept generation (pick of 3), hero loop, 4 core formats (1:1, 4:5, 9:16, 16:9) with simple type overlay, ZIP + prompt-pack export, Creator + Director modes. **Cut from MVP:** video, custom look derivation from references, advanced layout editor, automotive-specific sets.
**18. V1.** Product film (image-to-video via `videoGen.ts`), look derivation from reference images, layout editor with type presets, full ad-format matrix, concept PDF export, Studio mode complete.
**19. Future.** Model/talent integration via Character Bible (fashion campaigns with consistent AI models), multi-product scenes, A/B variant packs wired to Campaign Studio, animated banners, print/CMYK exports.
**20. Technical Risks.** (a) Product fidelity — generated scenes must contain _the user's actual product_; pure text-to-image will hallucinate the product. Mitigation: lean on image-editing/reference-conditioning capable providers; in MVP be honest — "product-faithful" mode requires a reference-capable provider, otherwise generate look-alike scenes and composite the real product photo as an overlay layer in the layout step. This is the module's hardest problem; do not hide it. (b) Text rendering in images is unreliable → render typography as a real HTML/SVG overlay composited at export (repo already has `html-to-image`), never ask the model to paint headlines. (c) Provider variance in look consistency → Look DNA must compile to per-provider prompt dialects (promptTools.ts pattern).
**21. UX Risks.** Luxury is a taste bar — a mediocre result kills the fantasy; curate Looks hard and ship few. Concept step could feel like homework → keep it to one card-pick. Format matrix could overwhelm → default to 4, expand on demand.
**22. Success Metrics.** Time from product upload → exported pack < 10 min (Director mode); ≥1 hero approved within 2 loop rounds for 70% of sessions; % of packs exported (completion rate); repeat projects per user.
**23. Acceptance Criteria.** A user with only a product photo and no prompt-writing produces, in Director mode, an exported ZIP with ≥4 on-format assets sharing one look and brand palette/fonts; works end-to-end in `local` router mode producing a prompt+layout pack; typecheck/build clean; no regressions to Music Video or Motion Studio.

## Codex Implementation Brief — Glam Studio

**1. Folder structure**

```
src/apps/glam/
  GlamStudio.tsx            # module root, mode-aware
  glamBindings.ts           # registerAppBindings integration
  lib/    types.ts, looks.ts, productProfile.ts, concepts.ts,
          formats.ts, layoutCompose.ts, glamStore.ts
  features/ intake/ looks/ concept/ hero/ pack/ export/
```

**2. Files to create.** The above; plus `platform/lib/loopEngine.ts`, `studioMode.ts`, `brandDna.ts`, `deliverables.ts`, `platform/components/generation/LoopBoard.tsx` (Phase 0 if not already done); curated look definitions as data in `looks.ts`; format presets in `formats.ts`.
**3. Files to modify.** `src/app/App.tsx` (view + nav), `src/platform/lib/types.ts` (shared ids), `providers.ts` only if adding capability metadata (e.g., `imageEdit` flag on ProviderInfo), `features/brandkits/BrandKitManager.tsx` (adopt BrandDna), dashboard to surface Glam projects.
**4. Reuse.** imageGen/videoGen, promptTools, styleDna, refs.ts (reference images), assets/generatedAssets, pack.ts, assetSheet, snapshots, undo, settings, providerReady, existing UI kit in `platform/components/ui`.
**5. New types.** `ProductProfile`, `LuxuryLook`, `CampaignConcept`, `ShotSpec`, `AdFormatPreset`, `GlamPack`, `LayoutSpec` (type overlay: text blocks, font, position, safe areas).
**6. UI components.** LookCard/LookGallery, ConceptCard, LoopBoard (platform), FormatGrid, TypeOverlayEditor (V1), ExportPackDialog. Follow existing Tailwind/cva conventions.
**7. Services.** `concepts.ts` (text-gen concept + shot list, JSON-schema-validated), `layoutCompose.ts` (HTML/SVG overlay → `html-to-image` rasterize at exact px), `productProfile.ts` (extraction via text+vision provider or manual form fallback).
**8. Router integration.** text: concept/copy; image: hero + expansion (pass Look DNA compiled via promptTools); imageEdit-capable providers preferred for product fidelity; all calls through existing router modes; `local` → emit prompt pack entries instead of calls.
**9. Loop Engine integration.** Hero step = `runLoop` with batchSize 4, feedback chips ("warmer light," "closer crop," "more negative space") mapped to Look DNA deltas.
**10. Creative DNA.** Read BrandDna + StyleDna; write ProductProfile and chosen LuxuryLook into project DNA kit; register assets in deliverable registry with `moduleId:"glam"`.
**11. Export.** ZIP via existing pack machinery; exact-dimension raster per AdFormatPreset; prompt-pack in local mode; V1 concept PDF via bibleExport pattern.
**12. Phases.** P0 platform prep → P1 types+store+intake+look gallery (static) → P2 concept gen (text only, works in local mode) → P3 hero loop (image gen) → P4 format expansion + overlay compose + export → P5 Director wizard + Creator instant path → P6 (V1) video, look derivation, layout editor.
**13. Quality gates.** `npm run build` clean at every phase; add lightweight vitest for formats.ts, layoutCompose.ts (pure functions), concepts JSON parsing; manual smoke: full Director flow in local mode.
**14. Acceptance.** Same as PRD #23, plus: no imports from `apps/glam` into other apps; platform additions have zero Glam-specific code.
**15. Compact Codex prompt.**

> In the Director Studio repo, implement Glam Studio per `docs/DIRECTOR-STUDIO-MODULES-SPEC.md` §Module 1. First do Phase 0 platform prep (loopEngine, studioMode, brandDna, deliverables — small, generic, in `src/platform/lib`). Then build `src/apps/glam` following the existing `src/apps/music-video` conventions: Zustand store, platform UI kit, provider router for all AI calls, full functionality in `local` router mode via prompt packs. Ship phases P1–P5 (MVP scope only — no video, no layout editor). Render all typography as HTML/SVG overlays composited with html-to-image, never model-painted text. Keep `tsc --noEmit && vite build` green per phase. Do not modify music-video or motion-studio behavior.

---

# MODULE 2 — WEB STUDIO

## Product Brief / PRD

**1. Product Vision.** A $10k-agency website team in a box: strategy, copy, design, and build for marketing sites. Input a business; get a positioned, written, designed, responsive site you can export or publish — not a themed template with lorem ipsum.

**2. Target Users.** Founders launching products; freelancers/agencies producing client sites fast; Director Studio users needing a landing page for the campaign they just made.

**3. Core Problem.** AI site builders generate generic layouts with filler copy; agencies are slow and expensive. The real work of a good marketing site is _positioning and copy first, design second_ — no current tool sequences it that way.

**4. Emotional Outcome.** "I have a $10k agency website team." Reviewing a site proposal, not fighting a page builder.

**5. UVP.** Positioning-first pipeline (offer → message architecture → copy → sitemap → wireframe → styled site), driven by the same Brand/Style DNA as your ad assets, exporting clean static code you own — local-first, no hosted builder lock-in.

**6. Primary Workflow.**

1. **Business Intake** — what you sell, to whom, proof points, CTA goal; optionally ingest existing materials (docParse.ts handles docs/PDFs).
2. **Positioning** — AI drafts offer positioning + message hierarchy (headline, value props, objections, social proof plan). User approves — this is the most leveraged review gate.
3. **Sitemap** — page/section list (landing page = section list). Simplify: MVP is single-page sites; sitemap = section stack.
4. **Copy** — full copy per section, on-voice (BrandDna.voice).
5. **Wireframe** — section layout selection from a curated **section pattern library** (hero patterns, feature grids, testimonial bands, pricing, FAQ, CTA…). Not freeform generation — patterns are hand-built, AI selects and fills.
6. **Visual design** — apply Design DNA (palette/type/spacing derived from BrandDna + StyleDna); imagery slots filled from asset library or generated via Glam-style image calls.
7. **Preview & refine** — live responsive preview (desktop/tablet/mobile), per-section regenerate (copy or layout independently).
8. **Export/Publish** — static HTML/CSS export (zero-dependency, single folder); V1: one-click deploy guidance (Netlify/Vercel drop, or plain hosting).

**7. Director Mode.** Wizard: business intake → AI runs 2–7, gates at positioning approval and full-site review. **8. Studio Mode.** Section-by-section workbench: swap patterns, edit copy inline, tweak design tokens, manage imagery slots. **9. Creator Mode.** "Launch page in 5 minutes": name + one-liner + CTA → single-scroll page from one template family.

**10. Core Screens.** (a) Web Home, (b) Intake, (c) Positioning Review, (d) Site Builder (canvas: section stack + inspector drawer — this is the one big screen), (e) Preview, (f) Export. Sitemap/copy/wireframe are stages _within_ the builder, not separate screens.

**11. Platform Dependencies.** Router (text primary, image secondary), BrandDna, StyleDna, asset library, deliverable registry, docParse, snapshots/undo, ModeSwitch, Loop Engine (copy/hero-section variants).

**12. Data Models.** `WebProject`, `Positioning { audience, offer, valueProps[], objections[], proof[], cta }`, `SiteSpec { pages[] → sections[] }`, `SectionInstance { patternId, copy: CopyBlock[], mediaSlots[], tokensOverride }`, `DesignTokens { palette, typeScale, spacing, radius }`, `SectionPattern` (registry, hand-authored).
**13. Loop Engine.** Copy variants per section (headline especially); hero-section design variants (same copy, 3 pattern/token combos).
**14. Router.** text: positioning, copy, section-fill (all JSON-schema-validated); image: hero/section imagery; `local` mode: full pipeline works except imagery (slots hold placeholders + prompt pack) — positioning/copy/patterns are deterministic-friendly, and in local mode copy stages emit editable prompts/questionnaires.
**15. Creative DNA.** BrandDna.voice drives copy tone; palette/fonts compile to DesignTokens; StyleDna informs imagery; the exported site's tokens can be saved back as a `DesignBible` entry reusable by Glam/Campaign.
**16. Exports.** Static site folder (index.html, styles.css, assets/) — semantic HTML, responsive, no framework runtime; ZIP; deliverable-registry entry; V1: multi-page, sitemap.xml, OG/meta tags, favicon from brand kit.
**17. MVP.** Single-page sites; intake + positioning + copy + ~12 section patterns across 4 families; token-based theming; imagery from library or generated; responsive preview; static export. Directors + Creator modes. **Cut:** multi-page, forms/backends, custom pattern authoring, animations beyond CSS, CMS, actual deploy integration.
**18. V1.** Multi-page (up to 5), pattern library ~30, form embeds (mailto/Formspree-style paste-in), SEO/meta pass, deploy guidance, Studio mode complete, per-section image loops.
**19. Future.** Microsite kits for Campaign Studio, A/B copy exports, blog/CMS export adapters, interactive/video sections using Motion Studio output, localization.
**20. Technical Risks.** (a) Freeform AI layout generation produces broken CSS — avoided entirely by the curated pattern library; patterns are hand-built React→static-HTML templates, AI only fills structured slots. (b) Static export fidelity vs. in-app preview — render preview _from the same template compiler_ as the export (one renderer, two targets). (c) Copy JSON drift — schema-validate every text call, retry with repair.
**21. UX Risks.** Users skip positioning to "see the site" → Creator mode is that valve; keep Director gate short (one screen, editable bullets). Inline copy editing must be truly WYSIWYG or trust dies. Token theming can look samey → each pattern family ships with 3 curated token presets.
**22. Success Metrics.** Intake → exported site < 15 min Director mode; % sites exported; % positioning approved without full rewrite; Lighthouse ≥ 90 on exports.
**23. Acceptance.** Director-mode run from a 3-sentence business description yields a responsive single-page site exported as standalone HTML/CSS that scores ≥90 Lighthouse (perf/a11y/SEO basics), on-brand tokens applied, works in `local` router mode (placeholder imagery + prompt pack); build clean; no cross-app regressions.

## Codex Implementation Brief — Web Studio

**1. Folder structure**

```
src/apps/webstudio/
  WebStudio.tsx
  webBindings.ts
  lib/    types.ts, patterns/ (registry + one file per family),
          tokens.ts, positioning.ts, copyGen.ts, siteCompiler.ts, webStore.ts
  features/ intake/ positioning/ builder/ preview/ export/
```

**2. Create.** The above; `siteCompiler.ts` is the heart — compiles `SiteSpec + DesignTokens` to (a) React preview and (b) static HTML/CSS string output from the same template definitions.
**3. Modify.** `App.tsx` (view/nav), dashboard, `platform/lib/types.ts`; possibly `docParse.ts` reuse untouched.
**4. Reuse.** Router + text/image gen, promptTools, brandDna, styleDna, docParse, assets, deliverables, snapshots/undo, LoopBoard, UI kit.
**5. New types.** Per PRD §12; patterns typed as `SectionPattern { id, family, slots: SlotSchema, render(tokens, data): TemplateOutput }`.
**6. UI components.** SectionStack (drag-reorder), SectionInspector, InlineCopyEditor, TokenPanel, ResponsivePreviewFrame (iframe with srcdoc from compiler), PatternPicker.
**7. Services.** positioning.ts + copyGen.ts (schema-validated text calls with repair-retry), siteCompiler.ts (pure, unit-testable), export writer (folder ZIP via existing pack utilities).
**8. Router.** text-heavy; every call goes through router with JSON schema in prompt; image calls optional per media slot; local mode emits placeholders + prompt pack.
**9. Loop Engine.** headline/copy variant loops per section; hero-section triple-variant compare.
**10. Creative DNA.** BrandDna→DesignTokens compiler in tokens.ts; save-back as DesignBible entry.
**11. Export.** Single renderer principle (compiler feeds preview and export); ZIP static folder; register deliverable.
**12. Phases.** P1 types+store+pattern registry with 4 hand-built patterns+compiler+preview (no AI) → P2 intake+positioning (text gen) → P3 copy fill + inline edit → P4 tokens from BrandDna + imagery slots → P5 static export + Lighthouse pass → P6 Director wizard + Creator path → P7 (V1) multi-page, more patterns, loops.
**13. Quality gates.** vitest on siteCompiler + tokens (pure), schema-parse tests for positioning/copy; build green per phase; manual Lighthouse check on export.
**14. Acceptance.** PRD §23; compiler determinism (same spec → identical HTML); no `apps/webstudio` imports elsewhere.
**15. Compact Codex prompt.**

> Implement Web Studio per `docs/DIRECTOR-STUDIO-MODULES-SPEC.md` §Module 2 in `src/apps/webstudio`, following music-video app conventions. Core principle: a hand-authored SectionPattern registry + a single `siteCompiler.ts` that renders both the in-app preview and the exported static HTML/CSS from the same templates — the AI only fills structured slots (positioning, copy, media prompts) via schema-validated text calls through the provider router. Build phases P1–P6 (MVP: single-page sites, ~12 patterns). Everything must work in `local` router mode with placeholder imagery. Static export must be a zero-dependency folder scoring ≥90 Lighthouse. Keep `tsc --noEmit && vite build` green per phase.

---

# MODULE 3 — CAMPAIGN STUDIO

### Standalone vs. orchestration — recommendation: **B, presented as C.**

Build Campaign Studio as an **orchestration layer with its own thin surface** — a brief/strategy/calendar UI that _plans_ deliverables and delegates production to Glam, Web, and Motion Studio via the deliverable registry. It owns no generation pipelines of its own except two lightweight ones that don't merit modules: **social copy variants and email assets** (text + existing image machinery). A "standalone" Campaign Studio that re-implements image/video/web generation would triple maintenance and guarantee drift; a pure invisible layer has no home for strategy/calendar/status. So: standalone _screens_, orchestrated _production_. The deliverable registry (Phase 0) is what makes this cheap.

## Product Brief / PRD

**1. Product Vision.** A full creative agency launching your product: one brief in, a coherent campaign out — strategy, messaging, ad assets, videos, landing page, social and email assets, on a launch calendar, in one export package. The connective tissue that turns Director Studio's modules into an agency.

**2. Target Users.** Founders launching products; marketing leads at small companies; agencies running lean; power users of Glam/Web/Motion who want them coordinated.

**3. Core Problem.** Even with great per-asset tools, campaigns fall apart on coherence and logistics: message drift across channels, mismatched visuals, no timeline, assets scattered across tools.

**4. Emotional Outcome.** "I have a full creative agency launching my product." Sitting in the client chair at the campaign presentation.

**5. UVP.** The only local-first system where one Campaign DNA (strategy + messaging + visual world) provably propagates into ads, film, web, social, and email produced by specialist modules — with a live status board and one export package.

**6. Primary Workflow.**

1. **Campaign Brief** — product, audience, goal, launch date, channels, budget-of-effort (S/M/L).
2. **Strategy** — AI drafts positioning, key message, 3 pillar messages, audience insight, channel plan. Review gate #1.
3. **Campaign Concept** — creative platform (big idea, tagline, visual world = Look + tokens seeded from BrandDna). Review gate #2.
4. **Deliverable Plan** — auto-generated plan in the deliverable registry: N Glam assets, hero film (Motion), landing page (Web), social calendar posts, email sequence — scaled by channel plan and effort size.
5. **Production** — per deliverable, "Produce" hands off to the owning module _pre-seeded_ with Campaign DNA (brand, look, messaging); Campaign Studio tracks status. Social copy + email produced natively.
6. **Launch Calendar** — deliverables placed on a timeline relative to launch date (templated: teaser → launch → sustain).
7. **Campaign Package Export** — one ZIP: strategy PDF, all approved assets by channel, calendar (CSV/ICS), landing page folder, prompt packs for anything unproduced.

**7. Director Mode.** Brief → strategy gate → concept gate → auto-plan → "produce all" runs producible deliverables (text-based ones fully auto; module deliverables queued with one-click launch into each module) → status board → export. **8. Studio Mode.** Edit strategy docs directly, hand-build the deliverable plan, per-deliverable brief overrides, calendar drag-editing. **9. Creator Mode.** "Mini launch": product + date → fixed small kit (3 social posts, 1 hero image, 1 email, 1 landing page) with defaults.

**10. Core Screens.** (a) Campaign Home, (b) Brief, (c) Strategy Board (strategy + concept docs as editable cards), (d) Deliverables Board (kanban by status, grouped by channel — the heart of the module), (e) Calendar, (f) Package Export.

**11. Platform Dependencies.** Deliverable registry (hard dependency), BrandDna, router (text; image for social/email graphics via Glam's format/compose libs), Loop Engine (message/copy variants), all three production modules' entry points accepting a seeded context.
**12. Data Models.** `Campaign`, `CampaignStrategy`, `CampaignConcept` (shares Glam's concept shape — unify), `DeliverablePlanItem` (extends Deliverable with channel, dueOffset, briefOverride), `CalendarSlot`, `CampaignPackage`. Crucially: `SeedContext { brandDnaId, lookId, messaging, campaignId }` — the handoff payload every module must accept.
**13. Loop Engine.** Strategy alternatives (3 strategic routes), social copy variant loops, subject-line loops.
**14. Router.** text for strategy/messaging/social/email; image only through Glam's shared libs for social/email graphics; local mode = full campaign as brief/prompt package (genuinely useful: an agency-grade campaign plan document).
**15. Creative DNA.** Campaign DNA = BrandDna + chosen Look + messaging; written to project DNA kit; SeedContext propagation is the module's core promise — every produced asset traces to campaign messaging.
**16. Exports.** Campaign package ZIP (strategy PDF via bibleExport pattern, assets by channel from registry, calendar CSV/ICS, site folder), plus per-channel sub-exports.
**17. MVP.** Brief → strategy → concept → deliverable plan → native production of social copy + email text → manual handoff buttons into Glam/Web (seeded) → status board → package export. **Cut:** calendar (ship a simple date-ordered list first), auto-produce-all, email HTML templates (text + image slots only), Motion Studio deep integration (link deliverable to a Motion project manually).
**18. V1.** Full calendar with templates + ICS, seeded auto-launch into Glam/Web (deep links that pre-fill their wizards), email HTML export, campaign status notifications on dashboard, effort-size scaling.
**19. Future.** Multi-campaign brand planning, performance-feedback loop (import results → revise), team review/annotation, publishing integrations.
**20. Technical Risks.** (a) Cross-module handoff coupling — mitigate with the narrow SeedContext contract + deliverable registry as the only shared surface; modules stay ignorant of Campaign Studio. (b) Building it before Glam/Web exist = orchestrating nothing (hence build order below). (c) Status sync — registry is local Zustand/storage, single source of truth, modules update their own deliverables' status.
**21. UX Risks.** Feeling like a project-management chore instead of an agency → lead with the strategy/concept "presentation" moment, keep the board visual (thumbnails, not rows). Over-generation of deliverables → effort-size S/M/L caps the plan. Users confused about where editing happens → one rule, stated in UI: "plan and approve here, produce in the studio that owns it."
**22. Success Metrics.** Brief → exported package (local mode) < 20 min; % planned deliverables reaching approved; cross-module sessions per campaign; package export rate.
**23. Acceptance.** From one brief, Director mode yields strategy + concept docs, a deliverable plan of ≥8 items across ≥3 channels, natively produced social+email copy on-message, seeded handoff into Glam and Web that pre-fills their intakes, and a package ZIP with strategy PDF + assets + plan CSV; full flow works in local mode; build clean; Glam/Web/Motion untouched except SeedContext acceptance.

## Codex Implementation Brief — Campaign Studio

**1. Folder structure**

```
src/apps/campaign/
  CampaignStudio.tsx
  campaignBindings.ts
  lib/    types.ts, strategy.ts, planGenerator.ts, seedContext.ts,
          socialCopy.ts, emailGen.ts, packageExport.ts, campaignStore.ts
  features/ brief/ strategy/ board/ calendar/ export/
```

**2. Create.** The above. `seedContext.ts` may live in `platform/lib/` instead (it's the cross-module contract — platform is the right home).
**3. Modify.** `App.tsx`; Glam and Web intake screens to accept an incoming SeedContext (pre-fill + banner "Part of campaign X"); deliverable registry consumers in Glam/Web to report status; dashboard for campaign cards.
**4. Reuse.** Deliverable registry, brandDna, router, LoopBoard, pack/bibleExport, Glam's `formats.ts` + `layoutCompose.ts` for social/email graphics (import from a shared platform location if this creates an app→app import — hoist those two into `platform/lib` when Campaign Studio starts).
**5. New types.** PRD §12; unify `CampaignConcept` with Glam's concept type in platform.
**6. UI.** BriefForm, StrategyCard (editable doc card), DeliverableBoard (kanban), DeliverableCard (thumbnail + owner-module badge + Produce button), CalendarStrip (V1), PackageExportDialog.
**7. Services.** strategy.ts / socialCopy.ts / emailGen.ts (schema-validated text), planGenerator.ts (deterministic rules from channel plan + effort size — _not_ AI; testable), packageExport.ts.
**8. Router.** text throughout; images via hoisted Glam compose libs; local mode emits the full campaign-plan document pack.
**9. Loop Engine.** strategy-route triples; social/subject-line variant loops.
**10. Creative DNA.** Campaign DNA assembly + SeedContext propagation; write to DNA kit.
**11. Export.** Package ZIP assembling registry assets by channel + strategy PDF + CSV plan; reuse pack.ts.
**12. Phases.** P1 types+store+brief+strategy gen → P2 concept + plan generator (deterministic) + board UI → P3 native social/email production → P4 SeedContext handoff into Glam/Web + status reporting → P5 package export → P6 Director/Creator modes → P7 (V1) calendar, auto-launch.
**13. Quality gates.** vitest on planGenerator + packageExport manifest (pure); schema tests; build green per phase; manual: seeded handoff round-trip.
**14. Acceptance.** PRD §23; SeedContext is the _only_ new coupling surface added to Glam/Web.
**15. Compact Codex prompt.**

> Implement Campaign Studio per `docs/DIRECTOR-STUDIO-MODULES-SPEC.md` §Module 3 in `src/apps/campaign`. It is an orchestration layer with its own thin UI: brief → AI strategy/concept (schema-validated text via provider router) → deterministic deliverable plan written to the platform deliverable registry → native production of social/email copy only → seeded handoff (SeedContext contract in `platform/lib`) into Glam and Web Studio, which pre-fill their intakes and report status back through the registry → campaign package ZIP export. Do not re-implement image/video/web generation; hoist Glam's formats/layoutCompose into platform if needed for social graphics. Build phases P1–P6 (MVP: no calendar, list view instead). Full flow must work in `local` router mode as a campaign-plan document pack. Keep builds green; only cross-module change allowed is SeedContext acceptance + registry status updates.

---

# Recommended Build Order

**1. Glam Studio → 2. Web Studio → 3. Campaign Studio.** Strict order, with Phase 0 platform prep before Glam.

**Why Glam first.** It's the closest to the platform's proven strengths (image generation, Style DNA, looks, prompt packs — the Music Video muscle applied to products), so it ships fastest and de-risks the two new platform primitives (Loop Engine, Brand DNA) on the friendliest terrain. It also produces the visual raw material (Looks, product imagery, format/compose libs) that both Web Studio (imagery slots) and Campaign Studio (social graphics) consume. And commercially it's the clearest standalone "wow": product photo in, campaign pack out.

**Why Web second.** It's the most technically independent (text-heavy, pattern-library architecture, its own compiler) but benefits from Glam's imagery pipeline for media slots and from a hardened Brand DNA→tokens path. Building it second means the compiler/pattern investment happens while Glam stabilizes, and by the end two of Campaign Studio's three orchestration targets exist.

**Why Campaign last — non-negotiable.** An orchestration layer with nothing to orchestrate is a document generator. Campaign Studio's entire value is coherence across Glam assets, Web pages, and Motion videos; built first it would grow its own generation pipelines and become the disconnected fourth app this plan exists to prevent. Building it last also lets the deliverable registry and SeedContext contract be validated by real Glam/Web usage before Campaign depends on them.

**Sequencing summary:** Phase 0 (platform: loopEngine, studioMode, brandDna, deliverables) → Glam MVP → Web MVP → Campaign MVP → V1 passes in the same order.

---

## Assumptions challenged / aggressive simplifications (applied above)

- **Loop Engine and StudioMode were assumed to exist — they don't.** Specced as small Phase 0 primitives instead of implicit dependencies.
- **Product fidelity in Glam is the hard problem**; the spec is honest about reference-capable providers vs. overlay compositing rather than promising magic.
- **AI never paints text or invents layouts.** Typography = real overlays; web layouts = curated pattern library. This single decision removes the two biggest quality risks.
- **Web MVP = single-page.** Multi-page, forms, CMS, deploy integrations all deferred.
- **Campaign MVP has no calendar** (list first), no auto-produce-all, and produces only text-y assets natively.
- **Deferred everywhere:** talent/models in Glam (needs Character Bible integration), animated banners, CMS export, publishing integrations, performance feedback loops.
