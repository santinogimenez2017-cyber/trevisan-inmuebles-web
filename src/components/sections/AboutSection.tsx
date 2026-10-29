import { useMemo, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Shield, Clock, Award, Users } from 'lucide-react';
import { useProperties, coverOf, pickShowcase, locationLabel } from '@/data/properties';

const EXPO = [0.22, 1, 0.36, 1] as [number, number, number, number];

const VALUES = [
  { icon: Shield, title: 'Confianza', text: 'Años de trayectoria en el mercado misionero respaldan cada operación inmobiliaria que realizamos.' },
  { icon: Clock, title: 'Experiencia', text: 'Conocemos Posadas y el NEA en profundidad. Te asesoramos con datos reales del mercado local.' },
  { icon: Award, title: 'Calidad', text: 'Seleccionamos propiedades que cumplen los más altos estándares de construcción y ubicación.' },
  { icon: Users, title: 'Atención personalizada', text: 'Cada cliente tiene sus propias necesidades. Nuestro equipo acompaña cada paso del proceso.' },
];

const cardContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const cardItem = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: EXPO } },
};

export function AboutSection() {
  // Real photo of the best featured listing (landscape, most photos) instead of a stock image.
  const { properties } = useProperties();
  const showcase = useMemo(
    () => pickShowcase(properties.filter(p => p.type === 'casa' || p.type === 'departamento')),
    [properties],
  );

  const sectionRef = useRef<HTMLElement>(null);
  const textInView = useInView(sectionRef, { once: true, margin: '-80px' });

  const valuesRef = useRef<HTMLDivElement>(null);
  const valuesInView = useInView(valuesRef, { once: true, margin: '-60px' });

  return (
    <section ref={sectionRef} id="nosotros" className="relative py-24 px-4 bg-paper overflow-hidden">
      {/* Decorative top line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-black/10 to-transparent" />

      <div className="max-w-7xl mx-auto">
        {/* Two-column intro */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center mb-20">
          {/* Text column */}
          <motion.div
            initial={{ opacity: 0, x: -44 }}
            animate={textInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 1, ease: EXPO }}
          >
            <span className="eyebrow text-accent-deep mb-4 block">
              La experiencia Trevisan
            </span>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-ink leading-[1.08] mb-6">
              Tu propiedad,<br />nuestra prioridad
            </h2>
            <p className="text-ink-soft text-lg leading-relaxed mb-5">
              En Trevisan Inmuebles sabemos que comprar, vender o alquilar una propiedad es una de las decisiones más importantes de tu vida. Por eso ponemos toda nuestra experiencia a tu servicio.
            </p>
            <p className="text-ink-soft leading-relaxed">
              Nuestro equipo de asesores especializados en el mercado de Posadas y Misiones está disponible para guiarte en cada etapa, desde la búsqueda hasta la firma. Transparencia, profesionalismo y compromiso, siempre.
            </p>
            <div className="mt-8 flex gap-10">
              {[
                { number: 'NEA', label: 'región de operaciones' },
                { number: '100%', label: 'atención personalizada' },
                { number: 'CCPIM', label: 'matrícula habilitante' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={textInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, ease: EXPO, delay: 0.35 + i * 0.1 }}
                >
                  <div className="text-3xl font-bold font-display text-ink">{stat.number}</div>
                  <div className="text-xs text-ink-soft mt-1">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Image column */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: 44, scale: 0.97 }}
            animate={textInView ? { opacity: 1, x: 0, scale: 1 } : {}}
            transition={{ duration: 1, ease: EXPO, delay: 0.1 }}
          >
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] border border-stone-300/60 shadow-md bg-stone-100">
              {showcase && (
                <>
                  <img
                    src={coverOf(showcase)}
                    alt={showcase.title}
                    loading="lazy"
                    decoding="async"
                    className="img-crisp w-full h-full object-cover"
                  />
                  <div className="absolute left-4 bottom-4 max-w-[calc(100%-2rem)] bg-white/85 backdrop-blur-md border border-stone-300/60 rounded-xl px-4 py-3 shadow-sm shadow-stone-900/5">
                    <p className="eyebrow text-ink-soft mb-1">Propiedad destacada</p>
                    <p className="text-ink text-sm line-clamp-1">
                      {showcase.title}{locationLabel(showcase) ? ` · ${locationLabel(showcase)}` : ''}
                    </p>
                  </div>
                </>
              )}
            </div>
            {/* Accent decorations */}
            <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-2xl bg-[#e07b2a]/10 border border-[#e07b2a]/20 -z-10" />
            <div className="absolute -top-4 -right-4 w-32 h-32 rounded-full border border-black/10 -z-10" />
          </motion.div>
        </div>

        {/* Values grid */}
        <motion.div
          ref={valuesRef}
          variants={cardContainer}
          initial="hidden"
          animate={valuesInView ? 'visible' : 'hidden'}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {VALUES.map(value => {
            const Icon = value.icon;
            return (
              <motion.div
                key={value.title}
                variants={cardItem}
                whileHover={{ y: -5, transition: { duration: 0.25, ease: 'easeOut' } }}
                className="p-6 bg-white/90 border border-stone-300/60 shadow-md rounded-2xl hover:shadow-xl hover:border-[#e07b2a]/40 transition-shadow group cursor-default"
              >
                <div className="w-10 h-10 rounded-xl bg-[#e07b2a]/15 group-hover:bg-[#e07b2a]/25 flex items-center justify-center mb-4 transition-colors">
                  <Icon size={18} className="text-accent-deep" />
                </div>
                <h3 className="font-semibold text-ink mb-2">{value.title}</h3>
                <p className="text-ink-soft text-sm leading-relaxed">{value.text}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
