// Single place where GSAP + plugins are registered.
// Always import this module with a dynamic `import('@/lib/gsap')` (see loadGsap.ts) so GSAP
// stays out of the initial bundle (Vite emits it as its own chunk, downloaded in parallel).
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

// Phones: don't re-measure every time the URL bar collapses (keeps native scroll jank-free).
ScrollTrigger.config({ ignoreMobileResize: true });

export { gsap, ScrollTrigger, SplitText };
