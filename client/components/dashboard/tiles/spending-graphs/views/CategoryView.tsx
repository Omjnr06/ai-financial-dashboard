"use client";

import React from "react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { CHART, catColor } from "../colors";
import type { CatGroup } from "../types";

function CatTooltip({ active, payload, total }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const val = p.value as number;
  const pct = total ? (val / total) * 100 : 0;
  const cat = p.payload?.category;
  return (
    <div className="rounded-lg border border-border-subtle bg-surface px-3 py-2 shadow-lg">
      {cat && (
        <div className="text-[10px] uppercase tracking-wider text-text-muted">{cat}</div>
      )}
      <div className="text-sm font-semibold text-text-primary">{p.name}</div>
      <div className="text-xs tabular-nums text-text-muted">
        ${val.toFixed(2)} · {pct.toFixed(0)}%
      </div>
    </div>
  );
}

export function CategoryView({ groups }: { groups: CatGroup[] }) {
  const total = groups.reduce((s, g) => s + g.total, 0);

  const innerData = groups.map((g, i) => ({
    name: g.category,
    value: g.total,
    color: catColor(i),
  }));

  const outerData = groups.flatMap((g, i) =>
    g.merchants.map((m, mi) => ({
      name: m.name,
      value: m.total,
      category: g.category,
      color: catColor(i, Math.max(0.4, 0.85 - mi * 0.17)),
    }))
  );

  return (
    <motion.div
      key="category"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex h-full w-full flex-col [&_.recharts-wrapper]:outline-none [&_.recharts-surface]:outline-none [&_svg]:outline-none"
    >
      <div className="relative min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={innerData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="34%"
              outerRadius="58%"
              paddingAngle={1}
              stroke={CHART.surfaceRaised}
              strokeWidth={2}
              animationDuration={600}
            >
              {innerData.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            <Pie
              data={outerData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="80%"
              paddingAngle={0.5}
              stroke={CHART.surfaceRaised}
              strokeWidth={1}
              animationDuration={700}
            >
              {outerData.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              content={<CatTooltip total={total} />}
              offset={16}
              allowEscapeViewBox={{ x: true, y: true }}
              wrapperStyle={{ zIndex: 50, outline: "none" }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] uppercase tracking-wider text-text-muted">total</span>
          <span className="text-xl font-semibold tabular-nums text-text-primary">
            ${total.toFixed(0)}
          </span>
        </div>
      </div>

      <div className="mt-3 flex shrink-0 flex-wrap justify-center gap-x-4 gap-y-1.5">
        {groups.map((g, i) => (
          <div key={g.category} className="flex items-center gap-1.5 text-[11px]">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: catColor(i) }}
            />
            <span className="text-text-primary">{g.category}</span>
            <span className="tabular-nums text-text-muted">${g.total.toFixed(0)}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}