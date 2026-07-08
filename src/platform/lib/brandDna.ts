export interface BrandDna {
  id: string;
  name: string;
  palette: string[];
  fonts: {
    heading: string;
    body: string;
  };
  voice: {
    tone: string;
    taglines: string[];
    bannedWords: string[];
  };
  productLines: string[];
  logoRefs: string[];
  createdAt: string;
  updatedAt: string;
}

const LS_BRAND_DNA = "mf.brandDna";

function readBrands(): BrandDna[] {
  try {
    const raw = localStorage.getItem(LS_BRAND_DNA);
    return raw ? (JSON.parse(raw) as BrandDna[]) : [];
  } catch {
    return [];
  }
}

function writeBrands(brands: BrandDna[]) {
  try {
    localStorage.setItem(LS_BRAND_DNA, JSON.stringify(brands));
  } catch {
    /* ignore */
  }
}

export function listBrandDna(): BrandDna[] {
  return readBrands();
}

export function getBrandDna(id?: string | null): BrandDna | null {
  if (!id) return null;
  return readBrands().find((brand) => brand.id === id) ?? null;
}

export function saveBrandDna(brand: BrandDna): BrandDna {
  const timestamp = new Date().toISOString();
  const next = {
    ...brand,
    updatedAt: timestamp,
    createdAt: brand.createdAt || timestamp,
  };
  const brands = readBrands();
  const index = brands.findIndex((item) => item.id === brand.id);
  if (index >= 0) brands[index] = next;
  else brands.unshift(next);
  writeBrands(brands);
  return next;
}

export function createBrandDna(input: {
  name: string;
  tone?: string;
  palette?: string[];
  productLine?: string;
  tagline?: string;
}): BrandDna {
  const timestamp = new Date().toISOString();
  return saveBrandDna({
    id: crypto.randomUUID(),
    name: input.name || "Untitled Brand",
    palette: input.palette?.length
      ? input.palette
      : ["#111827", "#F8FAFC", "#C084FC", "#F59E0B"],
    fonts: {
      heading: "Editorial display",
      body: "Clean sans",
    },
    voice: {
      tone: input.tone || "premium, concise, confident",
      taglines: input.tagline ? [input.tagline] : [],
      bannedWords: [],
    },
    productLines: input.productLine ? [input.productLine] : [],
    logoRefs: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}
