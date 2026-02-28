/**
 * Configurable OpenAI-compatible client.
 *
 * Works with:
 *  - GitHub Copilot proxy (copilot-openai-server on Synology)
 *  - Perplexity Sonar API
 *  - OpenAI API directly
 *
 * Set AI_BASE_URL, AI_API_KEY, AI_MODEL in env.
 * If using Cloudflare Access in front of the proxy,
 * also set CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET.
 */

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

const AI_BASE_URL = process.env.AI_BASE_URL || "";
const AI_API_KEY = process.env.AI_API_KEY || "unused";
const AI_MODEL = process.env.AI_MODEL || "gpt-4o";
const CF_ACCESS_CLIENT_ID = process.env.CF_ACCESS_CLIENT_ID || "";
const CF_ACCESS_CLIENT_SECRET = process.env.CF_ACCESS_CLIENT_SECRET || "";

export function isAiConfigured(): boolean {
  return AI_BASE_URL.length > 0;
}

export async function chatCompletion(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string | null> {
  if (!isAiConfigured()) {
    console.warn("[ai-client] AI_BASE_URL not set — skipping AI call");
    return null;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${AI_API_KEY}`,
  };

  // Cloudflare Access service token headers
  if (CF_ACCESS_CLIENT_ID) {
    headers["CF-Access-Client-Id"] = CF_ACCESS_CLIENT_ID;
    headers["CF-Access-Client-Secret"] = CF_ACCESS_CLIENT_SECRET;
  }

  const body = {
    model: AI_MODEL,
    messages,
    temperature: options?.temperature ?? 0.2,
    max_tokens: options?.maxTokens ?? 1024,
  };

  try {
    const res = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000), // 30s timeout
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[ai-client] ${res.status} ${res.statusText}: ${text}`);
      return null;
    }

    const data = (await res.json()) as ChatCompletionResponse;
    return data.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.error("[ai-client] Request failed:", err);
    return null;
  }
}
