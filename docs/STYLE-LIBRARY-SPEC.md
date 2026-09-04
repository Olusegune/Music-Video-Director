# Style Library Spec — Story Maker & Motion Studio

> Complete specification for capturing, comparing, and drift-detecting visual styles across multi-asset productions.

## Section 1: Style DNA (Complete)

**Status**: Shipped in `src/platform/lib/styleDna.ts`

### What it is

A reusable visual-style profile that captures the full aesthetic of a project so it can be applied to new generations and stay consistent across a whole campaign.

### Data model

```typescript
interface StyleDna {
  id: string;
  name: string;                      // e.g. "Luxury Cosmetics – Spring '26"
  visualLanguage: string;            // e.g. "minimal chic, editorial"
  colorPalette: string[];            // hex codes
  typography: string;                // e.g. "geometric sans, light weight, tall x-height"
  materials: string;                 // e.g. "matte porcelain, glass, brushed metal"
  mood: string;                       // e.g. "serene, aspirational, timeless"
  atmosphere: string;                // e.g. "soft diffused light, luxury studio"
}
```

### Operations

1. **Capture** — extract style from current `PromptPack.style` (after a hero or full storyboard is approved)
2. **Apply** — load a saved DNA and overlay it onto a new pack's style block
3. **List** — show all saved DNAs grouped by module (Motion, Glam, Web, Campaign)
4. **Delete** — remove a saved profile

### UX placements

- **Motion/Glam**: hero generation result → "Save as Style DNA" button (requires approval first)
- **Reuse**: when starting a new project flow, show saved DNAs as cards; click to pre-fill

---

## Section 2: Style-Consistency / Drift Detection

**Status**: In progress (this spec)

One of Story Maker's strongest advantages: after directing a full production with a style, **instantly check if a new scene or variant is drifting** from that look. This catches subtle inconsistencies that break continuity and helps users steer generations back on-brand before wasting time on finals.

### Philosophy

- **User-initiated, not silent** — checking style drift costs API quota; it must be a deliberate button click, not automatic post-generation
- **Visual scoring, not just yes/no** — show *how much* drift in each dimension (color, materials, mood, etc.) so users can choose to accept minor variations or demand perfect lock
- **Non-blocking** — drift check result is informational; it never prevents a user from approving or exporting, but flags risk
- **Part of the variation grid** — integrates naturally with the existing multi-result review UI, where users already compare similar outputs

### Data model

```typescript
/** Result of comparing a generated asset against a saved Style DNA. */
interface DriftReport {
  styleDnaId: string;
  styleDnaName: string;
  checked: number;                          // ISO 8601 timestamp
  
  // Per-dimension scores (0 = perfect match, 100 = maximum drift).
  colorDrift: number;                       // palette consistency
  typographyDrift: number;                  // text treatment and weight
  materialDrift: number;                    // surface/texture alignment
  moodDrift: number;                        // emotional consistency
  atmosphereDrift: number;                  // light, depth, space
  
  // Overall composite score — weighted average, user-configurable (default: equal weight).
  compositeDrift: number;                   // 0 = locked, 100 = completely different
  
  // Human-readable explanation of each dimension (generated, not templated).
  findings: {
    color: string;                          // e.g. "Palette uses cool mint and slate, DNA expects warm gold and cream."
    typography: string;
    materials: string;
    mood: string;
    atmosphere: string;
  };
  
  // Suggestions for steering the style back (if drift > 30).
  suggestions: string[];                    // e.g. ["Add warm tones to foreground", "Soften lighting to diffuse"]
}
```

### Comparison logic

The drift check is an API call to a structured-text provider (Gemini, Claude if available) that:

1. Receives the saved Style DNA (all fields)
2. Receives an image or video keyframe URL
3. Receives the generation prompt (context)
4. Returns a `DriftReport` as JSON

The provider analyzes the asset visually and returns dimension scores, findings, and suggestions.

**Fallback**: If no provider is configured or the asset URL is inaccessible, show an honest disabled button ("No provider configured").

**Cost transparency**: The button shows "(1 API check)" on hover so users know it will use quota.

### UX flow

#### A. In the generation result grid

After generation completes and the user sees variations:

```
[Result 1 Image]    [Result 2 Image]
  • Use this        • Use this
  • Save             • Save
  
┌─────────────────────────────────┐
│  🎨 Check Style Drift           │
│  Compare with "Luxury Cosmetics" │
│  (1 API check)                   │
└─────────────────────────────────┘
```

Clicking "Check Style Drift" opens a panel showing:

```
Comparing against: Luxury Cosmetics (DNA saved on 2026-05-14)
────────────────────────────────────────────────────────────

Result 1:
  Color Drift:        ████░░░░ 45%
  Typography Drift:   ██░░░░░░ 20%
  Material Drift:     ███░░░░░ 32%
  Mood Drift:         ██░░░░░░ 18%
  Atmosphere Drift:   █████░░░ 55%
  ────────────────────────────
  Overall Drift:      34% (ACCEPTABLE)
  
  Findings:
  • Color: Palette uses cool mint and slate, DNA expects warm gold and cream.
  • Mood: Less opulent; softer, more editorial than DNA directs.
  
  Suggestions to reduce drift:
  • "Add warm gold accents to the background"
  • "Increase lighting drama and shadow depth"
  • "Use more saturated materials; less matte, more gloss"

  [ Regenerate with feedback ] [ Accept drift ] [ Regenerate with DNA enforced ]
```

#### B. Batch checking (optional, Phase 2)

For a full storyboard or multi-scene project, a "Check All Scenes" button runs drift checks in parallel and shows:

```
Consistency Report: "Project: Summer Campaign"

Scenes with acceptable drift:        ✓ 8 scenes (drift < 40%)
Scenes with minor drift:              ⚠ 3 scenes (drift 40–60%)
Scenes with major drift:              ✗ 1 scene (drift > 60%)

Highest-drift scene: "Scene 7 – Product Close-up" (72% drift)
```

### Thresholds and UI states

- **0–25% drift**: ✓ Green indicator — "locked style"
- **26–50% drift**: ⚠ Amber indicator — "acceptable variation"
- **51–75% drift**: ⚠ Orange indicator — "consider regenerating"
- **76–100% drift**: ✗ Red indicator — "significant drift, recommend regenerate"

Users can set their own tolerance (default: 50% acceptable).

### Button placement strategy

Three placements, priority order:

1. **Primary**: In the generation result grid (after every image/video generation)
2. **Secondary**: In scene/asset detail view, as a standalone "Check style consistency" action
3. **Tertiary**: In the production summary/consistency dashboard (future, Phase 2)

### Implementation notes

#### API contract

Call the structured-text provider with a schema-validated JSON input:

```typescript
interface DriftCheckRequest {
  styleDnaProfile: StyleDna;
  assetUrl: string;                         // image or video keyframe URL
  generationPrompt: string;                 // full prompt that generated this
  dimensionWeights?: Record<string, number>; // override default equal weights (optional)
}
```

Expected response schema: `DriftReport` (above).

**Validation**: Every field from the provider is validated before it reaches the UI. If any field fails validation (e.g., a non-numeric drift score), log a warning and show a generic "drift check failed" message rather than breaking the display.

#### State management

- **Drift check state**: Added to the generation result state (alongside results, error, etc.)
  - `driftChecking: boolean` — API in flight
  - `driftReport: DriftReport | null` — latest report (persists across result tabs if user switches)
  - `driftError: string | null` — honest error message if check failed
  
- **Caching**: Never cache or persist drift reports between sessions; they're tied to transient generation results.

#### Permission model

Drift checking is an API call, so it inherits the existing provider-router permission model. If the user has set a fallback provider (Gemini, Claude), it works automatically. If not, the button is disabled with a clear message.

### Relationship to Style DNA workflow

1. **First use**: User generates a hero or approves a storyboard → saves it as a Style DNA
2. **Subsequent generations**: New scenes auto-check against that DNA (if user enables auto-check preference, Phase 2)
3. **Drift detected**: User either regenerates with "enforce style" flag or accepts the variation
4. **Save new variant**: If the drift is interesting/approved, user can save it as a new DNA variant

This creates a living style guide that evolves with the project.

---

## Section 3: Advanced Features (Future)

### 3.1 Style transfer / enforced DNA regeneration

When drift check shows unacceptable variation:

```
[ Regenerate: Enforce DNA ] — retry with appended style instruction

New prompt suffix (auto-added):
"Maintain exact color palette from reference: [colors]. 
Lighting/mood must match: [mood description]. 
Materials: [materials]."
```

This is a *suggested* prompt patch, not mandatory enforcement (no regeneration API can truly "lock" a model). The user can edit it before retrying.

### 3.2 Comparison mode: side-by-side drift scoring

When user hovers two results:

```
Result A vs Result B

Color Drift (vs DNA): A: 32% | B: 45%  →  Result A is more on-brand
Mood Drift:          A: 18% | B: 62%  →  Result A is more on-brand
```

Helps users quickly pick the more on-brand variant without opening individual reports.

### 3.3 Drift history / trend analysis

Track drift over a production:

```
Scene 1: 24% drift ✓
Scene 2: 31% drift ✓
Scene 3: 18% drift ✓
Scene 4: 67% drift ✗  ← slipping
Scene 5: 71% drift ✗  ← prompt needs adjustment
```

Suggests regenerating scenes 4–5 with stricter style steering.

### 3.4 Custom weighting

User can adjust dimension weights:

```
[ Presets: Standard | Photography | Animation | Custom ]

Custom weights:
Color:       100% ■■■■■ (critical for product)
Typography: 60%  ■■■░░
Material:    100% ■■■■■
Mood:        80%  ■■■■░
Atmosphere: 40%  ■■░░░

Apply to future checks? [ Yes / No ]
```

---

## Section 4: Motion Studio Integration

Motion Studio uses drift detection in the storyboard workflow:

### Phase 1: Single-scene checking

After generating or editing a scene's image/video:

```
ScenePreview (renders video/image or fallback gradient)
  └─ Hover footer:
     • Model: "GPT Image"
     • Check style drift [if DNA loaded]
```

### Phase 2: Storyboard consistency dashboard

After full storyboard generation:

```
Storyboard: "SaaS Explainer – Spring '26"
Directed by: Style DNA "Minimalist Tech"

Scene 1 (0–5s)  |████░░| 32% drift ✓
Scene 2 (5–10s) |████░░| 35% drift ✓
Scene 3 (10–15s)|████░░| 38% drift ✓
Scene 4 (15–20s)|██████| 68% drift ✗ [Regenerate]
Scene 5 (20–25s)|█████░| 62% drift ⚠ [Review]

Action: [ Regenerate drifted scenes with enforced DNA ]
        [ Accept and proceed to Timeline ]
```

---

## Section 5: API Costs & Transparency

### Per-check cost

One drift check = one structured-text LLM call (vision-capable for images, or transcript-from-video + text for video).

**Estimated cost** (2026 pricing):
- Gemini: $0.001–$0.005 per check
- GPT-4V: $0.01–$0.03 per check
- Claude 3.5 Vision: $0.003–$0.015 per check

Users should know: 10 scenes × 2 variations = 20 potential checks.

### Disclosure in UI

- Button always shows "(1 API check)" on hover
- If user has API quota warnings enabled, show: "1 API check remaining quota: 100 calls"
- After a check, show the cost in the result (e.g., "Checked (0.005 credits)")

### Preference: auto-check option (Phase 2)

```
[ Preferences > Generation ]

☐ Auto-check new generations against saved Style DNA
  "Slow but keeps style locked; uncheck to skip checks"
```

When enabled, every generation automatically runs drift check in the background. When disabled (default), user clicks the button.

---

## Section 6: Testing & Acceptance

### Unit tests

- `styleDna.test.ts` — load/save/apply/delete operations
- `driftReport.test.ts` — JSON schema validation, score calculations
- Mocked provider calls (no real API quota used)

### Integration tests

- Generate a scene → check drift → confirm report renders
- Drift check with missing/invalid URL → honest error
- Multiple scenes, parallel drift checks → all complete
- Cost annotation appears in result

### Smoke test

```bash
npm run test:drift-consistency
```

Verifies:
- Style DNA save/load roundtrip
- Drift check UI renders without error
- Report is valid JSON, passes schema
- Button is disabled when no provider is configured
- Threshold colors (green/amber/red) apply correctly

---

## Section 7: Rollout Plan

### Phase 1 (This spec)

✓ Style DNA system (already shipped)
→ Drift checking UI + API call
→ Single-scene checking in Motion Studio
→ Button placement in generation result grid
→ Clear cost transparency
→ Validation & error handling

Deliverables:
- `src/platform/lib/driftDetection.ts` (API call, schema, validation)
- `src/platform/components/DriftReport.tsx` (render results)
- `src/platform/components/DriftCheckButton.tsx` (trigger + loading state)
- Motion Studio integration point (button in scene preview)
- Tests & smoke pass

### Phase 2 (Future)

- Batch checking (all scenes at once)
- Enforced-DNA regeneration
- Side-by-side comparison scoring
- Drift history / trend graph
- Custom weighting preferences
- Auto-check toggle

### Phase 3 (Future)

- Glam Studio integration
- Web Studio style consistency
- Campaign cross-module consistency checking

---

## Acceptance Criteria

✓ User can save a Style DNA from an approved generation  
✓ User can load a saved DNA when starting a new project  
✓ User can click "Check drift" on any generation result  
✓ Drift check returns a scored report (0–100 per dimension)  
✓ Report shows findings and suggestions (human-readable)  
✓ UI threshold colors (green/amber/red) match drift score  
✓ Button shows "(1 API check)" to disclose cost  
✓ Disabled with honest reason if no provider configured  
✓ Error handling: invalid URL, failed API call, bad JSON → user-facing message  
✓ Motion Studio scene preview shows drift check button  
✓ Cost annotation appears in result (if provider includes it)  
✓ Smoke test passes: `npm run test:drift-consistency`

---

## Spec versioning

- **v1.0** (2026-07-20): Sections 1–2 complete; phase 1 deliverables defined
- **v1.1** (TBD): Phase 2 features added after user feedback
- **v2.0** (TBD): Expand to Glam, Web, Campaign modules
