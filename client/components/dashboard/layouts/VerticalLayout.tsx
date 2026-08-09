"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Home, ArrowLeftRight, PiggyBank, MessageSquare, Settings, LayoutGrid } from "lucide-react";
import { useThemeStore } from "@/stores/useThemeStore";
import { usePathname } from "next/navigation";

interface VerticalLayoutProps {
  children: React.ReactNode;
  onOpenChat: () => void;
}

const navItems = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Transactions", href: "/transactions", icon: ArrowLeftRight },
  { label: "Savings", href: "/savings", icon: PiggyBank },
  { label: "Chat", href: "#chat", icon: MessageSquare },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function VerticalLayout({ children, onOpenChat }: VerticalLayoutProps) {
  const { setLayout } = useThemeStore();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
   const pathname = usePathname();

  return (
    <div className="min-h-screen bg-surface text-text-primary p-4 md:p-8 flex flex-col md:flex-row gap-6">
      {/* Desktop Vertical Icon Rail */}
      <aside className="hidden md:flex flex-col items-center justify-between bg-surface-raised border border-border-subtle p-4 rounded-3xl w-20 relative z-30 shadow-xl">
        <div className="space-y-6 flex flex-col items-center">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="relative flex items-center"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {item.label === "Chat" ? (
                  <button
                    onClick={onOpenChat}
                    aria-label="Open Chat"
                    className="p-3 rounded-2xl bg-surface hover:bg-accent hover:text-white transition-colors text-text-primary"
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    aria-label={item.label}
                    className={`p-3 rounded-2xl transition-colors ${
                      pathname === item.href
                        ? "bg-accent text-white"
                        : "hover:bg-surface text-text-muted hover:text-text-primary"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </Link>
                )}

                {/* Animated Framer Motion Tooltip Label */}
                {hoveredIdx === idx && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 10 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="absolute left-full ml-2 px-3 py-1.5 bg-surface border border-border-subtle rounded-xl text-xs font-medium text-text-primary whitespace-nowrap shadow-md pointer-events-none"
                  >
                    {item.label}
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={() => setLayout("horizontal")}
          aria-label="Switch to Horizontal Layout"
          className="p-3 rounded-2xl hover:bg-surface text-text-muted hover:text-text-primary transition-colors"
        >
          <LayoutGrid className="w-5 h-5" />
        </button>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl md:text-4xl tracking-widest text-text-primary" style={{ fontFamily: "var(--font-kumar)" }}>
            The Vault
          </h1>
          <button
            onClick={onOpenChat}
            aria-label="Open AI Chat"
            className="md:hidden p-2 rounded-full bg-surface-raised border border-border-subtle text-accent"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        </header>

        <main>{children}</main>
      </div>

      {/* Mobile Sticky Bottom Nav Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-raised/95 backdrop-blur-md border-t border-border-subtle p-3 flex justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          return item.label === "Chat" ? (
            <button key={item.label} onClick={onOpenChat} aria-label="Open Chat" className="p-2 text-text-muted">
              <Icon className="w-6 h-6" />
            </button>
          ) : (
            <Link key={item.label} href={item.href} aria-label={item.label} className="p-2 text-text-muted hover:text-accent">
              <Icon className="w-6 h-6" />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}