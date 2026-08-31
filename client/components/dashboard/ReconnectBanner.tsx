"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePlaidLink, PlaidLinkOnSuccess } from "react-plaid-link";
import { AlertCircle, X, Building2, Loader2 } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";

interface PlaidItemData {
  id: string;
  itemId: string;
  institutionName: string;
  status: "active" | "login_required" | "error";
}

export function ReconnectBanner() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);

  const { data: items = [] } = useQuery({
    queryKey: ["plaid-items"],
    queryFn: async () => await apiGet<PlaidItemData[]>("/api/plaid/items", []),
  });

  const brokenItems = items.filter((i) => i.status !== "active");

  const onPlaidSuccess = useCallback<PlaidLinkOnSuccess>(() => {
    setLinkToken(null);
    setLoadingItemId(null);
    queryClient.invalidateQueries({ queryKey: ["plaid-items"] });
  }, [queryClient]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: () => {
      setLinkToken(null);
      setLoadingItemId(null);
    },
  });

  useEffect(() => {
    if (linkToken && ready) open();
  }, [linkToken, ready, open]);

  const handleReconnect = async (item: PlaidItemData) => {
    setLoadingItemId(item.id);
    const data = await apiPost<{ linkToken: string; expiration: string }>(
      "/api/plaid/link_token/update",
      { item_id: item.itemId },
      { linkToken: "mock-update-token", expiration: "2099-01-01" }
    );
    setLinkToken(data.linkToken);
  };

  if (brokenItems.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="w-full flex items-center gap-3 px-4 py-3 mb-4 bg-danger/10 border border-danger/30 rounded-xl text-left hover:bg-danger/15 transition-colors group"
      >
        <div className="p-1.5 bg-danger/15 rounded-lg text-danger shrink-0">
          <AlertCircle className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary">
            {brokenItems.length === 1
              ? `${brokenItems[0].institutionName} needs to be reconnected`
              : `${brokenItems.length} bank connections need attention`}
          </p>
          <p className="text-xs text-text-muted">
            Your transactions aren&apos;t syncing. Click to reconnect.
          </p>
        </div>
        <span className="text-xs font-semibold text-danger uppercase tracking-wider shrink-0 group-hover:underline">
          Fix now
        </span>
      </button>

      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-surface border border-border-subtle p-6 shadow-2xl rounded-2xl"
            >
              <button
                onClick={() => setModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-raised rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-danger/10 rounded-lg text-danger">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-semibold text-text-primary">
                  Reconnect your {brokenItems.length === 1 ? "bank" : "banks"}
                </h2>
              </div>
              <p className="text-sm text-text-muted mb-6">
                One or more of your banks requires you to sign in again. Until you reconnect, new transactions won&apos;t sync.
              </p>

              <div className="space-y-3">
                {brokenItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-surface-raised border border-border-subtle rounded-xl gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-surface flex items-center justify-center border border-border-subtle shrink-0">
                        <Building2 className="w-4 h-4 text-text-primary" />
                      </div>
                      <span className="font-medium text-text-primary truncate">
                        {item.institutionName}
                      </span>
                    </div>
                    <button
                      onClick={() => handleReconnect(item)}
                      disabled={loadingItemId === item.id}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-accent hover:bg-accent/90 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                    >
                      {loadingItemId === item.id && <Loader2 className="w-3 h-3 animate-spin" />}
                      Reconnect
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}