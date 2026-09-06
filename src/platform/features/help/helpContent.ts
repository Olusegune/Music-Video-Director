import type { View } from "@/platform/store/useAppStore";
import { PRODUCT_EDITION, isModuleEnabled } from "@/platform/lib/productConfig";

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
const performanceGuideUpdatedAt = "2026-09-05";
const sept6 = "2026-09-06";

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: "welcome",
    title: PRODUCT_EDITION === "musicvideo" ? "Welcome to Music Video Director" : "Welcome to Director Studio",
    section: "Welcome to Director Studio",
    relatedViews: ["dashboard"],
    updatedAt,
    keywords: "overview studios productions dashboard",
    action: { label: "Open Dashboard", view: "dashboard" },
    blocks: [
      {
        body:
          PRODUCT_EDITION === "musicvideo"
            ? "Music Video Director turns a song into a directed, cast, choreographed production — with shared libraries, production memory, and provider settings underneath."
            : "Director Studio brings five specialist creative studios together with shared libraries, production memory, and provider settings.",
      },
      PRODUCT_EDITION === "musicvideo"
        ? {
            heading: "What it does",
            steps: [
              "Music Video Director — song-aware treatments, cast, choreography, shots, and timelines.",
            ],
          }
        : {
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
        tip: "Magic Flow is Music Video Director's guided path. Other studios use their own plainly named creation flows.",
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
          "Add the words: type them, press “Transcribe lyrics” to write them from the audio, or press “Use a script” to fold a script or lyric sheet into the sections.",
          "Confirm the sections and choose a performer for each one.",
          "In Cast, link each performer's Character DNA to a character with a generated portrait or Turnaround Sheet — this is what keeps them looking like the same person in every shot.",
          "Open Direct to create the treatment and shot plan.",
          "Refine Cast and Choreography, then finish in Timeline and Export.",
        ],
      },
      {
        tip: "If a render comes back as landscapes with nobody performing, see “Getting real performances, not just b-roll” below — it's almost always one specific, fixable thing.",
      },
    ],
  },
  {
    id: "mv-lyrics",
    title: "Getting the words into the song",
    section: "Music Video Director",
    relatedViews: ["song"],
    updatedAt: sept6,
    keywords: "lyrics transcribe transcription script lyric sheet words sections audio",
    action: { label: "Open Song Studio", view: "song" },
    blocks: [
      {
        body: "Lyrics are not decoration — the Director builds each shot around the line being sung at that moment, so the words are what turn a section into specific images. There are three ways to get them in.",
      },
      {
        heading: "Transcribe them from the audio",
        body: "“Transcribe lyrics” listens to each section on its own and writes what it hears into that section's box. Because sections already carry exact start and end times, the words land in the right place without you aligning anything.",
        steps: [
          "Open Song Studio and select the track.",
          "Press “Transcribe lyrics” in the Song structure header to do the whole song, or “Transcribe” beside a single section's lyric box to do just that one.",
          "Read the result through and correct it — see the warning below.",
        ],
        tip: "Sung words are much harder to make out than speech: instrumentation, held notes, doubled takes and heavy processing all cost accuracy. Treat what comes back as a first pass that saves typing, not as a transcript. It will never replace lyrics you wrote without asking first.",
      },
      {
        heading: "Fold in a script or lyric sheet",
        body: "“Use a script” takes a script or lyric sheet you already have and matches its [Verse] / [Chorus] blocks to the song's detected sections, so its words, action and movement cues become each section's brief. It shows you the mapping before applying it and says what it could not place.",
      },
      {
        heading: "Type them",
        body: "Select a section and write into its Lyrics box, one line per row. Nothing is lost either way — transcription and scripts both write into the same field you would type into.",
      },
      {
        heading: "If you change the words afterwards",
        body: "Re-direct the song. The shot list is built from the words as they were when you directed, so edits made after that do not reach the prompts until it is rebuilt. Direct says so plainly when its shot list no longer matches the song.",
      },
    ],
  },
  {
    id: "mv-director-styles",
    title: "Directing in the style of a filmmaker",
    section: "Music Video Director",
    relatedViews: ["song", "mvdirector", "templates"],
    updatedAt: sept6,
    keywords: "director style inspiration michel gondry hype williams fincher glazer look reference filmmaker",
    action: { label: "Open Direct", view: "mvdirector" },
    blocks: [
      {
        body: "A director style is an optional layer of craft over your chosen Style template. The template answers what kind of video this is — Afrobeats, Performance, Dance. A director style answers whose craft it is shot with. The two combine: Afrobeats shot with the gloss and fisheye of a Hype Williams video is a real brief, and both parts survive.",
      },
      {
        heading: "What it actually changes",
        body: "The style feeds shot ideas, camera moves, lighting and cutting pace into the Director, and a sentence of craft direction into every image and clip prompt. Choosing one visibly changes the treatment: the same chorus can come back as a saturated wide-angle hero shot or as a cold, static, alienated frame.",
      },
      {
        heading: "Skipping it is a real option",
        body: "Leave it unset and nothing is added — the prompts read exactly as they did before the feature existed. It is an accelerant for people who know the look they want, not a step to get past.",
      },
      {
        heading: "Why the prompts never name the director",
        body: "The name is an inspiration credit in this app, where you chose it. It is deliberately not sent to the image models. Naming a living person tends not to work — several providers filter artist names, and the rest largely ignore them — while the craft behind the name is something a model can act on: fisheye distortion, saturated colour fields, sculptural light, long held takes. It also matters that a generated frame should not imply a real director made or endorsed it. Styles are not ownable; a person's identity is a different thing.",
      },
    ],
  },
  {
    id: "mv-keeping-in-step",
    title: "When the app says something no longer matches",
    section: "Music Video Director",
    relatedViews: ["song", "mvdirector", "choreography"],
    updatedAt: sept6,
    keywords: "stale shot list re-direct re-choreograph sections changed health warnings banner",
    action: { label: "Open Direct", view: "mvdirector" },
    blocks: [
      {
        body: "A production is a chain: sections come from the audio, the shot list is built from the sections, and the choreography is planned against both. Change something early and the things built on top of it are describing a song that has moved.",
      },
      {
        heading: "What you will see",
        steps: [
          "Direct shows a health strip listing what needs attention, worst first. Anything blocking opens it; you can fold it back to its headline once you have read it, but it will not disappear while the problem is real.",
          "“This shot list no longer matches the song” means the sections changed after it was built. Re-direct rebuilds it. It names how many generated frames or clips that will discard, so you can decide.",
          "Choreography shows its own banner when a routine was planned against older sections, with one button to re-plan it.",
        ],
      },
      {
        heading: "Why it warns instead of fixing it for you",
        body: "Rebuilding a shot list discards frames and clips you may have paid for. Re-planning choreography discards hand edits. Where nothing is at stake the app just does it — choreography re-plans itself on the automated path. Where something is, it tells you and waits.",
      },
      {
        tip: "If a check reads oddly — for instance claiming no chorus was detected on a song that plainly has three — look first at whether the shot list is stale. Everything measured against an old plan describes the old plan.",
      },
    ],
  },
  {
    id: "mv-performance-guide",
    title: "Getting real performances, not just b-roll",
    section: "Music Video Director",
    relatedViews: ["song", "cast", "choreography", "mvdirector"],
    updatedAt: performanceGuideUpdatedAt,
    keywords:
      "performance lip sync chorus detection performer character dna seed consistency choreography b-roll slideshow",
    action: { label: "Open Song Studio", view: "song" },
    blocks: [
      {
        body: "A music video needs someone to actually perform in it. If a render comes back as nothing but landscapes and lighting — no singing, no dancing, nobody on camera — it's almost always one of these three things, in order of how often it happens.",
      },
      {
        heading: "1. No Chorus was detected",
        body: "Only Chorus/Drop sections (and loud Instrumentals) are directed as performance shots — Intro and Outro are meant to be pure b-roll, the way most real music videos open and close. If a song comes back with only Intro/Verse/Outro and no Chorus, the detector had nothing to work with — it partly relies on lyrics to find the repeated phrase that marks a chorus.",
        steps: [
          "In Song Studio, press “Re-detect sections” — detection has improved, and a track imported earlier may split into real choruses now.",
          "If a section still has no words, use “Transcribe lyrics” to write them from the audio. Chorus detection partly relies on lyrics to find the repeated phrase that marks a chorus, so filling them in often changes the result.",
          "If a song still won't split into a real Chorus, select the section in the song structure list and use the manual split control to mark the loudest, most repeated stretch as Chorus yourself.",
          "Direct (or re-direct) the treatment — Direct shows a red banner naming exactly this problem whenever a treatment has zero performance shots, so you don't find out after rendering.",
        ],
      },
      {
        heading: "2. Nobody was assigned to the section",
        body: "A Chorus can exist and still render with nobody on camera if no performer is linked to it.",
        steps: [
          "Open Cast and confirm each performer has a role (Lead Singer, Featured Artist, Dancer).",
          "Link Character DNA on that performer to an actual character with a generated portrait — without a reference portrait, the AI reinvents what they look like in every single shot, which is the most common cause of a performer looking like a different person from scene to scene.",
          "In Song Studio, open each section and confirm a performer is chosen — Direct also flags any section left on “— choose performer —” before you render.",
        ],
      },
      {
        heading: "3. Only stills were generated, not clips",
        body: "“Generate all frames” produces still images. A performance shot only actually moves — dances, sings, gestures — once its clip is generated too.",
        steps: [
          "In Direct, use “Generate all clips” to turn every performance shot's still into a real clip.",
          "Changed the seed, a reference image, or the style after clips already existed? Use “Regenerate all clips” to re-run them — the first button only fills shots that don't have a clip yet.",
        ],
      },
      {
        heading: "Choreography and lip-sync",
        body: "Choreography is planned automatically from the song's tempo and energy, and it reads each section's lyrics plus any choreography/story notes to bias the moves it picks — “reach for the sky” in a lyric line will favor an arms-raised move over an unrelated one in the same style. Clip generation also slices the song's own audio to each shot's exact time range and hands it to the video model, so “lip-sync” has real audio to work with rather than only a text instruction.",
        tip: "None of this guarantees frame-perfect lip-sync — that still depends on the video model's own quality — but it's the difference between the model having real signal to follow and having none.",
      },
    ],
  },
  {
    id: "magic-mode",
    title: "Magic Flow guide",
    section: "Music Video Director",
    relatedViews: ["song", "magicoutput"],
    updatedAt,
    keywords: "guided music video treatment story",
    blocks: [
      {
        body: "Magic Flow is Music Video Director's guided path from a song to a treatment. It asks one clear question at a time and saves a normal production you can refine later.",
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
  // Not shown at all in the Music Video Director edition — that build doesn't
  // ship these studios, so an article pointing at one would be a dead end.
  ...(
    [
      { title: "Motion Studio", view: "motionstudio", moduleId: "motion" },
      { title: "Glam Studio", view: "glamstudio", moduleId: "glam" },
      { title: "Web Studio", view: "webstudio", moduleId: "web" },
      { title: "Campaign Studio", view: "campaignstudio", moduleId: "campaign" },
    ] as const
  )
    .filter((studio) => isModuleEnabled(studio.moduleId))
    .map(
      ({ title, view }): HelpArticle => ({
        id: `studio-${title.split(" ")[0].toLowerCase()}`,
        title,
        section: "The other studios",
        relatedViews: [view],
        updatedAt,
        keywords: `${title} workflow export handoff`,
        action: { label: `Open ${title}`, view },
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
    id: "script-studio",
    title: "Script Studio and the shared Bibles",
    section: "Shared libraries & tools",
    relatedViews: ["scripts", "characters", "world", "props", "cast"],
    updatedAt,
    keywords: "script studio lyrics screenplay bibles cast characters locations props music video",
    action: { label: "Open Script Studio", view: "scripts" },
    blocks: [
      {
        body: "Script Studio is the text-analysis workbench for Director Studio. It is not only a Music Video page: it turns lyrics, screenplays, scene notes, and campaign scripts into reusable production DNA.",
      },
      {
        steps: [
          "Paste or import a TXT, PDF, DOCX, Fountain, lyrics, or script file.",
          "Run Analyze Script to extract characters, locations, props, vehicles, creatures, tone, scenes, and motifs.",
          "Send extracted people to the Character Bible, and when a Music Video song is active, send them directly to Cast.",
          "Reuse those Bibles from Music Video Director, Motion Studio, Glam Studio, Web Studio, and Campaign Studio.",
        ],
      },
      {
        tip: "Music files still start in Song Studio. Text that needs deeper character/world/prop analysis belongs in Script Studio.",
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
