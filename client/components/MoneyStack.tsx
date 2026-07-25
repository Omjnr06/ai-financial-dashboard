"use client";

export function MoneyStack({ size = 48 }: { size?: number }) {
  return (
    <>
      <style>{`
        @keyframes stackDrop {
          0% { transform: translateY(-12px); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .bill-1 { animation: stackDrop 2s ease-in-out infinite; }
        .bill-2 { animation: stackDrop 2s ease-in-out infinite 0.3s; }
        .bill-3 { animation: stackDrop 2s ease-in-out infinite 0.6s; }
        @media (prefers-reduced-motion: reduce) {
          .bill-1, .bill-2, .bill-3 { animation: none; opacity: 1; }
        }
      `}</style>
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none"
           style={{ color: "var(--accent)" }}>
        <rect className="bill-3" x="8" y="30" width="32" height="8" rx="2"
              stroke="currentColor" strokeWidth="2" fill="var(--surface-raised)" />
        <rect className="bill-2" x="8" y="22" width="32" height="8" rx="2"
              stroke="currentColor" strokeWidth="2" fill="var(--surface-raised)" />
        <rect className="bill-1" x="8" y="14" width="32" height="8" rx="2"
              stroke="currentColor" strokeWidth="2" fill="var(--surface-raised)" />
        <circle cx="24" cy="18" r="2.5" fill="currentColor" />
      </svg>
    </>
  );
}