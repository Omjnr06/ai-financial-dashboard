"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { SettingsInput } from "@/components/settings/UI/SettingsInput";
import { SettingsButton } from "@/components/settings/UI/SettingsButton";
import { Pencil, X, Check, KeyRound } from "lucide-react";

export function ProfileTab() {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (user) setName(user.name ?? "");
  }, [user]);

  const { mutate: updateProfile, isPending: savingProfile } = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.updateUser({ name });
      if (error) throw new Error(error.message);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
      setIsEditing(false);
      setProfileMsg({ type: "success", text: "Profile updated." });
      setTimeout(() => setProfileMsg(null), 3000);
    },
    onError: (err: Error) => {
      setProfileMsg({ type: "error", text: err.message || "Update failed." });
    },
  });

  const { mutate: changePassword, isPending: savingPassword } = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) throw new Error("New passwords don't match.");
      if (newPassword.length < 8) throw new Error("Password must be at least 8 characters.");
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (error) throw new Error(error.message);
      return true;
    },
    onSuccess: () => {
      setShowPasswordForm(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMsg({ type: "success", text: "Password changed." });
      setTimeout(() => setPasswordMsg(null), 3000);
    },
    onError: (err: Error) => {
      setPasswordMsg({ type: "error", text: err.message || "Couldn't change password." });
    },
  });

  const cancelEdit = () => {
    setName(user?.name ?? "");
    setIsEditing(false);
    setProfileMsg(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div className="bg-surface-raised border border-border-subtle rounded-3xl p-6 md:p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">Personal Details</h2>
            <p className="text-sm text-text-muted mt-1">Your basic profile information.</p>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-surface rounded-lg transition-colors border border-border-subtle"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
          )}
        </div>

        <div className="space-y-5">
          {!isEditing ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">Name</p>
                <p className="text-text-primary">{user?.name || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">Email</p>
                <p className="text-text-primary">{user?.email || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">Timezone</p>
                <p className="text-text-primary">{browserTimezone.replace("_", " ")}</p>
              </div>
            </div>
          ) : (
            <SettingsInput
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              required
            />
          )}

          {isEditing && (
            <div className="pt-6 flex items-center justify-between border-t border-border-subtle">
              <p className={`text-sm h-5 ${profileMsg?.type === "error" ? "text-danger" : "text-success"}`}>
                {profileMsg?.text}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={cancelEdit}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <SettingsButton onClick={() => { setProfileMsg(null); updateProfile(); }} loading={savingProfile}>
                  <Check className="w-4 h-4 mr-1.5" />
                  Save
                </SettingsButton>
              </div>
            </div>
          )}

          {!isEditing && profileMsg && (
            <p className={`text-sm ${profileMsg.type === "error" ? "text-danger" : "text-success"}`}>
              {profileMsg.text}
            </p>
          )}
        </div>
      </div>

      <div className="bg-surface-raised border border-border-subtle rounded-3xl p-6 md:p-8">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-semibold text-text-primary">Password</h3>
          </div>
          {!showPasswordForm && (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="px-3 py-1.5 text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-surface rounded-lg transition-colors border border-border-subtle"
            >
              Change
            </button>
          )}
        </div>

        {!showPasswordForm ? (
          <p className="text-sm text-text-muted">Keep your account secure with a strong password.</p>
        ) : (
          <div className="space-y-5 pt-4">
            <SettingsInput
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
            <SettingsInput
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              helperText="At least 8 characters."
            />
            <SettingsInput
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
            <div className="pt-2 flex items-center justify-between border-t border-border-subtle">
              <p className={`text-sm h-5 ${passwordMsg?.type === "error" ? "text-danger" : "text-success"}`}>
                {passwordMsg?.text}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowPasswordForm(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setPasswordMsg(null);
                  }}
                  className="px-3 py-2 text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <SettingsButton onClick={() => { setPasswordMsg(null); changePassword(); }} loading={savingPassword}>
                  Update Password
                </SettingsButton>
              </div>
            </div>
          </div>
        )}

        {!showPasswordForm && passwordMsg && (
          <p className={`text-sm mt-2 ${passwordMsg.type === "error" ? "text-danger" : "text-success"}`}>
            {passwordMsg.text}
          </p>
        )}
      </div>
    </motion.div>
  );
}