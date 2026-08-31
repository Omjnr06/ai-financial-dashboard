"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { apiDelete } from "@/lib/api";
import { Monitor, ShieldCheck, LogOut, Loader2, KeyRound, AlertTriangle } from "lucide-react";

interface SessionRow {
  id: string;
  token: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function parseAgent(ua?: string | null): string {
  if (!ua) return "Unknown device";
  let browser = "Browser";
  if (/edg/i.test(ua)) browser = "Edge";
  else if (/chrome/i.test(ua)) browser = "Chrome";
  else if (/firefox/i.test(ua)) browser = "Firefox";
  else if (/safari/i.test(ua)) browser = "Safari";
  let os = "";
  if (/windows/i.test(ua)) os = "Windows";
  else if (/mac os/i.test(ua)) os = "macOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ios/i.test(ua)) os = "iOS";
  else if (/linux/i.test(ua)) os = "Linux";
  return os ? `${browser} on ${os}` : browser;
}

export function SecurityTab() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: currentSession } = authClient.useSession();
  const currentToken = currentSession?.session?.token;
  
  const user = currentSession?.user as any;
  const is2FaEnabled = user?.twoFactorEnabled === true;

  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [twoFaPassword, setTwoFaPassword] = useState("");
  const [twoFaError, setTwoFaError] = useState<string | null>(null);
  const [isSubmitting2Fa, setIsSubmitting2Fa] = useState(false);
  
  const [totpData, setTotpData] = useState<{ totpURI: string; backupCodes: string[] } | null>(null);
  const [verificationCode, setVerificationCode] = useState("");

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await authClient.signOut();
      router.push("/");
    } catch {
      setSigningOut(false);
    }
  };

  const handleEnableStart = async () => {
    setTwoFaError(null);
    setIsSubmitting2Fa(true);
    try {
      if (is2FaEnabled) {
        const res = await authClient.twoFactor.disable({ password: twoFaPassword });
        if (res.error) throw new Error(res.error.message);
        
        await authClient.getSession({ fetchOptions: { disableCookieCache: true } as any });
        setIs2FAModalOpen(false);
        setTwoFaPassword("");
        router.refresh();
        return;
      }

      const res = await authClient.twoFactor.enable({ password: twoFaPassword });
      if (res.error) throw new Error(res.error.message);

      if (res.data && 'totpURI' in res.data) {
         setTotpData({
           totpURI: res.data.totpURI as string,
           backupCodes: res.data.backupCodes as string[]
         });
      } else {
         throw new Error("Failed to generate Authenticator setup.");
      }
    } catch (e) {
      setTwoFaError(e instanceof Error ? e.message : "Invalid password.");
    } finally {
      setIsSubmitting2Fa(false);
    }
  };

  const handleVerifyTotp = async () => {
    setTwoFaError(null);
    setIsSubmitting2Fa(true);
    try {
      const res = await authClient.twoFactor.verifyTotp({ code: verificationCode });
      if (res.error) throw new Error(res.error.message);

      await authClient.getSession({ fetchOptions: { disableCookieCache: true } as any });
      
      setIs2FAModalOpen(false);
      setTotpData(null);
      setTwoFaPassword("");
      setVerificationCode("");
      router.refresh();
    } catch (e) {
      setTwoFaError("Invalid or expired verification code.");
    } finally {
      setIsSubmitting2Fa(false);
    }
  };

  const { data: sessions = [], isLoading, isError } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const res = await authClient.listSessions();
      if (res.error) throw new Error(res.error.message);
      return (res.data ?? []) as SessionRow[];
    },
  });

  const { mutate: revoke } = useMutation({
    mutationFn: async (token: string) => {
      const res = await authClient.revokeSession({ token });
      if (res.error) throw new Error(res.error.message);
      return true;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sessions"] }),
    onSettled: () => setRevokingId(null),
  });

  const { mutate: revokeOthers, isPending: revokingOthers } = useMutation({
    mutationFn: async () => {
      const res = await authClient.revokeOtherSessions();
      if (res.error) throw new Error(res.error.message);
      return true;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sessions"] }),
  });

  const closeModal = () => {
    setIs2FAModalOpen(false);
    setTotpData(null);
    setTwoFaPassword("");
    setVerificationCode("");
    setTwoFaError(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between p-4 bg-surface border border-border-subtle rounded-xl">
        <div>
          <p className="text-sm font-medium text-text-primary">Sign out</p>
          <p className="text-xs text-text-muted">Sign out of this device.</p>
        </div>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-text-primary bg-surface-raised border border-border-subtle hover:border-accent rounded-lg transition-colors disabled:opacity-50 shrink-0"
        >
          {signingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
          Sign out
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-accent" />
            <h2 className="text-xl font-semibold text-text-primary">Active Sessions</h2>
          </div>
          {sessions.length > 1 && (
            <button
              onClick={() => revokeOthers()}
              disabled={revokingOthers}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-danger bg-danger/10 hover:bg-danger/20 rounded-lg transition-colors disabled:opacity-50"
            >
              {revokingOthers ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
              Sign out everywhere else
            </button>
          )}
        </div>
        <p className="text-sm text-text-muted mb-4">Devices currently signed in to your account.</p>

        {isLoading ? (
          <div className="h-24 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
          </div>
        ) : isError ? (
          <div className="p-4 bg-surface border border-border-subtle rounded-xl text-sm text-text-muted">
            Couldn&apos;t load sessions.
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => {
              const isCurrent = s.token === currentToken;
              return (
                <div key={s.id} className="flex items-center justify-between p-4 bg-surface border border-border-subtle rounded-xl gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-surface-raised flex items-center justify-center border border-border-subtle shrink-0">
                      <Monitor className="w-4 h-4 text-text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-text-primary flex items-center gap-2">
                        {parseAgent(s.userAgent)}
                        {isCurrent && (
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-success px-1.5 py-0.5 rounded bg-success/10">
                            This device
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-text-muted">
                        {s.ipAddress || "Unknown location"} · since {new Date(s.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {!isCurrent && (
                    <button
                      onClick={() => { setRevokingId(s.id); revoke(s.token); }}
                      disabled={revokingId === s.id}
                      className="px-3 py-1.5 text-xs font-semibold text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors disabled:opacity-50 shrink-0"
                    >
                      {revokingId === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Sign out"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-2">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-5 h-5 text-accent" />
          <h2 className="text-xl font-semibold text-text-primary">Two-Factor Authentication</h2>
        </div>
        <p className="text-sm text-text-muted mb-4">Add a verification step at login for extra security.</p>
        <div className="p-4 bg-surface border border-border-subtle rounded-xl flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-primary">Authenticator App</p>
            <p className="text-xs text-text-muted">
              {is2FaEnabled ? "Two-factor authentication is currently enabled." : "Two-factor authentication is currently disabled."}
            </p>
          </div>
          <button
            onClick={() => setIs2FAModalOpen(true)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors shrink-0 ${
              is2FaEnabled
                ? "text-danger bg-danger/10 hover:bg-danger/20"
                : "text-text-primary bg-surface-raised border border-border-subtle hover:border-accent"
            }`}
          >
            {is2FaEnabled ? "Disable" : "Enable"}
          </button>
        </div>
      </div>

      <DeleteAccountSection />

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {is2FAModalOpen && (
            <div className="fixed inset-0 z-100 flex items-center justify-center px-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModal} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-surface border border-border-subtle p-6 shadow-2xl rounded-2xl"
              >
                
                {!totpData ? (
                  <>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">
                      {is2FaEnabled ? "Disable Two-Factor Authentication?" : "Enable Two-Factor Authentication"}
                    </h3>
                    <p className="text-sm text-text-muted mb-5">
                      {is2FaEnabled 
                        ? "You will no longer require an authenticator code to sign in."
                        : "You will need to scan a QR code with an authenticator app (like Google Authenticator or Authy)."}
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-text-muted mb-1.5">Enter your password to confirm</label>
                        <input
                          type="password"
                          value={twoFaPassword}
                          onChange={(e) => setTwoFaPassword(e.target.value)}
                          autoComplete="current-password"
                          className="w-full px-3 py-2.5 bg-surface-raised border border-border-subtle rounded-xl text-text-primary text-sm focus:outline-none focus:border-accent"
                        />
                      </div>
                      {twoFaError && <p className="text-sm text-danger">{twoFaError}</p>}
                    </div>

                    <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-border-subtle">
                      <button onClick={closeModal} className="px-3 py-2 text-sm font-medium text-text-muted hover:text-text-primary transition-colors">
                        Cancel
                      </button>
                      <button
                        onClick={handleEnableStart}
                        disabled={!twoFaPassword || isSubmitting2Fa}
                        className="px-4 py-2 text-sm font-semibold text-white bg-accent hover:bg-accent/90 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isSubmitting2Fa && <Loader2 className="w-4 h-4 animate-spin" />}
                        {is2FaEnabled ? "Disable 2FA" : "Continue"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">Configure Authenticator App</h3>
                    
                    <div className="space-y-5 mt-4">
                      <div className="bg-white p-3 rounded-xl mx-auto w-fit border border-border-subtle">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(totpData.totpURI)}`}
                          alt="2FA QR Code"
                          className="w-44 h-44"
                        />
                      </div>
                      
                      <p className="text-xs text-text-muted text-center">
                        Scan this QR code with Google Authenticator, Authy, or your preferred 2FA app.
                      </p>

                      <div className="bg-surface-raised p-4 rounded-xl border border-border-subtle">
                        <div className="flex items-center gap-2 mb-2 text-danger">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-sm font-semibold">Save your backup codes</span>
                        </div>
                        <p className="text-xs text-text-muted mb-3">
                          If you lose your device, you will be permanently locked out without these codes. Store them somewhere safe.
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono text-text-primary bg-surface p-3 rounded-lg border border-border-subtle">
                          {totpData.backupCodes.map((code, idx) => (
                            <span key={idx}>{code}</span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-text-muted mb-1.5">Verify setup code</label>
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="000000"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                          className="w-full px-3 py-2.5 bg-surface-raised border border-border-subtle rounded-xl text-text-primary tracking-widest text-center font-mono text-lg focus:outline-none focus:border-accent"
                        />
                      </div>
                      {twoFaError && <p className="text-sm text-center text-danger">{twoFaError}</p>}
                    </div>

                    <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-border-subtle">
                      <button onClick={closeModal} className="px-3 py-2 text-sm font-medium text-text-muted hover:text-text-primary transition-colors">
                        Cancel
                      </button>
                      <button
                        onClick={handleVerifyTotp}
                        disabled={verificationCode.length !== 6 || isSubmitting2Fa}
                        className="px-4 py-2 text-sm font-semibold text-white bg-accent hover:bg-accent/90 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isSubmitting2Fa && <Loader2 className="w-4 h-4 animate-spin" />}
                        Verify & Enable
                      </button>
                    </div>
                  </>
                )}

              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
}

function DeleteAccountSection() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canDelete = confirmText === "DELETE" && password.length > 0 && !deleting;

  const close = () => {
    setOpen(false);
    setConfirmText("");
    setPassword("");
    setError(null);
  };

  const handleDelete = async () => {
    setError(null);
    setDeleting(true);
    try {
      const session = await authClient.getSession();
      const email = session.data?.user?.email;
      if (!email) throw new Error("Couldn't verify your session.");

      const signIn = await authClient.signIn.email({ email, password });
      if (signIn.error) {
        setError("Incorrect password.");
        setDeleting(false);
        return;
      }

      await apiDelete("/api/account", { deleted: true });

      await authClient.signOut();
      router.push("/?reason=account_deleted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setDeleting(false);
    }
  };

  return (
    <div className="pt-2">
      <div className="flex items-center gap-2 mb-1">
        <KeyRound className="w-5 h-5 text-danger" />
        <h2 className="text-xl font-semibold text-text-primary">Danger Zone</h2>
      </div>
      <p className="text-sm text-text-muted mb-4">Permanently delete your account and all associated data.</p>
      <div className="p-4 bg-danger/5 border border-danger/20 rounded-xl flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-text-primary">Delete account</p>
          <p className="text-xs text-text-muted">This removes all your data and cannot be undone.</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-danger hover:bg-danger/90 rounded-lg transition-colors shrink-0"
        >
          Delete account
        </button>
      </div>

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {open && (
            <div className="fixed inset-0 z-100 flex items-center justify-center px-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="relative w-full max-w-md bg-surface border border-danger/30 p-6 shadow-2xl rounded-2xl"
              >
                <h3 className="text-lg font-semibold text-text-primary mb-2">Delete your account?</h3>
                <p className="text-sm text-text-muted mb-5">
                  This permanently deletes your profile, all connected banks, transactions, goals, bills, and income sources. This <span className="text-danger font-medium">cannot be undone</span>.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1.5">Type <span className="text-text-primary font-semibold">DELETE</span> to confirm</label>
                    <input
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="DELETE"
                      className="w-full px-3 py-2.5 bg-surface-raised border border-border-subtle rounded-xl text-text-primary text-sm focus:outline-none focus:border-danger"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1.5">Enter your password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      className="w-full px-3 py-2.5 bg-surface-raised border border-border-subtle rounded-xl text-text-primary text-sm focus:outline-none focus:border-danger"
                    />
                  </div>
                  {error && <p className="text-sm text-danger">{error}</p>}
                </div>

                <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-border-subtle">
                  <button onClick={close} className="px-3 py-2 text-sm font-medium text-text-muted hover:text-text-primary transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={!canDelete}
                    className="px-4 py-2 text-sm font-semibold text-white bg-danger hover:bg-danger/90 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Delete forever
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}