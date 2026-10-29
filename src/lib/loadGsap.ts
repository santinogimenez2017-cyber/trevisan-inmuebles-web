// Lazy, shared loader for GSAP so every consumer reuses the same chunk/promise.
// Resolves to null if the chunk fails to load → callers fall back to a static (still usable) UI.
type GsapModule = typeof import('./gsap');

let pending: Promise<GsapModule | null> | null = null;

export function loadGsap(): Promise<GsapModule | null> {
  pending ??= import('./gsap').catch(() => null);
  return pending;
}
