import { AssistantResponse, AssistantResult } from "@/types/api";
import { mockAssistantAnswer, mockAssistantSuggestions } from "@/mocks/index";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";
const BASE = process.env.NEXT_PUBLIC_API_URL;

export async function askAssistant(question: string): Promise<AssistantResult> {
  if (USE_MOCKS) {
    return { ok: true, data: mockAssistantAnswer(question) };
  }

  try {
    const res = await fetch(`${BASE}/api/assistant/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ question }),
    });

    if (res.ok) {
      const data = (await res.json()) as AssistantResponse;
      return { ok: true, data };
    }

    if (res.status === 401) {
      return { ok: false, kind: "auth", message: "Your session expired — please sign in again." };
    }

    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("Retry-After")) || undefined;
      const wait = retryAfter ? ` Try again in ${retryAfter}s.` : "";
      return {
        ok: false,
        kind: "rate_limit",
        message: `You're sending messages a little too fast.${wait}`,
        retryAfter,
      };
    }

    if (res.status === 400) {
      let message = "I couldn't process that question.";
      try {
        const body = await res.json();
        if (body?.detail) message = body.detail;
      } catch {
        // keep default
      }
      return { ok: false, kind: "validation", message };
    }

    return { ok: false, kind: "network", message: "Something went wrong. Please try again." };
  } catch {
    return { ok: false, kind: "network", message: "Couldn't reach the assistant — check your connection." };
  }
}

export async function getAssistantSuggestions(): Promise<string[]> {
  if (USE_MOCKS) return mockAssistantSuggestions;

  try {
    const res = await fetch(`${BASE}/api/assistant/suggestions`, {
      credentials: "include",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.suggestions ?? [];
  } catch {
    return [];
  }
}