import OpenAI from 'openai';
import { KlaroClient } from '../utils/client';

export interface KlaroOpenAIConfig {
  /**
   * Your Klaro API key
   */
  klaroApiKey: string;

  /**
   * Your OpenAI API key
   */
  openaiApiKey: string;

  /**
   * Klaro API URL (optional)
   */
  klaroApiUrl?: string;

  /**
   * Enable PII detection (default: false)
   */
  enablePIIDetection?: boolean;
}

/**
 * Model pricing (cost per 1K tokens)
 * Based on OpenAI pricing as of 2024
 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'gpt-3.5-turbo-16k': { input: 0.003, output: 0.004 },
};

/**
 * Calculate cost based on token usage
 */
function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-4']; // Default to GPT-4 pricing
  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;
  return inputCost + outputCost;
}

/**
 * Klaro OpenAI wrapper
 * 
 * Drop-in replacement for OpenAI SDK that tracks costs per customer
 * 
 * @example
 * ```typescript
 * import { KlaroOpenAI } from '@klaro/sdk';
 * 
 * const klaro = new KlaroOpenAI({
 *   klaroApiKey: 'klaro_abc123',
 *   openaiApiKey: 'sk-...'
 * });
 * 
 * const response = await klaro.chat.completions.create({
 *   customerId: user.id,
 *   model: 'gpt-4',
 *   messages: [{ role: 'user', content: 'Hello!' }]
 * });
 * ```
 */
export class KlaroOpenAI {
  private openai: OpenAI;
  private klaroClient: KlaroClient;
  private enablePIIDetection: boolean;

  constructor(config: KlaroOpenAIConfig) {
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey,
    });

    this.klaroClient = new KlaroClient({
      apiKey: config.klaroApiKey,
      apiUrl: config.klaroApiUrl,
    });

    this.enablePIIDetection = config.enablePIIDetection || false;
  }

  /**
   * Chat completions API with cost tracking
   */
  get chat() {
    return {
      completions: {
        create: async (params: any) => {
          const { customerId, ...openaiParams } = params;

          if (!customerId) {
            throw new Error('[Klaro SDK] customerId is required for cost tracking');
          }

          const startTime = Date.now();

          try {
            // Call OpenAI
            const response = await this.openai.chat.completions.create(openaiParams);

            // Calculate metrics
            const latency = Date.now() - startTime;
            const inputTokens = response.usage?.prompt_tokens || 0;
            const outputTokens = response.usage?.completion_tokens || 0;
            const cost = calculateCost(params.model, inputTokens, outputTokens);

            // Send to Klaro (async, don't wait)
            this.klaroClient.sendLLMRequest({
              customerId,
              provider: 'openai',
              model: params.model,
              inputTokens,
              outputTokens,
              cost,
              latency,
              timestamp: new Date().toISOString(),
              ...(this.enablePIIDetection ? (() => {
              const piiResult = this.detectPII(response);
              return {
                piiDetected: piiResult.detected,
                piiCategories: piiResult.categories,
                piiCount: piiResult.count
              };
            })() : {}),
            }).catch(err => {
              console.error('[Klaro SDK] Error sending LLM data:', err);
            });

            return response;

          } catch (error) {
            // Re-throw OpenAI errors
            throw error;
          }
        },
      },
    };
  }

  /**
   * Detailed PII detection (returns categories and count)
   */
  private detectPII(response: any): { detected: boolean; categories: string[]; count: number } {
    const text = response.choices?.[0]?.message?.content || '';

    // PII patterns with category names
    const patterns: { name: string; regex: RegExp }[] = [
      { name: 'email', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g },
      { name: 'phone', regex: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g },
      { name: 'ssn', regex: /\b\d{3}-\d{2}-\d{4}\b/g },
      { name: 'credit_card', regex: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g },
    ];

    const categories: string[] = [];
    let totalCount = 0;

    for (const pattern of patterns) {
      const matches = text.match(pattern.regex);
      if (matches && matches.length > 0) {
        categories.push(pattern.name);
        totalCount += matches.length;
      }
    }

    return {
      detected: categories.length > 0,
      categories,
      count: totalCount
    };
  }

  /**
   * Access underlying OpenAI client for advanced use cases
   */
  get raw(): OpenAI {
    return this.openai;
  }
}
