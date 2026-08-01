"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { apiGet } from "@/lib/api";
import { useThemeStore } from "@/stores/useThemeStore";
import { SafeToSpend, Bill } from "@/types/api";

// Layouts
import { HorizontalLayout } from "@/components/dashboard/layouts/HorizontalLayout";
import { VerticalLayout } from "@/components/dashboard/layouts/VerticalLayout";

// Bento Tiles
import { SafeToSpendHeroTile } from "@/components/dashboard/tiles/SafeToSpendHeroTile";
import { LastTransactionsTile } from "@/components/dashboard/tiles/LastTransactionsTile";
import { SearchAskChatTile } from "@/components/dashboard/tiles/SearchAskChatTile";
import { SavingsBucketsTile } from "@/components/dashboard/tiles/SavingBucketsTile";
import { HabitAnalysisTile } from "@/components/dashboard/tiles/HabitAnalysisTile";
import { SpendingGraphsTile } from "@/components/dashboard/tiles/SpendingGraphsTile";

// Drawer
import { SlideOverChat } from "@/components/dashboard/SlideOverChat";

// Typed Mocks (Resolves automatically to @/mocks/index.ts)
import { mockSafeToSpend, mockBills, mockTransactions, mockBuckets } from "@/mocks";

export default function DashboardPage() {
  const router = Router();
  const { data: session, isPending: isAuthPending } = authClient.useSession();
  const { layoutId } = useThemeStore();

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInitialQuery, setChatInitialQuery] = useState("");

  // Data states
  const [safeToSpend, setSafeToSpend] = useState<SafeToSpend | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  // Using any[] for these two until you lock down their strict types in @/types/api
  const [transactions, setTransactions] = useState<any[]>([]);
  const [buckets, setBuckets] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Auth Guard (Redirects to splash if unauthenticated)
  useEffect(() => {
    if (!isAuthPending && !session) {
      router.push("/");
    }
  }, [session, isAuthPending, router]);

  // Data Fetching
  useEffect(() => {
    async function fetchDashboardData() {
      setIsLoading(true);
      setHasError(false);
      try {
        // Promise.all fires these requests concurrently for maximum speed
        const [stsRes, billsRes, txRes, bucketsRes] = await Promise.all([
          apiGet<SafeToSpend>("/api/dashboard/safe-to-spend", mockSafeToSpend),
          apiGet<Bill[]>("/api/bills", mockBills),
          apiGet<any[]>("/api/transactions", mockTransactions),
          apiGet<any[]>("/api/buckets", mockBuckets),
        ]);

        setSafeToSpend(stsRes);
        setBills(billsRes);
        setTransactions(txRes);
        setBuckets(bucketsRes);
      } catch (error: any) {
        // If the API throws a 401 Unauthorized, boot the user to the login screen
        if (error?.status === 401) {
          router.push("/");
          return;
        }
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    }

    // Only fetch data if we have an active, verified session
    if (session) {
      fetchDashboardData();
    }
  }, [session, router]);

  const handleOpenChatWithQuery = (query?: string) => {
    if (query) setChatInitialQuery(query);
    setIsChatOpen(true);
  };

  // Dynamically select the layout wrapper based on the Zustand store
  const LayoutWrapper = layoutId === "vertical" ? VerticalLayout : HorizontalLayout;

  return (
    <LayoutWrapper onOpenChat={() => handleOpenChatWithQuery()}>
      {layoutId === "horizontal" ? (
        /* --- HORIZONTAL BENTO GRID (Updated asymmetric layout) --- */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-min">
          
          {/* ROW 1 */}
          <div className="md:col-span-2">
            <SafeToSpendHeroTile
              data={safeToSpend}
              bills={bills}
              isLoading={isLoading}
              error={hasError}
            />
          </div>
          <div className="space-y-6 flex flex-col justify-between">
            <LastTransactionsTile transactions={transactions} isLoading={isLoading} />
            <SearchAskChatTile onOpenChat={handleOpenChatWithQuery} />
          </div>

          {/* ROW 2 */}
          <div className="md:col-span-2 flex">
            <div className="w-full min-h-80">
              <SpendingGraphsTile isLoading={isLoading} />
            </div>
          </div>
          <div className="space-y-6 flex flex-col justify-between">
            <HabitAnalysisTile isLoading={isLoading} />
            <SavingsBucketsTile buckets={buckets} isLoading={isLoading} />
          </div>

        </div>
      ) : (
        /* --- VERTICAL RAIL BENTO GRID --- */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-min">
          
          {/* ROW 1 */}
          <div className="md:col-span-2">
            <SafeToSpendHeroTile
              data={safeToSpend}
              bills={bills}
              isLoading={isLoading}
              error={hasError}
            />
          </div>
          <div>
            <SavingsBucketsTile buckets={buckets} isLoading={isLoading} />
          </div>

          {/* ROW 2 */}
          <div className="md:col-span-2 flex">
            <div className="w-full min-h-80">
               <SpendingGraphsTile isLoading={isLoading} />
            </div>
          </div>
          <div className="space-y-6 flex flex-col justify-between">
            <LastTransactionsTile transactions={transactions} isLoading={isLoading} />
            <HabitAnalysisTile isLoading={isLoading} />
          </div>

        </div>
      )}

      {/* Slide-over AI Chat Panel */}
      <SlideOverChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        initialQuery={chatInitialQuery}
      />
    </LayoutWrapper>
  );
}


function Router() {
  return useRouter();
}