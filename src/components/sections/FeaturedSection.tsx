import { useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { ArrowRight, MapPin, Bed, Bath, Square } from 'lucide-react';
import { formatPrice as formatPropertyPrice, locationLabel, coverOf, type Property } from '@/data/properties';
import { useProperties } from '@/hooks/useProperties';
import { PropertyCardSkeleton } from '@/components/ui/Skeleton';

const EXPO = [0.22, 1, 0.36, 1] as [number, number, number, number];

// Section-level scroll-reveal variants
const sectionHeader = {
  hidden: { opacity: 0, y: 40 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.8, ease: EXPO } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 50 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.7, ease: EXPO } },
};
const stagger = { show: { transition: { staggerChildren: 0.12 } } };

export function FeaturedSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { properties, loading } = useProperties();
  const featured = useMemo(() => properties.filter(p => p.featured).slice(0, 3), [properties]);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] });

  // Ambient background orbs — subtle background parallax
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '8%']);

  return (
    <section ref={sectionRef} className="relative py-24 px-4 overflow-hidden bg-paper">
      {/* Gradient texture — bg layer, moves at its own rate */}
      <motion.div
        style={{ y: bgY, willChange: 'transform' }}
        className="absolute inset-0 opacity-30 pointer-events-none"
        aria-hidden
      >
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#e07b2a]/8 blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full bg-stone-300/40 blur-3xl" />
      </motion.div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          variants={sectionHeader}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-12 gap-4"
        >
          <div>
            <span className="eyebrow text-accent-deep mb-4 block">
              Selección editorial
            </span>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl text-ink leading-[1.05]">
              Propiedades<br className="hidden sm:block" /> destacadas
            </h2>
          </div>
          <Link
            to="/propiedades"
            className="group flex items-center gap-2 text-ink-soft hover:text-ink text-sm font-medium transition-colors"
          >
            Ver todas
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        {/* Cards */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {loading
            ? Array.from({ length: 3 }, (_, i) => (
                <motion.div key={i} variants={cardVariants} role="status" aria-label="Cargando propiedades">
                  <PropertyCardSkeleton />
                </motion.div>
              ))
            : featured.map(property => (
                <motion.div key={property.id} variants={cardVariants}>
                  <FeaturedCard property={property} />
                </motion.div>
              ))}
        </motion.div>

        {/* CTA strip */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.7, ease: EXPO }}
          className="mt-14 glass-panel rounded-2xl p-8 sm:p-12 flex flex-col sm:flex-row items-center justify-between gap-6"
        >
          <div>
            <h3 className="font-display text-2xl sm:text-3xl text-ink mb-2">
              ¿No encontraste lo que buscás?
            </h3>
            <p className="text-ink-soft text-sm">Explorálas todas y encontrá la que se adapta a vos.</p>
          </div>
          <div className="flex gap-3 shrink-0 flex-wrap">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link to="/propiedades" className="inline-flex items-center gap-2 bg-accent text-white text-sm font-semibold px-6 py-3 rounded-full">
                Ver catálogo <ArrowRight size={13} />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <a href="#contacto" className="inline-flex items-center gap-2 glass-light text-ink text-sm font-semibold px-6 py-3 rounded-full">
                Consultar asesor
              </a>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ── FeaturedCard — 2.5D parallax inside each card ─────────────────────────
function FeaturedCard({ property }: { property: Property }) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Per-card scroll progress — triggers when the card enters/exits the viewport
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ['start end', 'end start'],
  });

  // Image plane (deepest): moves DOWN by 12% as card scrolls through viewport
  const rawImgY = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);
  const imgY    = useSpring(rawImgY, { stiffness: 100, damping: 30, mass: 0.5 });

  // Badge plane (foreground): drifts UP by 20px — opposite direction to image
  // This creates a genuine multi-plane (2.5D) depth separation
  const rawBadgeY = useTransform(scrollYProgress, [0, 1], ['0px', '-20px']);
  const badgeY    = useSpring(rawBadgeY, { stiffness: 110, damping: 28, mass: 0.4 });

  const formatPrice = () => formatPropertyPrice(property);
  const TYPE: Record<string, string> = {
    casa: 'Casa', departamento: 'Depto.', terreno: 'Terreno',
    local: 'Local', ph: 'PH', oficina: 'Oficina',
  };

  return (
    <motion.div
      ref={cardRef}
      whileHover={{ y: -8 }}
      transition={{ type: 'spring', stiffness: 280, damping: 20 }}
      className="group"
    >
      <Link
        to={`/propiedad/${property.slug}`}
        className="block bg-white/90 rounded-2xl overflow-hidden border border-stone-300/60 shadow-md hover:shadow-xl hover:border-[#e07b2a]/50 transition-[box-shadow,border-color] duration-300"
      >
        {/* ── Image container — clipped, oversized inner div for parallax ── */}
        <div className="relative overflow-hidden aspect-[4/3]">
          {/*
              The image div is intentionally 120% tall and offset so the
              parallax Y shift (±8%) never reveals blank edges.
              willChange: 'transform' pins compositing to the GPU thread.
          */}
          <motion.div
            className="absolute inset-x-0 -top-[10%] bottom-[-10%]"
            style={{ y: imgY, willChange: 'transform' }}
          >
            <img
              src={coverOf(property)}
              alt={property.title}
              loading="lazy"
              decoding="async"
              className="img-crisp w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          </motion.div>

          {/* ── Badge plane — floats above image, moves faster (foreground) ── */}
          <motion.div
            className="absolute top-3 left-3 flex gap-2"
            style={{ y: badgeY, willChange: 'transform' }}
          >
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
              ${property.operation === 'venta' ? 'bg-ink text-white' : 'bg-accent text-white'}`}>
              {property.operation}
            </span>
            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-white/80 text-ink uppercase tracking-wider backdrop-blur-md border border-stone-300/60">
              {TYPE[property.type] ?? property.type}
            </span>
          </motion.div>

          {/* Price — static overlay, no parallax needed */}
          <div className="absolute left-3 bottom-3 bg-white/85 backdrop-blur-md border border-stone-300/60 rounded-xl px-3 py-1.5 shadow-sm shadow-stone-900/5">
            <p className="text-ink font-bold text-lg">{formatPrice()}</p>
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-semibold text-ink text-sm mb-1.5 line-clamp-1 group-hover:text-accent-deep transition-colors">
            {property.title}
          </h3>
          <div className="flex items-center gap-1.5 text-ink-soft text-xs mb-3">
            <MapPin size={11} />
            <span>{locationLabel(property)}</span>
          </div>
          <div className="flex items-center gap-4 text-ink-soft text-xs">
            {property.bedrooms  !== undefined && <span className="flex items-center gap-1"><Bed size={12} className="text-accent-deep" />{property.bedrooms}</span>}
            {property.bathrooms !== undefined && <span className="flex items-center gap-1"><Bath size={12} className="text-accent-deep" />{property.bathrooms}</span>}
            {property.area      !== undefined && <span className="flex items-center gap-1"><Square size={12} className="text-accent-deep" />{property.area}m²</span>}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
