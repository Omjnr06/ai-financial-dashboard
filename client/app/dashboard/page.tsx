"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { apiGet } from "@/lib/api";
import { useThemeStore } from "@/stores/useThemeStore";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { SafeToSpend, Bill, AccountsSummary, HabitProfile } from "@/types/api";

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
  mockAccountSafeToSpend,
  mockBills,
  mockTransactionsPage,
  mockBuckets,
  mockHabits,
} from "@/mocks";

type Timeframe = "day" | "week" | "month";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending: isAuthPending } = authClient.useSession();
  const userId = session?.user?.id ?? null;

  const { layoutId } = useThemeStore();
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInitialQuery, setChatInitialQuery] = useState("");
  const [timeframe, setTimeframe] = useState<Timeframe>("week");

  const [summary, setSummary] = useState<AccountsSummary | null>(null);
  const [aggregateSafeToSpend, setAggregateSafeToSpend] = useState<SafeToSpend | null>(null);
  const [accountSafeToSpend, setAccountSafeToSpend] = useState<SafeToSpend | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [buckets, setBuckets] = useState<any[]>([]);
  const [habits, setHabits] = useState<HabitProfile | null>(null);

  const [isCoreLoading, setIsCoreLoading] = useState(true);
  const [isStsLoading, setIsStsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!isAuthPending && !userId) {
      router.push("/");
    }
  }, [userId, isAuthPending, router]);

  // core dashboard data — runs once per user, not on every session tick
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function fetchDashboardData() {
      setIsCoreLoading(true);
      setHasError(false);
      try {
        const [summaryRes, billsRes, txRes, bucketsRes, habitsRes] = await Promise.all([
          apiGet<AccountsSummary>("/api/dashboard/summary", mockSummary),
          apiGet<Bill[]>("/api/bills", mockBills),
          apiGet<any>("/api/transactions?limit=5", mockTransactionsPage(5, 0)),
          apiGet<any[]>("/api/buckets", mockBuckets),
          apiGet<HabitProfile>("/api/habits", mockHabits),
        ]);
        if (cancelled) return;
        setSummary(summaryRes);
        setBills(billsRes);
        setTransactions(txRes?.items ?? []);
        setBuckets(bucketsRes);
        setHabits(habitsRes);
      } catch (error: any) {
        if (cancelled) return;
        if (error?.status === 401) {
          router.push("/");
          return;
        }
        setHasError(true);
      } finally {
        if (!cancelled) setIsCoreLoading(false);
      }
    }

    fetchDashboardData();
    return () => {
      cancelled = true;
    };
  }, [userId, router]);

  // aggregate STS — refetches only when user or timeframe changes
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function fetchAggregate() {
      setIsStsLoading(true);
      try {
        const res = await apiGet<SafeToSpend>(
          `/api/dashboard/safe-to-spend?timeframe=${timeframe}`,
          mockSummary.aggregateSafeToSpend
        );
        if (!cancelled) setAggregateSafeToSpend(res);
      } catch {
        if (!cancelled) setAggregateSafeToSpend(null);
      } finally {
        if (!cancelled) setIsStsLoading(false);
      }
    }

    fetchAggregate();
    return () => {
      cancelled = true;
    };
  }, [userId, timeframe]);

  // per-account STS — refetches only when the selected account or timeframe changes
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function fetchAccountSts() {
      const account =
        selectedAccountId && summary
          ? summary.accounts.find((a) => a.id === selectedAccountId) ?? null
          : null;
      if (!account || account.accountType !== "spending") {
        setAccountSafeToSpend(null);
        return;
      }
      try {
        const res = await apiGet<SafeToSpend>(
          `/api/dashboard/safe-to-spend?accountId=${account.id}&timeframe=${timeframe}`,
          mockAccountSafeToSpend
        );
        if (!cancelled) setAccountSafeToSpend(res);
      } catch {
        if (!cancelled) setAccountSafeToSpend(null);
      }
    }

    fetchAccountSts();
    return () => {
      cancelled = true;
    };
  }, [userId, selectedAccountId, timeframe, summary]);

  const handleOpenChatWithQuery = (query?: string) => {
    if (query) setChatInitialQuery(query);
    setIsChatOpen(true);
  };

  const LayoutWrapper = layoutId === "vertical" ? VerticalLayout : HorizontalLayout;

  const selectedAccount =
    selectedAccountId && summary
      ? summary.accounts.find((a) => a.id === selectedAccountId) ?? null
      : null;

  const heroData: SafeToSpend | null =
    selectedAccount === null ? aggregateSafeToSpend : accountSafeToSpend;

  const dashboardBody = (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="flex-1 min-w-0 space-y-6">
        <SafeToSpendHeroTile
          data={heroData}
          bills={bills}
          isLoading={isCoreLoading || isStsLoading}
          error={hasError}
          netWorth={summary?.netWorth ?? null}
          selectedAccount={selectedAccount}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
        />
        <SpendingGraphsTile
          habits={habits}
          buckets={buckets}
          isLoading={isCoreLoading}
        />
      </div>

      <div className="w-full md:w-95 space-y-6">
        <LastTransactionsTile transactions={transactions} isLoading={isCoreLoading} />
        <SearchAskChatTile onOpenChat={handleOpenChatWithQuery} />
        <BillsTile bills={bills} />
        <HabitAnalysisTile habits={habits} isLoading={isCoreLoading} />
        <SavingsBucketsTile buckets={buckets} isLoading={isCoreLoading} />
      </div>
    </div>
  );

  return (
    <LayoutWrapper onOpenChat={() => handleOpenChatWithQuery()}>
      <AccountToggle accounts={summary?.accounts ?? []} />
      {dashboardBody}

      <SlideOverChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        initialQuery={chatInitialQuery}
      />
    </LayoutWrapper>
  );
}