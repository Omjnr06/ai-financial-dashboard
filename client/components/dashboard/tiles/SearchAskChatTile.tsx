"use client";

import React from "react";
import { Search } from "lucide-react";

interface SearchAskChatTileProps {
  onOpenChat: (initialQuery?: string) => void;
}

export function SearchAskChatTile({ onOpenChat }: SearchAskChatTileProps) {
  return (
    <div
      onClick={() => onOpenChat()}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => e.key === "Enter" && onOpenChat()}
      className="bg-accent/20 border border-accent/40 rounded-3xl p-6 flex items-center justify-between cursor-pointer group min-h-[120px] transition-all duration-300 ease-out hover:-translate-y-1.5 hover:translate-x-1.5 hover:shadow-2xl hover:shadow-accent/10 hover:border-accent hover:bg-accent/30"
    >
      <div>
        <span className="text-xs text-text-muted block mb-1">search / ask chat:</span>
        <span className="text-lg font-semibold text-text-primary group-hover:text-accent transition-colors">
          How am I doing this week?
        </span>
      </div>
      <div className="bg-accent p-3 rounded-2xl text-white shadow-md group-hover:scale-105 transition-transform">
        <Search className="w-5 h-5" />
      </div>
    </div>
  );
}