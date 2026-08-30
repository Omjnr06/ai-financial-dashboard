"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { authClient } from "@/lib/auth-client";
import { useThemeStore } from "@/stores/useThemeStore";

import { HorizontalLayout } from "@/components/dashboard/layouts/HorizontalLayout";
import { VerticalLayout } from "@/components/dashboard/layouts/VerticalLayout";
import { SlideOverChat } from "@/components/dashboard/SlideOverChat";

import { SettingsTabsNav, SettingsTab } from "@/components/settings/SettingsTabNav";
import { ProfileTab } from "@/components/settings/tabs/ProfileTab";
import { BankConnectionsTab } from "@/components/settings/tabs/BankConnectionsTab";
import { AppearanceTab } from "@/components/settings/tabs/AppearanceTab";
import { IncomeSourcesTab } from "@/components/settings/tabs/IncomeSourcesTab";

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, isPending: isAuthPending } = authClient.useSession();
  const userId = session?.user?.id ?? null;

  const { layoutId } = useThemeStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>("banks");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInitialQuery, setChatInitialQuery] = useState("");

  useEffect(() => {
    if (!isAuthPending && !userId) {
      router.push("/");
    }
  }, [userId, isAuthPending, router]);

  const handleOpenChatWithQuery = (query?: string) => {
    if (query) setChatInitialQuery(query);
    setIsChatOpen(true);
  };

  const LayoutWrapper = layoutId === "vertical" ? VerticalLayout : HorizontalLayout;

  if (isAuthPending || !userId) {
    return null;
  }

  return (
    <LayoutWrapper onOpenChat={() => handleOpenChatWithQuery()}>
      <div className="space-y-6">
        <SettingsTabsNav activeTab={activeTab} onTabChange={setActiveTab} />

        <main>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, scale: 0.98, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -12 }}
              transition={{
                type: "spring",
                stiffness: 350,
                damping: 25,
                mass: 0.8,
              }}
              className="rounded-3xl bg-surface-raised p-6 md:p-8 border border-border-subtle shadow-xl backdrop-blur-lg min-h-100"
            >
              {activeTab === "profile" && <ProfileTab />}
              {activeTab === "banks" && <BankConnectionsTab />}
              {activeTab === "appearance" && <AppearanceTab />}
              {activeTab === "income" && <IncomeSourcesTab />}
              {activeTab === "security" && <div>Security Settings</div>}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <SlideOverChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        initialQuery={chatInitialQuery}
      />
    </LayoutWrapper>
  );
}