import {
  LayoutTemplate,
  Music,
  Boxes,
  Clapperboard,
  X,
  ArrowRight,
  Globe,
  Megaphone,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { useAppStore } from "@/platform/store/useAppStore";
import { Button } from "@/platform/components/ui/button";
import { cn } from "@/platform/lib/utils";
import { isModuleEnabled } from "@/platform/lib/productConfig";
import type { ConcreteModuleId } from "@/platform/lib/moduleManifest";

export function NewProjectWizard() {
  const store = useAppStore();
  if (!store.wizardOpen) return null;
  const close = (then?: () => void) => {
    store.setWizardOpen(false);
    then?.();
  };
  // Annotated on its own (not chained straight into .filter()) so each
  // literal's `moduleId` narrows to ConcreteModuleId via contextual typing —
  // chaining .filter() directly onto the array literal loses that context.
  const allOptions: {
    icon: LucideIcon;
    title: string;
    desc: string;
    go: () => void;
    accent: string;
    badge?: string;
    moduleId?: ConcreteModuleId;
  }[] = [
    {
      icon: Music,
      title: "Music Video Director",
      desc: "Direct a song-aware film with cast, choreography, shots, and timeline.",
      go: store.openMusicVideoGuidedFlow,
      accent: "violet",
      moduleId: "musicvideo",
    },
    {
      icon: Boxes,
      title: "Motion Studio",
      desc: "Create an explainer, commercial, UI animation, or product reveal.",
      go: store.openMotionStudio,
      accent: "cyan",
      moduleId: "motion",
    },
    {
      icon: WandSparkles,
      title: "Glam Studio",
      desc: "Art-direct luxury imagery, exact formats, and a product-film treatment.",
      go: store.openGlamStudio,
      accent: "amber",
      moduleId: "glam",
    },
    {
      icon: Globe,
      title: "Web Studio",
      desc: "Build a positioned, responsive multi-page campaign experience.",
      go: store.openWebStudio,
      accent: "emerald",
      moduleId: "web",
    },
    {
      icon: Megaphone,
      title: "Campaign Studio",
      desc: "Orchestrate strategy, studios, calendar, and launch kit from one brief.",
      go: store.openCampaignStudio,
      accent: "gold",
      badge: "All channels",
      moduleId: "campaign",
    },
    {
      icon: LayoutTemplate,
      title: "Shared Templates",
      desc: "Browse Music Video Director style and production blueprints.",
      go: store.openTemplates,
      accent: "default",
    },
  ];
  const options = allOptions.filter(
    (option) => !option.moduleId || isModuleEnabled(option.moduleId)
  );
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-background/85 p-6 backdrop-blur-md">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-7 py-5">
          <div>
            <div className="flex items-center gap-2">
              <Clapperboard className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Start with Director</h2>
            </div>
            <p className="mt-1 text-xs text-muted">
              Choose the outcome. Director Studio keeps its context connected.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => close()} aria-label="Close">
            <X />
          </Button>
        </div>
        <div className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-3">
          {options.map(({ icon: Icon, title, desc, go, accent, badge }) => (
            <button
              key={title}
              onClick={() => close(go)}
              className={cn(
                "group relative flex min-h-44 flex-col items-start rounded-xl border border-border bg-elevated/25 p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-elevated/60",
                accent === "gold" && "border-[var(--color-gold)]/35 bg-[var(--color-gold)]/5"
              )}
            >
              {badge ? (
                <span className="absolute right-3 top-3 rounded-full bg-[var(--color-gold)]/15 px-2 py-1 text-[10px] font-semibold text-[var(--color-gold)]">
                  {badge}
                </span>
              ) : null}
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <span className="mt-4 text-sm font-semibold">{title}</span>
              <span className="mt-1 flex-1 text-xs leading-relaxed text-muted">{desc}</span>
              <span className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary opacity-70 transition group-hover:translate-x-0.5 group-hover:opacity-100">
                Begin <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
