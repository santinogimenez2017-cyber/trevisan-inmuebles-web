// Módulo C — Supabase client + manual listings.
//
// Listings loaded by hand in the Supabase `properties` table (see supabase_schema.sql) are merged
// with the scraped JSON in `loadProperties()`. Everything here is optional and fail-safe: without
// VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY, or if the request fails, the site simply shows the
// local JSON. The SDK is loaded with a dynamic import() so it never weighs on the initial bundle.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Currency, Property, PropertyType } from '@/data/properties';

// Accepts the bare project URL or a pasted REST endpoint (".../rest/v1/"): the SDK appends /rest/v1 itself.
const URL = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const REQUEST_TIMEOUT_MS = 4000;

export const isSupabaseConfigured = Boolean(URL && ANON_KEY);

let client: Promise<SupabaseClient> | null = null;

/**
 * The shared Supabase client instance. It is `null` until the SDK chunk has been loaded (the SDK is
 * lazy so it stays out of the initial bundle); `getSupabase()` / `fetchCustomProperties()` populate it.
 * It is an ES live binding, so importers always see the current value. Prefer `await getSupabase()`
 * when you need a guaranteed instance.
 */
export let supabase: SupabaseClient | null = null;

/** Lazily creates the singleton client. Throws if the env vars are missing. */
export function getSupabase(): Promise<SupabaseClient> {
  if (!URL || !ANON_KEY) return Promise.reject(new Error('Supabase is not configured'));
  client ??= import('@supabase/supabase-js').then(({ createClient }) => {
    supabase = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    return supabase;
  });
  return client;
}

/** Row shape of public.properties (supabase_schema.sql). */
export interface PropertyRow {
  id: string;
  title: string;
  slug: string;
  operation: 'venta' | 'alquiler';
  property_type: string;
  price: number;
  currency: string;
  location: string;
  address?: string;
  bedrooms: number;
  bathrooms: number;
  covered_area?: number;
  total_area: number;
  description?: string;
  images: string[];
  featured: boolean;
  status: string;
  created_at?: string;
  /** Legacy v1 column names, still read while the old schema is deployed. */
  type?: string;
  area?: number;
}

const PROPERTY_TYPES: readonly PropertyType[] = ['casa', 'departamento', 'terreno', 'local', 'ph', 'oficina'];

const slugify = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function toProperty(r: PropertyRow): Property {
  const location = (r.location ?? '').trim();
  const rawType = (r.property_type ?? r.type ?? '').toLowerCase();
  const type = PROPERTY_TYPES.find(t => t === rawType) ?? 'casa';
  const area = r.total_area ?? r.area;
  return {
    id: `sb-${r.id}`,
    slug: r.slug?.trim() || `${slugify(r.title) || 'propiedad'}-${r.id.slice(0, 8)}`,
    operation: r.operation,
    type,
    title: r.title,
    address: r.address?.trim() || location,
    neighborhood: location,
    city: '',
    province: 'Misiones',
    price: r.price ?? 0,
    currency: (r.currency === 'ARS' ? 'ARS' : 'USD') as Currency,
    bedrooms: r.bedrooms || undefined,
    bathrooms: r.bathrooms || undefined,
    area: area || undefined,
    coveredArea: r.covered_area || undefined,
    description: r.description ?? '',
    features: [],
    images: r.images ?? [],
    featured: r.featured ?? false,
    // `status` in the DB is the publication state ('disponible'), not the card badge text: not mapped.
    createdAt: r.created_at ?? new Date().toISOString(),
  };
}

/** Publication state that makes a row visible on the site. */
const AVAILABLE = 'disponible';

/** Rejects with a plain Error (Supabase errors are not `Error` instances) and enforces the timeout. */
async function run<T>(query: () => Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Supabase request timed out')), REQUEST_TIMEOUT_MS);
  });
  try {
    return await Promise.race([query(), timeout]);
  } catch (err) {
    throw err instanceof Error ? err : new Error((err as { message?: string })?.message ?? 'Supabase request failed');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Available listings (status = 'disponible'), newest first, mapped to the app's `Property` shape.
 * Rejects when Supabase is not configured, slow (> 4 s) or failing.
 */
export function fetchAvailableProperties(): Promise<Property[]> {
  return run(async () => {
    const sb = await getSupabase();
    const { data, error } = await sb
      .from('properties')
      .select('*')
      .eq('status', AVAILABLE)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as PropertyRow[]).filter(r => r.images && r.images.length > 0).map(toProperty);
  });
}

/** One available listing by its slug, or `null` when it does not exist. Rejects like the above. */
export function fetchPropertyBySlug(slug: string): Promise<Property | null> {
  return run(async () => {
    const sb = await getSupabase();
    const { data, error } = await sb
      .from('properties')
      .select('*')
      .eq('slug', slug)
      .eq('status', AVAILABLE)
      .maybeSingle();
    if (error) throw error;
    return data ? toProperty(data as PropertyRow) : null;
  });
}

/**
 * Same as `fetchAvailableProperties()` but never throws: returns [] when Supabase is not configured,
 * slow or failing, so the site falls back to the local JSON (used by `loadProperties()`).
 */
export async function fetchCustomProperties(): Promise<Property[]> {
  if (!isSupabaseConfigured) return [];
  try {
    return await fetchAvailableProperties();
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[supabase] custom properties unavailable:', err);
    return [];
  }
}
