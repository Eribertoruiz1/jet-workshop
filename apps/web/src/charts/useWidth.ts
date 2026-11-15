import { useCallback, useLayoutEffect, useState } from "react";

/**
 * Width of an element in CSS pixels, kept up to date. Charts draw with a
 * viewBox of exactly this width, so 11 px of SVG text is 11 px on screen at
 * any width (brief 002: a fixed 860 px viewBox shrank text to 5 px on a phone).
 */
export function useWidth<T extends HTMLElement>(fallback = 640): [(el: T | null) => void, number] {
  const [el, setEl] = useState<T | null>(null);
  const [width, setWidth] = useState(fallback);
  const ref = useCallback((node: T | null) => setEl(node), []);
  useLayoutEffect(() => {
    if (!el) return;
    const read = () => {
      const w = Math.floor(el.clientWidth - parseFloat(getComputedStyle(el).paddingLeft) - parseFloat(getComputedStyle(el).paddingRight));
      if (w > 0) setWidth(w);
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [ref, width];
}

/** Average advance of B612 in em, for wrapping SVG text (digits are 1300 of 2048 units). */
const EM = 0.62;

/** Split text into lines that fit a width at a font size, breaking at spaces. */
export function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const perLine = Math.max(8, Math.floor(maxWidth / (fontSize * EM)));
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > perLine && cur) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Estimated width of a text at a font size. */
export const textWidth = (text: string, fontSize: number): number => text.length * fontSize * EM;

/**
 * Vertical positions for direct labels so that none overlaps: sorted by
 * their wanted position, pushed apart to at least `gap` px, the group kept
 * centred on the wanted positions. Returns positions in the input order.
 */
export function spreadLabels(wanted: number[], gap = 13): number[] {
  const order = wanted.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
  const placed = order.map((o) => o.y);
  for (let k = 1; k < placed.length; k++) if (placed[k]! - placed[k - 1]! < gap) placed[k] = placed[k - 1]! + gap;
  const shift = (order.reduce((a, o) => a + o.y, 0) - placed.reduce((a, b) => a + b, 0)) / Math.max(1, placed.length);
  const out: number[] = Array.from({ length: wanted.length }, () => 0);
  order.forEach((o, k) => (out[o.i] = placed[k]! + shift));
  return out;
}
