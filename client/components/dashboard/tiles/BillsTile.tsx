"use client";

import { CalendarClock } from "lucide-react";
import { Bill } from "@/types/api";
import { formatCents } from "@/lib/format";

interface BillsTileProps {
  bills: Bill[];
}

export function BillsTile({ bills }: BillsTileProps) {
  const activeBills = bills.filter((b) => b.active);
  const totalCents = activeBills.reduce((sum, b) => sum + b.amountToCent, 0);

  return (
    <div className="bg-surface-raised border border-border-subtle rounded-2xl p-5 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:translate-x-1.5 hover:shadow-2xl hover:shadow-accent/10 hover:border-accent">
      <div className="flex items-center justify-between mb-4">
        <span className="text-text-muted text-sm">upcoming bills</span>
        <CalendarClock size={16} className="text-accent" />
      </div>

      {activeBills.length === 0 ? (
        <p className="text-text-muted text-sm">
          No bills yet. Add them for a more accurate number.
        </p>
      ) : (
        <>
          <div className="text-2xl text-text-primary mb-3 tabular-nums">
            {formatCents(totalCents)}
            <span className="text-text-muted text-sm ml-2">/ month</span>
          </div>
          <div className="space-y-2">
            {activeBills.slice(0, 3).map((bill) => (
              <div key={bill.id} className="flex items-center justify-between text-sm">
                <span className="text-text-primary">{bill.name}</span>
                <span className="text-text-muted tabular-nums">
                  {formatCents(bill.amountToCent)} · {ordinal(bill.dueDay)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ordinal(day: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = day % 100;
  return day + (s[(v - 20) % 10] || s[v] || s[0]);
}