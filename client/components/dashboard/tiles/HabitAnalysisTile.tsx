"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { mockHabits } from "@/mocks";
import { HabitProfile } from "@/types/api";

// varied openers so the insight doesn't read the same every time
const OPENERS = [
  "Lately, your spending looks like",
  "This week lines up with your",
  "Right now you're in",
  "Your recent pattern is",
];

// pulls the dominant category out of the current cluster's profile, if available
function dominantCategory(habits: HabitProfile): string | null {
  const current = habits.clusters?.find(
    (c) => c.label === habits.currentClusterLabel
  );
  if (!current) return null;
  const entries = Object.entries(current.avgProfile);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

export function HabitAnalysisTile() {
  const { data: habits, isLoading } = useQuery({
    queryKey: ["habits"],
    queryFn: async () => {
      return await apiGet<HabitProfile>("/api/habits", mockHabits);
    },
  });

  if (isLoading) {
    return (
      <div className="bg-surface-raised rounded-3xl p-6 border border-border-subtle animate-pulse h-full min-h-40">
        <div className="h-4 bg-surface rounded w-1/3 mb-4" />
        <div className="h-10 bg-surface rounded w-full" />
      </div>
    );
  }

  const hasData =
    habits && !habits.insufficientData && habits.currentClusterLabel;

  // pick a stable opener per label so it doesn't flicker on re-render
  const opener = hasData
    ? OPENERS[(habits!.currentClusterLabel!.length) % OPENERS.length]
    : "";
  const topCategory = hasData ? dominantCategory(habits!) : null;

  return (
    <div className="bg-surface-raised rounded-3xl p-6 border border-border-subtle flex flex-col justify-start min-h-40 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:translate-x-1.5 hover:shadow-2xl hover:shadow-accent/10 hover:border-accent">
      <div className="flex items-center justify-between text-text-muted text-xs tracking-wide mb-4">
        <span>habit analysis</span>
        <Sparkles className="w-4 h-4 text-accent" />
      </div>

    {hasData ? (
        <p className="font-kumar text-base md:text-lg text-text-primary leading-relaxed tracking-wider">
          {opener}{" "}
          <span className="inline-flex bg-accent/20 text-accent px-2 py-0.5 rounded text-sm mx-1 align-middle">
            {habits!.currentClusterLabel}
          </span>
          .
        </p>
      ) : (
        <p className="font-kumar text-base text-text-muted leading-relaxed tracking-wider">
          Not enough spending history yet to spot your habits. Check back after a few more weeks.
        </p>
      )}
    </div>
  );
}