import { useState } from "react";
import { Check, Circle, Music, KeyRound, Clapperboard, X } from "lucide-react";
import { useProviderReadiness } from "@/lib/providerReady";
import { PROVIDERS, type Capability } from "@/lib/providers";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const LS_DISMISSED = "mf.onboardingDismissed";

/** First-run checklist that walks a new user from a song → keys → first video. */
export function OnboardingChecklist({ hasSongs }: { hasSongs: boolean }) {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(LS_DISMISSED) === "1"
  );
  const { isConfigured } = useProviderReadiness();
  const openMvDirector = useAppStore((s) => s.openMvDirector);
  const openApiKeys = useAppStore((s) => s.openApiKeys);

  if (dismissed) return null;

  const capReady = (cap: Capability) =>
    PROVIDERS.some(
      (p) => p.capabilities.includes(cap) && p.status === "wired" && isConfigured([p.id])
    );
  const keysReady = capReady("image") || capReady("video") || capReady("audio");

  const dismiss = () => {
    localStorage.setItem(LS_DISMISSED, "1");
    setDismissed(true);
  };

  const steps = [
    {
      done: hasSongs,
      icon: <Music className="h-4 w-4" />,
      title: "Import a track",
      desc: "Drop an MP3/WAV — the Song Brain maps tempo, sections, and lyrics.",
      action: null,
    },
    {
      done: keysReady,
      icon: <KeyRound className="h-4 w-4" />,
      title: "Connect your AI keys",
      desc: "Add keys for frames, clips, and voice. Planning works without them.",
      action: { label: "Open API Keys", onClick: openApiKeys },
    },
    {
      done: false,
      icon: <Clapperboard className="h-4 w-4" />,
      title: "Direct your first video",
      desc: "Generate a beat-synced treatment, then frames, clips, and a render.",
      action: { label: "Open MV Director", onClick: openMvDirector },
    },
  ];

  const completed = steps.filter((s) => s.done).length;

  return (
    <div className="relative mb-5 rounded-[var(--radius-card)] border border-border bg-surface/70 p-4 shadow-card">
      <button
        onClick={dismiss}
        className="absolute right-3 top-3 text-muted hover:text-foreground"
        aria-label="Dismiss checklist"
        title="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm font-semibold">Get started</span>
        <span className="text-xs text-muted">{completed}/3 done</span>
      </div>
      <ol className="grid gap-3 sm:grid-cols-3">
        {steps.map((step, i) => (
          <li
            key={i}
            className={cn(
              "flex flex-col gap-2 rounded-[var(--radius-button)] border p-3",
              step.done ? "border-success/40 bg-success/5" : "border-border"
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full",
                  step.done
                    ? "bg-success/15 text-success"
                    : "bg-elevated text-muted"
                )}
              >
                {step.done ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Circle className="h-3 w-3" />
                )}
              </span>
              <span className="flex items-center gap-1.5 text-sm font-medium">
                {step.icon}
                {step.title}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-muted">{step.desc}</p>
            {step.action && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-auto self-start px-2"
                onClick={step.action.onClick}
              >
                {step.action.label}
              </Button>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
