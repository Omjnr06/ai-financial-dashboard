"use client"; // Marks this as a client-side component so React hooks can be used.

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/UI/SignUpButton";
import { Input } from "@/components/UI/Input";

// Stores all the values entered into the sign up form.
interface FormState {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// Stores validation error messages for each field.
interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

// Simple email format validation.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Checks the form before submitting and returns any validation errors.
function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};

  // Make sure a name was entered.
  if (!form.name.trim()) {
    errors.name = "Name is required.";
  }

  // Make sure the email exists and has a valid format.
  if (!form.email.trim()) {
    errors.email = "Email is required.";
  } else if (!EMAIL_REGEX.test(form.email)) {
    errors.email = "Enter a valid email address.";
  }

  // Password must be at least 8 characters.
  if (!form.password) {
    errors.password = "Password is required.";
  } else if (form.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }

  // Both password fields must match.
  if (form.confirmPassword !== form.password) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

export default function SignUpPage() {
  const router = useRouter(); // Used to redirect the user after signing up.

  // Stores the user's form input.
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // Stores validation errors.
  const [errors, setErrors] = useState<FormErrors>({});

  // Stores any error returned from the server.
  const [serverError, setServerError] = useState<string | null>(null);

  // Prevents multiple submissions while the request is running.
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Updates the form whenever the user types.
  const handleChange = (field: keyof FormState) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));

    // Remove the error for this field once the user starts correcting it.
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Runs when the user submits the form.
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); // Stop the page from refreshing.
    setServerError(null);

    // Validate all fields before sending data.
    const validationErrors = validate(form);
    setErrors(validationErrors);

    // Don't continue if there are validation errors.
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);

    try {
      // Send the user's information to the authentication service.
      const { error } = await authClient.signUp.email({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });

      // Display any server-side errors.
      if (error) {
        setServerError(error.message ?? "Something went wrong. Please try again.");
        return;
      }

      // Redirect to email verification after successful signup.
      router.push("/verify-email");
    } catch {
      setServerError("Something went wrong. Please try again.");
    } finally {
      // Re-enable the form once the request finishes.
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-4">
      {/* Centered sign up card */}
      <div className="w-full max-w-md bg-surface-raised rounded-xl p-8">
        <h1 className="text-2xl font-semibold text-primary mb-6">
          Create your account
        </h1>

        {/* Shows server errors if signup fails */}
        {serverError && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-danger px-3 py-2 text-sm text-danger"
          >
            {serverError}
          </div>
        )}

        {/* Sign up form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Input
            label="Name"
            name="name"
            type="text"
            autoComplete="name"
            value={form.name}
            onChange={(e) => handleChange("name")(e.target.value)}
            error={errors.name}
            disabled={isSubmitting}
          />

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
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => handleChange("password")(e.target.value)}
            error={errors.password}
            helperText={!errors.password ? "At least 8 characters." : undefined}
            disabled={isSubmitting}
          />

          <Input
            label="Confirm password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(e) => handleChange("confirmPassword")(e.target.value)}
            error={errors.confirmPassword}
            disabled={isSubmitting}
          />

          {/* Submit button (includes loading UI) */}
          <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Sign Up"}
          </Button>
        </form>

        {/* Link for users who already have an account */}
        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}