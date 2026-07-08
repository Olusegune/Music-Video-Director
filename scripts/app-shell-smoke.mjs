import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const app = read("src/app/App.tsx");
const sidebar = read("src/platform/components/layout/Sidebar.tsx");
const dashboard = read("src/platform/features/dashboard/Dashboard.tsx");
const search = read("src/platform/features/search/GlobalSearch.tsx");
const studios = [["motionstudio", "Motion Studio", "openMotionStudio"], ["glamstudio", "Glam Studio", "openGlamStudio"], ["webstudio", "Web Studio", "openWebStudio"], ["campaignstudio", "Campaign Studio", "openCampaignStudio"]];

for (const [view, label, action] of studios) {
  if (!app.includes(`view === "${view}"`)) throw new Error(`${label} missing from App routing`);
  if (!sidebar.includes(`label="${label}"`) || !sidebar.includes(`onClick={${action}}`)) throw new Error(`${label} missing from Sidebar`);
  if (!dashboard.includes(`title="${label}"`) || !dashboard.includes(`onClick={${action}}`)) throw new Error(`${label} missing from Dashboard`);
  if (!search.includes(`label: "${label}"`) || !search.includes(`go: ${action}`)) throw new Error(`${label} missing from Global Search`);
}
console.log(JSON.stringify({ ok: true, studios: studios.length, surfaces: ["router", "sidebar", "dashboard", "search"] }));
