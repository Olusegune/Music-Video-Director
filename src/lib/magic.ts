// "Magical" one-click pack doctors. Each takes a PromptPack and returns an
// improved copy (immutable) — no API call. These are the buttons that make a
// beginner feel like a director.

import type { PromptPack, ShotBreakdown } from "@/lib/types";
import { newLockItem, type TextLockItem } from "@/lib/textlock";

export interface MagicResult {
  pack: PromptPack;
  /** Human summary of what changed, for a toast. */
  summary: string;
}

const CINEMATIC_LENS = "40mm anamorphic (T2.2)";

/** "Make it Cinematic" — upgrade camera, lighting, and grade across all shots. */
export function makeItCinematic(pack: PromptPack): MagicResult {
  let touched = 0;
  const shots = pack.shots.map((s) => {
    touched++;
    return {
      ...s,
      camera: {
        ...s.camera,
        lens: s.camera.lens.includes("Flat 2D") ? s.camera.lens : CINEMATIC_LENS,
        composition:
          s.camera.composition +
          (s.camera.composition.includes("depth of field")
            ? ""
            : ", shallow depth of field, anamorphic bokeh"),
        movement: s.camera.movement.includes("parallax")
          ? s.camera.movement
          : `${s.camera.movement}, with subtle parallax`,
      },
      lighting: {
        ...s.lighting,
        rimLight: s.lighting.rimLight || "Cool rim for separation",
        atmosphere: s.lighting.atmosphere.includes("volumetric")
          ? s.lighting.atmosphere
          : `${s.lighting.atmosphere}, volumetric haze for depth`,
        visualStrategy: s.lighting.visualStrategy.includes("motivated")
          ? s.lighting.visualStrategy
          : `Motivated, ${s.lighting.visualStrategy.toLowerCase()}`,
      },
    };
  });

  return {
    pack: {
      ...pack,
      shots,
      style: {
        ...pack.style,
        materials: pack.style.materials.includes("filmic")
          ? pack.style.materials
          : `${pack.style.materials}, filmic grade with gentle halation and grain`,
        mood: pack.style.mood.includes("cinematic")
          ? pack.style.mood
          : `${pack.style.mood}, cinematic`,
      },
    },
    summary: `Made ${touched} shots cinematic: anamorphic lensing, volumetric light, filmic grade.`,
  };
}

function isWeak(s: ShotBreakdown): boolean {
  return (
    !s.purpose.trim() ||
    !s.camera.shotType.trim() ||
    !s.lighting.keyLight.trim() ||
    !s.transition.trim() ||
    s.visualDescription.trim().length < 12
  );
}

/** "Shot Doctor" — find weak/under-specified shots and fill the gaps. */
export function shotDoctor(pack: PromptPack): MagicResult {
  let fixed = 0;
  const shots = pack.shots.map((s) => {
    if (!isWeak(s)) return s;
    fixed++;
    return {
      ...s,
      purpose: s.purpose || `Advance the story at beat ${s.number}`,
      visualDescription:
        s.visualDescription.trim().length >= 12
          ? s.visualDescription
          : `${s.name}: ${pack.style.visualLanguage.split(",")[0]}, clear hero subject with room for type`,
      transition: s.transition || "Cut on action",
      audio: s.audio || "Underscore continues; motivated SFX on the key move",
      camera: {
        ...s.camera,
        shotType: s.camera.shotType || "Medium, hero-centered",
        lens: s.camera.lens || "50mm",
        movement: s.camera.movement || "Slow push-in (dolly)",
        composition: s.camera.composition || "Rule-of-thirds, generous negative space",
      },
      lighting: {
        ...s.lighting,
        keyLight: s.lighting.keyLight || "Soft key, 35° camera-left",
        fillLight: s.lighting.fillLight || "Soft fill (1:3)",
        rimLight: s.lighting.rimLight || "Cool rim for separation",
        colorTemperature: s.lighting.colorTemperature || "5600K key / 7000K rim",
      },
    };
  });

  return {
    pack: { ...pack, shots },
    summary:
      fixed === 0
        ? "Shot Doctor: all shots already healthy — nothing to fix."
        : `Shot Doctor strengthened ${fixed} weak shot${fixed === 1 ? "" : "s"}.`,
  };
}

/** "Director Mode" — a full directorial pass: heal weak shots, then make it cinematic. */
export function directorMode(pack: PromptPack): MagicResult {
  const healed = shotDoctor(pack).pack;
  const cinematic = makeItCinematic(healed).pack;
  const final: PromptPack = {
    ...cinematic,
    creativeDirection: {
      ...cinematic.creativeDirection,
      emotionalTone: cinematic.creativeDirection.emotionalTone.includes("cinematic")
        ? cinematic.creativeDirection.emotionalTone
        : `${cinematic.creativeDirection.emotionalTone}, cinematic`,
    },
  };
  return {
    pack: final,
    summary: `Director Mode: healed weak shots + applied a cinematic pass across ${pack.shots.length} shots.`,
  };
}

/** "Fix Bad AI Text" — find on-screen words and lock them so models keep them sharp. */
export function fixBadAIText(pack: PromptPack): MagicResult {
  const existing = new Set(
    (pack.textLocks ?? []).map((l) => l.text.trim().toLowerCase())
  );
  const found: TextLockItem[] = [];

  // Quoted strings inside shot visuals are almost always on-screen text.
  const re = /["“]([^"”]{2,60})["”]/g;
  for (const s of pack.shots) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(s.visualDescription))) {
      const t = m[1].trim();
      if (t && !existing.has(t.toLowerCase())) {
        existing.add(t.toLowerCase());
        found.push(newLockItem(t, "locked", `shot ${s.number} text`));
      }
    }
  }

  const hasSafetyQc = pack.qcChecklist.some((q) =>
    q.label.toLowerCase().includes("text safety")
  );
  const qcChecklist = hasSafetyQc
    ? pack.qcChecklist
    : [
        { label: "Text safety — locked words sharp & correctly spelled", checked: false },
        ...pack.qcChecklist,
      ];

  return {
    pack: { ...pack, textLocks: [...(pack.textLocks ?? []), ...found], qcChecklist },
    summary:
      found.length === 0
        ? "Fix Bad AI Text: no new on-screen text found — locks reinforced."
        : `Fix Bad AI Text locked ${found.length} on-screen string${found.length === 1 ? "" : "s"} against morphing/misspelling.`,
  };
}

/** "Splash Screen Mode" — turn the final shot into a brand-locked final-frame hold. */
export function splashScreenMode(pack: PromptPack): MagicResult {
  if (pack.shots.length === 0)
    return { pack, summary: "Splash Screen: no shots to convert." };

  const lastIdx = pack.shots.length - 1;
  const shots = pack.shots.map((s, i) => {
    if (i !== lastIdx) return s;
    return {
      ...s,
      name: "Splash — Final Frame",
      purpose: "Lock the brand + CTA on a strong, held final frame",
      transition: "Final hold",
      cameraMovement: "Settle to a locked hero hold",
      camera: {
        ...s.camera,
        shotType: "Hero lock, centered",
        movement: "Settle to final hold",
        composition: "Centered logotype with generous negative space",
        editorialPurpose: "Splash / brand lock",
      },
      lighting: { ...s.lighting, sceneIntent: "Iconic, controlled brand light" },
      audio: "Music resolves to a clean button; brand chime",
    };
  });

  // Push brand → visible-final, CTA → final-frame so they appear on the splash.
  const textLocks = (pack.textLocks ?? []).map((l) => {
    if (l.role?.includes("brand")) return { ...l, state: "visible-final" as const };
    if (l.role === "CTA") return { ...l, state: "final-frame" as const };
    return l;
  });

  return {
    pack: { ...pack, shots, textLocks },
    summary: "Splash Screen Mode: final shot is now a brand-locked final-frame hold.",
  };
}

/** "Prompt Surgeon" — rewrite vague visual descriptions into structured prompts. */
export function promptSurgeon(pack: PromptPack): MagicResult {
  let rewritten = 0;
  const shots = pack.shots.map((s) => {
    rewritten++;
    const subject = s.visualDescription.split(/[.,—]/)[0]?.trim() || s.name;
    const structured = [
      subject,
      pack.style.visualLanguage.split(",").slice(0, 2).join(",").trim(),
      [s.camera.shotType, s.camera.lens, s.camera.movement].filter(Boolean).join(", "),
      [s.lighting.keyLight, s.lighting.colorTemperature].filter(Boolean).join(", "),
      pack.creativeDirection.aspectRatio &&
        `${pack.creativeDirection.aspectRatio}, high detail`,
    ]
      .filter(Boolean)
      .join(" — ");
    return { ...s, visualDescription: structured };
  });

  return {
    pack: { ...pack, shots },
    summary: `Prompt Surgeon rewrote ${rewritten} shot prompts into structured form.`,
  };
}
