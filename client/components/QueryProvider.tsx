"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { useState, useEffect } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 1000 * 60 * 60 * 24, // Keep cache for 24 hours
        staleTime: 1000 * 60 * 5, // Data is fresh for 5 mins
      },
    },
  }));

  useEffect(() => {
    if (typeof window !== "undefined") {
      const asyncStorage = {
        getItem: async (key: string) => window.localStorage.getItem(key),
        setItem: async (key: string, value: string) => window.localStorage.setItem(key, value),
        removeItem: async (key: string) => window.localStorage.removeItem(key),
      };

      const persister = createAsyncStoragePersister({
        storage: asyncStorage,
      });

      persistQueryClient({
        queryClient,
        persister,
      });
    }
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}