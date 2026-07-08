// Icon + one-line feel for each dance/choreography style — shared by the Cast
// picker and the Choreography style picker so both render the same visual
// card. Presentation only: the move/formation/pose vocabulary that actually
// drives generation lives in lib/choreography.ts (CHOREO_STYLES / STYLES).

import { Mic2, Globe, Star, Feather, Heart, Flame, Disc3, Drama } from "lucide-react";

export interface DanceStyleMeta {
  icon: React.ReactNode;
  tagline: string;
}

export const DANCE_STYLE_META: Record<string, DanceStyleMeta> = {
  "Hip Hop": {
    icon: <Mic2 className="h-4 w-4" />,
    tagline: "Bounce, grooves, hard hits on the beat.",
  },
  Afrobeats: {
    icon: <Globe className="h-4 w-4" />,
    tagline: "Legwork, waist whine, log-drum accents.",
  },
  "Pop / Commercial": {
    icon: <Star className="h-4 w-4" />,
    tagline: "Sharp, synchronized, camera-ready.",
  },
  Contemporary: {
    icon: <Feather className="h-4 w-4" />,
    tagline: "Fluid, emotional, floor work and reach.",
  },
  Gospel: {
    icon: <Heart className="h-4 w-4" />,
    tagline: "Praise hands, claps, joyful and uplifting.",
  },
  "Street / Krump": {
    icon: <Flame className="h-4 w-4" />,
    tagline: "Raw, aggressive, hard-hitting power.",
  },
  House: {
    icon: <Disc3 className="h-4 w-4" />,
    tagline: "Footwork, jacking grooves, loose freestyle.",
  },
  "Stage / Theatrical": {
    icon: <Drama className="h-4 w-4" />,
    tagline: "Big gestures, tableaus, ensemble unison.",
  },
};
