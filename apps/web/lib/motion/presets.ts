import {
  appearVariants,
  revealVariants,
  liftVariants,
  slideUpVariants,
  drawerRightVariants,
  drawerLeftVariants,
  dialogEnterVariants,
  crossfadeVariants,
  staggerContainerVariants,
  staggerItemVariants,
  realtimeHighlightVariants,
  realtimeSuccessHighlightVariants
} from './variants';
import { transitions, EASINGS, DURATIONS } from './transitions';

export const motionPresets = {
  appear: appearVariants,
  reveal: revealVariants,
  lift: liftVariants,
  slideUp: slideUpVariants,
  drawerRight: drawerRightVariants,
  drawerLeft: drawerLeftVariants,
  dialog: dialogEnterVariants,
  crossfade: crossfadeVariants,
  staggerContainer: staggerContainerVariants,
  staggerItem: staggerItemVariants,
  realtimePulse: realtimeHighlightVariants,
  realtimeSuccess: realtimeSuccessHighlightVariants
};

export { EASINGS, DURATIONS, transitions };
