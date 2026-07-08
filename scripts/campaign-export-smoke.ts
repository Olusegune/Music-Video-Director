import { buildZip } from "../src/platform/lib/archive";
import { planBlueprint } from "../src/apps/campaign/lib/planGenerator";
import { buildCampaignConcept, buildCampaignStrategy } from "../src/apps/campaign/lib/strategy";
import {
  buildCampaignMarkdown,
  buildPlanCsv,
  buildStrategyPdf,
} from "../src/apps/campaign/lib/packageExport";
import type { CampaignProject } from "../src/apps/campaign/lib/types";
import { parseCampaignCopy, parseCampaignIdea } from "../src/apps/campaign/lib/campaignAi";
import { buildSeedContext } from "../src/apps/campaign/lib/seed";
import { buildCampaignIcs } from "../src/apps/campaign/lib/calendar";

const strategy = buildCampaignStrategy(
  "Aura",
  "a refillable premium lip oil",
  "design-conscious beauty buyers",
  "Launch and convert early demand"
);
const concept = buildCampaignConcept("Aura", strategy);
const blueprint = planBlueprint("small");
if (blueprint.length < 8 || new Set(blueprint.map((item) => item.channel)).size < 3)
  throw new Error("Small plan does not meet MVP channel coverage.");
const project: CampaignProject = {
  id: "campaign-smoke",
  name: "Aura Launch",
  product: "Aura",
  productDescription: "a refillable premium lip oil",
  goal: "Launch and convert early demand",
  audience: "design-conscious beauty buyers",
  launchDate: "2026-08-01",
  effort: "small",
  brand: {
    id: "brand",
    name: "Aura",
    palette: concept.palette,
    fonts: { heading: "Georgia", body: "Arial" },
    voice: { tone: "confident", taglines: [concept.tagline], bannedWords: [] },
    productLines: ["Aura"],
    logoRefs: [],
    createdAt: "2026-07-07T00:00:00.000Z",
    updatedAt: "2026-07-07T00:00:00.000Z",
  },
  strategy,
  concept,
  plan: blueprint.map((item, index) => ({
    id: `item-${index}`,
    deliverableId: `delivery-${index}`,
    title: item.title,
    channel: item.channel,
    ownerModule: item.owner,
    dueOffset: item.offset,
    brief: strategy.keyMessage,
  })),
  createdAt: "2026-07-07T00:00:00.000Z",
  updatedAt: "2026-07-07T00:00:00.000Z",
};
const parsedIdea = parseCampaignIdea(JSON.stringify({ strategy, concept }));
const parsedCopy = parseCampaignCopy(
  JSON.stringify({ content: "A complete on-message launch asset with a clear customer next step." })
);
const seed = buildSeedContext(project, project.plan[0]);
if (parsedIdea.strategy.pillars.length < 3 || parsedCopy.length < 20)
  throw new Error("Campaign AI schema validation smoke failed.");
if (
  seed.campaignId !== project.id ||
  seed.sourceDeliverableId !== project.plan[0].deliverableId ||
  seed.messaging.pillars.length < 3
)
  throw new Error("SeedContext propagation smoke failed.");
const pdf = buildStrategyPdf(project);
const csv = buildPlanCsv(project);
const markdown = buildCampaignMarkdown(project);
const ics = buildCampaignIcs(project);
if (new TextDecoder().decode(pdf.slice(0, 8)) !== "%PDF-1.4")
  throw new Error("Strategy PDF signature is invalid.");
if (csv.split("\n").length !== project.plan.length + 1)
  throw new Error("Plan CSV row count is invalid.");
if (
  !ics.includes("BEGIN:VCALENDAR") ||
  (ics.match(/BEGIN:VEVENT/g) ?? []).length !== project.plan.length
)
  throw new Error("Campaign calendar export is invalid.");
const encoder = new TextEncoder();
const zip = buildZip([
  { name: "strategy/strategy.pdf", bytes: pdf },
  { name: "plan/deliverables.csv", bytes: encoder.encode(csv) },
  { name: "strategy/campaign-plan.md", bytes: encoder.encode(markdown) },
]);
const bytes = new Uint8Array(await zip.arrayBuffer());
if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error("Campaign ZIP signature is invalid.");
console.log(
  JSON.stringify({
    ok: true,
    deliverables: blueprint.length,
    channels: new Set(blueprint.map((item) => item.channel)).size,
    calendarEvents: project.plan.length,
    seedTargetReady: true,
    schemaValidated: true,
    pdfBytes: pdf.length,
    zipBytes: bytes.length,
  })
);
