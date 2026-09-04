import type { CreativeDirection, Typography } from "./types";
import aeExplainerImage from "@/assets/motion-templates/ae-explainer.jpg";
import c4dCommercialImage from "@/assets/motion-templates/c4d-commercial.jpg";
import kineticTypographyImage from "@/assets/motion-templates/kinetic-typography.jpg";
import mixedMediaAnimationImage from "@/assets/motion-templates/mixed-media-animation.jpg";
import productLaunchImage from "@/assets/motion-templates/product-launch.jpg";
import productRevealImage from "@/assets/motion-templates/product-reveal.jpg";
import saasExplainerImage from "@/assets/motion-templates/saas-explainer.jpg";
import socialAdImage from "@/assets/motion-templates/social-ad.jpg";
import uiAnimationImage from "@/assets/motion-templates/ui-animation.jpg";

export interface ProductionType {
  id: string;
  name: string;
  description: string;
  defaultDuration: number;
  sceneRoles: string[];
  imageUrl: string;
  accent: string;
  eyebrow: string;
}

export interface VisualStyle {
  id: string;
  name: string;
  family: "2d" | "3d" | "hybrid" | "typography" | "commercial";
  description: string;
  palette: string[];
  motionVocab: string[];
  softness: number;
}

export const PRODUCTION_TYPES: ProductionType[] = [
  {
    id: "saas-explainer",
    name: "SaaS Explainer",
    description: "Problem, product promise, workflow, proof, and CTA.",
    defaultDuration: 45,
    sceneRoles: ["Hook", "Pain", "Product", "Workflow", "Proof", "CTA"],
    imageUrl: saasExplainerImage,
    accent: "#7C3AED",
    eyebrow: "Startup systems",
  },
  {
    id: "product-launch",
    name: "Product Launch",
    description: "Announcement film with market context and launch energy.",
    defaultDuration: 60,
    sceneRoles: ["Tease", "Reveal", "Benefits", "Use Cases", "Launch CTA"],
    imageUrl: productLaunchImage,
    accent: "#F59E0B",
    eyebrow: "Launch stage",
  },
  {
    id: "product-reveal",
    name: "Product Reveal",
    description: "Cinematic object-led reveal with premium pacing.",
    defaultDuration: 30,
    sceneRoles: ["Dark Intro", "Silhouette", "Feature Sweep", "Hero Spin", "End Card"],
    imageUrl: productRevealImage,
    accent: "#D8B45D",
    eyebrow: "Luxury reveal",
  },
  {
    id: "c4d-commercial",
    name: "Cinema 4D-style Commercial",
    description: "Glossy 3D product motion, macro camera moves, and tactile lighting.",
    defaultDuration: 45,
    sceneRoles: ["Macro Detail", "World Build", "Orbit", "Feature Burst", "Packshot"],
    imageUrl: c4dCommercialImage,
    accent: "#06B6D4",
    eyebrow: "3D product film",
  },
  {
    id: "ae-explainer",
    name: "After Effects-style Explainer",
    description: "Layered shape motion, transitions, callouts, and polished kinetic beats.",
    defaultDuration: 50,
    sceneRoles: ["Setup", "Diagram", "Steps", "Callouts", "Outcome", "CTA"],
    imageUrl: aeExplainerImage,
    accent: "#8B5CF6",
    eyebrow: "Layered explainer",
  },
  {
    id: "ui-animation",
    name: "UI Animation",
    description: "Interface walkthrough with cursor, panels, states, and product clarity.",
    defaultDuration: 40,
    sceneRoles: ["Dashboard", "Action", "Automation", "Insight", "Result"],
    imageUrl: uiAnimationImage,
    accent: "#60A5FA",
    eyebrow: "Interface motion",
  },
  {
    id: "social-ad",
    name: "Social Ad",
    description: "Fast hook, quick proof, benefit stack, and platform-native CTA.",
    defaultDuration: 20,
    sceneRoles: ["Thumbstopper", "Problem", "Benefit", "Proof", "CTA"],
    imageUrl: socialAdImage,
    accent: "#EC4899",
    eyebrow: "Performance creative",
  },
  {
    id: "kinetic-typography",
    name: "Kinetic Typography",
    description: "Text-led motion, rhythmic emphasis, and bold word choreography.",
    defaultDuration: 30,
    sceneRoles: ["Phrase Hook", "Build", "Contrast", "Payoff", "Tag"],
    imageUrl: kineticTypographyImage,
    accent: "#EF4444",
    eyebrow: "Type choreography",
  },
  {
    id: "mixed-media-animation",
    name: "Mixed Media Animation",
    description: "Collage, footage, cutout, 2D, 3D, and editorial transitions.",
    defaultDuration: 45,
    sceneRoles: ["Texture Hook", "Collage", "Product Insert", "Human Moment", "Final Lockup"],
    imageUrl: mixedMediaAnimationImage,
    accent: "#22D3EE",
    eyebrow: "Editorial collage",
  },
];

export const VISUAL_STYLES: VisualStyle[] = [
  {
    id: "flat-illustration",
    name: "Flat Illustration",
    family: "2d",
    description: "Crisp vector characters, product cards, friendly color blocking.",
    palette: ["#101828", "#FFFFFF", "#4F46E5", "#22C55E", "#F59E0B"],
    motionVocab: ["slide", "pop", "mask reveal", "liquid graph"],
    softness: 0.72,
  },
  {
    id: "rubber-hose",
    name: "Rubber Hose",
    family: "2d",
    description: "Playful bendy limbs, elastic timing, and cheerful character action.",
    palette: ["#111827", "#F9FAFB", "#EF4444", "#FACC15", "#38BDF8"],
    motionVocab: ["squash", "stretch", "overshoot", "boil"],
    softness: 0.86,
  },
  {
    id: "isometric",
    name: "Isometric",
    family: "2d",
    description: "Angled product worlds, modular rooms, and clean diagram depth.",
    palette: ["#172554", "#EFF6FF", "#14B8A6", "#A855F7", "#F97316"],
    motionVocab: ["tile build", "parallax stack", "path trace", "module swap"],
    softness: 0.58,
  },
  {
    id: "pixar-inspired",
    name: "Pixar-inspired",
    family: "3d",
    description: "Warm expressive characters, soft cinematic light, storybook staging.",
    palette: ["#0F172A", "#FEF3C7", "#60A5FA", "#F472B6", "#34D399"],
    motionVocab: ["anticipation", "character beat", "camera push", "soft reveal"],
    softness: 0.9,
  },
  {
    id: "anime",
    name: "Anime",
    family: "2d",
    description: "Graphic silhouettes, speed lines, expressive poses, and sharp cuts.",
    palette: ["#030712", "#F8FAFC", "#DC2626", "#7C3AED", "#06B6D4"],
    motionVocab: ["smear", "impact frame", "snap zoom", "speed line"],
    softness: 0.35,
  },
  {
    id: "cinema-4d",
    name: "Cinema 4D-style",
    family: "3d",
    description: "Glossy 3D objects, bevels, studio reflections, and macro motion.",
    palette: ["#020617", "#F8FAFC", "#06B6D4", "#F97316", "#94A3B8"],
    motionVocab: ["orbit", "extrude", "cloner burst", "macro glide"],
    softness: 0.42,
  },
  {
    id: "after-effects",
    name: "After Effects-style",
    family: "commercial",
    description: "Shape layers, typography rigs, null-driven motion, and fast transitions.",
    palette: ["#111827", "#F9FAFB", "#2563EB", "#EC4899", "#84CC16"],
    motionVocab: ["shape wipe", "track matte", "parented rig", "trim path"],
    softness: 0.48,
  },
  {
    id: "hybrid-2d-3d",
    name: "Hybrid 2D/3D",
    family: "hybrid",
    description: "2D characters over 3D objects with layered editorial depth.",
    palette: ["#1F2937", "#F3F4F6", "#0EA5E9", "#EAB308", "#10B981"],
    motionVocab: ["depth swap", "match cut", "2.5D parallax", "object handoff"],
    softness: 0.62,
  },
  {
    id: "kinetic-type",
    name: "Kinetic Type",
    family: "typography",
    description: "Large word choreography, scale hits, and phrase-based timing.",
    palette: ["#0A0A0A", "#FAFAFA", "#F43F5E", "#22D3EE", "#A3E635"],
    motionVocab: ["word hit", "type cascade", "baseline slide", "glyph morph"],
    softness: 0.31,
  },
];

export const DEFAULT_TYPOGRAPHY: Typography = {
  heading: "Inter",
  body: "Inter",
  weight: 800,
  tracking: 0,
  leading: 1.12,
};

export function productionType(id: string): ProductionType {
  return PRODUCTION_TYPES.find((type) => type.id === id) ?? PRODUCTION_TYPES[0];
}

export function visualStyle(id: string): VisualStyle {
  return VISUAL_STYLES.find((style) => style.id === id) ?? VISUAL_STYLES[0];
}

export function directionSummary(direction: CreativeDirection): string {
  return `${direction.visualLanguage} Motion: ${direction.motionLanguage}. Composition: ${direction.composition}.`;
}
