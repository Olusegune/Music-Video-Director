import { Badge } from "@/platform/components/ui/badge";
import { IntakeFormStep } from "@/platform/components/flow/steps/IntakeFormStep";
import { PickCardStep } from "@/platform/components/flow";
import type { GuidedFlowStepComponentProps } from "@/platform/lib/guidedFlow";
import type { GlamFlowState, ProductCategory } from "@/apps/glam-studio/lib/glamStore";

const CATEGORIES: { id: ProductCategory; title: string; description: string }[] = [
  {
    id: "beauty",
    title: "Beauty",
    description: "Skincare, makeup, haircare, and cosmetic launches.",
  },
  {
    id: "fashion",
    title: "Fashion",
    description: "Apparel drops, accessories, lookbook assets, and capsule collections.",
  },
  {
    id: "jewelry",
    title: "Jewelry",
    description: "Precious details, macro shine, heirloom positioning.",
  },
  {
    id: "fragrance",
    title: "Fragrance",
    description: "Bottle hero shots, mood worlds, and sensual storytelling.",
  },
  { id: "wellness", title: "Wellness", description: "Clean, credible, sensory product campaigns." },
  {
    id: "tech-luxury",
    title: "Luxury Tech",
    description: "Premium hardware, devices, and high-spec products.",
  },
];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      resolve(dataUrl.includes(",") ? dataUrl.slice(dataUrl.indexOf(",") + 1) : dataUrl);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read product image."));
    reader.readAsDataURL(file);
  });
}

export function ProductStep({ state, patch }: GuidedFlowStepComponentProps<GlamFlowState>) {
  return (
    <div className="space-y-4">
      <IntakeFormStep
        value={{
          projectName: state.projectName,
          productName: state.productName,
          productDescription: state.productDescription,
          audience: state.audience,
          materials: state.materials,
          colors: state.colors,
          packaging: state.packaging,
          productClaims: state.productClaims,
          fidelityNotes: state.fidelityNotes,
        }}
        onChange={(next) =>
          patch({
            projectName: next.projectName ?? "",
            productName: next.productName ?? "",
            productDescription: next.productDescription ?? "",
            audience: next.audience ?? "",
            materials: next.materials ?? "",
            colors: next.colors ?? "",
            packaging: next.packaging ?? "",
            productClaims: next.productClaims ?? "",
            fidelityNotes: next.fidelityNotes ?? "",
          })
        }
        fields={[
          { id: "projectName", label: "Project name", placeholder: "Summer lip oil launch" },
          { id: "productName", label: "Product name", placeholder: "Maison Vale Lip Oil" },
          {
            id: "productDescription",
            label: "Product truth",
            type: "textarea",
            placeholder: "What is it, what matters visually, and what must stay accurate?",
          },
          { id: "audience", label: "Audience", placeholder: "Modern luxury beauty buyers..." },
          {
            id: "materials",
            label: "Materials",
            placeholder: "glass, chrome cap, translucent oil",
          },
          { id: "colors", label: "Product colors", placeholder: "rose, amber, clear" },
          { id: "packaging", label: "Packaging", placeholder: "matte ivory carton with gold foil" },
          {
            id: "productClaims",
            label: "Allowed claims",
            placeholder: "vegan, fragrance-free, refillable",
          },
          {
            id: "fidelityNotes",
            label: "Must preserve",
            type: "textarea",
            placeholder: "Logo placement, cap shape, exact product proportions...",
          },
        ]}
      />
      <label className="block rounded-[var(--radius-card)] border border-dashed border-border bg-elevated/40 p-4">
        <span className="text-sm font-semibold">Product reference photos</span>
        <span className="mt-1 block text-xs text-muted">
          Optional. Stored inside the local Glam project memory.
        </span>
        <input
          type="file"
          accept="image/*"
          multiple
          className="mt-3 block w-full text-sm"
          onChange={async (event) => {
            const files = Array.from(event.target.files ?? []);
            if (!files.length) return;
            const data = await Promise.all(files.map(fileToDataUrl));
            patch({
              productPhotoNames: [...state.productPhotoNames, ...files.map((file) => file.name)],
              productPhotoData: [...state.productPhotoData, ...data],
            });
          }}
        />
      </label>
      {state.productPhotoNames.length ? (
        <div className="flex flex-wrap gap-2">
          {state.productPhotoNames.map((name) => (
            <Badge key={name}>{name}</Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CategoryStep({ state, patch }: GuidedFlowStepComponentProps<GlamFlowState>) {
  return (
    <PickCardStep
      value={state.category || undefined}
      onChange={(id) => patch({ category: id as ProductCategory })}
      options={CATEGORIES.map((category) => ({
        id: category.id,
        title: category.title,
        description: category.description,
        visual: (
          <span className="block h-full w-full bg-[radial-gradient(circle_at_70%_35%,rgba(255,255,255,.25),transparent_24%),linear-gradient(135deg,rgba(243,201,105,.28),rgba(139,92,246,.18),rgba(0,0,0,.18))]" />
        ),
      }))}
    />
  );
}

export function BrandStep({ state, patch }: GuidedFlowStepComponentProps<GlamFlowState>) {
  return (
    <IntakeFormStep
      value={{ brandName: state.brandName, brandTone: state.brandTone, tagline: state.tagline }}
      onChange={(next) =>
        patch({
          brandName: next.brandName ?? "",
          brandTone: next.brandTone ?? "",
          tagline: next.tagline ?? "",
        })
      }
      fields={[
        { id: "brandName", label: "Brand name", placeholder: "Maison Vale" },
        {
          id: "brandTone",
          label: "Brand voice",
          placeholder: "quiet luxury, sensual, clinical...",
        },
        { id: "tagline", label: "Tagline / headline direction", placeholder: "Optional" },
      ]}
    />
  );
}
