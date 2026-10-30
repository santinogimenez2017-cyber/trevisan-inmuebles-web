import { useCallback, useEffect, useState } from 'react';
import { getAdminSupabase, isSupabaseConfigured } from '@/lib/supabase';

export type AdminSession =
  | { state: 'loading' }
  | { state: 'unconfigured' }
  | { state: 'signedOut' }
  | { state: 'forbidden'; email: string }   // signed in, but not listed in public.admins
  | { state: 'admin'; email: string };

/**
 * Supabase Auth session for /admin. Being signed in is not enough: the user must also pass the database
 * check `public.is_admin()` (the same function the RLS policies use), otherwise the state is 'forbidden'.
 */
export function useAdminSession(): { session: AdminSession; signOut: () => Promise<void> } {
  const [session, setSession] = useState<AdminSession>(isSupabaseConfigured ? { state: 'loading' } : { state: 'unconfigured' });

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let alive = true;
    let unsubscribe: (() => void) | undefined;

    const resolve = async (email: string | undefined) => {
      if (!email) return alive && setSession({ state: 'signedOut' });
      const sb = await getAdminSupabase();
      const { data, error } = await sb.rpc('is_admin');
      if (!alive) return;
      setSession(!error && data === true ? { state: 'admin', email } : { state: 'forbidden', email });
    };

    getAdminSupabase().then(async sb => {
      const { data } = await sb.auth.getSession();
      if (!alive) return;
      await resolve(data.session?.user.email);
      const sub = sb.auth.onAuthStateChange((event, s) => {
        // setTimeout: Supabase forbids awaiting other client calls inside this callback.
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') setTimeout(() => { void resolve(s?.user.email); }, 0);
      });
      unsubscribe = () => sub.data.subscription.unsubscribe();
    }).catch(() => { if (alive) setSession({ state: 'unconfigured' }); });

    return () => { alive = false; unsubscribe?.(); };
  }, []);

  const signOut = useCallback(async () => {
    const sb = await getAdminSupabase();
    await sb.auth.signOut();
  }, []);

  return { session, signOut };
}

/** Email + password sign-in. Resolves to an error message, or null on success. */
export async function signIn(email: string, password: string): Promise<string | null> {
  try {
    const sb = await getAdminSupabase();
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    if (!error) return null;
    return /invalid login credentials/i.test(error.message) ? 'Email o contraseña incorrectos.' : error.message;
  } catch {
    return 'No se pudo conectar. Intentá de nuevo.';
  }
}
