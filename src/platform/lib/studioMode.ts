import {
  getStudioMode,
  setStudioMode,
  STUDIO_MODES,
  type StudioMode,
} from "@/platform/lib/settings";

export type { StudioMode };
export { getStudioMode, setStudioMode, STUDIO_MODES };

export const STUDIO_MODE_BEHAVIOR: Record<
  StudioMode,
  {
    label: string;
    guided: boolean;
    creativeControls: boolean;
    technicalControls: boolean;
  }
> = {
  director: {
    label: "Director",
    guided: true,
    creativeControls: false,
    technicalControls: false,
  },
  studio: {
    label: "Studio",
    guided: true,
    creativeControls: true,
    technicalControls: false,
  },
  creator: {
    label: "Creator",
    guided: true,
    creativeControls: true,
    technicalControls: true,
  },
};

export function canShowCreativeControls(mode: StudioMode): boolean {
  return STUDIO_MODE_BEHAVIOR[mode].creativeControls;
}

export function canShowTechnicalControls(mode: StudioMode): boolean {
  return STUDIO_MODE_BEHAVIOR[mode].technicalControls;
}
