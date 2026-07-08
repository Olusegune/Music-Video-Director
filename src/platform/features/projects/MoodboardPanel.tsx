import { useState } from "react";
import { Images, Copy, Check } from "lucide-react";
import type { PromptPack } from "@/platform/lib/types";
import { buildMoodboard } from "@/platform/lib/moodboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/platform/components/ui/card";
import { Button } from "@/platform/components/ui/button";

export function MoodboardPanel({ pack }: { pack: PromptPack }) {
  const tiles = buildMoodboard(pack);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-xs text-muted">
        <Images className="h-4 w-4" />A moodboard derived from your style DNA. Each tile is a
        ready-to-render image prompt — copy into an image model, or generate from the desktop app.
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => (
          <Card key={tile.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{tile.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <Tile text={tile.prompt} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Tile({ text }: { text: string }) {
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
      <p className="pr-8 text-xs leading-relaxed text-foreground">{text}</p>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-1.5 top-1.5 h-6 w-6"
        aria-label="Copy moodboard prompt"
        title="Copy"
        onClick={copy}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}
