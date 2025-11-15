import { GoogleGenerativeAI } from '@google/generative-ai';
export interface KlaroGeminiConfig {
    /**
     * Your Klaro API key
     */
    klaroApiKey: string;
    /**
     * Your Google AI API key
     */
    googleApiKey: string;
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
export declare class KlaroGemini {
    private genAI;
    private klaroClient;
    private enablePIIDetection;
    constructor(config: KlaroGeminiConfig);
    /**
     * Get generative model with cost tracking
     */
    getGenerativeModel(params: {
        model: string;
    }): {
        /**
         * Generate content with cost tracking
         */
        generateContent: (request: any) => Promise<import("@google/generative-ai").GenerateContentResult>;
        /**
         * Access underlying Gemini model for advanced use cases
         */
        raw: import("@google/generative-ai").GenerativeModel;
    };
    /**
     * Simple PII detection (basic patterns)
     */
    private detectPII;
    /**
     * Access underlying GoogleGenerativeAI client for advanced use cases
     */
    get raw(): GoogleGenerativeAI;
}
