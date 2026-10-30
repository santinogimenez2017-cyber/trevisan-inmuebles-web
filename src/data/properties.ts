// Property types and pure helpers. The listings themselves live in Supabase (supabase_schema.sql /
// supabase_seed.sql) and are read through the hooks in src/hooks/useProperties.ts.

export type PropertyOperation = 'venta' | 'alquiler';
export type PropertyType = 'casa' | 'departamento' | 'terreno' | 'local' | 'ph' | 'oficina';
export type Currency = 'USD' | 'ARS';

export interface Property {
  id: string;
  slug: string;
  operation: PropertyOperation;
  type: PropertyType;
  title: string;
  address: string;
  neighborhood: string;
  city: string;
  province: string;
  price: number;       // 0 = precio a consultar
  currency: Currency;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;       // m²
  coveredArea?: number;
  parking?: number;
  description: string;
  features: string[];
  images: string[];    // the first one is the cover
  featured: boolean;
  status?: string;     // card badge, e.g. "A estrenar", "En pozo"
  latitude?: number | null;
  longitude?: number | null;
  createdAt: string;
}

// ── Derived data ───────────────────────────────────────────────────────────
/** Presentation photo of a listing (the first image: the cover is stored first in Supabase). */
export const coverOf = (p: Property): string => p.images[0];

/** Picks the best listing to illustrate a group: featured first, then the one with the most photos. */
export function pickShowcase(props: Property[]): Property | undefined {
  const rank = (p: Property) => (p.featured ? 4 : 0) + Math.min(p.images.length, 40) / 100;
  return [...props].filter(p => p.images.length > 0).sort((a, b) => rank(b) - rank(a))[0];
}

export function getNeighborhoods(props: Property[]): string[] {
  return [...new Set(props.map(p => p.neighborhood).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
}

/** "Barrio, Ciudad" — the barrio is omitted when the source doesn't specify one. */
export function locationLabel(p: Pick<Property, 'neighborhood' | 'city'>): string {
  return [p.neighborhood, p.city].filter(Boolean).join(', ');
}

const NUMBER_FORMAT = new Intl.NumberFormat('es-AR');

/** 1234567 → "1.234.567" (es-AR: dot as thousands separator). */
export const formatNumber = (n: number): string => NUMBER_FORMAT.format(n);

/** Amount with its currency symbol: "USD 600.000" / "$ 29.239.492". Without a currency, just the number. */
export function formatAmount(n: number, currency?: Currency): string {
  const num = formatNumber(n);
  return currency ? `${currency === 'USD' ? 'USD' : '$'} ${num}` : num;
}

export function formatPrice(p: Pick<Property, 'price' | 'currency' | 'operation'>): string {
  if (!p.price) return 'Consultar precio';
  const amount = formatAmount(p.price, p.currency);
  return p.operation === 'alquiler' ? `${amount}/mes` : amount;
}

export function filterProperties(props: Property[], filters: {
  operation?: PropertyOperation | '';
  type?: PropertyType | '';
  neighborhood?: string;
  minPrice?: number;
  maxPrice?: number;
  currency?: Currency | '';
  bedrooms?: number;
}): Property[] {
  return props.filter(p => {
    if (filters.operation && p.operation !== filters.operation) return false;
    if (filters.type && p.type !== filters.type) return false;
    if (filters.neighborhood && p.neighborhood !== filters.neighborhood) return false;
    if (filters.currency && p.currency !== filters.currency) return false;
    // price === 0 means "Consultar precio": keep it in the results when a price range is set,
    // so it can still match on the other criteria (type, operation, barrio…).
    if (p.price > 0) {
      if (filters.minPrice && p.price < filters.minPrice) return false;
      if (filters.maxPrice && p.price > filters.maxPrice) return false;
    }
    if (filters.bedrooms && (p.bedrooms ?? 0) < filters.bedrooms) return false;
    return true;
  });
}
