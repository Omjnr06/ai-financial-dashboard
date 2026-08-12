"use client";

import React, { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { useDashboardStore } from "@/stores/useDashboardStore";

import type { HabitProfile } from "@/types/api";
import type { ViewId, Mode, Tx } from "./spending-graphs/types";
import { getAvailableViews } from "./spending-graphs/registry";
import { aggregateByWeek, aggregateByMonth, groupByCategory } from "./spending-graphs/aggregate";
import { ModeToggle } from "./spending-graphs/parts/ModeToggle";
import { ViewSwitcher } from "./spending-graphs/parts/ViewSwitcher";
import { ExpandModal } from "./spending-graphs/parts/ExpandModal";
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
  transactions: Tx[];
  habits: HabitProfile | null;
  buckets: BucketLite[];
  isLoading: boolean;
}

export function SpendingGraphsTile({ transactions, habits, buckets, isLoading }: SpendingGraphsTileProps) {
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const [mode, setMode] = useState<Mode>("week");
  const [viewState, setViewState] = useState<ViewId | null>(null);
  const [expanded, setExpanded] = useState(false);

  const scopedTx = useMemo(() => {
    const spend = (transactions ?? []).filter((t) => t.amountToCent < 0);
    if (selectedAccountId === null) return spend;
    return spend.filter((t) => t.accountId === selectedAccountId);
  }, [transactions, selectedAccountId]);

  const hasHabits =
    !!habits && !habits.insufficientData && (habits.clusters?.length ?? 0) > 0;
  const hasForecast = (buckets?.length ?? 0) > 0;

  const available = useMemo(
    () =>
      getAvailableViews(
        scopedTx.length > 0,
        selectedAccountId === null,
        hasHabits,
        hasForecast
      ),
    [scopedTx.length, selectedAccountId, hasHabits, hasForecast]
  );

  const currentView: ViewId | null =
    viewState && available.includes(viewState) ? viewState : available[0] ?? null;

  const spendingData = useMemo(
    () => (mode === "week" ? aggregateByWeek(scopedTx) : aggregateByMonth(scopedTx)),
    [scopedTx, mode]
  );

  const categoryGroups = useMemo(() => groupByCategory(scopedTx), [scopedTx]);

  if (isLoading) {
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
    if (currentView === "anomaly") return <AnomalyView transactions={scopedTx} />;
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