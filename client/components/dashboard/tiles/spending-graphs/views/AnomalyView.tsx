"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CHART } from "../colors";
import { isSpend, spendDollars } from "../aggregate";
import type { Tx } from "../types";

const DAY_MS = 86400000;
const dateLabel = (ts: number) =>
  new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });

function AnomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border-subtle bg-surface px-3 py-2 shadow-lg">
      {p.isAnomaly && (
        <div className="text-[10px] uppercase tracking-wider text-danger">Unusual</div>
      )}
      <div className="text-sm font-semibold text-text-primary">
        {p.merchantName ?? "—"}
      </div>
      <div className="text-xs tabular-nums text-text-muted">
        ${p.y.toFixed(2)} · {dateLabel(p.x)}
      </div>
    </div>
  );
}

const NormalDot = (props: any) => {
  const { cx, cy } = props;
  if (cx == null || cy == null) return null;
  return <circle cx={cx} cy={cy} r={3.5} fill={CHART.accent} fillOpacity={0.5} />;
};

const AnomalyDot = (props: any) => {
  const { cx, cy } = props;
  if (cx == null || cy == null) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={11} fill={CHART.danger} opacity={0.2} filter="url(#anomGlow)" />
      <motion.circle
        cx={cx}
        cy={cy}
        fill="none"
        stroke={CHART.danger}
        strokeWidth={1.5}
        initial={{ r: 6, opacity: 0.6 }}
        animate={{ r: [6, 16], opacity: [0.6, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
      />
      <motion.circle
        cx={cx}
        cy={cy}
        fill={CHART.danger}
        animate={{ r: [5, 6.5, 5] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      />
    </g>
  );
};

export function AnomalyView({ transactions }: { transactions: Tx[] }) {
  const { normal, anomalies, xDomain, yMax } = useMemo(() => {
    const pts = transactions.filter(isSpend).map((t) => ({
      x: new Date(t.dateOf).getTime(),
      y: spendDollars(t),
      isAnomaly: !!t.isAnomaly,
      merchantName: t.merchantName,
    }));
    const xs = pts.map((p) => p.x);
    const minX = xs.length ? Math.min(...xs) : Date.now() - DAY_MS;
    const maxX = xs.length ? Math.max(...xs) : Date.now();
    const padX = (maxX - minX) * 0.03 || DAY_MS;
    const yMax = pts.length ? Math.max(...pts.map((p) => p.y)) : 100;
    return {
      normal: pts.filter((p) => !p.isAnomaly),
      anomalies: pts.filter((p) => p.isAnomaly),
      xDomain: [minX - padX, maxX + padX] as [number, number],
      yMax: yMax * 1.12,
    };
  }, [transactions]);

  return (
    <motion.div
      key="anomaly"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex h-full w-full flex-col [&_.recharts-wrapper]:outline-none [&_.recharts-surface]:outline-none [&_svg]:outline-none [&_.recharts-wrapper_*]:outline-none"
    >
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
            <defs>
              <filter id="anomGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid stroke={CHART.border} strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              domain={xDomain}
              tickFormatter={dateLabel}
              tick={{ fill: CHART.muted, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickCount={6}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={[0, yMax]}
              tickFormatter={(v: number) => `$${Math.round(v)}`}
              tick={{ fill: CHART.muted, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip
              content={<AnomTooltip />}
              cursor={{ strokeDasharray: "3 3", stroke: CHART.border }}
            />
            <Scatter data={normal} shape={(p: any) => <NormalDot {...p} />} isAnimationActive={false} />
            <Scatter data={anomalies} shape={(p: any) => <AnomalyDot {...p} />} isAnimationActive={false} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex shrink-0 items-center justify-center gap-2 text-[11px] text-text-muted">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART.danger }} />
        <span>glowing dots are flagged as unusually large</span>
      </div>
    </motion.div>
  );
}