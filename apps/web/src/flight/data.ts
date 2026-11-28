import csvText from "../../../../packages/validation/data/bielat-l52b08.csv?raw";
import type { TestedWingId } from "@jet-workshop/physics";
import type { WingAeroTables } from "@jet-workshop/physics/flight";
import { loadDataset } from "@jet-workshop/validation";
import { allWingTables } from "./tables.ts";

export type TablesState = { ok: true; tables: Record<TestedWingId, WingAeroTables> } | { ok: false; error: string };

/** Parse the bundled dataset once and build the three wings' tables; a failure is shown, never hidden. */
export function loadTables(): TablesState {
  try {
    return { ok: true, tables: allWingTables(loadDataset(csvText)) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
