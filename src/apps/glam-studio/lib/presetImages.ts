/**
 * Preset image manifest — maps preset IDs to image assets.
 * Images are stored in public/assets/glam-presets/ and referenced
 * as relative paths for both development and production builds.
 */

export interface PresetImageMap {
  [presetId: string]: string;
}

// Image filenames in sequential order (sorted by creation time)
const IMAGE_FILES = [
  "Image categories for Glam Studio-20260713-215506-4447.jpg",
  "Image categories for Glam Studio-20260713-215512-0560.jpg",
  "Image categories for Glam Studio-20260713-215521-9281.jpg",
  "Image categories for Glam Studio-20260713-215526-1271.png",
  "Image categories for Glam Studio-20260713-215531-9898.png",
  "Image categories for Glam Studio-20260713-215535-6523.png",
  "Image categories for Glam Studio-20260713-215539-3434.png",
  "Image categories for Glam Studio-20260713-215543-9291.png",
  "Image categories for Glam Studio-20260713-215548-8653.png",
  "Image categories for Glam Studio-20260713-215552-9208.png",
  "Image categories for Glam Studio-20260713-215556-4373.png",
  "Image categories for Glam Studio-20260713-215600-2459.png",
  "Image categories for Glam Studio-20260713-215604-3129.png",
  "Image categories for Glam Studio-20260713-215609-7933.png",
  "Image categories for Glam Studio-20260713-215615-4982.png",
  "Image categories for Glam Studio-20260713-215618-7869.png",
  "Image categories for Glam Studio-20260713-215624-9840.png",
  "Image categories for Glam Studio-20260713-215628-6241.png",
  "Image categories for Glam Studio-20260713-215632-3659.png",
  "Image categories for Glam Studio-20260713-215653-3667.png",
  "Image categories for Glam Studio-20260713-215658-2013.png",
  "Image categories for Glam Studio-20260713-215702-5037.png",
  "Image categories for Glam Studio-20260713-215706-6884.png",
  "Image categories for Glam Studio-20260713-215710-0306.png",
  "Image categories for Glam Studio-20260713-215717-4243.png",
  "Image categories for Glam Studio-20260713-215720-9127.png",
  "Image categories for Glam Studio-20260713-215724-9647.png",
  "Image categories for Glam Studio-20260713-215728-5740.png",
  "Image categories for Glam Studio-20260713-215731-6385.png",
  "Image categories for Glam Studio-20260713-215736-4971.png",
  "Image categories for Glam Studio-20260713-215740-9851.png",
  "Image categories for Glam Studio-20260713-215745-4405.png",
  "Image categories for Glam Studio-20260713-215751-3727.png",
  "Image categories for Glam Studio-20260713-215756-4884.png",
  "Image categories for Glam Studio-20260713-215800-8654.png",
  "Image categories for Glam Studio-20260713-215804-5436.png",
  "Image categories for Glam Studio-20260713-215808-4768.png",
  "Image categories for Glam Studio-20260713-215812-7013.png",
  "Image categories for Glam Studio-20260713-215816-3626.png",
  "Image categories for Glam Studio-20260713-215820-3297.png",
  "Image categories for Glam Studio-20260713-215825-3554.png",
  "Image categories for Glam Studio-20260713-215829-9944.png",
  "Image categories for Glam Studio-20260713-215834-1012.png",
  "Image categories for Glam Studio-20260713-215837-7751.png",
  "Image categories for Glam Studio-20260713-215841-0920.png",
  "Image categories for Glam Studio-20260713-215844-0510.png",
  "Image categories for Glam Studio-20260713-215848-2381.png",
  "Image categories for Glam Studio-20260713-215852-4429.png",
  "Image categories for Glam Studio-20260713-215856-9533.png",
  "Image categories for Glam Studio-20260713-215900-9122.png",
  "Image categories for Glam Studio-20260713-215903-4963.png",
  "Image categories for Glam Studio-20260713-215907-5065.png",
  "Image categories for Glam Studio-20260713-215911-6691.png",
  "Image categories for Glam Studio-20260713-215914-6184.png",
  "Image categories for Glam Studio-20260713-215918-9937.png",
  "Image categories for Glam Studio-20260713-215922-5733.png",
  "Image categories for Glam Studio-20260713-215926-3290.png",
  "Image categories for Glam Studio-20260713-215929-1264.png",
  "Image categories for Glam Studio-20260713-215933-5060.png",
  "Image categories for Glam Studio-20260713-215936-4791.png",
  "Image categories for Glam Studio-20260713-215941-3546.png",
  "Image categories for Glam Studio-20260713-215944-0710.png",
  "Image categories for Glam Studio-20260713-215948-7525.png",
  "Image categories for Glam Studio-20260713-215953-5049.png",
  "Image categories for Glam Studio-20260713-215957-2180.png",
  "Image categories for Glam Studio-20260713-220002-7810.png",
  "Image categories for Glam Studio-20260713-220005-2869.png",
  "Image categories for Glam Studio-20260713-220022-3587.png",
  "Image categories for Glam Studio-20260713-220030-3122.png",
  "Image categories for Glam Studio-20260713-220039-9934.png",
  "Image categories for Glam Studio-20260713-220059-0445.png",
  "Image categories for Glam Studio-20260713-220103-7410.png",
  "Image categories for Glam Studio-20260713-220108-8242.png",
  "Image categories for Glam Studio-20260713-220111-6853.png",
  "Image categories for Glam Studio-20260713-220116-3331.png",
  "Image categories for Glam Studio-20260713-220119-8695.png",
  "Image categories for Glam Studio-20260713-220131-7987.png",
  "Image categories for Glam Studio-20260713-220146-4736.png",
  "Image categories for Glam Studio-20260713-220152-4123.png",
  "Image categories for Glam Studio-20260713-220203-8572.png",
  "Image categories for Glam Studio-20260713-220207-5871.png",
  "Image categories for Glam Studio-20260713-220213-8497.png",
  "Image categories for Glam Studio-20260713-220220-2823.png",
  "Image categories for Glam Studio-20260713-220226-9259.png",
  "Image categories for Glam Studio-20260713-220242-6190.png",
  "Image categories for Glam Studio-20260713-220247-9908.png",
  "Image categories for Glam Studio-20260713-220251-9113.png",
  "Image categories for Glam Studio-20260713-220256-2830.png",
  "Image categories for Glam Studio-20260713-220259-3732.png",
  "Image categories for Glam Studio-20260713-220304-9942.png",
  "Image categories for Glam Studio-20260713-220310-1854.png",
  "Image categories for Glam Studio-20260713-220318-5808.png",
  "Image categories for Glam Studio-20260713-220330-6889.png",
  "Image categories for Glam Studio-20260713-220341-1547.png",
  "Image categories for Glam Studio-20260713-220350-9157.png",
  "Image categories for Glam Studio-20260713-220355-7843.png",
];

// Casting presets: Age (6) + Body Type (6) + Hair (6) + Skin Tone (7) + Expression (6) + Accessories (5)
export const CASTING_IMAGE_MAP: PresetImageMap = {
  "age-child": IMAGE_FILES[0],
  "age-teen": IMAGE_FILES[1],
  "age-young-adult": IMAGE_FILES[2],
  "age-adult": IMAGE_FILES[3],
  "age-mature": IMAGE_FILES[4],
  "age-senior": IMAGE_FILES[5],
  "body-slim": IMAGE_FILES[6],
  "body-athletic": IMAGE_FILES[7],
  "body-average": IMAGE_FILES[8],
  "body-curvy": IMAGE_FILES[9],
  "body-plus": IMAGE_FILES[10],
  "body-tall": IMAGE_FILES[11],
  "hair-long-straight": IMAGE_FILES[12],
  "hair-long-curly": IMAGE_FILES[13],
  "hair-short-crop": IMAGE_FILES[14],
  "hair-bob": IMAGE_FILES[15],
  "hair-coils": IMAGE_FILES[16],
  "hair-bald": IMAGE_FILES[17],
  "skin-porcelain": IMAGE_FILES[18],
  "skin-fair": IMAGE_FILES[19],
  "skin-light-medium": IMAGE_FILES[20],
  "skin-medium": IMAGE_FILES[21],
  "skin-tan": IMAGE_FILES[22],
  "skin-deep": IMAGE_FILES[23],
  "skin-ebony": IMAGE_FILES[24],
  "expr-serene": IMAGE_FILES[25],
  "expr-confident": IMAGE_FILES[26],
  "expr-joyful": IMAGE_FILES[27],
  "expr-intense": IMAGE_FILES[28],
  "expr-soft-smile": IMAGE_FILES[29],
  "expr-candid": IMAGE_FILES[30],
  "acc-none": IMAGE_FILES[31],
  "acc-fine-jewelry": IMAGE_FILES[32],
  "acc-statement": IMAGE_FILES[33],
  "acc-eyewear": IMAGE_FILES[34],
  "acc-headwear": IMAGE_FILES[35],
};

// Camera presets (6)
export const CAMERA_IMAGE_MAP: PresetImageMap = {
  "cam-85-portrait": IMAGE_FILES[36],
  "cam-50-editorial": IMAGE_FILES[37],
  "cam-35-environmental": IMAGE_FILES[38],
  "cam-24-architectural": IMAGE_FILES[39],
  "cam-100-macro": IMAGE_FILES[40],
  "cam-tilt-shift": IMAGE_FILES[41],
};

// Lighting presets (15)
export const LIGHTING_IMAGE_MAP: PresetImageMap = {
  "light-rembrandt": IMAGE_FILES[42],
  "light-butterfly": IMAGE_FILES[43],
  "light-loop": IMAGE_FILES[44],
  "light-split": IMAGE_FILES[45],
  "light-soft-beauty": IMAGE_FILES[46],
  "light-hard-editorial": IMAGE_FILES[47],
  "light-high-key": IMAGE_FILES[48],
  "light-low-key": IMAGE_FILES[49],
  "light-three-point": IMAGE_FILES[50],
  "light-window": IMAGE_FILES[51],
  "light-golden-hour": IMAGE_FILES[52],
  "light-blue-hour": IMAGE_FILES[53],
  "light-ring": IMAGE_FILES[54],
  "light-strip": IMAGE_FILES[55],
  "light-practical": IMAGE_FILES[56],
};

// Realism presets (10)
export const REALISM_IMAGE_MAP: PresetImageMap = {
  "realism-skin-microdetail": IMAGE_FILES[57],
  "realism-freckles": IMAGE_FILES[58],
  "realism-veins": IMAGE_FILES[59],
  "realism-subsurface": IMAGE_FILES[60],
  "realism-eye-moisture": IMAGE_FILES[61],
  "realism-teeth": IMAGE_FILES[62],
  "realism-hair": IMAGE_FILES[63],
  "realism-fabric": IMAGE_FILES[64],
  "realism-jewelry": IMAGE_FILES[65],
  "realism-glass": IMAGE_FILES[66],
};

// Inspiration presets (12)
export const INSPIRATION_IMAGE_MAP: PresetImageMap = {
  "insp-bold-celebrity": IMAGE_FILES[67],
  "insp-surreal-fashion": IMAGE_FILES[68],
  "insp-cinematic-bw": IMAGE_FILES[69],
  "insp-hyperreal-editorial": IMAGE_FILES[70],
  "insp-jet-set-glamour": IMAGE_FILES[71],
  "insp-clean-modern-beauty": IMAGE_FILES[72],
  "insp-naturalist-cinema": IMAGE_FILES[73],
  "insp-epic-scale": IMAGE_FILES[74],
  "insp-intimate-handheld": IMAGE_FILES[75],
  "insp-neon-noir": IMAGE_FILES[76],
  "insp-minimal-tech-luxury": IMAGE_FILES[77],
  "insp-heritage-craft": IMAGE_FILES[78],
  "insp-performance-automotive": IMAGE_FILES[79],
};

// Combined map for easy lookup
export const ALL_PRESET_IMAGES: PresetImageMap = {
  ...CASTING_IMAGE_MAP,
  ...CAMERA_IMAGE_MAP,
  ...LIGHTING_IMAGE_MAP,
  ...REALISM_IMAGE_MAP,
  ...INSPIRATION_IMAGE_MAP,
};

/**
 * Get the image URL for a preset ID.
 * Returns the asset path relative to public/ directory.
 */
export function getPresetImageUrl(presetId: string): string | undefined {
  const filename = ALL_PRESET_IMAGES[presetId];
  if (filename) {
    return `/assets/glam-presets/${filename}`;
  }
  return undefined;
}
