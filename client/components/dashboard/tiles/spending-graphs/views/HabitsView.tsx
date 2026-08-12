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
  return (
    <div className="rounded-lg border border-border-subtle bg-surface px-3 py-2 shadow-lg">
      <div className="text-xs font-medium text-text-primary">{p.payload.axis}</div>
      <div className="text-[11px] tabular-nums text-text-muted">
        {(p.value * 100).toFixed(0)}% of week
      </div>
    </div>
  );
}

export function HabitsView({ habits }: { habits: HabitProfile | null }) {
  const { categories, clusters, commonMax, current } = useMemo(() => {
    const clusters = habits?.clusters ?? [];
    let categories = habits?.categories ?? [];
    if (!categories.length && clusters.length) {
      const set = new Set<string>();
      clusters.forEach((c) => Object.keys(c.avgProfile ?? {}).forEach((k) => set.add(k)));
      categories = [...set];
    }
    let commonMax = 0;
    clusters.forEach((c) =>
      categories.forEach((cat) => {
        commonMax = Math.max(commonMax, c.avgProfile?.[cat] ?? 0);
      })
    );
    return {
      categories,
      clusters,
      commonMax: commonMax || 1,
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
      className="h-full w-full [&_.recharts-wrapper]:outline-none [&_.recharts-surface]:outline-none"
    >
      <div className="grid h-full grid-cols-2 gap-3">
        {clusters.map((c) => {
          const isCurrent = c.label === current;
          const data = categories.map((cat) => ({
            axis: cat,
            value: c.avgProfile?.[cat] ?? 0,
          }));
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