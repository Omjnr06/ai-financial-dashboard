"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { ChevronDown, Check, Target } from "lucide-react";
import { apiGet } from "@/lib/api";
import { mockGoalDistribution } from "@/mocks";
import { CHART } from "../colors";
import type { GoalDistribution } from "@/types/api";

type BucketLite = {
  id: string;
  name: string;
  targetToCent: number;
  currentToCent: number;
};

const DAY_MS = 86400000;
const dollars = (cent: number) =>
  cent >= 100000 ? `$${(cent / 100000).toFixed(1)}k` : `$${Math.round(cent / 100)}`;

function pctl(sorted: number[], q: number): number | null {
  if (!sorted.length) return null;
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

// helper function for slider to make slider smooth by bootsrapping (mocking the backend to predict the bars)
function clientDistribution(
  base: GoalDistribution,
  currentCent: number,
  targetCent: number,
  deltaCent: number,
  paths = 800
): GoalDistribution {
  const history = base.historySample ?? [];
  const horizon = base.horizonWeeks || 52;
  const n = history.length;
  if (n < 2 || targetCent <= currentCent) {
    return { ...base, savingsDeltaCent: deltaCent, histogram: [], p10Weeks: null, medianWeeks: null, p90Weeks: null, probabilityWithinHorizon: 0 };
  }
  const block = Math.max(1, Math.min(8, n));
  let s = 987654321;
  const rand = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const finishes: number[] = [];
  let within = 0;
  for (let p = 0; p < paths; p++) {

    let bal = currentCent;
    let done = -1;
    let w = 0;
    while (w < horizon && done < 0) {
      const start = Math.floor(rand() * n);
      for (let k = 0; k < block && w < horizon; k++) {
        bal += history[(start + k) % n] + deltaCent;
        w++;
        if (bal >= targetCent) {
          done = w;
          break;
        }
      }
    }
    if (done > 0) {
      finishes.push(done);
      within++;
    }
  }
  finishes.sort((a, b) => a - b);
  const counts: Record<number, number> = {};
  finishes.forEach((w) => (counts[w] = (counts[w] || 0) + 1));
  const histogram = Object.entries(counts)
    .map(([w, c]) => ({ week: Number(w), count: c }))
    .sort((a, b) => a.week - b.week);
  return {
    ...base,
    savingsDeltaCent: deltaCent,
    p10Weeks: finishes.length ? Math.round(pctl(finishes, 0.1)!) : null,
    medianWeeks: finishes.length ? Math.round(pctl(finishes, 0.5)!) : null,
    p90Weeks: finishes.length ? Math.round(pctl(finishes, 0.9)!) : null,
    probabilityWithinHorizon: paths ? within / paths : 0,
    simulations: paths,
    histogram,
  };
}

function Slider({
  min,
  max,
  step,
  value,
  onChange,
  onCommit,
  format,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  onCommit: (v: number) => void;
  format: (v: number) => string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [dragPct, setDragPct] = useState<number | null>(null);
  const latest = useRef(value);

  const valuePct = ((value - min) / (max - min)) * 100;
  const posPct = dragging && dragPct != null ? dragPct : valuePct;

  const applyClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    setDragPct(ratio * 100);
    const raw = min + ratio * (max - min);
    const snapped = Math.min(max, Math.max(min, Math.round(raw / step) * step));
    latest.current = snapped;
    onChange(snapped);
  };

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => applyClientX(e.clientX);
    const up = () => {
      setDragging(false);
      setDragPct(null);
      onCommit(latest.current);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  return (
    <div
      ref={trackRef}
      onPointerDown={(e) => {
        setDragging(true);
        applyClientX(e.clientX);
      }}
      className="relative h-6 cursor-pointer select-none touch-none"
    >
      <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full border border-border-subtle bg-surface" />
      <div
        className={`absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-accent/70 ${
          dragging ? "" : "transition-[width] duration-150 ease-out"
        }`}
        style={{ width: `${posPct}%` }}
      />
      <div
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            const v = Math.min(max, value + step);
            onChange(v);
            onCommit(v);
          }
          if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            const v = Math.max(min, value - step);
            onChange(v);
            onCommit(v);
          }
        }}
        className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-md ring-2 ring-surface outline-none ${
          dragging
            ? "scale-110 shadow-accent/40"
            : "transition-[left,transform] duration-150 ease-out hover:scale-105"
        }`}
        style={{ left: `${posPct}%` }}
      />
      {dragging && (
        <div
          className="pointer-events-none absolute -top-6 -translate-x-1/2 rounded-md border border-border-subtle bg-surface px-2 py-0.5 text-[10px] font-medium tabular-nums text-text-primary shadow"
          style={{ left: `${posPct}%` }}
        >
          {format(value)}
        </div>
      )}
    </div>
  );
}

function BucketPicker({
  buckets,
  bucketId,
  onSelect,
}: {
  buckets: BucketLite[];
  bucketId: string | null;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = buckets.find((b) => b.id === bucketId) ?? buckets[0];
  const multi = buckets.length > 1;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => multi && setOpen((o) => !o)}
        disabled={!multi}
        className="flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface px-3 py-1 text-xs text-text-primary transition hover:border-accent disabled:cursor-default"
      >
        <Target className="w-3.5 h-3.5 text-accent" />
        <span>{current?.name ?? "—"}</span>
        {multi && (
          <ChevronDown
            className={`w-3.5 h-3.5 text-text-muted transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        )}
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="absolute left-0 top-10 z-40 w-56 overflow-hidden rounded-xl border border-border-subtle bg-surface p-1 shadow-xl"
        >
          {buckets.map((b) => {
            const active = b.id === current?.id;
            const pctFunded = b.targetToCent
              ? Math.round((b.currentToCent / b.targetToCent) * 100)
              : 0;
            return (
              <button
                key={b.id}
                onClick={() => {
                  onSelect(b.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition ${
                  active ? "bg-accent/10" : "hover:bg-surface-raised"
                }`}
              >
                <Check
                  className={`w-3.5 h-3.5 shrink-0 ${
                    active ? "text-accent" : "text-transparent"
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-xs font-medium ${
                      active ? "text-accent" : "text-text-primary"
                    }`}
                  >
                    {b.name}
                  </span>
                  <span className="block text-[10px] tabular-nums text-text-muted">
                    {pctFunded}% funded
                  </span>
                </span>
              </button>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

function HistTooltip({ active, payload, label, cumById, shareById, goalName }: any) {
  if (!active || !payload?.length) return null;
  const share = shareById?.[label] ?? 0;
  // don't show a tooltip over weeks where nothing finishes (no bar)
  if (share <= 0) return null;
  const cum = cumById?.[label] ?? 0;
  return (
    <div className="rounded-lg border border-border-subtle bg-surface px-3 py-2 shadow-lg">
      <div className="text-[10px] uppercase tracking-wider text-text-muted">
        Week {label}
      </div>
      <div className="text-sm font-semibold tabular-nums text-text-primary">
        {Math.round(share * 100)}% of futures reach {goalName} this week
      </div>
      <div className="text-[11px] tabular-nums text-text-muted">
        {Math.round(cum * 100)}% funded by week {label}
      </div>
    </div>
  );
}

export function ForecastView({ buckets }: { buckets: BucketLite[] }) {
  const [bucketId, setBucketId] = useState<string | null>(buckets[0]?.id ?? null);
  const [baseline, setBaseline] = useState<GoalDistribution | null>(null); 
  const [dist, setDist] = useState<GoalDistribution | null>(null); 
  const [loading, setLoading] = useState(true);
  const [deltaD, setDeltaD] = useState(0);
  const reqId = useRef(0);

  const bucket = useMemo(
    () => buckets.find((b) => b.id === bucketId) ?? buckets[0] ?? null,
    [buckets, bucketId]
  );

  useEffect(() => {
    if (!bucket) return;
    let cancelled = false;
    setLoading(true);
    setDeltaD(0);
    apiGet<GoalDistribution>(
      `/api/forecast/goal/${bucket.id}/distribution`,
      mockGoalDistribution(bucket, 0)
    )
      .then((res) => {
        if (cancelled) return;
        setBaseline(res);
        setDist(res);
      })
      .catch(() => {
        if (cancelled) return;
        setBaseline(null);
        setDist(null);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [bucket?.id]);

  const onDrag = (d: number) => {
    setDeltaD(d);
    if (!bucket || !baseline) return;
    if (d === 0) setDist(baseline);
    else setDist(clientDistribution(baseline, bucket.currentToCent, bucket.targetToCent, d * 100));
  };

  // on release / keyboard: reconcile with the authoritative server sim
  const onCommit = (d: number) => {
    if (!bucket) return;
    if (d === 0 && baseline) {
      setDist(baseline);
      return;
    }
    const id = ++reqId.current;
    apiGet<GoalDistribution>(
      `/api/forecast/goal/${bucket.id}/distribution?savingsDeltaCent=${d * 100}`,
      mockGoalDistribution(bucket, d * 100)
    )
      .then((res) => {
        if (id === reqId.current) setDist(res);
      })
      .catch(() => {});
  };

  const stats = useMemo(() => {
    if (!dist || dist.insufficientHistory || dist.medianWeeks == null) return null;
    const maxWeek = Math.min(52, Math.max(8, Math.ceil((dist.p90Weeks ?? 40) * 1.15)));
    const byWeek: Record<number, number> = {};
    dist.histogram.forEach((h) => (byWeek[h.week] = h.count));
    const total = dist.histogram.reduce((s, h) => s + h.count, 0) || 1;
    let run = 0;
    const cumById: Record<number, number> = {};
    const shareById: Record<number, number> = {};
    const hist: { week: number; count: number }[] = [];
    for (let w = 1; w <= maxWeek; w++) {
      const c = byWeek[w] || 0;
      run += c;
      shareById[w] = c / total;
      cumById[w] = run / total;
      hist.push({ week: w, count: c });
    }
    return {
      p10: dist.p10Weeks,
      p50: dist.medianWeeks,
      p90: dist.p90Weeks,
      prob: dist.probabilityWithinHorizon ?? 0,
      maxWeek,
      hist,
      cumById,
      shareById,
    };
  }, [dist]);

  if (!bucket) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-text-muted">
        No savings goals to forecast yet.
      </div>
    );
  }

  const insufficient = dist?.insufficientHistory;
  const alreadyReached = dist?.alreadyReached;
  const progress = Math.min(
    100,
    Math.round((bucket.currentToCent / bucket.targetToCent) * 100)
  );
  const etaLabel =
    stats?.p50 != null
      ? new Date(Date.now() + stats.p50 * 7 * DAY_MS).toLocaleDateString(undefined, {
          month: "short",
          year: "numeric",
        })
      : "—";
  const baseMedian = baseline?.medianWeeks ?? null;
  const curMedian = stats?.p50 ?? null;
  const delta = baseMedian != null && curMedian != null ? baseMedian - curMedian : 0;

  return (
    <motion.div
      key="forecast"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex h-full w-full flex-col"
    >
      <div className="flex items-center justify-between">
        <BucketPicker buckets={buckets} bucketId={bucketId} onSelect={setBucketId} />
        {stats && (
          <span className="text-[11px] tabular-nums text-text-muted">
            {Math.round((stats.prob ?? 0) * 100)}% chance you fund it · likely in{" "}
            <span className="text-text-primary">
              {stats.p10}–{stats.p90} weeks
            </span>
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-3 text-[11px] tabular-nums text-text-muted">
        <span>
          {dollars(bucket.currentToCent)} / {dollars(bucket.targetToCent)}
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
          <div className="h-full rounded-full bg-accent/70" style={{ width: `${progress}%` }} />
        </div>
        <span>
          ETA <span className="text-text-primary">{etaLabel}</span>
        </span>
      </div>

      <div className="mt-2 min-h-0 flex-1 [&_.recharts-wrapper]:outline-none [&_.recharts-surface]:outline-none [&_svg]:outline-none [&_.recharts-bar-rectangle]:outline-none [&_.recharts-rectangle]:outline-none [&_.recharts-wrapper_*]:outline-none">
        {loading ? (
          <div className="h-full w-full animate-pulse rounded-2xl bg-surface" />
        ) : insufficient ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-text-muted">
            Not enough savings history yet to forecast this goal.
          </div>
        ) : alreadyReached ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-success">
            This goal is already funded. 🎉
          </div>
        ) : stats ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.hist} margin={{ top: 14, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="etaBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.accent} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={CHART.accent} stopOpacity={0.35} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={CHART.border} strokeDasharray="3 3" />
              <XAxis
                dataKey="week"
                tickFormatter={(w: number) => `${w}w`}
                tick={{ fill: CHART.muted, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={Math.max(0, Math.ceil(stats.maxWeek / 8) - 1)}
              />
              {stats.p10 != null && stats.p90 != null && (
                <ReferenceArea
                  x1={stats.p10}
                  x2={stats.p90}
                  fill={CHART.accent}
                  fillOpacity={0.1}
                  ifOverflow="extendDomain"
                />
              )}
              {stats.p50 != null && (
                <ReferenceLine
                  x={stats.p50}
                  stroke={CHART.accent}
                  strokeWidth={2}
                  label={{
                    value: `most likely: week ${stats.p50}`,
                    position: stats.p50 > stats.maxWeek * 0.6 ? "insideTopRight" : "insideTopLeft",
                    fill: CHART.muted,
                    fontSize: 10,
                  }}
                />
              )}
              <Tooltip
                cursor={{ fill: CHART.accent, fillOpacity: 0.06 }}
                content={<HistTooltip cumById={stats.cumById} shareById={stats.shareById} goalName={bucket.name} />}
              />
              <Bar
                dataKey="count"
                fill="url(#etaBar)"
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-center text-sm text-text-muted">
            Goal isn’t reachable within a year at the current savings rate.
          </div>
        )}
      </div>

      {!insufficient && !alreadyReached && (
        <div className="mt-3 shrink-0">
          <div className="mb-1 flex items-center justify-between text-[11px]">
            <span className="text-text-muted">
              Save <span className="font-medium text-text-primary">+${deltaD}/week</span>
            </span>
            {delta !== 0 && (
              <span className={delta > 0 ? "text-success" : "text-text-muted"}>
                {delta > 0 ? `${delta}w sooner` : `${Math.abs(delta)}w later`}
              </span>
            )}
          </div>
          <Slider
            min={0}
            max={100}
            step={1}
            value={deltaD}
            onChange={onDrag}
            onCommit={onCommit}
            format={(v) => `+$${v}`}
          />
          <div className="mt-1 text-center text-[10px] text-text-muted">
            each bar = how many of 1,000 possible futures hit your goal that week
          </div>
        </div>
      )}
    </motion.div>
  );
}