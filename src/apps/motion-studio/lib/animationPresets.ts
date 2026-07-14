// Animation Type Presets: the core movement vocabulary (dance, athletic, fluid, etc.)
// Single-select. Determines the fundamental character of motion.

export interface AnimationTypePreset {
  id: string;
  label: string;
  family: "structured" | "organic" | "synthetic" | "expressive";
  summary: string;
  promptFragment: string;
}

export const ANIMATION_TYPE_PRESETS: AnimationTypePreset[] = [
  {
    id: "anim-dance",
    label: "Dance",
    family: "structured",
    summary: "Choreographed, rhythmic, intentional",
    promptFragment: "dance choreography with rhythmic, intentional movement, structured timing, clear spatial patterns aligned to music beats, ensemble or featured presence.",
  },
  {
    id: "anim-athletic",
    family: "structured",
    label: "Athletic",
    summary: "Sports-inspired, explosive, powerful",
    promptFragment: "athletic movement with explosive power, sport-inspired timing, dynamic poses, clear weight transfer, strength and confidence.",
  },
  {
    id: "anim-fluid",
    family: "organic",
    label: "Fluid",
    summary: "Liquid-like, organic, continuous",
    promptFragment: "fluid, organic motion with continuous flow between poses, water-like quality, smooth transitions, natural arcs.",
  },
  {
    id: "anim-geometric",
    family: "synthetic",
    label: "Geometric",
    summary: "Sharp, angular, grid-aligned",
    promptFragment: "geometric, angular movement with sharp lines, precise edges, grid-aligned formations, mathematical precision.",
  },
  {
    id: "anim-whimsical",
    family: "expressive",
    label: "Whimsical",
    summary: "Playful, bouncy, exaggerated",
    promptFragment: "whimsical, playful movement with bouncy energy, exaggerated arcs, joyful timing, cartoon-inspired expressions.",
  },
  {
    id: "anim-architectural",
    family: "synthetic",
    label: "Architectural",
    summary: "Stiff, structural, deliberate",
    promptFragment: "architectural, structural movement with deliberate poses, grid-like precision, building-block logic, geometric spacing.",
  },
  {
    id: "anim-ethereal",
    family: "organic",
    label: "Ethereal",
    summary: "Floating, weightless, dreamy",
    promptFragment: "ethereal, weightless motion floating through space, dreamy quality, air-like resistance, otherworldly grace.",
  },
  {
    id: "anim-mechanical",
    family: "synthetic",
    label: "Mechanical",
    summary: "Robotic, repetitive, geared",
    promptFragment: "mechanical, robotic movement with precise servo-like timing, repetitive patterns, geared motion, industrial quality.",
  },
  {
    id: "anim-flowing",
    family: "organic",
    label: "Flowing",
    summary: "Continuous, smooth, no stops",
    promptFragment: "flowing, continuous movement without discrete stops, smooth state changes, river-like momentum, perpetual motion quality.",
  },
  {
    id: "anim-staccato",
    family: "structured",
    label: "Staccato",
    summary: "Discrete poses, clear beats",
    promptFragment: "staccato, pose-to-pose movement with clear beats between positions, discrete timing, held poses, punctuated rhythm.",
  },
];

// Motion Style Presets: HOW the movement happens (smooth/snappy/weighted/etc.)
// Multi-select. Can layer multiple styles (e.g., "Smooth + Bouncy").

export interface MotionStylePreset {
  id: string;
  label: string;
  family: "easing" | "momentum" | "timing";
  summary: string;
  promptFragment: string;
}

export const MOTION_STYLE_PRESETS: MotionStylePreset[] = [
  {
    id: "motion-smooth",
    label: "Smooth",
    family: "easing",
    summary: "Eased, no jarring transitions",
    promptFragment: "smooth, ease-based motion with continuous acceleration curves, no jarring transitions, fluid interpolation between poses.",
  },
  {
    id: "motion-snappy",
    label: "Snappy",
    family: "timing",
    summary: "Quick, energetic, reactive",
    promptFragment: "snappy, quick movement with energetic timing, reactive poses, immediate state changes, sharp arrival.",
  },
  {
    id: "motion-weighted",
    label: "Weighted",
    family: "momentum",
    summary: "Inertia, mass-aware, settling",
    promptFragment: "weighted, mass-aware motion with clear inertia, body parts settling after movement, momentum-driven arcs.",
  },
  {
    id: "motion-floaty",
    label: "Floaty",
    family: "momentum",
    summary: "Light, air-resistant, drifting",
    promptFragment: "floaty, light motion with air resistance, slow settling, drifting quality, defying gravity.",
  },
  {
    id: "motion-mechanical",
    label: "Mechanical",
    family: "easing",
    summary: "Linear interpolation, precise",
    promptFragment: "mechanical, linear motion between poses with consistent velocity, no natural easing, precise mechanical timing.",
  },
  {
    id: "motion-organic",
    label: "Organic",
    family: "easing",
    summary: "Natural acceleration curves",
    promptFragment: "organic motion with natural acceleration and deceleration curves, anticipation before action, realistic weight.",
  },
  {
    id: "motion-robotic",
    label: "Robotic",
    family: "timing",
    summary: "Stepped, quantized timing",
    promptFragment: "robotic, stepped motion with quantized timing, discrete joint movements, servo-like precision, no anticipation.",
  },
  {
    id: "motion-bouncy",
    label: "Bouncy",
    family: "momentum",
    summary: "Overlapping arcs, overshoot",
    promptFragment: "bouncy motion with overlapping body part arcs, overshoot on landing, springing quality, joyful energy.",
  },
  {
    id: "motion-dramatic",
    label: "Dramatic",
    family: "easing",
    summary: "Slow-in, fast-out, cinematic",
    promptFragment: "dramatic motion with slow-in fast-out pacing, cinematic builds, held key frames, theatrical timing.",
  },
  {
    id: "motion-subtle",
    label: "Subtle",
    family: "timing",
    summary: "Micro-movements, restraint",
    promptFragment: "subtle, restrained motion with micro-movements, minimal travel distance, small gesture quality, quiet energy.",
  },
  {
    id: "motion-frenetic",
    label: "Frenetic",
    family: "timing",
    summary: "Fast, no breathing room",
    promptFragment: "frenetic, fast-paced motion with minimal resting frames, constant activity, breathless energy, high velocity.",
  },
  {
    id: "motion-ballistic",
    label: "Ballistic",
    family: "momentum",
    summary: "Momentum-driven, hard stops",
    promptFragment: "ballistic motion driven by momentum, hard stops on key frames, impact quality, follow-through on sharp changes.",
  },
];

// Choreography Pattern Presets: the spatial and social arrangement of movement
// Single-select. Determines how characters relate spatially and choreographically.

export interface ChoreographyPatternPreset {
  id: string;
  label: string;
  summary: string;
  promptFragment: string;
  formation?: string;
}

export const CHOREOGRAPHY_PATTERN_PRESETS: ChoreographyPatternPreset[] = [
  {
    id: "chore-formation",
    label: "Formation Dance",
    summary: "Synchronized geometric patterns, group choreography",
    promptFragment: "formation-based group choreography with synchronized geometric patterns, clear spatial relationships, unified beats, ensemble focus, precision alignment.",
    formation: "◇ ◇\n ◇ ◇",
  },
  {
    id: "chore-soloist",
    label: "Soloist Focus",
    summary: "One character, others supporting",
    promptFragment: "soloist-focused choreography with one featured dancer as protagonist, supporting ensemble or background movement, spotlight on lead character.",
  },
  {
    id: "chore-duet",
    label: "Duet Exchange",
    summary: "Two characters interacting",
    promptFragment: "duet choreography with two characters in dynamic interaction, mirroring, responding to each other, shared timing, intimate spatial relationship.",
  },
  {
    id: "chore-group-sync",
    label: "Group Sync",
    summary: "All moving identically",
    promptFragment: "synchronized group choreography with all characters moving identically in unison, mirror timing, lockstep patterns, cohesive ensemble.",
  },
  {
    id: "chore-call-response",
    label: "Call-and-Response",
    summary: "Alternating leaders",
    promptFragment: "call-and-response choreography with alternating leaders and followers, question-answer patterns, sequential timing, dialogue through movement.",
  },
  {
    id: "chore-scatter",
    label: "Scatter",
    summary: "Individuals moving independently",
    promptFragment: "scattered choreography with individuals moving independently in same space, varied timing, autonomous paths, crowd feeling.",
  },
  {
    id: "chore-locomotive",
    label: "Locomotive",
    summary: "Traveling across space, journey feel",
    promptFragment: "locomotive choreography with characters traveling through space, journey progression, pathways and processionals, spatial storytelling.",
  },
  {
    id: "chore-stasis",
    label: "Stasis",
    summary: "Mostly in-place, stationary",
    promptFragment: "stasis-based choreography with mostly in-place movement, rooted positions, upper-body emphasis, minimal spatial travel.",
  },
  {
    id: "chore-ascending",
    label: "Ascending",
    summary: "Building intensity from simple to complex",
    promptFragment: "ascending choreography building from simple to increasingly complex movement, layer-by-layer addition, climactic build, accumulating intensity.",
  },
  {
    id: "chore-vignette",
    label: "Vignette",
    summary: "Multiple small simultaneous scenes",
    promptFragment: "vignette choreography with multiple simultaneous scenes unfolding, varied timing per group, layered storytelling, multi-focal staging.",
  },
];
