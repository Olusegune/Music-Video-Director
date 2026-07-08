import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LifeBuoy,
  Search,
  Rocket,
  Workflow,
  Music,
  Video,
  UsersRound,
  Footprints,
  LayoutList,
  KeyRound,
  Keyboard,
  Wrench,
  Film,
  Check,
  Loader2,
  Download,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  Clapperboard,
  BookOpen,
  Mic2,
  ImageOff,
  Library,
} from "lucide-react";
import { api } from "@/platform/lib/ipc";
import { useAppStore } from "@/platform/store/useAppStore";
import { cn } from "@/platform/lib/utils";
import { Button } from "@/platform/components/ui/button";
import { Input } from "@/platform/components/ui/input";
import { Badge } from "@/platform/components/ui/badge";

interface Article {
  id: string;
  title: string;
  icon: React.ReactNode;
  /** Extra search keywords beyond the title + body text. */
  keywords: string;
  /** Plain-text body used for search; also rendered as paragraphs/steps. */
  blocks: Block[];
  /** Optional custom footer (e.g. the FFmpeg installer). */
  custom?: "ffmpeg";
  /** Optional "do it now" action. */
  action?: { label: string; go: (s: ReturnType<typeof useAppStore.getState>) => void };
}

type Block =
  | { h: string }
  | { p: string }
  | { steps: string[] }
  | { tip: string };

function blockText(b: Block): string {
  if ("h" in b) return b.h;
  if ("p" in b) return b.p;
  if ("steps" in b) return b.steps.join(" ");
  return b.tip;
}

const ARTICLES: Article[] = [
  {
    id: "director-studio-overview",
    title: "Director Studio overview",
    icon: <Clapperboard className="h-4 w-4" />,
    keywords: "modules platform suite director engine motion glam web campaign shared assets",
    action: { label: "Open Director's Home", go: (s) => s.openDashboard() },
    blocks: [
      { p: "Director Studio is one connected AI creative operating system. Choose the specialist studio that matches the deliverable; Director Engine keeps brand, assets, providers, production memory, and handoffs connected underneath." },
      { h: "Five specialist studios" },
      { steps: ["Music Video Director — song-aware films, cast, choreography, shots, and final timeline.", "Motion Studio — explainers, commercials, product motion, UI animation, and storyboards.", "Glam Studio — luxury visual campaigns, exact-format imagery, and product-film treatments.", "Web Studio — positioned responsive websites with multi-page static export and SEO controls.", "Campaign Studio — strategy, cross-channel planning, production handoffs, calendars, and launch kits."] },
      { tip: "Start with Director when you know the outcome but not the module. Open a specialist studio directly when you already know the deliverable." },
    ],
  },
  {
    id: "shared-director-engine",
    title: "Shared Director Engine resources",
    icon: <Library className="h-4 w-4" />,
    keywords: "characters locations worlds props wardrobe assets brand dna templates styles providers reusable shared",
    blocks: [{ p: "Characters, locations, props, generated assets, Brand DNA, style presets, model routing, and deliverable records belong to Director Studio—not to a single module. Specialist studios reference these shared resources so a campaign can move between image, motion, web, and launch planning without losing its identity." }, { steps: ["Use Production Library tools in the sidebar to create durable characters, worlds, props, and assets.", "Use Brand Kits for palette, voice, typography, and product-line continuity.", "Use Campaign Studio handoffs to seed Glam, Web, and Motion with the same strategy and source deliverable.", "Use API Keys and AI Models once; the platform router applies those settings across studios."] }],
  },
  {
    id: "v1-studios",
    title: "V1 studio workflows",
    icon: <Sparkles className="h-4 w-4" />,
    keywords: "calendar ics multipage seo product film",
    blocks: [{ h: "Campaign calendar" }, { p: "Campaign Studio turns due offsets into a synchronized visual sequence and exports a standards-based ICS calendar inside and outside the launch kit." }, { h: "Multi-page web export" }, { p: "Web Studio manages pages, slugs, descriptions, canonical URLs, shared navigation, and exports framework-free HTML/CSS." }, { h: "Product film" }, { p: "Glam Studio creates a reference-conscious 15-second film treatment with timed shots, motion direction, audio beats, and production prompts." }],
  },
  {
    id: "getting-started",
    title: "Getting started",
    icon: <Rocket className="h-4 w-4" />,
    keywords: "begin first intro onboarding new",
    action: { label: "Open Song Studio", go: (s) => s.openSong() },
    blocks: [
      { p: "Director Studio turns ideas into connected creative productions. Music Video Director is the song-first module; everything you plan is saved automatically, and there is nothing to set up to begin." },
      { h: "Your first video in 4 steps" },
      { steps: [
        "Song Studio → Import a track (MP3/WAV). The Song Brain detects tempo, lays out the sections, and you can paste lyrics to align them.",
        "MV Director → Direct this video. You get a beat-synced, section-aware shot list — fast cuts in choruses, narrative in verses.",
        "Cast & Choreography (optional) → add performers and generate routines for the performance sections.",
        "Timeline → review the assembly, generate frames/clips, then Render video.",
      ] },
      { tip: "Planning is 100% local and free — no API key needed. You only need keys to generate images/clips/voices, and FFmpeg to render the final MP4." },
    ],
  },
  {
    id: "magic-mode",
    title: "Magic Mode guide",
    icon: <Sparkles className="h-4 w-4" />,
    keywords: "guided wizard easy simple beginner one-click gold",
    blocks: [
      { p: "Magic Mode is the fast, guided path from a song to a directed music video — one screen, one question at a time. It doesn't replace Director Mode's power; it's a friendlier front door to the same engine." },
      { h: "The 7 steps" },
      { steps: [
        "Song — import your track (an MP3/WAV export from Suno works the same way).",
        "Lyrics — paste or upload lyrics/a script. The parsing engine reads out a “What we found” summary (title, genre, mood, themes, characters, hook lines) as you type.",
        "Performers — confirm who's in the video; add, remove, or generate a portrait for each one.",
        "Video Type — Performance, Narrative, Dance, Lyric, or Hybrid; this biases the style picks that follow.",
        "Story — pick a story feeling (or skip it for performance-only) — see the Story Mode article.",
        "Style — pick a visual look; the picks are pre-filtered by your Video Type.",
        "Direct — the Director generates the treatment and choreography and hands you off to MV Director.",
      ] },
      { tip: "Everything Magic Mode creates is a normal production — open it anytime in MV Director, Cast, Choreography, or Timeline for full manual control." },
    ],
  },
  {
    id: "story-mode",
    title: "Story Mode",
    icon: <BookOpen className="h-4 w-4" />,
    keywords: "narrative feeling arc beats opening bridge ending love rise up transformation party spiritual revenge dream custom",
    blocks: [
      { p: "Story Mode lays a narrative arc over the song's structure, independent of Video Type and Style. Pick a feeling and the Director writes six beats — opening, verse, chorus, bridge, final chorus, ending — that every downstream shot idea is built against." },
      { h: "Feelings" },
      { p: "No Story (pure performance), Love Story, Rise Up, Transformation, Party/Celebration, Spiritual Journey, Revenge/Victory, Dream World, or Custom (write your own idea)." },
      { h: "Where the beats come from" },
      { p: "Story Mode prefers, in order: a custom idea you write, then a real repeated hook line the parsing engine found in your lyrics/script, then a generic feeling-based arc if neither is available. If the parser also found a named character or location, the opening beat anchors to it." },
      { tip: "Story Mode reads whatever you entered in the Lyrics step — richer lyrics/script text produces a more specific arc." },
    ],
  },
  {
    id: "workflow",
    title: "Director Mode — the full workflow",
    icon: <Workflow className="h-4 w-4" />,
    keywords: "pipeline order steps overview spine advanced manual power",
    blocks: [
      { p: "Director Mode is the rest of the app — every stage, fully manual, nothing hidden. It's the same engine Magic Mode drives for you, just with every dial exposed: Character Bible, World Bible, Storyboards, Prompt Studio, Animation Lab, and the full Provider system." },
      { steps: [
        "Song Studio — tempo, sections, lyric map.",
        "MV Director — directed treatment + per-shot camera/light/cut.",
        "Cast — performers, optionally linked to Character Bible DNA.",
        "Choreography — 8-counts + pose sheets for performance sections.",
        "Timeline — frames, clips, voice layers, then the final render.",
      ] },
      { tip: "You can jump between stages anytime from the sidebar — the active song stays selected across all of them. Anything Magic Mode built is a normal production here too." },
    ],
  },
  {
    id: "song-studio",
    title: "Song Studio",
    icon: <Music className="h-4 w-4" />,
    keywords: "tempo bpm sections lyrics import audio waveform",
    action: { label: "Open Song Studio", go: (s) => s.openSong() },
    blocks: [
      { p: "Import a track and the Song Brain analyzes it locally: BPM, a beat grid, an energy curve, and an automatic section breakdown (intro/verse/chorus/bridge/outro)." },
      { steps: [
        "Click Import track (or drag a file onto the window).",
        "Edit any section's type or label — the map is a starting point, fully editable.",
        "Paste lyrics and click “Align lyrics to song” to spread them across the vocal sections.",
        "Use Voice & spoken audio to generate intro tags / ad-libs / narration (needs an ElevenLabs key).",
      ] },
      { tip: "Detection is heuristic — nudge section boundaries and types until the map matches what you hear." },
    ],
  },
  {
    id: "lyrics-parsing",
    title: "Adding lyrics & scripts",
    icon: <Mic2 className="h-4 w-4" />,
    keywords: "lyrics script suno paste upload parse title artist genre mood themes characters locations hook source notes",
    blocks: [
      { p: "Paste lyrics, upload a .txt/.lrc file, or drop in a music-video idea or story note — in Song Studio's lyric field or Magic Mode's Lyrics step. A Suno-style export with [Verse]/[Chorus]/[Bridge] tags works especially well." },
      { h: "What the parsing engine reads out" },
      { p: "Song title, artist name, genre, mood, themes, characters, locations, verse/chorus/bridge sections, repeated hook lines, an emotional-arc summary, visual symbols, performance opportunities, and choreography moments — all detected locally, no API call." },
      { steps: [
        "Paste or upload your text — a “What we found” chip summary appears live as you type.",
        "Nothing is required to be perfect: character/location detection is a best-effort guess, not a real name-recognition model.",
        "The exact text you entered is always kept, untouched, alongside the parse — so nothing is ever lost to a missed pattern.",
        "Story Mode automatically uses the parser's hook lines and detected characters/locations to write a sharper opening beat.",
      ] },
      { tip: "[Verse]/[Chorus]/[Bridge]-style bracket tags give the most reliable section detection — they're what Suno and most lyric sheets already use." },
    ],
  },
  {
    id: "mv-director",
    title: "MV Director",
    icon: <Video className="h-4 w-4" />,
    keywords: "treatment shots storyboard frames clips generate model provider",
    action: { label: "Open MV Director", go: (s) => s.openMvDirector() },
    blocks: [
      { p: "Direct the video and the Director Brain lays a shot list onto the song: performance shots in choruses, narrative in verses, abstract texture in intros/bridges — beat-synced." },
      { steps: [
        "Click Direct this video to generate the treatment.",
        "Edit the logline, section concepts, and any shot idea inline.",
        "Pick an image model + a video model in the header (per-shot overrides live on each shot row).",
        "Generate a Frame and/or Clip for each shot. “Generate all frames” batches them.",
      ] },
      { tip: "Frame and Clip buttons are disabled until the matching provider key is set — see API keys." },
    ],
  },
  {
    id: "cast",
    title: "Cast & performers",
    icon: <UsersRound className="h-4 w-4" />,
    keywords: "performers singers dancers character dna consistency wardrobe",
    action: { label: "Open Cast", go: (s) => s.openCast() },
    blocks: [
      { p: "Add the people in your video — lead/backing singers, rappers, dancers, featured artists. Link a performer to a Character Bible entry to carry their visual DNA into generation." },
      { tip: "A performer's dance style seeds the Choreography engine's default style." },
    ],
  },
  {
    id: "characters-magic-mode",
    title: "Adding characters",
    icon: <Clapperboard className="h-4 w-4" />,
    keywords: "performer role add delete portrait generate prompt lead featured dancer singer rapper band narrative crowd",
    blocks: [
      { p: "Magic Mode's Performers step is a fast card view for the people in your video — no long forms." },
      { steps: [
        "The Director auto-detects likely performers from your song and lyrics; confirm, edit, or remove any of them.",
        "Add Performer for anyone missed; pick a role — Lead Artist, Featured Artist, Dancer, Singer, Rapper, Band Member, Narrative Character, or Crowd.",
        "Upload a portrait, or use Create from Prompt to describe them and generate a portrait from that description.",
        "Generate Portrait re-runs image generation for a performer at any point — swap it out if the first result isn't right.",
      ] },
      { tip: "Linking a performer to a Character Bible entry (in Cast, Director Mode) carries their full visual DNA into every generation — Magic Mode's quick add is the fast path; Character Bible is the deep one." },
    ],
  },
  {
    id: "choreography",
    title: "Choreography",
    icon: <Footprints className="h-4 w-4" />,
    keywords: "dance routine 8-count formation pose performance",
    action: { label: "Open Choreography", go: (s) => s.openChoreography() },
    blocks: [
      { p: "Generate routines for the song's performance sections (choruses/drops/high-energy). Each section gets 8-counts mapped to the bars, a formation, and a key-pose sheet." },
      { tip: "Verses and intros stay free for natural movement — only performance sections get set choreography." },
    ],
  },
  {
    id: "timeline",
    title: "Timeline & render",
    icon: <LayoutList className="h-4 w-4" />,
    keywords: "assemble export mp4 render resolution fps animatic preview",
    action: { label: "Open Timeline", go: (s) => s.openTimeline() },
    blocks: [
      { p: "The Timeline assembles the song, shots, lyrics, and choreography onto one beat-synced view. Preview the animatic, or render a finished MP4." },
      { steps: [
        "Generate frames/clips in the MV Director so the Shots lane has media.",
        "Click Render video, pick a resolution (incl. vertical for Shorts/Reels) and frame rate.",
        "The audio mix (master track + voice layers) is shown before you render.",
        "Render needs FFmpeg — see the FFmpeg article to install it in one click.",
      ] },
      { tip: "No FFmpeg yet? The Export rundown button still gives you a full Markdown shot list." },
    ],
  },
  {
    id: "ffmpeg",
    title: "Install FFmpeg",
    icon: <Film className="h-4 w-4" />,
    keywords: "render export video mp4 codec encode missing not found path",
    custom: "ffmpeg",
    blocks: [
      { p: "FFmpeg is the free tool that stitches your shots together and muxes the audio into the final MP4. The app can install a managed copy for you — no PATH editing, no command prompt." },
      { h: "Manual install (if you prefer)" },
      { steps: [
        "Download the “release essentials” build from gyan.dev/ffmpeg/builds.",
        "Unzip it and find ffmpeg.exe inside the bin folder.",
        "Either add that folder to your PATH, or set the MOTIONFORGE_FFMPEG environment variable to the full path of ffmpeg.exe.",
        "Restart the app and try Render again.",
      ] },
      { tip: "The one-click installer above downloads the same build and stores it inside the app — nothing else on your system changes." },
    ],
  },
  {
    id: "api-keys",
    title: "API keys & providers",
    icon: <KeyRound className="h-4 w-4" />,
    keywords: "provider openai fal google elevenlabs gemini connect generate keychain",
    action: { label: "Open API Keys", go: (s) => s.openApiKeys() },
    blocks: [
      { p: "Planning is free and local. To generate pixels and audio you add your own provider keys — they're stored in the Windows Credential Manager and never leave your machine except to that provider." },
      { steps: [
        "Open API Keys and add a key for at least one Image, Video, and Audio provider.",
        "The “Music-video readiness” panel shows which capabilities are ready.",
        "Use Test Connection to confirm a key works.",
      ] },
      { tip: "Frames need an image key (fal/OpenAI/Google), clips a video key (fal/Veo/Replicate), voices an ElevenLabs key." },
    ],
  },
  {
    id: "shortcuts",
    title: "Keyboard shortcuts",
    icon: <Keyboard className="h-4 w-4" />,
    keywords: "hotkeys keys navigation f1 ctrl",
    blocks: [
      { h: "Navigation" },
      { steps: [
        "F1 or ? — open this Help Center",
        "Ctrl+1 — Song Studio",
        "Ctrl+2 — MV Director",
        "Ctrl+3 — Cast",
        "Ctrl+4 — Choreography",
        "Ctrl+5 — Timeline",
      ] },
      { tip: "Shortcuts are ignored while you're typing in a text field." },
    ],
  },
  {
    id: "broken-images",
    title: "Fixing broken or missing images",
    icon: <ImageOff className="h-4 w-4" />,
    keywords: "broken missing blank thumbnail image not showing failed generation placeholder relink",
    blocks: [
      { p: "If a thumbnail shows as blank space instead of an image, generation either hasn't run yet for that item, failed silently, or the source file it pointed to moved or was deleted." },
      { h: "In MV Director" },
      { p: "Use Regenerate Scene on the shot — it's always the next step, never a dead end. It re-runs generation with the same prompt/model/references." },
      { h: "In Cast, Character Bible, World Bible, or Props" },
      { p: "Re-upload a portrait/reference image, or use Generate Portrait / Generate Image again to replace it." },
      { h: "In Asset Library" },
      { p: "A broken asset can be removed via the delete flow; regenerate or re-upload a replacement from wherever it's used." },
      { tip: "Blank thumbnails are a known rough edge — a dedicated broken-image detector with one-click Relink/Regenerate/Remove is on the roadmap. Until then, regenerate is the reliable fix." },
    ],
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    icon: <Wrench className="h-4 w-4" />,
    keywords: "problem error fix crash render fail key invalid lost work recover",
    blocks: [
      { h: "“Video render needs FFmpeg”" },
      { p: "Open the Install FFmpeg article and click Install — or follow the manual steps." },
      { h: "A Generate button is greyed out" },
      { p: "That provider has no key yet. Open API Keys and add one for the matching capability." },
      { h: "A thumbnail or image looks broken/blank" },
      { p: "See the Fixing broken or missing images article — Regenerate Scene (MV Director) or re-uploading a portrait/reference is the fastest fix." },
      { h: "Will I lose my work?" },
      { p: "No — songs, treatments, cast, and choreography save automatically as you go. Close and reopen anytime." },
      { h: "SmartScreen says “unknown publisher”" },
      { p: "The build isn't code-signed yet. Click More info → Run anyway. This is expected." },
    ],
  },
];

export function HelpCenter() {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState(ARTICLES[0].id);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ARTICLES;
    return ARTICLES.filter((a) => {
      const hay = (
        a.title +
        " " +
        a.keywords +
        " " +
        a.blocks.map(blockText).join(" ")
      ).toLowerCase();
      return hay.includes(q);
    });
  }, [query]);

  const active = ARTICLES.find((a) => a.id === activeId) ?? filtered[0] ?? ARTICLES[0];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-border px-6 py-4">
        <div className="grad-primary flex h-9 w-9 items-center justify-center rounded-lg">
          <LifeBuoy className="h-4.5 w-4.5 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-semibold leading-tight">Help Center</h1>
          <p className="text-xs text-muted">
            Guides for every step — from importing a song to rendering the video.
          </p>
        </div>
        <div className="relative w-72 max-w-[40vw]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search help…"
            className="pl-8"
            aria-label="Search help"
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="w-60 shrink-0 overflow-y-auto border-r border-border p-2">
          {filtered.length === 0 && (
            <p className="px-2 py-3 text-xs text-muted">
              No articles match “{query}”.
            </p>
          )}
          {filtered.map((a) => (
            <button
              key={a.id}
              onClick={() => setActiveId(a.id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-[var(--radius-button)] px-2.5 py-2 text-left text-sm transition-colors",
                a.id === active.id
                  ? "bg-primary/12 text-primary"
                  : "text-muted hover:bg-elevated/60 hover:text-foreground"
              )}
            >
              <span className="shrink-0">{a.icon}</span>
              <span className="min-w-0 flex-1 truncate">{a.title}</span>
            </button>
          ))}
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto p-6">
          <ArticleView article={active} />
        </main>
      </div>
    </div>
  );
}

function ArticleView({ article }: { article: Article }) {
  const store = useAppStore();
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <span className="grad-primary flex h-7 w-7 items-center justify-center rounded-md text-white">
          {article.icon}
        </span>
        <h2 className="text-xl font-semibold">{article.title}</h2>
      </div>

      {article.blocks.map((b, i) => {
        if ("h" in b)
          return (
            <h3 key={i} className="pt-2 text-sm font-semibold text-foreground">
              {b.h}
            </h3>
          );
        if ("p" in b)
          return (
            <p key={i} className="text-sm leading-relaxed text-muted">
              {b.p}
            </p>
          );
        if ("steps" in b)
          return (
            <ol key={i} className="space-y-2">
              {b.steps.map((s, j) => (
                <li key={j} className="flex gap-3 text-sm">
                  <span className="grad-primary mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white">
                    {j + 1}
                  </span>
                  <span className="leading-relaxed">{s}</span>
                </li>
              ))}
            </ol>
          );
        return (
          <div
            key={i}
            className="rounded-[var(--radius-input)] border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-foreground"
          >
            💡 {b.tip}
          </div>
        );
      })}

      {article.custom === "ffmpeg" && <FfmpegInstaller />}

      {article.action && (
        <Button onClick={() => article.action!.go(store)} className="mt-2">
          {article.action.label}
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

function FfmpegInstaller() {
  const { data: status, refetch, isFetching } = useQuery({
    queryKey: ["ffmpegStatus"],
    queryFn: api.checkFfmpeg,
  });
  const [installing, setInstalling] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const install = async () => {
    setInstalling(true);
    setMsg(null);
    try {
      const path = await api.installFfmpeg();
      setMsg(`Installed ✓ — ${path}`);
      await refetch();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Install failed.");
    } finally {
      setInstalling(false);
    }
  };

  const available = status?.available;

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        {available ? (
          <Badge variant="success" className="gap-1 normal-case">
            <Check className="h-3 w-3" /> FFmpeg detected
          </Badge>
        ) : (
          <Badge variant="warning" className="gap-1 normal-case">
            <AlertTriangle className="h-3 w-3" /> FFmpeg not found
          </Badge>
        )}
        {status?.version && (
          <span className="truncate text-[11px] text-muted">{status.version}</span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button onClick={install} disabled={installing} variant={available ? "secondary" : "primary"}>
          {installing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {available ? "Reinstall managed copy" : "Install FFmpeg (one click)"}
        </Button>
        <Button variant="ghost" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Re-check"}
        </Button>
      </div>

      {msg && (
        <p className="mt-2 break-all text-[11px] text-muted">{msg}</p>
      )}
      <p className="mt-2 text-[11px] text-muted">
        Downloads a static build (~80&nbsp;MB) into the app's data folder. Desktop
        app only — in the browser preview, use the manual steps.
      </p>
    </div>
  );
}
