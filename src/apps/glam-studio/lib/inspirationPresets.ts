// Inspiration Library — curated mood/composition/lighting vocabulary in the
// spirit of well-known photographic and cinematic traditions. These describe
// a *visual language* (staging, contrast, color temperament, camera
// relationship to subject) — never a named person's identity, never "in the
// style of [name]," and never anything that would reproduce a specific
// copyrighted image. The prompt fragments read like a creative director's
// brief, not an attribution.

export interface InspirationPreset {
  id: string;
  name: string;
  group: "Photography" | "Cinema" | "Luxury Advertising";
  /** Short line shown on the card — the visual language, not a person's name-as-style. */
  summary: string;
  promptFragment: string;
}

export const INSPIRATION_PRESETS: InspirationPreset[] = [
  {
    id: "insp-bold-celebrity",
    name: "Bold Environmental Portraiture",
    group: "Photography",
    summary: "Dramatic staging, saturated color, theatrical confidence",
    promptFragment:
      "bold, theatrical environmental portraiture: saturated color, confident staging, the subject as the clear protagonist of a constructed scene",
  },
  {
    id: "insp-surreal-fashion",
    name: "Surreal Fashion Fantasy",
    group: "Photography",
    summary: "Whimsical sets, storybook color, playful surrealism",
    promptFragment:
      "surreal fashion fantasy: whimsical oversized sets, storybook color palettes, playful theatrical surrealism grounded in real craftsmanship",
  },
  {
    id: "insp-cinematic-bw",
    name: "Cinematic Black & White",
    group: "Photography",
    summary: "Timeless monochrome, painterly light, quiet intensity",
    promptFragment:
      "cinematic black-and-white portraiture: timeless monochrome tonal range, painterly directional light, quiet psychological intensity",
  },
  {
    id: "insp-hyperreal-editorial",
    name: "Hyperreal Editorial Edge",
    group: "Photography",
    summary: "Sharp, provocative, high-fashion tension",
    promptFragment:
      "hyperreal high-fashion editorial: sharp graphic composition, provocative confident posing, controlled tension between subject and set",
  },
  {
    id: "insp-jet-set-glamour",
    name: "Jet-Set Glamour",
    group: "Photography",
    summary: "Sun-drenched luxury, effortless movement, warm film tone",
    promptFragment:
      "jet-set glamour photography: sun-drenched luxury settings, effortless captured movement, warm film-like color rendering",
  },
  {
    id: "insp-clean-modern-beauty",
    name: "Clean Modern Beauty",
    group: "Photography",
    summary: "Minimal set, precise retouch-ready lighting",
    promptFragment:
      "clean modern beauty photography: minimal uncluttered set, precise even lighting built for flawless retouch-ready skin rendering",
  },
  {
    id: "insp-naturalist-cinema",
    name: "Naturalist Cinematography",
    group: "Cinema",
    summary: "Available light, muted palette, observational realism",
    promptFragment:
      "naturalist cinematography: motivated available light, muted desaturated palette, observational documentary-like realism",
  },
  {
    id: "insp-epic-scale",
    name: "Epic Scale Cinematography",
    group: "Cinema",
    summary: "Vast wide frames, human figure against scale",
    promptFragment:
      "epic-scale cinematography: vast wide-format framing, the human figure set against overwhelming natural or architectural scale",
  },
  {
    id: "insp-intimate-handheld",
    name: "Intimate Handheld Realism",
    group: "Cinema",
    summary: "Close, textured, emotionally immediate",
    promptFragment:
      "intimate handheld cinematic realism: close emotional framing, tactile texture, immediate and unguarded presence",
  },
  {
    id: "insp-neon-noir",
    name: "Neon Noir Cinematography",
    group: "Cinema",
    summary: "Wet streets, saturated neon, deep shadow",
    promptFragment:
      "neon noir cinematography: rain-slicked reflective surfaces, saturated neon color accents against deep controlled shadow",
  },
  {
    id: "insp-minimal-tech-luxury",
    name: "Minimal Tech Luxury",
    group: "Luxury Advertising",
    summary: "Precision product staging, restrained palette, negative space",
    promptFragment:
      "minimal tech-luxury advertising: precision-engineered product staging, restrained monochrome-leaning palette, generous confident negative space",
  },
  {
    id: "insp-heritage-craft",
    name: "Heritage Craft Luxury",
    group: "Luxury Advertising",
    summary: "Atelier textures, warm materials, timeless restraint",
    promptFragment:
      "heritage craft luxury advertising: atelier-inspired textures, warm natural materials, timeless understated restraint over flash",
  },
  {
    id: "insp-performance-automotive",
    name: "Performance Automotive Drama",
    group: "Luxury Advertising",
    summary: "Low hero angles, controlled reflections, kinetic tension",
    promptFragment:
      "performance automotive advertising: low dramatic hero angles, controlled specular reflections, a sense of coiled kinetic tension",
  },
];
