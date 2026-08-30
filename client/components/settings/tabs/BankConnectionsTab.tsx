"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePlaidLink, PlaidLinkOnSuccess } from "react-plaid-link";
import {
  RefreshCw, Wallet, Building2, Loader2, CheckCircle2,
  AlertCircle, Plus, Trash2, RotateCw,
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { SettingsButton } from "@/components/settings/UI/SettingsButton";

interface PlaidItemData {
  id: string;
  itemId: string;
  institutionName: string;
  status: "active" | "login_required" | "error";
  lastSyncedAt?: string | null;
  accountsCount?: number;
}

export function BankConnectionsTab() {
  const queryClient = useQueryClient();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [pendingReconnectId, setPendingReconnectId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["plaid-items"],
    queryFn: async () => await apiGet<PlaidItemData[]>("/api/plaid/items", []),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["plaid-items"] });

  const onPlaidSuccess = useCallback<PlaidLinkOnSuccess>(
    async (public_token, metadata) => {
      if (pendingReconnectId) {
        setPendingReconnectId(null);
        setLinkToken(null);
        refresh();
        return;
      }
      try {
        await apiPost(
          "/api/plaid/exchange",
          { publicToken: public_token },
          { success: true, institutionName: metadata.institution?.name || "Bank" }
        );
      } finally {
        setLinkToken(null);
        refresh();
      }
    },
    [pendingReconnectId]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: () => {
      setLinkToken(null);
      setPendingReconnectId(null);
    },
  });

  useEffect(() => {
    if (linkToken && ready) open();
  }, [linkToken, ready, open]);

  const handleAddInstitution = async () => {
    setPendingReconnectId(null);
    const data = await apiPost<{ linkToken: string; expiration: string }>(
      "/api/plaid/link_token",
      {},
      { linkToken: "mock-link-token", expiration: "2099-01-01" }
    );
    setLinkToken(data.linkToken);
  };

  const handleReconnect = async (item: PlaidItemData) => {
    setPendingReconnectId(item.id);
    const data = await apiPost<{ linkToken: string; expiration: string }>(
      "/api/plaid/link_token/update",
      { item_id: item.itemId },
      { linkToken: "mock-update-token", expiration: "2099-01-01" }
    );
    setLinkToken(data.linkToken);
  };

  const { mutate: syncAll, isPending: isSyncing } = useMutation({
    mutationFn: async () => await apiPost("/api/plaid/sync", {}, { synced: [] }),
    onSuccess: refresh,
  });

  const handleSyncItem = async (item: PlaidItemData) => {
    setActionLoadingId(item.id);
    try {
      await apiPost("/api/plaid/sync", { item_id: item.itemId }, { synced: [] });
      refresh();
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmDisconnect = async (item: PlaidItemData) => {
    setActionLoadingId(item.id);
    try {
      await apiPost("/api/plaid/item/remove", { item_id: item.itemId }, { success: true });
      setConfirmDeleteId(null);
      refresh();
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-8"
    >
      <div className="lg:col-span-1 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Bank Connections</h2>
          <p className="text-sm text-text-muted mt-1">Manage your linked financial institutions.</p>
        </div>

        <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-border-subtle">
            <div className="p-2 bg-accent/10 rounded-lg text-accent">
              <RefreshCw className={`w-5 h-5 ${isSyncing ? "animate-spin" : ""}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">Global Sync</p>
              <p className="text-xs text-text-muted">Fetch latest transactions</p>
            </div>
          </div>
          <SettingsButton className="w-full" onClick={() => syncAll()} loading={isSyncing}>
            Sync All Accounts
          </SettingsButton>
        </div>

        <div className="bg-surface border border-border-subtle rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <Wallet className="w-5 h-5 text-text-muted shrink-0 mt-0.5" />
            <p className="text-xs text-text-muted leading-relaxed">
              We use bank level encryption to securely connect your accounts. Your login credentials are never stored on our servers.
            </p>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 flex flex-col h-full">
        <div className="flex-1 space-y-4">
          {isLoading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
          ) : items.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center border-2 border-dashed border-border-subtle rounded-2xl">
              <Building2 className="w-8 h-8 text-text-muted mb-2 opacity-50" />
              <p className="text-sm text-text-muted">No institutions connected yet.</p>
            </div>
          ) : (
            items.map((inst) => (
              <div
                key={inst.id}
                className="flex flex-col p-5 bg-surface border border-border-subtle rounded-2xl gap-4 transition-colors hover:border-accent/40"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-surface-raised flex items-center justify-center border border-border-subtle shrink-0">
                      <Building2 className="w-5 h-5 text-text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-text-primary">{inst.institutionName}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {inst.status === "active" ? (
                          <span className="flex items-center gap-1 text-[11px] font-medium text-success uppercase tracking-wider">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] font-medium text-danger uppercase tracking-wider">
                            <AlertCircle className="w-3 h-3" /> Reconnect Required
                          </span>
                        )}
                        {inst.accountsCount != null && (
                          <span className="text-[11px] text-text-muted">
                            · {inst.accountsCount} account{inst.accountsCount === 1 ? "" : "s"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {inst.status !== "active" && (
                      <div className="relative group flex items-center">
                        <button
                          onClick={() => handleReconnect(inst)}
                          className="px-3 py-1.5 text-xs font-semibold text-danger bg-danger/10 hover:bg-danger/20 rounded-lg transition-colors"
                        >
                          Reconnect
                        </button>
                        <div className="absolute bottom-full right-0 sm:right-1/2 sm:translate-x-1/2 mb-2 w-max max-w-50 px-2.5 py-1.5 rounded-lg bg-surface-raised border border-border-subtle text-[11px] font-medium text-text-primary shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 scale-95 group-hover:scale-100 z-20 pointer-events-none">
                          Re-authenticate this bank to restore syncing
                        </div>
                      </div>
                    )}

                    <div className="relative group flex items-center">
                      <button
                        onClick={() => handleSyncItem(inst)}
                        disabled={actionLoadingId === inst.id}
                        className="p-2 text-text-muted hover:text-accent hover:bg-accent/10 rounded-xl transition-all active:scale-90 disabled:opacity-50"
                        aria-label="Sync this institution"
                      >
                        {actionLoadingId === inst.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RotateCw className="w-4 h-4" />
                        )}
                      </button>
                      <div className="absolute bottom-full right-0 sm:right-1/2 sm:translate-x-1/2 mb-2 w-max max-w-50 px-2.5 py-1.5 rounded-lg bg-surface-raised border border-border-subtle text-[11px] font-medium text-text-primary shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 scale-95 group-hover:scale-100 z-20 pointer-events-none">
                        Fetch the latest transactions from this bank
                      </div>
                    </div>

                    <div className="relative group flex items-center">
                      <button
                        onClick={() => setConfirmDeleteId(confirmDeleteId === inst.id ? null : inst.id)}
                        className="p-2 text-text-muted hover:text-danger hover:bg-danger/15 rounded-xl transition-all active:scale-90"
                        aria-label="Disconnect institution"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-full right-0 sm:right-1/2 sm:translate-x-1/2 mb-2 w-max max-w-50 px-2.5 py-1.5 rounded-lg bg-surface-raised border border-border-subtle text-[11px] font-medium text-text-primary shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 scale-95 group-hover:scale-100 z-20 pointer-events-none">
                        Remove this bank and delete its transaction history
                      </div>
                    </div>
                  </div>
                </div>

                {confirmDeleteId === inst.id && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-danger/5 border border-danger/20 rounded-xl">
                    <p className="text-xs text-text-muted leading-relaxed">
                      This removes <span className="text-text-primary font-medium">{inst.institutionName}</span> and permanently deletes all its transaction history. This cannot be undone.
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-primary transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleConfirmDisconnect(inst)}
                        disabled={actionLoadingId === inst.id}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-danger hover:bg-danger/90 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {actionLoadingId === inst.id && <Loader2 className="w-3 h-3 animate-spin" />}
                        Disconnect
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="pt-6 mt-6 border-t border-border-subtle">
          <button
            onClick={handleAddInstitution}
            className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border-subtle hover:border-accent hover:bg-accent/5 rounded-2xl text-text-primary font-medium transition-all group"
          >
            <div className="bg-surface-raised p-1 rounded-full group-hover:bg-accent group-hover:text-white transition-colors">
              <Plus className="w-4 h-4" />
            </div>
            Connect Another Institution
          </button>
        </div>
      </div>
    </motion.div>
  );
}