import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NACA_TEXT_DRAG_RISE, SYMBOL_WINDOW, loadDataset, sampledDragRiseMach } from "@jet-workshop/validation";
import { mach2, percent0, ratio1 } from "../src/format.ts";
import {
  GAP_FROM,
  GAP_TO,
  LESSON_CL,
  LIFT_WINDOWS_DEG,
  WINGS,
  dragRise,
  drawnSymbols,
  fairedAt,
  fairedCurve,
  formulaAgreement,
  liftLossRange,
  rightSymbolsLower,
  sweepDragCut,
  wallRatio,
} from "../src/lesson/facts.ts";

const data = loadDataset(readFileSync(new URL("../../../packages/validation/data/bielat-l52b08.csv", import.meta.url), "utf8"));

describe("lesson figures, fixed at today's values (brief 002)", () => {
  it("step 3: drawn symbols at M 0.95 over M 0.50, 10.8 deg wing, measured: 1.9", () => {
    const f = wallRatio(data)!;
    expect(f.dataClass).toBe("measured");
    expect(f.value.ratio).toBeCloseTo(1.863, 2);
    expect([mach2(f.value.high), mach2(f.value.low), ratio1(f.value.ratio)]).toEqual(["0.95", "0.50", "1.9"]);
  });

  it("step 5: the 47 deg wing drags 37 % less than the 10.8 deg wing at M 0.95, NACA faired", () => {
    const f = sweepDragCut(data)!;
    expect(f.dataClass).toBe("NACA faired");
    expect(f.value.percent).toBeCloseTo(37.08, 1);
    expect(percent0(f.value.percent)).toBe("37");
  });

  it("step 5: the rise starts at M 0.92 and 0.95 on the faired curves; the 47 deg curve never reaches dCD/dM = 0.1, so its 0.97 comes from the report's text", () => {
    const f = dragRise(data);
    expect(f["10.8"]!.dataClass).toBe("NACA faired");
    expect(f["35"]!.dataClass).toBe("NACA faired");
    expect(f["10.8"]!.value).toBeCloseTo(0.921, 3);
    expect(f["35"]!.value).toBeCloseTo(0.951, 3);
    expect(f["47"]!.dataClass).toBe("report text");
    expect(f["47"]!.value).toBe(0.97);
    expect([mach2(f["10.8"]!.value), mach2(f["35"]!.value), mach2(f["47"]!.value)]).toEqual(["0.92", "0.95", "0.97"]);
  });

  it("step 5: the report-text figure carries its document, page and sentence, and the sentence states it", () => {
    const s = dragRise(data)["47"]!.source!;
    expect([s.document, s.printedPage, s.pdfPage, s.section]).toEqual(["NACA RM L52B08", 8, 10, "Drag Characteristics"]);
    expect(s.quote).toContain(`drag-rise Mach number from ${NACA_TEXT_DRAG_RISE["10.8"]!.value.toFixed(2)} to ${s.value.toFixed(2)}`);
    expect(sampledDragRiseMach(fairedCurve(data, "47").map((x) => ({ mach: x.mach, cd: x.cd0 })))).toBeNull();
  });

  it("step 6: the 47 deg wing gives between 4 and 13 % less lift per degree than the 10.8 deg wing at M 0.50, over four angle windows (computed)", () => {
    const f = liftLossRange(data)!;
    expect(f.dataClass).toBe("computed");
    expect(f.value.windows.map((w) => w.limitDeg)).toEqual([...LIFT_WINDOWS_DEG]);
    expect(f.value.windows.map((w) => Number(w.percent.toFixed(2)))).toEqual([7.84, 12.92, 6.98, 4.13]);
    expect(f.value.windows.map((w) => w.n)).toEqual([[2, 3], [3, 4], [5, 5], [9, 8]]);
    expect([percent0(f.value.min), percent0(f.value.max)]).toEqual(["4", "13"]);
  });

  it("step 7: drawn symbols below the critical Mach number with |E| <= u_val, computed", () => {
    const counts = WINGS.map((w) => formulaAgreement(data, w)!);
    for (const c of counts) expect(c.dataClass).toBe("computed");
    expect(counts.map((c) => [c.value.inside, c.value.total])).toEqual([[2, 2], [1, 1], [1, 2]]);
  });

  it("step 4's sentence holds: the 47 deg wing's symbols on the right sit below the 10.8 deg wing's (measured)", () => {
    const f = rightSymbolsLower(data);
    expect(f.dataClass).toBe("measured");
    expect(f.value).toBe(true);
  });
});

describe("rules behind the figures", () => {
  it("the pictures draw only symbols near CL 0.10, as the bench does", () => {
    for (const w of WINGS) for (const p of drawnSymbols(data, w)) expect(Math.abs(p.cl - LESSON_CL)).toBeLessThanOrEqual(SYMBOL_WINDOW);
  });

  it("the faired curve is never interpolated across the stretch without data, nor outside its samples", () => {
    const c35 = fairedCurve(data, "35");
    expect(c35.some((s) => s.mach < GAP_TO && s.mach > GAP_FROM)).toBe(false);
    expect(fairedAt(c35, (GAP_FROM + GAP_TO) / 2)).toBeNull();
    expect(fairedAt(c35, 0.4)).toBeNull();
    const at = c35.find((s) => Math.abs(s.mach - 0.95) < 1e-6)!;
    expect(fairedAt(c35, 0.95)).toBeCloseTo(at.cd0, 12);
  });
});
