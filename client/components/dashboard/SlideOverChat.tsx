"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Sparkles } from "lucide-react";

interface SlideOverChatProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export function SlideOverChat({ isOpen, onClose, initialQuery = "" }: SlideOverChatProps) {
  const [input, setInput] = useState(initialQuery);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([
    {
      role: "assistant",
      text: "Hey! I'm your Vault AI co-pilot. Ask me anything about your cash flow, upcoming bills, or savings progress.",
    },
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setInput("");

    // Simulated response for mock mode
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `Based on your recent transactions, your weekly average spend on food delivery is $64.20. You're still on track for your MacBook Pro target date!`,
        },
      ]);
    }, 600);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Slide-over Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-surface border-l border-border-subtle p-6 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
              <div className="flex items-center gap-2 text-accent font-semibold">
                <Sparkles className="w-5 h-5" />
                <span>Vault AI Co-Pilot</span>
              </div>
              <button
                onClick={onClose}
                aria-label="Close Chat"
                className="p-1.5 rounded-full hover:bg-surface-raised text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-accent text-white"
                        : "bg-surface-raised text-text-primary border border-border-subtle"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="pt-3 border-t border-border-subtle">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question about your spending..."
                  className="w-full rounded-xl bg-surface-raised border border-border-subtle px-4 py-3 pr-12 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  aria-label="Send Message"
                  className="absolute right-2 p-2 text-accent hover:text-text-primary transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}