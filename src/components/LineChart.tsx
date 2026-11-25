"use client";
import { useId, useRef, useState } from "react";

export interface ChartSeries {
  name: string;
  values: number[];
  /** validated categorical slot (dataviz reference palette): 1 = blue, 2 = orange */
  slot: 1 | 2;
  area?: boolean;
}

const W = 640, H = 220, PAD = { l: 56, r: 92, t: 12, b: 28 };

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((m) => m >= v) ?? v;
}

/** A small line/area chart: one y-scale, direct end labels, a crosshair tooltip on pointer and keyboard. */
export function LineChart({ x, series, xLabel, format, label }: { x: number[]; series: ChartSeries[]; xLabel: string; format: (n: number) => string; label: string }) {
  const id = useId();
  const svg = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const n = x.length;
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const px = (i: number) => PAD.l + (n <= 1 ? 0 : (i / (n - 1)) * (W - PAD.l - PAD.r));
  const py = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const xt = n ? [0, Math.floor((n - 1) / 2), n - 1] : [];

  // direct end labels: nudge apart when two series end close together
  const endY = series.map((s) => py(s.values[s.values.length - 1] ?? 0) + 4);
  const order = endY.map((y, i) => [y, i]).sort((a, b) => a[0] - b[0]);
  for (let j = 1; j < order.length; j++) if (order[j][0] - order[j - 1][0] < 14) order[j][0] = order[j - 1][0] + 14;
  const over = Math.max(0, ...order.map(([y]) => y - (H - PAD.b + 4)));
  order.forEach(([y, i]) => { endY[i] = y - over; });

  function at(clientX: number) {
    const r = svg.current?.getBoundingClientRect();
    if (!r || n < 2) return;
    const sx = ((clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(n - 1, Math.round(((sx - PAD.l) / (W - PAD.l - PAD.r)) * (n - 1)))));
  }

  return (
    <figure className="m-0">
      {series.length > 1 && (
        <figcaption className="mb-2 flex flex-wrap gap-4 text-sm text-ink">
          {series.map((s) => (
            <span key={s.name} className="inline-flex items-center gap-2">
              <span className={`h-0.5 w-4 rounded-full ${s.slot === 1 ? "bg-[var(--series-1)]" : "bg-[var(--series-2)]"}`} aria-hidden="true" />
              {s.name}
            </span>
          ))}
        </figcaption>
      )}
      <div className="relative" dir="ltr">
        <svg
          ref={svg}
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-green"
          role="img"
          aria-label={label}
          tabIndex={0}
          onPointerMove={(e) => at(e.clientX)}
          onPointerLeave={() => setHover(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
              e.preventDefault();
              setHover((h) => Math.max(0, Math.min(n - 1, (h ?? 0) + (e.key === "ArrowRight" ? 1 : -1))));
            }
          }}
          onBlur={() => setHover(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={W - PAD.r} y1={py(t)} y2={py(t)} stroke="var(--color-line)" strokeWidth={1} />
              <text x={PAD.l - 8} y={py(t) + 4} textAnchor="end" fontSize={11} fill="var(--color-muted)">{format(t)}</text>
            </g>
          ))}
          {xt.map((i) => (
            <text key={i} x={px(i)} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--color-muted)">{x[i]}{i === n - 1 ? ` ${xLabel}` : ""}</text>
          ))}
          {series.map((s, si) => {
            const d = s.values.map((v, i) => `${i ? "L" : "M"}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join("");
            const color = s.slot === 1 ? "var(--series-1)" : "var(--series-2)";
            const last = s.values.length - 1;
            return (
              <g key={s.name}>
                {s.area && n > 1 && <path d={`${d}L${px(last)},${py(0)}L${px(0)},${py(0)}Z`} fill={color} opacity={0.12} />}
                <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                {last >= 0 && <text x={px(last) + 6} y={endY[si]} fontSize={11} fill="var(--color-ink)">{s.name}</text>}
              </g>
            );
          })}
          {hover !== null && (
            <g>
              <line x1={px(hover)} x2={px(hover)} y1={PAD.t} y2={H - PAD.b} stroke="var(--color-muted)" strokeWidth={1} strokeDasharray="3 3" />
              {series.map((s) => (
                <circle key={s.name} cx={px(hover)} cy={py(s.values[hover] ?? 0)} r={4} fill={s.slot === 1 ? "var(--series-1)" : "var(--series-2)"} stroke="var(--color-white, #fff)" strokeWidth={2} />
              ))}
            </g>
          )}
        </svg>
        {hover !== null && (
          <div
            id={id}
            role="status"
            className="pointer-events-none absolute top-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs text-ink shadow-sm"
            style={{ left: `${(px(hover) / W) * 100}%`, transform: px(hover) > W / 2 ? "translateX(calc(-100% - 8px))" : "translateX(8px)" }}
          >
            <p className="font-semibold">{x[hover]} {xLabel}</p>
            {series.map((s) => <p key={s.name} className="tabular-nums">{s.name}: {format(s.values[hover] ?? 0)}</p>)}
          </div>
        )}
      </div>
    </figure>
  );
}
