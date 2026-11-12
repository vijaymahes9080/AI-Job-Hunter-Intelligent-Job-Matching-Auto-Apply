import { config } from '../config.js';
import { logger } from '../logger.js';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export function llmConfigured(): boolean {
  return Boolean(config.llm.baseUrl && config.llm.model);
}

/**
 * Calls an OpenAI-compatible endpoint served by an open-weight model runtime
 * such as Ollama, vLLM or llama.cpp. Proprietary providers are not required.
 * Returns null when unavailable so callers can fall back deterministically.
 */
export async function completeWithOpenModel(
  messages: LlmMessage[],
  options: { maxTokens?: number; temperature?: number; timeoutMs?: number } = {},
): Promise<{ content: string; model: string } | null> {
  if (!llmConfigured()) return null;
  try {
    const response = await fetch(`${config.llm.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.llm.apiKey ? { Authorization: `Bearer ${config.llm.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: config.llm.model,
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 700,
        stream: false,
      }),
      signal: AbortSignal.timeout(options.timeoutMs ?? 25_000),
    });
    if (!response.ok) {
      logger.warn('open_model_request_failed', { status: response.status });
      return null;
    }
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      model?: string;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;
    return { content, model: data.model || config.llm.model };
  } catch (error) {
    logger.warn('open_model_unavailable', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}
