import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LoadError, Skeleton } from '@/components/ui/Skeleton';
import { CONTACT_STATUSES, deleteContact, fetchContacts, setContactStatus, type ContactRow, type ContactStatus } from './api';

const STATUS_STYLE: Record<ContactStatus, string> = {
  nuevo: 'bg-orange-100 text-orange-800',
  leido: 'bg-stone-200 text-stone-800',
  respondido: 'bg-emerald-100 text-emerald-800',
  archivado: 'bg-stone-100 text-stone-500',
};

const DATE = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' });

/** Inbox of the contact forms (public.contacts), newest first. */
export function ContactsPanel({ onFlash }: { onFlash: (msg: string) => void }) {
  const [rows, setRows] = useState<ContactRow[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [filter, setFilter] = useState<'todos' | ContactStatus>('todos');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchContacts().then(
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

  const visible = useMemo(() => (rows ?? []).filter(r => filter === 'todos' || r.status === filter), [rows, filter]);

  const changeStatus = async (r: ContactRow, status: ContactStatus) => {
    setBusyId(r.id);
    try {
      await setContactStatus(r.id, status);
      setRows(rs => (rs ?? []).map(x => (x.id === r.id ? { ...x, status } : x)));
    } catch (e) { onFlash(e instanceof Error ? e.message : 'No se pudo cambiar el estado.'); }
    setBusyId(null);
  };

  const remove = async (r: ContactRow) => {
    if (!window.confirm(`¿Eliminar la consulta de ${r.name}? Esta acción no se puede deshacer.`)) return;
    setBusyId(r.id);
    try {
      await deleteContact(r.id);
      setRows(rs => (rs ?? []).filter(x => x.id !== r.id));
      onFlash('Consulta eliminada.');
    } catch (e) { onFlash(e instanceof Error ? e.message : 'No se pudo eliminar.'); }
    setBusyId(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar consultas por estado">
        {(['todos', ...CONTACT_STATUSES] as const).map(s => (
          <button key={s} role="tab" aria-selected={filter === s} onClick={() => setFilter(s)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${filter === s ? 'bg-ink text-white' : 'bg-white/80 border border-stone-300/60 text-ink hover:bg-white'}`}>
            {s} <span className="opacity-60">{counts[s] ?? 0}</span>
          </button>
        ))}
      </div>

      {error ? (
        <LoadError onRetry={load} />
      ) : !rows ? (
        <div role="status" aria-label="Cargando consultas" className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : visible.length === 0 ? (
        <p className="text-center text-ink-soft py-16 text-sm">No hay consultas {filter === 'todos' ? 'todavía' : `con estado "${filter}"`}.</p>
      ) : (
        <ul className="space-y-3">
          {visible.map(r => (
            <li key={r.id} className={`bg-white/90 border rounded-2xl shadow-sm p-4 sm:p-5 ${r.status === 'nuevo' ? 'border-[#e07b2a]/50' : 'border-stone-300/60'}`}>
              <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                <div className="min-w-0 mr-auto">
                  <p className="font-medium text-ink">{r.name}</p>
                  <p className="text-xs text-ink-soft">
                    <a href={`mailto:${r.email}`} className="hover:text-ink underline-offset-2 hover:underline">{r.email}</a>
                    {r.phone && <> · <a href={`tel:${r.phone}`} className="hover:text-ink underline-offset-2 hover:underline">{r.phone}</a></>}
                  </p>
                </div>
                <time dateTime={r.created_at} className="text-xs text-ink-soft whitespace-nowrap">{DATE.format(new Date(r.created_at))}</time>
                <select value={r.status} disabled={busyId === r.id} aria-label={`Estado de la consulta de ${r.name}`}
                  onChange={e => { void changeStatus(r, e.target.value as ContactStatus); }}
                  className={`rounded-full px-3 py-1 text-xs font-semibold border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#e07b2a]/40 ${STATUS_STYLE[r.status] ?? 'bg-stone-200 text-stone-800'}`}>
                  {CONTACT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {r.properties && (
                <p className="mt-2 text-xs text-ink-soft">
                  Propiedad: <Link to={`/propiedad/${r.properties.slug}`} target="_blank" className="font-medium text-ink hover:text-accent-deep">{r.properties.title}</Link>
                </p>
              )}
              {r.message && <p className="mt-3 text-sm text-ink whitespace-pre-line break-words">{r.message}</p>}
              <div className="mt-3 text-right">
                <button onClick={() => { void remove(r); }} disabled={busyId === r.id}
                  className="text-xs font-semibold text-red-700 hover:text-red-900 disabled:opacity-50">Eliminar</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
