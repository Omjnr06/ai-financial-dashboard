import { create } from "zustand";
import { persist } from "zustand/middleware";

type DashboardState = {
  selectedAccountId: string | null;
  setSelectedAccount: (id: string | null) => void;
};

// holds the currently selected account for the dashboard view; 
// null means the "All accounts" summary. 
// persisted so the selection survives a refresh
export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      selectedAccountId: null,
      setSelectedAccount: (id) => set({ selectedAccountId: id }),
    }),
    { name: "active-account" }
  )
);