"use client";

import React from "react";
import { PiggyBank } from "lucide-react";

interface Bucket {
  id: string;
  name: string;
  targetToCent: number;
  currentToCent: number;
}

interface SavingsBucketsTileProps {
  buckets: Bucket[];
  isLoading: boolean;
}

export function SavingsBucketsTile({ buckets, isLoading }: SavingsBucketsTileProps) {
  if (isLoading) {
    return (
      <div className="bg-surface-raised rounded-3xl p-6 border border-border-subtle animate-pulse h-full min-h-45]">
        <div className="h-4 bg-surface rounded w-1/3 mb-4" />
        <div className="space-y-3">
          <div className="h-4 bg-surface rounded w-full" />
          <div className="h-4 bg-surface rounded w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-raised rounded-3xl p-6 border border-border-subtle flex flex-col justify-between h-full min-h-45] transition-all duration-300 ease-out hover:-translate-y-1.5 hover:translate-x-1.5 hover:shadow-2xl hover:shadow-accent/10 hover:border-accent">
      <div className="flex items-center justify-between text-text-muted text-xs tracking-wide mb-3">
        <span>saving buckets</span>
        <PiggyBank className="w-4 h-4 text-accent" />
      </div>

      {buckets.length > 0 ? (
        <div className="space-y-3">
          {buckets.map((b) => {
            const percentage = Math.min(
              100,
              Math.round((b.currentToCent / b.targetToCent) * 100)
            );
            return (
              <div key={b.id} className="space-y-1">
                <div className="flex justify-between text-sm font-semibold text-text-primary">
                  <span>{b.name}:</span>
                  <span className="tabular-nums font-sans">{percentage}%</span>
                </div>
                <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-sm text-text-muted">No savings goals set yet.</div>
      )}
    </div>
  );
}