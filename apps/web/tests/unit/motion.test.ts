import {
  transitions,
  EASINGS,
  DURATIONS,
  motionPresets,
  useMotionSafe,
  reducedMotionVariants
} from '../../lib/motion';

describe('AIAVRO Motion System Engine', () => {
  it('1. Exports standardized easing curves and durations', () => {
    expect(EASINGS.outQuint).toEqual([0.23, 1, 0.32, 1]);
    expect(DURATIONS.fast).toBe(0.16);
    expect(DURATIONS.normal).toBe(0.22);
    expect(DURATIONS.spatial).toBe(0.28);
  });

  it('2. Exposes all required enterprise motion presets', () => {
    expect(motionPresets.appear).toBeDefined();
    expect(motionPresets.dialog).toBeDefined();
    expect(motionPresets.drawerRight).toBeDefined();
    expect(motionPresets.drawerLeft).toBeDefined();
    expect(motionPresets.staggerContainer).toBeDefined();
    expect(motionPresets.staggerItem).toBeDefined();
    expect(motionPresets.realtimePulse).toBeDefined();
    expect(motionPresets.realtimeSuccess).toBeDefined();
  });

  it('3. Provides accessible reduced-motion fallbacks', () => {
    expect(reducedMotionVariants.initial).toEqual({ opacity: 0 });
    expect(reducedMotionVariants.animate).toEqual({ opacity: 1, transition: { duration: 0.1 } });
  });
});
