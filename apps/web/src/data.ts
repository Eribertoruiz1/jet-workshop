import csvText from "../../../packages/validation/data/bielat-l52b08.csv?raw";
import { loadDataset, type Dataset } from "@jet-workshop/validation";

export type DataState = { ok: true; data: Dataset } | { ok: false };

/** Parse the bundled dataset once; a failure is shown, never hidden. */
export function loadBundledData(): DataState {
  try {
    const data = loadDataset(csvText);
    if (!data.polar.length) return { ok: false };
    return { ok: true, data };
  } catch {
    return { ok: false };
  }
}
