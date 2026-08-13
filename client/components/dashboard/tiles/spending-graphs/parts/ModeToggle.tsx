"use client";

import React from "react";
import type { Mode } from "../types";

export function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="flex items-center rounded-full border border-border-subtle bg-surface p-0.5 text-[11px]">
      {(["week", "month"] as Mode[]).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`px-2.5 py-0.5 rounded-full transition ${
            mode === m
              ? "bg-accent text-surface"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          {m}
        </button>
      ))}
    </div>
  );
}