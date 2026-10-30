import { useEffect, useState } from 'react';
import { formatAmount } from '@/data/properties';
import type { PropertyRow } from '@/lib/supabase';
import { saveProperty, STATUSES, type PropertyInput, type Status } from './api';
import { PhotoManager } from './PhotoManager';

export const fieldClass =
  'w-full px-3 py-2.5 bg-white border border-stone-300/70 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#e07b2a]/30 focus:border-[#e07b2a] transition-all';

const TYPES = [
  ['casa', 'Casa'], ['departamento', 'Departamento'], ['terreno', 'Terreno'],
  ['local', 'Local'], ['ph', 'PH'], ['oficina', 'Oficina'],
] as const;

function Field({ label, hint, className = '', children }: {
  label: string; hint?: string; className?: string; children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-medium text-ink-soft mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-ink-soft mt-1">{hint}</span>}
    </label>
  );
}

const lines = (s: string) => s.split('\n').map(l => l.trim()).filter(Boolean);
const num = (s: string) => (s.trim() === '' ? 0 : Number(s));

interface FormState {
  title: string; operation: string; property_type: string; status: string; price: string; currency: string;
  neighborhood: string; city: string; address: string; bedrooms: string; bathrooms: string;
  covered_area: string; total_area: string; parking: string; description: string;
  features: string; images: string[]; featured: boolean; badge: string;
}

const toForm = (r: PropertyRow | null): FormState => ({
  title: r?.title ?? '',
  operation: r?.operation ?? 'venta',
  property_type: r?.property_type ?? 'casa',
  status: r?.status ?? 'disponible',
  price: r ? String(r.price ?? 0) : '',
  currency: r?.currency ?? 'USD',
  neighborhood: r?.neighborhood ?? '',
  city: r?.city ?? 'Posadas',
  address: r?.address ?? '',
  bedrooms: r ? String(r.bedrooms ?? 0) : '',
  bathrooms: r ? String(r.bathrooms ?? 0) : '',
  covered_area: r?.covered_area != null ? String(r.covered_area) : '',
  total_area: r ? String(r.total_area ?? 0) : '',
  parking: r ? String(r.parking ?? 0) : '',
  description: r?.description ?? '',
  features: (r?.features ?? []).join('\n'),
  images: r?.images ?? [],
  featured: r?.featured ?? false,
  badge: r?.badge ?? '',
});

/** Create (row = null) / edit modal. Calls `onSaved` with the stored row; `onClose` discards. */
export function PropertyForm({ row, onSaved, onClose }: {
  row: PropertyRow | null; onSaved: (saved: PropertyRow) => void; onClose: () => void;
}) {
  const [f, setF] = useState<FormState>(() => toForm(row));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF(s => ({ ...s, [k]: v }));
  const text = (k: keyof FormState) => ({
    value: f[k] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(k, e.target.value as never),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.documentElement.style.overflow = prev; };
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const images = f.images;
    const numbers = [f.price, f.bedrooms, f.bathrooms, f.covered_area, f.total_area, f.parking].map(num);
    if (uploading) return setError('Esperá a que terminen de subirse las fotos.');
    if (!f.title.trim()) return setError('El título es obligatorio.');
    if (numbers.some(n => !Number.isFinite(n) || n < 0)) return setError('Los números no pueden ser negativos ni inválidos.');
    if (!images.length) return setError('Agregá al menos una foto: sin fotos la propiedad no se muestra en el sitio.');

    const neighborhood = f.neighborhood.trim();
    const city = f.city.trim();
    const input: PropertyInput = {
      title: f.title.trim(),
      operation: f.operation as PropertyInput['operation'],
      property_type: f.property_type,
      status: f.status as Status,
      price: num(f.price),
      currency: f.currency as PropertyInput['currency'],
      neighborhood,
      city,
      address: f.address.trim() || null,
      location: [neighborhood, city].filter(Boolean).join(', '),
      bedrooms: Math.round(num(f.bedrooms)),
      bathrooms: Math.round(num(f.bathrooms)),
      covered_area: f.covered_area.trim() === '' ? null : Number(f.covered_area),
      total_area: num(f.total_area),
      parking: Math.round(num(f.parking)),
      description: f.description.trim(),
      images,
      features: lines(f.features),
      featured: f.featured,
      badge: f.badge.trim() || null,
    };
    setSaving(true);
    setError('');
    try {
      onSaved(await saveProperty(row?.id ?? null, input));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
      setSaving(false);
    }
  };

  const price = num(f.price);
  return (
    <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto" data-lenis-prevent
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <form
        role="dialog" aria-modal="true" aria-label={row ? 'Editar propiedad' : 'Nueva propiedad'}
        onSubmit={submit}
        className="bg-paper rounded-2xl shadow-2xl max-w-3xl mx-auto my-6 sm:my-10 p-5 sm:p-8 space-y-5"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-2xl text-ink">{row ? 'Editar propiedad' : 'Nueva propiedad'}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-ink-soft hover:text-ink text-2xl leading-none">×</button>
        </div>

        <Field label="Título *"><input required className={fieldClass} {...text('title')} /></Field>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Field label="Operación">
            <select className={fieldClass} {...text('operation')}><option value="venta">Venta</option><option value="alquiler">Alquiler</option></select>
          </Field>
          <Field label="Tipo">
            <select className={fieldClass} {...text('property_type')}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </Field>
          <Field label="Estado">
            <select className={fieldClass} {...text('status')}>{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>
          </Field>
          <Field label="Moneda">
            <select className={fieldClass} {...text('currency')}><option value="USD">USD</option><option value="ARS">$ (ARS)</option></select>
          </Field>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Field label="Precio" hint={price > 0 ? formatAmount(price, f.currency as 'USD' | 'ARS') : '0 = Consultar precio'}>
            <input type="number" min="0" step="any" className={fieldClass} {...text('price')} />
          </Field>
          <Field label="Dormitorios"><input type="number" min="0" className={fieldClass} {...text('bedrooms')} /></Field>
          <Field label="Baños"><input type="number" min="0" className={fieldClass} {...text('bathrooms')} /></Field>
          <Field label="Cocheras"><input type="number" min="0" className={fieldClass} {...text('parking')} /></Field>
          <Field label="m² cubiertos"><input type="number" min="0" step="any" className={fieldClass} {...text('covered_area')} /></Field>
          <Field label="m² totales"><input type="number" min="0" step="any" className={fieldClass} {...text('total_area')} /></Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Barrio"><input className={fieldClass} {...text('neighborhood')} /></Field>
          <Field label="Ciudad"><input className={fieldClass} {...text('city')} /></Field>
          <Field label="Dirección"><input className={fieldClass} {...text('address')} /></Field>
        </div>

        <Field label="Descripción"><textarea rows={5} className={`${fieldClass} resize-y`} {...text('description')} /></Field>

        <Field label="Características" hint="Una por línea (Piscina, Quincho…)">
          <textarea rows={5} className={`${fieldClass} resize-y`} {...text('features')} />
        </Field>

        <PhotoManager
          images={f.images}
          onChange={update => setF(s => ({ ...s, images: update(s.images) }))}
          onBusyChange={setUploading}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <Field label="Insignia de la tarjeta" hint="Opcional: A estrenar, En pozo…"><input className={fieldClass} {...text('badge')} /></Field>
          <label className="flex items-center gap-2 text-sm text-ink pb-2.5">
            <input type="checkbox" checked={f.featured} onChange={e => set('featured', e.target.checked)} className="h-4 w-4 accent-[#b9560d]" />
            Destacada en la home
          </label>
        </div>

        <Field label="Enlace (slug)" hint={row ? 'No cambia al editar, para no romper los enlaces ya compartidos.' : 'Se genera solo a partir del título.'}>
          <input readOnly disabled className={`${fieldClass} bg-stone-100 text-ink-soft`} value={row?.slug ?? ''} placeholder="se genera automáticamente" />
        </Field>

        {error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm text-ink-soft hover:text-ink transition-colors">Cancelar</button>
          <button type="submit" disabled={saving || uploading}
            className="bg-ink text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-[#2b2c31] disabled:opacity-60 transition-colors">
            {saving ? 'Guardando…' : row ? 'Guardar cambios' : 'Crear propiedad'}
          </button>
        </div>
      </form>
    </div>
  );
}
