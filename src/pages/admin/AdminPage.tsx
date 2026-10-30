import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LoadError, Skeleton } from '@/components/ui/Skeleton';
import { formatPrice } from '@/data/properties';
import type { PropertyRow } from '@/lib/supabase';
import { AdminLogin } from './AdminLogin';
import { ContactsPanel } from './ContactsPanel';
import { PropertyForm, fieldClass } from './PropertyForm';
import { deleteProperty, fetchAllProperties, setPropertyStatus, STATUSES, type Status } from './api';
import { useAdminSession } from './useAdminSession';

const STATUS_STYLE: Record<string, string> = {
  disponible: 'bg-emerald-100 text-emerald-800',
  reservado: 'bg-amber-100 text-amber-800',
  vendido: 'bg-stone-300 text-stone-800',
  alquilado: 'bg-sky-100 text-sky-800',
};

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** "…-ficha-trv523" → "TRV523": the code the real-estate office uses; falls back to the id prefix. */
const codeOf = (r: PropertyRow) => (r.slug?.match(/trv\d+/i)?.[0] ?? r.id.slice(0, 8)).toUpperCase();

export default function AdminPage() {
  const { session, signOut } = useAdminSession();

  // Keep the panel out of search engines (the SPA serves the same index.html for every route).
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    const prevTitle = document.title;
    document.title = 'Admin · Trevisan Inmuebles';
    return () => { meta.remove(); document.title = prevTitle; };
  }, []);

  switch (session.state) {
    case 'loading':
      return <main className="min-h-screen bg-paper p-8" role="status" aria-label="Cargando"><Skeleton className="h-8 w-64 rounded" /></main>;
    case 'unconfigured':
      return <AdminLogin notice="Supabase no está configurado en este entorno (faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)." />;
    case 'signedOut':
      return <AdminLogin />;
    case 'forbidden':
      return (
        <main className="min-h-screen bg-paper flex items-center justify-center px-4">
          <div className="max-w-sm text-center bg-white/90 border border-stone-300/60 rounded-2xl shadow-md p-7 space-y-4">
            <h1 className="font-display text-2xl text-ink">Sin permisos</h1>
            <p className="text-sm text-ink-soft"><strong>{session.email}</strong> no está autorizado como administrador.</p>
            <button onClick={() => { void signOut(); }} className="bg-ink text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#2b2c31] transition-colors">
              Cerrar sesión
            </button>
          </div>
        </main>
      );
    case 'admin':
      return <Dashboard email={session.email} onSignOut={() => { void signOut(); }} />;
  }
}

function Dashboard({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  const [rows, setRows] = useState<PropertyRow[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [section, setSection] = useState<'propiedades' | 'consultas'>('propiedades');
  const [filter, setFilter] = useState<'todos' | Status>('todos');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<PropertyRow | 'new' | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const load = useCallback(() => {
    fetchAllProperties().then(
      data => { setError(null); setRows(data); },
      (e: unknown) => setError(e instanceof Error ? e : new Error(String(e))),
    );
  }, []);
  useEffect(load, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { todos: rows?.length ?? 0 };
    rows?.forEach(r => { c[r.status] = (c[r.status] ?? 0) + 1; });
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const q = norm(query.trim());
    return (rows ?? []).filter(r =>
      (filter === 'todos' || r.status === filter) &&
      (!q || norm(r.title).includes(q) || norm(r.slug ?? '').includes(q) || norm(codeOf(r)).includes(q)));
  }, [rows, filter, query]);

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500); };
  const replace = (saved: PropertyRow) =>
    setRows(rs => (rs ?? []).some(r => r.id === saved.id) ? rs!.map(r => (r.id === saved.id ? saved : r)) : [saved, ...(rs ?? [])]);

  const changeStatus = async (r: PropertyRow, status: Status) => {
    setBusyId(r.id);
    try {
      await setPropertyStatus(r.id, status);
      replace({ ...r, status });
      flash(`"${r.title}" ahora está ${status}.`);
    } catch (e) { flash(e instanceof Error ? e.message : 'No se pudo cambiar el estado.'); }
    setBusyId(null);
  };

  const remove = async (r: PropertyRow) => {
    if (!window.confirm(`¿Eliminar "${r.title}" definitivamente?\n\nEsta acción no se puede deshacer. Si solo querés ocultarla del sitio, cambiá su estado (reservado / vendido / alquilado).`)) return;
    setBusyId(r.id);
    try {
      await deleteProperty(r.id);
      setRows(rs => (rs ?? []).filter(x => x.id !== r.id));
      flash('Propiedad eliminada.');
    } catch (e) { flash(e instanceof Error ? e.message : 'No se pudo eliminar.'); }
    setBusyId(null);
  };

  return (
    <main className="min-h-screen bg-paper">
      <header className="bg-white/90 border-b border-stone-300/60 px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-xl text-ink mr-auto">Admin · {section === 'propiedades' ? 'Propiedades' : 'Consultas'}</h1>
        <Link to="/" className="text-sm text-ink-soft hover:text-ink transition-colors">Ver sitio</Link>
        <span className="text-xs text-ink-soft hidden sm:inline">{email}</span>
        <button onClick={onSignOut} className="text-sm text-ink-soft hover:text-ink transition-colors">Cerrar sesión</button>
      </header>

      <nav className="bg-white/60 border-b border-stone-300/60 px-4 sm:px-6 flex gap-1" role="tablist" aria-label="Secciones del panel">
        {(['propiedades', 'consultas'] as const).map(s => (
          <button key={s} role="tab" aria-selected={section === s} onClick={() => setSection(s)}
            className={`px-4 py-3 text-sm font-semibold capitalize border-b-2 -mb-px transition-colors ${section === s ? 'border-accent text-ink' : 'border-transparent text-ink-soft hover:text-ink'}`}>
            {s}
          </button>
        ))}
      </nav>

      {section === 'consultas' && <ContactsPanel onFlash={flash} />}

      {section === 'propiedades' && <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por título o código (ej. TRV523)"
            aria-label="Buscar propiedades" className={`${fieldClass} sm:max-w-sm`} />
          <button onClick={() => setEditing('new')}
            className="ml-auto bg-accent text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-accent-deep transition-colors">
            + Nueva propiedad
          </button>
        </div>

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar por estado">
          {(['todos', ...STATUSES] as const).map(s => (
            <button key={s} role="tab" aria-selected={filter === s} onClick={() => setFilter(s)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${filter === s ? 'bg-ink text-white' : 'bg-white/80 border border-stone-300/60 text-ink hover:bg-white'}`}>
              {s} <span className="opacity-60">{counts[s] ?? 0}</span>
            </button>
          ))}
        </div>

        {error ? (
          <LoadError onRetry={load} />
        ) : !rows ? (
          <div role="status" aria-label="Cargando propiedades" className="space-y-2">
            {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
          </div>
        ) : visible.length === 0 ? (
          <p className="text-center text-ink-soft py-16 text-sm">No hay propiedades que coincidan.</p>
        ) : (
          <div className="bg-white/90 border border-stone-300/60 rounded-2xl shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-ink-soft uppercase tracking-wide border-b border-stone-200">
                <tr>
                  <th className="px-4 py-3 font-medium">Propiedad</th>
                  <th className="px-3 py-3 font-medium">Código</th>
                  <th className="px-3 py-3 font-medium">Operación</th>
                  <th className="px-3 py-3 font-medium">Precio</th>
                  <th className="px-3 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(r => (
                  <tr key={r.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/60">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3 min-w-[16rem]">
                        <img src={r.images?.[0]} alt="" loading="lazy" className="h-11 w-16 rounded-lg object-cover bg-stone-200 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-ink line-clamp-1">{r.title}{r.featured && <span className="ml-2 text-[10px] text-accent-deep font-semibold">★ DESTACADA</span>}</p>
                          <p className="text-xs text-ink-soft line-clamp-1">{[r.neighborhood, r.city].filter(Boolean).join(', ') || r.location}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-ink-soft">{codeOf(r)}</td>
                    <td className="px-3 py-2.5 capitalize">{r.operation} · {r.property_type}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{formatPrice({ price: r.price, currency: r.currency === 'ARS' ? 'ARS' : 'USD', operation: r.operation })}</td>
                    <td className="px-3 py-2.5">
                      <select value={r.status} disabled={busyId === r.id} aria-label={`Estado de ${r.title}`}
                        onChange={e => { void changeStatus(r, e.target.value as Status); }}
                        className={`rounded-full px-3 py-1 text-xs font-semibold border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#e07b2a]/40 ${STATUS_STYLE[r.status] ?? 'bg-stone-200 text-stone-800'}`}>
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <Link to={`/propiedad/${r.slug}`} target="_blank" className="text-xs text-ink-soft hover:text-ink mr-3">Ver</Link>
                      <button onClick={() => setEditing(r)} className="text-xs font-semibold text-ink hover:text-accent-deep mr-3">Editar</button>
                      <button onClick={() => { void remove(r); }} disabled={busyId === r.id} className="text-xs font-semibold text-red-700 hover:text-red-900 disabled:opacity-50">Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>}

      {editing && (
        <PropertyForm
          row={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={saved => { replace(saved); flash(editing === 'new' ? 'Propiedad creada.' : 'Cambios guardados.'); setEditing(null); }}
        />
      )}
      {toast && <div role="status" className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] bg-ink text-white text-sm px-5 py-3 rounded-xl shadow-xl">{toast}</div>}
    </main>
  );
}
