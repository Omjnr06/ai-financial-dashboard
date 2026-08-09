"use client";

import { Account } from "@/types/api";
import { useDashboardStore } from "@/stores/useDashboardStore";

interface AccountToggleProps {
  accounts: Account[];
}

export function AccountToggle({ accounts }: AccountToggleProps) {
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const setSelectedAccount = useDashboardStore((s) => s.setSelectedAccount);

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar">
      <Pill
        label="All accounts"
        active={selectedAccountId === null}
        onClick={() => setSelectedAccount(null)}
      />
      {accounts.map((acc) => (
        <Pill
          key={acc.id}
          label={acc.institutionName ? `${acc.institutionName} · ${acc.name}` : acc.name}
          active={selectedAccountId === acc.id}
          onClick={() => setSelectedAccount(acc.id)}
        />
      ))}
    </div>
  );
}

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap px-4 py-2 rounded-full text-sm transition border ${
        active
          ? "bg-accent text-surface border-accent"
          : "bg-surface-raised text-text-muted border-border-subtle hover:text-text-primary"
      }`}
    >
      {label}
    </button>
  );
}