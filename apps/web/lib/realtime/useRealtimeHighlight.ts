'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Hook for managing subtle contextual highlight animations on table rows or cards
 * following real-time Socket.IO synchronization events.
 */
export function useRealtimeHighlight(durationMs: number = 1500) {
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const triggerHighlight = useCallback(
    (id: string | number | undefined | null) => {
      if (!id) return;
      const strId = String(id);

      setHighlightedIds((prev) => {
        const next = new Set(prev);
        next.add(strId);
        return next;
      });

      // Clear existing timeout if any
      if (timeoutsRef.current.has(strId)) {
        clearTimeout(timeoutsRef.current.get(strId)!);
      }

      // Schedule removal
      const timeout = setTimeout(() => {
        setHighlightedIds((prev) => {
          const next = new Set(prev);
          next.delete(strId);
          return next;
        });
        timeoutsRef.current.delete(strId);
      }, durationMs);

      timeoutsRef.current.set(strId, timeout);
    },
    [durationMs]
  );

  useEffect(() => {
    return () => {
      // Cleanup all timeouts on unmount
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current.clear();
    };
  }, []);

  const isHighlighted = useCallback(
    (id: string | number | undefined | null): boolean => {
      if (!id) return false;
      return highlightedIds.has(String(id));
    },
    [highlightedIds]
  );

  const getHighlightClass = useCallback(
    (
      id: string | number | undefined | null,
      type: 'blue' | 'emerald' = 'blue'
    ): string => {
      if (!id || !highlightedIds.has(String(id))) return '';
      return type === 'emerald'
        ? 'bg-emerald-500/15 ring-1 ring-emerald-500/30 transition-colors duration-700'
        : 'bg-blue-500/15 ring-1 ring-blue-500/30 transition-colors duration-700';
    },
    [highlightedIds]
  );

  return {
    triggerHighlight,
    isHighlighted,
    getHighlightClass,
    highlightedIds
  };
}
