import { compileCss, compileSite } from "@/apps/webstudio/lib/siteCompiler";
import type { WebProject } from "@/apps/webstudio/lib/types";

export interface SiteAuditCheck { id: string; label: string; passed: boolean; }
export interface SiteAudit { score: number; checks: SiteAuditCheck[]; }

export function auditSite(project: WebProject): SiteAudit {
  const html = compileSite(project, false);
  const css = compileCss(project.tokens);
  const checks: SiteAuditCheck[] = [
    { id: "doctype", label: "Standards-mode HTML", passed: html.startsWith("<!doctype html>") },
    { id: "language", label: "Document language declared", passed: html.includes('<html lang="en">') },
    { id: "viewport", label: "Responsive viewport metadata", passed: html.includes('name="viewport"') },
    { id: "description", label: "Search description metadata", passed: html.includes('name="description"') },
    { id: "social", label: "Open Graph sharing metadata", passed: html.includes('property="og:title"') && html.includes('property="og:description"') },
    { id: "heading", label: "Exactly one primary heading", passed: (html.match(/<h1>/g) ?? []).length === 1 },
    { id: "landmarks", label: "Semantic navigation and main landmarks", passed: html.includes("<nav ") && html.includes("<main>") && html.includes("<footer>") },
    { id: "images", label: "Every exported image has alt text", passed: !/<img(?![^>]*\salt=)[^>]*>/i.test(html) },
    { id: "responsive", label: "Mobile layout breakpoint", passed: css.includes("@media(max-width:760px)") },
    { id: "motion", label: "Reduced-motion preference respected", passed: css.includes("prefers-reduced-motion") },
    { id: "runtime", label: "No JavaScript or framework runtime", passed: !html.includes("<script") },
    { id: "external", label: "No external font or stylesheet dependency", passed: !/https?:\/\//.test(html) },
  ];
  return { score: Math.round((checks.filter((check) => check.passed).length / checks.length) * 100), checks };
}
