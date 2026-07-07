// Animation Lab — motion-test prompt composition + a localStorage gallery.
//
// A motion test composes the selected Character (+ optional Environment + Prop)
// Prompt DNA with a motion-type modifier, so the clip preserves the locked
// look. Generated clip srcs are remembered in a small gallery.

import type { Character, Environment, Prop } from "@/platform/lib/types";
import { composeCharacterDna } from "@/platform/lib/characterDna";
import { composeEnvironmentDna } from "@/platform/lib/environmentDna";
import { composePropDna } from "@/platform/lib/propDna";

export interface MotionType {
  key: string;
  label: string;
  modifier: string;
}

export const MOTION_TYPES: MotionType[] = [
  { key: "lipsync", label: "Lip-sync / Dialogue", modifier: "singing to camera with natural lip sync and subtle head movement, medium shot" },
  { key: "dance", label: "Dance / Choreography", modifier: "performing a full dance routine, rhythmic full-body choreography, energetic" },
  { key: "walk", label: "Walk Cycle", modifier: "walk cycle, side profile, looping locomotion, full body" },
  { key: "performance", label: "Performance / Acting", modifier: "expressive performance acting, emotion and gesture, medium close-up" },
  { key: "action", label: "Action Test", modifier: "dynamic action movement, energetic, full body" },
  { key: "camera", label: "Camera Move", modifier: "slow cinematic dolly and orbit around the subject, shallow depth of field" },
  { key: "environment", label: "Environment Motion", modifier: "atmospheric environment in motion — drifting light, particles, weather, living set" },
  { key: "prop", label: "Prop / Vehicle Motion", modifier: "the prop or vehicle in motion, mechanical movement, dynamic" },
  { key: "idle", label: "Idle", modifier: "subtle idle animation, breathing and weight shift" },
];

/** Compose the video prompt from the chosen entities + motion type. */
export function composeMotionPrompt(
  character: Character | null,
  environment: Environment | null,
  prop: Prop | null,
  motion: MotionType
): string {
  const parts: string[] = [];
  if (character) parts.push(character.promptDna.trim() || composeCharacterDna(character).promptDna);
  if (environment) {
    const envDna = environment.promptDna.trim() || composeEnvironmentDna(environment).promptDna;
    parts.push(`in ${environment.name}`, envDna);
  }
  if (prop) {
    const propDna = prop.promptDna.trim() || composePropDna(prop).promptDna;
    parts.push(`with ${prop.name}`, propDna);
  }
  parts.push(motion.modifier, "short smooth motion test, consistent character and setting");
  return parts.filter(Boolean).join(", ");
}

export interface MotionTest {
  id: string;
  label: string;
  characterName: string;
  motionLabel: string;
  prompt: string;
  url: string;
  createdAt: string;
}

const LS = "mf.motiontests";

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `motion-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }
}

export function loadMotionTests(): MotionTest[] {
  try {
    const raw = localStorage.getItem(LS);
    return raw ? (JSON.parse(raw) as MotionTest[]) : [];
  } catch {
    return [];
  }
}

export function addMotionTest(t: Omit<MotionTest, "id" | "createdAt">): MotionTest {
  const test: MotionTest = { ...t, id: newId(), createdAt: new Date().toISOString() };
  const all = [test, ...loadMotionTests()].slice(0, 30);
  localStorage.setItem(LS, JSON.stringify(all));
  return test;
}

export function deleteMotionTest(id: string) {
  localStorage.setItem(LS, JSON.stringify(loadMotionTests().filter((t) => t.id !== id)));
}
