import { Badge } from "@/platform/components/ui/badge";
import { cn } from "@/platform/lib/utils";
import type { GuidedFlowStepComponentProps } from "@/platform/lib/guidedFlow";
import type { GlamFlowState, LuxuryLook } from "@/apps/glam-studio/lib/glamStore";
import { glamReadStored } from "@/apps/glam-studio/lib/glamStore";

const LS_GLAM_LOOKS = "mf.glam.looks";

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

function readSavedLooks(): LuxuryLook[] {
  return glamReadStored<LuxuryLook>(LS_GLAM_LOOKS);
}

export function LookStep({ state, patch }: GuidedFlowStepComponentProps<GlamFlowState>) {
  const looks = [
    ...readSavedLooks(),
    ...LOOKS.filter((look) => !readSavedLooks().some((saved) => saved.id === look.id)),
  ];
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {looks.map((look) => (
        <button
          key={look.id}
          type="button"
          onClick={() => patch({ lookId: look.id })}
          className={cn(
            "overflow-hidden rounded-[var(--radius-card)] border bg-surface text-left transition hover:border-primary/50",
            state.lookId === look.id ? "border-primary" : "border-border"
          )}
        >
          <div
            className="h-28"
            style={{
              background: `linear-gradient(135deg, ${look.palette[0]}, ${look.palette[1]} 42%, ${look.palette[2]} 70%, ${look.palette[3]})`,
            }}
          />
          <div className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold">{look.name}</div>
              {state.lookId === look.id ? <Badge variant="primary">Selected</Badge> : null}
            </div>
            <p className="mt-1 text-xs text-muted">{look.family}</p>
            <p className="mt-3 text-xs text-muted">{look.set}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
