"use client";

import React from "react";
import { formatCents } from "@/lib/format";
import { ArrowLeftRight, Utensils, ShoppingBag } from "lucide-react";

interface Transaction {
  id: string;
  merchantName: string;
  amountToCent: number;
  dateOf: string;
}

interface LastTransactionsTileProps {
  transactions: Transaction[];
  isLoading: boolean;
}

export function LastTransactionsTile({ transactions, isLoading }: LastTransactionsTileProps) {
  if (isLoading) {
    return (
      <div className="bg-surface-raised rounded-3xl p-6 border border-border-subtle animate-pulse h-full min-h-35">
        <div className="h-4 bg-surface rounded w-1/2 mb-3" />
        <div className="h-6 bg-surface rounded w-3/4" />
      </div>
    );
  }

  const latest = transactions[0];

  // Hardcoded category mapping for now, to be replaced by Plaid logic later
  const getIconForMerchant = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("uber") || lower.includes("food") || lower.includes("loblaws")) return <Utensils className="w-4 h-4" />;
    return <ShoppingBag className="w-4 h-4" />;
  };

  return (
    <div className="bg-surface-raised rounded-3xl p-6 border border-border-subtle flex flex-col justify-start min-h-35 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:translate-x-1.5 hover:shadow-2xl hover:shadow-accent/10 hover:border-accent">
      <div className="flex items-center justify-between text-text-muted text-xs tracking-wide">
        <span>last transaction(s):</span>
        <ArrowLeftRight className="w-4 h-4 text-accent" />
      </div>

      {latest ? (
        <div className="mt-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-accent/20 text-accent flex items-center justify-center shrink-0">
            {getIconForMerchant(latest.merchantName)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xl md:text-2xl font-bold text-text-primary truncate">
              {latest.merchantName || "Unknown Merchant"}
            </div>
            <div className="flex items-center gap-2 mt-1">
               <span className="text-sm font-sans font-medium text-danger tabular-nums">
                - {formatCents(Math.abs(latest.amountToCent))}
              </span>
              <span className="text-xs text-text-muted border-l border-border-subtle pl-2">
                {new Date(latest.dateOf).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-text-muted mt-2">No recent transactions synced.</div>
      )}
    </div>
  );
}