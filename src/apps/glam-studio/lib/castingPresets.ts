// Casting preset libraries — visual, card-based model direction instead of a
// long attribute form. Entirely optional: most Glam campaigns are product-
// only (no human model), so every axis defaults to "no casting direction."
// Skin tone is the one axis with a real visual (a color swatch); the rest
// are labeled cards, same honesty standard as Camera/Lighting Studio — no
// fabricated photos of "the person," just the descriptive language a
// casting director would give a photographer.

export interface CastingOption {
  id: string;
  label: string;
  promptFragment: string;
}

export const AGE_PRESETS: CastingOption[] = [
  { id: "age-child", label: "Child (6-12)", promptFragment: "a child model, roughly 6-12 years old" },
  { id: "age-teen", label: "Teen (13-19)", promptFragment: "a teenage model, roughly 13-19 years old" },
  { id: "age-young-adult", label: "Young adult (20s)", promptFragment: "a model in their 20s" },
  { id: "age-adult", label: "Adult (30s-40s)", promptFragment: "a model in their 30s-40s" },
  { id: "age-mature", label: "Mature (50s-60s)", promptFragment: "a model in their 50s-60s" },
  { id: "age-senior", label: "Senior (70+)", promptFragment: "a senior model, 70 or older" },
];

export const BODY_TYPE_PRESETS: CastingOption[] = [
  { id: "body-slim", label: "Slim", promptFragment: "slim build" },
  { id: "body-athletic", label: "Athletic", promptFragment: "athletic, toned build" },
  { id: "body-average", label: "Average", promptFragment: "average build" },
  { id: "body-curvy", label: "Curvy", promptFragment: "curvy build" },
  { id: "body-plus", label: "Plus size", promptFragment: "plus-size build" },
  { id: "body-tall", label: "Tall", promptFragment: "tall stature" },
];

export const HAIR_PRESETS: CastingOption[] = [
  { id: "hair-long-straight", label: "Long, straight", promptFragment: "long straight hair" },
  { id: "hair-long-curly", label: "Long, curly", promptFragment: "long curly hair" },
  { id: "hair-short-crop", label: "Short crop", promptFragment: "short cropped hair" },
  { id: "hair-bob", label: "Bob", promptFragment: "a bob haircut" },
  { id: "hair-coils", label: "Natural coils", promptFragment: "natural coily hair" },
  { id: "hair-bald", label: "Bald / shaved", promptFragment: "a bald or shaved head" },
];

export interface SkinTonePreset extends CastingOption {
  swatch: string;
}

export const SKIN_TONE_PRESETS: SkinTonePreset[] = [
  { id: "skin-porcelain", label: "Porcelain", swatch: "#F3D9C6", promptFragment: "porcelain skin tone" },
  { id: "skin-fair", label: "Fair", swatch: "#EAC5A3", promptFragment: "fair skin tone" },
  { id: "skin-light-medium", label: "Light-medium", swatch: "#D9A379", promptFragment: "light-medium skin tone" },
  { id: "skin-medium", label: "Medium", swatch: "#B97F55", promptFragment: "medium skin tone" },
  { id: "skin-tan", label: "Tan", swatch: "#9C6B45", promptFragment: "tan skin tone" },
  { id: "skin-deep", label: "Deep", swatch: "#6B4530", promptFragment: "deep skin tone" },
  { id: "skin-ebony", label: "Ebony", swatch: "#402A1E", promptFragment: "ebony skin tone" },
];

export const EXPRESSION_PRESETS: CastingOption[] = [
  { id: "expr-serene", label: "Serene", promptFragment: "a serene, composed expression" },
  { id: "expr-confident", label: "Confident", promptFragment: "a confident, direct gaze" },
  { id: "expr-joyful", label: "Joyful", promptFragment: "a genuine joyful expression" },
  { id: "expr-intense", label: "Intense", promptFragment: "an intense, editorial expression" },
  { id: "expr-soft-smile", label: "Soft smile", promptFragment: "a soft, natural smile" },
  { id: "expr-candid", label: "Candid / mid-motion", promptFragment: "a candid, mid-motion expression" },
];

export const ACCESSORY_PRESETS: CastingOption[] = [
  { id: "acc-none", label: "None / minimal", promptFragment: "" },
  { id: "acc-fine-jewelry", label: "Fine jewelry", promptFragment: "wearing understated fine jewelry" },
  { id: "acc-statement", label: "Statement piece", promptFragment: "wearing one bold statement accessory" },
  { id: "acc-eyewear", label: "Eyewear", promptFragment: "wearing eyewear" },
  { id: "acc-headwear", label: "Headwear", promptFragment: "wearing a headwear piece" },
];
