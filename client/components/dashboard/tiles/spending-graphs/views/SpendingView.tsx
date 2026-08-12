"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CHART } from "../colors";
import type { Bucket, Mode } from "../types";

function SpendTooltip({ active, payload, label, mode }: any) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value as number;
  return (
    <div className="rounded-lg border border-border-subtle bg-surface px-3 py-2 shadow-lg">
      <div className="text-[10px] uppercase tracking-wider text-text-muted">
        {mode === "week" ? "Week of " : ""}
        {label}
      </div>
      <div className="text-sm font-semibold text-text-primary tabular-nums">
        ${v.toFixed(2)}
      </div>
    </div>
  );
}

export function SpendingView({ data, mode }: { data: Bucket[]; mode: Mode }) {
  return (
    <motion.div
      key="spending"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="h-full w-full text-accent [&_.recharts-wrapper]:outline-none [&_.recharts-surface]:outline-none [&_svg]:outline-none"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="vaultSpendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.accent} stopOpacity={0.95} />
              <stop offset="100%" stopColor={CHART.accent} stopOpacity={0.25} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={CHART.border} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: CHART.muted, fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis
            width={44}
            tickLine={false}
            axisLine={false}
            tick={{ fill: CHART.muted, fontSize: 10 }}
            tickFormatter={(v: number) => `$${v}`}
          />
          <Tooltip
            cursor={{ fill: CHART.accent, fillOpacity: 0.08 }}
            content={<SpendTooltip mode={mode} />}
          />
          <Bar
            dataKey="total"
            fill="url(#vaultSpendGrad)"
            radius={[6, 6, 0, 0]}
            maxBarSize={48}
            animationDuration={700}
          />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}