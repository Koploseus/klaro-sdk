import Anthropic from '@anthropic-ai/sdk';
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
export declare class KlaroClaude {
    private anthropic;
    private klaroClient;
    private enablePIIDetection;
    constructor(config: KlaroClaudeConfig);
    /**
     * Messages API with cost tracking
     */
    get messages(): {
        create: (params: any) => Promise<Anthropic.Messages.Message>;
    };
    /**
     * Detailed PII detection (returns categories and count)
     */
    private detectPII;
    /**
     * Access underlying Anthropic client for advanced use cases
     */
    get raw(): Anthropic;
}
