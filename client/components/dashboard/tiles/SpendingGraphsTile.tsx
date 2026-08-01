"use client";

import React from "react";
import { BarChart3, TrendingUp } from "lucide-react";

interface SpendingGraphsTileProps {
  isLoading: boolean;
}

export function SpendingGraphsTile({ isLoading }: SpendingGraphsTileProps) {
  if (isLoading) {
    return (
      <div className="bg-surface-raised rounded-3xl p-6 border border-border-subtle animate-pulse h-full min-h-80">
        <div className="h-4 bg-surface rounded w-1/3 mb-4" />
        <div className="h-48 bg-surface rounded w-full mt-8" />
      </div>
    );
  }

  const mockBars = [40, 90, 30, 70, 60, 100];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="bg-surface-raised rounded-3xl p-6 border border-border-subtle flex flex-col justify-start  h-140 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:translate-x-1.5 hover:shadow-2xl hover:shadow-accent/10 hover:border-accent relative">
      <div className="flex items-center justify-between text-text-muted text-xs tracking-wide mb-6">
        <div className="flex items-center gap-2">
          <span>spending graphs</span>
          <BarChart3 className="w-4 h-4 text-accent" />
        </div>
        
        {/* Floating Metric Badge */}
        <div className="flex items-center gap-1 bg-accent/10 text-accent px-2 py-1 rounded-md font-medium tracking-wider">
          <TrendingUp className="w-3 h-3" />
          <span>+12% vs last week</span>
        </div>
      </div>

      <div className="relative flex-1 flex mt-2">
        {/* Y-Axis Labels & Grid Lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
          {[100, 75, 50, 25, 0].map((val, i) => (
            <div key={i} className="flex items-center w-full h-0">
              <span className="text-[10px] text-text-muted w-8 text-right mr-3 tabular-nums">${val}</span>
              <div className="flex-1 border-t border-dashed border-border-subtle/50" />
            </div>
          ))}
        </div>

        {/* Bars */}
        <div className="flex items-end justify-between gap-4 h-full pt-4 pl-11 w-full pb-6 z-10">
          {mockBars.map((heightPercent, idx) => (
            <div key={idx} className="w-full h-full flex flex-col justify-end group cursor-crosshair">
              <div
                className="w-full bg-accent/80 group-hover:bg-accent rounded-t-sm transition-all relative"
                style={{ height: `${heightPercent}%` }}
              >
                {/* Tooltip on hover */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface text-text-primary text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md border border-border-subtle">
                  ${heightPercent}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* X-Axis Labels */}
        <div className="absolute bottom-0 left-11 right-0 flex justify-between px-2 text-[10px] text-text-muted font-medium uppercase tracking-wider">
          {days.map((day) => (
            <span key={day} className="w-full text-center">{day}</span>
          ))}
        </div>
      </div>
    </div>
  );
}