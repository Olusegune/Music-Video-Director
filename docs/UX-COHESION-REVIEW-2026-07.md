# Director Studio — UX Cohesion Review: Help Center, Navigation, Magic Output, Visual Language

Prepared 2026-07-08 against `main` @ `8d69267`, from screenshots + code inspection. Planning only.
Companions: `docs/IA-NAVIGATION-PLAN.md` (navigation, already specced) · `docs/PRODUCT-CODE-UX-REVIEW-2026-07.md` (visual layer P1).
**Policy update recorded here:** Magic Mode is a **Music Video Director feature only** — no global Magic entry points. This supersedes the "platform Magic Flow" *branding* in `GUIDED-FLOW-AND-SPLASH-ADDENDUM.md`: the shared guided-flow *engine* stays as invisible platform infrastructure that all studios use, but the "Magic" name, button, and framing live only inside MV. Other studios call their flows plain things ("New Campaign," "New Website").

---

## 1. Product Critique (concise)

1. **The app explains itself inconsistently because it grew faster than its language.** The Help Center simultaneously describes the old world ("Director Mode is the rest of the app," sidebar-stage navigation, Magic Mode as the app's front door) and the new world (five studios, Director Engine, StudioMode tiers). A user reading it today would form two incompatible mental models. This is the most fixable credibility leak in the product.
2. **Navigation altitude problem** — fully diagnosed and specced in `IA-NAVIGATION-PLAN.md`; this review adds two findings from your annotations: **(a)** Brand Kits are consumed by Glam/Web/Campaign but *not* by Music Video (verified: no brand-kit usage in `apps/music-video`) — so the "shared library" promise is silently broken for the flagship module; **(b)** Animation Lab's code lives *inside* `apps/music-video` yet it's listed as a global Tool — exactly the kind of accumulated-feature seam you asked about. Script Studio is platform-level and genuinely cross-module. **Templates is not** (correction 2026-07-08): `platform/lib/templates.ts` and `TemplatesView` are entirely MV genre blueprints (Afrobeats/Hip Hop/K-Pop/Gospel… with chorus structures, choreography, song adaptation — the header even says "the Director Brain adapts them to your song"), and Motion Studio already ships its own separate template library in `apps/motion-studio/lib/templates.ts`. Templates is a **per-studio concept**: the global nav entry moves inside Music Video Director (see IA plan §2 correction), and each studio owns its own template gallery. Only the generic binding layer (`appBindings.ts`) is truly platform. Nothing in the UI *says* which tools feed which studios — hence your "(?)" annotations. The IA fix should make ownership visible, not just reorder lists.
3. **The Magic Output screen ("Your Music Video Is Ready") undersells the product's biggest moment.** It announces a finished music video, then shows six identical gradient placeholders with clapperboard icons, three stat numbers, and seven equally-weighted buttons. It's structurally *correct* (story, cast, style, storyboard, render plan — the right information) but emotionally flat, and worse, **directionless**: "Ready" + 7 choices + placeholder art = "I am not sure what to do with this" (your words, and any user's). A climax screen must have exactly one obvious next action.
4. **Text-heavy admin feel** — already documented in the product review (§4); the two new screenshots confirm the pattern at both ends: Brand Kits is a raw form (comma-separated hex field!) for what should be the most *visual* editor in the app, and even MV's celebration screen is cards-with-captions.
5. **Cohesion summary:** the platform bones are genuinely good and consistent (one design system, one engine, real shared systems). What's missing is one **voice** (terminology), one **map** (nav + ownership), and one **dramaturgy** (every studio's flow should end in a directed, cinematic moment, not a card grid).

## 2. Terminology Cleanup (single vocabulary, use everywhere: UI, Help, docs)

| Say | Not | Why |
|---|---|---|
| Director Studio (the app) | "the platform," "Director Engine" in user-facing copy | Engine is internal jargon; Help uses it, UI never shows it |
| Studio (Music Video Director, Motion, Glam, Web, Campaign) | "module," "app" | User-facing word is Studio |
| Magic Mode (MV only) | "Magic Flow" as user-facing platform term | Per policy update above |
| Director / Studio / Creator (disclosure tiers) | "Director Mode = the full manual workflow" | Help's old meaning directly contradicts the tier pill in the sidebar — the worst conflict found |
| Direct (MV stage) | "MV Director" | Jargon; also collides with "Director" tier |
| Production (a project inside a studio) | mixed "project/production" | Pick one; code says project, UI says production — standardize UI on "production" |

## 3. UX / Design Recommendations

### 3.1 Magic Output screen (the "Direct Music Video" result) — redesign as a **Premiere**, not a report

- **One hero action.** "Render Video" becomes the single large primary CTA (gold/primary, centered); Regenerate / Change Style / Change Story / Edit Characters collapse into a quiet "Adjust" row or an overflow menu; "Open Director Mode" becomes a text link labeled per new vocabulary ("Fine-tune in the studio →"). Seven equal buttons is a menu, not a direction.
- **Lead with the film, not the metadata.** Order: (1) full-width cinematic hero — the best storyboard frame (or styled title card) with the video title treated typographically like a movie one-sheet; (2) the storyboard as a horizontal **filmstrip** (sprocket-hole framing, timecodes, scrub on hover) instead of a 2×3 card grid; (3) Story/Cast/Style as one compact credits-style band ("A mid-tempo, moody, cinematic video · starring Neo Dude, Dance Crew · 116 shots · 5:02"); (4) render plan folded into the CTA ("Render Video — 116 shots").
- **Fix the placeholder problem at the root.** The gradient-clapperboard tiles are the single loudest "unfinished" signal. Options in order of preference: (a) generate 4–6 real low-cost preview frames for key moments as part of the direct step (image provider, thumbnail size); (b) in local mode, render *styled* boards — composition sketch lines + shot-type glyph + lighting gradient derived from the section's palette, so each board is visually distinct and reads as intentional pre-viz; (c) never show six identical tiles.
- **Name the moment.** "Your Music Video Is Ready" is false (nothing is rendered). Say what's true and exciting: "**Your treatment is ready.**" with subtitle "116 shots directed across 12 sections — render when you're ready." Honesty here *increases* the premium feel.
- **Arrival animation:** boards deal in with a 40ms stagger, hero fades up first. One restrained signature motion — this is the "reveal moment" the product review already specs (RevealStage); this screen is its first customer.

### 3.2 Brand Kits — make the most visual editor actually visual

- Palette: color swatch chips with a native color picker + hex, not a comma-separated text field. Typography: font-preview rows rendering "Aa" in the actual face. Voice: chip-style tone tags. Add a live **brand card preview** (mini ad tile using palette/type/voice) on the right so edits are seen, not imagined.
- **Show connections** (answers your arrows): a "Used by" row on each kit — Glam / Web / Campaign badges, with counts from the deliverable registry. And close the gap: MV should *offer* brand kits (optional style seed for artist/label branding) — even just a "Apply brand palette to style" toggle in MV's style step. Until then, the UI should honestly show MV as not-connected rather than implying everything is shared.

### 3.3 Ownership visibility (the "(?)" fix, beyond nav order)

- Library and Tool screens get a subtle scope line under the header: "Shared across all studios" (Asset Library, Brand Kits, Templates, Script Studio, Export Center) vs. "Part of Music Video Director" (Animation Lab — until its code is genuinely platformized, present it inside MV or move the code; don't let presentation contradict architecture).
- Character/World/Prop Bibles: "Shared across all studios · used by Music Video, Glam" style chips, driven by actual usage data where cheap.

### 3.4 Visual-without-garish ground rules (suite-wide, reaffirmed)

Imagery does the talking (thumbnails, filmstrips, previews everywhere a thing *can* be seen); type scale creates drama (display titles on hero/reveal surfaces, dense 12–14px only in Studio/Creator panels); color stays disciplined (existing dark palette + one accent per studio + gold reserved for premiere moments); motion is 150–250ms ease, staggered reveals only at climax screens; zero decorative sparkle. The reference blend remains Runway confidence × Keynote focus × Spotify imagery density.

## 4. Proposed Navigation Structure

Unchanged from `IA-NAVIGATION-PLAN.md` §2 (studios with in-place contextual expansion; Production Library / Tools / System below; boot to Dashboard; "MV Director"→"Direct"). Two additions from this review:

1. **Animation Lab** moves out of global Tools into the MV group (presentation now; code move later), OR its code is hoisted to platform first — pick one, never present platform-global while implemented module-local.
1b. **Templates** moves out of global Tools into the MV group (same correction, worse offender — its *content* is MV-only while its *code* sits in platform, the inverse of Animation Lab). Nav entry moves now; the `templates.ts`/`TemplatesView` code move into `apps/music-video` follows as cleanup. Each studio owns its own template gallery going forward (Motion Studio already does); if a cross-studio "browse all templates" surface is ever wanted, it's a Dashboard feature, not a nav item.
2. Magic entry points: no global Magic FAB or Magic labels outside MV (code check: App.tsx no longer mounts MagicFlowButton — good; sweep Help/Welcome/Dashboard copy for stragglers).

## 5. Help Center Content Plan

Current state (verified in `HelpCenter.tsx`): a hardcoded article array mixing three eras. Specific problems: "Director Mode — the full workflow" contradicts the Director/Studio/Creator tier system; "Getting started" opens with Song Studio and claims MV is the default front door; navigation instructions describe the flat sidebar; "Magic Mode guide" is correct for MV but reads as app-global; "Story Mode" article references a concept absent from the current nav; V1 studio articles are current and good.

**Restructure into five sections** (rewrite = R, keep-with-edits = E, new = N, delete = D):

1. **Welcome to Director Studio** — R: overview (five studios + shared libraries, no "Engine" jargon); N: "Your first production" (Dashboard → pick a studio → guided flow); N: "Director, Studio, Creator — choosing your level of control" (replaces and *deletes* the old "Director Mode — the full workflow" article, D).
2. **Music Video Director** — E: Getting started (rewrite framing: one studio among five); E: Magic Mode guide (explicitly "Music Video Director's guided path"); E: Song Studio, Lyrics & scripts, Cast, Choreography, Timeline articles updated for nested nav ("inside Music Video Director, open…"); D or fold: "Story Mode" content merges into Magic Mode guide.
3. **The other studios** — E: existing V1 workflow notes split into one article per studio (Motion, Glam, Web, Campaign), each: what it makes, its flow steps, its exports, how Campaign hands off to it.
4. **Shared libraries & tools** — N: one article per library (Bibles, Asset Library, Brand Kits — including *which studios use them today*, honestly); E: Templates, Script Studio, Export Center; N: "How studios share your creative DNA."
5. **Setup & system** — E: API Keys / AI Models / router modes incl. local mode; N: "Working fully offline (local mode)".

**Structural recommendations:** keep articles as data but move them out of the 555-line component into `helpContent.ts` per section, with a `relatedViews: View[]` field so Help becomes context-sensitive later (module home → its articles). Every `action.go()` deep link must be re-verified against the new nav (they survive by construction, but labels like "Open Song Studio" should become "Open Music Video Director → Song Studio"). Add a "last updated" stamp per article and a rule: **any PR that renames a nav item or changes a flow must touch the matching Help article** (add to the PR checklist).

## 6. Directions for Codex

Sequenced after the IA/navigation work order (which is prerequisite #1). Do not start item 2 before the nav model lands.

**Work order A — Vocabulary & Help Center (½–1 day + writing)**
1. Create `src/platform/features/help/helpContent.ts` (or a `content/` folder, one file per section) and move the article data out of `HelpCenter.tsx`; add `section`, `relatedViews`, `updatedAt` fields.
2. Rewrite/reorganize articles per §5 plan (R/E/N/D list). Enforce §2 vocabulary. Delete the old "Director Mode — the full workflow" and "Story Mode" articles, folding still-true content into their successors.
3. Re-verify every `action.go()` target; update action labels to nested-nav phrasing.
4. Sweep the whole UI for vocabulary violations: "MV Director" label, "module," user-facing "Engine," any Magic branding outside `apps/music-video` (Welcome, Dashboard, Toasts, Settings). Magic Mode strings live only inside MV surfaces.

**Work order B — Magic Output "Premiere" redesign (1–2 days)**
5. Restructure `MagicOutputScreen.tsx` per §3.1: hero frame with typographic title treatment → filmstrip storyboard (reuse/introduce the platform `Filmstrip` component from the visual-layer package) → credits band (story/cast/style condensed) → single primary CTA "Render Video — N shots", secondary actions in one quiet "Adjust" cluster, "Fine-tune in the studio →" text link. Retitle to "Your treatment is ready."
6. Replace identical gradient placeholders with differentiated pre-viz boards: derive per-shot gradient/composition glyph/shot-type icon from existing shot data (deterministic, local-mode safe); where an image provider is configured, generate small preview frames for up to 6 key moments during the direct step (respect router mode; never block the screen on generation — boards upgrade in place as frames arrive).
7. Apply the RevealStage stagger entrance (40ms per board, hero first). No other motion.

**Work order C — Brand Kits visual editor + ownership visibility (1–2 days)**
8. Rebuild BrandKitManager fields per §3.2: swatch chips + color input for palette, font-preview rows, tone chips for voice, live brand-card preview pane. Keep the underlying BrandDna shape (or version-bump via the storage wrapper if fields change).
9. Add "Used by" badges per kit from the deliverable registry (glam/web/campaign counts).
10. Add scope subtitle lines to Library/Tool headers per §3.3 ("Shared across all studios" / "Part of Music Video Director"). Move Animation Lab's nav entry into the MV group (presentation-level; leave code where it is, file a follow-up to hoist or fold it).
11. **Templates re-scoping:** move the Templates nav entry into the MV group (`templates` → ModuleId "musicvideo" in navModel — coordinate with the IA work order if not already done there); retitle the view header "Music Video Templates"; update its subtitle to say it adapts blueprints to the active song; update Help/GlobalSearch labels ("Music Video · Templates"). Follow-up cleanup commit (separate, behavior-preserving): move `platform/lib/templates.ts` + `features/templates/TemplatesView.tsx` into `src/apps/music-video/`, keeping `appBindings.ts` in platform; fix imports; no data changes (template ids and stored `templateId` references must remain identical).

**Constraints (standing):** no View renames, no data migrations without a storage version bump, no new heavy deps, local router mode fully functional, MV manual smoke before/after each work order, `tsc --noEmit && vite build` green per commit, Windows `tauri build` check after work order B (it touches the highest-traffic screen).

**Acceptance criteria:**
1. Help Center contains no reference to the old "Director Mode = full manual workflow" meaning, flat-sidebar navigation, "Story Mode," or app-global Magic Mode; every help action deep-link works; articles carry section + updated date.
2. Grep for "MV Director", user-facing "module"/"Engine", and Magic strings outside `apps/music-video` returns zero UI-visible hits.
3. Magic Output: one visually dominant primary CTA; storyboard reads as a filmstrip with visually distinct boards (no two identical placeholder tiles); honest title copy; works in local mode with zero API calls.
4. Brand Kits: palette edited via swatches/picker, live preview visible, "Used by" badges accurate against the registry.
5. Library/Tool screens state their scope; Animation Lab and Templates no longer appear platform-global — both live under Music Video Director in nav, and Templates is retitled "Music Video Templates." Stored `templateId` references on existing productions still resolve after the code move.
6. MV end-to-end smoke passes; build/typecheck/tests green; packaged build verified for the Magic Output screen.

**Copy-paste Codex prompt:**
> In the Director Studio repo, execute work orders A, B, and C from `docs/UX-COHESION-REVIEW-2026-07.md` §6, in that order, after the navigation restructure from `docs/IA-NAVIGATION-PLAN.md` has landed. A: extract Help Center articles to data files and rewrite them per the §5 content plan and §2 vocabulary table; sweep the UI for vocabulary violations and remove all Magic branding outside `apps/music-video`. B: redesign `MagicOutputScreen.tsx` as the "Premiere" per §3.1 — hero frame, filmstrip storyboard with differentiated deterministic pre-viz boards (optionally upgraded by real preview frames when an image provider is configured, never blocking), credits band, single primary "Render Video" CTA, quiet Adjust cluster, staggered reveal entrance, retitled "Your treatment is ready." C: rebuild the Brand Kit editor as a visual editor (swatch chips, font previews, tone chips, live brand-card preview) with "Used by" registry badges, add scope subtitles to library/tool headers, and move both Animation Lab's and Templates' nav entries inside Music Video Director (Templates retitled "Music Video Templates"; the templates.ts/TemplatesView code move to apps/music-video is a separate behavior-preserving cleanup commit — template ids and stored templateId references must not change). Constraints: no View renames, no unversioned data-shape changes, no new heavy dependencies, full local-mode functionality, MV manual smoke before/after each work order, builds green per commit, Windows tauri build verified after B. Meet all §6 acceptance criteria and report against them.
