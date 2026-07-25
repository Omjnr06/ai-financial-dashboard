"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/stores/useThemeStore";
import { THEMES } from "@/lib/themes";


export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeId = useThemeStore((s) => s.themeId);

  useEffect(() => {
    const theme = THEMES[themeId] ?? THEMES.midnight; 
    const root = document.documentElement;
    root.style.setProperty("--surface", theme.surface);
    root.style.setProperty("--surface-raised", theme.surfaceRaised);
    root.style.setProperty("--text-primary", theme.textPrimary);
    root.style.setProperty("--text-muted", theme.textMuted);
    root.style.setProperty("--accent", theme.accent);
    root.style.setProperty("--border-subtle", theme.borderSubtle);
    root.style.setProperty("--danger", theme.danger);
    root.style.setProperty("--success", theme.success);
    root.style.setProperty("--warning", theme.warning);
  }, [themeId]);

  return <>{children}</>;
}