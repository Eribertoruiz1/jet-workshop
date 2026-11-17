/**
 * The airfield of the first flight. Not physics: the scenario the model flies in.
 *
 * A flight in a vertical plane cannot turn back to the runway it left (turns
 * need bank, which is outside the model), so the flight ends on a second
 * runway ahead. Both are 3000 m long, the order of a fighter base's runway.
 */

import type { Scenario } from "@jet-workshop/physics/flight";

export const RUNWAY_LENGTH_M = 3000;
/** Threshold of the landing runway, m from the threshold of the take-off runway. */
export const LANDING_RUNWAY_START_M = 60000;

export const SCENARIO: Scenario = {
  runways: [
    { start_m: 0, length_m: RUNWAY_LENGTH_M },
    { start_m: LANDING_RUNWAY_START_M, length_m: RUNWAY_LENGTH_M },
  ],
};
