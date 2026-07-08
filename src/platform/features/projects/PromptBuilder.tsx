import { useState } from "react";
import {
  Wand2,
  Image as ImageIcon,
  Clapperboard,
  Copy,
  Check,
  Film,
  Layers,
  ChevronUp,
  ChevronDown,
  X,
  Plus,
} from "lucide-react";
import type { PromptPack } from "@/platform/lib/types";
import { buildImagePrompt, buildVideoPrompt, buildCombinedVideoPrompt } from "@/platform/lib/pack";
import { Card, CardContent, CardHeader, CardTitle } from "@/platform/components/ui/card";
import { Button } from "@/platform/components/ui/button";
import { Input } from "@/platform/components/ui/input";

type Update = (updater: (prev: PromptPack) => PromptPack) => void;

export function PromptBuilder({ pack, update }: { pack: PromptPack; update: Update }) {
  const combined = buildCombinedVideoPrompt(pack);

  return (
    <div className="flex flex-col gap-4">
      <ReferenceHierarchy pack={pack} update={update} />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="h-4 w-4 text-accent" /> Full Combined Video Prompt
            <span className="ml-1 text-[11px] font-normal text-muted">
              One master prompt for text-to-video of the whole sequence
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PromptBlock text={combined} />
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-xs text-muted">
        <Wand2 className="h-4 w-4" />
        Per-shot prompts below compose each shot's visual, camera, lighting, style, and text-lock
        safety. Copy into your image/video provider, or wire the router to generate directly.
      </div>

      {pack.shots.map((shot) => (
        <Card key={shot.number}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <span className="rounded bg-elevated px-1.5 py-0.5 text-[11px] text-muted">
                Shot {shot.number}
              </span>
              {shot.name}
              <span className="text-[11px] font-normal text-muted">{shot.duration}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Labeled icon={<ImageIcon className="h-3.5 w-3.5 text-primary" />} label="Image prompt">
              <PromptBlock text={buildImagePrompt(pack, shot)} />
            </Labeled>
            <Labeled
              icon={<Clapperboard className="h-3.5 w-3.5 text-accent" />}
              label="Video prompt"
            >
              <PromptBlock text={buildVideoPrompt(pack, shot)} />
            </Labeled>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ReferenceHierarchy({ pack, update }: { pack: PromptPack; update: Update }) {
  const [draft, setDraft] = useState("");
  const refs = pack.referenceHierarchy ?? [];

  const setRefs = (next: string[]) => update((p) => ({ ...p, referenceHierarchy: next }));

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= refs.length) return;
    const next = [...refs];
    [next[i], next[j]] = [next[j], next[i]];
    setRefs(next);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" /> Reference Hierarchy
          <span className="ml-1 text-[11px] font-normal text-muted">
            Highest priority first — injected into every prompt
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        {refs.map((r, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-[var(--radius-card)] border border-border bg-surface px-2 py-1.5"
          >
            <span className="w-5 shrink-0 text-center text-[11px] text-muted">{i + 1}</span>
            <span className="flex-1 text-xs text-foreground">{r}</span>
            <button
              aria-label="Move up"
              className="text-muted hover:text-foreground disabled:opacity-30"
              disabled={i === 0}
              onClick={() => move(i, -1)}
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              aria-label="Move down"
              className="text-muted hover:text-foreground disabled:opacity-30"
              disabled={i === refs.length - 1}
              onClick={() => move(i, 1)}
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <button
              aria-label="Remove reference"
              className="text-muted hover:text-danger"
              onClick={() => setRefs(refs.filter((_, k) => k !== i))}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <div className="mt-1 flex items-center gap-2">
          <Input
            value={draft}
            placeholder="Add a reference (e.g. hero product photo)…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && draft.trim()) {
                setRefs([...refs, draft.trim()]);
                setDraft("");
              }
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            disabled={!draft.trim()}
            onClick={() => {
              setRefs([...refs, draft.trim()]);
              setDraft("");
            }}
          >
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Labeled({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted">
        {icon}
        {label}
      </span>
      {children}
    </div>
  );
}

function PromptBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="relative rounded-[var(--radius-card)] border border-border bg-surface p-3">
      <p className="whitespace-pre-wrap pr-8 text-xs leading-relaxed text-foreground">{text}</p>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-1.5 top-1.5 h-6 w-6"
        aria-label="Copy prompt"
        title="Copy"
        onClick={copy}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}
