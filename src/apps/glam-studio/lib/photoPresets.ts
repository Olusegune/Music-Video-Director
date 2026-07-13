// Camera Studio + Lighting Studio preset libraries for Glam Studio's
// professional photography system. These are NOT literal camera/lighting
// simulations — no image API exposes real ISO/shutter/Rembrandt-lighting
// parameters. Each preset is a curated, expert-vocabulary prompt fragment
// that a working photographer would know to ask for, so a beginner gets
// professional results without knowing the terminology. Selecting a preset
// is optional; the campaign's Look already carries baseline lighting/lens
// direction, and these refine or override it.

export interface CameraPreset {
  id: string;
  name: string;
  family: "Portrait" | "Editorial" | "Product" | "Cinematic";
  /** Short line shown on the card. */
  summary: string;
  /** Appended to the generation prompt when selected. */
  promptFragment: string;
}

export const CAMERA_PRESETS: CameraPreset[] = [
  {
    id: "cam-85-portrait",
    name: "85mm Portrait",
    family: "Portrait",
    summary: "Classic beauty compression, creamy falloff",
    promptFragment:
      "Shot on an 85mm f/1.4 portrait lens: flattering compression, shallow depth of field, creamy background falloff, natural skin rendering.",
  },
  {
    id: "cam-50-editorial",
    name: "50mm Editorial",
    family: "Editorial",
    summary: "Natural perspective, documentary-honest",
    promptFragment:
      "Shot on a 50mm f/1.8 lens: natural human-eye perspective, honest editorial rendering, moderate depth of field.",
  },
  {
    id: "cam-35-environmental",
    name: "35mm Environmental",
    family: "Editorial",
    summary: "Wider context, subject-in-place",
    promptFragment:
      "Shot on a 35mm lens: environmental framing that places the subject in context, gentle wide-angle presence without distortion.",
  },
  {
    id: "cam-24-architectural",
    name: "24mm Wide Hero",
    family: "Cinematic",
    summary: "Low, wide, dramatic hero angle",
    promptFragment:
      "Shot on a 24mm wide lens from a low hero angle: dramatic perspective, strong foreground-to-background scale, architectural presence.",
  },
  {
    id: "cam-100-macro",
    name: "100mm Macro",
    family: "Product",
    summary: "Tactile texture and material detail",
    promptFragment:
      "Shot on a 100mm macro lens: extreme material and texture fidelity, tack-sharp product detail, razor-thin focus plane.",
  },
  {
    id: "cam-tilt-shift",
    name: "Tilt-Shift Product",
    family: "Product",
    summary: "Full-frame product sharpness",
    promptFragment:
      "Shot with a tilt-shift lens technique: full product sharpness front-to-back with a controlled, precise plane of focus.",
  },
];

export interface LightingPreset {
  id: string;
  name: string;
  family: "Portrait" | "Editorial" | "Natural" | "Studio";
  summary: string;
  /** Simple two/three-line diagram description rendered as CSS, not an image. */
  diagram: string;
  promptFragment: string;
}

export const LIGHTING_PRESETS: LightingPreset[] = [
  {
    id: "light-rembrandt",
    name: "Rembrandt",
    family: "Portrait",
    summary: "Triangle of light on the shadow cheek",
    diagram: "45° key, high",
    promptFragment:
      "Rembrandt lighting: a 45-degree key light creating a small triangle of light on the shadowed cheek, classic dramatic portrait falloff.",
  },
  {
    id: "light-butterfly",
    name: "Butterfly",
    family: "Portrait",
    summary: "Symmetrical shadow under the nose",
    diagram: "Key above, centered",
    promptFragment:
      "Butterfly lighting: key light directly above and in front of the subject, casting a symmetrical butterfly-shaped shadow beneath the nose — classic glamour look.",
  },
  {
    id: "light-loop",
    name: "Loop",
    family: "Portrait",
    summary: "Small nose-shadow loop, versatile default",
    diagram: "45° key, slightly lower",
    promptFragment:
      "Loop lighting: key light slightly above eye level and off-axis, casting a small loop-shaped nose shadow — natural, versatile portrait lighting.",
  },
  {
    id: "light-split",
    name: "Split",
    family: "Portrait",
    summary: "Half the face lit, half in shadow",
    diagram: "90° key, side",
    promptFragment:
      "Split lighting: key light at 90 degrees to the subject, lighting exactly half the face and leaving the other half in shadow — dramatic, moody character lighting.",
  },
  {
    id: "light-soft-beauty",
    name: "Soft Beauty",
    family: "Studio",
    summary: "Large soft source, flattering and clean",
    diagram: "Large softbox, frontal",
    promptFragment:
      "Soft beauty lighting: large frontal soft source (beauty dish or octabox), even flattering falloff, minimal harsh shadow, clean catchlights.",
  },
  {
    id: "light-hard-editorial",
    name: "Hard Editorial",
    family: "Editorial",
    summary: "Crisp shadows, high-fashion edge",
    diagram: "Small hard source, angled",
    promptFragment:
      "Hard editorial lighting: small, undiffused hard source creating crisp, defined shadows and high-contrast fashion-editorial edge.",
  },
  {
    id: "light-high-key",
    name: "High Key",
    family: "Studio",
    summary: "Bright, airy, minimal shadow",
    diagram: "Even, multi-source fill",
    promptFragment:
      "High-key lighting: bright, even, low-contrast illumination with minimal shadow, airy and optimistic tonal range.",
  },
  {
    id: "light-low-key",
    name: "Low Key",
    family: "Studio",
    summary: "Dark, moody, dramatic contrast",
    diagram: "Single source, deep shadow",
    promptFragment:
      "Low-key lighting: predominantly dark tonal range, a single controlled light source, deep dramatic shadow and selective highlight.",
  },
  {
    id: "light-three-point",
    name: "Three-Point",
    family: "Studio",
    summary: "Key, fill, and rim — full control",
    diagram: "Key + fill + rim",
    promptFragment:
      "Three-point lighting: balanced key light, softer fill to control shadow density, and a rim/hair light for subject separation from the background.",
  },
  {
    id: "light-window",
    name: "Window Light",
    family: "Natural",
    summary: "Soft directional daylight",
    diagram: "Large soft side source",
    promptFragment:
      "Natural window light: soft, directional daylight from one side, gentle falloff, authentic and unforced ambiance.",
  },
  {
    id: "light-golden-hour",
    name: "Golden Hour",
    family: "Natural",
    summary: "Warm low sun, long soft shadows",
    diagram: "Low warm backlight",
    promptFragment:
      "Golden hour lighting: warm low-angle sunlight, long soft shadows, gentle backlit rim glow, romantic warm color temperature.",
  },
  {
    id: "light-blue-hour",
    name: "Blue Hour",
    family: "Natural",
    summary: "Cool twilight ambience",
    diagram: "Ambient twilight fill",
    promptFragment:
      "Blue hour lighting: cool, even twilight ambience just after sunset, deep saturated sky tones, calm and cinematic mood.",
  },
  {
    id: "light-ring",
    name: "Ring Light",
    family: "Studio",
    summary: "Frontal, shadowless, circular catchlight",
    diagram: "Ring source, lens-axis",
    promptFragment:
      "Ring light: shadowless frontal illumination on the lens axis with a distinctive circular catchlight — clean beauty/product look.",
  },
  {
    id: "light-strip",
    name: "Strip Light",
    family: "Studio",
    summary: "Narrow edge/rim definition",
    diagram: "Tall narrow softbox, side",
    promptFragment:
      "Strip light: a tall, narrow soft source used for controlled edge and rim definition, common in product and fashion detail work.",
  },
  {
    id: "light-practical",
    name: "Practical",
    family: "Editorial",
    summary: "In-scene lamps and fixtures as the light",
    diagram: "In-frame sources",
    promptFragment:
      "Practical lighting: the visible in-scene light sources (lamps, neon, fixtures) motivate the illumination — authentic, story-driven ambiance.",
  },
];
