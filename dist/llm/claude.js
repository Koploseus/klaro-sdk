"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KlaroClaude = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const client_1 = require("../utils/client");
/**
 * Model pricing (cost per 1M tokens)
 * Based on official Anthropic pricing as of November 2025
 * Source: https://docs.anthropic.com/en/docs/about-claude/pricing
 */
const MODEL_PRICING = {
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
function calculateCost(model, inputTokens, outputTokens) {
    const pricing = MODEL_PRICING[model] || MODEL_PRICING['claude-3-5-sonnet-latest']; // Default to Sonnet pricing
    const inputCost = (inputTokens / 1000000) * pricing.input;
    const outputCost = (outputTokens / 1000000) * pricing.output;
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
class KlaroClaude {
    constructor(config) {
        this.anthropic = new sdk_1.default({
            apiKey: config.anthropicApiKey,
        });
        this.klaroClient = new client_1.KlaroClient({
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
            create: async (params) => {
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
                        piiDetected: this.enablePIIDetection ? this.detectPII(response) : undefined,
                    }).catch(err => {
                        console.error('[Klaro SDK] Error sending LLM data:', err);
                    });
                    return response;
                }
                catch (error) {
                    // Re-throw Anthropic errors
                    throw error;
                }
            },
        };
    }
    /**
     * Simple PII detection (basic patterns)
     */
    detectPII(response) {
        const text = response.content?.[0]?.text || '';
        // Basic regex patterns for common PII
        const patterns = [
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
            /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // Phone
            /\b\d{3}-\d{2}-\d{4}\b/, // SSN
            /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/, // Credit card
        ];
        return patterns.some(pattern => pattern.test(text));
    }
    /**
     * Access underlying Anthropic client for advanced use cases
     */
    get raw() {
        return this.anthropic;
    }
}
exports.KlaroClaude = KlaroClaude;
