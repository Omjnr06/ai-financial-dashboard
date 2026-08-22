"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ConnectionFailedPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-4 relative">
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />

      <div className="relative w-full max-w-md bg-surface-raised rounded-xl p-8 text-center shadow-xl">
        <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-red-500/10 mb-6">
          <svg
            className="w-8 h-8 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-semibold text-primary mb-4">
          Connection Interrupted
        </h1>

        <p className="text-muted mb-8">
          We couldn't securely establish a connection to your bank. This usually 
          happens due to a temporary issue with the bank's servers or an incomplete 
          login. Don't worry, no data was shared.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/connect-bank"
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            Try again
          </Link>
          
          <Link
            href="/dashboard"
            className="w-full bg-transparent hover:bg-white/5 text-muted font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}