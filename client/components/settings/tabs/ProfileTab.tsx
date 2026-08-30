"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { SettingsInput } from "@/components/settings/UI/SettingsInput";
import { SettingsButton } from "@/components/settings/UI/SettingsButton";
import { ShieldCheck, MonitorSmartphone, KeyRound, Building2, RefreshCw } from "lucide-react";

export function ProfileTab() {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setEmail(user.email ?? "");
    }
  }, [user]);

  const { mutate: updateProfile, isPending } = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.updateUser({ name });
      if (error) throw new Error(error.message);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
      setSuccessMsg("Profile updated successfully.");
      setTimeout(() => setSuccessMsg(""), 3000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    updateProfile();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="grid grid-cols-1 xl:grid-cols-3 gap-6"
    >
      {/* Left Column: Form */}
      <div className="xl:col-span-2 bg-surface-raised border border-border-subtle rounded-3xl p-6 md:p-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-text-primary">Personal Details</h2>
          <p className="text-sm text-text-muted mt-1">
            Update your basic profile information.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <SettingsInput
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              required
            />
            <SettingsInput
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="pt-2">
            <SettingsInput
              label="Local Timezone"
              value={browserTimezone.replace("_", " ")}
              disabled
              helperText="Your timezone is automatically detected to keep your financial data synced to your day."
            />
          </div>

          <div className="pt-6 flex items-center justify-between border-t border-border-subtle">
            <p className="text-sm text-success h-5">{successMsg}</p>
            <SettingsButton type="submit" loading={isPending}>
              Save Changes
            </SettingsButton>
          </div>
        </form>
      </div>

      {/* Right Column: Account Snapshot */}
      <div className="bg-surface-raised border border-border-subtle rounded-3xl p-6 md:p-8 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-accent" />
            Account Snapshot
          </h3>
        </div>

        <div className="space-y-4">
          <div className="flex gap-3">
            <MonitorSmartphone className="w-5 h-5 text-text-muted shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-text-primary">Active Session</p>
              <p className="text-xs text-text-muted mt-0.5">Chrome on Windows · Al Wakrah, QA</p>
            </div>
          </div>

          <div className="flex gap-3">
            <KeyRound className="w-5 h-5 text-text-muted shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-text-primary">Last Password Change</p>
              <p className="text-xs text-text-muted mt-0.5">Updated 3 months ago</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Building2 className="w-5 h-5 text-text-muted shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-text-primary">2 Connected Institutions</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold bg-surface border border-border-subtle rounded text-text-primary">Chase</span>
                <span className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold bg-surface border border-border-subtle rounded text-text-primary">Amex</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-border-subtle">
            <RefreshCw className="w-5 h-5 text-success shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-text-primary">Global Sync Status</p>
              <p className="text-xs text-text-muted mt-0.5">All accounts synced 12 mins ago</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}