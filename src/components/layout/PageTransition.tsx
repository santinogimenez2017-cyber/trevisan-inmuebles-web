import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Wraps each route's content with a smooth enter/exit transition.
 * Used inside AnimatePresence mode="wait" in App.tsx.
 *
 * Enter: fade up from y:20 → 0, opacity 0 → 1
 * Exit:  fade up to  y:-15, opacity 1 → 0
 * Spring feels snappier than a tween for page changes.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{
        type: 'spring',
        stiffness: 280,
        damping: 30,
        mass: 0.8,
        // exit is faster than enter — feels decisive, not slow
        ...(typeof window !== 'undefined' && {
          exit: { duration: 0.18, ease: [0.4, 0, 1, 1] },
        }),
      }}
    >
      {children}
    </motion.div>
  );
}
