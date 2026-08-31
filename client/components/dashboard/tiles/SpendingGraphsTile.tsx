"use client";

import React, { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { mockSpendSummary } from "@/mocks";
import { useDashboardStore } from "@/stores/useDashboardStore";

import type { HabitProfile, SpendSummary } from "@/types/api";
import type { ViewId, Mode } from "./spending-graphs/types";
import { getAvailableViews } from "./spending-graphs/registry";
import { ModeToggle } from "./spending-graphs/parts/ModeToggle";
import { ViewSwitcher } from "./spending-graphs/parts/ViewSwitcher";
import { ExpandModal } from "./spending-graphs/parts/ExpandModal";
import { VIEW_META } from "./spending-graphs/registry";
import { SpendingView } from "./spending-graphs/views/SpendingView";
import { CategoryView } from "./spending-graphs/views/CategoryView";
import { AnomalyView } from "./spending-graphs/views/AnomalyView";
import { HabitsView } from "./spending-graphs/views/HabitsView";
import { ForecastView } from "./spending-graphs/views/ForecastView";

interface BucketLite {
  id: string;
  name: string;
  targetToCent: number;
  currentToCent: number;
}

interface SpendingGraphsTileProps {
  habits: HabitProfile | null;
  buckets: BucketLite[];
  isLoading: boolean;
}

const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString(undefined, { month: "short" });
};
const weekLabel = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });

export function SpendingGraphsTile({ habits, buckets, isLoading }: SpendingGraphsTileProps) {
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const [mode, setMode] = useState<Mode>("week");
  const [viewState, setViewState] = useState<ViewId | null>(null);
  const [expanded, setExpanded] = useState(false);

  // self-fetch pre-aggregated spend rollups; refetch when the account changes
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["spendSummary", selectedAccountId],
    queryFn: async () => {
      const qs = selectedAccountId ? `?accountId=${selectedAccountId}` : "";
      return await apiGet<SpendSummary>(
        `/api/transactions/summary${qs}`,
        mockSpendSummary(selectedAccountId)
      );
    },
  });

  // map server rollups -> existing view prop shapes (dollars)
  const spendingData = useMemo(() => {
    if (!summary) return [];
    const rows = mode === "week" ? summary.weekly : summary.monthly;
    return rows.map((r: any) => ({
      key: mode === "week" ? r.weekStart : r.month,
      label: mode === "week" ? weekLabel(r.weekStart) : monthLabel(r.month),
      total: r.spentCents / 100,
    }));
  }, [summary, mode]);

  const categoryGroups = useMemo(() => {
    if (!summary) return [];
    return summary.categories.map((c) => ({
      category: c.category,
      total: c.spentCents / 100,
      merchants: c.merchants.map((m) => ({ name: m.name, total: m.spentCents / 100 })),
    }));
  }, [summary]);

  const anomalyPoints = useMemo(
    () => (summary?.recentPoints ?? []).map((p) => ({ ...p })),
    [summary]
  );

  const hasSpend = !!summary?.hasSpend;
  const hasHabits =
    !!habits && !habits.insufficientData && (habits.clusters?.length ?? 0) > 0;
  const hasForecast = (buckets?.length ?? 0) > 0;

  const available = useMemo(
    () =>
      getAvailableViews(hasSpend, selectedAccountId === null, hasHabits, hasForecast),
    [hasSpend, selectedAccountId, hasHabits, hasForecast]
  );

  const currentView: ViewId | null =
    viewState && available.includes(viewState) ? viewState : available[0] ?? null;

  if (isLoading || summaryLoading) {
    return (
      <div className="h-140 animate-pulse rounded-3xl border border-border-subtle bg-surface-raised p-6">
        <div className="mb-4 h-4 w-1/3 rounded bg-surface" />
        <div className="mt-8 h-48 w-full rounded bg-surface" />
      </div>
    );
  }

  const renderView = () => {
    if (currentView === "spending") return <SpendingView data={spendingData} mode={mode} />;
    if (currentView === "category") return <CategoryView groups={categoryGroups} />;
    if (currentView === "anomaly") return <AnomalyView transactions={anomalyPoints} />;
    if (currentView === "habits") return <HabitsView habits={habits} />;
    if (currentView === "forecast") return <ForecastView buckets={buckets} />;
    return null;
  };

  return (
    <div className="relative flex h-140 flex-col justify-start rounded-3xl border border-border-subtle bg-surface-raised p-6 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:translate-x-1.5 hover:border-accent hover:shadow-2xl hover:shadow-accent/10">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs tracking-wide text-text-muted">
            <span>spending graphs</span>
            <BarChart3 className="w-4 h-4 text-accent" />
          </div>
          {currentView === "spending" && <ModeToggle mode={mode} onChange={setMode} />}
        </div>
        {currentView && (
          <ViewSwitcher
            views={available}
            currentView={currentView}
            onSelect={setViewState}
            onExpand={() => setExpanded(true)}
          />
        )}
      </div>

      <div className="relative mt-2 min-h-0 flex-1">
        {currentView ? (
          renderView()
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <BarChart3 className="w-8 h-8 text-text-muted/40" />
            <p className="text-sm text-text-muted">No spending data for this account.</p>
          </div>
        )}
      </div>

      <ExpandModal
        open={expanded && !!currentView}
        onClose={() => setExpanded(false)}
        header={
          currentView ? (
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-accent" />
              <ViewSwitcher
                views={available}
                currentView={currentView}
                onSelect={setViewState}
              />
            </div>
          ) : null
        }
      >
        <div className="flex h-full flex-col">
          {currentView === "spending" && (
            <div className="mb-3 flex justify-end">
              <ModeToggle mode={mode} onChange={setMode} />
            </div>
          )}
          <div className="min-h-0 flex-1">{renderView()}</div>
        </div>
      </ExpandModal>
    </div>
  );
}