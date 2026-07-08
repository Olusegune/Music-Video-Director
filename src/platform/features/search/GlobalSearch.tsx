// Global search — a command palette (Ctrl+K) over the whole production.
//
// Indexes songs, song sections, characters, sets, props (incl. pose/formation
// sheets), motion tests, treatment shots, and templates, and jumps to the right
// place. Built fresh each time it opens so it always reflects current state.

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Music,
  Radio,
  Users,
  Globe,
  Package,
  Film,
  Clapperboard,
  LayoutTemplate,
  CornerDownLeft,
  Boxes,
  Sparkles,
  Megaphone,
} from "lucide-react";
import { api } from "@/platform/lib/ipc";
import { useAppStore } from "@/platform/store/useAppStore";
import { loadSongs } from "@/apps/music-video/lib/songBrain";
import { loadMotionTests } from "@/apps/music-video/lib/motionTest";
import { loadAllTreatments } from "@/apps/music-video/lib/mvDirector";
import { allTemplates } from "@/platform/lib/templates";
import { Input } from "@/platform/components/ui/input";
import { cn } from "@/platform/lib/utils";

interface Hit {
  type: string;
  icon: React.ReactNode;
  label: string;
  sub: string;
  go: () => void;
}

export function GlobalSearch() {
  const open = useAppStore((s) => s.searchOpen);
  const setOpen = useAppStore((s) => s.setSearchOpen);
  const setActiveSong = useAppStore((s) => s.setActiveSong);
  const openSong = useAppStore((s) => s.openSong);
  const openMvDirector = useAppStore((s) => s.openMvDirector);
  const openCharacters = useAppStore((s) => s.openCharacters);
  const openWorld = useAppStore((s) => s.openWorld);
  const openProps = useAppStore((s) => s.openProps);
  const openAnimation = useAppStore((s) => s.openAnimation);
  const openTemplates = useAppStore((s) => s.openTemplates);
  const openMotionStudio = useAppStore((s) => s.openMotionStudio);
  const openGlamStudio = useAppStore((s) => s.openGlamStudio);
  const openWebStudio = useAppStore((s) => s.openWebStudio);
  const openCampaignStudio = useAppStore((s) => s.openCampaignStudio);

  const { data: characters = [] } = useQuery({ queryKey: ["characters"], queryFn: api.listCharacters, enabled: open });
  const { data: environments = [] } = useQuery({ queryKey: ["environments"], queryFn: api.listEnvironments, enabled: open });
  const { data: props = [] } = useQuery({ queryKey: ["props"], queryFn: api.listProps, enabled: open });

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const close = () => setOpen(false);
  const pick = (h: Hit) => {
    close();
    h.go();
  };

  const index = useMemo<Hit[]>(() => {
    if (!open) return [];
    const hits: Hit[] = [];
    hits.push(
      { type: "Studio", icon: <Music className="h-4 w-4" />, label: "Music Video Director", sub: "Direct a complete music video", go: openSong },
      { type: "Studio", icon: <Boxes className="h-4 w-4" />, label: "Motion Studio", sub: "Motion concepts and production prompts", go: openMotionStudio },
      { type: "Studio", icon: <Sparkles className="h-4 w-4" />, label: "Glam Studio", sub: "Luxury campaign looks and hero assets", go: openGlamStudio },
      { type: "Studio", icon: <Globe className="h-4 w-4" />, label: "Web Studio", sub: "Responsive campaign sites", go: openWebStudio },
      { type: "Studio", icon: <Megaphone className="h-4 w-4" />, label: "Campaign Studio", sub: "Cross-channel launch orchestration", go: openCampaignStudio },
    );
    const songs = loadSongs();
    const goSong = (id: string, mv = false) => () => {
      setActiveSong(id);
      mv ? openMvDirector() : openSong();
    };
    for (const s of songs) {
      hits.push({ type: "Song", icon: <Music className="h-4 w-4" />, label: s.name, sub: `${s.bpm} BPM · ${s.sections.length} sections`, go: goSong(s.id) });
      for (const sec of s.sections) {
        hits.push({ type: "Section", icon: <Radio className="h-4 w-4" />, label: sec.label, sub: `${s.name}${sec.performerRole ? ` · ${sec.performerRole}` : ""}`, go: goSong(s.id) });
      }
    }
    for (const c of characters)
      hits.push({ type: "Character", icon: <Users className="h-4 w-4" />, label: c.name, sub: c.role || "Character", go: openCharacters });
    for (const e of environments)
      hits.push({ type: "Set", icon: <Globe className="h-4 w-4" />, label: e.name, sub: e.mood || "Environment", go: openWorld });
    for (const p of props)
      hits.push({ type: p.category || "Prop", icon: <Package className="h-4 w-4" />, label: p.name, sub: p.category || "Prop", go: openProps });
    for (const t of loadMotionTests())
      hits.push({ type: "Motion test", icon: <Film className="h-4 w-4" />, label: t.label, sub: t.motionLabel || "motion", go: openAnimation });
    for (const tr of loadAllTreatments()) {
      const song = songs.find((s) => s.id === tr.songId);
      for (const sec of tr.sections)
        for (const shot of sec.shots)
          hits.push({ type: "Shot", icon: <Clapperboard className="h-4 w-4" />, label: shot.idea, sub: `${song?.name ?? "Treatment"} · ${sec.label}`, go: goSong(tr.songId, true) });
    }
    for (const t of allTemplates())
      hits.push({ type: "Template", icon: <LayoutTemplate className="h-4 w-4" />, label: t.name, sub: t.tagline || t.category, go: openTemplates });
    return hits;
  }, [open, characters, environments, props, setActiveSong, openSong, openMvDirector, openCharacters, openWorld, openProps, openAnimation, openTemplates, openMotionStudio, openGlamStudio, openWebStudio, openCampaignStudio]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return index.slice(0, 12);
    return index
      .filter((h) => `${h.label} ${h.sub} ${h.type}`.toLowerCase().includes(q))
      .slice(0, 40);
  }, [query, index]);

  useEffect(() => {
    if (active >= results.length) setActive(0);
  }, [results, active]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[88] flex items-start justify-center bg-background/80 p-6 pt-[12vh] backdrop-blur"
      onClick={close}
    >
      <div
        className="flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-[var(--radius-modal)] border border-border bg-surface shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search everything — songs, sections, characters, props, shots, templates…"
            className="border-0 bg-transparent px-0 focus-visible:ring-0"
            onKeyDown={(e) => {
              if (e.key === "Escape") close();
              else if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && results[active]) {
                e.preventDefault();
                pick(results[active]);
              }
            }}
          />
          <kbd className="rounded bg-elevated px-1.5 py-0.5 text-[10px] text-muted">Esc</kbd>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted">
              {query ? "No matches." : "Start typing to search your production."}
            </p>
          ) : (
            results.map((h, i) => (
              <button
                key={i}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(h)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[var(--radius-button)] px-3 py-2 text-left",
                  i === active ? "bg-primary/12" : "hover:bg-elevated/60"
                )}
              >
                <span className={cn("shrink-0", i === active ? "text-primary" : "text-muted")}>{h.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{h.label}</span>
                  <span className="block truncate text-[11px] text-muted">{h.sub}</span>
                </span>
                <span className="shrink-0 rounded bg-elevated px-1.5 py-0.5 text-[10px] text-muted">{h.type}</span>
                {i === active && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted" />}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
