import { buildZip } from "../src/platform/lib/archive";
import { auditSite } from "../src/apps/webstudio/lib/siteAudit";
import { compileCss, compileSite } from "../src/apps/webstudio/lib/siteCompiler";
import type { WebProject } from "../src/apps/webstudio/lib/types";

const project: WebProject = {
  id: "smoke-project",
  name: "Web Export Smoke",
  businessName: "Northstar Studio",
  businessDescription: "A focused strategy studio for ambitious independent brands.",
  audience: "independent founders",
  proofPoints: ["40 launches", "92% referral rate", "Senior-only team"],
  ctaGoal: "Book a strategy call",
  brand: {
    id: "smoke-brand", name: "Northstar Studio", palette: ["#6d28d9", "#22d3ee"],
    fonts: { heading: "Georgia", body: "Arial" }, voice: { tone: "clear", taglines: [], bannedWords: [] },
    productLines: ["Strategy"], logoRefs: [], createdAt: "2026-07-07T00:00:00.000Z", updatedAt: "2026-07-07T00:00:00.000Z",
  },
  positioning: {
    audience: "independent founders", offer: "Senior brand strategy without agency drag.",
    promise: "Turn a strong idea into a brand people choose.", valueProps: ["Senior attention", "Focused process", "Launch-ready output"],
    objections: ["Will it fit?", "How fast?", "What changes?"], proof: ["40 launches", "92% referral rate", "Senior-only team"], cta: "Book a strategy call",
  },
  sections: [
    { id: "hero", patternId: "hero-split", copy: { eyebrow: "Northstar", heading: "Turn a strong idea into a brand people choose.", body: "Strategy and identity for founders ready to launch with clarity.", items: ["Senior-only strategy"], ctaLabel: "Book a strategy call" } },
    { id: "features", patternId: "features-grid", copy: { eyebrow: "The difference", heading: "Clarity becomes momentum", body: "A focused path from positioning to launch.", items: ["Sharp positioning", "Ownable identity", "Launch system"], ctaLabel: "" } },
    { id: "faq", patternId: "faq-stack", copy: { eyebrow: "Questions", heading: "Everything you need to move", body: "Every engagement is scoped around the launch.", items: ["How long does it take?", "What is included?", "Who leads the work?"], ctaLabel: "" } },
    { id: "cta", patternId: "cta-banner", copy: { eyebrow: "Next step", heading: "Build the brand the idea deserves", body: "Start with a focused strategy conversation.", items: [], ctaLabel: "Book a strategy call" } },
  ],
  tokens: { background: "#08090d", surface: "#12141b", text: "#f8fafc", muted: "#a1a1aa", primary: "#6d28d9", accent: "#22d3ee", fontDisplay: "Georgia, serif", fontBody: "Arial, sans-serif", radius: 18, maxWidth: 1180 },
  createdAt: "2026-07-07T00:00:00.000Z", updatedAt: "2026-07-07T00:00:00.000Z",
};

const html = compileSite(project, false);
const css = compileCss(project.tokens);
const audit = auditSite(project);
if (audit.score < 90) throw new Error(`Quality gate failed: ${audit.score}`);
if (!html.includes('<link rel="stylesheet" href="styles.css">') || !html.includes("<main>")) throw new Error("Static HTML structure is incomplete.");
if (!css.includes("@media(max-width:760px)") || !css.includes("prefers-reduced-motion")) throw new Error("Responsive/accessibility CSS is incomplete.");
const encoder = new TextEncoder();
const zip = buildZip([{ name: "index.html", bytes: encoder.encode(html) }, { name: "styles.css", bytes: encoder.encode(css) }, { name: "quality-report.json", bytes: encoder.encode(JSON.stringify(audit)) }]);
const bytes = new Uint8Array(await zip.arrayBuffer());
if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error("ZIP signature is invalid.");
const archiveText = new TextDecoder().decode(bytes);
for (const filename of ["index.html", "styles.css", "quality-report.json"]) if (!archiveText.includes(filename)) throw new Error(`ZIP is missing ${filename}.`);
console.log(JSON.stringify({ ok: true, score: audit.score, htmlBytes: encoder.encode(html).length, cssBytes: encoder.encode(css).length, zipBytes: bytes.length }));
