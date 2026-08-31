"use client";

import { useEffect, useRef } from "react";
import { useThemeStore } from "@/stores/useThemeStore";
import { apiGet } from "@/lib/api";

interface ProfilePrefs {
  themeId: string;
  layoutId: "horizontal" | "vertical";
  timezone: string;
}

export function ThemeHydrator() {
  const setTheme = useThemeStore((s) => s.setTheme);
  const setLayout = useThemeStore((s) => s.setLayout);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    (async () => {
      try {
        const prefs = await apiGet<ProfilePrefs>("/api/profile", {
          themeId: "midnight",
          layoutId: "horizontal",
          timezone: "America/Toronto",
        });
        setTheme(prefs.themeId);
        setLayout(prefs.layoutId);
      } catch {
        // not logged in or fetch failed keep whatever localStorage/defaults provides
      }
    })();
  }, [setTheme, setLayout]);

  return null;
}