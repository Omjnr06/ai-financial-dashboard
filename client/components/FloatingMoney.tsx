"use client";

import { Banknote, Coins, DollarSign } from "lucide-react";

// Faded money icons drifting slowly in the background. Uses Lucide icons for a
// polished look; currentColor keeps them theme-matched.
const ICONS = [
  { left: "12%", top: "18%", delay: "0s", Icon: Banknote },
  { left: "78%", top: "22%", delay: "0.4s", Icon: Coins },
  { left: "25%", top: "68%", delay: "0.8s", Icon: DollarSign },
  { left: "85%", top: "72%", delay: "0.2s", Icon: Banknote },
  { left: "50%", top: "12%", delay: "0.6s", Icon: Coins },
  { left: "60%", top: "82%", delay: "1s", Icon: DollarSign },
  { left: "8%", top: "45%", delay: "0.5s", Icon: Coins },
  { left: "90%", top: "45%", delay: "0.9s", Icon: Banknote },
];

export function FloatingMoney() {
  return (
    <>
      <style>{`
        @keyframes floatY {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-14px); }
        }
        .float-icon {
          position: absolute;
          color: var(--text-muted);
          opacity: 0.28;
          animation: floatY 4s ease-in-out infinite;
          pointer-events: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .float-icon { animation: none; }
        }
      `}</style>
      {ICONS.map(({ left, top, delay, Icon }, i) => (
        <span
          key={i}
          className="float-icon"
          style={{ left, top, animationDelay: delay }}
        >
          <Icon size={34} strokeWidth={1.5} />
        </span>
      ))}
    </>
  );
}