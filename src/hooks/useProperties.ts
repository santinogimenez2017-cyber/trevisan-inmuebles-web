// Paso 2 — Supabase data hooks.
//
// These read ONLY the Supabase `properties` table (status = 'disponible', newest first) through
// `getSupabase()`, translated to the app's `Property` by `toProperty()` inside src/lib/supabase.ts.
// The site's merged catalogue (scraped JSON + Supabase) remains `useProperties` in '@/data/properties'.

import { useCallback, useEffect, useState } from 'react';
import type { Property } from '@/data/properties';
import { fetchAvailableProperties, fetchPropertyBySlug } from '@/lib/supabase';

interface Query<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

interface Settled<A, T> { arg: A; nonce: number; data?: T; error?: Error }

/**
 * Runs `fetcher(arg)` on mount, whenever `arg` changes and on `refetch()`. `loading` is derived
 * (a result is pending until one settles for the current arg + refetch count), so no setState runs
 * synchronously inside the effect. Data from a previous `refetch()` is kept while reloading; data for
 * a different `arg` is not.
 */
function useQuery<A, T>(fetcher: (arg: A) => Promise<T>, arg: A): Query<T> {
  const [nonce, setNonce] = useState(0);
  const [settled, setSettled] = useState<Settled<A, T> | null>(null);

  useEffect(() => {
    let alive = true;
    fetcher(arg).then(
      data => { if (alive) setSettled({ arg, nonce, data }); },
      (err: unknown) => {
        if (alive) setSettled({ arg, nonce, error: err instanceof Error ? err : new Error(String(err)) });
      },
    );
    return () => { alive = false; };
  }, [fetcher, arg, nonce]);

  const refetch = useCallback(() => setNonce(n => n + 1), []);
  const sameArg = settled !== null && Object.is(settled.arg, arg);
  const current = sameArg && settled.nonce === nonce;

  return {
    data: sameArg ? settled.data : undefined,
    loading: !current,
    error: current ? settled.error ?? null : null,
    refetch,
  };
}

/** Available listings from Supabase, newest first. */
export function useProperties(): {
  properties: Property[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const { data, loading, error, refetch } = useQuery(fetchAvailableProperties, undefined);
  return { properties: data ?? [], loading, error, refetch };
}

/** A single available listing from Supabase by slug (`property` is `null` when it does not exist). */
export function usePropertyBySlug(slug: string): {
  property: Property | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const { data, loading, error, refetch } = useQuery(fetchPropertyBySlug, slug);
  return { property: data ?? null, loading, error, refetch };
}
