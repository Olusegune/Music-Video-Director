# Decision Log — Director Studio

> Append-only. Each entry: what changed, why it is better, risks, benefits,
> future impact. Newest first.

## D3 — 2026-07-07 · Docs become living, not archival

**What:** Nine root/spec-era markdown files and the June 17 handoff set moved to
`docs/archive/`. `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/STATUS.md`
are now the living set, updated as part of each phase's definition of done.

**Why better:** The handoff docs predated Magic Mode, the parsing engine, the
choreography redesign, and the asset-IA fix — an agent resuming from them would
rebuild shipped features. Risk: none (archived, not deleted). Future impact:
"the project never depends on one AI session" becomes enforceable.

## D2 — 2026-07-07 · Platform/app separation by convention first, folders second

**What:** The platform ↔ app boundary is documented as a table in
`ARCHITECTURE.md` and enforced in new code. The physical move to
`src/platform/` + `src/apps/music-video/` is deferred to Phase 3, as one
mechanical commit with no logic edits.

**Why better:** Moving ~40 files while behavior is also changing multiplies
regression risk for zero user value; the `@/` alias makes the later move cheap.
Risk: convention can drift — mitigated by the boundary map being part of review.
Future impact: Phase 4 (second app shell) consumes only the platform column.

## D1 — 2026-07-07 · One mode system: Director / Studio / Creator

**What:** A single platform-level `StudioMode` (`director` | `studio` |
`creator`) replaces the fragmented per-surface tiers (`MvViewMode`
simple/director/expert, `ChoreoViewMode` guided/professional). Stored once
(`mf.studioMode`), owned by `useAppStore`, switched globally in the Sidebar.
Old keys are migrated on first read (expert→creator; director/professional→
studio; simple/guided→director) and never lost.

Surface mapping:
- **Director** — guided, visual, no AI terminology (MV Director "simple" cards,
  Choreography guided view, Magic Mode as the creation flow).
- **Studio** — full professional creative controls (MV Director "director"
  view, Choreography professional view).
- **Creator** — the complete engine: prompt/model/provider panels default-open
  (MV Director "expert" behavior), routing and debug surfaces visible.

**Why better:** One mental model instead of three vocabularies; matches the
Director Studio spec exactly; future apps inherit the same three modes for
free. Risks: per-surface preferences are lost in favor of one global mode
(accepted — simpler is the point); mapping choices for 2-tier surfaces are a
judgment call (choreography professional == studio+creator). Mode changes are
presentation-only, so switching can never lose work.

**Future impact:** every new surface declares how it renders in the three
modes; no new mode flags may be added.
