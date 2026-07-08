import { buildProductFilmPlan, productFilmMarkdown } from "../src/apps/glam-studio/lib/productFilm";
const plan = buildProductFilmPlan("Aura", "Light, held beautifully", {
  set: "black lacquer",
  lighting: "hard rim and soft fill",
  lens: "85mm macro",
});
if (plan.duration !== plan.shots.reduce((sum, shot) => sum + shot.duration, 0))
  throw new Error("Film shot durations do not match the master.");
if (
  plan.shots.length < 4 ||
  !plan.shots.every((shot) => shot.prompt.includes("Preserve exact product geometry"))
)
  throw new Error("Product-film fidelity plan is incomplete.");
const markdown = productFilmMarkdown(plan);
if (!markdown.includes("15s") || !markdown.includes("Hero reveal"))
  throw new Error("Product-film treatment export failed.");
console.log(
  JSON.stringify({
    ok: true,
    duration: plan.duration,
    shots: plan.shots.length,
    treatmentBytes: new TextEncoder().encode(markdown).length,
  })
);
