import { useEffect } from 'react';

/**
 * Mounts Lenis only on desktop-class devices (mouse/trackpad) that haven't asked for reduced motion.
 * Phones and tablets never download or run it, so touch scrolling stays native and instant.
 */
export function SmoothScroll() {
  useEffect(() => {
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!finePointer || reduceMotion) return;

    let cancelled = false;
    let stop: (() => void) | undefined;

    import('@/lib/smoothScroll')
      .then(m => {
        if (cancelled) return;
        stop = m.startSmoothScroll();
      })
      .catch(() => { /* Lenis failed to load: native scroll keeps working */ });

    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  return null;
}
