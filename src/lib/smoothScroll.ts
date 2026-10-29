import Lenis from 'lenis';
import { gsap, ScrollTrigger } from './gsap';
import { registerScroller } from './scroll';

/**
 * Inertial scroll for desktop. Lenis is driven by GSAP's ticker (one single rAF loop for the
 * whole page) and reports every scroll frame to ScrollTrigger, so pins/scrubs never lag behind.
 * Touch devices are never given to Lenis (syncTouch stays off) — they keep native scrolling.
 */
export function startSmoothScroll(): () => void {
  const lenis = new Lenis({
    lerp: 0.085,
    smoothWheel: true,
    syncTouch: false,
    anchors: true,
    autoRaf: false,
  });

  lenis.on('scroll', ScrollTrigger.update);

  const tick = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  registerScroller(lenis);

  return () => {
    gsap.ticker.remove(tick);
    gsap.ticker.lagSmoothing(500, 33);
    registerScroller(null);
    lenis.destroy();
  };
}
