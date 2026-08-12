"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Maximize2, Check } from "lucide-react";
import type { ViewId } from "../types";
import { VIEW_META } from "../registry";

export function ViewSwitcher({
  views,
  currentView,
  onSelect,
  onExpand,
}: {
  views: ViewId[];
  currentView: ViewId;
  onSelect: (v: ViewId) => void;
  onExpand?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const meta = VIEW_META[currentView];
  const multi = views.length > 1;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (v: ViewId) => {
    onSelect(v);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative flex items-center gap-1.5">
      <button
        onClick={() => multi && setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={!multi}
        className="flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface px-3 py-1 text-xs text-text-primary transition hover:border-accent disabled:cursor-default"
      >
        <span>{meta.label}</span>
        {multi && (
          <ChevronDown
            className={`w-3.5 h-3.5 text-text-muted transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        )}
      </button>
      {onExpand && (
        <button
          onClick={onExpand}
          aria-label="Expand chart"
          className="rounded-full border border-border-subtle bg-surface p-1.5 text-text-muted transition hover:border-accent hover:text-accent"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-10 z-40 w-64 overflow-hidden rounded-xl border border-border-subtle bg-surface p-1 shadow-xl"
          >
            {views.map((v) => {
              const m = VIEW_META[v];
              const active = v === currentView;
              return (
                <button
                  key={v}
                  role="option"
                  aria-selected={active}
                  onClick={() => pick(v)}
                  className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition ${
                    active ? "bg-accent/10" : "hover:bg-surface-raised"
                  }`}
                >
                  <Check
                    className={`mt-0.5 w-3.5 h-3.5 shrink-0 ${
                      active ? "text-accent" : "text-transparent"
                    }`}
                  />
                  <span className="min-w-0">
                    <span
                      className={`block text-xs font-medium ${
                        active ? "text-accent" : "text-text-primary"
                      }`}
                    >
                      {m.label}
                    </span>
                    <span className="block text-[11px] leading-snug text-text-muted">
                      {m.desc}
                    </span>
                  </span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}