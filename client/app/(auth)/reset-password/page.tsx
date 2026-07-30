"use client";

import { Suspense, useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/UI/SignUpButton";
import { Input } from "@/components/UI/Input";

interface FormErrors {
  password?: string;
  confirmPassword?: string;
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  // No token at all in the URL — treat the same as invalid/expired.
  if (!token) {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-surface-raised rounded-xl p-8 text-center">
          <h1 className="text-2xl font-semibold text-primary mb-4">
            Invalid or expired link
          </h1>
          <p className="text-muted mb-6">
            This password reset link is missing or no longer valid.
          </p>
          <Link href="/forgot-password" className="text-accent hover:underline">
            Request a new link
          </Link>
        </div>
      </main>
    );
  }

  const validate = (): FormErrors => {
    const validationErrors: FormErrors = {};
    if (!password) {
      validationErrors.password = "Password is required.";
    } else if (password.length < 8) {
      validationErrors.password = "Password must be at least 8 characters.";
    }
    if (confirmPassword !== password) {
      validationErrors.confirmPassword = "Passwords do not match.";
    }
    return validationErrors;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const { error } = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (error) {
        setServerError(
          "This link is invalid or has expired. Please request a new one."
        );
        return;
      }

      setSucceeded(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setServerError(
        "This link is invalid or has expired. Please request a new one."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (succeeded) {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-surface-raised rounded-xl p-8 text-center">
          <h1 className="text-2xl font-semibold text-primary mb-4">
            Password updated
          </h1>
          <p className="text-muted">Redirecting you to log in...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-surface-raised rounded-xl p-8">
        <h1 className="text-2xl font-semibold text-primary mb-6">
          Set a new password
        </h1>

        {serverError && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-danger px-3 py-2 text-sm text-danger"
          >
            {serverError}{" "}
            <Link href="/forgot-password" className="underline">
              Request a new link
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Input
            label="New password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
            }}
            error={errors.password}
            helperText={!errors.password ? "At least 8 characters." : undefined}
            disabled={isSubmitting}
          />

          <Input
            label="Confirm new password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword)
                setErrors((p) => ({ ...p, confirmPassword: undefined }));
            }}
            error={errors.confirmPassword}
            disabled={isSubmitting}
          />

          <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Reset password"}
          </Button>
        </form>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}