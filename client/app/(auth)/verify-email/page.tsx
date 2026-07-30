"use client"; // Tells Next.js this component runs in the browser (client-side)

import { useState, useEffect } from "react"; // React hooks for state and side effects
import { useRouter } from "next/navigation"; // Used to navigate to another page
import { authClient } from "@/lib/auth-client"; // Our authentication client

// Check if the user's email has been verified every 3 seconds
const POLL_INTERVAL_MS = 3000;

export default function VerifyEmailPage() {
  // Allows us to redirect the user to another page
  const router = useRouter();

  // Stores whether we're currently checking the verification status
  const [checking, setChecking] = useState(false);

  // Stores the user's email so we can display it on the page
  const [email, setEmail] = useState<string | null>(null);

  // Runs once when the page first loads
  useEffect(() => {
    // Used to prevent updating state after the component is removed
    let cancelled = false;

    // Function that checks whether the user's email is verified
    const checkVerification = async () => {
      // Show that we're currently checking
      setChecking(true);

      try {
        // Get the current logged-in user's session information
        const { data } = await authClient.getSession();

        // If the component has already been removed, stop here
        if (cancelled) return;

        // If a user is logged in...
        if (data?.user) {
          // Save their email so we can display it
          setEmail(data.user.email);

          // If their email has been verified...
          if (data.user.emailVerified) {
            // Automatically send them to the dashboard
            router.push("/dashboard");
          }
        }
      } finally {
        // No matter what happens, stop showing "checking"
        // (unless the component has already been removed)
        if (!cancelled) setChecking(false);
      }
    };

    // Check immediately when the page loads
    checkVerification();

    // Keep checking every 3 seconds until the user verifies their email
    const interval = setInterval(checkVerification, POLL_INTERVAL_MS);

    // Cleanup function
    // Runs when the user leaves this page
    return () => {
      // Prevent future state updates
      cancelled = true;

      // Stop the interval so it doesn't continue running
      clearInterval(interval);
    };
  }, [router]); // Re-run only if the router object changes

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-4 relative">
      {/* Dark background behind the card to make it look like a modal */}
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />

      {/* Main card shown to the user */}
      <div className="relative w-full max-w-md bg-surface-raised rounded-xl p-8 text-center shadow-xl">
        {/* Page heading */}
        <h1 className="text-2xl font-semibold text-primary mb-4">
          Check your inbox
        </h1>

        {/* Show the user's email if we know it */}
        <p className="text-muted mb-6">
          {email
            ? `We sent a verification link to ${email}. Click it to activate your account.`
            : "We sent you a verification link. Click it to activate your account."}
        </p>

        {/* Display the current verification status */}
        <p className="text-sm text-muted">
          {checking
            ? "Checking verification status..."
            : "This page will update automatically once you're verified."}
        </p>
      </div>
    </main>
  );
}