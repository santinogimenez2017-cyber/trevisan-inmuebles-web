import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, ArrowRight } from 'lucide-react';
import { useProperties, useNeighborhoods } from '@/hooks/useProperties';
import { loadGsap } from '@/lib/loadGsap';
import { trackPropertySearch } from '@/lib/analytics';
import { HeroParticles } from './HeroParticles';

// Editorial 4K architecture photography (Unsplash CDN, 2560 px wide, q90) — rotates behind the hero.
const unsplash = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=2560&q=90`;
const HERO_IMAGES = [
  unsplash('photo-1600596542815-ffad4c1539a9'), // modern house, pool at dusk
  unsplash('photo-1600607687939-ce8a6c25118c'), // lit contemporary interior
  unsplash('photo-1600585154340-be6161a56a0c'), // minimalist facade
  unsplash('photo-1613490493576-7fde63acd811'), // avant-garde villa
];

export function HeroSection() {
  const navigate      = useNavigate();
  const sectionRef    = useRef<HTMLElement>(null);
  const bgRef         = useRef<HTMLDivElement>(null);
  const contentRef    = useRef<HTMLDivElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const [imgIndex, setImgIndex] = useState(0);

  // Listing count in the hero meta line comes from Supabase.
  const { properties } = useProperties();

  // Auto-cycle images
  useEffect(() => {
    const t = setInterval(() => setImgIndex(i => (i + 1) % HERO_IMAGES.length), 6000);
    return () => clearInterval(t);
  }, []);

  // Warm the cache for the slides after the first so crossfades never flash empty.
  useEffect(() => {
    HERO_IMAGES.slice(1).forEach(src => { const im = new Image(); im.decoding = 'async'; im.src = src; });
  }, []);

  // ── GSAP: cinematic intro timeline + scroll-scrubbed exit ───────────────────
  // GSAP only touches wrapper elements (data-hero / refs). Buttons keep their Framer hover
  // transforms on their own nodes, so the two libraries never write the same transform.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const reveal = () => section.classList.remove('hero-pending');

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      reveal();
      return;
    }

    let cancelled = false;
    let ctx: { revert: () => void } | undefined;
    let split: { revert: () => void } | undefined;
    const failSafe = setTimeout(reveal, 2500); // never leave the hero invisible

    loadGsap().then(async mod => {
      if (cancelled) return;
      if (!mod) { reveal(); return; }
      const { gsap, SplitText } = mod;

      // Wait for the serif to be ready so lines are measured with the final font (max 1.2 s).
      await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1200))]);
      if (cancelled) return;

      const el = (name: string) => section.querySelector<HTMLElement>(`[data-hero="${name}"]`)!;
      const eyebrow = el('eyebrow');
      const headline = el('headline');
      const sub = el('sub');
      const cta = el('cta');
      const meta = el('meta');
      const search = el('search');
      const cue = el('cue');

      ctx = gsap.context(() => {
        // 1 ── Intro: headline lines rise out of line masks, layers follow with staggered inertia
        const lineSplit = SplitText.create(headline, {
          type: 'lines',
          mask: 'lines',
          linesClass: 'hero-line',
          aria: 'auto',
        });
        split = lineSplit;

        const intro = gsap.timeline({
          defaults: { ease: 'expo.out' },
          onComplete: () => lineSplit.revert(), // back to plain text: reflows naturally on resize
        });
        intro
          .from(eyebrow, { autoAlpha: 0, yPercent: 60, duration: 1 }, 0.1)
          .from(lineSplit.lines, { yPercent: 118, duration: 1.3, stagger: 0.13 }, 0.22)
          .from(sub,    { autoAlpha: 0, yPercent: 40, duration: 1.1 }, 0.78)
          .from(cta,    { autoAlpha: 0, yPercent: 50, duration: 1.1 }, 0.92)
          .from(meta,   { autoAlpha: 0, yPercent: 60, duration: 1.1 }, 1.04)
          .from(search, { autoAlpha: 0, y: 40, duration: 1.3 }, 1.0)
          .from(cue,    { autoAlpha: 0, duration: 1 }, 1.7);
        reveal();

        // 2 ── Scroll: every layer drifts at its own rate (deeper layers lag more) and fades out
        const vh = () => window.innerHeight;
        gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
            invalidateOnRefresh: true,
          },
        })
          .to(bgRef.current,         { yPercent: 25, scale: 1.12, duration: 1 }, 0)
          .to(contentRef.current,    { opacity: 0, duration: 0.65 }, 0)
          .to(searchWrapRef.current, { opacity: 0, y: () => vh() * 0.05, duration: 0.55 }, 0)
          .to(eyebrow,  { y: () => vh() * 0.04, duration: 1 }, 0)
          .to(headline, { y: () => vh() * 0.09, duration: 1 }, 0)
          .to(sub,      { y: () => vh() * 0.14, duration: 1 }, 0)
          .to(cta,      { y: () => vh() * 0.19, duration: 1 }, 0)
          .to(meta,     { y: () => vh() * 0.23, duration: 1 }, 0);
      }, section);
    });

    return () => {
      cancelled = true;
      clearTimeout(failSafe);
      split?.revert();
      ctx?.revert();
    };
  }, []);

  return (
    /*
      Layout: section is min-h-screen / flex-col. The content block is flex-1 and vertically
      centred; the search panel is a normal-flow sibling so nothing overlaps on 1366×768.
      `hero-pending` hides the copy until GSAP has set the initial state (see index.css).
    */
    <section
      ref={sectionRef}
      className="hero-pending relative min-h-screen flex flex-col overflow-hidden bg-paper"
    >
      {/* ── Background photo — parallax plane (deepest layer, driven by GSAP) ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div ref={bgRef} className="absolute inset-0" style={{ willChange: 'transform' }}>
          <AnimatePresence mode="sync">
            {HERO_IMAGES[imgIndex] && (
              <motion.div
                key={imgIndex}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: 'easeInOut' }}
              >
                <img
                  src={HERO_IMAGES[imgIndex]}
                  alt="Propiedad de Trevisan Inmuebles en Posadas"
                  className="img-crisp w-full h-full object-cover"
                  decoding="async"
                  loading="eager"
                  fetchPriority="high"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* Lens vignette: subtle edge falloff for photographic depth (multiply never lifts the text area) */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-black/20 mix-blend-multiply" />
        {/* Linen veil. Small screens: a flat lift (the copy spans the full width). Large screens: one
            continuous full-width gradient (no half-width panel, so no vertical seam) that is densest
            behind the serif copy on the left and eases out smoothly to let the photo breathe on the
            right. Stops keep the ink text above WCAG AA over the new photographs. */}
        <div className="absolute inset-0 bg-[#f3f1ec]/85 lg:hidden" />
        <div
          className="absolute inset-0 hidden lg:block"
          style={{ background: 'linear-gradient(90deg, rgba(243,241,236,0.93) 0%, rgba(243,241,236,0.86) 30%, rgba(243,241,236,0.62) 55%, rgba(243,241,236,0.3) 80%, rgba(243,241,236,0.12) 100%)' }}
        />
        <div className="absolute inset-x-0 bottom-0 h-1/4 lg:h-1/5 bg-gradient-to-t from-[#f3f1ec]/90 via-[#f3f1ec]/30 to-transparent" />
      </div>

      {/* ── Diffuse light + dust that leans away from the cursor (desktop only) ── */}
      <HeroParticles />

      {/* ── Image indicators — right edge ─────────────────────────────────────── */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20 pointer-events-auto">
        {HERO_IMAGES.map((_, i) => (
          <button
            key={i}
            onClick={() => setImgIndex(i)}
            className="relative overflow-hidden"
            aria-label={`Imagen ${i + 1}`}
          >
            <motion.div
              className="w-0.5 rounded-full bg-ink/25"
              animate={{ height: i === imgIndex ? 32 : 14 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
            />
            {i === imgIndex && (
              <motion.div
                className="absolute top-0 left-0 w-0.5 rounded-full bg-[#e07b2a]"
                initial={{ height: 0 }}
                animate={{ height: 32 }}
                transition={{ duration: 6, ease: 'linear' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* ── Content ───────────────────────────────────────────────────────────── */}
      <div ref={contentRef} className="relative z-10 flex-1 flex items-center pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-8 md:py-10">

          {/* Eyebrow — hairline + small caps instead of a pill */}
          <div data-hero="eyebrow" className="flex items-center gap-4 mb-7">
            <span className="h-px w-10 bg-[#e07b2a]" />
            <span className="eyebrow text-ink-soft">Trevisan Inmuebles · Posadas, Misiones</span>
          </div>

          <h1
            data-hero="headline"
            className="font-display text-[2.6rem] sm:text-6xl lg:text-7xl xl:text-[5.25rem] text-ink leading-[1.02] mb-7 max-w-4xl"
          >
            Encontrá el lugar donde empieza tu{' '}
            <em className="italic text-accent-deep">próxima historia</em>
          </h1>

          <p data-hero="sub" className="text-ink-soft text-base md:text-lg max-w-md mb-9 leading-relaxed">
            Encontramos la propiedad ideal para vos en Posadas, Misiones y el NEA.
          </p>

          <div data-hero="cta" className="flex flex-wrap gap-3">
            <motion.button
              onClick={() => navigate('/propiedades')}
              className="btn-shimmer inline-flex items-center gap-2 bg-accent text-white font-medium px-7 py-3.5 rounded-full text-sm"
              whileHover={{ scale: 1.04, backgroundColor: '#a64b0b' }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 350, damping: 22 }}
            >
              Explorar propiedades
              <motion.span
                className="inline-block"
                animate={{ x: [0, 3, 0] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut', repeatDelay: 1 }}
              >
                <ArrowRight size={15} />
              </motion.span>
            </motion.button>

            <motion.a
              href="#contacto"
              className="btn-shimmer inline-flex items-center gap-2 glass-light text-ink font-medium px-7 py-3.5 rounded-full text-sm"
              whileHover={{ scale: 1.03, backgroundColor: '#ffffff' }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 350, damping: 22 }}
            >
              Hablar con un asesor
            </motion.a>
          </div>

          {/* Real data: listing count from the scraped catalogue + the institutional address */}
          <p data-hero="meta" className="eyebrow mt-10 flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-soft">
            <span>{properties.length > 0 ? `${properties.length} propiedades` : 'Propiedades'}</span>
            <span className="h-px w-8 bg-ink/25" />
            <span>Roque González 1137, Posadas</span>
          </p>
        </div>
      </div>

      {/* ── Search panel — normal flow, never overlaps the content above ─────── */}
      <div ref={searchWrapRef} className="relative z-10 px-4 pb-8">
        <div data-hero="search">
          <HeroSearch />
        </div>

        <div data-hero="cue" className="flex flex-col items-center gap-1 text-ink-soft mt-5 pointer-events-none">
          <span className="eyebrow text-[9px]">Scroll</span>
          <motion.div
            animate={{ y: [0, 4, 0] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
          >
            <ChevronDown size={13} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ── Search panel ──────────────────────────────────────────────
function HeroSearch() {
  const navigate = useNavigate();
  const neighborhoods = useNeighborhoods(); // real barrios from the Supabase catalogue
  const [operation, setOperation] = useState('');
  const [type, setType] = useState('');
  const [neighborhood, setNeighborhood] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (operation)    p.set('operacion', operation);
    if (type)         p.set('tipo', type);
    if (neighborhood) p.set('barrio', neighborhood);
    trackPropertySearch({ operation, type, neighborhood });
    navigate(`/propiedades?${p.toString()}`);
  };

  return (
    <form
      onSubmit={handleSearch}
      className="max-w-4xl mx-auto glass-panel rounded-2xl p-5 sm:p-7"
    >
      <p className="eyebrow text-ink-soft mb-4">Buscar propiedad</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Operación', value: operation, setter: setOperation, options: [
            { v: 'venta', l: 'Venta' }, { v: 'alquiler', l: 'Alquiler' },
          ]},
          { label: 'Tipo', value: type, setter: setType, options: [
            { v: 'casa', l: 'Casa' }, { v: 'departamento', l: 'Depto.' },
            { v: 'terreno', l: 'Terreno' }, { v: 'local', l: 'Local' },
          ]},
          { label: 'Barrio / Ciudad', value: neighborhood, setter: setNeighborhood,
            options: neighborhoods.map(n => ({ v: n, l: n })) },
        ].map(({ label, value, setter, options }) => (
          <div key={label} className="relative">
            <select
              value={value}
              onChange={e => setter(e.target.value)}
              aria-label={label}
              className="w-full bg-white border border-stone-300/60 text-ink text-sm rounded-xl px-4 py-3.5 appearance-none focus:outline-none focus:ring-2 focus:ring-[#e07b2a]/50 transition-all"
              style={{ colorScheme: 'light' }}
            >
              <option value="" className="bg-white">{label}</option>
              {options.map(o => (
                <option key={o.v} value={o.v} className="bg-white">{o.l}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none" />
          </div>
        ))}

        <motion.button
          type="submit"
          className="flex items-center justify-center gap-2 bg-accent text-white font-medium px-6 py-3.5 rounded-xl text-sm"
          whileHover={{ scale: 1.03, backgroundColor: '#a64b0b' }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 380, damping: 22 }}
        >
          <Search size={15} />
          Buscar
        </motion.button>
      </div>
    </form>
  );
}
