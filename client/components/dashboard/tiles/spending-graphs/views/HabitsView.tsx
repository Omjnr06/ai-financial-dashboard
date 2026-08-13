"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CHART } from "../colors";
import type { HabitProfile } from "@/types/api";

function HabitTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const ratio = p.value as number;
  const share = p.payload.share as number;
  const rel =
    ratio >= 1
      ? `${ratio.toFixed(1)}× your average`
      : `${Math.round(ratio * 100)}% of your average`;
  return (
    <div className="rounded-lg border border-border-subtle bg-surface px-3 py-2 shadow-lg">
      <div className="text-xs font-medium text-text-primary">{p.payload.axis}</div>
      <div className="text-[11px] tabular-nums text-text-muted">{rel}</div>
      <div className="text-[10px] tabular-nums text-text-muted">
        {(share * 100).toFixed(0)}% of this week's spend
      </div>
    </div>
  );
}

export function HabitsView({ habits }: { habits: HabitProfile | null }) {
  const { categories, clusters, means, commonMax, current } = useMemo(() => {
    const clusters = habits?.clusters ?? [];
    let categories = habits?.categories ?? [];
    if (!categories.length && clusters.length) {
      const set = new Set<string>();
      clusters.forEach((c) => Object.keys(c.avgProfile ?? {}).forEach((k) => set.add(k)));
      categories = [...set];
    }

    const rawMeans = habits?.categoryMeans ?? {};
    const means: Record<string, number> = {};
    categories.forEach((cat) => {
      const m = rawMeans[cat];
      means[cat] = m && m > 0 ? m : 1e-9;
    });

    let commonMax = 1;
    clusters.forEach((c) =>
      categories.forEach((cat) => {
        const ratio = (c.avgProfile?.[cat] ?? 0) / means[cat];
        commonMax = Math.max(commonMax, ratio);
      })
    );

    return {
      categories,
      clusters,
      means,
      commonMax: Math.min(commonMax, 4),
      current: habits?.currentClusterLabel ?? null,
    };
  }, [habits]);

  if (!clusters.length) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-text-muted">
        Not enough data to profile spending habits yet.
      </div>
    );
  }

  return (
    <motion.div
      key="habits"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="h-full w-full [&_.recharts-wrapper]:outline-none [&_.recharts-surface]:outline-none [&_.recharts-wrapper_*]:outline-none"
    >
      <div className="grid h-full grid-cols-2 gap-3">
        {clusters.map((c) => {
          const isCurrent = c.label === current;
          const data = categories.map((cat) => {
            const share = c.avgProfile?.[cat] ?? 0;
            return { axis: cat, value: Math.min(share / means[cat], commonMax), share };
          });
          return (
            <div
              key={c.cluster}
              className={`flex min-h-0 flex-col rounded-2xl border p-2 ${
                isCurrent ? "border-accent/50 bg-accent/5" : "border-border-subtle"
              }`}
            >
              <div className="flex items-center justify-between px-1">
                <span
                  className={`truncate text-[11px] font-medium ${
                    isCurrent ? "text-accent" : "text-text-primary"
                  }`}
                >
                  {c.label}
                </span>
                <span className="shrink-0 text-[10px] tabular-nums text-text-muted">
                  {c.weekCount}w
                </span>
              </div>
              <div className="min-h-0 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={data} outerRadius="68%">
                    <PolarGrid stroke={CHART.border} />
                    <PolarAngleAxis
                      dataKey="axis"
                      tick={{ fill: CHART.muted, fontSize: 9 }}
                    />
                    <PolarRadiusAxis
                      domain={[0, commonMax]}
                      tick={false}
                      axisLine={false}
                    />
                    <Radar
                      dataKey="value"
                      stroke={CHART.accent}
                      fill={CHART.accent}
                      fillOpacity={isCurrent ? 0.4 : 0.16}
                      strokeWidth={1.5}
                      animationDuration={600}
                    />
                    <Tooltip content={<HabitTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}