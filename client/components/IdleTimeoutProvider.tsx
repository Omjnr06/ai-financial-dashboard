"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { pingSession } from "@/lib/session-ping";

const IDLE_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_IDLE_TIMEOUT_MS ?? 15 * 60 * 1000);
const COUNTDOWN_SECONDS = Number(process.env.NEXT_PUBLIC_IDLE_COUNTDOWN_SECONDS ?? 60);
const ACTIVITY_STORAGE_KEY = "vault_last_activity";

export function IdleTimeoutProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const lastActivityAt = useRef<number>(Date.now());
  const isLoggingOut = useRef(false);
  const warningActive = useRef(false);

  const recordActivity = useCallback((broadcast: boolean) => {
    const now = Date.now();
    lastActivityAt.current = now;
    if (broadcast) {
      localStorage.setItem(ACTIVITY_STORAGE_KEY, String(now));
    }
  }, []);

  const handleActivity = useCallback(() => {
    if (warningActive.current) return;
    const now = Date.now();
    if (now - lastActivityAt.current > 1000) {
      recordActivity(true);
    }
  }, [recordActivity]);

  useEffect(() => {
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));
    return () => {
      events.forEach((e) => window.removeEventListener(e, handleActivity));
    };
  }, [handleActivity]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== ACTIVITY_STORAGE_KEY || !e.newValue) return;
      lastActivityAt.current = Math.max(lastActivityAt.current, parseInt(e.newValue, 10));
      if (warningActive.current) {
        warningActive.current = false;
        setShowWarning(false);
        setCountdown(COUNTDOWN_SECONDS);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const triggerLogout = useCallback(async () => {
    if (isLoggingOut.current) return;
    isLoggingOut.current = true;
    try {
      await authClient.signOut();
    } catch {
      // proceed to redirect regardless
    } finally {
      router.push("/login?reason=idle");
    }
  }, [router]);

  useEffect(() => {
    const tick = () => {
      if (isLoggingOut.current) return;
      const idleFor = Date.now() - lastActivityAt.current;

      if (idleFor < IDLE_TIMEOUT_MS) {
        if (warningActive.current) {
          warningActive.current = false;
          setShowWarning(false);
          setCountdown(COUNTDOWN_SECONDS);
        }
        return;
      }

      if (!warningActive.current) {
        warningActive.current = true;
        setShowWarning(true);
        setCountdown(COUNTDOWN_SECONDS);
        return;
      }

      const remaining = COUNTDOWN_SECONDS - Math.floor((idleFor - IDLE_TIMEOUT_MS) / 1000);
      if (remaining <= 0) {
        triggerLogout();
      } else {
        setCountdown(remaining);
      }
    };

    const intervalId = setInterval(tick, 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [triggerLogout]);

  const handleStillHere = useCallback(async () => {
    warningActive.current = false;
    setShowWarning(false);
    setCountdown(COUNTDOWN_SECONDS);
    recordActivity(true);
    await pingSession();
  }, [recordActivity]);

  return (
    <>
      {children}

      <AnimatePresence>
        {showWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-sm flex flex-col items-center bg-surface border border-border-subtle p-8 shadow-2xl rounded-2xl text-center"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 mb-4">
                <AlertTriangle className="h-6 w-6 text-danger" />
              </div>
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                Are you still there?
              </h2>
              <p className="text-sm text-text-muted mb-6">
                For your security, you&apos;ll be signed out automatically.
              </p>

              <div className="text-4xl font-bold text-accent mb-8 font-mono">
                {countdown}s
              </div>

              <button
                onClick={handleStillHere}
                className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-medium text-white hover:bg-accent/90 transition-colors shadow-sm"
              >
                I&apos;m still here
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}