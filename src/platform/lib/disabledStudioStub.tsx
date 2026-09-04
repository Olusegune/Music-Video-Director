// Build-time stand-in for a studio that this product edition doesn't ship.
//
// Only ever wired in via vite.config.ts's mode-conditional `resolve.alias`
// (musicvideo edition only) — it replaces the real studio entry component's
// import specifier, so Rollup's module graph never pulls in that studio's
// real component tree (and everything it alone imports) at all. This is
// what actually removes the chunk from the built output, not just hides it
// in the UI — see productConfig.ts and the four `open*Studio` nav gates for
// the UI-level half of this.
//
// Unreachable in practice: navigation to these views is already filtered out
// of every nav/search/help/wizard surface for this edition (productConfig.ts),
// so this component should never actually render. It exists only so the
// aliased import still resolves to *something* with the right named export.
function DisabledStudio() {
  return null;
}

export const MotionStudio = DisabledStudio;
export const GlamStudio = DisabledStudio;
export const WebStudio = DisabledStudio;
export const CampaignStudio = DisabledStudio;
