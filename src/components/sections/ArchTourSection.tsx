import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, Bed, Bath, Square } from 'lucide-react';
import { useProperties, formatPrice, locationLabel, coverOf, type Property } from '@/data/properties';
import { loadGsap } from '@/lib/loadGsap';

const EXPO = [0.22, 1, 0.36, 1] as [number, number, number, number];

const TYPE_LABELS: Record<string, string> = {
  casa: 'Casa',
  departamento: 'Departamento',
  terreno: 'Terreno',
  local: 'Local',
  ph: 'PH',
  oficina: 'Oficina',
};

// Timeline units (scrubbed by scroll): each slide holds STEP units, the crossfade lasts FADE.
const STEP = 1.2;
const FADE = 0.6;

/** Pin + scrub only where it feels right: precise pointer, tablet-or-larger, motion allowed.
 *  Touch devices never get a pinned section → native scroll stays untouched. */
const canPin = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 768px)').matches &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function Specs({ p }: { p: Property }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-ink-soft text-sm">
      {p.bedrooms !== undefined && (
        <span className="flex items-center gap-1.5"><Bed size={15} className="text-accent-deep" />{p.bedrooms} dorm.</span>
      )}
      {p.bathrooms !== undefined && (
        <span className="flex items-center gap-1.5"><Bath size={15} className="text-accent-deep" />{p.bathrooms} baños</span>
      )}
      {p.area !== undefined && (
        <span className="flex items-center gap-1.5"><Square size={15} className="text-accent-deep" />{p.area} m²</span>
      )}
    </div>
  );
}

function SlideCopy({ p, index, total }: { p: Property; index: number; total: number }) {
  return (
    <>
      <span className="eyebrow text-accent-deep mb-5 block">
        {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        <span className="mx-3 text-ink/30">—</span>
        {TYPE_LABELS[p.type] ?? p.type} en {p.operation}
      </span>
      <h3 className="font-display text-4xl sm:text-5xl lg:text-6xl text-ink leading-[1.04] mb-5 line-clamp-3">
        {p.title}
      </h3>
      <p className="text-ink-soft text-base mb-6">{locationLabel(p)}</p>
      <Specs p={p} />
      <div className="mt-8 flex items-center gap-8">
        <p className="font-display text-3xl text-ink">{formatPrice(p)}</p>
        <Link
          to={`/propiedad/${p.slug}`}
          className="group inline-flex items-center gap-2 text-sm text-ink border-b border-ink/40 pb-1 hover:border-accent-deep hover:text-accent-deep transition-colors"
        >
          Ver propiedad
          <ArrowUpRight size={15} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>
    </>
  );
}

/** Desktop: image stays pinned while copy + specs advance with the scroll (GSAP ScrollTrigger scrub). */
function PinnedTour({ slides }: { slides: Property[] }) {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let cancelled = false;
    let ctx: { revert: () => void } | undefined;

    loadGsap().then(mod => {
      if (cancelled || !mod) return;
      const { gsap, ScrollTrigger } = mod;
      const imgs = gsap.utils.toArray<HTMLElement>('[data-tour-img]', stage);
      const copies = gsap.utils.toArray<HTMLElement>('[data-tour-copy]', stage);
      const bar = stage.querySelector<HTMLElement>('[data-tour-bar]');
      const last = slides.length - 1;
      const total = last * STEP + STEP;

      ctx = gsap.context(() => {
        const tl = gsap.timeline({
          defaults: { ease: 'power2.inOut' },
          scrollTrigger: {
            trigger: stage,
            start: 'top top',
            end: () => `+=${Math.round(window.innerHeight * (last * 0.85 + 0.5))}`,
            pin: true,
            scrub: 0.4,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        // Continuous slow push-in on every photo while it is on screen
        imgs.forEach((img, i) => {
          tl.fromTo(img, { scale: 1.14 }, { scale: 1, duration: STEP * 2, ease: 'none' }, i === 0 ? 0 : i * STEP);
        });

        for (let i = 1; i <= last; i++) {
          const at = i * STEP;
          tl.fromTo(imgs[i], { opacity: 0 }, { opacity: 1, duration: FADE }, at);
          tl.to(copies[i - 1], { autoAlpha: 0, y: -36, duration: FADE * 0.6 }, at);
          tl.fromTo(copies[i], { autoAlpha: 0, y: 36 }, { autoAlpha: 1, y: 0, duration: FADE, ease: 'power3.out' }, at + FADE * 0.45);
        }

        if (bar) tl.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: total, ease: 'none' }, 0);
        tl.set({}, {}, total); // hold the last slide for a beat
      }, stage);

      ScrollTrigger.refresh();
    });

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [slides]);

  return (
    <section aria-label="Recorrido por propiedades destacadas">
      <div ref={stageRef} className="relative h-screen min-h-[620px] overflow-hidden bg-paper">
        {/* Photos — stacked, the next one fades over the previous */}
        {slides.map((p, i) => (
          <div
            key={p.id}
            data-tour-img
            className="absolute inset-0"
            style={{ opacity: i === 0 ? 1 : 0, willChange: 'transform, opacity' }}
          >
            <img
              src={coverOf(p)}
              alt={p.title}
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
              className="img-crisp w-full h-full object-cover"
            />
          </div>
        ))}

        {/* Ivory veil: flat on narrow screens, a narrow wash over the copy column (left half) on wide ones */}
        <div className="absolute inset-0 bg-[#f4f2ed]/85 lg:hidden pointer-events-none" />
        <div
          className="absolute inset-y-0 left-0 w-1/2 pointer-events-none hidden lg:block"
          style={{ background: 'linear-gradient(90deg, rgba(244,242,237,0.95) 0%, rgba(244,242,237,0.9) 68%, rgba(244,242,237,0.6) 88%, rgba(244,242,237,0) 100%)' }}
        />
        <div className="absolute inset-x-0 bottom-0 h-1/5 bg-gradient-to-t from-[#f3f1ec]/80 to-transparent pointer-events-none" />

        {/* Section masthead */}
        <div className="absolute top-24 inset-x-0 z-10 pointer-events-none">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-4">
            <span className="eyebrow !text-ink-soft">Recorrido arquitectónico</span>
            <span className="eyebrow !text-ink-soft hidden sm:block">Posadas, Misiones</span>
          </div>
        </div>

        {/* Copy — one panel per slide, advanced by the scrub */}
        <div className="absolute inset-0 z-10 flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative">
            {slides.map((p, i) => (
              <div
                key={p.id}
                data-tour-copy
                className={`max-w-2xl ${i === 0 ? '' : 'absolute inset-x-4 sm:inset-x-6 lg:inset-x-8 top-1/2 -translate-y-1/2'}`}
                style={i === 0 ? undefined : { visibility: 'hidden' }}
              >
                <SlideCopy p={p} index={i} total={slides.length} />
              </div>
            ))}
          </div>
        </div>

        {/* Scroll progress hairline */}
        <div className="absolute bottom-0 inset-x-0 h-px bg-ink/10 z-20">
          <div data-tour-bar className="h-full bg-[#e07b2a] origin-left" style={{ transform: 'scaleX(0)' }} />
        </div>
      </div>
    </section>
  );
}

/** Touch / reduced-motion: plain stacked cards, native scrolling, no pinning. */
function StackedTour({ slides }: { slides: Property[] }) {
  return (
    <section className="bg-paper" aria-label="Recorrido por propiedades destacadas">
      <div className="px-4 sm:px-6 pt-16 pb-8 max-w-7xl mx-auto">
        <span className="eyebrow text-accent-deep">Recorrido arquitectónico</span>
      </div>
      {slides.map((p, i) => (
        <div key={p.id} className="relative h-[78vh] min-h-[480px] overflow-hidden">
          <img src={coverOf(p)} alt={p.title} loading="lazy" decoding="async" className="img-crisp absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, rgba(243,241,236,1) 0%, rgba(243,241,236,0.92) 55%, rgba(243,241,236,0) 100%)' }} />
          <motion.div
            className="absolute inset-x-0 bottom-0 px-4 sm:px-6 pb-10 max-w-7xl mx-auto"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, ease: EXPO }}
          >
            <SlideCopy p={p} index={i} total={slides.length} />
          </motion.div>
        </div>
      ))}
    </section>
  );
}

export function ArchTourSection() {
  const { properties } = useProperties();
  const [pinned] = useState(canPin);

  const slides = useMemo(
    () => properties.filter(p => p.featured && p.images.length > 0).slice(0, 4),
    [properties],
  );

  if (slides.length < 2) return null;
  return pinned ? <PinnedTour slides={slides} /> : <StackedTour slides={slides} />;
}
