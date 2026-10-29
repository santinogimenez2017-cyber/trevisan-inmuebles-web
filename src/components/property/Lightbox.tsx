import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react';

interface LightboxProps {
  images: string[];
  /** Index of the photo to show, or null when closed. */
  index: number | null;
  title: string;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

const ZOOM = 2.2;
const SWIPE_PX = 60;

/**
 * Fullscreen photo viewer. Rendered in a portal (the page transition wrapper uses transforms,
 * which would break `position: fixed`). Photos are shown at native resolution, contained in the
 * viewport; click / button toggles a 2.2× zoom that pans with the cursor.
 */
export function Lightbox({ images, index, title, onIndexChange, onClose }: LightboxProps) {
  const open = index !== null;
  const total = images.length;
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchX = useRef<number | null>(null);

  const go = useCallback((dir: 1 | -1) => {
    if (index === null || total < 2) return;
    setZoomed(false);
    onIndexChange((index + dir + total) % total);
  }, [index, total, onIndexChange]);

  // Keyboard: Esc closes, arrows navigate
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, go, onClose]);

  // Lock page scroll + restore focus on close
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.documentElement.style.overflow = prevOverflow;
      previous?.focus?.();
      setZoomed(false); // always reopen un-zoomed
    };
  }, [open]);

  // Warm the cache for the neighbours so next/prev feels instant
  useEffect(() => {
    if (index === null || total < 2) return;
    [(index + 1) % total, (index - 1 + total) % total].forEach(i => {
      const img = new Image();
      img.decoding = 'async';
      img.src = images[i];
    });
  }, [index, total, images]);

  const onImageMove = (e: ReactMouseEvent<HTMLImageElement>) => {
    if (!zoomed) return;
    const r = e.currentTarget.getBoundingClientRect();
    // r is the *scaled* box; map the cursor back to unscaled percentages
    const x = Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100));
    setOrigin(`${x}% ${y}%`);
  };

  const toggleZoom = (e: ReactMouseEvent<HTMLImageElement>) => {
    e.stopPropagation();
    if (!zoomed) {
      const r = e.currentTarget.getBoundingClientRect();
      setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
    }
    setZoomed(z => !z);
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && index !== null && (
        <motion.div
          key="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Galería de ${title}`}
          data-lenis-prevent
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center select-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
          onTouchEnd={e => {
            const start = touchX.current;
            touchX.current = null;
            if (start === null || zoomed) return;
            const dx = e.changedTouches[0].clientX - start;
            if (Math.abs(dx) > SWIPE_PX) go(dx < 0 ? 1 : -1);
          }}
        >
          {/* Top bar */}
          <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between p-4 sm:p-6 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
            <span className="text-white/80 text-sm tabular-nums pointer-events-auto" aria-live="polite">
              {index + 1} / {total}
            </span>
            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setZoomed(z => !z); }}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                aria-label={zoomed ? 'Reducir' : 'Ampliar'}
              >
                {zoomed ? <ZoomOut size={18} /> : <ZoomIn size={18} />}
              </button>
              <button
                ref={closeRef}
                type="button"
                onClick={e => { e.stopPropagation(); onClose(); }}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                aria-label="Cerrar galería"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Photo */}
          <div className="w-full h-full flex items-center justify-center overflow-hidden px-2 sm:px-16 py-16">
            <AnimatePresence mode="wait" initial={false}>
              <motion.img
                key={index}
                src={images[index]}
                alt={`${title} — foto ${index + 1} de ${total}`}
                draggable={false}
                className="img-crisp max-w-full max-h-full w-auto h-auto object-contain"
                style={{ transformOrigin: origin, cursor: zoomed ? 'zoom-out' : 'zoom-in' }}
                initial={{ opacity: 0, scale: 1 }}
                animate={{ opacity: 1, scale: zoomed ? ZOOM : 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                onClick={toggleZoom}
                onMouseMove={onImageMove}
              />
            </AnimatePresence>
          </div>

          {/* Prev / next */}
          {total > 1 && (
            <>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); go(-1); }}
                className="absolute left-2 sm:left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                aria-label="Foto anterior"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); go(1); }}
                className="absolute right-2 sm:right-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                aria-label="Foto siguiente"
              >
                <ChevronRight size={22} />
              </button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
