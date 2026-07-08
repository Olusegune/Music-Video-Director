import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const app = read("src/app/App.tsx");
const sidebar = read("src/platform/components/layout/Sidebar.tsx");
const dashboard = read("src/platform/features/dashboard/Dashboard.tsx");
const search = read("src/platform/features/search/GlobalSearch.tsx");
const welcome = read("src/platform/features/welcome/WelcomeScreen.tsx");
const router = read("src/platform/features/projects/NewProjectWizard.tsx");
const studios = [["motionstudio", "Motion Studio", "openMotionStudio"], ["glamstudio", "Glam Studio", "openGlamStudio"], ["webstudio", "Web Studio", "openWebStudio"], ["campaignstudio", "Campaign Studio", "openCampaignStudio"]];

for (const [view, label, action] of studios) {
  if (!app.includes(`view === "${view}"`)) throw new Error(`${label} missing from App routing`);
  if (!sidebar.includes(`label="${label}"`) || !sidebar.includes(`onClick={${action}}`)) throw new Error(`${label} missing from Sidebar`);
  if (!dashboard.includes(`title="${label}"`) || !dashboard.includes(`onClick={${action}}`)) throw new Error(`${label} missing from Dashboard`);
  if (!search.includes(`label: "${label}"`) || !search.includes(`go: ${action}`)) throw new Error(`${label} missing from Global Search`);
}
for (const label of ["Music Video Director", "Motion Studio", "Glam Studio", "Web Studio", "Campaign Studio"]) {
  if (!welcome.includes(label) || !router.includes(label)) throw new Error(`${label} missing from suite onboarding`);
}
if (!welcome.includes("Start with Director") || !welcome.includes("Director Engine")) throw new Error("Director Studio platform identity is incomplete");
console.log(JSON.stringify({ ok: true, studios: studios.length, surfaces: ["router", "sidebar", "dashboard", "search"] }));
