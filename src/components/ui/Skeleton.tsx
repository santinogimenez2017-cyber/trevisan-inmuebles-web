import { Link } from 'react-router-dom';

/** Neutral pulsing block (Tailwind `animate-pulse`); size and shape come from `className`. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-stone-200/80 ${className}`} aria-hidden="true" />;
}

/** Placeholder with the same footprint as `PropertyCard`, shown while the listings are loading. */
export function PropertyCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden border border-stone-300/60 bg-white/70" aria-hidden="true">
      <Skeleton className="aspect-[4/3] w-full" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-3 w-1/2 rounded" />
        <div className="flex gap-4 pt-1">
          <Skeleton className="h-3 w-8 rounded" />
          <Skeleton className="h-3 w-8 rounded" />
          <Skeleton className="h-3 w-14 rounded" />
        </div>
      </div>
    </div>
  );
}

/** `count` card placeholders in the catalogue grid layout, announced once to assistive tech. */
export function PropertyGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div role="status" aria-label="Cargando propiedades">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: count }, (_, i) => <PropertyCardSkeleton key={i} />)}
      </div>
    </div>
  );
}

/** Placeholder for the property detail page (gallery + info column). */
export function PropertyDetailSkeleton() {
  return (
    <div className="min-h-screen bg-paper pt-16 lg:pt-20" role="status" aria-label="Cargando propiedad">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="aspect-[16/9] w-full rounded-2xl" />
          <div className="flex gap-2">
            {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-16 w-24 rounded-lg" />)}
          </div>
          <Skeleton className="h-8 w-2/3 rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-5/6 rounded" />
        </div>
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    </div>
  );
}

/** Error box with a retry button, for sections that could not read Supabase. */
export function LoadError({ onRetry, className = '' }: { onRetry: () => void; className?: string }) {
  return (
    <div className={`text-center py-16 px-4 ${className}`} role="alert">
      <p className="text-ink font-medium mb-1">No pudimos cargar las propiedades</p>
      <p className="text-ink-soft text-sm mb-5">Revisá tu conexión e intentá de nuevo.</p>
      <button
        type="button"
        onClick={onRetry}
        className="bg-ink text-white px-6 py-2.5 rounded-xl hover:bg-[#2b2c31] transition-colors font-medium text-sm"
      >
        Reintentar
      </button>
      <div className="mt-4">
        <Link to="/" className="text-ink-soft text-sm hover:text-ink transition-colors">Volver al inicio</Link>
      </div>
    </div>
  );
}
