"use client";

import React from "react";
import Link from "next/link";
import { Home, ArrowLeftRight, PiggyBank, Settings, LayoutGrid, MessageSquare } from "lucide-react";
import { useThemeStore } from "@/stores/useThemeStore";

interface HorizontalLayoutProps {
  children: React.ReactNode;
  onOpenChat: () => void;
}

export function HorizontalLayout({ children, onOpenChat }: HorizontalLayoutProps) {
  const { setLayout } = useThemeStore();

  return (
    <div className="min-h-screen bg-linear-to-br from-surface via-surface to-accent/5 text-text-primary p-4 md:p-8 space-y-6">
      <header className="flex items-center justify-between max-w-350 mx-auto">
        <h1 className="font-kumar text-3xl md:text-4xl tracking-widest text-text-primary">
          The Vault
        </h1>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenChat}
            aria-label="Open AI Chat"
            className="p-2 rounded-full bg-surface-raised border border-border-subtle hover:border-accent transition-colors"
          >
            <MessageSquare className="w-5 h-5 text-accent" />
          </button>
          <button
            onClick={() => setLayout("vertical")}
            aria-label="Switch to Vertical Layout"
            className="p-2 rounded-full bg-surface-raised border border-border-subtle hover:border-accent transition-colors text-text-muted hover:text-text-primary text-xs flex items-center gap-1.5"
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden md:inline">Vertical Rail</span>
          </button>
        </div>
      </header>

      <nav className="flex justify-center max-w-350 mx-auto">
        <div className="flex items-center gap-2 md:gap-6 bg-surface-raised border border-border-subtle px-6 py-3 rounded-full shadow-lg">
          <Link href="/dashboard" className="flex items-center gap-2 text-accent font-semibold text-sm">
            <Home className="w-4 h-4" />
            <span className="font-kumar">Home</span>
          </Link>
          <Link href="/transactions" className="flex items-center gap-2 text-text-muted hover:text-text-primary text-sm transition-colors">
            <ArrowLeftRight className="w-4 h-4" />
            <span className="font-kumar">Transactions</span>
          </Link>
          <Link href="/savings" className="flex items-center gap-2 text-text-muted hover:text-text-primary text-sm transition-colors">
            <PiggyBank className="w-4 h-4" />
            <span className="font-kumar">Savings</span>
          </Link>
          <Link href="/settings" className="flex items-center gap-2 text-text-muted hover:text-text-primary text-sm transition-colors">
            <Settings className="w-4 h-4" />
            <span className="font-kumar">Settings</span>
          </Link>
        </div>
      </nav>

      <main className="max-w-350 mx-auto w-full">{children}</main>
    </div>
  );
}