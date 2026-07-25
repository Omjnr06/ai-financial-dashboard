import { create } from "zustand";
import { persist } from "zustand/middleware";

type LayoutId = "horizontal" | "vertical";

type ThemeState = {
  themeId: string;
  layoutId: LayoutId;
  setTheme: (id: string) => void;
  setLayout: (id: LayoutId) => void;
};


// holds the active theme id, persisted to localStorage so when refreshed the theme stays
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themeId: "midnight",
      layoutId: "horizontal",
      setTheme: (id) => set({ themeId: id }),
      setLayout: (id) => set({ layoutId: id }),
    }),
    { name: "vault-theme" }
  )
);


