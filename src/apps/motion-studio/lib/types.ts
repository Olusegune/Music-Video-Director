export type AspectRatio = "16:9" | "9:16" | "1:1";

export type MotionProjectStatus = "draft" | "storyboard" | "approved" | "export-ready";

export interface Typography {
  heading: string;
  body: string;
  weight: number;
  tracking: number;
  leading: number;
}

export interface CreativeDirection {
  visualLanguage: string;
  animationStyleId: string;
  characterStyleId: string;
  cameraStyleId: string;
  lightingStyleId: string;
  typographyStyleId: string;
  transitionStyleId: string;
  editingStyleId: string;
  colorPalette: string[];
  motionLanguage: string;
  composition: string;
  establishedAt: string;
}

export interface MotionScene {
  id: string;
  role: string;
  start: number;
  end: number;
  headline: string;
  support: string;
  intent: string;
  layout: string;
  motion: string;
  camera: string;
  energy: number;
  accent: string;
  transition: string;
  voiceover: string;
  audioCue: string;
  promptOverride?: string;
  approved?: boolean;
  score?: number;
}

export interface MotionProject {
  id: string;
  name: string;
  typeId: string;
  styleId: string;
  brief: string;
  businessInput: string;
  marketingBrief: string;
  script: string;
  aspect: AspectRatio;
  durationSec: number;
  feeling: string;
  status: MotionProjectStatus;
  direction: CreativeDirection;
  typography: Typography;
  scenes: MotionScene[];
  loopLog: MotionLoopEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface MotionLoopEvent {
  id: string;
  stage: "generate" | "critique" | "score" | "improve" | "save-version" | "approve";
  target: "brief" | "script" | "storyboard" | "motion-style" | "scene-plan" | "export-review";
  summary: string;
  score?: number;
  createdAt: string;
}

export interface MotionProjectDraft {
  name: string;
  typeId: string;
  styleId: string;
  businessInput: string;
  marketingBrief: string;
  script: string;
  brief: string;
  aspect: AspectRatio;
  durationSec: number;
  feeling: string;
}
