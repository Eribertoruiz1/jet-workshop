import type { TestedWingId } from "@jet-workshop/physics";

/**
 * A figure the report states in its text, not read from one of its figures.
 * Data class "report text". It carries the document, the page and the
 * sentence it comes from, so that it is never written as a bare number.
 */
export interface ReportTextValue {
  value: number;
  document: string;
  /** Page number printed on the page */
  printedPage: number;
  /** Page of the scanned PDF */
  pdfPage: number;
  section: string;
  /** The sentence, as printed (the OCR of the scan reads "10 .80 to 470" for "10.8° to 47°") */
  quote: string;
}

const DRAG_RISE_SOURCE = {
  document: "NACA RM L52B08",
  printedPage: 8,
  pdfPage: 10,
  section: "Drag Characteristics",
  quote: "Increasing the sweepback angle from 10.8° to 47° resulted in an increase in the drag-rise Mach number from 0.92 to 0.97.",
} as const;

/**
 * Drag-rise Mach numbers (dCD/dM = 0.1, the report's definition) that the
 * report states in its text, for the 10.8 and 47 deg wings. For the 35 deg
 * wing the text gives none.
 */
export const NACA_TEXT_DRAG_RISE: Partial<Record<TestedWingId, ReportTextValue>> = {
  "10.8": { value: 0.92, ...DRAG_RISE_SOURCE },
  "47": { value: 0.97, ...DRAG_RISE_SOURCE },
};
