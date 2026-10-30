import { useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { coverOf, pickShowcase } from '@/data/properties';
import { useProperties } from '@/hooks/useProperties';
import { Skeleton } from '@/components/ui/Skeleton';

const EXPO = [0.22, 1, 0.36, 1] as [number, number, number, number];

// Photos and counts come from the real listings (Supabase), not from stock images.
const CATEGORIES = [
  { label: 'Casas',         type: 'casa' },
  { label: 'Departamentos', type: 'departamento' },
  { label: 'Terrenos',      type: 'terreno' },
  { label: 'Locales',       type: 'local' },
  { label: 'Alquileres',    type: '', operation: 'alquiler' },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.93, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.65, ease: EXPO } },
};

export function CategoriesSection() {
  const { properties, loading } = useProperties();
  const cards = useMemo(() => CATEGORIES.map(cat => {
    const group = properties.filter(p =>
      (!cat.type || p.type === cat.type) && (!cat.operation || p.operation === cat.operation));
    const pick = pickShowcase(group);
    return {
      ...cat,
      image: pick ? coverOf(pick) : null,
      count: group.length ? `${group.length} ${group.length === 1 ? 'propiedad' : 'propiedades'}` : '',
    };
  }), [properties]);

  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true, margin: '-80px' });
  const gridInView = useInView(gridRef, { once: true, margin: '-60px' });

  return (
    <section className="relative py-24 px-4 bg-linen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 40 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: EXPO }}
          className="text-center mb-14"
        >
          <span className="eyebrow text-accent-deep mb-4 block">
            Explorá por categoría
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-ink leading-[1.08]">
            Encontrá lo que necesitás
          </h2>
        </motion.div>

        {/* Grid */}
        <motion.div
          ref={gridRef}
          variants={containerVariants}
          initial="hidden"
          animate={gridInView ? 'visible' : 'hidden'}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
        >
          {cards.map(cat => {
            const params = new URLSearchParams();
            if (cat.type)      params.set('tipo',      cat.type);
            if (cat.operation) params.set('operacion', cat.operation);
            const qs = params.toString();
            const href = `/propiedades${qs ? `?${qs}` : ''}`;
            return (
              <motion.div key={cat.label} variants={cardVariants}>
                <Link to={href} className="group block">
                <div className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-stone-200 border border-stone-300/60 shadow-md group-hover:shadow-xl transition-shadow duration-300">
                  {loading && <Skeleton className="absolute inset-0" />}
                  {cat.image && (
                    <img
                      src={cat.image}
                      alt={cat.label}
                      loading="lazy"
                      decoding="async"
                      className="img-crisp absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  )}
                  {/* Hover arrow badge */}
                  <div className="absolute top-3 right-3 w-8 h-8 bg-accent rounded-full flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                    <ArrowRight size={14} className="text-white" />
                  </div>
                </div>
                {/* Caption sits below the photo (editorial), so the image stays untouched */}
                <div className="pt-3 px-1">
                  <h3 className="font-display text-xl text-ink leading-tight group-hover:text-accent-deep transition-colors">{cat.label}</h3>
                  <p className="text-ink-soft text-xs mt-0.5 min-h-4">{cat.count}</p>
                </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
