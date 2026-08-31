"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Check, X, Sparkles, ArrowRightLeft, Loader2 } from "lucide-react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { SettingsInput } from "@/components/settings/UI/SettingsInput";
import { SettingsButton } from "@/components/settings/UI/SettingsButton";
import { ThemedDatePicker } from "@/components/settings/UI/ThemedDatePicker";
import { formatCents } from "@/lib/format";

type Frequency = "weekly" | "biweekly" | "monthly";

interface IncomeSource {
  id: string;
  accountId: string | null;
  sourceAccountId: string | null;
  isInternalTransfer: boolean;
  name: string;
  amountToCent: number;
  frequency: Frequency;
  anchorDate: string | null;
  active: boolean;
  isAuto: boolean;
  reviewed: boolean;
  dismissed: boolean;
}

interface AccountLite {
  id: string;
  name: string;
  institutionName: string;
}

const FREQUENCIES: Frequency[] = ["weekly", "biweekly", "monthly"];

interface FormState {
  name: string;
  amount: string;
  frequency: Frequency;
  anchorDate: string;
  accountId: string;
  isInternalTransfer: boolean;
  sourceAccountId: string;
}

const emptyForm: FormState = {
  name: "",
  amount: "",
  frequency: "monthly",
  anchorDate: "",
  accountId: "",
  isInternalTransfer: false,
  sourceAccountId: "",
};

export function IncomeSourcesTab() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ["income"],
    queryFn: async () => await apiGet<IncomeSource[]>("/api/income", []),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts-lite"],
    queryFn: async () => await apiGet<AccountLite[]>("/api/dashboard/accounts", []),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["income"] });

  const confirmed = sources.filter((s) => s.reviewed && !s.dismissed);
  const suggestions = sources.filter((s) => s.isAuto && !s.reviewed && !s.dismissed);

  const { mutate: detect, isPending: detecting } = useMutation({
    mutationFn: async () => await apiPost("/api/income/detect", {}, { detected: 0, skipped: 0 }),
    onSuccess: refresh,
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (s: IncomeSource) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      amount: (s.amountToCent / 100).toString(),
      frequency: s.frequency,
      anchorDate: s.anchorDate ?? "",
      accountId: s.accountId ?? "",
      isInternalTransfer: s.isInternalTransfer,
      sourceAccountId: s.sourceAccountId ?? "",
    });
    setShowForm(true);
  };

  const { mutate: submit, isPending: submitting } = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        amountToCent: Math.round(parseFloat(form.amount) * 100),
        frequency: form.frequency,
        anchorDate: form.anchorDate,
        accountId: form.accountId || null,
        isInternalTransfer: form.isInternalTransfer,
        sourceAccountId: form.isInternalTransfer ? form.sourceAccountId || null : null,
      };
      if (editingId) {
        return await apiPatch(`/api/income/${editingId}`, payload, {});
      }
      return await apiPost("/api/income", payload, {});
    },
    onSuccess: () => {
      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      refresh();
    },
  });

  const { mutate: toggleActive } = useMutation({
    mutationFn: async (s: IncomeSource) =>
      await apiPatch(`/api/income/${s.id}`, { active: !s.active }, {}),
    onSuccess: refresh,
  });

  const { mutate: remove, isPending: removing } = useMutation({
    mutationFn: async (id: string) => await apiDelete(`/api/income/${id}`, { deleted: true }),
    onSuccess: refresh,
  });

  const { mutate: dismiss } = useMutation({
    mutationFn: async (id: string) => await apiPost(`/api/income/${id}/dismiss`, {}, { dismissed: true }),
    onSuccess: refresh,
  });

  const accountName = (id: string | null) => {
    if (!id) return null;
    const a = accounts.find((acc) => acc.id === id);
    return a ? `${a.institutionName} · ${a.name}` : "Unknown account";
  };

  const accountLabel = (a: AccountLite) => `${a.institutionName} · ${a.name}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Income Sources</h2>
          <p className="text-sm text-text-muted mt-1">Recurring money coming in. Used to calculate your Safe-to-Spend.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => detect()}
            disabled={detecting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-surface rounded-lg transition-colors border border-border-subtle disabled:opacity-50"
          >
            {detecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Detect
          </button>
          <SettingsButton onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add
          </SettingsButton>
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-accent uppercase tracking-wider">Detected — confirm or dismiss</p>
          {suggestions.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-4 bg-accent/5 border border-accent/30 rounded-xl gap-3">
              <div className="min-w-0">
                <p className="font-medium text-text-primary truncate">{s.name}</p>
                <p className="text-xs text-text-muted">
                  {formatCents(s.amountToCent)} · {s.frequency}
                  {accountName(s.accountId) ? ` · ${accountName(s.accountId)}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => openEdit(s)} className="px-3 py-1.5 text-xs font-semibold text-white bg-accent hover:bg-accent/90 rounded-lg transition-colors">
                  Review
                </button>
                <button onClick={() => dismiss(s.id)} className="p-1.5 text-text-muted hover:text-danger transition-colors" aria-label="Dismiss">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {isLoading ? (
          <div className="h-32 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
          </div>
        ) : confirmed.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center text-center border-2 border-dashed border-border-subtle rounded-2xl">
            <p className="text-sm text-text-muted">No income sources yet. Add one or run detection.</p>
          </div>
        ) : (
          confirmed.map((s) => (
            <div key={s.id} className={`flex flex-col p-4 bg-surface border border-border-subtle rounded-xl gap-3 ${!s.active ? "opacity-50" : ""}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {s.isInternalTransfer && <ArrowRightLeft className="w-4 h-4 text-text-muted shrink-0" />}
                  <div className="min-w-0">
                    <p className="font-medium text-text-primary truncate">{s.name}</p>
                    <p className="text-xs text-text-muted">
                      {formatCents(s.amountToCent)} · {s.frequency}
                      {s.isInternalTransfer
                        ? ` · ${accountName(s.sourceAccountId)} → ${accountName(s.accountId)}`
                        : accountName(s.accountId) ? ` · ${accountName(s.accountId)}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggleActive(s)} className="px-2.5 py-1 text-[11px] font-semibold rounded-md border border-border-subtle text-text-muted hover:text-text-primary transition-colors">
                    {s.active ? "Active" : "Paused"}
                  </button>
                  <button onClick={() => openEdit(s)} className="p-1.5 text-text-muted hover:text-text-primary transition-colors" aria-label="Edit">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setConfirmDeleteId(confirmDeleteId === s.id ? null : s.id)} className="p-1.5 text-text-muted hover:text-danger transition-colors" aria-label="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {confirmDeleteId === s.id && (
                <div className="flex items-center justify-between gap-3 p-3 bg-danger/5 border border-danger/20 rounded-lg">
                  <p className="text-xs text-text-muted">Delete <span className="text-text-primary font-medium">{s.name}</span>? This can&apos;t be undone.</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setConfirmDeleteId(null)} className="px-2.5 py-1 text-xs font-medium text-text-muted hover:text-text-primary transition-colors">
                      Cancel
                    </button>
                    <button
                      onClick={() => { remove(s.id); setConfirmDeleteId(null); }}
                      disabled={removing}
                      className="px-2.5 py-1 text-xs font-semibold text-white bg-danger hover:bg-danger/90 rounded-md transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {removing && <Loader2 className="w-3 h-3 animate-spin" />}
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {showForm && (
            <div className="fixed inset-0 z-100 flex items-center justify-center px-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="relative w-full max-w-md bg-surface border border-border-subtle p-6 shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto"
              >
                <h3 className="text-lg font-semibold text-text-primary mb-5">
                  {editingId ? "Edit income source" : "Add income source"}
                </h3>

                <div className="space-y-4">
                  <SettingsInput label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Paycheck" />
                  <SettingsInput label="Amount" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />

                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1.5">Frequency</label>
                    <div className="flex gap-2">
                      {FREQUENCIES.map((f) => (
                        <button
                          key={f}
                          onClick={() => setForm({ ...form, frequency: f })}
                          className={`flex-1 px-3 py-2 text-sm rounded-lg border capitalize transition-colors ${form.frequency === f ? "bg-accent text-white border-accent" : "border-border-subtle text-text-muted hover:text-text-primary"}`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  <ThemedDatePicker
                    label="Next payday"
                    value={form.anchorDate}
                    onChange={(v) => setForm({ ...form, anchorDate: v })}
                  />

                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1.5">
                      {form.isInternalTransfer ? "Lands in" : "Deposited to"}
                    </label>
                    <select
                      value={form.accountId}
                      onChange={(e) => setForm({ ...form, accountId: e.target.value })}
                      className="w-full px-3 py-2.5 bg-surface-raised border border-border-subtle rounded-xl text-text-primary text-sm focus:outline-none focus:border-accent"
                    >
                      <option value="">Select account</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>{accountLabel(a)}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => setForm({ ...form, isInternalTransfer: !form.isInternalTransfer })}
                    className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors"
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${form.isInternalTransfer ? "bg-accent border-accent" : "border-border-subtle"}`}>
                      {form.isInternalTransfer && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </div>
                    This is a transfer between my own accounts
                  </button>

                  {form.isInternalTransfer && (
                    <div>
                      <label className="block text-sm font-medium text-text-muted mb-1.5">Comes from</label>
                      <select
                        value={form.sourceAccountId}
                        onChange={(e) => setForm({ ...form, sourceAccountId: e.target.value })}
                        className="w-full px-3 py-2.5 bg-surface-raised border border-border-subtle rounded-xl text-text-primary text-sm focus:outline-none focus:border-accent"
                      >
                        <option value="">Select source account</option>
                        {accounts.filter((a) => a.id !== form.accountId).map((a) => (
                          <option key={a.id} value={a.id}>{accountLabel(a)}</option>
                        ))}
                      </select>
                      <p className="text-xs text-text-muted mt-1.5">Transfers count toward Safe-to-Spend but not net worth.</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-border-subtle">
                  <button onClick={() => setShowForm(false)} className="px-3 py-2 text-sm font-medium text-text-muted hover:text-text-primary transition-colors">
                    Cancel
                  </button>
                  <SettingsButton onClick={() => submit()} loading={submitting}>
                    {editingId ? "Save" : "Add"}
                  </SettingsButton>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
}