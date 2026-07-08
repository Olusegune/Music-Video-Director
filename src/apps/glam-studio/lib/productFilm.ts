export interface ProductFilmShot { id: string; duration: number; frame: string; motion: string; audio: string; prompt: string }
export interface ProductFilmPlan { title: string; duration: number; aspectRatio: "16:9" | "9:16"; shots: ProductFilmShot[] }

export function buildProductFilmPlan(product: string, headline: string, look: { set: string; lighting: string; lens: string }): ProductFilmPlan {
  const beats = [
    [3, "Atmosphere", `Slow light sweep reveals ${look.set}`, "sub-bass bloom"],
    [4, "Material detail", `Macro orbit across the defining material and packaging details`, "tactile foley"],
    [5, "Hero reveal", `${product} rotates into the campaign hero composition`, "music resolves"],
    [3, "Brand lockup", `Hold a clean product silhouette with space for “${headline}”`, "signature sonic mark"],
  ] as const;
  return { title: `${product} — Product Film`, duration: 15, aspectRatio: "16:9", shots: beats.map(([duration, frame, motion, audio], index) => ({ id: `shot-${index + 1}`, duration, frame, motion, audio, prompt: `${frame} for ${product}. ${motion}. ${look.lighting}. ${look.lens}. Preserve exact product geometry and branding; no rendered copy.` })) };
}

export function productFilmMarkdown(plan: ProductFilmPlan) {
  return [`# ${plan.title}`, "", `Duration: ${plan.duration}s · Master: ${plan.aspectRatio}`, "", ...plan.shots.flatMap((shot, index) => [`## ${index + 1}. ${shot.frame} (${shot.duration}s)`, shot.motion, `Audio: ${shot.audio}`, "", shot.prompt, ""])].join("\n");
}
