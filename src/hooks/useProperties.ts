// Supabase data hooks.
//
// `useProperties()` reads the `properties` table (status = 'disponible', newest first) through
// `getSupabase()`; rows are translated to the app's `Property` by `toProperty()` in src/lib/supabase.ts.
// The list is a shared store: the many components of the home page (hero, categories, featured…) and the
// catalogue subscribe to ONE request, and `refetch()` refreshes all of them.

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { getNeighborhoods, type Property } from '@/data/properties';
import { fetchAvailableProperties, fetchPropertyBySlug } from '@/lib/supabase';

const toError = (err: unknown) => (err instanceof Error ? err : new Error(String(err)));

// ── Shared list store ──────────────────────────────────────────────────────
interface ListState { properties: Property[]; loading: boolean; error: Error | null }

let state: ListState = { properties: [], loading: true, error: null };
let inflight: Promise<void> | null = null;
let loadedOnce = false;
const listeners = new Set<() => void>();

function setState(next: ListState) {
  state = next;
  listeners.forEach(l => l());
}

function loadList(): Promise<void> {
  inflight ??= (async () => {
    setState({ ...state, loading: true, error: null });
    try {
      setState({ properties: await fetchAvailableProperties(), loading: false, error: null });
      loadedOnce = true;
    } catch (err) {
      setState({ ...state, loading: false, error: toError(err) });
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

// Start downloading as soon as the app bundle is evaluated (in parallel with React mounting).
void loadList();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
const getSnapshot = () => state;

/** Available listings from Supabase, newest first. `properties` is [] while `loading` or on `error`. */
export function useProperties(): {
  properties: Property[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const snap = useSyncExternalStore(subscribe, getSnapshot);

  // A previous failure is retried the next time a consumer mounts.
  useEffect(() => {
    if (!loadedOnce && !inflight) void loadList();
  }, []);

  const refetch = useCallback(() => { void loadList(); }, []);
  return { ...snap, refetch };
}

/** Sorted, de-duplicated barrios of the available listings (for the search filters). */
export function useNeighborhoods(): string[] {
  const { properties } = useProperties();
  return useMemo(() => getNeighborhoods(properties), [properties]);
}

// ── Single listing by slug ─────────────────────────────────────────────────
interface Settled { slug: string; nonce: number; property?: Property | null; error?: Error }

/**
 * A single available listing from Supabase by slug (`property` is `null` when it does not exist).
 * If the list is already in memory the listing is returned immediately (no loading flash when coming
 * from a card); the dedicated query still runs and its result wins. `loading` is derived — a result is
 * pending until one settles for the current slug + refetch count — so no setState runs in the effect body.
 */
export function usePropertyBySlug(slug: string): {
  property: Property | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const [nonce, setNonce] = useState(0);
  const [settled, setSettled] = useState<Settled | null>(null);
  const list = useSyncExternalStore(subscribe, getSnapshot);

  useEffect(() => {
    let alive = true;
    fetchPropertyBySlug(slug).then(
      property => { if (alive) setSettled({ slug, nonce, property }); },
      (err: unknown) => { if (alive) setSettled({ slug, nonce, error: toError(err) }); },
    );
    return () => { alive = false; };
  }, [slug, nonce]);

  const refetch = useCallback(() => setNonce(n => n + 1), []);
  const sameSlug = settled !== null && settled.slug === slug;
  const current = sameSlug && settled.nonce === nonce;
  const cached = list.properties.find(p => p.slug === slug) ?? null;
  const property = (sameSlug ? settled.property : undefined) ?? cached;

  return {
    property,
    loading: !current && !property,
    error: current && !property ? settled.error ?? null : null,
    refetch,
  };
}
