import { renderHook, act } from '@testing-library/react';
import { useRealtimeHighlight } from '../../lib/realtime/useRealtimeHighlight';

describe('useRealtimeHighlight hook', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('1. Highlights an entity ID on trigger and clears after duration', () => {
    const { result } = renderHook(() => useRealtimeHighlight(1000));

    expect(result.current.isHighlighted('prod-101')).toBe(false);
    expect(result.current.getHighlightClass('prod-101')).toBe('');

    act(() => {
      result.current.triggerHighlight('prod-101');
    });

    expect(result.current.isHighlighted('prod-101')).toBe(true);
    expect(result.current.getHighlightClass('prod-101')).toContain('bg-blue-500/15');

    act(() => {
      jest.advanceTimersByTime(1001);
    });

    expect(result.current.isHighlighted('prod-101')).toBe(false);
    expect(result.current.getHighlightClass('prod-101')).toBe('');
  });

  it('2. Supports emerald success highlight variant', () => {
    const { result } = renderHook(() => useRealtimeHighlight(1000));

    act(() => {
      result.current.triggerHighlight('inv-501');
    });

    expect(result.current.getHighlightClass('inv-501', 'emerald')).toContain('bg-emerald-500/15');
  });
});
