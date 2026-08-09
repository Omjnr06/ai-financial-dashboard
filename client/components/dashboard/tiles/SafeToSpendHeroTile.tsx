"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { formatCents } from "@/lib/format";
import { SafeToSpend, Bill, NetWorth, Account } from "@/types/api";

interface HeroTileProps {
  data: SafeToSpend | null;
  bills: Bill[];
  isLoading: boolean;
  error: boolean;
  netWorth?: NetWorth | null;
  selectedAccount?: Account | null;
  timeframe: "day" | "week" | "month";
  onTimeframeChange: (tf: "day" | "week" | "month") => void;
}

export function SafeToSpendHeroTile({
  data,
  bills,
  isLoading,
  error,
  netWorth,
  selectedAccount,
  timeframe,
  onTimeframeChange,
}: HeroTileProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isSpendingView =
    selectedAccount === null ||
    selectedAccount === undefined ||
    selectedAccount.accountType === "spending";

  if (isLoading) {
    return (
      <div className="bg-surface-raised rounded-3xl p-6 md:p-8 animate-pulse flex flex-col justify-between h-full min-h-55 border border-border-subtle">
        <div className="h-4 bg-surface rounded w-1/3 mb-4" />
        <div className="h-16 bg-surface rounded w-1/2 mb-4" />
        <div className="h-4 bg-surface rounded w-2/3" />
      </div>
    );
  }

  if (!isSpendingView && selectedAccount) {
    return (
      <AccountDetailHero account={selectedAccount} />
    );
  }

  if (error || !data) {
    return (
      <div className="bg-surface-raised rounded-3xl p-6 md:p-8 border border-border-subtle flex flex-col justify-center items-center text-center h-full min-h-55">
        <AlertCircle className="w-8 h-8 text-warning mb-2" />
        <p className="text-text-primary text-sm font-medium">Couldn&apos;t load Safe to Spend</p>
        <span className="text-text-muted text-xs mt-1">Check back in a moment</span>
      </div>
    );
  }

  const hasNoBills = bills.length === 0;

  const showNetWorth = selectedAccount == null && netWorth != null;

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
              onClick={() => onTimeframeChange(tf)}
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
          {formatCents(data.safeToSpendCent)}
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
                  width: `${Math.min(100, Math.max(0, (data.safeToSpendCent / (data.balanceCent || 1)) * 100))}%`,
                }}
              />
            </div>
            <p className="text-text-muted text-xs mt-2">
              {Math.round((data.safeToSpendCent / (data.balanceCent || 1)) * 100)}% of your balance is safe to spend
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
              <span>Income ({timeframe}):</span>
              <span className="text-accent font-medium tabular-nums">
                +{formatCents(data.incomeCent)}
              </span>
            </div>
            <div className="flex justify-between text-text-muted">
              <span>Upcoming Bills ({timeframe}):</span>
              <span className="text-danger font-medium tabular-nums">
                -{formatCents(data.upcomingBillsCent)}
              </span>
            </div>
            <div className="flex justify-between text-text-muted">
              <span>Savings Allocations:</span>
              <span className="text-warning font-medium tabular-nums">
                -{formatCents(data.goalAllocationsCent)}
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

      {showNetWorth && netWorth && (
        <div className="mt-6 pt-6 border-t border-border-subtle">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-text-muted text-sm tracking-wide">Net worth</span>
              <div
                className={`font-sans font-bold text-3xl md:text-4xl tabular-nums tracking-tight ${
                  netWorth.netWorthCent < 0 ? "text-danger" : "text-text-primary"
                }`}
              >
                {formatCents(netWorth.netWorthCent)}
              </div>
            </div>
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex items-center gap-2 text-text-muted">
                <TrendingUp className="w-4 h-4 text-accent" />
                <span>Assets</span>
                <span className="text-text-primary font-medium tabular-nums">
                  {formatCents(netWorth.assetsCent)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-text-muted">
                <TrendingDown className="w-4 h-4 text-danger" />
                <span>Debts</span>
                <span className="text-text-primary font-medium tabular-nums">
                  {formatCents(netWorth.debtsCent)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// per-account hero for non-spending accounts (credit / savings / investment / loan)
function AccountDetailHero({ account }: { account: Account }) {
  const config = getAccountConfig(account);

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
        <span className="text-text-muted text-sm tracking-wide">{config.label}</span>
        <span className="text-text-muted text-xs px-3 py-1 rounded-full bg-surface border border-border-subtle capitalize">
          {account.accountType}
        </span>
      </div>

      <div className="my-4">
        <div className="font-sans font-bold text-5xl md:text-7xl tabular-nums text-text-primary tracking-tight">
          {formatCents(config.heroValueCent)}
        </div>
        <p className="text-text-muted text-sm mt-3">{config.heroSubtitle}</p>
      </div>

      {config.utilization != null && (
        <div className="mt-2">
          <div className="h-2 rounded-full bg-surface overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${Math.min(100, Math.max(0, config.utilization))}%` }}
            />
          </div>
          <p className="text-text-muted text-xs mt-2">
            {Math.round(config.utilization)}% of your limit used
          </p>
        </div>
      )}

      {config.rows.length > 0 && (
        <div className="mt-6 pt-6 border-t border-border-subtle space-y-2 text-sm">
          {config.rows.map((row) => (
            <div key={row.label} className="flex justify-between text-text-muted">
              <span>{row.label}</span>
              <span className="text-text-primary font-medium tabular-nums">
                {formatCents(row.valueCent)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface AccountConfig {
  label: string;
  heroValueCent: number;
  heroSubtitle: string;
  utilization: number | null;
  rows: { label: string; valueCent: number }[];
}

function getAccountConfig(account: Account): AccountConfig {
  switch (account.accountType) {
    case "credit": {
      const owed = account.currentBalanceToCent;
      const limit = account.limitToCent ?? 0;
      const available = account.availableBalanceToCent ?? (limit - owed);
      const utilization = limit > 0 ? (owed / limit) * 100 : null;
      return {
        label: "Balance owed",
        heroValueCent: owed,
        heroSubtitle: `${formatCents(available)} available to spend`,
        utilization,
        rows: [
          { label: "Credit limit", valueCent: limit },
          { label: "Available", valueCent: available },
        ],
      };
    }
    case "savings": {
      return {
        label: "Savings balance",
        heroValueCent: account.currentBalanceToCent,
        heroSubtitle: "Set goals to track what you're saving toward",
        utilization: null,
        rows: [],
      };
    }
    case "investment": {
      return {
        label: "Market value",
        heroValueCent: account.currentBalanceToCent,
        heroSubtitle: "Value moves with the market",
        utilization: null,
        rows: [],
      };
    }
    case "loan": {
      return {
        label: "Balance owed",
        heroValueCent: account.currentBalanceToCent,
        heroSubtitle: "Remaining on this loan",
        utilization: null,
        rows: [],
      };
    }
    default: {
      return {
        label: "Balance",
        heroValueCent: account.currentBalanceToCent,
        heroSubtitle: "",
        utilization: null,
        rows: [],
      };
    }
  }
}