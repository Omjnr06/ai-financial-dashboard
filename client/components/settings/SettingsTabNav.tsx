"use client";

import { motion } from "framer-motion";
import { User, Landmark, Palette, Wallet, ShieldCheck } from "lucide-react";

export type SettingsTab = "profile" | "banks" | "appearance" | "income" | "security";

interface SettingsTabsNavProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
}

const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "banks", label: "Bank Connections", icon: Landmark },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "income", label: "Income Sources", icon: Wallet },
  { id: "security", label: "Security", icon: ShieldCheck },
];

export function SettingsTabsNav({ activeTab, onTabChange }: SettingsTabsNavProps) {
  return (
    <div className="flex items-center justify-center gap-1.5 overflow-x-auto p-1.5 rounded-full bg-surface-raised border border-border-subtle w-fit mx-auto mb-8">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-colors duration-200 z-10 ${
              isActive ? "text-surface" : "text-text-muted hover:text-text-primary"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="activeSettingsTabPill"
                className="absolute inset-0 bg-accent rounded-full -z-10 shadow-[0_0_12px_rgba(0,210,255,0.4)]"
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
              />
            )}
            <Icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}