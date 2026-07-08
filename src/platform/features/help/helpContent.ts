import type { View } from "@/platform/store/useAppStore";

export type HelpSection =
  | "Welcome to Director Studio"
  | "Music Video Director"
  | "The other studios"
  | "Shared libraries & tools"
  | "Setup & system";

export type HelpBlock = { heading?: string; body?: string; steps?: string[]; tip?: string };

export interface HelpArticle {
  id: string;
  title: string;
  section: HelpSection;
  relatedViews: View[];
  updatedAt: string;
  keywords: string;
  blocks: HelpBlock[];
  action?: { label: string; view: View };
}

const updatedAt = "2026-07-08";

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: "welcome",
    title: "Welcome to Director Studio",
    section: "Welcome to Director Studio",
    relatedViews: ["dashboard"],
    updatedAt,
    keywords: "overview studios productions dashboard",
    action: { label: "Open Director Studio home", view: "dashboard" },
    blocks: [
      {
        body: "Director Studio brings five specialist creative studios together with shared libraries, production memory, and provider settings.",
      },
      {
        heading: "Five specialist studios",
        steps: [
          "Music Video Director — song-aware treatments, cast, choreography, shots, and timelines.",
          "Motion Studio — explainers, commercials, product motion, and UI animation.",
          "Glam Studio — luxury campaigns, product imagery, and film treatments.",
          "Web Studio — responsive websites with multi-page export and SEO controls.",
          "Campaign Studio — strategy, channel planning, production handoffs, calendars, and launch kits.",
        ],
      },
    ],
  },
  {
    id: "first-production",
    title: "Your first production",
    section: "Welcome to Director Studio",
    relatedViews: ["dashboard", "motionstudio", "glamstudio", "webstudio", "campaignstudio"],
    updatedAt,
    keywords: "new start choose studio guided",
    blocks: [
      {
        steps: [
          "Open the Dashboard and choose the studio that matches what you want to make.",
          "Start a production and complete that studio's guided intake.",
          "Review the treatment, plan, or preview, then refine or export it.",
        ],
      },
      {
        tip: "Magic Mode is Music Video Director's guided path. Other studios use their own plainly named creation flows.",
      },
    ],
  },
  {
    id: "control-levels",
    title: "Director, Studio, Creator — choosing control",
    section: "Welcome to Director Studio",
    relatedViews: ["dashboard", "settings"],
    updatedAt,
    keywords: "tier disclosure controls director studio creator",
    blocks: [
      {
        body: "The Director, Studio, and Creator selector changes how much detail is visible; it never changes or discards your production.",
      },
      {
        steps: [
          "Director keeps decisions focused and guided.",
          "Studio reveals more production controls.",
          "Creator exposes the deepest prompt, provider, and workflow controls.",
        ],
      },
    ],
  },
  {
    id: "mv-getting-started",
    title: "Music Video Director: getting started",
    section: "Music Video Director",
    relatedViews: ["song", "mvdirector", "cast", "choreography", "timeline"],
    updatedAt,
    keywords: "song direct cast choreography timeline",
    action: { label: "Open Music Video Director → Song Studio", view: "song" },
    blocks: [
      { body: "Music Video Director is the song-first studio inside Director Studio." },
      {
        steps: [
          "Inside Music Video Director, open Song Studio and import a track.",
          "Add lyrics or a script, confirm sections, and choose performers.",
          "Open Direct to create the treatment and shot plan.",
          "Refine Cast and Choreography, then finish in Timeline and Export.",
        ],
      },
    ],
  },
  {
    id: "magic-mode",
    title: "Magic Mode guide",
    section: "Music Video Director",
    relatedViews: ["song", "magicoutput"],
    updatedAt,
    keywords: "guided music video treatment story",
    blocks: [
      {
        body: "Magic Mode is Music Video Director's guided path from a song to a treatment. It asks one clear question at a time and saves a normal production you can refine later.",
      },
      {
        steps: [
          "Import the song and optionally add lyrics or a script.",
          "Confirm performers, video type, story feeling, and visual style.",
          "Direct the production, review the treatment premiere, then render or fine-tune it in the studio.",
        ],
      },
    ],
  },
  ...(["Motion Studio", "Glam Studio", "Web Studio", "Campaign Studio"] as const).map(
    (title, index): HelpArticle => ({
      id: `studio-${title.split(" ")[0].toLowerCase()}`,
      title,
      section: "The other studios",
      relatedViews: [["motionstudio", "glamstudio", "webstudio", "campaignstudio"][index] as View],
      updatedAt,
      keywords: `${title} workflow export handoff`,
      action: {
        label: `Open ${title}`,
        view: ["motionstudio", "glamstudio", "webstudio", "campaignstudio"][index] as View,
      },
      blocks: [
        {
          body: `${title} is a specialized creative workspace with its own templates, guided intake, production memory, and exports.`,
        },
        {
          tip: "Campaign Studio can hand a strategy to the specialist studio that will produce the final creative.",
        },
      ],
    })
  ),
  {
    id: "shared-creative-dna",
    title: "How studios share your creative DNA",
    section: "Shared libraries & tools",
    relatedViews: ["characters", "world", "props", "assets", "brandkits"],
    updatedAt,
    keywords: "shared bibles assets brand kits continuity",
    blocks: [
      {
        body: "Character, world, prop, asset, and brand records stay available across productions. Each screen states its current scope so ownership is visible.",
      },
      {
        steps: [
          "Asset Library and the Bibles are shared across Director Studio.",
          "Brand Kits currently feed Glam, Web, and Campaign productions.",
          "Music Video Templates and Animation Lab belong to Music Video Director.",
        ],
      },
    ],
  },
  {
    id: "music-video-templates",
    title: "Music Video Templates",
    section: "Shared libraries & tools",
    relatedViews: ["templates", "song"],
    updatedAt,
    keywords: "genre blueprint afrobeats hip hop k-pop gospel",
    action: { label: "Open Music Video Director → Templates", view: "templates" },
    blocks: [
      {
        body: "Music Video Templates are genre and directing blueprints adapted to the active song. Template identifiers remain attached to existing productions.",
      },
    ],
  },
  {
    id: "setup",
    title: "Providers, models, and local mode",
    section: "Setup & system",
    relatedViews: ["apikeys", "models", "settings"],
    updatedAt,
    keywords: "api keys providers router offline local models",
    action: { label: "Open API Keys", view: "apikeys" },
    blocks: [
      {
        body: "Add provider keys only for the generation capabilities you want. Planning remains available without keys.",
      },
      {
        tip: "Local mode keeps supported planning, previews, and deterministic pre-visualization fully offline and makes no provider calls.",
      },
    ],
  },
];

export const HELP_SECTIONS: HelpSection[] = [
  "Welcome to Director Studio",
  "Music Video Director",
  "The other studios",
  "Shared libraries & tools",
  "Setup & system",
];
