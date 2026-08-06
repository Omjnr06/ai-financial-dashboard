"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, ChevronDown, AlertCircle } from "lucide-react";
import { formatCents } from "@/lib/format";
import { SafeToSpend, Bill,NetWorth,Account} from "@/types/api";

interface HeroTileProps {
  data: SafeToSpend | null;
  bills: Bill[];
  isLoading: boolean;
  error: boolean;
  netWorth?: NetWorth | null;
  selectedAccount?: Account | null;
}

export function SafeToSpendHeroTile({ data, bills, isLoading, error, netWorth, selectedAccount }: HeroTileProps) {
  const [timeframe, setTimeframe] = useState<"day" | "week" | "month">("week");
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-surface-raised rounded-3xl p-6 md:p-8 animate-pulse flex flex-col justify-between h-full min-h-55 border border-border-subtle">
        <div className="h-4 bg-surface rounded w-1/3 mb-4" />
        <div className="h-16 bg-surface rounded w-1/2 mb-4" />
        <div className="h-4 bg-surface rounded w-2/3" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-surface-raised rounded-3xl p-6 md:p-8 border border-border-subtle flex flex-col justify-center items-center text-center h-full min-h-55">
        <AlertCircle className="w-8 h-8 text-warning mb-2" />
        <p className="text-text-primary text-sm font-medium">Couldn't load Safe to Spend</p>
        <span className="text-text-muted text-xs mt-1">Check back in a moment</span>
      </div>
    );
  }

  const multiplier = timeframe === "day" ? 1 / 7 : timeframe === "month" ? 4.33 : 1;
  const calculatedSafeToSpend = Math.round(data.safeToSpendCent * multiplier);
  const hasNoBills = bills.length === 0;

  return (
    <div className="bg-surface-raised rounded-3xl p-6 md:p-8 border border-border-subtle flex flex-col justify-start relative overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1.5 hover:translate-x-1.5 hover:shadow-2xl hover:shadow-accent/10 hover:border-accent">
        <div
        className="absolute -top-24 -left-24 pointer-events-none"
        style={{
          background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)",
          width: "450px",
          height: "300px",
          opacity: 0.18,
          filter: "blur(70px)",
        }}
      />
      <div className="flex items-center justify-between gap-4">
        <span className="text-text-muted text-sm tracking-wide">
          Safe to spend - {timeframe}
        </span>
        <div className="flex items-center bg-surface rounded-full p-1 border border-border-subtle">
          {(["day", "week", "month"] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-all ${
                timeframe === tf
                  ? "bg-accent text-white shadow-sm"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="my-4">
        <div className="font-sans font-bold text-5xl md:text-7xl tabular-nums text-text-primary tracking-tight">
          {formatCents(calculatedSafeToSpend)}
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-3 text-sm text-text-muted">
          <div>
            Balance -{" "}
            <span className="text-text-primary font-medium tabular-nums">
              {formatCents(data.balanceCent)}
            </span>
          </div>
            <div className="mt-5">
            <div className="h-2 rounded-full bg-surface overflow-hidden">
            <div
                className="h-full rounded-full bg-accent transition-all"
                style={{
                width: `${Math.min(100, Math.max(0, (calculatedSafeToSpend / (data.balanceCent || 1)) * 100))}%`,
                }}
            />
            </div>
            <p className="text-text-muted text-xs mt-2">
            {Math.round((calculatedSafeToSpend / (data.balanceCent || 1)) * 100)}% of your balance is safe to spend
            </p>
        </div>
          <div>
            Threshold -{" "}
            <span className="text-text-primary font-medium tabular-nums">
              {formatCents(data.thresholdCent)}
            </span>
          </div>
        </div>
      </div>

      {hasNoBills && (
        <div className="mb-4 p-3 rounded-2xl bg-surface border border-border-subtle flex items-center justify-between text-xs text-warning">
          <span>Add your bills for a more accurate Safe to Spend calculation</span>
          <a href="/settings" className="font-semibold hover:underline ml-2">
            Add →
          </a>
        </div>
      )}

      <div className="pt-2 border-t border-border-subtle/50 flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-xs font-semibold text-accent hover:text-text-primary transition-colors group"
        >
          <span>{isExpanded ? "HIDE BREAKDOWN" : "OPEN BREAKDOWN"}</span>
          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden mt-4 pt-4 border-t border-border-subtle space-y-2 text-xs"
          >
            <div className="flex justify-between text-text-muted">
              <span>Upcoming Bills ({timeframe}):</span>
              <span className="text-danger font-medium tabular-nums">
                -{formatCents(Math.round(data.upcomingBillsCent * multiplier))}
              </span>
            </div>
            <div className="flex justify-between text-text-muted">
              <span>Savings Allocations:</span>
              <span className="text-warning font-medium tabular-nums">
                -{formatCents(Math.round(data.goalAllocationsCent * multiplier))}
              </span>
            </div>
            <div className="flex justify-between text-text-muted">
              <span>Safety Cushion Reserve:</span>
              <span className="text-text-primary font-medium tabular-nums">
                -{formatCents(data.thresholdCent)}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}