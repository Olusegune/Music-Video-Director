import { describe, expect, it } from "vitest";
import {
  compileCss,
  compilePage,
  compileSite,
} from "@/apps/webstudio/lib/siteCompiler";
import type { WebProject } from "@/apps/webstudio/lib/types";

const project: WebProject = {
  id: "web-1",
  name: "Launch",
  businessName: "Director & Co",
  businessDescription: "Creative production",
  audience: "Creative teams",
  proofPoints: ["Local-first"],
  ctaGoal: "Start",
  brand: {
    id: "brand-1",
    name: "Director & Co",
    palette: ["#050509", "#d4af37"],
    fonts: { heading: "Inter", body: "Inter" },
    voice: { tone: "confident", taglines: [], bannedWords: [] },
    productLines: ["Director Studio"],
    logoRefs: [],
    createdAt: "2026-07-08T00:00:00.000Z",
    updatedAt: "2026-07-08T00:00:00.000Z",
  },
  positioning: {
    audience: "Creative teams",
    offer: "One studio",
    promise: "Every idea, directed",
    valueProps: ["Connected context"],
    objections: ["Complexity"],
    proof: ["Local-first"],
    cta: "Start",
  },
  sections: [
    {
      id: "hero",
      patternId: "hero-centered",
      copy: {
        eyebrow: "Director Studio",
        heading: "Build <beautifully>",
        body: "One connected creative system.",
        items: ["Local", "Private"],
        ctaLabel: "Start",
      },
    },
  ],
  pages: [],
  tokens: {
    background: "#050509",
    surface: "#111218",
    text: "#ffffff",
    muted: "#a0a0aa",
    primary: "#7c5cff",
    accent: "#d4af37",
    fontDisplay: "Inter",
    fontBody: "Inter",
    radius: 20,
    maxWidth: 1200,
  },
  createdAt: "2026-07-08T00:00:00.000Z",
  updatedAt: "2026-07-08T00:00:00.000Z",
};

describe("Web Studio site compiler", () => {
  it("is deterministic for the same project spec", () => {
    expect(compileSite(project)).toBe(compileSite(structuredClone(project)));
  });

  it("escapes user-authored HTML and emits no scripts", () => {
    const html = compileSite(project);
    expect(html).toContain("Build &lt;beautifully&gt;");
    expect(html).not.toContain("<script");
  });

  it("compiles page metadata, navigation, and external CSS deterministically", () => {
    const page = {
      id: "about",
      title: "About",
      slug: "about",
      description: "About Director Studio",
      sections: project.sections,
    };
    const html = compilePage(
      {
        ...project,
        pages: [page],
        seo: {
          titleTemplate: "%s | Director",
          siteUrl: "https://example.com",
          indexable: true,
        },
      },
      page,
      false
    );

    expect(html).toContain("<title>About | Director</title>");
    expect(html).toContain('href="styles.css"');
    expect(html).toContain('rel="canonical"');
    expect(compileCss(project.tokens)).toBe(compileCss(project.tokens));
  });
});
