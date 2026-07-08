# Director Studio — Studio UX Redesign & Creative Identity Handover

Prepared 2026-07-08. This document captures the UX critique, IA critique, implementation plan, and acceptance criteria for making Director Studio feel like a cohesive creative suite rather than a single dashboard with many pages.

## Executive critique

Director Studio now has the right product ambition: one shell, multiple specialized creative apps. The remaining issue is experiential. The application still often reads as “one admin interface with different labels,” because the shell, navigation, card language, empty states, and workspace hierarchy are too similar across modules.

The target should be closer to Adobe Creative Cloud, Framer, Figma, DaVinci Resolve, and Linear: one ecosystem, but each studio should feel like a place with its own material, rhythm, and visual vocabulary.

## UX critique

### What is working

- The Director Studio concept is strong: the suite wrapper is correct and should not be weakened.
- Shared infrastructure is emerging cleanly: deliverables, storage, guided flows, module headers, project cards, reveal stages.
- Dark mode gives the product a cinematic foundation.
- The new visual project layer is the right direction for project memory and creative outputs.

### What still feels too dashboard-like

- Several studio homes still open with utility cards before creative intent.
- Studio identity is expressed mostly through labels and icons, not workspace composition.
- The sidebar exposes too many altitudes at once: global studios, Music Video workflow internals, production library, tools, and system settings.
- Project creation often begins with forms before visual choice.
- Visual hierarchy sometimes gives equal weight to setup controls, project memory, engine resources, and creative work.

## Information architecture critique

The attached IA plan is directionally correct. The current sidebar is flat and mixes:

1. suite-level studios,
2. Music Video Director sub-tools,
3. production libraries,
4. platform tools,
5. system settings.

This makes Director Studio feel like a large internal tool. The next IA pass should introduce a module layer above the current `View` union:

- Keep the existing store `View` values.
- Derive `activeModule` from view.
- Render studios as primary destinations.
- Show Music Video sub-items only when Music Video Director is active.
- Boot to Dashboard, not Song Studio.
- Keep active module derived, not persisted.

Recommended implementation source: `docs/IA-NAVIGATION-PLAN.md`.

## Navigation improvements

1. Treat the sidebar as studio entry, not a full sitemap.
2. Keep Music Video internals under Music Video Director:
   - Song Studio
   - Direct
   - Cast
   - Choreography
   - Timeline
3. Keep Dashboard, Templates, Script Studio, Animation Lab, and Export Center as tools.
4. Make “New production” module-aware:
   - inside a studio: start that studio’s flow,
   - outside a studio: open a five-studio chooser.
5. Prefix search results by module, for example `Music Video · Cast`.

## Studio separation recommendations

### Music Video Director

Desired identity: music-focused, performance, waveform, stage, artist, cinematic purple.

Recommended changes:

- Treat waveform as the hero object, not just an editor row.
- Add artist/performance visual empty states.
- Group Song, Direct, Cast, Choreography, and Timeline as one visible production journey.
- Keep the current behavior intact; this is a presentation and IA refinement.

### Motion Studio

Desired identity: animation, storyboards, dynamic template selection, motion graphics, product films.

Implemented in this pass:

- Production template selector changed from text list to large visual artwork cards.
- Cards use supplied artwork as uncropped hero images with `object-contain`.
- Hover state includes slight lift, soft shadow, purple glow, and subtle image zoom.
- Motion Studio hero now has stronger cinematic lighting and hierarchy.

Next refinements:

- Convert visual style selector to image/material swatches.
- Add a storyboard strip immediately after generation.
- Make the active scene inspector feel like an animation timeline, not a settings panel.

### Glam Studio

Desired identity: luxury, editorial, fashion, beauty, premium photography, elegant typography, soft lighting.

Recommended changes:

- Use large editorial preview surfaces for look selection and campaign concepts.
- Let gold, violet, and soft skin-tone lighting drive the workspace.
- Keep controls sparse and high-end; avoid dense utility cards.

### Web Studio

Desired identity: clean, minimal, modern, grid systems, responsive layouts, live previews.

Recommended changes:

- Make the website preview the dominant object.
- Use grid overlays, device frames, breakpoint tabs, and layout cards.
- Treat sections like composable design blocks rather than generic form options.

### Campaign Studio

Desired identity: marketing strategy, launch calendar, advertising, moodboards, campaign assets, presentation feel.

Recommended changes:

- Lead with campaign board/moodboard surfaces.
- Make channel mix and deliverables visual.
- Emphasize launch timeline, message pillars, and asset families.

## Motion Studio redesign recommendations

Current Motion Studio should evolve into a template-first creative tool:

1. Visual template cards before forms.
2. Form fields as supporting setup, not the main event.
3. Storyboard scene cards with richer thumbnails.
4. Timeline/export panel with more cinematic motion-language cues.
5. “Generate storyboard” should feel like a creative action, not a submit button.

The supplied artwork is especially useful because it communicates format and creative quality before the model does anything.

## Code changes completed in this pass

Affected files:

- `src/assets/motion-templates/*`
- `src/apps/motion-studio/lib/templates.ts`
- `src/apps/motion-studio/MotionStudio.tsx`

What changed:

- Added nine template artwork files.
- Added `imageUrl`, `accent`, and `eyebrow` metadata to each Motion production template.
- Replaced the old text-only production type list with a large visual card grid.
- Preserved template selection behavior and project creation logic.
- Added uncropped hero images, rounded corners, glass panel treatment, hover lift, shadow, purple glow, and subtle image zoom.
- Added stronger Motion Studio hero treatment and selected-template summary.

## Refactoring recommendations

1. Extract `MotionTemplateCard` into `src/apps/motion-studio/components/MotionTemplateCard.tsx` once Motion Studio grows another component pass.
2. Move Motion Studio page sections into `features/setup`, `features/storyboard`, and `features/export`.
3. Add a shared `StudioSurface` primitive for module-specific background lighting and spacing.
4. Add a `studioIdentity.ts` map for module accent color, gradient, placeholder art, and tone.
5. Implement `navModel.ts` from the IA plan before the next major shell redesign.

## Implementation order for the next Codex pass

1. Implement the IA/navigation restructure from `docs/IA-NAVIGATION-PLAN.md`.
2. Add `studioIdentity.ts` so each module has a consistent accent system.
3. Upgrade Music Video Director visual hierarchy without changing behavior.
4. Upgrade Web Studio preview-first workspace.
5. Upgrade Campaign Studio board/presentation workspace.
6. Upgrade Glam Studio editorial/luxury workspace.
7. Extract repeated visual primitives only after two or more studios share the same pattern.

## Risks

- Large image assets increase package size. If release size becomes a concern, convert Motion template artwork to high-quality WebP/JPEG while preserving typography.
- Over-styling can reduce usability. Keep transitions at 150–250ms and avoid bounce/confetti.
- Sidebar IA changes can break muscle memory. Preserve search, shortcuts, and existing store actions.
- Do not persist active module. Derive it from current view.
- Music Video behavior must remain untouched during visual/IA work.

## Acceptance criteria

### Motion Studio card pass

- Production templates render as large visual cards.
- Each card includes hero image, template name, and short description.
- Images preserve typography and composition with `object-contain`.
- Hover includes slight lift, soft shadow, purple glow, and subtle image zoom.
- Selecting a card still updates `draft.typeId` and `durationSec`.
- Project creation behavior remains unchanged.

### Suite-level creative identity pass

- Each studio answers “yes” to: does this feel like a specialized creative application?
- Music Video feels music/performance-first.
- Motion feels animation/template/storyboard-first.
- Glam feels luxury/editorial-first.
- Web feels preview/grid/layout-first.
- Campaign feels strategy/launch/moodboard-first.
- Shared shell remains cohesive and recognizably Director Studio.

### IA pass

- Sidebar shows studios as doors.
- Music Video sub-tools appear only within Music Video Director.
- Dashboard becomes boot view.
- Existing navigation actions and shortcuts remain valid.
- No URL router added.
- No persisted nav state added.
