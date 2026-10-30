// Supabase client + queries for the `properties` table (see supabase_schema.sql).
//
// Supabase is the only source of listings. The SDK is loaded with a dynamic import() so it never
// weighs on the initial bundle; `getSupabase()` resolves the shared client. Rows are translated to the
// app's `Property` by `toProperty()`, so components never see the snake_case database shape.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Currency, Property, PropertyType } from '@/data/properties';

// Accepts the bare project URL or a pasted REST endpoint (".../rest/v1/"): the SDK appends /rest/v1 itself.
const URL = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const REQUEST_TIMEOUT_MS = 8000;

export const isSupabaseConfigured = Boolean(URL && ANON_KEY);

let client: Promise<SupabaseClient> | null = null;

/**
 * The shared Supabase client instance. It is `null` until the SDK chunk has been loaded (the SDK is
 * lazy so it stays out of the initial bundle); `getSupabase()` populates it. It is an ES live binding,
 * so importers always see the current value. Prefer `await getSupabase()` when you need an instance.
 */
export let supabase: SupabaseClient | null = null;

/** Lazily creates the singleton client. Rejects if the env vars are missing. */
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
  neighborhood?: string;
  city?: string;
  bedrooms: number;
  bathrooms: number;
  covered_area?: number;
  total_area: number;
  description?: string;
  images: string[];
  features?: string[];
  parking?: number;
  featured: boolean;
  badge?: string | null;
  status: string;
  created_at?: string;
}

const PROPERTY_TYPES: readonly PropertyType[] = ['casa', 'departamento', 'terreno', 'local', 'ph', 'oficina'];

const slugify = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function toProperty(r: PropertyRow): Property {
  const location = (r.location ?? '').trim();
  const neighborhood = (r.neighborhood ?? '').trim();
  const city = (r.city ?? '').trim();
  const rawType = (r.property_type ?? '').toLowerCase();
  return {
    id: r.id,
    slug: r.slug?.trim() || `${slugify(r.title) || 'propiedad'}-${r.id.slice(0, 8)}`,
    operation: r.operation,
    type: PROPERTY_TYPES.find(t => t === rawType) ?? 'casa',
    title: r.title,
    address: r.address?.trim() || location,
    // Rows entered by hand with only `location` still get a barrio for the card and the filter.
    neighborhood: neighborhood || (city ? '' : location),
    city,
    province: 'Misiones',
    price: r.price ?? 0,
    currency: (r.currency === 'ARS' ? 'ARS' : 'USD') as Currency,
    bedrooms: r.bedrooms || undefined,
    bathrooms: r.bathrooms || undefined,
    area: r.total_area || undefined,
    coveredArea: r.covered_area || undefined,
    parking: r.parking || undefined,
    description: r.description ?? '',
    features: r.features ?? [],
    images: r.images ?? [],
    featured: r.featured ?? false,
    // DB `status` is the publication state ('disponible'); the card badge text is `badge`.
    status: r.badge || undefined,
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
 * Rejects when Supabase is not configured, slow (> 8 s) or failing.
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
