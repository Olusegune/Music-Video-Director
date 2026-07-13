// Human Realism controls — multi-select prompt fragments for photographic
// skin/material fidelity. No image API exposes a literal "subsurface
// scattering" toggle; these are the exact vocabulary a retoucher/photographer
// would use to push a model toward (or away from) hyperrealistic rendering.
//
// Honesty note: the brief asks these to be gated to "controls actually
// supported by the active model." Glam Studio currently auto-routes the
// provider at generation time rather than exposing an upfront model picker
// (unlike Animation Lab / MV Director's GenerationPanel), so there is no
// "active model" to gate against yet. These presets apply universally until
// Glam Studio gets a real model selector — flagged here rather than faking a
// capability check against nothing.

export interface RealismPreset {
  id: string;
  label: string;
  group: "Skin" | "Eyes & Teeth" | "Hair" | "Materials";
  promptFragment: string;
}

export const REALISM_PRESETS: RealismPreset[] = [
  {
    id: "realism-skin-microdetail",
    label: "Skin micro-detail",
    group: "Skin",
    promptFragment: "hyperrealistic skin micro-detail, visible pore texture",
  },
  {
    id: "realism-freckles",
    label: "Freckles",
    group: "Skin",
    promptFragment: "natural freckles and subtle skin variation",
  },
  {
    id: "realism-veins",
    label: "Subtle veins",
    group: "Skin",
    promptFragment: "faint natural under-skin vein detail",
  },
  {
    id: "realism-subsurface",
    label: "Subsurface glow",
    group: "Skin",
    promptFragment: "soft subsurface light scattering through the skin, not flat or plastic",
  },
  {
    id: "realism-eye-moisture",
    label: "Eye moisture",
    group: "Eyes & Teeth",
    promptFragment: "moist, reflective eyes with natural catchlight",
  },
  {
    id: "realism-teeth",
    label: "Teeth realism",
    group: "Eyes & Teeth",
    promptFragment: "natural, slightly imperfect tooth texture and translucency",
  },
  {
    id: "realism-hair",
    label: "Hair strand detail",
    group: "Hair",
    promptFragment: "individually rendered hair strands and natural flyaways",
  },
  {
    id: "realism-fabric",
    label: "Fabric realism",
    group: "Materials",
    promptFragment: "realistic fabric weave, drape, and weight",
  },
  {
    id: "realism-jewelry",
    label: "Jewelry realism",
    group: "Materials",
    promptFragment: "accurate metal specularity and gemstone refraction on jewelry",
  },
  {
    id: "realism-glass",
    label: "Glass realism",
    group: "Materials",
    promptFragment: "accurate glass refraction, reflection, and transparency",
  },
];
