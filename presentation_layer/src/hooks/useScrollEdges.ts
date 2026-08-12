import { useCallback, useEffect, useRef, useState } from 'react';

export interface ScrollEdges {
  /** True when the element's content is taller than its box. */
  isScrollable: boolean;
  /** True when scrolled to the very top (or not scrollable at all). */
  atTop: boolean;
  /** True when scrolled to the very bottom (or not scrollable at all). */
  atBottom: boolean;
}

const TOLERANCE = 1;

/**
 * Tracks whether a scroll container overflows and which end it currently sits
 * at, so callers can arm scroll affordances (hairlines, edge fades) only when
 * there is actually more content in that direction.
 *
 * Watches scroll position, its own box, and its children — content that grows
 * after mount (async data, expanded rows) re-measures without a scroll event.
 */
export function useScrollEdges<T extends HTMLElement>(enabled: boolean = true) {
  const ref = useRef<T>(null);
  const [edges, setEdges] = useState<ScrollEdges>({
    isScrollable: false,
    atTop: true,
    atBottom: true,
  });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    const overflow = el.scrollHeight - el.clientHeight;
    const isScrollable = overflow > TOLERANCE;
    const next: ScrollEdges = {
      isScrollable,
      atTop: !isScrollable || el.scrollTop <= TOLERANCE,
      atBottom: !isScrollable || el.scrollTop >= overflow - TOLERANCE,
    };

    setEdges((prev) =>
      prev.isScrollable === next.isScrollable &&
      prev.atTop === next.atTop &&
      prev.atBottom === next.atBottom
        ? prev
        : next
    );
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    measure();

    el.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);

    return () => {
      el.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      observer.disconnect();
    };
  }, [enabled, measure]);

  return { ref, measure, ...edges };
}
