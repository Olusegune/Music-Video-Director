const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, HeadingLevel, BorderStyle, WidthType, ShadingType,
  TableOfContents, PageBreak, PageNumber, Header, Footer,
} = require("docx");

const CONTENT_W = 9360;
const ACCENT = "6D5DFC";
const MUTED = "667085";

// ---- helpers ----------------------------------------------------------------
const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const h3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t)] });
const p = (t, opts = {}) =>
  new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: t, ...opts })] });
const lead = (runs) => new Paragraph({ spacing: { after: 120 }, children: runs });

function bullets(items) {
  return items.map(
    (t) =>
      new Paragraph({
        numbering: { reference: "bul", level: 0 },
        spacing: { after: 40 },
        children: typeof t === "string" ? [new TextRun(t)] : t,
      })
  );
}
function numbered(items) {
  return items.map(
    (t) =>
      new Paragraph({
        numbering: { reference: "num", level: 0 },
        spacing: { after: 40 },
        children: [new TextRun(t)],
      })
  );
}
function code(lines) {
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: CONTENT_W, type: WidthType.DXA },
            shading: { fill: "F4F5F7", type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 160, right: 160 },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "E4E7EC" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "E4E7EC" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "E4E7EC" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "E4E7EC" },
            },
            children: lines.map(
              (l) =>
                new Paragraph({
                  spacing: { after: 0 },
                  children: [new TextRun({ text: l || " ", font: "Consolas", size: 17 })],
                }),
            ),
          }),
        ],
      }),
    ],
  });
}

function table(headers, rows, widths) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(
      (htext, i) =>
        new TableCell({
          borders,
          width: { size: widths[i], type: WidthType.DXA },
          shading: { fill: "EEF0F4", type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: htext, bold: true, size: 19 })] })],
        }),
    ),
  });
  const bodyRows = rows.map(
    (r) =>
      new TableRow({
        children: r.map(
          (cell, i) =>
            new TableCell({
              borders,
              width: { size: widths[i], type: WidthType.DXA },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun({ text: String(cell), size: 19 })] })],
            }),
        ),
      }),
  );
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: widths,
    rows: [headerRow, ...bodyRows],
  });
}
const spacer = () => new Paragraph({ spacing: { after: 80 }, children: [] });

// ---- content ----------------------------------------------------------------
const children = [];

// Cover
children.push(
  new Paragraph({ spacing: { before: 2600, after: 0 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Wheelbarrow MotionForge AI", bold: true, size: 56, color: ACCENT, font: "Arial" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
    children: [new TextRun({ text: "Engineering Handoff Package", size: 30, color: "111111" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 },
    children: [new TextRun({ text: "Local-first Windows AI motion-graphics production studio", italics: true, size: 22, color: MUTED })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400 },
    children: [new TextRun({ text: "Version 2.0  ·  Handoff edition", size: 20, color: MUTED })] }),
  new Paragraph({ children: [new PageBreak()] }),
);

// TOC
children.push(h1("Contents"),
  new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-2" }),
  new Paragraph({ children: [new PageBreak()] }));

// 1. Executive Summary
children.push(h1("1. Executive Summary"));
children.push(lead([
  new TextRun({ text: "One line: ", bold: true }),
  new TextRun("A local Windows app that takes a creator from idea → script → storyboard → camera & lighting → AI image frames → AI video clips → export, in one studio-style workspace, using their own AI provider keys."),
]));
children.push(h3("Where it stands today"));
children.push(p("A working application, not a concept. The full pipeline runs end-to-end and has been validated with live providers (Google Gemini for writing/direction, fal.ai for images and video). It installs as a normal Windows app (.msi / .exe)."));
children.push(p("Already working: projects & autosave; AI creative direction, shot breakdown, camera plan, lighting plan; per-shot image and video generation; upload-your-own-frame; project-wide style presets; brand kits; asset library; export to PDF / Word / Markdown / JSON; light & dark themes; Windows installer."));
children.push(h3("The next priority (this handoff's headline)"));
children.push(p("Give creators professional control of generation: choose the AI model per shot (e.g. FLUX vs Imagen for a frame; Kling vs Veo vs Runway vs Seedance for a clip) and attach reference images/videos (a starting frame, a style or character reference, etc.) — with the interface adapting to whatever the chosen model supports. Architected as a data-driven “model catalog,” so adding a new AI model is a configuration change, not a rebuild."));
children.push(h3("After that (roadmap)"));
children.push(p("Reusable character / environment / prop libraries for true cross-shot consistency → integrated audio (voice, music, SFX) → timeline editing → professional menus, onboarding, and polish. Milestones M1–M6 with estimates are in Section 6."));
children.push(h3("What it needs from here"));
children.push(...bullets([
  "One experienced full-stack engineer (Rust + React) to drive the milestone roadmap.",
  "~2–3 weeks delivers the per-shot model-selection feature on top of the working foundation.",
  "Before public release: code-sign the installer and re-enable a tightened security policy.",
]));
children.push(new Paragraph({ children: [new PageBreak()] }));

// 2. Product Requirements
children.push(h1("2. Product Requirements (PRD)"));
children.push(h2("Vision"));
children.push(p("MotionForge is an AI-powered creative production studio that takes a creator from idea to finished content in one workspace while maintaining style, character, environment, and prop consistency. It is project-centric and professional in feel (Figma / Linear / Frame.io / DaVinci Resolve), not a chat tool. It runs locally on Windows and calls third-party AI providers directly with the user's own API keys."));
children.push(h2("Target users"));
children.push(table(
  ["Persona", "Needs", "Success metric"],
  [
    ["Motion designer", "Storyboards, shot breakdowns, image/video assets", "Faster setup"],
    ["Creative director", "Treatments, consistent look, client-ready output", "Faster approvals"],
    ["AI filmmaker", "Camera/lighting plans, multi-model generation", "Faster production"],
    ["SaaS / marketing", "Product films, explainers, social ads", "Campaign velocity"],
  ],
  [2200, 4560, 2600],
));
children.push(spacer());
children.push(h2("Product principles"));
children.push(...numbered([
  "Visual first — show storyboards, frames, timelines before walls of text.",
  "Project-centric — everything lives in Project → Scene → Shot → Asset/Prompt.",
  "Editable everywhere — every AI output is editable, lockable, regenerable, versioned.",
  "Local-first & private — data on disk, keys in the OS keychain, no mandatory cloud.",
  "Progressive disclosure — hide advanced controls until needed; reduce clutter.",
  "Consistency is the moat — project-wide style + reusable characters/environments/props.",
  "Provider-agnostic — models are configurable; the app orchestrates, it doesn't lock in.",
]));
children.push(h2("Core workflow"));
children.push(code([
  "Idea / Script / Brief",
  "  -> Creative Direction + Style (AI)",
  "  -> Shot Breakdown / Storyboard (AI, editable)",
  "  -> Camera Director + Lighting Director (AI, per shot, editable)",
  "  -> Image frames per shot (chosen model + references)",
  "  -> Video clips per shot (chosen model + references)",
  "  -> Audio (dialogue / music / SFX)            [roadmap]",
  "  -> Timeline edit                              [roadmap]",
  "  -> Export package (PDF / DOCX / MD / JSON / media)",
]));
children.push(spacer());
children.push(h2("Functional requirements — built today"));
children.push(...bullets([
  "Projects + SQLite persistence + autosave (create/list/delete/open).",
  "Prompt Pack generation (Gemini) — structured JSON → editable cards.",
  "Editable three-panel workspace (storyboard / camera / lighting / prompts / exports).",
  "Camera Director and Lighting Director, per shot, fully editable.",
  "Image generation (fal FLUX / Google Imagen) with on-disk assets + display.",
  "Video generation (fal LTX / Google Veo) via async submit → poll → download.",
  "Frame upload override (lock an uploaded image as a shot's frame).",
  "Project Style System (preset/custom) injected into generation.",
  "Brand Kits applied to generation; Asset Library across projects.",
  "Export to PDF / DOCX / Markdown / JSON; light/dark; accessibility; Windows installer.",
]));
children.push(h2("Priority new requirement — per-shot model selection + references"));
children.push(p("For each shot, for both image and video, the user can choose a model from a catalog, attach reference assets in the slots that model supports, and set model-specific parameters — with project-level defaults each shot can override. Full spec in Section 5."));
children.push(h2("Non-goals (for now)"));
children.push(...bullets([
  "No mandatory account/cloud sync (local-first; cloud is a future option).",
  "Not a general video NLE — timeline arranges AI shots, not frame-accurate editing.",
  "No in-app model training/fine-tuning.",
  "No server-side hosting/proxying of provider keys — keys stay on device.",
]));
children.push(new Paragraph({ children: [new PageBreak()] }));

// 3. Architecture
children.push(h1("3. Architecture"));
children.push(p("Local-first desktop app. One React codebase runs in a browser during development and is bundled into a native Windows app by Tauri. All provider/network calls and all persistence go through the Rust core — the WebView frontend never holds an API key (prevents key leakage and CORS, and lets us normalize different provider APIs behind one interface)."));
children.push(h2("Technology stack"));
children.push(...bullets([
  "Frontend: Tauri 2 · Vite 6 · React 19 · TypeScript 5 · Tailwind v4 · shadcn-style UI · Zustand · TanStack Query.",
  "Rust core: tauri 2 · rusqlite (SQLite) · reqwest (rustls) · serde · tokio · keyring (Windows Credential Manager) · uuid · chrono · base64 · printpdf · docx-rs.",
  "Storage: SQLite file + media on disk (app data dir). Secrets in OS keychain (never in DB).",
]));
children.push(h2("Provider layer"));
children.push(p("One trait per capability so vendors are interchangeable. Implementations today: Gemini (text), fal.ai + Google Imagen (image), fal.ai + Google Veo (video). Video uses an internal submit → poll → download loop."));
children.push(code([
  "trait TextProvider  { async fn generate_pack(&self, input) -> Result<PromptPack>; }",
  "trait ImageProvider { async fn generate_image(&self, prompt) -> Result<Vec<u8>>; }",
  "trait VideoProvider { async fn generate_video(&self, prompt) -> Result<Vec<u8>>; }",
]));
children.push(p("Redesign for the priority feature: these single-method, prompt-only traits must evolve to accept a normalized GenerationRequest { model, prompt, references[], params } routed by a model catalog (Section 5)."));
children.push(h2("Security model"));
children.push(...bullets([
  "API keys stored via keyring; commands expose presence only, never values.",
  "Provider calls originate in Rust; the WebView cannot read keys.",
  "Asset protocol scoped to the app data dir; CSP currently disabled to allow remote provider media — re-enable with an allowlist before release.",
]));
children.push(h2("Known architectural debt"));
children.push(...bullets([
  "Generation model is hardcoded — replace with catalog + GenerationRequest (Section 5).",
  "imageUrl/videoUrl store display URLs, not raw paths — store raw asset references for clean portability of .mfp with bundled media.",
  "scenes/shots tables exist but are unused (pack stored as JSON) — normalize when adding reference-linked libraries.",
  "Re-enable a scoped Content-Security-Policy before public release.",
]));
children.push(new Paragraph({ children: [new PageBreak()] }));

// 4. Data model & API
children.push(h1("4. Data Model & IPC API"));
children.push(h2("SQLite schema (current)"));
children.push(...bullets([
  "projects(id, name, description, type, status, aspect_ratio, duration, emotional_tone, created_at, updated_at)",
  "prompt_packs(id, project_id, content_json, version, created_at) — pack stored as JSON; latest = newest; multiple rows = version history.",
  "assets(id, project_id, shot_number, kind[image|video], file_path, source_provider, created_at)",
  "brand_kits(id, name, colors_json, fonts, voice, visual_rules) · settings(key, value)",
  "scenes / shots tables exist but are currently unused.",
]));
children.push(p("API keys are not in SQLite — they live in the OS keychain (service ai.wheelbarrow.motionforge, keyed by provider id)."));
children.push(h2("Pack shape (TypeScript, mirrored in Rust models.rs)"));
children.push(code([
  "PromptPack { creativeDirection, style, shots: ShotBreakdown[], qcChecklist[] }",
  "ShotBreakdown {",
  "  number, name, purpose, duration, visualDescription,",
  "  cameraMovement, transition, audio, locked,",
  "  imageUrl, videoUrl, camera: CameraPlan, lighting: LightingPlan,",
  "  // FEATURE ADDS: imageGen?: ShotGenSettings; videoGen?: ShotGenSettings;",
  "}",
]));
children.push(lead([
  new TextRun({ text: "Rule: ", bold: true }),
  new TextRun("when you add a pack field, add it in BOTH types.ts and models.rs (with #[serde(default)]) or save_pack will strip it on round-trip."),
]));
children.push(h2("IPC commands (selected)"));
children.push(table(
  ["Command", "Args", "Returns"],
  [
    ["list_projects / create_project / delete_project", "— / NewProject / id", "Project[] / Project / —"],
    ["generate_prompt_pack", "projectId, input", "PromptPack"],
    ["get_latest_pack / save_pack", "projectId / projectId, pack", "PromptPack | null / —"],
    ["generate_shot_image / generate_shot_video", "projectId, shotNumber, prompt", "asset path (to rework)"],
    ["import_shot_image", "projectId, shotNumber, dataBase64, ext", "asset path"],
    ["get/set/clear_provider_key", "provider[, key]", "status / —"],
    ["export_project", "projectId, format", "output path"],
    ["list/save/delete_brand_kit", "…", "…"],
    ["versions / duplicate / save_project_file (partial)", "…", "…"],
  ],
  [3700, 3060, 2600],
));
children.push(new Paragraph({ children: [new PageBreak()] }));

// 5. Model selection feature
children.push(h1("5. Per-Shot Model Selection + References"));
children.push(lead([new TextRun({ text: "Priority feature. ", bold: true, color: ACCENT }),
  new TextRun("Touches data model, provider layer, command surface, and generation UI.")]));
children.push(h2("Problem"));
children.push(p("Today each shot uses a single hardcoded model, chosen only by which API key exists. There is no per-shot model choice, no reference inputs, and no model-specific parameters."));
children.push(h2("Goal"));
children.push(p("For each shot, for image and video: choose a model from a catalog, attach reference assets in the slots that model supports, and set model-specific parameters — with a project default each shot can override. The reference slots and parameters shown are driven by the selected model's capability manifest (progressive disclosure)."));
children.push(h2("Model Catalog (capability manifest)"));
children.push(p("A declarative catalog is the backbone. Each entry declares what the model accepts. Adding a model = adding a ModelDef (and a provider adapter only if the provider is new)."));
children.push(code([
  "type Capability = 'image' | 'video';",
  "type RefRole = 'init' | 'style' | 'character' | 'subject' | 'control'",
  "             | 'startFrame' | 'endFrame' | 'refVideo' | 'audio';",
  "",
  "interface RefSlot { role; label; accept:('image'|'video'|'audio')[]; required?; max?; }",
  "interface ParamSpec { key; label; type:'enum'|'number'|'boolean'|'string';",
  "                      options?; min?; max?; step?; default?; }",
  "interface ModelDef {",
  "  id; provider; label; capability; endpointModel;",
  "  refSlots: RefSlot[]; params: ParamSpec[]; notes?;",
  "}",
  "const MODEL_CATALOG: ModelDef[] = [ /* FLUX, Imagen, Kling, Veo, Runway, Seedance ... */ ];",
]));
children.push(h2("Data model additions"));
children.push(code([
  "interface ShotReference { role: RefRole; assetId: string; }",
  "interface ShotGenSettings {",
  "  modelId: string;                 // '' = use project default",
  "  params: Record<string, string|number|boolean>;",
  "  references: ShotReference[];",
  "}",
  "// ShotBreakdown gains: imageGen?: ShotGenSettings; videoGen?: ShotGenSettings;",
  "// Project gains defaults: { imageModelId, imageParams, videoModelId, videoParams }",
  "// Effective = project defaults merged with shot overrides (shot wins per key).",
]));
children.push(h2("Normalized generation request (Rust)"));
children.push(code([
  "struct ResolvedRef { role: String, bytes: Vec<u8>, mime: String }",
  "struct GenerationRequest { model: ModelDef, prompt: String,",
  "                           references: Vec<ResolvedRef>, params: serde_json::Value }",
  "trait ImageProvider { async fn generate_image(&self, req:&GenerationRequest)->Result<Vec<u8>>; }",
  "trait VideoProvider { async fn generate_video(&self, req:&GenerationRequest)->Result<Vec<u8>>; }",
]));
children.push(p("Command flow: receive modelId + prompt + references[{role, assetId}] + params → resolve ModelDef from catalog → validate refs/params → load reference bytes from the assets table → build GenerationRequest → dispatch to the provider adapter → persist result + record the modelId on the asset."));
children.push(h2("Provider adapter contract (reference delivery)"));
children.push(...bullets([
  "fal.ai: upload reference bytes to fal storage to get URLs, then pass as image_url / start_image_url / etc. Video uses the queue API (submit → poll → download) — generalize the existing implementation.",
  "Google (Imagen/Veo): base64 image where supported; Veo via long-running operations polling (drafted).",
  "Runway / Kling / Seedance / Pika / Luma: add adapters as needed; same contract.",
  "Adapters map RefRole → provider field, enforce ModelDef constraints, translate params, normalize errors.",
]));
children.push(h2("UI / UX"));
children.push(...bullets([
  "A per-shot Generation section (Image and Video sub-sections) plus a project Generation Defaults panel.",
  "Model dropdown grouped by provider; models whose provider key is missing are disabled with a link to Settings.",
  "On model select, render ONLY that model's reference slots and parameters.",
  "Reference slots accept declared types from upload AND from the Asset Library (later: character/environment/prop libraries).",
  "Generate disabled until required refs/params are satisfied; show progress (video: queued → processing → downloading).",
  "Inheritance affordance: 'Using project default' until overridden; reset control. Collapse by default (declutter).",
]));
children.push(h2("Acceptance criteria"));
children.push(...bullets([
  "Different image model and video model selectable per shot.",
  "Reference slots match the selected model; invalid inputs can't be attached.",
  "References can come from upload and from existing project assets.",
  "Params validate against the manifest; defaults apply to new shots; per-shot override wins; reset works.",
  "Models with a missing provider key are disabled with a path to Settings.",
  "Each generated asset records the modelId used.",
  "Adding a new model = a catalog entry (+ adapter only if a new provider).",
]));
children.push(new Paragraph({ children: [new PageBreak()] }));

// 6. Dev plan
children.push(h1("6. Development Plan"));
children.push(h2("Current state"));
children.push(table(
  ["Area", "Status"],
  [
    ["App shell, projects, persistence, autosave", "Built"],
    ["Prompt Pack generation (Gemini) + editable workspace", "Built"],
    ["Camera & Lighting directors", "Built"],
    ["Image generation (fal / Imagen)", "Built"],
    ["Video generation (fal / Veo)", "Built"],
    ["Frame upload override · Style System · Brand Kits · Asset Library", "Built"],
    ["Export (PDF/DOCX/MD/JSON) · themes · a11y · installer", "Built"],
    ["Per-shot model selection + references", "PRIORITY — not started"],
    ["Project files / versioning (Save/Open/Save As/Duplicate/versions)", "Partial"],
    ["Character / Environment / Prop libraries", "Not started"],
    ["Integrated audio · Timeline · Native menus · Onboarding", "Not started"],
  ],
  [6760, 2600],
));
children.push(spacer());
children.push(h2("Milestone roadmap"));
children.push(table(
  ["Milestone", "Scope", "Est."],
  [
    ["M1 Foundation", "Finish project files & versioning UI; decide pack storage", "0.5–1 wk"],
    ["M2 Model selection", "Catalog + GenerationRequest + capability-driven UI (PRIORITY)", "1.5–2.5 wk"],
    ["M3 Consistency", "Character / Environment / Prop libraries + reference injection", "2–3 wk"],
    ["M4 Audio", "Dialogue/voice, music, SFX adapters; attach to shots", "2–3 wk"],
    ["M5 Timeline", "Arrange/trim/reorder shots + audio; export sequence", "2–3 wk"],
    ["M6 Shell & release", "Native menus, splash hub, onboarding, CSP, code-signing", "1–2 wk"],
  ],
  [1900, 5360, 2100],
));
children.push(spacer());
children.push(h2("Key risks & mitigations"));
children.push(...bullets([
  "Provider APIs/model ids change often → keep the catalog data-driven; confirm ids at integration.",
  "'Perfect' character consistency expectation → communicate 'strong, not perfect'; use refs + seeds + descriptions.",
  "Reference delivery differs per provider → the adapter contract owns it (URL upload vs base64).",
  "Long video jobs → bounded polling + clear progress + cancel.",
  "Cross-machine media portability → store raw asset refs; bundle assets in .mfp.",
  "Unsigned installer SmartScreen warnings → code-sign before distribution.",
]));
children.push(new Paragraph({ children: [new PageBreak()] }));

// 7. Setup
children.push(h1("7. Setup & Build"));
children.push(h2("Prerequisites (Windows)"));
children.push(...numbered([
  "Node.js >= 20 and npm.",
  "Rust (stable) via rustup.rs.",
  "MSVC C++ build tools (“Desktop development with C++”).",
  "WebView2 runtime (preinstalled on Windows 11).",
]));
children.push(h2("Commands"));
children.push(code([
  "npm install",
  "npm run dev          # frontend only (browser mock, no Rust)",
  "npm run tauri dev    # full native app, live Rust backend + hot reload",
  "npm run build        # type-check + production frontend build",
  "npm run tauri build  # Windows installers (MSI + NSIS)",
]));
children.push(h2("Conventions"));
children.push(...bullets([
  "Adding a pack field: update types.ts AND models.rs (serde default).",
  "New command: implement in commands.rs, register in lib.rs, add wrapper + mock in ipc.ts.",
  "Provider calls go in Rust only; never read a key from the frontend.",
  "Verify before done: npm run build + cargo check clean; test in tauri dev with a real key.",
]));
children.push(h2("Data locations (Windows)"));
children.push(...bullets([
  "DB + media: %APPDATA%\\ai.wheelbarrow.motionforge\\ (media under assets/{projectId}/).",
  "Exports: …\\exports\\. API keys: Windows Credential Manager (service ai.wheelbarrow.motionforge).",
]));
children.push(spacer());
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 300 },
  children: [new TextRun({ text: "Full markdown sources: docs/handoff/  —  PRD, ARCHITECTURE, DATA_MODEL_AND_API, FEATURE_MODEL_SELECTION, DEV_PLAN, SETUP, GITHUB_ISSUES.", italics: true, size: 18, color: MUTED })] }));

// ---- document ---------------------------------------------------------------
const doc = new Document({
  creator: "Wheelbarrow Studios",
  title: "Wheelbarrow MotionForge AI — Engineering Handoff",
  styles: {
    default: { document: { run: { font: "Arial", size: 21 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: ACCENT },
        paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 25, bold: true, font: "Arial", color: "111111" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, font: "Arial", color: "333333" },
        paragraph: { spacing: { before: 140, after: 60 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bul", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 540, hanging: 280 } } } }] },
      { reference: "num", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 540, hanging: 280 } } } }] },
    ],
  },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    footers: {
      default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Wheelbarrow MotionForge AI — Engineering Handoff   ·   Page ", size: 16, color: MUTED }),
                   new TextRun({ children: [PageNumber.CURRENT], size: 16, color: MUTED })] })] }),
    },
    children,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("../Wheelbarrow_MotionForge_Handoff.docx", buf);
  console.log("wrote Wheelbarrow_MotionForge_Handoff.docx");
});
