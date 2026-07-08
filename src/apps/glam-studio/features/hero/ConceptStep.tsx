import { Badge } from "@/platform/components/ui/badge";
import { cn } from "@/platform/lib/utils";
import type { GuidedFlowStepComponentProps } from "@/platform/lib/guidedFlow";
import type { CampaignConcept, GlamFlowState, LuxuryLook } from "@/apps/glam-studio/lib/glamStore";
import { glamReadStored } from "@/apps/glam-studio/lib/glamStore";

const LS_GLAM_CONCEPTS = "mf.glam.concepts";

const LOOKS: LuxuryLook[] = [
  {
    id: "noir-editorial",
    name: "Noir Editorial",
    family: "Beauty / fashion",
    palette: ["#050509", "#F8FAFC", "#D4AF37", "#8B5CF6"],
    set: "black lacquer set with mirror reflections",
    lighting: "hard rim light, soft frontal beauty fill",
    lens: "85mm editorial compression",
  },
  {
    id: "golden-hour-atelier",
    name: "Golden Hour Atelier",
    family: "Skincare / fragrance",
    palette: ["#281A12", "#F8E7C7", "#F59E0B", "#FDF2F8"],
    set: "warm plaster studio with silk and glass props",
    lighting: "late sun streaks with polished highlights",
    lens: "macro closeups and tactile product crops",
  },
  {
    id: "clinical-minimal",
    name: "Clinical Minimal",
    family: "Wellness / skincare",
    palette: ["#F8FAFC", "#DDEAF6", "#0F172A", "#38BDF8"],
    set: "white laboratory plinths and translucent acrylic",
    lighting: "clean high-key gradients",
    lens: "precise packshot lensing",
  },
  {
    id: "neon-tech",
    name: "Neon Tech",
    family: "Luxury tech / street",
    palette: ["#030712", "#22D3EE", "#A855F7", "#FB7185"],
    set: "glossy black tabletop with neon glass",
    lighting: "cyan-magenta edge lights and smoke",
    lens: "low-angle cinematic macro",
  },
  {
    id: "baroque-opulence",
    name: "Baroque Opulence",
    family: "Jewelry / fragrance",
    palette: ["#160B12", "#7C2D12", "#D4AF37", "#F5E6C8"],
    set: "carved stone, velvet, antique mirror, and restrained gilt details",
    lighting: "painterly chiaroscuro with warm jewel highlights",
    lens: "cinematic 50mm with selective macro inserts",
  },
  {
    id: "automotive-cinematic",
    name: "Automotive Cinematic",
    family: "Luxury tech / hardware",
    palette: ["#020617", "#334155", "#94A3B8", "#EF4444"],
    set: "architectural concrete stage with wet reflections and precision light strips",
    lighting: "long specular highlights and controlled volumetric haze",
    lens: "24mm low hero angle with 85mm detail coverage",
  },
  {
    id: "soft-monochrome",
    name: "Soft Monochrome",
    family: "Fashion / wellness",
    palette: ["#FAF7F2", "#D6D3D1", "#78716C", "#292524"],
    set: "tonal paper architecture, soft fabric, and quiet negative space",
    lighting: "large diffused source with delicate contact shadows",
    lens: "70mm natural compression and calm editorial framing",
  },
  {
    id: "crystal-futurism",
    name: "Crystal Futurism",
    family: "Beauty / luxury tech",
    palette: ["#07111F", "#CFFAFE", "#67E8F9", "#E879F9"],
    set: "prismatic glass, liquid chrome, and translucent geometric plinths",
    lighting: "cool caustics with iridescent edge separation",
    lens: "sharp macro optics with wide crystalline establishing shots",
  },
];

function readSavedConcepts(): CampaignConcept[] {
  return glamReadStored<CampaignConcept>(LS_GLAM_CONCEPTS);
}

function readSavedLooks(): LuxuryLook[] {
  return glamReadStored<LuxuryLook>("mf.glam.looks");
}

function lookById(id: string): LuxuryLook {
  return [...readSavedLooks(), ...LOOKS].find((look) => look.id === id) ?? LOOKS[0];
}

function conceptsFor(state: GlamFlowState): CampaignConcept[] {
  const product = state.productName || "the product";
  const audience = state.audience || "style-conscious customers";
  const look = lookById(state.lookId);
  return [
    {
      id: "concept-1",
      territory: "The Signature Object",
      headline: state.tagline || `${product} becomes the room's quiet obsession`,
      visualDirection: `${look.name}: isolate ${product} as a sculptural hero on ${look.set}.`,
      shotList: [
        "Macro texture reveal",
        "Hero packshot on set",
        "Lifestyle crop with negative space",
        "Format-safe headline crop",
      ],
      score: 91,
    },
    {
      id: "concept-2",
      territory: "Ritual Of Arrival",
      headline: `Made for the moment ${audience} step into`,
      visualDirection:
        "Build a polished ritual sequence around touch, reveal, and brand color accents.",
      shotList: [
        "Hands entering frame",
        "Product opening / reveal",
        "Texture or material moment",
        "Approved hero crop",
      ],
      score: 86,
    },
    {
      id: "concept-3",
      territory: "Future Classic",
      headline: `${product}, designed to feel inevitable`,
      visualDirection:
        "Pair minimal set geometry with premium light control and confident type overlays.",
      shotList: [
        "Symmetric packshot",
        "Shadow detail",
        "Color-world variant",
        "Campaign hero layout",
      ],
      score: 84,
    },
  ];
}

export function ConceptStep({ state, patch }: GuidedFlowStepComponentProps<GlamFlowState>) {
  const concepts = [
    ...readSavedConcepts(),
    ...conceptsFor(state).filter(
      (concept) => !readSavedConcepts().some((saved) => saved.id === concept.id)
    ),
  ];
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {concepts.map((concept) => (
        <button
          key={concept.id}
          type="button"
          onClick={() => patch({ conceptId: concept.id })}
          className={cn(
            "rounded-[var(--radius-card)] border bg-surface p-4 text-left transition hover:border-primary/50",
            state.conceptId === concept.id ? "border-primary bg-primary/10" : "border-border"
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">{concept.territory}</span>
            <Badge variant={concept.score >= 90 ? "success" : "default"}>{concept.score}</Badge>
          </div>
          <p className="mt-3 text-lg font-semibold leading-snug">{concept.headline}</p>
          <p className="mt-3 text-xs leading-5 text-muted">{concept.visualDirection}</p>
          <ul className="mt-3 space-y-1 text-xs text-muted">
            {concept.shotList.map((shot) => (
              <li key={shot}>- {shot}</li>
            ))}
          </ul>
        </button>
      ))}
    </div>
  );
}
