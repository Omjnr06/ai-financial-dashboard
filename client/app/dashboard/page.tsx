"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { apiGet } from "@/lib/api";
import { useThemeStore } from "@/stores/useThemeStore";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { AccountsSummary, Bill, HabitProfile } from "@/types/api";

import { HorizontalLayout } from "@/components/dashboard/layouts/HorizontalLayout";
import { VerticalLayout } from "@/components/dashboard/layouts/VerticalLayout";

import { SafeToSpendHeroTile } from "@/components/dashboard/tiles/SafeToSpendHeroTile";
import { LastTransactionsTile } from "@/components/dashboard/tiles/LastTransactionsTile";
import { SearchAskChatTile } from "@/components/dashboard/tiles/SearchAskChatTile";
import { SavingsBucketsTile } from "@/components/dashboard/tiles/SavingBucketsTile";
import { HabitAnalysisTile } from "@/components/dashboard/tiles/HabitAnalysisTile";
import { SpendingGraphsTile } from "@/components/dashboard/tiles/SpendingGraphsTile";
import { BillsTile } from "@/components/dashboard/tiles/BillsTile";
import { AccountToggle } from "@/components/dashboard/AccountToggle";

import { SlideOverChat } from "@/components/dashboard/SlideOverChat";

import {
  mockSummary,
  mockBills,
  mockBuckets,
  mockHabits,
} from "@/mocks";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending: isAuthPending } = authClient.useSession();
  const userId = session?.user?.id ?? null;

  const { layoutId } = useThemeStore();
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInitialQuery, setChatInitialQuery] = useState("");

  useEffect(() => {
    if (!isAuthPending && !userId) {
      router.push("/");
    }
  }, [userId, isAuthPending, router]);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["summary"],
    queryFn: async () => await apiGet<AccountsSummary>("/api/dashboard/summary", mockSummary),
    enabled: !!userId,
  });

  const { data: bills = [], isLoading: billsLoading } = useQuery({
    queryKey: ["bills"],
    queryFn: async () => await apiGet<Bill[]>("/api/bills", mockBills),
    enabled: !!userId,
  });

  const { data: habits = null, isLoading: habitsLoading } = useQuery({
    queryKey: ["habits"],
    queryFn: async () => await apiGet<HabitProfile>("/api/habits", mockHabits),
    enabled: !!userId,
  });

  const { data: buckets = [], isLoading: bucketsLoading } = useQuery({
    queryKey: ["buckets"],
    queryFn: async () => await apiGet<any[]>("/api/buckets", mockBuckets),
    enabled: !!userId,
  });

  const isCoreLoading = summaryLoading || billsLoading || habitsLoading || bucketsLoading;

  const handleOpenChatWithQuery = (query?: string) => {
    if (query) setChatInitialQuery(query);
    setIsChatOpen(true);
  };

  const LayoutWrapper = layoutId === "vertical" ? VerticalLayout : HorizontalLayout;

  const selectedAccount =
    selectedAccountId && summary
      ? summary.accounts.find((a) => a.id === selectedAccountId) ?? null
      : null;

  if (isAuthPending || !userId) {
    return null;
  }

  return (
    <LayoutWrapper onOpenChat={() => handleOpenChatWithQuery()}>
      <AccountToggle />
      
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 min-w-0 space-y-6">
          <SafeToSpendHeroTile
            bills={bills}
            isCoreLoading={isCoreLoading}
            netWorth={summary?.netWorth ?? null}
            selectedAccount={selectedAccount}
          />
          <SpendingGraphsTile
            habits={habits}
            buckets={buckets}
            isLoading={isCoreLoading}
          />
        </div>

        <div className="w-full md:w-95 space-y-6">
          <LastTransactionsTile />
          <SearchAskChatTile onOpenChat={handleOpenChatWithQuery} />
          <BillsTile />
          <HabitAnalysisTile />
          <SavingsBucketsTile />
        </div>
      </div>

      <SlideOverChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        initialQuery={chatInitialQuery}
      />
    </LayoutWrapper>
  );
}