// Project-wide visual style presets — the full Director Studio
// catalog. The chosen style becomes the "visual DNA" injected into pack
// generation and every image/video prompt. Each preset carries hint fragments
// the local creative engine uses to bias camera, lighting, and motion.

export type StyleGroup = "2D" | "3D" | "Rubberhose";

export interface StylePreset {
  id: string;
  label: string;
  group: StyleGroup;
  /** Prompt fragment describing the look. */
  fragment: string;
  /** Bias the camera engine (e.g. flat 2D wants locked-off / parallax moves). */
  cameraHint: string;
  /** Bias the lighting engine. */
  lightingHint: string;
  /** Bias the motion engine (squash & stretch, kinetic type, etc.). */
  motionHint: string;
  /** Things the model should avoid for this look. */
  negative: string;
}

export const STYLE_PRESETS: StylePreset[] = [
  // ---- 2D ----------------------------------------------------------------
  {
    id: "flat-vector",
    label: "Flat Vector Explainer",
    group: "2D",
    fragment:
      "flat vector explainer animation, clean geometric shapes, bold solid fills, generous negative space, friendly modern illustration",
    cameraHint: "locked-off 2D frame with parallax layers and subtle scale push",
    lightingHint: "flat even lighting, no cast shadows, soft long shadows only as a design accent",
    motionHint: "smooth ease-in-out tweens, staggered element entrances, snappy overshoot",
    negative: "photorealism, 3D shading, gradients meshes, texture noise",
  },
  {
    id: "editorial-infographic",
    label: "Editorial Infographic",
    group: "2D",
    fragment:
      "editorial infographic motion design, data-driven layouts, charts and numerics, refined grid, magazine typography, restrained accent color",
    cameraHint: "static board with animated reveals, slow horizontal pans across data",
    lightingHint: "flat publishing light, crisp contrast for legibility",
    motionHint: "count-up numbers, bars and lines drawing on, sequential reveals",
    negative: "clutter, decorative noise, hand-drawn wobble",
  },
  {
    id: "kinetic-typography",
    label: "Minimal Kinetic Typography",
    group: "2D",
    fragment:
      "minimal kinetic typography, expressive type as the hero, monochrome with one accent, rhythmic word emphasis, lots of negative space",
    cameraHint: "type-driven framing, hard cuts on the beat, occasional push-in on key words",
    lightingHint: "high-contrast flat type, no scene lighting",
    motionHint: "words snap to the beat, scale and weight emphasis, tracking animation",
    negative: "busy backgrounds, illustration, photographic imagery",
  },
  {
    id: "retro-crt",
    label: "Retro CRT / Analog",
    group: "2D",
    fragment:
      "retro CRT analog aesthetic, scanlines, chromatic aberration, VHS grain, phosphor glow, 80s broadcast graphics",
    cameraHint: "subtle drift and tracking jitter, occasional tracking-error glitch",
    lightingHint: "phosphor glow, bloom on bright pixels, dark surround",
    motionHint: "interlace flicker, signal glitches, type that types on",
    negative: "clean modern flat design, pristine vector edges",
  },
  {
    id: "y2k-cyberpop",
    label: "Y2K Cyber Pop",
    group: "2D",
    fragment:
      "Y2K cyber pop, chrome bubble type, gradient blobs, lens flares, holographic foil, playful early-2000s tech optimism",
    cameraHint: "energetic whip pans and zooms, sticker-style pop-ins",
    lightingHint: "holographic iridescence, glossy specular highlights",
    motionHint: "bouncy pop-ins, rotating chrome, sparkle accents",
    negative: "muted palettes, minimalism, somber tone",
  },
  {
    id: "documentary-timeline",
    label: "Documentary Timeline",
    group: "2D",
    fragment:
      "documentary timeline graphics, archival textures, map lines drawing on, restrained serif captions, historical gravitas",
    cameraHint: "slow Ken Burns push and pan across stills and maps",
    lightingHint: "warm archival vignette, aged paper tone",
    motionHint: "lines and routes draw on, dates count forward, gentle fades",
    negative: "neon, cartoonish bounce, glossy 3D",
  },
  {
    id: "paper-cutout",
    label: "Paper Cutout Animation",
    group: "2D",
    fragment:
      "paper cutout animation, layered construction paper, visible torn edges, drop shadows between layers, tactile handmade craft",
    cameraHint: "top-down or shallow stage, slight handheld float",
    lightingHint: "soft top light casting gentle paper shadows, warm craft tone",
    motionHint: "jointed paper-puppet movement, stepped frame rate feel",
    negative: "smooth vector gradients, photoreal rendering",
  },
  {
    id: "isometric",
    label: "Isometric Explainer",
    group: "2D",
    fragment:
      "isometric explainer, 2.5D isometric scenes, clean technical illustration, modular building blocks, soft ambient occlusion",
    cameraHint: "locked isometric angle, orbit-reveal of the iso scene, layer lift",
    lightingHint: "soft ambient occlusion, single consistent light direction",
    motionHint: "blocks assemble in, pieces slide along iso axes",
    negative: "perspective distortion, photoreal, chaotic composition",
  },
  {
    id: "hand-drawn",
    label: "Hand-Drawn Sketch Explainer",
    group: "2D",
    fragment:
      "hand-drawn sketch explainer, marker and ink lines, whiteboard energy, rough construction lines, human imperfection",
    cameraHint: "drawing-hand reveal, loose handheld feel",
    lightingHint: "flat paper white, marker ink contrast",
    motionHint: "line-draw-on, sketchy boil, doodle annotations",
    negative: "pristine vector, photoreal, mechanical precision",
  },
  {
    id: "rubberhose-2d",
    label: "Rubberhose 2D (Preset)",
    group: "Rubberhose",
    fragment:
      "1930s rubberhose 2D character animation, bouncy noodle limbs, pie-cut eyes, rounded mitten hands, squash and stretch, clean vector colors, playful exaggerated poses",
    cameraHint: "playful 2D staging, bouncy follow, snappy pose-to-pose holds",
    lightingHint: "flat cheerful color, simple drop shadow, no realistic shading",
    motionHint: "extreme squash and stretch, rubber-hose limb arcs, anticipation and overshoot, bounce on every settle",
    negative: "rigid joints, realistic anatomy, stiff motion, photoreal shading",
  },
  {
    id: "cel-shaded-2d",
    label: "Cel-Shaded 2D Animation",
    group: "2D",
    fragment:
      "cel-shaded 2D animation, clean line art, flat color fills with two-tone shadow, anime-adjacent shading, painterly backgrounds",
    cameraHint: "dynamic anime framing, dramatic push-ins and pans",
    lightingHint: "hard-edged cel shadow shapes, rim light for separation",
    motionHint: "smear frames, snappy holds, dramatic timing",
    negative: "soft airbrush gradients, photoreal, muddy shading",
  },

  // ---- 3D ----------------------------------------------------------------
  {
    id: "pixar3d",
    label: "Pixar-Style 3D",
    group: "3D",
    fragment:
      "Pixar-style 3D animation, soft global illumination, expressive appealing characters, rounded forms, vibrant cinematic color, subsurface skin",
    cameraHint: "cinematic dolly and crane moves, gentle handheld life, depth of field",
    lightingHint: "soft global illumination, warm key with cool bounce, hero rim light",
    motionHint: "appealing squash and stretch, weighted secondary motion, lively arcs",
    negative: "flat vector, harsh lighting, uncanny realism",
  },
  {
    id: "cinematic3d",
    label: "Premium Cinematic 3D",
    group: "3D",
    fragment:
      "premium cinematic 3D, physically based rendering, filmic depth and detail, anamorphic bokeh, polished surfaces, hero product beauty",
    cameraHint: "anamorphic slow dolly, orbit, rack focus, push-in to hero",
    lightingHint: "motivated cinematic key, soft fill, strong rim, volumetric haze",
    motionHint: "weighty cinematic motion, slow reveals, controlled settle",
    negative: "cartoon proportions, flat lighting, plastic look",
  },
  {
    id: "lowpoly-painted",
    label: "Low-Poly Painted 3D",
    group: "3D",
    fragment:
      "low-poly painted 3D, faceted geometry, hand-painted texture, stylized flat-shaded planes, art-directed color blocking",
    cameraHint: "smooth orbit and dolly across the diorama",
    lightingHint: "stylized directional light, painterly ambient, soft long shadows",
    motionHint: "clean eased motion, diorama pieces assembling",
    negative: "photoreal texture, high-poly detail, noise grain",
  },
  {
    id: "glassmorphism-saas",
    label: "Glassmorphism SaaS",
    group: "3D",
    fragment:
      "glassmorphism SaaS visualization, frosted translucent panels, soft blurred depth, floating UI cards, gentle gradients, refractive edges",
    cameraHint: "smooth dolly between floating UI layers, parallax depth",
    lightingHint: "soft studio key, colored ambient glow behind glass, edge light on panels",
    motionHint: "panels glide and settle, blur-to-focus reveals, gentle float",
    negative: "harsh contrast, gritty texture, skeuomorphic clutter",
  },
  {
    id: "futuristic-hud",
    label: "Futuristic HUD",
    group: "3D",
    fragment:
      "futuristic HUD interface, holographic readouts, scanning grids, data tickers, sci-fi instrument panels, cyan and amber accents",
    cameraHint: "drifting orbit through holographic layers, snap focus to data nodes",
    lightingHint: "self-illuminated holo elements, dark void surround, blue rim",
    motionHint: "scanning sweeps, data streams, nodes lighting up in sequence",
    negative: "warm organic look, hand-drawn, flat print design",
  },
  {
    id: "dark-neon-system",
    label: "Dark Neon System Diagram",
    group: "3D",
    fragment:
      "dark neon system diagram, glowing nodes and edges, network topology, deep navy void, electric blue and magenta data flow",
    cameraHint: "slow fly-through the node graph, push to the active node",
    lightingHint: "neon self-emission, bloom, dark background separation",
    motionHint: "pulses travel along edges, nodes ignite, flow animation",
    negative: "daylight scenes, pastel palette, paper texture",
  },
  {
    id: "luxury-brand-film",
    label: "Luxury Brand Film",
    group: "3D",
    fragment:
      "luxury brand film, macro product hero, liquid and silk dynamics, gold and obsidian palette, immaculate reflections, slow elegant reveals",
    cameraHint: "macro slider, slow orbit, rack focus on premium detail",
    lightingHint: "controlled studio gradient, soft gradient reflections, precise specular",
    motionHint: "slow luxurious reveals, fabric and liquid sim, weighty settle",
    negative: "cheap plastic, busy graphics, cartoon energy",
  },
  {
    id: "product-mockup",
    label: "3D Product Mockup",
    group: "3D",
    fragment:
      "3D product mockup, clean studio render, accurate materials, soft shadow on seamless backdrop, e-commerce hero clarity",
    cameraHint: "turntable orbit, top-down hero, push-in on feature detail",
    lightingHint: "three-point studio softboxes, clean white bounce, subtle gradient floor",
    motionHint: "smooth turntable, exploded-view assembly, feature callouts",
    negative: "messy environment, dramatic noir, stylized cartoon",
  },
  {
    id: "claymation3d",
    label: "Claymation-Inspired 3D",
    group: "3D",
    fragment:
      "claymation-inspired 3D, sculpted clay surfaces, visible fingerprint texture, handcrafted miniature set, stop-motion charm",
    cameraHint: "miniature-set framing, slight stop-motion judder, shallow macro depth",
    lightingHint: "soft warm studio light, tactile soft shadows",
    motionHint: "stepped stop-motion timing, squashy clay deformation",
    negative: "slick perfect CGI, glossy chrome, flat vector",
  },
  {
    id: "toy-stylized3d",
    label: "Toy-Like Stylized 3D",
    group: "3D",
    fragment:
      "toy-like stylized 3D, glossy plastic and matte vinyl materials, chunky rounded forms, collectible figure charm, bright playful palette",
    cameraHint: "playful orbit and pop-in framing, shallow toy-photography depth",
    lightingHint: "bright softbox key, glossy specular dots, colorful bounce",
    motionHint: "snappy bouncy motion, toy-assembly pop-ins",
    negative: "gritty realism, somber palette, photoreal skin",
  },
  {
    id: "rubberhose-3d",
    label: "Rubberhose 3D (Preset)",
    group: "Rubberhose",
    fragment:
      "rubberhose 3D character animation, flexible tubular limbs, toy-like rounded forms, glossy vinyl surfaces, elastic cartoon physics, soft studio lighting",
    cameraHint: "playful cinematic staging, bouncy follow, gentle orbit on settles",
    lightingHint: "soft studio key, gentle wraparound fill, colorful rim, friendly bounce",
    motionHint: "elastic tubular limb stretch, exaggerated squash and stretch, cartoon overshoot, springy settle",
    negative: "rigid skeleton, realistic anatomy, stiff mechanical motion, harsh noir lighting",
  },
];

/** Grouped for optgroup rendering in the style selector. */
export const STYLE_GROUPS: { group: StyleGroup; label: string }[] = [
  { group: "Rubberhose", label: "Rubberhose Presets" },
  { group: "2D", label: "2D Styles" },
  { group: "3D", label: "3D Styles" },
];

export function presetsByGroup(group: StyleGroup): StylePreset[] {
  return STYLE_PRESETS.filter((s) => s.group === group);
}

export function findPreset(id: string): StylePreset | undefined {
  return STYLE_PRESETS.find((s) => s.id === id);
}

export interface ProjectStyle {
  preset: string; // preset id, "custom", or "" for none
  custom: string; // free-text used when preset === "custom"
}

export const EMPTY_STYLE: ProjectStyle = { preset: "", custom: "" };

/** Resolve the active style fragment to inject into prompts. */
export function styleFragmentFor(style: ProjectStyle): string {
  if (style.preset === "custom") return style.custom.trim();
  return findPreset(style.preset)?.fragment ?? "";
}

// --- per-project persistence (localStorage; folded into project files later) ---
function key(projectId: string) {
  return `mf.project.style.${projectId}`;
}

export function loadProjectStyle(projectId: string): ProjectStyle {
  try {
    const raw = localStorage.getItem(key(projectId));
    return raw ? (JSON.parse(raw) as ProjectStyle) : { ...EMPTY_STYLE };
  } catch {
    return { ...EMPTY_STYLE };
  }
}

export function saveProjectStyle(projectId: string, style: ProjectStyle) {
  localStorage.setItem(key(projectId), JSON.stringify(style));
}
