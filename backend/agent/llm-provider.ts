/**
 * agent/llm-provider.ts
 *
 * Abstraction layer for LLM providers.
 * Keeps orchestration logic decoupled from a specific provider.
 *
 * Supported providers: gemini (default), anthropic, openai
 * Set LLM_PROVIDER and LLM_MODEL in .env to configure.
 */

import "dotenv/config";

export interface LLMProvider {
  /** Send a system + user message and return the assistant's text response. */
  complete(systemPrompt: string, userPrompt: string): Promise<string>;
}

// ─── Gemini ───────────────────────────────────────────────────────────────────

function createGeminiProvider(apiKey: string, model: string): LLMProvider {
  return {
    async complete(systemPrompt: string, userPrompt: string): Promise<string> {
      // Using the REST API directly to avoid SDK version coupling
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const body = {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.1, // low temp for structured output
          maxOutputTokens: 2048,
        },
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "Unknown error");
        throw new Error(`Gemini API error (${response.status}): ${text}`);
      }

      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Gemini returned empty response");
      return text;
    },
  };
}

// ─── Anthropic ────────────────────────────────────────────────────────────────

function createAnthropicProvider(apiKey: string, model: string): LLMProvider {
  return {
    async complete(systemPrompt: string, userPrompt: string): Promise<string> {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "Unknown error");
        throw new Error(`Anthropic API error (${response.status}): ${text}`);
      }

      const data = (await response.json()) as {
        content?: Array<{ type: string; text?: string }>;
      };

      const text = data.content?.find((c) => c.type === "text")?.text;
      if (!text) throw new Error("Anthropic returned empty response");
      return text;
    },
  };
}

// ─── OpenAI ───────────────────────────────────────────────────────────────────

function createOpenAIProvider(apiKey: string, model: string): LLMProvider {
  return {
    async complete(systemPrompt: string, userPrompt: string): Promise<string> {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          max_tokens: 2048,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" }, // request JSON mode
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "Unknown error");
        throw new Error(`OpenAI API error (${response.status}): ${text}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error("OpenAI returned empty response");
      return text;
    },
  };
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createLLMProvider(): LLMProvider {
  const provider = (process.env.LLM_PROVIDER ?? "gemini").toLowerCase();
  const model = process.env.LLM_MODEL ?? "gemini-1.5-flash-latest";

  switch (provider) {
    case "gemini": {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is not set in .env");
      return createGeminiProvider(apiKey, model);
    }
    case "anthropic": {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set in .env");
      return createAnthropicProvider(apiKey, model);
    }
    case "openai": {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("OPENAI_API_KEY is not set in .env");
      return createOpenAIProvider(apiKey, model);
    }
    default:
      throw new Error(`Unknown LLM provider: "${provider}". Set LLM_PROVIDER to gemini, anthropic, or openai.`);
  }
}
