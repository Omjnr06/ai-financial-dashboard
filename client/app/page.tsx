"use client";

import { useThemeStore } from "@/stores/useThemeStore";

export default function Home() {
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <main className="bg-surface text-text-primary min-h-screen p-10">
      <h1 className="text-accent text-3xl mb-6">The Vault</h1>

      <div className="bg-surface-raised border border-border-subtle rounded-xl p-6 mb-6">
        <p className="text-text-muted mb-2">safe to spend</p>
        <p className="text-4xl">$1,240</p>
        <p className="text-success mt-2">on track</p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTheme("midnight")} className="bg-accent px-4 py-2 rounded">midnight</button>
        <button onClick={() => setTheme("daylight")} className="bg-accent px-4 py-2 rounded">daylight</button>
        <button onClick={() => setTheme("neon")} className="bg-accent px-4 py-2 rounded">neon</button>
        <button onClick={() => setTheme("pink")} className="bg-accent px-4 py-2 rounded">pink</button>
        <button onClick={() => setTheme("mono")} className="bg-accent px-4 py-2 rounded">mono</button>
      </div>
    </main>
  );
}