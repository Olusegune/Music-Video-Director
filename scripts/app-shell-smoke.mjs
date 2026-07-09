import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const app = read("src/app/App.tsx");
const navModel = read("src/platform/lib/navModel.ts");
const sidebar = read("src/platform/components/layout/Sidebar.tsx");
const dashboard = read("src/platform/features/dashboard/Dashboard.tsx");
const search = read("src/platform/features/search/GlobalSearch.tsx");
const welcome = read("src/platform/features/welcome/WelcomeScreen.tsx");
const router = read("src/platform/features/projects/NewProjectWizard.tsx");
const visualSystem = read("src/styles/globals.css");
const studios = [
  ["motionstudio", "Motion Studio", "openMotionStudio"],
  ["glamstudio", "Glam Studio", "openGlamStudio"],
  ["webstudio", "Web Studio", "openWebStudio"],
  ["campaignstudio", "Campaign Studio", "openCampaignStudio"],
];

for (const [view, label, action] of studios) {
  if (!app.includes(`view === "${view}"`)) throw new Error(`${label} missing from App routing`);
  if (!navModel.includes(`label: "${label}"`) || !navModel.includes(`view: "${view}"`))
    throw new Error(`${label} missing from nav model`);
  if (!sidebar.includes("NAV_MODEL") || !sidebar.includes("moduleForView"))
    throw new Error("Sidebar is not rendering the navigation model");
  if (!dashboard.includes(`title="${label}"`) || !dashboard.includes(`onClick={${action}}`))
    throw new Error(`${label} missing from Dashboard`);
  if (!search.includes(`label: "${label}"`) || !search.includes(`go: ${action}`))
    throw new Error(`${label} missing from Global Search`);
}
for (const label of [
  "Music Video Director",
  "Motion Studio",
  "Glam Studio",
  "Web Studio",
  "Campaign Studio",
]) {
  if (!welcome.includes(label) || !router.includes(label))
    throw new Error(`${label} missing from suite onboarding`);
}
if (!welcome.includes("Start with Director") || !welcome.includes("Connected by Director Studio"))
  throw new Error("Director Studio platform identity is incomplete");
if (sidebar.includes("> Magic Mode") || dashboard.includes("MagicFlowButton"))
  throw new Error("Music Video Magic Mode leaked into the global suite shell");
for (const token of [
  "studio-view-motionstudio",
  "studio-view-glamstudio",
  "studio-view-webstudio",
  "studio-view-campaignstudio",
  "creative-preview",
])
  if (!visualSystem.includes(token)) throw new Error(`Visual system token missing: ${token}`);
console.log(
  JSON.stringify({
    ok: true,
    studios: studios.length,
    surfaces: ["router", "sidebar", "dashboard", "search"],
  })
);
