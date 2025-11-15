"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KlaroGemini = void 0;
const generative_ai_1 = require("@google/generative-ai");
const client_1 = require("../utils/client");
/**
 * Model pricing (cost per 1M tokens)
 * Based on official Google AI pricing as of November 2025
 * Source: https://ai.google.dev/gemini-api/docs/pricing
 */
const MODEL_PRICING = {
    // Gemini 2.0 Flash (latest)
    'gemini-2.0-flash-exp': { input: 0, output: 0 }, // Free during preview
    // Gemini 1.5 Flash
    'gemini-1.5-flash': { input: 0.075, output: 0.30 },
    'gemini-1.5-flash-8b': { input: 0.0375, output: 0.15 },
    // Gemini 1.5 Pro
    'gemini-1.5-pro': { input: 1.25, output: 5.00 },
    // Gemini 1.0 Pro
    'gemini-1.0-pro': { input: 0.50, output: 1.50 },
};
/**
 * Calculate cost based on token usage
 */
function calculateCost(model, inputTokens, outputTokens) {
    const pricing = MODEL_PRICING[model] || MODEL_PRICING['gemini-1.5-flash']; // Default to Flash pricing
    const inputCost = (inputTokens / 1000000) * pricing.input;
    const outputCost = (outputTokens / 1000000) * pricing.output;
    return inputCost + outputCost;
}
/**
 * Klaro Gemini wrapper
 *
 * Wrapper for Google Generative AI SDK that tracks costs per customer
 *
 * @example
 * ```typescript
 * import { KlaroGemini } from '@klaro/sdk';
 *
 * const klaro = new KlaroGemini({
 *   klaroApiKey: 'klaro_abc123',
 *   googleApiKey: 'AIza...'
 * });
 *
 * const model = klaro.getGenerativeModel({ model: 'gemini-1.5-flash' });
 * const result = await model.generateContent({
 *   customerId: user.id,
 *   contents: [{ role: 'user', parts: [{ text: 'Hello!' }] }]
 * });
 * ```
 */
class KlaroGemini {
    constructor(config) {
        this.genAI = new generative_ai_1.GoogleGenerativeAI(config.googleApiKey);
        this.klaroClient = new client_1.KlaroClient({
            apiKey: config.klaroApiKey,
            apiUrl: config.klaroApiUrl,
        });
        this.enablePIIDetection = config.enablePIIDetection || false;
    }
    /**
     * Get generative model with cost tracking
     */
    getGenerativeModel(params) {
        const baseModel = this.genAI.getGenerativeModel({ model: params.model });
        return {
            /**
             * Generate content with cost tracking
             */
            generateContent: async (request) => {
                const { customerId, ...geminiParams } = request;
                if (!customerId) {
                    throw new Error('[Klaro SDK] customerId is required for cost tracking');
                }
                const startTime = Date.now();
                try {
                    // Call Gemini
                    const result = await baseModel.generateContent(geminiParams);
                    const response = result.response;
                    // Calculate metrics
                    const latency = Date.now() - startTime;
                    const inputTokens = response.usageMetadata?.promptTokenCount || 0;
                    const outputTokens = response.usageMetadata?.candidatesTokenCount || 0;
                    const cost = calculateCost(params.model, inputTokens, outputTokens);
                    // Send to Klaro (async, don't wait)
                    this.klaroClient.sendLLMRequest({
                        customerId,
                        provider: 'google',
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
                    return result;
                }
                catch (error) {
                    // Re-throw Gemini errors
                    throw error;
                }
            },
            /**
             * Access underlying Gemini model for advanced use cases
             */
            raw: baseModel,
        };
    }
    /**
     * Detailed PII detection (returns categories and count)
     */
    detectPII(response) {
        const text = response.text() || '';
        // PII patterns with category names
        const patterns = [
            { name: 'email', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g },
            { name: 'phone', regex: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g },
            { name: 'ssn', regex: /\b\d{3}-\d{2}-\d{4}\b/g },
            { name: 'credit_card', regex: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g },
        ];
        const categories = [];
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
     * Access underlying GoogleGenerativeAI client for advanced use cases
     */
    get raw() {
        return this.genAI;
    }
}
exports.KlaroGemini = KlaroGemini;
