"use client";

import { formatNumber } from "@/lib/format";

export function BarChart({
  data,
  color = "#0f9d8b",
  height = 160,
  valueSuffix = "",
}: {
  data: { label: string; value: number; secondary?: number }[];
  color?: string;
  height?: number;
  valueSuffix?: string;
}) {
  const max = Math.max(1, ...data.map((item) => item.value));
  return (
    <div className="flex items-end gap-2 sm:gap-3" style={{ height }}>
      {data.map((item) => {
        const pct = Math.round((item.value / max) * 100);
        return (
          <div key={item.label} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
            <span className="text-[10px] font-bold text-slate-600 opacity-0 transition group-hover:opacity-100">
              {formatNumber(item.value)}
              {valueSuffix}
            </span>
            <div className="relative flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t-lg transition-all duration-500"
                style={{
                  height: `${Math.max(4, pct)}%`,
                  background: `linear-gradient(180deg, ${color}, ${color}88)`,
                }}
              />
            </div>
            <span className="truncate text-[10px] font-semibold text-slate-500">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function Donut({
  slices,
  total,
  centerLabel,
}: {
  slices: { label: string; value: number; color: string }[];
  total: number;
  centerLabel: string;
}) {
  const safeTotal = Math.max(1, total);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const segments = slices.reduce<{ label: string; value: number; color: string; length: number; offset: number }[]>(
    (accumulator, slice) => {
      const length = (slice.value / safeTotal) * circumference;
      const previous = accumulator[accumulator.length - 1];
      const offset = previous ? previous.offset + previous.length : 0;
      return [...accumulator, { ...slice, length, offset }];
    },
    [],
  );

  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative size-[150px] shrink-0">
        <svg viewBox="0 0 140 140" className="size-full -rotate-90">
          <circle cx="70" cy="70" r={radius} fill="none" stroke="#eef2f6" strokeWidth="16" />
          {segments.map((segment) => (
            <circle
              key={segment.label}
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth="16"
              strokeDasharray={`${segment.length} ${circumference - segment.length}`}
              strokeDashoffset={-segment.offset}
              strokeLinecap="butt"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-extrabold text-slate-900">{formatNumber(total)}</span>
          <span className="text-[10px] text-slate-500">{centerLabel}</span>
        </div>
      </div>
      <ul className="flex-1 space-y-2">
        {slices.map((slice) => (
          <li key={slice.label} className="flex items-center gap-2 text-[11px]">
            <span className="size-2 rounded-full" style={{ background: slice.color }} />
            <span className="flex-1 text-slate-600">{slice.label}</span>
            <span className="font-bold text-slate-900">{formatNumber(slice.value)}</span>
            <span className="w-9 text-left text-[10px] text-slate-400">
              {Math.round((slice.value / safeTotal) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TrendArea({ points, color = "#0f9d8b" }: { points: number[]; color?: string }) {
  const max = Math.max(1, ...points);
  const width = 300;
  const height = 70;
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const coords = points.map((point, index) => `${index * step},${height - (point / max) * (height - 8) - 4}`);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full" preserveAspectRatio="none">
      <polyline points={`0,${height} ${coords.join(" ")} ${width},${height}`} fill={`${color}22`} stroke="none" />
      <polyline points={coords.join(" ")} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
