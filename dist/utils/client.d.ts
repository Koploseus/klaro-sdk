export interface KlaroClientConfig {
    apiKey: string;
    apiUrl?: string;
    timeout?: number;
}
export interface RequestData {
    customerId: string;
    method: string;
    path: string;
    statusCode: number;
    duration: number;
    timestamp: string;
    headers?: Record<string, string>;
    query?: Record<string, any>;
}
export interface LLMRequestData {
    customerId: string;
    provider: 'openai' | 'anthropic';
    model: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    latency: number;
    timestamp: string;
    piiDetected?: boolean;
}
/**
 * HTTP client for sending data to Klaro backend
 */
export declare class KlaroClient {
    private apiKey;
    private apiUrl;
    private timeout;
    constructor(config: KlaroClientConfig);
    /**
     * Send API request data to Klaro
     */
    sendRequest(data: RequestData): Promise<void>;
    /**
     * Send batch of API requests to Klaro
     */
    sendBatch(requests: RequestData[]): Promise<void>;
    /**
     * Send LLM request data to Klaro
     */
    sendLLMRequest(data: LLMRequestData): Promise<void>;
    /**
     * Generic POST request
     */
    private post;
}
