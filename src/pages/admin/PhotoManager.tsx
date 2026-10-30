import { useRef, useState } from 'react';
import { uploadPropertyImage } from './api';

const ACCEPT = 'image/jpeg,image/png,image/webp';

/**
 * Photo picker for the property form: drop zone + file picker that uploads to Supabase Storage,
 * thumbnails that can be reordered (drag or arrows) or removed. The first image is the cover.
 * Existing URLs (any host) are shown as they are, so legacy listings keep working.
 */
export function PhotoManager({ images, onChange, onBusyChange }: {
  images: string[];
  onChange: (update: (prev: string[]) => string[]) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [pending, setPending] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [over, setOver] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const addFiles = async (list: FileList | File[]) => {
    const files = Array.from(list);
    if (!files.length) return;
    setErrors([]);
    setPending(p => p + files.length);
    onBusyChange(true);
    const results = await Promise.allSettled(files.map(uploadPropertyImage));
    const urls = results.flatMap(r => (r.status === 'fulfilled' ? [r.value] : []));
    if (urls.length) onChange(prev => [...prev, ...urls]);
    setErrors(results.flatMap(r => (r.status === 'rejected' ? [r.reason instanceof Error ? r.reason.message : 'Error al subir.'] : [])));
    setPending(p => {
      const left = p - files.length;
      if (left <= 0) onBusyChange(false);
      return left;
    });
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length || from === to) return;
    onChange(prev => {
      const next = [...prev];
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });
  };
  const remove = (i: number) => onChange(prev => prev.filter((_, j) => j !== i));

  const btn = 'h-7 w-7 rounded-full bg-black/65 text-white text-sm leading-none flex items-center justify-center hover:bg-black/85 disabled:opacity-30 disabled:hover:bg-black/65';

  return (
    <div>
      <span className="block text-xs font-medium text-ink-soft mb-1.5">Fotos *</span>
      <div
        onDragOver={e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setOver(true); } }}
        onDragLeave={() => setOver(false)}
        onDrop={e => {
          if (!e.dataTransfer.types.includes('Files')) return;
          e.preventDefault();
          setOver(false);
          void addFiles(e.dataTransfer.files);
        }}
        className={`rounded-xl border-2 border-dashed p-4 transition-colors ${over ? 'border-[#e07b2a] bg-[#e07b2a]/5' : 'border-stone-300/80 bg-white'}`}
      >
        <input ref={input} type="file" multiple accept={ACCEPT} className="hidden"
          onChange={e => { void addFiles(e.target.files ?? []); e.target.value = ''; }} />
        <div className="flex flex-wrap items-center gap-3 text-sm text-ink-soft">
          <button type="button" onClick={() => input.current?.click()}
            className="px-4 py-2 rounded-xl border border-stone-300 bg-white text-ink text-sm font-medium hover:border-[#e07b2a] transition-colors">
            Elegir fotos
          </button>
          <span>o arrastralas acá (JPG, PNG, WEBP · máx. 10 MB). La primera es la portada.</span>
        </div>

        {(images.length > 0 || pending > 0) && (
          <ul className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((url, i) => (
              <li key={`${url}-${i}`} draggable
                onDragStart={e => { setDragFrom(i); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); }}
                onDragOver={e => { if (dragFrom !== null) e.preventDefault(); }}
                onDrop={e => { if (dragFrom === null) return; e.preventDefault(); move(dragFrom, i); setDragFrom(null); }}
                onDragEnd={() => setDragFrom(null)}
                className={`relative aspect-[4/3] rounded-lg overflow-hidden bg-stone-100 cursor-grab ${dragFrom === i ? 'opacity-40' : ''} ${i === 0 ? 'ring-2 ring-[#e07b2a]' : ''}`}>
                <img src={url} alt={`Foto ${i + 1}`} loading="lazy" draggable={false} className="h-full w-full object-cover" />
                {i === 0 && (
                  <span className="absolute top-1.5 left-1.5 bg-[#e07b2a] text-white text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full">Portada</span>
                )}
                <button type="button" onClick={() => remove(i)} aria-label={`Quitar foto ${i + 1}`} className={`${btn} absolute top-1.5 right-1.5`}>×</button>
                <div className="absolute bottom-1.5 left-1.5 right-1.5 flex justify-between">
                  <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label="Mover a la izquierda" className={btn}>←</button>
                  <button type="button" onClick={() => move(i, i + 1)} disabled={i === images.length - 1} aria-label="Mover a la derecha" className={btn}>→</button>
                </div>
              </li>
            ))}
            {Array.from({ length: pending }, (_, i) => (
              <li key={`pending-${i}`} className="aspect-[4/3] rounded-lg bg-stone-100 animate-pulse flex items-center justify-center text-xs text-ink-soft">
                Subiendo…
              </li>
            ))}
          </ul>
        )}
      </div>
      {errors.length > 0 && (
        <ul role="alert" className="mt-2 text-xs text-red-700 space-y-0.5">{errors.map((m, i) => <li key={i}>{m}</li>)}</ul>
      )}
    </div>
  );
}
