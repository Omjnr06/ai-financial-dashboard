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
import { CHART } from "../colors";

type BucketLite = {
  id: string;
  name: string;
  targetToCent: number;
  currentToCent: number;
};

const DAY_MS = 86400000;
const dollars = (cent: number) =>
  cent >= 100000 ? `$${(cent / 100000).toFixed(1)}k` : `$${Math.round(cent / 100)}`;

function hashStr(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pct(sorted: number[], q: number): number | null {
  if (!sorted.length) return null;
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

// small live Monte Carlo: for each simulated future, the week the goal is reached.
// completion TIME (not balance) is where the real spread lives.
function simulate(
  currentCent: number,
  targetCent: number,
  contribCent: number,
  volCent: number,
  seed: number,
  paths = 1000,
  cap = 200
) {
  const rng = mulberry32(seed);
  const gauss = () => {
    let u = 0;
    let v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const finishes: number[] = [];
  let within = 0;
  for (let p = 0; p < paths; p++) {
    let bal = currentCent;
    let done = -1;
    for (let w = 1; w <= cap; w++) {
      bal += Math.max(0, contribCent + gauss() * volCent);
      if (bal >= targetCent) {
        done = w;
        break;
      }
    }
    if (done > 0) {
      finishes.push(done);
      within++;
    }
  }
  finishes.sort((a, b) => a - b);
  return { finishes, prob: paths ? within / paths : 0, paths };
}

function defaultContribCent(b: BucketLite) {
  const remaining = Math.max(b.targetToCent - b.currentToCent, 100);
  return Math.max(500, Math.round(remaining / 32 / 100) * 100);
}
function sliderBounds(b: BucketLite) {
  const remaining = Math.max(b.targetToCent - b.currentToCent, 100);
  const maxD = Math.min(300, Math.max(20, Math.ceil(remaining / 100 / 8 / 5) * 5));
  return { minD: 5, maxD, stepD: 5 };
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

function HistTooltip({ active, payload, label, cumById }: any) {
  if (!active || !payload?.length) return null;
  const cum = cumById?.[label] ?? 0;
  return (
    <div className="rounded-lg border border-border-subtle bg-surface px-3 py-2 shadow-lg">
      <div className="text-[10px] uppercase tracking-wider text-text-muted">
        Week {label}
      </div>
      <div className="text-sm font-semibold tabular-nums text-text-primary">
        {Math.round(cum * 100)}% reach it by here
      </div>
    </div>
  );
}

export function ForecastView({ buckets }: { buckets: BucketLite[] }) {
  const [bucketId, setBucketId] = useState<string | null>(buckets[0]?.id ?? null);
  const bucket = useMemo(
    () => buckets.find((b) => b.id === bucketId) ?? buckets[0] ?? null,
    [buckets, bucketId]
  );

  const [contribCent, setContribCent] = useState<number>(
    bucket ? defaultContribCent(bucket) : 3000
  );

  // reset contribution when the bucket changes
  useEffect(() => {
    if (bucket) setContribCent(defaultContribCent(bucket));
  }, [bucket?.id]);

  const vol = (c: number) => Math.max(500, c * 0.5);
  const seed = bucket ? hashStr(bucket.id) : 1;

  // baseline (at default contribution) — for the "sooner/later" delta
  const baseline = useMemo(() => {
    if (!bucket) return null;
    const c = defaultContribCent(bucket);
    return simulate(bucket.currentToCent, bucket.targetToCent, c, vol(c), seed);
  }, [bucket?.id]);

  const sim = useMemo(() => {
    if (!bucket) return null;
    return simulate(
      bucket.currentToCent,
      bucket.targetToCent,
      contribCent,
      vol(contribCent),
      seed
    );
  }, [bucket?.id, contribCent]);

  const stats = useMemo(() => {
    if (!sim || !sim.finishes.length) return null;
    const p10 = Math.round(pct(sim.finishes, 0.1)!);
    const p50 = Math.round(pct(sim.finishes, 0.5)!);
    const p90 = Math.round(pct(sim.finishes, 0.9)!);
    const maxWeek = Math.min(200, Math.max(8, Math.ceil(p90 * 1.15)));

    const counts: Record<number, number> = {};
    for (const w of sim.finishes) {
      const b = Math.min(maxWeek, w);
      counts[b] = (counts[b] || 0) + 1;
    }
    let run = 0;
    const cumById: Record<number, number> = {};
    const hist: { week: number; count: number }[] = [];
    for (let w = 1; w <= maxWeek; w++) {
      const c = counts[w] || 0;
      run += c;
      cumById[w] = run / sim.paths;
      hist.push({ week: w, count: c });
    }
    return { p10, p50, p90, maxWeek, hist, cumById };
  }, [sim]);

  if (!bucket) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-text-muted">
        No savings goals to forecast yet.
      </div>
    );
  }

  const { minD, maxD, stepD } = sliderBounds(bucket);
  const weeklyD = Math.round(contribCent / 100);
  const baseMedian = baseline?.finishes.length
    ? Math.round(pct(baseline.finishes, 0.5)!)
    : null;
  const curMedian = stats?.p50 ?? null;
  const delta = baseMedian != null && curMedian != null ? baseMedian - curMedian : 0;

  const progress = Math.min(
    100,
    Math.round((bucket.currentToCent / bucket.targetToCent) * 100)
  );
  const etaLabel =
    curMedian != null
      ? new Date(Date.now() + curMedian * 7 * DAY_MS).toLocaleDateString(undefined, {
          month: "short",
          year: "numeric",
        })
      : "—";

  return (
    <motion.div
      key="forecast"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex h-full w-full flex-col [&_.recharts-wrapper]:outline-none [&_.recharts-surface]:outline-none [&_svg]:outline-none"
    >
      {/* header: bucket + likelihood readout */}
      <div className="flex items-center justify-between">
        <BucketPicker buckets={buckets} bucketId={bucketId} onSelect={setBucketId} />
        {stats && (
          <span className="text-[11px] tabular-nums text-text-muted">
            {sim ? Math.round(sim.prob * 100) : 0}% reach it · likely{" "}
            <span className="text-text-primary">{stats.p10}–{stats.p90}w</span>
          </span>
        )}
      </div>

      {/* progress context */}
      <div className="mt-2 flex items-center gap-3 text-[11px] tabular-nums text-text-muted">
        <span>{dollars(bucket.currentToCent)} / {dollars(bucket.targetToCent)}</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
          <div className="h-full rounded-full bg-accent/70" style={{ width: `${progress}%` }} />
        </div>
        <span>
          ETA <span className="text-text-primary">{etaLabel}</span>
        </span>
      </div>

      {/* completion-time distribution */}
      <div className="mt-2 min-h-0 flex-1">
        {stats && (
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
              <ReferenceArea
                x1={stats.p10}
                x2={stats.p90}
                fill={CHART.accent}
                fillOpacity={0.1}
                ifOverflow="extendDomain"
              />
              <ReferenceLine
                x={stats.p50}
                stroke={CHART.accent}
                strokeWidth={2}
                label={{
                  value: `median ~${stats.p50}w`,
                  position: "insideTopLeft",
                  fill: CHART.muted,
                  fontSize: 10,
                }}
              />
              <Tooltip
                cursor={{ fill: CHART.accent, fillOpacity: 0.06 }}
                content={<HistTooltip cumById={stats.cumById} />}
              />
              <Bar
                dataKey="count"
                fill="url(#etaBar)"
                radius={[3, 3, 0, 0]}
                animationDuration={300}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* what-if slider */}
      <div className="mt-3 shrink-0">
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <span className="text-text-muted">
            Save <span className="font-medium text-text-primary">${weeklyD}/week</span>
          </span>
          {delta !== 0 && (
            <span className={delta > 0 ? "text-success" : "text-text-muted"}>
              {delta > 0 ? `${delta}w sooner` : `${Math.abs(delta)}w later`}
            </span>
          )}
        </div>
        <input
          type="range"
          min={minD}
          max={maxD}
          step={stepD}
          value={weeklyD}
          onChange={(e) => setContribCent(Number(e.target.value) * 100)}
          className="w-full accent-[var(--accent)]"
          aria-label="Weekly contribution"
        />
        <div className="mt-1 text-center text-[10px] text-text-muted">
          drag to see how saving more moves your goal date · 1,000 simulated futures
        </div>
      </div>
    </motion.div>
  );
}