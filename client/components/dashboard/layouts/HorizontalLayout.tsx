"use client";

import { ReactNode } from "react";
import { Home, ArrowLeftRight, PiggyBank, Settings, MessageSquare, LayoutGrid } from "lucide-react";
import { useThemeStore } from "@/stores/useThemeStore";

interface HorizontalLayoutProps {
  children: ReactNode;
  onOpenChat: () => void;
}

export function HorizontalLayout({ children, onOpenChat }: HorizontalLayoutProps) {
  const setLayout = useThemeStore((s) => s.setLayout);

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        <header className="flex items-center justify-between mb-8">
          <h1
            className="text-4xl text-text-primary tracking-wide"
            style={{ fontFamily: "var(--font-kumar)" }}
          >
            The Vault
          </h1>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setLayout("vertical")}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-raised border border-border-subtle text-text-muted hover:text-text-primary text-sm transition"
            >
              <LayoutGrid size={16} />
              Vertical Rail
            </button>
            <button
              onClick={onOpenChat}
              aria-label="Open chat"
              className="w-10 h-10 rounded-full bg-surface-raised border border-border-subtle flex items-center justify-center text-accent hover:bg-accent/10 transition"
            >
              <MessageSquare size={18} />
            </button>
          </div>
        </header>

        <nav className="flex justify-center mb-8">
          <div className="flex items-center gap-2 bg-surface-raised border border-border-subtle rounded-full px-3 py-2">
            <NavItem icon={<Home size={18} />} label="Home" active />
            <NavItem icon={<ArrowLeftRight size={18} />} label="Transactions" />
            <NavItem icon={<PiggyBank size={18} />} label="Savings" />
            <NavItem icon={<Settings size={18} />} label="Settings" />
          </div>
        </nav>

        {children}
      </div>
    </div>
  );
}

function NavItem({ icon, label, active }: { icon: ReactNode; label: string; active?: boolean }) {
  return (
    <button
      className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm transition ${
        active ? "bg-accent text-surface" : "text-text-muted hover:text-text-primary"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}