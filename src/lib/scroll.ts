// Scroll helpers that work with or without Lenis.
// Lenis only runs on desktop (fine pointer); on touch devices everything falls back to native scroll.

interface SmoothScroller {
  scrollTo(
    target: number | string | HTMLElement,
    options?: { offset?: number; immediate?: boolean; force?: boolean },
  ): void;
}

let scroller: SmoothScroller | null = null;

export function registerScroller(instance: SmoothScroller | null) {
  scroller = instance;
}

export function scrollToTop() {
  if (scroller) scroller.scrollTo(0, { immediate: true, force: true });
  else window.scrollTo(0, 0);
}

export function scrollToSection(hash: string) {
  const el = document.querySelector<HTMLElement>(hash);
  if (!el) return;
  if (scroller) scroller.scrollTo(el);
  else el.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Scrolls to `hash` as soon as its element exists in the DOM — needed after a route change, when
 * the home page mounts only after the outgoing page's exit animation. Gives up after `timeoutMs`.
 * Returns a cancel function for effect cleanup.
 */
export function scrollToSectionWhenReady(hash: string, timeoutMs = 3000): () => void {
  let raf = 0;
  const start = performance.now();
  const tick = () => {
    if (document.querySelector(hash)) {
      scrollToSection(hash);
    } else if (performance.now() - start < timeoutMs) {
      raf = requestAnimationFrame(tick);
    }
  };
  tick();
  return () => cancelAnimationFrame(raf);
}
