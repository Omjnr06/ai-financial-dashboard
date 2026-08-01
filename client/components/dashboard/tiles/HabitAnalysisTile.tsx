"use client";

import React from "react";
import { Sparkles } from "lucide-react";

interface HabitAnalysisTileProps {
  isLoading: boolean;
}

export function HabitAnalysisTile({ isLoading }: HabitAnalysisTileProps) {
  if (isLoading) {
    return (
      <div className="bg-surface-raised rounded-3xl p-6 border border-border-subtle animate-pulse h-full min-h-40">
        <div className="h-4 bg-surface rounded w-1/3 mb-4" />
        <div className="h-10 bg-surface rounded w-full" />
      </div>
    );
  }

  return (
    <div className="bg-surface-raised rounded-3xl p-6 border border-border-subtle flex flex-col justify-start min-h-40 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:translate-x-1.5 hover:shadow-2xl hover:shadow-accent/10 hover:border-accent">
      <div className="flex items-center justify-between text-text-muted text-xs tracking-wide mb-4">
        <span>habit analysis</span>
        <Sparkles className="w-4 h-4 text-accent" />
      </div>
      
      {/* Enhanced typography with inline badges */}
      <p className="font-kumar text-base md:text-lg text-text-primary leading-relaxed tracking-wider">
        you spent{" "}
        <span className="inline-flex bg-danger/10 text-danger px-2 py-0.5 rounded text-sm mx-1 align-middle">
          60% more
        </span>{" "}
        of unallocated money on{" "}
        <span className="inline-flex bg-accent/20 text-accent px-2 py-0.5 rounded text-sm mx-1 align-middle">
          Uber Eats
        </span>.
      </p>
    </div>
  );
}