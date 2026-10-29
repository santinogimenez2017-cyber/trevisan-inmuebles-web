// Real listings scraped from https://trevisan.com.ar/ by `npm run scrape`
// (scripts/scrape-properties.mjs → src/data/properties.json). Do not edit the JSON by hand.
//
// The JSON (~190 kB) is NOT imported statically: it is loaded with a dynamic import() so that
// Vite emits it as its own chunk and keeps it out of the initial bundle.

import { useEffect, useMemo, useState } from 'react';

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
  rooms?: number;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;       // m²
  coveredArea?: number;
  parking?: number;
  description: string;
  features: string[];
  images: string[];
  cover?: string;       // sharpest landscape photo among the first images (scripts/pick-covers.mjs)
  coverRatio?: number;  // width / height of `cover`
  featured: boolean;
  status?: string;     // e.g. "A estrenar", "En pozo"
  sourceUrl?: string;
  createdAt: string;
}

// ── Lazy loading ───────────────────────────────────────────────────────────
let cache: Property[] | null = null;
let pending: Promise<Property[]> | null = null;

/** Loads the listings chunk once; later calls reuse the same promise. */
export function loadProperties(): Promise<Property[]> {
  pending ??= import('./properties.json').then(mod => {
    cache = mod.default as Property[];
    return cache;
  });
  return pending;
}

// Start downloading right away (in parallel with React mounting) instead of waiting for a
// component effect, so the hero and listings are ready as soon as possible.
void loadProperties();

/** Listings + loading flag. Returns [] while the chunk is still downloading. */
export function useProperties(): { properties: Property[]; loading: boolean } {
  const [properties, setProperties] = useState<Property[]>(cache ?? []);
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    if (cache) return;
    let alive = true;
    loadProperties().then(list => {
      if (!alive) return;
      setProperties(list);
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  return { properties, loading };
}

// ── Derived data ───────────────────────────────────────────────────────────
const unique = (values: string[]) =>
  [...new Set(values)].sort((a, b) => a.localeCompare(b, 'es'));

/** Best presentation photo of a listing. */
export const coverOf = (p: Property): string => p.cover ?? p.images[0];

/** Photos of the featured listings, used as hero backdrop. */
export function getHeroImages(props: Property[]): string[] {
  return props.filter(p => p.featured).slice(0, 4).map(coverOf);
}

/** Picks the best listing to illustrate a group: featured → landscape → most photos. */
export function pickShowcase(props: Property[]): Property | undefined {
  const rank = (p: Property) =>
    (p.featured ? 4 : 0) + ((p.coverRatio ?? 0) >= 1.2 ? 2 : 0) + Math.min(p.images.length, 40) / 100;
  return [...props].filter(p => p.images.length > 0).sort((a, b) => rank(b) - rank(a))[0];
}

export function getNeighborhoods(props: Property[]): string[] {
  return unique(props.map(p => p.neighborhood).filter(Boolean));
}

export function useNeighborhoods(): string[] {
  const { properties } = useProperties();
  return useMemo(() => getNeighborhoods(properties), [properties]);
}

/** "Barrio, Ciudad" — the barrio is omitted when the source doesn't specify one. */
export function locationLabel(p: Pick<Property, 'neighborhood' | 'city'>): string {
  return [p.neighborhood, p.city].filter(Boolean).join(', ');
}

export function formatPrice(p: Pick<Property, 'price' | 'currency' | 'operation'>): string {
  if (!p.price) return 'Consultar precio';
  const amount = `${p.currency === 'USD' ? 'USD' : '$'} ${p.price.toLocaleString('es-AR')}`;
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

