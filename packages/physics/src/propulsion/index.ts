// Engine model. Lane E builds it here (docs/briefs/007-engine-workshop.md).
//
// Version 0 (gate 2): a single-spool turbojet designed from four decisions, with the technology of
// the General Electric J47 of 1949. Its outputs are "estimated" everywhere: the model did not
// reproduce the J47 tests within the preregistered criterion (docs/studies/002-engine-cycle.md).
export type * from "./contract.ts";

import { designBasis } from "./design.ts";
import type { EngineDesign } from "./contract.ts";

export { ENGINE_DESIGN_RANGES, designEngine } from "./design.ts";
export { GAS_MODEL_RANGE_LIMIT_ID, TURBINE_INLET_TEMPERATURE_LIMIT_ID } from "./limits.ts";

/**
 * The J47 as a design: air flow, pressure ratio and turbine inlet temperature of the anchored model
 * at sea-level static and rated speed. Computed, not measured: the tunnel did not test there.
 */
export function j47Design(): EngineDesign {
  // A copy: whatever the caller does with it cannot reach the engine's own.
  return { ...designBasis().j47Design };
}
