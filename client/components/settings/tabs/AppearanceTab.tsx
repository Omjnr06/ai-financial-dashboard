"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useThemeStore } from "@/stores/useThemeStore";
import { THEMES, Theme } from "@/lib/themes";
import { apiGet, apiPatch } from "@/lib/api";
import { SettingsButton } from "@/components/settings/UI/SettingsButton";
import { themeTransition } from "@/lib/themeTransition";

const THEME_LABELS: Record<string, string> = {
  midnight: "Midnight",
  mono: "Mono",
  neon: "Neon",
  pink: "Rose",
  daylight: "Daylight",
};

interface ProfilePrefs {
  themeId: string;
  layoutId: "horizontal" | "vertical";
  timezone: string;
}

function MiniDashboard({ theme }: { theme: Theme }) {
  return (
    <div
      className="w-full h-32 rounded-xl overflow-hidden p-3 flex flex-col gap-2"
      style={{ backgroundColor: theme.surface }}
    >
      <div className="flex items-center justify-between">
        <div className="h-1.5 w-10 rounded-full" style={{ backgroundColor: theme.textMuted }} />
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: theme.accent }} />
      </div>
      <div
        className="rounded-lg p-2 flex flex-col gap-1.5"
        style={{ backgroundColor: theme.surfaceRaised, border: `1px solid ${theme.borderSubtle}` }}
      >
        <div className="h-2.5 w-16 rounded" style={{ backgroundColor: theme.textPrimary }} />
        <div className="flex items-end gap-1 h-6 mt-0.5">
          <div className="flex-1 rounded-sm" style={{ backgroundColor: theme.accent, height: "40%" }} />
          <div className="flex-1 rounded-sm" style={{ backgroundColor: theme.accent, height: "70%" }} />
          <div className="flex-1 rounded-sm" style={{ backgroundColor: theme.success, height: "100%" }} />
          <div className="flex-1 rounded-sm" style={{ backgroundColor: theme.accent, height: "55%" }} />
          <div className="flex-1 rounded-sm" style={{ backgroundColor: theme.warning, height: "80%" }} />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 rounded-md p-1.5 flex flex-col gap-1" style={{ backgroundColor: theme.surfaceRaised, border: `1px solid ${theme.borderSubtle}` }}>
          <div className="h-1 w-6 rounded-full" style={{ backgroundColor: theme.textMuted }} />
          <div className="h-1.5 w-8 rounded" style={{ backgroundColor: theme.success }} />
        </div>
        <div className="flex-1 rounded-md p-1.5 flex flex-col gap-1" style={{ backgroundColor: theme.surfaceRaised, border: `1px solid ${theme.borderSubtle}` }}>
          <div className="h-1 w-6 rounded-full" style={{ backgroundColor: theme.textMuted }} />
          <div className="h-1.5 w-8 rounded" style={{ backgroundColor: theme.danger }} />
        </div>
      </div>
    </div>
  );
}

function LayoutWireframe({ variant, color, accent }: { variant: "horizontal" | "vertical"; color: string; accent: string }) {
  if (variant === "horizontal") {
    return (
      <div className="w-full h-20 rounded-lg p-2 flex flex-col gap-1.5" style={{ backgroundColor: color }}>
        <motion.div layout className="h-2.5 w-full rounded" style={{ backgroundColor: accent }} />
        <div className="flex-1 flex gap-1.5">
          <motion.div layout className="flex-1 rounded" style={{ backgroundColor: `${accent}33` }} />
          <motion.div layout className="flex-1 rounded" style={{ backgroundColor: `${accent}33` }} />
          <motion.div layout className="flex-1 rounded" style={{ backgroundColor: `${accent}33` }} />
        </div>
      </div>
    );
  }
  return (
    <div className="w-full h-20 rounded-lg p-2 flex gap-1.5" style={{ backgroundColor: color }}>
      <motion.div layout className="w-2.5 h-full rounded" style={{ backgroundColor: accent }} />
      <div className="flex-1 flex flex-col gap-1.5">
        <motion.div layout className="flex-1 rounded" style={{ backgroundColor: `${accent}33` }} />
        <motion.div layout className="flex-1 rounded" style={{ backgroundColor: `${accent}33` }} />
      </div>
    </div>
  );
}

export function AppearanceTab() {
  const queryClient = useQueryClient();
  const themeId = useThemeStore((s) => s.themeId);
  const layoutId = useThemeStore((s) => s.layoutId);
  const setTheme = useThemeStore((s) => s.setTheme);
  const setLayout = useThemeStore((s) => s.setLayout);

  const [savedTheme, setSavedTheme] = useState<string | null>(null);
  const [savedLayout, setSavedLayout] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const { data: prefs } = useQuery({
    queryKey: ["profile"],
    queryFn: async () =>
      await apiGet<ProfilePrefs>("/api/profile", {
        themeId,
        layoutId,
        timezone: "America/Toronto",
      }),
  });

  useEffect(() => {
    if (prefs) {
      setSavedTheme(prefs.themeId);
      setSavedLayout(prefs.layoutId);
    }
  }, [prefs]);

  const dirty = savedTheme !== null && (themeId !== savedTheme || layoutId !== savedLayout);

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: async () =>
      await apiPatch("/api/profile", { themeId, layoutId }, { themeId, layoutId, timezone: "" }),
    onSuccess: () => {
      setSavedTheme(themeId);
      setSavedLayout(layoutId);
      queryClient.setQueryData(["profile"], (old: ProfilePrefs | undefined) =>
        old ? { ...old, themeId, layoutId } : old
      );
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <AnimatePresence>
        {(dirty || justSaved) && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="sticky top-4 z-40 flex items-center justify-between gap-4 px-5 py-3 bg-surface border border-accent/40 rounded-2xl shadow-xl"
          >
            <span className="text-sm text-text-muted">
              {justSaved ? "Preferences saved." : "You have unsaved changes."}
            </span>
            {!justSaved && (
              <SettingsButton onClick={() => save()} loading={saving}>
                Save Changes
              </SettingsButton>
            )}
            {justSaved && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center justify-center h-5 w-5 rounded-full bg-success">
                <Check className="w-3 h-3 text-surface" strokeWidth={3} />
              </motion.span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <div>
        <h2 className="text-xl font-semibold text-text-primary">Theme</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-5">
          {Object.entries(THEMES).map(([id, theme]) => {
            const selected = id === themeId;
            return (
              <button key={id} onClick={(e) => themeTransition(e, () => setTheme(id))} className="relative text-left rounded-2xl p-1.5 focus:outline-none">
                {selected && (
                  <motion.div
                    layoutId="theme-selection"
                    className="absolute inset-0 rounded-2xl border-2 border-accent"
                    transition={{ type: "spring", damping: 30, stiffness: 300 }}
                  />
                )}
                <div className="relative rounded-xl overflow-hidden">
                  <MiniDashboard theme={theme} />
                </div>
                <div className="flex items-center justify-between px-1.5 pt-2 pb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary">{THEME_LABELS[id] ?? id}</span>
                    <div className="flex items-center gap-1">
                      {[theme.accent, theme.textPrimary, theme.surfaceRaised, theme.borderSubtle].map((c, i) => (
                        <motion.span
                          key={i}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.05 * i, type: "spring", stiffness: 400, damping: 20 }}
                          className="h-2 w-2 rounded-full ring-1 ring-black/10"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  {selected && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center justify-center h-4 w-4 rounded-full bg-accent">
                      <Check className="w-2.5 h-2.5 text-surface" strokeWidth={3} />
                    </motion.span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-2">
        <h2 className="text-xl font-semibold text-text-primary">Navigation Layout</h2>
        <div className="grid grid-cols-2 gap-4 mt-5 max-w-md">
          {(["horizontal", "vertical"] as const).map((variant) => {
            const selected = variant === layoutId;
            return (
              <button key={variant} onClick={() => setLayout(variant)} className="relative rounded-2xl p-3 bg-surface-raised border border-border-subtle focus:outline-none hover:border-accent/40 transition-colors">
                {selected && (
                  <motion.div layoutId="layout-selection" className="absolute inset-0 rounded-2xl border-2 border-accent" transition={{ type: "spring", damping: 30, stiffness: 300 }} />
                )}
                <div className="relative">
                  <LayoutWireframe variant={variant} color="var(--surface)" accent="var(--accent)" />
                  <div className="flex items-center justify-between mt-3 px-0.5">
                    <span className="text-sm font-medium text-text-primary capitalize">{variant}</span>
                    {selected && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center justify-center h-4 w-4 rounded-full bg-accent">
                        <Check className="w-2.5 h-2.5 text-surface" strokeWidth={3} />
                      </motion.span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}