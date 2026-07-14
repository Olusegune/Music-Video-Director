# Master Integration & Release Plan

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    MotionForge AI Platform                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Director Studio (Platform Core)             │   │
│  │  - Project Save/Open/List (projectPersistence.ts) ✓  │   │
│  │  - ProjectsDashboard (browse & manage) ✓              │   │
│  │  - Auto-save hook (10s interval) ✓                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Studio Modules (Each has projects)          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │   │
│  │  │ Music Video  │  │Glam Studio   │  │Web Studio  │  │   │
│  │  │ Director     │  │(Complete)    │  │(NEW)       │  │   │
│  │  └──────────────┘  └──────────────┘  └────────────┘  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │   │
│  │  │Motion Studio │  │ Campaign     │  │Character   │  │   │
│  │  │ (NEW)        │  │ Studio       │  │ Bible      │  │   │
│  │  └──────────────┘  └──────────────┘  └────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Web Studio Presets (NEW - This Sprint)       │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │ Preset Library (24 presets)                     │ │   │
│  │  │ - Hero & Landing (4)                           │ │   │
│  │  │ - Portfolio & Creative (4)                      │ │   │
│  │  │ - Product & E-Commerce (4)                      │ │   │
│  │  │ - Tech & Web3 (3)                               │ │   │
│  │  │ - Corporate & Brand (3)                         │ │   │
│  │  │ - Entertainment & Lifestyle (5)                 │ │   │
│  │  │ - Reference images (25 PNGs)                    │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │ Preset Integration                              │ │   │
│  │  │ - PresetSelector component                      │ │   │
│  │  │ - Preset initializer (sections + prompts)       │ │   │
│  │  │ - Generation pipeline wiring                    │ │   │
│  │  │ - Design token extraction                       │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Shared Systems (Cross-studio)                │   │
│  │  - Universal Generation Panel ✓                      │   │
│  │  - Prompt Pipeline & Composition ✓                   │   │
│  │  - Provider Routing (multi-model) ✓                  │   │
│  │  - Reference Lab (mood boards & assets) 🔲            │   │
│  │  - Asset Library ✓                                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
     ↓
┌──────────────────┐
│  Windows EXE     │
│  Tauri Build     │
│  (Publish)       │
└──────────────────┘
```

## Completion Checklist

### Phase 1: Preset System Integration (TODAY)
- [ ] Copy 25 reference images to `public/presets/`
- [ ] Update preset filenames in presetLibrary.ts
- [ ] Create PresetSelectionStep component for guided flow
- [ ] Wire preset selection → project initialization → generation
- [ ] Test preset → sections → content generation flow
- [ ] Add preset context to generation prompts

### Phase 2: System Connectivity (TODAY)
- [ ] Verify projectPersistence.ts handles Web Studio projects
- [ ] Test save/open/list with preset-based projects
- [ ] Auto-save integration for Web Studio projects
- [ ] Cross-studio project navigation (Recent Projects)
- [ ] Project type badges and filtering

### Phase 3: Usability Improvements (TODAY)
- [ ] Add "Recent Projects" quick access on dashboard
- [ ] Add project thumbnails/previews
- [ ] Quick-create buttons in each studio (New Web Project, etc.)
- [ ] "Duplicate Project" as template
- [ ] Project search by name/client/type
- [ ] Storage quota indicator (already done, verify)
- [ ] Keyboard shortcuts for common actions
- [ ] Onboarding flow improvements
- [ ] Empty state guidance for new users

### Phase 4: QA Testing (TODAY)
- [ ] Full workflow test: New Project → Select Preset → Generate → Save
- [ ] Cross-studio project navigation
- [ ] Browser refresh persistence (does saved project load?)
- [ ] Multiple browser tabs synchronization
- [ ] Edge cases: Concurrent edits, storage quota, large projects
- [ ] All CTAs and buttons work
- [ ] Mobile responsiveness (if supported)
- [ ] Accessibility audit (WCAG 2.1 AA)

### Phase 5: Windows Build & Publish (TODAY)
- [ ] npm run build (verify no errors)
- [ ] npm run tauri build (create MSI installer)
- [ ] Code signing (optional, for trusted installer)
- [ ] Publish to deployment location
- [ ] Create installation guide
- [ ] Version numbering (v1.4.0 with presets)

### Phase 6: Post-Launch Polish (NEXT)
- [ ] Analytics (which presets are most used?)
- [ ] User feedback collection
- [ ] Performance optimization (large projects)
- [ ] Advanced features (preset customization, user presets)

## Detailed Tasks

### TASK 1: Copy Preset Images
**File**: Copy PNGs from Desktop to public/presets/
**Mapping needed**: Match image filenames to preset IDs

### TASK 2: Web Studio Project Support
**Files to update**:
- `projectPersistence.ts` - Add WebStudio project type support
- `types.ts` - Ensure WebsiteProject type works with persistence

### TASK 3: Preset Selection Flow
**New component**: `PresetSelectionStep.tsx`
- Category grid or list
- Preset cards with preview
- Selection confirmation
- "Start with this preset" button

**Integration points**:
- Guided flow routing
- Project initialization
- Metadata storage

### TASK 4: Generation Pipeline
**Files to update**:
- `UniversalGenerationPanel.tsx` - Include preset context
- `promptPipeline.ts` - Inject preset prompts

**Logic**:
- Load active preset
- Compose prompt with preset guidance
- Send to provider
- Map result to preset sections

### TASK 5: Usability Enhancements
**Dashboard improvements**:
- [ ] Recent Projects widget (sort by updatedAt)
- [ ] Project quick-create dropdown in Sidebar
- [ ] "Start New [Type]" buttons in each module
- [ ] Search bar for projects
- [ ] Filter by studio module
- [ ] Bulk actions (archive, duplicate, delete)

**Navigation**:
- [ ] Breadcrumbs in workspace
- [ ] "Back to dashboard" button in each module
- [ ] Project switcher dropdown
- [ ] Quick navigation menu (⌘K or Ctrl+K)

**Onboarding**:
- [ ] First-time user modal
- [ ] Feature tour (skip option)
- [ ] Help center (accessible from all pages)
- [ ] Contextual tooltips

### TASK 6: Testing Checklist
**Manual testing**:
```
New Project Flow:
□ Dashboard → New Project
□ Enter project name & type
□ Select preset (if Web Studio)
□ Fill business context
□ Generate website
□ Verify sections created
□ Verify design aesthetic applied
□ Save project
□ Close browser/tab
□ Reopen project → loads correctly

Project Management:
□ Create project
□ View in dashboard
□ Open project
□ Duplicate project
□ Export/import project
□ Delete project
□ Search projects
□ Filter by type
□ View storage quota

Cross-Studio:
□ Create Web Studio project
□ Create Music Video project
□ Navigate between projects
□ Recent projects updated
□ Projects persist across studios

Generation:
□ Preset → prompt composition
□ Prompt includes aesthetic guidance
□ Generated content matches preset
□ Sections generated in order
□ Content editable after generation
```

### TASK 7: Windows Build
```bash
# Build
npm run build

# Package for Windows
npm run tauri build

# Verify
ls -la src-tauri/target/release/

# Test installer
./MotionForge\ AI_1.4.0_x64_en-US.msi

# Create deployment package
```

## File Locations & System Map

```
src/
├── app/
│   └── App.tsx (routing, main component)
│
├── platform/
│   ├── lib/
│   │   ├── projectPersistence.ts ✓ (save/open)
│   │   ├── promptPipeline.ts ✓ (prompt composition)
│   │   └── settings.ts ✓ (user preferences)
│   │
│   ├── store/
│   │   └── useAppStore.ts ✓ (global state)
│   │
│   ├── features/
│   │   ├── projects/
│   │   │   ├── ProjectsDashboard.tsx ✓ (browse projects)
│   │   │   ├── ProjectWorkspace.tsx ✓ (open project)
│   │   │   └── NewProjectWizard.tsx ✓ (create new)
│   │   │
│   │   ├── generation/
│   │   │   ├── UniversalGenerationPanel.tsx ✓ (generate)
│   │   │   ├── GenerationProgress.tsx ✓ (progress)
│   │   │   ├── PromptComposition.tsx ✓ (prompt editor)
│   │   │   └── AdvancedGenerationSettings.tsx ✓ (settings)
│   │   │
│   │   └── referencelab/
│   │       ├── ReferenceLabDrawer.tsx 🔲 (mood boards)
│   │       └── MoodBoardPanel.tsx 🔲
│   │
│   └── components/
│       ├── layout/
│       │   ├── Sidebar.tsx ✓ (navigation)
│       │   ├── Inspector.tsx ✓ (details panel)
│       │   └── ModuleHeader.tsx ✓ (studio header)
│       │
│       └── ui/ (design system)
│
└── apps/
    ├── webstudio/
    │   ├── lib/
    │   │   ├── presetLibrary.ts 🆕 (24 presets)
    │   │   ├── presetInitializer.ts 🆕 (preset logic)
    │   │   ├── types.ts ✓ (WebsiteProject type)
    │   │   ├── siteCompiler.ts ✓ (render)
    │   │   └── PRESET_INTEGRATION.md 🆕 (guide)
    │   │
    │   └── features/
    │       ├── PresetSelector.tsx 🆕 (browse presets)
    │       ├── PresetSelectionStep.tsx 🔲 (workflow step)
    │       └── workspace/
    │           └── WebStudioWorkspace.tsx ✓ (edit)
    │
    ├── motion-studio/
    │   └── MotionStudio.tsx (phase 2)
    │
    ├── glam-studio/
    │   └── GlamStudio.tsx ✓ (complete)
    │
    ├── music-video/
    │   └── features/
    │       └── mvdirector/
    │           └── MvDirector.tsx ✓ (complete)
    │
    └── campaign/
        └── CampaignStudio.tsx (phase 2)

public/
└── presets/ 🔲 (25 PNG reference images)
    ├── ignite-festival.png
    ├── elevate-fitness.png
    ├── villa-lumiere.png
    └── ... (22 more)

Legend:
✓ = Complete & working
🔲 = Needs implementation
🆕 = Just created
```

## Success Criteria

✅ **Functionality**:
- [ ] All 24 presets available in Web Studio
- [ ] Preset selection creates appropriate sections
- [ ] Generation prompts include preset aesthetic
- [ ] Projects save and load correctly
- [ ] Save system works across all studios
- [ ] Auto-save prevents data loss

✅ **Usability**:
- [ ] New users understand how to create projects
- [ ] Dashboard gives clear project overview
- [ ] Recent projects easily accessible
- [ ] Keyboard shortcuts for power users
- [ ] Empty states have helpful guidance
- [ ] Error messages are clear and actionable

✅ **Quality**:
- [ ] No console errors in main flow
- [ ] All CTAs and buttons functional
- [ ] WCAG 2.1 AA accessibility compliance
- [ ] Responsive design (desktop primary)
- [ ] Performance acceptable (< 3s load time)

✅ **Deployment**:
- [ ] Windows MSI installer works
- [ ] App launches without errors
- [ ] Projects persist on disk (Tauri storage)
- [ ] Version number updated (v1.4.0)
- [ ] Installation guide provided

## Next Steps

1. **NOW**: Execute tasks 1-5 in parallel
2. **THEN**: Complete QA testing (task 6)
3. **FINALLY**: Build Windows app (task 7)

Estimated time: **4-6 hours** for full completion + testing + build
