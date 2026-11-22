/**
 * The values frozen before any drag data is read (PREREGISTRATION.md, A.6;
 * PLAN.md, step 3b). run.ts checks that the verification still selects N0 and
 * m0; the other values are fixed by rule or by source, never by data.
 */

export const FREEZE = {
  /** Smoothing: Fourier terms of the equivalent-body series (verification rule, PLAN.md section 6) */
  n0: 32,
  /** Gauss-Legendre nodes per theta sub-interval (same rule, at N0) */
  m0: 8,
  /** B1: E_WD = 1. No open source consulted gives a value (PREREGISTRATION.md, A.9: B1 E_WD = 1 when there is no guide). */
  ewdB1: 1,
  /**
   * D2: width of the logistic in the transonic similarity parameter
   * xi0 = (M^2 - 1) / [(gamma + 1) tau]^(2/3) (Spreiter, NACA TN 2726, eq. 30).
   * Neither TN 2726 nor McDevitt, NACA Report 1253, gives an analytic form or a
   * width of the drag rise (Report 1253 has faired curves only, its fig. 8), so
   * by the rule of PLAN.md, section 5, the width is 1.
   */
  d2Width: 1,
  gamma: 1.4,
  /** One-sided step for the slope of W above M = 1 (bridge P3) */
  slopeStepAboveOne: 0.01,
} as const;
