import { useState } from 'react';
import { signIn } from './useAdminSession';
import { fieldClass } from './PropertyForm';

export function AdminLogin({ notice }: { notice?: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const message = await signIn(email, password);
    if (message) { setError(message); setBusy(false); }   // on success the session hook swaps this view out
  };

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white/90 border border-stone-300/60 shadow-md rounded-2xl p-7 space-y-4">
        <div>
          <h1 className="font-display text-2xl text-ink">Panel de administración</h1>
          <p className="text-sm text-ink-soft mt-1">Trevisan Inmuebles</p>
        </div>
        {notice && <p role="alert" className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{notice}</p>}
        <label className="block">
          <span className="block text-xs font-medium text-ink-soft mb-1.5">Email</span>
          <input type="email" required autoComplete="username" autoFocus value={email} onChange={e => setEmail(e.target.value)} className={fieldClass} />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-ink-soft mb-1.5">Contraseña</span>
          <input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className={fieldClass} />
        </label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={busy}
          className="w-full bg-ink text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-[#2b2c31] disabled:opacity-60 transition-colors">
          {busy ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </main>
  );
}
