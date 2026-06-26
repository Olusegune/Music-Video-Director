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
} from "lucide-react";
import { api } from "@/lib/ipc";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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
    id: "getting-started",
    title: "Getting started",
    icon: <Rocket className="h-4 w-4" />,
    keywords: "begin first intro onboarding new",
    action: { label: "Open Song Studio", go: (s) => s.openSong() },
    blocks: [
      { p: "Wheelbarrow AI Director turns a song into a complete music-video production. Everything you plan is saved automatically — there is nothing to set up to begin." },
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
    id: "workflow",
    title: "The workflow",
    icon: <Workflow className="h-4 w-4" />,
    keywords: "pipeline order steps overview spine",
    blocks: [
      { p: "The whole product is one connected spine. Each stage feeds the next, and everything keys off the song's timeline." },
      { steps: [
        "Song Studio — tempo, sections, lyric map.",
        "MV Director — directed treatment + per-shot camera/light/cut.",
        "Cast — performers, optionally linked to Character Bible DNA.",
        "Choreography — 8-counts + pose sheets for performance sections.",
        "Timeline — frames, clips, voice layers, then the final render.",
      ] },
      { tip: "You can jump between stages anytime from the sidebar — the active song stays selected across all of them." },
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
    id: "troubleshooting",
    title: "Troubleshooting",
    icon: <Wrench className="h-4 w-4" />,
    keywords: "problem error fix crash render fail key invalid lost work recover",
    blocks: [
      { h: "“Video render needs FFmpeg”" },
      { p: "Open the Install FFmpeg article and click Install — or follow the manual steps." },
      { h: "A Generate button is greyed out" },
      { p: "That provider has no key yet. Open API Keys and add one for the matching capability." },
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
