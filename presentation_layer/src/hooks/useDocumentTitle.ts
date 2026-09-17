import { useEffect } from "react";

/**
 * Sets `document.title` while the calling component is mounted, and restores
 * the previous title on unmount. Pass an optional suffix segment to compose
 * the full browser-tab title like `Suffix · FCR-SCS`.
 */
export function useDocumentTitle(title: string, suffix: string = "FCR-SCS"): void {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const previous = document.title;
    const composed = suffix ? `${title} · ${suffix}` : title;
    document.title = composed;
    return () => {
      document.title = previous;
    };
  }, [title, suffix]);
}