import { useMemo, useState } from "react";
import { LifeBuoy, Search, ChevronRight } from "lucide-react";
import { useAppStore, type View } from "@/platform/store/useAppStore";
import { cn } from "@/platform/lib/utils";
import { Button } from "@/platform/components/ui/button";
import { Input } from "@/platform/components/ui/input";
import { HELP_ARTICLES, HELP_SECTIONS, type HelpArticle } from "./helpContent";

function openView(view: View) {
  const state = useAppStore.getState();
  const actions: Partial<Record<View, () => void>> = {
    dashboard: state.openDashboard,
    song: state.openSong,
    mvdirector: state.openMvDirector,
    templates: state.openTemplates,
    scripts: state.openScripts,
    cast: state.openCast,
    choreography: state.openChoreography,
    timeline: state.openTimeline,
    motionstudio: state.openMotionStudio,
    glamstudio: state.openGlamStudio,
    webstudio: state.openWebStudio,
    campaignstudio: state.openCampaignStudio,
    apikeys: state.openApiKeys,
  };
  actions[view]?.();
}

export function HelpCenter() {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState(HELP_ARTICLES[0].id);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return HELP_ARTICLES;
    return HELP_ARTICLES.filter((article) =>
      `${article.title} ${article.keywords} ${article.blocks.map((block) => `${block.heading ?? ""} ${block.body ?? ""} ${block.steps?.join(" ") ?? ""} ${block.tip ?? ""}`).join(" ")}`
        .toLowerCase()
        .includes(q)
    );
  }, [query]);
  const active =
    HELP_ARTICLES.find((article) => article.id === activeId) ?? filtered[0] ?? HELP_ARTICLES[0];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-border px-6 py-4">
        <div className="grad-primary flex h-9 w-9 items-center justify-center rounded-lg">
          <LifeBuoy className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Help Center</h1>
          <p className="text-xs text-muted">Current guides for every Director Studio workspace.</p>
        </div>
        <div className="relative w-72 max-w-[40vw]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search help…"
            className="pl-8"
          />
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="w-72 shrink-0 overflow-y-auto border-r border-border p-3">
          {HELP_SECTIONS.map((section) => {
            const articles = filtered.filter((article) => article.section === section);
            if (!articles.length) return null;
            return (
              <div key={section} className="mb-5">
                <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                  {section}
                </div>
                {articles.map((article) => (
                  <button
                    key={article.id}
                    onClick={() => setActiveId(article.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm",
                      article.id === active.id
                        ? "bg-primary/12 text-primary"
                        : "text-muted hover:bg-elevated/60 hover:text-foreground"
                    )}
                  >
                    <span className="min-w-0 flex-1">{article.title}</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            );
          })}
        </aside>
        <main className="min-w-0 flex-1 overflow-y-auto p-8">
          <ArticleView article={active} />
        </main>
      </div>
    </div>
  );
}

function ArticleView({ article }: { article: HelpArticle }) {
  return (
    <article className="mx-auto max-w-3xl space-y-5">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          {article.section}
        </div>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">{article.title}</h2>
        <p className="mt-2 text-xs text-muted">Updated {article.updatedAt}</p>
      </div>
      {article.blocks.map((block, index) => (
        <section key={index} className="space-y-3">
          {block.heading && <h3 className="text-base font-semibold">{block.heading}</h3>}
          {block.body && <p className="text-sm leading-7 text-muted">{block.body}</p>}
          {block.steps && (
            <ol className="space-y-3">
              {block.steps.map((step, stepIndex) => (
                <li key={step} className="flex gap-3 text-sm leading-6">
                  <span className="grad-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white">
                    {stepIndex + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          )}
          {block.tip && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6">
              {block.tip}
            </div>
          )}
        </section>
      ))}
      {article.action && (
        <Button onClick={() => openView(article.action!.view)}>
          {article.action.label}
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </article>
  );
}
