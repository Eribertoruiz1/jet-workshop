/**
 * The flight scene on a canvas: a technical sheet that moves (brief 006).
 * Sky `page`, ground and height lines `grid`, aircraft and forces `ink`, the
 * sum of the forces `accent`, nothing else in colour.
 *
 * Two scales. The world (ground, runway marks every 100 m, height lines every
 * 1000 m) is drawn to a scale that shrinks as the aircraft climbs, with a
 * scale bar. The aircraft is drawn at a fixed size on screen, so its forces
 * can be read at any height; the forces are drawn to their own scale, length
 * proportional to force over weight.
 */

import type { Observation, Scenario } from "@jet-workshop/physics/flight";
import type { Point, Profile } from "./profile.ts";

export interface Palette {
  readonly page: string;
  readonly ink: string;
  readonly ink2: string;
  readonly grid: string;
  readonly accent: string;
  readonly font: string;
}

export interface Frame {
  /** Interpolated position and attitude */
  readonly x: number;
  readonly h: number;
  readonly theta: number;
  readonly obs: Observation;
}

export interface Labels {
  readonly lift: string;
  readonly weight: string;
  readonly thrust: string;
  readonly drag: string;
  readonly sum: string;
  /** Height line label, metres filled in */
  readonly height: (m: number) => string;
  /** Scale bar label, metres filled in */
  readonly scale: (m: number) => string;
  readonly paused: string | null;
}

/** Pixels per metre of the world at a height: zooms out as the aircraft climbs. */
export function worldScale(width: number, h: number): number {
  return width / 700 / (1 + Math.max(0, h) / 350);
}

/** Pixels per unit of weight for the force arrows. */
export function forceScale(width: number, height: number): number {
  return 0.11 * Math.min(width, height);
}

function niceLength(target: number): number {
  const steps = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];
  return steps.find((s) => s >= target) ?? steps[steps.length - 1]!;
}

function arrow(ctx: CanvasRenderingContext2D, x0: number, y0: number, dx: number, dy: number, colour: string, width: number): void {
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const ux = dx / len;
  const uy = dy / len;
  const head = Math.min(9, 0.35 * len);
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x0 + dx - ux * head * 0.6, y0 + dy - uy * head * 0.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x0 + dx, y0 + dy);
  ctx.lineTo(x0 + dx - ux * head - uy * head * 0.45, y0 + dy - uy * head + ux * head * 0.45);
  ctx.lineTo(x0 + dx - ux * head + uy * head * 0.45, y0 + dy - uy * head - ux * head * 0.45);
  ctx.closePath();
  ctx.fill();
}

function polygon(ctx: CanvasRenderingContext2D, pts: readonly Point[], map: (p: Point) => Point): void {
  ctx.beginPath();
  pts.forEach((p, i) => {
    const [x, y] = map(p);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
}

export function drawScene(ctx: CanvasRenderingContext2D, width: number, height: number, pal: Palette, f: Frame, prof: Profile, scenario: Scenario, labels: Labels): void {
  const s = worldScale(width, f.h);
  // Screen position of the aircraft's reference point.
  const ax = width * 0.36;
  const ay = height * 0.46;
  const groundY = ay + f.h * s;
  const X = (x: number): number => ax + (x - f.x) * s;

  ctx.fillStyle = pal.page;
  ctx.fillRect(0, 0, width, height);
  ctx.font = `11px ${pal.font}`;
  ctx.textBaseline = "alphabetic";

  // Height lines every 1000 m.
  ctx.strokeStyle = pal.grid;
  ctx.fillStyle = pal.ink2;
  ctx.lineWidth = 1;
  // Height at the bottom edge of the canvas: the lowest line that can show.
  const first = Math.max(1, Math.ceil((f.h - (height - ay) / s) / 1000));
  for (let k = first; ; k++) {
    const y = groundY - k * 1000 * s;
    if (y < -1) break;
    if (y > height) continue;
    ctx.beginPath();
    ctx.moveTo(0, Math.round(y) + 0.5);
    ctx.lineTo(width, Math.round(y) + 0.5);
    ctx.stroke();
    if (1000 * s > 14) ctx.fillText(labels.height(k * 1000), 6, y - 3);
  }

  // Ground and runways.
  if (groundY < height + 2) {
    ctx.fillStyle = pal.grid;
    ctx.fillRect(0, groundY, width, 2);
    for (const r of scenario.runways) {
      const x0 = X(r.start_m);
      const x1 = X(r.start_m + r.length_m);
      if (x1 < 0 || x0 > width) continue;
      ctx.fillStyle = pal.grid;
      ctx.fillRect(x0, groundY - 2, x1 - x0, 6);
      if (100 * s >= 4) {
        ctx.strokeStyle = pal.ink2;
        ctx.lineWidth = 1;
        for (let m = 0; m <= r.length_m; m += 100) {
          const x = X(r.start_m + m);
          if (x < -2 || x > width + 2) continue;
          ctx.beginPath();
          ctx.moveTo(Math.round(x) + 0.5, groundY - 2);
          ctx.lineTo(Math.round(x) + 0.5, groundY + 4);
          ctx.stroke();
        }
      }
    }
  }

  // Scale bar of the world.
  const bar = niceLength(70 / s);
  const bx = 10;
  const by = height - 12;
  ctx.strokeStyle = pal.ink2;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(bx, by - 4);
  ctx.lineTo(bx, by);
  ctx.lineTo(bx + bar * s, by);
  ctx.lineTo(bx + bar * s, by - 4);
  ctx.stroke();
  ctx.fillStyle = pal.ink2;
  ctx.fillText(labels.scale(bar), bx + bar * s + 6, by);

  // Aircraft, at a fixed size on screen, rotated by its attitude.
  const lengthPx = Math.max(70, Math.min(170, width * 0.2));
  const k = lengthPx / prof.length_m;
  const ref = prof.length_m * 0.55; // the point mass, drawn near the wing
  const c = Math.cos(f.theta);
  const sn = Math.sin(f.theta);
  const map = ([x, z]: Point): Point => {
    // Body x points aft: flying right, the nose is on the right.
    const bx2 = (ref - x) * k;
    const bz = z * k;
    return [ax + bx2 * c - bz * sn, ay - (bx2 * sn + bz * c)];
  };
  const o = f.obs;

  // Mach lines above Mach 1: from the nose, at the Mach angle to the flight path, closing as it speeds up.
  if (o.mach > 1) {
    const mu = Math.asin(1 / o.mach);
    const [nx, ny] = map([0, 0]);
    const len = Math.hypot(width, height) * 1.5;
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 0.75;
    for (const sign of [1, -1]) {
      const a = o.gamma + Math.PI + sign * mu;
      ctx.beginPath();
      ctx.moveTo(nx, ny);
      ctx.lineTo(nx + Math.cos(a) * len, ny - Math.sin(a) * len);
      ctx.stroke();
    }
  }

  ctx.fillStyle = pal.page;
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = 1.4;
  polygon(ctx, prof.body, map);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 1;
  polygon(ctx, prof.root, map);
  ctx.stroke();
  polygon(ctx, prof.tip, map);
  ctx.fillStyle = pal.ink;
  ctx.fill();

  // Forces: length proportional to force over weight.
  const fs = forceScale(width, height) / o.weight_N;
  const v = o.vectors;
  const forces: [readonly [number, number], string][] = [
    [v.lift, labels.lift],
    [v.weight, labels.weight],
    [v.thrust, labels.thrust],
    [v.drag, labels.drag],
  ];
  ctx.font = `11px ${pal.font}`;
  for (const [vec, name] of forces) {
    const dx = vec[0] * fs;
    const dy = -vec[1] * fs;
    arrow(ctx, ax, ay, dx, dy, pal.ink, 1.4);
    if (Math.hypot(dx, dy) > 14) {
      ctx.fillStyle = pal.ink;
      const u = Math.hypot(dx, dy);
      ctx.textAlign = dx < -4 ? "right" : dx > 4 ? "left" : "center";
      ctx.fillText(name, ax + dx + (dx / u) * 6, ay + dy + (dy / u) * 6 + (dy > 0 ? 10 : -2));
    }
  }
  const rx = v.resultant[0] * fs;
  const ry = -v.resultant[1] * fs;
  arrow(ctx, ax, ay, rx, ry, pal.accent, 2.2);
  if (Math.hypot(rx, ry) > 14) {
    ctx.fillStyle = pal.accent;
    ctx.textAlign = rx < 0 ? "right" : "left";
    ctx.fillText(labels.sum, ax + rx + (rx < 0 ? -6 : 6), ay + ry + (ry > 0 ? 12 : -4));
  }
  ctx.textAlign = "left";

  if (labels.paused) {
    ctx.fillStyle = pal.ink;
    ctx.font = `bold 15px ${pal.font}`;
    ctx.textAlign = "center";
    ctx.fillText(labels.paused, width / 2, 28);
    ctx.textAlign = "left";
  }
}
