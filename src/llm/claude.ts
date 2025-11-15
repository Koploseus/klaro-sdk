import Anthropic from '@anthropic-ai/sdk';
import { KlaroClient } from '../utils/client';

export interface KlaroClaudeConfig {
  /**
   * Your Klaro API key
   */
  klaroApiKey: string;

  /**
   * Your Anthropic API key
   */
  anthropicApiKey: string;

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
 * Model pricing (cost per 1M tokens)
 * Based on official Anthropic pricing as of November 2025
 * Source: https://docs.anthropic.com/en/docs/about-claude/pricing
 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // Claude 3.5 Sonnet (latest)
  'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
  'claude-3-5-sonnet-latest': { input: 3.00, output: 15.00 },
  
  // Claude 3.5 Haiku
  'claude-3-5-haiku-20241022': { input: 0.80, output: 4.00 },
  'claude-3-5-haiku-latest': { input: 0.80, output: 4.00 },
  
  // Claude 3 Opus
  'claude-3-opus-20240229': { input: 15.00, output: 75.00 },
  'claude-3-opus-latest': { input: 15.00, output: 75.00 },
  
  // Claude 3 Sonnet (older)
  'claude-3-sonnet-20240229': { input: 3.00, output: 15.00 },
  
  // Claude 3 Haiku (older)
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
};

/**
 * Calculate cost based on token usage
 */
function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['claude-3-5-sonnet-latest']; // Default to Sonnet pricing
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

/**
 * Klaro Claude wrapper
 * 
 * Drop-in replacement for Anthropic SDK that tracks costs per customer
 * 
 * @example
 * ```typescript
 * import { KlaroClaude } from '@klaro/sdk';
 * 
 * const klaro = new KlaroClaude({
 *   klaroApiKey: 'klaro_abc123',
 *   anthropicApiKey: 'sk-ant-...'
 * });
 * 
 * const response = await klaro.messages.create({
 *   customerId: user.id,
 *   model: 'claude-3-5-sonnet-latest',
 *   max_tokens: 1024,
 *   messages: [{ role: 'user', content: 'Hello!' }]
 * });
 * ```
 */
export class KlaroClaude {
  private anthropic: Anthropic;
  private klaroClient: KlaroClient;
  private enablePIIDetection: boolean;

  constructor(config: KlaroClaudeConfig) {
    this.anthropic = new Anthropic({
      apiKey: config.anthropicApiKey,
    });

    this.klaroClient = new KlaroClient({
      apiKey: config.klaroApiKey,
      apiUrl: config.klaroApiUrl,
    });

    this.enablePIIDetection = config.enablePIIDetection || false;
  }

  /**
   * Messages API with cost tracking
   */
  get messages() {
    return {
      create: async (params: any) => {
        const { customerId, ...anthropicParams } = params;

        if (!customerId) {
          throw new Error('[Klaro SDK] customerId is required for cost tracking');
        }

        const startTime = Date.now();

        try {
          // Call Anthropic
          const response = await this.anthropic.messages.create(anthropicParams);

          // Calculate metrics
          const latency = Date.now() - startTime;
          const inputTokens = response.usage.input_tokens;
          const outputTokens = response.usage.output_tokens;
          const cost = calculateCost(params.model, inputTokens, outputTokens);

          // Send to Klaro (async, don't wait)
          this.klaroClient.sendLLMRequest({
            customerId,
            provider: 'anthropic',
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
          // Re-throw Anthropic errors
          throw error;
        }
      },
    };
  }

  /**
   * Detailed PII detection (returns categories and count)
   */
  private detectPII(response: any): { detected: boolean; categories: string[]; count: number } {
    const text = response.content?.[0]?.text || '';

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
   * Access underlying Anthropic client for advanced use cases
   */
  get raw(): Anthropic {
    return this.anthropic;
  }
}
