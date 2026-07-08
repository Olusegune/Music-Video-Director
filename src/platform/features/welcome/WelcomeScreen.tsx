import { useState } from "react";
import { Boxes, Music, LifeBuoy, Globe, Megaphone, Sparkles, X, Library, Users, Map, Package, WandSparkles, ArrowRight } from "lucide-react";
import { useAppStore } from "@/platform/store/useAppStore";
import { getShowWelcome, setShowWelcome } from "@/platform/lib/settings";
import { Button } from "@/platform/components/ui/button";
import heroArt from "@/assets/director-studio-splash-afrofuturist-v1.jpg";

const modules = [
  { key: "music", title: "Music Video Director", desc: "Songs into cinematic treatments", icon: Music, accent: "from-violet-500/25 to-violet-500/5" },
  { key: "motion", title: "Motion Studio", desc: "Animation, explainers & product motion", icon: Boxes, accent: "from-cyan-500/25 to-cyan-500/5" },
  { key: "glam", title: "Glam Studio", desc: "Luxury campaigns & product imagery", icon: WandSparkles, accent: "from-amber-500/25 to-amber-500/5" },
  { key: "web", title: "Web Studio", desc: "Responsive campaign experiences", icon: Globe, accent: "from-emerald-500/25 to-emerald-500/5" },
  { key: "campaign", title: "Campaign Studio", desc: "Strategy, channels & launch orchestration", icon: Megaphone, accent: "from-fuchsia-500/25 to-fuchsia-500/5" },
] as const;

export function WelcomeScreen() {
  const open = useAppStore((s) => s.welcomeOpen);
  const setWelcomeOpen = useAppStore((s) => s.setWelcomeOpen);
  const [showOnStartup, setShowOnStartup] = useState(() => getShowWelcome());
  const openSong = useAppStore((s) => s.openSong);
  const openMotionStudio = useAppStore((s) => s.openMotionStudio);
  const openGlamStudio = useAppStore((s) => s.openGlamStudio);
  const openWebStudio = useAppStore((s) => s.openWebStudio);
  const openCampaignStudio = useAppStore((s) => s.openCampaignStudio);
  const openHelp = useAppStore((s) => s.openHelp);
  const setWizardOpen = useAppStore((s) => s.setWizardOpen);
  if (!open) return null;

  const close = (then?: () => void) => { setWelcomeOpen(false); then?.(); };
  const destinations = { music: openSong, motion: openMotionStudio, glam: openGlamStudio, web: openWebStudio, campaign: openCampaignStudio };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#07080b] p-4 sm:p-6">
      <div className="relative flex h-full max-h-[880px] w-full max-w-6xl overflow-hidden rounded-2xl border border-white/10 bg-[#101216] shadow-2xl shadow-black/70">
        <section className="relative hidden w-[46%] overflow-hidden lg:block">
          <img src={heroArt} alt="Afrofuturistic creator directing a connected world of film, music, design, fashion, products, and storytelling" className="absolute inset-0 h-full w-full object-cover object-[center_68%]" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#101216]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/35" />
          <div className="absolute inset-x-0 bottom-0 p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">Powered by Director Engine</p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/75">One intelligence layer connects your brand, cast, worlds, assets, styles, providers, and production history.</p>
            <div className="mt-5 flex flex-wrap gap-2 text-[11px] text-white/65">
              {[Library, Users, Map, Package].map((Icon, i) => <span key={i} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-2.5 py-1.5"><Icon className="h-3 w-3" />{["Assets", "Characters", "Locations", "Props"][i]}</span>)}
            </div>
          </div>
        </section>

        <section className="flex min-w-0 flex-1 flex-col overflow-y-auto p-6 sm:p-8 lg:p-10">
          <button onClick={() => close()} aria-label="Close welcome" className="absolute right-4 top-4 z-10 rounded-lg border border-white/10 bg-black/25 p-2 text-white/60 transition hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
          <div className="max-w-2xl pr-8">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"><Sparkles className="h-3.5 w-3.5" /> AI creative operating system</div>
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Welcome to Director Studio</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/60 sm:text-base">Move from an idea to a connected campaign, film, experience, or visual world—without rebuilding context in every tool.</p>
          </div>

          <div className="mt-7 rounded-xl border border-primary/25 bg-gradient-to-br from-primary/15 via-white/[0.03] to-transparent p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div><p className="font-semibold text-white">What do you want to create?</p><p className="mt-1 text-xs text-white/50">Director will help choose the workflow and keep every deliverable connected.</p></div>
              <Button size="lg" onClick={() => close(() => setWizardOpen(true))}>Start with Director <ArrowRight className="h-4 w-4" /></Button>
            </div>
          </div>

          <div className="mt-7 grid gap-2.5 sm:grid-cols-2">
            {modules.map(({ key, title, desc, icon: Icon, accent }, index) => (
              <button key={key} onClick={() => close(destinations[key])} className={`group flex items-center gap-3 rounded-xl border border-white/10 bg-gradient-to-br ${accent} p-3.5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-white/25 ${index === 4 ? "sm:col-span-2" : ""}`}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black/25 text-white/85"><Icon className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-white">{title}</span><span className="mt-0.5 block text-xs text-white/50">{desc}</span></span>
                <ArrowRight className="h-4 w-4 text-white/25 transition group-hover:translate-x-0.5 group-hover:text-white/70" />
              </button>
            ))}
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-xs">
            <label className="flex items-center gap-2 text-white/45"><input type="checkbox" checked={showOnStartup} onChange={(e) => { setShowOnStartup(e.target.checked); setShowWelcome(e.target.checked); }} className="accent-[var(--color-primary)]" />Show on startup</label>
            <button onClick={() => close(openHelp)} className="flex items-center gap-1.5 font-medium text-primary hover:underline"><LifeBuoy className="h-3.5 w-3.5" /> Help & learning</button>
          </div>
        </section>
      </div>
    </div>
  );
}
