import { useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, TouchEvent as ReactTouchEvent } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Bed, Bath, Square, MapPin, Tag, Star, Sparkles } from 'lucide-react';
import { formatPrice, locationLabel, type Property } from '@/data/properties';

const TYPE_LABELS: Record<string, string> = {
  casa: 'Casa',
  departamento: 'Departamento',
  terreno: 'Terreno',
  local: 'Local',
  ph: 'PH',
  oficina: 'Oficina',
};

/** Max photos browsable from the card (the rest are in the detail page / lightbox). */
const PREVIEW_MAX = 6;
const SWIPE_PX = 36;

/** Derive a status badge for the property if relevant */
function getStatusBadge(p: Property): { label: string; icon: 'star' | 'sparkle' } | null {
  // Premium: USD price above 150 000
  if (p.currency === 'USD' && p.price >= 150000) {
    return { label: 'Exclusivo', icon: 'sparkle' };
  }
  // Featured: explicitly flagged in data
  if (p.featured) {
    return { label: 'Destacado', icon: 'star' };
  }
  // Source status (e.g. "A estrenar", "En pozo")
  if (p.status) {
    return { label: p.status, icon: 'sparkle' };
  }
  return null;
}

export function PropertyCard({ property }: { property: Property }) {
  const badge = getStatusBadge(property);

  // ── Photo preview ─────────────────────────────────────────────────────────
  // images[0] is the base layer (keeps the layoutId). Other photos are mounted on top only once
  // visited (plus the next one, as a prefetch), so nothing is downloaded until the user asks.
  const count = Math.min(property.images.length, PREVIEW_MAX);
  const [idx, setIdx] = useState(0);
  const [seen, setSeen] = useState<number[]>([]);
  const lastPointer = useRef<string>('mouse');
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swipedAt = useRef(0);

  const goTo = (next: number) => {
    const i = Math.max(0, Math.min(count - 1, next));
    setIdx(i);
    setSeen(s => {
      const add = [i, i + 1].filter(n => n > 0 && n < count && !s.includes(n));
      return add.length ? [...s, ...add] : s;
    });
  };

  const indexFromX = (e: { clientX: number; currentTarget: HTMLElement }) => {
    const r = e.currentTarget.getBoundingClientRect();
    return Math.floor(((e.clientX - r.left) / r.width) * count);
  };

  const onImagePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && count > 1) goTo(indexFromX(e));
  };
  const onImageTouchStart = (e: ReactTouchEvent<HTMLDivElement>) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onImageTouchEnd = (e: ReactTouchEvent<HTMLDivElement>) => {
    const s = touchStart.current;
    touchStart.current = null;
    if (!s || count < 2) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(t.clientY - s.y) * 1.5) {
      swipedAt.current = Date.now();
      goTo(idx + (dx < 0 ? 1 : -1));
    }
  };
  /** Touch: tapping the indicator strip changes photo instead of opening the listing. */
  const onStripClick = (e: ReactMouseEvent<HTMLSpanElement>) => {
    if (lastPointer.current !== 'touch') return; // mouse/keyboard: normal navigation
    e.preventDefault();
    goTo(indexFromX(e));
  };
  const onLinkClick = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    if (Date.now() - swipedAt.current < 350) e.preventDefault(); // a swipe is not a click
  };

  // Cursor-driven spotlight/sheen: writes CSS vars directly (no React state), at most once per frame.
  const frame = useRef(0);
  const onPointerMove = (e: ReactPointerEvent<HTMLAnchorElement>) => {
    if (e.pointerType !== 'mouse' || frame.current) return;
    const el = e.currentTarget;
    const { clientX, clientY } = e;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${clientX - r.left}px`);
      el.style.setProperty('--my', `${clientY - r.top}px`);
    });
  };

  return (
    <motion.div
      whileHover={{ y: -8, boxShadow: '0 24px 48px rgba(28,25,23,0.12), 0 8px 16px rgba(28,25,23,0.06)', transition: { type: 'spring', stiffness: 340, damping: 20 } }}
      whileTap={{ scale: 0.985 }}
      style={{ borderRadius: '1rem', boxShadow: '0 1px 2px rgba(28,25,23,0.05)' }}
    >
      <Link
        to={`/propiedad/${property.slug}`}
        onPointerMove={onPointerMove}
        onPointerLeave={e => { if (e.pointerType === 'mouse') setIdx(0); }}
        onClick={onLinkClick}
        className="card-lux group block rounded-2xl overflow-hidden p-px"
      >
        <span className="card-beam" aria-hidden="true" />
        <div className="card-face">
        {/* Image */}
        <div
          className="relative overflow-hidden aspect-[4/3]"
          style={{ touchAction: 'pan-y' }}
          onPointerMove={onImagePointerMove}
          onTouchStart={onImageTouchStart}
          onTouchEnd={onImageTouchEnd}
        >
          <span className="card-sheen" aria-hidden="true" />
          {/*
            layoutId matches PropertyDetailPage hero (activeImage === 0).
            Framer Motion morphs the image from card → detail on navigation.
          */}
          <motion.img
            layoutId={`property-img-${property.slug}`}
            src={property.images[0]}
            alt={property.title}
            loading="lazy"
            decoding="async"
            className="img-crisp w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          />

          {/* Preview layers — crossfade by opacity only */}
          {seen.map(i => (
            <img
              key={i}
              src={property.images[i]}
              alt=""
              aria-hidden="true"
              decoding="async"
              className={`img-crisp absolute inset-0 w-full h-full object-cover transition-[opacity,transform] duration-300 group-hover:scale-[1.06] ${idx === i ? 'opacity-100' : 'opacity-0'}`}
            />
          ))}

          {/* Operation + type badges */}
          <div className="absolute top-3 left-3 flex gap-1.5">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide
              ${property.operation === 'venta' ? 'bg-ink text-white' : 'bg-accent text-white'}`}>
              {property.operation}
            </span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/80 backdrop-blur-md border border-stone-300/60 text-ink uppercase tracking-wide">
              {TYPE_LABELS[property.type] ?? property.type}
            </span>
          </div>

          {/* ── Glass status badge — top right corner ───────────────── */}
          {/*
            Shown only when the property is featured or premium.
            Uses the glass-light pattern: backdrop-blur + semi-transparent bg.
            Animates in with a spring pop to draw attention without being noisy.
          */}
          {badge && (
            <motion.div
              className="absolute top-3 right-3"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.1 }}
            >
              <span className="inline-flex items-center gap-1 bg-white/80 backdrop-blur-md border border-stone-300/60 text-ink text-[10px] font-semibold px-2.5 py-1 rounded-full">
                {badge.icon === 'sparkle'
                  ? <Sparkles size={9} className="text-accent-deep" />
                  : <Star size={9} className="text-accent-deep fill-accent" />
                }
                {badge.label}
              </span>
            </motion.div>
          )}

          {/* Price overlay */}
          <div className="absolute left-3 bottom-7 bg-white/85 backdrop-blur-md border border-stone-300/60 rounded-xl px-3 py-1.5 shadow-sm shadow-stone-900/5">
            <p className="text-ink font-bold text-lg">{formatPrice(property)}</p>
          </div>

          {/* Image pagination bars (hover = scrub, touch = swipe or tap) */}
          {count > 1 && (
            <span
              className="absolute inset-x-0 bottom-0 z-[4] flex items-end gap-1 px-4 pb-2 pt-4"
              onPointerDown={e => { lastPointer.current = e.pointerType; }}
              onClick={onStripClick}
              aria-hidden="true"
            >
              {Array.from({ length: count }, (_, i) => (
                <span
                  key={i}
                  className={`h-[3px] flex-1 rounded-full transition-colors duration-200 ${idx === i ? 'bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.18)]' : 'bg-white/60 shadow-[0_0_0_1px_rgba(0,0,0,0.12)]'}`}
                />
              ))}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-semibold text-ink text-base mb-1 line-clamp-1 group-hover:text-accent-deep transition-colors">
            {property.title}
          </h3>
          <div className="flex items-center gap-1 text-ink-soft text-sm mb-3">
            <MapPin size={12} className="shrink-0" />
            <span className="line-clamp-1">{locationLabel(property)}</span>
          </div>

          {/* Features */}
          <div className="flex items-center gap-4 text-gray-600 text-sm">
            {property.bedrooms !== undefined && (
              <span className="flex items-center gap-1">
                <Bed size={14} className="text-accent-deep" />
                {property.bedrooms}
              </span>
            )}
            {property.bathrooms !== undefined && (
              <span className="flex items-center gap-1">
                <Bath size={14} className="text-accent-deep" />
                {property.bathrooms}
              </span>
            )}
            {property.area !== undefined && (
              <span className="flex items-center gap-1">
                <Square size={14} className="text-accent-deep" />
                {property.area} m²
              </span>
            )}
            {property.parking !== undefined && property.parking > 0 && (
              <span className="flex items-center gap-1">
                <Tag size={14} className="text-accent-deep" />
                {property.parking} coch.
              </span>
            )}
          </div>
        </div>
        </div>
      </Link>
    </motion.div>
  );
}
