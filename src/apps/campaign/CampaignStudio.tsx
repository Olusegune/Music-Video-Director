import { useMemo, useState } from "react";
import { BadgeCheck, CalendarDays, Download, Globe2, Image, Loader2, Mail, Megaphone, Plus, Send, Sparkles, Trash2, Video } from "lucide-react";
import { Badge } from "@/platform/components/ui/badge";
import { Button } from "@/platform/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/platform/components/ui/card";
import { Textarea } from "@/platform/components/ui/textarea";
import { Input } from "@/platform/components/ui/input";
import { GuidedFlowShell, PickCardStep, SummaryStep } from "@/platform/components/flow";
import { IntakeFormStep } from "@/platform/components/flow/steps/IntakeFormStep";
import type { GuidedFlowDefinition, GuidedFlowStepComponentProps } from "@/platform/lib/guidedFlow";
import { createBrandDna } from "@/platform/lib/brandDna";
import { buildZip, downloadBlob } from "@/platform/lib/archive";
import { createDeliverable, deleteDeliverable, deleteDeliverables, listDeliverables, saveDeliverable } from "@/platform/lib/deliverables";
import { setSeedContext, type SeedTarget } from "@/platform/lib/seedContext";
import { api } from "@/platform/lib/ipc";
import { loadRouterConfig, routeProvider } from "@/platform/lib/providers";
import type { ProviderId } from "@/platform/lib/types";
import { STUDIO_MODES } from "@/platform/lib/settings";
import { cn } from "@/platform/lib/utils";
import { useAppStore } from "@/platform/store/useAppStore";
import { deleteCampaign, listCampaigns, saveCampaign } from "@/apps/campaign/lib/campaignStore";
import { buildCampaignConcept, buildCampaignStrategy } from "@/apps/campaign/lib/strategy";
import { generatePlan, produceNativeCopy } from "@/apps/campaign/lib/planGenerator";
import { buildCampaignMarkdown, buildPlanCsv, buildStrategyPdf } from "@/apps/campaign/lib/packageExport";
import type { CampaignChannel, CampaignEffort, CampaignPlanItem, CampaignProject } from "@/apps/campaign/lib/types";
import type { CampaignConcept, CampaignStrategy } from "@/apps/campaign/lib/types";
import { CAMPAIGN_COPY_SCHEMA, CAMPAIGN_IDEA_SCHEMA, parseCampaignCopy, parseCampaignIdea } from "@/apps/campaign/lib/campaignAi";
import { buildSeedContext } from "@/apps/campaign/lib/seed";

interface CampaignFlowState {
  name: string;
  product: string;
  productDescription: string;
  goal: string;
  audience: string;
  launchDate: string;
  effort: CampaignEffort;
  brandName: string;
  brandTone: string;
  strategy?: CampaignStrategy;
  concept?: CampaignConcept;
}

const todayPlus = (days: number) => { const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); };
const INITIAL: CampaignFlowState = { name: "New Launch Campaign", product: "", productDescription: "", goal: "Launch with clarity and convert early interest", audience: "", launchDate: todayPlus(30), effort: "small", brandName: "", brandTone: "confident, specific, human" };
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "campaign";

async function generateStructured(prompt: string, schema: string) {
  const config = loadRouterConfig();
  if (config.mode === "local") return null;
  const statuses = await api.getProviderKeyStatuses();
  const configured = new Set<ProviderId>(statuses.filter((status) => status.configured).map((status) => status.provider));
  const provider = routeProvider("text", config, configured);
  return provider === "gemini" ? api.generateStructuredText(provider, prompt, schema) : null;
}

function ProductStep({ state, patch }: GuidedFlowStepComponentProps<CampaignFlowState>) {
  return <IntakeFormStep value={{ name: state.name, product: state.product, productDescription: state.productDescription, brandName: state.brandName, brandTone: state.brandTone }} onChange={(next) => patch({ name: next.name ?? "", product: next.product ?? "", productDescription: next.productDescription ?? "", brandName: next.brandName ?? "", brandTone: next.brandTone ?? "" })} fields={[
    { id: "name", label: "Campaign name", placeholder: "Summer launch" },
    { id: "product", label: "Product / offer", placeholder: "Aura Lip Oil" },
    { id: "productDescription", label: "What are we launching?", type: "textarea", placeholder: "Describe the product, differentiator, and customer outcome." },
    { id: "brandName", label: "Brand", placeholder: "Maison Vale" },
    { id: "brandTone", label: "Brand voice", placeholder: "confident, specific, human" },
  ]} />;
}

function GoalStep({ state, patch }: GuidedFlowStepComponentProps<CampaignFlowState>) {
  return <IntakeFormStep value={{ goal: state.goal, launchDate: state.launchDate }} onChange={(next) => patch({ goal: next.goal ?? "", launchDate: next.launchDate ?? "" })} fields={[{ id: "goal", label: "Campaign goal", type: "textarea", placeholder: "What must this launch achieve?" }, { id: "launchDate", label: "Launch date", placeholder: "YYYY-MM-DD" }]} />;
}

function AudienceStep({ state, patch }: GuidedFlowStepComponentProps<CampaignFlowState>) {
  return <IntakeFormStep value={{ audience: state.audience }} onChange={(next) => patch({ audience: next.audience ?? "" })} fields={[{ id: "audience", label: "Primary audience", type: "textarea", placeholder: "Who needs to care, and what tension are they feeling now?" }]} />;
}

function IdeaStep({ state, patch }: GuidedFlowStepComponentProps<CampaignFlowState>) {
  const strategy = state.strategy ?? buildCampaignStrategy(state.product || "The product", state.productDescription, state.audience || "the primary audience", state.goal);
  const concept = state.concept ?? buildCampaignConcept(state.product || "The product", strategy);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const draft = async () => { setBusy(true); setNote(""); try { const raw = await generateStructured(`Act as a senior integrated campaign strategist. Product: ${state.product}. Description: ${state.productDescription}. Audience: ${state.audience}. Goal: ${state.goal}. Brand voice: ${state.brandTone}. Create one specific strategy and one ownable campaign concept. Do not invent statistics or testimonials.`, CAMPAIGN_IDEA_SCHEMA); if (!raw) { patch({ strategy, concept }); setNote("Local campaign strategy ready."); } else { const parsed = parseCampaignIdea(raw); patch(parsed); setNote("Studio campaign strategy passed schema validation."); } } catch (error) { setNote(error instanceof Error ? `${error.message} Keeping the local strategy.` : "Keeping the local strategy."); } finally { setBusy(false); } };
  return <div className="space-y-3"><div className="flex justify-end"><Button variant="secondary" onClick={draft} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Sparkles />} Draft campaign platform</Button></div>{note ? <p className="text-xs text-muted">{note}</p> : null}<div className="grid gap-3 md:grid-cols-2"><Card><CardHeader><CardTitle>{concept.bigIdea}</CardTitle><CardDescription>Campaign idea</CardDescription></CardHeader><CardContent><p className="text-xl font-semibold">{concept.tagline}</p><p className="mt-3 text-sm text-muted">{concept.visualWorld}</p></CardContent></Card><Card><CardHeader><CardTitle>Message system</CardTitle></CardHeader><CardContent className="space-y-2">{strategy.pillars.map((pillar) => <div key={pillar} className="rounded-md bg-elevated p-3 text-sm">{pillar}</div>)}</CardContent></Card></div></div>;
}

function AssetsStep({ state, patch }: GuidedFlowStepComponentProps<CampaignFlowState>) {
  return <PickCardStep value={state.effort} onChange={(id) => patch({ effort: id as CampaignEffort })} options={[
    { id: "small", title: "Focused Launch", description: "8 essential deliverables across five channels.", badge: "S" },
    { id: "medium", title: "Full Launch", description: "11 deliverables with proof and follow-up coverage.", badge: "M" },
    { id: "large", title: "Launch + Sustain", description: "14 deliverables extending beyond launch week.", badge: "L" },
  ]} />;
}

function TimelineStep({ state }: GuidedFlowStepComponentProps<CampaignFlowState>) {
  return <SummaryStep title="Date-ordered launch sequence" items={[{ label: "Tease", value: "Two weeks before launch" }, { label: "Reveal", value: "Launch week" }, { label: "Convert", value: "Launch day through day 3" }, { label: "Sustain", value: "Week one and beyond" }, { label: "Launch date", value: state.launchDate }]} />;
}

function LaunchKitStep({ state }: GuidedFlowStepComponentProps<CampaignFlowState>) {
  const counts = state.effort === "small" ? 8 : state.effort === "medium" ? 11 : 14;
  return <SummaryStep title="Create the campaign launch kit" items={[{ label: "Campaign", value: state.name }, { label: "Product", value: state.product }, { label: "Deliverables", value: `${counts} planned assets` }, { label: "Channels", value: "Glam, Web, Motion, Social, Email" }, { label: "Package", value: "Strategy PDF, plan CSV, native copy, prompts" }]} />;
}

function createCampaign(state: CampaignFlowState): CampaignProject {
  const id = crypto.randomUUID();
  const strategy = state.strategy ?? buildCampaignStrategy(state.product, state.productDescription, state.audience, state.goal);
  const concept = state.concept ?? buildCampaignConcept(state.product, strategy);
  const brand = createBrandDna({ name: state.brandName || `${state.product} Brand`, tone: state.brandTone, productLine: state.product, tagline: concept.tagline, palette: concept.palette });
  const now = new Date().toISOString();
  return saveCampaign({ id, name: state.name || `${state.product} Launch`, product: state.product, productDescription: state.productDescription, goal: state.goal, audience: state.audience, launchDate: state.launchDate, effort: state.effort, brand, strategy, concept, plan: generatePlan(id, strategy, state.effort), createdAt: now, updatedAt: now });
}

const CHANNEL_META: Record<CampaignChannel, { label: string; icon: React.ReactNode }> = {
  glam: { label: "Glam", icon: <Image className="h-4 w-4" /> }, web: { label: "Web", icon: <Globe2 className="h-4 w-4" /> }, motion: { label: "Motion", icon: <Video className="h-4 w-4" /> }, social: { label: "Social", icon: <Megaphone className="h-4 w-4" /> }, email: { label: "Email", icon: <Mail className="h-4 w-4" /> },
};

function dueDate(launchDate: string, offset: number) { const date = new Date(`${launchDate}T12:00:00`); date.setDate(date.getDate() + offset); return date.toLocaleDateString(); }

function CampaignWorkbench({ project, onChange }: { project: CampaignProject; onChange: (project: CampaignProject) => void }) {
  const { studioMode, openGlamStudio, openWebStudio, openMotionStudio } = useAppStore();
  const [note, setNote] = useState("");
  const [exporting, setExporting] = useState(false);
  const [busyCopyId, setBusyCopyId] = useState("");
  const deliverables = listDeliverables({ projectId: project.id });
  const statusFor = (item: CampaignPlanItem) => deliverables.find((deliverable) => deliverable.id === item.deliverableId)?.status ?? "planned";
  const persist = (next: CampaignProject) => onChange(saveCampaign(next));
  const produce = async (item: CampaignPlanItem) => {
    if (item.channel !== "social" && item.channel !== "email") return;
    setBusyCopyId(item.id);
    let content = produceNativeCopy(item.title, item.channel, project.product, project.concept.tagline, project.strategy);
    try {
      const raw = await generateStructured(`Write the finished ${item.channel} asset “${item.title}” for ${project.product}. Strategy: ${JSON.stringify(project.strategy)}. Campaign concept: ${JSON.stringify(project.concept)}. Brand voice: ${project.brand.voice.tone}. Never invent statistics, reviews, or scarcity.`, CAMPAIGN_COPY_SCHEMA);
      if (raw) content = parseCampaignCopy(raw);
    } catch (error) {
      setNote(error instanceof Error ? `${error.message} Used local campaign copy.` : "Used local campaign copy.");
    }
    persist({ ...project, plan: project.plan.map((candidate) => candidate.id === item.id ? { ...candidate, content } : candidate) });
    const deliverable = deliverables.find((candidate) => candidate.id === item.deliverableId);
    if (deliverable) saveDeliverable({ ...deliverable, status: "approved", assetRefs: [`campaign-copy:${item.id}`] });
    setNote(`${item.title} produced and approved.`);
    setBusyCopyId("");
  };
  const handoff = (item: CampaignPlanItem, target: SeedTarget) => {
    setSeedContext(target, buildSeedContext(project, item));
    const deliverable = deliverables.find((candidate) => candidate.id === item.deliverableId);
    if (deliverable) saveDeliverable({ ...deliverable, status: "generating" });
    if (target === "glamstudio") openGlamStudio(); else if (target === "webstudio") openWebStudio(); else openMotionStudio();
  };
  const updatePlanItem = (id: string, patch: Partial<CampaignPlanItem>) => {
    const current = project.plan.find((item) => item.id === id);
    if (!current) return;
    persist({ ...project, plan: project.plan.map((item) => item.id === id ? { ...item, ...patch } : item) });
    const deliverable = deliverables.find((item) => item.id === current.deliverableId);
    if (deliverable && patch.title) saveDeliverable({ ...deliverable, title: patch.title });
  };
  const addPlanItem = () => {
    const deliverable = createDeliverable({ moduleId: "campaignstudio", projectId: project.id, kind: "social", format: "social-copy", status: "planned", title: "New campaign deliverable", assetRefs: [] });
    persist({ ...project, plan: [...project.plan, { id: crypto.randomUUID(), deliverableId: deliverable.id, title: deliverable.title, channel: "social", ownerModule: "campaignstudio", dueOffset: 0, brief: project.strategy.keyMessage }] });
  };
  const removePlanItem = (item: CampaignPlanItem) => {
    deleteDeliverable(item.deliverableId);
    persist({ ...project, plan: project.plan.filter((candidate) => candidate.id !== item.id) });
  };
  const exportPackage = async () => {
    setExporting(true);
    try {
      const encoder = new TextEncoder();
      const native = project.plan.filter((item) => item.content);
      const pending = project.plan.filter((item) => !item.content).map((item) => `## ${item.title}\n\nOwner: ${item.ownerModule}\n\n${item.brief}`).join("\n\n");
      const entries = [
        { name: "strategy/strategy.pdf", bytes: buildStrategyPdf(project) },
        { name: "strategy/campaign-plan.md", bytes: encoder.encode(buildCampaignMarkdown(project)) },
        { name: "plan/deliverables.csv", bytes: encoder.encode(buildPlanCsv(project)) },
        { name: "plan/registry.json", bytes: encoder.encode(JSON.stringify(deliverables, null, 2)) },
        { name: "production/pending-prompts.md", bytes: encoder.encode(pending || "All planned copy is produced.") },
        ...native.map((item) => ({ name: `${item.channel}/${slug(item.title)}.txt`, bytes: encoder.encode(item.content ?? "") })),
      ];
      downloadBlob(buildZip(entries), `${slug(project.name)}-launch-kit.zip`);
      setNote(`Launch kit exported with ${entries.length} files.`);
    } finally { setExporting(false); }
  };
  const sorted = [...project.plan].sort((left, right) => left.dueOffset - right.dueOffset);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">{project.name}</h2><p className="text-sm text-muted">{project.concept.bigIdea} · {project.concept.tagline}</p></div><Button onClick={exportPackage} disabled={exporting}>{exporting ? <Loader2 className="animate-spin" /> : <Download />} Export Launch Kit</Button></div>
      {note ? <p className="text-xs text-muted">{note}</p> : null}
      <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>Campaign Strategy</CardTitle><CardDescription>{project.strategy.positioning}</CardDescription></CardHeader><CardContent className="space-y-2">{project.strategy.pillars.map((pillar) => <div key={pillar} className="rounded-md bg-elevated p-3 text-sm">{pillar}</div>)}</CardContent></Card><Card><CardHeader><CardTitle>{project.concept.bigIdea}</CardTitle><CardDescription>Creative platform</CardDescription></CardHeader><CardContent><p className="text-2xl font-semibold">{project.concept.tagline}</p><p className="mt-3 text-sm text-muted">{project.concept.visualWorld}</p></CardContent></Card></div>
      {studioMode !== "director" ? <Card><CardHeader><CardTitle>Strategy & Plan Editor</CardTitle><CardDescription>Changes propagate into handoff seeds and package exports.</CardDescription></CardHeader><CardContent className="space-y-2"><Textarea value={project.strategy.positioning} onChange={(event) => persist({ ...project, strategy: { ...project.strategy, positioning: event.target.value } })} /><Textarea value={project.strategy.keyMessage} onChange={(event) => persist({ ...project, strategy: { ...project.strategy, keyMessage: event.target.value } })} /><Button variant="secondary" onClick={addPlanItem}><Plus /> Add Deliverable</Button></CardContent></Card> : null}
      <div><div className="mb-3 flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /><h3 className="font-semibold">Deliverables & Launch Sequence</h3><Badge>{project.plan.length} items</Badge></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{sorted.map((item) => { const status = statusFor(item); return <Card key={item.id}><CardHeader><div className="flex items-center justify-between"><Badge>{CHANNEL_META[item.channel].label}</Badge><Badge variant={status === "approved" ? "success" : "default"}>{status}</Badge></div>{studioMode !== "director" ? <div className="space-y-2"><Input value={item.title} onChange={(event) => updatePlanItem(item.id, { title: event.target.value })} aria-label="Deliverable title" /><div className="flex gap-2"><Input type="number" value={item.dueOffset} onChange={(event) => updatePlanItem(item.id, { dueOffset: Number(event.target.value) })} aria-label="Due offset days" /><Button size="icon" variant="danger" onClick={() => removePlanItem(item)}><Trash2 /></Button></div></div> : <CardTitle className="mt-2 flex items-center gap-2">{CHANNEL_META[item.channel].icon}{item.title}</CardTitle>}<CardDescription>{dueDate(project.launchDate, item.dueOffset)} · {item.dueOffset >= 0 ? "+" : ""}{item.dueOffset} days</CardDescription></CardHeader><CardContent className="space-y-3"><p className="line-clamp-3 text-xs text-muted">{item.content || item.brief}</p>{item.channel === "social" || item.channel === "email" ? <Button className="w-full" variant={item.content ? "success" : "primary"} disabled={busyCopyId === item.id} onClick={() => produce(item)}>{busyCopyId === item.id ? <Loader2 className="animate-spin" /> : item.content ? <BadgeCheck /> : <Sparkles />}{item.content ? "Produced" : "Produce Copy"}</Button> : item.channel === "glam" ? <Button className="w-full" onClick={() => handoff(item, "glamstudio")}><Send /> Produce in Glam</Button> : item.channel === "web" ? <Button className="w-full" onClick={() => handoff(item, "webstudio")}><Send /> Produce in Web</Button> : <Button className="w-full" variant="secondary" onClick={() => handoff(item, "motionstudio")}><Send /> Open Motion</Button>}</CardContent></Card>; })}</div></div>
    </div>
  );
}

export function CampaignStudio() {
  const { studioMode, setStudioMode } = useAppStore();
  const [projects, setProjects] = useState(() => listCampaigns());
  const [activeId, setActiveId] = useState(() => listCampaigns()[0]?.id ?? "");
  const [flowOpen, setFlowOpen] = useState(() => listCampaigns().length === 0);
  const active = projects.find((project) => project.id === activeId) ?? projects[0] ?? null;
  const definition = useMemo<GuidedFlowDefinition<CampaignFlowState>>(() => ({ id: "campaignstudio.launch", moduleId: "campaignstudio", version: 1, title: "Campaign Studio Magic Flow", description: "Turn one brief into a coherent multi-channel launch plan and production package.", initialState: INITIAL, steps: [
    { id: "product", title: "Product", subtitle: "Brief the agency.", component: ProductStep, validate: (state) => Boolean(state.product.trim() && state.productDescription.trim()) || "Add the product and a short description." },
    { id: "goal", title: "Goal", subtitle: "Define success and the launch date.", component: GoalStep, validate: (state) => Boolean(state.goal.trim() && state.launchDate.trim()) || "Add a goal and launch date." },
    { id: "audience", title: "Audience", subtitle: "Name the customer tension.", component: AudienceStep, validate: (state) => Boolean(state.audience.trim()) || "Describe the audience." },
    { id: "idea", title: "Campaign Idea", subtitle: "Review the strategic and visual platform.", component: IdeaStep },
    { id: "assets", title: "Assets", subtitle: "Scale the multi-channel deliverable plan.", component: AssetsStep },
    { id: "timeline", title: "Timeline", subtitle: "Review the date-ordered sequence.", component: TimelineStep },
    { id: "launch", title: "Launch Kit", subtitle: "Create the campaign project and production board.", component: LaunchKitStep },
  ], onComplete: (state) => { const project = createCampaign(state); setProjects(listCampaigns()); setActiveId(project.id); setFlowOpen(false); } }), []);
  const saveActive = (project: CampaignProject) => { setProjects(listCampaigns()); setActiveId(project.id); };
  const removeActive = () => { if (!active || !confirm(`Delete campaign “${active.name}” and its deliverable plan?`)) return; deleteCampaign(active.id); deleteDeliverables({ projectId: active.id }); const remaining = listCampaigns(); setProjects(remaining); setActiveId(remaining[0]?.id ?? ""); setFlowOpen(remaining.length === 0); };
  return <div className="flex h-full flex-col overflow-y-auto"><header className="border-b border-border px-8 py-5"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grad-gold flex h-10 w-10 items-center justify-center rounded-xl"><Megaphone /></span><div><h1 className="text-lg font-semibold">Campaign Studio</h1><p className="text-xs text-muted">One brief. One campaign DNA. Every specialist studio aligned.</p></div></div><div className="flex gap-2"><Badge variant="primary">{STUDIO_MODES.find((mode) => mode.id === studioMode)?.label}</Badge><Button onClick={() => setFlowOpen(true)}><Plus /> New Campaign</Button></div></div></header><div className="grid gap-5 p-8 xl:grid-cols-[270px_minmax(0,1fr)]"><aside className="space-y-3"><Card><CardHeader><CardTitle>Campaigns</CardTitle><CardDescription>{projects.length} local launch plans</CardDescription></CardHeader><CardContent className="space-y-2">{projects.map((project) => <button key={project.id} onClick={() => { setActiveId(project.id); setFlowOpen(false); }} className={cn("w-full rounded-md border p-3 text-left", active?.id === project.id ? "border-primary bg-primary/10" : "border-border")}><span className="block text-sm font-medium">{project.name}</span><span className="block text-xs text-muted">{project.plan.length} deliverables · {project.launchDate}</span></button>)}</CardContent></Card><Card><CardHeader><CardTitle>Mode</CardTitle></CardHeader><CardContent className="space-y-2">{STUDIO_MODES.map((mode) => <Button key={mode.id} variant={studioMode === mode.id ? "primary" : "secondary"} className="w-full justify-start" onClick={() => setStudioMode(mode.id)}>{mode.label}</Button>)}</CardContent></Card>{active ? <Button variant="danger" className="w-full" onClick={removeActive}><Trash2 /> Delete Campaign</Button> : null}</aside><main className="min-w-0">{flowOpen ? <GuidedFlowShell definition={definition} onExit={() => setFlowOpen(false)} onComplete={() => undefined} /> : active ? <CampaignWorkbench project={active} onChange={saveActive} /> : <Card><CardContent className="flex min-h-96 flex-col items-center justify-center gap-3 text-center"><Megaphone className="h-10 w-10 text-primary" /><h2 className="text-lg font-semibold">Launch with one coherent campaign</h2><p className="max-w-md text-sm text-muted">Strategy, concept, cross-studio deliverables, social and email production, timeline, and package export.</p><Button onClick={() => setFlowOpen(true)}><Sparkles /> Start Campaign Studio</Button></CardContent></Card>}</main></div></div>;
}
