// Módulo C — Supabase client + manual listings.
//
// Listings loaded by hand in the Supabase `properties` table (see supabase_schema.sql) are merged
// with the scraped JSON in `loadProperties()`. Everything here is optional and fail-safe: without
// VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY, or if the request fails, the site simply shows the
// local JSON. The SDK is loaded with a dynamic import() so it never weighs on the initial bundle.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Currency, Property, PropertyOperation, PropertyType } from '@/data/properties';

const URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const REQUEST_TIMEOUT_MS = 4000;

export const isSupabaseConfigured = Boolean(URL && ANON_KEY);

let client: Promise<SupabaseClient> | null = null;

/** Lazily creates the singleton client. Throws if the env vars are missing. */
export function getSupabase(): Promise<SupabaseClient> {
  if (!URL || !ANON_KEY) return Promise.reject(new Error('Supabase is not configured'));
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } }),
  );
  return client;
}

/** Row shape of public.properties (supabase_schema.sql). */
interface PropertyRow {
  id: string;
  title: string;
  price: number | null;
  location: string | null;
  operation: PropertyOperation;
  type: PropertyType;
  images: string[] | null;
  created_at: string;
  currency?: Currency | null;
  description?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area?: number | null;
  featured?: boolean | null;
}

const slugify = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function toProperty(r: PropertyRow): Property {
  const location = (r.location ?? '').trim();
  return {
    id: `sb-${r.id}`,
    slug: `${slugify(r.title) || 'propiedad'}-${r.id.slice(0, 8)}`,
    operation: r.operation,
    type: r.type,
    title: r.title,
    address: location,
    neighborhood: location,
    city: '',
    province: 'Misiones',
    price: r.price ?? 0,
    currency: r.currency ?? 'USD',
    bedrooms: r.bedrooms ?? undefined,
    bathrooms: r.bathrooms ?? undefined,
    area: r.area ?? undefined,
    description: r.description ?? '',
    features: [],
    images: r.images ?? [],
    featured: r.featured ?? false,
    createdAt: r.created_at,
  };
}

/**
 * Listings entered manually in Supabase, mapped to the app's `Property` shape.
 * Never throws: returns [] when Supabase is not configured, slow (> 4 s) or failing.
 */
export async function fetchCustomProperties(): Promise<Property[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const query = async () => {
      const sb = await getSupabase();
      const { data, error } = await sb
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as PropertyRow[]).filter(r => r.images && r.images.length > 0).map(toProperty);
    };
    const timeout = new Promise<Property[]>((_, reject) =>
      setTimeout(() => reject(new Error('Supabase request timed out')), REQUEST_TIMEOUT_MS),
    );
    return await Promise.race([query(), timeout]);
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[supabase] custom properties unavailable:', err);
    return [];
  }
}
