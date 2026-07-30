"use client";

import { useState, FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/UI/SignUpButton";
import { Input } from "@/components/UI/Input";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (value: string) => {
    setEmail(value);
    if (error) setError(undefined);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      setError("Enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      // We deliberately ignore the result here — same message either way,
      // regardless of whether the email is actually registered.
      const { error } = await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo: "/reset-password",
        });
    } catch {
      // Swallow errors too — don't leak network/server details that could
      // hint at whether the email exists.
    } finally {
      setIsSubmitting(false);
      setSubmitted(true);
    }
  };

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-surface-raised rounded-xl p-8">
        {submitted ? (
          <>
            <h1 className="text-2xl font-semibold text-primary mb-4">
              Check your inbox
            </h1>
            <p className="text-muted">
              If that email is registered, we've sent a link to reset your
              password.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-primary mb-6">
              Forgot your password?
            </h1>
            <p className="text-muted mb-6 text-sm">
              Enter your email and we'll send you a link to reset it.
            </p>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <Input
                label="Email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => handleChange(e.target.value)}
                error={error}
                disabled={isSubmitting}
              />

              <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send reset link"}
              </Button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}