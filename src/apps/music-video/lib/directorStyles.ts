// Director styles — an orthogonal inspiration layer over Style (MvTemplate).
//
// A template answers "what kind of video is this" (Afrobeats, Performance).
// A director style answers "whose craft is it shot with". The two compose:
// "Afrobeats, shot like a Hype Williams video" is a real brief, so this is a
// second axis rather than thirty more templates — the same relationship
// videoTypes.ts already has with templates.
//
// IMPORTANT — `direction` and `techniques` never name the director.
//
// Two reasons, and both matter:
//
//  1. It works better. "Fisheye lens, saturated color, extreme close-ups,
//     wide-angle distortion" is something an image model can actually act on.
//     A living person's name is not: several providers filter artist names
//     outright, and the ones that don't tend to ignore them.
//  2. It's honest. The name belongs in our UI as an inspiration credit, where
//     the user chose it. Putting it in a generation prompt edges toward
//     implying a real director made or endorsed the output, which they did
//     not. Styles aren't ownable; a person's identity is a different thing.
//
// There is a test asserting no director's surname appears in any of these
// strings. If you add a style, describe the craft, not the person.

import type { PerformanceLean } from "@/platform/lib/templates";

export interface DirectorStyle {
  id: string;
  /** Shown in the picker. The only place the name appears. */
  name: string;
  /** One line under the name — what the work feels like. */
  signature: string;
  /** Craft vocabulary, shown to the user and fed to the models. */
  techniques: string[];
  /** Shot ideas merged into the approach pool the Director Brain picks from. */
  shotFlavor: string[];
  /** Camera moves merged into the energy-banded move pools. */
  cameraMoves: string[];
  /** Lighting looks merged into the energy-banded lighting pools. */
  lighting: string[];
  /** Multiplies the template's cut bias. <1 cuts faster, >1 holds longer. */
  cutBias: number;
  /** Optional nudge to the performance/narrative balance. */
  lean?: PerformanceLean;
  /** Movement quality handed to the choreography engine. */
  choreoFlavor?: string[];
  palette?: string[];
  /** The sentence woven into every generated prompt. Never names anyone. */
  direction: string;
}

const D = (d: DirectorStyle) => d;

export const DIRECTOR_STYLES: DirectorStyle[] = [
  D({
    id: "handmade-surrealist",
    name: "Michel Gondry",
    signature: "Handmade surrealism, playful dream logic, emotional simplicity.",
    techniques: [
      "Practical in-camera effects",
      "Forced perspective",
      "Repetition and looping",
      "Stop-motion",
      "Whimsical transformations",
    ],
    shotFlavor: [
      "A handmade transformation happening in one unbroken take",
      "Repeating action that loops back on itself",
      "Forced-perspective trick staged practically in frame",
      "Everyday object becoming something impossible",
    ],
    cameraMoves: ["Locked-off frame for an in-camera trick", "Simple dolly revealing the illusion"],
    lighting: ["Flat, even daylight that hides no seams", "Warm practical bulbs, homemade glow"],
    cutBias: 1.15,
    choreoFlavor: ["looping repeated gesture", "puppet-like articulation", "playful mirrored motion"],
    palette: ["#E8C547", "#5B8C5A", "#D96C4F", "#F2EBDC"],
    direction:
      "Handmade surrealism achieved practically in camera: forced perspective, visible craft, looping repetition, stop-motion texture, and whimsical transformation with warm emotional simplicity.",
  }),
  D({
    id: "deadpan-absurd",
    name: "Spike Jonze",
    signature: "Human, absurd, emotionally unexpected, deceptively simple.",
    techniques: [
      "Naturalistic performance",
      "Awkward comedy",
      "Long takes",
      "Sudden emotional reversals",
      "Surreal premise played straight",
    ],
    shotFlavor: [
      "A surreal premise treated as completely ordinary",
      "Long unbroken take following one performer",
      "Unguarded, almost documentary human moment",
      "Deadpan wide shot that lets the absurdity sit",
    ],
    cameraMoves: ["Long following take, handheld and patient", "Simple unfussy push-in"],
    lighting: ["Available light, unpolished", "Plain daylight with no glamour"],
    cutBias: 1.4,
    lean: "narrative",
    choreoFlavor: ["untrained joyful movement", "sincere unchoreographed abandon"],
    palette: ["#C4B7A6", "#7B8FA1", "#D9A566", "#3E4149"],
    direction:
      "Naturalistic, deceptively simple staging: long unbroken takes, unpolished available light, absurd premises played completely straight, and sudden turns of real emotion.",
  }),
  D({
    id: "biomechanical-dark",
    name: "Chris Cunningham",
    signature: "Dark, disturbing, futuristic, biomechanical.",
    techniques: [
      "Body transformation",
      "Unsettling choreography",
      "Industrial design",
      "Stark lighting",
      "Psychological horror",
    ],
    shotFlavor: [
      "Body caught mid-transformation, half machine",
      "Clinical industrial space, sterile and hostile",
      "Unsettlingly precise movement in hard shadow",
      "Extreme close-up on synthetic skin and mechanism",
    ],
    cameraMoves: ["Cold mechanical track", "Slow clinical push toward the subject"],
    lighting: ["Hard single-source light, deep black falloff", "Sterile industrial fluorescents"],
    cutBias: 0.9,
    choreoFlavor: ["jointed inhuman articulation", "convulsive mechanical spasm", "uncanny stillness"],
    palette: ["#0B0D10", "#8A8F98", "#C3D4E0", "#5A1F1F"],
    direction:
      "Biomechanical body horror: industrial surfaces, stark single-source lighting with crushed blacks, uncanny jointed movement, and clinical psychological menace.",
  }),
  D({
    id: "glossy-kinetic-hiphop",
    name: "Hype Williams",
    signature: "Glossy, kinetic, iconic hip-hop imagery.",
    techniques: [
      "Fisheye lens",
      "Saturated color",
      "Extreme close-ups",
      "Slow motion",
      "Wide-angle distortion",
      "Luxury and street-fashion imagery",
    ],
    shotFlavor: [
      "Fisheye close-up, face filling the distorted frame",
      "Artist against a pure saturated color field",
      "Slow-motion luxury detail — chrome, jewelry, fabric",
      "Wide-angle low shot making the performer monumental",
    ],
    cameraMoves: ["Fisheye push straight at the lens", "Orbiting wide-angle circle"],
    lighting: ["Blown-out color gel wash", "High-gloss specular highlights on skin"],
    cutBias: 0.85,
    lean: "performance",
    choreoFlavor: ["confident bounce to camera", "posed hero stance", "slow-motion swagger"],
    palette: ["#FF2E63", "#08D9D6", "#FFD93D", "#1A1A2E"],
    direction:
      "Glossy high-contrast hip-hop iconography: fisheye and wide-angle distortion, fully saturated color fields, extreme close-ups, gleaming luxury texture, and slow-motion swagger.",
  }),
  D({
    id: "elegant-photographic",
    name: "Mark Romanek",
    signature: "Elegant, controlled, emotionally intense, photographic.",
    techniques: [
      "Symmetrical composition",
      "Restrained camera movement",
      "Sculptural lighting",
      "Fashion-editorial framing",
      "Monochromatic palettes",
    ],
    shotFlavor: [
      "Perfectly symmetrical portrait, centred and still",
      "Sculptural light carving the face out of darkness",
      "Editorial full-figure frame, composed like a photograph",
      "Restrained close-up holding on a single expression",
    ],
    cameraMoves: ["Almost imperceptible slow push", "Locked-off composed frame"],
    lighting: ["Sculpted key with deliberate shadow", "Single soft window source, monochrome"],
    cutBias: 1.35,
    choreoFlavor: ["minimal deliberate gesture", "held sculptural pose"],
    palette: ["#1C1C1C", "#7D7D7D", "#D6D2CB", "#A33B2A"],
    direction:
      "Photographic restraint: symmetrical composition, sculptural directional light, editorial framing, near-monochrome palette, and stillness that lets emotion build.",
  }),
  D({
    id: "art-house-strange",
    name: "Jonathan Glazer",
    signature: "Mysterious, atmospheric, art-house, psychologically strange.",
    techniques: [
      "Minimal dialogue",
      "Ambiguity",
      "Alienation",
      "Symbolic imagery",
      "Slow pacing",
      "Unsettling realism",
    ],
    shotFlavor: [
      "Figure alone in an indifferent landscape",
      "Symbolic image withheld from explanation",
      "Long static frame where something is quietly wrong",
      "Cold observational distance on a human moment",
    ],
    cameraMoves: ["Slow detached drift", "Static observational hold"],
    lighting: ["Flat overcast daylight", "Cold ambient sourceless glow"],
    cutBias: 1.6,
    choreoFlavor: ["restrained alienated motion", "unnaturally still presence"],
    palette: ["#2E3239", "#6E7A80", "#B9BFC2", "#141518"],
    direction:
      "Art-house alienation: long held frames, cold flat light, symbolic imagery left unexplained, and an atmosphere of quiet psychological wrongness inside ordinary reality.",
  }),
  D({
    id: "monochrome-documentary",
    name: "Anton Corbijn",
    signature: "Gritty, monochrome, raw, iconic.",
    techniques: [
      "High-contrast black and white",
      "Documentary feeling",
      "Stark locations",
      "Expressive silhouettes",
      "Imperfect handheld camera",
    ],
    shotFlavor: [
      "High-contrast monochrome portrait, grain visible",
      "Lone silhouette against a bleak stark landscape",
      "Raw handheld documentary moment, imperfectly framed",
      "Weathered texture — concrete, coat, skin",
    ],
    cameraMoves: ["Imperfect handheld follow", "Rough documentary reframe"],
    lighting: ["Hard contrasty daylight, deep blacks", "Overcast northern grey"],
    cutBias: 1.2,
    choreoFlavor: ["raw unpolished movement", "expressive silhouetted gesture"],
    palette: ["#000000", "#4A4A4A", "#9C9C9C", "#EDEDED"],
    direction:
      "Gritty monochrome documentary: high-contrast black and white with visible grain, stark locations, expressive silhouettes, and deliberately imperfect handheld framing.",
  }),
  D({
    id: "precise-ominous",
    name: "David Fincher",
    signature: "Precise, dark, polished, controlled.",
    techniques: [
      "Low-key lighting",
      "Slow creeping camera movement",
      "Desaturated color",
      "Visual symmetry",
      "Hidden detail",
      "Ominous atmosphere",
    ],
    shotFlavor: [
      "Immaculately composed frame with something hidden in it",
      "Slow creeping move through a dark controlled space",
      "Desaturated interior, every element deliberate",
      "Precise symmetrical wide with an ominous stillness",
    ],
    cameraMoves: ["Slow motorized creep", "Impossibly smooth controlled glide"],
    lighting: ["Low-key with pooled practical sources", "Desaturated green-amber shadow"],
    cutBias: 1.25,
    choreoFlavor: ["controlled minimal motion", "unnervingly precise gesture"],
    palette: ["#12161A", "#2F3B36", "#7A6A52", "#C9C4BA"],
    direction:
      "Precise controlled darkness: low-key pooled lighting, desaturated palette, immaculate symmetry, imperceptibly slow camera creep, and detail hidden at the edge of the frame.",
  }),
  D({
    id: "gothic-theatrical",
    name: "Floria Sigismondi",
    signature: "Gothic, theatrical, grotesque, dreamlike.",
    techniques: [
      "Surreal production design",
      "Distorted bodies",
      "Religious imagery",
      "Dramatic costume",
      "Unsettling beauty",
    ],
    shotFlavor: [
      "Theatrical tableau staged like a dark altarpiece",
      "Contorted figure in elaborate costume",
      "Ornate decaying interior, beautiful and wrong",
      "Grotesque detail rendered exquisitely",
    ],
    cameraMoves: ["Canted unstable tilt", "Swooping theatrical arc"],
    lighting: ["Chiaroscuro candlelight", "Cold moonlight through stained glass"],
    cutBias: 0.95,
    choreoFlavor: ["contorted expressive distortion", "ritual processional movement"],
    palette: ["#1B1014", "#6B2737", "#C8AD7F", "#E8E2D8"],
    direction:
      "Gothic theatricality: surreal decaying production design, chiaroscuro candlelight, elaborate costume, contorted bodies, and religious iconography rendered as unsettling beauty.",
  }),
  D({
    id: "maximalist-spectacle",
    name: "Joseph Kahn",
    signature: "Maximalist, high-concept, technically ambitious.",
    techniques: [
      "Elaborate sets",
      "Rapid transitions",
      "Stylized choreography",
      "Visual spectacle",
      "Genre blending",
      "Narrative escalation",
    ],
    shotFlavor: [
      "Elaborate set piece escalating beyond the last one",
      "Genre-flipping reveal — the world changes mid-shot",
      "Stylized crew formation in a spectacular environment",
      "Technically showy move nobody could do practically",
    ],
    cameraMoves: ["Impossible whip transition", "Aggressive crane-to-close reveal"],
    lighting: ["Bold theatrical color wash", "Hard spectacle backlight and haze"],
    cutBias: 0.7,
    choreoFlavor: ["sharp stylized unison", "escalating spectacle formation"],
    palette: ["#FF3C38", "#3772FF", "#FDCA40", "#0B0B0B"],
    direction:
      "Maximalist spectacle: elaborate escalating set pieces, rapid stylized transitions, bold theatrical color, sharp unison choreography, and genre-blending visual ambition.",
  }),
  D({
    id: "bold-pop-invention",
    name: "Dave Meyers",
    signature: "Energetic, pop-oriented, visually inventive.",
    techniques: [
      "Bold color systems",
      "Large-scale choreography",
      "Dynamic camera movement",
      "Graphic transitions",
      "Playful production design",
    ],
    shotFlavor: [
      "Large ensemble filling a boldly colored world",
      "Graphic transition carrying one shot into the next",
      "Inventive set conceit played at full pop scale",
      "Dynamic sweeping move across a crowded frame",
    ],
    cameraMoves: ["Sweeping energetic crane", "Graphic match-move between worlds"],
    lighting: ["Saturated color-blocked wash", "Bright punchy pop key"],
    cutBias: 0.8,
    choreoFlavor: ["large-scale ensemble unison", "playful pop formation"],
    palette: ["#F55D3E", "#2EC4B6", "#FFBF00", "#2D3142"],
    direction:
      "Inventive pop energy: bold color-blocked worlds, large-scale ensemble choreography, dynamic sweeping camera, and graphic transitions that carry one idea into the next.",
  }),
  D({
    id: "polished-performance",
    name: "Director X",
    signature: "Polished, stylish, culturally confident, performance-driven.",
    techniques: [
      "Strong silhouettes",
      "Fashion-forward styling",
      "Bold color",
      "Clean choreography",
      "Luxury environments",
      "Charismatic artist coverage",
    ],
    shotFlavor: [
      "Clean hero framing built around a strong silhouette",
      "Crew in tight clean formation, luxury setting",
      "Bold single-color environment, styled to the frame",
      "Charismatic artist coverage, confident and direct",
    ],
    cameraMoves: ["Smooth confident orbit", "Clean tracking glide with the artist"],
    lighting: ["Bold saturated color wash", "Clean glossy key with rim separation"],
    cutBias: 0.9,
    lean: "performance",
    choreoFlavor: ["clean tight unison", "confident social-dance vocabulary"],
    palette: ["#7B2CBF", "#00B4D8", "#FFB703", "#111111"],
    direction:
      "Polished performance gloss: strong silhouettes, bold saturated environments, fashion-forward styling, clean tight choreography, and confident direct artist coverage.",
  }),
  D({
    id: "intimate-cultural",
    name: "Melina Matsoukas",
    signature: "Politically aware, intimate, stylish, culturally specific.",
    techniques: [
      "Social themes",
      "Rich color",
      "Character-driven storytelling",
      "Symbolism",
      "Naturalistic performance",
      "Visual contrast",
    ],
    shotFlavor: [
      "Culturally specific space rendered with real intimacy",
      "Character-driven moment carrying social weight",
      "Rich saturated portrait, naturalistic and unposed",
      "Symbolic image grounded in a real community",
    ],
    cameraMoves: ["Intimate handheld follow", "Steady respectful push-in"],
    lighting: ["Rich warm naturalism", "Deep color with luminous skin tones"],
    cutBias: 1.15,
    lean: "narrative",
    choreoFlavor: ["grounded cultural vernacular movement", "communal expressive motion"],
    palette: ["#8C2F39", "#D9A441", "#3E5641", "#F2E8DC"],
    direction:
      "Intimate cultural specificity: rich saturated color, luminous natural skin tones, character-driven naturalistic performance, and symbolism grounded in a real community.",
  }),
  D({
    id: "poetic-landscape",
    name: "Nabil Elderkin",
    signature: "Emotional, cinematic, atmospheric, artist-centered.",
    techniques: [
      "Slow motion",
      "Beautiful landscapes",
      "Intimate close-ups",
      "Natural light",
      "Melancholy pacing",
      "Poetic imagery",
    ],
    shotFlavor: [
      "Lone figure dwarfed by a beautiful landscape",
      "Slow-motion moment held past comfort",
      "Intimate close-up lit only by natural light",
      "Poetic image standing in for an unspoken feeling",
    ],
    cameraMoves: ["Slow drifting handheld", "Patient wide hold on the landscape"],
    lighting: ["Golden-hour natural light", "Soft overcast melancholy"],
    cutBias: 1.5,
    choreoFlavor: ["slow weighted movement", "solitary expressive gesture"],
    palette: ["#C9A227", "#5B6C5D", "#D8CFC4", "#2B2B28"],
    direction:
      "Poetic atmospheric intimacy: natural golden light, expansive landscapes, slow-motion held moments, close human detail, and a melancholy unhurried pace.",
  }),
  D({
    id: "deadpan-dream-logic",
    name: "Hiro Murai",
    signature: "Surreal, cool, unsettling, narratively ambiguous.",
    techniques: [
      "Deadpan performance",
      "Dream logic",
      "Unexpected scale",
      "Carefully designed camera movement",
      "Social commentary",
    ],
    shotFlavor: [
      "Deadpan figure in a scene whose logic never resolves",
      "Something happening at unexpected scale in the background",
      "Precisely designed move revealing an uneasy tableau",
      "Ordinary space made strange without explanation",
    ],
    cameraMoves: ["Precisely choreographed long take", "Deliberate reveal-by-drift"],
    lighting: ["Naturalistic with one wrong source", "Muted ambient interior"],
    cutBias: 1.45,
    choreoFlavor: ["deadpan committed movement", "unsettling background activity"],
    palette: ["#3D3B36", "#8C7A5B", "#B8B8A0", "#1E1E1C"],
    direction:
      "Deadpan dream logic: carefully designed long takes, muted naturalistic light, unexpected shifts of scale, and unexplained events performed with total sincerity.",
  }),
  D({
    id: "mythic-painterly",
    name: "Tarsem Singh",
    signature: "Mythic, painterly, operatic, visually grand.",
    techniques: [
      "Monumental sets",
      "Rich costume",
      "Tableaux",
      "Symmetrical staging",
      "Saturated color",
      "Fantasy imagery",
    ],
    shotFlavor: [
      "Monumental symmetrical tableau, painterly and still",
      "Figure in extravagant costume against vast architecture",
      "Operatic fantasy image staged like a painting",
      "Saturated mythic landscape, impossibly composed",
    ],
    cameraMoves: ["Stately symmetrical pull-back", "Slow reveal of monumental scale"],
    lighting: ["Painterly saturated key", "Golden operatic glow"],
    cutBias: 1.3,
    choreoFlavor: ["ceremonial tableau staging", "stylized ritual formation"],
    palette: ["#A62B1F", "#E0A526", "#1F5673", "#F0E3C2"],
    direction:
      "Mythic painterly grandeur: monumental symmetrical staging, extravagant costume, saturated operatic color, and tableaux composed like classical paintings.",
  }),
  D({
    id: "aggressive-chaotic",
    name: "Jonas Åkerlund",
    signature: "Aggressive, provocative, chaotic, performance-heavy.",
    techniques: [
      "Fast cutting",
      "Provocative imagery",
      "Documentary energy",
      "Handheld camera",
      "Bold editing",
      "Rock-and-roll attitude",
    ],
    shotFlavor: [
      "Chaotic handheld burst in the middle of the action",
      "Confrontational performance straight down the lens",
      "Raw documentary chaos, camera barely keeping up",
      "Provocative image cut in before you can read it",
    ],
    cameraMoves: ["Frantic handheld whip", "Aggressive shoulder-mounted charge"],
    lighting: ["Blown-out flash and strobe", "Harsh unflattering practicals"],
    cutBias: 0.6,
    lean: "performance",
    choreoFlavor: ["thrashing unrestrained motion", "confrontational physicality"],
    palette: ["#E01A4F", "#F15946", "#F9C22E", "#101010"],
    direction:
      "Aggressive chaotic energy: relentless fast cutting, harsh flash and strobe, frantic handheld camera, confrontational performance, and raw documentary abandon.",
  }),
  D({
    id: "graphic-pop-art",
    name: "Stéphane Sednaoui",
    signature: "Graphic, playful, fashion-oriented, kinetic.",
    techniques: [
      "Stylized choreography",
      "Unusual camera angles",
      "Graphic color blocking",
      "Surreal set pieces",
      "Pop-art composition",
    ],
    shotFlavor: [
      "Pop-art composition built from flat blocks of color",
      "Unusual angle turning the body into graphic shape",
      "Surreal set piece staged with fashion precision",
      "Kinetic stylized movement against a graphic field",
    ],
    cameraMoves: ["Tilted graphic reframe", "Kinetic spiralling move"],
    lighting: ["Flat graphic color-blocked light", "Bold primary gel wash"],
    cutBias: 0.85,
    choreoFlavor: ["angular graphic shape-making", "stylized fashion movement"],
    palette: ["#FF4365", "#00D9C0", "#FFE156", "#1B1B3A"],
    direction:
      "Graphic pop-art kinetics: flat color-blocked fields, unusual angles turning bodies into shapes, surreal fashion set pieces, and stylized angular movement.",
  }),
  D({
    id: "hyper-camp",
    name: "David LaChapelle",
    signature: "Hyper-colored, surreal, extravagant, camp.",
    techniques: [
      "Elaborate tableaux",
      "Theatrical fashion",
      "Artificial color",
      "Celebrity iconography",
      "Religious and pop-cultural symbolism",
    ],
    shotFlavor: [
      "Hyper-saturated tableau crammed with symbolic detail",
      "Theatrical fashion staged at maximum artificiality",
      "Camp religious iconography rendered in candy color",
      "Extravagant scene where everything is heightened",
    ],
    cameraMoves: ["Static tableau frame", "Grand theatrical pull-back"],
    lighting: ["Artificial candy-colored studio light", "Glossy hyper-real key"],
    cutBias: 1.1,
    choreoFlavor: ["posed theatrical tableau", "camp exaggerated gesture"],
    palette: ["#FF5DA2", "#00C2FF", "#FFE94E", "#7B2FF7"],
    direction:
      "Hyper-real camp extravagance: artificial candy color, elaborate symbolic tableaux, theatrical fashion, glossy studio light, and everything heightened past realism.",
  }),
  D({
    id: "streetwise-cinematic",
    name: "F. Gary Gray",
    signature: "Streetwise, narrative-driven, cinematic hip-hop.",
    techniques: [
      "Strong character arcs",
      "Urban realism",
      "Confident camera movement",
      "Performance mixed with story",
      "Grounded production design",
    ],
    shotFlavor: [
      "Grounded urban scene with a story actually moving",
      "Confident cinematic coverage of a street environment",
      "Character beat that pays off later in the video",
      "Performance cut into the middle of the narrative",
    ],
    cameraMoves: ["Confident cinematic dolly", "Grounded tracking follow"],
    lighting: ["Naturalistic urban night, sodium and neon", "Hard daylight on concrete"],
    cutBias: 1.05,
    lean: "narrative",
    choreoFlavor: ["naturalistic street movement", "grounded crew presence"],
    palette: ["#2B2D42", "#8D99AE", "#EF233C", "#EDF2F4"],
    direction:
      "Streetwise cinematic storytelling: grounded urban realism, naturalistic night lighting, confident classical camera movement, and performance woven into a real character arc.",
  }),
  D({
    id: "luxury-romantic",
    name: "Colin Tilley",
    signature: "Glossy, emotional, visually rich, contemporary pop.",
    techniques: [
      "Luxury styling",
      "Dramatic lighting",
      "Slow motion",
      "Surreal environments",
      "Romantic aspirational imagery",
    ],
    shotFlavor: [
      "Luxurious surreal environment, richly styled",
      "Slow-motion romantic moment, dramatically lit",
      "Aspirational tableau — wealth, beauty, longing",
      "Rich glossy close-up with dramatic falloff",
    ],
    cameraMoves: ["Glossy slow-motion glide", "Dramatic sweeping reveal"],
    lighting: ["Dramatic colored key with deep falloff", "Lush practical glow"],
    cutBias: 1.0,
    choreoFlavor: ["sensual flowing movement", "romantic paired motion"],
    palette: ["#6A0572", "#AB83A1", "#F7B32B", "#0F0E17"],
    direction:
      "Glossy romantic luxury: richly styled surreal environments, dramatic colored lighting with deep falloff, slow-motion emotion, and aspirational contemporary polish.",
  }),
  D({
    id: "digital-metamorphosis",
    name: "Andrew Thomas Huang",
    signature: "Digital surrealism, emotional fantasy, organic transformation.",
    techniques: [
      "CGI environments",
      "Fluid organic forms",
      "Body metamorphosis",
      "Nature and futurism",
      "Experimental movement",
      "Immersive color",
    ],
    shotFlavor: [
      "Body dissolving into organic digital form",
      "Impossible environment where nature and machine merge",
      "Fluid metamorphosis rendered in immersive color",
      "Experimental movement inside a synthetic world",
    ],
    cameraMoves: ["Impossible floating orbit", "Fluid morphing transition"],
    lighting: ["Immersive iridescent glow", "Bioluminescent color bath"],
    cutBias: 1.2,
    choreoFlavor: ["fluid boneless undulation", "experimental morphing motion"],
    palette: ["#00E5B0", "#7B2FF7", "#FF6EC7", "#04121F"],
    direction:
      "Digital organic surrealism: fluid metamorphosing forms, iridescent immersive color, environments where nature and technology merge, and experimental non-human movement.",
  }),
];

export function getDirectorStyle(id?: string | null): DirectorStyle | undefined {
  if (!id) return undefined;
  return DIRECTOR_STYLES.find((style) => style.id === id);
}

/**
 * The prompt fragment for a style, or "" when none is chosen.
 *
 * Callers concatenate this into the prompt array and filter falsy entries, so
 * "no style selected" costs nothing and reads identically to before the
 * feature existed — which is what keeps "skip" a genuine no-op.
 */
export function styleDirectionFragment(style?: DirectorStyle | null): string {
  if (!style) return "";
  return `Style direction: ${style.direction}`;
}

/**
 * Merge a style's flavor into a base pool.
 *
 * Prepending the flavor once is not enough. Selection is index-based
 * (`pick(pool, i)`), so with four flavor entries in front of eight base ones a
 * style's own vocabulary wins only a third of the time — measured on a real
 * track, one style produced a shot, camera move and lighting identical to
 * choosing no style at all. A picker whose effect is invisible two times in
 * three is not a feature.
 *
 * The flavor is repeated until it outnumbers the base roughly two to one, so
 * the style leads while the base still supplies variety and the result stays
 * deterministic for a given index.
 */
export function blendPool(base: string[], flavor?: string[]): string[] {
  if (!flavor?.length) return base;
  const target = Math.max(1, Math.ceil((base.length * 2) / flavor.length));
  const weighted: string[] = [];
  for (let i = 0; i < target; i++) weighted.push(...flavor);
  return [...weighted, ...base];
}

/**
 * The world description to use when a style is chosen but no template is.
 *
 * The generic fallback world ("bold, saturated color and hard light; haze,
 * neon") is a guess made in the absence of any user choice. Left in place it
 * actively fights an explicit style — an art-house pick was arriving with
 * "cold flat light" and "saturated neon" in the same prompt. An explicit
 * choice beats a guess.
 *
 * It describes texture and palette rather than restating `direction`, which
 * the prompt already carries as its own clause; repeating one sentence twice
 * in a prompt wastes budget and over-weights it against everything else.
 */
export function styleVisualWorld(style: DirectorStyle): string {
  const palette = style.palette?.length ? ` Palette: ${style.palette.join(", ")}.` : "";
  return `${style.techniques.join(", ")}.${palette}`;
}

/**
 * Camera and lighting vocabulary for a shot.
 *
 * Unlike shot ideas, these are not blended with the generic pools. A
 * director's lighting and camera language *is* the signature, and a generic
 * entry drawn alongside it doesn't read as variety, it reads as a mistake —
 * an art-house pick was drawing "neon rim with flicker accents" against its
 * own "cold flat light". Real videos hold a lighting scheme across shots, so
 * a small exclusive set is truer than a mixed larger one.
 */
export function styleOrBase(base: string[], flavor: string[] | undefined, i: number): string {
  const pool = flavor?.length ? flavor : base;
  return pool[Math.abs(i) % pool.length];
}
