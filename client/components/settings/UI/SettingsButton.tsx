"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";

interface SettingsButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

export const SettingsButton = forwardRef<HTMLButtonElement, SettingsButtonProps>(
  ({ loading = false, disabled, className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`relative inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/25 focus:outline-none focus:ring-4 focus:ring-accent/20 disabled:pointer-events-none disabled:opacity-50 ${className}`}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        <span className={loading ? "opacity-90" : ""}>{children}</span>
      </button>
    );
  }
);

SettingsButton.displayName = "SettingsButton";