"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export function ExpandModal({
  open,
  onClose,
  header,
  children,
}: {
  open: boolean;
  onClose: () => void;
  header?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
            className="fixed left-1/2 top-1/2 z-50 flex h-[86vh] w-[94vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-3xl border border-border-subtle bg-surface p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border-subtle pb-4">
              <div className="min-w-0">{header}</div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="rounded-full p-1.5 text-text-muted transition-colors hover:bg-surface-raised hover:text-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 pt-4">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}