# Web Studio Presets - Integration Guide

## Overview

The Web Studio Preset System provides **24 comprehensive design patterns** organized across 6 categories, with:
- Reference images from premium design examples
- AI generation prompts for each preset
- Accessibility guidelines
- Interaction specifications
- Aesthetic documentation

## Files Created

### 1. **Preset Library** (`lib/presetLibrary.ts`)
- `WEB_PRESETS` object with all 24 preset definitions
- Each preset includes:
  - Label, category, description, summary
  - Reference image path (`/presets/[name].png`)
  - Sections breakdown (hero, features, showcase, etc.)
  - Generation prompt fragments
  - Aesthetic configuration (style, typography, colors, spacing)
  - Interaction specifications
  - Accessibility requirements

### 2. **Preset Selector UI** (`features/PresetSelector.tsx`)
- Category-based sidebar navigation
- Grid/List view toggle
- Preset cards with summaries and sections
- Click-to-select with loading state
- Responsive design

### 3. **Preset Initializer** (`lib/presetInitializer.ts`)
- `initializeSectionsFromPreset()` - Creates initial SectionInstance[] from preset
- `buildPresetGenerationPrompt()` - Composes AI generation prompt
- `createProjectFromPreset()` - Creates WebsiteProject with preset data
- `composePresetPrompt()` - Multi-layer prompt composition with context
- `getPresetDesignTokens()` - Extracts CSS variables from preset

## How to Integrate

### Step 1: Add Preset Reference Images

Copy the 25 reference images to the public directory:

```bash
cp "/C/Users/eduni/Desktop/Web Preset for Web Studio"/*.png public/presets/
```

Map filenames in `presetLibrary.ts`:
- Image 1 → `ignite-festival.png` (Event/Immersive Hero)
- Image 2 → `elevate-fitness.png` (Fitness)
- Image 3 → `villa-lumiere.png` (Travel)
- etc.

### Step 2: Update Web Studio Workflow

In `WebStudio.tsx` or main workspace, add preset selection flow:

```typescript
import { PresetSelector } from "@/apps/webstudio/features/PresetSelector";
import { createProjectFromPreset } from "@/apps/webstudio/lib/presetInitializer";

function WebStudio() {
  const [selectedPreset, setSelectedPreset] = useState<PresetId | null>(null);
  const [showPresetSelector, setShowPresetSelector] = useState(true);

  if (showPresetSelector) {
    return (
      <PresetSelector
        onSelect={(presetId) => {
          // Create project from preset
          const projectData = createProjectFromPreset(
            presetId,
            "My Website",
            userBrief,
            businessContext
          );
          // Load into workspace
          initializeWorkspaceWithProject(projectData);
          setSelectedPreset(presetId);
          setShowPresetSelector(false);
        }}
      />
    );
  }

  // ... rest of workspace
}
```

### Step 3: Wire Generation Pipeline

In the generation step (when user clicks "Generate Sections"):

```typescript
import { composePresetPrompt } from "@/apps/webstudio/lib/presetInitializer";

async function generateSectionsWithPreset() {
  const promptComposition = composePresetPrompt(
    activePresetId,
    {
      brief: userBrief,
      businessContext: businessContext,
      targetAudience: audience,
      coreMessage: message,
    },
    {
      style: "professional",
      temperature: 0.7,
    }
  );

  // Send to generation API
  const generatedContent = await generateWebsiteContent({
    systemPrompt: promptComposition.systemPrompt,
    userPrompt: promptComposition.userPrompt,
    context: promptComposition.context,
  });

  // Map generated content to sections
  updateSectionsWithContent(generatedContent);
}
```

### Step 4: Add Preset Selection to Flow UI

Modify the guided flow steps to include preset selection:

```typescript
// In GuidedFlowShell.tsx or workflow steps

const WORKFLOW_STEPS = [
  { id: "business", label: "Business", component: BusinessInfoStep },
  { id: "audience", label: "Audience", component: AudienceStep },
  { id: "preset", label: "Design Style", component: PresetSelectionStep }, // NEW
  { id: "content", label: "Content", component: ContentStep },
  { id: "generate", label: "Generate", component: GenerationStep },
];
```

## Usage Example

### User Journey:
1. User enters Web Studio
2. Selects "Create New Website"
3. **Sees PresetSelector with 24 options organized by category**
4. Clicks "Luxury Product Launch" preset
5. System initializes project with:
   - 4 sections (hero, features, specs, CTA)
   - Aesthetic configuration (luxury style, serif, gold accents)
   - Interaction specs (hover effects, smooth transitions)
   - Generation prompt for AI
6. User fills in business context
7. Clicks "Generate Website"
8. AI generates content using preset-informed prompts
9. User sees rendered website with preset styling applied

## Preset Data Structure

Each preset includes:

```typescript
{
  id: "luxury-product",
  label: "Luxury Product Launch",
  category: "product-ecommerce",
  description: "High-end product photography, animated specs...",
  summary: "Exclusive luxury product launch experience",
  
  // Visual reference
  referenceImage: "/presets/aurvana-headphones.png",
  accentColor: "#D4AF37",
  
  // Section breakdown
  sections: [
    { name: "Product Hero", type: "hero", description: "..." },
    { name: "Key Innovations", type: "feature", description: "..." },
    // ...
  ],
  
  // AI generation context
  promptFragment: "luxury product launch with high-end photography...",
  
  // Design guidance
  aesthetic: {
    style: "luxury",
    typography: "serif",
    colorPalette: "black with gold accents",
    spacing: "balanced",
  },
  
  // Interaction requirements
  interactions: ["countdown-timer", "spec-animations", "smooth-hover"],
  
  // Accessibility checklist
  a11y: "Countdown timer has accessible time format, specs are in semantic tables...",
}
```

## Next Steps

### Immediate (Ready Now):
- [ ] Copy reference images to `public/presets/`
- [ ] Update filenames in presetLibrary.ts
- [ ] Integrate PresetSelector into Web Studio workflow
- [ ] Wire preset selection to project initialization
- [ ] Test preset data flow

### Phase 1 (This week):
- [ ] Build PresetSelectionStep component for guided flow
- [ ] Implement preset-informed prompt composition
- [ ] Add design token extraction for CSS variables
- [ ] Create "Apply Preset Styling" option to existing projects

### Phase 2 (Next week):
- [ ] Add preset preview (render thumbnail with actual design)
- [ ] Create preset recommendations based on business type
- [ ] Build preset comparison view
- [ ] Add "Save as Preset" for user-created templates

### Phase 3 (Future):
- [ ] User-created preset library
- [ ] Preset marketplace/sharing
- [ ] A/B testing different presets
- [ ] Preset analytics (which presets convert best)

## Reference Images Mapped

**25 reference images → 24 presets:**

| Image | Preset | Category |
|-------|--------|----------|
| IGNITE Festival | Immersive Video Hero + Event/Conference | Hero Landing + Entertainment |
| ELEVATE Fitness | Fitness/Wellness | Entertainment/Lifestyle |
| VILLA LUMIERE | Travel/Adventure | Entertainment/Lifestyle |
| ORA Restaurant | Restaurant/Hospitality + Food & Beverage | Entertainment/Lifestyle |
| ECHOES OF SILENCE | (Entertainment pattern reference) | Entertainment |
| RIVEN Artist | Music Artist/Creator | Entertainment/Lifestyle |
| ThriveTogether | Community/Mission-Driven | Corporate/Brand |
| Hope in Action | Sustainability/ESG | Corporate/Brand |
| Summit Strategy | B2B Professional Services | Corporate/Brand |
| NEXORA (API) | SaaS Dashboard | Product/E-Commerce |
| NEXORA (Blockchain) | Web3/Crypto | Tech/Web3 |
| NEXORA (Enterprise) | Enterprise Tech | Tech/Web3 |
| Flowy | SaaS/Productivity | Product/E-Commerce |
| AURVANA Headphones | Luxury Product Launch | Product/E-Commerce |
| AURORA (Lifestyle) | Fashion Brand + Fast Fashion | Entertainment + Product |
| FlowPilot | SaaS Automation | Product/E-Commerce |
| Elena Marcovà | Creative Studio + Designer Showcase | Portfolio/Creative |
| Alex Morgan | Photography Portfolio + Grid Portfolio | Portfolio/Creative |
| Alex Richards | Agency Portfolio + Designer Showcase | Portfolio/Creative |
| Obsidian Agency | Agency Portfolio + Corporate Mission | Portfolio/Creative + Corporate |
| AURORA (Creator) | Web3/Creator Platform | Tech/Web3 |
| Thrive Within | Wellness/Coaching | Entertainment/Lifestyle |
| Elevate Business | B2B Consulting | Corporate/Brand |

## Accessibility Checklist

Each preset includes specific a11y requirements:
- ✅ Text contrast ratios (WCAG AA minimum 4.5:1)
- ✅ Keyboard navigation for all interactive elements
- ✅ Screen reader friendly structure
- ✅ Captions for video content
- ✅ Proper semantic HTML markup
- ✅ Alt text for images
- ✅ Color not the only differentiator
- ✅ Readable font sizes and line heights

## Testing

Test each preset by:
1. Selecting preset in PresetSelector
2. Verifying sections load correctly
3. Checking generation prompt includes preset context
4. Rendering generated site with design tokens
5. Validating a11y guidelines applied
