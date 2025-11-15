import OpenAI from 'openai';
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
export declare class KlaroOpenAI {
    private openai;
    private klaroClient;
    private enablePIIDetection;
    constructor(config: KlaroOpenAIConfig);
    /**
     * Chat completions API with cost tracking
     */
    get chat(): {
        completions: {
            create: (params: any) => Promise<OpenAI.Chat.Completions.ChatCompletion & {
                _request_id?: string | null;
            }>;
        };
    };
    /**
     * Detailed PII detection (returns categories and count)
     */
    private detectPII;
    /**
     * Access underlying OpenAI client for advanced use cases
     */
    get raw(): OpenAI;
}
