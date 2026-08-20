"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api"; 
import { motion } from "framer-motion";

const POLL_INTERVAL_MS = 3000;
const LONG_WAIT_THRESHOLD_MS = 60000;

export default function SyncingPage() {
  const router = useRouter();
  const [isLongWait, setIsLongWait] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const startTime = Date.now();

    const checkStatus = async () => {
      try {
        if (Date.now() - startTime > LONG_WAIT_THRESHOLD_MS) {
          if (!cancelled) setIsLongWait(true);
        }


        const data = await apiGet<{ status: string; accountCount: number }>(
          "/api/plaid/status",
          { status: "pending", accountCount: 0 } 
        );

        if (cancelled) return;

        if (data.status === "ready") {
          router.push("/dashboard");
        }
      } catch (err) {
        console.error("Failed to check status:", err);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-4 relative">
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />

      <div className="relative w-full max-w-md bg-surface-raised rounded-xl p-8 text-center shadow-xl flex flex-col items-center">
        
        <motion.div
          className="w-16 h-16 border-4 border-slate-700 border-t-cyan-500 rounded-full mb-8"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        />

        <h1 className="text-2xl font-semibold text-primary mb-4">
          Securing & Syncing your connection
        </h1>

        <p className="text-muted min-h-12">
          {isLongWait 
            ? "This is taking a little longer than usual, but we're still working on it. Hang tight..."
            : "We are securely syncing your accounts and setting up your dashboard."}
        </p>

      </div>
    </main>
  );
}