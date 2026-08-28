"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Sparkles } from "lucide-react";
import { askAssistant, getAssistantSuggestions } from "@/lib/assistant";
import { useQuery } from "@tanstack/react-query";

interface SlideOverChatProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  isError?: boolean;
  suggestions?: string[];
};

const GREETING: ChatMessage = {
  role: "assistant",
  text: "Hey! I'm your Vault AI co-pilot. Ask me anything about your cash flow, upcoming bills, or savings progress.",
};

export function SlideOverChat({ isOpen, onClose, initialQuery = "" }: SlideOverChatProps) {
  const [input, setInput] = useState(initialQuery);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [isLoading, setIsLoading] = useState(false);

  const bodyRef = useRef<HTMLDivElement>(null);

  const { data: suggestions } = useQuery({
    queryKey: ["assistantSuggestions"],
    queryFn: async () => await getAssistantSuggestions(),
    staleTime: Infinity,
  });

  useEffect(() => {
    if (suggestions && suggestions.length > 0 && messages.length === 1) {
      setMessages([{ ...GREETING, suggestions }]);
    }
  }, [suggestions]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const send = async (raw: string) => {
    const question = raw.trim();
    if (!question || isLoading) return;

    setInput("");
    setMessages((prev) => [
      ...prev.map((m) => ({ ...m, suggestions: undefined })),
      { role: "user", text: question },
    ]);
    setIsLoading(true);

    const result = await askAssistant(question);
    setIsLoading(false);

    if (result.ok) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: result.data.answer,
          suggestions: result.data.suggestions ?? undefined,
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: result.message, isError: true },
      ]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-surface border-l border-border-subtle p-6 shadow-2xl"
          >
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

            <div ref={bodyRef} className="flex-1 overflow-y-auto py-4 space-y-4">
              {messages.map((msg, index) => {
                const isLast = index === messages.length - 1;
                return (
                  <div key={index} className="space-y-2">
                    <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-accent text-white"
                            : msg.isError
                            ? "bg-danger/10 border border-danger/40 text-danger"
                            : "bg-surface-raised text-text-primary border border-border-subtle"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>

                    {msg.role === "assistant" && msg.suggestions && isLast && !isLoading && (
                      <div className="flex flex-wrap gap-2">
                        {msg.suggestions.map((chip) => (
                          <button
                            key={chip}
                            onClick={() => send(chip)}
                            className="rounded-full border border-border-subtle bg-surface-raised px-3 py-1.5 text-xs text-text-muted hover:text-text-primary hover:border-accent transition-colors"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1.5 rounded-2xl bg-surface-raised border border-border-subtle px-4 py-3">
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        className="w-2 h-2 rounded-full bg-text-muted animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="pt-3 border-t border-border-subtle">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isLoading}
                  placeholder="Ask a question about your spending..."
                  className="w-full rounded-xl bg-surface-raised border border-border-subtle px-4 py-3 pr-12 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  aria-label="Send Message"
                  className="absolute right-2 p-2 text-accent hover:text-text-primary transition-colors disabled:opacity-40 disabled:hover:text-accent"
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