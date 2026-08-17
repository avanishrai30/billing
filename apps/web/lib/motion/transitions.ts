import { Transition } from 'framer-motion';

/**
 * Standardized easing curves for enterprise OPERATE interface.
 * Fast, precise, and calm with zero bounce.
 */
export const EASINGS = {
  // Swift deceleration for modals, drawers, and direct interactions
  outQuint: [0.23, 1, 0.32, 1] as [number, number, number, number],
  // Smooth symmetric curve for tabs, layout shifts, and crossfades
  inOutQuint: [0.86, 0, 0.07, 1] as [number, number, number, number],
  // Snappy enter ease for lists and menu items
  snappy: [0.16, 1, 0.3, 1] as [number, number, number, number]
};

export const DURATIONS = {
  instant: 0.1,   // 100ms: micro hover & active states
  fast: 0.16,     // 160ms: dropdowns, tooltips, list items
  normal: 0.22,   // 220ms: modals, tabs, state morphs
  spatial: 0.28   // 280ms: drawers, slide-overs, route shells
};

export const transitions: Record<string, Transition> = {
  instant: {
    duration: DURATIONS.instant,
    ease: EASINGS.snappy
  },
  fast: {
    duration: DURATIONS.fast,
    ease: EASINGS.snappy
  },
  normal: {
    duration: DURATIONS.normal,
    ease: EASINGS.outQuint
  },
  spatial: {
    duration: DURATIONS.spatial,
    ease: EASINGS.outQuint
  },
  springSnappy: {
    type: 'spring',
    stiffness: 350,
    damping: 30,
    mass: 0.8
  },
  springGentle: {
    type: 'spring',
    stiffness: 250,
    damping: 25,
    mass: 1
  }
};
