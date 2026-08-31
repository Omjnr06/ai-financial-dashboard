"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { DayPicker } from "react-day-picker";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar } from "lucide-react";
import "react-day-picker/dist/style.css";

interface ThemedDatePickerProps {
  label: string;
  value: string; // yyyy-mm-dd
  onChange: (value: string) => void;
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromISO(s: string): Date | undefined {
  if (!s) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

export function ThemedDatePicker({ label, value, onChange }: ThemedDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selected = fromISO(value);

  const openPicker = () => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      const calHeight = 360;
      const spaceBelow = window.innerHeight - r.bottom;
      const openUp = spaceBelow < calHeight && r.top > calHeight;
      setCoords({
        top: openUp ? r.top - calHeight - 8 : r.bottom + 8,
        left: r.left,
        width: r.width,
      });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current && !triggerRef.current.contains(target)) {
        const cal = document.getElementById("themed-daypicker-pop");
        if (cal && !cal.contains(target)) setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div>
      <label className="block text-sm font-medium text-text-muted mb-1.5">{label}</label>
      <button
        ref={triggerRef}
        type="button"
        onClick={openPicker}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-surface-raised border border-border-subtle rounded-xl text-sm focus:outline-none focus:border-accent transition-colors"
      >
        <span className={value ? "text-text-primary" : "text-text-muted"}>
          {value || "Select a date"}
        </span>
        <Calendar className="w-4 h-4 text-text-muted" />
      </button>

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {open && coords && (
            <motion.div
              id="themed-daypicker-pop"
              initial={{ opacity: 0, scale: 0.96, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -6 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              style={{ position: "fixed", top: coords.top, left: coords.left, minWidth: coords.width, zIndex: 200 }}
              className="vault-daypicker bg-surface-raised border border-border-subtle rounded-2xl shadow-2xl p-3 flex justify-center"
            >
              <DayPicker
                mode="single"
                selected={selected}
                defaultMonth={selected}
                onSelect={(d) => {
                  if (d) {
                    onChange(toISO(d));
                    setOpen(false);
                  }
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}