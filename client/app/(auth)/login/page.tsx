"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/UI/SignUpButton";
import { Input } from "@/components/UI/Input";

interface FormState {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.email.trim()) {
    errors.email = "Email is required.";
  } else if (!EMAIL_REGEX.test(form.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!form.password) {
    errors.password = "Password is required.";
  }

  return errors;
}

function IdleLogoutNotice() {
  const searchParams = useSearchParams();
  const idleLogout = searchParams.get("reason") === "idle";

  if (!idleLogout) return null;

  return (
    <div className="mb-4 rounded-lg bg-accent/10 border border-border-subtle px-3 py-2 text-sm text-text-muted">
      You were signed out due to inactivity.
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({ email: "", password: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof FormState) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const { error } = await authClient.signIn.email({
        email: form.email.trim(),
        password: form.password,
      });

      if (error) {
        setServerError("Incorrect email or password.");
        return;
      }

      router.push("/dashboard");
    } catch {
      setServerError("Incorrect email or password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-surface-raised rounded-xl p-8">
        <h1 className="text-2xl font-semibold text-primary mb-6">
          Welcome back
        </h1>

        <Suspense fallback={null}>
          {!serverError && <IdleLogoutNotice />}
        </Suspense>

        {serverError && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-danger px-3 py-2 text-sm text-danger"
          >
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => handleChange("email")(e.target.value)}
            error={errors.email}
            disabled={isSubmitting}
          />
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => handleChange("password")(e.target.value)}
            error={errors.password}
            disabled={isSubmitting}
          />

          <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted space-y-1">
          <span className="block">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-accent hover:underline">
              Sign up
            </Link>
          </span>
          <span className="block">
            <Link href="/forgot-password" className="text-accent hover:underline">
              Forgot password?
            </Link>
          </span>
        </p>
      </div>
    </main>
  );
}