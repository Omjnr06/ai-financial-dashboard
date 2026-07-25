"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { MoneyStack } from "@/components/MoneyStack";
import { FloatingMoney } from "@/components/FloatingMoney";

type Phase = "loading" | "authed" | "guest";

export default function Splash() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");

  useEffect(() => {
    const check = authClient.getSession();
    const timer = new Promise((r) => setTimeout(r, 2500));

    Promise.all([check, timer]).then(([session]) => {
      if (session.data?.user) {
        setPhase("authed");
        router.push("/dashboard");
      } else {
        setPhase("guest");
      }
    });
  }, [router]);

  return (
    <main
      className="text-text-primary min-h-screen relative overflow-hidden flex flex-col items-center justify-center"
      style={{
        background: "linear-gradient(180deg, var(--surface) 0%, #060C29 100%)",
      }}
    >
      <FloatingMoney />

      <div
        className="absolute"
        style={{
          background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)",
          width: "600px",
          height: "400px",
          opacity: 0.35,
          filter: "blur(60px)",
        }}
      />

      <div className="flex items-center gap-4 z-10">
        <h1
          className="text-5xl tracking-widest"
          style={{ fontFamily: "var(--font-kumar)" }}
        >
          The Vault
        </h1>
        <MoneyStack size={56} />
      </div>
      <p className="text-text-muted mt-4 tracking-wide z-10">
        manage your money better.
      </p>

      {phase === "guest" && (
        <div className="flex flex-col gap-3 z-10 w-64 mt-10 animate-fadeIn">
          <Link
            href="/signup"
            className="bg-accent text-surface text-center py-3 rounded-lg font-medium"
          >
            Sign Up
          </Link>
          <Link
            href="/login"
            className="border border-border-subtle text-center py-3 rounded-lg font-medium"
          >
            Sign In
          </Link>
        </div>
      )}
    </main>
  );
}