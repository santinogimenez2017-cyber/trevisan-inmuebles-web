import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { PropertyCard } from '@/components/property/PropertyCard';
import { PropertyGridSkeleton, LoadError } from '@/components/ui/Skeleton';
import { trackPropertySearch } from '@/lib/analytics';
import { useProperties, useNeighborhoods } from '@/hooks/useProperties';
import {
  filterProperties,
  type PropertyOperation, type PropertyType, type Currency,
} from '@/data/properties';

const EXPO = [0.22, 1, 0.36, 1] as [number, number, number, number];

const TYPE_OPTIONS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'casa', label: 'Casas' },
  { value: 'departamento', label: 'Departamentos' },
  { value: 'terreno', label: 'Terrenos' },
  { value: 'local', label: 'Locales' },
  { value: 'ph', label: 'PH' },
  { value: 'oficina', label: 'Oficinas' },
];

// Card entrance variants — staggered grid
const cardContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const cardItem = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  show:   { opacity: 1, y: 0,  scale: 1,    transition: { duration: 0.5, ease: EXPO } },
};

export default function ListingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { properties, loading, error, refetch } = useProperties();
  const [showFilters, setShowFilters]   = useState(false);

  const [operation, setOperation] = useState<PropertyOperation | ''>((searchParams.get('operacion') as PropertyOperation) || '');
  const [type, setType]           = useState<PropertyType | ''>((searchParams.get('tipo') as PropertyType) || '');
  const [neighborhood, setNeighborhood] = useState(searchParams.get('barrio') || '');
  const [minPrice, setMinPrice]   = useState(searchParams.get('minPrecio') || '');
  const [maxPrice, setMaxPrice]   = useState(searchParams.get('maxPrecio') || '');
  const [currency, setCurrency]   = useState<Currency | ''>((searchParams.get('moneda') as Currency) || '');
  const [bedrooms, setBedrooms]   = useState(searchParams.get('dormitorios') || '');
  const [sortBy, setSortBy]       = useState('newest');
  // key drives AnimatePresence remount on filter change → re-stagger
  const [gridKey, setGridKey]     = useState(0);

  // Sync URL → state whenever searchParams change (navbar links, back/forward).
  // This is the critical fix: dep array was [] so navigation between filtered
  // routes (e.g. ?tipo=casa → ?tipo=departamento) never updated the grid.
  useEffect(() => {
    setOperation((searchParams.get('operacion') as PropertyOperation) || '');
    setType((searchParams.get('tipo') as PropertyType) || '');
    setNeighborhood(searchParams.get('barrio') || '');
    setMinPrice(searchParams.get('minPrecio') || '');
    setMaxPrice(searchParams.get('maxPrecio') || '');
    setCurrency((searchParams.get('moneda') as Currency) || '');
    setBedrooms(searchParams.get('dormitorios') || '');
    setGridKey(k => k + 1); // re-trigger stagger animation on every URL change
  }, [searchParams]); // ← watch searchParams, not just mount

  const results = filterProperties(properties, {
    operation:    operation || undefined,
    type:         type || undefined,
    neighborhood: neighborhood || undefined,
    minPrice:     minPrice ? Number(minPrice) : undefined,
    maxPrice:     maxPrice ? Number(maxPrice) : undefined,
    currency:     currency || undefined,
    bedrooms:     bedrooms ? Number(bedrooms) : undefined,
  });

  const sorted = [...results].sort((a, b) => {
    if (sortBy === 'price-asc')  return (a.price || Infinity) - (b.price || Infinity);
    if (sortBy === 'price-desc') return b.price - a.price; // "Consultar precio" (0) goes last
    return b.createdAt.localeCompare(a.createdAt);
  });

  const handleSearch = () => {
    const p = new URLSearchParams();
    if (operation)    p.set('operacion', operation);
    if (type)         p.set('tipo', type);
    if (neighborhood) p.set('barrio', neighborhood);
    if (minPrice)     p.set('minPrecio', minPrice);
    if (maxPrice)     p.set('maxPrecio', maxPrice);
    if (currency)     p.set('moneda', currency);
    if (bedrooms)     p.set('dormitorios', bedrooms);
    trackPropertySearch({ operation, type, neighborhood, minPrice, maxPrice, currency, bedrooms });
    setSearchParams(p);
    setShowFilters(false);
    setGridKey(k => k + 1); // re-trigger stagger animation
  };

  const clearFilters = () => {
    setOperation(''); setType(''); setNeighborhood('');
    setMinPrice(''); setMaxPrice(''); setCurrency(''); setBedrooms('');
    setSearchParams({});
    setGridKey(k => k + 1);
  };

  const hasFilters = !!(operation || type || neighborhood || minPrice || maxPrice || currency || bedrooms);

  const pageTitle = operation === 'venta'    ? 'Propiedades en Venta'
    : operation === 'alquiler' ? 'Propiedades en Alquiler'
    : type ? `${TYPE_OPTIONS.find(t => t.value === type)?.label ?? type} en Posadas`
    : 'Todas las Propiedades';

  return (
    <div className="min-h-screen bg-paper pt-20">
      {/* Hero bar */}
      <motion.div
        className="bg-linen border-b border-black/5 py-10 px-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EXPO }}
      >
        <div className="max-w-7xl mx-auto">
          <h1 className="font-display text-3xl sm:text-4xl text-ink mb-1">{pageTitle}</h1>
          <div className="flex items-center gap-4 flex-wrap">
            <p className="text-ink-soft text-sm">
              {sorted.length} {sorted.length === 1 ? 'propiedad encontrada' : 'propiedades encontradas'}
            </p>
            <AnimatePresence>
              {hasFilters && (
                <motion.button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 text-sm text-ink-soft"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  whileHover={{ color: '#ef4444' }}
                >
                  <X size={14} />
                  Limpiar filtros
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter toolbar */}
        <motion.div
          className="flex items-center gap-3 mb-6 flex-wrap lg:justify-end"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EXPO, delay: 0.1 }}
        >
          <motion.button
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden flex items-center gap-2 bg-white/90 border border-stone-300/60 shadow-sm px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700"
            whileHover={{ scale: 1.02, borderColor: '#0f1f3d', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
          >
            <SlidersHorizontal size={15} />
            Filtros
            {hasFilters && (
              <motion.span
                className="w-5 h-5 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                {[operation, type, neighborhood, currency, minPrice, maxPrice, bedrooms].filter(Boolean).length}
              </motion.span>
            )}
          </motion.button>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-ink-soft hidden sm:inline">Ordenar:</span>
            <select
              value={sortBy}
              onChange={e => { setSortBy(e.target.value); setGridKey(k => k + 1); }}
              className="bg-white/90 border border-stone-300/60 shadow-sm rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#e07b2a]/30 cursor-pointer"
            >
              <option value="newest">Más recientes</option>
              <option value="price-asc">Menor precio</option>
              <option value="price-desc">Mayor precio</option>
            </select>
          </div>
        </motion.div>

        {/* Filters panel — always visible on desktop (lg+); collapsible via the button on mobile */}
        <div className={showFilters ? 'block' : 'hidden lg:block'}>
          <FilterPanel
            operation={operation} setOperation={setOperation}
            type={type} setType={setType}
            neighborhood={neighborhood} setNeighborhood={setNeighborhood}
            minPrice={minPrice} setMinPrice={setMinPrice}
            maxPrice={maxPrice} setMaxPrice={setMaxPrice}
            currency={currency} setCurrency={setCurrency}
            bedrooms={bedrooms} setBedrooms={setBedrooms}
            onSearch={handleSearch}
            onClear={clearFilters}
          />
        </div>

        {/* Active filter chips */}
        <AnimatePresence>
          {hasFilters && (
            <motion.div
              className="flex gap-2 flex-wrap mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {operation    && <FilterChip label={operation === 'venta' ? 'Venta' : 'Alquiler'} onRemove={() => { setOperation(''); setGridKey(k => k + 1); }} />}
              {type         && <FilterChip label={TYPE_OPTIONS.find(t => t.value === type)?.label ?? type} onRemove={() => { setType(''); setGridKey(k => k + 1); }} />}
              {neighborhood && <FilterChip label={neighborhood} onRemove={() => { setNeighborhood(''); setGridKey(k => k + 1); }} />}
              {currency     && <FilterChip label={currency} onRemove={() => { setCurrency(''); setGridKey(k => k + 1); }} />}
              {minPrice     && <FilterChip label={`Desde ${minPrice}`} onRemove={() => { setMinPrice(''); setGridKey(k => k + 1); }} />}
              {maxPrice     && <FilterChip label={`Hasta ${maxPrice}`} onRemove={() => { setMaxPrice(''); setGridKey(k => k + 1); }} />}
              {bedrooms     && <FilterChip label={`${bedrooms}+ dorm.`} onRemove={() => { setBedrooms(''); setGridKey(k => k + 1); }} />}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results grid — keyed so stagger re-fires on filter changes */}
        {loading ? (
          <PropertyGridSkeleton />
        ) : error ? (
          <LoadError onRetry={refetch} />
        ) : sorted.length === 0 ? (
          <EmptyState onClear={clearFilters} />
        ) : (
          <motion.div
            key={gridKey}
            variants={cardContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {sorted.map(p => (
              <motion.div key={p.id} variants={cardItem}>
                <PropertyCard property={p} />
              </motion.div>
            ))}
          </motion.div>
        )}

      </div>
    </div>
  );
}

// ── FilterPanel ───────────────────────────────────────────────────────────
function FilterPanel({
  operation, setOperation, type, setType, neighborhood, setNeighborhood,
  minPrice, setMinPrice, maxPrice, setMaxPrice, currency, setCurrency,
  bedrooms, setBedrooms, onSearch, onClear,
}: {
  operation: string;    setOperation: (v: PropertyOperation | '') => void;
  type: string;         setType: (v: PropertyType | '') => void;
  neighborhood: string; setNeighborhood: (v: string) => void;
  minPrice: string;     setMinPrice: (v: string) => void;
  maxPrice: string;     setMaxPrice: (v: string) => void;
  currency: string;     setCurrency: (v: Currency | '') => void;
  bedrooms: string;     setBedrooms: (v: string) => void;
  onSearch: () => void; onClear: () => void;
}) {
  const neighborhoods = useNeighborhoods();
  return (
    <div className="bg-white/90 border border-stone-300/60 shadow-sm rounded-2xl p-5 sm:p-6 mb-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-5">
        <FilterSelect label="Operación" value={operation} onChange={v => setOperation(v as PropertyOperation | '')} options={[
          { value: '', label: 'Todas' }, { value: 'venta', label: 'Venta' }, { value: 'alquiler', label: 'Alquiler' },
        ]} />
        <FilterSelect label="Tipo" value={type} onChange={v => setType(v as PropertyType | '')} options={TYPE_OPTIONS} />
        <FilterSelect label="Barrio / Ciudad" value={neighborhood} onChange={setNeighborhood} options={[
          { value: '', label: 'Todos' }, ...neighborhoods.map(n => ({ value: n, label: n }))
        ]} />
        <FilterSelect label="Moneda" value={currency} onChange={v => setCurrency(v as Currency | '')} options={[
          { value: '', label: 'Todas' }, { value: 'USD', label: 'USD' }, { value: 'ARS', label: 'Pesos ARS' },
        ]} />
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Precio mínimo</label>
          <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="0"
            className="w-full px-3 py-2.5 bg-white/90 border border-stone-300/60 shadow-sm rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#e07b2a]/30 focus:border-[#e07b2a] transition-all" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Precio máximo</label>
          <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="Sin límite"
            className="w-full px-3 py-2.5 bg-white/90 border border-stone-300/60 shadow-sm rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#e07b2a]/30 focus:border-[#e07b2a] transition-all" />
        </div>
        <FilterSelect label="Dormitorios mín." value={bedrooms} onChange={setBedrooms} options={[
          { value: '', label: 'Todos' }, { value: '1', label: '1+' }, { value: '2', label: '2+' },
          { value: '3', label: '3+' }, { value: '4', label: '4+' },
        ]} />
      </div>
      <div className="flex gap-3">
        <motion.button
          onClick={onSearch}
          className="btn-shimmer flex items-center gap-2 bg-ink text-white text-sm font-semibold px-6 py-2.5 rounded-xl"
          whileHover={{ scale: 1.02, backgroundColor: '#2b2c31' }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 380, damping: 22 }}
        >
          <Search size={14} />
          Aplicar filtros
        </motion.button>
        <button onClick={onClear} className="text-sm text-ink-soft hover:text-gray-800 px-4 py-2.5 transition-colors">
          Limpiar
        </button>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2.5 bg-white/90 border border-stone-300/60 shadow-sm rounded-xl text-sm text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-[#e07b2a]/30 focus:border-[#e07b2a] transition-all"
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <motion.span
      className="inline-flex items-center gap-1.5 bg-ink/10 text-ink text-xs font-medium px-3 py-1.5 rounded-full"
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.2, type: 'spring', stiffness: 400 }}
    >
      {label}
      <button onClick={onRemove} className="hover:text-red-500 transition-colors"><X size={12} /></button>
    </motion.span>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <motion.div
      className="text-center py-20"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EXPO }}
    >
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-5">
        <Search size={24} className="text-gray-400" />
      </div>
      <h3 className="font-display text-xl font-bold text-gray-700 mb-2">Sin resultados</h3>
      <p className="text-ink-soft text-sm mb-6 max-w-sm mx-auto">
        No encontramos propiedades con los filtros seleccionados. Intentá con criterios más amplios.
      </p>
      <motion.button
        onClick={onClear}
        className="btn-shimmer bg-ink text-white text-sm font-medium px-6 py-2.5 rounded-xl"
        whileHover={{ scale: 1.04, backgroundColor: '#2b2c31' }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
      >
        Ver todas las propiedades
      </motion.button>
    </motion.div>
  );
}
