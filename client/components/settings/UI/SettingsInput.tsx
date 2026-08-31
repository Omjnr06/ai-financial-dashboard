"use client";

import { InputHTMLAttributes, forwardRef } from "react";

interface SettingsInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export const SettingsInput = forwardRef<HTMLInputElement, SettingsInputProps>(
  ({ label, error, helperText, id, className = "", disabled, ...props }, ref) => {
    const inputId = id ?? props.name;

    return (
      <div className="w-full">
        <label
          htmlFor={inputId}
          className="mb-2 block text-sm font-medium text-text-primary"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={!!error}
          className={`w-full rounded-xl bg-surface border px-4 py-3 text-sm text-text-primary placeholder:text-text-muted transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-accent/10 ${
            error
              ? "border-danger focus:border-danger"
              : "border-border-subtle focus:border-accent"
          } ${disabled ? "opacity-60 cursor-not-allowed bg-surface-raised" : ""} ${className}`}
          {...props}
        />
        {error ? (
          <p className="mt-2 text-xs text-danger">{error}</p>
        ) : helperText ? (
          <p className="mt-2 text-xs text-text-muted">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

SettingsInput.displayName = "SettingsInput";