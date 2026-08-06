"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { apiGet } from "@/lib/api";
import { useThemeStore } from "@/stores/useThemeStore";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { SafeToSpend, Bill, AccountsSummary } from "@/types/api";

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

import { mockSummary, mockAccountSafeToSpend, mockBills, mockTransactions, mockBuckets } from "@/mocks";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending: isAuthPending } = authClient.useSession();
  const { layoutId } = useThemeStore();
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInitialQuery, setChatInitialQuery] = useState("");

  const [summary, setSummary] = useState<AccountsSummary | null>(null);
  const [accountSafeToSpend, setAccountSafeToSpend] = useState<SafeToSpend | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [buckets, setBuckets] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!isAuthPending && !session) {
      router.push("/");
    }
  }, [session, isAuthPending, router]);

  useEffect(() => {
    async function fetchDashboardData() {
      setIsLoading(true);
      setHasError(false);
      try {
        const [summaryRes, billsRes, txRes, bucketsRes] = await Promise.all([
          apiGet<AccountsSummary>("/api/dashboard/summary", mockSummary),
          apiGet<Bill[]>("/api/bills", mockBills),
          apiGet<any[]>("/api/transactions", mockTransactions),
          apiGet<any[]>("/api/buckets", mockBuckets),
        ]);

        setSummary(summaryRes);
        setBills(billsRes);
        setTransactions(txRes);
        setBuckets(bucketsRes);
      } catch (error: any) {
        if (error?.status === 401) {
          router.push("/");
          return;
        }
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    }

    if (session) {
      fetchDashboardData();
    }
  }, [session, router]);

  const selectedAccount =
    selectedAccountId && summary
      ? summary.accounts.find((a) => a.id === selectedAccountId) ?? null
      : null;

  useEffect(() => {
    async function fetchAccountSafeToSpend() {
      if (!selectedAccount || selectedAccount.accountType !== "spending") {
        setAccountSafeToSpend(null);
        return;
      }
      try {
        const res = await apiGet<SafeToSpend>(
          `/api/dashboard/safe-to-spend?accountId=${selectedAccount.id}`,
          mockAccountSafeToSpend
        );
        setAccountSafeToSpend(res);
      } catch {
        setAccountSafeToSpend(null);
      }
    }
    if (session) {
      fetchAccountSafeToSpend();
    }
  }, [selectedAccount, session]);

  const handleOpenChatWithQuery = (query?: string) => {
    if (query) setChatInitialQuery(query);
    setIsChatOpen(true);
  };

  const LayoutWrapper = layoutId === "vertical" ? VerticalLayout : HorizontalLayout;

  const heroData: SafeToSpend | null =
    selectedAccount === null
      ? summary?.aggregateSafeToSpend ?? null
      : accountSafeToSpend;

  const dashboardBody = (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="flex-1 min-w-0 space-y-6">
        <SafeToSpendHeroTile
          data={heroData}
          bills={bills}
          isLoading={isLoading}
          error={hasError}
          netWorth={summary?.netWorth ?? null}
          selectedAccount={selectedAccount}
        />
        <SpendingGraphsTile isLoading={isLoading} />
      </div>

      <div className="w-full md:w-95 space-y-6">
        <LastTransactionsTile transactions={transactions} isLoading={isLoading} />
        <SearchAskChatTile onOpenChat={handleOpenChatWithQuery} />
        <BillsTile bills={bills} />
        <HabitAnalysisTile isLoading={isLoading} />
        <SavingsBucketsTile buckets={buckets} isLoading={isLoading} />
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