// Icon + one-line description for each performer role — presentation only for
// the Cast role picker (colors already live in cast.ts's roleColor()).

import { Mic, Users, Mic2, Footprints, Star, Guitar, Drama, User } from "lucide-react";
import type { PerformerRole } from "@/apps/music-video/lib/cast";

export const ROLE_META: Record<PerformerRole, { icon: React.ReactNode; tagline: string }> = {
  "Lead Singer": { icon: <Mic className="h-4 w-4" />, tagline: "The main vocal, front and center." },
  "Backing Singer": { icon: <Users className="h-4 w-4" />, tagline: "Harmony and support vocals." },
  Rapper: { icon: <Mic2 className="h-4 w-4" />, tagline: "Verses, bars, on-camera delivery." },
  Dancer: { icon: <Footprints className="h-4 w-4" />, tagline: "Choreography-forward, crew or solo." },
  "Featured Artist": { icon: <Star className="h-4 w-4" />, tagline: "A guest verse or hook moment." },
  "Band Member": { icon: <Guitar className="h-4 w-4" />, tagline: "Instrumentalist in the frame." },
  Actor: { icon: <Drama className="h-4 w-4" />, tagline: "Narrative role, not a musician." },
  Extra: { icon: <User className="h-4 w-4" />, tagline: "Background presence, scene texture." },
};
