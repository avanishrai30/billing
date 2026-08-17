import { Variants } from 'framer-motion';
import { EASINGS, DURATIONS } from './transitions';

export const appearVariants: Variants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: DURATIONS.normal, ease: EASINGS.outQuint }
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: DURATIONS.fast, ease: EASINGS.snappy }
  }
};

export const revealVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATIONS.fast, ease: EASINGS.snappy }
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: DURATIONS.fast, ease: EASINGS.snappy }
  }
};

export const liftVariants: Variants = {
  initial: { y: 0, scale: 1 },
  hover: {
    y: -1,
    scale: 1.005,
    transition: { duration: DURATIONS.fast, ease: EASINGS.snappy }
  },
  tap: {
    y: 0,
    scale: 0.995,
    transition: { duration: DURATIONS.instant, ease: EASINGS.snappy }
  }
};

export const slideUpVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATIONS.normal, ease: EASINGS.outQuint }
  },
  exit: {
    opacity: 0,
    y: 12,
    transition: { duration: DURATIONS.fast, ease: EASINGS.snappy }
  }
};

export const drawerRightVariants: Variants = {
  initial: { x: '100%', opacity: 0.9 },
  animate: {
    x: 0,
    opacity: 1,
    transition: { duration: DURATIONS.spatial, ease: EASINGS.outQuint }
  },
  exit: {
    x: '100%',
    opacity: 0.9,
    transition: { duration: DURATIONS.normal, ease: EASINGS.outQuint }
  }
};

export const drawerLeftVariants: Variants = {
  initial: { x: '-100%', opacity: 0.9 },
  animate: {
    x: 0,
    opacity: 1,
    transition: { duration: DURATIONS.spatial, ease: EASINGS.outQuint }
  },
  exit: {
    x: '-100%',
    opacity: 0.9,
    transition: { duration: DURATIONS.normal, ease: EASINGS.outQuint }
  }
};

export const dialogEnterVariants: Variants = {
  initial: { opacity: 0, scale: 0.96, y: 8 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: DURATIONS.normal, ease: EASINGS.outQuint }
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 8,
    transition: { duration: DURATIONS.fast, ease: EASINGS.snappy }
  }
};

export const crossfadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: DURATIONS.fast, ease: 'easeOut' }
  },
  exit: {
    opacity: 0,
    transition: { duration: DURATIONS.instant, ease: 'easeIn' }
  }
};

export const staggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.02
    }
  }
};

export const staggerItemVariants: Variants = {
  initial: { opacity: 0, y: 4 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATIONS.fast, ease: EASINGS.snappy }
  }
};

export const realtimeHighlightVariants: Variants = {
  initial: { backgroundColor: 'var(--highlight-flash, rgba(59, 130, 246, 0.25))' },
  animate: {
    backgroundColor: 'transparent',
    transition: { duration: 1.2, ease: 'easeOut' }
  }
};

export const realtimeSuccessHighlightVariants: Variants = {
  initial: { backgroundColor: 'var(--highlight-success, rgba(16, 185, 129, 0.25))' },
  animate: {
    backgroundColor: 'transparent',
    transition: { duration: 1.2, ease: 'easeOut' }
  }
};
