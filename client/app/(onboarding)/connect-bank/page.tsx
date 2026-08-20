"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePlaidLink, PlaidLinkOnSuccess, PlaidLinkOnExit } from "react-plaid-link";
import { apiPost } from "@/lib/api"; 

export default function ConnectBankPage() {
  const router = useRouter();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isExchanging, setIsExchanging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch the link_token when the page loads so Plaid is ready when they click
  useEffect(() => {
    const fetchLinkToken = async () => {
      try {
        const data = await apiPost<{ linkToken: string; expiration: string }>(
          "/api/plaid/link_token",
          {},
          { linkToken: "mock-link-token", expiration: "2099-01-01" } // MOCK data
        );
        setLinkToken(data.linkToken);
      } catch (err) {
        console.error("Failed to fetch link token:", err);
        setErrorMsg("We couldn't initialize the connection. Please refresh the page.");
      } finally {
        setIsInitializing(false);
      }
    };

    fetchLinkToken();
  }, []);


  const onSuccess = useCallback<PlaidLinkOnSuccess>(
    async (public_token, metadata) => {
      setIsExchanging(true);
      setErrorMsg(null);
      try {
        await apiPost(
          "/api/plaid/exchange",
          { publicToken: public_token },
          { success: true, institutionName: metadata.institution?.name || "Mock Bank" } // mock fall back
        );
        

        router.push("/syncing");
      } catch (err) {
        console.error("Failed to exchange public token:", err);
        router.push("/connection-failed");
      }
    },
    [router]
  );


  const onExit = useCallback<PlaidLinkOnExit>(
    (error, metadata) => {
      if (error) {
        console.error("Plaid Link exited with error:", error);
        router.push("/connection-failed");
      }
    },
    [router]
  );


  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit,
  });

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-4 relative">
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />

      <div className="relative w-full max-w-md bg-surface-raised rounded-xl p-8 text-center shadow-xl">
        <h1 className="text-2xl font-semibold text-primary mb-4">
          Connect your bank
        </h1>

        <p className="text-muted mb-6">
          To give you accurate insights, The Vault needs to sync with your accounts. 
          We use Plaid to connect securely. Your bank credentials are encrypted and 
          <strong> never seen or stored by us.</strong>
        </p>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-sm">
            {errorMsg}
          </div>
        )}

        <button
          onClick={() => open()}
          disabled={!ready || isInitializing || isExchanging}
          className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isInitializing ? "Initializing..." : isExchanging ? "Connecting..." : "Continue with Plaid"}
        </button>
      </div>
    </main>
  );
}