import { useReducedMotion } from 'framer-motion';

/**
 * Hook and utilities for respecting user accessibility prefers-reduced-motion.
 */
export function useMotionSafe() {
  const shouldReduceMotion = useReducedMotion();
  return {
    shouldReduceMotion: !!shouldReduceMotion,
    getTransition: <T>(normalTransition: T, fallbackTransition: T): T => {
      return shouldReduceMotion ? fallbackTransition : normalTransition;
    }
  };
}

export const reducedMotionVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.1 } },
  exit: { opacity: 0, transition: { duration: 0.05 } }
};
